# Dice Themes verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at 21bc6f3
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `themes.test.ts` `C1 offers exactly the eight themes` | yes |
| C2 | walk (`**Walked:**` line): header button, pt-BR and en, active mark | yes - per the record, not re-walked |
| C3 | `themeStore.test.ts` `C3 setting a theme applies it and notifies` | yes |
| C4 | walk (`**Walked:**` line): back shows the table | yes - per the record |
| C5 | `themes.test.ts` `C5 saves the id under dice-theme` | yes |
| C6 | `themeStore.test.ts` `C6 starts on the saved theme` | yes |
| C7 | `themes.test.ts` `C7 falls back to neon` | yes |
| C8 | `themes.test.ts` `C8 survives blocked storage` | no - asserts no throw only, not the session choice |
| C9 | `themes.test.ts` `C9 neon is the current look` | yes |
| C10 | walk (`**Walked:**` line): 3D colors under all 8 | yes - per the record |
| C11 | walk (`**Walked:**` line): numbers under all 8, fixed after the walk found them washed out | yes - per the record |
| C12 | walk (`**Walked:**` line): finishes under all 8 | yes - per the record |
| C13 | walk (`**Walked:**` line): tray and result icons under all 8; history only under sakura | no - history icons not walked under each theme |
| C14 | walk (`**Walked:**` line): tray and formula accents | yes - per the record |
| C15 | `themes.test.ts` `C15 d100 keeps two tones` | yes |
| C16 | `themes.test.ts` `C16 numbers keep 4.5 contrast` | yes |
| C17 | `themes.test.ts` `C17 dropped icons stay grey` | yes - at the pure-rule layer |
| C18 | `geometry.test.ts` `C18 geometry does not depend on the theme` | no - never changes the theme |
| C19 | `faceTexture.test.ts` `C19 ivory paints a grain without an image` | no - does not observe image requests |
| C20 | `faceTexture.test.ts` `C20 marble draws its image` | yes |
| C21 | `faceTexture.test.ts` `C21 gold draws its image` | yes |
| C22 | `faceTexture.test.ts` `C22 shonen paints speed lines and aura` | no - asserts the gradient is created, not painted |
| C23 | `faceTexture.test.ts` `C23 manga draws its halftone` | yes |
| C24 | `faceTexture.test.ts` `C24 sakura repeats the blossom` | yes |
| C25 | `faceTexture.test.ts` `C25 neon and crystal stay plain` | yes |
| C26 | `faceTexture.test.ts` `C26 body color shows through` | yes - accepts `multiply` at any alpha, as the design allows |
| C27 | `faceTexture.test.ts` `C27 failed image leaves the body color` | yes |
| C28 | `textures.test.ts` `C28 every texture has a license and fits the size` | yes - checks the images the themes reference, today all 4 in the folder |
| C29 | walk (`**Walked:**` line): server killed, 4 textures and 8 fonts loaded | yes - per the record |
| C30 | walk (`**Walked:**` line): record says the load was not throttled | no - the late-font case was never exercised |
| C31 | walk (`**Walked:**` line): 360/360, no horizontal scroll | yes - per the record |
| C32 | walk (`**Walked:**` line): 360x420, list scrolled, back stayed at top 12 | yes - per the record |
| C33 | `geometry.test.ts` `C33 every face has uvs in range` | yes |

## Findings

Mutations ran on a scratch copy of `src/` and `public/` with all `src/utils/*.test.ts`. The copy and the throwaway test were removed. No product defect was reproduced.

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| C8's proof does not hold "nor stops the session choice" | Making `set` re-read blocked storage leaves C8 green. Only the unlisted `blocked storage keeps the choice for the session` fails | select that test in C8's proof, or move its assertions into the C8 test | 1d78186 |
| C19 does not hold "requests no image" | Changing `faceTexture` so code themes call `loadImage` leaves all tests green. The test only calls `paintFace` with a null image | call `faceTexture` for ivory with stub `document` and `Image`, assert no `Image` is built | 1d78186 |
| C22 stays green with no aura | Deleting `ctx.fillStyle = aura; ctx.fillRect(...)` leaves all tests green. `faceTexture.test.ts` asserts only that `createRadialGradient` was called | assert a `fillRect` whose style is the returned gradient | 1d78186 |
| The repaint after a late texture image has no test and no check (AC "SHALL draw the CC0 image") | Removing `paintFace` from the `load` listener leaves all tests green: faces would stay plain whenever the image is not ready at first draw | stub `Image`, fire `load`, assert `drawImage` and a new `tex.version` | 1d78186 |
| C18 cannot catch a theme change replacing a die or its shape (AC "keep values and positions") | `geometry.test.ts` never changes the theme; it checks arity, repeated-call identity and no `color` field. The remount risk is in `Die.tsx`, layer `none`. The Walked line reports the result unchanged across 8 themes, but not positions | prove AC 9 by a walk that also records positions across a switch | 1d78186 |
| C30 is reported `pass (Walked)` without its stated condition | Walked line: "late-font redraw was not throttled". A first switch cannot show a late font, since `main.tsx` preloads all 8. At HEAD a throwaway test with a delayed `fonts.load` did redraw both pending labels | walk it with the font request delayed, or prove it with that unit test | 1d78186 |
| C13 claims history icons under each theme; only one was walked | Walked line: "History under sakura was captured" | walk history under the other themes | 1d78186 |

## Own examples

All run at HEAD as one throwaway test (4 pass).

- Saved id: `' ivory'`, `'ivory '`, `'toString'`, `'__proto__'`, `'null'` and a 100000-char string all give neon; each of the 8 ids is restored.
- Late image: ivory and shonen build no `Image`; two sakura colors share one `Image`, draw nothing before `load`, and both repaint after it.
- Late font: two pending gold labels both redraw when the load resolves.
- d100: tens differs from units through `bodyColor(theme, 10, role)` in all 8.

## Notes

- The `sakura.png` source in `public/textures/LICENSES.md` (openclipart 213934) differs from the candidate in the spec's Sources (347864). The license was not checked online.
