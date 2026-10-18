import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { createParticle, step, floorSurface } = createRequire(import.meta.url)('../seasonal-effects.js');
const options = { width: 1000, height: 800, mode: 'autumn', random: () => 0.5 };
const surface = { id: 'logo', left: 100, right: 300, top: 200, radius: 0 };
const leaf = (id, values = {}) => Object.assign(createParticle(id, options), {
  x: 200, y: 190, vx: 0, vy: 60, size: 10, angle: 0, spin: 0, ...values
});

test('falling leaves accelerate with bounded frame steps', () => {
  const p = leaf(0, { y: 0, vy: 0 });
  step([p], [], 1, 0, options);
  assert.ok(p.vy > 0 && p.y < 5);
});
test('leaves land on real surfaces without passing through them', () => {
  const p = leaf(0, { y: 194 });
  step([p], [surface], 0.04, 0, options);
  assert.equal(p.support, 'logo');
  assert.equal(p.y, 195);
});
test('a rounded logo has a curved landing surface', () => {
  const p = leaf(0, { x: 120, y: 194 });
  step([p], [{ ...surface, radius: 100 }], 0.04, 0, options);
  assert.equal(p.support, null);
});
test('a leaf loses support when the underlying element disappears', () => {
  const p = leaf(0, { support: 'logo', resting: 2 });
  step([p], [], 0.03, 0, options);
  assert.equal(p.support, null);
  assert.ok(p.vy > 0);
});
test('gentle impacts build temporary stacks and off-center leaves lose balance', () => {
  const lower = leaf(0, { y: 195, support: 'logo', offset: 100, resting: 2 });
  const incoming = leaf(1, { x: 204, y: 184.5, vy: 25 });
  step([lower, incoming], [surface], 0.04, 0, options);
  assert.equal(incoming.support, lower.id);
  step([lower, incoming], [surface], 0.04, 0, options);
  assert.equal(incoming.support, null, 'an off-center upper leaf must slide off');
});
test('an upper leaf falls when the supporting leaf moves', () => {
  const lower = leaf(0, { y: 195, support: null });
  const upper = leaf(1, { y: 185, support: 0, resting: 2 });
  step([lower, upper], [], 0.03, 0, options);
  assert.equal(upper.support, null);
});
test('an incoming leaf dislodges a resting leaf on impact', () => {
  const lower = leaf(0, { y: 195, support: 'logo', offset: 100, resting: 2 });
  const incoming = leaf(1, { y: 183, vy: 120 });
  step([lower, incoming], [surface], 0.04, 0, options);
  assert.equal(lower.support, null);
  assert.ok(Math.abs(lower.vx) > 0);
});
test('temporary accumulation recycles particles instead of growing indefinitely', () => {
  const p = leaf(0, { y: 195, support: 'logo', offset: 100, resting: 0.01 });
  step([p], [surface], 0.04, 0, options);
  assert.equal(p.support, null);
});
test('snow, leaves and confetti have different fall speeds', () => {
  const speeds = ['autumn', 'christmas', 'carnival'].map(mode => {
    const p = leaf(0, { y: 0, vy: 1000 });
    step([p], [], 0.04, 0, { ...options, mode });
    return p.vy;
  });
  assert.equal(new Set(speeds).size, 3);
});

test('a moving cursor sweeps resting particles off their support in every mode', () => {
  for (const mode of ['autumn', 'christmas', 'carnival']) {
    const p = leaf(0, { y: 195, support: 'logo', offset: 100, resting: 2 });
    const pointer = { fromX: 100, fromY: 190, x: 300, y: 190, vx: 900, vy: 0, time: 1 };
    step([p], [surface], 0.02, 1, { ...options, mode, pointer });
    assert.equal(p.support, null, `${mode} must respond to a cursor crossing its position`);
    assert.ok(p.vx > 0);
  }
});

test('distant and expired cursors leave accumulations in place', () => {
  for (const pointer of [
    { fromX: 600, fromY: 600, x: 700, y: 600, vx: 900, vy: 0, time: 1 },
    { fromX: 100, fromY: 190, x: 300, y: 190, vx: 900, vy: 0, time: 0 }
  ]) {
    const p = leaf(0, { y: 195, support: 'logo', offset: 100, resting: 2 });
    step([p], [surface], 0.02, 1, { ...options, pointer });
    assert.equal(p.support, 'logo');
  }
});

test('cursor gusts move snow more gently than leaves and preserve finite velocities', () => {
  const pointer = { fromX: 180, fromY: 195, x: 200, y: 195, vx: 1600, vy: 0, time: 1 };
  const speeds = ['autumn', 'christmas'].map(mode => {
    const p = leaf(0, { y: 195 });
    step([p], [], 0.04, 1, { ...options, mode, pointer });
    const initialSpeed = p.vx;
    for (let i = 0; i < 20; i++) step([p], [], 0.04, 1, { ...options, mode, pointer });
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.ok(Math.abs(p.vx) <= 260);
    return initialSpeed;
  });
  assert.ok(speeds[0] > speeds[1]);
});

test('the accumulation floor belongs to the document end, not the viewport', () => {
  assert.equal(floorSurface(1000, 3000, 0).top, 2998);
  assert.equal(floorSurface(1000, 3000, 2200).top, 798);
});

test('particles settle at the page end while the falling supply continues', () => {
  for (const mode of ['autumn', 'christmas', 'carnival']) {
    const deposits = [];
    const floor = { id: 'page-floor', left: 0, right: 1000, top: 798, radius: 0 };
    const p = leaf(0, { y: 792, vy: 70 });
    step([p], [floor], 0.04, 0, { ...options, mode, deposits });
    assert.equal(deposits.length, 1, mode);
    assert.equal(deposits[0].support, 'page-floor');
    assert.ok(p.y < 0, 'the airborne particle returns above the screen');
  }
});

test('bottom accumulations have a bounded pool and stay attached when scrolling away', () => {
  const deposits = [];
  const config = { ...options, deposits, maxDeposits: 3 };
  const floor = floorSurface(1000, 800, 0);
  for (let i = 0; i < 20; i++) step([leaf(i, { x: 100 + i * 30, y: 792, vy: 70 })], [floor], 0.04, i, config);
  assert.equal(deposits.length, 3);
  step([], [floorSurface(1000, 3000, 0)], 0.04, 21, config);
  assert.ok(deposits.every(p => p.y > options.height), 'stored leaves move offscreen with the document end');
});

test('cursor gusts can detach bottom accumulations', () => {
  const floor = floorSurface(1000, 800, 0);
  const p = leaf(-1, { x: 200, y: 793, support: 'page-floor', offset: 200, resting: 30, floor: true });
  const pointer = { fromX: 100, fromY: 790, x: 300, y: 790, vx: 900, vy: 0, time: 1 };
  step([], [floor], 0.02, 1, { ...options, deposits: [p], pointer });
  assert.equal(p.support, null);
  assert.ok(p.vx > 0);
});
