import { parse } from './dice.ts';

// ponytail: calibration knobs — tune by hand on a phone (m/s² above gravity, ms of calm)
export const RATTLE_THRESHOLD = 6;
export const ROLL_THRESHOLD = 15;
export const CALM_MS = 300;

/**
 * Shake-to-roll as a gesture: motion above RATTLE_THRESHOLD rattles; once it stays calm for
 * CALM_MS the gesture ends, with one roll if any motion in it reached ROLL_THRESHOLD.
 * Feed every motion sample; `canRoll` false (dice moving, other view) cancels the gesture.
 */
export function createShakeGesture() {
  let lastAbove: number | null = null;
  let armed = false;
  return (force: number, now: number, canRoll: boolean): 'rattle' | 'roll' | null => {
    if (!canRoll) {
      lastAbove = null;
      armed = false;
      return null;
    }
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
export const MIN_IMPULSE = 4;
export const MAX_IMPULSE = 14;
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

type GestureEvents = { start?: () => void; cancel?: () => void };

/**
 * Motion handler: feeds the gesture and turns its steps into calls. `start` on the first rattle of a
 * gesture, `rattle` on each rattle step with the push for the held dice (`shakeImpulse` of its force, along
 * `pushDirection` of the motion's screen-plane parts), `roll` on release after a strong shake, and
 * `cancel` when a started gesture ends with no roll (weak shake, or it can no longer roll).
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
  return (force: number, now: number, ax: number, ay: number) => {
    const allowed = canRoll();
    const step = gesture(force, now, allowed);
    if (step === 'rattle') {
      if (!active) start?.();
      active = true;
      lastRattle = now;
      rattle(now, shakeImpulse(force), pushDirection(ax, ay, random));
    } else if (step === 'roll') {
      active = false;
      roll();
    } else if (active && (!allowed || (force <= RATTLE_THRESHOLD && now - lastRattle >= CALM_MS))) {
      active = false;
      cancel?.();
    }
  };
}
