# Veselago lens: ray trace and print review

The tab traces geometric rays from a point source on the axis through a flat slab of index `n < 0`, with vacuum on
both sides. The rays are launched over ±0.45 rad, splatted into a Float32 field and printed as a nearest-neighbour
magnification of that field. The status line reports the brightest point behind the slab as `Δx/W`, and prints
the reference `2L − d` beside it only for `n = −1` with `d < L`. It prints "Veselago focus" only when `n = −1`,
the source is closer than the slab is thick, and a transmitted ray's unclamped exit line crosses the axis behind
the back face. Any other such crossing is "image behind the slab". No such crossing is "no image behind the slab".
When total reflection drops rays, the same line names the count. Here `L` is the slab thickness and `d` is the
source distance.

This review was first recorded on 2026-09-23 against an earlier revision of the module. It was re-run on
2026-09-24 against the revision that puts the Field view's white point at the 95th percentile of lit pixels and
prints the reference only where it holds. On 2026-09-29 the status words were changed. The ray geometry is
unchanged from the 2026-09-24 run: every traced vertex still agrees with the independent Snell trace. The print
colours are from that re-run; the browser was not opened again for the label change, because the field and the
paint path are the same and the print harness does not read the status words.

**Status: partially validated.** Every ray the module draws agrees with an independent Snell trace over the slider
domain. The print reproduces the field exactly on the nine fixtures, none of which has the back face off the
plate. The status words match the crossings: "Veselago focus" is not printed where no ray crosses the axis
behind the slab. When the back face lies past the last drawn column the ray stops, and those 2,368 plates
have no stray ink. The words do not say whether an image at `n ≠ −1` sits on the paraxial point `L/|n| − d`.
The `Δx/W` number is that measurement, and the reference `2L − d` is printed only at `n = −1`. Reflected rays
are not drawn.

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
| −0.8 | 36 | 36.0047 | 40.3732 | 4.37 | 38.15 | 0.0737 | image behind the slab |
| −1.2 | 16 | 15.9983 | 14.6460 | 1.35 | 14.06 | −0.0518 | image behind the slab |
| −1.5 | 8 | 7.9975 | 6.1079 | 1.89 | 6.02 | −0.0936 | image behind the slab |
| −2.2 | −2.18 | −2.18 | −3.96 | no real crossing | 2.01 | −0.1145 | no image behind the slab |
| −0.4 | 96 | 96.09 | 289.89 | 193.80 | 87.34 | 0.3299 | image behind the slab; 4 rays removed by total reflection |
| +1.5 | none | — | — | no crossing | 2.01 | −0.1145 | no image behind the slab |

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

- **Status words.** The line no longer compares `|Δx/W|` with 0.12. Over the 59,200-configuration sweep it
  agrees with the independent crossings on every plate, including the 2,368 whose back face is off the plate:
  "Veselago focus" only for `n = −1` with `d < L` and at least one unclamped exit line past the back face;
  "image behind the slab" for every other real crossing; "no image behind the slab" otherwise. Of the 16,496
  in-domain configurations with no real crossing behind the slab, none is labelled a focus. At the default slab
  the words are "Veselago focus" only at `n = −1`, "no image behind the slab" from −2.20 to −2.00, and "image
  behind the slab" on the other 31 slider values. At `n = −0.40` the line also says how many rays total
  reflection removed (2 of 12, 4 of 28, 6 of 48, 6 of 64). The words do not place the image: at `n = −1.2` the
  brightest point is 9.94 px from `2L − d`, and the line says "image behind the slab", not that it sits at the
  textbook point. The `Δx/W` number is still the brightest point. A crossing that lands within 1e-9 px of the
  back face, which is the virtual image at `n = −1` and `d = L` up to float noise, is not counted.
- **Back face past the plate.** When `x0 + d + L > W − 2` the exit target lies behind the ray. The segment
  used to walk backwards to `W − 2` and ink cells no ray reaches: 1,767 of 2,368 such sweep plates, 24,214
  cells, only at grid 128 (1,776 plates) and grid 144 (592). The ray now stops when the next face is behind
  it. The same 2,368 plates have no stray ink. They stay outside the vertex comparison, because the reference
  still names an end point at `W − 2` that the plate no longer draws.
- **Total reflection.** At `n = −0.40`, rays with `|sin θ| > 0.4` (critical angle 0.411517 rad)
  are skipped entirely, including their incident segment: 2 of 12, 4 of 28, 6 of 48 and 6 of 64 rays. No other
  slider value drops rays. The status line names the count. No Fresnel reflection is drawn anywhere; the
  plate shows transmitted rays only.
- **Slope clamp (veselago.js:88).** The clamp `max(0.05, cos θ2)` never acts at a slider `n`, for any ray count
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
time. On the perfect fixture, 2,376 tie pixels took the right-hand cell and 5,064 the left-hand one. The criterion,
fixed before the run, accepts either cell. On the 16:9 fixture the plate height is odd, so the image splits
over two rows and the source cell ties it for brightest. That fixture was excluded from the brightest-cell check
before the run.

The two failure controls, a PNG requested 1 px narrower and a post-export change to one field word and the metric,
are each rejected by the one predicate they target. Every other check still passes.

veselago has no exportSVG. The print is a raster magnification of a field of 128 to 224 cells across, so it adds
pixels, not resolved rays. Colour is not calibrated.

## What would complete the review

The label reports a focus only for the textbook case with a real crossing behind the slab, and the exit ray
no longer walks backwards off the plate. The words do not yet compare other `n` with the paraxial image
`L/|n| − d`. Reflected rays are not drawn. The print harness has not been re-run against this source
fingerprint; its nine fixtures keep the back face on the plate, so their fields are unchanged. The numerical
sweep was re-run on 2026-09-29.
