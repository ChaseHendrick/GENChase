# Fisher-KPP fronts: bounded evidence

The `fisher-kpp` tab ([src/modules/fisher-kpp.js](../src/modules/fisher-kpp.js)) solves

    ∂u/∂t = D∇²u + r g(x) u(1 − u)

on a closed rectangle (zero flux through the edges), with g = 1 on uniform ground. Its record in
[techniques.json](techniques.json) is **unvalidated**. The evidence below is registered and passes, but nobody
outside the project has reviewed it, and a population illustration does not establish experimental accuracy.

## The scheme

One step is forward Euler for the diffusion with the 9-point (Mehrstellen) Laplacian, then the exact logistic flow
over dt, u ← u e^{r g dt} / (1 + u (e^{r g dt} − 1)). With μ = D dt/h² ≤ 3/10 the diffusion update is a convex
combination of the nine cells and the logistic flow maps [0, 1] into itself, so the discrete solution stays in
[0, 1] with no clamp. At μ = 1/6, the default, the leading error of the stencil (+h²∇⁴/12, isotropic for the
9-point stencil) and of the Euler step (−D dt ∇⁴/2) cancel, so the speed of the leading edge is in error at
O(h⁴) in every direction. Each cell records the first time u reaches 1/2 (interpolated inside the step) and the
founder whose front got there first. The plate refuses float16 state: a pulled front is set by densities far
below float16 resolution, and a cutoff ε slows it by about π²/(ln ε)² (Brunet and Derrida 1997).

The data export records this 9-point scheme and the numerical diffusion number `mu = D dt/h²`.
`node tools/fisher-kpp-metadata-check.js` checks the real export metadata at grids 512, 256 and 384
with μ = 1/6, 1/4 and 3/10 respectively, including a non-unit diffusion coefficient.
The twin benchmark asserts that the actual grid equals the requested 512 × 512 before comparing fields.

## What is measured on the plate

The status line reads the front speed from the arrival-time field: the mean of 1/|∇T| over cells that arrived
in the last half of the arrival times and have no unreached cell, other founder, wall or non-uniform habitat
within three decay lengths √(D/r). It is set beside 2√(rD) with basis `deterministic` (the seed only places the
founders), and the note prints the finite-time lag at the sampled times, (3/2)√(D/r)⟨1/T⟩ for a straight front
(Bramson 1978) and 2√(D/r)⟨1/T⟩ for a circular one in two dimensions (Gärtner 1982; see the RESEARCH.md entry of
2026-09-26 for what was and was not read), and the difference from a twin run of the same recipe on cells twice
as large (4 dt per step, the same μ). The measured speed reads low and is not rounded toward 2√(rD).

## Evidence

`node tools/fisher-kpp-science.js --write` ([results](results/fisher-kpp-science.json)):

| Check | Criterion | Result |
|---|---|---|
| Logistic growth, real GPU module, uniform u₀ = 0.02, 480 steps | max error against u₀e^{rt}/(1 + u₀(e^{rt} − 1)) below the float32 bound 2e-5 | 4.1e-6, no spatial spread |
| Control: growth rate halved | must miss | misses by 0.55 |
| GPU step against an independent Float64 twin, 512², seven founders, 480 steps | density within 5.7e-5 (480 roundings); arrival times within 1e-3 | 1.6e-5; arrival 5.6e-5 at the 99.9th percentile; one arrival-status mismatch (limit two); labels identical |
| Straight front of the scheme, t ∈ [100, 200]/r and [200, 400]/r, (D, r) = (1, 1), (2, 1/2), (1, 2), two and four cells per √(D/r) | within 1.5e-3 and 5e-4 of 2√(rD) times the Bramson and Ebert-van Saarloos speed | 9.6e-4 to 1.1e-3 and 2.6e-4 to 3.7e-4 (dimensionless), shrinking with time as the next, unknown term should |
| Control: the bare 2√(rD) with no finite-time lag | must miss by more than three tolerances | misses by 4.9e-3 to 9.9e-3 |
| Refinement at fixed domain and window | second order at μ = 1/4, fourth order at μ = 1/6 | orders 2.03, 2.01, 2.00 and 3.90, 3.95 |
| The plate's own witness, production grid 512 (h = 1/2) | inside the lag band for its geometry, within 3e-3 plus its h-and-2h difference; 2√(rD) alone outside | Growth rings 1.9516 (band 1.9406 to 1.9554); one founder 1.9575 against 1.9546 circular; straight front 1.9830 against 1.9809 straight |
| Control: D → −D, Float64 and GPU | the discrete maximum principle must fail | u leaves [0, 1] on both |

`node tools/fisher-kpp-print.js --write` ([results](results/fisher-kpp-print.json)): exports at 2400 × 2400 and
2400 × 1600 in all four views leave every float32 component of the plate and its half-resolution twin
bit-identical; a 2560 × 2560 export, five pixels per cell, matches a one-pixel-per-cell render at every cell
centre (grain and isochrone lines off, since both are drawn per output pixel). A state-mutating export wrapper and
a state 24 steps later are both caught.

Two float32 tolerances were set after the first run, from the rounding bound, when guessed ones failed: the logistic
benchmark was first held to 2e-6 and read 4.1e-6, the GPU-twin density to 1e-5 and read 1.6e-5. Both readings are
inside the bound of 480 roundings recorded now. No other criterion moved after a run.

The (D, r) pairs of the straight-front test are exact rescalings of one another at the same number of cells per
decay length, so they agree to within 3e-5: they check that D and r enter the scheme where they should, and that
the lag scales as √(D/r), not an independent physical case.

## Limits

- Deterministic single-species model; no demographic noise, Allee effect, advection or genetic drift. The
  territory view is a map of first arrival, not a model of genetics.
- The circular coefficient 2 was not read in Gärtner (1982) or Ducrot (2015); it agrees with Bramson's 3/2 plus
  the curvature term. Its next correction and the effect of the founder radius are not known here, so the
  circular criterion is a band, not a prediction to 1e-4.
- Heterogeneous habitats (patchy, hostile islands) print no comparison; nothing in them is benchmarked beyond the
  scheme itself.
- One renderer (SwiftShader, float32); other GPUs, float16 (refused), and grids other than those listed are
  outside the evidence.
