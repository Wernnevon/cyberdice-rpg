import { useEffect, useRef, useState } from 'react';

// ponytail: calibration knobs — tune on real devices (m/s² above gravity, ms between shakes)
const THRESHOLD = 15;
const COOLDOWN = 1200;

type IOSMotion = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

export function useShake(onShake: () => void) {
  const cb = useRef(onShake);
  useEffect(() => {
    cb.current = onShake;
  });
  const [on, setOn] = useState(false);
  const supported = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;

  useEffect(() => {
    if (!on) return;
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
  }, [on]);

  /** Must be called from a user gesture (iOS permission prompt). */
  const enable = async () => {
    const req = (DeviceMotionEvent as IOSMotion).requestPermission;
    if (req && (await req().catch(() => 'denied')) !== 'granted') return false;
    setOn(true);
    return true;
  };

  return { supported, on, enable, disable: () => setOn(false) };
}
