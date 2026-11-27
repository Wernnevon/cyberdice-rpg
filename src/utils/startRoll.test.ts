// Derived from .specs/features/sound-polish/spec.md (SPL-04.1) and shake-animation/spec.md (SHA-03.3). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRoll, startRoll, throwRoll } from './startRoll.ts';

test('SPL-04.1 every started roll launches exactly once, with its own id', () => {
  const launched: string[] = [];
  const a = startRoll('2d6+1', (id) => launched.push(id));
  assert.ok(a);
  assert.deepEqual(launched, [a.id]);
  assert.equal(a.dice.length, 2);
  const b = startRoll('1d20', (id) => launched.push(id));
  assert.ok(b);
  assert.deepEqual(launched, [a.id, b.id]);
  assert.notEqual(a.id, b.id);
});

test('SPL-04.1 an invalid notation starts no roll and launches nothing', () => {
  const launched: string[] = [];
  assert.equal(startRoll('banana', (id) => launched.push(id)), null);
  assert.deepEqual(launched, []);
});

test('SHA-03.3 held dice launch nothing until thrown, then exactly one whoosh with the roll id', () => {
  const launched: string[] = [];
  const held = buildRoll('2d6');
  assert.ok(held);
  assert.deepEqual(launched, [], 'building the held roll plays no whoosh');
  const thrown = throwRoll(held, (id) => launched.push(id));
  assert.equal(thrown, held, 'the same roll is thrown');
  assert.deepEqual(launched, [held.id]);
  assert.equal(buildRoll(''), null, 'no dice selected: nothing to hold');
});
