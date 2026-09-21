# Molecular structure after different velocity preparations

This is a bounded initialization-sensitivity experiment using the actual molecular module. It is established nonequilibrium molecular dynamics, **not a novel formula or evidence of a new phase**. The practical question is whether equal-energy recipes can retain different particle structure after a fixed warmup merely because their velocities were organized differently.

## Protocol frozen before the first experiment run — 2026-09-21

The following choices precede measurements; keep failed checks and null results. The executable repeats these constants and includes a protocol fingerprint in its JSON. Any later protocol must be a separately identified experiment.

- The production 2D periodic, force-shifted Lennard–Jones model, cutoff 2.5, double-precision linked-cell forces and velocity Verlet. No thermostat or forcing after initialization.
- Eight independent seeds `molecular-memory-0` through `molecular-memory-7`; N=256, density 0.70, timestep 0.002. Prepare one common configuration per seed by evolving the module's jittered lattice for time 4 with initial kinetic scale 0.45. Preparation is a fixed procedure, not a claim of equilibration.
- Copy exactly the prepared positions into three arms. All start at the prepared total kinetic energy K; subtract center-of-mass velocity and rescale. Thus initial potential energy, total energy, and total momentum agree to floating-point error.
- **Gaussian:** independent isotropic Gaussian velocities. **Organized:** 75% of K in a mean-subtracted transverse flow `vx ∝ sin(2πy/L)`, plus 25% Gaussian residual energy. Project the residual x velocities off both sine and cosine at that wavelength before normalization. **Shuffled:** permute the organized arm's velocity-vector pairs across particles, retaining its complete one-particle velocity distribution, energy and momentum but removing the imposed spatial arrangement. This control separates spatial organization from velocity-distribution shape.
- Sample time 0, 2, 4, 6, 8, 10, 12, 14 and 16 after the velocity replacement. The **primary outcome** is each seed's mean structural statistic over times 8, 10, 12, 14 and 16; frames are not treated as independent samples.
- For each particle, neighbors have minimum-image distance below 1.45. For particles with 4–8 neighbors, let `S = Σ exp(6iθ)` and `C6 = (|S|² − z)/(z(z−1))`. Average C6 over eligible particles. This is the ordinary angular pair alignment with self-pairs removed, not a proposed new identity. Unlike `|S|/z`, independent random angles have zero expected C6 for every eligible neighbor count. Also record `|S|/z`, coordination histograms and coverage. Require at least 80% eligible particles and mean coordination at least 4 at every late sample in every arm before interpreting this structural outcome; otherwise report an inconclusive sparse-neighborhood test.
- Independent geometry controls: a central hexagonal shell gives C6=1; a central square gives C6=−1/3; rigid rotation leaves C6 unchanged; two-neighbor shells are ineligible. An explicitly summed angular-pair formula must agree with the complex-sum formula. A deliberately wrong fourth angular harmonic must fail the hexagonal control. A periodic seam fixture must agree with its unwrapped shell; ignoring the seam must fail.
- Compare organized minus Gaussian and organized minus shuffled using eight paired seed means and a two-sided Student t 95% interval (7 degrees of freedom). A descriptive effect is supported only when **both** intervals exclude zero, both mean differences have magnitude at least 0.02, and the directions agree. This intersection rule is a practical threshold for this bounded experiment, not universal significance or a claim of adequate power for every effect. No selection of favorable frames or seeds.
- Separately measure the fraction of kinetic energy in the least-squares sine/cosine projection of transverse velocity at the imposed wavelength, at the current particle positions. To call an effect *memory after flow decay*, require that fraction below 0.05 at every organized-arm late sample. Otherwise it is dependence on preparation while residual flow remains. Total K/(N−1), if reported, is a **kinetic scale**, not equilibrium temperature.
- Refinement: seeds 0 and 1 repeat all three arms at timestep 0.001 from the identical prepared positions and velocities. Report the change in each seed's paired late-window difference; require absolute change below 0.01 for both comparisons to support this limited numerical check. This is not long-time trajectory convergence, and two seeds cannot validate the entire ensemble.
- Size check: N=1024, seeds 0 and 1, same density, time, timestep and preparation, with two wavelengths across the box. Because L doubles, the physical wavelength is unchanged. Report direction and effect size without an eight-seed confidence claim or a thermodynamic-limit claim.
- Record all stopping diagnostics, maximum energy drift over every accepted step, maximum momentum magnitude, initial matching errors, exact source fingerprints and runtime. Required numerical guard: no stopped trajectories, absolute normalized energy error below 0.0005, momentum per particle below 1e−10. A numerical failure invalidates interpretation and remains in the result.

## Why this is useful, and what is already known

[Widmer-Cooper, Harrowell and Fynewever (2004)](https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.93.135701) established a configuration-based approach to reproducibility of dynamical heterogeneity. [Heyes (1986)](https://pubs.rsc.org/en/content/articlelanding/1986/f2/f29868201365) studied shear-dependent ordering in a Lennard–Jones liquid. [Errington, Debenedetti and Torquato](https://arxiv.org/abs/cond-mat/0208389) quantified structural order for shifted-force LJ preparations. [Wierschem and Manousakis (2011)](https://arxiv.org/abs/1103.5379) studied 2D bond-orientational and translational correlations with much larger simulations. These primary abstracts were read before the protocol was frozen. Their models, dimensions, ensembles and questions are not all identical to this experiment, and this is not an equation-level replication of those papers.

The test can reveal a practical limitation of finite warmups in GENChase. It cannot establish equilibration, ergodicity failure, a glass, hexatic order, phase boundaries, a new memory mechanism, or novelty. Local sixfold alignment alone does not identify a phase. The unchanged initial structure is a matching check, not the scientific finding.

## Reproduce

Run `node tools/molecular-memory.js --write`; `--controls` runs only the independent metric and matching controls. Results go to [molecular-memory.json](results/molecular-memory.json). CPU-only, no browser or extra dependencies. This experiment introduces no production solver or recipe changes. Its source hashes identify the solver/RNG used independently of generated studio/catalog files.

## Results

**No supported structural-memory effect was found. The selected timestep-refinement check also failed, so this is not evidence that memory is absent.** The unchanged protocol above was saved before the first experimental trajectory; results below were added afterward. It was an internally frozen exploratory protocol, not an externally preregistered study.

The complete CPU run took 85.7 seconds on the test machine: 24 main trajectories, six half-step trajectories, six larger-system trajectories and ten common-configuration preparations. All 36 trajectories reached time 16 without stopping. Geometry, flow projection, exact shuffled-distribution and negative controls passed.

| Late-window C6 comparison, eight paired seeds | Mean difference | Approximate 95% paired t interval | Frozen effect threshold |
|---|---:|---:|---|
| Organized minus Gaussian | +0.00520 | −0.02901 to +0.03941 | Not met |
| Organized minus shuffled | +0.00179 | −0.02191 to +0.02549 | Not met |

The late C6 means were 0.31135 (Gaussian), 0.31655 (organized) and 0.31475 (shuffled). These are descriptive outputs at the declared timestep, not converged material constants. Individual seed differences had both signs. The intervals include zero and practically relevant nonzero values; they do not support equivalence. Treat each entire seed's late-window mean as one statistical unit.

The neighborhood guard passed: eligible fraction was at least 84.375% and mean coordination at least 4.5234 in the main late window. The organized arm's residual imposed-mode energy fraction was at most 3.061%, below the frozen 5% threshold throughout that window. This rules out an obviously large surviving imposed mode under that particular diagnostic; it does not establish full equilibration or absence of other correlations.

The initial total-energy mismatch was at most 1.14×10⁻¹² across all arms and sizes. Maximum normalized energy drift during any trajectory was 2.02×10⁻⁵; maximum total momentum magnitude was 6.76×10⁻¹³. The energy normalization is the module's `max(N, K_initial + |V_initial|)`, not division by a possibly near-zero signed total energy.

**Retained failure:** halving the timestep from 0.002 to 0.001 changed the seed-0/1 paired C6 differences by 0.06388/0.10584 against Gaussian and 0.06201/0.09557 against shuffled, all above the declared 0.01 limit; all four contrasts changed sign. Energy errors became smaller, but that alone does not make these late finite-sample structural results converged. The existing [short-time independent solver checks](../validation/MOLECULAR.md) remain a different, bounded kind of evidence. This experiment does not diagnose the cause of the late sensitivity or establish a solver defect.

At N=1024 and the same physical wavelength, the two-seed mean differences were +0.00834 against Gaussian and +0.00113 against shuffled. Two seeds provide a limited size check, without a confirmatory interval or a thermodynamic-limit conclusion.

The useful outcome is a reusable controlled test and a constraint on interpretation: one finite warmup, one seed, or good energy conservation cannot establish persistent structural memory. A future claim would need a separate protocol with enough independent seeds at each timestep and a longer, demonstrably stable observation window. No favorable seed, frame, threshold or parameter was selected after inspecting this run; no new formula or confirmed novel finding is claimed.
