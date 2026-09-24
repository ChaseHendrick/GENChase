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
