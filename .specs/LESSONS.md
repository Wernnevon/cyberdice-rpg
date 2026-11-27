# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Plan/Checks)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - A routing test must play every sound the engine can make (impact, tones, whoosh, rattle), not only the first ones written.
- signal: `weak_test` · recurrence: 1 feature(s) · scope: `audio` · harmful: 0
- features: sound-polish
- evidence: C9 / F1 (audio)
- last seen: 2026-11-26T22:49:13Z

### L-002 - Do not give engine parameters defaults that the real caller must pass; required args let the build catch a dropped call.
- signal: `weak_test` · recurrence: 1 feature(s) · scope: `audio` · harmful: 0
- features: sound-polish
- evidence: C5 C8 / F2 (audio)
- last seen: 2026-11-26T22:49:13Z

### L-003 - Rules wired inside React hooks or components (roll launch, motion step, can-roll predicate) go in pure .ts helpers with tests; the hook only calls them.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: sound-polish
- evidence: C11 C13 C16 / F3 F4 (hooks)
- last seen: 2026-11-26T22:49:13Z

### L-004 - When two events can follow each other (button roll, then gesture cancel), test the chain in the reducer, not each half alone; a cancel must not clear state it did not create.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `state` · harmful: 0
- features: shake-animation
- evidence: C13 / F1 (state)
- last seen: 2026-11-26T23:09:27Z

### L-005 - Gate on the same validity check the action uses (parse), not a proxy like a non-empty string.
- signal: `weak_test` · recurrence: 1 feature(s) · scope: `shake` · harmful: 0
- features: shake-animation
- evidence: C5 / F2 (shake)
- last seen: 2026-11-26T23:09:27Z

### L-006 - Values a hook computes and forwards (impulse, throw action) come out of the tested helper, so the hook only passes them through.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `hooks` · harmful: 0
- features: shake-animation
- evidence: C6 C9 / F3 F4 (hooks)
- last seen: 2026-11-26T23:09:27Z

### L-007 - Walk lines quote the text the saved screenshot shows; record them from the same run.
- signal: `weak_test` · recurrence: 1 feature(s) · scope: `walk` · harmful: 0
- features: shake-animation
- evidence: C8 / F5 (walk)
- last seen: 2026-11-26T23:09:27Z

### L-008 - Physics rules (push velocity, surface per phase) go in pure helpers taking a body-like object, tested with a fake body; the component only wires them.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `physics` · harmful: 0
- features: shake-animation
- evidence: C17 C18 C19 / F6 F7 F10 F11 (physics)
- last seen: 2026-11-26T23:37:54Z

### L-009 - Device-motion axes are device-fixed: turn them by screen.orientation.angle, and treat accelerationIncludingGravity as having no usable direction.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `sensors` · harmful: 0
- features: shake-animation
- evidence: SHA-05.2 / F8 (sensors)
- last seen: 2026-11-26T23:37:54Z

### L-010 - A push applied on every ~60 Hz sensor sample cancels itself on a back-and-forth shake; let a moving body fly and push only slowed ones.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `physics` · harmful: 0
- features: shake-animation
- evidence: SHA-05.5 refinement (physics)
- last seen: 2026-11-26T23:37:54Z

### L-011 - Assert the observable effect of canvas and asset code (what was painted, requested or repainted), not only that a helper was created
- signal: `weak_test` · recurrence: 1 feature(s) · scope: `src/utils canvas` · harmful: 0
- features: dice-themes
- evidence: verification.md C19, C22, late image repaint (src/utils canvas)
- last seen: 2026-11-27T00:39:29Z

### L-012 - Put every clause of a criterion inside the test its proof selects, and perform the state change the criterion names
- signal: `weak_test` · recurrence: 1 feature(s) · scope: `src/utils tests` · harmful: 0
- features: dice-themes
- evidence: verification.md C8, C18 (src/utils tests)
- last seen: 2026-11-27T00:39:29Z

### L-013 - Walk each walk check under its exact stated condition and every listed variant before recording it
- signal: `weak_test` · recurrence: 1 feature(s) · scope: `walk checks` · harmful: 0
- features: dice-themes
- evidence: verification.md C13, C30 (walk checks)
- last seen: 2026-11-27T00:39:29Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
