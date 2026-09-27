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

## Absorber and long-time phase

`node tools/schrodinger-absorber-science.js` runs the production float32 step with
`damp = exp(-dt * damp * pot.b)` against an independent Float64 five-point Visscher twin.
Uniform absorber weight and the production edge profile (`a = clamp(1 - edge/layer, 0, 1)^2`)
are both checked. Uniform cases also match a modal 2×2 damped recurrence. Results live in
[schrodinger-absorber-science.json](results/schrodinger-absorber-science.json).

| Test | Measured result | What it establishes |
|---|---|---|
| Uniform absorber vs Float64 twin / modal recurrence | Max recurrence 1.83e-07 (modal 1.83e-07); remaining norm fraction down to 3.36e-04 | Production damp factor on uniform `pot.b` |
| Edge absorber vs Float64 twin | Max recurrence 6.15e-07; remaining fraction 0.59–0.63 | Production-shaped edge layer on periodic grids |
| Absorber temporal fixtures (dt 0.2/0.1/0.05, T=2) | Twin error stays below 2.89e-07 at each step | Agreement is roundoff-limited, not a continuum order claim |
| Long-time free / uniform-V phase (T=120, ~25 periods) | Twin error 8.49e-07; phase error vs exact e^{-iEt} ~0.027 rad; field error ~0.011 | Bounded temporal dispersion over long runs |
| Wrong-sign damp control | Recurrence error ~2.97; norm fraction ~75 | Deliberate `exp(+dt*damp*b)` is detected |

Periodic wrap still couples opposite edges through the absorber layer. These fixtures do not
certify continuum PML accuracy, scattering probabilities, hard-wall stadiums or arbitrary packets.

## Custom potential, not validated

The Custom potential mode (2026-09-26) steps a potential `V(x, y)` the viewer types, with coefficients
`a` and `b` on sliders, through the same Visscher update. The text is parsed by the shared expression
language (`src/shared/expr.js`) and compiled to closures; it is never evaluated as code. `x` and `y`
are the harmonic well's coordinates: measured from the frame center in units of half its shorter side,
`x` to the right and `y` up. `V` is in the tab's energy units (`hbar = m = 1`, unit cells), where a
packet of momentum `k` carries about `k^2/2`.

`V` is sampled once per cell on the CPU in double precision, so every GPU steps the same potential, and
is stored at the state precision. Each sample is held between -16 and 16, and a cell where `V` is undefined
(NaN, such as `0/0` or the square root of a negative number) becomes a hard wall, projected to zero like
the stadium's. The step used is `min(dt, 1.6 / (4 + max|V|))` with `max|V|` taken over the stored samples:
the bound in Corrections above, which covers any static real potential on this grid, with the same 0.8
margin below `dt |E| < 2`. The cap keeps that step at or above 0.08. The status line names the step used,
the bound and `max|V|`, and counts the cells held as walls or at the cap. A float16 fallback truncates
stored values toward zero, so the bound computed from the float32 samples still holds.

This is a stability guard, not validation. None of the evidence in this file covers a typed potential:
the status line says "user-defined, not validated", the stage badge and the provenance read unvalidated
in that mode, and nothing compares the plate with theory. The lattice dispersion and a potential that
changes over a few cells are resolved only as well as the grid allows. The Gaussian lens preset types an
attractive well; the focusing and interference it shows are what this discrete scheme computes for that
potential, not a measured optical claim. On 2026-09-26 the harnesses were rerun on the changed source under
SwiftShader: `schrodinger-science.js` reproduced the recorded numbers to six significant figures,
`schrodinger-absorber-science.js` to four, `schrodinger-state.js` gave byte-identical output on the old and
the new source, and `wave-print-state.js` passed with its failure control rejected. The recorded result
files, made on another machine, were left as they were.

`tools/ui.js` also checks custom-potential lifecycle behavior: switch to Flow Field, return through
a hash change with a different coefficient, and require the step count to advance again. Regeneration
clears the previous tab pause, and stepping waits for the sampled potential's pending start. This is a
shell regression check; it adds no numerical validation for typed potentials.

## Print and remaining limits

`node tools/wave-print-state.js` checks initial and evolved paused states, every display view,
128 and 192 square grids, and 2400-by-2400 PNG export. It compares both wave buffers, all four
channels including imaginary history and detector exposure, potential and scalar state exactly.
It also tests convection, for 28 exports in total, and rejects deliberately state-mutating exports.
See [wave-print-state.json](results/wave-print-state.json). This verifies state preservation and
dimensions, not color fidelity or accuracy of every printed pixel.

Absorber twin agreement and long-time phase bounds above close part of the previous numerical
gap. Scattering probabilities, general non-uniform potentials beyond the edge-absorber profile,
arbitrary packets, float16, all aspect ratios and hardware remain unvalidated. Current tests
still support a **partially validated** label only. Corrected centering, detector accumulation,
hard-wall handling and effective timesteps can change existing recipe images. Keep the earlier
release when reproducing the previous numerical behavior.
