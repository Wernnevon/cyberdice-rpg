# Shake Animation

**Status:** Approved
**Approved**: 2026-11-26 - user: "aprovo a spec"
**Scope:** Large

## Problem Statement

Shake-to-roll now rattles and throws the dice when the shaking stops (sound-polish SPL-05), but the table stays empty while the phone is shaken: the user hears dice in a hand and sees nothing. The dice should be on the table, shaking with the phone, and be thrown from there.

## Goals

- While the phone is shaken, the roll's dice are visible in 3D, shaking as hard as the phone.
- The thrown dice are the same dice the user saw shaking; the result is read from them.
- A shake that does not roll leaves the table as it was before any dice appeared.

## Out of Scope

- An animation for the roll button: it still throws at once (user: "Só no agitar").
- A cup, a hand or any other drawn object holding the dice.
- New sounds: the rattle and whoosh from sound-polish stay as they are.

## User Stories

### SHA-01 Dice appear shaking (P1)

As a player with shake-to-roll on, I see my dice on the table while I shake the phone.

**Acceptance criteria**

1. WHEN a shake gesture starts on the table view with a valid roll set up THE SYSTEM SHALL place that roll's dice, one body per die, in a holding area along the bottom edge of the table.
2. WHEN a shake gesture starts while a result is on screen THE SYSTEM SHALL hide that result and its dice.
3. WHILE the dice are being shaken THE SYSTEM SHALL keep every die inside the holding area.
4. WHILE the dice are being shaken THE SYSTEM SHALL show no result, no "ROLANDO…" tag and no ready hint.
5. IF no valid roll is set up THEN THE SYSTEM SHALL show no dice and play no rattle when the phone is shaken.

### SHA-02 Shaking follows the phone (P1)

As a player, a light shake moves the dice a little and a strong one moves them a lot.

**Acceptance criteria**

1. WHEN a rattle step arrives THE SYSTEM SHALL push every shaken die with an impulse whose size grows with the motion force, from a minimum at the rattle threshold to a maximum at twice the roll threshold and above.
2. WHILE the dice are being shaken THE SYSTEM SHALL play no impact sound from their contacts.

### SHA-03 Thrown from the hand (P1)

As a player, the dice I saw shaking are the ones that land.

**Acceptance criteria**

1. WHEN the shake gesture ends with a roll THE SYSTEM SHALL throw the same dice bodies from the holding area toward the top of the table.
2. WHEN the shaken dice are thrown THE SYSTEM SHALL read the result from those dice, with the same roll id and die ids it showed while shaking.
3. WHEN the shaken dice are thrown THE SYSTEM SHALL play exactly one launch whoosh.

### SHA-04 Weak shake leaves no trace (P1)

As a player who shook the phone lightly or by accident, nothing is rolled.

**Acceptance criteria**

1. WHEN the shake gesture ends with no roll THE SYSTEM SHALL remove the shaken dice and add no result to the history.
2. WHEN the shake gesture ends with no roll THE SYSTEM SHALL show the ready screen with the same dice selection, and not the result that was on screen before the shake.
3. WHEN the roll button is tapped or the view changes while dice are being shaken THE SYSTEM SHALL drop the shaken dice; the button's roll replaces them.

## Requirement Traceability

| ID | Story | Status |
| --- | --- | --- |
| SHA-01 | Dice appear shaking | Pending |
| SHA-02 | Shaking follows the phone | Pending |
| SHA-03 | Thrown from the hand | Pending |
| SHA-04 | Weak shake leaves no trace | Pending |

## Assumptions & Open Questions

- **The holding area is an invisible box** along the bottom edge of the table, wide enough for the roll's dice; nothing is drawn around it. Agent default.
- **Impulse range and the holding area's size** are calibration knobs in named constants, tuned on the phone.
- **The shake starts on the first rattle step** (motion above 6 m/s²), the same moment the rattle sound starts.
- **No valid roll means no rattle either**: shaking with no dice selected now stays silent, where before it rattled and then did nothing. Agent default, follows SHA-01.5.
- **The visual is judged on the user's phone**; tests prove the state transitions, the impulse rule and the muting; a headless browser walk with screenshots checks the dice appear, stay in the area and are thrown.
Open questions: none

## Decisions from the user

| Area | Decision | User's words |
| --- | --- | --- |
| Visual | 3D dice near the bottom edge, shaken for real, thrown from there | "Dados 3D na mesa (Recomendado)" |
| Roll button | No animation, throws at once | "Só no agitar (Recomendado)" |
| Intensity | Follows the phone's motion strength | "Sim, acompanha (Recomendado)" |
| Previous result | Disappears when the shaking starts | "Some ao começar (Recomendado)" |
| Weak shake | Dice disappear without rolling | "Os dados somem (Recomendado)" |
| After a weak shake | Ready screen, previous result only in history | "Mesa pronta (Recomendado)" |
| Sound | Current rattle only; contacts silent while shaking | "Só o chacoalhar atual (Recomendado)" |

## Sources

- Request: "testei, ficou bom, mas faltou uma animação dos dados sendo 'agitados' antes de serem lançados"
- sound-polish spec: `.specs/features/sound-polish/spec.md` (SPL-04, SPL-05)
