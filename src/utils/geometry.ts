import * as THREE from 'three';
import type { DieSpec } from '../types/dice';

type Sides = DieSpec['sides'];
type Role = DieSpec['role'];

export type Label = { position: THREE.Vector3; quaternion: THREE.Quaternion; text: string; size: number };

export type DieDef = {
  geometry: THREE.BufferGeometry;
  hull: Float32Array; // collider points
  edges: THREE.EdgesGeometry; // black ink outline
  /** Directions read against world up: face normals, or vertex dirs for d4. */
  readouts: { dir: THREE.Vector3; value: number }[];
  labels: Label[];
  color: string;
};

const SIZE = 0.7;
// ponytail: number size per die on the 3D faces (1 = original). d4 (3 numbers per face) and
// d10/d100 (narrow kite faces) need more than the rest to stay readable on a phone.
const LABEL_SCALE: Record<Sides, number> = { 4: 1.25, 6: 0.7, 8: 0.7, 10: 1.25, 12: 0.7, 20: 0.7 };
// Same palette as DieIcon (2D) so 3D dice and UI match.
export const COLORS: Record<Sides | 100, string> = {
  4: '#FF2E4D', 6: '#FFD60A', 8: '#22D3EE', 10: '#A855F7', 12: '#FF7A1A', 20: '#FF3FD8', 100: '#3DFF8B',
};

function d10Geometry(r: number) {
  // Pentagonal trapezohedron; apex height h keeps kites planar: h = a(1+cos36)/(1-cos36)
  const a = 0.1 * r;
  const c = Math.cos(Math.PI / 5);
  const h = (a * (1 + c)) / (1 - c);
  const ring = Array.from({ length: 10 }, (_, i) => {
    const t = (i * Math.PI) / 5;
    return new THREE.Vector3(r * Math.cos(t), i % 2 ? -a : a, r * Math.sin(t));
  });
  const top = new THREE.Vector3(0, h, 0);
  const bot = new THREE.Vector3(0, -h, 0);
  const tris: THREE.Vector3[] = [];
  const R = (i: number) => ring[i % 10];
  for (let k = 0; k < 5; k++) {
    const i = 2 * k;
    tris.push(top, R(i), R(i + 1), top, R(i + 1), R(i + 2));
    tris.push(bot, R(i + 1), R(i + 2), bot, R(i + 2), R(i + 3));
  }
  // fix winding so every triangle faces outward (shape is convex around origin)
  for (let i = 0; i < tris.length; i += 3) {
    const [p, q, s] = tris.slice(i, i + 3);
    const n = new THREE.Vector3().subVectors(q, p).cross(new THREE.Vector3().subVectors(s, p));
    if (n.dot(p.clone().add(q).add(s)) < 0) [tris[i + 1], tris[i + 2]] = [s, q];
  }
  const g = new THREE.BufferGeometry().setFromPoints(tris);
  g.computeVertexNormals();
  return g;
}

function baseGeometry(sides: Sides): THREE.BufferGeometry {
  switch (sides) {
    case 4: return new THREE.TetrahedronGeometry(SIZE * 1.2);
    case 6: return new THREE.BoxGeometry(SIZE * 1.15, SIZE * 1.15, SIZE * 1.15);
    case 8: return new THREE.OctahedronGeometry(SIZE);
    case 10: return d10Geometry(SIZE);
    case 12: return new THREE.DodecahedronGeometry(SIZE * 0.95);
    case 20: return new THREE.IcosahedronGeometry(SIZE);
  }
}

/** Group triangles into planar faces by normal. */
function faces(g: THREE.BufferGeometry) {
  const pos = g.getAttribute('position');
  const list: { normal: THREE.Vector3; verts: THREE.Vector3[] }[] = [];
  const v = [0, 1, 2].map(() => new THREE.Vector3());
  for (let i = 0; i < pos.count; i += 3) {
    v.forEach((p, j) => p.fromBufferAttribute(pos, i + j));
    const n = new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[2], v[0])).normalize();
    let f = list.find((g) => g.normal.dot(n) > 0.999);
    if (!f) list.push((f = { normal: n, verts: [] }));
    for (const p of v) if (!f.verts.some((q) => q.distanceTo(p) < 1e-4)) f.verts.push(p.clone());
  }
  return list.map((f) => ({
    ...f,
    center: f.verts.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(f.verts.length),
  }));
}

/** Values 1..n, opposite faces summing to n+1 when the die has opposite faces. */
function assignValues(normals: THREE.Vector3[]) {
  const values: number[] = [];
  let next = 1;
  normals.forEach((n, i) => {
    if (values[i]) return;
    values[i] = next;
    const j = normals.findIndex((m, k) => !values[k] && m.dot(n) < -0.999);
    if (j >= 0) values[j] = normals.length + 1 - next;
    next++;
  });
  return values;
}

function orient(position: THREE.Vector3, normal: THREE.Vector3, toward: THREE.Vector3) {
  const z = normal.clone().normalize();
  const y = toward.clone().sub(position).projectOnPlane(z).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  return { position: position.clone().addScaledVector(z, 0.002), quaternion: q };
}

function fmt(value: number, sides: Sides, role: Role) {
  if (sides === 10) {
    const d = value % 10;
    return role === 'tens' ? `${d}0` : String(d);
  }
  return sides >= 6 && (value === 6 || value === 9) ? `${value}.` : String(value);
}

const TENS_COLOR = '#178F4A'; // darker than the units d10 so the d100 pair reads apart

const cache = new Map<string, DieDef>();

export function getDie(sides: Sides, role?: Role): DieDef {
  const key = `${sides}${role ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const base = baseGeometry(sides);
  const geometry = base.index ? base.toNonIndexed() : base;
  geometry.computeVertexNormals();
  const fs = faces(geometry);
  const labels: Label[] = [];
  let readouts: DieDef['readouts'];

  if (sides === 4) {
    // d4 reads the vertex pointing up; each face shows the number of its three corners
    const verts = fs.flatMap((f) => f.verts).filter((p, i, all) => all.findIndex((q) => q.distanceTo(p) < 1e-4) === i);
    readouts = verts.map((p, i) => ({ dir: p.clone().normalize(), value: i + 1 }));
    for (const f of fs) {
      for (const p of f.verts) {
        const value = verts.findIndex((q) => q.distanceTo(p) < 1e-4) + 1;
        const at = f.center.clone().lerp(p, 0.5);
        labels.push({ ...orient(at, f.normal, p), text: String(value), size: SIZE * 0.45 * LABEL_SCALE[4] });
      }
    }
  } else {
    const values = assignValues(fs.map((f) => f.normal));
    readouts = fs.map((f, i) => ({ dir: f.normal, value: values[i] }));
    fs.forEach((f, i) => {
      const inradius = Math.min(...f.verts.map((p) => p.distanceTo(f.center)));
      // d10 kites: shift label toward the wide end and point text at the apex
      const far = f.verts.reduce((a, b) => (b.distanceTo(f.center) > a.distanceTo(f.center) ? b : a));
      const at = sides === 10 ? f.center.clone().lerp(far, -0.15) : f.center;
      labels.push({ ...orient(at, f.normal, sides === 10 ? far : f.verts[0]), text: fmt(values[i], sides, role), size: inradius * (sides === 10 ? 1.1 : 1.3) * LABEL_SCALE[sides] });
    });
  }

  const def: DieDef = {
    geometry,
    hull: geometry.getAttribute('position').array as Float32Array,
    edges: new THREE.EdgesGeometry(geometry, 20),
    readouts,
    labels,
    color: role === 'tens' ? TENS_COLOR : role ? COLORS[100] : COLORS[sides],
  };
  cache.set(key, def);
  return def;
}

const UP = new THREE.Vector3(0, 1, 0);

/** Which value faces up for a body rotation; `tilt` is cos(angle) to vertical (1 = flat). */
export function readValue(def: DieDef, rotation: THREE.QuaternionLike) {
  const q = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
  let best = { value: 0, tilt: -Infinity };
  for (const r of def.readouts) {
    const tilt = r.dir.clone().applyQuaternion(q).dot(UP);
    if (tilt > best.tilt) best = { value: r.value, tilt };
  }
  return best;
}

const LABEL_FONT = "'Russo One'";
const textures = new Map<string, THREE.CanvasTexture>();

function draw(c: HTMLCanvasElement, text: string) {
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.font = `${text.length > 2 ? 54 : 76}px ${LABEL_FONT}, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#0B0B10';
  ctx.strokeText(text, 64, 66);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, 64, 66);
}

// Canvas text doesn't wait for web fonts: redraw every label once the font arrives.
globalThis.document?.fonts?.load(`76px ${LABEL_FONT}`).then(() => {
  textures.forEach((tex, text) => {
    draw(tex.image as HTMLCanvasElement, text);
    tex.needsUpdate = true;
  });
});

export function labelTexture(text: string) {
  let tex = textures.get(text);
  if (!tex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    draw(c, text);
    tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    textures.set(text, tex);
  }
  return tex;
}
