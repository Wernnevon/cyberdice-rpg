import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useRef, useState, forwardRef, useImperativeHandle, Suspense, useCallback } from "react";
import { Leva } from "leva";
import { DiceResultT } from "../../types";
import { parseNotation, Notation } from "../../dice/notation";
import { DieRole, percentileValue } from "../../dice/geometry";
import * as THREE from "three";
import { DieContact } from "../../dice/physics";
import { CyberTray, CyberLights } from "./CyberTray";
import { Die } from "./Die";
import { preloadDieFont } from "./dieFont";

// Started at import time, so the glyphs are ready long before the first throw.
preloadDieFont();
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
  const landedValues = useRef<Map<number, number>>(new Map());
  const contacts = useRef<(DieContact | undefined)[]>([]);

  const getContacts = useCallback(() => contacts.current, []);

  // Copied into vectors owned by the tray rather than cloned: this runs once per
  // die per frame, and cloning two Vector3s each time was pure garbage.
  const publishContact = useCallback((index: number, position: THREE.Vector3, velocity: THREE.Vector3) => {
    const contact = (contacts.current[index] ??= {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
    });
    contact.position.copy(position);
    contact.velocity.copy(velocity);
  }, []);

  const roll = useCallback((notation: string) => {
    const parsed = parseNotation(notation);
    if (!parsed) return false;

    landedValues.current = new Map();
    contacts.current = [];
    setDice(buildDice(parsed));
    setRollId(prev => prev + 1);
    return true;
  }, []);

  useImperativeHandle(ref, () => ({ roll }), [roll]);

  const handleLand = useCallback(
    (value: number, index: number) => {
      landedValues.current.set(index, value);
      if (landedValues.current.size < dice.length || !onRoll) return;

      const landed = dice.map((_, i) => landedValues.current.get(i) ?? value);

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
    },
    [dice, onRoll],
  );

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
            rollId={rollId}
            getContacts={getContacts}
            publishContact={publishContact}
            onLand={handleLand}
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
