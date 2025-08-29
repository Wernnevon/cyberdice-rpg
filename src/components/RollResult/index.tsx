import { memo } from "react";
import { DiceDataT } from "../../types";
import "./styles.css";

interface RollResultProps {
    rollResult: DiceDataT;
}

const RollResult = ({ rollResult }: RollResultProps) => {
    const formatResult = () => {
        if (!rollResult.total) {
            return "> Awaiting command... 🤖";
        }

        return [
            `> Dado: ${rollResult.quantity}D${rollResult.diceSides} 🎲`,
            `> Dados: [${rollResult.dices}] 🧮`,
            `> Total: ${rollResult.total} 🎲`,
        ].join("\n");
    };

    return (
        <div className="roll-result">
            <h3>// SYSTEM OUTPUT: 💻</h3>
            <pre>{formatResult()}</pre>
        </div>
    );
};

// Custom comparison function for memoization
const areEqual = (prevProps: RollResultProps, nextProps: RollResultProps) => {
    return (
        prevProps.rollResult.total === nextProps.rollResult.total &&
        prevProps.rollResult.quantity === nextProps.rollResult.quantity &&
        prevProps.rollResult.diceSides === nextProps.rollResult.diceSides &&
        prevProps.rollResult.dices === nextProps.rollResult.dices
    );
};

export default memo(RollResult, areEqual);
