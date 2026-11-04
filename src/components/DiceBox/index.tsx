import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useRef, useState, forwardRef, useImperativeHandle, Suspense, useCallback, useEffect, useLayoutEffect } from "react";
import { Leva } from "leva";
import { DiceResultT } from "../../types";
import { parseNotation, Notation, SUPPORTED_FACES } from "../../dice/notation";
import { DieRole, getDieDefinition, percentileValue } from "../../dice/geometry";
import * as THREE from "three";
import { DiceSimulation, initPhysics } from "../../dice/simulation";
import { CyberTray, CyberLights } from "./CyberTray";
import { Die } from "./Die";
import { preloadDieFont } from "./dieFont";

// Started at import time, so the glyphs and the physics engine are both ready
// long before the first throw.
preloadDieFont();
initPhysics();
import "./styles.css";

interface DiceBoxProps {
  onRoll?: (result: DiceResultT) => void;
}

export interface DiceBoxRef {
  /** Throws the dice. Returns false if the notation is not rollable. */
  roll: (notation: string) => boolean;
}

const DIE_COLORS = ["#00f3ff", "#ff00ff"];
/** The tens die is the cyan one, so a pair can be read apart at a glance. */
const PERCENTILE_COLORS: Record<DieRole, string> = { tens: "#00f3ff", units: "#ff00ff" };

interface DieSpec {
  faces: number;
  color: string;
  /** Set only on the two halves of a percentile pair. */
  role?: DieRole;
}

/**
 * The solids to throw for a notation.
 *
 * A d100 is not one die: it is a pair thrown together, 00..90 alongside 0..9,
 * the way a percentile roll is actually made at the table. So `1d100` puts two
 * solids in the tray, and each requested die costs a pair.
 */
const buildDice = (parsed: Notation): DieSpec[] => {
  if (parsed.faces === 100) {
    return Array.from({ length: parsed.count }, () =>
      (["tens", "units"] as const).map(role => ({
        faces: 100,
        role,
        color: PERCENTILE_COLORS[role],
      })),
    ).flat();
  }

  return Array.from({ length: parsed.count }, (_, i) => ({
    faces: parsed.faces,
    color: DIE_COLORS[i % DIE_COLORS.length],
  }));
};


const DiceBoxScene = forwardRef<DiceBoxRef, DiceBoxProps>(({ onRoll }, ref) => {
  const [dice, setDice] = useState<DieSpec[]>([]);
  const [rollId, setRollId] = useState(0);
  const simulation = useRef<DiceSimulation | null>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  /** Whether the current throw is still waiting to be reported. */
  const pending = useRef(false);

  useEffect(() => {
    let disposed = false;
    initPhysics().then(() => {
      if (disposed) return;
      const sim = new DiceSimulation();
      // A throw nobody sees, so the engine's first hull building and first
      // steps happen now rather than stalling the first real throw.
      sim.throw(SUPPORTED_FACES.map(faces => getDieDefinition(faces)));
      for (let i = 0; i < 10; i++) sim.step(1 / 60);
      sim.throw([]);
      simulation.current = sim;
    });
    return () => {
      disposed = true;
      simulation.current?.free();
      simulation.current = null;
    };
  }, []);

  const registerMesh = useCallback((index: number, mesh: THREE.Mesh | null) => {
    meshes.current[index] = mesh;
  }, []);

  const roll = useCallback((notation: string) => {
    const parsed = parseNotation(notation);
    if (!parsed || !simulation.current) return false;

    setDice(buildDice(parsed));
    setRollId(prev => prev + 1);
    return true;
  }, []);

  useImperativeHandle(ref, () => ({ roll }), [roll]);

  // Throws once the dice for this roll are mounted. Layout, not passive, so
  // the dice are already posed at the throw before the frame paints -- not
  // still lying where the last throw left them.
  useLayoutEffect(() => {
    const sim = simulation.current;
    if (rollId === 0 || !sim) return;
    sim.throw(dice.map(die => getDieDefinition(die.faces, die.role)));
    meshes.current.forEach((mesh, index) => mesh && sim.pose(index, mesh));
    pending.current = true;
  }, [rollId, dice]);

  useFrame((_, delta) => {
    const sim = simulation.current;
    if (!sim || sim.dice.length === 0) return;

    // Keeps stepping after the result is in, so a die knocked by a later
    // settler still moves -- the reported numbers are already locked.
    const settled = sim.step(delta);
    meshes.current.forEach((mesh, index) => mesh && sim.pose(index, mesh));

    if (!settled || !pending.current) return;
    pending.current = false;
    report(sim.values);
  });

  const report = (landed: number[]) => {
    if (!onRoll) return;

    // A percentile pair is one roll, not two: the tens and units solids that
    // landed together combine into a single 1..100.
    const rolls = dice[0].role
      ? Array.from({ length: dice.length / 2 }, (_, p) => ({
          sides: 100,
          value: percentileValue(landed[p * 2], landed[p * 2 + 1]),
        }))
      : landed.map((v, i) => ({ sides: dice[i].faces, value: v }));

    onRoll({
      qty: rolls.length,
      sides: dice[0].faces,
      rolls,
      total: rolls.reduce((sum, r) => sum + r.value, 0),
    });
  };

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 10.5, 12]} fov={38} />
      <OrbitControls
        enableZoom
        enablePan={false}
        target={[0, 0, 0]}
        minDistance={9}
        maxDistance={20}
        maxPolarAngle={Math.PI / 3}
        minPolarAngle={Math.PI / 6}
      />

      <CyberLights />
      <CyberTray />


      {/* Only the dice sit behind Suspense. The numbers on their faces load a
          font, and suspending the whole scene made the tray blink out on the
          first throw. */}
      <Suspense fallback={null}>
        {dice.map((die, index) => (
          <Die
            key={`${die.faces}-${die.role ?? ""}-${index}`}
            dieIndex={index}
            faces={die.faces}
            color={die.color}
            role={die.role}
            glowIntensity={0.8}
            registerMesh={registerMesh}
          />
        ))}
      </Suspense>
    </>
  );
});

export const DiceBox = forwardRef<DiceBoxRef, DiceBoxProps>((props, ref) => (
  <div className="dice-box-container">
    <Leva hidden />
    <Canvas shadows gl={{ antialias: true, alpha: true }} dpr={[1, 2]} style={{ width: "100%", height: "100%" }}>
      <Suspense fallback={null}>
        <DiceBoxScene {...props} ref={ref} />
      </Suspense>
    </Canvas>
  </div>
));
