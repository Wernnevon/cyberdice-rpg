import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CoefficientCombineRule, ConvexHullCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import type { DieSpec } from '../types/dice';
import { getDie, labelTexture, readValue } from '../utils/geometry';
import { sound } from '../audio/engine';
import { shakeBus, type ShakePush } from '../hooks/useShake';
import { dieMaterial, pushHeld, type Combine } from '../utils/shakeGesture';
import { contactImpact } from '../utils/sound';

const FLAT = 0.95; // cos(~18°): below this the die is resting on an edge/corner -> reroll
const FALLBACK_MS = 10000; // read anyway if the body never comes to rest
// ponytail: rest detection knobs. Rapier's own sleep waits ~2s of stillness, which felt laggy,
// so we read the face as soon as the die is visibly still for REST_S.
const REST_LIN = 0.1; // m/s
const REST_ANG = 0.2; // rad/s
const REST_S = 0.15;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const spin = () => [rand(-15, 15), rand(-15, 15), rand(-15, 15)] as [number, number, number];
// ponytail: holding area knobs (world units) — the throw already starts from this strip
export const HOLD_DEPTH = 2.2; // strip along the bottom edge
export const HOLD_SPREAD = 1 / 3; // half-width as a share of the table width
export const HOLD_LID = 2.4; // invisible lid over the table: held dice stay low, away from the camera
const RULE: Record<Combine, CoefficientCombineRule> = {
  average: CoefficientCombineRule.Average,
  min: CoefficientCombineRule.Min,
  max: CoefficientCombineRule.Max,
};

/** `hold`: in the bottom strip, pushed by the shake, never read. `thrown`: flies to the top and is read. */
export type Phase = 'hold' | 'thrown';

type Props = { spec: DieSpec; index: number; count: number; phase: Phase; arena: { w: number; h: number }; onSettle: (dieId: string, value: number) => void };

export function Die({ spec, index, count, phase, arena, onSettle }: Props) {
  const def = useMemo(() => getDie(spec.sides, spec.role), [spec.sides, spec.role]);
  const body = useRef<RapierRigidBody>(null);
  const done = useRef(false);

  const throwVelocity = () => [rand(-3, 3), rand(0, 2), -rand(6, 12)] as [number, number, number];
  // Starts in the bottom strip (near the thumb); thrown toward the top of the screen, or held there while shaking
  const [start] = useState(() => ({
    position: [
      rand(-arena.w * HOLD_SPREAD, arena.w * HOLD_SPREAD),
      phase === 'thrown' ? 1.5 + (index % 6) * 0.6 : 0.8 + (index % 2) * 0.8,
      arena.h / 2 - HOLD_DEPTH / 2,
    ] as [number, number, number],
    linearVelocity: phase === 'thrown' ? throwVelocity() : ([0, 0, 0] as [number, number, number]),
    angularVelocity: phase === 'thrown' ? spin() : ([rand(-3, 3), rand(-3, 3), rand(-3, 3)] as [number, number, number]),
  }));
  const thrown = phase === 'thrown';
  const material = dieMaterial(phase); // bouncy while held, normal once thrown (SHA-05.6)

  // Held: each rattle step pushes the die along the shake, harder for a harder shake (SHA-02.1, SHA-05)
  useEffect(() => {
    if (thrown) return;
    const push = (e: Event) => {
      if (body.current) pushHeld(body.current, (e as CustomEvent<ShakePush>).detail, Math.random);
    };
    shakeBus.addEventListener('push', push);
    return () => shakeBus.removeEventListener('push', push);
  }, [thrown]);

  // Released: the held die is thrown from where it is (SHA-03.1)
  const wasHeld = useRef(!thrown);
  useEffect(() => {
    const b = body.current;
    if (!thrown || !wasHeld.current || !b) return;
    wasHeld.current = false;
    const [x, y, z] = throwVelocity();
    const [ax, ay, az] = spin();
    b.setLinvel({ x, y, z }, true);
    b.setAngvel({ x: ax, y: ay, z: az }, true);
  }, [thrown]);

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
  // Collision events arrive after the bounce has already slowed the die, so keep last frame's speed.
  const lastSpeed = useRef(0);
  useFrame((_, dt) => {
    const b = body.current;
    if (!b) return;
    const v = b.linvel();
    lastSpeed.current = Math.hypot(v.x, v.y, v.z);
    if (done.current || !thrown) return; // held dice are never read
    const w = b.angvel();
    if (lastSpeed.current < REST_LIN && Math.hypot(w.x, w.y, w.z) < REST_ANG) {
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
    if (!thrown) return;
    const t = setTimeout(() => settleRef.current(true), FALLBACK_MS);
    return () => clearTimeout(t);
  }, [thrown]);

  return (
    <RigidBody
      ref={body}
      colliders={false}
      position={start.position}
      linearVelocity={start.linearVelocity}
      angularVelocity={start.angularVelocity}
      onSleep={() => thrown && settle()}
      linearDamping={material.damping}
      onCollisionEnter={({ other }) => {
        const self = body.current;
        if (!self) return;
        const o = other.rigidBody;
        const v = o?.linvel();
        const speed = contactImpact(
          { handle: self.handle, speed: lastSpeed.current },
          o && v && o.isDynamic() ? { handle: o.handle, speed: Math.hypot(v.x, v.y, v.z) } : null,
        );
        if (speed !== null) sound.impact(speed, performance.now(), spec.sides, count);
      }}
    >
      <ConvexHullCollider
        args={[def.hull]}
        restitution={material.restitution}
        friction={material.friction}
        restitutionCombineRule={RULE[material.restitutionRule]}
        frictionCombineRule={RULE[material.frictionRule]}
      />
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
