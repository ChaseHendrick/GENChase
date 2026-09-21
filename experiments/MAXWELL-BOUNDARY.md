# Does the periodic boundary dominate the short-window score?

**The frozen domain-extension hypothesis passed.** Doubling the periodic domain width, while keeping the physical source, rods, target, grid spacing and time step fixed, reduced the uniform-medium score by **98.48% at 128 cells per unit length and 98.13% at 256**. The threshold fixed before evaluation was a reduction of at least 90% on both grids. This is a useful diagnosis of the earlier experiment's boundary sensitivity, not a new physical law or an established novel finding.

The earlier [configuration search](MAXWELL-SEARCH.md) scored electric-field concentration in a target region over times 0.30–0.45. Its source can emit in both horizontal directions. On the unit periodic domain a wave can reach the target by going around the left boundary, bypassing the rods. Extending the domain to width 2 lengthens this route without moving the source, rods or target. The difference also changes interference, so a 98% score decrease **does not mean that 98% of energy followed one identifiable path**.

| Layout | Cells per physical unit | Unit-width score | Double-width score | Score decrease |
|---|---:|---:|---:|---:|
| Uniform, no rods | 128 | 0.0166174 | 0.000252164 | 98.4825% |
| Uniform, no rods | 256 | 0.0169531 | 0.000317687 | 98.1261% |
| Simple two columns | 128 | 0.0173505 | 1.14783 × 10⁻⁶ | 99.9934% |
| Simple two columns | 256 | 0.0177132 | 1.12585 × 10⁻⁶ | 99.9936% |
| Saved random layout 17014 | 128 | 0.0174032 | 5.61082 × 10⁻⁸ | 99.9997% |
| Saved random layout 17014 | 256 | 0.0177660 | 4.41670 × 10⁻⁸ | 99.9998% |

The two rod layouts reverse their ordering: the saved random layout scored slightly higher on the unit domain, but the simple two-column layout scores much higher on the extended domain. Both rod layouts score below the uniform reference after extension. These are observations for the original short window, not transmission measurements or evidence that one layout is generally a better device. The extended-domain scores themselves still vary with refinement, particularly the very small random-layout value; two grids do not establish convergence of every absolute score.

## Fixed setup and checks

The [runner](../tools/maxwell-boundary.js) reads the saved candidate and best simple layout from [the search artifact](results/maxwell-search.json). It refuses a changed source hash or a changed source/target/window setup. There is no new candidate selection in this experiment.

- Physical domains are `[1,1]` and `[2,1]`, periodic in both axes. The meshes are `128×128`, `256×128`, `256×256` and `512×256`; physical spacing is respectively `1/128` or `1/256` in both axes. The step is `0.003125` or `0.0015625`, unchanged when width doubles.
- The initial electric field is the same compact bump centered at `(0.1875,0.5)`, radius `0.14`, with the same cosine modulation. The physical initial magnetic field is zero. A backward magnetic half-step initializes the maintained Yee stagger. Added cells start with zero field and background permittivity; the source is neither stretched nor renormalized.
- The source, target rectangle, twelve-rod geometries, permittivities, permeability and seven sample times exactly match the saved search. Rods are not repeated inside the added domain. Every paired run has exactly the same initial electric integral, initial modified energy, material area and target area.
- The score is the seven-sample trapezoidal time average of the target-region **raw Ez² integral divided by the fixed initial whole-domain Ez² integral**. Node-centered partial-cell areas preserve the target area. The added domain does not change the normalization. This is neither power nor energy efficiency.
- The runner executes the maintained `H_FS` and `E_FS` shaders directly, with rectangular `u_size` and unchanged physical `u_dx`. All twelve physical runs have finite fields and unchanged material values. An independent CPU calculation of the cross-time Yee invariant finds a maximum relative drift of **2.47 × 10⁻⁸**, below the predeclared `10⁻⁴` bound.
- Five original square-domain scores reproduce exactly, including both layouts at both grids. A zero-source run remains exactly zero and is rejected as an undefined normalized score; a deliberately wrong electric-curl sign produces nonfinite fields and is rejected. Fourteen forward runs include these two controls.

The shortest continuum distance from the compact source support to the target is approximately `0.36389` directly. The nearest horizontally wrapped source image gives `0.24017` on the unit domain and `1.23642` on the double-width domain. Background wave speed is 1. These geometric bounds support the proposed explanation; they are not measured ray trajectories or a proof of exact causal support for the discrete scheme. Direct propagation can reach the target during the later part of the same window.

## Reproduce and interpret

Use the browser dependencies described in [BUILDING.md](../BUILDING.md), then run:

```sh
node tools/maxwell-boundary.js > experiments/results/maxwell-boundary.json
```

The [recorded result](results/maxwell-boundary.json) contains every time sample, geometry, grid, step, control, original-score comparison, backend, exact command and source/harness/input-file hash. A failed physical validity check exits unsuccessfully; a valid run that fails the scientific hypothesis still records that negative result.

This is a new diagnostic experiment following the failed search, not a silent replacement for that result. Changing the periodic width changes the mathematical problem. The next layout experiment should explicitly freeze a buffered domain and a window appropriate to direct propagation, then repeat its baseline and defect comparisons. No absorbing boundary, independent Meep replay, physical experiment, full quadrature study, arbitrary-parameter certification or historical novelty claim is provided here.
