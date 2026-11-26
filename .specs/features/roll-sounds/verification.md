# Roll Sounds verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at 06b0f65
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `engine.test.ts` `SND-01.1 an impact at or above the minimum plays exactly one sample` | yes at the engine; the Die collision wiring has no test and a die-die hit plays two samples (F6) |
| C2 | `sound.test.ts` `SND-01.2 gain grows with impact from the floor gain to a cap of 1` | no - asserts "between floor and 1" and monotonic, not proportional; a squared curve passes (F5) |
| C3 | `sound.test.ts` `SND-01.3 an impact below the minimum plays no sound` | yes - `MIN_IMPACT - 0.01` and 0 return null; `>` vs `>=` is pinned by C2's `impactGain(MIN_IMPACT) === FLOOR_GAIN` |
| C4 | `sound.test.ts` `SND-01.4 impacts beyond the per-window limit are dropped` | no - tests `createLimiter` alone; the engine can stop calling it and every test stays green (F2); a burst straddling a window edge plays 11 impacts in 1 ms (F7) |
| C5 | `engine.test.ts` `SND-02.1 a roll plays exactly one reveal sound` | no - asserts `played.length > 0`, not one sound; playing the tone twice passes (F4) |
| C6 | `sound.test.ts` `SND-02.2 no kept natural 20 or 1 on a d20 picks the plain reveal` | yes - includes max/1 on non-d20 dice |
| C7 | `sound.test.ts` `SND-03.1 a kept natural 20 on a d20 picks the crit` | no - proves `revealSound()` only; the engine can play the plain tone for a crit, or both, and no test fails (F3) |
| C8 | `sound.test.ts` `SND-03.2 a kept natural 1 with no kept 20 picks the fail` | no - same gap as C7: what reaches the speakers is not asserted (F3) |
| C9 | `sound.test.ts` `SND-03.3 dropped d20 rolls do not choose the sound` | yes - both dropped-20 and dropped-1 cases; own example dropped 20 + kept 1 returns `fail` at HEAD |
| C10 | walk (tasks.md `**Walked:**`, SND-04.1) | yes - initial `aria-pressed="true"` + speaker-waves icon, after tap `aria-pressed="false"` + X icon, stored value, reload restores; adequate for a header toggle |
| C11 | `engine.test.ts` `SND-04.2 while muted no impact, reveal, crit or fail plays` | yes - `played` is empty for impact, reveal, crit and fail; unmute restores |
| C12 | `sound.test.ts` `SND-04.3 the mute choice is saved and restored` | yes - round trip true and false through one store; reopen covered by the walk's reload |
| C13 | `sound.test.ts` `SND-04.4 missing or unreadable storage starts with sound on` | yes - undefined store, empty, garbage, throwing get/set; App guards `window.localStorage` access itself |
| C14 | `engine.test.ts` `SND-05.1 navigator.audioSession becomes ambient when present` | yes |
| C15 | `engine.test.ts` `SND-05.2 the first gesture unlocks audio so the first roll is heard` | no - the fake `resume()` always succeeds, so the test cannot see that App unlocks on `pointerdown`, which is not a user activation for touch; the walk used a desktop mouse (F1) |
| C16 | `npm run build` + `dist/sw.js` grep for `sounds/die-[1-4].m4a` | yes - fails if the `m4a` glob is removed |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| F1 (Major, C15) First roll on a phone is likely silent: audio is unlocked on `pointerdown`, which for touch is not an activation-triggering event (HTML spec: `pointerdown` only when `pointerType` is mouse; touch activates on `pointerup`/`touchend`). iOS needs `touchend`/`click` to start Web Audio; Chrome Android leaves a context created before activation suspended | `src/App.tsx:43` listens only to `pointerdown`; `engine.test.ts` fake `resume()` sets `running` unconditionally; walk was Chrome desktop with a mouse, iPhone "not walked" | unlock on `pointerup`/`touchend`/`click` (and `keydown` for the Space shortcut) as well as `pointerdown`, or call `sound.unlock()` from the roll button's click handler; put the event list where a test reaches it and walk the first roll on a phone | 55de9a7 |
| F2 (Major, C4) The engine's use of the limiter is untested | mutation: `if (gain === null \|\| !allow(now))` -> `if (gain === null)` in `engine.ts`; all 14 sound/engine tests pass | engine test: unlock, fire `PER_WINDOW + 3` impacts at the same `now`, assert exactly `PER_WINDOW` samples played | 9d9d295 |
| F3 (Major, C7, C8) Crit and fail "instead of the plain reveal" is never asserted on what plays; tests check `revealSound()` and the engine's return value only | mutations in `engine.reveal`: `tone(ctx, "reveal")` for every result, and `tone(ctx, "reveal"); if (kind !== "reveal") tone(ctx, kind)`; both pass all tests | have the fake record oscillator `type` and frequencies; assert a crit roll plays the crit notes and none of the reveal notes, same for fail | 9d9d295 |
| F4 (Minor, C5) "Exactly one reveal sound" asserted as "some tones played" | mutation: `tone(ctx, kind); tone(ctx, kind);` passes; `engine.test.ts` asserts `tones > 0` | assert the tone count equals one reveal's note count (2), or record sounds per `tone()` call and assert one | 9d9d295 |
| F5 (Minor, C2) "Gain proportional to force" asserted only as monotonic and between floor and 1 | mutation: `FLOOR_GAIN + (1 - FLOOR_GAIN) * t * t` passes | assert `impactGain((MIN_IMPACT + MAX_IMPACT) / 2) === (FLOOR_GAIN + 1) / 2` | 30bc8ef |
| F6 (Minor, C1) A die-die hit plays two samples, not one; the collision wiring has no test | `@react-three/rapier` calls `onCollisionEnter` on both bodies (`react-three-rapier.esm.js:979,983`); `Die.tsx:84` plays from each die at its own speed, so both play when both move above `MIN_IMPACT`, and both count against the limiter. Impact "force" is the die's last-frame linear speed | play one sample per die-die pair (e.g. only from the body whose handle is lower, at the larger speed) and move that rule into `src/utils` or the engine where a test reaches it | fb4d905 |
| F7 (Minor, C4) Fixed window lets a burst through at a window edge | own example at HEAD: `allow(0)`, `allow(99)` x5, `allow(100)` x6 -> 12 of 12 allowed, 11 within 1 ms; the spec says no more than the limit "within one 100 ms window" | use a sliding window (timestamps of the last `PER_WINDOW` plays) and test the straddling burst, or state the fixed-window reading in the spec | cf045c5 |
