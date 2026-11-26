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

/** Shake can roll only on the table view, and not while the dice of a roll still move. */
export const canShakeRoll = (view: string, rolling: boolean) => view === 'table' && !rolling;

/** Motion handler: feeds the gesture and turns its steps into a rattle click or a roll. */
export function createShakeHandler(rattle: (now: number) => void, roll: () => void, canRoll: () => boolean) {
  const gesture = createShakeGesture();
  return (force: number, now: number) => {
    const step = gesture(force, now, canRoll());
    if (step === 'rattle') rattle(now);
    else if (step === 'roll') roll();
  };
}
