import type { DieSpec, Roll } from '../types/dice';
import { createLimiter, crowdGain, impactGain, nextSample, pitchRate, revealSound, type RevealSound } from '../utils/sound.ts';

/**
 * Events that unlock audio. A touch only counts as user activation on pointerup/touchend
 * (pointerdown counts for a mouse only), and iOS starts Web Audio on touchend/click.
 */
export const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;

const SAMPLES = [1, 2, 3, 4].map((i) => `/sounds/die-${i}.m4a`);

type Deps = {
  createContext: () => AudioContext;
  fetchBytes: (url: string) => Promise<ArrayBuffer>;
  navigator?: { audioSession?: { type: string } };
  random?: () => number;
};

// Synth notes: [frequency Hz, start s, duration s, slide-to Hz?]. Each note is two detuned voices.
// ponytail: tuned by ear on a phone; DETUNE spreads the voices into a thick "supersaw".
const DETUNE = 12; // cents, ± per voice
const DUCK = 0.3; // impact level while a result sound plays
const TONES: Record<RevealSound, { wave: OscillatorType; notes: [number, number, number, number?][] }> = {
  reveal: { wave: 'sawtooth', notes: [[659, 0, 0.1], [988, 0.07, 0.28]] },
  crit: {
    wave: 'sawtooth',
    notes: [[523, 0, 0.09], [659, 0.07, 0.09], [784, 0.14, 0.09], [1047, 0.21, 0.09], [1319, 0.28, 0.6]],
  },
  fail: {
    wave: 'square',
    // falling sweep, then a glitch stutter stepping down, then a low thud
    notes: [[440, 0, 0.5, 147], [220, 0.52, 0.04], [196, 0.59, 0.04], [175, 0.66, 0.04], [147, 0.73, 0.04], [110, 0.82, 0.3, 73]],
  },
};

/**
 * Plays dice impacts (Kenney samples) and synthesized reveal/crit/fail tones.
 * The AudioContext is created on the first unlock(), which must run inside a user gesture (iOS).
 */
export function createSoundEngine({ createContext, fetchBytes, navigator, random = Math.random }: Deps) {
  // iOS 17+: "ambient" makes the silent switch mute us, like a casual game.
  if (navigator?.audioSession) navigator.audioSession.type = 'ambient';

  let ctx: AudioContext | null = null;
  // impacts -> impactBus (ducked by results) -> master compressor -> speakers; tones -> master
  let master: AudioNode | null = null;
  let impactBus: GainNode | null = null;
  let buffers: AudioBuffer[] = [];
  let lastSample: number | null = null;
  let muted = false;
  let lastReveal: string | null = null;
  const allow = createLimiter();
  let resolveReady: () => void = () => {};
  const ready = new Promise<void>((r) => (resolveReady = r));

  const load = (c: AudioContext) =>
    Promise.all(SAMPLES.map((url) => fetchBytes(url).then((b) => c.decodeAudioData(b))))
      .then((decoded) => {
        buffers = decoded;
      })
      .catch(() => {
        buffers = []; // offline before first cache, or decode failure: impacts stay silent
      })
      .finally(resolveReady);

  /** Plays a result sound; returns its length in seconds. */
  function tone(c: AudioContext, out: AudioNode, kind: RevealSound) {
    const { wave, notes } = TONES[kind];
    const t0 = c.currentTime;
    let len = 0;
    for (const [freq, at, dur, slideTo] of notes) {
      for (const detune of [-DETUNE, DETUNE]) {
        const osc = c.createOscillator();
        const env = c.createGain();
        osc.type = wave;
        osc.detune.value = detune;
        osc.frequency.setValueAtTime(freq, t0 + at);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + at + dur);
        env.gain.setValueAtTime(0.0001, t0 + at);
        env.gain.linearRampToValueAtTime(0.1, t0 + at + 0.008);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
        osc.connect(env).connect(out);
        osc.start(t0 + at);
        osc.stop(t0 + at + dur + 0.01);
        len = Math.max(len, at + dur + 0.01);
      }
    }
    return len;
  }

  return {
    ready,

    /** Call from a pointer/touch handler: creates or resumes the context. */
    unlock() {
      if (!ctx) {
        ctx = createContext();
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.ratio.value = 6;
        comp.connect(ctx.destination);
        master = comp;
        impactBus = ctx.createGain();
        impactBus.connect(comp);
        void load(ctx);
      }
      if (ctx.state === 'suspended') void ctx.resume();
    },

    setMuted(value: boolean) {
      muted = value;
    },

    /** Impact = die speed at contact (m/s), for a die of `sides` in a roll of `dice` dice. Returns the gain played, or null. */
    impact(speed: number, now: number, sides: DieSpec['sides'] = 20, dice = 1) {
      if (muted || !ctx || !impactBus || !buffers.length) return null;
      const g = impactGain(speed);
      if (g === null || !allow(now)) return null;
      const gain = g * crowdGain(dice);
      lastSample = nextSample(buffers.length, lastSample, random);
      const src = ctx.createBufferSource();
      src.buffer = buffers[lastSample];
      src.playbackRate.value = pitchRate(sides, random);
      const vol = ctx.createGain();
      vol.gain.value = gain;
      src.connect(vol).connect(impactBus);
      src.start();
      return gain;
    },

    /** Plays once per roll id. Returns which sound played, or null. */
    reveal(roll: Roll) {
      if (muted || !ctx || roll.id === lastReveal) return null;
      lastReveal = roll.id;
      const kind = revealSound(roll);
      const len = tone(ctx, master!, kind);
      const t0 = ctx.currentTime;
      impactBus!.gain.setValueAtTime(DUCK, t0);
      impactBus!.gain.setValueAtTime(DUCK, t0 + len);
      impactBus!.gain.linearRampToValueAtTime(1, t0 + len + 0.15);
      return kind;
    },
  };
}

export type SoundEngine = ReturnType<typeof createSoundEngine>;

/** The app's engine, on the browser's real Web Audio (nothing happens until unlock()). */
export const sound = createSoundEngine({
  createContext: () => new AudioContext(),
  fetchBytes: (url) => fetch(url).then((r) => r.arrayBuffer()),
  navigator: globalThis.navigator as Deps['navigator'],
});
