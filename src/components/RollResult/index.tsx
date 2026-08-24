import { DiceDataT } from "../../types";
import "./styles.css";

interface RollResultProps {
    rollResult: DiceDataT | null;
    isRolling?: boolean;
}

const RollResult = ({ rollResult, isRolling }: RollResultProps) => {
    const formatResult = () => {
        if (isRolling) {
            return <span className="loading-text">&gt;&gt; CALCULATING...</span>;
        }

        if (!rollResult) {
            return ">> AWAITING SIGNAL...";
        }

        return [
            `>> DICE: ${rollResult.quantity}D${rollResult.diceSides}`,
            `>> VALUES: [${rollResult.dices}]`,
            `>> RESULT: ${rollResult.total} ◈`,
        ].join("\n");
    };

    return (
        <div className="roll-result">
            <h3>[ ● OUTPUT ]</h3>
            <pre>{formatResult()}</pre>
        </div>
    );
};

export default RollResult;
