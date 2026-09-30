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

## Initial status handoff

RDX now publishes the new grid, step 0 and a standalone `computing` marker before
its initial asynchronous measurement. Previously a preset could leave the prior
plate's completed status visible while the new measurement waited. The pending
status carries no old measured range or scientific diagnostic. Equations, RNG,
recipes, numerical steps, timers and shaders are unchanged.

The focused browser test switches the actual UI from CIMA to relief at the same
seed and grid 128, retaining their original 2000 and 1500 warmup steps. It holds
the initial GL fence for 200 ms. The old source fails because CIMA's step 2000
status remains visible; the repaired source reports step 0 and `computing`, then
finishes the requested Schnakenberg relief at step 1500. Every exported Float32
species value and its metadata match the old source exactly, as do every pixel
of the actual 1200×1200 PNG. Export leaves the field unchanged.

[The separate dated evidence](../validation/results/rdx-status-handoff-2026-09-29.json)
records source, fixture, report and log hashes, Chromium 145.0.7632.6 with
Playwright 1.58.2 and SwiftShader, and the 180-second process cap. The negative
control exits 1; the corrected test exits 0. This establishes status handoff and
state preservation in the tested transition, not improved performance or a
broader scientific validation. Earlier readback baselines remain unchanged.

After rebuilding, reproduce with
`node tools/rdx-status-check.js --write=rdx-status-report.json` under a 180-second
process cap. `STUDIO` and `RDX_SOURCE` can select a matching old-source scratch
fixture for the negative control. Raw paired reports and logs remain in the
workspace's `work/rdx-status/` directory.

The final maintained source also passed all 90 existing numerical checks and
detected all 27 failure controls on Apple M1 Pro Metal float32 in 49.731 seconds
under a 180-second cap. The unchanged harness, exact source fingerprint and full
results are retained in [the new numerical record](../validation/results/rdx-status-science-2026-09-30.json).
This rerun preserves the existing scientific scope and does not establish final
full-catalog preset coverage.
