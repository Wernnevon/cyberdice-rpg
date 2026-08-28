import { useState } from "react";
import { SUPPORTED_FACES } from "../../dice/notation";
import { DiceCountControl } from "./DiceCountControl";
import "./styles.css";

interface DiceControlsProps {
    onRoll: (notation: string) => void;
    /** Locks the throw while the dice are still settling. */
    isRolling?: boolean;
}

const DiceControls = ({ onRoll, isRolling }: DiceControlsProps) => {
    const [faces, setFaces] = useState<number>(20);
    const [diceCount, setDiceCount] = useState(1);

    return (
        <div className="dice-controls">
            <fieldset className="control-block">
                <legend className="control-label">Die</legend>
                <div className="dice-type-grid">
                    {SUPPORTED_FACES.map(value => (
                        <button
                            key={value}
                            type="button"
                            className={`dice-type${value === faces ? " is-active" : ""}`}
                            onClick={() => setFaces(value)}
                            aria-pressed={value === faces}
                        >
                            d{value}
                        </button>
                    ))}
                </div>
            </fieldset>

            <fieldset className="control-block">
                <legend className="control-label">Quantity</legend>
                <DiceCountControl diceCount={diceCount} setDiceCount={setDiceCount} />
            </fieldset>

            <button
                className="roll-button"
                onClick={() => onRoll(`${diceCount}d${faces}`)}
                disabled={isRolling}
            >
                {isRolling ? "Rolling" : `Roll ${diceCount}d${faces}`}
            </button>
        </div>
    );
};

export default DiceControls;
