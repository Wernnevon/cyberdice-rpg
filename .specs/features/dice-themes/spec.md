# Dice Themes Specification

**Approved**: 2026-11-26 - user: "aprovo, pode commitar e seguir sem parar entre as tarefas"

## Problem Statement

Every die looks the same on every device: colors per die type, a toon material, one number font and no texture, all hardcoded. The user wants to personalize the dice with ready-made themes, including classic dice materials and anime-inspired looks.

## Goals

- [ ] The user switches between 8 dice themes in two taps, and the choice survives a reload.
- [ ] The 3D dice and the 2D icons match under every theme, with readable numbers.
- [ ] Every theme works offline after the first online load.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Per-die-type or free color editor | The user chose ready-made themes |
| Mixing body color, number color, finish, font or texture from different themes | Each theme bundles all five |
| Textures on the 2D icons | The user chose colors and font only |
| App UI colors and fonts (header, buttons, background) | Only the dice, their icons and the dice accents change |
| Licensed anime characters, logos or franchise art | Copyright |
| Uploading user images | Not requested |
| Sound per theme | Excluded by roll-sounds and sound-polish |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| What a theme sets | Body colors, number color and outline, finish, number font, texture | User: "Cor do corpo, Cor dos números, Acabamento, Fonte dos números" plus textures; "Temas prontos" | y |
| Themes | neon (current look, default), ivory, marble, gold, crystal, shonen, manga, sakura | User: "Clássicos, Metal e gema, Anime shonen, Anime mangá + sakura" | y |
| Texture sources | CC0 images for marble, gold, manga halftone and cherry blossom; ivory, shonen speed lines and aura, and the sakura repetition are drawn by code | User: "Procura imagens na net com direito de uso livre", then "Híbrido" | y |
| Where it applies | 3D dice, 2D icons, tray accents and formula preset accents | User: "3D e ícones" | y |
| What icons copy | Body color, number color and font; no texture | User: "Cores e fonte" | y |
| Color per die type | Each theme decides: ivory, marble, gold and manga use one body color; neon, crystal, shonen and sakura vary by type; d100 always has two tones | User: "Cada tema decide" | y |
| Entry point | A header button opens a theme screen; one tap applies | User: "Botão no topo" | y |
| Persistence | localStorage key `dice-theme` | User: "Sim, salvar"; recorded as AD-003 | y |
| Preview in the theme screen | Each option shows its name, theme-colored die icons and a swatch of its texture | Live 3D previews cost a canvas per theme on a phone | n |
| Finishes | toon (neon, ivory, shonen, manga, sakura), gloss (marble), metal (gold), glass (crystal, plain transparency, no refraction) | Refraction is too heavy for phones | n |
| Switching during a roll | Allowed; only the look changes | The theme screen opens like History, which is open during a roll too | n |
| Texture image size | At most 512 px and 150 KB each | Keeps the offline cache small | n |
| Image license | CC0 or public domain only, source URL and license recorded in `public/textures/LICENSES.md` | No in-app credit needed | n |
| Remaining dimensions | Auth, rate limits, concurrency, idempotency, expiry and observability are N/A: one local choice, no server | - | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Pick a theme ⭐ MVP

**User Story**: As a player, I want to pick a dice theme so that my dice look the way I like.

**Acceptance Criteria**:

1. The system SHALL offer exactly these themes: neon, ivory, marble, gold, crystal, shonen, manga and sakura.
2. WHEN the user taps the dice theme button in the header THEN the system SHALL show a screen listing the 8 themes by name, in the app language, with the active one marked.
3. WHEN the user taps a theme on that screen THEN the system SHALL mark it as active and apply it without a reload.
4. WHEN the user taps back on the theme screen THEN the system SHALL show the table.
5. WHEN a theme is chosen THEN the system SHALL save its id in localStorage under `dice-theme`.
6. WHEN the app starts with a saved theme id THEN the system SHALL apply that theme.
7. IF the saved value is missing or is not one of the 8 ids THEN the system SHALL apply neon.
8. IF localStorage is blocked THEN the system SHALL apply the chosen theme for the session without an error.
9. WHILE neon is active the system SHALL draw the dice with the current colors: d4 #FF2E4D, d6 #FFD60A, d8 #22D3EE, d10 #A855F7, d12 #FF7A1A, d20 #FF3FD8, d100 units #3DFF8B and tens #178F4A, white numbers with #0B0B10 outline, Russo One, toon finish and no texture.

**Independent Test**: Pick ivory, reload, see ivory still active.

---

### P1: The theme dresses the dice ⭐ MVP

**User Story**: As a player, I want each theme to change colors, numbers, finish and font everywhere dice appear so that the table looks coherent.

**Acceptance Criteria**:

1. WHEN a theme is active THEN the system SHALL draw each 3D die with that theme's body color for its type.
2. WHEN a theme is active THEN the system SHALL draw the 3D numbers with that theme's number color, outline color and font.
3. WHEN a theme is active THEN the system SHALL draw the 3D dice with that theme's finish: toon, gloss, metal or glass.
4. WHEN a theme is active THEN the system SHALL draw the 2D die icons with that theme's body color, number color, outline color and font, without texture.
5. WHEN a theme is active THEN the system SHALL color the tray accents and the formula preset accents with that theme's body colors.
6. The system SHALL give the d100 tens die a body color different from the d100 units die in all 8 themes.
7. The system SHALL give every theme a contrast of at least 4.5:1 between the number color and its outline color.
8. WHILE a die icon is in the dropped state the system SHALL keep it grey.
9. WHEN the theme changes while dice are on the table THEN the system SHALL keep their values and positions.

**Independent Test**: Roll one of each die, switch through the themes, compare 3D dice with the tray icons.

---

### P1: Textures ⭐ MVP

**User Story**: As a player, I want classic and anime-inspired textures so that a theme is more than a color swap.

**Acceptance Criteria**:

1. WHILE ivory is active the system SHALL draw a code-generated ivory grain on every die face.
2. WHILE marble is active the system SHALL draw the CC0 marble image on every die face.
3. WHILE gold is active the system SHALL draw the CC0 gold image on every die face.
4. WHILE shonen is active the system SHALL draw code-generated speed lines with an energy aura on every die face.
5. WHILE manga is active the system SHALL draw the CC0 halftone image on every die face.
6. WHILE sakura is active the system SHALL draw a pattern built from the CC0 cherry blossom on every die face.
7. WHILE crystal or neon is active the system SHALL draw the die faces without texture.
8. WHILE a textured theme tints its faces the system SHALL keep each die type's body color visible through the texture.
9. IF a texture image fails to load THEN the system SHALL draw the die in the theme's body color.
10. The system SHALL record the source URL and license of every bundled texture image in `public/textures/LICENSES.md`.
11. WHEN the app is offline after one online load THEN the system SHALL show the textures and number fonts of all 8 themes.

**Independent Test**: Load online once, go offline, switch through all themes.

---

## Edge Cases

- IF a number font has not arrived when a die is drawn THEN the system SHALL redraw the number once the font loads.
- WHEN the window is 360 px wide THEN the system SHALL show the header buttons and the theme screen without horizontal scroll.
- WHEN the theme list is taller than the window THEN the system SHALL scroll the list while the back button stays in view.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| THEME-01 | P1: Pick a theme | Execute | Implementing |
| THEME-02 | P1: The theme dresses the dice | Execute | Implementing |
| THEME-03 | P1: Textures | Execute | Implementing |

---

## Sources

- User answers in the planning conversation (2026-11-26) - scope, themes, textures, entry point, persistence.
- https://ambientcg.com/view?id=Marble012 - marble candidate, CC0.
- https://ambientcg.com/view?id=Metal042A - gold candidate, CC0.
- https://openclipart.org/detail/254943/grunge-halftone-2 - halftone candidate, CC0.
- https://openclipart.org/detail/347864/cherry-blossoms - cherry blossom candidate, CC0.

---

## Success Criteria

- [ ] All 8 themes are selectable on a phone and keep numbers readable.
- [ ] The chosen theme is still active after reopening the app.
