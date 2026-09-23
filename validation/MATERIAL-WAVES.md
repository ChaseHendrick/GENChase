# Material wave audit

These partial labels apply only to the tested components. Run
`node tools/material-wave-science.js --write` to reproduce the
[results](results/material-wave-science.json). The test executes maintained functions
with minimal registration stubs. Derivatives are computed independently from their
positions or field values; the module's own diagnostics are not used as the oracle.

| Module | Tested scope | Finest measured errors | Excluded scope |
|---|---|---|---|
| Hasimoto | Unit arclength, curvature, binormal motion | Arclength below 4.9e-5, curvature below 2.3e-4, flow below 1.1e-4 | Full Biot-Savart dynamics; print limited to paused export state preservation |
| Gerstner | Single-train Jacobian and surface pressure | Jacobian below 1.1e-5, normalized pressure below 1.2e-6 | Two-train superposition, interior pressure; print limited to paused export state preservation |
| Chladni | Three integer square cosine modes | Normalized Helmholtz residual below 1.7e-5, boundary normal derivative below 1e-10 | Circular, sand, interference, elastic-plate; print limited to paused export state preservation |

Each test uses three difference steps and requires second-order convergence.
Full sample parameters and tolerances are recorded in the script and validation
inventory. Failure controls perturb temporal phase, dispersion and eigenvalue,
respectively; each produces a residual well above the acceptance tolerance.

The filament benchmark uses `r_t = r_s cross r_ss`, the local-induction equation
described in [Hasimoto transformation of general flows expressed in the Frenet frame](https://www.sciencedirect.com/science/article/abs/pii/S0168927423000120).
The single Gerstner train is tested separately from graphical superpositions;
[Weber's analysis](https://agupubs.onlinelibrary.wiley.com/doi/abs/10.1029/2011JC007776)
also distinguishes superposed waves from exact Lagrangian solutions. The square
Helmholtz benchmark follows directly by differentiating its separable cosine modes.

## Review findings still requiring correction

- Circular Chladni modes use `(m+1)*2.4048` for every Bessel order. These are not
  generally zeros of the corresponding Bessel function, so fixed circular boundary
  conditions are not established. They are explicitly excluded from the partial label.
- Aubry uses potential `2*lambda*cos(...)` but prints a dual threshold of 2.
  The parameter convention must be reconciled with the primary model before promotion.
- The SSH edge amplitude uses a positive geometric ratio. Its Hamiltonian sign
  convention needs an explicit residual check; field intensity alone loses the sign.
- Airy and breather diagnostic issues remain recorded in
  [the exact-wave follow-up](EXACT-WAVE-FOLLOWUP.md).

The request to audit every remaining module is not complete. See the generated
[coverage inventory](../VALIDATION.md) for current counts. No blanket promotion is made.

Paused export state-preservation evidence for these three modules is recorded by
`node tools/material-wave-print-state.js --write` → [results](results/material-wave-print-state.json).
That check does not promote color fidelity, sand, circular modes, two-train maps or Biot-Savart dynamics.
