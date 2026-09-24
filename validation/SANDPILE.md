# Abelian sandpile: exact benchmarks and print review

Tab `sandpile` in `src/modules/lattice.js` (the rotor-router tab `rotor` in `sandpile.js` is separate and
not covered). Reviewed 2026-09-24 with `node tools/sandpile-science.js --write`; results in
[results/sandpile-science.json](results/sandpile-science.json).

The tool loads the real module in Node (through `tools/lib/lattice-harness.js`, in the pattern of
`tools/ust-review.js`) and calls the tab's own `makeGridToppler()`, `makeOctantPile()` and its identity and
random-drop jobs. The only edit to the running module is an odometer side channel (`hooks.odo[p] += t` after
each toppling), and every result obtained with it is also reproduced with the unedited code. Every
comparison below is an exact integer comparison: there is no sampling error and no tolerance.

## References

- D. Dhar, Phys. Rev. Lett. 64, 1613 (1990): toppling operators commute, so the stabilized configuration and
  the number of topplings at each site do not depend on the order of toppling; the recurrent configurations
  form an abelian group whose order is the determinant of the toppling matrix, which by Kirchhoff's
  matrix-tree theorem is the number of spanning trees of the graph with the sink.
- P. Bak, C. Tang and K. Wiesenfeld, Phys. Rev. Lett. 59, 381 (1987): the model and the random-drop experiment.
- The identity formula the tab uses, e = (2m - (2m)°)° with m the all-3 configuration, is checked here by
  its defining properties rather than taken on trust.

The tab's model: an n x n grid, every site has four toppling neighbors, and boundary sites lose to a sink
the grains that would leave the grid (two at a corner, one on an edge). The toppling matrix is therefore
`4I - A` with A the grid adjacency. The tab topples `floor(h/4)` times at once from a LIFO stack.

## 1. Abelian property

100 seeded configurations on 8x8, 16x16, 32x32 and 64x64 grids (uniform heights 0 to 7 and 0 to 15, all 6,
and a pile of 4n^2 grains on one random site over random 0 to 3) were stabilized in five orders:

1. the tab's toppler as it runs (`seedAll`, LIFO);
2. the tab's toppler fed the unstable sites in a seeded random order;
3. the tab's toppler interrupted every 4096 pops and resumed, as the UI does between frames;
4. an independent FIFO queue that topples one grain-quartet per visit;
5. an independent synchronous update in which every unstable site topples once per round.

All five final configurations and all five odometers (topplings per site) are identical for every
configuration, and each satisfies `h_final = h_initial - (4I - A) u` exactly. The unedited toppler gives the
same final states as the instrumented one.

**Failure control.** A toppling rule that empties the site and sends the grains above `4t` to its first
neighbor (left, else right, up, down) conserves grains but depends on the height at toppling time. Run in
the tab's own two orders (1 and 2) it gave different final configurations on 80 of the 100 configurations,
at every grid size: all 80 that start with more than one unstable site. The 20 single-pile configurations
start with one unstable site, where the two tab orders coincide, so this control cannot separate them there.
Its odometers also violate `h_final = h_initial - (4I - A) u` on all 100.

## 2. Dhar's theorem

On the 1x1, 2x2 and 3x3 grids every stable configuration (heights 0 to 3) was enumerated and the recurrent
ones were identified three ways:

- the definition: closed communicating classes of the add-one-grain-and-stabilize chain, built with the
  tab's own toppler (Tarjan's algorithm on 4^(n^2) states and n^2 transitions each);
- Dhar's burning test, written independently of the toppler;
- `(c + e)° = c`, with `e` produced by the tab's own identity job at that size and the tab's toppler.

| Grid | Stable | Recurrent (all three tests, identical sets) | det(4I - A), BigInt | Spanning trees, enumerated |
|---|---|---|---|---|
| 1x1 | 4 | 4 | 4 | 4 |
| 2x2 | 256 | 192 | 192 | 192 |
| 3x3 | 262,144 | 100,352 | 100,352 | 100,352 |

The determinant is computed by fraction-free (Bareiss) elimination in BigInt. The spanning trees of the
grid plus a sink vertex (with parallel edges to corner sites) are counted by exhaustive search over edge
subsets, which uses no determinant. Exact, no sampling error.

**Failure control.** The same count with the toppling threshold set to five (five grains removed per
toppling: four to the neighbors and one lost) gives 5 recurrent configurations on 1x1 and 525 on 2x2, not 4
and 192. These equal det(5I - A), Dhar's count for the modified toppling matrix, which shows that the
counting machinery is right and that the failure is the threshold.

A threshold raised to five while still removing four grains is not caught by the count: that model is the
ordinary sandpile shifted up by one grain, and it has 4 and 192 recurrent configurations. It is caught by
the stability range: 1 of its 4 and 147 of its 192 recurrent configurations hold a height of 4, which the
tab's range 0 to 3 excludes and which every stabilization in sections 1 to 3 asserts against. This is
recorded as a limit of the count, not hidden.

## 3. The identity

At every grid the UI offers (64, 96, 128, 192, 256) the tab's identity plate:

- equals an independent computation of `(2m - (2m)°)°` with the FIFO reference;
- equals `(4I - A)(u1 - u2)` exactly, where `u1` and `u2` are the reference odometers of the two
  stabilizations, so it lies in the image of the toppling matrix (the class of the zero configuration); the
  tab's own odometer equals `u1 + u2` site by site;
- is recurrent by the burning test; since each class contains exactly one recurrent configuration, these two
  facts identify it as the group identity;
- is invariant under the eight symmetries of the square, and `(e + e)° = e`;
- satisfies `(c + e)° = c` for seeded recurrent configurations `c` (three at 64 to 128, one at 192 and 256).

**Failure control.** `(2m)°`, the configuration after the first stabilization only, is recurrent but is not
the identity; `(c + (2m)°)°` differs from `c` in every test.

## 4. Single-source pile (the default plate)

The tab computes one octant of the pile and folds the other seven in by symmetry, truncating at
`R = ceil(0.4 sqrt(N)) + 6`. For 2^12, 2^14 and 2^16 grains the folded pile equals a full-plane FIFO
reference cell by cell (5,625, 17,689 and 62,001 cells, including a margin beyond R). At all six menu counts
(2^12, 2^14, 2^16, 2^17, 2^18, 2^20) the octant conserves every grain and the pile stops short of the
truncation radius (at 2^20: extent 373, R = 416), so no grain is lost to the truncation.

## 5. Random drops

For the "Random drops" preset (128x128, 30,000 drops, seed `btw-1987`) and a 192x192 run with 50,000 drops,
the draws are replayed from the engine's generator. The tab's heights after 30,000 (50,000) separate
avalanches equal one batch relaxation of all the grains at once, which is the abelian property at the scale
of a plate. Its avalanche marks (the last drop that toppled each site, which the avalanche views paint) equal
a drop-by-drop FIFO reference, and its total topplings equal the reference's.

## 6. Print

Six recipes, all with grain off, at 2400 x 2400 (8 in at 300 ppi): the default medallion 2^16 (kiln), the
2^14 preset (ink), identity 128 and 96, random drops (recent-avalanche view) and avalanche patches. For each,
the studio state read back through `auditRead()` equals the independent state (full-plane pile, reference
identity, replayed drops), and every pixel of the tab's own `exportPNG()` is compared with colors computed
from that independent state with the tab's documented color rule. Maximum channel error: 0 on every recipe.
Exporting leaves the recipe and the complete state unchanged.

Chromium's nearest-neighbor scaler resolves the sample position in fixed point, so an output pixel whose
sample point lies within 0.01 cell of a cell boundary may show the neighboring cell (a positional error under
0.01 cell, at most a quarter of an output pixel for these recipes, whose cells are 12 to 25 pixels wide). Those pixels are counted separately and must equal one of the two
cells at that boundary; all did. Controls: the picture shifted by one output pixel, and the picture of a
wrong state (every height moved up a level and every avalanche mark one drop later), both fail on tens of
thousands to millions of pixels.

## Findings about the module

- The status line's "topplings", and the random-drop "largest avalanche" and "mean", count toppling events
  of `floor(h/4)` topplings at once, not topplings. The count was below the true number of topplings on all
  100 abelian-test configurations; for the plates the difference is small (random drops preset: 11,709,876
  events for 11,709,974 topplings; identity 256: 754,842,050 for 768,652,112). It depends on the toppling
  order, so these numbers are not the order-independent avalanche sizes of the literature. Nothing in the
  plates depends on them.
- No error was found in the toppling, the identity, the octant folding or the random drops.

## Domain and limits

- Grid: square n x n with the sink boundary, as the tab implements it. Exhaustive Dhar counts only on
  n <= 3; the identity at the five UI sizes; the abelian property on 100 configurations up to 64x64.
- Single source: the six menu grain counts, full-plane cell comparison up to 2^16.
- Random drops: the two recipes above. Avalanche-size statistics and self-organized criticality exponents
  are not tested; the tab does not print them against theory.
- Prints: the six recipes above, raster PNG through Chromium; other renderers are not covered.
- Precision: integer heights (Int32 and exact Float64 integers), BigInt determinants, RGBA8 raster.
- Runtime on the review machine: 385 s, single-threaded, while other jobs shared the machine.

```sh
node tools/sandpile-science.js --write
```
