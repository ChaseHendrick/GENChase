# Scientific validation contract

The [Reuleaux review](REULEAUX.md) demonstrates a complete numerical-and-print
review within an explicitly enumerated recipe domain, including failure controls
and the distinction between continuous geometry and raster output.

The [CPU dynamics follow-up](CPU-DYNAMICS.md) covers the rigid-body integrator
correction, finite-time FPUT evolution, single KP-I lumps and unresolved claims.

The [force-chain audit](GRAINS.md) tests Cundall–Strack contact mechanics against
analytic collisions and friction, and the static balance of settled packings with their
actual prints. It records two missed criteria and a top-load defect.

The [complete rational lump review](LUMP-FIELD-REVIEW.md) adds exact local algebra,
whole fields, corrected sum diagnostics and actual print comparisons.

The [orbit audit](ORBITS.md) tests finite figure-eight trajectories and selected
Schwarzschild capture and turning-radius calculations.

The [material-wave audit](MATERIAL-WAVES.md) covers limited Hasimoto, Gerstner and
square Chladni calculations and records excluded components.

The [exact-wave follow-up](EXACT-WAVE-FOLLOWUP.md) records bounded breather and
peakon checks, plus known diagnostic and Airy gaps.

`techniques.json` catalogs simulations. `validation/techniques.json` records their scientific
validation coverage. `node tools/science.js --write` generates VALIDATION.md; without `--write`,
the command checks coverage and report freshness. A passing inventory check verifies records,
not the science of every technique.

Each record identifies source files, the credited reference and displayed equation, a status,
assumptions/limitations, remaining work, numerical evidence and print evidence. Copied catalog
equations are descriptions to audit, not assertions of paper accuracy.

Statuses:

- **unvalidated**: no qualifying numerical evidence has been registered. Existing diagnostics may still exist.
- **partially validated**: recorded tests support a specifically bounded claim; gaps remain.
- **validated within stated limits**: numerical and print evidence cover a documented parameter domain.
  This does not mean all parameters, all hardware, or exact agreement with a physical experiment.

Evidence entries specify a repository test path, scope, acceptance criteria and limitations.
Every numerical entry also requires:

- `benchmark`: the independent analytic, numerical or published reference and why it tests the claim.
- `failureControl`: a deliberate wrong result or implementation change that the test detects.
- `command`: the reproducible test command, with required setup documented alongside the test.
- `results`: a nonempty JSON object saved under `validation/results/`, containing measured results.

For full validation, `domain` is an object describing `parameters`, `conditions` (including initial
and boundary conditions and physical time where relevant), `resolution` and `precision`. Also supply
a real, nonfuture `reviewed` date in `YYYY-MM-DD` form and a `results` JSON artifact under
`validation/results/` covering the reviewed numerical and print claims.

The inventory rejects missing evidence fields, placeholder domains, invalid dates, non-file paths
and known smoke/export/inventory scripts presented as numerical evidence. It checks the structure
of result artifacts, not the truth or adequacy of their contents. It does not execute `command`.
A reviewer must run the test, inspect the reference and failure control, and check that the reported
limits match the results before promoting a status. Merely filling these fields cannot validate a
formula. Never upgrade a status because an export looks good, syntax passes or a source is cited.

An outside review is recorded on a record as an optional `reviewers` array. Each entry is an object with
exactly `name`, `affiliation`, `date` (a real, nonfuture `YYYY-MM-DD`), `scope` (what was checked, in the
reviewer's words) and `evidence` (an `https` link to the sign-off, such as the outside-review issue, or a
file in this repository). The inventory fails a malformed entry and an empty array; omit the field when
there is none. VALIDATION.md shows the reviews in its Outside review column. A review covers the scope it
states, which is at most the recorded domain, never the whole tab, and a status is promoted only by the
evidence rules above. [docs/REVIEWING.md](../docs/REVIEWING.md) is the reviewer's guide.

New formulas use the contributor module workflow in [FORMULA-SUBMISSIONS.md](FORMULA-SUBMISSIONS.md).
They begin as **unvalidated**. Finite numerical checks, mathematical proof, agreement with experiments
and historical originality are separate claims.

The [classical collapse-family review](VORTEX-FAMILIES.md) and
[complete GL field review](GL-FIELD-REVIEW.md) add bounded full-field and actual print
evidence, including corrections discovered by those independent comparisons.

The [finite geometry field review](GEOMETRY-FIELD-REVIEW.md) independently reconstructs
Hopf, Apollonian and finite Weierstrass fields and checks every actual print pixel.

## What a scientific review must establish

The new field and particle additions have bounded audits in [MAXWELL.md](MAXWELL.md) and
[MOLECULAR.md](MOLECULAR.md). Their heavy settings do not change the evidence rules below.

1. Compare implemented equations, boundaries, units, forcing and discretization with the primary reference.
2. Specify a benchmark independent of the implementation: exact solution, conserved quantity,
   independently computed reference or published quantitative result. Include a deliberate failure control.
3. For PDEs and ODEs, vary spatial/temporal resolution at the same physical domain and time.
   Increasing a lattice dimension at fixed cell spacing changes the domain; it is not a convergence study.
4. For stochastic systems, compare independent seeds with an uncertainty estimate and declared sample size.
5. For exact/discrete constructions, use appropriate algebraic, combinatorial or geometric invariants.
6. Test the real print path at declared dimensions, record the numerical grid and precision, and verify
   that exporting does not alter the scientific state. Upsampling adds pixels, not resolved physics.

Existing `check.js` tests are visual/runtime regression checks. `export.js` exercises exports;
`sharp.js` measures image detail. None alone certifies paper accuracy. Current float16 fallbacks,
clamps, finite lattices, noise and boundary choices need explicit review.

The mobility correction and temporal refinement are documented in [CAHN-HILLIARD.md](CAHN-HILLIARD.md).
The subsequent click/timestep correction and its historical failure controls are in [CAHN-STABILITY.md](CAHN-STABILITY.md).
Wave evolution, time levels and bounded convergence are covered in [SCHRODINGER.md](SCHRODINGER.md).
The convection component audit and instantaneous-transport limits are in [CONVECTION.md](CONVECTION.md).

Priority: the remaining Cahn-Hilliard/PDE convergence and precision checks, wave/transport solvers, then stochastic measurements and
the remaining families. The double-triangle/polygon vortex module has a complete review for 16 enumerated recipes;
unlisted recipes remain outside its validated domain. The inventory deliberately exposes gaps.
The wider plan, including the exactly solvable tabs that are the cheapest promotions, is in
[docs/RESEARCH-GRADE.md](../docs/RESEARCH-GRADE.md).

[Parametric surface geometry and print evidence](SURFACES.md) checks three classical families, with independent curvature and finite-mesh controls.

Further bounded audits: [PLASMA.md](PLASMA.md), [SHALLOW.md](SHALLOW.md), and [NONRECIPROCAL.md](NONRECIPROCAL.md).

The five multi-species reaction-diffusion tabs (excitable, turing, cyclic, chemotaxis, vegetation) have bounded GPU benchmarks in [RDX.md](RDX.md).

The current PDE family guard and stencil review is recorded in [PDE-FAMILY.md](PDE-FAMILY.md). Neuroscience additions are bounded by [HODGKIN-HUXLEY.md](HODGKIN-HUXLEY.md) and [NEURAL-MASS.md](NEURAL-MASS.md); neither is a clinical or finite-neuron validation.

[Direct gravity](DIRECT-GRAVITY.md) and [wave volume](VOLUME-WAVE.md) have bounded analytic and numerical checks. Their extreme workload controls extend beyond the tested accuracy domains. The optional native CPU fixtures are in `results/heavy-runner-check.json`; CuPy/CUDA execution remains unverified on the local Mac.

[Complete analytic wave fields and prints](ANALYTIC-FIELD-REVIEW.md) covers 17 exact-wave recipes and the corrected breather energy diagnostic.

[Periodic field review](PERIODIC-FIELD-REVIEW.md) completes finite gyroid-approximation and circle-map recipes with corrected diagnostics and high-precision references.

Completed follow-ups: [positive peakon fields and prints](PEAKON-FIELD-REVIEW.md), [complete MPR recordings](NEURAL-MASS.md), and [discrete inhibitory growth](PHYLLOTAXIS.md).

The [complete PDE field review](PDE-FIELD-REVIEW.md) checks six finite solvers and all their print views. The [spanning-tree review](UST.md) combines exact graph enumeration, measured sampling frequencies, and independent print geometry.

The exactly solvable tabs of [RESEARCH-GRADE.md](../docs/RESEARCH-GRADE.md), section 2, each have a review of the same kind: [Ising](ISING.md) against Yang's magnetization, Onsager's energy and the Binder cumulant; [random matrices](RMT.md) against exact moments, the semicircle and the Gaudin-Mehta spacing law; [SLE](SLE.md) against closed-form drivers and the dimension 1 + kappa/8; the [Aztec diamond](AZTEC.md) and [lozenge tilings](LOZENGE.md) against exact counts, uniformity and the arctic limit shapes. Each states the disagreements it found.

The [complete finite FPUT review](FPUT-FIELD-REVIEW.md) covers independent chain
trajectories, energy diagnostics, working duration controls and real print output.

The [aperiodic tilings review](TILINGS.md) checks the Penrose, Ammann-Beenker and dodecagonal
geometry exactly and the print path against it. It stays partially validated because of two recorded
defects: the P3 matching arcs are not a valid decoration, and the grout inset moves tiles outward.

The [Veselago lens review](VESELAGO.md) checks every ray of the actual module against an
independent negative-index Snell trace across the slider domain, and checks every print pixel
against the field. It stays partially validated because of two recorded defects: the status label
claims a focus where no image exists, and the exit ray is drawn backwards when the slab runs off
the plate.
