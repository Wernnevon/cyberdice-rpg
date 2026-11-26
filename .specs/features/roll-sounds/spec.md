# Roll Sounds

**Status:** Approved
**Approved**: 2026-11-25 - user: "1a e 2b, aprovo a spec"
**Scope:** Medium

## Problem Statement

Rolling is silent. A physical roll is half sound: the clatter tells you the dice are moving, and the stop tells you the result is in. The app should sound like dice on a table, mark the result, and celebrate or mourn a natural 20 or 1 on a d20.

## Goals

- Dice impacts sound like real dice and follow the physics, not a canned recording.
- The result reveal, the crit and the fail each have a recognizable sound.
- The user controls sound with one button, and the choice survives closing the app.
- The app behaves like a casual game on iPhone: the silent switch mutes it.

## Out of Scope

- Sounds on UI taps (add die, modifier, buttons).
- Volume slider, sound themes, haptics.
- Background music.

## User Stories

### SND-01 Dice impacts

As a player, I hear the dice clatter as they hit the table, so the roll feels physical.

**Acceptance criteria**

1. WHEN a die hits the table, a wall or another die with an impact force at or above the minimum force THE SYSTEM SHALL play one dice-impact sample.
2. WHEN a die impact plays THE SYSTEM SHALL set its gain proportional to the impact force, between a floor gain at the minimum force and a cap of 1 at the maximum force.
3. WHEN a die hits anything with an impact force below the minimum force THE SYSTEM SHALL play no sound.
4. WHEN more impacts arrive within one 100 ms window than the per-window limit THE SYSTEM SHALL drop the extra impacts instead of playing them.

### SND-02 Result reveal

As a player, I hear the moment the result lands.

**Acceptance criteria**

1. WHEN every die of a roll has settled and the result appears THE SYSTEM SHALL play exactly one reveal sound for that roll.
2. WHEN the result has no kept natural 20 and no kept natural 1 on a d20 THE SYSTEM SHALL play the plain reveal sound.

### SND-03 Crit and fail

As a player, a natural 20 or 1 on the d20 sounds different, so I feel it before I read it.

**Acceptance criteria**

1. WHEN the result has a kept d20 showing 20 THE SYSTEM SHALL play the crit sound instead of the plain reveal sound.
2. WHEN the result has a kept d20 showing 1 and no kept d20 showing 20 THE SYSTEM SHALL play the fail sound instead of the plain reveal sound.
3. WHEN a d20 showing 20 or 1 was dropped by keep-highest or keep-lowest THE SYSTEM SHALL ignore it when choosing the sound.

### SND-04 Mute control

As a player at a quiet table, I turn sound off once and it stays off.

**Acceptance criteria**

1. WHEN the user taps the sound button in the header THE SYSTEM SHALL toggle between sound on and sound off and show the matching speaker icon with `aria-pressed` reflecting the state.
2. WHILE sound is off THE SYSTEM SHALL play no impact, reveal, crit or fail sound.
3. WHEN the user changes the sound setting THE SYSTEM SHALL save it on the device, and WHEN the app opens again THE SYSTEM SHALL restore it.
4. IF the device storage is unavailable or holds an unreadable value THEN THE SYSTEM SHALL start with sound on and keep working without an error.

### SND-05 Platform behaviour

As an iPhone player, the app respects my silent switch, never misses the first sound, and works offline.

**Acceptance criteria**

1. WHERE the browser exposes `navigator.audioSession` THE SYSTEM SHALL set its type to `ambient`, so the iPhone silent switch mutes the app.
2. WHEN the first roll of a session is triggered by a tap THE SYSTEM SHALL unlock audio within that tap, so the first roll is not silent.
3. WHEN the app is installed and offline THE SYSTEM SHALL still play every sound.

## Requirement Traceability

| ID | Story | Status |
| --- | --- | --- |
| SND-01 | Dice impacts | Pending |
| SND-02 | Result reveal | Pending |
| SND-03 | Crit and fail | Pending |
| SND-04 | Mute control | Pending |
| SND-05 | Platform behaviour | Pending |

## Assumptions & Open Questions

- **Crit and fail replace the reveal sound.** One sound per result keeps the moment clean. Agent default; correct it if both should play.
- **Crit and fail follow the d20 rule already used by History** (kept natural 20 or 1 on a d20), not "max or min on any die". Agent default, consistent with the app.
- **Impact tuning** (minimum force, floor gain, maximum force, per-window limit) is calibrated by ear on a phone and lives in named constants.
- **Saving the mute choice is the first data the app stores on the device.** The user chose it ("Botão no topo, lembra a escolha"); recorded as AD-001.
Open questions: none

- **Asset download (resolved):** the pack is taken from Kenney's own OpenGameArt upload (CC0). User: "1a".
- **File format for iPhone (resolved):** the OGG files are converted to M4A/AAC with the `ffmpeg-static` npm dev dependency. User: "2b".

## Decisions from the user

| Area | Decision | User's words |
| --- | --- | --- |
| Moments | Dice impacts, result reveal, crit and fail. No UI tap sounds. | "Impactos dos dados (Recommended), Revelação do resultado, Crítico e falha" |
| Source | Kenney Casino Audio (CC0) for dice; reveal, crit and fail synthesized in code. | "Kenney + sons gerados (Recommended)" |
| Mute | Speaker button in the header, choice remembered. | "Botão no topo, lembra a escolha (Recommended)" |
| Silent switch | Respect the iPhone silent switch. | "Respeitar o silencioso (Recommended)" |

## Sources

- Kenney Casino Audio, CC0: https://kenney.nl/assets/casino-audio
- Same pack on OpenGameArt, uploaded by Kenney, CC0: https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips
