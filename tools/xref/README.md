# Cross-check against an independent reference solver

This harness is optional. It compares the data the studio exports with a pseudo-spectral reference
solver that shares none of the studio's code, for three pde tabs: `cahn`, `swift` and `ks`. It lives only
under `tools/xref/` and runs outside the browser. Nothing here is bundled into the studio. It is not
part of `npm test`, because it needs Python.

## Run it

```
pip install numpy          # the only Python dependency
node tools/build.js        # run.js drives dist/studio.html
npm run xref               # or: python3 tools/xref/run.py [--tabs cahn,swift,ks] [--grid 256] [--keep DIR]
```

It also needs what `node tools/run.js` needs: Node and Playwright (see TESTING.md). A full run at grid 256
takes about six minutes on a laptop CPU, almost all of it in the reference. The exit code is non-zero
if any tab fails.

## What it does

For each tab, `run.py`:

1. Exports the studio's initial field and the field after N steps with `node tools/run.js`, the studio's
   own `exportData()` path, headless. The recipe names every physical parameter at the tab's default,
   sets the additive noise to zero, and uses `warmup: N` with `running: false`, so the studio stops at
   exactly step N. The export's step count, grid, boundary, guard state and recipe are checked.
2. Evolves the same initial field to the same time, `steps x dt`, with `spectral.py`.
3. Prints a relative L2 difference, a pattern statistic and a PASS/FAIL line.

`spectral.py` is written from the published equations (Cahn and Hilliard 1958; Swift and Hohenberg
1977; Kuramoto 1976 and Sivashinsky 1977), not from the shaders. It uses ETDRK4 (Cox and Matthews 2002,
with the Kassam and Trefethen 2005 contour integral), fourth order in time and exact for the linear part.
It runs each comparison with two spatial symbols:

- **continuum**: `lap -> -|k|^2`, `d/dx -> i k`. The PDE itself, spectrally accurate on the grid.
- **lattice**: `lap -> -(4 sin^2(kx/2) + 4 sin^2(ky/2))`, `d/dx -> i sin k`. These are the exact Fourier
  multipliers of the 5-point Laplacian and the centred difference. The spatially discrete system is the
  same as any code that uses those stencils, and only the time integrator differs.

## Tolerances and what the numbers mean

| Test | What it measures | Tolerance and reason |
|---|---|---|
| relL2 vs lattice ref | The studio's time error (forward Euler, first order) plus float32 roundoff. The two solve the same discrete system, so any stencil, sign or coefficient error in the studio would show up here. | Computed, not tuned: `lambda^2 dt T + 1e-4`. This is twice the forward-Euler relative error `lambda^2 dt T / 2` of the fastest-growing linear mode, plus room for float32. |
| reference self-error | The reference's own step error, from a rerun at half the step. | Lattice: a tenth of the bound above. Continuum: `1e-3`, below every statistic tolerance. |
| relL2 vs continuum ref | The spatial discretization gap at unit cell spacing. | Reported, not gated. The tabs claim finite-grid agreement, not continuum convergence. |
| cahn: length `2 pi / k1` | `k1` is the first moment of the shell-averaged structure factor: the domain size. | 5 per cent against the continuum reference. At the pattern wavenumber (about 0.6), the 5-point symbol `|k|^2 (1 - |k|^2/12)` is about 3 per cent low. |
| swift: dominant k | The power-weighted mean wavenumber over the spectral peak. | 5 per cent against the continuum reference, for the same reason. |
| ks: spectrum shape | The RMS of log10 of the ratio of normalized energy spectra, in bins 0.1 wide, over the unstable band `k <= 1/sqrt(nu)`. | 0.15 (a factor of 1.4). This is one snapshot of a chaotic field: the lowest bins hold about 50 modes each, and in-band symbol error is at most 8 per cent. |

**Kuramoto-Sivashinsky is chaotic.** Its pointwise comparison is at a short time, 150 steps (`T = 2.7`),
before the trajectories separate. The long run, 2000 steps (`T = 36`), compares only the shape of the
energy spectrum. The long-run L2 differences and the spectrum shape in the dissipative tail,
`1/sqrt(nu) < k <= 2/sqrt(nu)`, are printed but not gated. In the tail, the 5-point stencil damps too
weakly: its symbol at `k = 2` is 2.83, against 4. The first run gated the band `k <= 2`, one shell at a time
with no bins. It measured 0.283 against the continuum and 0.026 against the lattice reference, and failed. The lattice agreement shows
that the studio solves its discrete system correctly, so the gap was the known fixed-spacing
limitation, not a bug. The gate was moved to the band where energy is injected.

**What a PASS means.** The field the studio exports after N steps is, within a first-order time-error
bound, the solution of the spatially discrete equation the tab states. This holds at one default
recipe per tab, from its own seeded initial field, on the renderer that ran it (SwiftShader, float32, in
headless runs). The pattern scale also agrees with the continuum PDE to within the stencil's known
truncation.

**What it does not mean.** It is not continuum convergence. The grid spacing is fixed at 1, and a larger
grid is a larger domain. It does not cover degenerate mobility (`deg`), the no-flux boundary, Swift's
quadratic term (the default `g` is 0), the additive noise or the brush. It is not a coarsening-exponent
or phase-diagram claim, and it does not certify float16 devices or real GPUs. Separate runs cover those
(see `validation/PDE-FAMILY.md`). The reference applies no dealiasing: a 2/3 or 1/2 filter would
change the studio's initial condition, and these damped equations keep little power near the grid
scale. Aliasing therefore enters both solvers alike in lattice mode, and continuum mode keeps a small
aliasing error at the grid scale.

## Not a target yet

The other pde tabs (`ohta`, `amb`, `pfc`) export the same way and could be added with a `model()` entry
each. The `fluid` tab is not a target until it has a viscous model. Its equation was corrected on
2026-09-25 to damped forced flow, and a Navier-Stokes reference has nothing to compare against it.

## Adding an established solver later

Each of these runs as a separate process that reads the exported `.npz`, the initial field and the recipe
from `meta.json`, and writes a field for `run.py` to compare. None of them is vendored or imported by the
studio.

- **Exponax** (MIT; JAX): has ETDRK steppers for Kuramoto-Sivashinsky, Swift-Hohenberg and Cahn-Hilliard
  on periodic domains. Set its domain extent to the grid size (unit spacing) and match its coefficient
  convention to the tab's equation before comparing.
- **py-pde** (MIT): define the tab's equation as a `PDE({...})` expression on a periodic `CartesianGrid`
  with unit cells. It has finite-difference operators, so it is a second lattice-style check with an
  adaptive time stepper.
- **Dedalus** (GPL-3.0): a spectral solver with Fourier bases. Run it only as a separate process, and
  keep its source and its generated code out of this repository. Communicate through `.npz` files. The
  studio is Apache-2.0, and a GPL component must not be vendored, imported or bundled.
- **SUNDIALS** (BSD-3; CVODE or ARKODE through `scikits.odes` or `sundials` bindings): pass the lattice
  right-hand side in as a method-of-lines ODE. This gives an adaptive, error-controlled time reference,
  which separates the studio's time error from its spatial error more sharply than a fixed step does.
