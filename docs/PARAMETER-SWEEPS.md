# Reproducible parameter sweeps

`npm run research:sweep -- examples/sweeps/dptangle-step.json --out work/tangle-run-001`

This local tool runs a JSON plan through the studio's existing `Studio.exportData()` path. It writes a new result directory, keeps every case and failure, and never overwrites or merges an existing experiment. Playwright is the same development dependency used by `tools/run.js`; see [TESTING.md](../TESTING.md). No service, account or network access is needed. HTTP(S) requests from the test page are blocked.

The example varies the double-pendulum illustration's curve RK4 step at fixed energy, section, orbit count and return count, using two seed replicates. It is a small workflow demonstration, not a convergence certificate for chaotic trajectories. Its fixed point and return-time metadata use a separate fixed integration step; they are not convergence measures for the curve step. The compared metric is explicitly the mean canonical momentum of the orbit cloud. Shape mismatches or altered physical settings make the comparison ineligible.

## Plan

A version 1 plan names one `technique`, common `parameters`, named `cases` with additional parameters, and distinct `seeds`. The cross product runs sequentially, with at most 128 runs. Each case uses a fresh browser in a bounded child process. Recipe fields go through the normal hash parser and sanitizer, including segmented and boolean controls. Unknown keys fail instead of silently disappearing.

`sampling.waitMs` is a fixed wait before data export, not proof that an asynchronous warmup finished. Alternatively `sampling.minCounter` waits until the printed step or sweep counter reaches at least that value. **It does not stop time exactly at that counter.** Use a module's fixed-budget paused recipe when equal simulation time matters, and require matching exported time/step metadata in comparisons. Some modules, including `dptangle`, finish their finite job within `exportData()`; others expose their current snapshot. Read the module's data contract.

`limits.caseMs` caps each child, including startup and export, at 1 second to 10 minutes. `limits.totalMs` caps the experiment at 1 second to 30 minutes. Once its remaining budget is too small to start a case, that case is retained as a failure rather than omitted. The current child is killed at its deadline, with its process group on POSIX. Windows uses child termination; the real browser smoke check was run on macOS. Small report-writing overhead can follow the compute deadline.

Every metric must have an explicit name and units (use `dimensionless` where appropriate). Choose either:

- A scalar exported metadata path, such as `grid.returnTime` or `provenance.witness.measured`.
- A named exported array and one reduction: `mean`, `rms`, `min`, `max`, `first` or `last`.

There is no expression evaluator or arbitrary command field. Empty arrays, missing fields and nonfinite metric inputs fail the case and leave any exported NPZ in place. An arithmetic array mean is not a spatial integral. Units are declarations to review, not automatic dimensional analysis. Raw arrays are preserved for specialist postprocessing.

## Results and uncertainty

The result directory contains `plan.json`, numbered NPZ files, numbered recipe/case JSON records, `summary.json` and `summary.csv`. Each successful case records the requested parameters, fully resolved sanitized recipe, changed requests, source fingerprint, compute device, metric definitions and sampling information. Every failure retains its reason and bounded runner log. A CSV metric is a scalar observation, not a scientific verdict.

Within a named case, successful distinct-seed replicates yield the arithmetic mean, sample standard deviation and standard error of the mean. A single success has no SD or SEM. Failed counts stay visible, and failures can bias the successful subset. Different sanitized recipes, source fingerprints or compute devices prevent pooling. Unique seed strings are not proof of statistical independence. No confidence interval is manufactured from a small sample, and repeated snapshots of one trajectory are never counted as seed replicates.

Optional `comparison` requests successive paired scalar differences at the same seed. It names the metric and varied numeric resolution/step parameter, plus explicit `physicalConditions` on the actual recipe and `stateConditions` on exported `grid` metadata. Both cases must equal those values exactly; all other recipe parameters, source and compute device must match. Array-derived metrics must also have identical array shapes and units. The output reports eligibility and a signed difference, **not a convergence order, error bound, proof or validation-status promotion**. It does not interpolate arrays at different resolutions or infer equal physical time from equal step counts. The researcher must declare sufficient physically meaningful conditions.

## One recipe and regression tests

`node tools/run.js '#dptangle/example' --set aspect=4:5 --set curveStep=0.008 --out new-file.npz --report new-recipe.json --timeout 60000`

Overrides are applied together before the module loads, so segmented choices work and intermediate expensive regenerations are avoided. `--report` records requested versus actual recipe and observed counter. Both files must be new. Existing seed/body precedence and recipe migrations remain owned by the shared hash parser.

`npm run test:sweep` runs dependency-free fixtures for the plan, metrics, independent-seed summary arithmetic, comparison refusals, recipe overrides, timeout accounting, failure retention and overwrite refusal. The browser example exercises a real CPU technique and produces inspectable NPZ data. These are research-tool regression tests; they do not validate the underlying model.

The [2026-09-29 runner audit](PARAMETER-SWEEPS-AUDIT.json) records four real CPU cases, independent NPZ readback, the segmented-control/clamping check and a deliberately timed-out case. These records concern the runner; they do not establish convergence of the double-pendulum model.
