# Cahn-Hilliard disturbance and timestep correction

Two interacting implementation errors could turn one concentration disturbance into a
numerical checkerboard and change total composition after the disturbance had finished.
This correction is supported by bounded regression tests, not a claim that every PDE control
or trajectory is now scientifically validated.

## What changed

The Cahn-Hilliard, Ohta-Kawasaki and Active Model B+ modules declare disturbance mode `0`:
mix the local concentration toward one. Their shared instance used `spec.pokeMode || 1`,
which treated the valid zero as missing and selected additive mode instead. It now uses
`spec.pokeMode ?? 1`. A Gaussian mixture is compared directly against its analytical mixing
weights for all three modules. The explicitly additive disturbance modes in the other PDE
modules retain their behavior.

The passive Cahn-Hilliard timestep estimate also assumed concentration magnitude at most
1.2, although the solver's stored clipping envelope is 1.7. Around a homogeneous
concentration `c_bar`, a perturbation with the unit-cell five-point negative-Laplacian symbol
`q` has linearized growth rate

```text
lambda(q) = -M q (3 c_bar^2 - 1 + epsilon^2 q),   0 <= q <= 8.
Euler amplification = 1 + dt lambda(q).
```

A decaying mode requires `dt * abs(lambda) <= 2` under forward Euler. The ceiling retains
its factor 1.6, but now uses the full 1.7 concentration envelope. Ohta-Kawasaki's ceiling also
includes its additional reaction decay rate `sigma`, matching the implemented
`-sigma * (c - mean)` term. Active Model B+ uses the same passive estimate, with its separate
activity restriction explicitly identified as heuristic.

At `M = 2.5` and `epsilon = 0.6`, the previous ceiling was approximately 0.01290323; the new
ceiling is 0.007582938. A Nyquist perturbation around `c_bar = 1.6` had amplification
approximately -1.4671 with the previous ceiling: a physically decaying mode instead grew
and alternated sign. The corrected factor is approximately -0.44986.

## Reproducible evidence

Run `node tools/pde-stability.js`. It exercises actual maintained shaders and actual module
instances; test-only hooks upload the controlled fixture, advance the solver and read the
float32 state. Raw results are in [results/cahn-stability.json](results/cahn-stability.json).

The 512-cell periodic, constant-mobility Cahn-Hilliard fixtures have zero forcing and compare
identical elapsed times through approximately 1.032258. The last step is shortened when
necessary so differing timestep ceilings are not compared at differing physical times.

| Check | Corrected behavior | Deliberate historical failure |
|---|---|---|
| Real seeded field, `c0 = 0.6`, amplitude 0.02, one center disturbance | No clipped cells at sampled times; maximum subsequent mean drift 3.329e-10 | Restoring both additive disturbance and the old ceiling clips up to 122 cells at sampled times; mean drift reaches 1.473e-4 |
| Injected `1.6 +/- 0.001` checkerboard perturbation | Perturbation decays to float32 resolution; no clipping at sampled times or measured mean drift | Restoring only the old ceiling clips half the cells and changes the mean by about 0.213 |
| Declared mixing mode in Cahn-Hilliard, Ohta-Kawasaki and Active Model B+, 128-cell grids | Maximum error against analytical Gaussian mixing weights below 1.34e-7 | The previous additive behavior would overshoot the specified target concentration |

The homogeneous 1.6 fixture is an injected mathematical test state, not a shipped initial
condition. The historical real-click fixture demonstrates that the omitted amplitude range
was reachable through ordinary supported controls and interaction. The corrected real-click
fixture independently verifies the intended disturbance behavior.

Disturbing a composition field intentionally changes its mean. Conservation error is measured
from the state **after** that interaction, not from the original seeded field. Assertions require
zero clipped cells at the sampled times and mean drift below 2e-8 in the corrected evolution cases; both historical
controls must exhibit clipping and mean drift above 1e-5.

The sanitizer's upper ceiling already wins when it falls below the time slider's 0.002 minimum.
That suspected lower-floor error was tested and was not present.

## Limits and reproduction impact

This is a constant-background linear bound plus two finite-time numerical regression fixtures.
It is not a global nonlinear stability theorem, a variable-mobility bound, an Active Model B+
stability proof, or a validation of clipping, forcing, half precision or all boundaries. States
outside the stored concentration envelope are not covered by this estimate. The scientific
coverage inventory therefore continues to expose the remaining gaps.

Parameter names, seed interpretation and default declarations are preserved. Effective timesteps
can become smaller during sanitization, including for existing recipes. Evolution at a given
step count can therefore change, as can prints made from those evolved states. The three
corrected disturbance modes also change interaction results. These are intentional numerical
and interaction corrections; use an earlier release to reproduce historical behavior. They do
not establish a new physical effect or a novel mathematical result.
