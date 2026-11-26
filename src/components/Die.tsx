import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { ConvexHullCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import type { DieSpec } from '../types/dice';
import { getDie, labelTexture, readValue } from '../utils/geometry';

const FLAT = 0.95; // cos(~18°): below this the die is resting on an edge/corner -> reroll
const FALLBACK_MS = 10000; // read anyway if the body never comes to rest
// ponytail: rest detection knobs. Rapier's own sleep waits ~2s of stillness, which felt laggy,
// so we read the face as soon as the die is visibly still for REST_S.
const REST_LIN = 0.1; // m/s
const REST_ANG = 0.2; // rad/s
const REST_S = 0.15;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const spin = () => [rand(-15, 15), rand(-15, 15), rand(-15, 15)] as [number, number, number];

type Props = { spec: DieSpec; index: number; arena: { w: number; h: number }; onSettle: (dieId: string, value: number) => void };

export function Die({ spec, index, arena, onSettle }: Props) {
  const def = useMemo(() => getDie(spec.sides, spec.role), [spec.sides, spec.role]);
  const body = useRef<RapierRigidBody>(null);
  const done = useRef(false);

  // Thrown from the bottom edge (near the thumb) toward the top of the screen
  const [start] = useState(() => ({
    position: [rand(-arena.w / 3, arena.w / 3), 1.5 + (index % 6) * 0.6, arena.h / 2 - 0.9] as [number, number, number],
    linearVelocity: [rand(-3, 3), rand(0, 2), -rand(6, 12)] as [number, number, number],
    angularVelocity: spin(),
  }));

  const settle = (force = false) => {
    const b = body.current;
    if (!b || done.current) return;
    const { value, tilt } = readValue(def, b.rotation());
    if (tilt < FLAT && !force) {
      b.setLinvel({ x: rand(-2, 2), y: 5, z: rand(-2, 2) }, true);
      b.setAngvel({ x: rand(-10, 10), y: rand(-10, 10), z: rand(-10, 10) }, true);
      return;
    }
    done.current = true;
    onSettle(spec.id, value);
  };

  const still = useRef(0);
  useFrame((_, dt) => {
    const b = body.current;
    if (!b || done.current) return;
    const v = b.linvel();
    const w = b.angvel();
    if (Math.hypot(v.x, v.y, v.z) < REST_LIN && Math.hypot(w.x, w.y, w.z) < REST_ANG) {
      still.current += dt;
      if (still.current >= REST_S) {
        still.current = 0;
        settle(); // flat -> report; cocked -> re-thrown and the counter starts over
      }
    } else still.current = 0;
  });

  const settleRef = useRef(settle);
  useEffect(() => {
    settleRef.current = settle;
  });
  useEffect(() => {
    const t = setTimeout(() => settleRef.current(true), FALLBACK_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={start.position}
      linearVelocity={start.linearVelocity}
      angularVelocity={start.angularVelocity}
      restitution={0.3}
      friction={0.6}
      onSleep={() => settle()}
    >
      <ConvexHullCollider args={[def.hull]} />
      <mesh geometry={def.geometry} castShadow>
        <meshToonMaterial color={def.color} />
      </mesh>
      <lineSegments geometry={def.edges}>
        <lineBasicMaterial color="#0B0B10" />
      </lineSegments>
      {def.labels.map((l, i) => (
        <mesh key={i} position={l.position} quaternion={l.quaternion}>
          <planeGeometry args={[l.size, l.size]} />
          <meshBasicMaterial map={labelTexture(l.text)} transparent depthWrite={false} />
        </mesh>
      ))}
    </RigidBody>
  );
}
