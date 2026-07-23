import { useCallback, useState, useRef, memo } from "react";
import DiceBox, { DiceBoxRef } from "./components/DiceBox";
import DiceControls from "./components/DiceControls";
import RollResult from "./components/RollResult";
import { DiceResultT, DiceDataT } from "./types";
import { mountDiceResult } from "./utils/dice.utils";
import "./components/App/styles.css";

const MemoizedDiceBox = memo(DiceBox);
const MemoizedRollResult = memo(RollResult);
const MemoizedDiceControls = memo(DiceControls);

function App() {
    const [rollResult, setRollResult] = useState<DiceDataT>({} as DiceDataT);
    const diceBoxRef = useRef<DiceBoxRef>(null);

    const handleRoll = useCallback(([result]: Array<DiceResultT>) => {
        const diceData = mountDiceResult(result);
        setRollResult(diceData);
    }, []);

    const handleDiceRoll = useCallback((notation: string) => {
        if (diceBoxRef.current) {
            diceBoxRef.current.roll(notation);
        }
    }, []);

    return (
        <div className="app">
            <main className="cyber-interface">
                <section className="dice-display">
                    <header className="app-header">
                        <h1 className="glitch-title" data-text="CYBERDICE">CYBERDICE_v3.0</h1>
                    </header>
                    <MemoizedDiceBox ref={diceBoxRef} onRoll={handleRoll} />
                </section>

                <aside className="control-panel">
                    <MemoizedRollResult rollResult={rollResult} />
                    <MemoizedDiceControls onRoll={handleDiceRoll} />
                    
                    <div className="system-status">
                        SYSTEM: ONLINE // CONNECTION: SECURE
                    </div>
                </aside>
            </main>
        </div>
    );
}

export default App;
