import { useEffect, useRef, useState } from 'react';
import { shakeRestore } from '../utils/prefs';
import { createShakeGesture } from '../utils/shakeGesture';
import { sound } from '../audio/engine';

type IOSMotion = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

/**
 * Shake rattles the dice, and they are thrown when the shaking stops (SPL-05).
 * `wanted`: the saved choice, read once at start. `canRoll`: false while dice move or another view shows.
 */
export function useShake(onShake: () => void, wanted = false, canRoll: () => boolean = () => true) {
  const cb = useRef(onShake);
  const can = useRef(canRoll);
  useEffect(() => {
    cb.current = onShake;
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
    const gesture = createShakeGesture();
    const handle = (e: DeviceMotionEvent) => {
      const a = e.acceleration ?? e.accelerationIncludingGravity;
      if (!a) return;
      const g = e.acceleration ? 0 : 9.8;
      const force = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) - g;
      const now = performance.now();
      const step = gesture(force, now, can.current());
      if (step === 'rattle') sound.rattle(now);
      else if (step === 'roll') cb.current();
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
