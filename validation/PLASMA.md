# Kinetic plasma: bounded numerical and print evidence

This is an original implementation of established one-dimensional electrostatic particle-in-cell physics. It makes no novelty claim. The checked cold oscillation, discrete field solve, sampling noise and print behavior support partial validation within the fixtures below. They do not establish arbitrary plasma stability, a measured Landau damping rate, or agreement with physical experiments.

The primary numerical reference is [J. U. Brackbill, *On Energy and Momentum Conservation in Particle-in-Cell Plasma Simulation* (2015)](https://arxiv.org/html/1510.08741), sections 3.1–3.5, especially the standard cloud-in-cell field centering and its conservation limitations. Birdsall and Langdon's *Plasma Physics via Computer Simulation* (1985) supplies the classical model context. No reference code was copied. This is not [GEMPIC](https://arxiv.org/abs/1609.03053) and does not inherit that method's geometric properties.

## Model, units and method

The periodic physical interval is `0 <= x < L`, where `L = 2π`. Electron mass, charge magnitude, background ion density and permittivity equal one. The electrons have one position and one velocity coordinate; the ions are a fixed uniform positive background. The continuum equations in these normalized units are:

```text
∂f/∂t + v ∂f/∂x - E ∂f/∂v = 0
∂E/∂x = 1 - integral(f dv)
mean(E) = 0
```

There are no collisions, magnetic field, ion motion or external time-dependent drive. Each of `N` numerical particles represents electron charge `-L/N` and mass `L/N`, so its acceleration is `-E`.

Charge density is deposited with periodic linear cloud-in-cell weights onto `M` cell centers `(j + 1/2) dx`, with `dx = L/M`. The ion contribution is `+1`. A cumulative solve constructs edge fields satisfying `(E[j+1] - E[j])/dx = rho[j] - mean(rho)` and removes the constant field mode. This is equivalent to the periodic second-difference Poisson solve. The subtracted mean is normally roundoff; the uncorrected net charge is retained as a diagnostic and excessive imbalance stops evolution. Neighboring edge values are averaged to centers. Particle forces use the same linear weights as charge deposition, giving the standard momentum-conserving CIC method described by Brackbill.

A kick-drift-kick step stores velocities at integer times: half a velocity kick, a complete periodic position drift, a new field solve and the second half kick. It is the integer-time form of leapfrog. No thermostat, velocity cap, damping, energy correction or evolving particle-weight normalization is present. It conserves momentum to roundoff for these fixtures; it does **not** conserve the reported physical energy exactly.

The displayed energy diagnostic uses `K = (L/N) sum(v²)/2`, `U = dx sum(E_edge²)/2` and `(K + U - E0)/max(E0, 1e-10 L)`. It measures numerical drift relative to the initial state, not a thermodynamic or experimental estimate. Charge balance and the edge Gauss residual are algebraic consistency checks of this construction, not independent physical predictions.

Initialization starts from uniformly spaced quiet positions `q_i = (i + 1/2)L/N`. A seeded phase sets the displacement `A sin(k q_i + phase)/k`. Alternating opposite beam velocities receive seeded Gaussian thermal velocities, then their initial mean is removed. The position-amplitude ceiling of `0.4` keeps this initial displacement map monotone. Arbitrary prescribed distributions or a finite-temperature equilibrium sampler are not implemented.

## Resolution and safeguards

The cold normalized plasma frequency is `omega_p = 1`. For a fixed harmonic oscillator, leapfrog requires `dt omega_p < 2`; the available time step is `0.005` to `0.08`. This cold-mode bound alone does not establish stability or accuracy for a streaming, finite-grid particle model. The UI warns when the thermal Debye length `thermal / omega_p` lies below one spatial cell. A zero-temperature stream has no positive thermal Debye length, so the absence of that warning is not an accuracy certificate. Particle count, spatial cells and timestep must all be refined for a quantitative effect.

Nonfinite state, net charge magnitude above `1e-8`, or energy error above 10% rejects a trial. The last accepted positions, velocities, fields, counters and diagnostics are restored and a visible stop reason is shown. Remaining below that coarse guard does not prove an accurate trajectory.

Warmup uses a fixed requested step count and yields to the browser between chunks. Pause stops work; resume completes the same steps without changing `dt` based on wall-clock speed. The maximum 262,144-particle option does 16 times the default particle work. The highest setting uses about 8 MiB for the numerical position/velocity/backups/field arrays, in addition to histogram and GPU buffers. High-count preparation may be slow. A short Node timing is recorded below, not promised as browser performance.

## Numerical checks

Run `node tools/plasma-science.js > validation/results/plasma-science.json`. This dependency-free Node test loads the actual maintained solver with in-memory hooks and the real seeded RNG. [The result artifact](results/plasma-science.json) records the source, RNG and harness SHA-256 hashes, command, every measured fixture and thresholds in the harness.

| Check | Reference and acceptance | Recorded result |
|---|---|---|
| Linear deposition | Independent all-pairs periodic triangular weights, 47 irregular particles including the seam, 16 cells | Maximum difference `7.77e-16` |
| Field solve | Independent dense periodic Poisson matrix with an explicit gauge | Edge error `6.38e-16`; centered-field error `3.89e-16` |
| Cold plasma frequency | Analytic cold-sheet solution before trajectories cross, 8,192 particles, 128 cells, `dt=.01`, time 13; relative error below `0.002` | Frequency `0.999703` versus `1`, relative error `0.000297` |
| Cold trajectory | `x(q,t) = q + d(q) cos(t)`, `v(q,t) = -d(q) sin(t)` with initial displacement amplitude `0.02`; RMS below `0.00015` | Maximum phase-space RMS `5.58e-5` |
| Cold conservation | Same fixture; maximum relative energy drift below `0.005` and momentum magnitude below `1e-11` | Energy drift `0.000427`; momentum remains near roundoff |
| Spatial refinement | Same `2π` domain, 16,384 particles, time 1, `dt=.001`, grids 32/64/128, analytic cold solution | RMS `7.904e-5`, `1.979e-5`, `4.945e-6`; reductions `3.994` and `4.002` |
| Temporal self-convergence | Same domain, 4,096 particles and 64 cells, time 1.2; steps `.08/.04/.02` compared with `.0025` | RMS `6.933e-6`, `1.727e-6`, `4.267e-7`; reductions `4.013` and `4.049` |
| Particle sampling noise | 24 independent uniform-position seeds at each `N`, 64 cells; exact expected spatial mean charge variance `(2M/3 - 1)/N` | `N=2048`: `0.020219 ± 0.000982` SE versus `0.020345`; `N=8192`: `0.005146 ± 0.000218` SE versus `0.005086` |
| Shipped states | Default plus all six complete declared warmups at one fixed seed; no halt, finite fields, charge and Gauss below `2e-11` | All pass; maximum warmup relative energy error below `0.000258` |
| Largest option | 262,144 particles, 1,024 cells, four steps | Finite state; energy error below `5e-9`, Gauss residual below `8e-15` |
| Wrong-force control | Reverse both kick signs | Stops at the energy guard; failed trial restores arrays and diagnostics exactly after step 11 |
| Nonneutral control | Add `0.02` to one deposited density cell | Uncorrected net charge `0.007854` is detected despite the Poisson zero-mode subtraction |

The cold sheet relation follows from the noncrossing ordering: the charge to a displaced sheet is its displacement relative to the uniform background, so its acceleration is minus that displacement. This is an independent continuum benchmark; a finite grid is expected to depart from it. The temporal comparison is self-convergence against a smaller step of the same solver and is labeled accordingly. Sampling uncertainties use the independent seeds as units, not correlated cells or time samples. The noise test concerns deposition only and does not establish a damping rate or nonlinear dynamical noise law.

## Print and application checks

Run `node tools/plasma-print.js > validation/results/plasma-print.json` with Playwright and Chromium as described in [BUILDING.md](../BUILDING.md). [The print artifact](results/plasma-print.json) records eight actual exports: 2400×2400 with 4,096 particles/64 spatial cells and 2400×3000 with 16,384 particles/256 cells, both density and velocity colors, initial and 40-step paused states. The velocity histogram has 256 rows in each case.

Every export leaves particle positions, velocities, field arrays, rollback backups, CPU/GPU histogram arrays, counters, diagnostics and settings unchanged byte for byte. Non-square output pads the same square phase-space view. Deliberately evolving after export and supplying incorrect dimensions are rejected. A separate actual cooperative 1,600-step warmup is paused while incomplete and resumed; its final numerical state matches direct fixed-step evolution exactly. This is preservation evidence, not a calibrated-color or physics certificate.

The shared application harnesses also pass:

```sh
node tools/check.js plasma 8000
node tools/export.js plasma 8 300 5000
```

All six presets and the default render nonblank; the same complete recipe produces the same fingerprint at step 500; tab switching leaves one visible canvas. All seven real print-UI sheets decode at 2400×2400. [Application results](results/plasma-app.json) retain the measured luminance percentiles and exact commands. The generic harness's cold-oscillation “judged early” annotation uses the default 500-step target; that preset actually requests 60 steps and had passed it. The independent preset numerical test checks each actual requested count.

The display deposits particles into a finite histogram and interpolates it for print. A larger sheet does not add particles, refine the electric-field solve, or resolve a finer velocity distribution. A limited velocity window crops only the image; excluded particles continue to affect the physics and their fraction is reported.

## Remaining limits

- No quantitative Landau-damping or arbitrary two-stream growth-rate benchmark, finite-grid instability map, general equilibrium or transport claim.
- No exhaustive scan of allowed seeds, beam speeds, temperatures, counts, grids, timesteps or long elapsed times. The high-count fixture covers four steps only.
- No electromagnetic effects, collisions, moving ions, multiple species, higher-dimensional model or laboratory comparison.
- No exact energy conservation. A visible numerical guard can stop a long run; it is not a replacement for convergence testing.
- No guarantee of cross-engine bitwise reproducibility, although fixed-step same-browser recipes and scheduler independence pass here.
- Print checks cover declared paused states, one renderer and two grids; they do not establish arbitrary concurrent live-export behavior or scientific accuracy from image sharpness.
