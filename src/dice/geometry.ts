import * as THREE from "three";

export const WORLD_UP = new THREE.Vector3(0, 1, 0);
/** Top surface of the tray floor cylinder (height 0.1, centered at y = 0). */
export const TRAY_FLOOR_Y = 0.05;
/** Two directions count as the same face / opposite faces beyond these dots. */
export const SAME_DIR_DOT = 0.999;
export const OPPOSITE_DIR_DOT = -0.999;

/**
 * Pentagonal trapezohedron for the authentic 10-sided RPG die (D10 / D100).
 *
 * Each of the 10 kite faces is (apex, upperRing[i], lowerRing[i], upperRing[i+1]),
 * where lowerRing[i] sits at the angular midpoint of the two upper vertices. The
 * kite is only planar when the ring offset satisfies h2 = h / (5 + 2*sqrt(5)),
 * which holds for any ring radius -- otherwise the solid ends up with 20 slanted
 * faces and no well-defined "top face" to read a result from.
 */
export const createD10Geometry = (scale = 0.55): THREE.BufferGeometry => {
  const h = 0.95 * scale;
  const h2 = h / (5 + 2 * Math.sqrt(5));
  const r = 0.72 * scale;

  const vertices: number[] = [
    0, h, 0,    // 0: Top Apex
    0, -h, 0,   // 1: Bottom Apex
  ];

  // Upper ring (index 2..6) at +h2
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 * Math.PI) / 180;
    vertices.push(r * Math.cos(angle), h2, r * Math.sin(angle));
  }

  // Lower ring (index 7..11) at -h2, rotated 36 deg so it interleaves
  for (let i = 0; i < 5; i++) {
    const angle = ((i * 72 + 36) * Math.PI) / 180;
    vertices.push(r * Math.cos(angle), -h2, r * Math.sin(angle));
  }

  const indices: number[] = [];
  for (let i = 0; i < 5; i++) {
    const upCurr = 2 + i;
    const upNext = 2 + ((i + 1) % 5);
    const lowCurr = 7 + i;
    const lowNext = 7 + ((i + 1) % 5);

    // Top kite: apex - upCurr - lowCurr - upNext
    indices.push(0, lowCurr, upCurr);
    indices.push(0, upNext, lowCurr);

    // Bottom kite: apex - lowCurr - upNext - lowNext
    indices.push(1, lowCurr, upNext);
    indices.push(1, upNext, lowNext);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
};

export const createDiceGeometry = (faces: number): THREE.BufferGeometry => {
  switch (faces) {
    case 4: return new THREE.TetrahedronGeometry(0.62);
    case 6: return new THREE.BoxGeometry(0.65, 0.65, 0.65);
    case 8: return new THREE.OctahedronGeometry(0.6);
    case 10: return createD10Geometry(0.62);
    case 12: return new THREE.DodecahedronGeometry(0.52);
    case 20: return new THREE.IcosahedronGeometry(0.55);
    case 100: return createD10Geometry(0.62);
    default: return new THREE.BoxGeometry(0.65, 0.65, 0.65);
  }
};

/** Runs `visit` over every triangle of a geometry, indexed or not. */
const forEachTriangle = (
  geometry: THREE.BufferGeometry,
  visit: (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => void,
): void => {
  const pos = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const count = index ? index.count : pos.count;

  for (let i = 0; i < count; i += 3) {
    const idxA = index ? index.getX(i) : i;
    const idxB = index ? index.getX(i + 1) : i + 1;
    const idxC = index ? index.getX(i + 2) : i + 2;
    visit(
      new THREE.Vector3(pos.getX(idxA), pos.getY(idxA), pos.getZ(idxA)),
      new THREE.Vector3(pos.getX(idxB), pos.getY(idxB), pos.getZ(idxB)),
      new THREE.Vector3(pos.getX(idxC), pos.getY(idxC), pos.getZ(idxC)),
    );
  }
};

export const triangleNormal = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): THREE.Vector3 =>
  new THREE.Vector3()
    .crossVectors(new THREE.Vector3().subVectors(c, b), new THREE.Vector3().subVectors(a, b))
    .normalize();

export interface DieFace {
  normal: THREE.Vector3;
  /** Corner vertices of the face polygon, in no particular order. */
  vertices: THREE.Vector3[];
  /** Boundary edges of the face polygon, interior diagonals excluded. */
  edges: [THREE.Vector3, THREE.Vector3][];
  centroid: THREE.Vector3;
  /** Largest circle that fits in the face, centred on the centroid. */
  inscribedRadius: number;
}

/** Positions are matched by value: polyhedron geometries duplicate shared corners. */
const vertexKey = (v: THREE.Vector3) => `${v.x.toFixed(5)},${v.y.toFixed(5)},${v.z.toFixed(5)}`;
const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

interface FaceGroup {
  normal: THREE.Vector3;
  offset: number;
  vertices: Map<string, THREE.Vector3>;
  edges: Map<string, number>;
}

/**
 * Groups the triangles of a solid into its flat polygonal faces.
 *
 * Triangles belong to the same face when they share a normal *and* a plane
 * offset, so parallel faces on opposite sides stay separate. An edge used by two
 * triangles of one face is an interior diagonal, not part of the outline.
 */
export const getFaces = (geometry: THREE.BufferGeometry): DieFace[] => {
  const groups: FaceGroup[] = [];

  forEachTriangle(geometry, (a, b, c) => {
    const normal = triangleNormal(a, b, c);
    if (normal.lengthSq() < 0.5) return;
    const offset = normal.dot(a);

    let group = groups.find(g => g.normal.dot(normal) > SAME_DIR_DOT && Math.abs(g.offset - offset) < 1e-4);
    if (!group) {
      group = { normal, offset, vertices: new Map(), edges: new Map() };
      groups.push(group);
    }

    const keys = [a, b, c].map(v => {
      const key = vertexKey(v);
      if (!group.vertices.has(key)) group.vertices.set(key, v);
      return key;
    });

    for (let i = 0; i < 3; i++) {
      const key = edgeKey(keys[i], keys[(i + 1) % 3]);
      group.edges.set(key, (group.edges.get(key) ?? 0) + 1);
    }
  });

  return groups.map(group => {
    const vertices = [...group.vertices.values()];
    const centroid = vertices
      .reduce((sum, v) => sum.add(v), new THREE.Vector3())
      .multiplyScalar(1 / vertices.length);

    const edges = [...group.edges.entries()]
      .filter(([, count]) => count === 1)
      .map(([key]) => {
        const [from, to] = key.split("|").map(k => group.vertices.get(k)!);
        return [from, to] as [THREE.Vector3, THREE.Vector3];
      });

    const inscribedRadius = edges.reduce((min, [from, to]) => {
      const along = new THREE.Vector3().subVectors(to, from).normalize();
      const toCentroid = new THREE.Vector3().subVectors(centroid, from);
      return Math.min(min, toCentroid.sub(along.multiplyScalar(toCentroid.dot(along))).length());
    }, Infinity);

    return { normal: group.normal, vertices, edges, centroid, inscribedRadius };
  });
};

/** Unique outward face normals, one per flat face. */
export const getFaceNormals = (geometry: THREE.BufferGeometry): THREE.Vector3[] =>
  getFaces(geometry).map(face => face.normal);

/** Unique vertex directions -- used by the D4, which is read at the top vertex. */
export const getVertexDirections = (geometry: THREE.BufferGeometry): THREE.Vector3[] => {
  const pos = geometry.getAttribute("position");
  const dirs: THREE.Vector3[] = [];

  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    if (!dirs.some(existing => existing.dot(v) > SAME_DIR_DOT)) {
      dirs.push(v);
    }
  }
  return dirs;
};

/** Distance from the die centre to a resting face -- how high it sits on the tray. */
export const getInradius = (geometry: THREE.BufferGeometry): number => {
  let min = Infinity;

  forEachTriangle(geometry, (a, b, c) => {
    const norm = triangleNormal(a, b, c);
    if (norm.lengthSq() < 0.5) return;
    min = Math.min(min, Math.abs(norm.dot(a)));
  });

  return Number.isFinite(min) ? min : 0.35;
};

/** Ascending face values: a d10 reads 0 as 10, a d100 reads 00 as 100. */
export const getFaceValues = (faces: number, count: number): number[] => {
  if (faces === 100) return Array.from({ length: count }, (_, i) => (i + 1) * 10);
  return Array.from({ length: count }, (_, i) => i + 1);
};

export const getFaceLabel = (faces: number, value: number): string => {
  if (faces === 100) return value === 100 ? "00" : `${value}`;
  if (faces === 10) return value === 10 ? "0" : `${value}`;
  return `${value}`;
};

/**
 * Distributes values over the die so opposite faces always add up to the same
 * total (7 on a d6, 21 on a d20, ...), like a real die. Directions with no
 * antipode (the D4 vertices) are numbered sequentially instead.
 */
export const assignValuesToDirections = (directions: THREE.Vector3[], values: number[]): number[] => {
  const assigned: (number | null)[] = directions.map(() => null);
  let low = 0;
  let high = values.length - 1;

  directions.forEach((dir, i) => {
    if (assigned[i] !== null) return;
    const opposite = directions.findIndex((other, k) => k !== i && dir.dot(other) < OPPOSITE_DIR_DOT);
    assigned[i] = values[low];
    low += 1;
    if (opposite >= 0) {
      assigned[opposite] = values[high];
      high -= 1;
    }
  });

  return assigned.map((v, i) => v ?? values[i] ?? i + 1);
};

export interface LabelPlacement {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  size: number;
  text: string;
  /** Index into the die's `directions` / `values` arrays. */
  valueIndex: number;
}

/** Lifts a number just clear of the face it is printed on. */
const LABEL_LIFT = 0.006;

/**
 * Lays text flat on a face: +Z along the outward normal, +Y along `up`.
 * Without an explicit up vector the glyph rolls arbitrarily in the plane, which
 * is what leaves numbers sideways or upside down.
 */
const faceQuaternion = (normal: THREE.Vector3, up: THREE.Vector3): THREE.Quaternion => {
  const y = up.clone().projectOnPlane(normal).normalize();
  const x = new THREE.Vector3().crossVectors(y, normal).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, normal));
};

/** In-plane reference for upright text, dodging a degenerate projection. */
const upHintFor = (normal: THREE.Vector3): THREE.Vector3 =>
  Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);

/** One number per face, centred and scaled to fit within the face outline. */
const buildFaceLabels = (faces: DieFace[], values: number[], dieFaces: number): LabelPlacement[] =>
  faces.map((face, i) => {
    const text = getFaceLabel(dieFaces, values[i]);
    return {
      position: face.centroid.clone().addScaledVector(face.normal, LABEL_LIFT),
      quaternion: faceQuaternion(face.normal, upHintFor(face.normal)),
      size: face.inscribedRadius * (text.length > 1 ? 0.7 : 0.95),
      text,
      valueIndex: i,
    };
  });

/**
 * A real D4 has no top face: it is read at the apex, so each face carries the
 * digit of all three of its own corners, each rotated to read upright when that
 * corner is the one pointing up.
 */
const buildCornerLabels = (
  faces: DieFace[],
  directions: THREE.Vector3[],
  values: number[],
  dieFaces: number,
): LabelPlacement[] =>
  faces.flatMap(face =>
    face.vertices.map(vertex => {
      const toCorner = new THREE.Vector3().subVectors(vertex, face.centroid);
      const valueIndex = directions.findIndex(dir => dir.dot(vertex.clone().normalize()) > SAME_DIR_DOT);
      const text = getFaceLabel(dieFaces, values[valueIndex]);

      return {
        // Pushed towards the corner, but only as far as the converging edges
        // leave room for the glyph -- see the fit test in geometry.test.ts.
        position: face.centroid
          .clone()
          .addScaledVector(toCorner, 0.55)
          .addScaledVector(face.normal, LABEL_LIFT),
        quaternion: faceQuaternion(face.normal, toCorner),
        size: toCorner.length() * (text.length > 1 ? 0.22 : 0.32),
        text,
        valueIndex,
      };
    }),
  );

export interface DieDefinition {
  geometry: THREE.BufferGeometry;
  edges: THREE.EdgesGeometry;
  /** Local-space directions that get pointed up when the die settles. */
  directions: THREE.Vector3[];
  /** Value shown by directions[i] when it points up. Parallel array. */
  values: number[];
  /** Numbers printed on the solid, already positioned and oriented. */
  labels: LabelPlacement[];
  restHeight: number;
}

// Geometries are expensive and immutable, so they are built once per die type and
// shared by every mesh instead of being re-created on each React render.
const dieDefinitionCache = new Map<number, DieDefinition>();

export const getDieDefinition = (faces: number): DieDefinition => {
  const cached = dieDefinitionCache.get(faces);
  if (cached) return cached;

  const geometry = createDiceGeometry(faces);
  const polygons = getFaces(geometry);
  // The D4 has no top face -- the result is read at the vertex pointing up.
  const directions = faces === 4 ? getVertexDirections(geometry) : polygons.map(face => face.normal);
  const values = assignValuesToDirections(directions, getFaceValues(faces, directions.length));

  const definition: DieDefinition = {
    geometry,
    edges: new THREE.EdgesGeometry(geometry),
    directions,
    values,
    labels:
      faces === 4
        ? buildCornerLabels(polygons, directions, values, faces)
        : buildFaceLabels(polygons, values, faces),
    restHeight: TRAY_FLOOR_Y + getInradius(geometry),
  };

  dieDefinitionCache.set(faces, definition);
  return definition;
};

/**
 * Nearest resting orientation: rotates whichever direction is closest to up so it
 * points exactly up. Returns the index too, so the value read out is guaranteed to
 * be the one printed on the face the player sees.
 */
export const getSnapTarget = (currentQuat: THREE.Quaternion, directions: THREE.Vector3[]) => {
  let bestIndex = 0;
  let maxDot = -Infinity;

  directions.forEach((dir, i) => {
    const dot = dir.clone().applyQuaternion(currentQuat).dot(WORLD_UP);
    if (dot > maxDot) {
      maxDot = dot;
      bestIndex = i;
    }
  });

  const worldNorm = directions[bestIndex].clone().applyQuaternion(currentQuat);
  const rotDelta = new THREE.Quaternion().setFromUnitVectors(worldNorm, WORLD_UP);
  return { quaternion: rotDelta.multiply(currentQuat), index: bestIndex };
};

/** The value currently facing up, independent of how the die got there. */
export const readTopValue = (quaternion: THREE.Quaternion, definition: DieDefinition): number =>
  definition.values[getSnapTarget(quaternion, definition.directions).index];
