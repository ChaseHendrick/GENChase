# Hopf, Apollonian and finite Weierstrass: complete bounded review

Reviewed 2026-09-22. Run `node tools/geometry-field-review.js --write` after building and installing Playwright/Chromium. Measurements and complete recipes are in `validation/results/geometry-field-review.json`. The review runs the existing independent geometric invariant and refinement checks in `tools/geometry-science.js` before checking full fields and real exports.

## Tested recipes and acceptance

Each module has three complete recipes. Case 1 uses grid 128, square, intensity view; case 2 uses grid 192, 4:5, intensity view; case 3 uses grid 128, 16:9, logarithmic view. Exposure is one. Seeds, actual grid dimensions, palettes, reference errors and output dimensions are recorded. There is no time evolution.

| Module | Case 1 | Case 2 | Case 3 |
|---|---|---|---|
| Hopf | 12 fibers, tilt 0.1, fibers view | 36 fibers, tilt 0.35, fibers view | 48 fibers, tilt 0.7, latitude-weighted tori view |
| Apollonian | depth 3, generation color | depth 5, curvature color | depth 7, fill |
| Weierstrass | a=0.35, b=3, 6 terms, 2D field | a=0.5, b=5, 4 terms, graph | a=0.65, b=3, 5 terms, scale stack |

Every Float32 field entry must differ from the independent reference by less than 2e-6. A one-cell displacement must fail this tolerance. Every actual engine PNG channel is independently checked against the reference field's normalization, optional log mapping, exposure, linear-light palette and nearest-neighbor magnification, within one byte per channel. The exact-boundary raster tie rule is the lower neighbor in the recorded Chromium environment. A displaced reference image must disagree. The entire scientific field and recipe must remain unchanged through export. Prints have a 2400-pixel longest edge: 8 inches at 300 ppi, with captions and optional smoothing off.

## Hopf map

The reference constructs the complex pair `z1=cos(theta/2) exp(i t)`, `z2=sin(theta/2) exp(i(t+phi))` on the unit 3-sphere, then stereographically projects it. Independently lifting every displayed 3D point back to the sphere and applying `eta(z1,z2)=(2 z1 conjugate(z2), |z1|^2-|z2|^2)` must recover its constant base point within 1e-12. A separate triangular-basis deposition reconstructs all 180 samples per fiber, including the five-pixel footprint and clipped points, then the logarithmic field transform.

The reported absolute linking integral must be within 0.001 of the exact magnitude one for the pair selected in each recipe. Existing tests also compare 90/180/360 segment Gauss quadrature against that invariant, require second-order refinement, reverse orientation and supply an unlinked pair. Refinement change is an indicator, not a rigorous quadrature error bar. Sign depends on orientation, so the displayed invariant is the magnitude.

The output is a finite projected density drawing of sampled fibers. It is not a reconstruction of a physical fluid, a global topology certification from pixels, or a proof based on its appearance. The tori setting changes latitude weights of these same fibers. The untested base setting, other fiber counts, singular projection limits and arbitrary fields remain outside this completed domain.

## Apollonian packing

The independent reference solves the Descartes curvature quadratic and complex-center equation for the missing circle, tests tangency against its three neighbors and explores the resulting finite packing. It does not use the production linear integer-reflection recurrence. Both start with the declared unit-disk seed `(-1,2,2,3)` and apply the selected depth and minimum displayed radius of 0.6 grid cells. The reference's circle count and finite unfilled area must match the displayed diagnostics; area error must be below 1e-12. No reviewed case reaches the 2,000-circle cap.

A separate full-image distance classification reconstructs the field from those circles instead of using the production bounding-box raster loop. The existing geometric audit also checks non-overlap, at least three tangent neighbors, integer curvature-center coordinates, decreasing finite gap under deeper generations and rejection of an incorrect historical seed. The label covers these finite packings, not the infinite gasket's dimension, all possible seeds or pixel estimates of the infinite leftover set.

## Finite Weierstrass-type sum

The implemented field is a finite sum with seeded phases: `W_N(x)=sum(n=0..N-1) a^n cos(pi b^n x + phi_n)`. Each finite sum is smooth. The panel previously called this displayed sum nowhere differentiable and treated a two-distance increment ratio as evidence for that claim. Its equation, description and status now identify the finite smooth sum and the possibility of aliasing. Classical infinite-series attribution is retained with an explicit distinction from the displayed phase-shifted field.

The independent reference uses repeated complex-angle powering to form harmonics, rather than the production growing-frequency cosine arguments. The actual seeded phases are captured as explicit reference inputs. For 101 sample positions, period-two agreement must be below 1e-10. Removing the final two terms must respect the exact finite geometric tail bound `a^(N-2)(1-a^2)/(1-a)`. The reported two-distance increment ratio is independently reconstructed within 1e-9. Complete 2D fields, graph intensity profiles and row-dependent partial sums are compared.

These low-term fixtures keep the largest direct trigonometric arguments manageable. They do not validate high-frequency argument reduction at the largest settings, absence of aliasing, fractal dimension, RNG distributions, infinite-series differentiability, or extrapolation from the finite increment ratio.

## Precision and scope

References use JavaScript binary64; fields accumulate/store in Float32; images are RGBA8. The local Chromium and Node versions are recorded. The full label applies only to the nine explicit recipes and that environment. Captions, smoothing, custom paper, PDF/TIFF conversion, physical printer calibration and unlisted recipes require separate evidence. Increasing print resolution does not increase the underlying field resolution.
