# Rice-Mele pump: independent numerical benchmark

**Status: unvalidated.** The numbers below are from an independent solver. `tools/thouless-science.js` never executes `src/modules/thouless.js`. A test that does not run the module does not validate the plate. The Rice-Mele evidence is recorded. It is not a measurement of the Thouless plate.

`src/modules/thouless.js` draws a cartoon density. `pol()` keeps only the real part of the overlap, so that sum is not a Berry phase. The status line names the chosen cycle and says pumping is not measured. An unused metric is hardcoded to 1 or 0. The plate does not compute ΔP. This review does not execute the plate and does not change the painted field.

The plate's "trivial" setting is not the offset cycle below. The cartoon trivial loop still encircles the Rice-Mele degeneracy (`validation/COMPARISON-AUDIT.md`). It was left as drawn.

## Model

The solver is the two-band Rice-Mele Hamiltonian, written here and not taken from the module:

```
H(k) = (v + w cos k) σ_x + (w sin k) σ_y + δ σ_z
```

The gap closes at `v = w` and `δ = 0`, the origin of the `(v − w, δ)` plane. The occupied-band Chern number on the `(k, φ)` torus is the Fukui-Hatsugai-Suzuki lattice sum. The same integer is the skyrmion number of the `d` vector for the lower band, with the minus sign that band carries, and it equals the winding of `(v − w, δ)` about the origin for the two loops below.

The pumped charge is the many-body Resta center of mass of the filled band on a periodic ring: `P = arg det(<m|exp(i 2π X/L)|n>) / 2π`, with `L = N` unit cells and the B site half a cell past A. Each time step freezes `H` at the midpoint of that step and applies `exp(−i H Δt)` from a Jacobi diagonalization. The phase of the determinant is tracked in slices of at most 0.05 so a branch cut is visible. The bond current is the cross-check. A frozen insulator must not pump. There is no sampling error. The remaining error is truncation in time, mesh, and ring size.

Run `node tools/thouless-science.js --write`. The artifact is [results/thouless-science.json](results/thouless-science.json).

## Domain of this solver

| | |
|---|---|
| Ring | N = 16 unit cells, 32 sites |
| Chern mesh | 32 k points by 32 time steps; repeated on 16 by 16 |
| Curvature mesh | 96 by 96 |
| Enclosing gap | 1.6, at φ = π/2, where v = w and \|δ\| = 0.8 |
| Offset gap | 1.2 |
| Passing step | Δt = 0.5 on period T = 40 (80 steps) |
| Failing step | Δt = 0.05 on period T = 4 (80 steps); Δt = 0.025 does not restore an integer |
| Integer predicate | distance to the nearest integer < 0.02 |
| \|C\| = 1 predicate | that test, and the rounded absolute value is 1 |
| Precision | Float64 |

## What was measured

| Cycle | Chern / center of mass | Predicate |
|---|---|---|
| Enclosing, `(v, w, δ) = (1 + 0.5 cos φ, 1 − 0.5 cos φ, 0.8 sin φ)`. Plane winding +1. | Fukui-Hatsugai-Suzuki Chern number **+1** (residual 2.4e-15). Coarse mesh +1. Curvature integral 1 − 6.8e-11. Reversed φ gives −1. Ring center of mass **1.000475**. Bond current **0.999025**. | Passes both predicates |
| Offset, `(v, w, δ) = (1.5 + 0.2 cos φ, 0.5 − 0.2 cos φ, 0.4 sin φ)`. The loop sits at `v − w = 1` with radius 0.4 and misses the origin. Winding 0. | Chern number **0** (about 1e-16). Center of mass **−0.000198**. Bond current **−0.000372**. | Integer predicate passes (the charge is 0). The \|C\| = 1 predicate **fails**, which is required. |
| Same enclosing loop, period 4 instead of 40. Step Δt = 0.05. | Center of mass **0.827374** (0.173 from the nearest integer). Bond current **0.766187**. Resta modulus stays above 0.395. | Integer predicate **fails** |
| Same fast loop, step halved to Δt = 0.025 | Center of mass **0.827234** | Still fails. The miss is the speed of the cycle, not a coarse step. |
| Imaginary part of the spinor dropped before the link, which is what `pol()` does | Chern number **0** | Does not reproduce +1 |
| Hamiltonian frozen at φ = 0 for time 40 | Center of mass **0**. Current about 1e-15. | A stationary insulator does not pump |

The real-space matrix applied to the Bloch spinor has residual 2.3e-15, so the ring Hamiltonian is the same Rice-Mele model as the Chern sum.

The failing step is smaller than the passing step because the failing period is ten times shorter. Eighty steps on period 4 are Δt = 0.05; eighty steps on period 40 are Δt = 0.5. Halving 0.05 again leaves the charge at 0.827, so the integer predicate is failing on a resolved diabatic trajectory.

On that fast trajectory the center of mass and the bond current differ by 0.061. The filled band is no longer the instantaneous ground state, and the two observables do not have to agree once the Resta modulus drops. Both are far from every integer. On the slow trajectory they agree to 0.0015.

## What this does not say

The plate does not compute ΔP. Nothing here certifies a pixel, a preset, or the cartoon labels "Chern 1" and "Chern 0". The catalog equation remains a description of Thouless's invariant, not a claim that the drawing evaluates it.
