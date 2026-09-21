# Schrödinger wave audit

The studio uses Visscher's staggered update for the unit-cell, five-point discretization of
`i psi_t = -0.5 Laplacian(psi) + V psi`. The
[author-uploaded paper](https://www.researchgate.net/publication/253168396_A_fast_explicit_algorithm_for_the_time-dependent_Schrodinger_equation)
describes integer-time real values, half-time imaginary values, and the modified conserved sum.
The original publication is *Computers in Physics* 5, 596–598 (1991), DOI 10.1063/1.168415.
These are established numerical methods, not new identities.

## Corrections

The old harmonic-well step limit treated `V0` as the maximum potential. The generated well is
`V0 * (x^2 + y^2)` in coordinates scaled by half the smaller grid dimension, so its corners can
greatly exceed `V0`. The corrected limit uses the actual grid's potential envelope. For the
real, time-independent discrete Hamiltonian, the kinetic spectrum lies in `[0,4]`; the bound
`dt <= 1.6 / (4 + max_abs_V)` retains a margin below the leapfrog threshold `dt |E| < 2`.
This two-dimensional matrix bound is a derivation for this implementation, not a claim to have
reproduced every case in Visscher's paper.

The state now retains both imaginary half levels. Density and phase use their midpoint at the
real field's time. Detector exposure integrates this nonnegative centered density. Previously,
the display mixed integer and half times, while the detector clipped the modified invariant
density at zero. Neither quantity was the exact physical probability density.

The discrete invariant is the **sum** of `R^2 + I_minus * I_plus`; its local terms can be negative.
The test sums them without clipping. It applies to fixed time steps, a static real potential,
no absorber, no injection and exact arithmetic; float32 introduces roundoff. It differs from
the centered physical-density approximation, which need not have an exactly conserved sum.
The on-screen percentage is a sampled, quantized estimate and is labeled approximately.

Changing the time step recenters the stored imaginary levels and initializes a symmetric pair
at the new spacing. Adding a packet similarly uses a synchronized complex state. Both operations
are edits to the numerical state and are outside the fixed-step conservation claim. Hard-wall
cells are projected to zero before the initial half step and after packet injection, so forbidden
initial values cannot drive their neighbors during that first update.

Outer boundaries are periodic when the absorber is disabled. The numerical absorber attenuates
amplitude and can transmit or reflect it; its accuracy is not certified here. Likewise, `k^2/2`
and speed `k` are continuum estimates. A free lattice mode has energy
`2 - cos(kx) - cos(ky)` and continuous-time group velocity `(sin(kx), sin(ky))`.
The finite-step integrator adds temporal dispersion, measured separately below.

## Numerical evidence

Run `node tools/schrodinger-science.js`. The actual float32 GPU shader is compared with independent
Fourier-mode calculations, including positive and negative uniform potentials, traveling waves,
a Nyquist mode and interference. Results are in
[schrodinger-science.json](results/schrodinger-science.json).

| Test | Measured result | What it establishes |
|---|---|---|
| GPU versus independent modal recurrence | Maximum component error 3.02e-7 | Discrete update agreement for 11 fixtures |
| Centered detector quadrature | Maximum error per unit numerical time 4.16e-7 | The tested exposure accumulation matches its declared quadrature |
| Unclipped modified invariant | Maximum relative drift 5.65e-7 | Bounded float32 conservation for the closed fixtures |
| Halved time steps at fixed grid and time | Orders 2.005 and 2.001 | Second-order temporal refinement for one mode |
| Refined grid at fixed physical square and time | Orders 1.980 and 1.992 | Second-order spatial refinement for one free wave |

The spatial experiment uses a physical square of side `2 pi`, time `0.5`, and 16, 32 and 64 cells.
For this free equation, `H_grid = h^2 H_physical`; running to numerical time `T/h^2` therefore
keeps physical time fixed. The numerical step remains fixed, so its physical step decreases as
`h^2`. This rescaling is part of the benchmark. Changing the studio's grid alone normally changes
the domain in cell units; it does not perform this convergence experiment automatically.

The wrong-sign control produces a component error above 3.47. A separate interference fixture
shows that clipping negative local invariant terms biases the summed invariant by about 0.00125.
Both failures are retained in the result file.

**Stability and conservation do not guarantee accuracy.** The coarse Nyquist fixture conserves
the modified invariant yet has component error about 0.535 against exact discrete evolution.
The report retains that disagreement. The finer temporal fixture has error below 0.000357;
the finest spatial fixture has continuum error below 0.001364.

`node tools/schrodinger-state.js` separately checks real module instances: the harmonic-well
failure control, live time-step edits, hard-wall projection and synchronized packet addition.
Its cases and tolerances are recorded in [schrodinger-state.json](results/schrodinger-state.json).

The moving-packet check initially exceeded a 2e-6 tolerance. An independent native-arithmetic
probe isolated sine/cosine approximation on the tested ANGLE SwiftShader backend: errors near
1.9e-4 in those functions produced about 8.14e-5 error in the injected amplitude. The moving
case therefore has a declared 2e-4 acceptance limit; a stationary packet avoids those trig
terms and retains the tighter 2e-6 check, with measured error about 1.15e-7. This is a measured
backend limitation, not a universal precision guarantee. The state test reproduces the probe;
its detailed result is also saved in [schrodinger-kick-precision.json](results/schrodinger-kick-precision.json).

## Print and remaining limits

`node tools/wave-print-state.js` checks initial and evolved paused states, every display view,
128 and 192 square grids, and 2400-by-2400 PNG export. It compares both wave buffers, all four
channels including imaginary history and detector exposure, potential and scalar state exactly.
It also tests convection, for 28 exports in total, and rejects deliberately state-mutating exports.
See [wave-print-state.json](results/wave-print-state.json). This verifies state preservation and
dimensions, not color fidelity or accuracy of every printed pixel.

Absorber convergence, arbitrary potentials and packet shapes, scattering probabilities,
long-time error, float16, all aspect ratios and hardware remain unvalidated. Current tests
support a **partially validated** label only. Corrected centering, detector accumulation,
hard-wall handling and effective timesteps can change existing recipe images. Keep the earlier
release when reproducing the previous numerical behavior.
