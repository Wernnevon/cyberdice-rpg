// Derived from .specs/features/sound-polish/spec.md (SPL-05) and shake-animation/spec.md (SHA-01.5, SHA-02.1, SHA-04). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CALM_MS, canShakeRoll, createShakeGesture, createShakeHandler, MAX_IMPULSE, MIN_IMPULSE, RATTLE_THRESHOLD, ROLL_THRESHOLD, shakeImpulse } from './shakeGesture.ts';

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
  assert.equal(canShakeRoll('table', false, '1d20'), true);
  assert.equal(canShakeRoll('table', true, '1d20'), false, 'dice still moving');
  assert.equal(canShakeRoll('history', false, '1d20'), false);
  assert.equal(canShakeRoll('formula', false, '1d20'), false);
  // the handler honours it: no click and no roll while it says no
  const clicks: number[] = [];
  let rolls = 0;
  const handle = createShakeHandler((t) => clicks.push(t), () => rolls++, () => canShakeRoll('history', false, '1d20'));
  handle(STRONG, 0);
  handle(CALM, CALM_MS + 10);
  assert.deepEqual(clicks, []);
  assert.equal(rolls, 0);
});

/** A handler that records every call it makes, in order. */
function recorder(canRoll: () => boolean = () => true) {
  const calls: string[] = [];
  const handle = createShakeHandler((t, f) => calls.push(`rattle@${t}:${f}`), () => calls.push('roll'), canRoll, {
    start: () => calls.push('start'),
    cancel: () => calls.push('cancel'),
  });
  return { calls, handle };
}

test('SHA-01.5 with no valid roll set up, shaking starts nothing and rattles nothing', () => {
  assert.equal(canShakeRoll('table', false, ''), false, 'no dice selected');
  assert.equal(canShakeRoll('table', false, '10d4+10d6+10d8+1d10'), false, 'over the dice cap: not a valid roll');
  assert.equal(canShakeRoll('table', false, '10d4+10d6+10d8'), true, 'at the cap');
  const { calls, handle } = recorder(() => canShakeRoll('table', false, '10d4+10d6+10d8+1d10'));
  handle(STRONG, 0);
  handle(WEAK, 50);
  handle(CALM, 50 + CALM_MS);
  assert.deepEqual(calls, []);
});

test('SHA-01.5 a strong shake reports start once, then rattles with the force, then rolls', () => {
  const { calls, handle } = recorder();
  handle(WEAK, 0);
  handle(STRONG, 50);
  handle(CALM, 50 + CALM_MS);
  assert.deepEqual(calls, ['start', `rattle@0:${shakeImpulse(WEAK)}`, `rattle@50:${shakeImpulse(STRONG)}`, 'roll']);
  // the next gesture starts again
  handle(STRONG, 1000);
  assert.deepEqual(calls.slice(4), ['start', `rattle@1000:${shakeImpulse(STRONG)}`]);
});

test('SHA-02.1 the push grows with the force, from the minimum at the rattle threshold to the maximum at twice the roll threshold', () => {
  assert.equal(shakeImpulse(RATTLE_THRESHOLD), MIN_IMPULSE);
  assert.equal(shakeImpulse(2 * ROLL_THRESHOLD), MAX_IMPULSE);
  assert.equal(shakeImpulse(10 * ROLL_THRESHOLD), MAX_IMPULSE, 'capped above');
  assert.ok(MAX_IMPULSE > MIN_IMPULSE);
  const mid = (RATTLE_THRESHOLD + 2 * ROLL_THRESHOLD) / 2;
  assert.ok(Math.abs(shakeImpulse(mid) - (MIN_IMPULSE + MAX_IMPULSE) / 2) < 1e-9, 'halfway in force is halfway in push');
  let last = 0;
  for (let f = RATTLE_THRESHOLD; f <= 2 * ROLL_THRESHOLD; f += 1) {
    assert.ok(shakeImpulse(f) > last, `not growing at ${f}`);
    last = shakeImpulse(f);
  }
});

test('SHA-02.1 each rattle step hands the held dice a push that grows with the force', () => {
  const pushes: number[] = [];
  const handle = createShakeHandler((_t, i) => pushes.push(i), () => {}, () => true);
  handle(WEAK, 0);
  handle(STRONG, 20);
  handle(2 * ROLL_THRESHOLD + 5, 40);
  assert.deepEqual(pushes, [shakeImpulse(WEAK), shakeImpulse(STRONG), MAX_IMPULSE]);
  assert.ok(pushes[0] < pushes[1] && pushes[1] < pushes[2]);
});

test('SHA-04.1 a weak shake reports cancel once when it ends, and no roll', () => {
  const { calls, handle } = recorder();
  handle(WEAK, 0);
  handle(WEAK, 50);
  handle(CALM, 100);
  handle(CALM, 50 + CALM_MS - 1);
  assert.deepEqual(calls, ['start', `rattle@0:${shakeImpulse(WEAK)}`, `rattle@50:${shakeImpulse(WEAK)}`], 'not over yet');
  handle(CALM, 50 + CALM_MS);
  handle(CALM, 2000);
  assert.deepEqual(calls.slice(3), ['cancel']);
});

test('SHA-04.3 a view change or a button roll mid-shake reports cancel, and no later roll', () => {
  let can = true;
  const { calls, handle } = recorder(() => can);
  handle(STRONG, 0);
  can = false; // the user opened the history, or tapped ROLAR! (dice now rolling)
  handle(STRONG, 50);
  handle(CALM, 400);
  can = true;
  handle(CALM, 900);
  assert.deepEqual(calls, ['start', `rattle@0:${shakeImpulse(STRONG)}`, 'cancel']);
});
