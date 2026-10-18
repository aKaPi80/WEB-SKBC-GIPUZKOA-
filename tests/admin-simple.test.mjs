import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('localhost publication uses the local service without asking for a GitHub token', async () => {
  const source = await readFile(new URL('../admin.js', import.meta.url), 'utf8');
  const fn = source.slice(source.indexOf('function shouldUseGithubApi()'), source.indexOf('async function githubToken()'));
  for (const hostname of ['localhost', '127.0.0.1']) assert.equal(vm.runInNewContext(`${fn}; shouldUseGithubApi()`, { location: { hostname } }), false);
  assert.equal(vm.runInNewContext(`${fn}; shouldUseGithubApi()`, { location: { hostname: 'www.skbcgipuzkoa.com' } }), true);
});

test('an edit made during a publication remains pending and is not included in the published baseline', async () => {
  const source = await readFile(new URL('../admin.js', import.meta.url), 'utf8');
  const handlerSource = source.slice(source.indexOf('document.querySelector("#publish").addEventListener'), source.indexOf('async function publishWithGithubApi'));
  let handler;
  const element = { addEventListener: (_, callback) => { handler = callback; } };
  const baseline = { settings: {}, languages: { es: { title: 'Before' } } };
  const submitted = { settings: {}, languages: { es: { title: 'Submitted' } } };
  const context = {
    document: { querySelector: () => element }, location: { protocol: 'http:' },
    confirm: () => true, alert: () => {}, setStatus: () => {}, shouldUseGithubApi: () => false,
    structuredClone, data: structuredClone(submitted), publishedContentSnapshot: baseline,
    dirty: true, contentSignature: JSON.stringify, deepEqual: (a,b) => JSON.stringify(a) === JSON.stringify(b),
    fetch: async (_, request) => {
      assert.deepEqual(JSON.parse(request.body).content, submitted);
      context.data.languages.es.title = 'Edited while publishing';
      return {ok: true, json: async () => ({message: 'Publicado', url: 'https://example.com'})};
    }
  };
  vm.runInNewContext(handlerSource, context);
  await handler();
  assert.equal(context.dirty, true);
  assert.equal(context.publishedContentSnapshot.languages.es.title, 'Submitted');
  assert.equal(element.disabled, false);
});

test('every existing panel remains reachable through five main groups and configuration', async () => {
  const context = { window: {} };
  vm.runInNewContext(await readFile(new URL('../admin-simple.js', import.meta.url), 'utf8'), context);
  const { groups, groupFor } = context.window.SKBC_ADMIN_SIMPLE;
  assert.equal(groups.filter(group => !group.secondary).length, 5);
  for (const panel of ['dashboard', 'settings', 'system', 'es', 'eu', 'en', 'people', 'events', 'news', 'leads', 'testimonials', 'merch', 'orders', 'kenshi', 'custom', 'advanced']) {
    assert.ok(groupFor(panel), `${panel} is reachable`);
  }
  assert.equal(groupFor('orders').id, 'shop');
  assert.equal(groupFor('eu').id, 'website');
  assert.equal(groupFor('testimonials').id, 'requests');
});

test('home actions and names are escaped without displaying invented private counts', async () => {
  const context = { window: {} };
  vm.runInNewContext(await readFile(new URL('../admin-simple.js', import.meta.url), 'utf8'), context);
  const html = context.window.SKBC_ADMIN_SIMPLE.home([{ title: '<img onerror=alert(1)>', date: '2026-11-01' }]);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img|0 pedidos|0 solicitudes/);
  for (const panel of ['es', 'news', 'events', 'orders', 'leads']) assert.match(html, new RegExp(`data-open-panel="${panel}"`));
});

test('order cards display current product snapshots and Spanish status labels', async () => {
  const source = await readFile(new URL('../admin.js', import.meta.url), 'utf8');
  const fn = source.slice(source.indexOf('function orderTemplate('), source.indexOf('async function updateOrderStatus('));
  const html = vm.runInNewContext(`${fn}; orderTemplate(order)`, {
    order: { id: 'example', status: 'pending', total_cents: 12500, items: [{product_name: 'Dogi adulto', size: '180', recipient: 'Alumno', quantity: 1}] },
    escapeHtml: value => String(value ?? '').replace(/</g, '&lt;')
  });
  assert.match(html, /Dogi adulto/);
  assert.match(html, /Pendiente/);
  assert.match(html, /125/);
  assert.match(html, /Alumno/);
});
