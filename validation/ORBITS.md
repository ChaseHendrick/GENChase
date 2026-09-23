# Orbit audit

Run `node tools/orbit-science.js --write` to reproduce the
[measured results](results/orbit-science.json). These tests execute the maintained
module functions. Their partial labels exclude print accuracy and parameters not
listed here.

## Figure-eight three-body orbit

The actual Yoshida integrator is compared at time 1.5 with an independent RK4
implementation of Newtonian pair forces. The reference changes by less than
3.5e-14 between 12,000 and 24,000 steps. Production errors with 100, 200 and 400
steps are 2.93e-6, 1.84e-7 and 1.15e-8 or less, consistent with fourth-order
convergence. The acceptance limits are a finest error below 1e-7 and an error
reduction between 200 and 320 over the fourfold step refinement.

At the implemented figure-eight initial conditions, 9,600 steps over one period
return within 6e-8 of the initial state, against a 1e-6 tolerance. A 1% force
perturbation produces an error above 0.026 and is rejected. The periodic solution
is classical, described by [Chenciner and Montgomery](https://arxiv.org/abs/math/0011268).
This does not establish long-time accuracy for arbitrary or chaotic trajectories.

## Print-state preservation

`node tools/eight-print-state.js --write` records paused exportPNG and exportSVG
checks for five fixtures in [results/eight-print-state.json](results/eight-print-state.json).
Export does not alter the Float64 trajectory, diagnostics or settings at the requested
dimensions. That is state preservation only; it does not add printed numerical resolution
or long-time orbit accuracy.

## Schwarzschild photons

For mass parameter M = 1, the module's searched capture threshold agrees with
`3 sqrt(3)` within 1e-6, and its photon-sphere radius agrees with 3 within 1e-8.
These are the null-geodesic benchmarks described in
[David Tong's general relativity notes](https://www.damtp.cam.ac.uk/user/tong/gr/grhtml/S1.html).

Impact parameters 4.5, 5, 5.5, 7 and 10 have the expected capture or escape outcome
at steps 0.02, 0.01 and 0.005. For escaping rays, independent bisection finds the
outer root of `r^3 - b^2 r + 2 b^2 = 0`. The finest sampled turning radii differ
by less than 2.1e-6, against a 2e-4 tolerance. The sampled minimum is an event
estimate, so no convergence order is asserted. Changing the nonlinear force
coefficient from 3 to 3.3 shifts the capture threshold by more than 0.51 and fails.

The launch radius is finite (280), and integration has a cutoff. Deflection values
are saved for inspection but are not certified by these tests. Near-critical
whirling, all controls, rendering and exported plates remain outside this audit.
