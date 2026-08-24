# CYBERDICE RPG

Rolador de dados 3D para RPG de mesa, com visual cyberpunk. React + TypeScript + react-three-fiber.

## 🎲 Funcionalidades

- Dados 3D com física própria: gravidade, quique, colisão entre dados e parede circular da bandeja
- Suporte a d4, d6, d8, d10, d12, d20 e d100, até 10 dados por rolagem
- **O resultado é lido da face que parou virada para cima** — o número da tela é o número da conta
- Numeração autêntica: faces opostas sempre somam o mesmo total (7 no d6, 21 no d20...)
- D10 e D100 são trapezoedros pentagonais de verdade, com 10 faces planas

## ▶️ Como usar

```bash
npm install
npm run dev
```

A aplicação sobe em `http://localhost:5173`. Escolha a quantidade e o tipo de dado no painel
lateral e clique em **EXECUTE**. O resultado aparece no painel `[ ● OUTPUT ]`.

## 🛠️ Desenvolvimento

### Comandos

```bash
npm run dev         # servidor de desenvolvimento
npm run build       # typecheck + build de produção
npm run preview     # serve o build localmente
npm test            # roda a suíte de testes
npm run test:watch  # testes em watch mode
npm run lint        # ESLint
```

### Estrutura

```
src/
├── dice/                    # domínio: matemática pura, sem React
│   ├── geometry.ts          # sólidos, normais, numeração das faces, leitura do topo
│   ├── physics.ts           # integração do movimento de um dado por frame
│   └── notation.ts          # parser de "3d20"
├── components/
│   ├── DiceBox/             # cena 3D
│   │   ├── index.tsx        # Canvas + orquestração da rolagem
│   │   ├── Die.tsx          # um dado: estado físico + malha numerada
│   │   └── CyberTray.tsx    # bandeja e iluminação
│   ├── DiceControls/        # seleção de quantidade e tipo
│   └── RollResult/          # painel de saída
├── shared/styles/           # design system (tokens de cor, espaçamento, tipografia)
├── types/                   # tipos da aplicação
└── utils/                   # formatação do resultado para exibição
```

Tudo que é matemática mora em `src/dice/` e não importa React — é código puro, testável
e coberto pela suíte. Os componentes só desenham o resultado dessas funções.

## 📦 Tecnologias

- React 18 com TypeScript (strict)
- Vite
- three.js via @react-three/fiber e @react-three/drei
- Vitest e ESLint
