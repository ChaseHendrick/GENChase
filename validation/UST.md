# Spanning-tree numerical and print review

The finite completion domain covers Wilson sampling on the enumerated small graphs
and the six actual studio recipes in [ust-review.json](results/ust-review.json).
The source is [Wilson (1996), Figure 1 and Theorem 1](https://sites.math.rutgers.edu/~zeilberg/akherim/WilsonSpanningTree.pdf),
checked on 2026-09-22. Its ideal algorithm uses independent random successors and
samples the weighted tree distribution. Uniform undirected edges give uniform
spanning trees. Expected runtime depends on commute times and root selection;
there is no unconditional fixed-root mean-hitting-time claim.

The implementation's finite seeded generator does not prove literal uniformity
across all possible seed strings. Its UI now distinguishes the theorem from the
measured pseudorandom implementation. The review does not certify SLE scaling.

## Numerical evidence

An independent implementation stores an explicit walk and deletes each loop
chronologically. It does not reuse the production last-exit-arrow method. On every
full recipe, all parent pointers and accepted walk counts match exactly using the
same deterministic random stream. Independent graph traversal checks adjacency,
connectivity, absence of cycles, every vertex depth, maximum depth, and the entire
highlighted path. Forced scheduler chunking must leave the result unchanged.
A deliberately corrupted root/parent cycle must be rejected.

Exhaustive edge-subset enumeration gives 4 trees on a 2 by 2 rectangle, 15 on
2 by 3, 192 on 3 by 3, and 11,664 on a 3 by 3 torus. Across 12,000/24,000/24,000/
24,000 fixed-seed samples, the test compares every tree frequency and every edge
marginal to those exact counts. It records a simultaneous Hoeffding bound with
alpha=0.001 for each graph. The probability interpretation assumes independent
sampling; these deterministic PRNG regressions do not establish that assumption.
A biased successor generator must differ from the 2 by 2 distribution by over
0.05, detecting a sampler that merely constructs valid trees without sampling
uniformly.

## Actual prints

Six recipes use grids 24 by 24, 32 by 40, 40 by 32, 28 by 28, 48 by 48, and
32 by 40. They cover rectangular/torus boundaries, center/corner/random roots,
and Tree, Depth, Path, and Maze views. Full effective settings and seeds are saved.
Grain is off. Native exports are 2400 by 2400, 1920 by 2400, or 2400 by 1920.

Independent geometry is reconstructed from parent pairs and breadth-first depths,
including split wrapped edges, complement maze walls, path segments, stroke widths,
root/endpoint marks, and linear-light colors. Every actual PNG byte is compared
with independently painted geometry (maximum allowed error one byte; measured zero).
Every SVG coordinate must agree within 0.00501 pixel, its declared rounding precision;
all colors, group counts, and line caps are checked. Displaced pixels must fail.
The numerical state and recipe must remain exactly unchanged after export.

Other grids, extreme weights/finishes, random-generator quality beyond these samples,
other rendering engines, and continuum scaling are not covered by this completed label.

```sh
node tools/ust-review.js --write
```
