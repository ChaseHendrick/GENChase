# Closed forms: Crapper, Airy, hydrogen orbitals

These are precision checks of exact formulas the plates evaluate. They are not confirmed predictions, and they are not print audits. `node tools/closed-forms-science.js --write` writes [validation/results/closed-forms-science.json](results/closed-forms-science.json). `crapper` is **unvalidated**. `airy` and `orbitals` are **partially validated**. Print was not run. No module source was edited, so the source fingerprints are unchanged. The comparison below was made inside the project on 2026-09-27. There is no outside review.

## Crapper

The plate draws the catalog map (minus sign in the denominator):

```
X = phi - (2/pi) A sin(2 pi phi) / (1+A^2-2A cos 2 pi phi)
Y = -(2/pi) A (cos 2 pi phi - A) / (1+A^2-2A cos 2 pi phi)
s = 4|A| / (pi (1-A^2))
```

`posSurf` comes back to the same point one period later: over A in {0.05, 0.2, 0.36, 0.45, 0.458} and 65 sample phases, the largest |Delta x - 1| or |Delta y| is 1.39e-15.

Crest and trough of that map sit at phi = 1/2 and phi = 0. Their height, divided by the period in x, matches both `4|A|/(pi(1-A^2))` and the module's own `sOfA`. The largest absolute difference on the same amplitudes is 2.22e-16. That is a precision check of an algebraic identity of the implemented map, not a derivation of the wave height from Euler's equations.

The classical Crapper profile is a different curve. In complex form, before period-1 scaling,

```
z_A(alpha) = alpha + 4i / (1 + A exp(-i alpha)) - 4i
```

the denominator carries a plus. The trough touches when `f = f' = 0` for `f(alpha) = alpha (1+A^2+2A cos alpha) - 4A sin alpha`. Newton was started at (A, alpha) = (0.45, 2.08). The value 0.730 was not an input.

| Quantity | Value |
|---|---|
| A | 0.4546700164520109 |
| alpha | 2.0815759778181007 |
| residual of (f, f') | 2.22e-16 |
| steepness (ymax - ymin) / (2 pi) | 0.7297642257877295 |
| same A in 4\|A\|/(pi(1-A^2)) | 0.7297642257877293 |
| distance from 0.730 | 2.36e-4, inside 0.001 |

At that A the touch is tangent: `f` has no sign change on (0, pi), and the smallest |X| on phi in [0.05, 0.45] is 1.81e-10. At A = 0.30 the classical profile is still separated (no sign change, and |X| stays above 0.014 on that interval). At A = 0.46, X crosses zero and the two sides meet with gap 0.

The implemented map is not that profile. At A = 0.2 the pointwise distance over one period reaches 0.05305, at phi = 0. The catalog derivative `X_phi` at the trough is `1 - 4A/(1-A)^2`, which vanishes at `A = 3 - 2*sqrt(2) = 0.1715728752538097`. The steepness formula there is 0.22507907903927624. That is the Constantin-Martin diffeomorphism boundary, not the classical bubble. At A = 0.15 the catalog map does not cross the symmetry line away from the trough. At A = 0.30 it does, at phi = 0.20057389107975282, with gap 5.55e-17. The plate was not retuned. The disagreement is the limitation.

The schema and `sanitize` clamp A at 0.458. The steepness formula there is 0.7379361500725158, past 0.730, so the clamp is not the limiting wave. The module constant `A_STAR = 0.4546846682104742` is the algebraic inverse of the hardcoded `S_STAR = 0.7298`. It is not the geometric solve above.

Failure controls, all caught:

- The wrong height `4|A|/(pi(1-A))` misses the profile by at least 0.00319 on the amplitudes above.
- Changing `(cos - A)` to `(cos + A)` in a mutated copy of the surface map misses the steepness identity by 0.0442 at A = 0.2.
- Flipping the sign of the linear phi term makes one-period closure miss by Delta x = 2.

Interior streamlines, curvature, and the dual Euler reading were not checked.

## Airy

`ai(z)` is real-argument only. On -10 <= z <= 8 it is an 80-step RK4 of `y'' = x y`, started from the constants written in the module. For z > 8 it returns the one-term decaying asymptotic, with the exponential clipped at `exp(-40)`. For z < -10 it returns the leading oscillatory term.

The reference is a second implementation in the tool, not an import of `ai`. Lanczos gamma gives `Ai(0) = 0.35502805388781744` and `Ai'(0) = -0.25881940379280677`. The Airy power series built from those values agrees with an independent 2000-step RK4 to 3.50e-12 on [-5, 4].

Against that series, the module on [-4, 4] at steps of 0.05 has maximum absolute error 7.23e-7, at z = -4. Outside that interval the bridge is not that accurate:

| z | Module | Independent series |
|---|---|---|
| 6 | -1.200e-4 | +9.948e-6 |
| 8 | -0.07551 | 4.74e-8 |
| -10 | 0.04077 | 0.04024 |

z = 8 is still on the RK4 branch; the switch is `z > 8`. The bridge has the wrong sign at arguments 6 to 8. At span 14 the plate coordinate `xx` reaches `span * 0.48`, about 6.72, so those arguments are on the sheet, not only in this table. At z = 9, 12, and 15 the module equals its own one-term asymptotic. A two-term factor `(1 - 5/(72 zeta))` differs from that one-term value by 0.387%, 0.251%, and 0.180%.

The pixel map in `compute()` is `W = grid`, `H = round(grid * aspect)`, `zMax = sqrt(2 L)` with `L = span`, `z = zMax * y / (H-1)`, `xx = L * (x/(W-1) - 0.52)`, argument `xx - z^2/4`, and amplitude `ai(argument) * exp(max(-18, a*xx - a*z^2/2))`. The stored metric is the mean of `|peak x - z^2/4|` on rows with `y` in `(0.25 H, 0.9 H)`, using intensity equal to amplitude squared.

On three states (span 12, 10, 14) those peaks match the same real formula evaluated with the independent series. The maximum peak-position difference is 0. The mean offsets are 0.938, 0.892, and 0.951. They are not zero. The maximum of real Ai sits near argument -1.02, so the intensity peak does not lie on the catalog line `x_peak = z^2/4`. That line is where the Airy argument is zero. The status text calls an offset under 1.5 "accelerating" and marks the comparison as construction. This check does not claim the peak is exactly on `z^2/4`.

The plate multiplies real `Ai(xi)` by `exp(a x - a z^2/2)`. That is not the finite-energy factor `Ai(xi + i a)` named in the credit. An independent complex series at a = 0.08 gives `|Ai(xi + i a)| / |Ai(xi)|` equal to 1.0297, 1.0032, 1.0017, 1.0012, and 1.0010 at xi = -2, -1, 0, 1, 2. The imaginary phase is used only when the drawing mode is phase.

Failure controls move the tracked peak coordinate. A wrong caustic can leave the mean offset almost unchanged, so the scalar metric alone is not the control. Both controls were caught:

- Replacing the caustic `z^2/4` by `z^2/2` shifts peaks by up to 12.23.
- Flipping the argument to `xx + z^2/4` shifts peaks by up to 11.70.

A sign flip that touches only the complex phase would not move `|psi|^2`, so it is not used.

## Hydrogen orbitals

The Laguerre helpers live in `src/modules/dynamics.js`, which registers many ids. The tool hooks only `laguerre`, `orbital`, and `evalPoly`. No other id in that file is treated as validated.

For every `n = 1..6` and `l = 0..n-1`, the module polynomial `laguerre(n-l-1, 2l+1)` was compared with an independent float64 series for `L_k^{(alpha)}` on `rho = 0, 0.25, ..., 2`. The largest absolute error is 3.378e-7, at n = 6, l = 1, k = 4, alpha = 3. The coefficients are stored in a `Float32Array`. Absolute error 1e-8 is not met. The tool requires the error to be under 1e-6 and also above 1e-8, so the stricter bar is not claimed by silence.

`orbital(n, l, 0).radialNodes` equals `n - l - 1` for all 21 of those states. The count `n - (l+1) - 1` matches none of them.

The radial norm was not taken from the printed constant. Simpson's rule, 8192 panels, from 0 to `4 n^2 + 30`, was applied to `R(r)^2 r^2` built from the module's own coefficients and norm. The worst `|integral - 1|` is 3.653e-7, at n = 6, l = 0, where the integral is 1.000000365. The measure is `integral_0^inf R(r)^2 r^2 dr` in atomic units (`a0 = 1`). The angular factor `anorm`, including the extra square root of 2 for real orbitals with `m > 0`, was not folded in. A full 3D integral of `|psi|^2` was not done, and the shader ray integral was not checked. States with `n > 6` were not checked.

Failure controls, all caught:

- Comparing the module polynomial with `L_{k+1}^{(alpha)}` misses by at least 1 on every state.
- Comparing it with `L_k^{(alpha+1)}` misses by more than 0.01 on all 15 states with `k >= 1`. For `k = 0` the polynomial is 1 for every alpha, so an alpha shift is not a control there.
- The node formula with `l` replaced by `l+1` matches 0 of 21 states.

## Status

`crapper` is unvalidated. The checks are closure of a periodic parametrisation and the height against Crapper's steepness formula. The same tool shows the plate draws a different curve: denominator `1+A^2-2A cos` is Crapper's map with the sign of the x-perturbation flipped. It overturns at the trough at `A = 3-2*sqrt(2)` and self-touches near `A = 0.30`, not at Crapper's `A ≈ 0.4547`. `airy` and `orbitals` stay partially validated. The Airy record includes the two module defects above (RK4 sign on arguments 6 to 8, and real `Ai` times the exponential instead of `Ai(xi + i a)`). Each `print` list is empty. A full "validated within stated limits" label would need a real print run, a reviewed domain, and a review date on the record. Those were not added.
