import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { THEMES } from './themes.ts';

const dir = new URL('../../public', import.meta.url).href;

/** Width and height from a PNG or JPEG header. */
function size(b: Buffer): [number, number] {
  if (b.toString('latin1', 1, 4) === 'PNG') return [b.readUInt32BE(16), b.readUInt32BE(20)];
  // JPEG: walk the segments up to the start-of-frame marker (C0 to C2)
  for (let i = 2; i < b.length; i += 2 + b.readUInt16BE(i + 2)) {
    if (b[i + 1] >= 0xc0 && b[i + 1] <= 0xc2) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
  }
  throw new Error('unknown image format');
}

test('C28 every texture has a license and fits the size', () => {
  const lines = readFileSync(new URL(`${dir}/textures/LICENSES.md`), 'utf8').split('\n');
  const sources = THEMES.flatMap((t) => (t.texture && 'src' in t.texture ? [t.texture.src] : []));
  assert.ok(sources.length > 0);
  for (const src of sources) {
    const file = readFileSync(new URL(dir + src));
    assert.ok(file.length <= 150 * 1024, `${src}: ${file.length} bytes`);
    assert.ok(Math.max(...size(file)) <= 512, `${src}: ${size(file)} px`);
    const row = lines.find((l) => l.includes(src.split('/').pop()!));
    assert.match(row ?? '', /https:\/\/\S+/, src);
    assert.match(row ?? '', /CC0|public domain/i, src);
  }
});
