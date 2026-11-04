import { useEffect, useState } from "react";
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
    const notation = `${diceCount}d${faces}`;

    // Space throws from anywhere on the page. A focused button or field keeps
    // its own Space, so the keyboard user pressing a die-type button does not
    // also throw.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.code !== "Space" || event.repeat || isRolling) return;
            const target = event.target as HTMLElement | null;
            if (target?.closest("button, input, select, textarea, [contenteditable]")) return;
            event.preventDefault();
            onRoll(notation);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [notation, isRolling, onRoll]);

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
                onClick={() => onRoll(notation)}
                disabled={isRolling}
                aria-keyshortcuts="Space"
            >
                {isRolling ? "Rolling" : `Roll ${notation}`}
            </button>
            <p className="roll-hint" aria-hidden="true">
                or press <kbd>Space</kbd>
            </p>
        </div>
    );
};

export default DiceControls;
