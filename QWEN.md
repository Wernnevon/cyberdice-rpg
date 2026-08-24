# Project Context for Qwen Code

## Project Overview
CYBERDICE RPG is a cyberpunk-themed 3D dice roller for tabletop RPGs, built with React,
TypeScript and Vite. The dice are simulated and rendered in-house with three.js via
react-three-fiber -- there is no third-party dice library.

## Technology Stack
- React 18+ with TypeScript (strict mode)
- Vite as the build tool
- three.js, @react-three/fiber, @react-three/drei for the 3D scene
- Vitest for tests, ESLint for linting

## Project Structure
```
cyberdice-rpg/
├── index.html
├── package.json
├── vite.config.ts
├── eslint.config.js
├── tsconfig.json
├── tsconfig.node.json
├── README.md
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── dice/                  # pure domain logic, no React imports
    │   ├── geometry.ts        # solids, face normals, face numbering, top-face reading
    │   ├── geometry.test.ts
    │   ├── physics.ts         # per-frame integration for a single die
    │   ├── physics.test.ts
    │   ├── notation.ts        # dice notation parser
    │   └── notation.test.ts
    ├── components/
    │   ├── DiceBox/           # index.tsx (Canvas + roll orchestration),
    │   │                      # Die.tsx, CyberTray.tsx
    │   ├── DiceControls/      # DiceCountControl.tsx + index.tsx
    │   └── RollResult/
    ├── shared/styles/         # design tokens: variables, spacing, typography, animations
    ├── types/
    └── utils/
```

## Architectural Rules
1. **`src/dice/` must not import React.** It is pure, deterministic and unit-tested;
   every function that touches dice maths belongs there, not in a component.
2. **The result is always read from the settled orientation.** `stepDie` returns the index
   of the face that ended up on top, and the value comes from that index. Never draw a
   random number alongside the animation -- the number on screen must be the number scored.
3. **Geometries are cached per die type** in `getDieDefinition`. Never build a
   `THREE.BufferGeometry` inside a component render.
4. **`isRolling` is owned by `App.tsx`** and passed down. The dice box does not keep its
   own copy.
5. **Randomness is injectable.** Physics functions take an optional `random` argument so
   tests can replay a roll deterministically.

## Development Workflow
```bash
npm run dev      # dev server with HMR at http://localhost:5173
npm run build    # tsc + vite build
npm run preview  # preview the production build
npm test         # vitest run
npm run lint     # eslint
```

## Notes on the D10
The d10/d100 is a pentagonal trapezohedron. Its kite faces are only planar when the
equatorial ring offset satisfies `h2 = h / (5 + 2*sqrt(5))` (independent of radius).
Getting this wrong yields 20 slanted faces and no well-defined top face, which breaks
result reading. This is covered by tests in `src/dice/geometry.test.ts`.
