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
