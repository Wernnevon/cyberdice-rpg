import { useEffect, useMemo, useRef, useState } from 'react';
import { ConvexHullCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import type { DieSpec } from '../types/dice';
import { getDie, labelTexture, readValue } from '../utils/geometry';

const FLAT = 0.95; // cos(~18°): below this the die is resting on an edge/corner -> reroll
const FALLBACK_MS = 10000; // read anyway if the body never sleeps

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
