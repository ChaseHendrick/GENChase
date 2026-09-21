# Molecular dynamics: bounded numerical and print evidence

This module implements established two-dimensional molecular dynamics. It makes no novelty claim and does not model a named real substance. The tests below support a bounded force, integration, neighbor-search and print assessment, not a complete phase diagram or an all-parameter accuracy guarantee.

The [Allen–Tildesley authors' repository](https://github.com/Allen-Tildesley/examples) accompanies *Computer Simulation of Liquids*, second edition (2017). Its [CC0 license](https://github.com/Allen-Tildesley/examples/blob/master/COPYING.txt), [velocity Verlet implementation](https://github.com/Allen-Tildesley/examples/blob/master/python_examples/md_nve_lj.py), and [simulation guide](https://github.com/Allen-Tildesley/examples/blob/master/python_examples/GUIDE.md) were inspected. GENChase's implementation is original JavaScript, with no Python runtime or copied solver code. The authors' basic monatomic NVE example uses a different cutoff convention and three spatial dimensions; its published equation-of-state numbers are not benchmarks for this module.

## Defined model

Each particle has unit mass in a square periodic box of side `L = sqrt(N / density)`. Reduced units set the Lennard–Jones diameter, energy scale and Boltzmann constant to one. For radial separation `r`, define

```text
V_LJ(r) = 4 (r^-12 - r^-6)
F_LJ(r) = 24 (2 r^-13 - r^-7) = -dV_LJ/dr
rc = 2.5

V(r) = V_LJ(r) - V_LJ(rc) + (r - rc) F_LJ(rc),  r < rc
F(r) = F_LJ(r) - F_LJ(rc),                      r < rc
V(r) = F(r) = 0,                               r >= rc
```

The vector force on particle `i` is `F(r) (r_i - r_j) / r`, using minimum-image separation. Potential and force both approach zero continuously at the cutoff. Force shifting changes the equilibrium separation slightly from the bare LJ minimum `2^(1/6)`; that bare minimum is not asserted as the shifted model's equilibrium.

The numerical method is velocity Verlet: half velocity kick, full position drift, recompute force at the new positions, half velocity kick. There is no thermostat, damping, velocity cap or temperature correction during evolution. Initial velocities are seeded Gaussian draws, with their center-of-mass motion removed and kinetic energy rescaled once to the requested initial temperature. Positions begin on a weakly jittered square lattice; permitted particle counts are squares and the density ceiling keeps initial separations above one diameter.

The instantaneous kinetic temperature is `T = K / (N - 1)`, accounting for two removed center-of-mass degrees of freedom in 2D. It is not an equilibrium temperature estimate with statistical uncertainty. `E/N` is kinetic plus shifted pair-potential energy per particle. Displayed `ΔE/scale` means `(E - E0) / max(N, K0 + abs(V0))`, avoiding a misleading relative error when total initial energy is nearly zero. Conservation diagnostics test numerical consistency, not agreement with experiment.

## Neighbor search and timestep safeguards

Linked cells have widths at least `rc`. Each force evaluation rebuilds the cell lists and visits the surrounding cells, retaining each pair once. Periodic neighbor-cell indices are deduplicated, including when the box is only two cells wide. The optimization does not omit close pairs or change the interaction range.

For a central pair potential, the Hessian's radial and tangential eigenvalues are `V''(r)` and `V'(r)/r`. The code sums the larger absolute value for each interacting neighbor and uses `Lambda = 2 max_i sum_j ||H_ij||` as a frozen-Hessian spectral-magnitude bound. A fixed harmonic mode under Verlet requires `dt sqrt(lambda) < 2`; this implementation stops when the stricter local quantity `dt sqrt(Lambda)` exceeds `0.5`.

This is a local diagnostic, not a global nonlinear stability proof. A separation below `0.6`, a nonfinite state or an energy change above 2% of the defined initial scale also stops the calculation. A failed trial restores the last accepted positions, velocities and forces and displays a reason. It does not clip the trajectory or silently reduce the timestep. Safeguards cannot establish physical accuracy merely by remaining untriggered.

Warmup has a deterministic target step count. Work yields to the browser between short chunks, without changing the timestep or target based on machine speed. Live evolution also chunks larger batches. The same seed and fixed elapsed step count reproduce the state; different machines need not reach that step at the same wall-clock instant. Counts up to 16,384 are opt-in and remain substantial computation despite the neighbor optimization.

## Numerical evidence

Run `node tools/molecular-science.js`; add `--write` to refresh [the measured JSON](results/molecular-science.json). The test instruments the actual module in memory, uses the shell's real seeded RNG, and needs no browser or third-party packages.

| Check | Independent reference / acceptance | Recorded result |
|---|---|---|
| Force equals negative energy gradient | Central differences of independently expressed shifted energy at six separations; error below `2e-7 max(1, abs(F))` | Maximum absolute difference `1.11e-8` |
| Pair signs and cutoff | Repulsion at `r=1`, attraction at `r=1.5`, both potential and force tend to zero at `rc` | Passed; reversing force fails by `48.08`; omitting force shift fails by `0.0390` |
| Linked cells | Independent all-pairs forces and energies at 36, 64 and 256 particles, including two-cell periodic deduplication | Maximum force difference `3.02e-14`; maximum energy difference `1.42e-14` |
| Periodic seam | Isolated `r=1` pair straddling the edge | Force `24.03899947745`; unwrapped failure control gives zero |
| Fixed-time refinement | 16 particles, density `0.5`, initial `T=0.35`, seed `molecular-science`, time `0.5`; independent all-pairs RK4 reference | RMS state errors `6.927e-5`, `1.732e-5`, `4.333e-6` at timesteps `.004`, `.002`, `.001` |
| Reference uncertainty | RK4 steps `.000125` and `.0000625`, same physical time | RMS difference `5.53e-11`, well below the measured Verlet error |
| Conservation | Same refinement fixture; no thermostat | Finest-step peak normalized energy error `1.24e-5`; total momentum below `3.8e-15` |
| Wrong integrator control | One full kick then drift at `.004` | RMS error `3.873e-3`, over 50 times the proper coarse Verlet result |
| Failure and rollback | Deliberately oversized timestep and injected fast collision | Both stop; original state restored exactly, including after an attempted drift |
| Shipped defaults/presets | Each complete declared warmup, one independent fixed seed | All complete without stopping; absolute final normalized energy error at most `2.56e-5` |

The 16,384-particle performance fixture tests 249,569 candidate pairs versus 134,209,536 brute-force pairs after 20 steps. Timing measurements in JSON describe this machine/run only; they are not a browser performance guarantee. This short high-count fixture is not a long-time thermodynamic validation.

## Print and application evidence

`node tools/molecular-print.js --write` uses Playwright and an installed Chromium-compatible browser. Use the development browser setup in [BUILDING.md](../BUILDING.md). Results are in [molecular-print.json](results/molecular-print.json).

At paused evolved seeded states, the test exports raster and real SVG geometry at 2400×2400 and 2400×1800, with links both disabled and enabled at 1,024 particles, plus a completed 1,000-step 4,096-particle fixture. The non-square sheet letterboxes the same physical square. Coordinates, velocities, forces, step count and total energy remain bit-for-bit unchanged. After rasterizing both formats at the same print resolution, reduced-image mean absolute RGB differences must be below `1.5` levels out of 255. The test also operates the real 8-inch, 300-ppi print controls and checks unchanged state, checks the live control advances and pauses, and injects a collision fixture to verify the visible stop diagnostic.

Additional application regression commands:

```sh
node tools/check.js molecular 30000
node tools/export.js molecular 8 300 25000
```

These check every preset, duplicate hash rendering, tab visibility, nonblank output and the actual export preview. Longer settling budgets accommodate the opt-in 4,096-particle preset on a loaded browser. They do not establish scientific accuracy. Wait for `preparing` to disappear before comparing a completed warmup to its print; exporting during warmup captures an intermediate state, and continued evolution can legitimately change the later screen.

## Remaining limits

- No equation-of-state, melting temperature, phase-coexistence or transport-coefficient claim. Apparent clusters and ordering are visual observations in a finite 2D model.
- No full scan over every allowed density, temperature, count, timestep, seed and long elapsed time. Chaotic trajectories eventually separate under tiny rounding changes; cross-engine bitwise agreement is not promised.
- The cutoff is part of the model. No long-range tail correction or force beyond `2.5` is included.
- Initialization and instantaneous temperature are specified, not sampled from an equilibrated canonical distribution. Quantitative equilibrium observables would need equilibration, independent seeds and correlated-sample uncertainty.
- Rendering circles and near-neighbor links is a representation of positions, not literal particle boundaries or chemical bonds. Increasing print pixels sharpens these marks without adding particles or improving temporal accuracy.
