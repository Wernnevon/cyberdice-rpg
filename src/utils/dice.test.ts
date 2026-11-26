// Run: npm test  (node --test, native TS type stripping)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNotation, parse, range, resolve, spawn } from './dice.ts';

test('parse', () => {
  assert.deepEqual(parse('2d6+3'), { terms: [{ sign: 1, count: 2, sides: 6 }], modifier: 3 });
  assert.deepEqual(parse(' d20 - 1d4 - 2 '), {
    terms: [{ sign: 1, count: 1, sides: 20 }, { sign: -1, count: 1, sides: 4 }],
    modifier: -2,
  });
  assert.deepEqual(parse('4d6kh3')?.terms[0].keep, { mode: 'h', n: 3 });
  assert.equal(parse('d%')?.terms[0].sides, 100);
  for (const bad of ['', '3', '2d7', '0d6', '2d6kh3', '2d6+', 'abc', '31d6', '16d100']) {
    assert.equal(parse(bad), null, bad);
  }
});

test('resolve keep highest + modifier', () => {
  const e = parse('4d6kh3+1')!;
  const dice = spawn(e);
  const values = Object.fromEntries(dice.map((d, i) => [d.id, [1, 5, 3, 6][i]]));
  const roll = resolve('r', '4d6kh3+1', e, dice, values)!;
  assert.equal(roll.total, 5 + 3 + 6 + 1);
  assert.deepEqual(roll.dice.map((d) => d.kept), [false, true, true, true]);
});

test('resolve d100 + incomplete', () => {
  const e = parse('d%')!;
  const dice = spawn(e);
  assert.equal(dice.length, 2);
  const [tens, units] = dice;
  assert.equal(resolve('r', 'd%', e, dice, { [tens.id]: 4 }), null);
  assert.equal(resolve('r', 'd%', e, dice, { [tens.id]: 4, [units.id]: 7 })!.total, 47);
  assert.equal(resolve('r', 'd%', e, dice, { [tens.id]: 10, [units.id]: 10 })!.total, 100);
  assert.equal(resolve('r', 'd%', e, dice, { [tens.id]: 10, [units.id]: 3 })!.total, 3);
});

test('buildNotation + range', () => {
  assert.equal(buildNotation({}, 3), '');
  assert.equal(buildNotation({ 20: 1, 6: 2 }, 3), '2d6+1d20+3');
  assert.equal(buildNotation({ 4: 1 }, -2), '1d4-2');
  assert.deepEqual(range(parse('4d6kh3+1d20+5')!), { min: 9, max: 43 });
  assert.deepEqual(range(parse('1d20-1d4')!), { min: -3, max: 19 });
});
