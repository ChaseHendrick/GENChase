# Shallow water: bounded numerical and print evidence

The `shallow` module implements established two-dimensional Saint-Venant equations on a **wet, flat-bottom sheet**. This is an original implementation, not imported Clawpack code and not new physics. The independent references are the [exact shallow-water Riemann solutions](https://www.clawpack.org/riemann_book/html/Shallow_water.html) and [finite-volume formulation](https://www.clawpack.org/riemann_book/html/Approximate_solvers.html) in Ketcheson, LeVeque and del Razo, *Riemann Problems and Jupyter Solutions* (2020). Clawpack's repository helped identify this missing model; its [BSD-3-Clause license](https://github.com/clawpack/riemann/blob/master/LICENSE) was checked, but no source was copied or translated.

## Equations, discretization and actual limits

The conserved state is `q=(h,mx,my)=(h,hu,hv)`, with nondimensional gravitational acceleration g=1. The x flux is `(mx, mx²/h+h²/2, mx*my/h)` and the y flux is `(my, mx*my/h, my²/h+h²/2)`. Cell averages evolve by an unsplit conservative flux difference with forward Euler time stepping. Each face uses the Rusanov/local Lax–Friedrichs flux `F*=(F_L+F_R−a(q_R−q_L))/2`, with `a=max(|u_normal,L|+sqrt(h_L), |u_normal,R|+sqrt(h_R))`.

State and time integration use CPU Float64. The physical domain is `[0,1] × [0,ny/nx]`, with `dx=dy=1/nx`; non-square grids keep cells isotropic. Periodic edges exchange the same conserved flux. Reflecting-wall ghost states reverse only normal momentum. Walls exert pressure forces, so total momentum is conserved for periodic boundaries but generally **not** for reflecting walls. Both boundary choices conserve water volume to roundoff.

For one x pair of faces, the updated depth coefficients are

```
h_i_new = [1 − dt*(a_R+a_L)/(2*dx) − dt*(b_T+b_B)/(2*dy)]*h_i
          + dt*(a_R−u_R)*h_R/(2*dx) + dt*(a_L+u_L)*h_L/(2*dx)
          + dt*(b_T−v_T)*h_T/(2*dy) + dt*(b_B+v_B)*h_B/(2*dy).
```

Every neighbor coefficient is nonnegative because each face speed bounds the corresponding normal velocity. The center coefficient is nonnegative if `dt*(max_a/dx+max_b/dy)≤1`. The actual step is `CFL*dx/(max_a+max_b)`, recomputed from the current wet state, with CFL in [0.1,0.8]. This gives a sufficient depth-positivity condition for this particular first-order update. It is not a proof of arbitrary long-time accuracy, entropy convergence for every initial state, or validity at dry boundaries.

The solver never clips depth, velocity or flux. It validates a complete proposed step before replacing the accepted arrays. A depth at or below 10⁻⁸, a nonfinite field or an unsupported CFL stops the run visibly. The model omits dry-bed flooding, bottom relief, rotation, viscosity, surface tension, dispersive waves and overturning/spray. The first-order flux has numerical diffusion; its smoothing is not presented as a calibrated physical viscosity. Shocks are spread over cells.

CPU workload is adjustable from 64 to 512 cells across. At fixed physical time, doubling both dimensions costs roughly eight times as much work because the CFL timestep also shrinks. On the recorded machine, a native 512² step averaged 12.86 ms over five steps (maximum 13.19 ms); browser rendering and scheduling add work. Large loads are explicit choices. Scheduling yields between complete steps and never changes the physical update according to wall-clock speed.

Defaults and presets start still after a deterministic number of warm-up steps. Because the timestep depends on grid spacing and the evolving field, different grid settings reach different physical times after the same step count; the status shows elapsed time. The depth/speed color scale uses current-field 2nd/98th percentiles and is a display choice. It is not a calibrated colorbar or an additional physical observable.

## Independent numerical tests

Run `node tools/shallow-science.js --write`. Actual measurements and the source hash are in [shallow-science.json](results/shallow-science.json).

The wet dam-break reference uses hL=2, hR=1, zero initial velocity and g=1. A separate bisection solve intersects the exact left rarefaction invariant with the right shock relation, obtaining intermediate depth 1.4538408924, velocity 0.4169206310 and shock speed 1.3355699594. The independent reference integrates each exact fan/constant segment over the finite-volume cell; it does not compare point values against cell averages. Rankine–Hugoniot residuals are below 3×10⁻¹⁶. Reflecting walls are outside the domain of dependence at time 0.08.

| Square grid | Depth L1 error at t=0.08 | x-momentum L1 error |
|---|---:|---:|
| 64² | 0.02385 | 0.02929 |
| 128² | 0.01556 | 0.01882 |
| 256² | 0.01021 | 0.01203 |

The depth errors decrease by factors 1.53 and 1.52. This is measured shock convergence, not a claim of second-order accuracy. The finest errors must remain below 0.018 for depth and 0.025 for momentum, with successive depth-error ratios between 1.25 and 2.4. A deliberate omission of the pressure flux yields momentum error 0.120 at 128², more than six times the correct error, and fails the benchmark. Rotation of the 64² dam problem exchanges x/y depth and momentum with zero measured discrepancy.

A small-amplitude oblique traveling wave at t=0.1 independently checks both spatial directions and pressure/mass coupling. It starts from analytic cell averages of a `(1,1)` Fourier mode about h=1, amplitude 10⁻⁵. The reference is the linearized wave with frequency `2π sqrt(2)`; nonlinear corrections are of order amplitude squared. Relative RMS depth errors at 32², 64² and 128² are 0.06453, 0.03307 and 0.01671, giving observed orders 0.964 and 0.985. The test requires order between 0.8 and 1.2, fine relative RMS below 0.05, and volume/momentum error below 10⁻¹². The 32² fixture exercises the numerical core; the user-facing minimum is 64². This joint grid/timestep refinement follows the prescribed CFL; it does not separately measure temporal order.

Additional bounded checks cover physical flux consistency, impermeable reflected mass/tangential flux, exactly stationary uniform water at rest, periodic volume/momentum conservation, wall volume conservation, and strongly varying but wet initial states with depth 0.05–3 and velocity components in [−2,2] at CFL 0.8 through time 0.12. The latter states remain positive, conserve volume below 3×10⁻¹⁵ relative error and dissipate numerical energy. An oversized-CFL control and an injected dry input stop without accepting a step or changing the supplied arrays. The dry-input test deliberately supplies an unsupported state; it does not validate flooding.

All six presets plus the default finish their complete prescribed warmups with positive depth and volume drift below 2×10⁻¹⁴. These extra conservation checks are regressions for a conservative method, not independent proof that the waves have the correct speed. The exact dam break and analytic wave supply that independent evidence. No statistical error bars are fabricated for deterministic reference discrepancies; discretization errors and tolerances are reported directly.

## Actual browser and print checks

Requires Playwright and a browser with WebGL2 float32 render targets. Run:

```
node tools/build.js
node tools/check.js shallow 12000
node tools/export.js shallow 8 300 8000
node tools/shallow-print.js --write
```

The numerical core has no browser or network dependency. The view uploads the current depth or speed as float32, then uses bicubic interpolation and the shared palette shader. The final display is not additional numerical evolution. The actual display texture equals the corresponding rounded Float64 quantity exactly in the checked fixtures.

`check.js` passes default, all presets, same-hash replay and tab switching, with one visible canvas. Default and preset luminance percentiles at the recorded `check-shallow` seed are:

| Plate | p01 | p50 | p99 |
|---|---:|---:|---:|
| Default | 59 | 158 | 238 |
| Colliding drops | 57 | 140 | 238 |
| Wall reflections | 8 | 52 | 239 |
| Expanding ring | 26 | 64 | 246 |
| Corrugated dam break | 17 | 93 | 243 |
| Crossing standing waves | 10 | 106 | 252 |
| Single ripple | 39 | 133 | 234 |

The real shell exports all seven plates at 2400×2400 pixels. [shallow-print.json](results/shallow-print.json) records additional complete, paused states at 128×128 depth, 128×160 wall/speed and 512×512 depth. Each exports at both 2400×2400 and 2400×1800, with requested dimensions asserted. Maximum reduced display/print mean absolute RGB difference is 0.291 on a 0–255 scale; the allowed limit is 2. The comparison intentionally resizes both to the same output aspect, so it checks rendering of the same field, not geometric preservation under arbitrary aspect changes.

All physical arrays, volume, energy, step count, last timestep and simulation time remain exactly unchanged across direct and actual shell export. The shell still reports the field cell count; extra print pixels do not resolve subcell physics. The real running control advances from step 60 to 66, and pausing keeps step 66 fixed. An injected unsupported dry input produces a visible stopped diagnostic and no accepted state change. No browser page errors were recorded. A vector export is intentionally absent because the picture is an interpolated physical field.

## Remaining limits

This evidence covers the declared wet benchmarks and selected presets/settings, not every possible initial state, aspect, long evolution or browser. It does not validate a real flood forecast, bathymetry, coastlines, full 3D hydrodynamics, a dry-bed Riemann solver, or a higher-order method. Independent CPU references and preserved print state support bounded implementation claims; source citations and attractive pictures alone do not certify the science.
