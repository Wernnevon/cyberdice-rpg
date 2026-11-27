import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Euler, Quaternion } from 'three';
import { getDie, randomQuaternion, readValue } from './geometry.ts';
import { themeStore } from './themeStore.ts';
import { THEMES } from './themes.ts';

test('C18 geometry does not depend on the theme', () => {
  assert.equal(getDie.length, 2); // sides and role only: no theme argument
  const dice = [[4], [6], [8], [10], [12], [20], [10, 'tens'], [10, 'units']] as const;
  for (const [sides, role] of dice) {
    const def = getDie(sides, role);
    assert.equal(getDie(sides, role).geometry, def.geometry);
    assert.ok(!('color' in def));
  }

  // switching theme keeps every shape, face position, and the value a resting die reads
  const rotations = [[0, 0, 0], [1, 0.3, 2], [2.5, 4, 0.7]].map(([x, y, z]) => new Quaternion().setFromEuler(new Euler(x, y, z)));
  const snapshot = () =>
    dice.map(([sides, role]) => {
      const def = getDie(sides, role);
      return {
        def,
        geometry: def.geometry,
        data: JSON.stringify([Array.from(def.hull), def.readouts, def.labels, rotations.map((q) => readValue(def, q))]),
      };
    });
  const initial = themeStore.get();
  const before = snapshot();
  try {
    for (const { id } of THEMES) {
      themeStore.set(id);
      assert.equal(themeStore.get(), id);
      snapshot().forEach((after, i) => {
        assert.equal(after.def, before[i].def);
        assert.equal(after.geometry, before[i].geometry);
        assert.equal(after.data, before[i].data, `die ${dice[i]} changed under ${id}`);
      });
    }
  } finally {
    themeStore.set(initial);
  }
});

test('C33 every face has uvs in range', () => {
  const dice = [[4], [6], [8], [10], [12], [20], [10, 'tens'], [10, 'units']] as const;
  for (const [sides, role] of dice) {
    const { geometry } = getDie(sides, role);
    const uv = geometry.getAttribute('uv');
    assert.equal(uv.count, geometry.getAttribute('position').count);
    for (const n of uv.array) assert.ok(n >= 0 && n <= 1, `d${sides} uv ${n}`);
    // each triangle covers a real area of the texture
    for (let i = 0; i < uv.count; i += 3) {
      const area = (uv.getX(i + 1) - uv.getX(i)) * (uv.getY(i + 2) - uv.getY(i)) - (uv.getX(i + 2) - uv.getX(i)) * (uv.getY(i + 1) - uv.getY(i));
      assert.ok(area > 0.01, `d${sides} triangle ${i / 3} area ${area}`);
    }
  }
});

test('SHA-06.7 randomQuaternion is a unit quaternion, uniform over orientations', () => {
  let seed = 1;
  const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const def = getDie(20);
  const n = 20000;
  const counts = new Array(20).fill(0);
  let w2 = 0;
  for (let i = 0; i < n; i++) {
    const [x, y, z, w] = randomQuaternion(random);
    assert.ok(Math.abs(Math.hypot(x, y, z, w) - 1) < 1e-9);
    w2 += w * w;
    counts[readValue(def, { x, y, z, w }).value - 1]++;
  }
  assert.ok(Math.abs(w2 / n - 0.25) < 0.01); // uniform on the 3-sphere: each component averages 1/4 squared
  const chi2 = counts.reduce((s, o) => s + (o - n / 20) ** 2 / (n / 20), 0);
  assert.ok(chi2 < 43.8, `chi2 ${chi2}`); // df 19, p = 0.001
});
