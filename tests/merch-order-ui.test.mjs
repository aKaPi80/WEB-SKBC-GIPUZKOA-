import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [app, content, html, styles] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../content.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
]);

test('public catalog is loaded from active Supabase product and variant tables', () => {
  assert.match(app, /skbc_merch_products\?[^`"']*is_active=eq\.true/);
  assert.match(app, /skbc_merch_variants\?[^`"']*is_active=eq\.true/);
  assert.match(app, /Dogis/);
  assert.match(app, /Cinturones/);
  assert.match(app, /Ropa del club/);
  assert.match(app, /Otros/);
});

test('product cards disclose source and generated-image attribution without prices', () => {
  const cardSource = app.slice(app.indexOf('function merchProductCard'), app.indexOf('function merchCartHtml'));
  assert.match(cardSource, /image_attribution/);
  assert.match(cardSource, /source_url/);
  assert.doesNotMatch(cardSource, /price_cents|unit_price_cents|money\(/);
});

test('order drawer is accessible and collects the required public-order fields', () => {
  assert.match(app, /role="dialog"/);
  assert.match(app, /aria-modal="true"/);
  assert.match(app, /aria-labelledby="merchDrawerTitle"/);
  for (const field of ['name', 'email', 'phone', 'privacyAccepted']) {
    assert.match(app, new RegExp(`name="${field}"[^>]*required|required[^>]*name="${field}"`));
  }
  assert.match(app, /name="memberReference"/);
  assert.match(app, /name="comments"/);
  assert.doesNotMatch(app, /name="payment"/);
});

test('submission uses only the normalized RPC and retains the idempotency key on failure', () => {
  assert.match(app, /rpc\/submit_skbc_merch_order/);
  assert.match(app, /buildOrderPayload/);
  assert.match(app, /idempotencyKey/);
  const submitter = app.slice(app.indexOf('async function submitMerchOrderToSupabase'), app.indexOf('function merchSection'));
  assert.doesNotMatch(submitter, /rest\/v1\/\$\{config\.table\}/);

  const binder = app.slice(app.indexOf('function bindMerch'), app.indexOf('function openProfile'));
  assert.doesNotMatch(binder, /whatsapp|window\.open|confirm\(/i);
});

test('ordering UI includes stable drawer states and the supplied size guide', () => {
  assert.match(styles, /\.merch-drawer/);
  assert.match(styles, /100dvh/);
  assert.match(styles, /\.merch-status--loading/);
  assert.match(styles, /\.merch-status--error/);
  assert.match(styles, /\.merch-status--success/);
  assert.match(content, /Gu[ií]a de tallas/);
  assert.match(html, /app\.js\?v=20260928-material-orders-ui/);
});
