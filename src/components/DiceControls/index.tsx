import { useState } from "react";
import "./styles.css";

interface DiceControlsProps {
    onRoll: (notation: string) => void;
}

interface DiceType {
    value: string;
    label: string;
}

const DiceControls = ({ onRoll }: DiceControlsProps) => {
    const [selectedDice, setSelectedDice] = useState<string>("d20");
    const [diceCount, setDiceCount] = useState<number>(1);

    const diceTypes: DiceType[] = [
        { value: "d4", label: "d4 🔺" },
        { value: "d6", label: "d6 ⬛" },
        { value: "d8", label: "d8 ✴️" },
        { value: "d10", label: "d10 🔟" },
        { value: "d12", label: "d12 🌕" },
        { value: "d20", label: "d20 🎯" },
        { value: "d100", label: "d100 💯" },
    ];

    const rollDice = () => {
        onRoll(`${diceCount}${selectedDice}`);
    };

    return (
        <div className="dice-controls">
            <div className="dice-inputs">
                <div className="dice-count">
                    <label htmlFor="dice-count">Quantidade: 🔢</label>
                    <input
                        id="dice-count"
                        type="number"
                        min="1"
                        max="10"
                        value={diceCount}
                        onChange={(e) =>
                            setDiceCount(parseInt(e.target.value) || 1)
                        }
                    />
                </div>

                <div className="dice-selector">
                    <label htmlFor="dice-type">Tipo de Dado: 🎲</label>
                    <select
                        id="dice-type"
                        value={selectedDice}
                        onChange={(e) => setSelectedDice(e.target.value)}
                    >
                        {diceTypes.map((dice) => (
                            <option key={dice.value} value={dice.value}>
                                {dice.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <button className="roll-button" onClick={rollDice}>
                ROLAR DADOS 🎰
            </button>
        </div>
    );
};

export default DiceControls;
