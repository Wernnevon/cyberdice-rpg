# roll-sounds proofs

**HEAD**: 494d1e2
**Tree**: clean
**Shell**: /bin/sh
**Result**: 16 pass, 1 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / SND-01.1` | pass |
| C2 | `run unit / SND-01.2` | pass |
| C3 | `run unit / SND-01.3` | pass |
| C4 | `run unit / SND-01.4` | pass |
| C5 | `run unit / SND-02.1` | pass |
| C6 | `run unit / SND-02.2` | pass |
| C7 | `run unit / SND-03.1` | pass |
| C8 | `run unit / SND-03.2` | pass |
| C9 | `run unit / SND-03.3` | pass |
| C10 | `walk` | pass (Walked) |
| C11 | `run unit / SND-04.2` | pass |
| C12 | `run unit / SND-04.3` | pass |
| C13 | `run unit / SND-04.4` | pass |
| C14 | `run unit / SND-05.1` | pass |
| C15 | `run unit / SND-05.2` | pass |
| C16 | `npm run build >/dev/null && grep -o 'sounds/die-[1-4].m4a' dist/sw.js / sort -u / wc -l = 4` | **fail** |
| Build | `npm run build && npm run lint` | pass |

## Output

`Run unit` - exit 0

```
# Subtest: SND-04.4 missing or unreadable storage starts with sound on
ok 18 - SND-04.4 missing or unreadable storage starts with sound on
  ---
  duration_ms: 0.438562
  type: 'test'
  ...
1..18
# tests 18
# suites 0
# pass 18
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 112.873844
```

`npm run build >/dev/null && grep -o 'sounds/die-[1-4].m4a' dist/sw.js / sort -u / wc -l = 4` - exit 2

```
/bin/sh: 1: Syntax error: EOF in backquote substitution
```
