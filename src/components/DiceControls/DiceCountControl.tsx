import { MAX_DICE } from "../../dice/notation";

interface DiceCountControlProps {
    diceCount: number;
    setDiceCount: (value: number) => void;
}

const clamp = (value: number) => Math.min(Math.max(value, 1), MAX_DICE);

/**
 * How many dice to throw.
 *
 * One control for every screen: the stepper buttons are a touch affordance and
 * CSS hides them on pointer devices, which keeps the value clamped in exactly
 * one place instead of forking the component on window width.
 */
export const DiceCountControl = ({ diceCount, setDiceCount }: DiceCountControlProps) => (
    <div className="dice-count-wrapper">
        <button
            type="button"
            className="dice-count-btn decrement"
            onClick={() => setDiceCount(clamp(diceCount - 1))}
            disabled={diceCount <= 1}
            aria-label="Diminuir quantidade"
        >
            -
        </button>
        <input
            id="dice-count"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_DICE}
            value={diceCount}
            onChange={e => setDiceCount(clamp(Number.parseInt(e.target.value, 10) || 1))}
            className="dice-count-input"
        />
        <button
            type="button"
            className="dice-count-btn increment"
            onClick={() => setDiceCount(clamp(diceCount + 1))}
            disabled={diceCount >= MAX_DICE}
            aria-label="Aumentar quantidade"
        >
            +
        </button>
    </div>
);
