import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [app, content, html, styles] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../content.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8'),
]);

test('public catalog is loaded only from the restricted safe catalog view', () => {
  const loader = app.slice(app.indexOf('async function loadMerchCatalog'), app.indexOf('async function submitMerchOrderToSupabase'));
  assert.match(loader, /skbc_merch_catalog_public\?/);
  assert.doesNotMatch(loader, /select=\*/);
  assert.doesNotMatch(loader, /skbc_merch_products|skbc_merch_variants/);
  assert.match(app, /Dogis/);
  assert.match(app, /Cinturones/);
  assert.match(app, /Ropa del club/);
  assert.match(app, /Otros/);
});

test('catalog failure renders an approved browse-only fallback with pending confirmation messaging', () => {
  assert.match(app, /APPROVED_FALLBACK_CATALOG/);
  assert.match(app, /disponibilidad y precios pendientes de confirmaci[oó]n/i);
  assert.match(app, /catalogSource[^\n]+fallback/);
  assert.match(app, /variant\.is_orderable/);
});

test('product cards show SKBC descriptions and attribution without supplier links or prices', () => {
  const cardSource = app.slice(app.indexOf('function merchProductCard'), app.indexOf('function merchCartHtml'));
  assert.match(cardSource, /image_attribution/);
  assert.match(cardSource, /product\.description/);
  assert.doesNotMatch(cardSource, /source_url|Ficha oficial Fujimae|href=/);
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
  assert.match(binder, /setMerchSubmitting/);
  assert.match(binder, /structuredClone|map\(\(line\) => \(\{ \.\.\.line \}\)\)/);
  assert.match(binder, /failedFingerprint/);
  assert.match(binder, /removeSubmittedCartLines/);
});

test('product cards never navigate customers to the supplier site', () => {
  const cardSource = app.slice(app.indexOf('function merchProductCard'), app.indexOf('function merchCartHtml'));
  assert.doesNotMatch(cardSource, /safeHttpsUrl|source_url|fujimae\.com|target="_blank"/);
});

test('ordering UI includes stable drawer states and the supplied size guide', () => {
  assert.match(styles, /\.merch-drawer/);
  assert.match(styles, /100dvh/);
  assert.match(styles, /\.merch-status--loading/);
  assert.match(styles, /\.merch-status--error/);
  assert.match(styles, /\.merch-status--success/);
  assert.match(content, /Gu[ií]a de tallas/);
  assert.match(app, /data-open-size-guide/);
  assert.match(app, /merch-size-thumb/);
  assert.match(app, /assets\/guides\/guia-tallas-dogis\.png/);
  assert.doesNotMatch(app, /0000 \(110 cm\).*7 \(210 cm\)/);
  assert.match(styles, /\.merch-size-modal\.is-open/);
  assert.match(html, /styles\.css\?v=20260928-compact-catalog/);
  assert.match(html, /app\.js\?v=20260928-reference-only/);
});

test('catalog cards keep details collapsed until the customer opens them', () => {
  const cardSource = app.slice(app.indexOf('function merchProductCard'), app.indexOf('function merchCatalogHtml'));
  assert.match(cardSource, /<details class="merch-product__details">/);
  assert.match(cardSource, /<summary class="merch-product__summary">/);
  assert.match(cardSource, /Ver detalles/);
  assert.match(cardSource, /<span>Ref\. \$\{escapeHtml\(product\.supplier_reference\)\}<\/span>/);
  assert.doesNotMatch(cardSource, /product\.brand/);
  assert.match(styles, /\.merch-product__details\[open\]/);
});

test('belt variants show both color and length in the order selector', () => {
  const optionsSource = app.slice(app.indexOf('function merchVariantOptions'), app.indexOf('function addMerchLine'));
  assert.match(optionsSource, /productCategory\(product \|\| \{\}\) === "belt"/);
  assert.match(optionsSource, /`\$\{color\} · \$\{size\}`/);
});
