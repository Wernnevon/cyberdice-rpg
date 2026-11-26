# shake-animation proofs

**HEAD**: f6f5933
**Tree**: clean
**Shell**: /bin/sh
**Result**: 14 pass, 0 fail

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
| Build | `npm run build && npm run lint` | pass |

## Output

`Run unit` - exit 0

```
# Subtest: SHA-03.3 held dice launch nothing until thrown, then exactly one whoosh with the roll id
ok 67 - SHA-03.3 held dice launch nothing until thrown, then exactly one whoosh with the roll id
  ---
  duration_ms: 0.308217
  type: 'test'
  ...
1..67
# tests 67
# suites 0
# pass 67
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 194.204047
```
