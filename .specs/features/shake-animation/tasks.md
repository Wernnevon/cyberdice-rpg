# Shake Animation Tasks

**Spec:** `.specs/features/shake-animation/spec.md`
**Status:** Changed (T7, T8 added for SHA-05)
**Approved**: 2026-11-26 - user: "aprovo" (SHA-05 change)
**Approved**: 2026-11-26 - user: "aprovo as tasks, pode mandar ver"

**Build**: `npm run build && npm run lint`

## Gate Check Commands

| Level | Command |
| --- | --- |
| quick | `npm test` |
| build | `npm run build && npm run lint && npm test` |

## Design (inline)

- **Roll state** moves from `useRoll.tsx` into pure `src/utils/rollState.ts` (lesson L-003). It gains `shaking: ActiveRoll | null` and three actions: `shake` (sets `shaking`, hides `active`), `throw` (`shaking` becomes `active` with the same ids), `cancelShake` (clears both, so the table shows the ready screen). `roll` clears `shaking`.
- **Gesture events**: `createShakeHandler` also reports `start` (first rattle of a gesture) and `cancel` (gesture ended with no roll, or `canRoll` turned false mid-gesture), and passes the motion force to `rattle`. `canShakeRoll` also needs a valid roll.
- **Impulse**: pure `shakeImpulse(force)` in `shakeGesture.ts`, minimum at the rattle threshold, maximum at 2x the roll threshold.
- **Silent contacts**: the engine gets `setHolding(on)`; while on, `impact()` plays nothing and `rattle()` still plays.
- **Physics**: `DiceScene` renders `shaking ?? active` dice and, while shaking, an invisible box of fixed colliders along the bottom edge. `Die` takes a `phase` (`hold` | `thrown`): in `hold` it spawns inside the box, gets pushed by a `shakePush` event with `shakeImpulse` size, and never settles; on `thrown` it gets the throw velocity toward the top and starts settling.

## Execution Plan

Phase 1 (rules): T1, T2, T3, T4, independent. Phase 2 (wiring): T5 after T1, T2, T3, T4. Phase 3 (physics): T6 after T5. Six tasks, one batch, executed inline.

## Task Breakdown

### T1: Roll state with a shaking phase

**What**: move the reducer to `src/utils/rollState.ts` and add `shake`, `throw`, `cancelShake`; `roll` clears `shaking`; `useRoll.tsx` imports it unchanged in behaviour.
**Where**: `src/utils/rollState.ts`, `src/utils/rollState.test.ts`, `src/hooks/useRoll.tsx`
**Depends on**: none
**Requirements**: SHA-01, SHA-03, SHA-04
**Tests**: unit
**Gate**: quick
**Done when**: C1, C2, C9, C11, C12, C13 pass.
**Status**: ✅ Complete

### T2: Build a roll without launching it, throw it with one whoosh

**What**: `startRoll.ts` gains `buildRoll(notation)` (no launch) and `throwRoll(roll, launch)` (launches once with the roll's id); `startRoll` uses both.
**Where**: `src/utils/startRoll.ts`, `src/utils/startRoll.test.ts`
**Depends on**: none
**Requirements**: SHA-03
**Tests**: unit
**Gate**: quick
**Done when**: C10 passes and the SPL-04.1 tests still pass.
**Status**: ✅ Complete

### T3: Gesture start, cancel, force and impulse

**What**: `createShakeHandler` reports `start` and `cancel` and passes the force to `rattle`; `canShakeRoll(view, rolling, hasRoll)`; `shakeImpulse(force)`.
**Where**: `src/utils/shakeGesture.ts`, `src/utils/shakeGesture.test.ts`, `src/App.tsx` (passes `hasRoll`, so the build stays green; the no-dice rattle fix lands here)
**Depends on**: none
**Requirements**: SHA-01, SHA-02, SHA-04
**Tests**: unit
**Gate**: quick
**Done when**: C5, C6, C13 pass and the SPL-05 tests still pass.
**Status**: ✅ Complete

### T4: Silent contacts while holding

**What**: engine `setHolding(on)`: impacts play nothing while on; rattle and whoosh unaffected.
**Where**: `src/audio/engine.ts`, `src/audio/engine.test.ts`
**Depends on**: none
**Requirements**: SHA-02
**Tests**: unit (fake AudioContext)
**Gate**: quick
**Done when**: C7 passes.
**Status**: ✅ Complete

### T5: Wire the shake phase into the app

**What**: `useRoll` exposes `shake`, `throwShake` (dispatch `throw` + `throwRoll` whoosh), `cancelShake`; `useShake` forwards start, rattle force, roll and cancel; `App` sets the engine's holding flag while shaking and passes `hasRoll`; `Result` shows nothing while shaking.
**Where**: `src/hooks/useRoll.tsx`, `src/hooks/useShake.ts`, `src/App.tsx`, `src/components/Result.tsx`
**Depends on**: T1, T2, T3, T4
**Requirements**: SHA-01, SHA-03, SHA-04
**Tests**: none (rules in T1-T4; the wiring in the walk)
**Gate**: build
**Done when**: the build passes; a synthetic weak shake in the browser shows the ready screen after it ends.
**Status**: ✅ Complete

### T6: Dice held, pushed and thrown in 3D

**What**: `DiceScene` renders the shaking dice and the holding box; `Die` gets `phase`, spawns in the box, is pushed by `shakePush` events with `shakeImpulse`, never settles while held, and is thrown toward the top on `thrown`.
**Where**: `src/components/DiceScene.tsx`, `src/components/Die.tsx`
**Depends on**: T5
**Requirements**: SHA-01, SHA-02, SHA-03
**Tests**: none (physics in the browser; screenshots in the walk)
**Gate**: build
**Done when**: the walk's screenshots show the dice in the bottom area while shaking and spread over the table after the throw.
**Status**: ✅ Complete

### T7: Push direction from the phone's motion

**What**: `shakeGesture.ts` gains `pushDirection(ax, ay, random)`: the unit screen-plane vector of the phone's motion (side-to-side `ax`, up-down `ay`), random when both are zero; `createShakeHandler` takes `ax`, `ay` per sample and hands `rattle` the direction with the push size. The push size becomes a speed change (m/s), tuned up so dice cross the table.
**Where**: `src/utils/shakeGesture.ts`, `src/utils/shakeGesture.test.ts`, `src/hooks/useShake.ts` (passes the motion's x/y, required by the new handler signature)
**Depends on**: T3
**Requirements**: SHA-05
**Tests**: unit
**Gate**: quick
**Done when**: C15, C16 pass and the SHA-01.5, SHA-02.1, SHA-04 and SPL-05 tests still pass.
**Status**: ✅ Complete

### T8: Dice loose on the whole table, pushed along the shake

**What**: `DiceScene` drops the bottom box and puts a low lid over the whole table while dice are held; `Die` applies each push along the given direction as a speed change scaled by its mass, with a little per-die spread; `useShake` passes the motion's `x`/`y` to the handler.
**Where**: `src/components/DiceScene.tsx`, `src/components/Die.tsx`, `src/hooks/useShake.ts`
**Depends on**: T7
**Requirements**: SHA-05
**Tests**: none (physics in the browser; screenshots in the walk)
**Gate**: build
**Done when**: walk screenshots show held dice away from the bottom edge, at the side the synthetic shake pushes them to, and a diagonal shake moves them diagonally.
**Status**: ✅ Complete

## Test Coverage Matrix

| Requirement | Criteria | Test type | Task |
| --- | --- | --- | --- |
| SHA-01 | 1, 2, 5 unit; 3, 4 walk | unit, walk | T1, T3, T5, T6 |
| SHA-02 | 1, 2 | unit | T3, T4 |
| SHA-03 | 2, 3 unit; 1 walk | unit, walk | T1, T2, T6 |
| SHA-04 | 1, 2, 3 | unit | T1, T3 |
| SHA-05 | 2, 3 unit; 1, 4 walk | unit, walk | T7, T8 |

## Checks

**Run unit**: `npm test`

**C1** - A shake start holds the roll's dice, one per die (SHA-01, AC 1)
Proof: run unit | SHA-01.1

**C2** - A shake start hides the result on screen and its dice (SHA-01, AC 2)
Proof: run unit | SHA-01.2

**C3** - The held dice stay inside the bottom holding area (SHA-01, AC 3)
Proof: walk

**C4** - While shaking, no result, no "ROLANDO…" and no ready hint (SHA-01, AC 4)
Proof: walk

**C5** - No valid roll: no dice and no rattle (SHA-01, AC 5)
Proof: run unit | SHA-01.5

**C6** - The push grows with the force, min at the rattle threshold, max at 2x the roll threshold (SHA-02, AC 1)
Proof: run unit | SHA-02.1

**C7** - No impact sound from contacts while holding (SHA-02, AC 2)
Proof: run unit | SHA-02.2

**C8** - The held dice are thrown toward the top (SHA-03, AC 1)
Proof: walk

**C9** - The throw keeps the roll id and die ids (SHA-03, AC 2)
Proof: run unit | SHA-03.2

**C10** - The throw plays exactly one whoosh (SHA-03, AC 3)
Proof: run unit | SHA-03.3

**C11** - A weak shake removes the dice and adds no history (SHA-04, AC 1)
Proof: run unit | SHA-04.1

**C12** - A weak shake ends on the ready screen, not the old result (SHA-04, AC 2)
Proof: run unit | SHA-04.2

**C13** - The button or a view change drops the held dice (SHA-04, AC 3)
Proof: run unit | SHA-04.3

**C14** - Held dice move over the whole table and bounce off its four edges, under a low lid (SHA-05, AC 1)
Proof: walk

**C15** - The push follows the phone's screen-plane motion, diagonals included (SHA-05, AC 2)
Proof: run unit | SHA-05.2

**C16** - No screen-plane motion: a random direction (SHA-05, AC 3)
Proof: run unit | SHA-05.3

**C17** - Each push changes a die's speed by the push size, whatever its mass (SHA-05, AC 4; superseded by AC 5, now proven by C18's test: the push sets a velocity, so mass plays no part)
Proof: run unit | SHA-05.5

**C18** - A push sets a slowed held die's sideways velocity to the push size along the shake; a die still flying keeps flying (SHA-05, AC 5)
Proof: run unit | SHA-05.5

**C19** - Held dice bounce keeping at least 90 % of their speed, almost no friction; thrown dice back to normal (SHA-05, AC 6)
Proof: walk

## Handoff

**Dispatched:** Verifier (validate.md) over HEAD f6f5933, 2026-11-26 - returned (FAIL, 5 findings); Verifier (validate.md, SHA-05 change) over HEAD 29382ed, 2026-11-26 - returned (FAIL, 4 findings: F6-F9); Verifier (validate.md, C18-C19) over HEAD 473028e, 2026-11-26 - returned (FAIL, 2 findings: F10-F11)
**Settled mid-build:** 2026-11-26 - user, after testing SHA-05: "muito lento o dado percorre pouco a tela ele ta muito preso, quase ns e move minha intençãoe ra fazer ele parecer aquelas bolas malucas quicando por toda a tela" -> SHA-05.5 (push sets the sideways velocity) and SHA-05.6 (bouncy-ball restitution, almost no friction while held), push size 4-14 m/s; checks C18, C19.
**Walked:** 2026-11-26 (re-walked after the verifier fixes at 783ef56), headless Chrome 390x844 over CDP on `npx vite --host --port 5173` (HTTPS, cert ignored), fresh profile, Web Audio instrumented (sample playback rates, whoosh, oscillators).
- SHA-01.1/01.3/01.4 (C3, C4): add d6, d6, d8 to the default d20, tap "Agitar para rolar: desligado", synthetic `devicemotion` alternating 20/2 m/s² for 40 steps. `walk/shaking-1.png`: four dice (2 d6, d8, d20) inside the bottom strip, fully in frame; `main` text is empty (no result, no "ROLANDO…", no ready hint).
- SHA-02.2 (C7 wiring, `sound.setHolding` in App): while held, Web Audio got 11 samples, all rattle-rate (1.47-1.74), 0 impact-rate samples and no whoosh; impact samples (0.81-1.32) start only after the throw.
- SHA-03.1 (C8): calm for 25 steps -> one whoosh, dice thrown toward the top; after 4 s `main` reads "RESULTADO! 20 2d6 + 1d8 + 1d20 = 3 + 1 + 5 + 11" and `walk/landed.png` shows that same 20 = 3 + 1 + 5 + 11 with four dice. That the thrown dice are the held ones (same roll and die ids) is proven by C9, not by the picture.
- SHA-04.2 (T5): weak shake (10/2 m/s²) then calm -> text during: empty; after: "PRONTO PRA ROLAR!".
- SHA-04.3 (verifier F1, in the browser): strong shake, tap ROLAR! mid-shake, keep sending calm samples -> 0 impacts while held, 1 whoosh, and the button roll lands: "RESULTADO! 5 2d6 + 1d8 + 1d20 = 1 + 1 + 2 + 1".
- SHA-05 (C14, C17), after T8: same setup (2 d6, d8, d20, shake on). 45 samples of acceleration (-20, 0) m/s², i.e. the phone braking after moving right -> `walk/push-right.png`: all four dice moved to the right half of the table, one d6 against its right edge, d20 moving with the lighter dice. Then 45 samples of (14, -14) -> `walk/push-diag.png`: the four dice crossed the table diagonally to the top-left corner. `main` text empty throughout; 24 rattle-rate samples, no impacts, no whoosh while held. Held dice stayed below the lid, fully in frame.
- SHA-05.5/05.6 (C18, C19), after the bouncy-ball change and the verifier fixes: add d6, d8 to the default d20, shake on; a synthetic back-and-forth shake (x = 22 sin(2π·4t), y = 12 sin(2π·3t + 1) m/s², 60 samples/s) for 0.7 s, 0.5 s, 0.5 s with a screenshot after each. `walk/bounce-strip.png` (the three table crops side by side): the d20 goes from the bottom to the top to the left, the d8 from the middle to the top right to the bottom: the dice cross the table between shots. A first try that set the speed on every sample kept the dice reversing in place (the "preso" feel); fixed by SHA-05.5's refinement. After calm: one whoosh, the dice stop and are read - `main` reads "RESULTADO! 25 1d6 + 1d8 + 1d20 = 1 + 8 + 16", `walk/bounce-landed.png`.
- First walk found held dice flying up to the camera, huge and cropped; fixed in T6 with a low spawn, a smaller upward push and an invisible lid.
- Not walked: feel on the user's phone (real accelerometer, push strength).
