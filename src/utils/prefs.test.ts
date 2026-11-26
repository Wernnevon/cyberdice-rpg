// The shake choice is remembered like the sound choice (AD-002). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFlag, saveFlag, shakeRestore } from './prefs.ts';

const memory = () => {
  const data: Record<string, string> = {};
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
};

test('a saved choice is restored, and starts off when never saved or unreadable', () => {
  const s = memory();
  assert.equal(loadFlag(s, 'shake-on'), false);
  saveFlag(s, 'shake-on', true);
  assert.equal(loadFlag(s, 'shake-on'), true);
  saveFlag(s, 'shake-on', false);
  assert.equal(loadFlag(s, 'shake-on'), false);
  const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.equal(loadFlag(throwing, 'shake-on'), false);
  assert.doesNotThrow(() => saveFlag(throwing, 'shake-on', true));
  assert.equal(loadFlag(undefined, 'shake-on'), false);
});

test('shake left on comes back on: at once without a permission prompt, on the first tap with one (iOS)', () => {
  assert.equal(shakeRestore(false, false), 'off');
  assert.equal(shakeRestore(false, true), 'off');
  assert.equal(shakeRestore(true, false), 'now');
  assert.equal(shakeRestore(true, true), 'first-tap');
});
