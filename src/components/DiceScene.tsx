import { Suspense, useCallback, useLayoutEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier';
import { useRoll } from '../hooks/useRoll';
import { Die, HOLD_LID } from './Die';

// ponytail: framing knobs. Table shows VIEW_W world units across (a die is ~1.4), so dice
// keep the same share of the panel on any screen; MIN_H keeps short panels from zooming in too far.
const VIEW_W = 6;
const MIN_H = 5.5;
const FOV = 40;
const CEILING = 6.5; // below the closest camera (MIN_H framing ≈ 7.5) so dice never fly past it
const WALL = 10;
const DIE_TOP = 1.6; // tallest die resting height + small margin

function Table() {
  const { state, settle } = useRoll();
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  const aspect = size.width / Math.max(size.height, 1);
  const h = Math.max(VIEW_W / aspect, MIN_H);
  const w = h * aspect;
  const dist = h / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);
  // Perspective: a die's top (~DIE_TOP above the floor) projects outward by dist/(dist-DIE_TOP),
  // so pull the walls in by that ratio or dice touching a wall get cropped at the screen edge.
  const inset = (dist - DIE_TOP) / dist;
  const aw = w * inset;
  const ah = h * inset;
  useLayoutEffect(() => {
    camera.position.set(0, dist, 0.001);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, dist]);
  const active = state.active;
  const held = state.shaking; // dice held while the phone is shaken (SHA-01)
  const shown = held ?? active;
  const onSettle = useCallback((dieId: string, value: number) => active && settle(active.id, dieId, value), [active, settle]);

  return (
    <>
      <RigidBody type="fixed" key={`${aw}x${ah}`}>
        <CuboidCollider args={[w, 0.5, h]} position={[0, -0.5, 0]} />
        <CuboidCollider args={[0.5, WALL, h]} position={[-aw / 2 - 0.5, WALL, 0]} />
        <CuboidCollider args={[0.5, WALL, h]} position={[aw / 2 + 0.5, WALL, 0]} />
        <CuboidCollider args={[w, WALL, 0.5]} position={[0, WALL, -ah / 2 - 0.5]} />
        <CuboidCollider args={[w, WALL, 0.5]} position={[0, WALL, ah / 2 + 0.5]} />
        <CuboidCollider args={[w, 0.5, h]} position={[0, CEILING + 0.5, 0]} />
      </RigidBody>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[w, h]} />
        <shadowMaterial opacity={0.35} />
      </mesh>
      {held && (
        // held dice roam the whole table (its walls are the phone's sides) under a low invisible lid (SHA-05.1)
        <RigidBody type="fixed" key={`lid-${aw}x${ah}`}>
          <CuboidCollider args={[w, 0.25, h]} position={[0, HOLD_LID + 0.25, 0]} />
        </RigidBody>
      )}
      {shown?.dice.map((d, i) => (
        <Die key={d.id} spec={d} index={i} count={shown.dice.length} phase={held ? 'hold' : 'thrown'} arena={{ w: aw, h: ah }} onSettle={onSettle} />
      ))}
    </>
  );
}

export function DiceScene() {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 18, 0.001], fov: FOV }} gl={{ alpha: true }}>
      <ambientLight intensity={1.2} />
      <directionalLight
        position={[4, 14, 6]}
        intensity={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <Suspense fallback={null}>
        <Physics gravity={[0, -40, 0]}>
          <Table />
        </Physics>
      </Suspense>
    </Canvas>
  );
}
