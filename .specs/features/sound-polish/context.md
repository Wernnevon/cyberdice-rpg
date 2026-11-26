# Sound Polish Context

**Gathered:** 2026-11-26
**Spec:** `.specs/features/sound-polish/spec.md`
**Status:** Gathered

---

## Feature Boundary

Improve the roll sounds shipped by roll-sounds: the reveal/crit/fail tones, the dice impacts and the mix, and add sounds for the launch and the shake.

---

## Implementation Decisions

### What bothers the user today

- Reveal/crit/fail, dice impacts and the mix (user picked: "Revelação/crítico/falha, Impactos dos dados, Mixagem").

### Reveal / crit / fail style

- Cyberpunk synth: richer synth, brightness, a glitch on the fail. Synthesized, no audio files (user picked: "Synth cyberpunk (Recomendado)").

### New moments

- Launch: short whoosh when the dice leave the hand (user picked: "Lançamento").
- Shake: dice rattling while the phone is shaken (user picked: "Chacoalhar ao agitar").
- Not chosen: UI button sounds.

### Shake rattle (round 2)

- Lighter motion already plays the rattle; the dice leave when the user stops shaking (user: "1 a recomendada" - "Chacoalha e depois rola").

### Launch whoosh (round 2)

- Plays on every roll, button and shake (user: "2 todas").

### Impacts

- Sound per die type (d4 sharper click, d20 fuller) and more variations so it does not repeat (user picked: "Som por tipo de dado (Recomendado)").

- What sounds wrong today: repetitive (user: "3 repetitivo").

### Mix

- Problem: with many dice it becomes one noise (user: "4 embola").

---

## Deferred Ideas

- UI button sounds (offered, not chosen).
