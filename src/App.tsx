import { useRef, useState } from "react";
import DiceBoxComponent from "./DiceBox";
import "./index.css"; // Importando os novos estilos

// Interface para definir a estrutura dos resultados
interface RollResult {
    total: number;
    rolls: Array<{
        type: string;
        value: number;
    }>;
}

function App() {
    // Ref para armazenar o resultado da rolagem
    const rollResultRef = useRef<RollResult | null>(null);
    const [, forceUpdate] = useState({});

    // Função para receber o resultado do componente DiceBox e atualizar o estado
    const handleRoll = (results: any) => {
        try {
            console.log("Raw results from dice box:", results);
            
            // Simple handling - just take the first result
            if (results && Array.isArray(results) && results.length > 0) {
                const resultData = results[0];
                console.log("Processing result data:", resultData);
                
                // Create a simple formatted result
                const formattedResult = {
                    total: resultData.value || resultData.total || 0,
                    rolls: []
                };
                
                // Handle different possible structures
                if (resultData.rolls && Array.isArray(resultData.rolls)) {
                    formattedResult.rolls = resultData.rolls.map((die: any) => ({
                        type: `d${resultData.sides || 0}`,
                        value: die.value || 0
                    }));
                } else if (resultData.results && Array.isArray(resultData.results)) {
                    formattedResult.rolls = resultData.results.map((die: any) => ({
                        type: `d${die.sides || 0}`,
                        value: die.value || 0
                    }));
                } else {
                    // Fallback for simple structure
                    formattedResult.rolls = [{
                        type: `d${resultData.sides || 0}`,
                        value: resultData.value || resultData.total || 0
                    }];
                }
                
                console.log("Formatted result:", formattedResult);
                rollResultRef.current = formattedResult;
                // Force update to trigger re-render
                forceUpdate({});
            }
        } catch (error) {
            console.error("Error processing dice roll results:", error);
        }
    };

    return (
        <div className="app">
            <h1>CYBERDICE v1.0</h1>
            <div className="dice-demo">
                <DiceBoxComponent onRoll={handleRoll} />

                {/* Novo painel para exibir os resultados */}
                <div className="roll-result">
                    <h3>// SYSTEM OUTPUT:</h3>
                    <pre>
                        {rollResultRef.current
                            ? `> Total: ${
                                  rollResultRef.current.total
                              }
> Rolls: ${JSON.stringify(
                                  rollResultRef.current.rolls.map((r) => r.value)
                              )}`
                            : "> Awaiting command..."}
                    </pre>
                </div>
            </div>
        </div>
    );
}

export default App;
