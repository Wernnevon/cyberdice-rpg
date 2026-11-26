# Shake Animation Context

**Gathered:** 2026-11-26
**Spec:** `.specs/features/shake-animation/spec.md`
**Status:** Gathered

---

## Feature Boundary

While the user shakes the phone (shake-to-roll, sound-polish SPL-05), the dice of the roll are shown being shaken before they are thrown. Requested after testing sound-polish on the phone: "ficou bom, mas faltou uma animação dos dados sendo 'agitados' antes de serem lançados".

---

## Implementation Decisions

### Visual

- 3D dice on the table: the roll's dice appear together near the bottom edge of the 3D table and shake for real while the user shakes; when the user stops, they are thrown from there (user picked: "Dados 3D na mesa (Recomendado)").

### Roll button

- Only on shake; the button still throws at once (user picked: "Só no agitar (Recomendado)").

### Intensity

- The on-screen shaking follows the phone's motion strength: light shake moves little, strong shake moves a lot (user picked: "Sim, acompanha (Recomendado)").

### Previous result

- A result still on screen disappears as soon as the shaking starts, and the new dice appear shaking (user picked: "Some ao começar (Recomendado)").

### Weak shake (round 2)

- A shake that never reaches the roll threshold: when it ends, the dice leave the table without rolling and the screen goes back to how it was (user picked: "Os dados somem (Recomendado)").

### After a weak shake (round 3)

- The table goes back to the ready screen ("PRONTO PRA ROLAR!") with the same dice selection; the previous result stays in the history and is not shown again (user picked: "Mesa pronta (Recomendado)").

### Sound while shaking (round 2)

- Keep the current rattle; physics contacts between dice during the shake are silent so the noise does not double (user picked: "Só o chacoalhar atual (Recomendado)").

---

## Deferred Ideas

None so far.
