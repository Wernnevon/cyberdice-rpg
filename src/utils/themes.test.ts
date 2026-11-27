// Dice theme catalog and rules (specs/dice-themes). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, bodyColor, contrast, getTheme, iconColor, loadTheme, saveTheme } from './themes.ts';

const IDS = ['neon', 'ivory', 'marble', 'gold', 'crystal', 'shonen', 'manga', 'sakura'];
const SIDES = [4, 6, 8, 10, 12, 20, 100] as const;

const memory = () => {
  const data: Record<string, string> = {};
  return { data, getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
};

test('C1 offers exactly the eight themes', () => {
  assert.deepEqual(THEMES.map((t) => t.id), IDS);
  for (const t of THEMES) assert.equal(getTheme(t.id), t);
});

test('C5 saves the id under dice-theme', () => {
  const s = memory();
  saveTheme(s, 'ivory');
  assert.deepEqual(s.data, { 'dice-theme': 'ivory' });
  assert.equal(loadTheme(s), 'ivory');
});

test('C7 falls back to neon', () => {
  const s = memory();
  assert.equal(loadTheme(s), 'neon');
  for (const bad of ['', 'plastic', 'IVORY']) {
    s.setItem('dice-theme', bad);
    assert.equal(loadTheme(s), 'neon');
  }
  assert.equal(loadTheme(undefined), 'neon');
});

test('C8 survives blocked storage', () => {
  const blocked = () => {
    throw new Error('blocked');
  };
  const s = { getItem: blocked, setItem: blocked };
  assert.equal(loadTheme(s), 'neon');
  assert.doesNotThrow(() => saveTheme(s, 'gold'));
  assert.doesNotThrow(() => saveTheme(undefined, 'gold'));
});

test('C9 neon is the current look', () => {
  const neon = getTheme('neon');
  const colors = ['#FF2E4D', '#FFD60A', '#22D3EE', '#A855F7', '#FF7A1A', '#FF3FD8'];
  colors.forEach((c, i) => assert.equal(bodyColor(neon, SIDES[i]), c));
  assert.equal(bodyColor(neon, 10, 'units'), '#3DFF8B');
  assert.equal(bodyColor(neon, 10, 'tens'), '#178F4A');
  assert.equal(bodyColor(neon, 100), '#3DFF8B');
  assert.deepEqual(neon.label, { fill: '#FFFFFF', outline: '#0B0B10' });
  assert.equal(neon.edge, '#0B0B10');
  assert.equal(neon.font, 'Russo One');
  assert.equal(neon.finish, 'toon');
  assert.equal(neon.texture, null);
});

test('C15 d100 keeps two tones', () => {
  for (const t of THEMES) {
    assert.notEqual(bodyColor(t, 10, 'tens').toUpperCase(), bodyColor(t, 10, 'units').toUpperCase(), t.id);
  }
});

test('C16 numbers keep 4.5 contrast', () => {
  assert.equal(contrast('#000000', '#FFFFFF'), 21);
  assert.equal(contrast('#FFFFFF', '#000000'), 21);
  assert.equal(contrast('#777777', '#777777'), 1);
  for (const t of THEMES) assert.ok(contrast(t.label.fill, t.label.outline) >= 4.5, t.id);
});

test('C17 dropped icons stay grey', () => {
  for (const t of THEMES) {
    for (const sides of SIDES) {
      assert.equal(iconColor(t, sides, 'drop'), '#5A5A6E');
      assert.equal(iconColor(t, sides, 'max'), t.bodies[sides]);
      assert.equal(iconColor(t, sides), t.bodies[sides]);
    }
  }
});
