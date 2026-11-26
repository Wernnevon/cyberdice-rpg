# Shake Animation Tasks

**Spec:** `.specs/features/shake-animation/spec.md`
**Status:** Approved
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
**Status**: Pending

### T5: Wire the shake phase into the app

**What**: `useRoll` exposes `shake`, `throwShake` (dispatch `throw` + `throwRoll` whoosh), `cancelShake`; `useShake` forwards start, rattle force, roll and cancel; `App` sets the engine's holding flag while shaking and passes `hasRoll`; `Result` shows nothing while shaking.
**Where**: `src/hooks/useRoll.tsx`, `src/hooks/useShake.ts`, `src/App.tsx`, `src/components/Result.tsx`
**Depends on**: T1, T2, T3, T4
**Requirements**: SHA-01, SHA-03, SHA-04
**Tests**: none (rules in T1-T4; the wiring in the walk)
**Gate**: build
**Done when**: the build passes; a synthetic weak shake in the browser shows the ready screen after it ends.
**Status**: Pending

### T6: Dice held, pushed and thrown in 3D

**What**: `DiceScene` renders the shaking dice and the holding box; `Die` gets `phase`, spawns in the box, is pushed by `shakePush` events with `shakeImpulse`, never settles while held, and is thrown toward the top on `thrown`.
**Where**: `src/components/DiceScene.tsx`, `src/components/Die.tsx`
**Depends on**: T5
**Requirements**: SHA-01, SHA-02, SHA-03
**Tests**: none (physics in the browser; screenshots in the walk)
**Gate**: build
**Done when**: the walk's screenshots show the dice in the bottom area while shaking and spread over the table after the throw.
**Status**: Pending

## Test Coverage Matrix

| Requirement | Criteria | Test type | Task |
| --- | --- | --- | --- |
| SHA-01 | 1, 2, 5 unit; 3, 4 walk | unit, walk | T1, T3, T5, T6 |
| SHA-02 | 1, 2 | unit | T3, T4 |
| SHA-03 | 2, 3 unit; 1 walk | unit, walk | T1, T2, T6 |
| SHA-04 | 1, 2, 3 | unit | T1, T3 |

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

## Handoff

**Dispatched:** none
**Settled mid-build:** none
