// Derived from .specs/features/sound-polish/spec.md (SPL-05) and shake-animation/spec.md (SHA-01.5, SHA-02.1, SHA-04, SHA-05). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CALM_MS, canShakeRoll, createShakeGesture, createShakeHandler, dieMaterial, FLYING, heldVelocity, pushHeld, MAX_IMPULSE, MIN_IMPULSE, PUSH_SPREAD, pushDirection, screenMotion, RATTLE_THRESHOLD, ROLL_THRESHOLD, shakeImpulse, STALE_MS } from './shakeGesture.ts';

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
  handle(WEAK, 0, 0, 0);
  handle(STRONG, 50, 0, 0);
  handle(CALM, 100, 0, 0);
  assert.deepEqual(clicks, [0, 50]);
  assert.equal(rolls, 0);
  handle(CALM, 50 + CALM_MS, 0, 0);
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
  handle(STRONG, 0, 0, 0);
  handle(CALM, CALM_MS + 10, 0, 0);
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
  handle(STRONG, 0, 0, 0);
  handle(WEAK, 50, 0, 0);
  handle(CALM, 50 + CALM_MS, 0, 0);
  assert.deepEqual(calls, []);
});

test('SHA-01.5 a strong shake reports start once, then rattles with the force, then rolls', () => {
  const { calls, handle } = recorder();
  handle(WEAK, 0, 0, 0);
  handle(STRONG, 50, 0, 0);
  handle(CALM, 50 + CALM_MS, 0, 0);
  assert.deepEqual(calls, ['start', `rattle@0:${shakeImpulse(WEAK)}`, `rattle@50:${shakeImpulse(STRONG)}`, 'roll']);
  // the next gesture starts again
  handle(STRONG, 1000, 0, 0);
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
  handle(WEAK, 0, 0, 0);
  handle(STRONG, 20, 0, 0);
  handle(2 * ROLL_THRESHOLD + 5, 40, 0, 0);
  assert.deepEqual(pushes, [shakeImpulse(WEAK), shakeImpulse(STRONG), MAX_IMPULSE]);
  assert.ok(pushes[0] < pushes[1] && pushes[1] < pushes[2]);
});

test('SHA-04.1 a weak shake reports cancel once when it ends, and no roll', () => {
  const { calls, handle } = recorder();
  handle(WEAK, 0, 0, 0);
  handle(WEAK, 50, 0, 0);
  handle(CALM, 100, 0, 0);
  handle(CALM, 50 + CALM_MS - 1, 0, 0);
  assert.deepEqual(calls, ['start', `rattle@0:${shakeImpulse(WEAK)}`, `rattle@50:${shakeImpulse(WEAK)}`], 'not over yet');
  handle(CALM, 50 + CALM_MS, 0, 0);
  handle(CALM, 2000, 0, 0);
  assert.deepEqual(calls.slice(3), ['cancel']);
});

test('SHA-04.3 a view change or a button roll mid-shake reports cancel, and no later roll', () => {
  let can = true;
  const { calls, handle } = recorder(() => can);
  handle(STRONG, 0, 0, 0);
  can = false; // the user opened the history, or tapped ROLAR! (dice now rolling)
  handle(STRONG, 50, 0, 0);
  handle(CALM, 400, 0, 0);
  can = true;
  handle(CALM, 900, 0, 0);
  assert.deepEqual(calls, ['start', `rattle@0:${shakeImpulse(STRONG)}`, 'cancel']);
});

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test('SHA-05.2 the push follows the phone: side-to-side, up-down and mixed, as a unit direction on the table', () => {
  const rnd = () => 0.123;
  // table: +x is screen right, -z is screen top. The dice keep going the way the phone was moving,
  // so they fly against the phone's acceleration (as in a real box).
  const right = pushDirection(-9, 0, rnd); // phone braking after moving right
  assert.ok(near(right.x, 1) && near(right.z, 0), `right: ${JSON.stringify(right)}`);
  const left = pushDirection(9, 0, rnd);
  assert.ok(near(left.x, -1) && near(left.z, 0), `left: ${JSON.stringify(left)}`);
  const top = pushDirection(0, -9, rnd); // phone braking after moving up
  assert.ok(near(top.x, 0) && near(top.z, -1), `top: ${JSON.stringify(top)}`);
  const bottom = pushDirection(0, 9, rnd);
  assert.ok(near(bottom.x, 0) && near(bottom.z, 1), `bottom: ${JSON.stringify(bottom)}`);
  const diag = pushDirection(-6, -6, rnd); // up-right diagonal
  assert.ok(near(diag.x, Math.SQRT1_2) && near(diag.z, -Math.SQRT1_2), `diagonal: ${JSON.stringify(diag)}`);
  const mixed = pushDirection(-3, 9, rnd);
  assert.ok(near(Math.hypot(mixed.x, mixed.z), 1), 'unit length');
  // phone pushed left and up (braking): dice fly right and down the screen, three times more down than right
  assert.ok(mixed.x > 0 && mixed.z > 0, `mixed: ${JSON.stringify(mixed)}`);
  assert.ok(near(mixed.z / mixed.x, 3), 'keeps the mix of the two parts');
  // the handler hands each rattle step this direction with its push size
  const pushes: unknown[] = [];
  const handle = createShakeHandler((_t, i, d) => pushes.push([i, d]), () => {}, () => true);
  handle(STRONG, 0, -3, 9); // asymmetric: swapped axes would point elsewhere
  assert.deepEqual(pushes, [[shakeImpulse(STRONG), pushDirection(-3, 9, rnd)]]);
  const [, d] = pushes[0] as [number, { x: number; z: number }];
  assert.ok(d.x > 0 && d.z > 0 && near(d.z / d.x, 3), `handler direction ${JSON.stringify(d)}`);
});

test('SHA-05.3 with no side-to-side or up-down motion the push takes a random table direction', () => {
  const a = pushDirection(0, 0, () => 0);
  const b = pushDirection(0, 0, () => 0.25);
  const c = pushDirection(0, 0, () => 0.5);
  for (const d of [a, b, c]) assert.ok(near(Math.hypot(d.x, d.z), 1), 'unit length');
  assert.ok(!(near(a.x, b.x) && near(a.z, b.z)) && !(near(b.x, c.x) && near(b.z, c.z)), 'depends on the random draw');
  // tiny noise counts as no direction too
  const n = pushDirection(1e-6, -1e-6, () => 0.25);
  assert.ok(near(n.x, b.x) && near(n.z, b.z));
  // but a small real sideways motion is followed, not randomized
  const small = pushDirection(0.5, 0, () => 0.25);
  assert.ok(near(small.x, -1) && near(small.z, 0), `0.5 m/s² sideways: ${JSON.stringify(small)}`);
});

test('SHA-05.2 motion parts follow the screen: turned by its angle, gravity-only samples give no direction', () => {
  const portrait = screenMotion({ x: 3, y: -4, z: 0 }, null, 0)!;
  assert.ok(near(portrait.ax, 3) && near(portrait.ay, -4) && near(portrait.force, 5));
  // screen turned 90°: the device's top points to the screen's left, its right edge to the screen's top
  const land = screenMotion({ x: 3, y: -4, z: 0 }, null, 90)!;
  assert.ok(near(land.ax, 4) && near(land.ay, 3), `landscape: ${JSON.stringify(land)}`);
  const land270 = screenMotion({ x: 3, y: -4, z: 0 }, null, 270)!;
  assert.ok(near(land270.ax, -4) && near(land270.ay, -3), `landscape 270: ${JSON.stringify(land270)}`);
  // only gravity-including data: force above gravity still counts, the direction does not
  const tilted = screenMotion(null, { x: 6.3, y: 7.5, z: 0 }, 0)!;
  assert.ok(near(tilted.force, Math.hypot(6.3, 7.5) - 9.8));
  assert.deepEqual([tilted.ax, tilted.ay], [0, 0], 'random push, not a gravity-biased one');
  assert.equal(screenMotion(null, null, 0), null);
});

test('SHA-05.5 a push sets the held die sideways speed to the push size, along the shake', () => {
  const dir = pushDirection(-3, 9, () => 0);
  for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
    for (const i of [MIN_IMPULSE, 9, MAX_IMPULSE]) {
      const v = heldVelocity({ x: 0, z: 0 }, dir, i, () => r)!;
      assert.ok(near(Math.hypot(v.x, v.z), i), `sideways speed ${Math.hypot(v.x, v.z)} for push ${i}`);
      const cos = (v.x * dir.x + v.z * dir.z) / i;
      assert.ok(cos > Math.cos((25 * Math.PI) / 180), `wobble too wide: ${Math.acos(cos)} rad`);
      assert.ok(v.y > 0 && v.y <= 2, 'a small hop');
    }
  }
  assert.equal(PUSH_SPREAD, 0.3);
  // a die slowed below 60 % of the push is flung whole the new way, whatever way it was going
  const slow = { x: dir.x * 9 * (FLYING - 0.01), z: dir.z * 9 * (FLYING - 0.01) };
  const back = heldVelocity(slow, { x: -dir.x, z: -dir.z }, 9, () => 0.5)!;
  assert.ok(near(back.x, -dir.x * 9) && near(back.z, -dir.z * 9));
  // a die still flying at 60 % of the push or more keeps flying: no new velocity
  assert.equal(FLYING, 0.6);
  assert.equal(heldVelocity({ x: 9 * FLYING, z: 0 }, dir, 9, () => 0.5), null);
  assert.equal(heldVelocity({ x: 0, z: -12 }, dir, 9, () => 0.5), null, 'fast in another direction: keeps bouncing');
});

/** A die body stand-in that records what the push did to it. */
function fakeBody(v: { x: number; y: number; z: number }) {
  const calls: string[] = [];
  return {
    calls,
    v,
    linvel: () => v,
    setLinvel(n: { x: number; y: number; z: number }) {
      calls.push('linvel');
      v = n;
      this.v = n;
    },
    setAngvel() {
      calls.push('angvel');
    },
  };
}

test('SHA-05.5 a push flings a slowed die body with its own velocity rule and the event push size', () => {
  const push = { impulse: 11, dir: pushDirection(-3, 9, () => 0) };
  const slow = fakeBody({ x: -1, y: 0, z: 0.5 });
  assert.equal(pushHeld(slow, push, () => 0.5), true);
  assert.ok(near(Math.hypot(slow.v.x, slow.v.z), 11), 'the event push size, not another one');
  const expected = heldVelocity({ x: -1, z: 0.5 }, push.dir, 11, () => 0.5)!;
  assert.ok(near(slow.v.x, expected.x) && near(slow.v.z, expected.z), 'along the shake');
  // a die still flying is left untouched: not stopped, not reversed
  const flying = fakeBody({ x: 0, y: 0.3, z: -9 });
  assert.equal(pushHeld(flying, push, () => 0.5), false);
  assert.deepEqual(flying.calls, []);
  assert.deepEqual(flying.v, { x: 0, y: 0.3, z: -9 });
});

test('SHA-05.6 held dice bounce like balls with almost no friction; thrown dice get the normal table back', () => {
  const held = dieMaterial('hold');
  assert.ok(held.restitution >= 0.9, `held restitution ${held.restitution}`);
  assert.equal(held.restitutionRule, 'max', 'walls have restitution 0: only max keeps the bounce');
  assert.ok(held.friction <= 0.05, `held friction ${held.friction}`);
  assert.equal(held.frictionRule, 'min', 'the table friction must not average it up');
  const thrown = dieMaterial('thrown');
  assert.deepEqual(
    { r: thrown.restitution, f: thrown.friction, rr: thrown.restitutionRule, fr: thrown.frictionRule, d: thrown.damping },
    { r: 0.3, f: 0.6, rr: 'average', fr: 'average', d: 0 },
  );
});

test('an armed gesture left stale by a long gap between samples never rolls', () => {
  const g = createShakeGesture();
  g(STRONG, 5000, true);
  assert.equal(g(CALM, 5000 + STALE_MS + 1, true), null);
  assert.equal(g(CALM, 9000, true), null);
  // a shake after the gap starts unarmed
  const again = createShakeGesture();
  again(STRONG, 0, true);
  assert.equal(again(WEAK, 5000, true), 'rattle');
  assert.equal(again(CALM, 5000 + CALM_MS, true), null);
  // the handler releases the held dice on the first calm sample after the gap
  const { calls, handle } = recorder();
  handle(STRONG, 0, 0, 0);
  handle(CALM, 60_000, 0, 0);
  assert.deepEqual(calls, ['start', `rattle@0:${shakeImpulse(STRONG)}`, 'cancel']);
});

test('reset (app hidden) cancels the held dice once and never rolls', () => {
  const { calls, handle } = recorder();
  handle.reset();
  assert.deepEqual(calls, [], 'nothing held: no cancel');
  handle(STRONG, 0, 0, 0);
  handle.reset();
  handle.reset();
  handle(CALM, CALM_MS, 0, 0);
  assert.deepEqual(calls, ['start', `rattle@0:${shakeImpulse(STRONG)}`, 'cancel']);
  handle(STRONG, 400, 0, 0);
  assert.equal(calls[3], 'start', 'the next shake starts over');
});

test('an acceleration of nulls falls back to the reading with gravity', () => {
  const nulls = { x: null, y: null, z: null };
  assert.deepEqual(screenMotion(nulls, { x: 0, y: 30, z: 0 }, 90), { force: 30 - 9.8, ax: 0, ay: 0 });
  assert.equal(screenMotion(nulls, null, 0), null);
  // zeros and partly null readings are real data
  assert.equal(screenMotion({ x: 0, y: 0, z: 0 }, { x: 0, y: 30, z: 0 }, 0)!.force, 0);
  assert.equal(screenMotion({ x: null, y: null, z: 7 }, { x: 0, y: 30, z: 0 }, 0)!.force, 7);
});
