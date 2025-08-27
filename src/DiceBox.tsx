import React, { useEffect, useRef, useState } from "react";
import DiceBox from "@3d-dice/dice-box";

interface DiceBoxComponentProps {
    onRoll?: (results: any) => void;
}

const DiceBoxComponent: React.FC<DiceBoxComponentProps> = ({ onRoll }) => {
    const diceBoxRef = useRef<any>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    const [rollCount, setRollCount] = useState(0);

    useEffect(() => {
        const initDiceBox = async () => {
            if (boxRef.current) {
                // Clean up existing instance if it exists
                if (diceBoxRef.current) {
                    try {
                        diceBoxRef.current.clear();
                    } catch (e) {
                        console.warn("Error clearing dice box:", e);
                    }
                }

                // Initialize dice box with Dice of Rolling theme
                diceBoxRef.current = new DiceBox("#dice-box", {
                    assetPath: "/assets/",
                    width: boxRef.current.clientWidth || 800,
                    height: boxRef.current.clientHeight || 600,
                    gravity: 6,
                    mass: 1,
                    friction: 0.9,
                    restitution: 0.9,
                    angularDamping: 0.8,
                    linearDamping: 0.9,
                    theme: "diceOfRolling",
                });

                await diceBoxRef.current.init();

                // Ajusta a posição da câmera para melhor visualização
                if (diceBoxRef.current.scene) {
                    const camera = diceBoxRef.current.scene.activeCamera;
                    if (camera) {
                        camera.radius = 30; // Distância da câmera (aumentada para melhor visão)
                        camera.beta = Math.PI / 4; // Ângulo vertical (45 graus)
                    }
                }

                // Set up event listener for roll results
                if (onRoll) {
                    diceBoxRef.current.onRollComplete = onRoll;
                }
            }
        };

        // Initialize the dice box after a short delay to ensure DOM is ready
        const timeoutId = setTimeout(() => {
            initDiceBox();
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            // Cleanup if needed
            if (diceBoxRef.current) {
                try {
                    diceBoxRef.current.clear();
                } catch (e) {
                    console.warn("Error cleaning up dice box:", e);
                }
            }
        };
    }, [onRoll, rollCount]);

    const rollDice = (notation: string) => {
        if (diceBoxRef.current) {
            // Force reinitialization for each roll to fix animation
            setRollCount(prev => prev + 1);
        } else {
            console.warn("DiceBox not initialized yet");
        }
    };

    return (
        <div className="dice-box-container">
            <div id="dice-box" ref={boxRef} />
            <div className="dice-controls">
                <button onClick={() => rollDice("1d4")}>1d4</button>
                <button onClick={() => rollDice("1d6")}>1d6</button>
                <button onClick={() => rollDice("1d8")}>1d8</button>
                <button onClick={() => rollDice("1d10")}>1d10</button>
                <button onClick={() => rollDice("1d12")}>1d12</button>
                <button onClick={() => rollDice("1d20")}>1d20</button>
                <button onClick={() => rollDice("1d100")}>1d100</button>
                <button onClick={() => rollDice("2d6")}>2d6</button>
                <button onClick={() => rollDice("3d6")}>3d6</button>
                <button onClick={() => rollDice("4d6")}>4d6</button>
            </div>
        </div>
    );
};

export default DiceBoxComponent;
