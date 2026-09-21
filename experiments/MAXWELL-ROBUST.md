# Nominal versus missing-rod selection after the boundary diagnosis

**The primary hypothesis failed:** nominal and worst-deletion selection chose the same buffered-domain layout, so changing the selection objective added no advantage in this pool. The experiment also found that the robust winner changed when the domain was enlarged. All 370 physical simulations passed the independent numerical validity checks; two deliberate controls were rejected.

This is a **new, frozen experiment**, specified on 2026-09-21 before its simulations. It follows the [periodic-boundary diagnosis](MAXWELL-BOUNDARY.md); it does not replace the earlier failed [configuration search](MAXWELL-SEARCH.md). No novel law, optimization method or physical device performance is claimed.

## Question and prior work

Does selecting a layout for its worst single-rod deletion choose something different from selecting its nominal score, and does any advantage survive finer grids and previously unseen geometric/material errors? Does the ranking of the same candidate pool change between the unit periodic domain and a larger domain with a longer wraparound path?

Robust photonic design and the nominal/robust tradeoff are established. [Blankrot and Heitzinger's 2020 thesis chapter 6](https://www.heitzinger.info/Papers/Blankrot2020thesis.pdf) compares traditional and worst-case optimization of dielectric-rod radii; its indexed author-hosted abstract was inspected, but the direct PDF retrieval failed. [Men et al. (2014)](https://arxiv.org/abs/1307.5571) provide fabrication-adaptive photonic optimization (abstract inspected), and the [official Meep tutorial](https://meep.readthedocs.io/en/latest/Python_Tutorials/Adjoint_Solver/) describes minimax photonic design. These references rule out a broad originality claim. The exact small protocol below was not located by the recorded targeted searches; this does not establish that it is historically new. Any contribution here is a reproducible, bounded test of this setup.

## Protocol fixed before evaluation

- **Pool:** twelve equal-material layouts: the two existing simple patterns and ten fresh seeded random twelve-of-twenty-four-site patterns starting at seed 37001. The complete pool is fixed before simulation. Earlier winners do not enter by special selection. Each intact layout has twelve identical rods of radius 0.03125 and relative permittivity 4, on the same physical site grid as the earlier search. Permeability and background permittivity are 1.
- **Initial condition and target:** the previous compact electric bump, its center `(0.1875,0.5)`, radius 0.14, modulation and amplitude stay fixed; physical H at time zero is zero. The same target rectangle is used. Rods and source stay in their original physical coordinates when the domain changes, with no replicated rods inside the added region and no source renormalization.
- **New observation window:** seven times `0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90`. This later window is fixed to examine direct propagation after the original short-window problem. The objective remains the trapezoidal average of raw regional Ez² divided by the initial whole-domain Ez² integral, not power or transmission efficiency.
- **Domain comparison:** every layout and all thirteen conditions (intact plus each single deletion) run at 128 cells per physical unit on both `[1,1]` and `[2,2]`. Physical spacing and time step are the same across domain sizes. The larger domain also extends the vertical period. Its closest horizontal periodic source-image support is about 1.236 units from the target, beyond the window at background speed 1. This is a continuum geometric inference, not a discrete causality proof; a further `[3,3]` comparison tests sensitivity numerically.
- **Two selection rules on the buffered domain:** maximize the intact score, or maximize the minimum over the intact case and all twelve single deletions. Deterministic ID ordering breaks numerical ties. The robust training score cannot be worse by construction, which is a selection fact and not independent evidence of scientific success. All candidates share one evaluated pool; this is not a comparison of optimization algorithms with equal forward-simulation cost.
- **Finalists:** the buffered nominal winner, buffered robust winner and better simple pattern under the robust objective, deduplicated. Every finalist repeats all thirteen conditions at 256 cells per unit. The intact condition and the worst condition identified at 256 repeat at 512, at 256 with half the time step, and at 128 on `[3,3]`. Thus the finest grid does not certify all deletions; it tests the selected worst condition.
- **Held-out errors:** eight predetermined seeds 47001–47008 generate independent per-site horizontal/vertical displacements uniform in ±0.006, plus one common radius factor and permittivity factor uniform in ±5% per case. Each finalist sees the same error fields at 256 cells per unit. These cases are withheld from all selection and parameter tuning. Paired mean differences and a deterministic 10,000-resample percentile bootstrap describe this small sample only, not all possible defects or numerical uncertainty.
- **Primary frozen hypothesis:** the two rules choose different layouts; the robust choice improves the full worst-case score at 256 by at least 5%, loses no mean held-out score, and passes the prescribed sensitivity checks. The 256-to-512 score difference must be ≤5%, half-step difference ≤1%, and domain-2-to-3 difference ≤1%, for both winners' intact and selected-worst conditions. Negative outcomes are retained without changing thresholds or the window. Full-pool rank correlations between domains are reported as secondary observations.
- **Independent validity checks:** actual maintained Maxwell H/E shaders; float32 field and unchanged material checks; a separate CPU cross-time energy calculation with maximum relative drift `10⁻⁴`; zero-source and wrong-curl controls must be rejected. Dependency-free checks ensure the pool is unique, all single deletions are included, invalid runs cannot be ranked and the selection rules can return different winners.

The maximum planned budget is 399 forward runs: 312 shared selection evaluations, at most 81 finalist checks, four noncompeting uniform references and two deliberate controls. Deduplicated finalists or a worst condition equal to the intact condition reduce the count. The runner reports the actual budget. The two objective calculations reuse the same 312 evaluated simulations; they are not separate equal-cost search arms.

## Reproduction and evidence

Use the browser setup in [BUILDING.md](../BUILDING.md):

```sh
node tools/maxwell-robust.js --check
node tools/maxwell-robust.js --plan
node tools/maxwell-robust.js > experiments/results/maxwell-robust.json
```

The plan command lists the complete pool and held-out error bank without running a simulation. The result records source, harness, protocol and prior-boundary-artifact hashes, every field score/time sample, validity check, ranking, finalist and compute count. A failed scientific hypothesis is recorded as a negative result; an invalid physical run fails execution.

The source uses the classical lossless periodic Yee TMz model. Rasterized rod boundaries, a finite pool, eight sampled perturbations and seven-time quadrature limit the conclusion. No absorbing boundary, full continuous-time integration study, independent Meep replay, physical experiment, universal robustness or historical originality is established.

## Recorded outcome

Both buffered-domain objectives selected **random-37005**, occupying sites `0, 1, 2, 4, 6, 11, 13, 14, 15, 16, 18, 19`. Therefore the robust-versus-nominal gain is exactly zero, below the frozen 5% threshold, and the distinct-selection condition fails. The held-out difference and its bootstrap interval are also exactly zero because they compare the **same saved layout and runs**; that is an identity, not independent evidence of precision or generalization.

The unit-domain robust winner was random-37007. On the buffered domain it became random-37005, while the nominal winner remained random-37005. Across all twelve layouts, the domain-to-domain Spearman rank correlations were **0.7762 for nominal score and 0.7692 for worst-case score**. This supports boundary-sensitive selection in this model and window. Both periodic dimensions were enlarged here; the preceding boundary experiment separately isolated horizontal extension.

| Buffered-domain finalist, at 256 cells per unit | Intact score | Worst of intact + 12 deletions | Worst retention | Mean of 8 held-out cases | Held-out range |
|---|---:|---:|---:|---:|---:|
| random-37005, selected by both rules | 0.00945909 | 0.00704481 | 74.48% | 0.00938855 | 0.00842429–0.0104260 |
| Simple two columns | 0.00879859 | 0.00281388 | 31.98% | 0.00864351 | 0.00778144–0.00969767 |

The selected random layout performed better than this simple baseline in these recorded comparisons. This is a descriptive layout result, **not** evidence that worst-case selection outperformed nominal selection: the two rules returned the same candidate. The pool was selected on the 128 grid; only the two finalists were fully checked at 256, so no finest-grid optimum over the whole pool is established.

The finest-grid and sensitivity checks were favorable within their limited scope:

- For random-37005, intact and selected-worst scores changed by **0.81% and 0.47%** between 256 and 512 cells per unit. Half-step changes were **0.021% and 0.0063%**. Its selected worst deletion was site 19 at both 128 and 256.
- For the simple pattern, corresponding 256-to-512 changes were **0.17% and 0.060%**; half-step changes were **0.055% and 0.134%**. Its selected worst deletion was site 12. That defect score had changed by **6.35% from 128 to 256**, so the coarser score should not be treated as high-precision evidence.
- The `[2,2]` and `[3,3]` scores were identical at the recorded precision for the finalists' intact/selected-worst runs at 128. Uniform-reference scores also matched across these domains at 128 and 256. This is a measured domain-sensitivity check, not a proof of exact continuum causality or of all later times.
- All 370 physical runs had finite fields and unchanged materials. The maximum independent cross-time energy drift was **4.21 × 10⁻⁸**, below `10⁻⁴`. Initial source norms were exactly equal across all layouts, defects and domains at each grid. Zero-source and wrong-curl controls were rejected. Saved source and harness hashes match the files that generated the artifact.

The [full result](results/maxwell-robust.json) records **372 forward runs**: 312 selection cases, 54 finalist checks, four uniform references and two controls. The fixed hypothesis and thresholds were retained after the negative outcome. This finite study provides a reusable baseline and a demonstrated sensitivity to periodic-domain choice; it establishes zero new physical laws or confirmed novel scientific findings.
