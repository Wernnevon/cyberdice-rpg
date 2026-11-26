# CyberDice

Rolador de dados 3D para RPG de mesa, feito para celular. O resultado sai da física de verdade: o dado cai, para, e vale a face virada para cima.

- d4, d6, d8, d10, d12, d20 e d100 (dois d10: dezenas + unidades)
- Notação de RPG: `2d6+3`, `4d6kh3` (mantém os 3 maiores), `2d20kl1` (desvantagem), `d%`
- Agitar o celular para rolar
- Histórico da sessão (não é salvo ao fechar o app)
- Português e inglês, conforme o idioma do navegador
- PWA: instala na tela inicial e funciona offline

## Stack

React + TypeScript + Vite, [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) (Three.js) para o 3D e [Rapier](https://rapier.rs) para a física. CSS Modules com tokens em `src/styles/tokens.css`. Sem backend e sem persistência.

## Rodando

```sh
npm install
npm run dev        # https://localhost:5173 (HTTPS autoassinado)
npm test           # testes do parser e do cálculo (node --test)
npm run build
```

Para testar no celular, rode `npm run dev -- --host` e abra o endereço `Network` no celular (mesma rede Wi-Fi). Aceite o aviso de certificado: o HTTPS é necessário para o sensor de movimento. `HTTP=1 npm run dev` desliga o HTTPS.

## Estrutura

```
src/
  components/  cena 3D (DiceScene, Die), UI (Tray, Result, History, Formula, DieIcon)
  hooks/       useRoll (estado das rolagens), useShake (sensor de movimento)
  utils/       dice.ts (parser e cálculo), geometry.ts (formas, leitura da face), format.ts
  i18n/        pt-BR.json, en.json, t.ts
  types/       modelos de dados
  styles/      tokens do design system
```

## Ajustes finos

Constantes marcadas com `ponytail:` no código são os botões de calibragem:

| Constante | Arquivo | Controla |
|---|---|---|
| `VIEW_W` | `components/DiceScene.tsx` | tamanho dos dados na tela |
| `DIE_TOP` | `components/DiceScene.tsx` | recuo das paredes (evita corte nas bordas) |
| `LABEL_SCALE` | `utils/geometry.ts` | tamanho dos números por tipo de dado |
| `REST_S` | `components/Die.tsx` | quanto tempo parado até ler o resultado |
| `THRESHOLD` | `hooks/useShake.ts` | força necessária para o shake |
| `MAX_BODIES` | `utils/dice.ts` | máximo de dados por rolagem |
