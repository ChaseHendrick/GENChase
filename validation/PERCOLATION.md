# Percolation: exact threshold benchmark and print review

Tab `percolation` in `src/modules/lattice.js`. Reviewed 2026-09-24 with
`node tools/percolation-science.js --write`; results in
[results/percolation-science.json](results/percolation-science.json).

The tool loads the real module in Node (through `tools/lib/lattice-harness.js`, in the pattern of
`tools/ust-review.js`) and calls the tab's own `ensureField()`, which draws one seeded random number per site
and two per site for bonds, and `label()`, its Hoshen-Kopelman labeling by union-find. Nothing numerical in
the module is edited except in the failure controls. The print part reads the state back from the real studio
through an `auditRead()` injected into a temporary copy of `dist/studio.html`.

## References

- Bond percolation on the square lattice: p_c = 1/2 exactly (H. Kesten, Comm. Math. Phys. 74, 41 (1980)).
- Site percolation on the square lattice: the tab credits "about 0.592746", which is numerical. M. E. J.
  Newman and R. M. Ziff, Phys. Rev. Lett. 85, 4104 (2000), give 0.59274621(13). The comparison below uses the
  tab's value with an uncertainty of 5e-7 (its rounding), which is negligible next to the measured error bars.
- Failure-control predictions: the site threshold with next-nearest neighbors is 1 - p_c(site) = 0.407254 by
  the matching-lattice relation (M. F. Sykes and J. W. Essam, J. Math. Phys. 5, 1117 (1964)); anisotropic bond
  percolation with horizontal and vertical probabilities p_h and p_v is critical on p_h + p_v = 1, so a
  vertical bias of 0.9 puts the threshold at 1/1.9 = 0.526316.

## 1. The clusters are exactly the clusters

240 seeded lattices: both types, every grid the UI offers (128 to 512), all five aspects (so W != H is
covered), and p across the slider range 0.3 to 0.8 including both thresholds. In total 22,001,408 sites.
For each, the tab's labeling is compared with an independent breadth-first labeling written from the
definitions (site: occupied iff r_i < p, nearest occupied neighbors connect; bond: every site present, the
bond right of i open iff r_2i < p, below iff r_2i+1 < p). Identical on every lattice: the cluster of every
site, every cluster size, the number of clusters, the largest size, the spanning decision and the lit
(largest spanning) cluster; the tab's size ranking is a valid ranking. The field itself equals the engine's
seeded stream. Exact, no sampling error.

**Failure control.** The same labeler with diagonal neighbors injected differs from the breadth-first
labeling on 120 of the 120 site lattices.

## 2. The sweep only adds sites

On 24 lattices, raising p from 0.30 to 0.80 in steps of 0.01 (1,224 steps) reuses the same field object
(never re-rolled), never removes a site or bond, and never splits a cluster. In the real studio, moving p
from 0.58 to 0.61 by recipe on one seed leaves the field identical and only adds sites. Because occupancy is
`r < p` on a fixed field, each seed has one exact threshold v* (the smallest field value at which the
lattice spans top to bottom), and the tab spans exactly when p > v*.

## 3. Thresholds and the crossing of R_L(p)

For each type and L = 128, 256, 512 (square, the tab's grid menu values), 4,000, 2,000 and 1,000 independent
seeds (`perc-science/<type>/L<L>/<i>`). For every seed:

- an independent Newman-Ziff style reference (its own union-find with top and bottom flags, adding sites or
  bonds in order of their value) finds v*;
- the tab's labeler must report no spanning at p = v* and spanning just above v* (midway to the next field
  value). All 14,000 seeds agree;
- for the first 50 seeds of every size the tab's labeler alone finds v* by bisection over the field's own
  values, and it equals the reference exactly;
- for the first 50 seeds of every size the tab spans on the report grid of p exactly when p > v*.

R_L(p), the fraction of seeds with v* < p, is therefore the tab's spanning probability. Its binomial
standard error is 0.008, 0.011 and 0.016 near R = 1/2 at the three sizes; the full tables with Wilson
intervals are in the results file. The crossing of two curves is located on the exact empirical curves by a
local quadratic fit to R_b(p) - R_a(p) in a window of half the larger lattice's threshold standard deviation,
re-centered on the root five times. The rule is stated in the tool and was checked on synthetic curves with
known crossings (errors 7e-5, 5e-5 and 6e-6, against the error bars of 3e-4 below). Error bars are an
ordinary bootstrap over seeds (1,000 replicates, seeded), which is valid because seeds are independent;
"combined" is the mean of the two adjacent-pair crossings, with a joint bootstrap because the pairs share a
lattice.

| Type | Crossing | Measured | 95% interval | Reference | Deviation |
|---|---|---|---|---|---|
| bond | 128 / 256 | 0.50056 +/- 0.00054 | 0.49946 to 0.50159 | 1/2 exact | 1.0 sigma high |
| bond | 256 / 512 | 0.49977 +/- 0.00044 | 0.49895 to 0.50066 | 1/2 exact | 0.5 sigma low |
| bond | 128 / 512 | 0.50007 +/- 0.00026 | 0.49961 to 0.50059 | 1/2 exact | 0.3 sigma high |
| bond | combined | **0.50017 +/- 0.00027** | 0.49956 to 0.50070 | 1/2 exact | **0.6 sigma high** |
| site | 128 / 256 | 0.59201 +/- 0.00068 | 0.59069 to 0.59326 | 0.592746 | 1.1 sigma low |
| site | 256 / 512 | 0.59344 +/- 0.00055 | 0.59242 to 0.59453 | 0.592746 | 1.3 sigma high |
| site | 128 / 512 | 0.59295 +/- 0.00032 | 0.59232 to 0.59360 | 0.592746 | 0.6 sigma high |
| site | combined | **0.59273 +/- 0.00034** | 0.59209 to 0.59339 | 0.592746 | **0.05 sigma low** |

The bond crossing is consistent with Kesten's exact 1/2 (the pass criterion: within two standard errors and
inside the 95% interval), to about 0.05 per cent. The site crossing agrees with the numerical value the tab
credits. No finite-size drift of the crossings is resolved at these sizes; the pair-to-pair scatter is
consistent with the error bars.

Supplementary, not a pass criterion: the median thresholds are 0.49980, 0.50014 and 0.49999 (bond) and
0.59297, 0.59254 and 0.59293 (site) at L = 128, 256, 512, each with a distribution-free 95% interval in the
results file, and R_L at the reference p is 0.51, 0.49, 0.50 (bond) and 0.49, 0.51, 0.48 (site), each
+/- 0.008 to 0.016, consistent with the value 1/2 that self-duality (bond) and Cardy's crossing formula
(J. Cardy, J. Phys. A 25, L201 (1992); a universality prediction, not proved for the square lattice) give
for a square.

**Failure controls.** Each wrong rule is injected into a copy of the module, and the injected tab's labeler
alone locates every threshold by bisection (400 seeds at each of L = 128 and 256):

| Injected rule | Crossing | Distance from the true threshold | Predicted for the wrong rule |
|---|---|---|---|
| site labeler also joins diagonal neighbors | 0.4083 +/- 0.0013 | 144 sigma below 0.592746 | 0.407254 (0.8 sigma) |
| vertical bonds open with probability 0.9 p | 0.5274 +/- 0.0014 | 20 sigma above 1/2 | 0.526316 (0.8 sigma) |

Both are detected by a wide margin, and each lands on the value the exact theory predicts for the wrong
model, which shows that the measurement resolves a 10 per cent bias in one bond direction.

## 4. Print

Five recipes, grain off: the presets "Site at p_c" (256, rank view), "Bond at 1/2" (192, rank), "Spanning"
(256, log size) and "Bond below" (192, log size, highlight off, clusters under 3 hidden), and an occupied-view
plate at 4:5 (128 x 160). Exported at 2400 x 2400, or 1920 x 2400 for 4:5 (8 in at 300 ppi). For each:

- the studio's field, clusters, sizes, ranking and lit cluster equal the independent labeling of the field
  regenerated from the seed;
- every pixel of the tab's own `exportPNG()` is compared with the color computed from the independent
  labeling by the tab's documented rule (palette ramp position by rank, log size or a fixed level; lit
  spanning cluster at the top of the ramp; bonds drawn between sites in the bond view). Maximum channel
  error: 0 on all five;
- exporting leaves the recipe and the complete state unchanged.

Chromium's nearest-neighbor scaler resolves the sample position in fixed point, so an output pixel whose
sample point lies within 0.01 cell of a cell boundary may show the neighboring cell. That is a positional
error under 0.01 cell (at most 0.15 output pixel at these cell sizes of 6 to 15 pixels). Those pixels
(0 to 4 per cent of each plate) are counted separately and must equal one of the two cells at the boundary;
all do, and 0 to 19,347 per plate show the neighbor. Controls: the picture shifted by one output pixel and
the picture of the same field at p + 0.01 both fail on 100,000 to 2,200,000 pixels per plate.

The ties among equal-size clusters in the rank view are ordered by the tab's union-find representative;
the check reproduces that order rather than testing it, because it is a presentation choice.

## Findings about the module

No error was found in the field, the labeling, the spanning decision, the sweep or the print. The tab never
prints a measured number against theory; its status "at p_c" is a fixed window of +/- 0.004 around the
credited value, which is a description, not a measurement.

## Domain and limits

- Labeling: the 240 recipes above, every grid and aspect the UI offers.
- Thresholds: square L = 128, 256, 512 only; the crossing is a finite-size estimator, and agreement at
  3e-4 does not exclude finite-size shifts smaller than that. The site reference is numerical.
- Sampling: the error bars assume the seeded generator's streams for different seed strings behave as
  independent draws. The generator's statistical quality beyond these tests is not established.
- Prints: the five recipes above, raster PNG through Chromium with a software renderer; other renderers are
  not covered. The percolation tab has no vector export.
- Precision: float32 random field compared with a double p, integer cluster data, RGBA8 raster.
- Runtime on the review machine: 856 s wall, 605 s of CPU over the four worker threads, while other jobs
  shared the machine; from the CPU time, an idle 4-core machine should take about four minutes.

```sh
node tools/percolation-science.js --write
```
