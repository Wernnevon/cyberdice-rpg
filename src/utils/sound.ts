import type { DieSpec, Roll } from '../types/dice';

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

type Body = { handle: number; speed: number };

/**
 * Speed to sound for one side of a contact, or null when the other side plays it.
 * Rapier reports a die-die hit to both dice: only the lower handle plays, at the faster speed.
 * `other` is null for the table and walls.
 */
export function contactImpact(self: Body, other: Body | null): number | null {
  if (!other) return self.speed;
  if (self.handle > other.handle) return null;
  return Math.max(self.speed, other.speed);
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

// ponytail: pitch per die type, tuned by ear (1 = the sample as recorded)
const PITCH: Record<DieSpec['sides'], number> = { 4: 1.45, 6: 1.25, 8: 1.12, 10: 1.02, 12: 0.94, 20: 0.84 };
export const JITTER = 0.06;
export const CROWD_FLOOR = 0.35;

/** Playback rate for a die type: smaller dice sound higher. */
export const diePitch = (sides: DieSpec['sides']) => PITCH[sides];

/** The die's pitch moved randomly by up to ±JITTER. */
export const pitchRate = (sides: DieSpec['sides'], random: () => number) => diePitch(sides) * (1 + (random() * 2 - 1) * JITTER);

/** A sample index other than `last`. */
export function nextSample(count: number, last: number | null, random: () => number) {
  if (count < 2 || last === null) return Math.floor(random() * count);
  const i = Math.floor(random() * (count - 1));
  return i >= last ? i + 1 : i;
}

/** Per-impact gain for a roll of `dice` dice, so many dice do not blend into one noise. */
export const crowdGain = (dice: number) => (dice <= 1 ? 1 : Math.max(CROWD_FLOOR, 1 / Math.sqrt(dice)));

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
