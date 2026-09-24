# Schramm-Loewner numerical and print review

This review covers the Schramm-Loewner Evolution tab (`src/modules/sle.js`) and its tool,
[`tools/sle-science.js`](../tools/sle-science.js). The measured values are in
[sle-science.json](results/sle-science.json). The tool extracts the module's `makeTrace` (the tip
position as a composition of vertical slit maps, after Kennedy, J. Stat. Phys. 137, 839, 2009) and
`brownian` (the driver) in Node with `new Function` and a hook, and drives them directly. It also runs
`create()` against a stub host to reproduce each studio recipe. The references in
[`tools/lib/sle-reference.js`](../tools/lib/sle-reference.js) are written from the Loewner equation.
Every random draw uses the engine's `makeRng`, with the seeds recorded in the results file.

```sh
node tools/build.js
node tools/sle-science.js --write
```

The recorded run took 361 s on a four-core machine shared with other jobs. The sample sizes (16 seeds
per set) give dimension standard errors of about 0.005 to 0.008. That is small against the misses
reported below and against the shifts the doubled-variance control produces.

## What the tab computes

The tab evolves the chordal Loewner equation dg/dt = 2 / (g - xi(t)) up to capacity time 1 in N steps,
with dt = 1/N. The driver is held constant on each step at its value at the step's end. Point n is the
tip at time (n + 1) dt. In the studio, xi is a Brownian path of variance kappa. The tool can also feed
any driver array directly to the same `makeTrace`.

## Exact deterministic cases

The tolerances were set in advance from the step size.

- **xi = 0.** The trace is the vertical segment of height 2 sqrt(t), with half-plane capacity 2t. Vertical
  slit maps with one base point compose exactly, so the only admissible error is rounding. At
  N = 300, 1000, 3000 and 8000, the worst relative error over every point is 6.1e-14, against a tolerance
  of N eps.
- **xi = c t.** The closed form comes from Kager, Nienhuis and Kadanoff (J. Stat. Phys. 115, 805, 2004),
  rederived in the reference file. The trace is gamma = (2/c)(1 - theta cot theta + i theta), with
  c^2 t / 2 = 1 - theta cot theta + ln(theta / sin theta), and it approaches the line Im z = 2 pi / c. It
  was tested at c = 2, -3 and 0.5 with N = 500 to 8000. The criterion is an error of at most one driver
  increment, |c| dt, at every point. The measured maximum is 0.49 to 0.50 of |c| dt at every N, and the
  observed convergence order is 0.992 to 0.998.
- **xi = c sqrt(t).** The trace is a straight ray at angle alpha pi, of length
  2 sqrt(t) (alpha / (1 - alpha))^(alpha - 1/2), with c = 2 (1 - 2 alpha) / sqrt(alpha (1 - alpha)). It was
  tested at alpha = 1/4, 1/3, 0.4 and 0.6. At t = 1 the relative error is 5.7e-4 down to 1.9e-5 over
  N = 500 to 8000, always below 1/N, with order 0.991 to 0.998. At N = 8000 the angle is within 6e-6 pi.
  This driver is self-similar, so the relative error at step 500 cannot depend on N. It agrees across all
  five N to 2.5e-15, which checks the solver's scale covariance.

**Failure controls.** A slit of capacity dt in place of 2 dt fails every case: the zero-driver error is
0.29, where the tolerance is below 2e-12. Composing the slit maps in the wrong order passes the zero
driver, because maps with one base point commute. It fails the linear driver by 2473 times the tolerance
and the square-root driver as well. So the deterministic cases catch both a wrong capacity and a wrong
composition.

## The driver

The quadratic variation of the tab's own Brownian path, divided by kappa, has expectation 1 and
standard deviation sqrt(2/N) per path. Over 16 seeds at each of kappa = 2, 4, 6 and N = 2000, 4000,
8000, all nine means are within 1.7 sigma of 1. The threshold is 3.9, Bonferroni at alpha = 0.001. In
the sweep plate, every driver equals sqrt(kappa) times one common path to 1e-12, as the blurb says.

## Dimension of the trace

Beffara (Ann. Probab. 36, 1421, 2008) proves that the trace has dimension min(2, 1 + kappa/8). The
estimator counts the eps-boxes met by the polyline from 0 through the N trace points, using exact grid
traversal. The fit is fixed in advance: the least-squares slope of log count against log(1/eps) over
seven scales from D/16 to D/128, where D is the curve's own diameter. There are 16 independent seeds per
set. The error bar is the standard error of the across-seed mean. The threshold is |z| < 3.59, Bonferroni
over three kappa at alpha = 0.001.

| kappa | theory | N 2000 | N 4000 | N 8000 (tab maximum) | sigma at N 8000 |
|---|---|---|---|---|---|
| 2 | 1.25 | 1.2086 +/- 0.0047 | 1.2152 +/- 0.0048 | 1.2236 +/- 0.0063 | -4.2 |
| 4 | 1.50 | 1.3208 +/- 0.0064 | 1.3538 +/- 0.0048 | 1.3765 +/- 0.0076 | -16.2 |
| 6 | 1.75 | 1.3973 +/- 0.0081 | 1.4474 +/- 0.0075 | 1.4780 +/- 0.0055 | -49.5 |

**The measured dimension disagrees with the theorem at every kappa, and it is always low.** The
disagreement shrinks as N grows, and it grows with kappa. Three observations locate the cause in the
discretized trace, not in the model or the estimator:

1. The driver has the right variance (above), and the solver reproduces three closed-form traces to
   first order in dt.
2. The tool applied the same box counter and fit range to generalized Koch curves of known dimension,
   with 4096 and 16,384 vertices, which brackets N = 8000. Each result averages 16 seeded grid offsets.
   The estimator reads 1.246 and 1.250 for 1.25, 1.466 and 1.485 for 1.5, and 1.692 and 1.727 for 1.75.
   The standard errors are 0.005 to 0.014. The estimator's own bias at this size is therefore at most
   about 0.03 to 0.06, and it shrinks with vertex count. The SLE shortfall is 0.12 at kappa = 4 and 0.27
   at kappa = 6, well beyond that. At kappa = 2 the estimator is unbiased, and the SLE shortfall of 0.026
   is still 4 sigma.
3. The local slopes at N = 8000 (in the results file) peak at 1.25 near D/64 (kappa 2), 1.41 near D/23
   (kappa 4) and 1.55 near D/16 to D/23 (kappa 6). They then fall steadily at smaller scales, which is
   the signature of an under-resolved curve. The tab
   samples the curve at uniform capacity time, and a uniform time step is very non-uniform in space. At
   kappa = 6, a tenth of the steps are at least 0.74 of the smallest box. Where the curve closes a loop,
   a straight chord between two samples replaces a long excursion. At kappa = 2 the 90th-percentile step
   is only 0.17 of the smallest box, and the miss there is correspondingly small.

The picture the tab draws is a correct numerical solution of the Loewner equation for its driver,
convergent at first order in dt. But at the tab's resolution (N <= 8000), its fractal dimension is not
that of SLE. It is 0.03 low at kappa = 2 and 0.27 low at kappa = 6. Closing this gap would take an
adaptive or much finer time step, beyond the tab's O(N^2) budget. This is reported as a disagreement, and
it keeps the record at partially validated.

**Failure control, doubled variance.** The same seeds are driven with variance 2 kappa while still
labeled kappa. The measured dimension rises by 0.159 at kappa = 2 (to 1.383, 19.0 sigma) and by 0.193 at
kappa = 4 (to 1.569, 20.1 sigma). The quadratic-variation test flags the same drivers at 2.00 times
kappa. So the dimension measurement does respond to kappa, even though it is biased at fixed N.

## Actual prints

Five recipes run through a temporary copy of `dist/studio.html` with an `auditRead()` hook:
percolation (kappa 6, N 3000, time ink, 5:4), loop-erased walk (kappa 2, N 5000, single ink, 4:5), the
six-kappa sweep (N 3000, per-curve ink), a bundle of 12 seeds (kappa 6, N 2000, 3:2) and Peano
(kappa 8, N 6000, 1:1, axis off). For each one:

- The studio's drivers agree with the Node run to 2e-15, and its traces to 4e-12. Chromium and Node round
  the Box-Muller logarithm and cosine differently in the last bit, so the comparison uses a tolerance.
- Recomputing each trace from the studio's own driver with the module's solver reproduces it.
- In the sweep, every driver is sqrt(kappa) times one path.
- Every SVG path vertex matches an independent reconstruction of the page transform within 0.00501 px,
  the file's rounding. That is 6101 to 48,029 coordinates per print, or at most 1.8e-5 in half-plane
  units. The same holds for the axis line, the stroke widths, caps, joins and opacity, and every stroke
  color (time ramp, palette or ink).
- The fallback PNG matches an independent painting exactly (maximum channel error 0). The same painting
  displaced by one pixel fails on 62,000 to 604,000 channels.
- Exporting leaves the recipe and traces unchanged.
- The shell's vector RIP (the SVG drawn at print size) is recorded against the same painting but is not
  a pass criterion. The mean difference is 0.003 to 0.010 levels, and 0.02 to 0.06 percent of channels
  differ by more than two levels. These are local antialiasing differences between Chromium's SVG and
  canvas rasterizers, whose cause was not isolated. No vertex moves.

## Domain and limits

- **Solver.** Capacity time 1, N = 300 to 8000, with the three closed-form drivers above.
- **Driver.** kappa = 2, 4 and 6 at N = 2000 to 8000, and the sweep plate.
- **Dimension.** kappa = 2, 4 and 6 at N = 2000 to 8000, 16 seeds each, over the fit range above. It
  disagrees with 1 + kappa/8 at every point tested.
- **Prints.** The five recipes above, one Chromium build, at 2400 px on the long side.
- The tab also offers kappa from 0.2 to 12, and kappa = 8/3 and 8. Those are covered only by the print
  recipes, not by any dimension or distribution test.
- Finite samples from one seeded pseudorandom generator. The error bars assume independent seeds.
- Not tested: the trace's law beyond its dimension (for example, left-passage or hitting
  probabilities), and the kappa > 4 swallowing behavior.
