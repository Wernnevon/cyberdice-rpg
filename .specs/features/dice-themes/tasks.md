# Dice Themes Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

User's orchestration: one Sonnet sub-agent implements each task, one after another; a Haiku sub-agent runs the gate; the orchestrator commits. Work happens on branch `feat/dice-themes`. No push.

---

**Design**: `.specs/features/dice-themes/design.md`
**Status**: Approved
**Approved**: 2026-11-26 - user: "aprovo as tarefas, pode executar"
**Build**: `npm run build; npm run lint`
**Run unit**: `node --test --test-reporter=spec src/**/*.test.ts`

---

## Test Coverage Matrix

> Generated from codebase and spec. Guidelines found: none beyond `package.json` - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Pure rules and canvas painting (`src/utils`) | unit | Every criterion a pure function can settle, plus fallbacks | `src/utils/*.test.ts` | `npm test` |
| React and R3F components | none | Walked in the browser | - | build gate |
| Assets and config | none | - | - | build gate |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests | `npm test` |
| Build | Component, asset and config tasks, and the end of each phase | `npm test && npm run build && npm run lint` |

---

## Execution Plan

### Phase 1: Themes everywhere in 2D

```
T1 → T2 → T3 → T4
```

### Phase 2: 3D look

```
T4 → T5 → T6
```

### Phase 3: Textures and offline

```
T6 → T7 → T8 → T9
```

---

## Task Breakdown

### T1: Theme catalog and rules

**What**: The 8 themes as data, with load, save, color and contrast rules.
**Where**: `src/utils/themes.ts`
**Depends on**: None
**Reuses**: `src/utils/prefs.ts` (blocked-storage handling), colors now in `src/utils/geometry.ts`
**Requirement**: THEME-01, THEME-02

**Done when**:

- [x] `themes.test.ts` has the tests named in checks C1, C5, C7, C8, C9, C15, C16, C17
- [x] Gate passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(themes): add dice theme catalog and rules`

### T2: Theme store

**What**: Observable current theme, saved on the device, with the `useTheme` hook.
**Where**: `src/utils/themeStore.ts`
**Depends on**: T1
**Reuses**: `loadTheme`, `saveTheme`
**Requirement**: THEME-01

**Done when**:

- [x] `themeStore.test.ts` has the tests named in checks C3, C6
- [x] Gate passes: `npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(themes): add persisted theme store`

### T3: Theme screen and header button

**What**: Screen listing the 8 themes with name, die icons and texture swatch, opened from a new header button; adds the translations.
**Where**: `src/components/ThemeScreen.tsx`
**Depends on**: T2
**Reuses**: `History.tsx` layout, `Back`, `Screen.module.css`, `DieIcon` (gains an optional `theme` prop in T4)
**Requirement**: THEME-01

**Done when**:

- [x] Tapping the button opens the screen, tapping a theme marks it, back returns to the table
- [x] At 360 px there is no horizontal scroll and the list scrolls under a fixed back button
- [x] Gate passes: `npm test && npm run build && npm run lint`

**Tests**: none
**Gate**: build
**Commit**: `feat(themes): add theme picker screen`

### T4: Themed icons and accents

**What**: `DieIcon`, tray accents, formula preset accents and the picker previews follow the theme.
**Where**: `src/components/DieIcon.tsx`
**Depends on**: T3
**Reuses**: `useTheme`, `iconColor`, `bodyColor`
**Requirement**: THEME-02

**Done when**:

- [x] Icons use the theme's body color, number color, outline and font, without texture; dropped icons stay grey
- [x] `Tray.tsx` and `Formula.tsx` accents use `bodyColor`
- [x] Gate passes: `npm test && npm run build && npm run lint`

**Tests**: none
**Gate**: build
**Commit**: `feat(themes): dress icons and accents with the theme`

### T5: Themed 3D colors and numbers

**What**: 3D body color and number textures come from the theme.
**Where**: `src/utils/geometry.ts`
**Depends on**: T4
**Reuses**: existing `labelTexture` cache and font redraw
**Requirement**: THEME-02

**Done when**:

- [x] `COLORS`, `TENS_COLOR` and `DieDef.color` are gone; `Die.tsx` uses `bodyColor` and `useTheme`
- [x] `geometry.test.ts` has the test named in check C18
- [x] Switching theme does not remount any die
- [x] Gate passes: `npm test && npm run build && npm run lint`

**Tests**: unit
**Gate**: build
**Commit**: `feat(themes): theme 3d die colors and numbers`

### T6: Finishes

**What**: Toon, gloss, metal and glass materials, with a room environment for reflections.
**Where**: `src/components/Die.tsx`
**Depends on**: T5
**Reuses**: three's `RoomEnvironment` in `DiceScene.tsx`
**Requirement**: THEME-02

**Done when**:

- [x] Each theme renders with its finish; gold reads as metal and crystal as translucent
- [x] Gate passes: `npm test && npm run build && npm run lint`

**Tests**: none
**Gate**: build
**Commit**: `feat(themes): add die finishes`

### T7: Texture assets

**What**: Download the four CC0 images, resize to at most 512 px and 150 KB, record their licenses, precache jpg.
**Where**: `public/textures/`
**Depends on**: T6
**Reuses**: candidates in spec `## Sources`; `sharp` from `node_modules` if present
**Requirement**: THEME-03

**Done when**:

- [x] `marble.jpg`, `gold.jpg`, `halftone.png`, `sakura.png` exist within the limits and were looked at
- [x] `LICENSES.md` has the source URL and license of each, as read on its own page
- [x] `vite.config.ts` precaches `jpg`
- [x] `textures.test.ts` has the test named in check C28
- [x] Gate passes: `npm test && npm run build && npm run lint`

**Tests**: unit
**Gate**: build
**Commit**: `feat(themes): bundle cc0 dice textures`

### T8: Face textures

**What**: Planar face UVs and the painter for the code patterns and the images, wired into the die material.
**Where**: `src/utils/faceTexture.ts`
**Depends on**: T7
**Reuses**: `CanvasTexture` pattern of `labelTexture`
**Requirement**: THEME-03

**Done when**:

- [ ] `faceTexture.test.ts` has the tests named in checks C19 to C27
- [ ] `geometry.ts` gives every face UVs inside 0..1, covered by the test in check C33
- [ ] Gate passes: `npm test && npm run build && npm run lint`

**Tests**: unit
**Gate**: build
**Commit**: `feat(themes): paint textures on die faces`

### T9: Theme fonts

**What**: Load every theme font from Google Fonts and preload them at startup for offline use.
**Where**: `index.html`
**Depends on**: T8
**Reuses**: the existing Google Fonts link and workbox runtime cache
**Requirement**: THEME-03

**Done when**:

- [ ] Every theme font is in the stylesheet link and loaded at startup
- [ ] Offline after one online load, all 8 themes keep textures and fonts
- [ ] Gate passes: `npm test && npm run build && npm run lint`

**Tests**: none
**Gate**: build
**Commit**: `feat(themes): load theme fonts for offline use`

---

## Checks

**C1** - The catalog holds exactly neon, ivory, marble, gold, crystal, shonen, manga, sakura (THEME-01, AC 1)
Proof: run unit | ✔ C1 offers exactly the eight themes

**C2** - The header button shows the 8 names in the app language with the active one marked (THEME-01, AC 2)
Proof: walk - header button, list in pt-BR and en, active mark

**C3** - Setting a theme updates the current theme and notifies subscribers (THEME-01, AC 3)
Proof: run unit | ✔ C3 setting a theme applies it and notifies

**C4** - Back on the theme screen shows the table (THEME-01, AC 4)
Proof: walk - back button returns to the table

**C5** - Saving writes the id under `dice-theme` (THEME-01, AC 5)
Proof: run unit | ✔ C5 saves the id under dice-theme

**C6** - A store created over saved storage starts on the saved theme (THEME-01, AC 6)
Proof: run unit | ✔ C6 starts on the saved theme

**C7** - A missing or unknown saved value gives neon (THEME-01, AC 7)
Proof: run unit | ✔ C7 falls back to neon

**C8** - Blocked storage neither throws nor stops the session choice (THEME-01, AC 8)
Proof: run unit | ✔ C8 survives blocked storage

**C9** - Neon has the current colors, white on #0B0B10, Russo One, toon, no texture (THEME-01, AC 9)
Proof: run unit | ✔ C9 neon is the current look

**C10** - 3D bodies take the theme color per type (THEME-02, AC 1)
Proof: walk - one of each die under each theme

**C11** - 3D numbers take the theme number color, outline and font (THEME-02, AC 2)
Proof: walk - numbers under each theme

**C12** - 3D dice take the theme finish (THEME-02, AC 3)
Proof: walk - toon, gloss, metal and glass

**C13** - 2D icons take the theme colors and font without texture (THEME-02, AC 4)
Proof: walk - tray, result and history icons under each theme

**C14** - Tray and preset accents take the theme body colors (THEME-02, AC 5)
Proof: walk - tray chips and formula presets under two themes

**C15** - Tens and units d100 colors differ in all themes (THEME-02, AC 6)
Proof: run unit | ✔ C15 d100 keeps two tones

**C16** - Number color against outline is at least 4.5:1 in all themes (THEME-02, AC 7)
Proof: run unit | ✔ C16 numbers keep 4.5 contrast

**C17** - A dropped icon is #5A5A6E under every theme (THEME-02, AC 8)
Proof: run unit | ✔ C17 dropped icons stay grey

**C18** - Die geometry is the same object under any theme, so a theme change replaces no body shape (THEME-02, AC 9)
Proof: run unit | ✔ C18 geometry does not depend on the theme

**C19** - Ivory paints a code grain and requests no image (THEME-03, AC 1)
Proof: run unit | ✔ C19 ivory paints a grain without an image

**C20** - Marble draws /textures/marble.jpg (THEME-03, AC 2)
Proof: run unit | ✔ C20 marble draws its image

**C21** - Gold draws /textures/gold.jpg (THEME-03, AC 3)
Proof: run unit | ✔ C21 gold draws its image

**C22** - Shonen paints speed lines and a radial aura without an image (THEME-03, AC 4)
Proof: run unit | ✔ C22 shonen paints speed lines and aura

**C23** - Manga draws /textures/halftone.png (THEME-03, AC 5)
Proof: run unit | ✔ C23 manga draws its halftone

**C24** - Sakura draws /textures/sakura.png more than once as a pattern (THEME-03, AC 6)
Proof: run unit | ✔ C24 sakura repeats the blossom

**C25** - Neon and crystal have no face texture (THEME-03, AC 7)
Proof: run unit | ✔ C25 neon and crystal stay plain

**C26** - Every textured face is first filled with the body color and the texture never paints opaquely over it (THEME-03, AC 8)
Proof: run unit | ✔ C26 body color shows through

**C27** - With a null image the face is the plain body color (THEME-03, AC 9)
Proof: run unit | ✔ C27 failed image leaves the body color

**C28** - Every bundled image is listed in LICENSES.md with a URL and license, and is at most 150 KB (THEME-03, AC 10)
Proof: run unit | ✔ C28 every texture has a license and fits the size

**C29** - Offline after one online load, all textures and fonts show (THEME-03, AC 11)
Proof: walk - production preview, load once, go offline, switch all themes

**C30** - A late font redraws the numbers (edge case 1)
Proof: walk - first switch to each theme on a throttled load shows the theme font

**C31** - At 360 px the header and theme screen have no horizontal scroll (edge case 2)
Proof: walk - 360 px window

**C32** - A tall theme list scrolls while back stays in view (edge case 3)
Proof: walk - short window

**C33** - Every die has one UV per vertex inside 0..1 (THEME-03, AC 1)
Proof: run unit | ✔ C33 every face has uvs in range

---

## Handoff

**Settled mid-build:** none
**Dispatched:** none
**Walked:** not yet

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 → T2 → T3 → T4
Phase 2:  T5 → T6
Phase 3:  T7 → T8 → T9
```
