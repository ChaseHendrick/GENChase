# Convection: bounded operator validation

The convection module implements the two-dimensional Boussinesq equations in free-fall units,
with horizontally periodic flow, fixed-temperature horizontal plates, and selectable no-slip
or free-slip velocity conditions. This review corrected three numerical/diagnostic errors.
It does not certify nonlinear onset, turbulent heat transfer, or all settings.

## Equations and independent references

The [official Dedalus Rayleigh-Bénard example](https://github.com/DedalusProject/dedalus/blob/master/examples/ivp_2d_rayleigh_benard/rayleigh_benard.py)
uses the same free-fall diffusivities: `nu = sqrt(Pr/Ra)` and `kappa = 1/sqrt(Ra*Pr)`.
Taking the curl of positive vertical buoyancy gives `+ dT/dx` for the module's convention
`omega = dv/dx - du/dy`, `u = dpsi/dy`, `v = -dpsi/dx`, and `Laplacian(psi) = -omega`.

[Whitehead and Doering, 2011](https://arxiv.org/pdf/1104.2278), page 2, states the same vorticity
sign and the stress-free conditions: zero normal velocity, zero normal derivative of tangential
velocity, and zero wall vorticity. Its time scale differs from this module's free-fall units.
The no-slip branch uses zero wall velocity and Thom's approximate wall-vorticity formula;
its complete boundary convergence remains unvalidated.

[Pandey, Scheel and Schumacher, 2018](https://www.nature.com/articles/s41467-018-04478-0),
Methods equations 10–14, gives the free-fall equations and
`Nu = 1 + sqrt(Ra*Pr) <v T>`, with a volume-and-time average for reported turbulent transport.
GENChase's display is sampled instantaneous transport. It has no time averaging or demonstrated
statistical convergence and is now labeled **Nu now**. The cited studies' complete simulations
have not been reproduced here.

## Corrections

**The timestep floor could override the diffusion limit.** For cell spacing `h`, the five-point
negative Laplacian has eigenvalues no larger than `8/h^2`. Forward Euler diffusion therefore
requires `dt <= h^2 / (4 max(nu,kappa))`; the module uses the stricter fraction 0.2. At grid
512×512, Ra=1000 and Pr=10, that ceiling is 7.6593e-6. The old sanitizer raised it to 5e-5.
An actual GPU Nyquist vorticity mode then grew and changed sign with multiplier -9.44484.
The corrected sanitizer applies the upper ceiling last, giving multiplier -0.6000001.

**Free-slip wall velocity was halved.** The interior centered derivative clamped the outside
streamfunction sample to the wall value. At a free-slip wall this produces half the tangential
velocity. The corrected wall derivative uses the odd extension of the zero-valued streamfunction,
equivalently the difference to the inside row divided by `h`. For the manufactured
`psi = sin(pi*y)`, the bottom velocity now converges to `pi`, rather than `pi/2`.

**The heat-transport encoding biased exact conduction and hid low values.** The former two-byte
offset encoding represented zero flux as 7.68935e-6. At Ra=1e7 and Pr=10, a motionless conductive
state could therefore display Nu≈1.1 instead of 1.0. Signed encoding now has an exact zero code.
The display no longer forces values below one up to one. A saturated block is reported as
out of range instead of displaying its clipped number as a measurement.

The revised encoding has a quantization contribution at most `sqrt(Ra*Pr)/(2*65534)` to Nu,
assuming no saturation and excluding floating-point accumulation error. This is not a total
uncertainty estimate: subsampling, approximate Poisson solves, temporal alignment, discretization,
and finite-time statistics also matter. Ideal onset wording respects the selected wall type and
no longer identifies rolls, plumes or turbulence from Rayleigh number alone.

## Reproducible tests

Run `node tools/convection-science.js` after the browser-test setup in BUILDING.md.
Results are in [results/convection-science.json](results/convection-science.json).
The test evaluates maintained shaders and includes deliberate historical/wrong-sign controls.

| Benchmark | Domain and acceptance |
|---|---|
| Diffusion ceiling | 128 and 512 square grids, Ra=1000, Pr=10; measured Nyquist multiplier agrees with the independent analytic stencil within 3e-6 and decays. Restoring the old floor must amplify the 512-grid mode by more than nine. |
| Motionless conduction | `T=1-y`, zero velocity/vorticity; 64 and 128 grids, both plate types, 16 advection-plus-diffusion steps. Temperature changes by less than 3e-7 and vorticity stays zero. |
| Fixed-domain scalar diffusion | Box `[0,2) × [0,1]`, mode `0.1 cos(pi*x) sin(pi*y)`, diffusivity 0.1, final time 0.02; 32, 64 and 128 cells per height, `dt` proportional to `h^2`. Compare with both the discrete eigenmode and continuous exponential decay. |
| Free-slip velocity | `psi=sin(pi*y)`, 64, 128 and 256 square grids; wall derivative error decreases under refinement. |
| Poisson inversion | Manufactured streamfunction on 64×33 cells; 300 red-black sweeps with known discrete eigenvalue. Maximum error below 2e-6. This does not certify the default four sweeps. |
| Buoyancy sign | One step from a known sinusoidal temperature perturbation and zero vorticity; maximum error below 2e-8. Reversing the buoyancy sign must exceed 1e-4. |
| Transport and display | Exact zero flux and known positive/negative manufactured fluxes; signed encoding error lies within its quantization allowance. The actual decoder/status path preserves below-one values and marks saturation unavailable. |

In the recorded scalar refinement, errors against continuous diffusion decrease from 3.767e-6
to 1.061e-6 to 2.725e-7. Errors against the exact discrete update remain below 6e-8. The
free-slip wall error decreases from 0.001302 to 0.0003203 to 0.00007955. Conductive temperature
and vorticity were unchanged in the tested float32 fixtures. The manufactured Poisson maximum
error was 3.055e-7; buoyancy error was below 1e-9.

The table above is component tests. The scalar-diffusion refinement isolates the diffusion substep; its
nonzero vorticity is not evolved as a complete coupled Boussinesq solution. The physical box
and final time remain fixed as resolution changes. Test grids with a wall-inclusive odd row count
are numerical fixtures, not additional UI grid presets. A separate coupled study is recorded below.

## Coupled spatial/time convergence

Run `node tools/convection-coupled-science.js`. Results are in
[results/convection-coupled-science.json](results/convection-coupled-science.json).

On a fixed free-slip box of aspect ratio Γ=2, Pr=1 and Ra=100 (well below free-slip onset), a small
`sin(π y) cos(π x)` temperature seed with zero vorticity is evolved with the full production chain
`solvePsi → CONV_ADV_FS → CONV_DIFF_FS` to a common final time. A Float64 CPU twin of the same discrete
operators is the independent discrete reference; continuum free-fall linear rates for that mode provide
the spatial continuum comparison. Temporal orders use self-convergence against a fine-dt Float64 twin
at fixed H=65. Deliberate controls negate buoyancy, halt at half the final time, and shrink the physical
width while refining H so a false fixed-domain study cannot look second-order.

This covers below-onset free-slip coupled decay only. It uses 24 SOR sweeps per step and does not
certify the default four, onset thresholds, no-slip plates, high Rayleigh number or turbulent Nu.

## Limits and reproduction impact

The module remains only partially validated. Onset and aspect-ratio effects, sufficient Poisson
iteration counts for the production default, no-slip boundary accuracy, high-Rayleigh resolution,
half precision, interpolation damping, and full scientific print fidelity remain outstanding.
Velocity used by the live transport estimate comes from the preceding streamfunction solve;
its temporal error also needs review. No agreement with experimental turbulent heat transport
is claimed. An exploratory diffusion refinement at a smaller timestep reached the float32
roundoff floor on the finest grid; more steps do not automatically mean a more accurate result.

The separate `tools/wave-print-state.js` test covers 2400-by-2400 exports of initial and evolved
paused fields at 128 and 192 square grids, in every view. Both fluid buffers, both streamfunction
buffers, velocity and scalar state remain bit-for-bit unchanged. It also checks Schrödinger,
for 28 exports in total, and rejects deliberate state mutation. See
[wave-print-state.json](results/wave-print-state.json). This is evidence for state preservation
and output dimensions, not complete rendering accuracy.

Parameter/default declarations and seed interpretation are unchanged. Settings whose timestep
previously exceeded the diffusion limit now evolve with a smaller effective step; free-slip
trajectories can change because their wall velocities were incorrect. Diagnostics also change.
Use an earlier release to reproduce the historical numerical behavior. These corrections do not
establish a new physical phenomenon or mathematical formula.
