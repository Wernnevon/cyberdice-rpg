// Derived from .specs/features/shake-animation/spec.md (SHA-01, SHA-03, SHA-04). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActiveRoll } from '../types/dice';
import { parse, spawn, uid } from './dice.ts';
import { initialRollState, rollReducer, type RollState } from './rollState.ts';

const make = (notation: string): ActiveRoll => {
  const expr = parse(notation)!;
  return { id: uid(), notation, expr, dice: spawn(expr), values: {} };
};

/** A roll that has landed: every die read, so it is in the history with a result. */
function landed(notation = '1d20') {
  const a = make(notation);
  let s = rollReducer(initialRollState, { type: 'roll', active: a });
  for (const d of a.dice) s = rollReducer(s, { type: 'settled', rollId: a.id, dieId: d.id, value: 1 });
  assert.equal(s.history.length, 1);
  return s;
}

/** What the table shows: the dice bodies, and the result if one is on screen. */
const shown = (s: RollState) => ({
  dice: (s.shaking ?? s.active)?.dice.map((d) => d.id) ?? [],
  result: s.active && s.history[0]?.id === s.active.id ? s.history[0] : null,
});

test('SHA-01.1 a shake start holds the dice of the roll, one per die', () => {
  const r = make('2d6+1d20');
  const s = rollReducer(initialRollState, { type: 'shake', roll: r });
  assert.equal(s.shaking, r);
  assert.equal(s.shaking!.dice.length, 3);
  assert.deepEqual(shown(s).dice, r.dice.map((d) => d.id));
  assert.equal(s.history.length, 0, 'shaking is not a roll yet');
});

test('SHA-01.2 a shake start hides the result on screen and its dice', () => {
  const before = landed('3d6');
  assert.ok(shown(before).result);
  const r = make('1d20');
  const s = rollReducer(before, { type: 'shake', roll: r });
  assert.equal(shown(s).result, null, 'result hidden');
  assert.deepEqual(shown(s).dice, r.dice.map((d) => d.id), 'only the shaken dice on the table');
  assert.deepEqual(s.history, before.history, 'the old result stays in the history');
});

test('SHA-03.2 the throw keeps the roll id and die ids, and the result is read from those dice', () => {
  const r = make('1d6+1d8');
  let s = rollReducer(initialRollState, { type: 'shake', roll: r });
  s = rollReducer(s, { type: 'throw' });
  assert.equal(s.shaking, null);
  assert.equal(s.active!.id, r.id);
  assert.deepEqual(s.active!.dice.map((d) => d.id), r.dice.map((d) => d.id));
  s = rollReducer(s, { type: 'settled', rollId: r.id, dieId: r.dice[0].id, value: 4 });
  s = rollReducer(s, { type: 'settled', rollId: r.id, dieId: r.dice[1].id, value: 7 });
  assert.equal(s.history[0].id, r.id);
  assert.equal(s.history[0].total, 11);
  assert.ok(shown(s).result);
  // a throw with nothing held changes nothing
  assert.equal(rollReducer(s, { type: 'throw' }), s);
});

test('SHA-04.1 a weak shake removes the held dice and adds no history', () => {
  const before = landed();
  let s = rollReducer(before, { type: 'shake', roll: make('2d6') });
  s = rollReducer(s, { type: 'cancelShake' });
  assert.equal(s.shaking, null);
  assert.deepEqual(shown(s).dice, []);
  assert.deepEqual(s.history, before.history);
  // dice reported by a held die after the cancel are ignored
  const r = make('1d6');
  let t = rollReducer(initialRollState, { type: 'shake', roll: r });
  t = rollReducer(t, { type: 'cancelShake' });
  t = rollReducer(t, { type: 'settled', rollId: r.id, dieId: r.dice[0].id, value: 3 });
  assert.equal(t.history.length, 0);
});

test('SHA-04.2 a weak shake ends on the ready screen, not on the result shown before it', () => {
  const before = landed();
  let s = rollReducer(before, { type: 'shake', roll: make('2d6') });
  s = rollReducer(s, { type: 'cancelShake' });
  assert.equal(s.active, null, 'no roll on the table: the ready screen');
  assert.equal(shown(s).result, null, 'the old result is not shown again');
});

test('SHA-04.3 the roll button drops the held dice and its roll replaces them', () => {
  const held = make('2d6');
  let s = rollReducer(initialRollState, { type: 'shake', roll: held });
  const button = make('1d20');
  s = rollReducer(s, { type: 'roll', active: button });
  assert.equal(s.shaking, null);
  assert.equal(s.active, button);
  assert.deepEqual(shown(s).dice, button.dice.map((d) => d.id));
  // a late throw of the dropped dice does nothing
  assert.equal(rollReducer(s, { type: 'throw' }), s);
});
