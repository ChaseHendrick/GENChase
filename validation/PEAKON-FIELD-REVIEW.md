# Complete finite peakon review

`node tools/peakon-field-review.js --write` constructs initial positions and
amplitudes from Hankel moment determinants using pivoted elimination. Production
uses logarithmic sums over spectral subsets. Independent RK4 then integrates the
Camassa-Holm particle equations without calling the production spectral solution.

All six spectral families (one, two, three, train, overtake, rest), at separations
-1.2,0,1.2, are compared at 48 times in [-12,12]. Step sizes .04,.02,.01 test
refinement. Initial determinant error must be below 2e-8, final trajectory error
below 2e-7, and refinement must improve nontrivial errors by at least a factor
of eight. The observed finest maximum was 7.52e-9. Wrong time evolution must
miss by more than .05. The existing residual, positive-amplitude, ordering,
mass, Hamiltonian and wrong-speed tests also run.

Six exact field/print recipes are saved in `results/peakon-field-review.json`:
one/snapshot/lab/profile, two/spacetime/CM/field, three/snapshot/CM/relief,
train/snapshot/lab/profile, overtake/spacetime/CM/log, rest/spacetime/lab/field.
Their times, separations, zoom, seed, palette and aspect are recorded in full.
Each preview uses grid 128 with aspect-dependent height; each real module PNG
has longest edge 2400. The PNG is recomputed at its requested dimensions.
Independent particle integration reconstructs every field value and print
sample. Doubling reference temporal resolution changes the preview by less than
2e-6; production field error must be below 2e-6 (observed 5.97e-8). Every RGBA
channel agrees within one byte with independent palette and display mapping.
One-cell displacement must fail, and exports must preserve the actual field,
scientific diagnostics and recipe exactly.

The speed/slope readouts were correctly computed but misleadingly described as
a measurement of the selected collision. They are now explicitly labeled as a
separate c=1.25 single-peakon control. Their finite-difference slopes and speed
are checked, as are the selected family's sampled H1 ratios.

The completed label covers these positive finite families and recipes. It does
not certify peakon-antipeakon collisions, weak-solution theory, arbitrary
parameters or times, every export backend, or physical wave experiments. The
module evaluates established exact formulas; the independent time integration
is a validation reference, not a new scientific result.
