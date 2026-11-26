# State

## Decisions

### AD-001: The mute choice is stored on the device (2026-11-25)

The app stores no data by design. The sound on/off choice is the one exception: it is saved in `localStorage` and restored on launch. Roll history stays in memory only.

- **Why:** the user asked for the choice to be remembered ("Botão no topo, lembra a escolha").
- **Applies to:** roll-sounds. Any further stored data needs its own decision.

## Handoff

- **Feature:** roll-sounds
- **Phase:** Specify. Spec drafted, waiting on the asset download, the iPhone file format, and spec approval.
