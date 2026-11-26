# Shake Animation verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at f6f5933
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `rollState.test.ts` `SHA-01.1 a shake start holds the dice of the roll, one per die` | yes - reducer holds the given roll, one die id per die |
| C2 | `rollState.test.ts` `SHA-01.2 a shake start hides the result on screen and its dice` | yes |
| C3 | walk | yes - `walk/shaking-1.png` shows the four dice low on the table, fully in frame |
| C4 | walk | yes - `walk/shaking-1.png` shows no result, no "ROLANDO…", no ready hint; `Result` returns null while shaking |
| C5 | `shakeGesture.test.ts` `SHA-01.5 with no valid roll set up, shaking starts nothing and rattles nothing` and `SHA-01.5 a strong shake reports start once, then rattles with the force, then rolls` | partly - covers an empty selection only; App gates on `!!notation`, not on a valid roll (F2) |
| C6 | `shakeGesture.test.ts` `SHA-02.1 the push grows with the force, from the minimum at the rattle threshold to the maximum at twice the roll threshold` | partly - `shakeImpulse` is held exactly; replacing `shakeImpulse(force)` with a constant in `useShake.ts` keeps every test green (F3) |
| C7 | `engine.test.ts` `SHA-02.2 while dice are held no impact sound plays; the rattle and the whoosh still do` | partly - the engine flag is held; deleting `sound.setHolding(shaking)` in `App.tsx` keeps every test green (F3) |
| C8 | walk | yes, weakly - `walk/landed.png` shows the dice in the upper half with a result, but the Walked line says `26 = 3 + 6 + 8 + 9` while the picture shows `23 = 3 + 5 + 8 + 7` (F5) |
| C9 | `rollState.test.ts` `SHA-03.2 the throw keeps the roll id and die ids, and the result is read from those dice` | partly - the reducer `throw` is held; `throwShake` in `useRoll.tsx` rebuilt as `startRoll(shaking.notation)` + `roll` (new roll id, new bodies) keeps every test green (F4) |
| C10 | `startRoll.test.ts` `SHA-03.3 held dice launch nothing until thrown, then exactly one whoosh with the roll id` | yes - plus the engine plays one whoosh per roll id |
| C11 | `rollState.test.ts` `SHA-04.1 a weak shake removes the held dice and adds no history`; `shakeGesture.test.ts` `SHA-04.1 a weak shake reports cancel once when it ends, and no roll` | yes |
| C12 | `rollState.test.ts` `SHA-04.2 a weak shake ends on the ready screen, not on the result shown before it` | yes |
| C13 | `rollState.test.ts` `SHA-04.3 the roll button drops the held dice and its roll replaces them`; `shakeGesture.test.ts` `SHA-04.3 a view change or a button roll mid-shake reports cancel, and no later roll` | no - each half passes alone, but together they wipe the button's roll (F1) |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| F1 (Major, C13): tapping ROLAR! mid-shake wipes the button's roll. The button's `roll` makes `rolling` true, so on the next motion sample the handler sees `canRoll` false and calls `cancel`. `cancelShake` then sets `active: null` without condition, so the button's dice vanish after their whoosh and nothing reaches the history | Throwaway test at HEAD: `shake(2d6)` -> `roll(1d20)` -> handler with `canRoll` false -> `cancelShake` leaves `active` = null. The C13 reducer test never applies `cancelShake` after `roll`, and the handler test expects `cancel` on a button roll | make `cancelShake` a no-op when `state.shaking` is null (return `state`), or clear only `shaking`. Add a test: shake -> roll -> cancelShake keeps `active` = the button roll | |
| F2 (Minor, C5): a non-empty but invalid selection still rattles. `canShakeRoll` gets `!!notation`. With more than 30 bodies (e.g. 10d4+10d6+10d8+1d10, which the tray allows at 10 per die), `buildRoll` returns null, yet the handler calls start, rattle and roll | Throwaway test at HEAD: notation `10d4+10d6+10d8+1d10`, `buildRoll` -> null, handler calls -> `start,rattle,roll` | pass `!!buildRoll(notation)` or `!!parse(notation)` as `hasRoll`, and test an over-cap selection | |
| F3 (Minor, C6, C7): the wiring to the rule is not tested. The push size and the contact mute live only in `useShake.ts` and `App.tsx`, and the walk does not judge either one | Mutations kept 67/67 green: `shakeImpulse(force)` -> `shakeImpulse(0)` in `useShake.ts`; `sound.setHolding(shaking)` effect deleted from `App.tsx` | move the rattle-to-push mapping into `createShakeHandler`'s rattle payload (or a tested helper), and move the holding flag into a tested seam (e.g. engine fed from the roll state), or walk-record push strength and silent contacts | |
| F4 (Minor, C9): the hook can throw a different roll and no test fails. The throw path in `useRoll.tsx` is not tested | Mutation in `throwShake`: `startRoll(shaking.notation, sound.launch)` + `{type:'roll'}` (new id, new dice) kept 67/67 green | extract the throw as a pure step (e.g. `throwShake(state, launch)` returning the next state) and test that it keeps the held roll's id and die ids | |
| F5 (Cosmetic, C8): the walk evidence contradicts itself. The Walked line says `RESULTADO 26 = 3 + 6 + 8 + 9`, but `walk/landed.png` shows `23 = 3 + 5 + 8 + 7`. "Same four dice" cannot be read from the screenshots | `tasks.md` Walked bullet for SHA-03.1 vs `walk/landed.png` | re-walk and record the text that matches the screenshot (e.g. roll id before and after the throw) | |
