# Hatano-Nelson skin effect: open clean chain

The `skin` tab draws rows of a directed-hopping chain. This validation covers the clean open chain at disorder 0, where the rows are the closed form, row-normalized `|psi|^2`; the tab does not diagonalize that case. The current right-eigenvector solver uses symmetric QL for disordered open chains and Francis QR with inverse iteration for periodic chains. Those paths remain outside this validation. Recipes before v8 retain subspace iteration with Gram-Schmidt, which gives an orthonormal basis rather than the right eigenvectors and is also excluded.

Reviewed 2026-09-29. Status in `validation/techniques.json` is **validated within stated limits**. The claim is the open clean chain, one row per eigenmode. On 2026-09-29 the default 4:5 sheet was printed again: it draws 96 rows for 96 modes, skin weight 0.780, the same modes as the new 1:1 fixture. Recipes before v8 still draw the old sheet height, and they are outside the claim. Disorder and periodic ends stay outside it.

## Operator

Sites `j = 1..N`, zero diagonal, open ends. The rightward hop, from `j` to `j+1`, has amplitude `e^{g}`. The leftward hop has amplitude `e^{-g}`. In components,

```
(Hv)_j = e^{g} v_{j-1} + e^{-g} v_{j+1}
```

with `v_0 = v_{N+1} = 0`. The displayed equation now states this component action directly. In conventional row-column matrix notation, `H_{j,j-1} = e^{g}` and `H_{j,j+1} = e^{-g}`. The earlier catalog indices reversed those two coefficients; the numerical operator and plate have not changed.

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

Two fixtures, both on this source: open chain, grid 96, `g = 0.08`, disorder 0, log view. Aspect `4:5` exports at 1920 by 2400 (111,595 bytes). Aspect `1:1` exports at 2400 by 2400 (128,100 bytes). Both fields are 96 by 96, and both report skin weight 0.779865. Float32 `amp` words, skin weight, IPR, cells, buffer size and settings are unchanged. Regenerate is deterministic. The reduced raster has luminance spread 226. Wrong dimensions are rejected. Mutating `amp[0]` and the skin weight after export is rejected.

The earlier print of this preset, from source `7a522072`, was 96 by 120 and skin weight 0.773. That was the sheet-height count: row 97 was float noise at `k = pi`, and rows 98 to 120 repeated modes 1 to 23. The default plate no longer draws those rows. `node tools/skin-rows.js` still measures them on a recipe from before v8, which the status line names, and which this claim does not cover.

## Limits

- Validated within stated limits: the open clean chain, one row per mode. The 4:5 and 1:1 prints are both 96 by 96 and agree on the skin weight.
- Recipes before v8 still draw the sheet height. At grid 96 and aspect 4:5 that is 120 rows, skin weight 0.773, including the wave-number-pi row and 23 repeated modes. The status line says so. They are not part of the claim.
- Open chain at disorder 0 only. Current disordered and periodic right-eigenvector paths, and legacy Gram-Schmidt paths, are excluded from this claim.
- Finite `N`, up to 96 for the tab comparison and 48 for the strict cosine and eigenvector tolerances.
- The probability length `1/(2|g|)` is a regression test forced by the closed form, not an independent prediction.
- No experiment, and no claim about the non-Hermitian skin effect in a laboratory sample.
- Right eigenvectors are not an orthonormal energy basis. The similarity that removes the skin is not unitary.
