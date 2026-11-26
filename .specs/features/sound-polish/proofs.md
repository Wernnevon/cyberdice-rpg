# sound-polish proofs

**HEAD**: 4fed448
**Tree**: clean
**Shell**: /bin/sh
**Result**: 18 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / SPL-01.1` | pass |
| C2 | `run unit / SPL-01.2` | pass |
| C3 | `run unit / SPL-01.3` | pass |
| C4 | `run unit / SPL-01.4` | pass |
| C5 | `run unit / SPL-02.1` | pass |
| C6 | `run unit / SPL-02.2` | pass |
| C7 | `run unit / SPL-02.3` | pass |
| C8 | `run unit / SPL-03.1` | pass |
| C9 | `run unit / SPL-03.2` | pass |
| C10 | `run unit / SPL-03.3` | pass |
| C11 | `run unit / SPL-04.1` | pass |
| C12 | `run unit / SPL-04.2` | pass |
| C13 | `run unit / SPL-05.1` | pass |
| C14 | `run unit / SPL-05.2` | pass |
| C15 | `run unit / SPL-05.3` | pass |
| C16 | `run unit / SPL-05.4` | pass |
| C17 | `run unit / SPL-05.5` | pass |
| Build | `npm run build && npm run lint` | pass |

## Output

`Run unit` - exit 0

```
# Subtest: SPL-03.1 impact gain scales by 1/sqrt(dice count), never below 0.35
ok 50 - SPL-03.1 impact gain scales by 1/sqrt(dice count), never below 0.35
  ---
  duration_ms: 0.324752
  type: 'test'
  ...
1..50
# tests 50
# suites 0
# pass 50
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 232.366756
```
