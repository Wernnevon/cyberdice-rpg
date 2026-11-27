import assert from 'node:assert/strict';
import { test } from 'node:test';
import { faceTexture, paintFace } from './faceTexture.ts';
import { getTheme, type ThemeId } from './themes.ts';

const SIZE = 256;
const BODY = '#123456';
const IMAGE = {} as CanvasImageSource;

type Paint = { op: string; style: unknown; alpha: number; mode: string; args: unknown[] };

/** Records every painting call with the state it ran under. */
function paint(id: ThemeId, image: CanvasImageSource | null) {
  const paints: Paint[] = [];
  const gradients: string[] = [];
  const initial = { fillStyle: '#000000' as unknown, strokeStyle: '#000000' as unknown, globalAlpha: 0.5, globalCompositeOperation: 'xor', lineWidth: 1 };
  const stack: (typeof initial)[] = [];
  const record = (op: string, style: unknown, args: unknown[]) =>
    paints.push({ op, style, alpha: ctx.globalAlpha, mode: ctx.globalCompositeOperation, args });
  const ctx = {
    ...initial,
    save() {
      const { fillStyle, strokeStyle, globalAlpha, globalCompositeOperation, lineWidth } = this;
      stack.push({ fillStyle, strokeStyle, globalAlpha, globalCompositeOperation, lineWidth });
    },
    restore() {
      Object.assign(this, stack.pop());
    },
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    bezierCurveTo() {},
    fillRect: (...args: unknown[]) => record('fillRect', ctx.fillStyle, args),
    fill: () => record('fill', ctx.fillStyle, []),
    stroke: () => record('stroke', ctx.strokeStyle, []),
    drawImage: (...args: unknown[]) => record('drawImage', null, args),
    createRadialGradient() {
      gradients.push('radial');
      return { addColorStop() {} };
    },
  };
  paintFace(ctx as unknown as CanvasRenderingContext2D, SIZE, BODY, getTheme(id).texture, image);
  for (const [k, v] of Object.entries(initial)) assert.equal(ctx[k as keyof typeof initial], v, `${k} not restored`);
  const [base, ...over] = paints;
  return { base, over, gradients, draws: over.filter((p) => p.op === 'drawImage') };
}

const assertBody = ({ base }: { base: Paint }) =>
  assert.deepEqual(base, { op: 'fillRect', style: BODY, alpha: 1, mode: 'source-over', args: [0, 0, SIZE, SIZE] });

const assertSeeThrough = (p: Paint) => assert.ok(p.alpha < 1 || p.mode === 'multiply', `opaque ${p.op}`);

test('C19 ivory paints a grain without an image', () => {
  assert.equal(getTheme('ivory').texture?.kind, 'code');
  const run = paint('ivory', null);
  assertBody(run);
  assert.ok(run.over.length > 10);
  assert.equal(run.draws.length, 0);
  assert.deepEqual(paint('ivory', null).over, run.over);
});

for (const [name, id, src] of [
  ['C20 marble draws its image', 'marble', '/textures/marble.jpg'],
  ['C21 gold draws its image', 'gold', '/textures/gold.jpg'],
  ['C23 manga draws its halftone', 'manga', '/textures/halftone.png'],
] as const) {
  test(name, () => {
    assert.deepEqual(getTheme(id).texture, { kind: 'image', src });
    const run = paint(id, IMAGE);
    assertBody(run);
    assert.equal(run.draws.length, 1);
    const [image, x, y, w, h] = run.draws[0].args as [unknown, number, number, number, number];
    assert.equal(image, IMAGE);
    assert.ok(x <= 0 && y <= 0 && x + w >= SIZE && y + h >= SIZE, 'covers the whole face');
    assertSeeThrough(run.draws[0]);
  });
}

test('C22 shonen paints speed lines and aura', () => {
  assert.equal(getTheme('shonen').texture?.kind, 'code');
  const run = paint('shonen', null);
  assertBody(run);
  assert.deepEqual(run.gradients, ['radial']);
  assert.ok(run.over.filter((p) => p.op === 'fill').length >= 20);
  assert.equal(run.draws.length, 0);
});

test('C24 sakura repeats the blossom', () => {
  assert.deepEqual(getTheme('sakura').texture, { kind: 'tile', src: '/textures/sakura.png' });
  const run = paint('sakura', IMAGE);
  assertBody(run);
  assert.ok(run.draws.length > 1);
  assert.ok(run.draws.every((p) => p.args[0] === IMAGE));
  assert.equal(new Set(run.draws.map((p) => `${p.args[1]},${p.args[2]}`)).size, run.draws.length);
});

test('C25 neon and crystal stay plain', () => {
  for (const id of ['neon', 'crystal'] as const) {
    assert.equal(getTheme(id).texture, null);
    assert.equal(faceTexture(getTheme(id), BODY), null);
    const run = paint(id, null);
    assertBody(run);
    assert.equal(run.over.length, 0);
  }
});

test('C26 body color shows through', () => {
  for (const id of ['ivory', 'marble', 'gold', 'shonen', 'manga', 'sakura'] as const) {
    const run = paint(id, IMAGE);
    assertBody(run);
    assert.ok(run.over.length > 0);
    run.over.forEach(assertSeeThrough);
  }
});

test('C27 failed image leaves the body color', () => {
  for (const id of ['marble', 'gold', 'manga', 'sakura'] as const) {
    const run = paint(id, null);
    assertBody(run);
    assert.equal(run.over.length, 0);
  }
});
