# Lozenge Tilings review

Reviewed 2026-09-24 against `src/modules/lozenge.js` (SHA-256 `e7beea07…c8ef8b`; the record it
replaces was made against an earlier revision). The tool is
[`tools/lozenge-science.js`](../tools/lozenge-science.js), its independent references are in
[`tools/lib/lozenge-reference.js`](../tools/lib/lozenge-reference.js), and its measured numbers are in
[`results/lozenge-science.json`](results/lozenge-science.json).

```sh
node tools/build.js
node tools/lozenge-science.js --write     # 527 s recorded on a shared 4-core machine (load near 16)
```

## What was tested

The module's own code runs throughout. `tools/lib/tiling-sandbox.js` loads the unmodified
`src/modules/lozenge.js` in Node behind a mock host with the engine's own `makeRng` and stats harness.
Two lines are added: an `auditRead()` method and a line that exposes the module's internal functions
(`makeJob`, `runJob`, `buildTiling`, `corners`, `classify`, `measureArctic`, `ellipseOf`,
`macmahonLog10`, `samplerSelfTest`). Draws for the uniformity tests call `makeJob` and `runJob` with
the key `build()` derives, `makeRng(seed + '/lozenge')`; ten seeds on 2·2·2 and 3·3·3 confirm that this
gives exactly the heights the full `regenerate()` path produces. The limit-shape plates run the full
`regenerate()` path, including the tab's self-test and measurement.

The references do not call the module. The hexagon is the convex hull of the box corners projected
along (1, 1, 1) onto the triangular lattice; tilings are enumerated directly as pairings of its unit
triangles; plane partitions are enumerated separately; the visible faces of a cube stack are rebuilt
from the 3D picture; the frozen test is a breadth-first search; the ellipse is solved from its tangency
to the six sides.

## 1. Counting and the drawn tiling: exact, no sampling error

| box | triangles | direct tilings | plane partitions | MacMahon (BigInt) |
|---|---|---|---|---|
| 2·2·2 | 24 | 20 | 20 | 20 |
| 2·2·3 | 32 | 50 | 50 | 50 |
| 2·3·4 | 52 | 490 | 490 | 490 |
| 3·3·3 | 54 | 980 | 980 | 980 |
| 4·4·4 | 96 | 232,848 | 232,848 | 232,848 |

For every plane partition in each box, the module's `buildTiling` reports a sound tiling, and the
rhombi it draws (read through its own `corners`, the geometry the plate and the SVG use) cover exactly
two edge-adjacent triangles each, cover the hexagon, form a tiling in the direct enumeration, and equal
the faces of the independently rebuilt cube stack. The 232,848 plane partitions of 4·4·4 give 232,848
distinct tilings, so the module's height-to-tiling map is a bijection on every box tested; uniform
heights are therefore uniform tilings. The status line's `macmahonLog10` agrees with log10 of the exact
count within 2e-15.

The ellipse the tab predicts (`ellipseOf`) agrees with the independent tangency solution on nine shapes
(regular, skewed, flat and tall, from 3·5·7 to 48·48·48) within 3e-16 relative in the matrix and 9e-16
in the center; the tangency residual on all six sides is below 3e-13 and the predicted free area
pi sqrt(det A) / hexagon area matches within 3e-16 (0.9069 for a regular hexagon, 0.8868 for 24·40·46,
0.7079 for 48·48·8).

## 2. Uniformity of coupling from the past

| box | tilings | draws | Pearson chi-square / df | p | never drawn | max rhombus z (Bonferroni limit) |
|---|---|---|---|---|---|---|
| 2·2·2 | 20 | 8,000 | 23.8 / 19 | 0.205 | 0 | 1.60 (4.15) |
| 2·2·3 | 50 | 10,000 | 53.2 / 49 | 0.315 | 0 | 1.70 (4.22) |
| 2·3·4 | 490 | 19,600 | 486.4 / 489 | 0.524 | 0 | 2.31 (4.34) |
| 3·3·3 | 980 | 39,200 | 1,066.8 / 979 | 0.026 | 0 | 2.65 (4.35) |

At least 20 draws are expected in every tiling (40 on the two larger boxes), enough to catch a tiling
the sampler cannot reach. Each test also passes a simultaneous Hoeffding bound at alpha = 0.001 over all
tiling probabilities and all rhombus placement probabilities, the latter taken exactly from the direct
enumeration. The significance level is 0.001 per box; 3·3·3 at p = 0.026 passes it.

4·4·4 has too many tilings to fill with draws, so its volume is tested instead: 400,000 draws against
the exact volume distribution from the enumeration (tails merged so that every class expects at least
20), chi-square 59.8 on 56 degrees of freedom, p = 0.34; mean volume 31.983 ± 0.013 against exactly 32,
1.3 sigma low.

These probability statements assume the seeded draws behave as independent uniform variates, which a
fixed PRNG regression does not prove.

## 3. Failure controls

Each control changes one line of the module and runs the same test on 2·2·2 and 3·3·3.

| control | 2·2·2 chi-square / 19 | 3·3·3 chi-square / 979 | tab self-test z |
|---|---|---|---|
| none (the module as shipped) | 23.8 | 1,066.8 | 1.7 |
| biased update: u replaced by u^2, still monotone | 20,294 | 2,044,985 (389 tilings never drawn) | 65.2 |
| state read at the meeting time instead of time 0 | 1,754 | 8,887 | 25.5 |
| coalescence check compares only half the sites | 63.2 (p = 1.2e-6) | 1,294 (p = 4e-11) | 4.7 |

All three fail the uniformity test. The third is the subtle one: it still coalesces most of the time
and is caught at p near 1e-6 on 8,000 draws, so a smaller sample would miss it. The tab's printed
self-test (4,000 draws on 2·2·2, same key) flags all three.

The self-test as shipped is calibrated. Over the 470 limit-shape plates its deviation has mean -0.002
and standard deviation 1.007, 2.6 per cent of plates read past 2 and none past 3, and the pooled
chi-square is 8,928 on 8,930 degrees of freedom (p = 0.50). A run that limits every timer slice to one
sweep reproduces the heights, the start time, the meeting sweep and the measurement exactly.

## 4. The limit shape, measured with the tab's own test

Cohn, Larsen and Propp (1998) prove that the frozen regions converge to the complement of the inscribed
ellipse. The tab measures this with a local frozen test (a triangle is frozen when every triangle within
ring 3 has its orientation), converts the free triangles in 60 sectors into a radius (1 is the
ellipse), and prints both the radius and the free area with per-plate error bars. Over independent seeds
(mean ± standard error of the mean over seeds):

| hexagon | seeds | radius | sigma from 1 | free area | predicted | sigma |
|---|---|---|---|---|---|---|
| 24·24·24 | 200 | 1.0060 ± 0.0004 | +14.3 | 0.9185 ± 0.0008 | 0.9069 | +15.3 |
| 32·32·32 | 150 | 1.0016 ± 0.0005 | +3.6 | 0.9104 ± 0.0008 | 0.9069 | +4.2 |
| 48·48·48 | 60 | 0.9979 ± 0.0006 | -3.4 | 0.9035 ± 0.0011 | 0.9069 | -3.1 |
| 24·40·46 | 60 | 0.9978 ± 0.0009 | -2.5 | 0.8835 ± 0.0015 | 0.8868 | -2.1 |

**These disagree with the limit shape beyond their error bars at every regular size, and the trend
crosses it:** high at 24, still high at 32, low at 48. That matches the tab's own record (1.0026 ±
0.0009 at 32 over 40 seeds, 0.9984 ± 0.0007 at 48) and its hint that no ring setting is the arctic
boundary itself. A fixed-radius local test also marks brickwork patches inside the disordered region as
frozen, so it is not expected to converge to the ellipse; what these numbers support is agreement at
the level of 0.2 to 0.6 per cent in radius and 0.4 to 1.3 per cent in area at the sizes the tab offers,
not convergence. The free area was also recomputed from an independent breadth-first frozen test on
eight plates and matched the tab's exactly, and the tab's orientation and frozen flags matched the
independent reconstruction triangle for triangle, so the offsets belong to the definition, not to the
bookkeeping.

**Is the per-plate error bar calibrated?** Ratio of the scatter across seeds to the root-mean-square
per-plate bar, with a 95 per cent interval from the chi-square distribution of a sample variance:

| hexagon | radius ratio | free-area ratio |
|---|---|---|
| 24·24·24 | 0.80 (0.73 to 0.89): bar wide | 0.98 (0.89 to 1.09): calibrated |
| 32·32·32 | 0.92 (0.82 to 1.03): calibrated | 1.13 (1.01 to 1.27): bar narrow |
| 48·48·48 | 1.03 (0.87 to 1.25): calibrated | 1.27 (1.07 to 1.54): bar narrow |
| 24·40·46 | 0.96 (0.81 to 1.17): calibrated | 1.18 (1.00 to 1.44): bar narrow, borderline |

The radius bar is calibrated or conservative. The free-area bar runs 13 to 27 per cent narrow on the
larger regular hexagons and on the skewed one, so a single plate's free-area deviation in sigma reads
about a quarter too large there. The tab's hint says the free-area bar is wide on most shapes and
narrow mainly on tall boxes such as 20·20·40; at 32 and 48 this sample does not bear that out. The
measured shortfall is recorded here; the bar is not rescaled.

## 5. Print

Seven recipes (11·11·11 with strokes, 24·40·46 with both curves, 48·48·8 frozen with the predicted
ellipse, 32·32·32, 20·20·40 flat with strokes, 36·36·36 frozen at 1:1 with both curves, 16·16·16 in
height color with the hairline seam stroke; seven palettes; grain 0) were loaded through the recipe
hash in a temporary copy of `dist/studio.html` with the `auditRead()` hook and exported at 8 in and
300 ppi (1,386 by 2,400 up to 2,400 by 2,400 px, as the shell sizes each aspect).

- The browser heights, CFTP start and meeting sweep, sector radii and bootstrap bar equal the Node
  run of the same recipe through `regenerate()`.
- The tab's triangle orientations and frozen flags equal the independent reconstruction.
- Every SVG rhombus (363 to 3,904 per plate) was matched to one rebuilt from the cube stack, the
  documented layout and inset, and the documented color rules (face shading, three colors, height ramp
  with face shading, frozen mixing); every corner and every curve point (the ellipse from the
  independent tangency solution, the measured curve from the tab's sector radii) is within 0.0050 px, the
  SVG's 0.01 px rounding, and fills, strokes, widths, dashes and caps match. The SVG fails when held to a
  different seed's tiling of the same hexagon.
- The module's PNG matches an independent painting of the same geometry with a maximum channel error of
  0 on every plate; a one-pixel shift differs in 295,226 to 1,276,675 channels.
- The shell's own Export (a vector RIP of the SVG) gave a PNG of the stated size identical, channel for
  channel, to the independent reference SVG rasterized the same way, and the shell's SVG carries the same
  geometry plus provenance.
- The recipe and the state are unchanged after all exports.

Grain is left out of the vector sheet by design (the module says so), so the fixtures use grain 0.

## Limits

- Exhaustive uniformity covers four boxes up to 3·3·3, plus the volume law on 4·4·4. Larger hexagons use
  the same code, and the module's own record documents further enumeration and volume checks up to
  5·5·5 that this review did not repeat.
- The status is "partially validated" because the arctic radius and free area the plate prints against
  the limit shape disagree with it beyond their error bars at every size tested (section 4), and because
  the per-plate free-area bar undercovers by 13 to 27 per cent at 32·32·32, 48·48·48 and 24·40·46. The
  exact sampler, the counts, the drawn tiling, the ellipse and the print path are validated within the
  domain above. Promotion would need either the arctic readout to be scoped out of the validated claim
  as a finite-size diagnostic, or a boundary measure that converges, plus a free-area bar that covers.
- Print evidence covers the seven recipes and one renderer (headless Chromium 141, SwiftShader, Linux).

## Changed after this review (2026-09-24)

The module changed after this review (SHA-256 `8d0b74da…dcfbb1`), `tools/lozenge-science.js` was extended
for it and rerun, and every check passes; the run took 589 s on the shared 4-core machine (load near 6).

**The frozen test.** The ring-3 local test is replaced by the global definition the Aztec tab uses: a rhombus is
frozen when a chain of edge-adjacent rhombi of its own orientation joins it to the rim of the hexagon. It is the
lozenge analogue of the polar regions of Jockusch, Propp and Shor in the form Johansson states them (Ann.
Probab. 33, 2005, arXiv:math/0306216). Cohn, Larsen and Propp state their theorem for the height function, and
this reading of "frozen" is adopted by analogy, not quoted from them; neither paper could be retrieved from this
environment. On the cube picture it is concrete. Two tops share an edge exactly when two neighboring columns
have one height, and the only tops on the rim are full columns (h = c) in the first row or column and empty ones
(h = 0) in the last, so the frozen tops are exactly the columns with h = c or h = 0, each set a staircase that
holds its corner; the side faces work the same way through m(j, k) = #{i : h(i, j) > k} and
q(i, k) = #{j : h(i, j) > k}. The six regions have no holes, so the test cannot call a brickwork patch in the
disordered middle frozen, and the edge of each region is the first level line of a height function.

The module floods triangles outward from the rim. On every one of the 2,720 limit-shape plates the tool holds it
to an independent union-find over rhombi (`rimFrozen` in `tools/lib/lozenge-reference.js`) triangle for
triangle, holds the free area to that reference exactly, and holds the number of frozen rhombi of each
orientation to the extreme level sets of the height function (`extremeLevelCounts`), a route with no tiling in
it. All match, and the radius, free area and bars the status line prints equal the measurement to the printed
digits on every plate.

**The error bars.** Both now come from the 60 sector series by the integrated autocorrelation time (1 + 2 sum
rho_l, the window closed at the first non-positive rho, floored at 2 and capped at 15): the radius as before, and
the free area as the standard error of the summed sector counts, sd sqrt(60 tau) over the number of triangles.
The circular block bootstrap it replaces, with blocks of about tau sectors, keeps only the tapered part of the
autocovariance sum, which is the likely reason it ran narrow in section 4. The calibration band, 0.75 to 1.33
for the scatter over seeds divided by the root-mean-square bar at every hexagon, was written into the tool
before the run; it is the band the Aztec tab uses.

The limit shape is measured on seven regular hexagons and a skewed family scaled from 3:5:6, with the local
ring-3 test run on the same tilings through the module's own code for comparison (mean ± standard error over
seeds; calibration ratio with its 95 per cent interval from the chi-square distribution of a sample variance):

| hexagon | seeds | radius | radius bar ratio | free area | predicted | free-area bar ratio | mean tau | ring 3 radius | ring 3 free area |
|---|---|---|---|---|---|---|---|---|---|
| 12·12·12 | 400 | 0.9085 ± 0.0006 | 0.83 (0.78 to 0.89) | 0.7516 ± 0.0010 | 0.9069 | 0.83 (0.77 to 0.89) | 4.0 | 1.0209 | 0.9466 |
| 16·16·16 | 400 | 0.9262 ± 0.0005 | 0.87 (0.81 to 0.94) | 0.7799 ± 0.0009 | 0.9069 | 0.87 (0.81 to 0.93) | 4.1 | 1.0139 | 0.9333 |
| 20·20·20 | 300 | 0.9379 ± 0.0005 | 0.90 (0.84 to 0.98) | 0.7991 ± 0.0009 | 0.9069 | 0.90 (0.83 to 0.98) | 4.0 | 1.0098 | 0.9256 |
| 24·24·24 | 300 | 0.9455 ± 0.0004 | 0.82 (0.76 to 0.90) | 0.8119 ± 0.0007 | 0.9069 | 0.82 (0.76 to 0.89) | 4.0 | 1.0064 | 0.9192 |
| 32·32·32 | 200 | 0.9549 ± 0.0005 | 0.93 (0.85 to 1.04) | 0.8277 ± 0.0008 | 0.9069 | 0.94 (0.85 to 1.04) | 3.8 | 1.0015 | 0.9101 |
| 40·40·40 | 120 | 0.9616 ± 0.0005 | 1.03 (0.91 to 1.17) | 0.8392 ± 0.0009 | 0.9069 | 1.02 (0.91 to 1.17) | 3.6 | 0.9992 | 0.9058 |
| 48·48·48 | 100 | 0.9663 ± 0.0005 | 0.98 (0.86 to 1.14) | 0.8473 ± 0.0009 | 0.9069 | 0.99 (0.87 to 1.15) | 3.6 | 0.9976 | 0.9028 |
| 12·20·24 | 300 | 0.9254 ± 0.0007 | 0.77 (0.71 to 0.84) | 0.7605 ± 0.0011 | 0.8850 | 0.77 (0.72 to 0.84) | 4.8 | 1.0074 | 0.8996 |
| 15·25·30 | 300 | 0.9369 ± 0.0006 | 0.84 (0.78 to 0.92) | 0.7786 ± 0.0010 | 0.8850 | 0.84 (0.78 to 0.92) | 4.9 | 1.0037 | 0.8927 |
| 18·30·36 | 200 | 0.9457 ± 0.0007 | 0.83 (0.76 to 0.92) | 0.7929 ± 0.0011 | 0.8850 | 0.83 (0.76 to 0.92) | 4.8 | 1.0015 | 0.8886 |
| 24·40·48 | 100 | 0.9550 ± 0.0009 | 0.89 (0.78 to 1.04) | 0.8082 ± 0.0014 | 0.8850 | 0.89 (0.79 to 1.04) | 4.9 | 0.9970 | 0.8804 |

All 22 ratios are inside the band, 0.77 to 1.03. The bars are about right at 40 and 48 a side and overstate
the scatter by up to 30 per cent elsewhere, in the same direction as the Aztec bar and presumably for the same
reasons (validation/AZTEC.md), which were not measured separately here. The lowest, 0.77 at 12·20·24, is close
to the lower edge of the band.

**The limit shape.** At every size the tab offers, an exact plate reads below the limit. The frozen regions
reach past the ellipse, by about one tile at 12 a side and 1.4 at 48 (the radius shortfall times the inscribed
radius), a distance that grows about as slowly as n^(1/3), so a single plate reads about 7 of its own error bars
low on a regular hexagon at every size from 12 to 48 (5.2 to 5.7 on the skewed family), and the status line
names the finite-size cause. The shortfall times n^(2/3) is nearly constant, -0.81 to -0.79 for the regular free
area, -0.48 to -0.44 for the regular radius and -0.31 for the skewed free area, which is what the n^(-2/3) form
assumes. Fits with a 1,000-replicate bootstrap over seeds at every size (n is the side of a regular hexagon and
the scale factor k of the 3:5:6 family, k = 4, 5, 6, 8):

| family | quantity | q_inf + A n^-2/3 + B n^-1, all sizes | q_inf + A n^-2/3, larger sizes | limit |
|---|---|---|---|---|
| regular | free area | 0.9005 ± 0.0052 (-1.2 sigma; chi-square 2.0 on 4) | 0.9070 ± 0.0024 (0.0 sigma; 0.9 on 2; n ≥ 24) | pi/(2 sqrt 3) = 0.9069 |
| regular | radius | 0.9949 ± 0.0033 (-1.5 sigma; 2.1 on 4) | 1.0016 ± 0.0014 (+1.1 sigma; 0.6 on 2) | 1 |
| 3:5:6 | free area | 0.866 ± 0.032 (-0.6 sigma; 1.0 on 1) | 0.8900 ± 0.0061 (+0.8 sigma; 1.4 on 1; k ≥ 5) | 0.8850 |
| 3:5:6 | radius | 0.984 ± 0.020 (-0.8 sigma; 0.9 on 1) | 1.0051 ± 0.0037 (+1.4 sigma; 1.6 on 1) | 1 |
| regular, ring 3 | free area | 0.8758 ± 0.0047 (-6.6 sigma) | 0.8740 ± 0.0022 (-15.0 sigma) | 0.9069 |
| regular, ring 3 | radius | 0.9829 ± 0.0026 (-6.6 sigma) | 0.9822 ± 0.0012 (-15.3 sigma) | 1 |

The rim-connected measurement agrees with the Cohn-Larsen-Propp limit after extrapolation, to about 0.006 in
area and 0.007 in radius on the regular family (the difference between the two forms), and more loosely on the
skewed family, whose three-parameter fit has one degree of freedom. The local ring-3 test on the same tilings
reads closer to the limit at these sizes but extrapolates 6.6 sigma below it, so the analysis that accepts the
global definition rejects the local one; that is the extrapolation's failure control.

The n^(1/3) scale behind the form is assumed by analogy with the Aztec diamond (Johansson 2005), not derived for
the hexagon here. It was probed through the depth of the full and the empty corner along the diagonal of the
column grid: the spread over seeds grows as n to the 0.248 ± 0.030, 2.8 sigma below 1/3. The depths are only 3
to 8 cells at these sizes, so lattice effects are large; this is reported, not a pass criterion, and the nearly
constant shortfall times n^(2/3) is the better support for the form. Two shapes quoted by the tab's hints were
measured the same way outside the calibrated domain (30 seeds each): 11·11·11 reads radius 0.9017 ± 0.0027 and
free area 0.7411 ± 0.0042 against 0.9069, and 48·48·8 reads 0.9093 ± 0.0048 and 0.5911 ± 0.0057 against 0.7079,
where the short side keeps the hexagon small.

**Controls.** The sampler controls of section 3 behave as before. A new one tests the boundary: under the
uniform measure the complement h(i, j) -> c - h(a-1-i, b-1-j) is a symmetry, so the full and the empty corner
have the same expected size; at 24·24·24 over 40 seeds their share difference is -0.0079 ± 0.0063 (-1.3 sigma)
for the sampler as shipped and -0.9831 ± 0.0010 (-940 sigma) under the u^2 update. The self-test over the 2,720
plates has mean z -0.012 and standard deviation 1.003 (pooled p = 0.71).

**The ring control and old recipes.** The key `ring` stays and is now the "Frozen test" control: 0, "Connected
to the rim", is the default and is what the status line's comparison is about; 1 to 4 are the local tests. The
heights do not depend on it, but the "Frozen versus free" coloring and the measured curve do, and the default
moved from 3 to 0, so recipe v4 carries `legacy: { 4: { ring: 3 } }`: a link made before v4 that names no test
reprints with radius 3, as it was made, and one that named a radius keeps it. `node tools/recipe.js` checks the
five cases (90 assertions in all). Among the print fixtures, 36·36·36 (frozen coloring, both curves) now loads as
a v3 link and is held to the independent ball test at radius 3; the other six load as v4 links and are held to
the union-find. All seven pass as in section 5 (SVG within 0.0050 px, PNG maximum channel error 0, shell print
identical to the rasterized reference; a one-pixel shift differs in 295,226 to 1,276,675 channels).

**Status.** Every numerical check passes, every failure control fails, and the print path is checked, so the
record is "validated within stated limits" for its domain: exhaustive uniformity on 2·2·2 to 3·3·3 and the
4·4·4 volume law; the rim-connected arctic measurement and both per-plate bars on regular hexagons 12 to 48 and
the 3:5:6 family from 12·20·24 to 24·40·48; seven print recipes. Within it, a single plate reads below the limit
by a stated finite-size amount and agrees only after extrapolation, the bars are calibrated to the band and
mostly wide, the n^(1/3) scale is assumed, and the print evidence covers one renderer. Lopsided boxes such as
48·48·8 and every other shape are outside the domain.

## Exact finite-size reference (2026-09-26)

The free area no longer needs an extrapolation to be checked: its expectation is now computed exactly for any box, as
sums of gap probabilities of Hahn kernels, in [`research/arctic-finite-size/`](../research/arctic-finite-size/REPORT.md)
(no module change, no new Monte Carlo; the numbers compared are those in `results/lozenge-science.json`).

**Why it is exact.** The frozen rhombi are the extreme level sets of the plane partition and of its two side views
(section "Changed after this review"). On line m of Johansson's non-intersecting walks (PTRF 123 (2002),
arXiv:math/0011250, sec. 4.1) the walks packed against the top wall are exactly the levels k > h(a - m, 0), so

    sum_{m=1}^{a} (gamma_m - Z_m) = #{(i, k) : q(i, k) = 0}

holds tiling by tiling, with Z_m the top hole on line m. The holes on each line carry the Hahn law of his Theorem 4.1.
By the complement symmetry, and permuting the box for the other two views,

    E[free] = 1 - 2 (F(a, c, b) + F(b, a, c) + F(a, b, c)) / (ab + bc + ca),   F(a, b, c) = sum_{m=1}^{a} E[gamma_m - Z_m].

These were checked as follows:

- The identity was checked on all 54,223 plane partitions of six boxes. The hole law was checked line by line, and
  the three counts were checked exactly, on nine boxes including a < b (`check_hahn_small.py`).
- The floating-point pipeline equals an independent exact-rational computation at 2·2·2 to 12·12·12, 3·5·6, 6·10·12
  and 12·20·24 to 3e-16 (`verify_rational.py`).

**The tab against it.** The free area over the 2,720 plates of the limit-shape run, as the mean ± the standard error
over seeds, against the exact expectation for the same box:

| hexagon | seeds | tab (Monte Carlo) | exact | z |
|---|---|---|---|---|
| 12·12·12 | 400 | 0.7516 ± 0.0010 | 0.751050 | +0.51 |
| 16·16·16 | 400 | 0.7799 ± 0.0009 | 0.780027 | -0.12 |
| 20·20·20 | 300 | 0.7991 ± 0.0009 | 0.798522 | +0.71 |
| 24·24·24 | 300 | 0.8119 ± 0.0007 | 0.811495 | +0.59 |
| 32·32·32 | 200 | 0.8277 ± 0.0008 | 0.828713 | -1.26 |
| 40·40·40 | 120 | 0.8392 ± 0.0009 | 0.839787 | -0.64 |
| 48·48·48 | 100 | 0.8473 ± 0.0009 | 0.847603 | -0.33 |
| 12·20·24 | 300 | 0.7605 ± 0.0011 | 0.761329 | -0.71 |
| 15·25·30 | 300 | 0.7786 ± 0.0010 | 0.779168 | -0.52 |
| 18·30·36 | 200 | 0.7929 ± 0.0011 | 0.791711 | +1.07 |
| 24·40·48 | 100 | 0.8082 ± 0.0014 | 0.808405 | -0.13 |

The chi-square is 5.17 on 11 degrees of freedom (p = 0.92), and the largest deviation is 1.26 sigma. **The tab agrees
with the exact finite-size expectation on every box measured.** The reading "about 7 of its own error bars low" is
therefore the finite-size shift and nothing else.

That shift is now known exactly, so the extrapolated comparison in the table above is superseded. Its form is also
biased at these sizes. Fitted to the exact values, the three-parameter model gives:

- Regular hexagons, sides 12 to 48: 0.90360, which is 0.0033 below pi/(2 sqrt 3).
- The 3:5:6 family, k = 4 to 8: 0.88187, which is 0.0032 below 0.88504.

So its agreement with the limit at -1.2 and -0.6 sigma was partly the Monte Carlo scatter offsetting a model bias
of about half an error bar.

**The finite-size law.** The research folder also derives

    free(n) = limit + C n^(-2/3) + d n^(-1) + ...,

with the following constants:

- **Regular hexagon:** C = 2 E[TW2] (3^(4/3)/8) B(5/3, 5/6) 2F1(1/2, 5/3; 5/2; -3) = -0.874179272286...
- **3:5:6 family (n = k):** C = -0.340324241801016, by quadrature.

C is the Tracy-Widom GUE mean E[TW2] = -1.7710868074116 times the edge scale of the top hole on each line, integrated
along the lines. The scale comes from the Hahn recurrence, and the one-line laws check it numerically
(`check_scale.py`).

Fitted to the exact values, which run to side 1,024 and to k = 192, C is -0.87415 ± 0.00027 on the regular family
and -0.34031 ± 0.00013 on 3:5:6. Both agree with the derived constants. The measured -0.81 to -0.79 at sides
12 to 48 is the exact curve at those sizes: the exact deviation times n^(2/3) runs from -0.817 at 12 to a minimum of
-0.781 near side 80, and only then turns back toward -0.874.

What is proved and what is heuristic:

- **Proved:** the identity and the Hahn law.
- **Heuristic:** the expansion. The constant rests on the edge scale, the mean of the edge limit, and uniformity near
  the tangency points; it is checked against the exact values, not proved.

**Not covered.** The printed radius is a sector average of square roots of sector areas. It is not a linear function
of the frozen counts, so its expectation was not computed exactly. The radius comparisons above stand as they were.
The n^(1/3) scale noted as "assumed by analogy" is now derived for these lines and checked against the exact one-line
laws. The 11·11·11 and 48·48·8 hint shapes can be computed with the same code; they were not part of this comparison.

**Proposed module change (not made).** Print the free area against the exact expectation for the box on screen,
instead of against the ellipse with a finite-size note. The expectation takes 2a + b small tridiagonal
eigenproblems (one per line) and Cholesky factorizations of at most about a hundred sites, for sides up to about 64. That is
milliseconds in plain JavaScript, with no table. The comparison would keep the tab's own free-area bar and basis
`sampled`, and the ellipse would stay in the hint as the limit. Every plate would then carry a check that can miss;
today the status line says only that the plate reads low for a finite-size reason.
