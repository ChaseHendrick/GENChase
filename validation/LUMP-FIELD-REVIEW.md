# Complete finite rational lump review

Run `node tools/lump-field-review.js --write` after building the studio. Python 3
standard-library Fraction arithmetic and Playwright Chromium are required.

`tools/lump-algebra.py` differentiates polynomial numerators over powers of
D = X² + b²Y² + b⁻² with exact rational coefficients. It reduces the KP-I
residual to the common positive denominator D⁶. Every numerator coefficient
vanishes for all nine (a,b) pairs used by the six field kinds. This is an exact
algebraic identity for those rational parameters, all real X,Y, and the specified
coordinate/time transformation. Multiplying the entire time derivative by 1.1
leaves 15 or 25 nonzero coefficients in every case. This reference neither calls
nor parses the production JavaScript evaluator.

The existing `lump-science.js` independently differences the actual JavaScript
single-lump fields at 12 spacetime points per kind with spacings .04,.02,.01.
Normalized finest residuals must be below .01 and decrease by factors 12 to 20
under fourfold refinement. A wrong production time coefficient must fail.

The complete review separately evaluates 2(D_xx/D - (D_x/D)²) in every preview
cell for seven recipes. It covers all six kinds, all three views, grids 128,192,
256, three aspects and times -1.6,-.4,0,.1,.4,1.6. Effective parameters and palettes
are saved with every result. Full Float32 fields matched exactly in the recorded
Chromium run; the acceptance limit is 1e-6. A one-cell displacement must fail.

Seven actual native module PNG exports at 2400x2400, 1920x2400 or 2400x1350 are
recomputed at print resolution. Every RGBA channel is compared with an independent
full-resolution field, display transfer and linear-light palette reference.
Acceptance is at most one byte; all seven recorded exports matched exactly.
A displaced print must fail. Every export must preserve the preview field,
recipe, displayed peak and residual diagnostics exactly. The animation check
verifies forward time steps and wrap at the declared [-4,4) boundary.

The review found three errors and corrected them:

- Multiple-lump modes previously implied exact interacting KP-I solutions. They
  actually sum independent single lumps and generally fail the nonlinear PDE.
  The selected sum is now tested and labeled explicitly. Their recorded sampled
  normalized residuals range from .0149 to .582, rather than displaying the
  first component's near-zero residual.
- The peak diagnostic previously substituted the analytic crest even when it
  was not sampled in the viewport. It now reports the visible grid's maximum.
- The animation wrap subtracted four every frame. It now advances continuously,
  and print export restores temporary fields and diagnostics in a finally block.

The completed status covers exact single-lump algebra and the seven documented
field/render recipes, including accurate illustrative sums. It does not validate
those sums as interacting KP solutions, all parameter combinations, physical
experiments, other renderers or every print backend. The residual is a sampled
finite-difference diagnostic with a displayed step sensitivity, not a global
error bound. Closed-form fields are evaluated per pixel; no spatial PDE solver
or continuum mesh extrapolation is claimed. Analytic summation replaces a less
accurate finite difference of log(product tau), so old multiple-lump recipes may
show small numerical changes. The cited classical results retain their credit;
no originality claim is made.
