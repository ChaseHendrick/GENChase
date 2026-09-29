# Hofstadter butterfly: Harper eigenvalues and TKNN Chern numbers

The `hofstadter` tab diagonalizes one real matrix at each coprime flux `α = p/q` and paints the eigenvalues. In the Chern view each eigenvalue is colored by an integer. This note checks that integer against the Diophantine equation of Thouless, Kohmoto, Nightingale and den Nijs, and against an independent lattice Chern number. It is not a laboratory quantum Hall measurement.

Run:

```sh
node tools/hofstadter-science.js --write
node tools/hofstadter-print-state.js --write
```

The second command needs Playwright and Chromium. Results: [hofstadter-science.json](results/hofstadter-science.json) and [hofstadter-print-state.json](results/hofstadter-print-state.json). Status: **validated within stated limits**, reviewed 2026-09-29. The claim is the default symmetric-QL plate: one phase, gap integers on the eigenvalues, not the filled bands and not a band Chern number.

## What the plate computes

The catalog equation is the Harper (almost Mathieu) operator at one phase,

`ψ_{n+1} + ψ_{n-1} + 2 cos(2π n α) ψ_n = E ψ_n`.

`harperEV` builds the `q` by `q` real matrix with that diagonal and with both neighbor hops added, including the corner, then a symmetric QL returns the eigenvalues. The picture is those `q` numbers at `α = p/q`, not the filled magnetic bands. The Bloch Hamiltonian that does fill the bands is

`(H ψ)_j = ψ_{j+1} + ψ_{j-1} + 2 cos(φ + 2π p j / q) ψ_j`,

with `ψ_{n+q} = exp(-i θ) ψ_n` and `θ, φ` each running over `[0, 2π)`. The wrap adds to the corner entry, so at `q = 2` the off-diagonal is `1 + exp(-i θ)`. This boundary sign is the one whose Fukui-Hatsugai-Suzuki Chern numbers agree with the TKNN integers below. The plate's matrix is that operator at `θ = φ = 0`. At `q = 1` that is energy `4`. At `q = 2` the edge is `±2√2`.

Recipes older than v8 keep the previous matrix and the capped Jacobi. Those are a failure control, not the plate:

- `q = 1`. The corner hop overwrites the diagonal. The legacy path returns `1`, not `4`.
- `q = 2`. The two x-hoppings should add. The legacy path stores `1` and returns `±√5` (about `±2.236`), not `±2√2`.

`jacobiCapped` stops after `min(60, 8 + q)` pivots. Against a Jacobi iteration run to an off-diagonal below `1e-14`, that legacy path is:

| q | max \|ΔE\| |
| --- | --- |
| ≤ 4 | 1.8e-15 |
| 5 | 5.9e-4 |
| 6 | 2.2e-2 |
| 7 | 0.143 |
| 8 | 0.087 |
| 12 | 0.316 |

The default plate does not use that cap. Against the same converged Jacobi, `harperEV` stays within `1.24e-14` for every coprime `p/q` with `q ≤ 12`. Through `q = 56` that is 965 matrices, and the largest error is `3.46e-14`. The slider cannot go below `Q = 8`, and sanitize's floor is 8, so every legal plate includes those denominators. On this solver they are the Harper eigenvalues. `α → 1 − α` on the plate through `q = 16` differs by at most `9.33e-15`. The same comparison on the legacy path is off by `0.317`, because the unconverged Jacobi amplifies a rounding difference in `cos`. The Bloch Hamiltonian itself matches `α → 1 − α` to `4e-15` on a 4 by 4 phase grid (`q = 2, 3, 4, 5, 7`).

`E → -E` holds for that Bloch Hamiltonian to `3e-15`, with the staggered map `φ → φ + π` and, when `q` is odd, `θ → θ + π`. It does not hold for the single phase the plate draws when `q` is odd: at `q = 3` the plate's three eigenvalues are about `-2, -0.732, 2.732`.

## Gap integers

For `r` bands filled, TKNN (Phys. Rev. Lett. 49, 405, 1982) says `r = q s_r + p t_r` with the Hall integer `t_r` chosen so that `|t_r| ≤ q/2`. On a tie the plate, and this check, keep the negative value. The plate's coloring loop is executed from the source, not retyped. For every coprime `p/q` with `2 ≤ q ≤ 24` and every eigenvalue index `r` (2914 eigenvalues), the painted integer equals `t_r`. Zero mismatches.

A wrong gap index uses `t_{r+1}` in the equation for `r`. All 2914 of those fail the predicate. The example that has to be quoted: at `α = 1/3` and `r = 1` (one band filled) the passing integer is `1` and the failing integer is `-1`.

The source comment says the Hall integer of the gap below this eigenvalue (`r` bands filled). The lowest eigenvalue is painted `0`. The middle eigenvalue at `1/3` is painted `1`, which is `t_1`, not the Chern number `-2` of that band and not `t_2 = -1`.

Neighbor pixels that only receive the `0.4` density smear have no Chern sample, so they are painted as Hall integer 0.

## Lattice Chern numbers

Fukui, Hatsugai and Suzuki (J. Phys. Soc. Jpn. 74, 1674, 2005) on the Bloch Hamiltonian above, two meshes (8 and 12 for `q ≤ 5`, 10 and 14 otherwise). A band is compared only when both neighboring gaps exceed `0.015`. Hermitian residuals on the symmetry grid are `5e-15`.

| α | gap integers t_r for r = 0 to q | band Chern numbers | compared bands |
| --- | --- | --- | --- |
| 1/3 | 0, 1, -1, 0 | 1, -2, 1 | all |
| 2/3 | 0, -1, 1, 0 | -1, 2, -1 | all |
| 1/5 | 0, 1, 2, -2, -1, 0 | 1, 1, -4, 1, 1 | all |
| 2/5 | 0, -2, 1, -1, 2, 0 | -2, 3, -2, 3, -2 | all |
| 3/5 | 0, 2, -1, 1, -2, 0 | 2, -3, 2, -3, 2 | all |
| 1/7 | 0, 1, 2, 3, -3, -2, -1, 0 | 1, 1, 1, -6, 1, 1, 1 | all |
| 2/7 | 0, -3, 1, -2, 2, -1, 3, 0 | -3, 4, -3, 4, -3, 4, -3 | all |
| 3/7 | 0, -2, 3, 1, -1, -3, 2, 0 | -2, 5, -2, -2, -2, 5, -2 | all |
| 1/4 | 0, 1, -2, -1, 0 | outer bands 1 and 1 | bands 0 and 3 only |

At `α = 1/4` the middle gap closes (minimum splitting about `1e-16`). `t_2 = -2` is the negative tie of `±q/2`, not an open-gap invariant. Abelian lattice Chern numbers split that touching pair as `-1, -1`. Those two numbers were not accepted. The outer bands match. Under `α → 1 - α` every compared band Chern number changes sign (`1/3` against `2/3`).

Failure control, same lowest band of `α = 1/3`: the passing Chern number is `1`. Reversing the Bloch phase on the wrap, `exp(-i θ)` to `exp(+i θ)`, returns `-1`, which fails the match to `t_1`. Dropping the Bloch phase entirely returns `0`, which also fails. Band count stays `q` in all three; the symmetry of the spectrum does not catch the sign error; the Diophantine match does.

## Paint

`tools/hofstadter-print-state.js` loads the module in Chromium (latest rerun: 154.0.8037.58, SwiftShader) and exports the real `exportPNG`. On the Chern view at `Q = 8` (124 eigenvalues), `Q = 12` (376) and the Chern preset `Q = 28` (4550), every recorded integer equals `t_r`, and every pixel of the 640 by 640 export matches the ramp `clamp(C / 8 + 0.5, 0, 1)` of the field. A 2400 by 2400 sheet is a PNG of that size, deterministic, and does not change the field. Shifting one Chern sample changes the export. The density view at `Q = 12` is checked for a nonblank sheet and an unchanged field, not for Chern colors.

The plate coloring was compared. It matches `t_r` on eigenvalue index `r`. It does not match the band Chern number. The Chern sheets were re-exported on this symmetric-QL source: at `Q = 8`, `Q = 12` and the preset `Q = 28` every recorded integer equals `t_r`.

## Outside this review

No edge states, no disorder, no interactions, no continuum Landau level, and no laboratory quantum Hall datum. The filled butterfly is not this plate. Recipes older than v8 are the failure control, not this label.
