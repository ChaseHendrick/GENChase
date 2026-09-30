# Convection scratch reset review, 29 September 2026

## Trigger and scope

PR #255's wave-science job failed in `tools/wave-print-state.js` at the initial
convection export, before any solver step. The log reported 1,948 nonfinite
float32 words among 327,680 checked words, zero changed words, and unchanged
settings, dimensions and metadata. It did not identify the affected texture.
This is a failed finiteness check, not evidence that the export advanced time.

## Confirmed defect

Convection regeneration uploaded the new seeded state only to `F.read`.
It reset both streamfunction textures and the velocity texture, but left
`F.write`, the next advection pass's output scratch texture, untouched.
On a same-size regeneration this retained its previous contents.

A controlled local GPU test uploaded NaNs to `F.write`, regenerated without a
solver step, and read back all solver textures. The scratch texture retained
65,536 nonfinite words at grid 128 and 147,456 at grid 192; the current fluid,
streamfunction and velocity textures remained finite. Fresh local SwiftShader
allocations were zeroed, so this test does not reproduce the original Linux
allocation signature or conclusively identify that job's nonfinite texture.

`regenerate()` now explicitly clears `F.write` to `(0, 0, 0, 1)`. The subsequent
advection pass still overwrites it before it becomes a current solver state.
The seeded field, solver equations, timestep, parameters and scientific
tolerances are unchanged.

## Regression evidence

`tools/wave-print-state.js` now uploads NaNs to the real convection scratch
texture, confirms the contamination, regenerates without advancing time, and
requires every float32 word, scalar and setting to match the initial state.
The error report also names fields containing nonfinite values.

The complete local SwiftShader print-state run passed all four fixtures and
28 actual 2,400 by 2,400 exports, covering both techniques, grids 128 and 192,
all current views, and initial and 16-step evolved paused states. Every export
had zero changed words and zero nonfinite words. Both poisoned-scratch reset
controls recovered exactly, and all four existing solver-advancing export
failure controls were rejected.

The same 28-export check also passed on ANGLE Metal with an Apple M1 Pro. The
renderer probe explicitly reported `software: false`; this separate hardware
run is operational evidence for that device, not a hardware-wide guarantee.

All five existing numerical and instance-state evidence tools also passed on
local SwiftShader: `schrodinger-science.js`, `schrodinger-state.js`,
`schrodinger-absorber-science.js`, `convection-science.js`, and
`convection-coupled-science.js`. Their original acceptance thresholds and
failure controls were retained. These runs preserve the previously documented
bounded domains; they do not extend either technique's validation status.

Removing only the new clear in a scratch copy caused the new reset regression
to fail with 65,536 nonfinite `fluidPrevious` words at grid 128. The test thus
detects the regeneration defect even on a device whose fresh allocations are
zeroed. The original export acceptance predicate and negative control remain
unchanged.

These checks cover bounded reset and paused-export behavior. They do not
establish additional PDE accuracy, nonlinear onset, turbulence, float16
behavior, or success on the original Linux CI runner. A fresh CI run remains
necessary to confirm that job's outcome.
