import type { Roll } from '../types/dice';

// ponytail: impact tuning, calibrated by ear on a phone. Impact = die speed at contact (m/s).
export const MIN_IMPACT = 1.5; // softer touches are silent
export const MAX_IMPACT = 12; // at or above this, full volume
export const FLOOR_GAIN = 0.15; // gain of the softest audible impact
export const WINDOW_MS = 100;
export const PER_WINDOW = 6; // impacts allowed per window; the rest are dropped

/** Gain for an impact, or null when it is too soft to hear. */
export function impactGain(impact: number): number | null {
  if (impact < MIN_IMPACT) return null;
  const t = Math.min(1, (impact - MIN_IMPACT) / (MAX_IMPACT - MIN_IMPACT));
  return FLOOR_GAIN + (1 - FLOOR_GAIN) * t;
}

/** Sliding-window limiter: allow(now) is true for at most `limit` plays in any `windowMs` span. */
export function createLimiter(limit = PER_WINDOW, windowMs = WINDOW_MS) {
  const plays: number[] = [];
  return (now: number) => {
    while (plays.length && now - plays[0] >= windowMs) plays.shift();
    if (plays.length >= limit) return false;
    plays.push(now);
    return true;
  };
}

export type RevealSound = 'crit' | 'fail' | 'reveal';

/** Same rule as History: a kept natural 20 or 1 on a d20. */
export function revealSound(roll: Roll): RevealSound {
  const d20 = roll.dice.filter((d) => d.kept && d.sides === 20);
  if (d20.some((d) => d.value === 20)) return 'crit';
  if (d20.some((d) => d.value === 1)) return 'fail';
  return 'reveal';
}

type Store = { getItem(key: string): string | null; setItem(key: string, value: string): void };
const KEY = 'sound-muted';

/** Sound starts on unless a valid "muted" choice was saved (AD-001). */
export function loadMuted(store: Store | undefined): boolean {
  try {
    return store?.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMuted(store: Store | undefined, muted: boolean) {
  try {
    store?.setItem(KEY, muted ? '1' : '0');
  } catch {
    // private mode / blocked storage: the choice just won't survive a reload
  }
}
