# Arctic Circle (Aztec diamond) review

Reviewed 2026-09-24 against `src/modules/aztec.js` (SHA-256 `d3cb40f6…1c31fb`). The tool is
[`tools/aztec-science.js`](../tools/aztec-science.js), its independent references are in
[`tools/lib/aztec-reference.js`](../tools/lib/aztec-reference.js), and its measured numbers are in
[`results/aztec-science.json`](results/aztec-science.json).

```sh
node tools/build.js
node tools/aztec-science.js --write     # 458 s recorded on a shared 4-core machine (load near 16); about 3.5 min when idle
```

## What was tested

Everything below runs the module's own code. `tools/lib/tiling-sandbox.js` loads the unmodified
`src/modules/aztec.js` in Node behind a mock host, with the engine's own `makeRng`, and calls
`regenerate()`, so the tilings come from the tab's `build()`, `shuffle()`, `dominoes()` and its frozen
test in `finish()`. The only change is an added `auditRead()` method that returns the tab's state.
Seeds are recipe strings (`aztec-uniform-n<n>-<i>`, `aztec-arctic-n<n>-<i>`); the tab derives its
stream as `makeRng(seed + '/aztec')`. The references do not call the module: the diamond is defined
by its cells (`|x| + |y| <= n` for cell centers), tilings are enumerated by backtracking, and a tab
tiling is read back only as its list of rectangles, which is also what the print draws.

The UI clamps the order to 8..320. The uniformity test runs orders 1 to 5 through the same `build()`
and `shuffle()` by setting the order directly; order 8 already has 2^36 tilings, so exhaustive
enumeration inside the UI range is not possible.

## 1. Counting: exact, no sampling error

Backtracking enumeration gives 2, 8, 64, 1,024 and 32,768 tilings at orders 1 to 5, which is
2^{n(n+1)/2} (Elkies, Kuperberg, Larsen and Propp 1992) at every order. The same enumeration gives the
exact placement probability of every domino position (4, 16, 36, 64 and 100 positions).

## 2. Uniformity of the shuffle

| order | tilings | draws | Pearson chi-square / df | p | tilings never drawn | max domino z (Bonferroni limit) |
|---|---|---|---|---|---|---|
| 1 | 2 | 4,000 | 0.0 / 1 | 0.825 | 0 | 0.22 (3.66) |
| 2 | 8 | 8,000 | 4.2 / 7 | 0.754 | 0 | 1.06 (4.00) |
| 3 | 64 | 12,800 | 58.4 / 63 | 0.641 | 0 | 1.49 (4.19) |
| 4 | 1,024 | 40,960 | 1,044.3 / 1,023 | 0.314 | 0 | 2.11 (4.32) |
| 5 | 32,768 | 655,360 | 32,726.1 / 32,767 | 0.562 | 0 | 2.40 (4.42) |

Sample sizes put at least 20 expected draws in every tiling, so that a sampler which never reaches some
tiling is caught (at order 5 the chance that a uniform sampler leaves one of the 32,768 tilings
undrawn is about 32,768 e^{-20}, 7e-5). Every draw passed the independent tiling check (each cell of the
diamond covered once, each domino on two cells of the diamond carrying its own type in the grid). Every
test also passed a simultaneous Hoeffding bound at alpha = 0.001 over all tiling probabilities and all
domino placement probabilities (union bound; largest deviations 0.0061 against a bound of 0.026 at order
2, and 0.0012 against 0.0037 at order 5). The significance level is 0.001 per order.

These are probability statements about draws from seeded PRNG streams. They assume those streams behave
as independent uniform variates, which a fixed regression sample cannot prove.

## 3. The arctic circle

Jockusch, Propp and Shor (1998) prove that the boundary of the four polar regions converges to the
inscribed circle, so the polar area fraction tends to 1 - pi/4 = 0.21460 and the boundary radius along
each axis tends to n / sqrt(2).

**The tab's own "frozen" is not that quantity.** The tab calls a domino frozen when every cell adjacent
to it inside the diamond carries its type, and prints the frozen share of dominoes on the status line
(it also drives the "Frozen versus free" coloring). That is a local test. Inside the circle the tiling
is disordered at large scale but still contains small brickwork patches in which a domino and all its
neighbors agree, so the local test marks a fixed fraction of the disordered disc as frozen at every
order. Measured over the same plates, with the standard error of the mean over independent seeds:

| order | seeds | tab frozen fraction | polar fraction | axis radius / n |
|---|---|---|---|---|
| 40 | 400 | 0.2722 ± 0.0008 | 0.3256 ± 0.0009 | 0.6544 ± 0.0010 |
| 57 | 400 | 0.2767 ± 0.0006 | 0.3050 ± 0.0007 | 0.6609 ± 0.0008 |
| 80 | 400 | 0.2778 ± 0.0004 | 0.2872 ± 0.0006 | 0.6694 ± 0.0006 |
| 113 | 300 | 0.2789 ± 0.0003 | 0.2727 ± 0.0005 | 0.6769 ± 0.0006 |
| 160 | 200 | 0.2797 ± 0.0003 | 0.2622 ± 0.0005 | 0.6810 ± 0.0006 |
| 226 | 150 | 0.2795 ± 0.0003 | 0.2517 ± 0.0005 | 0.6864 ± 0.0006 |
| 320 | 100 | 0.2798 ± 0.0002 | 0.2448 ± 0.0004 | 0.6904 ± 0.0005 |
| limit | | 0.2778 ± 0.0009 | 0.2141 ± 0.0014 | 0.7084 ± 0.0019 |
| theory | | | 1 - pi/4 = 0.2146 | 1/sqrt(2) = 0.7071 |

How this was handled:

- **The tab's frozen fraction** is read from the module (its `frozen` array, which on every one of the
  1,950 plates equals an independent implementation of the hint's definition, and whose rounded
  percentage equals the number the status line prints). It is flat near 0.28 from order 80 up and
  extrapolates to 0.2778 ± 0.0009, which is 0.063 above 1 - pi/4, **67 standard errors away. This is a
  disagreement, and it is a property of the definition, not of the sampler.** The printed "frozen" share
  should not be read as the arctic-circle area.
- **The polar regions** are what the theorem is about. Each is computed here as the edge-connected
  cluster of same-type dominoes containing the domino at its corner (N at the top, S at the bottom, W on
  the left, E on the right; the corner domino had the corner's type on every plate). Two same-type
  dominoes that share an edge are offset by one cell, so each cluster is a piece of brickwork. The
  arctic-circle paper's text could not be retrieved from this environment (arXiv is blocked), so this
  operational definition, "the contiguous brickwork attached to each corner", is stated here rather than
  quoted.
- **The boundary radius is measured directly**, along the four axes: how many cells of the central
  column (or row) pair, counted in from each corner, lie in that corner's polar region; the radius is n
  minus that depth. The four-axis mean per plate is the sample unit.

Finite-order corrections are large and are not forced away. Johansson (Ann. Probab. 33, 1, 2005) showed
that the arctic boundary fluctuates on the scale n^{1/3}, so the leading correction to an area or a
radius divided by n is of order n^{-2/3}. The limits in the table come from a weighted fit of
`q_inf + A n^{-2/3} + B n^{-1}` over all seven orders, with the error from 1,000 bootstrap resamplings
of the seeds at every order (seeded). The polar fraction extrapolates to 0.2141 ± 0.0014, 0.3 sigma
below 1 - pi/4 (fit chi-square 5.1 on 4 degrees of freedom); the axis radius to 0.7084 ± 0.0019, 0.7
sigma above 1/sqrt(2) (6.5 on 4). The deviation times n^{2/3} is nearly constant (polar: 1.30 at order
40, 1.41 at 320), which is what the n^{-2/3} form assumes.

The extrapolation depends on that form. Dropping the n^{-1} term and fitting only orders 113 to 320
gives 0.2166 ± 0.0008 (2.5 sigma high) for the area and 0.7037 ± 0.0011 (3.1 sigma low) for the radius,
so at these orders the next correction is not negligible, and the agreement is at the level of about
0.002 in area and 0.004 in radius rather than the formal error bar of either fit alone. At the largest
order the tab offers, 320, the measured polar fraction is still 0.0302 above the limit, 75 standard
errors, entirely a finite-size effect by the fits above.

Two further checks. The standard deviation across seeds of a single axis radius grows as n to the
0.339 ± 0.013 (bootstrap over seeds; from 1.73 cells at order 40 to 3.61 at 320), consistent with
Johansson's exponent 1/3 (0.4 sigma). And the four-fold symmetry holds: the north-south minus east-west
radius difference is within 1.7 standard errors of zero at every order.

## 4. Failure controls

- **Biased coin.** The creation step (and the order-1 seed tiling) chooses two horizontals with
  probability 0.7 instead of 1/2. The uniformity test fails at every order tried: chi-square 594 on 1
  degree of freedom at order 1 (p = 3e-131), 4,532 on 7, 18,796 on 63 and 138,442 on 1,023 (with 20
  tilings never drawn), domino placement z up to 149. It also moves the boundary: at order 160 over 40
  seeds the north-south axis radius falls to 0.5234 ± 0.0018 of n and the east-west radius rises to
  0.8152 ± 0.0017, a difference of 113 standard errors, against 0.6798 and 0.6809 (0.5 sigma apart) for
  the fair coin on the same seeds; the polar fraction moves from 0.2634 to 0.3254.
- **Destruction step removed.** The independent tiling check rejects 3,249 of 12,800 draws at order 3
  and 26,830 of 40,960 at order 4 (a domino slides out of the diamond), and the uniformity test fails.
  At orders 1 and 2 no collision can occur, so that control is only meaningful from order 3.

## 5. Print

Five recipes (orders 8, 28, 60, 120 and 180; all three color modes; inset 0 to 0.12; stroke on and
off; circle on and off; four palettes; grain 0) were built in a temporary copy of `dist/studio.html`
with the `auditRead()` hook, loaded through the recipe hash as a user would load them.

- The browser tiling equals the Node run of the same recipe, byte for byte, and a Node run that
  shuffles one order per timer slice gives the same tiling, so chunking against the clock does not
  change the sample.
- Every tiling passed the independent check, and the tab's frozen flags equal the stated definition.
- The module's SVG at 2,400 by 2,400 was parsed and every rectangle (72 to 32,580 per plate, 206,588
  coordinates in all) matches geometry computed from the documented layout within 0.0047 px, which is
  its 0.01 px rounding, with every fill, stroke and the circle's ink right. The SVG fails when held to a
  different seed's tiling of the same order.
- The module's PNG matches an independent painting of that geometry with a maximum channel error of 0
  over 23 million channels per plate; the same painting shifted by one pixel differs in 99,001 to
  1,923,963 channels, so the comparison can see a displacement.
- The shell's own Export at 8 in and 300 ppi (a vector RIP of the SVG) produced a 2,400 by 2,400 PNG
  identical, channel for channel, to the independent reference SVG rasterized the same way, and the
  shell's SVG download carries the same geometry plus the provenance block.
- The recipe and the tiling are unchanged after all exports.

Grain is a raster overlay: `exportPNG` adds it, the SVG does not, and since the shell prints this tab
through the SVG, grain never reaches the print. The fixtures therefore use grain 0.

## Limits

- Uniformity is established exhaustively only at orders 1 to 5; larger orders rely on the same code
  path and on the arctic measurements, which test the distribution only through the boundary.
- The tab's frozen share and its "Frozen versus free" coloring measure a local property that tends to
  about 0.278 of the diamond, not the arctic-circle area 1 - pi/4. This is the reason the status is
  "partially validated": the one number the plate prints about the arctic region disagrees with the
  arctic-circle value by 67 standard errors in the limit. Replacing the local test with the polar-region
  definition used here, or relabeling it, would remove the disagreement; that is a module change and
  was not made in this review.
- The extrapolated limits assume the stated finite-size form; the two-parameter variant differs by 2.5
  to 3 sigma, as reported above.
- Print evidence covers the five recipes and one renderer (headless Chromium 141, SwiftShader, Linux).

## Changed after this review (2026-09-24)

Two module changes followed this review. The tool, rerun on the changed module (SHA-256 `38ffddc9…b6da01`),
passes every check; it took 336 s on the shared 4-core machine (load near 6).

**The frozen test.** The module's frozen test is now the theorem's: a domino is in a polar region when a chain of
edge-adjacent dominoes of its own type connects it to the boundary of the diamond, the definition of Jockusch,
Propp and Shor as Johansson (Ann. Probab. 33, 2005, arXiv:math/0306216) states it. `tools/aztec-science.js`
checks the module's flags against an independent union-find on every plate (all 2,350 match), and the
corner-attached variant used above gives the same fraction at every order measured. The "Frozen versus free"
plates change; no key or default moved, so no legacy entry is needed.

**The error bar.** The status line first printed the polar fraction with the spread of the four polar regions
as its per-plate error bar, four times each region's share taken as four independent estimates of the total.
The regions are not independent. Over the tool's seeds the correlation of two neighboring regions' shares is
-0.28 at order 40 and weakens steadily to -0.06 at 320 (opposite regions: -0.05 to +0.12), presumably because
neighbors trade area where they meet near the tangency points, so the spread overstated the error by a factor
that drifts with n: the scatter over seeds is 0.68, 0.71, 0.77, 0.74, 0.87, 0.88 and 0.88 of the spread bar at
orders 40 to 320, below the calibration band (0.75 to 1.33) at 40, 57 and 113. A constant correction for the
correlation could not hold across that drift, so the bar was replaced by a different estimator. The free cells
(outside every polar region) are counted in 60 angular sectors about the center of the diamond, each cell split
between the two nearest sector centers, and the error bar is the standard error of their sum, sd sqrt(60 tau)
over the number of cells, with tau the integrated autocorrelation time around the circle (1 + 2 sum rho_l, the
window closed at the first non-positive rho, floored at 2 and capped at 15). It is the estimator the lozenge tab
uses for its boundary. Counting by angle does not ask which region a frozen cell belongs to, so a trade between
neighbors does not enter it. `tools/lib/aztec-reference.js` recomputes it from the definition and the printed
value and bar match on every plate.

The choice between the two estimators was made on a separate training family (seeds `aztec-train-n<n>-<i>`,
1,950 plates at the same seven orders): there the spread bar read 0.65 to 0.88 with the same drift, and the
sector bar 0.82 to 0.90 with none. The tool's own seeds were not used to choose. The band was not changed; the
seed counts at orders 113 to 320 were raised to 400, 300, 250 and 200 before the calibration run so that every
ratio is known to about 5 per cent. On the tool's seeds, with a 95 per cent interval from the chi-square
distribution of the sample variance:

| order | seeds | scatter over RMS bar | 95% interval | mean tau | spread bar (old) | neighbor correlation |
|---|---|---|---|---|---|---|
| 40 | 400 | 0.894 | 0.84 to 0.96 | 4.66 | 0.678 | -0.280 |
| 57 | 400 | 0.883 | 0.83 to 0.95 | 4.46 | 0.710 | -0.237 |
| 80 | 400 | 0.895 | 0.84 to 0.96 | 4.39 | 0.765 | -0.227 |
| 113 | 400 | 0.833 | 0.78 to 0.90 | 4.39 | 0.741 | -0.227 |
| 160 | 300 | 0.910 | 0.84 to 0.99 | 4.01 | 0.874 | -0.151 |
| 226 | 250 | 0.889 | 0.82 to 0.97 | 3.95 | 0.881 | -0.105 |
| 320 | 200 | 0.875 | 0.80 to 0.97 | 3.94 | 0.880 | -0.062 |

Every ratio is inside the band, so the bar is calibrated by the tool's criterion. It overstates the scatter by
10 to 20 per cent, and the intervals exclude 1, so this is a real, conservative offset rather than noise. Two causes were
measured on the training family: the window stops at the first non-positive autocorrelation and so leaves out a
negative lobe at lags of about 8 to 15 sectors (the full ensemble sum 1 + 2 sum rho_l is 3.6 to 4.3 against 4.3
to 5.7 for the truncated one), and the four-fold pattern of the mean sector counts, which is the same on every
plate, enters each plate's variance (19 to 44 per cent of the random part, growing with n). Subtracting the
ensemble pattern brings the ratio to 0.89 to 1.01, which a single plate cannot do. About 13 to 15 of the 60
sectors are independent on a typical plate.

With the larger seed counts the extrapolated limits moved within their errors. The polar fraction extrapolates
to 0.2127 +/- 0.0013 against 1 - pi/4 = 0.2146 (-1.5 sigma; fit chi-square 3.1 on 4) and the axis radius to
0.7097 +/- 0.0016 against 1/sqrt(2) (+1.7 sigma; 6.8 on 4). The two-parameter form over orders 113 to 320 gives
0.2156 +/- 0.0007 (+1.4 sigma) and 0.7049 +/- 0.0008 (-2.6 sigma), so the dependence on the finite-size form
stated above stands, at the level of about 0.003 in area and 0.005 in radius. The deviation of the polar
fraction times n^(2/3) runs 1.30 to 1.39. The single-axis fluctuation exponent is 0.337 +/- 0.011 (0.3 sigma from
1/3), the north-south minus east-west radius is within 2.1 standard errors of zero at every order, and the
controls and the five print recipes behave as in sections 4 and 5.

**Status.** Every numerical check passes, both failure controls fail as they must, and the print path is
checked, so the record is now "validated within stated limits" for its domain: exhaustive uniformity at orders 1
to 5, the arctic statistics and the bar calibration at orders 40 to 320, and the five print recipes. The bar is
not calibrated below order 40 (the UI starts at 8), the extrapolation depends on the stated form, and the print
evidence covers one renderer.

## Exact finite-order reference (2026-09-26)

The polar fraction no longer needs an extrapolation to be checked. Its expectation at every order is now computed
exactly, as a sum of gap probabilities, in [`research/arctic-finite-size/`](../research/arctic-finite-size/REPORT.md).
Nothing in `src/` changed and no new Monte Carlo run was made; the numbers compared below are the ones already in
`results/aztec-science.json`.

**How it is exact.** The north polar region (NPR) is the part of the tiling above the top DR path (Johansson,
Ann. Probab. 33 (2005), arXiv:math/0306216, sec. 1). Red particles sit on the white square of every S and W domino
(same source). The area above that path, counted along the white anti-diagonals, gives an identity that holds tiling
by tiling:

    |NPR| = 2 x (sum over the n white anti-diagonals of the index of the first red particle).

The red particles on the r-th anti-diagonal form the Krawtchouk ensemble: r points on {0..n} with weight C(n, x)
(Johansson (2005), eq. 2.6). By the four-fold symmetry, the expected polar fraction is therefore

    q(n) = (4 / (n (n+1))) sum_{r=1}^{n} (n - E[max of the r-point Krawtchouk ensemble]),

where every expectation is a sum of Fredholm determinants det(I - K) of the Krawtchouk kernel.

Several checks back the computation:

- The identity and each line's law were checked exactly on all 2^{n(n+1)/2} tilings of orders 1 to 5
  (`check_small.py`).
- The floating-point pipeline equals an independent exact-rational computation (integer Bareiss determinants of
  moment matrices) at orders 4 to 40, to 3e-16 (`verify_rational.py`).
- Order 5 gives 2339/3840 both by enumeration and by the kernel.

Every computed value is an expectation with no sampling error; the floating-point error is about 1e-12.

**The tab against it.** The polar fraction measured on 2,350 plates, as the mean ± the standard error over seeds,
against the exact expectation:

| order | seeds | tab (Monte Carlo) | exact | z |
|---|---|---|---|---|
| 40 | 400 | 0.3256 ± 0.0009 | 0.326740 | -1.22 |
| 57 | 400 | 0.3050 ± 0.0007 | 0.304254 | +1.08 |
| 80 | 400 | 0.2872 ± 0.0006 | 0.286922 | +0.47 |
| 113 | 400 | 0.2729 ± 0.0004 | 0.272679 | +0.61 |
| 160 | 300 | 0.2620 ± 0.0004 | 0.261150 | +2.06 |
| 226 | 250 | 0.2518 ± 0.0003 | 0.251954 | -0.31 |
| 320 | 200 | 0.2443 ± 0.0003 | 0.244516 | -0.61 |

The chi-square is 7.97 on 7 degrees of freedom (p = 0.34), and the largest deviation is 2.06 sigma, at order 160.
**The tab agrees with the exact finite-order expectation at every order measured.** It replaces the statement above
that the tab "agrees with the limit after extrapolation". That agreement depended on the assumed finite-size form,
and the form turns out to be biased at these orders. Fitted to the exact values at the same seven orders, the tool's
model `q_inf + A n^(-2/3) + B n^(-1)` gives q_inf = 0.21529, which is 0.0007 above 1 - pi/4, and A = 1.43. That bias
is about half the Monte Carlo error bar of the extrapolation (0.0013), which is why the spread between the two
variants in section 3 and in the 2026-09-24 note was of that size. Nothing was wrong with the sampler. The
deviation times n^(2/3), 1.30 to 1.39 at orders 40 to 320, equals the exact 1.31 to 1.40 within the error bars.

**The finite-size law.** The research folder also derives the leading correction:

    q(n) = 1 - pi/4 + C n^(-2/3) + d n^(-1) + ...,   C = -E[TW2] 2^(-2/3) Gamma(5/6)^2 / Gamma(5/3) = 1.574751290306...

Here E[TW2] = -1.7710868074116 is the mean of the Tracy-Widom GUE law. C is the Tracy-Widom mean times the edge
scale of the Krawtchouk top particle, integrated over the lines. That scale is Johansson's PTRF 123 (2002) eq. (2.72),
and at the axis it equals his 2^(-5/6).

Fitted to the exact values at orders up to 2,560, C is 1.57476 ± 0.00002, against 1.574751. The next term
is d = -1.7855 ± 0.0003, and fits need an n^(-3/2) term besides the integer powers of n^(-1/3). Convergence is slow:
the exact deviation times n^(2/3) is still only 1.47 at order 2,560. So at the orders the tab offers, the plate sits
well inside the n^(-2/3) regime but not at its constant.

What is proved and what is heuristic:

- **Proved:** the identity and the one-line law.
- **Heuristic:** the expansion itself, that is, the mean of the edge limit, uniformity along the lines and near the
  tangency points, and the form of the remainder.

The expansion is checked against the exact values, not proved.

**Not covered.** The axis radius is a joint event on neighboring lines. It would need the extended Krawtchouk kernel,
so it was not computed exactly here. Its comparison is unchanged from section 3 and the 2026-09-24 note.

**Proposed module change (not made).** Print the polar fraction against the exact expectation at the plate's order
rather than against 1 - pi/4 with a finite-size note. The printed line would read "polar fraction <value> ± <bar>
against <exact> at order n", with the existing per-plate sector bar and the basis `sampled`.

The expectations for orders 8 to 320 are 313 numbers. They can be tabulated from
`research/arctic-finite-size/aztec_exact.py`, or the module can compute them itself: an (n+1)-point tridiagonal
eigenproblem per line and a small Cholesky factorization, a few seconds at order 320 in single-threaded numpy. The limit and the
constant C would stay in the hint. That turns the status line's comparison from a known finite-size miss into a
check that can fail on every plate.
