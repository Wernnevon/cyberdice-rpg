import { DiceDataT } from "../../types";
import { dieMark } from "../../utils";
import "./styles.css";

interface RollResultProps {
    rollResult: DiceDataT | null;
    isRolling?: boolean;
}

const totalClass = ({ values, diceSides }: DiceDataT) => {
    const mark = values.length === 1 ? dieMark(values[0], diceSides) : null;
    return `roll-result__total-value${mark ? ` roll-result__total-value--${mark}` : ""}`;
};

/** The HUD readout: one big total, with the individual dice below it. */
const RollResult = ({ rollResult, isRolling }: RollResultProps) => {
    const state = isRolling ? "rolling" : rollResult ? "result" : "idle";

    return (
        <section className={`roll-result roll-result--${state}`} aria-live="polite">
            <header className="roll-result__head">
                <span className="roll-result__title">Output</span>
                <span className="roll-result__tag">
                    {rollResult ? `${rollResult.quantity}d${rollResult.diceSides}` : "LOG_01"}
                </span>
            </header>

            {state === "idle" && (
                <p className="roll-result__placeholder">&gt;&gt; awaiting signal_</p>
            )}

            {state === "rolling" && (
                <p className="roll-result__placeholder roll-result__placeholder--live">
                    &gt;&gt; calculating<span className="roll-result__dots" />
                </p>
            )}

            {state === "result" && rollResult && (
                <div className="roll-result__body">
                    <div className="roll-result__total">
                        <span className="roll-result__total-label">Total</span>
                        <strong className={totalClass(rollResult)}>{rollResult.total}</strong>
                    </div>

                    <ul className="roll-result__dice">
                        {rollResult.values.map((value, index) => {
                            const mark = dieMark(value, rollResult.diceSides);
                            return (
                                <li
                                    key={index}
                                    className={`roll-result__die${mark ? ` roll-result__die--${mark}` : ""}`}
                                    title={mark === "crit" ? "Critical" : mark === "fumble" ? "Fumble" : undefined}
                                >
                                    {value}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </section>
    );
};

export default RollResult;
