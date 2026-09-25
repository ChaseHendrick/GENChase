# Order of accuracy: pde and rdx GPU solvers

`tools/pde-order.js` measures the observed order of accuracy of the eleven GPU grid solvers in
`src/modules/pde.js` (amb, cahn, ohta, swift, pfc, ks) and `src/modules/rdx.js` (excitable, turing, cyclic,
chemotaxis, vegetation) against the formal order of the scheme each step shader implements. It covers item
4c of [docs/RESEARCH-GRADE.md](../docs/RESEARCH-GRADE.md): refinement at a fixed physical domain and a fixed
physical time, as item 3 of the [validation contract](README.md) requires. The raw numbers, every ladder and
seed, the source SHA-256 of both modules and of the reference library, the tool's own hash and the WebGL
renderer string are in [results/pde-order.json](results/pde-order.json).

```
node tools/build.js
node tools/pde-order.js                 # quick: cahn and turing, every ladder; 60 s here
node tools/pde-order.js --full --write  # every tab, every ladder, three seeds; 437 s here
node tools/pde-order.js --tab ks        # one tab (add --full for the full ladder)
```

Times are for headless Chromium 141 on ANGLE/SwiftShader, on a 4-core machine shared with other jobs. The
results file holds the `--full` run of all eleven tabs.

## What is run

Every number comes from the module's own instance. The harness loads `dist/studio.html` and evaluates the two
module files in the page with four test-only edits: registration is routed into a table, the spec each tab
hands to `pdeCreate` or `rdxCreate` is recorded, an exact grid height is allowed, and two audit methods are
added to the instance. It never writes them back. `auditUpload` puts a chosen field into the instance's state
texture through its own `upload()`. `auditAdvance(n)` calls the instance's own `step(n)`. The shaders, the uniform
mapping (`spec.stepUniforms` and friends), the step loop, the rdx `dtMax` clamp and the pde numerical guard are
therefore the product's. The field is read back through the instance's own `exportData()`. Noise is off. Mutants
and manufactured-solution sources edit a copy of the shader text in the page, never the file.

The references read nothing back from the shaders:

- `tools/lib/pde-reference.js`, the existing Float64 lattice reference for the six pde tabs, run as forward
  Euler (the rounding twin, below) and as RK4 (the semi-discrete reference).
- A Float64 rdx lattice in `tools/pde-order.js`, transcribed from the model equations and the scheme the shader
  comments document. It has explicit gains, and an implicit linear loss where the shader divides by
  `1 + dt loss`. It uses the 5- or 9-point Laplacian times `c^2`, conservative chemotactic face fluxes, upwind
  water advection and rainfall at the cell center. It provides both a discrete step and a semi-discrete
  right-hand side.
- The manufactured solutions, whose source terms and exact fields are evaluated in Float64 from closed forms.

## Formal orders, read from the shaders

**Time: order 1 for every tab.** No tab uses operator splitting or a multistage method.

- **pde (all six).** Every auxiliary pass reads the old field: the chemical potential, `lap u`, `lap lap u`, and
  PFC's `L9 psi` and `mu`. The step pass then adds `dt F`. The composite is exactly forward Euler on the
  semi-discrete system, `u(n+1) = u(n) + dt F_h(u(n))`, with local error `dt^2 u''/2` and global order 1.
- **excitable, cyclic, chemotaxis.** Forward Euler on every species from the old state, then a clamp that stays
  inactive on these fixtures.
- **turing, vegetation.** Linearly implicit Euler, `x(n+1) = (x(n) + dt g(u(n))) / (1 + dt l(u(n)))`, with every
  species updated from the old state. Expanding gives `x(n+1) = x + dt F - dt^2 l F + O(dt^3)` with
  `F = g - l x`. The exact solution has `x + dt F + dt^2 F'/2`. The `dt^2` terms differ, so the local error is
  `O(dt^2)` and the global order is 1. The implicit loss removes the reaction stiffness from the step bound; it
  does not raise the order.

**Space: order 2, except vegetation.**

- The 5-point Laplacian has truncation `h^2 (u_xxxx + u_yyyy)/12`.
- The 9-point Mehrstellen stencil has truncation `h^2 lap^2 u / 12`: order 2. It would be fourth order only
  with a corrected right-hand side, which the shaders do not use.
- Also second order:
  - nested Laplacians (Swift-Hohenberg, Kuramoto-Sivashinsky, the Cahn-Hilliard family, PFC's three);
  - central gradients (KS, the AMB lambda term);
  - face-centered conservative fluxes (the AMB zeta current, chemotaxis).
- Vegetation's water advection is the forward (upwind) difference `(w(i+1) - w(i))/h`. That is first order,
  with leading error `-(v h/2) w_xx`, a numerical diffusion. Vegetation's formal spatial order is therefore 1.

## Refinement

**Time.**
- **Initial field.** One smooth initial field on the tab's own 32 x 32 lattice: a seeded sum of five Fourier
  modes with `1 <= |mx| + |my| <= 4`. PFC uses the band 4 to 6 (Findings).
- **Starting step.** `dt0` is the step the studio takes at the default recipe: the default `dt` after the
  module's own ceiling. Seven tabs clamp it:

  | tab | `dt0` |
  |---|---|
  | cahn | 0.01153 |
  | ohta | 0.01212 |
  | amb | 0.01153 |
  | swift | 0.01514 |
  | turing | 0.008333 |
  | chemotaxis | 0.019995 |
  | vegetation | 0.01818 (recipe v5 ceiling; 0.02 before, Findings) |

- **Ladder.** `dt0, dt0/2, ..., dt0/16` (`--full`; quick stops at `dt0/8`) at `T = n0 dt0`. `n0` is 32, except
  16 for excitable and 64 for turing and PFC.
- **Errors.** Two measures:
  - successive differences `|u(dt_k) - u(dt_k+1)|` (self-convergence);
  - the true time error against a Float64 RK4 integration of the same semi-discrete system, at a quarter and an
    eighth of the finest step. The two RK4 runs agree to within 1e-12 on every tab.

**Space.** A fixed physical domain, grids `N, 2N, 4N` (and `8N` for rdx in `--full`), and a fixed `T`.

- **pde: spacing imposed through the coefficients.** The pde stencils use unit cell spacing. A unit stencil on
  a field sampled at spacing `h` returns `h^2` times the physical Laplacian (`h` times a central gradient), so
  each coefficient is divided by the power of `h` its operator carries. Where the shader hard-wires a coefficient
  to 1, the whole right-hand side is multiplied by a power of `h` and the step divided by it. Every factor is a
  power of two, so the scaling is exact in float32.

  | tab | scaled parameters |
  |---|---|
  | cahn, ohta | `eps -> eps/h`, `M -> M/h^2` (`sigma` unchanged) |
  | amb | `eps -> eps/h`, `M -> M/h^2`, `lambda -> lambda/h^2`, `zeta -> zeta/h^4` |
  | swift | `r -> r h^4`, `k0 -> k0 h`, `g -> g h^4`, `cub -> cub h^4`, shader `dt -> dt/h^4` |
  | ks | `nu -> nu/h^2`, shader `dt -> dt/h^2` (`alpha` unchanged) |
  | pfc | `psi` stored as `h^2 psi`, `r -> r h^4`, `k0 -> k0 h`, `M -> M/h^6` |

  PFC's field is stored scaled because of its fixed cubic term: with `phi = h^2 psi`, the shader's `phi^3`
  carries the same `h^6` as its linear part.
- **pde: domain and steps.** A 16 x 16 domain at `h = 1, 1/2, 1/4` (PFC: 32 x 32 at `h = 2, 1, 1/2`, see
  Findings). Modes `|mx| + |my| <= 2`. `dt` is proportional to `h^4`, so every level runs near the same fraction of
  its own explicit bound (0.44 to 0.54; for PFC, whose sixth-order stiffness grows faster, 0.04 to 0.49), and
  the `O(dt)` time error is `O(h^4)`, negligible against `O(h^2)`.
  One `dt` shared by all levels was tried first. It made the coarse levels take increments so far below
  `ulp(u)` that float32 rounding of the increments (2e-5) swamped them.
- **rdx: spacing from the tab's own parameter.** rdx exposes the spacing as `scale` (cells per length unit).
  The domain is 32 cells of the tab's own lattice. The grids are 16, 32, 64 (and 128) cells at `scale` = c0/2,
  c0, 2 c0 (and 4 c0), so the tab's own lattice is the second grid. Every level uses one `dt`: half the smaller
  of the finest level's bound and the module's own `dtMax`. The `O(dt)` error is then common to all levels.
  Vegetation uses its own ladder (Findings).
- **Comparing levels.** pde fields are vertex-centered and compared by injection. rdx fields are cell-centered
  (the rainfall is evaluated at cell centers) and compared after a 2 x 2 average.

**Explicit stability bound.** Computed, not assumed:
- **The mode.** The (pi, pi) grid mode, where the 5-point symbol is -8 and the 9-point one is -16/3.
- **The linearization.** At the corners of the field envelope widened by 10%, through the Float64 twin of the
  actual update on a 2 x 2 periodic lattice.
- **The bound.** The largest `dt` at which no decaying eigenvalue of that one-step map is amplified. For a scalar
  forward Euler row it is `dt < 2/|lambda|` (AGENTS.md). Modes that the frozen linearization grows set no bound.
- **Where the runs sit.** Every `dt` is checked against the bound:
  - on the time ladders, `dt0` sits between 0.11 (PFC) and 0.80 (turing) of it; vegetation is at 0.79;
  - on the space ladders, at 0.54 or below.

**The float32 floor.** Every GPU run on the time and space ladders is repeated in Float64 with the same discrete
update, `dt` and grid. `R = max |GPU - Float64 twin|` is the rounding error that run carries. The rule:
- a successive difference `d_k` is on the floor, and excluded from the fit, when `d_k < 10 (R_k + R_k+1)`;
- a true error `e_k` is excluded when `e_k < 10 R_k`.

Rounding is then at most a tenth of what is fitted.

**Orders and spreads.**
- **Pairwise orders.** `p_k = log2(d_k / d_k+1)` between consecutive accepted points.
- **Fitted order.** The least-squares slope of `log2 d` against `log2 dt` (or `log2 h`) over accepted points.
- **Observed order.** The mean over three seeds of the fitted orders (`stats.ensemble` from
  `src/shared/stats.js`).
- **Spread.** The value after `+/-` is half the range of every accepted pairwise order, along the ladder and
  across seeds. The seed-to-seed standard deviation and the finest pairwise order are in the JSON.
- **Pass.** A ladder passes when `|observed - formal| <= 0.25`.

## Results

`--full`, three seeds per ladder.
- **Time.** Successive differences, with the true error against the Float64 RK4 reference in parentheses.
- **Space.** Successive differences.
- **MMS.** The manufactured-solution order, below.

| tab | integrator | formal t, x | time: observed ± spread (true error) | space: observed ± spread | dt ladder on 32 x 32, T | grids (spacing h) | MMS | limits of this row |
|---|---|---|---|---|---|---|---|---|
| amb | forward Euler | 1, 2 | 1.01 ± 0.01 (1.00 ± 0.01) | 1.91 ± 0.15 | 1.15e-2 to 7.2e-4, T = 0.369 | 16, 32, 64 (1, 1/2, 1/4) | no | zeta = -4, lambda = 1 |
| cahn | forward Euler | 1, 2 | 1.00 ± 0.02 (1.00 ± 0.01) | 1.97 ± 0.12 | 1.15e-2 to 7.2e-4, T = 0.369 | 16, 32, 64 (1, 1/2, 1/4) | yes: 2.03 | constant mobility |
| ohta | forward Euler | 1, 2 | 1.00 ± 0.02 (1.00 ± 0.01) | 1.96 ± 0.11 | 1.21e-2 to 7.6e-4, T = 0.388 | 16, 32, 64 (1, 1/2, 1/4) | no | constant mobility, sigma = 0.06 |
| swift | forward Euler | 1, 2 | 1.00 ± 0.01 (1.00 ± 0.02) | 1.94 ± 0.01 | 1.51e-2 to 9.5e-4, T = 0.485 | 16, 32, 64 (1, 1/2, 1/4) | no | g = 0 |
| pfc | forward Euler | 1, 2 | 0.99 ± 0.01 (1.00 ± 0.01) | 1.84 ± 0.02 | 5e-3 to 3.1e-4, T = 0.32 | 16, 32, 64 (2, 1, 1/2) | no | finer grids on the float32 floor (Findings) |
| ks | forward Euler | 1, 2 | 1.00 ± 0.01 (1.00 ± 0.03) | 1.93 ± 0.09 | 1.8e-2 to 1.1e-3, T = 0.576 | 16, 32, 64 (1, 1/2, 1/4) | no | short T, no chaotic regime |
| excitable | forward Euler | 1, 2 | 0.96 ± 0.04 (0.98 ± 0.04) | 1.93 ± 0.11 | 1.2e-2 to 7.5e-4, T = 0.192 | 16 to 128 (0.8 to 0.1) | no | Barkley; pre-asymptotic at dt0 |
| turing | linearly implicit Euler | 1, 2 | 0.89 ± 0.01 (1.03 ± 0.05) | 1.92 ± 0.07 | 8.33e-3 to 5.2e-4, T = 0.533 | 16 to 128 (3.33 to 0.417) | yes: 1.99 | Schnakenberg; float32 floor from dt0/4 and at N = 128 |
| cyclic | forward Euler | 1, 2 | 1.01 ± 0.01 (1.00 ± 0.01) | 1.94 ± 0.07 | 1e-1 to 6.25e-3, T = 3.2 | 16 to 128 (1 to 0.125) | no | |
| chemotaxis | forward Euler | 1, 2 | 1.01 ± 0.01 (1.00 ± 0.01) | 1.98 ± 0.03 | 2e-2 to 1.25e-3, T = 0.64 | 16 to 128 (0.909 to 0.114) | no | |
| vegetation | linearly implicit Euler, upwind advection | 1, 1 | **1.30 ± 0.45, mismatch** (1.10 ± 0.36) | 0.90 ± 0.09 | 1.82e-2 to 1.14e-3, T = 0.582 | 32 to 256 (1 to 0.125), uniform rain, T = 0.145 | no | pre-asymptotic at Courant 0.73; default recipe does not converge in space (Findings) |

- **Time.** Every tab reproduces the formal order 1 except vegetation, whose ladder starts in a pre-asymptotic
  range (Findings); its true error is inside the band, its self-convergence is not.
  - The seed-to-seed standard deviation of the fitted order is 0.002 to 0.022 on the pde tabs, 0.004 to 0.013
    on excitable, turing, cyclic and chemotaxis, and 0.12 on vegetation.
  - Turing's successive differences keep only their first pair above the float32 floor, so its
    self-convergence order, 0.89, rests on one pair per seed; the `+/-` there is that pair's spread across seeds.
    Its true error, which the floor rule keeps at more levels, gives 1.03.
- **Space.** The pde tabs give 1.84 to 1.97 and the rdx tabs 1.92 to 1.98, against 2. The last pairwise orders
  sit closer to 2 than the fits, which include the coarsest pair. Turing's fourth grid (N = 128) is on the float32
  floor for every seed, so its order rests on the first two pairs. Vegetation gives 0.90 against its formal 1.
- **Floor exclusions.** On the time ladders the floor rule drops the `dt0/8` to `dt0/16` difference on most pde
  tabs and PFC loses two or three points per seed. The counts per seed are in the JSON (`self.onFloor`).

## Manufactured solutions

The source term `S = u*_t - F(u*)` is added to the explicit part of the update in a copy of the step shader. Its
spatial factors are evaluated in Float64 and uploaded as textures. Its time factor is formed in the shader from
`t_n = n dt`, with `n` recovered from the instance's own `u_step` uniform. The error is measured against the
exact `u*(x, T)` at the grid points: a true error, not self-convergence.

- **cahn.**
  - **Manufactured solution.** `u* = 0.1 + 0.35 (1 + 0.6 t) phi(x, y)`, where `phi` is three modes with
    `|mx| + |my| <= 2` on a 16 x 16 periodic domain.
  - **Source.** `S = u*_t - M lap(mu(u*))` with the default `eps = 1.1` and `M = 1`, including the nonlinear
    `lap(u^3)`.
  - **Refinement.** `T = 0.5`, `h = 1, 1/2, 1/4`, steps proportional to `h^-4` (39, 624 and 9,984 steps).
  - **Result.** Maximum errors 4.05e-3, 9.54e-4, 2.43e-4 give pairwise orders 2.09 and 1.97 and a fitted
    order of 2.03, against 2.
- **turing (Schnakenberg).**
  - **Manufactured solution.** `u* = 1 + 0.3 (1 + 0.8 t) phi`, `v* = 0.9 + 0.15 (1 - 0.8 t) psi`, each of
    `phi` and `psi` three modes with `|mx| + |my| <= 3`, about the uniform state `(a + b, b/(a + b)^2)`.
  - **Source.** Added to the explicit gains of the linearly implicit update; `D = 100` and the 9-point stencil.
  - **Refinement.** `T = 0.267`, `scale = 0.3, 0.6, 1.2` on a fixed 53.3-unit domain, one `dt` (205 steps
    of 1.30e-3).
  - **Result.** Maximum errors 7.68e-3, 1.89e-3, 4.85e-4 give pairwise orders 2.02 and 1.96 and a fitted
    order of 1.99, against 2.

In both, the `O(dt)` time error is too small to affect the observed order. For cahn, `dt` is proportional to
`h^4`. For turing, one `dt` serves all three grids, and the error still falls at order 1.96 at the finest pair.

## Failure controls

- **clock.** In a copy of the step shader, `u_dt` is replaced by `2.0 * u_dt` inside `main()`: the update is
  applied twice per recorded step. It is run at `dt/2` for twice the steps, so each update is still `dt` and
  stays inside the bound, but the field reaches `2T` while the clock records `T`.
  - **True-error checks: detected on all eleven tabs.** Against the Float64 RK4 reference, the mutant's error
    stops falling. Its fitted order is -0.03 to 0.00, and its finest error is 7.8e-3 to 0.72.
  - **Self-convergence: blind to it.** The mutant's successive differences converge at order 0.92 to 1.10 on
    ten tabs. PFC's 0.47 is not a detection: its mutant ladder, where the floor rule is not applied, reaches the
    float32 floor. **Self-convergence alone cannot see a consistent error in the clock or the equation;** that is
    why the true-error checks are kept.
  - **Manufactured solutions: detected.** The error stays at 9.9e-2 (cahn) and 7.8e-2 (turing) on every grid
    (orders 0.02 and 0.00).
- **weight.** The Laplacian center weight -4 becomes -3.9, and -20 becomes -19.9 in the 9-point stencils: an
  inconsistent stencil whose error grows like `0.1/h^2`.
  - **Space ladders: detected on all eleven tabs.** The successive differences grow with refinement: orders -1.36
    to -4.18. The pde numerical guard stopped none of these runs.
  - **Manufactured solutions: detected.** Orders -2.28 (cahn) and -2.08 (turing).
  - **Time ladders: not tried.** A wrong center weight is still a consistent ODE on a fixed grid, and the time
    ladder is not expected to see it.

**Floor probe.** The cahn time ladder is carried to `dt0/128` (`T = 0.184`, 16 to 2048 steps). The successive
differences fall at order 1 to `dt0/8`, then rise: 1.87e-5, 9.15e-6, 4.53e-6, 2.21e-6, 1.40e-6, 2.98e-6,
5.10e-6. The rounding error grows from 5.1e-8 to 6.7e-6. The rule excludes everything from the fourth
difference on. The fit over the accepted points gives 1.02; the fit over all points would give 0.38.

## Findings

1. **Vegetation's step ceiling exceeded the explicit bound; corrected at recipe v5.**
   - **The bound, from the shader.** The water update is
     `w' = (w + dt (a + v c (w_E - w) + D_w L w)) / (1 + dt (1 + n^2))`, with `w_E` the neighbor at `+x` and `L`
     the 5- or 9-point Laplacian times `c^2`. On a Fourier mode the explicit part multiplies by `1 + dt lambda`,
     `lambda = D_w c^2 sigma(k) + v c (e^{i kx} - 1)`, and the implicit loss divides by `1 + dt l` with
     `l = 1 + n^2 >= 1`. At the (pi, pi) mode `sigma = -Q` (`Q = 8`, or 16/3 for the 9-point stencil) and
     `e^{i pi} - 1 = -2`, so `lambda = -R` with `R = Q D_w c^2 + 2 v c`, and `|1 - dt R| <= 1 + dt l` requires
     `dt (R - l) <= 2`. That is the bound this finding stated before the fix, with loss `l`; its smallest value,
     `l = 1` on bare soil, gives the least stable case, `dt (R - 1) < 2`.
   - **Every other mode is less restrictive.** Write `p = 1 - cos kx`, `A = -Re lambda` and `I = Im lambda`, so
     `I^2 = (v c)^2 p (2 - p)`. Since `-sigma` lies in `[0, Q]`, `A >= p v c` and `R - A >= (2 - p) v c`, hence
     `I^2 <= A (R - A)`. The condition for mode `k`, `dt (|lambda|^2 - l^2) <= 2 (A + l)`, then follows from
     `dt (R - l) <= 2`, because `|lambda|^2 - l^2 <= A R - l^2 <= (A + l)(R - l)`. This holds for both stencils,
     with the loss or without it. The tool also scans every mode numerically (below).
   - **What the module did.** `vegDtMax` took the smaller of `0.2/(D c^2)` (0.3 for the 9-point stencil) and
     `0.8/(v c)`, each 0.8 of its own term's bound. When the two terms are comparable, the smaller limit
     overshoots the combined bound by up to a factor 1.6.
   - **The fix.** From recipe v5 the ceiling is `min(1.6/R, 1.6/(Q D_n c^2), 0.5/m, 0.25)`: 0.8 of the combined
     bound before the implicit loss is counted, which is the margin the other tabs use, with the plant row at
     the same margin.
   - **Older recipes.** A recipe made before v5 gets `ceiling: 'v4'` through `legacy: { 5: { ceiling: 'v4' } }`.
     - Where its pre-v5 step satisfied `dt (R - 1) < 2`, it was stable, and it keeps that step. It reprints:
       float32 exports at recipe v4 (grid 256, 150 steps) of the default recipe, of `D_w` = 2 and 2.5 at slope 40,
       and of the gentle, steep and flat preset settings are bit for bit the same as on main before this change
       (a3b5e98), while `D_w` = 5, past the bound, differs as it should (a before-and-after hash, not a recorded
       tool).
     - Where the step was past the bound, the plate was a growing grid-scale checkerboard, not the model. Such a
       recipe takes the combined ceiling. That is a solver correction and its plate changes.
     - A recipe at v5 gets the combined ceiling. The default and six of the seven presets take a smaller step
       than before: the default, tiger, sparse, runoff and relief 0.01818 instead of 0.02, steep 0.00969 instead
       of 0.01, gentle 0.04 instead of 0.05. Flat ground is unchanged at 0.03.
   - **The regression check.** The tool's `ceiling` section (`ORDER_ONLY=ceiling node tools/pde-order.js --tab
     vegetation`) is recorded under `tabs.vegetation.ceiling`. A failing gate fails the run. It has four parts.
     - **Sweep.** 51,840 settings spanning the UI ranges (eight scales from 0.3 to 3, eight slopes from 0 to 120,
       nine values of `D_w` from 0 to 40, `D_n` 0.2, 1 and 3, `m` 0.05, 0.45 and 1.2, both stencils, requested `dt`
       0.001 to 0.25), each under both rules, through the module's own sanitize and step clamp. Under the combined
       rule the step is at most 0.800 of `2/R` and of the plant bound. Under the v4 rule the step is below
       `2/(R - 1)` everywhere: it keeps the pre-v5 step in 42,600 settings and corrects it in 9,240 (17.8%), where
       the pre-v5 step was up to 1.599 times the bound.
     - **Modes.** At every swept step, every Fourier mode of the linearized water row (bare soil) and plant row,
       on a 17 x 17 grid of wavenumbers in `[0, pi]^2`, from the stencil and upwind symbols. The largest
       amplification is 0.99956 for water (the uniform mode at the smallest step, damped only by the implicit
       loss) and 0.99998 for plants: none is amplified.
     - **Instance.** The actual shader on a 32 x 32 lattice, from a smooth water field carrying a 1e-6
       checkerboard on bare soil (`n = 0`, so the water row is decoupled and its bound is exactly `2/(R - 1)`),
       at slope 40 and scale 1, for 200 steps:

       | `D_w`, stencil | bound `2/(R - 1)` | step, recipe v5 | step, v4 rule | pre-v5 step / bound | checkerboard at step 200: v5 step, pre-v5 step, 1.02 x bound |
       |---|---|---|---|---|---|
       | 1, 5-point | 0.02299 | 0.01818 | 0.02000 (kept) | 0.87 | 5.2e-10, 2.6e-9, 2.1e-3 |
       | 5, 5-point | 0.01681 | 0.01333 | 0.01333 (corrected) | 1.19 | 2.0e-9, 20, 2.2e-3 |
       | 10, 5-point | 0.01258 | 0.01000 | 0.01000 (corrected) | 1.59 | 1.7e-9, 20, 2.3e-3 |
       | 20, 5-point | 0.00837 | 0.00667 | 0.00667 (corrected) | 1.20 | 0, 20, 2.4e-3 |
       | 10, 9-point | 0.01511 | 0.01200 | 0.01200 (corrected) | 1.32 | 1.7e-9, 20, 2.3e-3 |

       The checkerboard starts at 1e-6. An amplitude of 20 is the field saturated at the shader's clamp of 40. The
       Float64 twin, with both species linearized over the envelope, gives the same bound at all five settings.

       The module's step decays the checkerboard under both rules. The pre-v5 step, run with the ceiling removed,
       grows it wherever it is past the bound, and 0.98 and 1.02 of the computed bound decay and grow on the
       actual shader.
     - **Presets.** Under the combined rule every preset takes 0.8 of `2/R`, 0.78 to 0.80 of the twin bound. Under
       the v4 rule each keeps its pre-v5 step, 0.785 to 0.975 of the twin bound (`gentle` at 0.975).
   - **Margin of the kept steps.** The kept pre-v5 steps can have almost no margin. At the corner of the ranges
     (scale 3, slope 120, `D_w` = 40, 5-point) the step is 0.9997 of the bare-soil bound, as it always was. A v5
     recipe with those settings takes 0.8 of `2/R`.
2. **Vegetation's time ladder starts pre-asymptotic.** At the studio's own step the Courant number of the upwind
   advection is `v dt c = 0.73` (0.8 before recipe v5). At a Courant number of 1, the time and space errors of
   pure upwind advection cancel, so the error is not yet linear in `dt` at 0.73. The first pairwise orders, between
   `dt0`, `dt0/2` and `dt0/4`, are 1.3 to 1.9; the finest are 0.96 to 1.13. The fit over the whole ladder,
   1.30 +/- 0.45, is outside the band. It is recorded as a mismatch, explained by the starting point rather than
   by the scheme. The true error gives 1.10 +/- 0.36, inside the band. (Before recipe v5, from `dt0 = 0.02`, the
   two were 1.26 +/- 0.51 and 1.05 +/- 0.43.)
3. **Vegetation's default recipe has no asymptotic range on its own lattice.** Two properties cause this:
   - The rainfall ramp `a (1 + agrad (2y - 1))` jumps by `2 agrad a` (1.32 at the defaults) across the periodic
     seam in `y`, which forces an internal layer into the water field.
   - The upwind numerical diffusion `v h/2` is 20 on the tab's lattice, twenty times `D_w = 1`.

   The recorded ladders separate the two:

   | ladder | observed order | what it isolates |
   |---|---|---|
   | default recipe, grids 16, 32, 64 | -0.08 | both properties |
   | default `agrad` on the fine ladder, grids 32 to 128 | 0.03 to 0.27 | the seam |
   | uniform rain on the tab's ladder | 0.26 to 0.65 | the numerical diffusion |
   | uniform rain on the fine ladder, grids 32 to 256, `T = 0.145` | 0.90 +/- 0.09 | neither (the main measurement) |

   The main measurement's pairwise orders rise toward the formal 1 with refinement (finest 0.90 to 0.97). The
   seam is a modeling choice, not a numerical error, but it means the plate's top and bottom rows sit next to a
   rainfall step.
4. **The implicit denominators set a float32 floor that rises as `dt` falls.** turing and vegetation form
   `1 + dt loss` in float32. Its rounding, up to `ulp(1)/2`, scales the whole updated field and acts as an error
   of up to `ulp(1)/(2 dt)` in the loss rate, so the rounding error grows as `dt` shrinks (RDX.md notes the same
   quantization for vegetation).
   - **Turing's rounding.** On the turing time ladder, `R` is 2.5e-6 at `dt0` and 1.4e-5 to 2.4e-5 from
     `dt0/2` on.
   - **The cause, isolated.** A Float64 twin in which only the denominators are rounded to float32 reproduces
     this: 0.9e-6, 1.3e-5, 1.5e-5 and 1.5e-5 from `dt0` to `dt0/8`. This was a separate diagnostic, not part of
     the tool or the JSON. To repeat it, replace `1 + dt * l[k]` in `rdxLattice().step` by
     `Math.fround(1 + Math.fround(dt) * Math.fround(l[k]))` and compare the two twins.
   - **The consequence.** turing's self-convergence reaches the floor by `dt0/4`, and its true-error pairwise
     orders drift to 1.05 at the finest levels.
   - **A possible repair, not made here.** The algebraically identical increment form
     `x + dt (g - l x)/(1 + dt l)` would confine the denominator's rounding to the increment.
5. **PFC's sixth-order operator hits the float32 floor on fine grids.** Three nested 9-point Laplacians amplify
   rounding by about `h^-6`. On the `h = 1, 1/2, 1/4` ladder the other pde tabs use, the rounding carried at
   `h = 1/4` (9.1e-5) equals the spatial difference it should resolve (8.9e-5), so that ladder gives no order
   (recorded as `spaceAlt`). The order is measured at `h = 2, 1, 1/2` instead: 1.84 +/- 0.02. PFC's default
   dynamics are also slow and near-marginal (mobility 0.35), so its time fixture uses faster modes (the band 4 to
   6) and a larger amplitude. At the default recipe, `dt0 = 0.005` is 0.11 of the explicit bound at the fixture's
   envelope. The module's ceiling assumes `|psi| <= 2.8`.
6. **Excitable (Barkley) is pre-asymptotic at `dt0`.** The pairwise orders are 0.91 to 0.93 at the first pair,
   because of the stiff kinetics (`1/eps = 50`), and reach 0.98 to 0.99 at the finest.

## Limits

- **One renderer and precision.** One software renderer (ANGLE on SwiftShader) with float32 render targets only.
  The float16 fallback and physical GPUs (items 4a and 4b) are not measured. The floor is set by rounding, so it
  depends on the renderer.
- **Default parameters only.** Each tab runs at its defaults: Barkley for excitable, Schnakenberg for turing,
  constant mobility for cahn and ohta, periodic boundaries and no noise. The other kinetics, degenerate mobility,
  no-flux boundaries, the presets and the noise terms are outside this study.
- **Short times from smooth fields.** Not covered:
  - nonlinear pattern selection, coarsening, spirals, fronts and chaotic regimes, where errors grow with a
    Lyapunov exponent;
  - the continuum accuracy of a finished plate, which runs on the tab's own lattice at `dt0` for thousands of
    steps.
- **pde spacing through coefficients.** The pde spatial ladders impose the spacing by scaling coefficients far
  outside the UI ranges. That is the arithmetic a spacing uniform would perform, not a setting the studio offers.
- **Few grids.** Three grids per spatial ladder, four for rdx in `--full`: one to three pairwise orders per seed.
- **True error in space on two tabs only.** Self-convergence cannot see a consistent error in the equation (the
  clock control). The true-error checks cover time on every tab, but space only on the two manufactured
  solutions.
