import { Text } from "@react-three/drei";
import { memo, useCallback, useMemo } from "react";
import * as THREE from "three";
import { DieRole, getDieDefinition } from "../../dice/geometry";
import { DIE_FONT } from "./dieFont";

export interface DieProps {
  faces: number;
  color: string;
  /** Which half of a percentile pair this is. Only meaningful on a d100. */
  role?: DieRole;
  dieIndex: number;
  glowIntensity: number;
  /** Hands the mesh to the tray, which poses it from the physics world each frame. */
  registerMesh: (dieIndex: number, mesh: THREE.Mesh | null) => void;
}

/**
 * One die: draws the numbered solid. The physics lives in the tray's
 * simulation, which moves this mesh.
 *
 * It stays mounted between throws: remounting rebuilt every face label and
 * stalled the throw by some 50 ms. And it is memoised and unaware of the roll
 * state. The panel flipping from "rolling" to "done" re-renders the tree on the
 * very frame the last die stops; with the die subscribed to that flag, every
 * face label re-rendered at exactly the moment the animation had to look
 * smoothest.
 */
export const Die = memo(function Die({
  faces,
  color,
  role,
  dieIndex,
  glowIntensity,
  registerMesh,
}: DieProps) {
  const definition = useMemo(() => getDieDefinition(faces, role), [faces, role]);
  const meshRef = useCallback((mesh: THREE.Mesh | null) => registerMesh(dieIndex, mesh), [registerMesh, dieIndex]);

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
