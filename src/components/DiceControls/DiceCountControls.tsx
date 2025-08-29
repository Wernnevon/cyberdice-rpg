import { memo } from "react";

interface DiceCountControlsProps {
    diceCount: number;
    setDiceCount: (value: number) => void;
}

export const MobileDiceCountControl = ({ 
    diceCount, 
    setDiceCount 
}: Omit<DiceCountControlsProps, 'isMobile'>) => {
    const incrementCount = () => {
        setDiceCount(Math.min(diceCount + 1, 10));
    };

    const decrementCount = () => {
        setDiceCount(Math.max(diceCount - 1, 1));
    };

    return (
        <div className="dice-count-wrapper">
            <button 
                className="dice-count-btn decrement" 
                onClick={decrementCount}
                aria-label="Diminuir quantidade"
            >
                -
            </button>
            <input
                id="dice-count"
                type="number"
                min="1"
                max="10"
                value={diceCount}
                readOnly
                className="dice-count-input mobile-readonly"
            />
            <button 
                className="dice-count-btn increment" 
                onClick={incrementCount}
                aria-label="Aumentar quantidade"
            >
                +
            </button>
        </div>
    );
};

export const DesktopDiceCountControl = ({ 
    diceCount, 
    setDiceCount 
}: Omit<DiceCountControlsProps, 'isMobile'>) => {
    return (
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
    );
};

// Memoize the components to prevent unnecessary re-renders
export const MemoizedMobileDiceCountControl = memo(MobileDiceCountControl);
export const MemoizedDesktopDiceCountControl = memo(DesktopDiceCountControl);