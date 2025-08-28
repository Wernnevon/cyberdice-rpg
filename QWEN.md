# Project Context for Qwen Code

## Project Overview
This directory contains the CYBERDICE RPG project implemented with React, TypeScript, and Vite. It's a minimal setup focused on providing a clean foundation for testing implementations.

## Technology Stack
- React 18+ with TypeScript
- Vite as the build tool
- @3d-dice/dice-box for 3D dice visualization
- Minimal dependencies for a lightweight setup

## Project Structure
```
cyberdice-rpg/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── README.md
├── TUTORIAL.md
├── public/
│   └── assets/ (dice box assets)
├── src/
│   ├── App.tsx
│   ├── DiceBox.tsx
│   ├── main.tsx
│   ├── index.css
│   └── types/
│       └── dice-box.d.ts
└── node_modules/
```

## Development Workflow

### Starting the Development Server
To start the development server with hot module replacement:
```bash
npm run dev
```
Then open your browser to http://localhost:5173

### Building for Production
To create a production build:
```bash
npm run build
```

### Previewing the Production Build
To preview the production build locally:
```bash
npm run preview
```

## Key Features of This Setup
1. Minimal dependencies - only essential packages included
2. TypeScript support with strict configuration
3. Vite for fast development and building
4. React with proper TypeScript typings
5. 3D dice visualization using @3d-dice/dice-box
6. Basic CSS styling included
7. Hot module replacement for efficient development

## Integration Details

### @3d-dice/dice-box Integration
The project includes the @3d-dice/dice-box library for 3D dice visualization:
- Installed version 1.1.4 of the library
- Copied required assets to the public/assets directory
- Created a DiceBox React component that wraps the library
- Uses the authentic "Dice of Rolling" theme with expanded roll options

### TypeScript Support
- Added proper TypeScript configuration for React/JSX
- Created type definitions for the @3d-dice/dice-box module
- Fixed all TypeScript compilation errors

### Current Implementation
The DiceBox component:
- Uses the authentic "Dice of Rolling" theme (no color customization)
- Provides buttons for rolling: 1d4, 1d6, 1d8, 1d10, 1d12, 1d20, 1d100, 2d6, 3d6, 4d6
- Implements proper initialization and cleanup
- Uses stable updateConfig method for any future theme changes

## Important Limitations Discovered
1. **Dice of Rolling Theme Limitation**: The authentic "Dice of Rolling" theme does NOT support color customization via the `themeColor` property
2. **Theme Switching Required**: For color customization, you must switch to the "default" theme
3. **Performance Considerations**: Full component recreation causes interface freezing - use `updateConfig` method instead

## Recent Fixes
1. Fixed TypeScript configuration to properly support React/JSX
2. Added type definitions for the @3d-dice/dice-box module to resolve "Could not find a declaration file" error
3. Updated all configuration files to ensure proper compilation
4. Resolved infinite loop issues when trying to customize Dice of Rolling theme
5. Implemented stable theme/color update mechanism using updateConfig

## Next Steps
This minimal setup provides a foundation for implementing dice RPG mechanics. You can now begin adding components and logic for:
- Dice rolling functionality
- Character sheets
- Game rules implementation
- UI components for game interactions
- Advanced dice notation support
- Game state management

## Documentation
- README.md - Basic usage instructions
- TUTORIAL.md - Complete guide for installation, usage, customization, and limitations