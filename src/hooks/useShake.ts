import { useEffect, useRef, useState } from 'react';
import { shakeRestore } from '../utils/prefs';

// ponytail: calibration knobs — tune on real devices (m/s² above gravity, ms between shakes)
const THRESHOLD = 15;
const COOLDOWN = 1200;

type IOSMotion = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

/** `wanted`: the saved choice, read once at start to bring shake-to-roll back. */
export function useShake(onShake: () => void, wanted = false) {
  const cb = useRef(onShake);
  useEffect(() => {
    cb.current = onShake;
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
    let last = 0;
    const handle = (e: DeviceMotionEvent) => {
      const a = e.acceleration ?? e.accelerationIncludingGravity;
      if (!a) return;
      const g = e.acceleration ? 0 : 9.8;
      const force = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) - g;
      const now = Date.now();
      if (force > THRESHOLD && now - last > COOLDOWN) {
        last = now;
        cb.current();
      }
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
