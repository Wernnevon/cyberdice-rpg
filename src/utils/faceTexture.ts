// Die face textures: the body color first, then a code pattern or an image that lets it show through.
import * as THREE from 'three';
import type { Theme } from './themes.ts';

type Texture = Theme['texture'];

const SIZE = 256;
// ponytail: look knobs per image. Marble and gold shade the color; halftone dots are pure black,
// so they stay faint and are zoomed to read on a small face.
const IMAGE_LOOK: Record<string, { alpha: number; zoom: number }> = {
  '/textures/halftone.png': { alpha: 0.28, zoom: 2 },
};
const SHADE = { alpha: 0.85, zoom: 1 };

/** Deterministic 0..1 noise: every repaint of a face looks the same. */
const noise = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

function paintIvory(ctx: CanvasRenderingContext2D, size: number) {
  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = '#7A6A4F';
  for (let i = 0; i < 26; i++) {
    const y = ((i + noise(i)) / 26) * size;
    const wave = (noise(i + 100) - 0.5) * size * 0.14;
    ctx.lineWidth = size * (0.004 + noise(i + 200) * 0.012);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.33, y + wave, size * 0.66, y - wave, size, y + wave / 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#7A6A4F';
  const dot = size / 128;
  for (let i = 0; i < 500; i++) ctx.fillRect(noise(i + 300) * size, noise(i + 900) * size, dot, dot);
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

// `screen` only lightens: the pink blossom turns into a pale one that still shows on pink bodies.
function paintTile(ctx: CanvasRenderingContext2D, size: number, image: CanvasImageSource) {
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.85;
  const step = size / 4;
  const d = size * 0.21;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col <= 4; col++) {
      const x = (col + (row % 2) / 2) * step;
      ctx.drawImage(image, x - d / 2, (row + 0.5) * step - d / 2, d, d);
    }
  }
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
    }
  }
  ctx.restore();
}

const textures = new Map<string, THREE.CanvasTexture>();
const images = new Map<string, HTMLImageElement>();

function loadImage(src: string) {
  let img = images.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    images.set(src, img);
  }
  return img;
}

/** Cached face texture of a body color, or null for untextured themes. */
export function faceTexture(theme: Theme, color: string): THREE.CanvasTexture | null {
  const { texture } = theme;
  if (!texture) return null;
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

  const img = texture.kind === 'code' ? null : loadImage(texture.src);
  const ready = img?.complete && img.naturalWidth > 0;
  paintFace(ctx, SIZE, color, texture, ready ? img : null);
  // a failed image never fires load: the face stays in the body color
  if (img && !ready) {
    img.addEventListener(
      'load',
      () => {
        paintFace(ctx, SIZE, color, texture, img);
        tex.needsUpdate = true;
      },
      { once: true },
    );
  }
  return tex;
}
