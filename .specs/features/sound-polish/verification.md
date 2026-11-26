# Sound Polish verification

**Verdict**: FAIL (round 1); findings F1-F4 closed, proofs green at HEAD in round 2
**Proofs**: `proofs.md` at 4fed448
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `engine.test.ts` `SPL-01.1 every reveal, crit and fail note uses at least two detuned voices` | yes - same-detune mutation fails 4 tests |
| C2 | `engine.test.ts` `SPL-01.2 the plain reveal finishes within 0.4 s` | yes |
| C3 | `engine.test.ts` `SPL-01.3 the crit rises over at least four notes and finishes within 1.2 s` | yes |
| C4 | `engine.test.ts` `SPL-01.4 the fail falls in pitch with at least three glitch retriggers and finishes within 1.2 s` | yes - spreading the retriggers fails it |
| C5 | `sound.test.ts` `SPL-02.1 impact pitch orders d4 > d6 > d8 > d10 > d12 > d20`; `engine.test.ts` `SPL-02.1 the engine plays a smaller die higher, ...` | partly - engine and table hold; `Die.tsx` can stop passing `spec.sides` and both stay green (F2) |
| C6 | `sound.test.ts` `SPL-02.2 impact pitch varies randomly by at most ±6 % ...`; `engine.test.ts` `SPL-02.2 the engine varies each impact pitch by at most ±6 %` | yes - JITTER 0.07 fails 2 |
| C7 | `sound.test.ts` `SPL-02.3 two impacts in a row never use the same sample`; `engine.test.ts` `SPL-02.3 the engine never plays the same sample twice in a row` | yes |
| C8 | `sound.test.ts` `SPL-03.1 impact gain scales by 1/sqrt(dice count), never below 0.35`; `engine.test.ts` `SPL-03.1 the engine plays each impact at the crowd gain of its roll` | partly - floor 0.3 fails 2; `Die.tsx` can stop passing the dice count and both stay green (F2) |
| C9 | `engine.test.ts` `SPL-03.2 every sound reaches the speakers through one master compressor` | no - only impacts and tones are routed in the test; whoosh and rattle can bypass the compressor green (F1) |
| C10 | `engine.test.ts` `SPL-03.3 a reveal ducks impacts to at most 30 % gain for its length` | yes - DUCK 0.31 fails it; playing and arriving impacts both checked |
| C11 | `engine.test.ts` `SPL-04.1 a started roll plays exactly one launch whoosh` | no - proves `launch()` dedupes per id, not that a started roll calls it; removing `sound.launch(id)` from `useRoll` stays green (F3) |
| C12 | `engine.test.ts` `SPL-04.2 no launch whoosh while sound is off` | yes |
| C13 | `shakeGesture.test.ts` `SPL-05.1 motion above the rattle threshold rattles`; `engine.test.ts` `SPL-05.1 the engine plays a rattle click from a die sample, at most one per gap` | partly - gesture and engine hold (`>=` mutation fails); `useShake` can drop the `sound.rattle` call green (F4) |
| C14 | `shakeGesture.test.ts` `SPL-05.2 300 ms below the rattle threshold after a strong shake starts exactly one roll` | yes - 299/300 ms boundary, `<=` mutation fails 2 |
| C15 | `shakeGesture.test.ts` `SPL-05.3 300 ms calm after a shake that never reached the roll threshold stops with no roll` | yes |
| C16 | `shakeGesture.test.ts` `SPL-05.4 no rattle and no roll while the app cannot roll` | partly - gesture holds; `App.tsx` can pass `() => true` as `canRoll` green (F4) |
| C17 | `engine.test.ts` `SPL-05.5 while sound is off the shake plays no rattle and still rolls` | yes |

Own examples run at 4fed448 as throwaway tests (deleted): a second reveal 0.5 s after a crit keeps impacts at 0.3 for its whole length - holds; a 10 s continuous shake with one strong peak then calm rolls exactly once with 625 rattles - holds; a strong shake, then canRoll false in the calm window (button roll), then calm - no shake roll - holds; negative force counts as calm - holds.

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| F1 (Major, C9) - the whoosh and the rattle can skip the master compressor (and the rattle the ducking bus) with every test green | mutations `launch`: `.connect(master)` -> `.connect(ctx.destination)`, and `rattle`: `.connect(impactBus)` -> `.connect(ctx.destination)`: 50/50 pass each; SPL-03.2 only plays `impact` and `reveal`, SPL-04.1 only asserts the whoosh ends at the destination | in SPL-03.2 also call `engine.launch('w')` and `engine.rattle(1000)` before the path loop, so their paths face the same one-compressor assertions | f3f005e - C9 (SPL-03.2 now plays launch and rattle; both mutations fail it) |
| F2 (Major, C5, C8) - the product can play every impact at d20 pitch and full gain: `Die.tsx` passing `spec.sides` and `count` to `sound.impact` is untested | mutation `sound.impact(speed, performance.now())` in `Die.tsx`: 50/50 pass; engine defaults `sides = 20`, `dice = 1` hide it | move the onContactForce arguments into a pure helper in `sound.ts` (e.g. returns `[speed, sides, count]` from the spec and roll) and test it, or drop the engine defaults so a call without them fails type-check/lint in the build proof | ae111b4 - C5, C8 via the build proof (impact without sides/count fails type-check) |
| F3 (Major, C11) - a roll can start with no whoosh: the `useRoll` call is untested | removing `sound.launch(id)` from `roll()` in `useRoll.tsx`: 50/50 pass; the test proves only per-id dedupe in the engine | test that `roll()` (button and shake both route through it) calls `launch` exactly once with the new roll id, e.g. by injecting the engine into the roll state or extracting the roll action to a pure function | 6d1315a - C11 (`startRoll.test.ts` SPL-04.1: launch once with the new roll id) |
| F4 (Minor, C13, C16) - the wiring of the gesture is untested: `useShake` can stop calling `sound.rattle`, and `App.tsx` can pass a `canRoll` that ignores the view and moving dice | mutations `if (step === 'rattle')` -> `if (false)` in `useShake.ts`, and `canRoll` -> `() => true` in `App.tsx`: 50/50 pass each | extract the motion handler step (`gesture` result -> rattle / roll call) and the `canRoll` predicate (`view === 'table' && !rolling`) as pure functions with one test each, or add a phone walk check for them | 56dc891 - C13, C16 (`shakeGesture.test.ts` SPL-05.1 handler and SPL-05.4 `canShakeRoll` tests) |
