import { parse } from './dice.ts';

// ponytail: calibration knobs — tune by hand on a phone (m/s² above gravity, ms of calm)
export const RATTLE_THRESHOLD = 6;
export const ROLL_THRESHOLD = 15;
export const CALM_MS = 300;
export const STALE_MS = 1000; // a longer gap between samples means the sensor stopped (app in background)

/**
 * Shake-to-roll as a gesture: motion above RATTLE_THRESHOLD rattles; once it stays calm for
 * CALM_MS the gesture ends, with one roll if any motion in it reached ROLL_THRESHOLD.
 * Feed every motion sample; `canRoll` false (dice moving, other view) cancels the gesture, and so
 * does a gap over STALE_MS since the previous sample.
 */
export function createShakeGesture() {
  let lastAbove: number | null = null;
  let armed = false;
  let lastSample = 0;
  return (force: number, now: number, canRoll: boolean): 'rattle' | 'roll' | null => {
    const stale = now - lastSample > STALE_MS;
    lastSample = now;
    if (!canRoll || stale) {
      lastAbove = null;
      armed = false;
    }
    if (!canRoll) return null;
    if (force > RATTLE_THRESHOLD) {
      lastAbove = now;
      if (force > ROLL_THRESHOLD) armed = true;
      return 'rattle';
    }
    if (lastAbove === null || now - lastAbove < CALM_MS) return null;
    const roll = armed;
    lastAbove = null;
    armed = false;
    return roll ? 'roll' : null;
  };
}

/** Shake can roll only on the table view, with a valid roll set up, and not while the dice of a roll still move. */
export const canShakeRoll = (view: string, rolling: boolean, notation: string) => view === 'table' && !rolling && !!parse(notation);

// ponytail: push size per rattle step, as a speed change in m/s (any die mass), tuned on a phone
export const MIN_IMPULSE = 22; // crosses the table (~4.7 units of free travel) in about 0.25 s
export const MAX_IMPULSE = 30;
export const MAX_SPIN = 14; // rad/s per axis on a push: faster dice must not turn into tops
const NO_DIRECTION = 0.05; // m/s² of screen-plane motion below which the direction is noise

/**
 * Table direction of a push from the phone's acceleration (device x = screen right, y = screen top).
 * The dice keep going the way the phone was moving, so they fly against its acceleration, as in a real
 * box. Table: +x is screen right, -z is screen top. Random when the motion has no screen-plane part.
 */
export function pushDirection(ax: number, ay: number, random: () => number) {
  const n = Math.hypot(ax, ay);
  if (n < NO_DIRECTION) {
    const a = random() * 2 * Math.PI;
    return { x: Math.cos(a), z: Math.sin(a) };
  }
  return { x: -ax / n, z: ay / n };
}

/** Push for the held dice: grows with the motion force from the rattle threshold to 2x the roll threshold (SHA-02.1). */
export function shakeImpulse(force: number) {
  const t = Math.min(1, Math.max(0, (force - RATTLE_THRESHOLD) / (2 * ROLL_THRESHOLD - RATTLE_THRESHOLD)));
  return MIN_IMPULSE + (MAX_IMPULSE - MIN_IMPULSE) * t;
}

// ponytail: per-die wobble around the shake direction, so held dice do not move in lockstep
export const PUSH_SPREAD = 0.3;

export const FLYING = 0.6; // a held die faster than this share of the push keeps flying (SHA-05.5)
// ponytail: reversal knobs (SHA-06.4). A flying die is turned only by a push against it (cos below
// REVERSE_COS = more than 120° apart) and only REVERSE_MS after its last push, about one table
// crossing: sooner than that and a 3-5 Hz shake keeps the dice oscillating mid-table.
export const REVERSE_COS = -0.5;
export const REVERSE_MS = 250;

/**
 * Velocity a held die takes on a push (SHA-05.5): sideways speed exactly `impulse` (m/s, any mass),
 * along `dir` with a small per-die wobble, plus a small hop. Null while the die still flies faster than
 * FLYING x impulse, so it travels and bounces freely instead of being reversed on every ~60 Hz sample;
 * a reversed shake turns it once `sinceKick` (ms since its last push) reaches REVERSE_MS.
 */
export function heldVelocity(
  current: { x: number; z: number },
  dir: { x: number; z: number },
  impulse: number,
  random: () => number,
  sinceKick = 0,
) {
  const speed = Math.hypot(current.x, current.z);
  const reversed = sinceKick >= REVERSE_MS && current.x * dir.x + current.z * dir.z < REVERSE_COS * speed;
  if (speed >= FLYING * impulse && !reversed) return null;
  const dx = dir.x + (random() * 2 - 1) * PUSH_SPREAD;
  const dz = dir.z + (random() * 2 - 1) * PUSH_SPREAD;
  const n = Math.hypot(dx, dz) || 1;
  return { x: (dx / n) * impulse, y: 0.5 + random() * 1.5, z: (dz / n) * impulse };
}

type PushBody = {
  linvel(): { x: number; y: number; z: number };
  setLinvel(v: { x: number; y: number; z: number }, wake: boolean): void;
  setAngvel(v: { x: number; y: number; z: number }, wake: boolean): void;
};

/** Applies one shake push to a held die body: a slowed die is flung, a flying one is left alone (SHA-05.5). */
export function pushHeld(body: PushBody, push: { impulse: number; dir: { x: number; z: number } }, random: () => number, sinceKick = 0) {
  const v = heldVelocity(body.linvel(), push.dir, push.impulse, random, sinceKick);
  if (!v) return false;
  const i = Math.min(push.impulse, MAX_SPIN);
  body.setLinvel(v, true);
  body.setAngvel({ x: (random() * 2 - 1) * i, y: (random() * 2 - 1) * i, z: (random() * 2 - 1) * i }, true);
  return true;
}

export type Combine = 'average' | 'min' | 'max';

/**
 * Die surface per phase (SHA-05.6, SHA-06.1). Held: no energy sink - full bounce against the walls
 * (their restitution is 0, so the rule is max), no friction (rule min), no damping.
 * Thrown: the normal table, so dice stop and are read.
 */
export function dieMaterial(phase: 'hold' | 'thrown') {
  return phase === 'hold'
    ? { restitution: 1, friction: 0, restitutionRule: 'max' as Combine, frictionRule: 'min' as Combine, damping: 0 }
    : { restitution: 0.3, friction: 0.6, restitutionRule: 'average' as Combine, frictionRule: 'average' as Combine, damping: 0 };
}

type Vec = { x: number | null; y: number | null; z: number | null } | null;

/**
 * One motion sample as the gesture needs it: force above gravity and the screen-plane parts
 * (screen right, screen top), turned by the screen angle. Without gravity-free `acceleration` the
 * direction is unknown (gravity sits in x/y), so the parts are 0 and the push goes random.
 */
export function screenMotion(acceleration: Vec, withGravity: Vec, angle: number) {
  // Some devices send `acceleration` as an object of nulls: same as not sending it.
  const free = acceleration && (acceleration.x ?? acceleration.y ?? acceleration.z) !== null ? acceleration : null;
  const a = free ?? withGravity;
  if (!a) return null;
  const force = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) - (free ? 0 : 9.8);
  if (!free) return { force, ax: 0, ay: 0 };
  const r = (angle * Math.PI) / 180;
  const x = a.x ?? 0;
  const y = a.y ?? 0;
  return { force, ax: x * Math.cos(r) - y * Math.sin(r), ay: x * Math.sin(r) + y * Math.cos(r) };
}

type GestureEvents = { start?: () => void; cancel?: () => void };

/**
 * Motion handler: feeds the gesture and turns its steps into calls. `start` on the first rattle of a
 * gesture, `rattle` on each rattle step with the push for the held dice (`shakeImpulse` of its force, along
 * `pushDirection` of the motion's screen-plane parts), `roll` on release after a strong shake, and
 * `cancel` when a started gesture ends with no roll (weak shake, or it can no longer roll).
 * `reset` drops the gesture, cancelling a started one (app hidden).
 */
export function createShakeHandler(
  rattle: (now: number, impulse: number, dir: { x: number; z: number }) => void,
  roll: () => void,
  canRoll: () => boolean,
  { start, cancel }: GestureEvents = {},
  random: () => number = Math.random,
) {
  const gesture = createShakeGesture();
  let active = false;
  let lastRattle = 0;
  const drop = () => {
    if (!active) return;
    active = false;
    cancel?.();
  };
  const step = (force: number, now: number, ax: number, ay: number) => {
    const allowed = canRoll();
    const kind = gesture(force, now, allowed);
    if (kind === 'rattle') {
      if (!active) start?.();
      active = true;
      lastRattle = now;
      rattle(now, shakeImpulse(force), pushDirection(ax, ay, random));
    } else if (kind === 'roll') {
      active = false;
      roll();
    } else if (!allowed || (force <= RATTLE_THRESHOLD && now - lastRattle >= CALM_MS)) {
      drop();
    }
  };
  const reset = () => {
    gesture(0, 0, false);
    drop();
  };
  return Object.assign(step, { reset });
}
