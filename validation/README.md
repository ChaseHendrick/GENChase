# Scientific validation contract

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
For a full validation, also record the reviewed domain, date and reproducible result artifact.
Never upgrade a status merely because an export looks good or a source is cited.

## What a scientific review must establish

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

The first correction and its limits are documented in [CAHN-HILLIARD.md](CAHN-HILLIARD.md).

Priority: the remaining Cahn-Hilliard/PDE convergence and precision checks, wave/transport solvers, then stochastic measurements and
the remaining families. The double-triangle/polygon vortex module already has independent numerical tests; its print
paths and complete parameter coverage remain unvalidated. The inventory deliberately exposes gaps.
