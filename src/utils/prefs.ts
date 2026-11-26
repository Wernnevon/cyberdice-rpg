type Store = { getItem(key: string): string | null; setItem(key: string, value: string): void };

/** On/off choice saved on the device; false when never saved or storage is blocked. */
export function loadFlag(store: Store | undefined, key: string): boolean {
  try {
    return store?.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function saveFlag(store: Store | undefined, key: string, value: boolean) {
  try {
    store?.setItem(key, value ? '1' : '0');
  } catch {
    // blocked storage: the choice just won't survive a reload
  }
}

/**
 * How to bring back shake-to-roll the user left on. iOS only grants motion access
 * inside a tap, so there it waits for the first one; elsewhere it turns on at once.
 */
export function shakeRestore(wanted: boolean, needsPermission: boolean): 'off' | 'now' | 'first-tap' {
  if (!wanted) return 'off';
  return needsPermission ? 'first-tap' : 'now';
}
