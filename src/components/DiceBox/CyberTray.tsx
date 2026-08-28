import * as THREE from "three";
import { Environment, Grid, Lightformer, MeshReflectorMaterial } from "@react-three/drei";
import { getFloorMarkingsTexture } from "./textures";

/* Sized off PHYSICS.trayRadius (2.88): the wall the dice bounce off is the wall
   you can see. trayRadius = WALL_RADIUS minus the largest die circumradius. */
const FLOOR_RADIUS = 3.42;
const WALL_RADIUS = 3.5;
const FLOOR_Y = 0.05;
const WALL_TOP = 0.85;

const BRACKET_REACH = 4.25;
const BRACKET_ARM = 1.7;
const BRACKET_BAR = 0.26;

/** Corners of the square footprint, as (x, z) sign pairs. */
const CORNERS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

/** Vertical fins around the outside of the wall, for machined bulk. */
const FIN_COUNT = 24;
const FINS = Array.from({ length: FIN_COUNT }, (_, i) => (i / FIN_COUNT) * Math.PI * 2);

const DARK_METAL = { color: "#0c1220", metalness: 0.95, roughness: 0.28 } as const;

/**
 * The arena the dice are thrown into.
 *
 * The floor does the aesthetic work, because the camera looks down on it: a
 * near-black reflective disc carrying painted instrument markings, ringed by a
 * neon tube. Everything else -- plinth, fins, brackets -- is dark metal that
 * exists to catch the rim light and give the disc somewhere to sit.
 */
export const CyberTray = () => (
  <group>
    {/* The void the arena floats over. */}
    <Grid
      position={[0, -0.62, 0]}
      infiniteGrid
      cellSize={0.7}
      cellThickness={0.5}
      cellColor="#0d2233"
      sectionSize={3.5}
      sectionThickness={1}
      sectionColor="#005f6b"
      fadeDistance={34}
      fadeStrength={1.5}
    />

    {/* Plinth: slightly tapered so the arena reads as a machined puck. Its top
        face stops just under FLOOR_Y so it cannot cover the floor disc. */}
    <mesh position={[0, -0.29, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[WALL_RADIUS, WALL_RADIUS - 0.22, 0.62, 64]} />
      <meshStandardMaterial {...DARK_METAL} />
    </mesh>

    {/* Reflective floor. Dark and rough enough that it holds the neon
        reflections without turning into a mirror. Kept at 512 with a light
        blur: it is a faint sheen, and it is re-rendered from scratch every
        frame, which is cost the throw animation cannot spare. */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} receiveShadow>
      <circleGeometry args={[FLOOR_RADIUS, 96]} />
      <MeshReflectorMaterial
        mirror={0.3}
        resolution={512}
        mixBlur={1}
        mixStrength={4}
        blur={[180, 60]}
        depthScale={2.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.3}
        color="#0a1120"
        metalness={0.7}
        roughness={0.7}
        emissiveMap={getFloorMarkingsTexture()}
        emissive="#ffffff"
        emissiveIntensity={1.5}
      />
    </mesh>



    {/* Inner wall. */}
    <mesh position={[0, (FLOOR_Y + WALL_TOP) / 2, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[WALL_RADIUS, WALL_RADIUS, WALL_TOP - FLOOR_Y, 64, 1, true]} />
      {/* Deliberately lighter and less metallic than the rest of the hardware:
          at this camera angle the inner wall is a big surface, and in dark metal
          it read as a hole rather than as a wall. */}
      <meshStandardMaterial
        color="#243c5c"
        metalness={0.45}
        roughness={0.55}
        side={THREE.DoubleSide}
        emissive="#0b4d63"
        emissiveIntensity={0.55}
      />
    </mesh>

    {/* Fins around the outside. */}
    {FINS.map(angle => (
      <mesh
        key={angle}
        position={[Math.cos(angle) * (WALL_RADIUS + 0.06), 0.32, Math.sin(angle) * (WALL_RADIUS + 0.06)]}
        rotation={[0, -angle, 0]}
        castShadow
      >
        <boxGeometry args={[0.14, 0.72, 0.08]} />
        <meshStandardMaterial {...DARK_METAL} roughness={0.4} />
      </mesh>
    ))}

    {/* Machined cap on top of the wall, and the neon tube seated in it. */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WALL_TOP, 0]} castShadow>
      <ringGeometry args={[WALL_RADIUS, WALL_RADIUS + 0.26, 96]} />
      <meshStandardMaterial {...DARK_METAL} side={THREE.DoubleSide} />
    </mesh>

    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WALL_TOP + 0.015, 0]}>
      <torusGeometry args={[WALL_RADIUS + 0.06, 0.032, 10, 128]} />
      <meshBasicMaterial color="#8ff7ff" toneMapped={false} />
    </mesh>

    {/* Corner brackets: two arms and a lit stud per corner. */}
    {CORNERS.map(([sx, sz]) => (
      <group key={`${sx},${sz}`} position={[sx * BRACKET_REACH, 0.12, sz * BRACKET_REACH]}>
        <mesh position={[(-sx * BRACKET_ARM) / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[BRACKET_ARM, 0.26, BRACKET_BAR]} />
          <meshStandardMaterial {...DARK_METAL} />
        </mesh>
        <mesh position={[0, 0, (-sz * BRACKET_ARM) / 2]} castShadow receiveShadow>
          <boxGeometry args={[BRACKET_BAR, 0.26, BRACKET_ARM]} />
          <meshStandardMaterial {...DARK_METAL} />
        </mesh>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.085, 0.085, 0.04, 20]} />
          <meshBasicMaterial color="#8ff7ff" toneMapped={false} />
        </mesh>
      </group>
    ))}
  </group>
);

/**
 * Lighting rig.
 *
 * The Lightformers are what the metal actually reflects -- without an
 * environment, every metallic surface in the tray renders as flat black.
 */
export const CyberLights = () => (
  <>
    <ambientLight intensity={0.34} />
    <hemisphereLight args={["#0088aa", "#33001f", 0.35]} />

    <directionalLight
      position={[6, 13, 5]}
      intensity={1.1}
      color="#dfe6ff"
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-bias={-0.0005}
    />
    {/* Sits just above the floor and washes the inner wall from inside. */}
    <pointLight position={[0, 0.7, 0]} intensity={12} distance={9} decay={2} color="#7fe9ff" />
    <pointLight position={[-6, 3.5, -4]} intensity={26} distance={22} decay={2} color="#ff00ff" />
    <pointLight position={[6, 3.5, 4]} intensity={26} distance={22} decay={2} color="#00f3ff" />

    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={2.2} color="#00f3ff" position={[-6, 4, -4]} scale={[10, 5, 1]} />
      <Lightformer form="rect" intensity={1.6} color="#ff00ff" position={[6, 3, 5]} scale={[10, 5, 1]} />
      <Lightformer form="ring" intensity={1.4} color="#ffffff" position={[0, 9, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={7} />
    </Environment>
  </>
);
