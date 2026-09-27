# Phase winding regression

`node tools/phase-winding-check.js` extracts the maintained CPU winding routine from
`src/modules/dynamics.js` and evaluates the real complex expression compiler.
`tools/expr-check.js` runs it in CI and `npm test`. Regenerate the recorded numbers
with `node tools/phase-winding-check.js --write`.

On main at `933dfbb`, the default rational function returned 3 for a circle through
its double zero at 2+i (center 0.5+0.2i, radius 1.7), and 1 when that zero was just
outside (center 0.5+0.98i, radius 1.5). `(z-1)^2` returned 1 on the unit circle
centered at 0.01i even though its double zero is outside. `pow(z,4096)` returned 0
on the unit circle. The added fixtures failed on that code before the fix.

A wrapped endpoint phase change can hide whole turns. Refinement now also requires
the angular step times the larger endpoint estimate of |d log f/d theta| to be at
most pi/2. The estimate uses the complex central difference at theta +/- 1e-7,
divided by |f(theta)|, and equals r|f'/f| for holomorphic f. Derivative evaluations
count toward the existing 400,000-evaluation limit. Unresolved refinement at depth
24 refuses the count, as do nonfinite values and the existing magnitude floor.

The [results](results/phase-winding.json) record 14 fixtures. The default remains
3; positive and negative powers give 4096 and -4096. The circles through a zero
or pole, and the branch-cut fixture, refuse. The two reported outside-double-zero
cases have analytic count 0 but are conservatively refused: the newly resolved
samples fall below min |f| / max |f| = 1e-9. Moving the center of `(z-1)^2` to
0.02i produces a resolvable outside-zero fixture and count 0. Reciprocal fixtures
check negative winding and near poles. An inside double zero counts 2, and a
constant counts 0.

Removing only the derivative criterion from the production routine makes six
fixtures fail, including the through-zero and fast-winding cases. Forced budget
and depth exhaustion must also refuse. The actual status formatter is executed
with a refused result and must show `not counted`, a reason, and no numeric count
or agreement verdict.

These finite tests do not certify arbitrary expressions. Endpoint sampling and a
fixed finite-difference width can still miss behavior between probes. Essential
singularities and non-meromorphic functions are outside the argument principle.
There is no interval bound, GPU comparison, or scientific print validation here;
the tab retains its unvalidated status pending broader review.
