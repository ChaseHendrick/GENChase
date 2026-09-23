# Maxwell FDTD: bounded numerical and print evidence

The `maxwell` technique solves the classical two-dimensional TMz Maxwell system on a
periodic Yee grid. It is an original implementation of an established method, with no
claim of new physics or historical originality. Its appropriate scientific status is
**partially validated**: the tests below cover specific smooth modes, one dielectric
slab fixture, normal-incidence Fresnel R/T on a discontinuous interface, and limited print states.

## Model and stored fields

In normalized units, the implemented equations are

$$
\varepsilon E_{z,t}=H_{y,x}-H_{x,y},\qquad
\mu H_{x,t}=-E_{z,y},\qquad
\mu H_{y,t}=E_{z,x}.
$$

The fields are independent of the out-of-plane coordinate. Permittivity is positive,
stationary and sampled at electric nodes; permeability is positive and spatially uniform.
There are no free-current sources, magnetic materials with spatially varying permeability,
losses, dispersion, nonlinearities, absorbing layers or perfectly matched layers.
Opposite sides connect, including when the picture suggests a beam leaving the frame.

The method is credited to [K. S. Yee (1966)](https://doi.org/10.1109/TAP.1966.1138693).
The original publisher record was accessible, but its full paper was not read in this audit.
The equations and staggering were checked against John B. Schneider's author-hosted
[chapter 8, section 8.3](https://eecs.wsu.edu/~schneidj/ufdtd/chap8.pdf).
His [chapter 7](https://eecs.wsu.edu/~schneidj/ufdtd/chap7.pdf) also explains finite-grid
dispersion. No implementation code was copied from those references.

One RGBA float32 texel stores:

| Channel | Value and location |
|---|---|
| R | $E_z(i,j,n)$ |
| G | $H_x(i,j+1/2,n-1/2)$ |
| B | $H_y(i+1/2,j,n-1/2)$ |
| A | $\varepsilon(i,j)$ |

The magnetic pass uses forward spatial differences; the electric pass uses backward
differences. These curl operators are negative adjoints under the periodic sum.
No clipping or artificial damping masks instability. The two field buffers hold every
magnetic and electric component, including the previous substep.

The domain has width 1 and height `H/W`; `dx = dy = 1/W`. Changing the grid refines
the same domain for square fields. Nonsquare domain heights follow the rounded cell
count, so an arbitrary aspect can change slightly under grid refinement.

The initial electric field is a seeded Gaussian packet, pair, ring or fixed standing
plane pattern. Its magnetic field is zero at physical time zero. Before the first full
step, a magnetic update of `-dt/2` establishes the negative half step. Therefore a
localized initial pattern splits into waves in both directions; it is not an injected
one-way optical beam. The shape and dielectric pattern are separate controls.

## Stability and workload

All material patterns have `epsilon(x,y) >= epsilon_background`, because their ratio
is restricted to 1 through 9. A conservative bound is

$$
\Delta t_{\max}=\frac{\sqrt{\varepsilon_{\min}\mu}}
 {\sqrt{\Delta x^{-2}+\Delta y^{-2}}}.
$$

The displayed CFL fraction sets `dt = fraction * dt_max`, with a maximum fraction of
0.95. The background permittivity and permeability are included in the bound. They
and the CFL control rebuild the state, so its half-step offset cannot become stale
through a live time-step change. The benchmark checks 90 combinations of advertised
grid sizes and extreme material parameters.

The default grid is 512 cells across. 1024 and 2048 are explicit heavy options, never
chosen by Surprise or a preset. A square 2048 grid requires about 128 MiB for its two
RGBA32F field textures alone. Relative to 512, its cell count is 16 times larger and
its time step four times smaller, giving roughly 64 times the solver work per fixed
physical duration. Display, export and driver allocations add memory and work.
The module reports unsupported texture dimensions or allocation failure; it does not
silently substitute a smaller grid. Float32 color-buffer support is required; this
module does not offer a half-float fallback.

## Independent numerical checks

Run after the setup in [BUILDING.md](../BUILDING.md):

```sh
node tools/maxwell-science.js
```

Measured results: [maxwell-science.json](results/maxwell-science.json).
The harness compiles the actual maintained magnetic and electric shader strings.
The references are independently computed in JavaScript float64.

| Check | Measured result | Acceptance |
|---|---:|---:|
| Four periodic discrete modes, 80 steps, varied grid/aspect/material coefficients | Maximum field error $2.81\times10^{-6}$ | $<2\times10^{-5}$ |
| Piecewise dielectric slab, 64×48, 100 steps | Maximum float64/GPU difference $5.17\times10^{-7}$ | $<2\times10^{-5}$ |
| Modified discrete energy, mode and slab fixtures | Maximum relative drift $1.11\times10^{-7}$ | $<5\times10^{-6}$ |
| Magnetic divergence on mode fixtures | Maximum $8.21\times10^{-5}$ | $<5\times10^{-4}$ |
| Fixed-domain continuum refinement, 32² → 64² → 128² | Error ratios 4.020 and 4.005 | Each between 3.5 and 4.5 |
| 512², 1024² and 2048², four real GPU steps | Maximum field error $1.06\times10^{-7}$ | $<2\times10^{-5}$ |

The discrete reference is obtained by inserting a periodic Fourier mode into the
declared difference operators. With $K_x=2\sin(k_x\Delta x/2)/\Delta x$ and the analogous
$K_y$, it uses

$$
\sin^2(\Omega\Delta t/2)
=\frac{\Delta t^2}{4\varepsilon\mu}(K_x^2+K_y^2).
$$

It compares both electric and magnetic fields at their respective spatial and temporal
locations. It therefore checks more than a visual wavelength or a field copied from its
own initialization. The higher spatial-frequency fixture has substantial physical
dispersion; agreement with the discrete reference does not erase that error.

For the continuum check, the same unit square and final time `T = 0.17` are used at
every resolution. The exact electric field is a standing Fourier mode with physical
frequency `sqrt(kx² + ky²)` in unit material. The electric RMS errors are 0.004715,
0.001173 and 0.0002929. Both space and time are refined together, so this establishes
a bounded second-order combined trend, not separate temporal and spatial error estimates.

The energy check uses the conserved staggered quantity

$$
\sum_{i,j}\left[\varepsilon(E_z^n)^2+
\mu\,\mathbf H^{n-1/2}\cdot\mathbf H^{n+1/2}\right].
$$

The next magnetic half step is reconstructed independently for this diagnostic.
It is not the naive same-time continuum energy and is not displayed as a laboratory
measurement. Exact arithmetic conservation follows from the adjoint curl pair; measured
GPU drift tests its implementation and floating-point behavior.

Two deliberate failures demonstrate that the checks can reject plausible errors:

- Reversing the electric curl sign produces maximum field error 4.05 after eight steps.
- A Nyquist mode at 105% of the CFL limit grows to $2.83\times10^8$ in 32 steps;
  the corresponding 95% case remains bounded below amplitude 1.

The high-grid runs prove allocation, actual requested dimensions and four-step field
agreement on the tested machine. Their elapsed times are observations from that run,
not a throughput guarantee or a long-time stability audit.

## Print and application checks

```sh
node tools/maxwell-print-state.js
node tools/check.js maxwell 12000
node tools/export.js maxwell 8 300
```

The [print preservation results](results/maxwell-print-state.json) cover 12 actual
exports: 128² cells to 2400×2400 pixels, and 256×320 cells to 2400×3000 pixels; initial
and 32-step paused states; all three views. Both numerical buffers, material values,
settings, time, counters and display scale retain their exact float32 bits or scalar
values. All exports have the requested dimensions and finite state. Two deliberately
state-mutating exports are rejected.

The [application results](results/maxwell-app.json) record successful defaults, all
six presets, repeatable recipe rendering at step 96, a tab switch with one visible
canvas, and seven nonblank 2400×2400 sheets through the actual export controls.
Sampled default screen luminance percentiles were 13 / 79 / 230 at 1% / 50% / 99%.
These are visual regression observations, not physical measurements.

The renderer uses bicubic interpolation for the electric field and its intensity.
Material uses nearest-cell sampling to show the actual dielectric map. The module
reports `fieldCells()` to the shell. More print pixels interpolate the same numerical
field; they do not add physical resolution. Intensity means a display mapping of
`Ez²`, not total electromagnetic energy or a calibrated detector signal.

## Dielectric reflection/transmission and discontinuous-interface refinement

```sh
node tools/maxwell-dielectric-science.js
```

Measured results: [maxwell-dielectric-science.json](results/maxwell-dielectric-science.json).
The harness drives the actual maintained magnetic and electric shader strings on a vertical
ε jump. Independent references are continuum Fresnel Ez coefficients
Γ=(n₁−n₂)/(n₁+n₂), T=2n₁/(n₁+n₂) with n=√ε, and a separate JavaScript float64 Yee twin.

| Check | Measured result | Acceptance |
|---|---:|---:|
| GPU vs float64 discontinuous twin, 64/128/256×8, 80 steps | Maximum field error $4.49\times10^{-7}$ | $<2\times10^{-5}$ |
| Normal-incidence Fresnel R/T, ε₂=4, 512×8 | $|R-Γ|=1.97\times10^{-3}$, $|T-T_F|=1.18\times10^{-4}$ | both $<10^{-2}$ |
| Normal-incidence Fresnel R/T, ε₂=2.25, 512×8 | $|R-Γ|=8.74\times10^{-4}$, $|T-T_F|=3.69\times10^{-4}$ | both $<10^{-2}$ |
| Power identity $R^2+(n_2/n_1)T^2$ at 512 | errors $1.63\times10^{-3}$ and $1.24\times10^{-3}$ | $|·-1|<0.02$ |
| Reflection error refinement 128→256→512 (ε₂=4) | decreases at each step | monotone decrease |
| Discontinuous field RMS vs float64 512, t=0.35 | ratio $128/256 = 2.89$ | $>1.5$ |

Deliberate failures (subtract before add):

- Zero-contrast homogeneous ε₁ packet yields $|R|\approx1.6\times10^{-7}$ against Γ=−1/3, so the Fresnel match is rejected.
- Electric update that ignores stored ε (uses 1.0) misses Fresnel by $|ΔR|\approx0.333$.

These checks close normal-incidence staircase R/T and discontinuous-interface refinement for
the stated fixtures. They do not certify oblique incidence, subcell averaging, PML, losses
or experimental measurement.

## Remaining work

- Oblique-incidence Fresnel coefficients, subcell material treatments, and broader
  discontinuous geometries remain unvalidated.
- Only the stated initial states, times, parameters, precision and renderer have evidence.
  Long trajectories, all parameter combinations, devices and high-grid print paths remain open.
- Independent per-pixel rendering/color comparisons, calibrated measurements and experimental
  agreement are not established by state preservation or a sharp image.
- Numerical validity, a useful optical design and historical originality are distinct claims.
