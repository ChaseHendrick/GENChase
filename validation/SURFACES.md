# Parametric surfaces: bounded geometry and print evidence

The `surfaces` tab adds three classical mathematical families: Enneper, Dini,
and the catenoid–helicoid associate family. Six presets expose the two associate
endpoints, an intermediate surface, and two Enneper patches. These are established
mathematics, with no novelty or new physical law claimed.

MathMod inspired this selection. Its collection contains `Enneper`, `Dini`,
`Catenoid`, and `Helicoid_To_Catenoid`. GENChase independently implements published
mathematical maps, its own mesh generator, camera and renderer. No MathMod source,
collection records, textures or other GPL data are incorporated.

## Mathematical definitions

All coordinates are dimensionless. The maps are evaluated in JavaScript double
precision, sampled on a square parameter grid, rotated, and orthographically
projected with one scale for both screen axes.

- **Enneper:** $X=(u-u^3/3+uv^2,\ v-v^3/3+vu^2,\ u^2-v^2)$ on
  $u,v\in[-e,e]$, with $0.5\le e\le2$. Its mean curvature is zero and its
  Gaussian curvature is $-4/(1+u^2+v^2)^4$.
- **Associate family:** $X_t=\cos(t)C+\sin(t)Q$, where
  $C=(\cosh v\cos u,\cosh v\sin u,v)$ and
  $Q=(\sinh v\sin u,-\sinh v\cos u,u)$. Here $u\in[-\pi,\pi]$,
  $v\in[-e,e]$, and $t\in[0,\pi/2]$. Every member has
  $E=G=\cosh^2 v$, $F=0$, $H=0$, and $K=-1/\cosh^4 v$.
  This is a local isometry. It does not preserve global embedding or prevent
  self-intersections.
- **Dini:** $X=(\cos u\sin v,\sin u\sin v,\cos v+\log(\tan(v/2))+bu)$,
  with $u\in[-\pi n,\pi n]$, $1\le n\le3$, $0.1\le b\le0.6$, and
  $v\in[0.15,1.4]$. This excludes the singular parameter line $v=\pi/2$
  and the logarithmic end at zero. For this scale $K=-1/(1+b^2)$.

The Enneper map and its geometric interpretation follow the university-hosted
[3D-XplorMath Enneper page](https://webapps.math.uci.edu/~vmm/Surface/enneper/enneper.html).
The associate map follows [Thomas Banchoff's Brown University course, §7.3](https://www.math.brown.edu/tbanchof/balt/ma106/dtext73.html).
The Dini map appears in [Oliver Knill's Harvard course](https://abel.math.harvard.edu/archive/21a_fall_00/labs/index.html)
and the [University of Rhode Island curvature exercise](https://phys.uri.edu/gerhard/PHY510/wgex410.pdf).

## What is actually drawn

The seed controls a repeatable small camera offset and color placement. The
mathematical patch is unchanged. The curves are parameter-grid lines through
48, 96, 144 or 192 intervals per direction. Mesh density chooses 12, 24 or 48
intervals between drawn lines; the default is 96 curve samples and 24 mesh lines.
The duplicated catenoid angular seam is drawn once.

All lines are visible through all other lines. This transparent wire mesh has
no hidden-surface occlusion, physical shading, material dynamics or area
minimization. Colors encode parameter direction or average line height, not a
curvature measurement. The status bar reports mesh dimensions, not an inferred
experimental confirmation of a formula.

PNG re-renders the mesh at the requested dimensions. SVG contains actual
polyline paths at those dimensions, with no embedded bitmap. Both use the same
geometry and isotropic sheet fitting. The SVG is a vector drawing of the finite
mesh, not an exact representation of the smooth surface or a solid 3D model.

## Independent geometry checks

Run `node tools/surfaces-science.js --write`.
The [saved result](results/surfaces-science.json) fingerprints the maintained source.

The benchmark obtains first and second derivatives by centered differences of
the **actual maintained coordinate function**, then computes the fundamental
forms, Gaussian curvature and mean curvature. Closed references are independently
derived from those forms. The app supplies no curvature value to the test.
It checks 225 points covering Enneper, five associate values and three Dini pitches.
These are deterministic approximation errors, not statistical sampling error bars.

At finite-difference steps 0.02, 0.01 and 0.005, the largest relative Gaussian
curvature errors are approximately 0.002073, 0.000518 and 0.000129.
The observed orders are 2.0013 and 2.0003. The fine-step metric and scaled mean
curvature errors are below 0.001, as required. The normalization for each metric
coefficient and mean curvature is `max(1, abs(reference))`; Gaussian curvature
uses relative error since its reference is nonzero throughout these samples.

Three deliberate errors are rejected: an incorrect Enneper vertical scale, an
omitted Dini logarithm, and an incorrect sign in the conjugate helicoid map.
Mesh endpoints and rigid-camera squared distances agree to 1e-12. All sampled
mesh coordinates are finite. A separate three-patch test compares every edge's
chord midpoint with the analytic map at 48, 96 and 192 intervals. It requires
second-order refinement and fine error below 0.001 of the patch bounding-box
diagonal. This tests tessellation separately from derivative approximation.

These checks support the stated coordinate maps and finite rendering geometry.
They do not establish global topology, immersion completeness, freedom from
self-intersection, physical soap-film stability, or exhaustive all-parameter
accuracy.

## Print and application checks

Run `node tools/surfaces-print.js --write` with the Playwright setup in
[BUILDING.md](../BUILDING.md). This checks all six presets at 800×800,
1600×2000 and 2400×2400 pixels, including true vector paths, exact dimensions,
coordinate preservation, nonblank raster output, repeatability, seed-sensitive
views and export state preservation. The [saved result](results/surfaces-print.json)
records the pixel differences between the raster and SVG rendering backends.
A deliberately wrong 2% horizontal SVG scale must be detected.

The accelerated Canvas2D preview and SVG rasterizer differ at thin line edges:
the largest 800-pixel mean absolute channel difference is 1.612 on a 0–255 scale.
At both print sizes every preset is below 0.650. Coordinate error remains below
0.000051 pixels; the tolerance is determined by SVG's four decimal places.
Repeating with `node tools/surfaces-print.js --software-canvas --write` isolates
that antialiasing difference by disabling accelerated Canvas2D. The
[controlled result](results/surfaces-print-software.json) requires a pixel mean
error below 0.01. The normal backend's preview pixel tolerance is 2; its print
tolerance is 1. These tolerances do not relax the geometric coordinate check.

The application's own export path is separately exercised by
`node tools/export.js surfaces 8 300`, and `node tools/check.js surfaces 5000`
checks every preset, hash replay and returning from another tab. These are
runtime and print regressions, not additional scientific validation.

## Research log, 2026-09-21

Read the repository research ledger before querying. Exact searches:

1. `site:math.* Dini surface Enneper parametrization curvature university`
2. `Enneper catenoid Dini surface site:edu parametrization Gaussian curvature`
3. `"Dini" "surface" site:math.uci.edu`
4. `"Dini" "surface" site:edu "curvature" parametrization`

Read the complete short UCI Enneper and Brown §7.3 pages cited above. Read the
Enneper curvature section in the [ETSU course PDF](https://math.etsu.edu/multicalc/prealpha/Chap3/Chap3-8/printversion.pdf).
Read the indexed Harvard Dini formula and URI exercise text. Direct page/PDF
fetches of those last two sources failed (Harvard cache/403, URI certificate/502),
so no claim of reading their full source documents is made. A search preview of
the [UCI Dini-family note](https://www.math.uci.edu/~vmm/docs/DiniKuenBreather.pdf)
uses a different parameterization; the full fetch timed out and that form is
not implemented. The Dini metric and curvature used by the benchmark were
independently derived from the explicit map above.

Opened the official [MathMod collection](https://raw.githubusercontent.com/parisolab/mathmod/master/mathmodcollection.js)
and found the four exact collection names above. This confirms selection
provenance, not numerical equivalence with MathMod. Existing Boy, Klein and gyroid
catalog entries were excluded from this selection. No historical novelty search
is needed for a module explicitly presenting these classical examples.

## Completed finite preset review (2026-09-22)

The print reference now reconstructs every vertex independently using complex
polynomials for Enneper, a half-angle identity for Dini, complex coordinates for
the associate family, and one combined orthogonal camera matrix. It never calls
production point, mesh, rotate or project. Seeded camera offsets are captured as
display inputs. All six presets at detail 96, default or preset wire count, seed
`surface-print-fixed`, were checked at 800x800,1600x2000,2400x2400. Maximum SVG
coordinate error was 0.0000500 pixels, within four-decimal serialization error.
The 2-percent wrong-scale control remains rejected. Actual PNG/SVG, replay and
state-preservation checks also pass. The independent differential-geometry and
48/96/192 mesh-refinement suite was rerun on the same source.

The full label covers these six finite preset meshes and exports together with
the explicitly sampled differential geometry domain above. Other parameters,
seeds, hardware, exact smooth topology, hidden-surface rendering, material
stability and physical manufacturing accuracy remain outside that label.
