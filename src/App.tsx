import { useState } from "react";
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
    // Estado para armazenar e exibir o resultado da rolagem
    const [rollResult, setRollResult] = useState<RollResult | null>(null);

    // Função para receber o resultado do componente DiceBox e atualizar o estado
    const handleRoll = (results: any) => {
        try {
            console.log("Raw results from dice box:", results);
            
            // Verificar a estrutura dos resultados
            if (!results || !Array.isArray(results) || results.length === 0) {
                console.error("Invalid results structure");
                return;
            }
            
            // Processar os dados com a estrutura correta
            const resultData = results[0];
            console.log("Processing result data:", resultData);
            
            // Verificar se temos os dados necessários
            if (!resultData.rolls || !Array.isArray(resultData.rolls)) {
                console.error("Invalid result data structure:", resultData);
                return;
            }
            
            // Mapear os dados para o formato esperado pela interface RollResult
            const formattedResult = {
                total: resultData.value || 0,
                rolls: resultData.rolls.map((die: any) => ({
                    type: `d${resultData.sides || 0}`,
                    value: die.value || 0
                }))
            };
            
            console.log("Formatted result:", formattedResult);
            setRollResult(formattedResult);
            console.log("Results displayed successfully");
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
                        {rollResult
                            ? `TOTAL: ${rollResult.total}
DADOS: ${rollResult.rolls.map((r) => r.value).join(", ")}
QUANTIDADE: ${rollResult.rolls.length}
MÍNIMO: ${Math.min(...rollResult.rolls.map((r) => r.value))}
MÁXIMO: ${Math.max(...rollResult.rolls.map((r) => r.value))}`
                            : "AGUARDANDO COMANDO..."}
                    </pre>
                </div>
            </div>
        </div>
    );
}

export default App;
