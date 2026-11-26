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

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
