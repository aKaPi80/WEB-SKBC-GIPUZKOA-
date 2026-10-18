import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = new URL('../', import.meta.url);

test('public language links are crawlable and schema describes the club identity', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  for (const lang of ['es', 'eu', 'en']) {
    assert.match(html, new RegExp(`<a[^>]+href="${lang === 'es' ? '/' : '/\\?lang=' + lang}"[^>]+data-lang="${lang}"`));
  }
  const schema = JSON.parse(html.match(/id="structured-data">([\s\S]*?)<\/script>/)[1]);
  assert.ok(!schema.sameAs.includes('https://www.internationalkempo.org/'));
});

test('optimized image aliases preserve custom uploads and use existing smaller assets', async () => {
  const source = await readFile(new URL('app.js', root), 'utf8');
  const start = source.indexOf('function optimizedImage(');
  assert.ok(start >= 0);
  const context = vm.createContext({});
  vm.runInContext(source.slice(start, source.indexOf('function systemLogo(', start)), context);
  for (const input of ['assets/logo-skbc.png', 'assets/logo-skbc-full.png', 'assets/ika-logo-white.png', 'assets/uploads/1781000961499-fondo-web.png']) {
    const output = context.optimizedImage(input);
    assert.notEqual(output, input);
    assert.ok((await readFile(new URL(output, root))).length < (await readFile(new URL(input, root))).length);
  }
  assert.equal(context.optimizedImage('assets/uploads/custom.png'), 'assets/uploads/custom.png');
  assert.equal(context.optimizedImage('assets/ika-logo-white.png?v=2'), 'assets/optimized/ika-logo-white.webp?v=2');
});

test('mobile header controls remain visible in all languages', async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const css = await readFile(new URL('styles.css', root), 'utf8');
    const html = await readFile(new URL('index.html', root), 'utf8');
    const page = await browser.newPage();
    await page.setContent(`<style>${css}\n* { transition: none !important; }</style>${html.match(/<header[\s\S]*?<\/header>/)[0]}`);
    for (const width of [320, 360, 375, 390, 414, 640, 768]) {
      await page.setViewportSize({ width, height: 900 });
      for (const label of ['Área Kenshi', 'Kenshi Gunea', 'Kenshi Area']) {
        await page.locator('.kenshi-access').evaluate((el, text) => el.textContent = text, label);
        const bounds = await page.locator('.brand, .menu-button, .language-switch, .kenshi-access').evaluateAll(els => els.map(el => {
          const r = el.getBoundingClientRect(); return { left: r.left, right: r.right };
        }));
        assert.ok(bounds.every(r => r.left >= 0 && r.right <= width), `${width}px ${label}: ${JSON.stringify(bounds)}`);
      }
    }
  } finally { await browser.close(); }
});
