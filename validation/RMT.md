# Random-matrix numerical and print review

This review covers the Random Matrices tab (`src/modules/rmt.js`) and its tool,
[`tools/rmt-science.js`](../tools/rmt-science.js). The measured values are in
[rmt-science.json](results/rmt-science.json). The tool loads the module's own functions in Node with
`new Function` and a hook: the Dumitriu-Edelman sampler `betaHermite`, the QL solver `tqli`, the
Householder reduction `tred`, the unfolding rule `unfolded`, and `create()` run against a stub host. It
compares them with references in [`tools/lib/rmt-reference.js`](../tools/lib/rmt-reference.js) that are
written from the mathematics and do not read the module. Every draw uses the engine's `makeRng` with the
seed recorded in the results file.

```sh
node tools/build.js
node tools/rmt-science.js --write
```

The recorded run took 569 s on a four-core machine shared with other jobs. Without that load, the
numerical sections took about 3 minutes and the prints about 1.5 minutes. The sample sizes are the
smallest that keep the wrong-rule controls far outside their thresholds. They also separate the exact
spacing law from the Wigner surmise at beta = 1, a difference of 0.012 in CV.

## What the tab samples

The tab builds the tridiagonal with N(0, 2) on the diagonal and chi with beta (n - i) degrees of freedom
below it, for i = 1..n-1. That is the Dumitriu-Edelman model (J. Math. Phys. 43, 5830, 2002)
without its overall factor 1/sqrt(2). Its eigenvalue density is proportional to
prod |l_i - l_j|^beta exp(-sum l_i^2 / 4), and the spectrum edge is 2 sqrt(beta n), which matches the tab's
hint. The displayed equation and the comment above `betaHermite` write exp(-sum l^2 / 2). That is a factor
sqrt(2) in scale, not a different ensemble. The tests below use the scaling the code actually has. The
module was not changed.

## Eigenvalues

For 60 tridiagonals (n = 24, 150 and 400; beta = 0.05, 1, 2 and 20; five of each), the module's `tqli`
output is sorted and matches Sturm-sequence bisection on the same matrix entries. The tolerance is
4 n eps ||T||, with ||T|| the Gershgorin norm. The worst error is 0.068 of that tolerance. As a control, a
QL that deflates when |e| <= 1e-4 (|d_m| + |d_m+1|) misses by 9.1e7 times the tolerance, so the
comparison does catch a solver that stops too early.

## Exact moments

Counting closed walks of length two and four on the tridiagonal, with E a^2 = 2, E a^4 = 12, E b^2 = k and
E b^4 = k (k + 2) for k = beta (n - i), gives:

- E Tr H^2 = 2n + beta n (n - 1)
- E Tr H^4 = 12n + 10 beta n (n - 1) + beta^2 n (n - 1)(2n - 3)

At beta = 1 the second formula is 2n^3 + 5n^2 + 5n, the GOE value for this normalization. The tool
computes Tr H^2 and Tr H^4 as sums of the module's eigenvalues, so the check covers the sampler and the
solver together. It uses 25 ensembles: n = 24, 50, 100, 200 and 400 crossed with beta = 0.1, 1, 2, 4
and 12, with 2000 matrices per ensemble (1000 at n = 400). That makes 50 tests. Each one is a z-score of
the sample mean against the exact value, with the standard error sd / sqrt(M) over independent matrices.
The family threshold is Bonferroni at alpha = 0.001, which gives |z| < 4.265.

All 50 tests pass. The largest deviations are z = 3.02 (Tr H^2) and 3.58 (Tr H^4) at n = 100,
beta = 0.1. The two share one sample, and the other four beta = 0.1 ensembles fall between -0.58 and 1.31.
Separate draws of 2 to 8 million from the module's gamma sampler, run during this review and not
registered, showed no persistent bias at a = 0.025 or 1.5. At n = 400, beta = 1, the standard error of
the mean of Tr H^2 is 1.6e-4 of its value.

The sample sizes are enough to detect the wrong degrees-of-freedom rules by a wide margin. With
beta (n - i + 1), where the chi index is off by one, E Tr H^2 grows by 2 beta n. Over the ten runs at
beta = 1 and 2, the smallest |z| is 31, against the threshold of 4.265. With beta n for every entry, the
spectrum widens by sqrt(2), and z for Tr H^2 runs from 263 to 1556. The semicircle KS test also
fails for that rule, with D = 0.15 to 0.18 against 0.073 at n = 24 and 100 with 1000 matrices.

## Semicircle

The tool scales every eigenvalue by x = l / (2 sqrt(beta n)) and compares with the semicircle
F(x) = 1/2 + (x sqrt(1 - x^2) + asin x) / pi.

- **Convergence.** The Kolmogorov distance of each single spectrum from the semicircle, averaged over the
  ensemble, falls monotonically with n at every beta >= 1. At beta = 1 it goes from 0.0770 at n = 24 to
  0.0074 at n = 400, and at beta = 12 from 0.0401 to 0.0032. The standard errors are below 0.001.
  n D rises slowly, from 1.9 to 3.0 at beta = 1. That is the log n / n rate expected of a rigid spectrum,
  not the 1/sqrt(n) of independent points. The log-log slopes are in the results file.
- **Formal test.** Eigenvalues within one matrix are not independent, so the classical KS critical value
  does not apply to a pooled spectrum. The test instead takes one eigenvalue per matrix, at an index drawn
  uniformly from a separate seeded stream. Those draws are independent samples of the one-point density.
  They are compared with the Kolmogorov critical value, with Stephens' finite-sample correction, at
  alpha = 0.001 / 20 per test. All 20 pairs with beta >= 1 pass (for example, D = 0.0251 against 0.0725 at
  n = 400, beta = 1).
- At beta = 0.1, beta n runs from 2.4 to 40, and the density is not yet semicircular (the semicircle needs
  beta n >> 1). Those distances are recorded but not tested.

## Spacings against the exact Gaudin-Mehta law

The large-n bulk spacing law at beta = 2 is the Fredholm determinant of the sine kernel on (0, s). At
beta = 1 it is the determinant of the even part, S(x - y) + S(x + y) on (0, s/2) (Gaudin 1961; Mehta,
Random Matrices). The tool evaluates both by Gauss-Legendre Nystrom discretization (Bornemann,
Math. Comp. 79, 871, 2010) with 30 nodes. Going from 30 to 40 nodes changes E(0; s) by less than 1e-15.
The CDF is F(s) = 1 + E'(s), and the variance is 2 int E ds - 1. The exact values are:

| beta | exact variance | exact CV | Wigner surmise CV | sup \|F_exact - F_surmise\| |
|---|---|---|---|---|
| 1 | 0.28553 | 0.53435 | 0.52272 | 0.0066 |
| 2 | 0.17999 | 0.42426 | 0.42202 | 0.0016 |

The test statistic comes from the module's `unfolded()`. It keeps the central 60 percent of each spectrum
and divides each gap by the mean of the 24 gaps around it. Matrices are independent but spacings within
a matrix are not, so every error bar and critical value comes from a bootstrap over whole matrices. The
KS critical value is the 99th percentile of sup |F*_boot - F_hat|, from 2000 replicates at n = 400 and
1000 at n = 150. The CV error is the bootstrap standard deviation. The CV threshold is Bonferroni over
four comparisons at alpha = 0.001, which gives |z| < 3.662.

| n | beta | matrices | spacings | CV | vs Gaudin-Mehta | vs surmise | KS exact | KS surmise | KS critical |
|---|---|---|---|---|---|---|---|---|---|
| 400 | 1 | 3000 | 720,000 | 0.5344 +/- 0.0005 | 0.1 sigma | 25.0 sigma | 0.0006 | 0.0066 | 0.0013 |
| 400 | 2 | 3000 | 720,000 | 0.4240 +/- 0.0004 | -0.7 sigma | 5.7 sigma | 0.0007 | 0.0019 | 0.0013 |
| 150 | 1 | 2000 | 180,000 | 0.5343 +/- 0.0009 | -0.1 sigma | 12.8 sigma | **0.0043** | 0.0082 | 0.0027 |
| 150 | 2 | 2000 | 180,000 | 0.4232 +/- 0.0007 | -1.6 sigma | 1.8 sigma | **0.0044** | 0.0049 | 0.0025 |

At n = 400 the unfolded spacings agree with Gaudin-Mehta in both distribution and CV. At beta = 1 the
Wigner surmise is rejected by both statistics, and at beta = 2 by the CV. The test can therefore tell the
exact law from its approximation.

At n = 150, the tab's default size, the CV still agrees with Gaudin-Mehta, but the distribution misses
by about 1.7 times the critical value. The cause is the local unfolding. The mean unfolded spacing at
n = 150 is 0.9960 +/- 0.0002 (beta = 1) and 0.9959 +/- 0.0001 (beta = 2), where it should be 1. That is a
0.4 percent scale bias. A window of 24 gaps spans 16 percent of a 150-level spectrum, and averaging the
convex mean-spacing profile over that window overestimates the local mean spacing. The CV is scale-free
and does not see this bias, but the KS distance does. At n = 400 the window is 6 percent of the spectrum,
the bias falls to 0.02 percent (mean 1.00024 +/- 0.00006 and 0.99982 +/- 0.00004), and the KS distance
falls below the critical value. This is a limitation of the finite-n unfolding, not of the sampler. It is
reported here as a disagreement, and the spacing distribution claim is limited to n = 400.

**Failure control, no unfolding.** Dividing all gaps across the whole spectrum by one global mean
spacing gives KS distances of 0.044 (beta = 1) and 0.059 (beta = 2), more than 30 times the critical
value. The CV deviations are 176 and 256 sigma. The control fails as it must. A milder variant removes
the unfolding but keeps the tab's central 60 percent window. At n = 400 it is also detected: the CV is
0.5363 and 0.4261, which is 4.1 and 5.1 sigma from Gaudin-Mehta, and the KS distances are 0.00132 and
0.00161 against critical values of 0.00129 and 0.00134. At n = 150 the same variant is not detected
(1.5 and 1.2 sigma; KS below critical). The density varies by only 9 percent across that window, so the
window restriction already does most of the unfolding. This milder variant is reported as a sensitivity
measurement, not asserted.

## The spacing spread the status line prints

The status line in rows mode prints the pooled CV of the unfolded spacings, with no error bar, next to
the Wigner surmise. For the two presets that print it, at their default seed `dyson-1962`, the tool
recomputes the printed value from the module's spectra (it matches to three decimals). It then
bootstraps it over whole rows:

| preset | printed | error (row bootstrap) | vs Gaudin-Mehta | vs surmise printed beside it |
|---|---|---|---|---|
| GUE (n 140, 180 rows, beta 2) | 0.428 | 0.003 | 1.4 sigma | 2.2 sigma |
| GOE comb (n 260, 260 rows, beta 1) | 0.535 | 0.002 | 0.5 sigma | 6.6 sigma |

The printed number agrees with the exact law. At beta = 1 it disagrees with the surmise the status line
quotes beside it, and the tab's own sample of 40,000 spacings resolves that difference. The status line
prints the bare CV and the surmise, with no error bar. `tools/lint.js` flags this span as a hand-built
comparison. This review does not change the module. The recommended fix is to print the CV through the
shared `compare()` with the row bootstrap error, against 0.534 (beta 1) and 0.424 (beta 2).

## Dyson paths

Dyson mode evolves a GOE matrix as an exact Ornstein-Uhlenbeck process, H(t + d) = e^{-d/2} H(t) +
sqrt(1 - e^{-d}) G, and diagonalizes each slice with `tred` + `tqli`. The tool ran 48 seeds of
24 paths, 480 slices and span 24 through the module's `create()`:

- For four seeds (1920 slices), the tool rebuilt the matrices independently from the ensemble definition
  and diagonalized them by cyclic Jacobi rotations. The worst eigenvalue difference is 0.087 of
  8 n eps ||H||_F.
- Stationarity: the time-averaged Tr H^2 / (n^2 + n) is 1.0045 +/- 0.0034. The error is the standard error
  across the 48 independent seeds.
- The trace is an exact OU process with variance 2n, so its autocorrelation is exactly e^{-t/2}. With
  the known mean and variance, the lag-product estimator is unbiased. At lags 0.5, 1, 2 and 4, all four
  values agree with e^{-t/2} within the Bonferroni threshold. At lag 1 the estimate is 0.619 +/- 0.053,
  against 0.607.
- Control: replacing e^{-d/2} by e^{-d} breaks both the decay and the stationary variance. It is detected
  at |z| = 24.

## Actual prints

Five recipes run through a temporary copy of `dist/studio.html` with an `auditRead()` hook: the GUE,
GOE comb, beta sweep, crystal (with palette offset 3) and Dyson presets, with grain off. They cover rows,
sweep and Dyson modes, spacing, position and row inks, global and per-row scales, and the 1:1, 4:5, 5:4
and 3:2 aspects at 2400 px on the long side. For each one:

- The studio's spectra agree with the Node run of the module and with the independent Sturm (or Jacobi)
  eigenvalues within the solver tolerance. Chromium and Node round a few library functions differently
  in the last bit, so the comparison uses that tolerance rather than bit equality.
- In rows mode, the printed spread equals the Node run's.
- Every SVG tick rectangle (x, y, width, height and fill) and every Dyson polyline vertex matches
  geometry rebuilt from the independent eigenvalues within 0.00501 px, the file's rounding. That is
  76,800 to 270,400 coordinates per print.
- The fallback PNG (`exportPNG`) matches an independent painting exactly (maximum channel error 0).
- The same painting displaced by one pixel fails on millions of channels.
- Exporting leaves the recipe and spectra unchanged.

The shell prints through its vector RIP, which draws the SVG at print size. That raster is recorded
against the same painting but is not a pass criterion. The mean channel difference is 0.11 to 0.16
levels, and 0.02 to 0.4 percent of channels differ by more than two levels. Two causes are known. First,
SVG group opacity composites overlapping ticks once, where the canvas applies alpha to each tick. Second,
the Dyson polylines have round caps on screen but butt caps in the SVG. The SVG omits
`stroke-linecap="round"`, which puts the largest local difference, 173 levels, at the two ends of each
path. Both are cosmetic and do not move any mark.

## Domain and limits

- **Domain.** The sampler, solver and exact moments cover n = 24 to 400 and beta = 0.1 to 12. The
  eigenvalue check covers n = 24 to 400 and beta = 0.05 to 20. The semicircle covers beta = 1 to 12. The
  spacing law holds at beta = 1 and 2 with n = 400; at n = 150 only the CV agrees. The printed spread is
  checked for the two presets. Dyson mode is covered at 24 paths, 480 slices and span 24. The prints are
  the five recipes above. The tab also allows beta down to 0.02 in sweeps and up to 24. Those values sit
  outside the tested range.
- The results are finite samples from one seeded pseudorandom generator. The error bars assume
  independent draws, which these tests cannot prove.
- The spacing law is a large-n limit. The local unfolding biases the scale at n = 150, as described
  above.
- The beta = 4 spacing law, higher moments, edge (Tracy-Widom) statistics and the sweep plate's printed
  spread are not tested.
- The displayed equation's Gaussian weight (exp(-sum l^2 / 2)) does not match the code's normalization
  (exp(-sum l^2 / 4)). The status line compares with the surmise, not the exact law, and prints no error
  bar. The SVG Dyson paths lack round caps. None of these was changed here.

## Changed after this review (2026-09-24)

Three of the findings above were fixed in `src/modules/rmt.js` when this review was merged. None moves a
sample, an eigenvalue or a mark, and `tools/rmt-science.js --write` was rerun on the changed module:

- The displayed equation now gives the weight the code samples, exp(-sum l_i^2 / 4), and the Dyson
  equation at beta = 1 with its drift, dl_i = sqrt(2) dB_i + (sum_{j != i} 1/(l_i - l_j) - l_i/2) dt.
  The comment above `betaHermite` says the same.
- The status line compares the unfolded spacing spread with the exact Gaudin-Mehta CV computed above,
  0.53435 at beta = 1 and 0.42426 at beta = 2, through `compare()` with the row-bootstrap error. The Wigner
  surmise is shown as a note, the 2x2 approximation it is.
- The Dyson SVG polylines carry `stroke-linecap="round"`, as the canvas strokes do.

Still open: the color ramp applies the palette shift modulo 1, so a level at exactly t = 1 takes the first
stop; the beta = 4 spacing law; and a global unfolding without the n = 150 scale bias.
