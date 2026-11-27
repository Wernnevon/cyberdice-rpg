# Shake Animation

**Status:** Changed (SHA-05 added)
**Approved**: 2026-11-26 - user: "aprovo" (SHA-05 change)
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

### SHA-05 Shaken inside the phone (P1) - added 2026-11-26

As a player, the dice fly across the whole screen and bang into its edges, following the way I shake the phone. Replaces the bottom holding area of SHA-01.1 and SHA-01.3 (user, after testing on the phone: "o balançado dele enquanto agito ficou muito curto era legar ele sair batendo nas laterais do celular...").

**Acceptance criteria**

1. WHILE the dice are being shaken THE SYSTEM SHALL let them move over the whole table and bounce off its four edges, below a low invisible lid.
2. WHEN a rattle step arrives THE SYSTEM SHALL push the held dice along the screen-plane direction of the phone's motion, combining its side-to-side and up-down parts, so a diagonal shake pushes them diagonally.
3. WHEN a rattle step has no side-to-side or up-down part THE SYSTEM SHALL push the held dice in a random screen-plane direction.
4. WHEN a rattle step arrives THE SYSTEM SHALL change each held die's speed by the push size of SHA-02.1, whatever the die's mass.

**Settled mid-build (2026-11-26, after testing SHA-05 on the phone):** "muito lento o dado percorre pouco a tela ele ta muito preso, quase ns e move minha intençãoe ra fazer ele parecer aquelas bolas malucas quicando por toda a tela". Criterion 4 gives way to 5 and 6:

5. WHEN a rattle step arrives THE SYSTEM SHALL set each held die's sideways velocity to the push size along the push direction, so a back-and-forth shake throws the dice from edge to edge instead of cancelling out.
   Refined 2026-11-26 after the walk (setting the speed on every ~60 Hz sample kept reversing the dice in place, the "preso" the user reported): WHEN a rattle step arrives and a held die's sideways speed is below 60 % of the push size THE SYSTEM SHALL set its sideways velocity to the push size along the push direction; a die already flying faster keeps flying and bouncing.
6. WHILE the dice are being shaken THE SYSTEM SHALL make them bounce off the table edges and off each other keeping at least 90 % of their speed, with almost no friction on the table, like bouncy balls; once thrown they get back their normal bounce and friction.

### SHA-06 No friction while shaking, released with inertia (P1) - added 2026-11-27

User: "while I shake there should be no friction so the die really hits the 4 corners of the screen. When released it falls following inertia, going where the shake was sending it."

Supersedes "toward the top of the table" in SHA-03.1 (the button roll still throws toward the top) and the "at least 90 %" / "almost no friction" wording of SHA-05.6.

**Acceptance criteria**

1. WHILE the dice are being shaken THE SYSTEM SHALL give them no friction, no damping and full restitution.
2. WHEN the shake gesture ends with a roll THE SYSTEM SHALL keep each die's current linear and angular velocity, add no push (a nearly still die gets none either), restore the thrown bounce and friction, and let it fall under gravity until it settles and is read.
3. THE SYSTEM SHALL place the table walls close to the visible edges of the table panel, using a narrow field of view, with resting dice not cropped.

**After the phone test (2026-11-27):** "I still feel a lot of friction, the die is still veeery sluggish/dragging". Measured in a headless simulation: the cause was the push speed (4 to 14 m/s: mean 6.5 m/s, about 0.7 s to cross the table), not friction. SHA-02.1 keeps its growth rule with new limits (22 to 30 m/s).

4. WHILE the dice are being shaken, IF a push points more than 120 degrees away from a die's flight and at least 250 ms passed since that die's last push THEN THE SYSTEM SHALL turn the die to the push, even if it flies faster than 60 % of the push size. This narrows "a die already flying faster keeps flying" in SHA-05.5; any other push still leaves a fast die alone.
5. WHILE the dice are being shaken THE SYSTEM SHALL push them at 22 m/s or more, so a die crosses the table in about 0.25 s, and give each push a spin of at most 14 rad/s per axis.
6. THE SYSTEM SHALL use continuous collision detection on the dice, so fast dice stay inside the walls and below the lid.
7. WHEN a die is spawned THE SYSTEM SHALL give it a uniformly random orientation, set once, so a die dropped with almost no push does not favour a face and a release keeps its inertia.

## Requirement Traceability

| ID | Story | Status |
| --- | --- | --- |
| SHA-01 | Dice appear shaking | Done |
| SHA-02 | Shaking follows the phone | Done |
| SHA-03 | Thrown from the hand | Done |
| SHA-04 | Weak shake leaves no trace | Done |
| SHA-05 | Shaken inside the phone (replaces the holding area of SHA-01.1, SHA-01.3) | Done |
| SHA-06 | No friction while shaking, released with inertia | Implemented, awaiting phone check |

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
| Area (round 4) | Whole table, dice hit the four screen edges | "Mesa inteira (Recomendado)" |
| Direction (round 4) | Dice follow the shake, side-to-side, up-down or mixed | "deve seguir o agito se eu misturar lado com cima e baixo os dados deve seguir esse agito" |

## Sources

- Request: "testei, ficou bom, mas faltou uma animação dos dados sendo 'agitados' antes de serem lançados"
- sound-polish spec: `.specs/features/sound-polish/spec.md` (SPL-04, SPL-05)
