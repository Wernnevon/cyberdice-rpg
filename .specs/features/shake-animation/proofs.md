# shake-animation proofs

**HEAD**: cd72215
**Tree**: clean
**Shell**: /bin/sh
**Result**: 20 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / SHA-01.1` | pass |
| C2 | `run unit / SHA-01.2` | pass |
| C3 | `walk` | pass (Walked) |
| C4 | `walk` | pass (Walked) |
| C5 | `run unit / SHA-01.5` | pass |
| C6 | `run unit / SHA-02.1` | pass |
| C7 | `run unit / SHA-02.2` | pass |
| C8 | `walk` | pass (Walked) |
| C9 | `run unit / SHA-03.2` | pass |
| C10 | `run unit / SHA-03.3` | pass |
| C11 | `run unit / SHA-04.1` | pass |
| C12 | `run unit / SHA-04.2` | pass |
| C13 | `run unit / SHA-04.3` | pass |
| C14 | `walk` | pass (Walked) |
| C15 | `run unit / SHA-05.2` | pass |
| C16 | `run unit / SHA-05.3` | pass |
| C17 | `run unit / SHA-05.5` | pass |
| C18 | `run unit / SHA-05.5` | pass |
| C19 | `run unit / SHA-05.6` | pass |
| Build | `npm run build && npm run lint` | pass |

## Output

`Run unit` - exit 0

```
# Subtest: SHA-03.3 held dice launch nothing until thrown, then exactly one whoosh with the roll id
ok 76 - SHA-03.3 held dice launch nothing until thrown, then exactly one whoosh with the roll id
  ---
  duration_ms: 0.230915
  type: 'test'
  ...
1..76
# tests 76
# suites 0
# pass 76
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 188.694272
```
