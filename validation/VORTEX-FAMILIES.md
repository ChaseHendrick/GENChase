# Three classical collapse families: completed bounded review

Reviewed 2026-09-22. Reproduce with `node tools/vortex-family-review.js --write` after building and installing the documented Chromium dependencies. Machine-readable evidence is in `validation/results/vortex-family-review.json`.

## Model and independent reference

These are dimensionless, unbounded, inviscid planar point vortices, with velocity `dz_i/dt = i sum_j Gamma_j (z_i-z_j)/(2 pi |z_i-z_j|^2)`. There are no finite cores, walls, forcing or viscosity. The reference independently specifies the circulations and initial geometry, evaluates each unique vortex pair, obtains the circulation center, and fits radial and angular coefficients A and B. It uses the similarity solution `z(t)-c = sqrt(1-t/t_c) exp[-i B t_c log(1-t/t_c)] (z(0)-c)`, with `t_c=-1/(2A)`.

The similarity equations agree with Gotoda, [arXiv:2002.09624](https://arxiv.org/abs/2002.09624), equations 2.4 through 2.6. The four- and five-vortex families are classical Novikov-Sedov configurations. This is implementation evidence, not a historical-priority claim or external mathematical peer review.

| Module | Circulations | Geometry | Product minimum |
|---|---|---|---|
| three-vortex-bound | 1, 1, -1/2 | 0, 1, 1/2 + sqrt(3)/2 exp(i theta) | sqrt(2), tan(theta)=1/sqrt(2) |
| parallelogram-lock | 1, 1, -2-sqrt(3), -2-sqrt(3) | first pair at +/-sqrt(2+sqrt(3))/2 exp(-i theta), second pair at -1/2,+1/2 | 3 sqrt(5)/4, cos(2 theta)=1/4 |
| quincunx-lock | -1, -1, 1/2, 1/2, -3/4 | first pair at +/-1/sqrt(8) exp(i theta), second pair at -1/2,+1/2, last at zero | 3 sqrt(33)/16, cos(2 theta)=4/7 |

For each module, 149 half-degree samples from 8 through 82 degrees plus the exact minimum check geometry, production velocities, the closed product formula, and exact trajectory positions at 0, 0.25, 0.5, 0.9 and 0.92 collapse times. Geometry errors must be below 1e-14, velocity errors below 1e-12, product relative errors below 1e-11 and trajectory errors below 1e-10 of the initial RMS radius. The exact minimum must agree within 1e-12. These sample tests complement the algebraic derivations; they do not alone prove an inequality on a continuous domain.

The production RK4 integrator is separately compared with the analytic solution at half-collapse time using 64, 128 and 256 steps for 8 degrees, the minimum, 45 degrees and 82 degrees. Fine-step relative coordinate errors must be below 2e-6 and observed orders between 3.5 and 4.5. Wrong-sign velocity mutations and off-family geometry must fail the reference checks. This establishes the specified family integrations, not the arbitrary broken-family trajectory mode.

## Complete print recipes

Each module has four complete recipes: 8-degree spiral on square paper, the exact-minimum spiral on 4:5 paper, 45-degree overlay on 5:4 paper, and 82-degree polar plot on 16:9 paper. All use family mode, final time 0.92, zoom 1, zero pan, weight 1, fade 0, default palette and stopped animation. Full state is recorded in the result artifact.

All 720 stored three-vortex samples or 640 four/five-vortex samples are checked against the independent similarity solution. Every relevant SVG path coordinate is independently transformed from those positions and checked within 0.00501 print pixels, accommodating the production two-decimal serialization. The quincunx center is intentionally omitted from the polar plot because its radius is zero. The actual engine export has an 8-inch longest edge at 300 ppi, captions off, and a 2400-pixel longest edge. Its RGBA channels must equal a separate rasterization of the checked SVG. A one-pixel displacement must fail that comparison. Export must preserve the full recipe and trajectory state.

## Corrected time control

The old renderer multiplied the requested collapse-time fraction by the sample count, although the trajectory already ended at 0.92 collapse times. As a result, selecting 0.92 displayed approximately 0.8464. Both canvas and SVG now map time through the actual stored extent. The audit checks 0, 0.23, 0.5 and 0.92 within half a sample interval. This correction changes previously saved recipes' displayed endpoint; formulas and circulations are unchanged.

## Limits

The completed label covers only the twelve enumerated recipes and recorded Chromium environment. JavaScript calculations use binary64 and raster output uses RGBA8. No claim covers singular endpoints, expanding orientations, arbitrary perturbed dynamics, live animation, bead/space views, custom paper, captions, Canvas2D export fallback, PDF/TIFF conversion, physical printer calibration or real-fluid accuracy. Additional recipes and browsers require additional evidence. Winding, speed and time interpretation should retain the definitions above.
