import React, { useEffect, useRef, useState } from "react"
import DiceBox from "@3d-dice/dice-box"

interface DiceBoxComponentProps {
    onRoll?: (results: any) => void
}

const DiceBoxComponent: React.FC<DiceBoxComponentProps> = ({ onRoll }) => {
    const diceBoxRef = useRef<any>(null)
    const boxRef = useRef<HTMLDivElement>(null)
    const [diceConfig, setDiceConfig] = useState({
        assetPath: "/assets/",
        width: 800,
        height: 600,
        gravity: 6,
        mass: 1,
        friction: 0.9,
        restitution: 0.9,
        angularDamping: 0.8,
        linearDamping: 0.9,
        theme: "default",
        themeColor: "#00ccff",
    })

    useEffect(() => {
        const initDiceBox = async () => {
            if (boxRef.current) {
                // Clean up existing instance if it exists
                if (diceBoxRef.current) {
                    try {
                        diceBoxRef.current.clear()
                    } catch (e) {
                        console.warn("Error clearing dice box:", e)
                    }
                }

                // Initialize dice box with default theme for better visibility
                diceBoxRef.current = new DiceBox("#dice-box", diceConfig)

                await diceBoxRef.current.init()

                // Ajusta a posição da câmera para melhor visualização
                if (diceBoxRef.current.scene) {
                    const camera = diceBoxRef.current.scene.activeCamera
                    if (camera) {
                        camera.radius = 20 // Distância da câmera (mais próxima para melhor visão)
                        camera.beta = Math.PI / 4 // Ângulo vertical (45 graus)
                        camera.alpha = 0 // Rotação horizontal
                    }
                }

                // Set up event listener for roll results
                if (onRoll) {
                    diceBoxRef.current.onRollComplete = onRoll
                }
            }
        }

        // Initialize the dice box after a short delay to ensure DOM is ready
        const timeoutId = setTimeout(() => {
            initDiceBox()
        }, 100)

        return () => {
            clearTimeout(timeoutId)
            // Cleanup if needed
            if (diceBoxRef.current) {
                try {
                    diceBoxRef.current.clear()
                } catch (e) {
                    console.warn("Error cleaning up dice box:", e)
                }
            }
        }
    }, [onRoll, diceConfig])

    const rollDice = (notation: string) => {
        if (diceBoxRef.current) {
            console.log("Rolling dice with notation:", notation)
            
            // Reset camera position for better visibility
            if (diceBoxRef.current.scene) {
                const camera = diceBoxRef.current.scene.activeCamera
                if (camera) {
                    camera.radius = 20 // Reset distance
                    camera.beta = Math.PI / 4 // Reset vertical angle
                    camera.alpha = 0 // Reset horizontal rotation
                }
            }
            
            // Re-register the callback to ensure it's active
            if (onRoll) {
                diceBoxRef.current.onRollComplete = onRoll
            }
            
            diceBoxRef.current.roll(notation)
        } else {
            console.warn("DiceBox not initialized yet")
        }
    }

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
    )
}

export default DiceBoxComponent
