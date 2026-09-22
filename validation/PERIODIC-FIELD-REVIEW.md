# Gyroid approximation and finite circle-map review

`node tools/periodic-field-review.js --write` checks nine complete fields,
scientific diagnostics and actual engine PNG exports. It requires Node,
Playwright/Chromium and Python 3 (standard-library Decimal only). Results:
`results/periodic-field-review.json`.

## Gyroid correction and reference

The three-term field `sin(x)cos(y)+sin(y)cos(z)+sin(z)cos(x)` is a **nodal
approximation**. It is not Schoen's exact minimal surface. This distinction is
supported by [Gandy et al., Chemical Physics Letters 336 (2001), 187-195](https://doi.org/10.1016/S0009-2614(00)01418-4).
The former diagnostic omitted z derivatives, mixed derivatives and the factor
one-half, then compared the result with a false exact-zero reference.

The module now evaluates the complete three-dimensional mean curvature
`H=(|g|² trace(A)-gᵀAg)/(2|g|³)`, where g is the gradient and A the Hessian.
Its displayed mean is explicitly a finite-band sample in the chosen z slice,
not a surface-area integral. Singular gradients are excluded explicitly.
The independent reference uses a six-sine sum-to-product field and centered
finite differences for all gradient and Hessian components. At four regular
points, h=.02,.01,.005 converges at order 1.8..2.2 and final error is below 2e-5.
Dropping the one-half fails. Periodicity is checked in all three coordinates.
At `(x,y,z)=(.3,.5,-.7101936838369134)`, F=0 while H=-.01896438, directly rejecting
the old exact-minimality label.

Reviewed (z,scale,level,kind) recipes: (.6,2.6,0,level), (.8,2.2,0,field),
(2.2,2.8,.3,abs), and (1.2,3,.3,level). Every field value is compared within 2e-6;
mean curvature in the selected band agrees within 2e-6 with independent
finite-difference averaging. All finite-band sample counts must agree exactly.

## Circle map correction and reference

The implementation represents the standard sine-circle map. Its image and
status now describe finite-time estimates. For non-monotone K>1, a single
trajectory cannot establish a unique infinite-time rotation number. See
[Alsedà and Borrós-Cullell, rotation-interval algorithm](https://arxiv.org/abs/2012.03340)
for the distinction between monotone rotation numbers and general intervals.
The former tongue statistic counted several rows but divided by only one row's
width. The corrected value divides by the actual number of samples in its
selected K band. The orbit view reports this statistic as unmeasured.
The staircase draws its near-curve band before filling below the curve, avoiding
a discontinuous branch choice at mathematical equality due to roundoff. K=0
uses its exact rotation result Ω. No uncomputed Bessel-width claim remains.

Reviewed recipes: staircase K=0,.55,.95 with 80,120,240 iterations respectively;
tongues with K=1 and Iters=40 (30 averaging steps per cell over K=0..2.1);
orbit histogram at K=0 with golden-mean drive. The independent reference evolves
an unwrapped phase and computes net displacement, rather than accumulating
wrapped phase increments. The K=0 histogram uses its exact arithmetic-sequence
phase. Fields agree within 2e-6 except for the non-monotone tongue fixture,
whose declared bound is 1e-4. Its observed worst difference is 4.80e-5.

That larger bound records real floating-point sensitivity. `circle-precision.py`
computes four sensitive rows using Decimal Taylor sine at 40,60,80 digits.
The two finest references agree to 1e-45. At the most sensitive sampled cell,
the production binary64 error is 2.61e-5. The complete image still matches the
independent rendered reference in every byte in the recorded run. This does not
validate longer chaotic trajectories. For K=0,.55,.95 and five drives, 40/120/240
step estimates also meet the monotone-map finite-time bound 1/N relative to a
65,536-step reference (including that reference's own 1/N allowance). A drive
perturbation of .1 fails. These bounds do not claim monotonic error reduction.

## Fields, prints and scope

For each module, row index starts at zero. Grid=[128,192,224][index modulo 3],
aspect=[1:1,4:5,16:9][index modulo 3], exposure=[.75,1,1.3][index modulo 3].
Even rows use linear color mapping, odd rows log. Complete effective recipes
and seeded palettes are saved in the result. Every actual 8-inch/300-ppi PNG
channel is compared with independent linear-light color interpolation and
nearest-cell enlargement, tolerance one byte. One-cell displaced fields and
prints must fail. Recipe and scientific state must survive export unchanged.

The completed labels apply to these finite recipes and recorded Chromium,
without captions or smoothing. They do not certify arbitrary parameters,
exact minimal geometry, asymptotic locking widths, all initial phases, other
hardware or physical printer color. Magnifying a field adds no physical resolution.
