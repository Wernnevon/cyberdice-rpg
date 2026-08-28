import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  WORLD_UP,
  getFaces,
  DieFace,
  LabelPlacement,
  createD10Geometry,
  getDieDefinition,
  getFaceNormals,
  getInradius,
  getSnapTarget,
  readTopValue,
  triangleNormal,
  assignValuesToDirections,
  getFaceLabel,
  percentileValue,
} from "./geometry";

const DIE_TYPES = [4, 6, 8, 10, 12, 20, 100] as const;
const faceCountOf = (faces: number) => (faces === 100 ? 10 : faces);

/** Deterministic PRNG (mulberry32) so a failure is always reproducible. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const randomQuaternion = (random: () => number) =>
  new THREE.Quaternion().setFromEuler(
    new THREE.Euler(random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2),
  );

/** The face a label is printed on, found by the direction the text looks along. */
const faceFor = (definition: ReturnType<typeof getDieDefinition>, label: LabelPlacement) => {
  const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(label.quaternion);
  const face = getFaces(definition.geometry).find(f => f.normal.dot(facing) > 0.999);
  if (!face) throw new Error(`no face matches label ${label.text}`);
  return face;
};

/** Corners of the box the glyphs occupy, generously estimated. */
const glyphCorners = (label: LabelPlacement): THREE.Vector3[] => {
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(label.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(label.quaternion);
  const halfWidth = label.size * 0.3 * label.text.length;
  const halfHeight = label.size * 0.5;

  return [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ].map(([sx, sy]) =>
    label.position.clone().addScaledVector(right, sx * halfWidth).addScaledVector(up, sy * halfHeight),
  );
};

/** Convex point-in-polygon test in the plane of the face. */
const isInsideFace = (face: DieFace, point: THREE.Vector3): boolean =>
  face.edges.every(([from, to]) => {
    const inward = new THREE.Vector3()
      .crossVectors(face.normal, new THREE.Vector3().subVectors(to, from))
      .normalize();
    const sign = inward.dot(new THREE.Vector3().subVectors(face.centroid, from)) > 0 ? 1 : -1;
    return sign * inward.dot(new THREE.Vector3().subVectors(point, from)) > -1e-6;
  });

describe.each(DIE_TYPES)("d%i", faces => {
  const definition = getDieDefinition(faces);

  it("has exactly one readable direction per face", () => {
    expect(definition.directions).toHaveLength(faceCountOf(faces));
  });

  it("carries the full set of values with no duplicates", () => {
    // A d100 defaults to the tens half of the percentile pair: 00, 10, ... 90.
    const expected =
      faces === 100
        ? Array.from({ length: 10 }, (_, i) => i * 10)
        : Array.from({ length: faces }, (_, i) => i + 1);
    expect([...definition.values].sort((a, b) => a - b)).toEqual(expected);
  });

  it("winds every triangle outward, so no face renders inside-out", () => {
    const pos = definition.geometry.getAttribute("position");
    const index = definition.geometry.getIndex();
    const count = index ? index.count : pos.count;
    const inward: number[] = [];

    for (let i = 0; i < count; i += 3) {
      const at = (o: number) => {
        const k = index ? index.getX(i + o) : i + o;
        return new THREE.Vector3(pos.getX(k), pos.getY(k), pos.getZ(k));
      };
      const [a, b, c] = [at(0), at(1), at(2)];
      const centroid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
      if (triangleNormal(a, b, c).dot(centroid) <= 0) inward.push(i / 3);
    }

    expect(inward).toEqual([]);
  });

  it("prints a number for every readable face", () => {
    // A d4 is read at the apex, so each of its 4 faces carries all 3 of its corners.
    expect(definition.labels).toHaveLength(faces === 4 ? 12 : faceCountOf(faces));
  });

  it("prints the value that belongs to the direction it marks", () => {
    definition.labels.forEach(label => {
      expect(label.text).toBe(getFaceLabel(faces, definition.values[label.valueIndex]));
    });
  });

  it("lays every number flat on a face", () => {
    definition.labels.forEach(label => {
      const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(label.quaternion);
      const face = faceFor(definition, label);
      expect(facing.dot(face.normal)).toBeGreaterThan(0.9999);
    });
  });

  it("keeps every number inside the outline of its face", () => {
    definition.labels.forEach(label => {
      const face = faceFor(definition, label);
      glyphCorners(label).forEach(corner => {
        expect(isInsideFace(face, corner)).toBe(true);
      });
    });
  });

  it("reports the value that is actually on top, from any orientation", () => {
    const random = seeded(faces);

    for (let attempt = 0; attempt < 500; attempt++) {
      const snapped = getSnapTarget(randomQuaternion(random), definition.directions);

      const upness = definition.directions.map(dir =>
        dir.clone().applyQuaternion(snapped.quaternion).dot(WORLD_UP),
      );
      const topIndex = upness.indexOf(Math.max(...upness));

      // The snapped face must be genuinely up, and must be the one we report.
      expect(upness[snapped.index]).toBeGreaterThan(0.999);
      expect(definition.values[snapped.index]).toBe(definition.values[topIndex]);
      expect(readTopValue(snapped.quaternion, definition)).toBe(definition.values[snapped.index]);
    }
  });
});

describe("opposite faces", () => {
  it.each([6, 8, 10, 12, 20, 100] as const)("on a d%i always add up to the same total", faces => {
    const { directions, values } = getDieDefinition(faces);
    const sums = new Set<number>();

    directions.forEach((dir, i) => {
      const opposite = directions.findIndex((other, k) => k !== i && dir.dot(other) < -0.999);
      expect(opposite).toBeGreaterThanOrEqual(0);
      sums.add(values[i] + values[opposite]);
    });

    expect([...sums]).toHaveLength(1);
  });

  it("numbers a d4 sequentially, since a tetrahedron has no opposite faces", () => {
    const { directions, values } = getDieDefinition(4);
    directions.forEach((dir, i) => {
      expect(directions.some((other, k) => k !== i && dir.dot(other) < -0.999)).toBe(false);
    });
    expect([...values].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });
});

describe("d10 trapezohedron", () => {
  it("builds 10 planar kite faces at any scale", () => {
    for (const scale of [0.3, 0.62, 1.4]) {
      expect(getFaceNormals(createD10Geometry(scale))).toHaveLength(10);
    }
  });

  it("puts every face the same distance from the centre, so it cannot be loaded", () => {
    const geometry = createD10Geometry(0.62);
    const distances = getFaceNormals(geometry).map(normal => {
      const pos = geometry.getAttribute("position");
      // Distance from the origin to this face's supporting plane.
      let best = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
        best = Math.max(best, normal.dot(v));
      }
      return best;
    });

    const inradius = getInradius(geometry);
    distances.forEach(d => expect(d).toBeCloseTo(inradius, 5));
  });
});

describe("labels", () => {
  it("reads 0 as ten on a d10", () => {
    expect(getFaceLabel(10, 10)).toBe("0");
    expect(getFaceLabel(10, 7)).toBe("7");
  });

  it("prints the tens half of a percentile pair as 00..90", () => {
    expect(getFaceLabel(100, 0, "tens")).toBe("00");
    expect(getFaceLabel(100, 30, "tens")).toBe("30");
  });

  it("prints the units half of a percentile pair as 0..9", () => {
    expect(getFaceLabel(100, 0, "units")).toBe("0");
    expect(getFaceLabel(100, 7, "units")).toBe("7");
  });
});

describe("assignValuesToDirections", () => {
  it("pairs opposite directions with complementary values", () => {
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
    ];
    const values = assignValuesToDirections(directions, [1, 2, 3, 4]);

    expect(values[0] + values[1]).toBe(5);
    expect(values[2] + values[3]).toBe(5);
  });
});

describe("definition cache", () => {
  it("shares one geometry per die type instead of rebuilding it", () => {
    expect(getDieDefinition(20).geometry).toBe(getDieDefinition(20).geometry);
    expect(getDieDefinition(20).geometry).not.toBe(getDieDefinition(12).geometry);
  });
});

describe("d4 corner numbers", () => {
  const definition = getDieDefinition(4);

  it("repeats each corner's digit on all three faces meeting there", () => {
    definition.directions.forEach((_, valueIndex) => {
      const marks = definition.labels.filter(label => label.valueIndex === valueIndex);
      expect(marks).toHaveLength(3);
      expect(new Set(marks.map(m => m.text)).size).toBe(1);
    });
  });

  it("stands the apex digit upright on every face once that corner is up", () => {
    definition.directions.forEach((direction, valueIndex) => {
      // Rest the die with this corner pointing at the ceiling.
      const resting = new THREE.Quaternion().setFromUnitVectors(direction, WORLD_UP);

      definition.labels
        .filter(label => label.valueIndex === valueIndex)
        .forEach(label => {
          const up = new THREE.Vector3(0, 1, 0)
            .applyQuaternion(label.quaternion)
            .applyQuaternion(resting);
          // The top of the glyph leans towards the apex, not sideways or down.
          expect(up.dot(WORLD_UP)).toBeGreaterThan(0.5);
        });
    });
  });
});

describe("percentile pair", () => {
  it("carries 00..90 on the tens die and 0..9 on the units die", () => {
    expect([...getDieDefinition(100, "tens").values].sort((a, b) => a - b)).toEqual([
      0, 10, 20, 30, 40, 50, 60, 70, 80, 90,
    ]);
    expect([...getDieDefinition(100, "units").values].sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it("reads 00 with 0 as one hundred, not as zero", () => {
    expect(percentileValue(0, 0)).toBe(100);
  });

  it("covers exactly 1..100 over every combination of the pair", () => {
    const tens = getDieDefinition(100, "tens").values;
    const units = getDieDefinition(100, "units").values;
    const seen = tens.flatMap(t => units.map(u => percentileValue(t, u)));

    expect(new Set(seen).size).toBe(100);
    expect(Math.min(...seen)).toBe(1);
    expect(Math.max(...seen)).toBe(100);
  });
});
