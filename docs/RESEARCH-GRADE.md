# Research grade: what is still missing

A dated audit, written 2026-09-24 from the repository at that day's `main` and from a survey of
comparable public projects. It is a plan, not a record of completed work. Numbers below are a
snapshot; [VALIDATION.md](../VALIDATION.md) is the live source for validation status.

Agents: read this before choosing validation or infrastructure work, and prefer the items in the
order given. When a pull request finishes an item, move it to **Done** at the bottom with the pull
request link, and correct any snapshot figure the change made stale. Do not delete a finding
because it is inconvenient; if it was wrong, say so under it.

"Research grade" here means three things: a scientist could cite a number the studio prints, a
referee would accept the evidence behind it, and someone else could reproduce it on their own
hardware. The project's own vocabulary already separates the parts. Verification asks whether the
code solves its equation correctly; validation asks whether the equation and its parameters match
the cited paper; uncertainty quantification asks how far the printed number can be trusted. See
W. L. Oberkampf and C. J. Roy, *Verification and Validation in Scientific Computing*
(Cambridge University Press, 2010).

## Where the project stands (snapshot, 2026-09-24)

- **Validation status:** 48 techniques validated within stated limits, 3 partially validated,
  79 unvalidated.
- **Already strong, and rare in this genre:**
  - The evidence contract in [validation/README.md](../validation/README.md). Every numerical
    entry needs a benchmark, a failure control, a command and a results file.
  - Negative controls that must fail.
  - A prior-article ledger ([RESEARCH.md](../RESEARCH.md)) and a novelty audit that reports zero
    confirmed novel findings rather than overstating.
  - Versioned recipes with `legacy` defaults, so old links reprint at the values they were made at.
  - A real print path: PDF with an embedded ICC profile, bleed and crop marks, TIFF, and SVG for
    vector plates.
- **Public landscape:** see the 2026-09-24 survey entry in [RESEARCH.md](../RESEARCH.md).
  - Closest in scientific rigor: VisualPDE. It is peer reviewed (*Bull. Math. Biol.* 85:113,
    2023), but covers PDEs only and is not print oriented.
  - Closest science-art studios: Simunauts (84 browser simulations) and Morphon (63 on iOS).
    Their validation and print paths could not be checked.
  - fxhash and Art Blocks use the same seed-as-artwork model, with no science.
  - No project was found that combines all of the above. That negative rests largely on search
    snippets, because most non-GitHub hosts were unreachable.

The gap is therefore not engineering. It is external review, validation coverage, and the
features that let a researcher use the output as data.

## 1. External review and publication

This is the largest gap, and most of it is not code.

**1a. Independent review of validation records.**
- **Finding:** every record was reviewed inside the project. The contract itself says a
  reviewer must run the test before a status is promoted.
- **Done when:** at least one named outside domain expert has run the command and signed off
  for each flagship family:
  - a phase-field specialist for `cahn`, `ohta` and `pfc`;
  - a statistical-mechanics specialist for the lattice tabs;
  - a computational neuroscientist for `hodgkin-huxley`, `neural-mass` and `cortex`;
  - a fluids specialist for the vortex families.
- **Schema:** if the record needs a reviewer field, add it to `tools/science.js` in the same
  pull request.

**1b. The vortex paper.**
- **Finding:** `papers/minimal-winding/submission/cover-letter-rcd.md` is a draft. It still has placeholders
  for the suggested reviewers. arXiv is deferred until the owner has an endorsement (owner's decision,
  2026-09-25); the Zenodo release 2.0.0 is the preprint of record.
- **Why:** one peer-reviewed publication is worth more credibility than any number of internal
  audits.
- **Done when:** the manuscript is submitted to the journal.

**1c. A DOI for the software.**
- **Finding:** `.zenodo.json` describes the vortex identities note ("GENChase identities:
  Three-vortex collapse bound, ...", `upload_type: publication`), not the software.
  `CITATION.cff` has no DOI.
- **Risk:** Zenodo's GitHub integration reads `.zenodo.json` when it archives a release. If the
  integration were switched on as things stand, every software release would be archived under
  the note's title.
- **Done when:**
  - `.zenodo.json` describes the software;
  - the note is its own Zenodo upload;
  - the software DOI is in `CITATION.cff`.
- **Identity:** settled 2026-09-25. Every record uses the author's legal name, Chase Hendrick,
  with ORCID 0009-0002-9754-6087; the GitHub account is ChaseHendrick (formerly SharpMeow).

**1d. A software paper.**
- **Venue:** the Journal of Open Source Software (JOSS) is the natural one. It accepts only
  software with a clear research use, so do section 5 first.

## 2. Validate the exactly solvable tabs first

These are the cheapest promotions in the catalog, because the right answer is a theorem. Some
tabs already quote it (`src/modules/lattice.js` states Onsager's T_c and both percolation
thresholds; `aztec.js` and `rmt.js` name the arctic circle and the semicircle), but none has a
registered, reviewed test. The spanning-tree review ([validation/UST.md](../validation/UST.md)),
which combines exact enumeration with measured sampling frequencies, is the model to copy.

| Tab | Exact benchmark | A failure control that must be caught (suggested) |
|---|---|---|
| `ising` | Onsager's T_c = 2/ln(1+√2) (Phys. Rev. 65, 117, 1944); Yang's spontaneous magnetization M = (1 − sinh⁻⁴(2/T))^{1/8} below T_c (Phys. Rev. 85, 808, 1952). Use Binder-cumulant crossings over several lattice sizes, not one plate. | A wrong acceptance rule or a wrong neighbor sum shifts the crossing |
| `percolation` | Bond threshold exactly 1/2 (Kesten 1980); site threshold ≈ 0.592746 (numerical). Use spanning probability over several sizes. | Diagonal neighbors in the labeling shift the site threshold |
| `aztec` | Arctic circle theorem (Jockusch, Propp and Shor 1998, arXiv:math/9801068): the frozen boundary tends to the inscribed circle. | Biased shuffling weights move the boundary |
| `lozenge` | Coupling from the past is exact. Enumerate every tiling of a small hexagon and test the sampled frequencies; MacMahon's product ∏ᵢ∏ⱼ∏ₖ (i+j+k−1)/(i+j+k−2) gives the count. | A biased update or a premature coalescence test |
| `sandpile` | Toppling order does not change the stabilized state (abelian property). The number of recurrent configurations equals the number of spanning trees (Dhar, Phys. Rev. Lett. 64, 1613, 1990). | An order-dependent toppling rule |
| `sle` | The trace has dimension min(2, 1 + κ/8) (Beffara, Ann. Probab. 36, 2008). Use box counting with a stated fit range and seed ensemble. | Wrong driving variance, which changes κ |
| `rmt` | Semicircle density and the beta-ensemble spacing laws (already credited in the tab). Use a goodness-of-fit test with a declared sample size. | Wrong beta scaling in the tridiagonal model |
| `ssh`, `kitaev` | Exact edge zero modes and winding numbers in the topological phase. `ssh` already has `tools/ssh-science.js` registered, but the record is unvalidated. | Wrong boundary hopping removes the zero mode |

Each promotion still follows the contract: domain, resolution, precision, reviewed date and a
results file under `validation/results/`.

## 3. Make uncertainty a gate, not guidance

Status: done, see **Done**. The findings below are kept as the audit that motivated it.

- **Finding:** AGENTS.md ("A measured number carries an error bar") says error bars are
  "guidance rather than a gate". Changing that is the maintainer's decision; this is the proposal.
- **Shared harness:** one ensemble harness under `tools/lib/` that every stochastic witness uses:
  - independent seeds through `U.makeRng`;
  - the integrated autocorrelation time and the effective sample size it implies;
  - a block bootstrap for derived quantities.
- **Lint rule:** any status line that prints a measured value beside a theoretical one must also
  print an uncertainty, or the words "exact, no sampling error".
- **Near-critical Monte Carlo:** single-flip Metropolis decorrelates very slowly near T_c. Report
  τ_int with any near-critical measurement, or add Wolff cluster updates (Phys. Rev. Lett. 62,
  361, 1989) for measurement runs.

## 4. Numerics that survive real hardware

**4a. Real GPUs.**
- **Finding:** 61 scripts in `tools/` launch Chromium with SwiftShader, a software renderer, and
  CI runs them on GitHub-hosted `ubuntu-latest` runners. The GPU science has not been measured on
  a physical GPU.
- **Why it matters:** this repository has already met a renderer-specific floating-point failure.
  The 2026-09-22 GL field review found artificial amplitude loss from SwiftShader's small-angle
  trigonometry. Physical GPUs differ in fused multiply-add, denormal flushing and transcendental
  precision in their own ways.
- **Done when:** the science suite has run on at least one Apple, one NVIDIA and one AMD or Intel
  GPU, with renderer strings recorded and witness values compared within stated tolerances.

**4b. Half precision.**
- **Finding:** 14 module files upload `HALF_FLOAT` textures as a fallback. The validation
  contract already lists "float16 fallbacks" as needing explicit review.
- **Done when:** each such tab measures its error floor at half precision and labels or
  suppresses its measured values when running on the fallback.

**4c. Order of accuracy.**
- **Target:** report the observed order of accuracy against the formal order for every PDE,
  refining at a fixed physical domain and time (contract item 3).
- **Finding:** the method of manufactured solutions is used only in
  `tools/convection-science.js`. It is the standard way to test a solver whose exact solution is
  unknown.

**4d. Match the paper, not just the equation.**
- **Finding:** most unvalidated records say "Catalog equation and citation are review targets,
  not verified paper equivalence."
- **Done when:** each such tab reproduces one quantitative result from its cited paper. An
  example is Pearson's Gray-Scott parameter map (Science 261, 189, 1993) for `reaction`.

## 5. Make it an instrument, not only a printer

Status: done for provenance, the headless run and the first `exportData()` tabs; see **Done**.

**5a. Raw data export.**
- **Finding:** exports are PNG, PDF, TIFF and SVG. There is no way to get the field arrays or the
  measured time series out.
- **Proposal:** a dependency-free `.npy` (float32) export of the state, with a JSON sidecar giving
  grid spacing, physical time, units, recipe hash and commit, plus the witness values.
- **Constraint:** keep it in the engine so there is still one export stack. An added engine
  method is an API change under [docs/ENGINE-API.md](ENGINE-API.md) and needs the engine API
  checks.

**5b. Provenance in every file.**
- **Finding:** the colophon parts are title, equation, seed, parameters, palette, print size and
  date (`COLO_PARTS` in `src/shared/engine.js`). Neither the colophon nor
  `src/shared/print-formats.js` records:
  - the software version or commit;
  - the recipe version;
  - the GPU renderer;
  - the numeric precision.

  No file-level metadata is written: no PNG text chunks, no PDF Info dictionary, no TIFF
  description tag.
- **Done when:** every export embeds the recipe hash, commit, renderer and precision, and a test
  reads them back.

**5c. A headless run API.**
- **Finding:** `tools/plate.js` renders gallery images only.
- **Proposal:** a documented command that takes a recipe hash and a step count and writes the
  state and the witness values, so a researcher can run a parameter sweep without the UI.

## 6. Scope discipline

Status: done, see **Done**.

A research user trusts the weakest tab they happen to open. Consider pausing new tabs until the
unvalidated count is below half the catalog. Alternatively, make the validation status
impossible to miss on the tab itself, if it is not already.

## Suggested order

1. **Fix the Zenodo metadata (1c):** a few hours.
2. **Validate the exactly solvable tabs (section 2):** about a week.
3. **Build the ensemble harness and the uncertainty gate (section 3).**
4. **Run the suite on real GPUs (4a), then settle half precision (4b).**
5. **Add data export, provenance and the headless API (section 5).** These are prerequisites for
   a JOSS submission.
6. **Pursue external review and the papers (1a, 1b, 1d) alongside the rest.**

## Done

**Section 3, uncertainty as a gate** ([ChaseHendrick/GENChase#146](https://github.com/ChaseHendrick/GENChase/pull/146)).
- `src/shared/stats.js` is the shared harness: tau_int with Sokal's window, series and field means with
  honest standard errors, blocking, moving-block and slope bootstraps, the Hill estimator, and `compare()`.
  `node tools/stats-check.js` checks it against closed-form answers, with negative controls: the naive
  error on an AR(1) series and the OLS error on one trajectory must undercover, and do.
- `compare()` will not print a comparison without a basis (sampled with an error bar or a pending reason,
  exact, deterministic, construction). `tools/lint.js` fails hand-written comparisons and any `compare()` or
  `setWitness()` without a basis. AGENTS.md now calls it a gate.
- The 121 candidate comparisons the audit found are converted or classified; see
  [validation/COMPARISON-AUDIT.md](../validation/COMPARISON-AUDIT.md), which also lists the reference
  problems found and not fixed.
- Ising reports |m| with a tau_int error bar and, near T_c, tau_int itself in sweeps; below 0.95 T_c at
  h = 0 it is compared with Yang's exact magnetization. Wolff updates were not added.

**Section 2, the exactly solvable tabs** ([ChaseHendrick/GENChase#146](https://github.com/ChaseHendrick/GENChase/pull/146), [#147](https://github.com/ChaseHendrick/GENChase/pull/147), [#148](https://github.com/ChaseHendrick/GENChase/pull/148) and [#150](https://github.com/ChaseHendrick/GENChase/pull/150)).
- Validated within stated limits: `ising` (Onsager's T_c by Binder crossings, Yang's magnetization),
  `percolation` (bond 1/2 and site 0.5927 by spanning probability, with diagonal and anisotropic controls),
  `sandpile` (the abelian property and exact toppling counts against independent references, after the
  counter was fixed), `rmt` (the semicircle and the Gaudin-Mehta spacing laws) and `kitaev` (the
  Bogoliubov-de Gennes spectrum and its edge modes).
- Partially validated, each for its stated reason: `aztec`, `lozenge` and `sle`.
- Still open: `ssh` has its tool but its record is unvalidated, and the Aztec and lozenge frozen-region
  readouts are being reworked.

**Section 5, data out and provenance in** (same pull request).
- Every PNG, PDF, TIFF, JPEG and SVG export and the print-job JSON carry `Studio.getProvenance()`: recipe
  link, build fingerprint, source SHA-256, validation status, witness, renderer and precision. WebP carries
  none.
- `Studio.exportData()` and the science report's "Download data (.npz)" give the state as NumPy arrays with
  `meta.json`. Implemented for the six `pde` tabs, the five `rdx` tabs and `ising`; other tabs export
  `meta.json` only and say so.
- `node tools/run.js <hash> --out plate.npz --steps N [--set key=value]` runs a recipe headlessly.
- `node tools/provenance-check.js` reads the provenance back from the real export buttons.

**Section 6, scope** (same pull request).
- Every tab in the strip carries a status glyph, the stage's science-report button names the status, and the
  module browser's evidence filter works without loading the inventory.
- `validation/scope.json` sets a ceiling of 130; `tools/lint.js` fails a larger catalog while at least half of
  it is unvalidated.

Still open from these sections: seed ensembles run from the tools for the tabs whose error bar is pending,
Wolff cluster updates for near-critical measurement runs, and `exportData()` for the remaining field and
particle tabs.
