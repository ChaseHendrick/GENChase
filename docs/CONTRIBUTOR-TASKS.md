# Draft contributor tasks

These are issue drafts for maintainer review, not published GitHub issues or completed work.
Check current source and the validation inventory before starting. A passing image check
does not establish scientific accuracy. Preserve the shared engine and scientific CI.

## Contribute computer time: least-winding vortex collapse

Scope: run seed blocks of the vortex-collapse search on your own machine and share the result
files, including blocks that found nothing new. The open questions, the certificate and the
suggested jobs are in `experiments/VORTEX-COLLAPSE.md`. No code change is needed.
Command: `npm run validator:headless -- --mode vortex-collapse --alpha 0 --n 7 --samples 200 --machine <label>`,
or `--mode vortex-grow --alpha 0 --n 30 --samples 10` to continue the deepest family. Long runs can be
announced with the "Claim a seed block" issue template.
Acceptance: the maintainer re-verifies every submitted minimum from its positions and circulations
with `node tools/vortex-collapse-search.js --verify <file> --write`. A lower value is recorded only
after it survives that check. It remains a numerical candidate with priority unconfirmed.

## Good first: explain the portable fallback

Scope: improve the launcher message when Python is unavailable. Keep it short, identify
`dist/studio.html`, and handle a missing portable file with an actionable message.
Files: `run/genchase.sh`, the macOS and Windows launchers, and `README.md`.
Acceptance: exercise Python-present, Python-missing and portable-file-missing cases on the
target platform; no public network binding, download or dependency installation.

## Good first: clarify a module's measurement label

Scope: choose one ambiguous status line from the catalog and distinguish measured value,
reference value, units and any uncertainty without changing the solver. Read its validation
limitations first. Do not add a passing badge to a value forced by construction.
Neighbor: status rendering in `src/modules/gerstner.js`.
Checks: `node tools/build.js`, `node tools/index.js`, `npm test`, then
`node tools/check.js <id> 12000` and `node tools/export.js <id> 8 300`.

## Good first: keyboard-test module loading feedback

Scope: check focus and readable errors while a tab loads or a local family request fails.
Improve labels or focus behavior only where a reproducible problem is found.
File: `src/shared/engine.js`; use the existing tab host, never add a parallel loader.
Acceptance: keyboard navigation works after a slow load and a retry; no invisible active
canvas. Run `npm test` and `node tools/ui.js` after building.

## Add a plate check: breather physical energy

Scope: replace or clearly relabel the current squared-field diagnostic. Physical sine-Gordon
energy includes time and space derivatives plus `1 - cos(u)`. Existing partial checks do not
certify the displayed diagnostic. Read `validation/EXACT-WAVE-FOLLOWUP.md`.
Files: `src/modules/breather.js`, `tools/breather-science.js`, and a new print-state check.
Acceptance: compare physical energy and exterior energy from the actual rendered state at
two resolutions against an independent integral; a wrong derivative or time must fail.
Checks: `node tools/verify.js breather`, `node tools/export.js breather 8 300`.
Register the added print evidence before running `node tools/verify.js --print breather`.

## Add a plate check: circular Chladni boundary residual

Scope: audit the circular-mode radial roots, then measure the intended boundary condition
from actual field samples. Square membrane tests do not validate circular elastic plates.
Read `validation/MATERIAL-WAVES.md` and define which physical model the tab implements.
Files: `src/modules/chladni.js`, with `tools/material-wave-science.js` as a test neighbor.
Acceptance: independent Bessel roots, a boundary residual and resolution refinement for
several orders; a deliberately wrong root must fail. Record excluded plate mechanics.
Checks: `node tools/verify.js chladni`, `node tools/export.js chladni 8 300`, then
`node tools/verify.js --print chladni` after registering the new evidence.

## Add a plate check: Aubry normalization and localization

Scope: reconcile the hopping and potential convention with the displayed transition label.
Then compare the actual finite-chain state with an independent matrix calculation.
Files: `src/modules/aubry.js`; read its reference and `validation/MATERIAL-WAVES.md` first.
Acceptance: residual norms, at least two chain lengths, and explicit finite-size limits.
A wrong potential amplitude must fail. A pleasing localized image is insufficient evidence.
Checks: `node tools/check.js aubry 12000`, `node tools/export.js aubry 8 300`, then
`node tools/verify.js --print aubry` after registering numerical and print tests.

## Validate an exactly solvable tab

Scope: promote one of `ising`, `percolation`, `aztec`, `lozenge`, `sandpile`, `sle`, `rmt`,
`ssh` or `kitaev` against the theorem listed for it in the table in
[RESEARCH-GRADE.md](RESEARCH-GRADE.md), section 2. The answer is known exactly, so these are the
cheapest promotions in the catalog. Copy the method of `validation/UST.md`: exact enumeration or
an exact invariant, measured frequencies over independent seeds with a declared sample size, and
a failure control that must be caught.
Files: the tab's source in `src/modules/`, a new `tools/<id>-science.js` or `tools/<id>-review.js`,
its results file under `validation/results/`, and the record in `validation/techniques.json`.
Acceptance: the record meets every field in `validation/README.md`; a finite-size measurement
states the sizes and the extrapolation rule; the failure control fails.
Checks: `node tools/build.js --check`, `node tools/science.js --write`, `node tools/lint.js`,
`node tools/check.js <id> 12000` and `node tools/export.js <id> 8 300`.

## Done: Fisher-KPP invasion front

Added as the `fisher-kpp` tab ([src/modules/fisher-kpp.js](../src/modules/fisher-kpp.js)), from the proposal
that stood here: R. A. Fisher, [The wave of advance of advantageous genes](https://doi.org/10.1111/j.1469-1809.1937.tb02153.x)
(1937), the scalar logistic reaction-diffusion equation on a closed (zero-flux) plate, drawn as the arrival time
of the front. Its record in `validation/techniques.json` starts unvalidated. The acceptance items are in
[validation/FISHER-KPP.md](../validation/FISHER-KPP.md): the homogeneous logistic benchmark, the straight-front
speed of the scheme against Bramson's lag and the Ebert-van Saarloos term, refinement, the plate's own front-speed
witness, a wrong-diffusion-sign control (`tools/fisher-kpp-science.js`) and print-state agreement
(`tools/fisher-kpp-print.js`). Run `node tools/verify.js --print fisher-kpp`.

## Done: finite-relaxation heat transport

Added as the `cattaneo` tab ([src/modules/cattaneo.js](../src/modules/cattaneo.js)): the linear, constant-coefficient
Maxwell-Cattaneo-Vernotte model, labeled as that simplification of the nonlinear equations of R. Kovács and
P. Rogolino, [Numerical treatment of nonlinear Fourier and Maxwell-Cattaneo-Vernotte heat transport equations](https://arxiv.org/abs/1910.09175).
It is not a material model. Its record starts unvalidated. The acceptance items are in
[validation/CATTANEO.md](../validation/CATTANEO.md): Fourier-mode decay and oscillation against the exact
dispersion relation on both sides of k_c, the relaxation limit, second-order refinement and the computed step
bound, the ring speed of one spark, a wrong-relaxation-sign control (`tools/cattaneo-science.js`) and print-state
agreement (`tools/cattaneo-print.js`). Run `node tools/verify.js --print cattaneo`.

Neither tab is a novelty claim, and neither record is promoted past unvalidated until the evidence is reviewed.
