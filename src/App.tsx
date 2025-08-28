import { useCallback, useState, useRef } from "react";
import DiceBox, { DiceBoxRef } from "./components/DiceBox";
import DiceControls from "./components/DiceControls";
import RollResult from "./components/RollResult";
import { DiceResultT, DiceDataT } from "./types";
import { mountDiceResult } from "./utils/dice.utils";
import "./components/App/styles.css";
import "./components/App/sidebar.css";

function App() {
  const [rollResult, setRollResult] = useState<DiceDataT>({} as DiceDataT);
  const diceBoxRef = useRef<DiceBoxRef>(null);

  const handleRoll = useCallback(([result]: Array<DiceResultT>) => {
    const diceData = mountDiceResult(result);
    console.log(diceData);
    setRollResult(diceData);
  }, []);

  const handleDiceRoll = (notation: string) => {
    if (diceBoxRef.current) {
      diceBoxRef.current.roll(notation);
    }
  };

  return (
    <div className="app">
      <div className="dice-demo">
        <div className="main-content">
          <h1>CYBERDICE v1.0 🎲💻</h1>
          <DiceBox ref={diceBoxRef} onRoll={handleRoll} />
        </div>

        <div className="sidebar">
          <RollResult rollResult={rollResult} />
          <DiceControls onRoll={handleDiceRoll} />
        </div>
      </div>
    </div>
  );
}

export default App;
