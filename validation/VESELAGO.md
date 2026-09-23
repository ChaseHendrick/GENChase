# Veselago lens: ray trace and print review

The tab traces geometric rays from a point source on the axis through a flat slab of index `n < 0`, with vacuum on
both sides. The rays are launched over ±0.45 rad, splatted into a Float32 field and printed as a nearest-neighbour
magnification of that field. The status line reports the brightest point behind the slab as `Δx/W` against
`2L − d`. It prints "Veselago focus" when `|Δx/W| < 0.12` and "shifted" otherwise. Here `L` is the slab thickness
and `d` is the source distance.

**Status: partially validated.** Every ray the module draws agrees with an independent Snell trace over the slider
domain. The print reproduces the field exactly. Two unfixed defects in `src/modules/veselago.js` block full
validation: the status label claims a focus where none exists, and an exit segment is drawn backwards when the slab
runs off the plate. This review did not change the module.

At `n = −1` perfect refocusing is a geometric identity of the flat slab: every ray crosses the axis at `slab0 + d`
inside the slab and again at `slab0 + 2L − d` behind it. Those checks are regression checks, not predictions. The
evidence that the refraction is right comes from the `n ≠ −1` fixtures and the failure controls.

## Numerical evidence

Run `node tools/veselago-science.js --write` for the [results](results/veselago-science.json). The module runs
headless through `tools/science-harness.js`. Read-only hooks record each ray's launch angle, segment start, slope
and end vertex, each dropped ray, the field, the peak and the status line.

The reference is written from scratch. It uses vector Snell refraction at each face: the tangential wavevector is
continuous (`n1 sin θ1 = n2 sin θ2`), so a negative `n2` puts the refracted ray on the incident side of the normal,
and energy still leaves the interface. It then intersects each ray with the faces, the axis and the last drawn
column. For `n ≠ −1` it adds the closed-form flat-slab crossing `L|tan θ2|/|tan θ| − d` behind the back face, whose
paraxial limit is `L/|n| − d`. The acceptance criteria were fixed in the harness before the first run.

| Check | Criterion | Measured |
|---|---|---|
| Sweep: 59,200 configurations (37 slider `n` values, 5 `L`, 5 `d`, 4 ray counts, 4 grids, 4 aspects). The 56,832 whose back face lies on the plate carry 2,152,704 rays | Entry, exit and end vertices, axis crossings and layout within 1e-9 px | Vertices 9.66e-13 px, crossings 3.98e-12 px, layout 0; no missing, extra or nonfinite ray |
| 2,931 seeded continuous configurations, `n` −2.2 to −0.44, 110,460 rays | Same | Vertices 2.84e-13 px, crossings 2.61e-12 px |
| Ink: lit cells against the traced rays | Zero cells more than half a cell from every traced ray; each segment inks ≥ 70% of its eligible columns | 0 stray cells in 177,546,255 lit; minimum coverage 0.857 over 6,375,772 segments |
| Total reflection | Module drops exactly the rays with no transmitted ray | Identical sets. Only slider value −0.40 drops rays: 6,912 rays in 1,536 sweep configurations |
| `n = −1` images, 4,440 layouts, 113,152 rays | Crossings within 1e-9 px of `slab0 + d` and `slab0 + 2L − d`; none behind the slab when `d > L` | 1.98e-12 and 3.24e-12 px; 0 crossings behind in 1,008 virtual-image layouts |
| `n = −1` metric, 2,412 layouts with `L − d ≥ 5` and image at or before `W − 5` | Brightest point within 2.5 px of `slab0 + 2L − d`; recorded peak equals the independent window maximum | Within 1 px on 1,908 even-height plates and 1.998 px on 504 odd-height plates; peak value equal in all |

At the default slab (`L` 48, `d` 24, 28 rays, grid 192, 1:1), with distances in cells behind the back face:

| n | Paraxial `L/|n| − d` | Innermost ray | Marginal ray | Spread | Brightest point | `Δx/W` | Label |
|---|---|---|---|---|---|---|---|
| −1 | 24 | 24 | 24 | 0 | 23.09 | −0.0047 | Veselago focus |
| −0.8 | 36 | 36.0047 | 40.3732 | 4.37 | 38.15 | 0.0737 | Veselago focus |
| −1.2 | 16 | 15.9983 | 14.6460 | 1.35 | 14.06 | −0.0518 | Veselago focus |
| −1.5 | 8 | 7.9975 | 6.1079 | 1.89 | 6.02 | −0.0936 | Veselago focus |
| −2.2 | −2.18 | −2.18 | −3.96 | no real crossing | 2.01 | −0.1145 | Veselago focus |
| −0.4 | 96 | 96.09 | 289.89 | 193.80 | 87.34 | 0.3299 | shifted |
| +1.5 | none | — | — | no crossing | 2.01 | −0.1145 | Veselago focus |

The module's crossings agree with the closed form within 4.83e-13 px. The innermost ray lies within twice the
third-order term of the paraxial image; at `n = −0.8`, for example, the gap is 0.00469 against a bound of 0.00937.
The aberration has the sign of `1/n² − 1`: marginal rays cross farther away for `|n| < 1` and nearer for `|n| > 1`.
At `n` −0.8, −1.2 and −1.5, the brightest point lies inside the crossing range ± 2.5 px. At `n = −2.2` the rays
cross the axis neither inside the slab nor behind it. The −2.2 row therefore gives each line's crossing extended
back towards the slab. There is no real image.

### Failure controls

- `n = +1` (a matched ordinary medium): the trace still matches the reference, but no ray crosses the axis behind
  the slab, and the brightest point is 21.99 px from `2L − d`. Both image predicates reject it.
- Wrong-sign refraction (`sin θ2 = −sin θ / n`): vertex errors of 46.37 px at `n = −1` and 29.09 to 62.19 px at
  `n` −0.8, −1.2 and −1.5. Rejected at every tested `n`.
- An exit ray that keeps the slab angle: vertex errors of 73.55 to 99.30 px. Rejected at every tested `n`.
- An inverted index ratio (`sin θ2 = n sin θ`) gives the same rays as the module at `n = −1`, because `1/n = n`
  there. It is rejected at `n` −0.8, −1.2 and −1.5 (10.70 to 26.78 px). This is why the `n = −1` checks alone are
  not evidence.
- The `n = −1.2` preset's brightest point is 9.94 px from `2L − d`, so it fails the 2.5 px image predicate.

### Limits and defects found

- **Status label (veselago.js:132).** The label compares `|Δx/W|` with 0.12, which is 23.04 px at grid 192. At the
  default slab, 30 of the 37 slider values read "Veselago focus". For `n` −2.20 to −2.00 no ray crosses the axis
  behind the slab at all. From −1.95 to −1.75 some crossings fall outside the search window. Across the whole
  in-domain sweep, 11,829 of the 16,468 configurations with no real image behind the slab are labelled "Veselago
  focus". So are `n = +1` and `+1.5`, which lie outside the schema. On the `n = −1.2` preset the label claims the
  textbook point, while the module's own hint says other `n` focus elsewhere. The label is not validated, and this
  defect blocks full validation. The `Δx/W` number itself is a real measurement of the brightest point.
- **Exit segment drawn backwards (veselago.js:79–82).** When `x0 + d + L > W − 2`, the exit segment runs from the
  back face back to `W − 2`, with `steps = max(4, …)` samples. It inks cells that no ray reaches. This happens only
  at grid 128 (1,776 sweep configurations) and grid 144 (592). Of those 2,368, 1,767 carry stray ink, 24,214 cells
  in all. Example: `n = −2.2`, `L` 64, `d` 50, grid 128, where the back face is at 136.86 against a last column of
  126. The domain excludes these plates, and the defect blocks full validation.
- **Total reflection (veselago.js:74).** At `n = −0.40`, rays with `|sin θ| > 0.4` (critical angle 0.411517 rad)
  are skipped entirely, including their incident segment: 2 of 12, 4 of 28, 6 of 48 and 6 of 64 rays. No other
  slider value drops rays. Nothing on the plate or status line says so. No Fresnel reflection is drawn anywhere; the
  plate shows transmitted rays only.
- **Slope clamp (veselago.js:83).** The clamp `max(0.05, cos θ2)` never acts at a slider `n`, for any ray count
  from 12 to 64. A URL hash can set `n` between −0.43497 and −0.4. At `n = −0.43527`, 2 near-grazing rays are
  clamped, with a 322.85 px vertex error. Outside the domain.
- The model is geometric optics only. It has no wave optics and no evanescent-wave amplification (Pendry), no
  absorption, dispersion or diffraction. It does not simulate a metamaterial.

## Print evidence

Run `node tools/veselago-print-state.js --write` (setup: `npm install --no-save --package-lock=false
playwright@1.56.1`) for the [results](results/veselago-print-state.json). The harness uses the actual module in
`dist/studio.html` (Chromium 141.0.7390.37, SwiftShader, Playwright 1.56.1) at seed `veselago-1968`.

In every fixture, the browser field is word-for-word identical to the module run in Node, with the same metric. A
second regenerate is identical, and a different seed gives the same field, because the module never draws from its
generator. exportPNG leaves the field, metric, cells, buffer and settings unchanged. The print has the exact
requested size. Every print pixel equals the paint-buffer cell that contains its centre, with zero mismatches.
Every empty field cell has one colour, and no other colour appears where the field is empty. No lit cell is
indistinguishable from the background. Every lit cell lies on a ray of the independent Snell trace.

| Fixture | Cells | Print | Pixels compared | Lit cells | Brightest cells vs `slab0 + 2L − d` |
|---|---|---|---|---|---|
| perfect (`n` −1, `L` 48, `d` 24) | 192x192 | 2400x2400 | 5,760,000 | 2,714 | 0.64 px |
| shallow (−1, 28, 16) | 192x192 | 2400x2400 | 5,760,000 | 3,088 | 1.44 px |
| deep (−1, 64, 20) | 192x192 | 2400x2400 | 5,760,000 | 2,742 | 0.96 px |
| n12 (−1.2, 48, 24) | 192x192 | 2400x2400 | 5,760,000 | 2,714 | not applied (9.64 px) |
| many (48 rays) | 192x192 | 2400x2400 | 5,760,000 | 3,300 | 0.64 px |
| log (log view) | 192x192 | 2400x2400 | 5,760,000 | 2,714 | 0.64 px |
| wide (16:9, grid 144, −1, 40, 20) | 144x81 | 2400x1350 | 3,240,000 | 1,638 | not applied: axis on a cell boundary |
| portrait (4:5, grid 224, −1.5, 60, 18) | 224x280 | 1920x2400 | 4,608,000 | 3,763 | not applied |
| tir (5:4, grid 160, −0.4, 30, 12, 64 rays) | 160x128 | 2400x1920 | 4,608,000 | 4,465 | not applied; 6 rays removed |

The brightest cells lie exactly on the axis wherever the check applies. At 2400/192 there are 96 print columns and
96 rows whose centres fall exactly on a cell boundary. The renderer does not break those ties the same way every
time. On the perfect fixture, 2,448 tie pixels took the right-hand cell and 5,448 the left-hand one. The criterion,
fixed before the run, accepts either cell. On the 16:9 fixture the plate height is odd, so the image splits
over two rows and the source cell ties it for brightest. That fixture was excluded from the brightest-cell check
before the run.

The two failure controls, a PNG requested 1 px narrower and a post-export change to one field word and the metric,
are each rejected by the one predicate they target. Every other check still passes.

veselago has no exportSVG. The print is a raster magnification of a field of 128 to 224 cells across, so it adds
pixels, not resolved rays. Colour is not calibrated.

## What would complete the review

Fix the label so it claims a focus only when rays cross the axis behind the slab. It should compare against the
paraxial image `L/|n| − d` or use a pixel-scale tolerance. Also guard the exit segment when the slab runs past the
last column. Then re-run both harnesses; the source fingerprint will change, and the record must be reviewed again.
The rest of the evidence is in place.
