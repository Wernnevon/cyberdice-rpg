# State

## Decisions

### AD-001: The mute choice is stored on the device (2026-11-25)

The app stores no data by design. The sound on/off choice is the one exception: it is saved in `localStorage` and restored on launch. Roll history stays in memory only.

- **Why:** the user asked for the choice to be remembered ("Botão no topo, lembra a escolha").
- **Applies to:** roll-sounds. Any further stored data needs its own decision.

### AD-002: The shake-to-roll choice is stored on the device (2026-11-25)

Like the sound choice (AD-001), shake-to-roll on/off is saved in `localStorage` (`shake-on`) and restored on launch. Where motion access needs a permission prompt (iOS, newer Chrome), it is re-requested inside the first tap after launch; until then the toggle shows on, and tapping the toggle itself turns it off.

- **Why:** the user asked for it ("eu queria q ele lembrasse sempre q eu ecolhesse o agitar e com som/sem som").
- **Applies to:** shake-to-roll.

## Handoff

- **Feature:** roll-sounds, done 2026-11-25. Verifier round 1 FAIL (7 findings), all closed; round 2 proofs 17/17; validate_verification exit 0.
- **Open:** audibility on a real iPhone (silent switch, first roll after a tap) was not walked; it needs the user's phone.
