# Hatano-Nelson skin effect: open clean chain

The `skin` tab draws every row of an open directed-hopping chain. On a clean open chain (on-site disorder below 0.04 and open ends) those rows are the closed form, row-normalized `|psi|^2`. The tab does not diagonalize that case. Disorder and periodic ends use subspace iteration with Gram-Schmidt. That path is not an eigensolver, and it is not part of this validation.

Reviewed 2026-09-27. Status in `validation/techniques.json` is **partially validated** (in-project contract check, 2026-09-27). The numerical evidence below holds for the domain it states, but the only print fixture is the default 4:5 sheet, which lies outside the 1:1 eigenvector domain, and the plate has a recorded defect on that sheet (see Print). Under the precedent of the tilings and Veselago records, a recorded plate defect keeps the status at partially validated. Promotion needs the plate to draw at most N rows and a 1:1 print fixture inside the numerical domain.

## Operator

Sites `j = 1..N`, zero diagonal, open ends. The rightward hop, from `j` to `j+1`, has amplitude `e^{g}`. The leftward hop has amplitude `e^{-g}`. In components,

```
(Hv)_j = e^{g} v_{j-1} + e^{-g} v_{j+1}
```

with `v_0 = v_{N+1} = 0`. The catalog line writes `H_{j,j+1} = e^{g}` for that rightward hop. The matrix element that multiplies `v_{j+1}` is the leftward hop `e^{-g}`.

The eigenvalues are exactly `2 cos(pi n / (N+1))` for `n = 1..N`, independent of `g`. The right eigenvectors are proportional to

```
psi_j = e^{g j} sin(pi n j / (N+1))
```

For `g > 0` the factor `e^{g j}` piles every mode on the right. The probability weight goes as `e^{2 g j}`. The amplitude length is `1/|g|`. The probability length is `1/(2|g|)`. This note measures the probability length.

## Independent benchmark

`node tools/skin-science.js --write` writes [results/skin-science.json](results/skin-science.json).

The reference is not `exactModes`. A diagonal similarity `S = diag(e^{g j})` turns the open chain into the Hermitian tight-binding matrix with unit off-diagonals and a zero diagonal. That matrix is diagonalized with an implicit-shift QL iteration (Wilkinson shift) written in `tools/skin-science.js`. The right eigenvector is `psi = S phi`, where `phi` is the QL vector. Residuals are then measured by applying the nonsymmetric chain above, not the sine formula.

For `N` in {12, 24, 32, 48} and `g` in {0, 0.02, 0.05, 0.08, 0.12, 0.15}:

- Maximum absolute eigenvalue error against `2 cos(pi n / (N+1))`: `2.83e-15` (required `< 1e-8`).
- Maximum absolute error of the sign-aligned right eigenvector against the closed form: `2.08e-14` (required `< 1e-6`).
- Maximum residual `||H psi - E psi||_inf`: `5.22e-15`.

## The tab against that spectrum

The harness is `tools/science-harness.js`:

```
load('skin', {capture:'amp,skinW,ipr,W,H'})
```

`makeRng` in the harness returns `() => 0.5` and has no `.gauss`. The clean open path does not call it. Every comparison stays at disorder 0 and `bc: 'open'`.

Aspect `1:1` draws one row per site, so every row is an eigenmode. Grids 48, 64 and 96, and `g` in {0, 0.02, 0.08, 0.12, 0.15}, were compared to the ED probabilities `|psi|^2` after the same normalization. Maximum absolute error: `2.64e-8` (required `< 1e-6`). That is the tab against the eigensolver, not the formula against itself.

### Probability length

For a normalized ED eigenvector, `sin(pi n j / (N+1))` has the same magnitude at the sine-conjugate sites `j` and `N+1-j`. The median of

```
g_hat = ln(p_{N+1-j} / p_j) / (2 (N+1 - 2j))
```

over pairs with both probabilities above `1e-18` is the measured asymmetry. The probability length is `1/(2 |g_hat|)`. It is required to match `1/(2|g|)` within 1 percent. This is a regression test, not a prediction: once the right eigenvectors match `e^{g j} sin(pi n j / (N+1))`, the ratio `p_{N+1-j} / p_j` is `e^{2 g (N+1-2j)}` by the closed form, so the length is forced.

Checked at `N` in {48, 64} and `g` in {0.03, 0.08, 0.12}, modes `n = 1, 2, 3` and `n = round(N/8)`. The largest relative error is about `3e-13`. The case called out in the task, `N = 64`, `g = 0.08`, has probability length `6.25` sites.

The mean distance from the rightmost site, `sum_j (N-j) |psi_j|^2` with `j` starting at 1, is a different number. The open-chain node at `j = N+1` pushes low modes inward. At `N = 64`, `g = 0.08`, mode `n = 1` sits `14.41` sites in from the right end, while mode `n = 8` sits `5.762` sites in, next to the pure discrete exponential mean `1/(e^{2g}-1) = 5.764`. The acceptance test is the log-slope length `1/(2|g|)`, not that mean.

### Right-tenth weight

The right tenth is the tab's cut: sites with 0-based index `j >= floor(0.9 N)`. The left tenth is the same count of sites at the other end. The predicate **piles on the right** is: mean right-tenth weight `> 0.45` and greater than the left tenth.

On the real module, grid 96, aspect `1:1`:

| g | Right tenth | Left tenth | Piles on the right |
|---|---|---|---|
| +0.08 | 0.7799 | 8.47e-7 | yes |
| -0.08 | 8.47e-7 | 0.7799 | no |
| 0 | 0.1042 | 0.1042 | no |

`g = 0` is the Hermitian chain. Its right tenth is the site fraction `10/96`, near 0.1, and it is not above 0.45.

## Failure controls

All three are asserted inside `tools/skin-science.js`. A control that still satisfied the predicate would fail the tool.

- `g -> -g` on the real module moves the pile to the left tenth. The right-pile predicate fails.
- `g = 0` on the real module removes the pile. The right-pile predicate fails.
- `replaceOnce` of `Math.exp(gg * j)` by `Math.exp(-gg * j)`, with `g = 0.08` and grid 64, is the same module with the envelope reversed. Its rows miss the ED probabilities by max abs `0.274`, so the `< 1e-6` match fails. A sign-flipped analytic envelope also fails the positive probability-length predicate.

## Print

`node tools/skin-print-state.js --write` writes [results/skin-print-state.json](results/skin-print-state.json).

One fixture: open chain, grid 96, aspect `4:5` (120 rows), `g = 0.08`, disorder 0, log view. `exportPNG` at longest edge 2400 is 1920 by 2400 pixels (118,079 bytes). Float32 `amp` words, skin weight, IPR, cells, buffer size and settings are unchanged. Regenerate is deterministic. The reduced raster has luminance spread 226. Wrong dimensions are rejected. Mutating `amp[0]` and the skin weight after export is rejected by the same predicate the real export passes (1 word changed, skin weight changed). The fixture's skin weight is 0.773.

That sheet has more rows than sites. Rows past `n = N` continue the sine formula and are not eigenpairs. They are inside the print-state check and outside the eigenvector comparison, which uses aspect `1:1`.

This is a plate defect. At grid 96 and aspect `4:5` the plate draws 120 rows for 96 modes. Row 97 has `k = pi`, where `sin(pi (j+1))` is float noise; the row normalization turns that noise, times `e^{2 g j}`, into a skin-shaped row (right-tenth weight 0.868). Rows 98 to 120 have `k = pi + pi m / 97`, so their `|psi|^2` rows are bit-exact repeats of modes 1 to 23. The status-line skin weight averages all 120 rows: 0.773 on this sheet, against 0.780 over the 96 modes at `1:1`. The print check therefore preserves a sheet outside the numerical domain, and no print fixture lies inside it.

## Limits

- Partially validated: the only print fixture is the default 4:5 sheet, outside the 1:1 eigenvector domain, and on that sheet the plate draws 24 rows past `n = N` (float noise at `k = pi` and repeats of modes 1 to 23) that the skin weight averages in.
- Open chain, disorder below 0.04, only. Periodic ends and disordered subspace iteration are excluded.
- Finite `N`, up to 96 for the tab comparison and 48 for the strict cosine and eigenvector tolerances.
- The probability length `1/(2|g|)` is a regression test forced by the closed form, not an independent prediction.
- No experiment, and no claim about the non-Hermitian skin effect in a laboratory sample.
- Right eigenvectors are not an orthonormal energy basis. The similarity that removes the skin is not unitary.
