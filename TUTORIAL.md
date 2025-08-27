# Tutorial: Personalização de Dados 3D com @3d-dice/dice-box

Este tutorial aborda como instalar, usar e personalizar a biblioteca `@3d-dice/dice-box` para criar visualizações de dados 3D em aplicações web.

## 📦 Instalação

### 1. Instalar a biblioteca principal
```bash
npm install @3d-dice/dice-box
```

### 2. Copiar os assets necessários
A biblioteca requer arquivos de textura e modelo. Execute o script pós-instalação:
```bash
node node_modules/@3d-dice/dice-box/copyAssets.js
```

Isso copiará os assets para `/public/assets/` por padrão.

### 3. Estrutura de diretórios dos assets
```
public/
└── assets/
    ├── ammo/
    │   └── ammo.wasm.wasm
    └── themes/
        ├── default/
        ├── diceOfRolling/
        ├── rust/
        ├── gemstone/
        └── ... (outros temas)
```

## 🚀 Uso Básico

### 1. Importar e inicializar
```typescript
import DiceBox from "@3d-dice/dice-box";

// Criar instância do DiceBox
const diceBox = new DiceBox("#dice-box", {
  assetPath: "/assets/",
  width: 800,
  height: 600,
  gravity: 6,
  mass: 1,
  friction: 0.9,
  restitution: 0.9
});

// Inicializar
await diceBox.init();
```

### 2. Rolar dados
```typescript
// Rolar notações simples
diceBox.roll("2d20");     // Rola 2 dados de 20 faces
diceBox.roll("1d6+4");    // Rola 1 dado de 6 faces + 4
diceBox.roll("4d6");      // Rola 4 dados de 6 faces

// Configurar callback para resultados
diceBox.onRollComplete = (results) => {
  console.log("Resultados:", results);
};
```

## 🎨 Personalização de Temas

### Temas Pré-definidos Disponíveis
- `default` - Tema básico com texturas
- `diceOfRolling` - Tema oficial Dice of Rolling
- `rust` - Dados com aparência envelhecida
- `gemstone` - Dados com aparência de pedras preciosas

### Usando temas diferentes
```typescript
const diceBox = new DiceBox("#dice-box", {
  assetPath: "/assets/",
  theme: "gemstone"  // Especificar o tema
});
```

### Personalização com Cores Sólidas
A personalização com cores sólidas funciona apenas com o tema `default`:

```typescript
const diceBox = new DiceBox("#dice-box", {
  assetPath: "/assets/",
  theme: "default",
  themeColor: "#ff416c"  // Aplicar cor vermelha
});
```

### Atualizando configurações em tempo real
```typescript
// Mudar tema
diceBox.updateConfig({ theme: "rust" });

// Mudar cor (apenas para tema default)
diceBox.updateConfig({ theme: "default", themeColor: "#00d2ff" });
```

## ⚠️ Limitações do Tema "Dice of Rolling"

### 1. Sem Suporte a Cores Personalizadas
O tema "Dice of Rolling" **não permite** personalização de cores através da propriedade `themeColor`. Tentativas de aplicar cores resultam em:
- Nenhuma mudança visual
- Possíveis erros silenciosos
- Comportamento inconsistente

### 2. Texturas Fixas
O tema utiliza texturas específicas que não podem ser substituídas:
- `diffuse.jpg` - Textura de difusão principal
- `normal.png` - Mapa de normais para efeitos 3D
- `specularity.jpg` - Textura de especularidade

### 3. Modelo 3D Fixo
- Utiliza o modelo `smoothDice.json`
- Não é possível trocar por outros modelos como `gemstone.json`

### 4. Alternativas para Personalização
Se você precisa de personalização de cores, use o tema `default`:
```typescript
// ❌ Não funciona com Dice of Rolling
const diceBox = new DiceBox("#dice-box", {
  assetPath: "/assets/",
  theme: "diceOfRolling",
  themeColor: "#00ff00"  // Ignorado
});

// ✅ Funciona com tema default
const diceBox = new DiceBox("#dice-box", {
  assetPath: "/assets/",
  theme: "default",
  themeColor: "#00ff00"  // Aplicado corretamente
});
```

## 📁 Estrutura de Temas Personalizados

### Criando um tema personalizado
1. Criar pasta em `/public/assets/themes/nome-do-tema/`
2. Adicionar arquivos necessários:
   - `theme.config.json` - Configuração do tema
   - Texturas (PNG, JPG)
   - Modelo 3D (JSON)

### Exemplo de theme.config.json
```json
{
  "name": "Meu Tema",
  "systemName": "meuTema",
  "author": "Seu Nome",
  "version": 1.0,
  "material": {
    "type": "color",
    "diffuseTexture": {
      "light": "diffuse-light.png",
      "dark": "diffuse-dark.png"
    },
    "diffuseLevel": 1,
    "bumpTexture": "normal.png",
    "bumpLevel": 0.5
  },
  "diceAvailable": ["d4","d6","d8","d10","d12","d20","d100"]
}
```

## 🎯 Boas Práticas

### 1. Gerenciamento de Estado
```typescript
// Manter referência para evitar múltiplas instâncias
let diceBoxInstance = null;

const initDiceBox = async () => {
  if (diceBoxInstance) {
    diceBoxInstance.clear();
    return diceBoxInstance;
  }
  
  diceBoxInstance = new DiceBox("#dice-box", config);
  await diceBoxInstance.init();
  return diceBoxInstance;
};
```

### 2. Tratamento de Erros
```typescript
try {
  await diceBox.init();
} catch (error) {
  console.error("Falha ao inicializar DiceBox:", error);
}
```

### 3. Limpeza de Recursos
```typescript
// Limpar antes de destruir componente
useEffect(() => {
  return () => {
    if (diceBoxInstance) {
      diceBoxInstance.clear();
    }
  };
}, []);
```

## 🔧 Solução de Problemas

### Problemas Comuns

1. **Dados não aparecem:**
   - Verificar caminho dos assets (`assetPath`)
   - Confirmar que arquivos foram copiados
   - Verificar console do navegador por erros

2. **Personalização de cores não funciona:**
   - Certificar-se de usar tema `default`
   - Verificar formato da cor (hexadecimal)

3. **Performance lenta:**
   - Reduzir `width` e `height`
   - Ajustar parâmetros físicos (gravity, mass)

### Debugging
```typescript
// Verificar configuração atual
console.log(diceBox.config);

// Forçar atualização
diceBox.updateConfig({ gravity: 6 });

// Limpar e reiniciar
diceBox.clear();
```

## 📚 Recursos Adicionais

- [Documentação Oficial](https://fantasticdice.games)
- [Repositório GitHub](https://github.com/3d-dice/dice-box)
- [Temas Adicionais](https://github.com/3d-dice/dice-themes)

Este tutorial cobre os aspectos essenciais da biblioteca `@3d-dice/dice-box`, incluindo suas limitações importantes com o tema "Dice of Rolling".