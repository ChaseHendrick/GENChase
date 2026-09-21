# What matching numbers mean

Reviewed 2026-09-21 after the README's repeated `1 ; 1` and `1.000 ; 1.000` values were questioned.
These are not different numerical outcomes: one merely displays more decimal places. Rounded
agreement does not supply an error bound, establish independence or prove a governing equation.

The former README numbers did not carry reproducible recipes or uncertainty information. They
have been removed rather than transformed into invented zero-error measurements. This does not
mean every underlying diagnostic is a tautology.

## Source-inspected examples

- `src/modules/gerstner.js`, `measure`: samples the evaluated trajectory, compares orbital distances
  to the radius formula and evaluates a pressure residual. This checks the implemented formula,
  not an independent fluid solver. Its two-train graphics mode is explicitly not Euler flow.
- `src/modules/crapper.js`, `measure`: samples 721 surface points to estimate height/period, then
  compares to the closed steepness formula. This is a sampled geometry check; it can catch a wrong
  map but does not independently establish the water-wave equations.
- `src/modules/peakon.js`, `probe`: locates maxima of a sampled single-peakon field at two times,
  estimates speed and one-sided slopes, and computes an H1 comparison for the configured peakons.
  The single-peakon speed probe uses a fixed reference speed, not every displayed multiparticle
  configuration. Its field samples differ from simply printing the target ratio, but are still
  samples of an evaluated formula rather than an independent PDE evolution.
- `src/modules/hasimoto.js`, `measure`: derives curvature from the sampled curve, compares coarse
  and fine estimates, and tracks a peak between two sampled times. The sampling windows themselves
  are centered using the theoretical motion. Treat this as a curve-consistency diagnostic; a
  stronger independence test would recover motion in a fixed coordinate window.
- `src/modules/kp.js`, `sampleField`: evaluates a normalized Hirota expression at only three points.
  A tiny residual there does not certify the entire field or every parameter combination.
- `src/modules/photon.js`: status ratios use the results of capture-boundary and circular-radius
  searches. They are not merely printed constants; numerical convergence still needs a dedicated
  test before reporting them as scientific validation.

The README groups other statistics and trajectory diagnostics by the quantity they claim to
measure. Those groups are not completed code/paper audits. Their validation records remain
unvalidated until evidence with explicit scope and tolerances is registered.

## Reporting rule

For measured estimates, retain the recipe, sample count, uncertainty and method. For deterministic
benchmarks, report absolute/relative error and an acceptance tolerance. For construction identities,
label them as consistency checks. Never recover an error estimate from a rounded `1.000`, or present
extra decimal places as additional evidence. Tests should include an intentional defect or off-model
control that demonstrably fails.
