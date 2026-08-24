import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getDieDefinition } from "../../dice/geometry";
import { createMotion, launchDie, stepDie, DieContact } from "../../dice/physics";

export interface DieProps {
  faces: number;
  color: string;
  isRolling: boolean;
  dieIndex: number;
  glowIntensity: number;
  /** Bumped on every throw to re-launch the die. */
  rollId: number;
  /** Reads the live positions of every die in the tray, for collisions. */
  getContacts: () => (DieContact | undefined)[];
  /** Reports this die's position back to the tray after each step. */
  publishContact: (dieIndex: number, contact: DieContact) => void;
  onLand: (value: number, dieIndex: number) => void;
}

/** One die: owns its physics state and draws the numbered solid. */
export const Die = ({
  faces,
  color,
  isRolling,
  dieIndex,
  glowIntensity,
  rollId,
  getContacts,
  publishContact,
  onLand,
}: DieProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const motion = useRef(createMotion());
  const definition = useMemo(() => getDieDefinition(faces), [faces]);

  useEffect(() => {
    if (!isRolling || rollId <= 0) return;

    const launched = launchDie(motion.current, dieIndex);
    meshRef.current?.position.copy(launched.position);
    meshRef.current?.quaternion.copy(launched.quaternion);
  }, [isRolling, rollId, dieIndex]);

  useFrame((_, delta) => {
    if (!meshRef.current || !isRolling || motion.current.landed) return;

    const landedIndex = stepDie(motion.current, {
      delta,
      floorLevel: definition.restHeight,
      directions: definition.directions,
      index: dieIndex,
      neighbours: getContacts(),
    });

    publishContact(dieIndex, {
      position: motion.current.position.clone(),
      velocity: motion.current.velocity.clone(),
    });

    meshRef.current.position.copy(motion.current.position);
    meshRef.current.quaternion.copy(motion.current.quaternion);

    if (landedIndex !== null) {
      onLand(definition.values[landedIndex], dieIndex);
    }
  });

  const faceLabels = useMemo(
    () =>
      definition.directions.map((dir, i) => ({
        position: dir.clone().multiplyScalar(definition.labelRadius),
        quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir),
        text: definition.labels[i],
      })),
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

      {faceLabels.map(label => (
        <group key={label.text} position={label.position} quaternion={label.quaternion}>
          <Text
            fontSize={definition.labelSize}
            color="#050510"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#e0e0ff"
          >
            {label.text}
          </Text>
        </group>
      ))}
    </mesh>
  );
};
