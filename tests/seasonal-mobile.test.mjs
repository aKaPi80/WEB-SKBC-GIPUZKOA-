import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const { webkit, chromium, devices } = createRequire(import.meta.url)('playwright');
const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
const script = await readFile(new URL('../seasonal-effects.js', import.meta.url), 'utf8');
async function scene(browser, device, { reducedMotion = 'no-preference', permission = 'granted' } = {}) {
  const page = await browser.newPage({ ...devices[device], reducedMotion });
  await page.route('https://seasonal.test/', route => route.fulfill({ contentType: 'text/html', body: `<html lang="es"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><body><div style="height:3000px"></div></body></html>` }));
  await page.goto('https://seasonal.test/');
  await page.evaluate(permission => {
    Math.random = () => 0.5;
    // The desktop WebKit host reports its monitor angle even in iPhone emulation.
    Object.defineProperty(screen.orientation, 'angle', { value: 0, configurable: true });
    window.sensorRequests = 0;
    window.DeviceOrientationEvent = class {
      static requestPermission() {
        window.sensorRequests++;
        if (permission === 'error') return Promise.reject(new Error('Blocked'));
        return Promise.resolve(permission);
      }
    };
  }, permission);
  await page.addScriptTag({ content: script });
  return page;
}
async function layer(page, mode) {
  await page.evaluate(mode => {
    document.querySelector('.seasonal-layer')?.remove();
    const layer = document.createElement('div');
    layer.className = `seasonal-layer seasonal-layer--${mode}`;
    layer.innerHTML = '<span style="--size:10px;--duration:10s;--x:50;--delay:0s;--drift:20px"></span>';
    document.body.append(layer);
  }, mode);
}
const sendOrientation = (page, beta, gamma) => page.evaluate(({ beta, gamma }) => {
  const event = new Event('deviceorientation');
  Object.assign(event, { beta, gamma });
  dispatchEvent(event);
}, { beta, gamma });
async function openControls(page) {
  if (!(await page.locator('.seasonal-controls').evaluate(node => node.open))) {
    await page.locator('.seasonal-controls summary').click();
  }
}

test('Safari engine renders every effect on iPhone and iPad before sensor permission', async () => {
  const browser = await webkit.launch();
  try {
    for (const device of ['iPhone 13', 'iPad Pro 11']) {
      const page = await scene(browser, device);
      for (const mode of ['autumn', 'christmas', 'carnival']) {
        await layer(page, mode);
        await page.waitForSelector('.seasonal-layer--physics');
        const particle = page.locator('.seasonal-layer span').first();
        await page.waitForFunction(() => document.querySelector('.seasonal-layer span').style.transform.includes('translate3d'));
        const before = await particle.getAttribute('style');
        await page.waitForTimeout(100);
        assert.notEqual(await particle.getAttribute('style'), before);
        assert.equal(await particle.isVisible(), true);
        assert.equal(await page.evaluate(() => window.sensorRequests), 0);
        assert.equal(await page.locator('.seasonal-controls').count(), 1);
      }
      await page.close();
    }
  } finally { await browser.close(); }
});

test('Safari reduced-motion users can explicitly show effects; denied sensors do not hide them', async () => {
  const browser = await webkit.launch();
  try {
    for (const permission of ['denied', 'error']) {
      const page = await scene(browser, 'iPhone 13', { reducedMotion: 'reduce', permission });
      await layer(page, 'autumn');
      await page.waitForSelector('.seasonal-visibility-toggle', { state: 'attached' });
      assert.equal(await page.locator('.seasonal-layer').isVisible(), false);
      await openControls(page);
      await page.getByRole('button', { name: 'Mostrar efectos' }).click();
      await page.waitForSelector('.seasonal-layer--physics');
      assert.equal(await page.locator('.seasonal-layer').isVisible(), true);
      await page.waitForFunction(() => document.querySelector('.seasonal-layer span').style.transform.includes('translate3d'));
      const before = await page.locator('.seasonal-layer span').getAttribute('style');
      await page.waitForTimeout(120);
      assert.notEqual(await page.locator('.seasonal-layer span').getAttribute('style'), before);
      await openControls(page);
      await page.getByRole('button', { name: 'Activar inclinación' }).click();
      await page.waitForFunction(() => document.querySelector('.seasonal-motion-status').textContent.includes('Sin acceso'));
      assert.equal(await page.locator('.seasonal-layer').isVisible(), true);
      assert.equal(await page.evaluate(() => window.sensorRequests), 1);
      await page.getByRole('button', { name: 'Ocultar efectos' }).click();
      assert.equal(await page.locator('.seasonal-layer').isVisible(), false);
      await page.close();
    }
  } finally { await browser.close(); }
});

test('Safari permission gesture enables calibrated left and right drift; controls clean up on rerender', async () => {
  const browser = await webkit.launch();
  try {
    for (const device of ['iPhone 13', 'iPad Pro 11']) {
      const page = await scene(browser, device);
      await layer(page, 'autumn');
      await page.waitForSelector('.seasonal-layer--physics');
      await openControls(page);
      await page.getByRole('button', { name: 'Activar inclinación' }).click();
      await page.waitForFunction(() => document.querySelector('.seasonal-tilt-toggle').getAttribute('aria-pressed') === 'true');
      await sendOrientation(page, 0, 0);
      const before = await page.locator('.seasonal-layer span').first().boundingBox();
      await sendOrientation(page, 0, 45);
      await page.waitForTimeout(900);
      const right = await page.locator('.seasonal-layer span').first().boundingBox();
      assert.ok(right.x > before.x + 5, `${device} must drift right: ${JSON.stringify({ before, right, angle: await page.evaluate(() => screen.orientation?.angle ?? window.orientation) })}`);
      await sendOrientation(page, 0, -45);
      await page.waitForTimeout(1300);
      const left = await page.locator('.seasonal-layer span').first().boundingBox();
      assert.ok(left.x < right.x - 5, `${device} must drift left`);
      await layer(page, 'christmas');
      await page.waitForSelector('.seasonal-layer--physics');
      assert.equal(await page.locator('.seasonal-controls').count(), 1);
      assert.equal(await page.evaluate(() => window.sensorRequests), 1);
      await openControls(page);
      await page.getByRole('button', { name: 'Desactivar inclinación' }).click();
      assert.equal(await page.locator('.seasonal-tilt-toggle').getAttribute('aria-pressed'), 'false');
      await page.evaluate(() => document.querySelector('.seasonal-layer').remove());
      await page.waitForFunction(() => !document.querySelector('.seasonal-controls'));
      await page.close();
    }
  } finally { await browser.close(); }
});

test('desktop keeps mouse interaction without mobile controls', async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await scene(browser, 'Desktop Chrome');
    await layer(page, 'autumn');
    await page.waitForSelector('.seasonal-layer--physics');
    assert.equal(await page.locator('.seasonal-controls').count(), 0);
    assert.equal(await page.evaluate(() => window.sensorRequests), 0);
  } finally { await browser.close(); }
});

test('missing Safari sensor data falls back to normal animation and page restore resumes it', async () => {
  const browser = await webkit.launch();
  try {
    const page = await scene(browser, 'iPhone 13');
    await layer(page, 'autumn');
    await page.waitForSelector('.seasonal-controls');
    await openControls(page);
    await page.getByRole('button', { name: 'Activar inclinación' }).click();
    await page.waitForFunction(() => document.querySelector('.seasonal-motion-status').textContent.includes('No llegan'), null, { timeout: 5000 });
    const particle = page.locator('.seasonal-layer span').first();
    const before = await particle.getAttribute('style');
    await page.evaluate(() => dispatchEvent(new Event('pageshow')));
    await page.waitForTimeout(120);
    assert.notEqual(await particle.getAttribute('style'), before);
    assert.equal(await page.locator('.seasonal-layer').isVisible(), true);
    assert.equal(await page.locator('.seasonal-controls').count(), 1);
  } finally { await browser.close(); }
});

test('button accumulations work on PC and Safari mobile, stay attached during scrolling and preserve clicks', async () => {
  for (const device of ['Desktop Chrome', 'iPhone 13', 'iPad Pro 11']) {
    const browser = device === 'Desktop Chrome' ? await chromium.launch({ headless: true, channel: 'msedge' }) : await webkit.launch();
    try {
      const page = await scene(browser, device);
      await page.evaluate(() => {
        const button = document.createElement('button');
        button.id = 'collecting-button'; button.textContent = 'Acción';
        button.style.cssText = 'position:absolute;left:calc(50% - 90px);top:calc(50vh + 10px);width:180px;height:44px';
        window.pileClicks = 0;
        button.onclick = () => window.pileClicks++;
        document.body.append(button);
      });
      const before = await page.locator('#collecting-button').boundingBox();
      const height = await page.evaluate(() => document.scrollingElement.scrollHeight);
      await layer(page, 'autumn');
      await page.waitForSelector('.seasonal-deposit');
      const deposit = page.locator('.seasonal-deposit').first();
      const landed = await deposit.boundingBox();
      assert.ok(Math.abs(landed.y + landed.height - before.y) < 1);
      assert.deepEqual(await page.locator('#collecting-button').boundingBox(), before);
      await page.evaluate(() => scrollTo(0, 1000));
      await page.waitForFunction(() => document.querySelector('.seasonal-deposit').getBoundingClientRect().bottom < 0);
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForFunction(top => {
        const r = document.querySelector('.seasonal-deposit').getBoundingClientRect();
        return Math.abs(r.bottom - top) < 1;
      }, before.y);
      await page.locator('#collecting-button').click();
      assert.equal(await page.evaluate(() => window.pileClicks), 1);
      assert.equal(await page.evaluate(() => document.scrollingElement.scrollHeight), height);
      await page.close();
    } finally { await browser.close(); }
  }
});
