import { useCallback, useState, useRef } from "react";
import { DiceBox, DiceBoxRef, DiceControls, RollResult, RollHistory, HistoryEntryT } from "./components";
import { DiceResultT, DiceDataT } from "./types";
import { mountDiceResult } from "./utils";
import "./components/App/styles.css";

/** Throws kept in the history list. */
const HISTORY_SIZE = 8;

function App() {
    const [rollResult, setRollResult] = useState<DiceDataT | null>(null);
    // Single owner of the throw state: set here, cleared when the dice report in.
    const [isRolling, setIsRolling] = useState(false);
    const [history, setHistory] = useState<HistoryEntryT[]>([]);
    const diceBoxRef = useRef<DiceBoxRef>(null);
    const nextHistoryId = useRef(0);

    const handleRoll = useCallback((result: DiceResultT) => {
        const data = mountDiceResult(result);
        setRollResult(data);
        setHistory(prev => [{ ...data, id: nextHistoryId.current++ }, ...prev].slice(0, HISTORY_SIZE));
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
                    <RollHistory entries={history} />
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
