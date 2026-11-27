// The current theme: observable, and saved on the device.
import { useSyncExternalStore } from 'react';
import { getTheme, loadTheme, saveTheme, type Theme, type ThemeId } from './themes.ts';

export function createThemeStore(storage: Parameters<typeof loadTheme>[0]) {
  // Kept in memory, so the choice holds for the session even if storage is blocked.
  let current = loadTheme(storage);
  const listeners = new Set<() => void>();
  return {
    get: (): ThemeId => current,
    set(id: ThemeId) {
      current = id;
      saveTheme(storage, id);
      listeners.forEach((fn) => fn());
    },
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}

// localStorage itself can throw (blocked site data); under node there is no window.
const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
})();

export const themeStore = createThemeStore(storage);

export function useTheme(): Theme {
  return getTheme(useSyncExternalStore(themeStore.subscribe, themeStore.get));
}
