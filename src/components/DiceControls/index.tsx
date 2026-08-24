import { useState } from "react";
import { SUPPORTED_FACES } from "../../dice/notation";
import { DiceCountControl } from "./DiceCountControl";
import "./styles.css";

interface DiceControlsProps {
    onRoll: (notation: string) => void;
}

const DICE_GLYPHS: Record<number, string> = {
    4: "▲",
    6: "◆",
    8: "★",
    10: "◇",
    12: "⬡",
    20: "◈",
    100: "◉",
};

const DICE_TYPES = SUPPORTED_FACES.map(faces => ({
    value: `d${faces}`,
    label: `d${faces} ${DICE_GLYPHS[faces]}`,
}));

const DiceControls = ({ onRoll }: DiceControlsProps) => {
    const [selectedDice, setSelectedDice] = useState("d20");
    const [diceCount, setDiceCount] = useState(1);

    return (
        <div className="dice-controls">
            <div className="dice-inputs">
                <div className="dice-count">
                    <label htmlFor="dice-count">[ QTD ]</label>
                    <DiceCountControl diceCount={diceCount} setDiceCount={setDiceCount} />
                </div>

                <div className="dice-selector">
                    <label htmlFor="dice-type">[ TYPE ]</label>
                    <div className="select-wrapper">
                        <select
                            id="dice-type"
                            value={selectedDice}
                            onChange={e => setSelectedDice(e.target.value)}
                        >
                            {DICE_TYPES.map(dice => (
                                <option key={dice.value} value={dice.value}>
                                    {dice.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <button className="roll-button" onClick={() => onRoll(`${diceCount}${selectedDice}`)}>
                ▶ EXECUTE ◀
            </button>
        </div>
    );
};

export default DiceControls;
