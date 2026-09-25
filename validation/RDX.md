# Multi-species reaction-diffusion audit

`tools/rdx-science.js` benchmarks the five tabs built on `rdxCreate` in `src/modules/rdx.js`:
excitable, turing, cyclic, chemotaxis and vegetation. It runs the maintained step shaders, unmodified,
in Chromium through WebGL2 with float32 render targets (SwiftShader in headless runs). The module source is
evaluated with `Studio.register` captured, so the shader text, the uniform mapping (`stepUniforms`) and the
step ceilings (`dtMax`) are the ones the studio uses. Every reference is computed in Float64 from the model
equations. Each failure control edits the shader text in the page, never the file, and must fail the same
criterion its check passes.

```
node tools/rdx-science.js --write      # about 45 s on SwiftShader; writes results/rdx-science.json
RDX_ONLY=turing node tools/rdx-science.js   # one section: stencil, diffusion, excitable, turing, cyclic, chemotaxis, vegetation
```

## What the code implements

All five use forward Euler on a periodic grid, `u_c = scale` cells per length unit, and the 5-point or
Mehrstellen 9-point Laplacian scaled by `u_c^2`. The Turing and vegetation kernels take each linear loss term
implicitly, `x' = (x + dt gain)/(1 + dt loss)`. Every species is clamped after the update.

| Tab | Equations in the shader |
|---|---|
| excitable, Barkley | u_t = ∇²u + u(1 − u)(u − (v + b)/a)/ε, v_t = D∇²v + u − v |
| excitable, FHN | u_t = ∇²u + u − u³ − v, v_t = D∇²v + ε(u − a v − b) |
| turing | Schnakenberg, Brusselator, Gierer-Meinhardt with saturation K, Lengyel-Epstein with σ multiplying the whole v equation |
| cyclic | u_t = D∇²u + u(1 − u − a v − b w) and cyclic permutations |
| chemotaxis | u_t = ∇²u − ∇·(χ(u)∇v) + u(1 − u), v_t = D∇²v + u − a v, χ(u) = c u/(1 + u²) at each face from the mean of two cells |
| vegetation | w_t = a(y) − w − w n² + v ∂w/∂x + D_w∇²w with a forward (upwind) difference, n_t = w n² − m n + D_n∇²n |

## References used

Nothing is read back from the shader to build a reference.

- **Discrete update.** An independent Float64 transcription of the scheme described above, compared over ten
  steps on a smooth field, both stencils, all kinetics.
- **Diffusion modes.** Parameters that switch the reaction off or make it linear leave
  φ_t = D∇²φ − αφ, solved exactly by a Fourier mode on the lattice (stencil symbol) and in the continuum.
- **Nagumo front.** FitzHugh-Nagumo with ε = 0 and D_v = 0 freezes v at v0, so u obeys the bistable
  equation u_t = u_xx − (u − u1)(u − u2)(u − u3), whose front moves at c = (u1 + u3 − 2u2)/√2. The harness
  checks that the closed-form profile solves the travelling-wave equation before using it.
- **May-Leonard.** With S = u + v + w, P = uvw and Q = uv + vw + wu, the kinetics give
  S' = S(1 − S) + (2 − a − b)Q and d ln(P/S³)/dt = (2 − a − b)(S² − 3Q)/S. Both identities are checked at
  random points. For a + b = 2, S is logistic and P/S³ is conserved. The interior fixed point x* = 1/(1 + a + b)
  has a circulant Jacobian with eigenvalue −x*(1 + aω + bω²).
- **Linear stability.** For turing, chemotaxis and vegetation, the Jacobian at the uniform state is derived
  by hand. Three rates are compared: continuum (−k²), lattice (stencil symbol, and the upwind symbol for
  water) and the exact one-step map of the scheme, A = I + dt diag(1/(1 + dt Q)) M. The GPU must reproduce
  the last; the other two measure the discretization error.

## Results

The 2026-09 run on ANGLE/SwiftShader passed 90 of 90 checks and detected 27 of 27 failure controls. The full
numbers are in [results/rdx-science.json](results/rdx-science.json).

- The discrete update agrees to 4.2e-6 at most. Every diffusion mode is within 2.5e-6 of its exact discrete
  factor and converges at observed order 1.99 to 2.23 against a formal order of 2.
- The Nagumo front speed is 0.44357 against the exact 0.44367 at h = 1/16, with orders 2.00 and 1.85.
- For Turing, the fastest-mode rates are within 0.03 to 0.19% of the exact discrete rates. The Schnakenberg
  Richardson order is 1.99, with its limit 3.4e-4 from the continuum.
- The chemotaxis threshold is c* = 1.6 at the defaults. At 0.95c* the critical mode decays at −0.0164, and
  at 1.05c* it grows at +0.0168.
- For vegetation, the fastest band mode on the default slope travels uphill at 0.769, against 0.831 in the
  continuum and 0.769 from the exact one-step map at the step used. That step is 0.9 of the module's ceiling at
  the test's 1.47 cells per unit: 0.01070 under the recipe v5 ceiling, where it was 0.01227 before; the run
  before the change measured 0.768.

## Findings

- **Chemotaxis hint.** The hint said patterns need c > 2.6 at the defaults. The condition the code already
  uses gives c > 2(√a + √D)² = 1.6, and the GPU confirms it. The hint is corrected in its own commit.
- **Barkley stagnation in float32.** u = 1 is a root of the Barkley reaction for every v. Near it the Euler
  increment falls below half an ulp of 1, so a uniform excited cell stays at u ≈ 0.9999989 after
  (v + b)/a exceeds 1, where the exact ODE recovers at t ≈ 3.4. In space, diffusion from neighbours below 1
  supplies larger increments, so waves still recover. The kinetics benchmark stops before saturation for
  this reason.
- **Float32 limits small linear increments.** Around a nonzero base state, a perturbation δ changes by
  dt·σ·δ per step. Once that falls near ulp(base)/2, the growth rate is biased, and at small enough steps
  the mode freezes entirely. The linear tests therefore use 1% perturbations at 0.9 of the module's step
  ceiling, record a worst-case rounding bound per run, and do not measure dt-refinement on the GPU. The
  dt → 0 limit is taken from the exact discrete map.
- **Implicit denominators.** The vegetation water loss divides by 1 + dt, formed in float32. That quantizes
  the effective loss rate by up to ulp(1)/(2dt): about 3e-5 relative at dt = 1e-3, and 1.6e-6 at the default
  step. The exact discrete reference uses the float32 denominator and records the unrounded one alongside it.
- **Vegetation step ceiling.** Until recipe v5 the tab took the smaller of separate diffusion and advection
  limits, which overshoots the combined explicit bound of the water row by up to 1.6 and grows a grid-scale
  checkerboard. The ceiling now combines them; the derivation, the treatment of older recipes and the regression
  check are in [PDE-ORDER.md](PDE-ORDER.md), Findings.
- **Turing status line.** The status line reports the onset-critical wavelength 2π(D_u D_v/det)^(1/4),
  12 cells at the defaults. The fastest-growing wavelength is 10.8 cells, the dominant wavelength measured
  in the linear regime is 11.4 cells, and the saturated pattern measures 9.2 cells. This is recorded, not
  changed.

## Limits

These are finite-grid, noise-free checks of linear dynamics, uniform states, stencils, one exact front and
the well-mixed May-Leonard limit, all on one software renderer. They do not cover:

- nonlinear pattern selection, spiral periods, band spacing or migration speed;
- the noise term;
- the float16 fallback, which [HALF-FLOAT.md](HALF-FLOAT.md) measures but does not validate;
- physical GPUs;
- the print path;
- the Turing tab's Custom reaction mode (2026-09-25), described below.

## Custom reaction (turing), not validated

The Turing tab's Custom reaction steps u_t = D_u∇²u + f(u, v), v_t = D_v∇²v + g(u, v) with f and g typed by
the viewer, by plain forward Euler: no clamps and no implicit loss terms, so a reaction that runs away is
stopped rather than held. The formulas reach the step shader only through `U.expr.toGLSL`; pow, sqrt, log,
asin and acos are routed through guarded versions that agree with JavaScript's `Math`, so a reaction taken
outside its domain gives NaN on the GPU too. None of the evidence above covers this mode, and the status line
says "user-defined, not validated" and prints no comparison with theory.

The step is held under 0.8 of 2/(λ_D + ρ_J). λ_D = Q c² max(D_u, D_v), with Q = 8 for the 5-point stencil and
16/3 for the Mehrstellen stencil, the most negative value of each symbol. ρ_J is the largest eigenvalue
magnitude of the central-difference Jacobian of (f, g) over a sample of the field: the center and the
largest-|u| + |v| cell of each of 32 × 32 blocks, 2048 points, taken at step 0, every 50 steps and whenever
a parameter changes. This is an estimate, not a stability proof. Adding the two magnitudes does not bound the
eigenvalues of J + σ diag(D_u, D_v) when J is not normal, forward Euler amplifies an eigenvalue on the
imaginary axis at any step, and the field can stiffen between two samples. A sample that is not finite, or
past 1e30, stops the plate, and so does a ceiling below 1e-7. The seeding perturbs a uniform state found by
Newton's method from fixed starts, preferring one that is stable without diffusion; when none is found the
plate is seeded near u = v = 1 and the status line says so.

Grid refinement stops where float32 rounding of the base state would bias the measured rate by more than
the discretization error it is meant to resolve (about 1e-3 relative).
