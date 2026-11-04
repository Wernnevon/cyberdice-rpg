import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { memo, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { DieRole, getDieDefinition, TRAY_FLOOR_Y } from "../../dice/geometry";
import { createMotion, launchDie, stepDie, DieContact } from "../../dice/physics";
import { DIE_FONT } from "./dieFont";

export interface DieProps {
  faces: number;
  color: string;
  /** Which half of a percentile pair this is. Only meaningful on a d100. */
  role?: DieRole;
  dieIndex: number;
  glowIntensity: number;
  /**
   * Bumped on every throw, which relaunches the die. It is deliberately not in
   * the key: remounting rebuilt every face label from scratch and stalled the
   * frame the dice were thrown on by some 50 ms -- worst on a d20.
   */
  rollId: number;
  /** Reads the live positions of every die in the tray, for collisions. */
  getContacts: () => (DieContact | undefined)[];
  /** Reports this die's position back to the tray after each step. */
  publishContact: (dieIndex: number, position: THREE.Vector3, velocity: THREE.Vector3) => void;
  onLand: (value: number, dieIndex: number) => void;
}

/**
 * One die: owns its physics state and draws the numbered solid.
 *
 * Memoised, and deliberately unaware of the roll state. The panel flipping from
 * "rolling" to "done" re-renders the tree on the very frame the last die stops;
 * with the die subscribed to that flag, every face label re-rendered at exactly
 * the moment the animation had to look smoothest.
 */
export const Die = memo(function Die({
  faces,
  color,
  role,
  dieIndex,
  glowIntensity,
  rollId,
  getContacts,
  publishContact,
  onLand,
}: DieProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const motion = useRef(createMotion());
  const definition = useMemo(() => getDieDefinition(faces, role), [faces, role]);

  // Layout, not passive: the die is still standing where it last landed, and a
  // passive effect let that frame paint before it jumped to the throw.
  useLayoutEffect(() => {
    const launched = launchDie(motion.current, dieIndex);
    meshRef.current?.position.copy(launched.position);
    meshRef.current?.quaternion.copy(launched.quaternion);
  }, [dieIndex, rollId]);

  useFrame((_, delta) => {
    if (!meshRef.current || motion.current.landed) return;

    const landedIndex = stepDie(motion.current, {
      delta,
      trayFloor: TRAY_FLOOR_Y,
      directions: definition.directions,
      vertices: definition.vertices,
      radius: definition.radius,
      index: dieIndex,
      neighbours: getContacts(),
    });

    publishContact(dieIndex, motion.current.position, motion.current.velocity);

    meshRef.current.position.copy(motion.current.position);
    meshRef.current.quaternion.copy(motion.current.quaternion);

    if (landedIndex !== null) {
      onLand(definition.values[landedIndex], dieIndex);
    }
  });

  // Kept out of the render path: troika builds a text mesh per label, and there
  // are up to a hundred of them in a tray full of d20s.
  const labels = useMemo(
    () =>
      definition.labels.map((label, index) => (
        <group key={index} position={label.position} quaternion={label.quaternion}>
          <Text
            font={DIE_FONT}
            fontSize={label.size}
            color="#050510"
            anchorX="center"
            anchorY="middle"
            outlineWidth={label.size * 0.08}
            outlineColor="#e0e0ff"
          >
            {label.text}
          </Text>
        </group>
      )),
    [definition],
  );

  return (
    <mesh ref={meshRef} castShadow receiveShadow geometry={definition.geometry}>
      <meshStandardMaterial
        color={color}
        metalness={0.8}
        roughness={0.22}
        emissive={color}
        emissiveIntensity={glowIntensity * 0.35}
      />
      <lineSegments geometry={definition.edges}>
        <lineBasicMaterial color="#e0e0ff" />
      </lineSegments>

      {labels}
    </mesh>
  );
});
