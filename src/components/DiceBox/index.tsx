import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import DiceBoxClass from "@3d-dice/dice-box";
import "./styles.css";

interface DiceBoxProps {
  onRoll?: (results: any) => void;
}

export interface DiceBoxRef {
  roll: (notation: string) => void;
}

const DiceBox = forwardRef<DiceBoxRef, DiceBoxProps>(({ onRoll }, ref) => {
  const diceBoxRef = useRef<any>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initDiceBox = async () => {
      if (boxRef.current) {
        // Initialize dice box with Dice of Rolling theme using new API
        diceBoxRef.current = new DiceBoxClass({
          container: "#dice-box",
          assetPath: "/assets/",
          gravity: 6,
          mass: 1,
          friction: 0.9,
          restitution: 0.9,
          angularDamping: 0.8,
          linearDamping: 0.9,
          theme: "diceOfRolling",
        });

        await diceBoxRef.current.init();

        // Adjust camera position for better visibility
        if (diceBoxRef.current.scene) {
          const camera = diceBoxRef.current.scene.activeCamera;
          if (camera) {
            camera.radius = 30; // Increased distance for better visibility
            camera.beta = Math.PI / 3; // Slightly different angle
          }
        }

        // Set up event listener for roll results
        if (onRoll) {
          diceBoxRef.current.onRollComplete = onRoll;
        }

        // Force initial scene render
        if (diceBoxRef.current.scene) {
          setTimeout(() => {
            diceBoxRef.current.scene.render();
          }, 100);
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
        // Add cleanup logic if available
      }
    };
  }, [onRoll]);

  // Exposing the roll method through the ref
  useImperativeHandle(ref, () => ({
    roll: (notation: string) => {
      if (diceBoxRef.current) {
        // Clear previous dice before rolling new ones
        diceBoxRef.current.clear();

        // Re-register the callback to ensure it's active for the next roll
        if (onRoll) {
          diceBoxRef.current.onRollComplete = onRoll;
        }

        // Small delay to ensure proper initialization
        setTimeout(() => {
          diceBoxRef.current.roll(notation);
        }, 10);
      } else {
        console.warn("DiceBox not initialized yet");
      }
    },
  }));

  return (
    <div className="dice-box-container">
      <div id="dice-box" ref={boxRef} />
    </div>
  );
});

export default DiceBox;
