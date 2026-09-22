# Polygon collapse: completed review for 16 recipes

Reviewed 2026-09-22. Run `node tools/polygon-review.js --write` after building, with the Playwright setup in BUILDING.md. Results are in `validation/results/polygon-review.json`.

The completed label applies only to the 16 explicit recipes in that artifact. For each polygon order 2, 3, 4 and 5, they are: the lower-angle spiral at 12/n degrees on square paper, the minimum polygon overlay on 4:5 paper, the upper-angle spiral at 168/n degrees on 16:9 paper, and the minimum bound curve on 5:4 paper. Rotation is zero, weight is one, animation is stopped, and displayed time is 0.9 collapse times. Defaults supply the recorded palette. No claim extends to arbitrary recipes, off-family dynamics, singular endpoints, other browsers or physical fluids.

## Numerical model and reference

The model is the unbounded planar point-vortex equation stated in `identities/polygon-collapse.md`, with the 1/(2 pi) kernel, outer circulation -1, inner circulation x, and radius ratio sqrt(x). There are no walls, forcing, viscosity or finite vortex cores. Time is transformed by q = -log(1-t/t_c); the production RK4 advances 600 stored intervals with two substeps, ending at 0.9 t_c.

The independent reference uses the unreduced complex ring sums in that derivation, separately evaluating radial coefficient A, angular coefficient B and positive collapse time -1/(2A). It reconstructs every stored vortex position as a rotated and contracted initial polygon. The all-pairs solver does not use these sums. All coordinates must differ by less than 4e-5 in the module's unit-radius geometry, and initial products by less than 1e-11 relative error. The existing audit also covers 11,381 angular samples for orders 2 through 20, minima, translations, rotations, scale changes, expanding orientations and deliberately damaged kernels/geometries. Those wider kernel samples do not expand the completed print domain.

At each of the lower angle, optimum and upper angle for orders 2 through 5, temporal refinement uses 1, 2 and 4 substeps at the same final physical time. Minimum and upper-angle cases show fourth-order convergence. Lower-angle cases do not sustain fourth-order convergence at the finest steps; the five-vertex lower-angle error increases from about 2.13e-6 to 3.49e-5. Every recorded run remains below the predeclared 4e-5 absolute tolerance, but **more substeps are not guaranteed to improve that case**. The artifact preserves those errors and observed orders. No uniform convergence or arbitrary-precision certification is claimed.

The general identity and sharp minimum have an algebraic derivation in the repository. This implementation review checks numerical agreement and does not establish historical originality or replace independent mathematical peer review. The underlying two-ring family is classical.

## Print evidence

For each recipe the test drives the actual engine PNG export at an 8-inch longest edge and 300 ppi, with captions off and standard aspect-matched paper. The PNG must have a 2400-pixel longest edge. The export uses the module's SVG route. The test parses the SVG paths and independently checks the coordinate transformation of all spiral points, all sampled polygon overlays, or every bound-curve sample against unreduced ring coefficients. The accepted SVG coordinate discrepancy is below 1e-7 print pixels.

A separate rasterization of this checked SVG must match every RGBA channel of the exported PNG. Shifting the reference raster by one pixel must fail that same equality comparison. A displaced numerical trajectory must fail the coordinate tolerance. Recipe, complete trajectory arrays, displayed time and structured witness must remain unchanged through export. Page errors fail the run.

The PNG comparison proves preservation of the checked vector drawing through the engine export, not an independently solved fluid problem. Antialiasing, color perception, printer calibration, captions, PDF/TIFF conversions, live animation and unlisted settings remain outside this label. Canvas2D fallback is not the path validated here. Computation uses JavaScript binary64; output uses SVG coordinates and Chromium RGBA8 rasterization in the recorded environment.
