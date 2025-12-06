# CYBERDICE RPG v2.0

Uma aplicação de dados 3D para RPG usando React, TypeScript e a biblioteca @3d-dice/dice-box.

## 🎲 Funcionalidades

- Visualização 3D realista de dados
- Tema oficial "Dice of Rolling" autêntico
- Suporte para todos os tipos de dados de RPG: d4, d6, d8, d10, d12, d20, d100
- Animações físicas realistas com gravidade e colisões

## ▶️ Como Usar

1. **Iniciar a aplicação:**
   ```bash
   npm run dev
   ```
   A aplicação estará disponível em `http://localhost:5173`

2. **Rolar dados:**
   - Clique nos botões correspondentes aos dados que deseja rolar:
     - `Roll 1d4` - Rola um dado de 4 faces
     - `Roll 1d6` - Rola um dado de 6 faces
     - `Roll 1d8` - Rola um dado de 8 faces
     - `Roll 1d10` - Rola um dado de 10 faces
     - `Roll 1d12` - Rola um dado de 12 faces
     - `Roll 1d20` - Rola um dado de 20 faces
     - `Roll 1d100` - Rola um dado de 100 faces (percentil)
     - `Roll 2d6` - Rola dois dados de 6 faces
     - `Roll 3d6` - Rola três dados de 6 faces
     - `Roll 4d6` - Rola quatro dados de 6 faces

3. **Visualizar resultados:**
   - Os resultados aparecem no console do navegador (F12)
   - Os dados são animados em 3D com física realista

## 🛠️ Desenvolvimento

### Estrutura do Projeto
```
src/
├── App.tsx          # Componente principal da aplicação
├── DiceBox.tsx      # Componente do dado 3D
├── main.tsx         # Ponto de entrada da aplicação
├── index.css        # Estilos globais
└── types/           # Definições de tipos TypeScript
```

### Comandos Disponíveis
```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Construir para produção
npm run build

# Visualizar build de produção localmente
npm run preview
```

## 🎨 Tema

A aplicação utiliza o tema oficial "Dice of Rolling" que oferece:
- Design autêntico dos dados reais da marca Dice of Rolling
- Texturas de alta qualidade
- Animações físicas realistas

## 📦 Tecnologias

- React 18 com TypeScript
- Vite (build tool)
- @3d-dice/dice-box (biblioteca de dados 3D)
- Babylon.js (motor 3D)

## 📝 Notas

- Os dados levam alguns segundos para carregar as texturas na primeira vez
- A física dos dados é realista, então podem rolar por um tempo antes de parar
- Os resultados são exibidos no console do navegador (pressione F12 para abri-lo)