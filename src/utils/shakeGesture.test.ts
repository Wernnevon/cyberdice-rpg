// Derived from .specs/features/sound-polish/spec.md (SPL-05). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CALM_MS, canShakeRoll, createShakeGesture, createShakeHandler, RATTLE_THRESHOLD, ROLL_THRESHOLD } from './shakeGesture.ts';

const WEAK = (RATTLE_THRESHOLD + ROLL_THRESHOLD) / 2; // rattles, never rolls
const STRONG = ROLL_THRESHOLD + 1;
const CALM = RATTLE_THRESHOLD / 2;

/** Feeds [force, ms] samples; returns what each one reported. */
const feed = (g: ReturnType<typeof createShakeGesture>, samples: [number, number][], canRoll = true) =>
  samples.map(([f, t]) => g(f, t, canRoll));

test('SPL-05.1 motion above the rattle threshold rattles', () => {
  const g = createShakeGesture();
  assert.deepEqual(feed(g, [[WEAK, 0], [STRONG, 16], [RATTLE_THRESHOLD + 0.1, 32]]), ['rattle', 'rattle', 'rattle']);
  const quiet = createShakeGesture();
  assert.deepEqual(feed(quiet, [[CALM, 0], [RATTLE_THRESHOLD, 16]]), [null, null], 'at or below the threshold: silent');
});

test('SPL-05.2 300 ms below the rattle threshold after a strong shake starts exactly one roll', () => {
  const g = createShakeGesture();
  feed(g, [[WEAK, 0], [STRONG, 50], [WEAK, 100]]);
  // last motion above the threshold at 100 ms: calm until 399 ms is not enough
  assert.deepEqual(feed(g, [[CALM, 200], [CALM, 100 + CALM_MS - 1]]), [null, null]);
  assert.equal(g(CALM, 100 + CALM_MS, true), 'roll');
  assert.deepEqual(feed(g, [[CALM, 500], [CALM, 900], [CALM, 2000]]), [null, null, null], 'only one roll');
  // a short dip inside the shake does not end it
  const dip = createShakeGesture();
  assert.deepEqual(feed(dip, [[STRONG, 0], [CALM, 150], [WEAK, 250], [CALM, 400]]), ['rattle', null, 'rattle', null]);
  assert.equal(dip(CALM, 250 + CALM_MS, true), 'roll');
});

test('SPL-05.3 300 ms calm after a shake that never reached the roll threshold stops with no roll', () => {
  const g = createShakeGesture();
  feed(g, [[WEAK, 0], [WEAK, 50], [ROLL_THRESHOLD, 100]]);
  assert.deepEqual(feed(g, [[CALM, 100 + CALM_MS], [CALM, 1000]]), [null, null]);
  // the next shake starts over: a strong one now rolls
  feed(g, [[STRONG, 2000]]);
  assert.equal(g(CALM, 2000 + CALM_MS, true), 'roll');
});

test('SPL-05.4 no rattle and no roll while the app cannot roll', () => {
  const g = createShakeGesture();
  assert.deepEqual(feed(g, [[STRONG, 0], [STRONG, 50], [CALM, 400], [CALM, 900]], false), [null, null, null, null]);
  // a strong shake that becomes unrollable mid-gesture does not roll later
  const mid = createShakeGesture();
  feed(mid, [[STRONG, 0]]);
  assert.equal(mid(STRONG, 50, false), null);
  assert.deepEqual(feed(mid, [[CALM, 400], [CALM, 900]]), [null, null]);
});

test('SPL-05.1 the motion handler plays a rattle click for each rattling step, and rolls on release', () => {
  const clicks: number[] = [];
  let rolls = 0;
  const handle = createShakeHandler((t) => clicks.push(t), () => rolls++, () => true);
  handle(WEAK, 0);
  handle(STRONG, 50);
  handle(CALM, 100);
  assert.deepEqual(clicks, [0, 50]);
  assert.equal(rolls, 0);
  handle(CALM, 50 + CALM_MS);
  assert.equal(rolls, 1);
  assert.deepEqual(clicks, [0, 50], 'no click while calm');
});

test('SPL-05.4 shake can roll only on the table view while no dice move', () => {
  assert.equal(canShakeRoll('table', false), true);
  assert.equal(canShakeRoll('table', true), false, 'dice still moving');
  assert.equal(canShakeRoll('history', false), false);
  assert.equal(canShakeRoll('formula', false), false);
  // the handler honours it: no click and no roll while it says no
  const clicks: number[] = [];
  let rolls = 0;
  const handle = createShakeHandler((t) => clicks.push(t), () => rolls++, () => canShakeRoll('history', false));
  handle(STRONG, 0);
  handle(CALM, CALM_MS + 10);
  assert.deepEqual(clicks, []);
  assert.equal(rolls, 0);
});
