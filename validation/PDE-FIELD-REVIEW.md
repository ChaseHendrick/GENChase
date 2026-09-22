# Complete finite PDE field and print review

The completed domain contains exactly the twelve deterministic recipes in
[the result artifact](results/pde-field-review.json), two per module: Cahn-Hilliard,
Ohta-Kawasaki, Active Model B+, Swift-Hohenberg, Kuramoto-Sivashinsky, and phase-field
crystal. This extends the equation/source review in [PDE-FAMILY.md](PDE-FAMILY.md).
The label applies to the recorded finite lattices and times, not all control values,
nonlinear continuum limits, phase diagrams, or experiments.

## Actual trajectories

All recipes run on the real maintained module instances with Float32 textures and
noise/grain disabled. The first recipe uses a 128 by 128 periodic lattice; the second
uses 128 by 160 with clamped no-flux samples. Cells have unit spacing. Both fields
are evolved to time 2 at dt=0.01, 0.005, and 0.0025. Refinement must survive the
module's own sanitizer. Lower bounds now agree with the time-step control, which
previously offered values some modules silently clamped away.

Initial fields and effective settings come from each seeded instance; their hashes
are recorded. An independent Float64 array implementation reconstructs every
Laplacian, chemical potential, conservative face mobility/current, and update. It
uses separate neighbor tables and no GLSL. Its Euler result tests the complete
Float32 discrete field. Independent RK4 at dt=0.005 and 0.0025 supplies an error
reference and a reference-sensitivity bound for the entire field.

The twelve recipes cover bands/drops for Cahn and Ohta, quench/drops for AMB,
rolls/targets for Swift, fronts/bumps for KS, and stripes/nuclei for PFC. Both Cahn
and Ohta include constant and degenerate mobility. Every parameter is in the JSON.

Acceptance: discrete error below 1e-5, reference sensitivity below 1e-6, trajectory
error below 0.025, time-refinement orders between 0.8 and 1.25, chemical-field error
below 2e-5. A deliberately halved evolution time must disagree by more than 1e-4.
Existing wrong-sign, wrong-mean, mixed-stencil, clipping, and excessive-step controls
remain separately registered. In the recorded run the worst discrete error was
2.45e-6 and worst coarse-time trajectory error was 9.21e-4. Time orders were
0.992 through 1.119. Mean is conserved only for the four conserved methods;
Swift and KS have no such assertion. Approximate UI status reductions are not used
as conservation evidence.

## Spatial refinement at fixed physical domain

[The spatial artifact](results/pde-spatial-review.json) evolves an oblique small
Fourier mode with wave numbers (2,1), amplitude 1e-4, on a fixed periodic 64 by 64
physical domain to time 2. Grid sizes are 16, 32, and 64, with physical dt=0.002.
The production shaders use unit cells, so the test explicitly rescales parameters:

- Cahn/Ohta/AMB: M/h², epsilon/h, lambda/h², zeta/h⁴; the local Ohta reaction stays unchanged.
- Swift: shader dt=dt/h⁴; r,g,cubic coefficient multiply by h⁴ and k0 by h.
- KS: shader dt=dt/h² and nu=nu/h², with alpha unchanged.
- PFC: shader dt=dt/h⁶, r=r h⁴, k0=k0 h, and stored field=h² times the physical field.

The independent target is the continuum Fourier growth/decay rate at zero mean.
The nonlinear remainder must stay below 2e-8. Observed spatial orders must be
1.8 through 2.2 and finest relative amplitude error below 0.002. A deliberately
unscaled coarse grid must have over ten times the correct coarse-grid error.
The recorded finest errors range from 2.74e-5 to 2.38e-4, with orders 1.848 to 2.043.
This is a linearized smooth-mode convergence check, not nonlinear-interface convergence.
A lower-frequency pilot was roundoff-limited at the finest grid; the oblique mode
separates the spatial truncation signal from Float32 accumulation error.

## Every available print view

The actual shell exports 31 PNGs at 2400 by 2400 or 1920 by 2400. Every field,
absolute-value, gradient, relief, chemical-potential, and orientation view offered
by these modules is covered. Independent CPU Euler and chemical fields feed a
separate reference implementation of interpolation, local derivatives, lighting,
palette construction, and pixel mapping. All RGB channels must agree within two
byte values; the recorded maximum is one. A displaced print must fail and export
must leave the field, chemical buffers, counters, and recipe unchanged.

The review found a discontinuous orientation palette and angle-dependent background
mix at the 0/2pi seam. Orientation now joins its palette endpoints and fades into
the background below gradient magnitude 0.001. It encodes local field-gradient
direction, not a crystallographic orientation measurement. Grain, alternate hardware,
Float16, stochastic forcing, long-time coarsening, and nonlinear continuum accuracy
remain outside this finite completion domain.

```sh
node tools/pde-field-review.js --write
node tools/pde-spatial-review.js --write
node tools/verify.js --print cahn ohta amb swift ks pfc
```
