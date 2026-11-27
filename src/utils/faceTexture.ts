// Die face textures: the body color first, then a code pattern or an image that lets it show through.
import * as THREE from 'three';
import { contrast, type Theme } from './themes.ts';

type Texture = Theme['texture'];

const SIZE = 256;
// ponytail: look knobs per image, tuned by eye. Dice are tiny on a phone, so patterns are zoomed.
const IMAGE_LOOK: Record<string, { alpha: number; zoom: number }> = {
  '/textures/marble.jpg': { alpha: 1, zoom: 2.2 },
  '/textures/gold.jpg': { alpha: 0.85, zoom: 1 },
  '/textures/halftone.png': { alpha: 0.55, zoom: 2.5 }, // pure black dots
};
const SHADE = { alpha: 0.85, zoom: 1 };

/** Deterministic 0..1 noise: every repaint of a face looks the same. */
const noise = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

function paintIvory(ctx: CanvasRenderingContext2D, size: number) {
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = '#6B5434';
  for (let i = 0; i < 13; i++) {
    const y = ((i + noise(i)) / 13) * size;
    const wave = (noise(i + 100) - 0.5) * size * 0.14;
    ctx.lineWidth = size * (0.012 + noise(i + 200) * 0.025);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.33, y + wave, size * 0.66, y - wave, size, y + wave / 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#6B5434';
  const dot = size / 128;
  for (let i = 0; i < 500; i++) ctx.fillRect(noise(i + 300) * size, noise(i + 900) * size, dot, dot);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = radial(ctx, size, [0.18, 'rgba(107,84,52,0)'], [0.52, 'rgba(107,84,52,0.7)']);
  ctx.fillRect(0, 0, size, size);
}

/** Gradient around the face center; stop radii are fractions of the size. */
function radial(ctx: CanvasRenderingContext2D, size: number, ...stops: [number, string][]) {
  const c = size / 2;
  const outer = stops[stops.length - 1][0];
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, size * outer);
  for (const [r, color] of stops) gradient.addColorStop(r / outer, color);
  return gradient;
}

// Two more multiply passes deepen the veins (no canvas filter: Safari lacks it), then a dodge
// gives part of the lightness back. Both scale the color, so darker bodies keep their shade.
function boostMarble(ctx: CanvasRenderingContext2D, size: number, image: CanvasImageSource, offset: number, side: number) {
  const scale = side / (image as HTMLImageElement).naturalWidth;
  ctx.save();
  ctx.translate(offset, offset);
  ctx.scale(scale, scale);
  ctx.fillStyle = ctx.createPattern(image, 'no-repeat')!;
  for (let i = 0; i < 2; i++) ctx.fillRect(-offset / scale, -offset / scale, size / scale, size / scale);
  ctx.restore();
  ctx.globalCompositeOperation = 'color-dodge';
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#525252';
  ctx.fillRect(0, 0, size, size);
}

// The gold image is nearly flat: diagonal light and shadow bands plus brush streaks make the metal.
function paintBrushedGold(ctx: CanvasRenderingContext2D, size: number) {
  ctx.globalCompositeOperation = 'source-over';
  const bands = ctx.createLinearGradient(0, 0, size, size);
  ['#6B4300', '#FFF6C8', '#8A5A00', '#FFF6C8', '#6B4300'].forEach((color, i) => bands.addColorStop(i / 4, color));
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = bands;
  ctx.fillRect(0, 0, size, size);

  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 60; i++) {
    const y = ((i + noise(i)) / 60) * size * 1.4;
    ctx.strokeStyle = i % 2 ? '#FFF6C8' : '#6B4300';
    ctx.lineWidth = size * (0.006 + noise(i + 100) * 0.014);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y - size * 0.4);
    ctx.stroke();
  }
}

// Washes the dots back to the body color where the number sits.
function clearCenter(ctx: CanvasRenderingContext2D, size: number, color: string) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = radial(ctx, size, [0.12, color], [0.26, `${color}00`]);
  ctx.fillRect(0, 0, size, size);
}

// Triangle faces only reach ~1/4 of the size around the center, so the effect starts close to it.
function paintShonen(ctx: CanvasRenderingContext2D, size: number) {
  const c = size / 2;
  const aura = ctx.createRadialGradient(c, c, 0, c, c, c);
  aura.addColorStop(0, 'rgba(255,255,255,0.8)');
  aura.addColorStop(0.35, 'rgba(255,242,160,0.45)');
  aura.addColorStop(0.7, 'rgba(255,255,255,0)');
  aura.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, size, size);

  ctx.globalAlpha = 0.45;
  const at = (angle: number, r: number) => [c + Math.cos(angle) * r, c + Math.sin(angle) * r] as const;
  for (let i = 0; i < 48; i++) {
    const angle = ((i + noise(i)) / 48) * Math.PI * 2;
    const width = 0.008 + noise(i + 100) * 0.025; // radians
    ctx.fillStyle = i % 3 ? '#FFFFFF' : '#14080A';
    ctx.beginPath();
    ctx.moveTo(...at(angle, size * (0.15 + noise(i + 200) * 0.12)));
    ctx.lineTo(...at(angle - width, size * 0.75));
    ctx.lineTo(...at(angle + width, size * 0.75));
    ctx.closePath();
    ctx.fill();
  }
}

// Few large blossoms; the face center falls between two of them.
function paintTile(ctx: CanvasRenderingContext2D, size: number, image: CanvasImageSource) {
  ctx.globalAlpha = 0.5;
  const step = size / 3;
  const d = size * 0.32;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const x = (col + (row % 2 ? 0 : 0.5)) * step;
      ctx.drawImage(image, x - d / 2, (row + 0.5) * step - d / 2, d, d);
    }
  }
}

/** The tile's silhouette in one color: white on darker bodies, deep pink on light ones. */
function tintTile(image: HTMLImageElement, body: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = contrast(body, '#000000') < 9 ? '#FFFFFF' : '#D6246E';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  return canvas;
}

/** Paints one die face. A missing image leaves the plain body color. */
export function paintFace(ctx: CanvasRenderingContext2D, size: number, color: string, texture: Texture, image: CanvasImageSource | null) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  if (texture?.kind === 'code') {
    if (texture.pattern === 'ivory') paintIvory(ctx, size);
    else paintShonen(ctx, size);
  } else if (texture && image) {
    if (texture.kind === 'tile') paintTile(ctx, size, image);
    else {
      const { alpha, zoom } = IMAGE_LOOK[texture.src] ?? SHADE;
      const side = size * zoom;
      const offset = (size - side) / 2;
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = alpha;
      ctx.drawImage(image, offset, offset, side, side);
      if (texture.src === '/textures/marble.jpg') boostMarble(ctx, size, image, offset, side);
      else if (texture.src === '/textures/gold.jpg') paintBrushedGold(ctx, size);
      else if (texture.src === '/textures/halftone.png') clearCenter(ctx, size, color);
    }
  }
  ctx.restore();
}

const textures = new Map<string, THREE.CanvasTexture>();
export const IMAGE_RETRY_MS = 10_000;
const images = new Map<string, { img: HTMLImageElement; failedAt: number }>();
/** Repaints of the textures still waiting for each image; kept across failed attempts. */
const waiting = new Map<string, ((img: HTMLImageElement) => void)[]>();

/** The shared image of `src`. A failed one is requested again, at most once per IMAGE_RETRY_MS. */
function loadImage(src: string) {
  const hit = images.get(src);
  if (hit && !(performance.now() - hit.failedAt >= IMAGE_RETRY_MS)) return hit.img;
  const entry = { img: new Image(), failedAt: Infinity };
  images.set(src, entry);
  entry.img.addEventListener('error', () => (entry.failedAt = performance.now()), { once: true });
  entry.img.addEventListener(
    'load',
    () => {
      waiting.get(src)?.forEach((repaint) => repaint(entry.img));
      waiting.delete(src);
    },
    { once: true },
  );
  entry.img.src = src;
  return entry.img;
}

/** Cached face texture of a body color, or null for untextured themes. */
export function faceTexture(theme: Theme, color: string): THREE.CanvasTexture | null {
  const { texture } = theme;
  if (!texture) return null;
  // before the cache lookup: a later request is what retries a failed image
  const img = texture.kind === 'code' ? null : loadImage(texture.src);
  const key = `${theme.id}:${color}`;
  const hit = textures.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  textures.set(key, tex);

  const ready = img?.complete && img.naturalWidth > 0;
  const paint = (loaded: HTMLImageElement | null) =>
    paintFace(ctx, SIZE, color, texture, loaded && texture.kind === 'tile' ? tintTile(loaded, color) : loaded);
  paint(ready ? img : null);
  // until an attempt loads, the face stays in the body color
  if (texture.kind !== 'code' && !ready) {
    const queue = waiting.get(texture.src) ?? [];
    waiting.set(texture.src, queue);
    queue.push((loaded) => {
      paint(loaded);
      tex.needsUpdate = true;
    });
  }
  return tex;
}
