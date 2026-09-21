# Cahn-Hilliard correction, 2026-09-21

The optional degenerate-mobility update used `M(c) * Laplacian(mu)`. The displayed equation,
`div(M(c) grad(mu))`, also contains the mobility-gradient contribution. The old update could
change total composition in a periodic, noise-free system. This was a numerical implementation
error, not a novel physical effect.

The corrected update uses the arithmetic mean of the two cell mobilities at each face,
multiplied by the chemical-potential difference. Each face contributes equal and opposite
fluxes to its neighbors. Periodic boundaries cancel pairwise; clamp-to-edge boundaries give
zero outward flux. The constant-mobility path retains its original arithmetic.

[NIST PFHub's governing equation](https://pages.nist.gov/pfhub/benchmarks/benchmark1.ipynb/)
provides the conservation-law comparison. This test is not a reproduction of its full benchmark.
[Lee, Munch and Suli](https://arxiv.org/abs/1507.02410) also show why quadratic degenerate mobility
with polynomial free energy should not be described as guaranteeing pure surface diffusion.
The interface wording is corrected accordingly. Independent cell forcing is now labeled additive
forcing, not thermal noise; it is not the conservative stochastic Cahn-Hilliard model.

## Evidence and limits

`node tools/pde-science.js` runs the actual GPU shaders against an independent double-precision
CPU stencil. It covers periodic/no-flux boundaries, constant/variable mobility, grids 64, 128,
256 and 512, and 32 steps. The deliberately reversed update must fail the comparison.

Before correction, variable mobility produced maximum field error 0.00046075 and mean drift
0.00022484 on the periodic fixture. After correction, the maximum error over all 16 cases was
9.991e-8 and maximum mean drift 3.435e-9. Raw results are in `results/cahn-before-correction.json`
and `results/cahn-mobility.json`. The old implementation fails the new test.

This establishes a bounded discrete-stencil check. The cell spacing is fixed: the four grids
are not a continuum convergence study. Noise, clipping and half precision are excluded. There
is no claim of validated long-time coarsening, all controls, or agreement with experiments.

## Reproducibility impact

Existing parameters and seeds still load. Historical images using degenerate mobility will
change because their old dynamics were incorrect. Constant-mobility update arithmetic and
all defaults are preserved. Use the earlier release to reproduce the old flawed dynamics;
the corrected implementation does not silently advertise those dynamics as valid physics.
The same conservative helper is applied to the optional mobility branch in the Ohta-Kawasaki
shader; that module's full scientific validation remains outstanding.
