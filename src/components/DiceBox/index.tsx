import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, ContactShadows } from "@react-three/drei";
import { useRef, useState, forwardRef, useImperativeHandle, Suspense, useCallback } from "react";
import { Leva } from "leva";
import { DiceResultT } from "../../types";
import { parseNotation } from "../../dice/notation";
import { DieContact } from "../../dice/physics";
import { CyberTray, CyberLights } from "./CyberTray";
import { Die } from "./Die";
import "./styles.css";

interface DiceBoxProps {
  /** Owned by the caller: true from the throw until every die reports in. */
  isRolling: boolean;
  onRoll?: (result: DiceResultT) => void;
}

export interface DiceBoxRef {
  /** Throws the dice. Returns false if the notation is not rollable. */
  roll: (notation: string) => boolean;
}

const DIE_COLORS = ["#00f3ff", "#ff00ff"];

const DiceBoxScene = forwardRef<DiceBoxRef, DiceBoxProps>(({ isRolling, onRoll }, ref) => {
  const [dice, setDice] = useState<{ faces: number; color: string }[]>([]);
  const [rollId, setRollId] = useState(0);
  const landedValues = useRef<Map<number, number>>(new Map());
  const contacts = useRef<(DieContact | undefined)[]>([]);

  const getContacts = useCallback(() => contacts.current, []);
  const publishContact = useCallback((index: number, contact: DieContact) => {
    contacts.current[index] = contact;
  }, []);

  const roll = useCallback((notation: string) => {
    const parsed = parseNotation(notation);
    if (!parsed) return false;

    landedValues.current = new Map();
    contacts.current = [];
    setDice(
      Array.from({ length: parsed.count }, (_, i) => ({
        faces: parsed.faces,
        color: DIE_COLORS[i % DIE_COLORS.length],
      })),
    );
    setRollId(prev => prev + 1);
    return true;
  }, []);

  useImperativeHandle(ref, () => ({ roll }), [roll]);

  const handleLand = useCallback(
    (value: number, index: number) => {
      landedValues.current.set(index, value);
      if (landedValues.current.size < dice.length || !onRoll) return;

      const rolls = dice.map((die, i) => ({
        sides: die.faces,
        value: landedValues.current.get(i) ?? value,
      }));

      onRoll({
        qty: dice.length,
        sides: dice[0].faces,
        rolls,
        total: rolls.reduce((sum, r) => sum + r.value, 0),
      });
    },
    [dice, onRoll],
  );

  return (
    <>
      <PerspectiveCamera makeDefault position={[9, 10, 9]} fov={42} />
      <OrbitControls
        enableZoom
        enablePan={false}
        target={[0, 0, 0]}
        minDistance={8}
        maxDistance={18}
        maxPolarAngle={Math.PI / 3}
        minPolarAngle={Math.PI / 6}
      />

      <CyberLights />
      <CyberTray />

      <ContactShadows resolution={1024} scale={8} blur={1.5} opacity={0.6} far={5} color="#000000" />

      {dice.map((die, index) => (
        <Die
          key={`${rollId}-${index}`}
          dieIndex={index}
          faces={die.faces}
          color={die.color}
          isRolling={isRolling}
          glowIntensity={0.8}
          rollId={rollId}
          getContacts={getContacts}
          publishContact={publishContact}
          onLand={handleLand}
        />
      ))}
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
