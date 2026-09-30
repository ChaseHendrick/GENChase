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

A final source-matched full-catalog sweep is pending final integration. It will retain these earlier results and run Potts alone after the other techniques, reflecting one active plate without changing its time budget or recipe effort. No scientific status is promoted by this audit.
