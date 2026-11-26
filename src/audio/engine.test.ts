// Derived from .specs/features/roll-sounds/spec.md (SND-01.1, SND-02.1, SND-04.2, SND-05.1, SND-05.2). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Roll } from '../types/dice';
import { MIN_IMPACT, WINDOW_MS } from '../utils/sound.ts';
import { createSoundEngine } from './engine.ts';

type Played = { kind: 'sample' | 'tone'; gain: number };

/** Minimal Web Audio stand-in that records what reaches the speakers. */
function fakeAudio() {
  const played: Played[] = [];
  const param = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const ctx = {
    state: 'suspended' as AudioContextState,
    currentTime: 0,
    destination: {},
    resumed: 0,
    resume() {
      this.state = 'running';
      this.resumed++;
      return Promise.resolve();
    },
    decodeAudioData: (b: ArrayBuffer) => Promise.resolve({ duration: 0.3, bytes: b.byteLength }),
    createGain() {
      const node = { gain: param(), connect: (t: unknown) => t };
      return node;
    },
    createBufferSource() {
      const src = {
        buffer: null as unknown,
        out: null as { gain: { value: number } } | null,
        connect(t: { gain: { value: number } }) {
          src.out = t;
          return t;
        },
        start() {
          if (src.buffer) played.push({ kind: 'sample', gain: src.out?.gain.value ?? 1 });
        },
      };
      return src;
    },
    createOscillator() {
      const osc = { type: 'sine', frequency: param(), connect: (t: unknown) => t, start: () => played.push({ kind: 'tone', gain: 1 }), stop() {} };
      return osc;
    },
  };
  return { ctx, played };
}

function setup(nav: { audioSession?: { type: string } } = {}) {
  const audio = fakeAudio();
  let created = 0;
  const engine = createSoundEngine({
    createContext: () => {
      created++;
      return audio.ctx as unknown as AudioContext;
    },
    fetchBytes: () => Promise.resolve(new ArrayBuffer(8)),
    navigator: nav,
    random: () => 0,
  });
  return { engine, ...audio, created: () => created };
}

const roll = (id: string, d20: number): Roll => ({
  id,
  notation: '1d20',
  modifier: 0,
  total: d20,
  at: 0,
  dice: [{ sides: 20, value: d20, kept: true, sign: 1 }],
});

test('SND-01.1 an impact at or above the minimum plays exactly one sample', async () => {
  const { engine, played } = setup();
  engine.unlock();
  await engine.ready;
  engine.impact(MIN_IMPACT, 0);
  assert.equal(played.filter((p) => p.kind === 'sample').length, 1);
  engine.impact(MIN_IMPACT * 4, WINDOW_MS);
  const samples = played.filter((p) => p.kind === 'sample');
  assert.equal(samples.length, 2);
  assert.ok(samples[1].gain > samples[0].gain, 'harder impact is louder');
  // below the minimum: nothing more
  engine.impact(MIN_IMPACT / 2, WINDOW_MS * 2);
  assert.equal(played.filter((p) => p.kind === 'sample').length, 2);
});

test('SND-02.1 a roll plays exactly one reveal sound', async () => {
  const { engine, played } = setup();
  engine.unlock();
  await engine.ready;
  assert.equal(engine.reveal(roll('a', 12)), 'reveal');
  const tones = played.length;
  assert.ok(tones > 0, 'reveal reached the speakers');
  assert.equal(engine.reveal(roll('a', 12)), null, 'same roll again: no second reveal');
  assert.equal(played.length, tones);
  assert.equal(engine.reveal(roll('b', 20)), 'crit', 'next roll reveals again');
  assert.ok(played.length > tones);
});

test('SND-04.2 while muted no impact, reveal, crit or fail plays', async () => {
  const { engine, played } = setup();
  engine.unlock();
  await engine.ready;
  engine.setMuted(true);
  engine.impact(MIN_IMPACT * 4, 0);
  assert.equal(engine.reveal(roll('a', 12)), null);
  assert.equal(engine.reveal(roll('b', 20)), null);
  assert.equal(engine.reveal(roll('c', 1)), null);
  assert.deepEqual(played, []);
  engine.setMuted(false);
  engine.impact(MIN_IMPACT * 4, WINDOW_MS);
  assert.equal(played.length, 1, 'unmuting restores sound');
});

test('SND-05.1 navigator.audioSession becomes ambient when present', () => {
  const nav = { audioSession: { type: 'auto' } };
  setup(nav);
  assert.equal(nav.audioSession.type, 'ambient');
  assert.doesNotThrow(() => setup({}), 'browsers without audioSession still work');
});

test('SND-05.2 the first gesture unlocks audio so the first roll is heard', async () => {
  const { engine, ctx, played, created } = setup();
  assert.equal(created(), 0, 'no AudioContext before a gesture');
  engine.unlock(); // the tap that triggers the first roll
  assert.equal(ctx.state, 'running');
  await engine.ready;
  engine.impact(MIN_IMPACT * 2, 0);
  assert.equal(engine.reveal(roll('first', 9)), 'reveal');
  assert.ok(played.some((p) => p.kind === 'sample') && played.some((p) => p.kind === 'tone'));
  engine.unlock();
  assert.equal(created(), 1, 'later gestures reuse the same context');
});
