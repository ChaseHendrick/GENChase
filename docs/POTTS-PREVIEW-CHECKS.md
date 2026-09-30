# Potts finite-computation preview

The foam preset previously left its canvas blank during coarsening, including after a viewport resize. The corrected module renders its current labels and areas at most once per 150 ms while the existing status shows the current sweep and target. Resize also paints the available partial state. The solver, RNG sequence, target areas and fitted-law calculation are unchanged.

`tools/potts-preview-check.js` compares the current source with a supplied pre-change source in temporary browser pages. It does not replace the checked-out studio. On Apple M1 Pro / Metal, the old-source resize control was blank while the fixed source had luminance range 172.65. Both finished at sweep 900 with identical complete label, area, side-count, marked-area and fitted-law state, plus an identical final preview PNG. A deliberately corrupting render control changed the scientific state and was rejected. The final capture waits two animation frames after completion so the shell's final resize has finished. No computation wait budget was increased.

The recorded result is [potts-preview-check.json](../validation/results/potts-preview-check.json). This is rendering and state-preservation evidence for one seeded foam recipe. It is not independent numerical validation of the Potts model or of its fitted law. The earlier full-suite raw flat failure is retained separately.

To reproduce from the pre-change commit, with Playwright and a configured browser available:

```sh
git show cc6d47b:src/modules/potts.js > /tmp/genchase-potts-before.js
node tools/potts-preview-check.js /tmp/genchase-potts-before.js
```

The full browser check must distinguish unfinished finite work from a completed flat plate. That harness correction is tracked separately; partial previews do not establish completion or deterministic replay.

## Diagnostic cadence

Side counting and the coarsening status now update with the existing 150 ms partial preview instead of after every 45 ms solver chunk. The final side count remains unconditional and immediately precedes the fitted-law calculation. The copy-attempt solver reads labels, areas and target areas, not side counts or status values; the marked-area snapshot also depends only on areas. Scheduled partial paintings get freshly computed diagnostics. A progress counter can therefore lag the advancing solver until the next preview, while the completed status and fit remain current.

The source-matched `diagnosticThrottledComparison` appended to the same result file preserves the initial and `finalBuiltComparison` records. Actual Chrome comparison of the prior partial-preview source and this throttle completed all 900 foam sweeps with identical full-state and final preview-PNG hashes. Both partial plates remained visible, and a deliberately corrupting render produced different final state and pixels. Its command is:

```sh
git show 6c9d664:src/modules/potts.js > /tmp/genchase-potts-before-throttle.js
node tools/potts-preview-check.js /tmp/genchase-potts-before-throttle.js --baseline-has-preview
```

An exploratory Node ABBA profile used the production solver, RNG and statistics at grid 320 with the same 900-sweep foam recipe. With painting and DOM updates stubbed only in that profiling copy, the throttle made 66% fewer diagnostic calls and spent 47% less measured time inside count/status functions, about 0.57 seconds less per run. Final state, fits and RNG draw counts matched exactly. Total elapsed times were noisy and did not establish a wall-time speedup. This optimization does not guarantee completion within a 12-second smoke budget. Earlier unfinished runs retain their `INCOMPLETE` classification; no solver effort, completion criterion or timeout is reduced or increased.

The named throttled-source smoke run (`node tools/check-next.js potts 12000`) retained `INCOMPLETE`: foam reached 829/900 sweeps and area 957/1000 within the unchanged per-case budget. The default completed at 700 sweeps and replayed exactly (`8d7f6bbe` twice); the other presets and tab return passed. `node tools/export.js potts 8 300` passed all eight 2400×2400 sheet checks. Several readiness observations were still coarsening, so these print checks establish nonblank artifact integrity, not completed numerical states. Both commands finished within the unchanged 900-second overall cap, in 202.308 seconds total.
