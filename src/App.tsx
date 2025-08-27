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
            
            // A biblioteca pode retornar diretamente o objeto de resultado
            const resultData = Array.isArray(results[0]) ? results[0][0] : results[0];
            console.log("Processing result data:", resultData);
            
            // Verificar se temos os dados necessários
            if (!resultData.results || !Array.isArray(resultData.results)) {
                console.error("Invalid result data structure:", resultData);
                return;
            }
            
            // Mapear os dados para o formato esperado pela interface RollResult
            const formattedResult = {
                total: resultData.total || 0,
                rolls: resultData.results.map((die: any) => ({
                    type: `d${die.sides || 0}`,
                    value: die.value || 0
                }))
            };
            
            console.log("Formatted result:", formattedResult);
            setRollResult(formattedResult);
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
