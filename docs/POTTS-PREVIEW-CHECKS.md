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
