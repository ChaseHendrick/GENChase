# Complete analytic wave field and print review

`node tools/analytic-field-review.js --write` runs the earlier equation-residual,
period, mass, phase-shift and energy checks before opening the maintained modules
in Chromium. It reconstructs every field value independently and exercises the
actual engine PNG export. Results are in `results/analytic-field-review.json`.

The reference uses gauge-independent rational intensities for the three NLS
solutions, direct first and second derivatives of the Hirota tau function for KdV
(rather than the production weighted-variance algorithm), and an atan2 expression
for the sine-Gordon breather. The breather's sampled energy uses numerical time
and space derivatives independently of the module's analytic derivatives.
The earlier residual benchmarks check the defining PDEs at three difference
steps and reject incorrect dispersion, missing interactions and wrong frequency.
These are finite checks of analytic solutions, not numerical time evolution.

## Exact reviewed recipes

For each module, row index starts at zero. Grid is [128,192,224][index modulo 3],
aspect is [1:1,4:5,16:9][index modulo 3], exposure is [.75,1,1.3][index modulo 3].
Even rows use the linear color mapping; odd rows use log. The recorded seed,
palette and all effective parameters are retained in the result JSON.

- Rogue wave: Peregrine, Akhmediev and Kuznetsov-Ma each at a=.12,.25,.42;
  corresponding windows 6,10,16 and time centers -1,0,2. Nine recipes.
- KdV: (c1,c2,nu) = (1.7,.65,.22), (1.1,1.05,.4), (2.4,.2,.08),
  (.4,1.8,.6), (1,1,.3). The physical space/time windows follow the documented
  mean-speed frame. Five recipes including reversed speed order and equality.
- Breather: (beta,t0,span) = (.2,0,24), (.45,2,18), (.75,-3,12). Three recipes.

All 17 field comparisons require absolute error below 2e-6; sampled maxima,
KdV middle-row mass and breather energy diagnostics require error below 1e-7.
A one-cell displaced field must differ by more than .01. The complete 8-inch,
300-ppi PNG (2400 pixels on its longest edge), without caption or smoothing,
is checked against independent linear-light palette interpolation, byte rounding,
log/exposure mapping and nearest-cell enlargement. Every channel must agree
within one byte and a displaced reference must fail at over 100 pixels. Scientific
state and recipe must remain unchanged through export.

## Breather diagnostic correction

The former E_out/E summed u squared, which is not sine-Gordon energy. It also
called finite tails leakage and displayed a false theory-zero comparison. The
module now integrates `(u_t^2+u_x^2)/2 + 1-cos(u)` with trapezoidal weights along
the middle time row, displays it against whole-line energy 16 beta, and separately
labels the sampled fraction outside |x|=3/beta. A window ending inside that cut
contains no outside samples. A zero sampled fraction therefore says nothing about
radiation or the exact nonzero tails. Finite-window and grid errors are retained.

## Boundaries of the completed labels

The labels cover these enumerated field, diagnostic and PNG recipes together
with their independent equation benchmarks. They do not establish all possible
parameters, an infinite-domain proof, physical ocean/material accuracy, dynamical
stability, other browser renderers, captions, smoothing or physical printer color.
The print enlarges a Float32 field; it does not add scientific resolution. The
independent references and sampled diagnostics use binary64 arithmetic.
