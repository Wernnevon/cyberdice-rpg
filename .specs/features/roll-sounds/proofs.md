# roll-sounds proofs

**HEAD**: aa0e485
**Tree**: clean
**Shell**: /bin/sh
**Result**: 17 pass, 0 fail

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
| C16 | `npm run build >/dev/null && node -e "const n = new Set(require('fs').readFileSync('dist/sw.js', 'utf8').match(` | pass |
| Build | `npm run build && npm run lint` | pass |

## Output

`Run unit` - exit 0

```
# Subtest: SND-01.1 a die hitting the table or a wall sounds at its own speed
ok 26 - SND-01.1 a die hitting the table or a wall sounds at its own speed
  ---
  duration_ms: 0.096234
  type: 'test'
  ...
1..26
# tests 26
# suites 0
# pass 26
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 104.752615
```

`npm run build >/dev/null && node -e "const n = new Set(require('fs').readFileSync('dist/sw.js', 'utf8').match(` - exit 0

```
4 sounds precached
[plugin builtin:vite-reporter] 
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
```
