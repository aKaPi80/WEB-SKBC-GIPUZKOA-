import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function setup() {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const functions = source.slice(source.indexOf('function specialVisualSettings('), source.indexOf('function alertBannerSettings('));
  const context = vm.createContext({ Date, dateKey: () => '2026-10-18', state: { lang: 'es' },
    escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') });
  vm.runInContext(functions, context);
  return context;
}

test('mourning and Womens Day can coexist with every particle effect', async () => {
  const api = await setup();
  for (const mode of ['christmas', 'autumn', 'carnival']) {
    const settings = { specialVisual: { mode, mourning: true, womensDay: true } };
    const visual = api.specialVisualSettings(settings);
    assert.equal(visual.mode, mode);
    assert.equal(visual.mourning, true);
    assert.equal(visual.womensDay, true);
    const layer = api.specialVisualLayer(settings);
    assert.ok(layer.includes(`seasonal-layer--${mode}`));
    assert.ok(layer.includes('special-badge--womensDay'));
    assert.ok(!layer.includes('mourning-ribbon'), 'the ribbon belongs to the logos, not the fixed overlay');
  }
});

test('overlapping schedules combine commemorations instead of suppressing seasonal weather', async () => {
  const api = await setup();
  const row = mode => ({ enabled: true, mode, start: '2026-10-17', end: '2026-10-20' });
  const visual = api.specialVisualSettings({ specialVisual: { mode: 'none', schedule: [row('mourning'), row('womensDay'), row('autumn')] } });
  assert.equal(visual.mode, 'autumn');
  assert.equal(visual.mourning, true);
  assert.equal(visual.womensDay, true);
});

test('existing stand-alone modes and default off state remain compatible', async () => {
  const api = await setup();
  assert.equal(api.specialVisualSettings({}).mourning, false);
  assert.equal(api.specialVisualSettings({}).womensDay, false);
  assert.equal(api.specialVisualSettings({ specialVisual: { mode: 'mourning' } }).mourning, true);
  assert.equal(api.specialVisualSettings({ specialVisual: { mode: 'womensDay' } }).womensDay, true);
  assert.equal(api.specialVisualSettings({ specialVisual: { mode: 'autumn', mourning: 'false' } }).mourning, false);
  const inactive = api.specialVisualSettings({ specialVisual: { schedule: [
    { mode: 'mourning', enabled: false, start: '2026-10-18', end: '2026-10-18' },
    { mode: 'womensDay', start: '2026-03-08', end: '2026-03-08' }
  ] } });
  assert.equal(inactive.mourning, false);
  assert.equal(inactive.womensDay, false);
});

test('logo ribbons have unique SVG references, escaped labels and no fixed badge', async () => {
  const api = await setup();
  const settings = { specialVisual: { mode: 'mourning', message: '<Recuerdo>' } };
  const hero = api.mourningRibbon(settings, 'hero');
  const brand = api.mourningRibbon(settings, 'brand');
  assert.ok(hero.includes('logo-mourning--hero'));
  assert.ok(brand.includes('logo-mourning--brand'));
  assert.ok(hero.includes('&lt;Recuerdo&gt;'));
  assert.ok(!hero.includes('<Recuerdo>'));
  assert.ok(hero.includes('mourningRibbon-hero-A'));
  assert.ok(brand.includes('mourningRibbon-brand-A'));
  assert.equal(api.mourningRibbon({}, 'hero'), '');
  assert.equal(api.specialVisualLayer(settings), '');
});

test('editor toggles default off and persist actual booleans', async () => {
  const source = await readFile(new URL('../admin.js', import.meta.url), 'utf8');
  const context = vm.createContext({ selectTemplate: (id, path, value, options, type) => ({ value, type }) });
  vm.runInContext(source.slice(source.indexOf('function parseFieldValue('), source.indexOf('function setStatus(')), context);
  vm.runInContext(source.slice(source.indexOf('function controlTemplate('), source.indexOf('function specialVisualScheduleTemplate(')), context);
  assert.equal(context.formatFieldValue(undefined, 'specialVisualToggle'), 'false');
  assert.equal(context.controlTemplate('id', 'path', '', 'specialVisualToggle').value, 'false');
  for (const value of [true, false]) {
    assert.equal(context.parseFieldValue(context.formatFieldValue(value, 'specialVisualToggle'), 'specialVisualToggle'), value);
  }
  assert.match(source, /\["settings", "specialVisual", "mourning"\]/);
  assert.match(source, /\["settings", "specialVisual", "womensDay"\]/);
});
