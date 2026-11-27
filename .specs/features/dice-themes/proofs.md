# dice-themes proofs

**HEAD**: c54efb3
**Tree**: dirty - package.json
**Shell**: /bin/sh
**Result**: 35 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✔ C1 offers exactly the eight themes` | pass |
| C2 | `walk - header button, list in pt-BR and en, active mark` | pass (Walked) |
| C3 | `run unit / ✔ C3 setting a theme applies it and notifies` | pass |
| C4 | `walk - back button returns to the table` | pass (Walked) |
| C5 | `run unit / ✔ C5 saves the id under dice-theme` | pass |
| C6 | `run unit / ✔ C6 starts on the saved theme` | pass |
| C7 | `run unit / ✔ C7 falls back to neon` | pass |
| C8 | `run unit / ✔ C8 survives blocked storage` | pass |
| C9 | `run unit / ✔ C9 neon is the current look` | pass |
| C10 | `walk - one of each die under each theme` | pass (Walked) |
| C11 | `walk - numbers under each theme` | pass (Walked) |
| C12 | `walk - toon, gloss, metal and glass` | pass (Walked) |
| C13 | `walk - tray, result and history icons under each theme` | pass (Walked) |
| C14 | `walk - tray chips and formula presets under two themes` | pass (Walked) |
| C15 | `run unit / ✔ C15 d100 keeps two tones` | pass |
| C16 | `run unit / ✔ C16 numbers keep 4.5 contrast` | pass |
| C17 | `run unit / ✔ C17 dropped icons stay grey` | pass |
| C18 | `run unit / ✔ C18 geometry does not depend on the theme` | pass |
| C19 | `run unit / ✔ C19 ivory paints a grain without an image` | pass |
| C20 | `run unit / ✔ C20 marble draws its image` | pass |
| C21 | `run unit / ✔ C21 gold draws its image` | pass |
| C22 | `run unit / ✔ C22 shonen paints speed lines and aura` | pass |
| C23 | `run unit / ✔ C23 manga draws its halftone` | pass |
| C24 | `run unit / ✔ C24 sakura repeats the blossom` | pass |
| C25 | `run unit / ✔ C25 neon and crystal stay plain` | pass |
| C26 | `run unit / ✔ C26 body color shows through` | pass |
| C27 | `run unit / ✔ C27 failed image leaves the body color` | pass |
| C28 | `run unit / ✔ C28 every texture has a license and fits the size` | pass |
| C29 | `walk - production preview, load once, go offline, switch all themes` | pass (Walked) |
| C30 | `walk - first switch to each theme on a throttled load shows the theme font` | pass (Walked) |
| C31 | `walk - 360 px window` | pass (Walked) |
| C32 | `walk - short window` | pass (Walked) |
| C33 | `run unit / ✔ C33 every face has uvs in range` | pass |
| Build | `npm run build` | pass |
| Build | `npm run lint` | pass |

## Output

`Run unit` - exit 0

```
✔ C5 saves the id under dice-theme (0.245808ms)
✔ C7 falls back to neon (0.134432ms)
✔ C8 survives blocked storage (0.286771ms)
✔ C9 neon is the current look (0.24438ms)
✔ C15 d100 keeps two tones (0.164824ms)
✔ C16 numbers keep 4.5 contrast (0.364767ms)
✔ C17 dropped icons stay grey (0.23518ms)
ℹ tests 101
ℹ suites 0
ℹ pass 101
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 489.135099
```
