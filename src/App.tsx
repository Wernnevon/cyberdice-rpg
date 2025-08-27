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
            // A biblioteca retorna um array de resultados
            const resultData = results[0];
            
            // Mapear os dados para o formato esperado pela interface RollResult
            const formattedResult = {
                total: resultData.total,
                rolls: resultData.results.map((die: any) => ({
                    type: `d${die.sides}`,
                    value: die.value
                }))
            };
            
            setRollResult(formattedResult);
            console.log("Dice roll results:", formattedResult);
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
                            ? `┌─ RESULTADO DA ROLAGEM ─────────────────────┐
│ TOTAL: ${rollResult.total.toString().padStart(3)}                            │
├─ DADOS INDIVIDUAIS ────────────────────────┤
│ ${rollResult.rolls.map((r, i) => `DADO ${i + 1}: ${r.value.toString().padStart(2)}`).join("   ")} │
├─ ESTATÍSTICAS ─────────────────────────────┤
│ QUANTIDADE DE DADOS: ${rollResult.rolls.length.toString().padStart(2)}                   │
│ VALOR MÍNIMO: ${Math.min(...rollResult.rolls.map(r => r.value)).toString().padStart(3)}                         │
│ VALOR MÁXIMO: ${Math.max(...rollResult.rolls.map(r => r.value)).toString().padStart(3)}                         │
└─────────────────────────────────────────────┘`
                            : `┌─ SISTEMA PRONTO ───────────────────────────┐
│ AGUARDANDO COMANDO DE ROLAGEM...          │
└─────────────────────────────────────────────┘`}
                    </pre>
                </div>
            </div>
        </div>
    );
}

export default App;
