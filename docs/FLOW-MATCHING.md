# Analytic flow-matching plate

The `flow-matching` technique illustrates a modern generative-model construction using a target distribution whose marginal velocity is available analytically. It does not train a neural network or generate learned images. The title names the method being illustrated, not an implemented training pipeline.

Sources read on 2026-09-29: [Holderrieth and Erives, MIT 6.S184, 2026 notes](https://diffusion.csail.mit.edu/docs/lecture-notes.pdf), Section 3, especially Eq. (18), Eq. (20), and Eq. (29); [course](https://diffusion.csail.mit.edu/); [arXiv record](https://arxiv.org/abs/2506.02070). The original method reference is [Lipman et al., Flow Matching for Generative Modeling](https://arxiv.org/abs/2210.02747). The code is an original implementation of the published construction. No course code, weights or datasets are redistributed.

## Implemented distribution and field

Let epsilon be a standard normal vector in two dimensions, independent of Z. The target is an equally weighted mixture of K isotropic Gaussians with means mu_k and variance sigma squared. Set X_t = (1-t) epsilon + t Z. Its marginal density is a mixture with means t mu_k and component variance

```
v(t) = (1-t)^2 + t^2 sigma^2.
```

Within one mixture component, the conditional velocity has the form

```
u_k(x,t) = mu_k + a(t) (x - t mu_k)
a(t) = [t sigma^2 - (1-t)] / v(t).
```

Weight these velocities by the posterior component probabilities proportional to `exp(-|x-t mu_k|^2 / (2 v(t)))`. This gives the velocity used by every trajectory. A log-sum-exp shift prevents posterior weights from underflowing together. Because sigma is positive, the expression is nonsingular at both endpoints. It is an analytic specialization of the marginalization construction, not a claim of a new identity.

The ODE is integrated with fixed-step classical RK4 from t=0 to t=1. All random starting points use the studio's seeded RNG and a Box-Muller transform. Cooperative scheduling changes only when batches run, not their arithmetic or random draws. The view-time control displays a linearly interpolated point along the stored RK4 trajectory. Full Float64 paths, mixture means, width, time and seed are available through the normal data export. SVG emits the paths and points directly; PNG uses the same marks.

## Bounded evidence

Run `node tools/flow-matching-science.js --write` and `node tools/flow-matching-print.js --write`. The browser check needs Playwright. Results remain under `validation/results/`; the initial scientific status is **unvalidated** pending review.

Numerical checks cover an exactly solvable single Gaussian, a five-component spiral mixture, RK4 step refinement, the continuity equation, and five target moments from eight independent seeds with 2048 particles each. The ensemble gate is six standard errors computed across independent seed means. A sign-flipped field fails continuity, and untransported normal samples fail the identical moment gate. A first attempt to use only the x second moment as the untransported control was insufficient because that target moment is close to one; the control now uses the same five-moment predicate as the positive case. The positive-case threshold was not relaxed.

Print checks cover three recipes at 2400 square pixels, exact Float64 trajectory preservation and replay, finite exported data, SVG mark counts, and a deliberate trajectory mutation. `tools/export.js flow-matching 8 300` separately exercises the real print UI for the default and five presets. These are limited numerical and rendering checks. They establish neither uniform accuracy over every recipe nor learned-model performance, physical validity, or calibrated print color.

## Remaining work

Review the marginalization and test criteria independently. Extend convergence checks to minimum-width, many-mode and far-tail cases. A future learned model should be a separate explicit mode with a reproducible dataset, training objective, loss and held-out comparison; this analytic plate must not be relabeled as trained.

A browser replay check initially found an intermittent first-paint difference even though all exported trajectory words matched. An immediate repaint matched the other loads. The renderer now requests a CPU-backed canvas for predictable repeated readback; this changes raster presentation only. Repeat-load coverage is limited to the tested browser, and identical pixels across different browsers or GPUs are not promised.
