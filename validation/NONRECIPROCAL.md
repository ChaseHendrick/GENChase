# Nonlinear active mixture: bounded numerical evidence

The `nonreciprocal` tab independently implements equation 5 of
[Saha and Golestanian, Nature Communications 16, 7310 (2025)](https://www.nature.com/articles/s41467-025-61728-8),
published 7 August 2025. It is recent published science, not a GENChase discovery.
The authors use a pseudo-spectral method; this implementation uses periodic finite
differences and explicit Heun integration. It does not claim to reproduce the
paper's phase diagram, spontaneous effervescence or Lyapunov exponents.

## Implemented model and numerical choices

With mobility set to one, the complex field $\psi=\phi_1+i\phi_2$ follows

$$\partial_t\psi=\nabla^2[(-1+i\alpha_0)\psi+(1-i\alpha_1)|\psi|^2\psi-K\nabla^2\psi].$$

Both real fields have periodic boundaries and equal spacing in both coordinates.
The box lengths are cell counts times the chosen spacing. The nonlinear chemical
potential is evaluated locally **before** applying the five-point Laplacian.
Applying the same Laplacian twice supplies the biharmonic term. Each update uses
an Euler predictor and the average of the initial and predicted derivatives.
All numerical textures require float32. There is no clipping, absorber or forcing
after initialization.

The local chemical-potential Jacobian has the conservative norm estimate
`J ≤ 1 + 3 R² + |α₀| + 3 |α₁| R²` when amplitude is at most R. The Laplacian
spectral magnitude is bounded by `qmax=8/h²`. The app selects
`dt = safety / [qmax * (J + K*qmax)]`, using R=2.5 and safety in [0.1,0.8].
This is a conditional scale estimate, **not a global nonlinear stability proof**.
Heun's stability region is not a disk, and a bounded eigenvalue magnitude alone
does not prove stability for a complex spectrum. Nonlinear dynamics and predictor
stages require additional care.

After each batch, the app measures amplitude and both means. Nonfinite values or
amplitude above 2.5 stop the run and restore the previously accepted field and
step count. It does not silently clip the field. The status drift is the current
absolute change in each mean relative to preparation, not a statistical error bar.

Wave and perturbed-wave presets impose their initial patterns; their appearance
does not demonstrate spontaneous order. Noise is drawn only during preparation.
The initial sample means are subtracted. The oblique preparation uses the same
nominal amplitude rule as the horizontal one and is not declared an exact
steady-amplitude solution. Changing cell count at fixed spacing enlarges the
domain; it is not a spatial convergence test.
The prepared wave number uses approximately one wavelength per 24 horizontal
cells. Regenerating those presets at a new grid and spacing does not hold the
initial physical field fixed. The convergence benchmark below explicitly injects
one common physical wave instead of using that grid-dependent preparation.

## Independent benchmark

Run `node tools/nonreciprocal-science.js --write` after building the studio.
The [result artifact](results/nonreciprocal-science.json) records the source hash,
backend, full fixture parameters, tolerances, errors and rejected controls.

The reference computes the complete chemical potential into a float64 array,
then takes its Laplacian, independently of the GPU's fused biharmonic stencil.
The nonlinear derivative agrees within 1.38×10⁻⁶ in maximum absolute component
error on a 16×12 grid. A full Heun update agrees within 2.85×10⁻⁸. The limits are
5×10⁻⁵ and 2×10⁻⁷ respectively. Both conserved means must remain within 2×10⁻⁶;
the derivative's spatial means must also be within that absolute limit of zero.

An independent float64 RK4 solution provides a nonlinear fixed-grid reference
at time 0.2. Halving its step from 0.00025 to 0.000125 changes the maximum
component by less than 1.9×10⁻¹⁵, against a 10⁻⁹ reference-sensitivity limit.
This is a reference refinement check, not an absolute proof that the reference
is exact. GPU Heun steps 0.02, 0.01 and 0.005 give RMS errors
8.087×10⁻⁶, 1.916×10⁻⁶ and 4.672×10⁻⁷. The observed orders are 2.078 and 2.036,
inside the required interval [1.7,2.3]. This convergence fixture uses its stated
steps directly; it does not assert that the app's more conservative step selector
chooses those values.

For an exact discrete plane wave, define

$$q_h=\frac{4}{h^2}\left[\sin^2(k_xh/2)+\sin^2(k_yh/2)\right],\quad
\rho^2=1-Kq_h,\quad\omega=q_h(\alpha_0-\alpha_1\rho^2).$$

Then `ψ=ρ exp(i(k·x−ωt))` solves the semidiscrete spatial equation where the
amplitude exists. Three periodic modes at time 0.5 agree to maximum component
errors below 9.81×10⁻⁷, against a limit of 8×10⁻⁶. The phase sign is fixed by
substituting directly into equation 5. The paper's equations 8 and 11 print
opposite phase conventions; the benchmark does not combine equation 8's sign
with equation 10's frequency uncritically.

Spatial refinement holds the **physical 32×32 box, initial continuum wave,
time 0.2 and step 0.0002 fixed**. Increasing 16→32→64 cells changes spacing
2→1→0.5. RMS errors against the continuum plane wave are 0.001689, 0.000429
and 0.000107, giving orders 1.978 and 2.000. Halving the finest time step changes
the RMS error by 3.13×10⁻⁷, below 5% of its spatial error. This isolates a smooth,
short-time spatial trend; it does not validate nonlinear droplets or long-time
statistics. A uniform complex field remains stationary in an additional control.

Four intentional errors are detected: reversed coupling rotation, omitted
nonlinearity, reversed biharmonic sign, and a nonconservative source injected into
the update. Their maximum field errors are respectively about 0.427, 1.061, 2.735
and 0.002. Mean preservation alone would not catch all these errors.

## Actual state, guard and print checks

Run `node tools/nonreciprocal-print.js --write` using the browser setup in
[BUILDING.md](../BUILDING.md). The [print artifact](results/nonreciprocal-print.json)
records the default and every preset at the declared preparation endpoint,
including each preset's own palette. Runs are paused before measuring exports.
The check compares all six float32 numerical targets bit for bit, the CPU
readback array, recipe, means, step count, elapsed-step size and preparation state.
Each must remain exactly unchanged across 1200×1200 and 2400×1800 PNG exports.
The files must have their exact requested dimensions and a luminance percentile
spread above 12 on a 0–255 scale. The real app export button additionally creates
a 2400×2400 file while preserving the same state.

A deliberately oversized internal step on a checkerboard fixture must trigger
the amplitude guard and restore the accepted field and step count. This tests
rollback behavior; the invalid step is not offered as a validated UI setting.
Scratch stages may contain the rejected trial after stopping. No further step
is accepted until regeneration.

The full application checks are `node tools/check.js nonreciprocal 6000` and
`node tools/export.js nonreciprocal 8 300`. They cover appearance, replay/tab return
and the actual preset/export controls. Printing samples the existing grid with
bicubic interpolation. Additional pixels do not add resolved dynamics, and there
is no honest vector representation of this field density.

## Long-duration and parameter-band extension

Run `node tools/nonreciprocal-longrun-science.js --write`. The
[long-run artifact](results/nonreciprocal-longrun-science.json) records a Node
Float64 twin of the same complete-chemical-potential Laplacian / Heun operators
used by the short-time GPU audit. It does not replace that GPU campaign.

Five exact discrete plane waves are integrated to times T ∈ {5, 8, 10, 20} at
distinct (α₀, α₁, K, mode) points. Against the analytic discrete dispersion
above, maximum component errors stay below 1.75×10⁻⁷ (limit 10⁻⁵), amplitude
errors below 5×10⁻⁸, and both conserved means within about 10⁻¹⁶ (limit 10⁻⁹).
A 3×3 parameter matrix at T=5 on a 32×32 grid and a 32→64 refinement on a fixed
physical 32×32 box remain inside the same absolute band. Because the reference
is the exact discrete mode, spatial refinement need not reduce that modal error.

Four deliberate long-run failures are rejected: reversed ω in the analytic
phase, a 25% wrong K inside the dispersion amplitude/frequency, an unstable
coarse step dt=0.05 (nonfinite by step 32), and a injected mean drift of order
10⁻². This package still does not validate nonlinear long-time statistics,
open boundaries, spectral solvers or the paper phase diagram.

## Remaining limits and source review

The tests establish bounded component, modal, short-time refinement, discrete
long-duration modal, finite parameter/resolution-band, conservation and print
properties. Nonlinear long-time statistics, the complete allowed parameter/grid
range, nonlinear stability, phase diagram, spontaneous wave selection, Lyapunov
exponents, independent spectral-solver comparison and cross-device reproducibility
remain unvalidated. No new mathematical identity or historical priority is claimed.

On 2026-09-21, the initial source search used `2025 nonreciprocal Cahn Hilliard
model pattern formation traveling waves chaos` and `2024 2025 odd elasticity
continuum simulation nonreciprocal pattern formation`, after checking the project
ledger. The primary article above was opened, and equations 1–5, 8–11 and the
numerical methods were read. The independent review reopened the same primary
article and searched within it for `travelling wave solution` and `Numerical
simulations`; no additional broad discovery query was made. Its parameterization
and phase convention were checked by direct substitution. No paper figure, text,
solver code or data is incorporated into the module.
