# Local engine regression audit

The first complete hardware sweep covered all 137 techniques with normal-motion defaults and every preset, supported paused or reduced-motion replay, and tab return. It completed in 4688.8 seconds: 129 passed and eight failed. Nothing timed out or was skipped. These are runtime and rendering checks, not numerical or scientific validation.

The run used Chrome on Apple M1 Pro through ANGLE Metal, two workers, 12000 ms per default/preset settling budget, 150000 ms for replay, a 900-second per-technique cap, and a 10800-second overall deadline. The frozen portable studio SHA-256 was `8b96fba6f75fa59927c074b582a26a2d3e1af7409804b98f2f665d72802f93b5`; the frozen harness was `b3e8650e8392fad286808339862229ae573af02f2c13feab2efb361249184ca6`. Both remained unchanged throughout. Results are in [the baseline record](../validation/results/engine-hardware-baseline-2026-09-29.json).

| Baseline failure | Finding and subsequent evidence |
| --- | --- |
| Cyclic, Turing, excitable, chemotaxis, vegetation | Persistent READ-usage buffer storage triggered Chrome warnings. Revised buffer allocation preserves field values and print pixels. All five subsequently passed full default/preset/replay/tab checks without suppressing the warnings. |
| Potts | The foam capture was still coarsening and its old preview was black. Progressive painting fixes the blank preview. The revised harness reports unfinished finite work as incomplete. |
| Skin, ring preset | A clean periodic chain has uniform plane-wave probability. A narrow replacement check verifies actual exported probabilities against 1/N, normalization, shape, edge weight and the fully painted opaque canvas. Corrupt data, a cleared live canvas and a disordered recipe are rejected. |
| Chirikov | Paused initialization accumulated for a wall-clock budget, so identical seeded loads could contain different kick counts. The source correction initializes a declared number of kicks and reports exact hits and kicks for replay comparison. |

A separate scoped run on a later frozen build passed six full checks (the five RDX techniques and Skin) and all five RDX export runs: 38 actual 2400-pixel PNG sheets across defaults and presets. Potts remained **incomplete** under the concurrent load: coarse reached 885/900 sweeps, foam 779/900 and area 866/1000 within the original 12000 ms budget. Its partial plates were visible, and replay matched exactly at 700/700 sweeps. This result is retained in [the scoped record](../validation/results/engine-scoped-2026-09-29.json); it is not a pass for those unfinished presets.

The scoped run used the held `check-next.js` candidate before its later exact Chirikov counter and lazy-import changes. Its exact harness/helper hashes and build hash are recorded separately. The earlier software-rendered run was stopped to avoid contention and is retained as partial evidence; interrupted or unrun cases are not passes.

The integrated harness keeps the same flat-image thresholds, warning gate and wait budgets. It checks declared finite completion before treating a still preview as finished, prioritizes actual missing-canvas and grid-instability errors, and exits 2 for incomplete work. Exact counters must all agree for replay, including both Chirikov hits and kicks. Pure checks run in `npm test`; actual reduced-motion replay and uniform Skin canvas controls run in the browser job and `npm run test:engine`.

A fresh source-matched full-catalog sweep was not started after the final harness and RDX readiness corrections because the owner requested wrap-up. Complete final catalog coverage remains outstanding. The prepared follow-up keeps the original budgets and schedules Potts alone after other workers. No scientific status is promoted by this audit.

## Interrupted final attempt

A later run at commit `9ed948fb41090fa30ee54a79c5831f6233f9ea29` was deliberately stopped after CI exposed a harness defect: Ising's scientific caveat, “a hot or split start is still coarsening; start Cold to compare,” was mistaken for a finite-work progress marker. That CI replay had completed at sweep 250. Informational prose must not make a live plate incomplete; the marker classifier was subsequently revised with a regression using the actual status text. The original CI failure remains evidence of the harness defect.

The stopped run had 17 collected passes, one genuine incomplete BEC dense warmup, three interrupted workers and 116 unrun techniques. BEC still reported relaxing at step 18000 under the unchanged 12000 ms concurrent-load budget, so it remains a recheck target. Toner-Tu printed PASS before termination, but its exit code had not been collected and is conservatively retained as interrupted. The portable studio, harness, helper and all 119 maintained source fingerprints matched their start values at stop. This partial attempt is preserved separately and will not be overwritten or counted as a complete final sweep.

## Preset readiness caveat

A later profiling run with Playwright 1.49.1 / Chromium 131 on SwiftShader exited 0 for Turing in 50.077 seconds, but its relief capture still reported the previous Lengyel-Epstein/CIMA state at step 2000. Relief requests Schnakenberg with a different warmup. That apparent pass does not establish that every requested preset completed. The RDX asynchronous initialization correction is designed to announce its new grid, step 0 and computing state before yielding, so the harness cannot accept the preceding preset's completed status. Shader equations, workload and RNG are unchanged.

The separately recorded hardware relief capture reported Schnakenberg at step 2780, so it did not show that specific stale-model symptom. Nevertheless, the earlier scoped harness passes remain preliminary evidence. A future source-matched sweep still needs to verify readiness after the status correction; the SwiftShader profiling pass is not substituted for that coverage.

## Wrap-up boundary

The completed baseline is **129 passes and eight failures across 137 techniques**. Later targeted work addresses the identified failures, but it does not replace the missing final full-catalog run. The stopped final attempt is **17 collected passes, one incomplete BEC case, three interrupted and 116 unrun**. There is no claim of a fresh all-technique pass.

Recorded build and harness hashes belong to their individual runs. In particular, the initial full baseline and the later scoped checks precede the final active-export pause, Chirikov initialization, Potts diagnostic and RDX readiness/harness corrections in differing combinations. The local deliverable includes a read-only wrap-up fingerprint snapshot and preserves raw logs. That snapshot records the files present at wrap-up; it is not evidence that those exact final files completed every check.

Later named Chirikov print-state, full default/preset/replay checks and 2400-pixel exports passed after deterministic initialization was added. Its retained wrapper sampled the candidate harness fingerprint at report completion while import placement was being edited, so that late fingerprint is explicitly qualified rather than presented as a start-pinned full-catalog result. The subsequent Potts diagnostic-throttle check still exited 2 as incomplete at the original budget, while its separate 2400-pixel export run passed. The planned isolated final Potts check was not run before wrap-up.
