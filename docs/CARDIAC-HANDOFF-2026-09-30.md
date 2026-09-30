# Cardiac Study Work and Handoff, September 30, 2026

## Current conclusion and paper readiness

The literature/feasibility study is complete through Phase E. The subsequent exact-model implementation and real certification attempts are saved. **No periodic-orbit existence, certified orbit period or stability theorem has been established.** Failed sufficient tests do not show that the orbit is absent or unstable.

The study is now assembled as an unpublished working feasibility manuscript, `outputs/cardiac-study/MANUSCRIPT.tex` and `MANUSCRIPT.pdf`. The standalone source compiles in the built-in editor; the PDF includes two data figures, all 18 exact test centers/scales, ordinary numerical checks, three completed validation attempts, a reproducibility discussion and primary references. Citation, data and method reviews are saved under `work/cardiac-study/manuscript-*-review.md`. A paper claiming rigorous certification still needs its central theorem. There is no reliable percentage or time estimate for proving it.

The original attached request was a literature/feasibility task. The owner subsequently explicitly authorized implementation and an actual certification attempt. That later human instruction permits the saved solver work; it does not permit labeling unsuccessful calculations as proofs. No cardiac manuscript, certificate, release or Zenodo deposit was published. A GitHub copy of these handoff notes is being pushed in a separate documentation PR at the owner's request.

## Files to read first

The workspace root is `/Users/chasehendrick/Documents/Codex/2026-09-29/github-plugin-github-openai-curated-remote`.

- `outputs/cardiac-study/README.md`: study index and current distinction between deliverable completion and proof status.
- `outputs/cardiac-study/MANUSCRIPT.tex`, `MANUSCRIPT.pdf` and `MANUSCRIPT-STATUS.md`: editable article, review PDF and checks/remaining publication work.
- `outputs/cardiac-study/PHASE-A.md` through `PHASE-E.md`: literature, evidence, fixed target, method specification and spatial/PDE scope.
- `outputs/cardiac-study/CERTIFICATION.md` and `CERTIFICATION-RESULTS.json`: actual implementation outcomes and exact result links.
- `outputs/cardiac-study/BRIEF-CAPD.md/pdf` and `BRIEF-CARDIAC-MODELING.md/pdf`: completed one-page audience briefs from the feasibility stage.
- `work/cardiac-study/certification/README.md`: build/runtime instructions and evidence layout.
- `work/cardiac-study/certification-audit/AUDIT.md`: independent source, scalar/AD, domain and receipt audits.
- `work/cardiac-study/certification-checker/README.md`: arithmetic contract and limits.

Preserve these directories. They are outside the GENChase Git checkout, so committing or archiving GENChase alone does not save this study. Full-text sources under `work/cardiac-study/sources/` are research inputs; do not indiscriminately redistribute them with a paper or source ZIP.

## Fixed target

The model is the autonomous, smooth, potassium-clamped 18-state endocardial TP06-derived `fun_eval` in the author's MATLAB `TP06_18d_endo_bif.m`. It is not the original 19-state TP06 model. Author commit: `dc78f86fd218418e029ec43d945bcd0fc54b9f1e`. Source SHA256: `a50f6c08b4360dd257cce389a39ae72fda51e3642641bf5b8e5fced6c2225670`.

Fixed parameters are `g_Kr=0.0153`, `g_Ks=0.0275`, `g_Na=14.838`, `g_K1=5.405`, `g_CaL=0.000199`, `C_m=1`, `K_i=138.3` and zero stimulus; every other constant is retained from the pinned source. Every finite decimal coefficient is interpreted as an exact rational. All 18 states remain dynamic. Do not clip gates, freeze concentrations, change forcing or move parameters to get a favorable result.

State order is `V, xr1, xr2, xs, m, h, j, d, f, f2, fCass, s, r, Rprime, Ca_i, Ca_SR, Ca_ss, Na_i`. Scales are `[1,1,0.1,1,1,1e-8,1e-8,1,0.1,1,1,0.01,0.1,1,0.001,3,0.2,10]`. The exact candidate decimal center is in `certification/candidate-inputs.json`; its ordinary source is `outputs/cardiac-study/PHASE-C-NUMERICS.json`.

The section is `V=1/5` mV, ascending, using CAPD `MinusPlus`. Exclude time zero and all earlier ascending crossings, while allowing the descending crossing. The target is a nonconstant periodic orbit, period within `[53.58,53.59]` ms and all 17 nontrivial Floquet multipliers within `|mu|<=0.999`. No EAD classification, original-model conclusion, tissue result or global attraction is asserted.

Important trap: `ordinary_tp06_check.py` defaults to `g_Ks=0.073`, the rejected earlier trial. Explicitly use `0.0275` for this target. Do not use the author's generated Jacobian/hessian expressions as the exact-decimal target; differentiate the audited `fun_eval` graph.

## Ordinary evidence already obtained

The computed period is about `53.5855193394` ms; sampled voltage spans about `0.141260` to `0.256843` mV, a small oscillation. Scaled shooting closure is about `3.37e-13`, separate Radau closure `1.54e-12`, BDF closure `5.83e-9`, and the largest computed nontrivial multiplier modulus is about `0.9974772613`. These are ordinary numerical diagnostics.

Files include `ordinary_cycle_candidate.py`, `ordinary_phase_d_conditioning.py`, `phase-d-proof-conditioning-matrices.npz`, `PHASE-C-CANDIDATE.csv`, `PHASE-C-STATE-CHECKS.csv` and `PHASE-D-CONDITIONING.json`. The raw scaled section map is strongly nonnormal; an ordinary adapted Lyapunov metric reduces its computed norm to about0.998284. That supplies candidate matrices, not stability certification.

The completed figures keep annotations and legends outside data panels. Preserve `FIGURE-CONVENTIONS.md`; the owner expressly rejects labels over graph data in this and other papers. Bounded literature search misses do not establish exhaustive novelty. Phase E distinguishes full-PDE rigorous benchmarks from computed ionic spirals; do not promote a finite-grid result into a PDE theorem.

## Implemented and audited machinery

CAPD is pinned to `03dc5628203334b214bb7d9fd63788a175521005`, version6.1.0. Its default FILIB configure failed on ARM64 and the diagnostic was retained. The native ARM64 interval backend built with Apple clang, `-frounding-math`, no fast-math flag, and runtime directed-rounding controls.

`generate_model.py` produces the literal graph and exact constant manifest: 117 assignment trees, 125 rational parameters and all18 equations. Independent structural audit passed. At13 candidate/nearby states, 234 compiled interval RHS values, 4,212 interval Jacobian entries and1,625 parameter controls enclosed independent160-digit references. Candidate decimal centers/scales and the exact section were checked.

`cardiac_flow.cpp` propagates a full `C1Rect2Set` and audits every whole-step tube: four positive concentrations, finite bounds, exclusion of `V=15`,137 exact domain obligations and section transversality. The pinned first-return solver supplies the return-time enclosure. The raw C1 flow derivative is converted with `computeDP` before the17-coordinate restriction/scaling. The endpoint field and uncertain return time belong in this correction. An uncorrected monodromy submatrix is not the required return derivative.

`from_flow.py` rejects incomplete/stale receipts and uses the separate point run for `F(0)` and the full positive-radius box for corrected `DP`, return time and slope. `interval_checker.py` uses exact rational operations and outward192-bit dyadic rounding, exact nonsingularity of the specified preconditioner, strict Krawczyk inclusion, weighted contraction and interval LDL tests for `H>0` and `(999/1000)^2 H-D^T H D>0`.

The arithmetic checker deliberately always reports `orbit_certified_by_this_checker=false`: it checks conditional matrix/root implications, while the flow/model/first-return supplier must be independently audited. Synthetic and ordinary-point diagnostics are never cardiac certificates.

## Actual attempts and failures

| Run directory under certification/runs | Radius/set | Outcome |
| :--- | :--- | :--- |
| `20260930T040339Z` | `1e-12`, C1Rect2Set | Complete point/box returns in192.668s. Independently replayed790 tubes/108,230 guards. Return time `[53.58550,53.58554]` ms rounded outward; weighted contraction about0.07032. Krawczyk inclusion and Lyapunov positivity failed. |
| `20260930T040806Z` | `1e-7`, C1Rect2Set | Complete returns in189.162s. Replayed822 tubes/112,614 guards. Return time `[53.28121,53.91365]` ms rounded outward; weighted contraction about1751.998. Inclusion, contraction, target time and Lyapunov tests failed. |
| `20260930T041247Z-ho` | `1e-7`, C1HORect2Set | Distinct compiled source/binary; only set representation changed. Stopped by revised120-second external budget after119.806s. Last log: point step300 at about40.8533ms. Neither return completed. Inconclusive timeout. |
| `20260930T045924Z-ho` | `1e-7`, C1HORect2Set | Completed normally in220.857s under a360-second cap. Replayed818 tubes/112,066 guards/578 corrected derivative entries. Return time `[53.34697,53.84154]` ms rounded outward. Inclusion, contraction, target time and Lyapunov tests failed; no certificate. |

The tiny-box inclusion margin is about `-1.027e-8`; its residual uncertainty exceeds the radius. The larger-box margin is about `-1.7511e-4`; widening the box worsened wrapping substantially. Both complete runs have positive transverse crossing slopes and verified candidate-metric positivity. Derivative uncertainty prevents the required stability inequality. Do not call either failed test a counterexample.

All three complete flow/domain/corrected-derivative receipts and exact arithmetic outcomes were independently reproduced. The completed HO run narrows the larger-box return-time interval, but its contraction bound is still about1307.184 and its inclusion margin about `-1.30629e-4`. Positive transverse slope and metric positivity pass; existence and stability remain unproved. Each run retains source snapshots, logs and hashes. Baseline/HO executable and library bytes are retained in `certification-checker/provenance/`. All compute has stopped.

## Next steps, in order

1. Read the receipts and audit notes; reuse the completed literature and ordinary candidate. Do not rerun the full survey or ordinary settling calculation without a specific need.
2. The properly bounded HO trial is complete, adapted and independently replayed. Read `certification/runs/20260930T045924Z-ho/attempt-outcome.json` and the corresponding checker/audit files. Do not rerun the unchanged trial without a reason. The runner now supports `--seconds` (1..360, default360) and `--radius`; the original runner bytes are retained. The solver's270-second per-stage limit remains separate. Do not rerun `enforce_ho_budget.py`: it targets the old trial's exact process identity.
3. Keep source/model/acceptance criteria fixed while assessing a genuinely different enclosure strategy. Compare against all three completed attempts and preserve every failed stage. Require complete point/box receipts before adaptation and independent replay.
4. If wrapping still blocks inclusion, investigate better affine coordinates and structured C1 sets, a separately pinned higher-precision CAPD configuration, or shorter matching segments/multiple shooting. Native ARM64 double intervals are the current configuration; MPFR flow is not installed or audited. Do not replace it with an ordinary high-precision solver and call it validated.
5. Establish existence first through a strict root inclusion on a common smooth first-return domain. Then certify the enclosed orbit period and refine the derivative/metric for stability. Report any partial theorem precisely. A return-time interval for a tested box becomes an orbit-period conclusion only after the fixed point is proved.
6. Review the assembled feasibility manuscript and its status note. It retains the unsuccessful-test results. A certification paper still needs successful audited proof records. The reviewed layout keeps legends/annotations outside axes, uses the public email and states manuscript rights separately. Before public publication, review the scientific scope, choose a companion archive/repository, audit the reproducibility bundle and dependency notices, and ensure any release source ZIP contains the exact reviewed PDF. No cardiac deposit exists now.

## Commands and runtime

Use `/Users/chasehendrick/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3` (Python3.12). System Python is3.9. Builds/dependencies already exist locally; do not fetch/build them again unless needed. The scripts use recorded workspace paths. The build directory is `certification/CAPD-build`; the linked library is `libcapd.a`. Respect CAPD's GPL distribution requirements and the original model's MIT notice if distributing source or linked binaries.

From the workspace root, the fast arithmetic controls are:

```sh
CARDIAC_PY=/Users/chasehendrick/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
"$CARDIAC_PY" work/cardiac-study/certification-checker/check_arithmetic.py
"$CARDIAC_PY" work/cardiac-study/certification-checker/check_adapter.py
```

For a complete newly produced receipt, replace `RUN` with its actual directory and `TAG` with that directory's basename. Preserve the filename pattern used by the replay audit:

```sh
"$CARDIAC_PY" work/cardiac-study/certification-checker/from_flow.py RUN/stdout.json --output work/cardiac-study/certification-checker/flow-TAG-arithmetic-input.json
"$CARDIAC_PY" work/cardiac-study/certification-checker/interval_checker.py work/cardiac-study/certification-checker/flow-TAG-arithmetic-input.json --output work/cardiac-study/certification-checker/flow-TAG-arithmetic-result.json
"$CARDIAC_PY" work/cardiac-study/certification-audit/flow_receipt_audit.py RUN
```

The adapter/checker support distinct audited baseline/HO harness names. Checker exits0 only when all conditional arithmetic tests pass,1 when a sufficient test fails and2 for rejected input. The independent audit uses assertions, so run it without Python `-O`. The replay helper expects the `flow-TAG-arithmetic-{input,result}.json` naming pattern above, including the `-ho` suffix if present in the run directory name. Do not overwrite historical arithmetic files. Native priority changes may require sandbox approval; preserve the resource budget and process identity.
