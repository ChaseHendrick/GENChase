# London disk: Jacobi relaxation against the modified Bessel profile

The `meissner` tab relaxes ∇²B = B/λ² on a pixel disk, with B = 1 outside the radius R. The steady solution of that continuum problem is B(r) = I0(r/λ) / I0(R/λ). The plate's own update is Jacobi with a step of 0.2, and it stores the field in Float32. The default slider stops at 90 sweeps, which is not this review: those sweeps have not reached the steady field.

## Benchmark

`node tools/meissner-science.js --write` runs the module's update through `tools/science-harness.js` and compares the field to an independent power series for I0. The physical disk is fixed at R/λ = 2. Refinement means more cells per λ, which is the mesh size. Each run is stopped only once the discrete residual of ∇²B − B/λ² is below 1e-6. On the stored Float32 field the residual sits near 2e-7, the float32 rounding floor, well under the discretization error.

| λ (cells) | R | grid | sweeps | max \|B − I0\| | centre | 1/I0(R/λ) | interior truncation | observed order |
|---|---|---|---|---|---|---|---|---|
| 8 | 16 | 96 | 8000 | 0.0483 | 0.4248 | 0.4387 | 1.19e-5 |  |
| 16 | 32 | 96 | 22000 | 0.0275 | 0.4315 | 0.4387 | 8.38e-7 | 0.82 |
| 24 | 48 | 160 | 45000 | 0.0179 | 0.4346 | 0.4387 | 1.74e-7 | 1.05 |

The 5-point stencil applied to the exact I0, three cells inside the rim, falls faster than h² (truncation ratios 14.2 and 4.83 against h² factors 4 and 2.25). The solved field approaches I0 only about linearly. The rim is a staircase, so the global error is the boundary error, not the interior truncation. The plate's series for the centre value 1/I0(R/λ) matches the independent series to 1e-12. That comparison is a precision check of the series, not a prediction. The field comparison is a real residual of the relaxation.

## Failure control

The update `lap − B/λ²` was replaced by `lap + B/λ²`, which is ∇²B = −B/λ². On the coarsest disk the max deviation from I0 rises from 0.048 to 4.79. The same acceptance the real update meets is failed.

## Print

`node tools/meissner-print-state.js --write` calls the module's `exportPNG` at 2400×2400, which is 8 in at 300 ppi. The Float32 field, the centre metric, the Bessel number, the cell counts and the settings are unchanged. A second regenerate matches. A width of 2399 is rejected, and adding 1 to the first field word after export is rejected by the same predicate. This says the sheet is the field that was computed. It does not say the default 90-sweep field is the Bessel profile.

## Domain

Parameters: R/λ = 2 at λ = 8, 16, 24 cells, grids 96 and 160, the module's Jacobi coefficient 0.2, residual below 1e-6. Boundary: B = 1 for pixel centres with r ≥ R, and the outer frame of the grid is never updated. The default recipe (λ = 10, R = 48, 90 sweeps) is outside the converged claim. Precision: Float64 update, Float32 storage, independent Float64 I0 series. No laboratory Meissner effect.
