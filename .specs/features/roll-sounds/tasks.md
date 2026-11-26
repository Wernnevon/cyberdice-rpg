# Roll Sounds Tasks

**Spec:** `.specs/features/roll-sounds/spec.md`
**Status:** Approved
**Approved**: 2026-11-25 - user: "aprovo as tasks, pode meter bronca"

**Build**: `npm run build && npm run lint`

## Gate Check Commands

| Level | Command |
| --- | --- |
| quick | `npm test` |
| build | `npm run build && npm run lint && npm test` |

## Execution Plan

Phase 1 (assets): T1. Phase 2 (rules and engine): T2, then T3. Phase 3 (wiring): T4 and T5, both after T3. One batch, executed inline.

## Task Breakdown

### T1: Bundle the dice impact samples

**What**: convert Kenney `die-throw-1..4.ogg` to M4A/AAC with `ffmpeg-static` into `public/sounds/`, ship Kenney's `License.txt` beside them, add `npm run sounds` to redo the conversion, precache `.m4a` in the service worker.
**Where**: `public/sounds/die-1..4.m4a`, `public/sounds/License.txt`, `package.json`, `vite.config.ts`
**Depends on**: none
**Requirements**: SND-05
**Tests**: none (assets and config; C16 proves the precache)
**Gate**: build
**Done when**: the build's service worker precaches all four `.m4a` files.
**Status**: ✅ Complete

### T2: Sound rules

**What**: pure functions in `src/utils/sound.ts`: impact gain from force (null below the minimum, floor gain up to a cap of 1), a 100 ms window limiter, the reveal sound for a roll (crit, fail, reveal), and loading and saving the mute choice with a safe fallback.
**Where**: `src/utils/sound.ts`, `src/utils/sound.test.ts`
**Depends on**: none
**Requirements**: SND-01, SND-02, SND-03, SND-04
**Tests**: unit
**Gate**: quick
**Done when**: C2, C3, C4, C6, C7, C8, C9, C12, C13 pass.
**Status**: ✅ Complete

### T3: Audio engine

**What**: `src/audio/engine.ts` built on an injected AudioContext factory: unlocks on the first gesture, sets `navigator.audioSession.type = 'ambient'` when present, plays a random impact sample at a gain, synthesizes reveal, crit and fail tones, plays one reveal per roll id, and plays nothing while muted.
**Where**: `src/audio/engine.ts`, `src/audio/engine.test.ts`
**Depends on**: T2
**Requirements**: SND-01, SND-02, SND-04, SND-05
**Tests**: unit (fake AudioContext and navigator)
**Gate**: quick
**Done when**: C1, C5, C11, C14, C15 pass.
**Status**: ✅ Complete

### T4: Play impacts from the physics

**What**: `Die` reports contact force events to the engine, filtered by T2's rules.
**Where**: `src/components/Die.tsx`
**Depends on**: T3
**Requirements**: SND-01
**Tests**: none (rules in T2, playback in T3, the wiring in the walk)
**Gate**: build
**Done when**: a roll in the browser plays impact sounds.

### T5: Reveal sound and mute button

**What**: play the reveal sound when a result appears; add the speaker button to the header with `aria-pressed`, persisted through T2's storage functions; i18n labels.
**Where**: `src/App.tsx`, `src/i18n/pt-BR.json`, `src/i18n/en.json`
**Depends on**: T3
**Requirements**: SND-02, SND-04
**Tests**: none (rules in T2 and T3; the control in the walk)
**Gate**: build
**Done when**: in the browser, tapping the button toggles the icon and `aria-pressed`, and the choice survives a reload.

## Test Coverage Matrix

| Requirement | Criteria | Test type | Task |
| --- | --- | --- | --- |
| SND-01 | 1, 2, 3, 4 | unit | T2, T3 |
| SND-02 | 1, 2 | unit | T2, T3 |
| SND-03 | 1, 2, 3 | unit | T2 |
| SND-04 | 1 walk; 2, 3, 4 unit | unit, walk | T2, T3, T5 |
| SND-05 | 1, 2 unit; 3 build output | unit, build | T1, T3 |

## Checks

**Run unit**: `npm test`

**C1** - An impact at or above the minimum force plays one sample (SND-01, AC 1)
Proof: run unit | SND-01.1

**C2** - Gain grows with force from the floor gain to a cap of 1 (SND-01, AC 2)
Proof: run unit | SND-01.2

**C3** - An impact below the minimum force plays nothing (SND-01, AC 3)
Proof: run unit | SND-01.3

**C4** - Impacts beyond the per-window limit are dropped (SND-01, AC 4)
Proof: run unit | SND-01.4

**C5** - A roll plays exactly one reveal sound (SND-02, AC 1)
Proof: run unit | SND-02.1

**C6** - No kept natural 20 or 1 on a d20 picks the plain reveal (SND-02, AC 2)
Proof: run unit | SND-02.2

**C7** - A kept natural 20 on a d20 picks the crit (SND-03, AC 1)
Proof: run unit | SND-03.1

**C8** - A kept natural 1 with no kept 20 picks the fail (SND-03, AC 2)
Proof: run unit | SND-03.2

**C9** - Dropped d20 rolls do not choose the sound (SND-03, AC 3)
Proof: run unit | SND-03.3

**C10** - Tapping the sound button toggles sound, the icon and `aria-pressed` (SND-04, AC 1)
Proof: walk

**C11** - While muted, no sound plays (SND-04, AC 2)
Proof: run unit | SND-04.2

**C12** - The mute choice is saved and restored (SND-04, AC 3)
Proof: run unit | SND-04.3

**C13** - Missing or unreadable storage starts with sound on (SND-04, AC 4)
Proof: run unit | SND-04.4

**C14** - `navigator.audioSession.type` becomes `ambient` when present (SND-05, AC 1)
Proof: run unit | SND-05.1

**C15** - The first gesture unlocks audio so the first roll is heard (SND-05, AC 2)
Proof: run unit | SND-05.2

**C16** - All four impact samples are precached for offline (SND-05, AC 3)
Proof: `npm run build >/dev/null && grep -o 'sounds/die-[1-4].m4a' dist/sw.js | sort -u | wc -l` = 4

## Handoff

**Dispatched:** none
**Settled mid-build:** none
**Walked:** not yet
