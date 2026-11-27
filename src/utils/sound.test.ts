// Derived from .specs/features/roll-sounds/spec.md (SND-01..04) and sound-polish/spec.md (SPL-02, SPL-03.1). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Roll } from '../types/dice';
import { contactImpact, createLimiter, crowdGain, diePitch, JITTER, nextSample, pitchRate, FLOOR_GAIN, impactGain, loadMuted, MAX_IMPACT, MIN_IMPACT, PER_WINDOW, revealSound, saveMuted, WINDOW_MS } from './sound.ts';

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

test('SPL-02.1 impact pitch orders d4 > d6 > d8 > d10 > d12 > d20', () => {
  const order = [4, 6, 8, 10, 12, 20] as const;
  for (let i = 1; i < order.length; i++) {
    assert.ok(diePitch(order[i - 1]) > diePitch(order[i]), `d${order[i - 1]} should be higher than d${order[i]}`);
  }
});

test('SPL-02.2 impact pitch varies randomly by at most ±6 % around the die pitch', () => {
  assert.equal(JITTER, 0.06);
  for (const sides of [4, 6, 8, 10, 12, 20] as const) {
    const base = diePitch(sides);
    const lo = pitchRate(sides, () => 0);
    const hi = pitchRate(sides, () => 0.999999);
    assert.ok(Math.abs(lo - base * 0.94) < 1e-6, `d${sides} lowest is -6 %`);
    assert.ok(Math.abs(hi - base * 1.06) < 1e-4, `d${sides} highest is +6 %`);
    for (let r = 0; r < 1; r += 0.05) {
      const rate = pitchRate(sides, () => r);
      assert.ok(rate >= base * 0.94 - 1e-9 && rate <= base * 1.06 + 1e-9);
    }
    assert.notEqual(pitchRate(sides, () => 0.2), pitchRate(sides, () => 0.8), 'it varies');
  }
});

test('SPL-02.3 two impacts in a row never use the same sample', () => {
  for (const r of [0, 0.25, 0.5, 0.75, 0.999999]) {
    let last: number | null = null;
    for (let i = 0; i < 20; i++) {
      const next = nextSample(4, last, () => r);
      assert.ok(next >= 0 && next < 4, 'index in range');
      assert.notEqual(next, last, `repeated sample ${next}`);
      last = next;
    }
  }
  // every other sample stays reachable
  const seen = new Set([0, 0.3, 0.6, 0.99].map((r) => nextSample(4, 2, () => r)));
  assert.deepEqual([...seen].sort(), [0, 1, 3]);
  assert.equal(nextSample(1, 0, () => 0.5), 0, 'a single sample has nothing else to pick');
});

test('SPL-03.1 impact gain scales by 1/sqrt(dice count), never below 0.35', () => {
  assert.equal(crowdGain(1), 1);
  assert.ok(Math.abs(crowdGain(2) - 1 / Math.SQRT2) < 1e-9);
  assert.ok(Math.abs(crowdGain(4) - 0.5) < 1e-9);
  assert.ok(Math.abs(crowdGain(8) - 1 / Math.sqrt(8)) < 1e-9);
  assert.equal(crowdGain(9), 0.35);
  assert.equal(crowdGain(100), 0.35);
});
