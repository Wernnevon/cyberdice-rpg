import { useCallback, useState, useRef, memo } from "react";
import DiceBox, { DiceBoxRef } from "./components/DiceBox";
import DiceControls from "./components/DiceControls";
import RollResult from "./components/RollResult";
import { DiceResultT, DiceDataT } from "./types";
import { mountDiceResult } from "./utils/dice.utils";
import { useFallingDice } from "./hooks/useFallingDice";
import "./components/App/styles.css";
import "./components/App/sidebar.css";

// Memoized components to prevent unnecessary re-renders
const MemoizedDiceBox = memo(DiceBox);
const MemoizedRollResult = memo(RollResult);
const MemoizedDiceControls = memo(DiceControls);

function App() {
    const [rollResult, setRollResult] = useState<DiceDataT>({} as DiceDataT);
    const diceBoxRef = useRef<DiceBoxRef>(null);

    // Usar o custom hook para criar o efeito de dados caindo
    useFallingDice();

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
            <div className="dice-demo">
                <div className="main-content">
                    <h1>CYBERDICE v1.0 🎲💻</h1>
                    <MemoizedDiceBox ref={diceBoxRef} onRoll={handleRoll} />
                </div>

                <div className="sidebar">
                    <MemoizedDiceControls onRoll={handleDiceRoll} />
                    <MemoizedRollResult rollResult={rollResult} />
                    <div className="rpg-shield">
                        <img
                            src="/assets/images/d20.png"
                            alt="D20 Dice"
                            className="d20-logo"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
