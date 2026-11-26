// Derived from .specs/features/roll-sounds/spec.md (SND-01.1, SND-02.1, SND-04.2, SND-05.1, SND-05.2)
// and sound-polish/spec.md (SPL-01, SPL-03, SPL-04, SPL-05). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Roll } from '../types/dice';
import { MIN_IMPACT, PER_WINDOW, WINDOW_MS } from '../utils/sound.ts';
import { createSoundEngine, UNLOCK_EVENTS } from './engine.ts';

type Played = { kind: 'sample' | 'tone'; gain: number; note?: string };
type Voice = { wave: string; freq: number; detune: number; start: number; stop: number; rampTo: number | null };

/** Minimal Web Audio stand-in that records what reaches the speakers. */
function fakeAudio() {
  const played: Played[] = [];
  const voices: Voice[] = [];
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
      const v: Voice = { wave: 'sine', freq: 0, detune: 0, start: 0, stop: 0, rampTo: null };
      const osc = {
        get type() {
          return v.wave;
        },
        set type(w: string) {
          v.wave = w;
        },
        frequency: {
          ...param(),
          setValueAtTime: (f: number) => void (v.freq ||= f),
          exponentialRampToValueAtTime: (f: number) => void (v.rampTo = f),
        },
        detune: { ...param(), set value(c: number) { v.detune = c; } },
        connect: (t: unknown) => t,
        // a voice = wave, pitch, detune and start time: what a listener can tell apart
        start: (at = 0) => {
          v.start = at;
          voices.push(v);
          played.push({ kind: 'tone', gain: 1, note: `${v.wave}@${v.freq}Hz~${v.detune}c+${at}s` });
        },
        stop: (at = 0) => void (v.stop = at),
      };
      return osc;
    },
  };
  return { ctx, played, voices };
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

const notes = (played: Played[]) => played.filter((p) => p.kind === 'tone').map((p) => p.note!);

/** The notes one result sound plays, from a fresh engine. */
async function soundOf(d20: number) {
  const { engine, played } = setup();
  engine.unlock();
  await engine.ready;
  engine.reveal(roll('x', d20));
  return notes(played);
}

test('SND-01.4 the engine drops impacts beyond the per-window limit', async () => {
  const { engine, played } = setup();
  engine.unlock();
  await engine.ready;
  for (let i = 0; i < PER_WINDOW + 3; i++) engine.impact(MIN_IMPACT * 4, 500);
  assert.equal(played.filter((p) => p.kind === 'sample').length, PER_WINDOW);
});

test('SND-02.1 one reveal plays its sound once, with no note doubled', async () => {
  const played = await soundOf(12);
  assert.ok(played.length > 0);
  assert.equal(new Set(played).size, played.length, `doubled notes: ${played.join(', ')}`);
});

test('SND-03.1 a natural 20 plays the crit sound instead of the plain reveal', async () => {
  const reveal = (await soundOf(12)).join('|');
  const crit = (await soundOf(20)).join('|');
  assert.ok(crit.length > 0);
  assert.notEqual(crit, reveal);
  assert.ok(!crit.includes(reveal), 'the plain reveal also played');
  assert.equal(new Set(crit.split('|')).size, crit.split('|').length, 'crit played once');
});

test('SND-03.2 a natural 1 plays the fail sound instead of the plain reveal', async () => {
  const reveal = (await soundOf(12)).join('|');
  const fail = (await soundOf(1)).join('|');
  const crit = (await soundOf(20)).join('|');
  assert.ok(fail.length > 0);
  assert.notEqual(fail, reveal);
  assert.notEqual(fail, crit);
  assert.ok(!fail.includes(reveal), 'the plain reveal also played');
  assert.equal(new Set(fail.split('|')).size, fail.split('|').length, 'fail played once');
});

test('SND-05.2 audio unlocks on every event that counts as a user tap, mouse or touch', () => {
  // HTML user activation: a touch activates on pointerup/touchend (not pointerdown);
  // iOS starts Web Audio on touchend/click; keyboard users roll with keydown.
  for (const e of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
    assert.ok((UNLOCK_EVENTS as readonly string[]).includes(e), `missing ${e}`);
  }
});

/** The voices one result sound plays, grouped into notes (same pitch and start). */
async function voicesOf(d20: number) {
  const { engine, voices } = setup();
  engine.unlock();
  await engine.ready;
  engine.reveal(roll('x', d20));
  const notes = new Map<string, Voice[]>();
  for (const v of voices) notes.set(`${v.freq}@${v.start}`, [...(notes.get(`${v.freq}@${v.start}`) ?? []), v]);
  return { voices, notes: [...notes.values()].sort((a, b) => a[0].start - b[0].start) };
}

const end = (voices: Voice[]) => Math.max(...voices.map((v) => v.stop));

test('SPL-01.1 every reveal, crit and fail note uses at least two detuned voices', async () => {
  for (const d20 of [12, 20, 1]) {
    const { notes } = await voicesOf(d20);
    assert.ok(notes.length > 0);
    for (const n of notes) {
      assert.ok(n.length >= 2, `d20=${d20}: note ${n[0].freq} Hz has ${n.length} voice(s)`);
      assert.ok(new Set(n.map((v) => v.detune)).size >= 2, `d20=${d20}: note ${n[0].freq} Hz voices are not detuned`);
    }
  }
});

test('SPL-01.2 the plain reveal finishes within 0.4 s', async () => {
  const { voices } = await voicesOf(12);
  assert.ok(voices.length > 0);
  assert.ok(end(voices) <= 0.4, `ends at ${end(voices)} s`);
});

test('SPL-01.3 the crit rises over at least four notes and finishes within 1.2 s', async () => {
  const { voices, notes } = await voicesOf(20);
  assert.ok(notes.length >= 4, `${notes.length} notes`);
  for (let i = 1; i < notes.length; i++) {
    assert.ok(notes[i][0].freq > notes[i - 1][0].freq, `note ${i} does not rise`);
    assert.ok(notes[i][0].start > notes[i - 1][0].start, `note ${i} is not after the previous`);
  }
  assert.ok(end(voices) <= 1.2, `ends at ${end(voices)} s`);
});

test('SPL-01.4 the fail falls in pitch with at least three glitch retriggers and finishes within 1.2 s', async () => {
  const { voices, notes } = await voicesOf(1);
  const first = notes[0][0];
  const last = notes[notes.length - 1][0];
  assert.ok((first.rampTo ?? first.freq) < first.freq || last.freq < first.freq, 'pitch does not fall');
  assert.ok((last.rampTo ?? last.freq) < first.freq, 'ends lower than it starts');
  // glitch: short notes (≤ 60 ms) retriggered within 100 ms of each other
  const short = notes.filter((n) => n[0].stop - n[0].start <= 0.06 + 1e-9);
  let run = 1;
  let best = short.length ? 1 : 0;
  for (let i = 1; i < short.length; i++) {
    run = short[i][0].start - short[i - 1][0].start <= 0.1 + 1e-9 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  assert.ok(best >= 3, `${best} rapid retriggers`);
  assert.ok(end(voices) <= 1.2, `ends at ${end(voices)} s`);
});
