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

/** Unique outward face normals, merging the triangles that form one flat face. */
export const getFaceNormals = (geometry: THREE.BufferGeometry): THREE.Vector3[] => {
  const normals: THREE.Vector3[] = [];

  forEachTriangle(geometry, (a, b, c) => {
    const norm = triangleNormal(a, b, c);
    if (norm.lengthSq() < 0.5) return;
    if (!normals.some(n => n.dot(norm) > SAME_DIR_DOT)) {
      normals.push(norm);
    }
  });

  return normals;
};

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

export const getCircumradius = (geometry: THREE.BufferGeometry): number => {
  const pos = geometry.getAttribute("position");
  let max = 0;
  for (let i = 0; i < pos.count; i++) {
    max = Math.max(max, Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)));
  }
  return max || 0.5;
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

export interface DieDefinition {
  geometry: THREE.BufferGeometry;
  edges: THREE.EdgesGeometry;
  /** Local-space directions that get pointed up when the die settles. */
  directions: THREE.Vector3[];
  /** Value shown by directions[i] when it points up. Parallel array. */
  values: number[];
  labels: string[];
  labelRadius: number;
  labelSize: number;
  restHeight: number;
}

// Geometries are expensive and immutable, so they are built once per die type and
// shared by every mesh instead of being re-created on each React render.
const dieDefinitionCache = new Map<number, DieDefinition>();

export const getDieDefinition = (faces: number): DieDefinition => {
  const cached = dieDefinitionCache.get(faces);
  if (cached) return cached;

  const geometry = createDiceGeometry(faces);
  // The D4 has no top face -- the result is read at the vertex pointing up.
  const directions = faces === 4 ? getVertexDirections(geometry) : getFaceNormals(geometry);
  const inradius = getInradius(geometry);
  const values = assignValuesToDirections(directions, getFaceValues(faces, directions.length));

  const definition: DieDefinition = {
    geometry,
    edges: new THREE.EdgesGeometry(geometry),
    directions,
    values,
    labels: values.map(value => getFaceLabel(faces, value)),
    labelRadius: (faces === 4 ? getCircumradius(geometry) : inradius) + 0.02,
    labelSize: faces === 100 ? 0.17 : 0.22,
    restHeight: TRAY_FLOOR_Y + inradius,
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
