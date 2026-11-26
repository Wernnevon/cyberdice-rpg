import { useEffect, useRef, useState } from 'react';
import { shakeRestore } from '../utils/prefs';
import { createShakeHandler, screenMotion } from '../utils/shakeGesture';
import { sound } from '../audio/engine';

type IOSMotion = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

/** Each rattle step pushes the held dice: a `push` event with the speed change and its table direction (SHA-02.1, SHA-05). */
export type ShakePush = { impulse: number; dir: { x: number; z: number } };
export const shakeBus = new EventTarget();

type Gesture = { start: () => void; roll: () => void; cancel: () => void };

/**
 * Shake holds and rattles the dice, and they are thrown when the shaking stops (SPL-05, SHA).
 * `wanted`: the saved choice, read once at start. `canRoll`: false with no dice, while dice move, or on another view.
 */
export function useShake(gesture: Gesture, wanted: boolean, canRoll: () => boolean) {
  const cb = useRef(gesture);
  const can = useRef(canRoll);
  useEffect(() => {
    cb.current = gesture;
    can.current = canRoll;
  });
  const supported = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  const needsPermission = supported && typeof (DeviceMotionEvent as IOSMotion).requestPermission === 'function';
  const [restore] = useState(() => (supported ? shakeRestore(wanted, needsPermission) : 'off'));
  const [on, setOn] = useState(restore === 'now');
  // iOS, saved as on, waiting for the first tap: show it on; tapping the toggle itself turns it off.
  const [pending, setPending] = useState(restore === 'first-tap');

  // Listen while pending too: where motion access was already granted (Chrome keeps it per site),
  // events flow without a new prompt, so the restored choice works before any tap.
  const listening = on || pending;
  useEffect(() => {
    if (!listening) return;
    const step = createShakeHandler(
      (now, impulse, dir) => {
        sound.rattle(now);
        shakeBus.dispatchEvent(new CustomEvent<ShakePush>('push', { detail: { impulse, dir } }));
      },
      () => cb.current.roll(),
      () => can.current(),
      { start: () => cb.current.start(), cancel: () => cb.current.cancel() },
    );
    const handle = (e: DeviceMotionEvent) => {
      const m = screenMotion(e.acceleration, e.accelerationIncludingGravity, screen.orientation?.angle ?? 0);
      if (m) step(m.force, performance.now(), m.ax, m.ay);
    };
    window.addEventListener('devicemotion', handle);
    return () => window.removeEventListener('devicemotion', handle);
  }, [listening]);

  /** Must be called from a user gesture (iOS permission prompt). */
  const enable = async () => {
    const req = (DeviceMotionEvent as IOSMotion).requestPermission;
    if (req && (await req().catch(() => 'denied')) !== 'granted') return false;
    setOn(true);
    return true;
  };

  // iOS: re-ask for motion access inside the first tap after launch.
  const enableRef = useRef(enable);
  useEffect(() => {
    enableRef.current = enable;
  });
  useEffect(() => {
    if (!pending) return;
    const events = ['touchend', 'click'] as const;
    const once = (e: Event) => {
      events.forEach((n) => window.removeEventListener(n, once, true));
      if ((e.target as Element | null)?.closest?.('[data-shake-toggle]')) return; // the toggle decides
      setPending(false);
      void enableRef.current();
    };
    events.forEach((n) => window.addEventListener(n, once, true));
    return () => events.forEach((n) => window.removeEventListener(n, once, true));
  }, [pending]);

  const disable = () => {
    setOn(false);
    setPending(false);
  };

  return { supported, on: listening, enable, disable };
}
