# Ginzburg-Landau implementation corrections

The full runtime sweep found two numerical defects. CGL used the opposite dispersion
sign from its displayed equation and an Euler step at the complex-diffusion limit.
The fixed-field vortex module omitted magnetic link factors and became nonfinite for
some low-κ settings. These corrections change existing recipes' computed fields.
This initial correction review did not promote either module. The later
[complete bounded field review](GL-FIELD-REVIEW.md) adds independently calculated
full fields and actual print-pixel evidence for four recipes per module.

## CGL

The maintained GPU shader uses exact local flow for
`dA/dt = μA - (1+iβ)|A|²A`, followed by explicit diffusion with coefficient `1+iα`.
On the periodic unit-spaced lattice the five-point symbol is `-q`, with `0 <= q <= 8`.
The diffusion Euler bound is `h <= 1/[4(1+α²)]`; internal steps use 80% of that bound
and an additional local phase-resolution limit. Requested macro time is preserved.
This is first-order Lie splitting. It is not a global nonlinear error bound. Added
noise is deterministic bounded forcing per substep, not a calibrated stochastic PDE.

Run `node tools/cgl-kernel-check.js` with the documented Playwright setup. It compiles
the maintained shader, compares a complex Fourier mode to its exact semidiscrete
solution at time 0.2, checks exact local flow, and exercises a grid-scale mode.
Local errors at steps 0.02, 0.01 and 0.005 were 1.96e-4, 9.74e-5 and 4.82e-5.
The local-flow error was 1.23e-5 in SwiftShader. A deliberately reversed dispersion
sign produced error 0.0554. A Nyquist fixture decayed with substeps but grew without
them. Its large phase/decay error is not evidence of Nyquist-scale accuracy.
153 parameter combinations check the derived substep limit.

## Fixed-field vortex model

The maintained CPU update uses unit-modulus magnetic links, exact local saturation
and explicit diffusion. The diffusion weight is at most 0.2, below its 0.25 convexity
limit. Grid spacing is one. Increasing grid size enlarges the domain; it does not
perform physical mesh refinement. The order parameter is zero at the edges, and
`0.08 B` is the imposed link flux per cell. The magnetic field is not solved.

Run `node tools/vortex-kernel-check.js`. An independent complex-number stencil agrees
with the production update to 1.67e-16 on an 18×18 field. Reversing the reference flux
fails the test. Eighty updates across κ=0.5 through 4 preserve finite bounded
amplitudes. A small-amplitude Dirichlet mode at fixed time 0.2 has errors
6.71e-11, 3.35e-11 and 1.67e-11 under timestep halving. This checks time refinement
against the linearized lattice solution, not continuum convergence of a vortex lattice.

The winding-plaquette count is descriptive. It is not calibrated against applied
flux, and this model cannot establish critical fields, magnetic screening, a
type-I/type-II transition, or convergence to a hexagonal equilibrium. The noisy
condensate tab's detected windings are also not certified physical vortex counts.

## Remaining evidence

Neither repair establishes long-time statistics, arbitrary parameter accuracy,
continuum convergence, cross-device agreement, experimental calibration or general
paper equivalence. Preview and print checks test rendering and export behavior only.
The initial inventory status was unvalidated; see the later bounded review for current coverage. Scientific references and the search record
are in [RESEARCH.md](../RESEARCH.md).

The corrected CGL and vortex modules also passed all 6 and 7 default/preset exports,
respectively, at 2,400×2,400 pixels. The condensate passed 8 such exports after its
diagnostic optimization. These check successful image output and contrast, not physical
resolution. The separate [runtime report](results/runtime-sweep.json) preserves replay
and warm-up limitations for the wider sweep.
