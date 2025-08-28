import { useEffect } from "react";

/**
 * Custom hook para criar o efeito de dados caindo no background
 */
export const useFallingDice = () => {
    useEffect(() => {
        const createFallingDice = () => {
            const diceChars = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
            const colors = ["#00ccff", "#39ff14", "#ff00ff"];

            const dice = document.createElement("div");
            dice.className = "falling-dice";
            dice.textContent =
                diceChars[Math.floor(Math.random() * diceChars.length)];
            dice.style.left = Math.random() * 100 + "vw";
            dice.style.top = "-50px"; // Começar bem acima da tela visível
            dice.style.color =
                colors[Math.floor(Math.random() * colors.length)];
            dice.style.fontSize = Math.random() * 20 + 15 + "px";
            dice.style.animationDuration = Math.random() * 15 + 10 + "s"; // Aumentar duração

            // Adicionar ao body para preencher toda a tela
            document.body.appendChild(dice);

            // Remover o dado após a animação
            setTimeout(() => {
                if (dice.parentNode) {
                    dice.parentNode.removeChild(dice);
                }
            }, 20000); // Aumentar tempo de vida
        };

        // Criar dados caindo a cada 200ms
        const interval = setInterval(createFallingDice, 200);

        // Criar alguns dados iniciais para preencher a tela
        for (let i = 0; i < 20; i++) {
            setTimeout(createFallingDice, i * 200);
        }

        return () => clearInterval(interval);
    }, []);
};
