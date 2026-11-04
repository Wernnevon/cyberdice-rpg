import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as THREE from "three";
import { getDieDefinition, TRAY_FLOOR_Y, WORLD_UP } from "./geometry";
import { DiceSimulation, initPhysics, SIM } from "./simulation";

const DIE_TYPES = [4, 6, 8, 10, 12, 20, 100] as const;
const FRAME = 1 / 60;
/** 20 s of simulated time. A throw that needs this long is a hang, not a roll. */
const MAX_FRAMES = 1200;

/** Deterministic PRNG (mulberry32) so a failure is always reproducible. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

let sim: DiceSimulation;
beforeAll(async () => {
  await initPhysics();
  sim = new DiceSimulation();
});
afterAll(() => sim.free());

/** Throws, runs to rest and reports the frames it took, or null on a hang. */
const throwDice = (faces: number, count: number, seed: number, frame = FRAME): number | null => {
  sim.throw(Array.from({ length: count }, () => getDieDefinition(faces)), seeded(seed));
  for (let f = 1; f <= MAX_FRAMES; f++) {
    if (sim.step(frame)) return f;
  }
  return null;
};

describe.each(DIE_TYPES)("a thrown d%i", faces => {
  const definition = getDieDefinition(faces);
  const allowed = new Set(definition.values);

  it("comes to rest quickly, on a face that exists, flat and inside the tray", () => {
    const seen = new Set<number>();
    for (let seed = 0; seed < 150; seed++) {
      const frames = throwDice(faces, 1, seed * 7919 + faces);
      expect(frames).not.toBeNull();
      expect(frames!).toBeLessThan(5 / FRAME);

      const [die] = sim.dice;
      expect(allowed.has(die.value!)).toBe(true);
      seen.add(die.value!);

      // The value read is the face actually pointing up.
      const r = die.body.rotation();
      const pose = new THREE.Quaternion(r.x, r.y, r.z, r.w);
      const upness = definition.directions.map(dir => dir.clone().applyQuaternion(pose).dot(WORLD_UP));
      const top = upness.indexOf(Math.max(...upness));
      expect(definition.values[top]).toBe(die.value);
      expect(Math.max(...upness)).toBeGreaterThan(Math.cos(SIM.cockedTilt));

      const t = die.body.translation();
      expect(Math.hypot(t.x, t.z)).toBeLessThan(SIM.wallRadius);
      expect(t.y).toBeGreaterThan(TRAY_FLOOR_Y);
    }
    // Every face turns up at some point.
    expect(seen.size).toBe(definition.values.length);
  });
});

/**
 * What a die lands on is an emergent property of the simulation rather than
 * something drawn, so a tweak to friction, damping or the throw could quietly
 * bias the results -- the worst regression a dice roller can have.
 */
describe("fairness", () => {
  it.each([4, 6, 20] as const)("rolls a d%i evenly across its faces", faces => {
    const definition = getDieDefinition(faces);
    const rolls = faces * 300;
    const counts = new Map<number, number>();

    for (let seed = 0; seed < rolls; seed++) {
      if (throwDice(faces, 1, seed * 31 + faces * 977) === null) continue;
      const value = sim.values[0];
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    // Pearson's chi-squared against a uniform die. The bound is the 99.9th
    // percentile for the degrees of freedom, so a fair die trips it once in a
    // thousand runs while a visibly loaded one trips it every time.
    const expected = rolls / definition.values.length;
    const chiSquared = [...counts.values()].reduce(
      (sum, observed) => sum + (observed - expected) ** 2 / expected,
      0,
    );
    const bound = { 4: 16.3, 6: 20.5, 20: 43.8 }[faces];
    expect(counts.size).toBe(definition.values.length);
    expect(chiSquared).toBeLessThan(bound);
  }, 60000);
});

describe("a full tray", () => {
  it("settles ten dice without any of them getting stuck", () => {
    for (let seed = 0; seed < 100; seed++) {
      const frames = throwDice(6, 10, seed * 31 + 7);
      expect(frames).not.toBeNull();
      expect(frames!).toBeLessThan(6 / FRAME);
    }
  });

  it("never leaves two dice on the same spot", () => {
    for (let seed = 0; seed < 20; seed++) {
      throwDice(6, 10, seed);
      const spots = sim.dice.map(d => d.body.translation());
      for (let i = 0; i < spots.length; i++) {
        for (let j = i + 1; j < spots.length; j++) {
          expect(Math.hypot(spots[i].x - spots[j].x, spots[i].z - spots[j].z)).toBeGreaterThan(0.3);
        }
      }
    }
  });
});

describe("the throw", () => {
  it("replays exactly from the same seed", () => {
    throwDice(20, 3, 42);
    const first = sim.values;
    throwDice(20, 3, 42);
    expect(sim.values).toEqual(first);
  });

  it("lands the same way whatever the frame rate", () => {
    // Fixed physics steps: a slow machine shows fewer frames of the same throw,
    // not a different throw.
    throwDice(20, 3, 7, 1 / 60);
    const at60 = sim.values;
    throwDice(20, 3, 7, 1 / 120);
    expect(sim.values).toEqual(at60);
  });
});
