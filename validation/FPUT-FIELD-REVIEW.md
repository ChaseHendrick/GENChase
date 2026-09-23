# Complete finite FPUT chain review

Run `node tools/chain-science.js --write` and
`node tools/fput-field-review.js --write`. The second command requires the
pinned Playwright Chromium setup. Results record source fingerprints and the
browser environment.

The model is a unit-mass, unit-linear-spring alpha chain with fixed ends,
q[0] = q[N-1] = v[0] = v[N-1] = 0. Initially q[i] = sin(pi i/(N-1)) and v = 0.
N includes the two fixed sites. Each bond has potential r²/2 + alpha r³/3;
its tension is r + alpha r². This reproduces the displayed nearest-neighbor
force as the negative gradient of the bond energy. The cubic potential is not
bounded below globally, so the finite small-strain cases are not a claim of
arbitrary-amplitude stability or equilibrium thermodynamics.

The independent reference assembles bond tensions and integrates the full
positions and velocities with RK4. Production uses velocity Verlet. Nine
cases cover N=48,96,128 and alpha=0,.22,.42 to time 120 with requested steps
.1,.05,.025. Steps are shortened to land exactly on the uniform output times.
All three resolutions reach the same physical time. Linear cases use the exact
normal mode with frequency 2 sin(pi/(2(N-1))); nonlinear references refine
.025 to .0125. Acceptance is final state error below 2e-5, reference change
below 1e-8, observed order in [1.9,2.1], and sampled relative total-energy drift
below 2e-5. Finest maximum state error was 9.40e-7, reference sensitivity
6.43e-13, and observed orders 1.9999989 to 2.0000032. A 10% wrong linear force
coefficient misses by .364. Changing the duration from 40 to 220 must change
positions by more than .1; it changed them by .302 in the control.

Seven complete browser histories cover the effective recipes in
`results/fput-field-review.json`: alpha=0,.18,.2,.22,.38,.42; elapsed times
40,80,120,140,160,200,220; chain sizes 48,96,128; three aspects; both display
views. Every displacement sample is compared with refined independent RK4.
Maximum field error was 5.09e-6 against a 2e-5 limit. The normalized harmonic
mode energy uses both sine-projected displacement and velocity. Its final
value and sampled minimum agree with the reference within 2e-5 (maximum final
error 1.43e-6). The linear period and requested elapsed time are also checked.
The sampled energy drift is a finite diagnostic, not a rigorous global bound.

Actual native PNGs at 2400x2400, 1920x2400 and 2400x1350 are compared in every
RGBA channel with independent history, transfer and linear-light color mapping.
Maximum disagreement is one byte, the declared limit. A displaced field/print
must fail, and exports preserve every stored field value, diagnostic and recipe.
The print honestly magnifies the finite history grid; extra pixels add no
physical resolution. Changing N changes the finite chain, not a fixed-domain
continuum mesh, so no spatial convergence claim is made.

This review corrects unsupported behavior rather than claiming a recurrence:

- The old E1 readout was absolute displacement amplitude. It now includes mode
  velocity and reports harmonic mode energy.
- The old "Periods kept" input was unused. Its historical recipe key `periods`
  now controls an explicitly labeled physical **Time span**, not wave periods.
- First-order symplectic Euler is replaced by second-order velocity Verlet.
- A large final amplitude no longer triggers an unsupported "recurred" label.
  The module is named FPUT Chain; finite history is distinguished from the
  original long recurrence experiment.
- The chain-site slider now matches the actual supported 48 to 128 site range.

These corrections intentionally change older saved recipes' computed output.
The completed label covers the specified finite equations, histories, diagnostics
and native PNGs. Long nonlinear recurrence, equipartition, all parameters, other
renderers/export backends and physical experiments remain outside that label.
The classical context remains the [1955 Los Alamos report LA-1940](https://doi.org/10.2172/4376203),
with no new-equation or historical-priority claim.
