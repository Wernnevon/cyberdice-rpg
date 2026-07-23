import { memo } from "react";
import { DiceDataT } from "../../types";
import "./styles.css";

interface RollResultProps {
    rollResult: DiceDataT;
    isRolling?: boolean;
}

const RollResult = ({ rollResult, isRolling }: RollResultProps) => {
    const formatResult = () => {
        if (isRolling) {
            return (
                <span className="loading-text">&gt;&gt; CALCULATING...</span>
            );
        }

        if (!rollResult.total) {
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

// Custom comparison function for memoization
const areEqual = (prevProps: RollResultProps, nextProps: RollResultProps) => {
    return (
        prevProps.isRolling === nextProps.isRolling && // check rolling state
        prevProps.rollResult.total === nextProps.rollResult.total &&
        prevProps.rollResult.quantity === nextProps.rollResult.quantity &&
        prevProps.rollResult.diceSides === nextProps.rollResult.diceSides &&
        prevProps.rollResult.dices === nextProps.rollResult.dices
    );
};

export default memo(RollResult, areEqual);
