# London disk: multigrid against the modified Bessel profile

The `meissner` tab solves ∇²B = B/λ² inside a circular cross-section with B = 1 on the rim. From recipe v7 it uses cell-centred multigrid and a Shortley-Weller boundary. Its Float64 solution is stored as a Float32 display field. Earlier recipes retain their Jacobi sweeps.

## Review and reference

Reviewed 2026-09-29. The existing status remains **validated within stated limits** for the enumerated numerical and print fixtures below. This refresh repairs an inconsistency: the registry and numerical harness already described multigrid, but this note and the stored print artifact still described the old Jacobi source. The browser export has now been rerun on the current source. Source and harness SHA-256 values are recorded in both artifacts.

For an axial field invariant along the cylinder, the radial equation is B'' + B'/r = B/λ². With z = r/λ it is the order-zero modified Bessel equation. The solution regular at the centre and equal to 1 at R is I0(r/λ)/I0(R/λ). The independent series follows [NIST DLMF 10.25.1 and 10.25.2](https://dlmf.nist.gov/10.25); the singular second solution is excluded by regularity at zero ([DLMF 10.30](https://dlmf.nist.gov/10.30)). These identities verify the stated boundary-value problem, not a laboratory material or the full Meissner and Ochsenfeld experiment.

## Numerical evidence

```sh
node tools/meissner-science.js --write
node tools/meissner-print-state.js --write
```

The numerical command executes the maintained `solveLondon` and compares every interior sample against an independently summed I0 series, cut at 1e-18 of its sum and anchored at I0(1) = 1.2660658777520084. The [numerical artifact](results/meissner-science.json) enumerates 16 fixtures: the default, its Relax-floor variant, all six presets, and eight domain/refinement corners. Grids are 96, 160 and 224; aspects include 1:1, 4:5, 5:4 and 16:9. This is a finite set, not every combination of those slider ranges.

Acceptance is max |B − I0(r/λ)/I0(R/λ)| ≤ 1e-3, operator residual below 1e-8 and cycles within the specified Relax cap. Every fixture passes in 11 to 16 cycles. The largest field error is 7.664241e-4, at grid 96, λ = 4, R = 16. The default error is 1.264776e-4 in 14 cycles. Thus a user-reachable default now lies inside the numerical domain.

At fixed R/λ = 4, refining λ = 8, 16, 20 cells gives:

| λ | R | grid | max field error |
|---|---|---|---|
| 8 | 32 | 96 | 2.069513e-4 |
| 16 | 64 | 160 | 5.359860e-5 |
| 20 | 80 | 224 | 3.462406e-5 |

The first refinement has order 1.949; the second error ratio is 1.548 against the second-order ratio 1.5625. The physical disk and penetration-depth ratio are fixed; the outer rectangle may differ because the circular Dirichlet boundary defines the tested problem.

The sign-flipped source, ∇²B = −B/λ², fails the same field/residual acceptance by a large margin. The legacy Jacobi solver at 240 sweeps matches an independent copy of the old loop exactly, but misses the Bessel profile by 0.57456. Those legacy recipes remain outside the validation domain.

## Browser export

The [print artifact](results/meissner-print-state.json) records a fresh actual `exportPNG` run and its browser environment. All three fixtures also occur in the numerical run:

| Fixture | cells | λ | R | Relax | PNG pixels | max Float32 field error |
|---|---|---|---|---|---|---|
| default | 160×160 | 10 | 48 | 90 | 2400×2400 | 1.2648053e-4 |
| portrait | 160×200 | 10 | 48 | 40 | 1920×2400 | 1.2648053e-4 |
| wide | 224×126 | 10 | 40 | 40 | 2400×1350 | 1.3377040e-4 |

The longest edge is 8 inches at 300 ppi. Every export preserves all Float32 field words, core metric, independent I0 mean, cycle count and settings; regenerate is deterministic. A PNG one pixel too narrow and a deliberate post-export field/scalar mutation fail the same acceptance predicate. The output is nonblank. This checks the field being printed, state preservation and dimensions; it does not independently calibrate the palette or compare every raster pixel against a reference.

## Limits

Only the 16 enumerated numerical fixtures and three print fixtures are covered. The circle must clear the frame: R < min(W,H)/2 − 1. A circle cut by the frame is a different boundary-value problem and is excluded. The rim value is nonzero Dirichlet B = 1, not homogeneous zero boundary data. Precision is Float64 multigrid, Float32 display field and RGBA8 PNG. There is no claim about all slider combinations, legacy Jacobi convergence, material parameters, external review or a hardware sweep.
