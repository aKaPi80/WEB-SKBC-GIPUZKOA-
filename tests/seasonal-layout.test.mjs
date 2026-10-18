import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

// Run with Playwright available in NODE_PATH and an installed Edge browser.
const { chromium } = createRequire(import.meta.url)('playwright');

test('seasonal decorations preserve the home layout on desktop and mobile', async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
    const page = await browser.newPage();
    await page.setContent(`<style>${css}</style><section class="hero">
      <div class="hero-bg"></div><div class="hero-logo"></div>
      <div class="hero-content"><h1>SKBC GIPUZKOA</h1><p>Shorinji Kempo</p></div>
      <div class="hero-proof">Club</div></section>`);
    const geometry = () => page.evaluate(() => Object.fromEntries(
      ['.hero', '.hero-logo', '.hero-content', '.hero-proof'].map(selector => {
        const element = document.querySelector(selector);
        const { x, y, width, height } = element.getBoundingClientRect();
        return [selector, { x, y, width, height, display: getComputedStyle(element).display }];
      })
    ));
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => document.documentElement.dataset.specialVisual = 'none');
      const baseline = await geometry();
      for (const mode of ['autumn', 'christmas', 'carnival', 'womensDay', 'mourning']) {
        await page.evaluate(value => document.documentElement.dataset.specialVisual = value, mode);
        assert.deepEqual(await geometry(), baseline, `${mode} at ${width}px must preserve layout`);
        if (['autumn', 'christmas', 'carnival'].includes(mode)) {
          const decoration = await page.locator('.hero-logo').evaluate(element => ({
            content: getComputedStyle(element, '::before').content,
            overflow: getComputedStyle(element).overflow
          }));
          assert.equal(decoration.content, 'none', 'artificial accumulation bands are removed');
        }
      }
    }
  } finally { await browser.close(); }
});

test('physics runs in an isolated overlay and respects reduced motion and replacement', async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
    const script = await readFile(new URL('../seasonal-effects.js', import.meta.url), 'utf8');
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.setContent(`<style>${css}</style><section class="hero"><div class="hero-logo"></div>
      <div class="hero-content"><h1>Club</h1></div></section>`);
    await page.addScriptTag({ content: script });
    const baseline = await page.locator('.hero-logo').boundingBox();
    for (const mode of ['autumn', 'christmas', 'carnival']) {
      await page.evaluate(mode => {
        document.querySelector('.seasonal-layer')?.remove();
        const layer = document.createElement('div');
        layer.className = `seasonal-layer seasonal-layer--${mode}`;
        layer.innerHTML = '<span style="--size:10px;--duration:10s;--x:20;--delay:0s;--drift:20px"></span>'.repeat(42);
        document.body.append(layer);
      }, mode);
      await page.waitForSelector('.seasonal-layer--physics');
      const particle = page.locator('.seasonal-layer span').first();
      await page.waitForFunction(() => document.querySelector('.seasonal-layer span').style.transform.includes('translate3d'));
      const before = await particle.getAttribute('style');
      await page.waitForTimeout(120);
      assert.notEqual(await particle.getAttribute('style'), before);
      assert.deepEqual(await page.locator('.hero-logo').boundingBox(), baseline);
      assert.equal(await particle.evaluate(el => getComputedStyle(el).animationName), 'none');
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.querySelector('.seasonal-layer--physics'));
    assert.equal(await page.locator('.seasonal-layer').isVisible(), false);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForSelector('.seasonal-layer--physics');
    await page.evaluate(() => document.querySelector('.seasonal-layer').remove());
    assert.equal(await page.locator('.seasonal-layer').count(), 0);
  } finally { await browser.close(); }
});

test('the real cursor dislodges accumulations without blocking clicks or touch scrolling', async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
    const script = await readFile(new URL('../seasonal-effects.js', import.meta.url), 'utf8');
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.setContent(`<style>${css}</style>
      <div class="card" style="position:absolute;left:600px;top:508px;width:240px;height:120px"></div>
      <button id="action" style="position:absolute;left:650px;top:480px;width:140px;height:60px">Test</button>`);
    await page.evaluate(() => {
      Math.random = () => 0.5;
      window.testClicks = 0;
      document.querySelector('#action').onclick = () => window.testClicks++;
    });
    await page.addScriptTag({ content: script });
    for (const mode of ['autumn', 'christmas', 'carnival']) {
      await page.evaluate(mode => {
        document.querySelector('.seasonal-layer')?.remove();
        const layer = document.createElement('div');
        layer.className = `seasonal-layer seasonal-layer--${mode}`;
        layer.innerHTML = '<span style="--size:10px"></span>';
        document.body.append(layer);
      }, mode);
      await page.waitForFunction(() => {
        const particle = document.querySelector('.seasonal-layer span');
        return particle && Math.abs(particle.getBoundingClientRect().bottom - 508) < 0.2;
      });
      const particle = page.locator('.seasonal-layer span');
      const resting = await particle.boundingBox();
      await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointermove', {
        pointerType: 'touch', clientX: 720, clientY: 503, movementX: 100, bubbles: true
      })));
      await page.waitForTimeout(100);
      assert.deepEqual(await particle.boundingBox(), resting, 'touch movement must leave the decoration alone');
      await page.mouse.move(640, 503);
      await page.mouse.move(780, 503, { steps: 6 });
      await page.waitForFunction(before => {
        const r = document.querySelector('.seasonal-layer span').getBoundingClientRect();
        return Math.abs(r.x - before.x) + Math.abs(r.y - before.y) > 5;
      }, resting);
      await page.locator('#action').click();
    }
    assert.equal(await page.evaluate(() => window.testClicks), 3);
  } finally { await browser.close(); }
});

test('bottom deposits stay at the real page end, preserve document size and respond to the cursor', async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
    const script = await readFile(new URL('../seasonal-effects.js', import.meta.url), 'utf8');
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.setContent(`<style>${css}</style><div style="height:3000px"></div>`);
    await page.evaluate(() => { Math.random = () => 0.98; });
    await page.addScriptTag({ content: script });
    const height = await page.evaluate(() => document.scrollingElement.scrollHeight);
    const insert = mode => page.evaluate(mode => {
      document.querySelector('.seasonal-layer')?.remove();
      const layer = document.createElement('div');
      layer.className = `seasonal-layer seasonal-layer--${mode}`;
      layer.innerHTML = '<span style="--size:10px"></span>';
      document.body.append(layer);
    }, mode);
    await insert('autumn');
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.seasonal-deposit').count(), 0, 'no artificial floor at the viewport bottom');
    for (const mode of ['autumn', 'christmas', 'carnival']) {
      await page.evaluate(() => scrollTo(0, document.scrollingElement.scrollHeight));
      await insert(mode);
      await page.waitForSelector('.seasonal-deposit');
      assert.equal(await page.evaluate(() => document.scrollingElement.scrollHeight), height);
      const deposit = page.locator('.seasonal-deposit').first();
      const resting = await deposit.boundingBox();
      assert.ok(resting.y > 960 && resting.y < 1000);
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForFunction(() => document.querySelector('.seasonal-deposit').getBoundingClientRect().top > 1000);
      await page.evaluate(() => scrollTo(0, document.scrollingElement.scrollHeight));
      await page.waitForFunction(() => document.querySelector('.seasonal-deposit').getBoundingClientRect().top < 1000);
      const before = await deposit.boundingBox();
      await page.mouse.move(1300, 990);
      await page.mouse.move(1435, 990, { steps: 8 });
      await page.waitForFunction(before => {
        const r = document.querySelector('.seasonal-deposit').getBoundingClientRect();
        return Math.abs(r.x - before.x) + Math.abs(r.y - before.y) > 3;
      }, before);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.querySelector('.seasonal-deposit'));
  } finally { await browser.close(); }
});
