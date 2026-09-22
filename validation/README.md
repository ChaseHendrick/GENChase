# Scientific validation contract

The [CPU dynamics follow-up](CPU-DYNAMICS.md) covers the rigid-body integrator
correction, finite-time FPUT evolution, single KP-I lumps and unresolved claims.

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

New formulas use the contributor module workflow in [FORMULA-SUBMISSIONS.md](FORMULA-SUBMISSIONS.md).
They begin as **unvalidated**. Finite numerical checks, mathematical proof, agreement with experiments
and historical originality are separate claims.

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
the remaining families. The double-triangle/polygon vortex module already has independent numerical tests; its print
paths and complete parameter coverage remain unvalidated. The inventory deliberately exposes gaps.

[Parametric surface geometry and print evidence](SURFACES.md) checks three classical families, with independent curvature and finite-mesh controls.

Further bounded audits: [PLASMA.md](PLASMA.md), [SHALLOW.md](SHALLOW.md), and [NONRECIPROCAL.md](NONRECIPROCAL.md).

The current PDE family guard and stencil review is recorded in [PDE-FAMILY.md](PDE-FAMILY.md). Neuroscience additions are bounded by [HODGKIN-HUXLEY.md](HODGKIN-HUXLEY.md) and [NEURAL-MASS.md](NEURAL-MASS.md); neither is a clinical or finite-neuron validation.
