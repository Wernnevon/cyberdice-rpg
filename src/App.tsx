import { useCallback, useState, useRef, memo } from "react";
import DiceBox, { DiceBoxRef } from "./components/DiceBox";
import DiceControls from "./components/DiceControls";
import RollResult from "./components/RollResult";
import { DiceResultT, DiceDataT } from "./types";
import { mountDiceResult } from "./utils/dice.utils";
import { useFallingDice } from "./hooks/useFallingDice";
// Global styles imported in main.tsx
// Component specific styles
import "./components/App/styles.css";

// Memoized components
const MemoizedDiceBox = memo(DiceBox);
const MemoizedRollResult = memo(RollResult);
const MemoizedDiceControls = memo(DiceControls);

function App() {
    const [rollResult, setRollResult] = useState<DiceDataT>({} as DiceDataT);
    const [isRolling, setIsRolling] = useState(false);
    const diceBoxRef = useRef<DiceBoxRef>(null);

    useFallingDice();

    const handleRoll = useCallback(([result]: Array<DiceResultT>) => {
        const diceData = mountDiceResult(result);
        setRollResult(diceData);
        setIsRolling(false);
    }, []);

    const handleDiceRoll = useCallback((notation: string) => {
        if (diceBoxRef.current) {
            setIsRolling(true);
            diceBoxRef.current.roll(notation);
        }
    }, []);

    return (
        <div className="app">
            <main className="cyber-interface">
                <section className="dice-display">
                    <header className="app-header">
                        <h1 className="glitch-title" data-text="CYBERDICE">
                            <span className="hidden-sm">CYBERDICE</span>
                            <span className="hidden-md-up">CD</span>
                        </h1>
                    </header>
                    <MemoizedDiceBox ref={diceBoxRef} onRoll={handleRoll} />
                </section>

                <aside className="control-panel">
                    <MemoizedRollResult
                        rollResult={rollResult}
                        isRolling={isRolling}
                    />
                    <MemoizedDiceControls onRoll={handleDiceRoll} />

                    {/* Decorative footer/shield for the sidebar */}
                    <div
                        className="system-status"
                        style={{
                            marginTop: "auto",
                            opacity: 0.5,
                            fontSize: "0.8rem",
                            textAlign: "center",
                            color: "var(--color-primary-dark)",
                        }}
                    >
                        SYSTEM: ONLINE // CONNECTION: SECURE
                    </div>
                </aside>
            </main>
        </div>
    );
}

export default App;
