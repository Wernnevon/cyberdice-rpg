# Dice Themes Design

## Pieces

| File | Role |
| ---- | ---- |
| `src/utils/themes.ts` (new) | Pure data and rules, no React, three or DOM: `Theme`, `ThemeId`, `THEMES` (8, neon first), `getTheme(id)`, `loadTheme(store)`, `saveTheme(store, id)`, `bodyColor(theme, sides, role?)`, `iconColor(theme, sides, state?)`, `contrast(a, b)`. |
| `src/utils/themeStore.ts` (new) | `createThemeStore(storage)` with `get`, `set`, `subscribe`; the app instance over localStorage; `useTheme()` through `useSyncExternalStore`, so no provider, also inside the R3F Canvas. |
| `src/components/ThemeScreen.tsx` (new) | Full-screen layer like History, reusing `Screen.module.css`. |
| `src/utils/geometry.ts` | Drops `COLORS`, `TENS_COLOR` and `DieDef.color`; geometry stays cached and theme-free. Adds per-face planar UVs in 0..1. `labelTexture(text, theme)` cached by theme id and text, redrawn when the font loads. |
| `src/utils/faceTexture.ts` (new) | `paintFace(ctx, size, color, texture, image)`: fills the body color, then draws the code pattern or the image over it with `multiply` or partial alpha, so the color stays visible. A null image leaves the plain color. `faceTexture(theme, color)` wraps it in a cached `CanvasTexture` and repaints when the image loads. |
| `src/components/Die.tsx` | Material by finish: toon = `meshToonMaterial`; gloss = `meshStandardMaterial` low roughness; metal = `meshStandardMaterial` metalness 1; glass = `meshStandardMaterial` transparent. With a texture, `map` carries the color and the material color is white. |
| `src/components/DiceScene.tsx` | `scene.environment` from three's own `RoomEnvironment` + `PMREMGenerator`, so metal and gloss have something to reflect. Toon ignores it. No new dependency. |
| `public/textures/` | `marble.jpg`, `gold.jpg`, `halftone.png`, `sakura.png`, `LICENSES.md`. |

## Rules

- Applying a theme never remounts a `Die` or its `RigidBody`: only geometry-independent material props change (AC "keep values and positions"). Changing the material element type is allowed, changing keys on the body is not.
- The 8 die fonts are self-hosted latin woff2 files in `public/fonts/` (OFL, `LICENSES.md`), precached by the service worker and loaded at startup with `document.fonts.load`. This is the fallback named in Risks: runtime caching cannot guarantee fonts requested on the first visit. UI fonts stay on Google Fonts.
- Preset accents map to die colors: 1d20→d20, 2d20kh1→d8, 2d20kl1→d4, 4d6kh3→d6, d%→d100, 8d6→d12. Under neon the only change is 2d20kl1, from #E0102F to the d4 #FF2E4D.

## Risks

- Fonts requested before the service worker controls the first load are not cached. The offline walk decides; if it fails, self-host the font files under `public/fonts/` and precache them.
- Transparent glass shows the table through the die and hides back-face numbers. Opacity is a tuning knob.
