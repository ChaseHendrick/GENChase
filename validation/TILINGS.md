# Aperiodic tilings: an exact-geometry review, partially validated

Reviewed 2026-09-23. Status: **partially validated**. Tile geometry in the Penrose P3 (rhombs) and P2
(kite and dart), Ammann–Beenker and dodecagonal modes passes every exact check below, for 68 enumerated
recipes. The print path carries that geometry exactly for 11 recipes. Full status is withheld because
this review found two defects in `src/modules/tilings.js` that it did not change:

- the Penrose P3 matching arcs are not a valid decoration;
- the grout inset moves tiles outward, not inward.

Hat and spectre are measured but lie outside the reviewed domain.

```sh
node tools/build.js
node tools/tilings-science.js --write      # Node only, about a minute
node tools/tilings-print-state.js --write  # needs: npm install --no-save --package-lock=false playwright@1.56.1
```

Results are in [results/tilings-science.json](results/tilings-science.json) and
[results/tilings-print-state.json](results/tilings-print-state.json). Without `--write` both commands check the
same assertions without replacing the evidence.

## What is tested, and against what

The module's own code makes every tile. `tools/tilings-geometry.js` loads `tilings.js` from disk with read-only
hooks and the engine's `makeRng`, so the seeded crop and the multigrid offsets are the studio's own. That file
then judges the output with predicates that do not reuse any of the module's geometry. A count or a ratio the
module computes itself is never taken as evidence: tiles are classified by their own side lengths and angles.

- **Substitution, exactly.** The ten-triangle sun wheel is deflated 1 to 10 times with culling switched off.
  Robinson triangles are classified by their side ratios (1/φ acute, φ obtuse), and the counts must equal the
  Fibonacci recurrence of the substitution: 10F(2k−1) thin and 10F(2k) thick halves for P3, 10F(2k+1) kite and
  10F(2k) dart halves for P2. The halves must cover the decagon exactly: zero T-junctions, every boundary
  edge on the decagon, winding one, and area within 1e-12. The half-tiles left unpaired must be exactly
  those whose glue edge lies on the decagon.
- **Single coverage.** Every tile must be simple and counter-clockwise. Tile boundaries, split at any vertex
  lying on an edge, form an oriented 1-chain. Interior edges must cancel in pairs, and no directed edge may
  repeat. The number of tiles over a point then equals the winding number of what is left. A view that this
  boundary avoids, with winding one about its centre, is therefore covered exactly once. As a separate
  check, tile areas clipped to the view must sum to its area within 1e-9. This is an exact identity, not
  a sampled one.
- **Penrose legality, P3.** Each vertex is lifted to Z^5 along its edges; the lift must be path-independent
  and reproduce every position. De Bruijn's cut-and-project theorem then requires every vertex of a Penrose
  rhomb tiling to have an index in four consecutive values. Its internal coordinate must lie in the
  pentagon for that index: the projection of the unit-cube slice. A linear programme finds the best window
  shift, and the largest remaining violation must be at most 1e-9. The vertex census must lie inside the
  census of an independently written de Bruijn pentagrid with sum γ = 0.
- **Penrose legality, P2.** The census must consist of Conway's seven vertex stars, identified by kite and
  dart composition: sun (5, 0), star (0, 5), ace (2, 1), deuce (2, 2), jack (3, 2), queen (4, 1) and
  king (2, 3). The two-colour vertex rule must hold at every vertex: kite sides, dart tips and dart notches
  in one class; kite tips, kite tails and dart sides in the other. No kite may sit in a dart's notch.
  The module's arcs must continue across every shared edge, in position and in family.
- **Ammann–Beenker.** The same lift-and-window test in Z^4 with the octagonal window, and a census inside
  that of an independent dual 4-grid.
- **De Bruijn duality (AB and dodecagonal).** The rendered tile set must equal an independent construction
  that solves each pair of grid lines directly, using the module's offsets. Over the unculled disk, the
  tiles for each pair of line families must equal an independent lattice-point count. Those counts must lie
  inside rigorous bounds whose ratios contain √2, or √3 and 1.
- **Completeness and hierarchy (P3, P2).** Every tile of the unculled deflation that meets the view must be
  rendered, and every rendered tile must be in it. Inflation-level segments must have length φ^k, and
  their in-view endpoints must be tile vertices.

The criteria were fixed before any result was inspected. Two missed, and both are recorded below with their
causes. Neither has been loosened.

## Results

### The whole sun wheel

All twenty rows are exact, with no label, T-junction, repeated-edge or off-decagon defect.

| k | P3 thin | P3 thick | P2 kite | P2 dart |
|---|---:|---:|---:|---:|
| 1 | 10 | 10 | 20 | 10 |
| 2 | 20 | 30 | 50 | 30 |
| 3 | 50 | 80 | 130 | 80 |
| 4 | 130 | 210 | 340 | 210 |
| 5 | 340 | 550 | 890 | 550 |
| 6 | 890 | 1,440 | 2,330 | 1,440 |
| 7 | 2,330 | 3,770 | 6,100 | 3,770 |
| 8 | 6,100 | 9,870 | 15,970 | 9,870 |
| 9 | 15,970 | 25,840 | 41,810 | 25,840 |
| 10 | 41,810 | 67,650 | 109,460 | 67,650 |

Counts are exact, with no sampling error. At k = 10 the thick:thin ratio is within 2.6e-8 of φ, and
kite:dart within 9.8e-9. The largest area error over all twenty rows is 7.7e-13. At k = 10 the 340 unpaired
P3 halves and the 400 unpaired P2 halves are exactly those with a glue edge on the decagon. The glued
tilings hold 54,560 and 88,355 whole tiles, all congruent to their labelled prototiles.

### Rendered recipes

There are 68 recipes: the eight Penrose, Ammann–Beenker and dodecagonal presets at four seeds each, plus
one sweep recipe per mode and depth, from 1 to 9. The sweep covers zoom 0.3 to 4, several rotations, pans
up to ±3 and all five aspects. Together they hold 1,036,735 tiles. All pass every gating criterion.

| Mode | Recipes | Tiles | Shared edges | Largest window violation | Vertex classes |
|---|---:|---:|---:|---:|---|
| P3 | 25 | 274,019 | 542,129 | −0.00155 | 7 geometric, 8 with index class; all in the pentagrid reference |
| P2 | 17 | 362,212 | 720,524 | — | exactly Conway's seven |
| AB | 13 | 197,277 | 391,850 | −0.00043 | 6, all in the dual 4-grid reference |
| Dodecagonal | 13 | 203,227 | 403,806 | −0.0177 | 53 distinct (descriptive) |

A negative window violation means some shift leaves every vertex strictly inside its window. The views are
covered exactly once, with the clipped-area error at most 1.2e-12. Merged vertex copies lie within 3.8e-13
of each other, and no two distinct vertices are closer than 0.5 edge. The independent references are a
pentagrid of 21,775 tiles (window −0.0066) and a dual 4-grid of 24,266 tiles (window −0.0025). They have 7
geometric P3 classes (8 when the vertex's index class, small or large pentagon, is included) and 6 AB
classes. These agree with the counts usually quoted: eight decorated rhomb vertex types, two of which look
identical without markings, and six Ammann–Beenker types. The review's reference, though, is the
independent construction, not the literature count.

The P2 recipes show zero colour violations and zero kite–dart rhombi. The module's P2 arcs meet on all
720,524 shared edges, in position within 3.1e-13 and in family. For the 40 Penrose recipes that need at most
13 deflation levels, all 357,392 unculled tiles meeting the view are rendered, and nothing else is. In 42
recipes, all 782,547 inflation-level segments have their exact lengths, and all 1,270,661 in-view endpoints
are tile vertices. The two recipes that need 14 levels were not run against the full deflation.

The multigrid replay matches the independent construction on all 400,504 rendered tiles. In the unculled
disks, all 821,277 tiles in 273 family pairs equal their lattice-point counts. The largest disks give:

- **Ammann–Beenker** (radius 106.3): 100,369 rhombs and 70,960 squares, ratio 1.41444 against √2 = 1.41421.
  The rigorous interval is [1.310, 1.525].
- **Dodecagonal** (radius 72.2): 49,113 30° rhombs, 85,081 60° rhombs and 49,133 squares. The 60°:30° ratio
  is 1.73235 against √3 = 1.73205 (interval [1.475, 2.042]), and square:30° is 1.00041 (interval [0.866, 1.160]).

These are exact finite counts. The intervals are rigorous but loose; the sharp statement is the equality
with the lattice counts. Ammann–Beenker inflation, with its Pell-number counts, is not what the module
computes, so it is not tested.

### Failure controls

| Control | Result |
|---|---|
| Thick half split at 0.6 instead of 1/φ | Still a gap-free tiling, but from k = 2 on, 30 to 320 halves per level are unclassifiable; the rendered recipe fails shape, census and window checks |
| Thin child with B and C exchanged (P3) | From k = 2 on, 10 to 60 T-junctions per level; the view is not covered once |
| Kite child with B and C exchanged (P2) | Unpaired halves away from the decagon from k = 1; the view is not covered once; colour violations |
| One thick child labelled thin | Label and shape mismatches, T-junctions |
| Thin child of a thick half dropped | Area deficit up to 46%; boundary off the decagon |
| Multigrid offsets taken from the next family | 759 (AB) and 1,157 (dodecagonal) repeated directed edges, i.e. overlaps; window 0.207 and 0.492; replay mismatches |
| Kite arc radii exchanged | 2,909 arc mismatches |
| One P3 phason flip | Still a valid tiling, but the window moves from −0.0147 to +0.0312, 3 illegal vertex stars appear and 8 reference arcs break |
| One AB phason flip | Still a valid tiling; the window moves from −0.0061 to +0.0104 |
| Pentagrid with sum γ = 0.33 | A valid rhomb tiling that is not Penrose: index span 5, and 8 of its 15 vertex classes outside the reference |

The phason flips matter most. Each leaves a valid tiling that the coverage checks accept, and only the
legality predicates see it. A dodecagonal flip leaves the window unchanged: there, the internal-space test is
only a necessary condition. The dodecagonal claim therefore rests on the exact replay, the tiling check and
the lattice counts. It claims duality, not a matching rule.

## Defects found

### Penrose P3 arcs (src/modules/tilings.js:31)

`ARCS.p3` puts the thin rhomb's two arcs around its 36° corners, both in family 0. The module's P3 tilings
are legal: the window and census show it. Yet on them, 127,405 of 542,129 shared edges, across all 25 P3
recipes, join a family-0 arc to a family-1 arc. In the arcs preset at the default seed it is 1,539 of 6,567.
Every crossing point matches in position, so the curves are unbroken. They change colour at those edges,
and on thin rhombs they join the wrong pairs of crossings. This contradicts the module's comment ("verified
to join across every shared edge") and its hint that the arcs continue across every edge of a legal tiling.

Keeping the module's thick-rhomb arcs, and moving the thin arcs to the obtuse corners with one arc per
family, gives zero mismatches on all 542,129 edges. The review uses that decoration as its reference:
`{ c: [1, 3], r: [IPHI, IPHI], f: [0, 1] }`. P3 legality here therefore rests on the window, the census and
the reference decoration, not on the arcs as drawn. The P2 arcs are correct.

### Grout inset (src/modules/tilings.js:626)

`insetPoly` offsets along the left normal `(-uy, ux)` of each edge. The print maps `y` to `oy - y sc`, which
makes every tile clockwise on the page, so the left normal points outward. "Gap inset (grout)" therefore
enlarges each tile by the inset distance, and neighbours overlap instead of leaving grout.

The printed fill polygons cover more than the page: 1.060 for rhombs (inset 0.012), 1.134 for kitedart
(0.02), 1.078 for ammann (0.016), 1.102 for dodeca (0.02) and 1.262 for kilnfloor (0.05). The kilnfloor
preset, meant to show wide grout, shows none. The same recipe with the inset at 0 covers the page
1.0000000 times. The criterion as fixed, polygons inset inward within 0.005 px, misses in all 7 recipes with
an inset. The SVG polygons equal the validated tiles offset *outward*, within 0.005 px. This is a
presentation defect, not a change to the tiling. It still means the default and most preset prints do not
show the tiles' own edges.

### Not a defect: engine rounding

Node v22.22.2 rounds `Math.sin(19π/10)` to −0.3090169943749476, and Chromium 141 to −0.3090169943749477.
This is one of the sun-wheel values. The deflation carries the last bit into descendant vertices. In five P3
print recipes, up to 1,696 coordinate words differ between the browser and Node models, by at most
7.1e-15. Integer tile data are identical, and the browser model passes the tiling predicates itself. The
print harness probes this directly and records it as a miss against its word-identity criterion. Seeds do
not promise identical bits across JavaScript engines.

## Print evidence

The harness opens `dist/studio.html` in Chromium 141 (SwiftShader) and re-registers the module with read-only
snapshot hooks. It covers 11 recipes: the eight presets at seed penrose-1974, the rhombs preset with the inset
at 0, and two rotated, panned, non-square sweep recipes. For each recipe:

- two regenerations are identical;
- `exportPNG` at 2400 px on the longest edge gives exactly the requested size (2400x2400, 1920x2400,
  2400x1920 or 2400x1600), nonblank, with every pixel finite;
- a second export is pixel-identical;
- no model word or setting changes across any export.

`exportSVG` is compared with geometry recomputed in Node from the Node model, which passes the numerical
tiling predicates:

- 60,760 fill-polygon and 40,440 outline vertices;
- 44,321 line-work edges, compared as a set;
- 11,955 inflation-level segments;
- 6,734 arc endpoints and radii.

The largest coordinate error is 0.0049995 px, inside the 0.005 px of the two-decimal output. In every recipe,
three failure controls are rejected: a PNG 1 px narrower, a post-export change to one vertex word and one
tile type, and one expected SVG vertex moved 0.02 px.

The arcs preset prints exactly the decoration the module specifies, which is the defective one above. PNG
pixels are not compared with the geometry. Colour, jitter and grain are presentation, not measurement.

## Hat and spectre: outside the domain

Every hat and spectre tile is an isometric copy of the module's own prototile: the 13-gon hat, or the
14-vertex equilateral spectre polygon. Each supertile is covered exactly once, with one boundary loop and no
repeated edge.

- **Hat.** For depths 1 to 6, the supertile holds 4, 25, 169, 1,156, 7,921 and 54,289 hats, of which 1, 3,
  22, 147, 1,009 and 6,912 are reflected. The unreflected count at each depth equals the reflected count at
  the next. At depth 6 the ratio is 47,377:6,912 = 6.8543.
- **Spectre.** Each patch has one handedness. It alternates with depth because every level applies a
  reflection.

No published frequency, substitution matrix or legality reference was checked. These are measurements, not
validation.

## Limits

- The domain is the enumerated recipes in the results, and all Penrose patches are crops of the sun-centred
  tiling. Legality is shown per finite patch, not for arbitrary Penrose tilings.
- The P3 arcs and the grout inset are defective. Correcting `ARCS.p3` for the thin rhomb and the sign of the
  offset in `insetPoly`, then re-running both harnesses, is the path to full status.
- Everything runs in JavaScript binary64, in one Node and one Chromium build, on a software renderer. Vertex
  identity uses 1e-7 edge units; angles and lengths use 1e-9.
- The label is a repository review, not external certification.
