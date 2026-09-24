# Reproducible experiments

**Zero confirmed novel findings.** These are bounded numerical experiments on published models. Protocols, failures, results and source fingerprints are retained. The hypotheses were fixed internally before each run; they were not externally preregistered.

| Experiment | Recorded outcome | What it supports |
|---|---|---|
| [Maxwell layout search](MAXWELL-SEARCH.md) | ❌ Improvement threshold failed | No meaningful advantage established over the simple layout |
| [Periodic boundary follow-up](MAXWELL-BOUNDARY.md) | ✅ Boundary sensitivity detected | The selected time window and periodic domain altered scores and reversed the two finalists' ranking |
| [Nominal versus robust selection](MAXWELL-ROBUST.md) | ❌ Different-winner hypothesis failed | Both objectives selected the same candidate from the frozen pool |
| [Molecular preparation sensitivity](MOLECULAR-MEMORY.md) | ⚠️ Inconclusive; refinement failed | No supported memory effect and no evidence of its absence |
| [Correlated Schrödinger disorder](SCHRODINGER-DISORDER.md) | ⚠️ Preliminary screening signal | Greater finite-time spread in this small ensemble; the inferential conclusion depends on the interval method |
| [Least-winding vortex collapse](VORTEX-COLLAPSE.md) | 🔄 Open; volunteer search | Certified local minima of the winding for many vortex counts; a zero-winding collapse of 11 vortices at α = 2, checked at 60 digits; no Euler lower bound established |
| [Cahn coarsening calibration](CAHN-SCALING.md) | ❌ Formula rejected | Held-out predictions were useful, but the fitted exponent depended too strongly on the fitting window |

A passed hypothesis is not a new law, and a negative experiment does not show that its effect is impossible. Each report states its model, reference, thresholds, numerical checks and remaining gaps.

The Cahn experiment includes a **Python analysis layer**: `python3 tools/cahn-scaling.py` fits the saved measurements, evaluates held-out predictions and resamples whole seeds for uncertainty. It uses only the Python standard library. The simulations remain in JavaScript/WebGL; the existing Python launcher serves the folder studio (`index.html`) locally.
