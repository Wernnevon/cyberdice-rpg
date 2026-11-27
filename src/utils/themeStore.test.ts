import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createThemeStore } from './themeStore.ts';

test('C3 setting a theme applies it and notifies', () => {
  const saved = new Map<string, string>();
  const store = createThemeStore({
    getItem: (k) => saved.get(k) ?? null,
    setItem: (k, v) => void saved.set(k, v),
  });
  let calls = 0;
  const unsubscribe = store.subscribe(() => calls++);

  store.set('ivory');
  assert.equal(store.get(), 'ivory');
  assert.equal(saved.get('dice-theme'), 'ivory');
  assert.equal(calls, 1);

  unsubscribe();
  store.set('gold');
  assert.equal(calls, 1);
});

test('blocked storage keeps the choice for the session', () => {
  const blocked = () => {
    throw new Error('blocked');
  };
  const store = createThemeStore({ getItem: blocked, setItem: blocked });
  assert.equal(store.get(), 'neon');
  store.set('manga');
  assert.equal(store.get(), 'manga');
});

test('C6 starts on the saved theme', () => {
  const store = createThemeStore({ getItem: () => 'marble', setItem: () => {} });
  assert.equal(store.get(), 'marble');
});
