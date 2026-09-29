# RDX readback regression, 2026-09-29

A persistent STREAM_READ pixel buffer caused repeated Chromium shadow-copy warnings even after its fence signaled and the data were collected. Refreshing the 4096-byte buffer storage before the next readback eliminates that warning; simulation and reduction shaders are unchanged.

The actual Chrome Metal comparison covered eight regenerations per tab at grid128 and warmup32, followed by 1200x1200 PNG exports. The old source produced 115 warnings and failed the unchanged warning assertion. The repaired source produced zero warnings, zero GL errors and zero writes over an uncollected result.

| Technique | Collected measurements | Exported Float32 field | Every PNG pixel |
|---|---:|---|---|
| excitable | 24 | exact match | exact match |
| turing | 24 | exact match | exact match |
| cyclic | 24 | exact match | exact match |
| chemotaxis | 24 | exact match | exact match |
| vegetation | 24 | exact match | exact match |

The unchanged cyclic catalog harness also passed its default, all six presets, tab switch and exact step1500 replay with fingerprint c9164800 on both replays. These are rendering/data-integrity regressions, not a scientific-status promotion or a claim covering all browser drivers.

The rebuilt studio then passed the same focused readback test for all five tabs: 24 measurements were collected per tab, with zero warnings, GL errors or pending overwrites. Its field and PNG pixel hashes still match the paired repaired-source runs. The existing numerical suite also passed all 90 checks and detected all 27 failure controls on Metal, without changing tolerances. That fresh source-matched report is [rdx-readback-science-2026-09-29.json](../validation/results/rdx-readback-science-2026-09-29.json); the prior software-renderer evidence is retained.

Reproduce the focused test with `node tools/rdx-readback-check.js --write=rdx-readback.json` after building. The report records browser, studio and harness fingerprints. Baseline/fixed tests used the same built studio with only the rdx factory source replaced. The [paired evidence record](../validation/results/rdx-readback-check.json) retains the actual field and pixel hashes, preserved report fingerprints and failure counts. The full logs remain in the session working files.
