# Wave volume: bounded numerical and print evidence

`volume-wave` implements the classical scalar wave equation on a periodic unit cube.
It is **partially validated**, with no novelty, full acoustic, electromagnetic or
elastic-material claim. Its heavy settings increase work, not the scope of evidence.

## Model and method

The normalized model is `u_tt = c² (u_xx + u_yy + u_zz)`, with a constant positive
speed `c`, periodic boundaries and zero initial velocity. Nodes are at `(i,j,k)/N`.
The seven-point centered Laplacian and centered second time difference give

```
u_next = 2*u - u_previous + (c*dt/dx)^2 * L(u)
dx = 1/N
L(u) = six neighboring values - 6*u
u_previous initially = u_initial + 0.5*(c*dt/dx)^2 * L(u_initial)
```

The initialization supplies the negative time level for zero initial velocity.
There is no amplitude clipping, damping, forcing or absorbing boundary. Gaussian
pulse distance uses the nearest periodic image; the pulse is not an exact periodic
Gaussian Fourier series. The initial field is sampled once, then genuinely evolved.

The mathematical method and stability bound were checked against the authors'
[Finite Difference Computing with PDEs, multidimensional wave analysis](https://hplgit.github.io/fdm-book/doc/pub/wave/html/._wave-solarized004.html).
The derived ceiling is `dt <= dx / (sqrt(3)*c)`. The control is a fraction of this
ceiling, clamped to `[0.05,0.95]`. Changing grid, speed or fraction rebuilds both
time levels. Stability does not imply small numerical dispersion.

Two RGBA32F atlas textures store the current scalar value in red and the previous
value in green. Remaining channels do not carry extra physical fields. Layers are
laid out in `ceil(sqrt(N))` columns; unused final tiles are masked. Integer texture
fetches wrap each physical coordinate independently, including layer boundaries.
The native runner should use this same periodic cube and zero-velocity initialization.

## Workload and stop behavior

The default is 32³ cells with 16 finite warm-up steps and running disabled. Presets
stay at 32³. Explicit choices reach 256³, which stores 16,777,216 physical cells and
uses 512 MiB for the two field textures alone. Atlas padding slightly increases the
storage of some other sizes. The status reports the actual texture allocation.
At fixed physical time, increasing 32³ to 256³ increases the solver work by roughly
4096 times: 512 times the cells and eight times the steps. This is a scaling estimate,
not a measured performance benchmark or a claim to be the heaviest possible workload.

The code checks maximum texture dimensions and a 576 MiB field-storage ceiling.
Browsers do not report reliable free GPU memory; allocation may still fail. There
is no silent resolution downgrade. Each animation callback submits at most one
full-volume step. A GPU fence prevents successive callbacks from building an
unbounded queue. Stop queued work cancels future steps; it cannot retract an
already submitted GPU command. Pause/tab switch cancels the animation callback.
Reduced motion permits finite initialization and suppresses continuous running.

## Numerical evidence

After the optional browser setup in [BUILDING.md](../BUILDING.md), run:

```sh
node tools/volume-wave-science.js
```

The [saved result](results/volume-wave-science.json) was measured on 2026-09-21
with Chromium's SwiftShader WebGL2 renderer. The harness compiles the maintained
shader strings and compares float32 readback against independently computed
JavaScript float64 references. It does not substitute a reference solver for the GPU.

| Check | Measured | Acceptance |
|---|---:|---:|
| Four discrete Fourier fixtures, grids 16³, 24³, 32³ and 48³, 40 to 80 steps | Maximum error 1.97e-6 | Below 5e-5 |
| Independent seven-point float64 update, mixed non-Fourier field, 20³, 35 steps | Maximum error 8.12e-7 | Below 5e-5 |
| Fixed unit cube and final time 0.13, 16³ → 32³ → 64³ | RMS error ratios 4.159 and 4.091 | Each between 3.5 and 4.5 |
| Actual seeded standing-mode shader | Maximum initializer error 1.74e-4 | Below 3e-4 |
| Advertised grids and extreme/invalid CFL inputs | 84 sanitizer cases passed | Fraction never above 0.95 |

For a mode with integer wave vector `m`, the exact discrete time angle satisfies
`sin(theta/2)^2 = (courant²/3) * sum(sin(pi*m_j/N)^2)`. The zero-velocity solution
is the initial mode multiplied by `cos(step*theta)`. The four fixtures include a
constant mode, a high-frequency mode and a negative mode component. The combined
space/time refinement compares the continuum frequency `2*pi*c*|m|` at the same
physical time, and does not separately identify spatial and temporal convergence.

The initializer tolerance is intentionally separate from the solver tolerance.
SwiftShader's native trigonometric approximation contributed a measured 1.74e-4
initial error. Fourier solver fixtures upload independently computed values, so
this initializer error cannot masquerade as solver agreement.

Two deliberate failure controls are detected. Reversing the Laplacian sign produces
a maximum difference of 473.7 after 10 steps. A Nyquist mode stays bounded at
fraction 0.95 but reaches amplitude 2.83e8 after 32 steps at fraction 1.05. The latter
is a harness-only violation; the UI sanitizer cannot select it.

## Selected print and lifecycle evidence

The production instance runs each of its five presets at 32³. The harness
checks a 512×384 export from a 256×256 canvas, raw field equality before/after export,
and exact same-renderer field repeatability after regeneration. The palette in this
test is a fixed dark blue/gold diagnostic palette.

| Preset | Steps | Luminance fifth / 95th percentiles, 0 to 255 |
|---|---:|---:|
| crossed | 16 | 15.33 / 181.67 |
| pulse | 12 | 29.00 / 91.33 |
| standing | 20 | 15.67 / 180.67 |
| transverse | 24 | 18.00 / 172.00 |
| side | 8 | 15.67 / 180.67 |

All five prints had the requested dimensions, non-flat contrast, zero field change
on export, and zero same-seed field difference on regeneration. The test instruments
readback access only; production code does not export that testing hook. A print is
one cell-aligned slice with bicubic display interpolation. It does not add cells or
calibrate amplitude as acoustic pressure or detector intensity.

## Remaining limits

No actual 96³ through 256³ simulation is included in this numerical audit. Those
choices are resource-gated capabilities, not certified devices or performance levels.
Long-time behavior, arbitrary controls, all GPU drivers, full print-resolution
behavior, physical experiments and the pulse's continuum error remain unvalidated.
There is no general scientific validation or new-mathematics claim.
