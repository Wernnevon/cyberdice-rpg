// Derived from .specs/features/roll-sounds/spec.md (SND-01..04). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Roll } from '../types/dice';
import { contactImpact, createLimiter, FLOOR_GAIN, impactGain, loadMuted, MAX_IMPACT, MIN_IMPACT, PER_WINDOW, revealSound, saveMuted, WINDOW_MS } from './sound.ts';

const roll = (dice: { sides: Roll['dice'][number]['sides']; value: number; kept?: boolean }[]): Roll => ({
  id: 'r',
  notation: '',
  modifier: 0,
  total: 0,
  at: 0,
  dice: dice.map((d) => ({ sides: d.sides, value: d.value, kept: d.kept ?? true, sign: 1 })),
});

const memory = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v), data };
};

test('SND-01.2 gain grows with impact from the floor gain to a cap of 1', () => {
  assert.equal(impactGain(MIN_IMPACT), FLOOR_GAIN);
  // proportional: halfway in impact is halfway in gain
  assert.ok(Math.abs(impactGain((MIN_IMPACT + MAX_IMPACT) / 2)! - (FLOOR_GAIN + 1) / 2) < 1e-9);
  assert.ok(Math.abs(impactGain(MIN_IMPACT + (MAX_IMPACT - MIN_IMPACT) / 4)! - (FLOOR_GAIN + (1 - FLOOR_GAIN) / 4)) < 1e-9);
  assert.ok(impactGain(MIN_IMPACT + 1)! < impactGain(MIN_IMPACT + 2)!, 'monotonic');
  assert.equal(impactGain(MAX_IMPACT), 1);
  assert.equal(impactGain(MAX_IMPACT * 10), 1);
});

test('SND-01.3 an impact below the minimum plays no sound', () => {
  assert.equal(impactGain(MIN_IMPACT - 0.01), null);
  assert.equal(impactGain(0), null);
});

test('SND-01.4 impacts beyond the per-window limit are dropped', () => {
  const allow = createLimiter();
  const burst = Array.from({ length: PER_WINDOW + 3 }, () => allow(1000));
  assert.equal(burst.filter(Boolean).length, PER_WINDOW);
  assert.deepEqual(burst.slice(PER_WINDOW), [false, false, false]);
  // a new window plays again
  assert.equal(allow(1000 + WINDOW_MS), true);
});

test('SND-01.4 no 100 ms span holds more than the limit, even across a window edge', () => {
  const allow = createLimiter();
  const times = [0, ...Array(PER_WINDOW - 1).fill(WINDOW_MS - 1), ...Array(PER_WINDOW).fill(WINDOW_MS)];
  const played = times.filter((t) => allow(t));
  for (const t of played) {
    const inSpan = played.filter((u) => u >= t && u < t + WINDOW_MS).length;
    assert.ok(inSpan <= PER_WINDOW, `${inSpan} plays within ${WINDOW_MS} ms starting at ${t}`);
  }
});

test('SND-02.2 no kept natural 20 or 1 on a d20 picks the plain reveal', () => {
  assert.equal(revealSound(roll([{ sides: 20, value: 12 }, { sides: 6, value: 6 }])), 'reveal');
  // a 1 or max on other dice is not a crit or fail
  assert.equal(revealSound(roll([{ sides: 6, value: 1 }, { sides: 12, value: 12 }])), 'reveal');
});

test('SND-03.1 a kept natural 20 on a d20 picks the crit', () => {
  assert.equal(revealSound(roll([{ sides: 20, value: 20 }])), 'crit');
  assert.equal(revealSound(roll([{ sides: 20, value: 1 }, { sides: 20, value: 20 }])), 'crit');
});

test('SND-03.2 a kept natural 1 with no kept 20 picks the fail', () => {
  assert.equal(revealSound(roll([{ sides: 20, value: 1 }])), 'fail');
  assert.equal(revealSound(roll([{ sides: 20, value: 1 }, { sides: 8, value: 8 }])), 'fail');
});

test('SND-03.3 dropped d20 rolls do not choose the sound', () => {
  // 2d20kl1 rolling 20 and 7: the 20 is dropped
  assert.equal(revealSound(roll([{ sides: 20, value: 20, kept: false }, { sides: 20, value: 7 }])), 'reveal');
  // 2d20kh1 rolling 1 and 15: the 1 is dropped
  assert.equal(revealSound(roll([{ sides: 20, value: 1, kept: false }, { sides: 20, value: 15 }])), 'reveal');
});

test('SND-04.3 the mute choice is saved and restored', () => {
  const s = memory();
  saveMuted(s, true);
  assert.equal(loadMuted(s), true);
  saveMuted(s, false);
  assert.equal(loadMuted(s), false);
});

test('SND-04.4 missing or unreadable storage starts with sound on', () => {
  assert.equal(loadMuted(undefined), false);
  assert.equal(loadMuted(memory()), false);
  assert.equal(loadMuted(memory({ 'sound-muted': 'garbage' })), false);
  const throwing = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('QuotaExceeded'); } };
  assert.equal(loadMuted(throwing), false);
  assert.doesNotThrow(() => saveMuted(throwing, true));
});

test('SND-01.1 a die-die hit sounds once, at the faster die speed', () => {
  const a = { handle: 3, speed: 2 };
  const b = { handle: 7, speed: 9 };
  // Rapier reports the contact to both dice
  const heard = [contactImpact(a, b), contactImpact(b, a)].filter((x) => x !== null);
  assert.deepEqual(heard, [9]);
});

test('SND-01.1 a die hitting the table or a wall sounds at its own speed', () => {
  assert.equal(contactImpact({ handle: 3, speed: 5 }, null), 5);
});
