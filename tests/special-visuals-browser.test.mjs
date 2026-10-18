import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const { chromium } = createRequire(import.meta.url)('playwright');

test('combined commemorations attach ribbons to logos without changing layout at desktop or mobile sizes', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage();
    const api = vm.createContext({ Date, dateKey: () => '2026-10-18', state: { lang: 'en' }, escapeHtml: value => String(value) });
    vm.runInContext(source.slice(source.indexOf('function specialVisualSettings('), source.indexOf('function alertBannerSettings(')), api);
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.setContent(`<style>${css}</style><header class="topbar"><span class="brand-mark"></span></header>
        <section class="hero"><div class="hero-logo"></div><div class="hero-content"><h1>Club</h1></div></section>`);
      const geometry = () => page.evaluate(() => ['.hero-logo', '.brand-mark', '.hero-content', '.hero'].map(selector => {
        const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
        return { x, y, width, height };
      }));
      const baseline = await geometry();
      for (const mode of ['christmas', 'autumn', 'carnival']) {
        const settings = { specialVisual: { mode, mourning: true, womensDay: true } };
        const html = { hero: api.mourningRibbon(settings, 'hero'), brand: api.mourningRibbon(settings, 'brand'), layer: api.specialVisualLayer(settings) };
        await page.evaluate(({ html, mode }) => {
          document.querySelector('.hero-logo').innerHTML = html.hero;
          document.querySelector('.brand-mark').innerHTML = html.brand;
          document.querySelector('.seasonal-layer')?.remove();
          document.querySelector('.special-badge')?.remove();
          document.body.insertAdjacentHTML('beforeend', html.layer);
          document.documentElement.dataset.specialVisual = mode;
          document.documentElement.dataset.womensDay = 'true';
          document.documentElement.dataset.mourning = 'true';
        }, { html, mode });
        assert.deepEqual(await geometry(), baseline);
        assert.equal(await page.locator(`.seasonal-layer--${mode}`).count(), 1);
        const visibleLogo = width > 1100 ? '.hero-logo' : '.brand-mark';
        const ribbon = page.locator(`${visibleLogo} .logo-mourning`);
        assert.equal(await ribbon.isVisible(), true);
        const box = await ribbon.boundingBox();
        const parent = await page.locator(visibleLogo).boundingBox();
        assert.ok(box.x >= parent.x && box.y >= parent.y);
        assert.ok(box.x + box.width <= parent.x + parent.width + 1);
        assert.equal(await ribbon.evaluate(node => getComputedStyle(node).position), 'absolute');
        assert.equal(await ribbon.evaluate(node => getComputedStyle(node).pointerEvents), 'none');
        assert.equal(await page.locator('.special-badge--mourning').count(), 0);
        assert.equal(await page.locator('html').evaluate(node => getComputedStyle(node).getPropertyValue('--red').trim()), '#7b2cbf');
      }
    }
  } finally { await browser.close(); }
});
