import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getDie } from './geometry.ts';

test('C18 geometry does not depend on the theme', () => {
  assert.equal(getDie.length, 2); // sides and role only: no theme argument
  const dice = [[4], [6], [8], [10], [12], [20], [10, 'tens'], [10, 'units']] as const;
  for (const [sides, role] of dice) {
    const def = getDie(sides, role);
    assert.equal(getDie(sides, role).geometry, def.geometry);
    assert.ok(!('color' in def));
  }
});
