import { describe, it, expect } from "vitest";
import { getDieDefinition, WORLD_UP } from "./geometry";
import { createMotion, launchDie, stepDie, PHYSICS, DieMotion, DieContact } from "./physics";

const DIE_TYPES = [4, 6, 8, 10, 12, 20, 100] as const;
const FRAME = 1 / 60;
/** ~33 s of simulated time. A roll that needs this long is a hang, not a roll. */
const MAX_FRAMES = 2000;

/** Deterministic PRNG (mulberry32) so a failure is always reproducible. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

interface RollOutcome {
  value: number;
  frames: number;
  motion: DieMotion;
}

/** Runs a single die from launch to rest and reports what it read. */
const rollOnce = (faces: number, seed: number): RollOutcome | null => {
  const definition = getDieDefinition(faces);
  const random = seeded(seed);
  const motion = launchDie(createMotion(), 0, random);

  for (let frame = 1; frame <= MAX_FRAMES; frame++) {
    const landedIndex = stepDie(motion, {
      delta: FRAME,
      floorLevel: definition.restHeight,
      directions: definition.directions,
      index: 0,
      neighbours: [],
      random,
    });

    if (landedIndex !== null) {
      return { value: definition.values[landedIndex], frames: frame, motion };
    }
  }
  return null;
};

describe.each(DIE_TYPES)("a rolling d%i", faces => {
  const definition = getDieDefinition(faces);
  const outcomes = Array.from({ length: 200 }, (_, i) => rollOnce(faces, i * 7919 + faces));
  const settled = outcomes.filter((o): o is RollOutcome => o !== null);

  it("always comes to rest", () => {
    expect(outcomes.filter(o => o === null)).toHaveLength(0);
  });

  it("settles in a reasonable amount of time", () => {
    const frames = settled.map(o => o.frames);
    // Well under the hang threshold, and never instant.
    expect(Math.max(...frames)).toBeLessThan(600);
    expect(Math.min(...frames)).toBeGreaterThan(10);
  });

  it("only ever reads a value that exists on the die", () => {
    const allowed = new Set(definition.values);
    settled.forEach(o => expect(allowed.has(o.value)).toBe(true));
  });

  it("ends flat on the tray floor", () => {
    settled.forEach(({ motion }) => {
      expect(motion.position.y).toBeCloseTo(definition.restHeight, 6);
      expect(motion.velocity.length()).toBe(0);
    });
  });

  it("ends with a face squarely up", () => {
    settled.forEach(({ motion }) => {
      const upness = definition.directions.map(dir =>
        dir.clone().applyQuaternion(motion.quaternion).dot(WORLD_UP),
      );
      expect(Math.max(...upness)).toBeGreaterThan(0.9999);
    });
  });

  it("stays inside the tray", () => {
    settled.forEach(({ motion }) => {
      expect(Math.hypot(motion.position.x, motion.position.z)).toBeLessThanOrEqual(
        PHYSICS.trayRadius + 1e-9,
      );
    });
  });

  it("can land on every one of its faces", () => {
    expect(new Set(settled.map(o => o.value)).size).toBe(definition.values.length);
  });
});

describe("a handful of dice thrown together", () => {
  const faces = 6;
  const definition = getDieDefinition(faces);
  const count = 5;

  const rollGroup = (seed: number) => {
    const random = seeded(seed);
    const motions = Array.from({ length: count }, (_, i) => launchDie(createMotion(), i, random));
    const landed = new Array<number | null>(count).fill(null);

    for (let frame = 0; frame < MAX_FRAMES && landed.some(v => v === null); frame++) {
      const neighbours: DieContact[] = motions.map(m => ({
        position: m.position.clone(),
        velocity: m.velocity.clone(),
      }));

      motions.forEach((motion, index) => {
        const result = stepDie(motion, {
          delta: FRAME,
          floorLevel: definition.restHeight,
          directions: definition.directions,
          index,
          neighbours,
          random,
        });
        if (result !== null) landed[index] = definition.values[result];
      });
    }
    return { landed, motions };
  };

  it("lands all of them", () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(rollGroup(seed).landed.every(v => v !== null)).toBe(true);
    }
  });

  it("never leaves two dice stacked on the same spot", () => {
    for (let seed = 0; seed < 20; seed++) {
      const { motions } = rollGroup(seed);
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const gap = motions[i].position.distanceTo(motions[j].position);
          expect(gap).toBeGreaterThan(PHYSICS.dieSpacing * 0.9);
        }
      }
    }
  });
});

describe("stepDie", () => {
  it("ignores a die that has already landed", () => {
    const definition = getDieDefinition(6);
    const motion = createMotion();
    motion.landed = true;
    motion.position.set(0, 5, 0);

    const before = motion.position.clone();
    const result = stepDie(motion, {
      delta: FRAME,
      floorLevel: definition.restHeight,
      directions: definition.directions,
      index: 0,
      neighbours: [],
    });

    expect(result).toBeNull();
    expect(motion.position).toEqual(before);
  });

  it("clamps a long frame so a stalled tab cannot drop a die through the floor", () => {
    const definition = getDieDefinition(6);
    const motion = launchDie(createMotion(), 0, seeded(1));
    motion.position.set(0, definition.restHeight + 0.2, 0);
    motion.velocity.set(0, -50, 0);

    stepDie(motion, {
      delta: 5,
      floorLevel: definition.restHeight,
      directions: definition.directions,
      index: 0,
      neighbours: [],
      random: seeded(2),
    });

    expect(motion.position.y).toBeGreaterThanOrEqual(definition.restHeight);
  });

  it("keeps the quaternion normalised while tumbling", () => {
    const definition = getDieDefinition(20);
    const motion = launchDie(createMotion(), 0, seeded(9));

    for (let i = 0; i < 120; i++) {
      stepDie(motion, {
        delta: FRAME,
        floorLevel: definition.restHeight,
        directions: definition.directions,
        index: 0,
        neighbours: [],
        random: seeded(i),
      });
      expect(motion.quaternion.length()).toBeCloseTo(1, 6);
    }
  });
});
