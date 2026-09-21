# A held-out test of a Cahn–Hilliard coarsening calibration

The known late-stage constant-mobility scaling is a one-third power law. This experiment asks a narrower practical question: can one simple fit predict the structural length of unseen recipes over a short, declared time window in the actual finite-lattice implementation? Any successful fit is a **local empirical calibration**, not a novel formula or a replacement for established coarsening theory.

## Protocol frozen before production trajectories — 2026-09-21

Only homogeneous and sinusoidal technical timing/readback controls preceded this protocol. No random coarsening trajectory or fitted exponent was inspected.

- Actual production `MU_CH` and `STEP_CH` shaders, periodic square lattice with unit cell spacing, float32 GPU targets, constant mobility M=1, no forcing, no degenerate mobility, no disturbances. Baseline N=128; timestep 0.008, below the production full-envelope linear ceiling for all selected epsilon values. This is a finite-lattice study; varying epsilon is not continuum spatial refinement.
- Six seeds `cahn-scaling-0` through `cahn-scaling-5`. Independently seeded uniform concentration noise in [−0.1, +0.1], with sample mean subtracted. The same seed at the same N uses exactly the same initial field across epsilon and timestep. This is an explicit experimental initialization, not a claim that the shell's default recipe is reproduced.
- Run all six seeds for epsilon 0.8, 1.0 and 1.2. Observe scaled times `tau=t/epsilon²` equal to 16, 24, 32, 48, 64 and 96. Shorten only the final timestep at each requested time so all comparisons use the same physical elapsed time.
- Measure the nonzero-mode structure factor `S(k)=|FFT(c−mean(c))|²`, with physical wavevector `k=2π(nx,ny)/N`. Define the characteristic length `L=2π sum(S)/sum(|k|S)`, including every nonzero 2D mode without radial-bin weighting. A single sinusoidal mode must give its known wavelength, independent of amplitude and constant offset. This length convention is stated explicitly because other moments/normalizations give different coefficients.
- Independent measurement controls: direct 2D DFT versus FFT on a small deterministic field; Parseval; axial and oblique pure modes; offset/amplitude invariance. Omitting the 2π factor and using only the x component of an oblique wavevector must fail. Actual GPU small-amplitude mode growth must agree with the discrete Euler factor `(1+dt*q*(1−epsilon²*q))^steps`, with `q=4sin²(kx/2)+4sin²(ky/2)`, to absolute amplitude error below 2e−7. A reversed-mobility control must fail by more than 1e−5.
- Training set: seeds 0–3, epsilon 0.8 and 1.2, tau 16, 24, 32 and 48. Fit the **preselected** two-parameter model `L/epsilon = A*tau^p` by ordinary least squares in log space. Also fit the known-exponent baseline with p fixed to 1/3, estimating its A on exactly the same training set. No offset, extra exponent, polynomial or post-result fit search.
- Held-out categories: (1) seeds 4–5 at the two training epsilon values, all observation times; (2) epsilon 1.0 for all six seeds and times; (3) later tau 64 and 96 for the eight training trajectories. These categories are disjoint. Report length-relative RMSE, worst whole-seed RMSE, and errors by category. Observations within a seed are correlated; never call time points independent replicates.
- Frozen predictive acceptance: each held-out category relative RMSE ≤8%; worst whole-seed held-out RMSE ≤12%; pooled held-out relative RMSE at most 75% of the p=1/3 baseline error. This is a stringent utility screen for finite-time prediction, not a test that established asymptotic theory is wrong.
- Stability/uncertainty: exact whole-seed bootstrap over four training seeds (all 4⁴ resamples, keeping both epsilons and all times together). Report percentile 95% intervals for A and p. Require exponent interval width ≤0.10. Fit again on training times 16/24/32 and 24/32/48; require exponent difference ≤0.05. These small-ensemble bootstrap intervals are descriptive, not guaranteed confidence coverage.
- Numerical/size controls: epsilon 1.0, seeds 4–5 repeat at timestep 0.004 from identical initial fields; require every sampled L to change by ≤2%. Repeat those seeds at N=256, same unit cell spacing and physical times; require the two-seed mean L at each time to differ by ≤8%. This is a larger-domain check, not spatial refinement. N=256 draws a new independent field from the same seed's stream; it is not a tiled copy.
- Every 128 updates and at all reported times, read back the field; record finite values, maximum amplitude, mass drift and discrete free energy. No observed clipping, maximum observed |c|<1.69, mean-concentration drift <2e−5, and no monitored free-energy increase exceeding 1e−5 times the initial energy are required. These sampled guards cannot prove that clipping never occurred between checks. Require L<N/4 at every fitted/held-out sample to avoid an obviously box-sized length.
- Reject the calibration if any numerical, size, predictive or fit-stability guard fails. Retain all trajectories, coefficients, errors and failures; do not tune parameters after the result. No equilibrium/continuum/exponent discovery or novelty claim regardless of outcome. The frozen protocol text, shader sources, RNG, data producer and Python analysis carry hashes.

## Prior work and scope

[Bray's phase-ordering review](https://arxiv.org/abs/cond-mat/9501089) and [Bray–Rutenberg](https://arxiv.org/abs/cond-mat/9303011) establish the growth-law framework. [Chakrabarti, Toral and Gunton (1993)](https://journals.aps.org/pre/abstract/10.1103/PhysRevE.47.3025) studied 2D Cahn–Hilliard structure factors and late growth approaching exponent 1/3. Their primary abstracts were read before this protocol. This short finite-lattice study does not replicate their full long-time scaling analysis, and a fitted p away from 1/3 would not demonstrate a different asymptotic exponent.

## Reproduce

Run `node tools/cahn-scaling.js --write` with Playwright and a working float32 WebGL2 browser, then `python3 tools/cahn-scaling.py --write`. The Python fit, whole-seed bootstrap and held-out analysis use only the standard library. `node tools/cahn-scaling.js --controls` checks the independent FFT/moment diagnostics without a browser; `python3 tools/cahn-scaling.py --controls` checks the analysis against synthetic known laws and failure cases.

Raw GPU measurements: [cahn-scaling.json](results/cahn-scaling.json). Analysis: [cahn-scaling-analysis.json](results/cahn-scaling-analysis.json). No production module or recipe changes.

## Results

**The calibration was rejected because its fitted exponent was not stable across the frozen time windows.** The 22 actual GPU trajectories took 94.7 seconds on the test machine; all measurements and failures are retained. No random coarsening run preceded the protocol above. This was an internally frozen exploratory protocol, not an externally preregistered study.

The candidate training fit was `L/epsilon = 5.3290*tau^0.18172`. This is a record of a **rejected fit**, not a recommended formula or a novel exponent. The fixed-one-third baseline fitted `A=3.2205` on exactly the same training observations.

| Held-out group | Candidate relative RMSE | Fixed-one-third relative RMSE |
|---|---:|---:|
| Unseen seeds | 2.61% | 8.98% |
| Unseen epsilon | 3.05% | 8.49% |
| Later times | 4.89% | 11.85% |
| All held-out observations | 3.41% | 9.44% |

The candidate passed the declared predictive-error screens. Its worst whole-seed held-out RMSE was 4.09%. The whole-seed bootstrap's descriptive 95% interval for p was [0.17999, 0.18453]. But fitting the early window gave p=0.14727 and the later window gave p=0.22050: the difference 0.07323 exceeded the predeclared 0.05 limit. The narrow bootstrap interval describes seed variation inside one chosen window; it does not cover this systematic window dependence. The acceptance rule therefore rejects the formula despite its small held-out error.

The selected timestep check passed: halving dt changed every measured length by at most 0.00533%. The selected larger-domain check passed: the largest change in the two-seed mean length was 0.669%. Those are bounded checks at epsilon 1, not full parameter or continuum validation.

All monitored states were finite. Maximum observed amplitude was 1.03953, maximum mean-concentration drift 9.69×10⁻⁷, and there was no monitored free-energy increase. No length exceeded N/4. The independent FFT/direct-DFT error was 2.69×10⁻¹⁴, and the actual GPU mode-growth amplitude error was 1.33×10⁻¹¹; reversed mobility gave 4.16×10⁻⁵ and was rejected. The metric's missing-2π and wrong-wavevector controls failed as intended. The Python analysis recovered a synthetic known law, rejected corrupted held-out values, kept those values out of fitting, and preserved whole-seed uncertainty when frames were duplicated.

The useful conclusion is that this short window does not support one stable power law. Beating an asymptotic reference in a short-time prediction test does not disprove that reference. The observations are consistent with evolving finite-time behavior, but they do not establish its mechanism, a different asymptotic exponent, or a new law. No model form, times, seeds or thresholds were adjusted after the run.
