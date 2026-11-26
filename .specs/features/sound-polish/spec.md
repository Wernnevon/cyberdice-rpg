# Sound Polish

**Status:** Approved
**Approved**: 2026-11-26 - user: "aprovo a spec"
**Scope:** Medium

## Problem Statement

The roll sounds from roll-sounds work but sound thin. The reveal, crit and fail are plain 8-bit beeps that do not match the CyberDice look. The impacts repeat the same click. With many dice everything blends into one noise. The roll itself starts in silence, and shaking the phone throws the dice instantly instead of feeling like dice rattling in a hand.

## Goals

- Reveal, crit and fail sound like a cyberpunk synth, and each is recognizable.
- Impacts change with the die type and never sound like the same click twice in a row.
- A roll with many dice stays readable: the clatter does not bury the result.
- Every roll starts with a launch whoosh; shaking rattles the dice and throws them when the shaking stops.

## Out of Scope

- Sounds on UI taps (add die, modifier, tabs) - offered, not chosen.
- Volume slider, sound themes, haptics, background music.
- New downloaded audio files: the rattle is built from the four existing Kenney die samples, the whoosh and tones are synthesized.

## User Stories

### SPL-01 Cyberpunk reveal, crit and fail (P1)

As a player, the result sounds like part of a cyberpunk machine, and a crit or a fail is unmistakable.

**Acceptance criteria**

1. WHEN the reveal, crit or fail sound plays THE SYSTEM SHALL build every note from at least two detuned oscillator voices.
2. WHEN the plain reveal sound plays THE SYSTEM SHALL finish it within 0.4 s.
3. WHEN the crit sound plays THE SYSTEM SHALL play a rising sequence of at least four notes and finish within 1.2 s.
4. WHEN the fail sound plays THE SYSTEM SHALL play a falling pitch with a glitch of at least three rapid retriggers and finish within 1.2 s.

### SPL-02 Impacts per die type (P1)

As a player, a d4 and a d20 sound different, and the clatter does not repeat.

**Acceptance criteria**

1. WHEN a die impact plays THE SYSTEM SHALL set its pitch by die type, higher for smaller dice, in the order d4 > d6 > d8 > d10 > d12 > d20.
2. WHEN a die impact plays THE SYSTEM SHALL vary its pitch randomly by up to ±6 % around the die type's pitch.
3. WHEN two impacts play in a row THE SYSTEM SHALL never use the same sample for both.

### SPL-03 Mix with many dice (P1)

As a player rolling a handful of dice, I still hear the dice apart and the result clearly.

**Acceptance criteria**

1. WHEN a roll has more than one die THE SYSTEM SHALL scale each impact's gain by 1/√(dice count), never below 0.35.
2. THE SYSTEM SHALL route every sound through one master compressor before the speakers.
3. WHEN the reveal, crit or fail sound starts THE SYSTEM SHALL lower impacts still playing or arriving to at most 30 % gain for the length of that sound.

### SPL-04 Launch whoosh (P1)

As a player, I hear the dice leave the hand.

**Acceptance criteria**

1. WHEN a roll starts, from the roll button or from a shake THE SYSTEM SHALL play exactly one launch whoosh.
2. WHILE sound is off THE SYSTEM SHALL play no launch whoosh.

### SPL-05 Shake rattle, then roll (P1)

As a player with shake-to-roll on, I shake the phone and hear the dice rattle; the dice leave when I stop.

**Acceptance criteria**

1. WHILE shake-to-roll is on and the motion is above the rattle threshold THE SYSTEM SHALL play rattle clicks built from the die samples.
2. WHEN the motion stays below the rattle threshold for 300 ms after a shake that reached the roll threshold THE SYSTEM SHALL start one roll.
3. WHEN the motion stays below the rattle threshold for 300 ms and no motion in that shake reached the roll threshold THE SYSTEM SHALL stop the rattle and start no roll.
4. WHILE the dice of a roll are still moving or a view other than the table is shown THE SYSTEM SHALL play no rattle and start no roll from shaking.
5. WHILE sound is off THE SYSTEM SHALL play no rattle and still roll by the rules above.

## Requirement Traceability

| ID | Story | Status |
| --- | --- | --- |
| SPL-01 | Cyberpunk reveal, crit and fail | Pending |
| SPL-02 | Impacts per die type | Pending |
| SPL-03 | Mix with many dice | Pending |
| SPL-04 | Launch whoosh | Pending |
| SPL-05 | Shake rattle, then roll | Pending |

## Assumptions & Open Questions

- **No new audio files.** The rattle reuses the four Kenney die samples (short, quiet, pitched up); the whoosh is filtered noise; the tones stay synthesized. Agent default; correct it if you want a recorded dice-shake sample.
- **Rattle threshold** is lower than today's roll threshold (15 m/s²) and starts at 6 m/s²; both live in named constants and are tuned by ear and hand on a phone.
- **A shake must reach the roll threshold at least once to roll.** Without it, walking or putting the phone down would roll. Agent default.
- **Ducking and gain floor values** (30 %, 0.35) are calibration knobs tuned by ear.
- **Sounds are judged by ear on the user's phone** after the build; tests prove the structure (voices, durations, pitches, routing), not taste.
Open questions: none

## Decisions from the user

| Area | Decision | User's words |
| --- | --- | --- |
| What bothers | Reveal/crit/fail, impacts, mix | "Revelação/crítico/falha, Impactos dos dados, Mixagem" |
| Tone style | Cyberpunk synth, glitch on the fail | "Synth cyberpunk (Recomendado)" |
| New moments | Launch and shake rattle; no UI sounds | "Lançamento, Chacoalhar ao agitar" |
| Impacts | Sound per die type, more variation | "Som por tipo de dado (Recomendado)" |
| Impact problem | Repetitive | "3 repetitivo" |
| Mix problem | Many dice blend into one noise | "4 embola" |
| Shake | Rattle on lighter motion, roll when shaking stops | "1 a recomendada" |
| Whoosh | Every roll | "2 todas" |

## Sources

- roll-sounds spec: `.specs/features/roll-sounds/spec.md`
- Kenney Casino Audio, CC0: https://kenney.nl/assets/casino-audio
