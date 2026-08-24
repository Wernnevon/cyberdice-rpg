import * as THREE from "three";

const INNER_RADIUS = 3.68;
const OUTER_SIZE = 8.8;
const WALL_HEIGHT = 0.8;
const RIVET_OFFSET = 4.2;

/** The tray the dice are thrown into: floor, neon rings, wall and frame. */
export const CyberTray = () => (
  <group position={[0, 0, 0]}>
    {/* Deep Void Floor Base */}
    <mesh position={[0, 0, 0]} receiveShadow>
      <cylinderGeometry args={[INNER_RADIUS, INNER_RADIUS, 0.1, 64]} />
      <meshStandardMaterial
        color="#0a0a1a"
        roughness={0.45}
        metalness={0.5}
        emissive="#00f3ff"
        emissiveIntensity={0.06}
      />
    </mesh>

    {/* Neon Circuit Rings on Floor */}
    {[
      { radius: [1.5, 1.55], color: "#00f3ff", intensity: 0.9 },
      { radius: [2.8, 2.86], color: "#ff00ff", intensity: 0.8 },
      { radius: [3.4, 3.44], color: "#00f3ff", intensity: 0.5 },
    ].map(({ radius, color, intensity }) => (
      <mesh key={color + radius[0]} position={[0, 0.051, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[radius[0], radius[1], 64]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} />
      </mesh>
    ))}

    {/* Inner Circular Brushed Alloy Ring Wall */}
    <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[3.85, 3.85, WALL_HEIGHT, 64, 1, true]} />
      <meshStandardMaterial
        color="#141428"
        metalness={0.9}
        roughness={0.25}
        side={THREE.DoubleSide}
        emissive="#00a0a8"
        emissiveIntensity={0.18}
      />
    </mesh>

    {/* Top Neon Rim Lip */}
    <mesh position={[0, 0.8, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
      <ringGeometry args={[3.75, 4.0, 64]} />
      <meshStandardMaterial color="#00f3ff" metalness={0.6} roughness={0.2} emissive="#00f3ff" emissiveIntensity={0.7} />
    </mesh>

    {/* Outer Square Black Anodized Frame */}
    {[
      { position: [0, 0.4, -OUTER_SIZE / 2], args: [OUTER_SIZE + 0.4, WALL_HEIGHT, 0.4] },
      { position: [0, 0.4, OUTER_SIZE / 2], args: [OUTER_SIZE + 0.4, WALL_HEIGHT, 0.4] },
      { position: [-OUTER_SIZE / 2, 0.4, 0], args: [0.4, WALL_HEIGHT, OUTER_SIZE] },
      { position: [OUTER_SIZE / 2, 0.4, 0], args: [0.4, WALL_HEIGHT, OUTER_SIZE] },
    ].map(({ position, args }) => (
      <mesh key={position.join()} position={position as [number, number, number]} castShadow receiveShadow>
        <boxGeometry args={args as [number, number, number]} />
        <meshStandardMaterial color="#050510" metalness={0.9} roughness={0.3} />
      </mesh>
    ))}

    {/* Corner Screw Rivets */}
    {[
      [-RIVET_OFFSET, RIVET_OFFSET],
      [RIVET_OFFSET, RIVET_OFFSET],
      [-RIVET_OFFSET, -RIVET_OFFSET],
      [RIVET_OFFSET, -RIVET_OFFSET],
    ].map(([cx, cz]) => (
      <mesh key={`${cx},${cz}`} position={[cx, 0.81, cz]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.04, 16]} />
        <meshStandardMaterial color="#80f9ff" metalness={0.95} roughness={0.15} emissive="#00f3ff" emissiveIntensity={0.4} />
      </mesh>
    ))}
  </group>
);

/** Neon key/fill lighting rig matching the app palette. */
export const CyberLights = () => (
  <>
    <ambientLight intensity={0.8} />
    <hemisphereLight args={["#00f3ff", "#ff00ff", 0.6]} />
    <directionalLight
      position={[10, 15, 8]}
      intensity={1.6}
      color="#e0e0ff"
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
    />
    <pointLight position={[-6, 6, -6]} intensity={1.6} color="#ff00ff" />
    <pointLight position={[6, 6, 6]} intensity={1.6} color="#00f3ff" />
  </>
);
