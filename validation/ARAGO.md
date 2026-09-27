# Poisson's spot: the on-axis Fresnel integral

The Arago plate draws Fresnel diffraction by an opaque disk. This note checks one statement of that model, and only that statement.

**Status: unvalidated, with this evidence recorded** (in-project contract check, 2026-09-27). The checked object is an independent radial quadrature of the textbook on-axis integral. It is not the interactive plate, and nothing about `src/modules/arago.js` is validated by it. The plate still uses a fixed 24 by 18 angular sum and reports I(0) against a ring just outside the disk. That number is not this proof. There is no laboratory photometry and no print-path evidence. The picture was not changed.

## The identity

A unit-amplitude plane wave in the paraxial Fresnel model has an on-axis amplitude proportional to

```
integral over A of exp(i k rho^2 / (2 z)) rho d rho
```

The factor exp(i k z) / (i lambda z), and the 2 pi from the angle, are common to every case below, so they cancel in an intensity ratio. For the open beam, A is the whole plane. For an opaque disk of radius R, A is the exterior rho > R. The two improper integrals differ by the integral over the disk. That boundary term changes the phase. It does not change the intensity, once the integral is given a convergence factor and the factor is removed. So

```
I_disk(0) / I_open(0) = 1
```

exactly. A circular aperture of the same radius (rho from 0 to R, not from R to infinity) is the failure control. Its on-axis intensity is

```
4 sin^2(k R^2 / (4 z))
```

times the open beam. Where that factor is 2, the aperture must fail any test that asks for 1.

## Quadrature

The sum does not use the radial antiderivative. Each case is a midpoint rule in rho. The open beam and the disk are multiplied by exp(-eps rho^2) with eps = 1e-4, and the window stops where eps rho_max^2 = 40 (rho_max = 632.456). The tail past that window is negligible. The factor itself moves the exact disk ratio from 1 to exp(-2 eps R^2) = 0.99980002, which sits inside the acceptance window and is not the target. The target is 1:

```
|ratio - 1| < 1e-3
```

The aperture integral is finite, so it is left undamped, and it is divided by the same numerical open-beam intensity.

Parameters: R = 1, z = 1, k = 5 pi. Then k R^2 / (4 z) = 5 pi / 4, sin^2 of that angle is 1/2, and the closed form is 2. The Fresnel number R^2 k / (2 pi z) is 2.5. The phase across the disk is 5 pi / 2, so the piece cut out of the open beam is not a null integral.

## What passed and what failed

Run `node tools/arago-science.js`. The artifact is [results/arago-science.json](results/arago-science.json).

| Zone width | Radial zones | rho_max | I_disk / I_open | abs(ratio - 1) | Predicate |
|---|---|---|---|---|---|
| 0.004 | 158,114 | 632.456 | 1.008623 | 0.008623 | fail |
| 0.002 | 316,228 | 632.456 | 1.080800 | 0.080800 | fail |
| 0.001 | 632,456 | 632.456 | 1.001086 | 0.001086 | fail |
| 0.0005 | 1,264,912 | 632.456 | 0.999805 | 0.000195 | pass |

The sampling that meets the tolerance is 1,264,912 radial zones of width 0.0005, on the window rho_max = 632.456. The coarser run at width 0.002 (316,228 zones, same window and the same convergence factor) has abs(ratio - 1) = 0.0808 and fails the same predicate. The ladder is not monotone: width 0.002 is worse than width 0.004. That is aliasing. The sampled chirp exp(i k rho^2 / (2 z)) advances by k rho dr / z per zone, and where that step is a multiple of 2 pi the samples stop rotating: a discrete stationary point, at rho = 0.4 m / dr for these parameters. The first one lies inside the window at rho = 100, 200 and 400 for widths 0.004, 0.002 and 0.001. For width 0.0005 the first is at 800, beyond rho_max = 632.456. So every failing row is aliased, and the failure of a coarser row is not a clean refinement control: it shows aliasing, not convergence toward the fine row. Width 0.001 still fails. Width 0.0005 passes. Past that point the residual sits on the convergence-factor floor near 2e-4, not on zero.

At the passing width the aperture ratio is 2.0000051436. The closed form, computed as 4 sin^2(k R^2 / (4 z)) and not from the sum, is 1.9999999999999996. The absolute difference is 5.1e-6. The disk predicate abs(ratio - 1) < 1e-3 fails for this aperture, because the ratio is 2, not 1. A formula that dropped the factor of 4 would give sin^2 = 1/2, which this sum does not match. This aperture control, not the zone-width ladder, is the failure control that carries the check.

The same zone width with eps = 1e-3 instead of 1e-4 gives a disk ratio 0.998007. Then abs(ratio - 1) = 0.001993, so the predicate fails. The tolerance is wider than the weak convergence factor and narrower than a strong one. It does not accept every integral.

## The plate, which this does not validate

The same command loads `src/modules/arago.js` through `tools/science-harness.js` and runs `compute`. The source still sets `nPhi = 24` and `nRad = 18`. The metric on the status line is I(0) divided by the mean intensity in a ring outside the disk, not divided by the open beam.

| Plate | Grid | F | I(0)/I_ring |
|---|---|---|---|
| Shipped defaults (R 26, z 0.7, k 1.35) | 160 | 207.493 | 1.825632 |
| Probe R 20, z 0.8, k 1.2 | 96 | 95.493 | 0.665727 |
| Same probe | 160 | 95.493 | 1.375842 |

The grid-96 probe is the earlier reading of about 0.67 at Fresnel number about 95. The same probe on the shipped grid is 1.376. None of these is within 0.2 of 1, and the tool asserts that none is. A metric that moves from 0.67 to 1.38 when only the grid changes is not a converged quantity. The sum is cut off near half the diagonal, and the comparison target is a ring. Both sit outside the converged claim above.

## Limits

The interactive plate uses a fixed 24 by 18 angular quadrature and compares to a ring. That number is not this proof. No laboratory photometry. No print path. Nothing about the module is validated, so the record stays unvalidated, with this evidence recorded, as the Fisher-KPP and Maxwell-Cattaneo records do. Promotion needs a benchmark of the module's own propagator and metric against a converged reference, and then a print-path check.
