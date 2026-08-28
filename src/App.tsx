import { useCallback, useState, useRef } from "react";
import { DiceBox, DiceBoxRef, DiceControls, RollResult } from "./components";
import { DiceResultT, DiceDataT } from "./types";
import { mountDiceResult } from "./utils";
import "./components/App/styles.css";

function App() {
    const [rollResult, setRollResult] = useState<DiceDataT | null>(null);
    // Single owner of the throw state: set here, cleared when the dice report in.
    const [isRolling, setIsRolling] = useState(false);
    const diceBoxRef = useRef<DiceBoxRef>(null);

    const handleRoll = useCallback((result: DiceResultT) => {
        setRollResult(mountDiceResult(result));
        setIsRolling(false);
    }, []);

    const handleDiceRoll = useCallback((notation: string) => {
        // Only arm the rolling state if the dice box accepted the notation,
        // otherwise the panel would wait forever for a throw that never happened.
        if (diceBoxRef.current?.roll(notation)) {
            setIsRolling(true);
        }
    }, []);

    return (
        <div className="app">
            <main className="cyber-interface">
                <section className="dice-display">
                    <header className="app-header">
                        <h1 className="glitch-title">CYBERDICE_v3.0</h1>
                    </header>
                    <DiceBox ref={diceBoxRef} onRoll={handleRoll} />
                </section>

                <aside className="control-panel">
                    <RollResult rollResult={rollResult} isRolling={isRolling} />
                    <DiceControls onRoll={handleDiceRoll} isRolling={isRolling} />

                    <div className="system-status">
                        SYSTEM: ONLINE // CONNECTION: SECURE
                    </div>
                </aside>
            </main>
        </div>
    );
}

export default App;
