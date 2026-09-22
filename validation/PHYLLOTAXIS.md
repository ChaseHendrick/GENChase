# Discrete inhibitory growth and print review

`node tools/phyllotaxis-review.js --write` reviews three finite recipes of the
implemented softened inverse-square model. Before insertion, every existing
radius is multiplied by growth. A new point is inserted near the minimum of
`sum_i 1/(distance_i^2+lambda^2)` on the fixed ring of radius r0.

The former displayed exponential equation did not match that code. Claims that
lambda alone controls the pattern and that this implementation establishes
universal golden-angle convergence have been removed. The mathematical scope
is now the actual discrete model, inspired by the credited Douady-Couder work.
The divergence readout is explicitly a finite-history statistic.

The independent benchmark reconstructs every historical radius from
`r0*growth^(age difference)`, then checks every chosen insertion against a
1,440-angle search and 48-step golden-section refinement using a polar-distance
objective. It does not call production inhibit or addOne. The production search
uses 180 samples and eight local refinements. Relative objective gap must be
below 2e-7; radial error below 1e-11; the last-60-percent mean divergence must
agree within 1e-10 degrees. Removing growth and perturbing insertion angle must
fail. This is a sampled global search with local refinement, not a mathematical
certificate of every continuous minimum.

The exact recipes (N,lambda,growth,r0,view) are:

- (40,.08,1.04,.04,dots)
- (80,.14,1.024,.06,para)
- (120,.11,1.03,.04,voronoi)

All use size 1.1, grain 0 and paused growth. Recorded seeds and complete palettes
are in `results/phyllotaxis-review.json`. At 2400x2400, every actual PNG channel
is compared with independently reconstructed radii, angular coordinates,
nearest-neighbor links or nearest-site Voronoi classifications and a separate
linear-light palette calculation. Tolerance is one byte; displaced pixels must
fail. All SVG circle/link coordinates agree within .00501 pixels, colors agree
exactly, and export preserves the recipe and scientific state.

Print inspection also found functional bugs: PNG always drew dots regardless of
the selected view, SVG used a different palette, and Voronoi incorrectly offered
a dots-only SVG. PNG now shares the selected-view painter; dots/links retain
true vectors with matching colors; Voronoi uses its actual raster output. The
last preview dot now samples the palette endpoint instead of wrapping to its
start. These corrections preserve the underlying growth algorithm.

The completed label covers these finite recipes, all three views, grain-free
prints and the recorded Chromium renderer. Larger populations, continuing
interactive growth, disturbance, grain, other parameter regimes, biological
fidelity and golden-angle universality remain outside this review. Finite
Voronoi raster cells do not create new physical growth information.
