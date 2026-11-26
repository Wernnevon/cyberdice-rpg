// Derived from .specs/features/roll-sounds/spec.md (SND-01.1, SND-02.1, SND-04.2, SND-05.1, SND-05.2)
// and sound-polish/spec.md (SPL-01, SPL-03, SPL-04, SPL-05). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Roll } from '../types/dice';
import { crowdGain, diePitch, MIN_IMPACT, PER_WINDOW, WINDOW_MS } from '../utils/sound.ts';
import { createSoundEngine, RATTLE_GAP_MS, UNLOCK_EVENTS } from './engine.ts';
import { createShakeGesture, RATTLE_THRESHOLD, ROLL_THRESHOLD } from '../utils/shakeGesture.ts';

type Node = { kind: string; outs: Node[]; gain?: Param; buffer?: unknown; playbackRate?: Param };
type Played = { kind: 'sample' | 'tone'; gain: number; note?: string; rate?: number; buffer?: unknown; path: Node[] };
type Voice = { wave: string; freq: number; detune: number; start: number; stop: number; rampTo: number | null };
type Param = ReturnType<typeof param>;

/** An AudioParam that remembers its scheduled values. */
function param(initial = 1) {
  const events: { t: number; v: number }[] = [];
  return {
    value: initial,
    events,
    setValueAtTime(v: number, t: number) {
      events.push({ t, v });
    },
    linearRampToValueAtTime(v: number, t: number) {
      events.push({ t, v });
    },
    exponentialRampToValueAtTime(v: number, t: number) {
      events.push({ t, v });
    },
    /** Value in effect at time t (ramps counted as reached at their end time). */
    at(t: number) {
      const past = events.filter((e) => e.t <= t + 1e-9).sort((x, y) => x.t - y.t);
      return past.length ? past[past.length - 1].v : this.value;
    },
  };
}

/** Minimal Web Audio stand-in that records what reaches the speakers, and through which nodes. */
function fakeAudio() {
  const played: Played[] = [];
  const voices: Voice[] = [];
  const destination: Node = { kind: 'destination', outs: [] };
  const node = (kind: string, extra: object = {}) => {
    const n = { kind, outs: [] as Node[], ...extra, connect: (t: Node) => (n.outs.push(t), t) };
    return n;
  };
  /** The chain from a source to the speakers (first output at each step). */
  const pathOf = (n: Node) => {
    const path = [n];
    while (path[path.length - 1].outs[0]) path.push(path[path.length - 1].outs[0]);
    return path;
  };
  const ctx = {
    state: 'suspended' as AudioContextState,
    currentTime: 0,
    sampleRate: 8000,
    destination,
    resumed: 0,
    resume() {
      this.state = 'running';
      this.resumed++;
      return Promise.resolve();
    },
    decodeAudioData: (b: ArrayBuffer) => Promise.resolve({ duration: 0.3, bytes: b.byteLength }),
    createGain: () => node('gain', { gain: param() }),
    createDynamicsCompressor: () => node('compressor', { threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }),
    createBiquadFilter: () => node('filter', { type: 'lowpass', frequency: param(), Q: param() }),
    createBuffer: (_ch: number, length: number) => ({ length, getChannelData: () => new Float32Array(length) }),
    createBufferSource() {
      const src = node('source', { buffer: null as unknown, playbackRate: param() }) as Node & { connect(t: Node): Node; start(): void };
      src.start = () => {
        if (!src.buffer) return;
        const path = pathOf(src);
        played.push({ kind: 'sample', gain: path[1]?.gain?.value ?? 1, rate: src.playbackRate!.value, buffer: src.buffer, path });
      };
      return src;
    },
    createOscillator() {
      const v: Voice = { wave: 'sine', freq: 0, detune: 0, start: 0, stop: 0, rampTo: null };
      const osc = node('oscillator', {
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
        // a voice = wave, pitch, detune and start time: what a listener can tell apart
        start: (at = 0) => {
          v.start = at;
          voices.push(v);
          played.push({ kind: 'tone', gain: 1, note: `${v.wave}@${v.freq}Hz~${v.detune}c+${at}s`, path: pathOf(osc) });
        },
        stop: (at = 0) => void (v.stop = at),
      });
      return osc;
    },
  };
  return { ctx, played, voices };
}

function setup(nav: { audioSession?: { type: string } } = {}, random: () => number = () => 0) {
  const audio = fakeAudio();
  let created = 0;
  const engine = createSoundEngine({
    createContext: () => {
      created++;
      return audio.ctx as unknown as AudioContext;
    },
    fetchBytes: () => Promise.resolve(new ArrayBuffer(8)),
    navigator: nav,
    random,
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
  engine.impact(MIN_IMPACT, 0, 20, 1);
  assert.equal(played.filter((p) => p.kind === 'sample').length, 1);
  engine.impact(MIN_IMPACT * 4, WINDOW_MS, 20, 1);
  const samples = played.filter((p) => p.kind === 'sample');
  assert.equal(samples.length, 2);
  assert.ok(samples[1].gain > samples[0].gain, 'harder impact is louder');
  // below the minimum: nothing more
  engine.impact(MIN_IMPACT / 2, WINDOW_MS * 2, 20, 1);
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
  engine.impact(MIN_IMPACT * 4, 0, 20, 1);
  assert.equal(engine.reveal(roll('a', 12)), null);
  assert.equal(engine.reveal(roll('b', 20)), null);
  assert.equal(engine.reveal(roll('c', 1)), null);
  assert.deepEqual(played, []);
  engine.setMuted(false);
  engine.impact(MIN_IMPACT * 4, WINDOW_MS, 20, 1);
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
  engine.impact(MIN_IMPACT * 2, 0, 20, 1);
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
  for (let i = 0; i < PER_WINDOW + 3; i++) engine.impact(MIN_IMPACT * 4, 500, 20, 1);
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

/** A fresh, unlocked engine with its samples loaded. */
async function ready(random?: () => number) {
  const s = setup({}, random);
  s.engine.unlock();
  await s.engine.ready;
  return s;
}
const samples = (played: Played[]) => played.filter((p) => p.kind === 'sample');
const whooshes = (played: Played[]) => played.filter((p) => p.path.some((n) => n.kind === 'filter'));

test('SPL-02.1 the engine plays a smaller die higher, in the order d4 > d6 > d8 > d10 > d12 > d20', async () => {
  const rates = [];
  for (const sides of [4, 6, 8, 10, 12, 20] as const) {
    const { engine, played } = await ready(() => 0.5); // 0.5: no jitter
    engine.impact(MIN_IMPACT * 4, 0, sides, 1);
    rates.push(samples(played)[0].rate!);
  }
  for (let i = 1; i < rates.length; i++) assert.ok(rates[i - 1] > rates[i], `rates ${rates.join(', ')}`);
  assert.ok(Math.abs(rates[0] - diePitch(4)) < 1e-9);
});

test('SPL-02.2 the engine varies each impact pitch by at most ±6 %', async () => {
  for (const r of [0, 0.999999]) {
    const { engine, played } = await ready(() => r);
    engine.impact(MIN_IMPACT * 4, 0, 6, 1);
    const ratio = samples(played)[0].rate! / diePitch(6);
    assert.ok(ratio >= 0.94 - 1e-9 && ratio <= 1.06 + 1e-9, `ratio ${ratio}`);
    assert.ok(Math.abs(ratio - 1) > 0.05, 'the random draw reaches the pitch');
  }
});

test('SPL-02.3 the engine never plays the same sample twice in a row', async () => {
  const { engine, played } = await ready(() => 0); // a random that always says "first sample"
  for (let i = 0; i < 8; i++) engine.impact(MIN_IMPACT * 4, i * WINDOW_MS, 8, 1);
  const bufs = samples(played).map((p) => p.buffer);
  assert.equal(bufs.length, 8);
  for (let i = 1; i < bufs.length; i++) assert.notEqual(bufs[i], bufs[i - 1], `impact ${i} repeated its sample`);
});

test('SPL-03.1 the engine plays each impact at the crowd gain of its roll', async () => {
  const gains = [];
  for (const dice of [1, 4, 16]) {
    const { engine, played } = await ready();
    engine.impact(MIN_IMPACT * 100, 0, 20, dice); // full impact gain: 1
    gains.push(samples(played)[0].gain);
  }
  assert.deepEqual(gains, [1, crowdGain(4), crowdGain(16)]);
  assert.deepEqual(gains, [1, 0.5, 0.35]);
});

test('SPL-03.2 every sound reaches the speakers through one master compressor', async () => {
  const { engine, played, ctx } = await ready();
  engine.impact(MIN_IMPACT * 4, 0, 12, 3);
  engine.reveal(roll('a', 12));
  engine.reveal(roll('b', 20));
  engine.reveal(roll('c', 1));
  engine.launch('w');
  engine.rattle(1000);
  assert.ok(samples(played).length && played.some((p) => p.kind === 'tone'));
  assert.equal(whooshes(played).length, 1, 'the whoosh is among the sounds checked');
  assert.equal(samples(played).length, 3, 'impact, rattle and whoosh are among the sounds checked');
  const masters = new Set<Node>();
  for (const p of played) {
    assert.equal(p.path[p.path.length - 1], ctx.destination, `${p.kind} does not reach the speakers`);
    const comps = p.path.filter((n) => n.kind === 'compressor');
    assert.equal(comps.length, 1, `${p.kind} passes ${comps.length} compressors`);
    assert.equal(p.path[p.path.length - 2], comps[0], 'the compressor is the last stage');
    masters.add(comps[0]);
  }
  assert.equal(masters.size, 1, 'one shared master');
});

test('SPL-03.3 a reveal ducks impacts to at most 30 % gain for its length', async () => {
  for (const d20 of [12, 20, 1]) {
    const { engine, played, voices, ctx } = await ready();
    engine.impact(MIN_IMPACT * 4, 0, 20, 1); // an impact already playing
    ctx.currentTime = 2;
    engine.reveal(roll('r', d20));
    const len = Math.max(...voices.map((v) => v.stop)) - 2;
    engine.impact(MIN_IMPACT * 4, 2500, 20, 1); // one arriving during the reveal
    // everything an impact passes through, multiplied, at a moment in time
    const level = (p: Played, t: number) => p.path.reduce((g, n) => g * (n.gain && n.kind === 'gain' && n !== p.path[1] ? n.gain.at(t) : 1), 1);
    for (const p of samples(played)) {
      assert.ok(level(p, 1.9) > 0.99, 'not ducked before the reveal');
      for (const t of [2, 2 + len / 2, 2 + len - 0.01]) assert.ok(level(p, t) <= 0.3 + 1e-9, `d20=${d20}: level ${level(p, t)} at ${t}`);
      assert.ok(level(p, 2 + len + 0.2) > 0.99, `d20=${d20}: still ducked after the reveal`);
    }
    // the reveal itself is not ducked: no tone passes through the impacts' ducking stage
    const impactStages = new Set(samples(played).flatMap((p) => p.path.slice(2).filter((n) => n.kind === 'gain')));
    for (const p of played.filter((x) => x.kind === 'tone')) assert.ok(!p.path.some((n) => impactStages.has(n)), 'the reveal is ducked too');
  }
});


test('SPL-04.1 a started roll plays exactly one launch whoosh', async () => {
  const { engine, played, ctx } = await ready();
  assert.equal(engine.launch('a'), true);
  assert.equal(whooshes(played).length, 1);
  assert.equal(whooshes(played)[0].path[whooshes(played)[0].path.length - 1], ctx.destination, 'reaches the speakers');
  assert.equal(engine.launch('a'), false, 'same roll again: no second whoosh');
  assert.equal(whooshes(played).length, 1);
  assert.equal(engine.launch('b'), true, 'the next roll whooshes again');
  assert.equal(whooshes(played).length, 2);
});

test('SPL-04.2 no launch whoosh while sound is off', async () => {
  const { engine, played } = await ready();
  engine.setMuted(true);
  assert.equal(engine.launch('a'), false);
  assert.deepEqual(played, []);
  engine.setMuted(false);
  assert.equal(engine.launch('b'), true, 'unmuting restores the whoosh');
});

test('SPL-05.1 the engine plays a rattle click from a die sample, at most one per gap', async () => {
  const { engine, played } = await ready(() => 0.5);
  const dieBuffers = new Set<unknown>();
  // the die samples, as impacts play them
  for (let i = 0; i < 4; i++) engine.impact(MIN_IMPACT * 4, i * WINDOW_MS, 20, 1);
  samples(played).forEach((p) => dieBuffers.add(p.buffer));
  const before = played.length;
  assert.ok(engine.rattle(1000));
  assert.equal(engine.rattle(1000 + RATTLE_GAP_MS - 1), false, 'too soon after the last click');
  assert.ok(engine.rattle(1000 + RATTLE_GAP_MS));
  const clicks = played.slice(before);
  assert.equal(clicks.length, 2);
  for (const c of clicks) {
    assert.ok(dieBuffers.has(c.buffer), 'built from a die sample');
    assert.ok(c.gain < 0.5, `rattle is quiet (${c.gain})`);
  }
});

test('SPL-05.5 while sound is off the shake plays no rattle and still rolls', async () => {
  const { engine, played } = await ready();
  engine.setMuted(true);
  const gesture = createShakeGesture();
  let rolls = 0;
  for (const [f, t] of [[ROLL_THRESHOLD + 1, 0], [RATTLE_THRESHOLD + 1, 80], [ROLL_THRESHOLD + 2, 160], [0, 300], [0, 470]] as const) {
    const r = gesture(f, t, true);
    if (r === 'rattle') assert.equal(engine.rattle(t), false);
    if (r === 'roll') rolls++;
  }
  assert.equal(rolls, 1);
  assert.deepEqual(played, []);
});
