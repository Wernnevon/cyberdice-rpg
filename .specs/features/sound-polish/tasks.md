# Sound Polish Tasks

**Spec:** `.specs/features/sound-polish/spec.md`
**Status:** Approved
**Approved**: 2026-11-26 - user: "aprovo as tasks, pode mandar ver"

**Build**: `npm run build && npm run lint`

## Gate Check Commands

| Level | Command |
| --- | --- |
| quick | `npm test` |
| build | `npm run build && npm run lint && npm test` |

## Execution Plan

Phase 1 (rules): T1, T2. Phase 2 (engine): T3, then T4, then T5, all after T1. Phase 3 (wiring): T6 after T4 and T5; T7 after T2 and T5. Seven tasks, one batch, executed inline.

## Task Breakdown

### T1: Impact and mix rules

**What**: pure functions in `src/utils/sound.ts`: pitch rate per die type (smaller die, higher pitch), random pitch jitter within ±6 %, next sample index that never repeats the last, crowd gain 1/√(dice count) with a 0.35 floor.
**Where**: `src/utils/sound.ts`, `src/utils/sound.test.ts`
**Depends on**: none
**Requirements**: SPL-02, SPL-03
**Tests**: unit
**Gate**: quick
**Done when**: C5, C6, C7, C8 pass.
**Status**: ✅ Complete

### T2: Shake gesture rules

**What**: a pure state machine in `src/utils/shakeGesture.ts` fed motion samples (force, time, can-roll): reports rattling while force is above the rattle threshold, fires one roll after 300 ms below it when the shake reached the roll threshold, ends with no roll otherwise, and ignores motion while it cannot roll.
**Where**: `src/utils/shakeGesture.ts`, `src/utils/shakeGesture.test.ts`
**Depends on**: none
**Requirements**: SPL-05
**Tests**: unit
**Gate**: quick
**Done when**: C13, C14, C15, C16 pass.
**Status**: ✅ Complete

### T3: Cyberpunk tones

**What**: replace the 8-bit tones in `src/audio/engine.ts` with detuned two-voice synth notes: a short reveal, a rising crit arpeggio, a falling fail with a glitch stutter.
**Where**: `src/audio/engine.ts`, `src/audio/engine.test.ts`
**Depends on**: T1
**Requirements**: SPL-01
**Tests**: unit (fake AudioContext)
**Gate**: quick
**Done when**: C1, C2, C3, C4 pass.
**Status**: ✅ Complete

### T4: Impacts per die, master compressor, ducking

**What**: `impact()` takes the die's sides and the roll's dice count, applies T1's pitch, jitter, no-repeat sample and crowd gain; every sound goes through one master compressor; a reveal ducks impacts to 30 % for its length.
**Where**: `src/audio/engine.ts`, `src/audio/engine.test.ts`
**Depends on**: T3
**Requirements**: SPL-02, SPL-03
**Tests**: unit (fake AudioContext)
**Gate**: quick
**Done when**: C9, C10 pass and the existing SND tests still pass.
**Status**: ✅ Complete

### T5: Whoosh and rattle

**What**: engine `launch(rollId)` plays one filtered-noise whoosh per roll id; `rattle()` plays one short, quiet, pitched-up die sample click; both silent while muted.
**Where**: `src/audio/engine.ts`, `src/audio/engine.test.ts`
**Depends on**: T4
**Requirements**: SPL-04, SPL-05
**Tests**: unit (fake AudioContext)
**Gate**: quick
**Done when**: C11, C12, C17 pass, and the rattle-click test passes.
**Status**: ✅ Complete

### T6: Wire impacts and whoosh into the roll

**What**: `Die` passes its sides and the roll's dice count to `sound.impact`; `useRoll`'s `roll()` calls `sound.launch` for every started roll, so button and shake both whoosh.
**Where**: `src/components/Die.tsx`, `src/hooks/useRoll.tsx`
**Depends on**: T4, T5
**Requirements**: SPL-02, SPL-03, SPL-04
**Tests**: none (rules in T1, playback in T4/T5; the wiring in the walk)
**Gate**: build
**Done when**: a roll in the browser plays one whoosh and pitched impacts.
**Status**: Pending

### T7: Shake rattles, then rolls

**What**: `useShake` feeds `devicemotion` into T2's machine: rattle clicks from the engine while rattling, the roll on release, nothing while the dice move or another view shows.
**Where**: `src/hooks/useShake.ts`, `src/App.tsx`
**Depends on**: T2, T5
**Requirements**: SPL-05
**Tests**: none (gesture rules in T2, rattle playback in T5; the wiring on the user's phone)
**Gate**: build
**Done when**: the build passes and the phone walk is handed to the user.
**Status**: Pending

## Test Coverage Matrix

| Requirement | Criteria | Test type | Task |
| --- | --- | --- | --- |
| SPL-01 | 1, 2, 3, 4 | unit | T3 |
| SPL-02 | 1, 2, 3 | unit | T1, T4 |
| SPL-03 | 1, 2, 3 | unit | T1, T4 |
| SPL-04 | 1, 2 | unit, walk | T5, T6 |
| SPL-05 | 1, 5 unit; 2, 3, 4 unit | unit, phone walk | T2, T5, T7 |

## Checks

**Run unit**: `npm test`

**C1** - Every reveal, crit and fail note uses at least two detuned voices (SPL-01, AC 1)
Proof: run unit | SPL-01.1

**C2** - The plain reveal finishes within 0.4 s (SPL-01, AC 2)
Proof: run unit | SPL-01.2

**C3** - The crit rises over at least four notes within 1.2 s (SPL-01, AC 3)
Proof: run unit | SPL-01.3

**C4** - The fail falls in pitch with at least three glitch retriggers within 1.2 s (SPL-01, AC 4)
Proof: run unit | SPL-01.4

**C5** - Impact pitch orders d4 > d6 > d8 > d10 > d12 > d20 (SPL-02, AC 1)
Proof: run unit | SPL-02.1

**C6** - Impact pitch varies by at most ±6 % (SPL-02, AC 2)
Proof: run unit | SPL-02.2

**C7** - Two impacts in a row never use the same sample (SPL-02, AC 3)
Proof: run unit | SPL-02.3

**C8** - Impact gain scales by 1/√(dice count), floor 0.35 (SPL-03, AC 1)
Proof: run unit | SPL-03.1

**C9** - Every sound goes through one master compressor (SPL-03, AC 2)
Proof: run unit | SPL-03.2

**C10** - A reveal ducks impacts to at most 30 % for its length (SPL-03, AC 3)
Proof: run unit | SPL-03.3

**C11** - A started roll plays exactly one whoosh (SPL-04, AC 1)
Proof: run unit | SPL-04.1

**C12** - No whoosh while sound is off (SPL-04, AC 2)
Proof: run unit | SPL-04.2

**C13** - Motion above the rattle threshold rattles (SPL-05, AC 1)
Proof: run unit | SPL-05.1

**C14** - 300 ms calm after a shake that reached the roll threshold starts one roll (SPL-05, AC 2)
Proof: run unit | SPL-05.2

**C15** - 300 ms calm after a weak shake stops the rattle with no roll (SPL-05, AC 3)
Proof: run unit | SPL-05.3

**C16** - No rattle and no roll while dice move or another view shows (SPL-05, AC 4)
Proof: run unit | SPL-05.4

**C17** - Muted: no rattle sound, the roll still happens (SPL-05, AC 5)
Proof: run unit | SPL-05.5

## Handoff

**Dispatched:** none
**Settled mid-build:** none
