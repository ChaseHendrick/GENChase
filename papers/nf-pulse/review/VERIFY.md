# Referee verification of the nf-pulse computer-assisted proof

Date: 2026-09-26. Four checkers ran in parallel, each independently. Each wrote its own report, and this file merges them.

| Check | Report | Scripts |
|---|---|---|
| 1. Mathematics | [MATH.md](MATH.md) | `math/01_algebra.py`, `math/02_manifold.py`, `math/03_block.py` |
| 2. Code audit and mutation tests | [CODE.md](CODE.md) | `code/` (`mutate.py`, `results.md`, `lohner_sensitivity.py`, `env_mutation.sh`) |
| 3. Independent reimplementation | [REIMPL.md](REIMPL.md) | `reimpl/` (see `reimpl/README.md`; it never read `code/` or `data/`) |
| 4. Prior art | [PRIOR-ART.md](PRIOR-ART.md) | none (the searches are listed in the report) |

Two other things are on this branch. `review/second/` is a separate review of the same claim by another session. `reimpl/common.py`, `reimpl/rest_eigen.py`, `math/charpoly_check.py` and `math/surface_check.py` also came from that session. None of the four checkers above used any of these files. This verdict cites `review/second/` in one place only (F5, below), and says so there.

Baseline: after `pip install -r code/requirements.txt` (Python 3.11), `sh code/run_all.sh` passes all 15 checks in about 8 s on 4 cores.

## Verdict

**The theorem stands as a candidate result. Nobody found a counterexample, and nobody found a gap that breaks it. The harness that is supposed to certify it is weaker than the README says, and the written proofs do not exist yet. It should not be called independently reviewed until the must-fix items below are closed.**

- **Mathematics: every step has a complete argument, written out in MATH.md.** The steps are:
  - the reduction to the wave ODE;
  - the invariance of Y = S(U), together with the first integral that puts the manifold point on that surface;
  - the eigenvalue count at rest for every c > 0;
  - the tail bound on the unstable manifold;
  - the block lemma;
  - the Wazewski-type shooting.

  Condition (C) is certified at every point of B and for every kappa in the interval, not only at the centre. The field is linear in the state with one slope s in [S'(-0.05), S'(0.05)], and the test is affine in s, so checking the two endpoints covers the whole range. Two statements in the README are false as written, and the fixes are listed below. The separate review in `review/second/math/MATH.md` also found no gap.
- **Code: no soundness bug found by reading** `lohner.py`, `block.py`, `manifold.py`, `certify_rest.py` or `nfcore.py`.
  - The a priori Picard enclosure is evaluated over the whole candidate box, kappa included, and over [0, h].
  - The Lagrange remainder is evaluated over the a priori box.
  - The mean-value Jacobian carries d/dkappa.
  - B^-1 is a rigorous inverse, not B^T.
  - The between-steps path is enclosed over [0, h].
  - All parameters are exact rationals, and no float decides an inequality.

  The problem is the harness. Mutation testing shows that `run_all.sh` cannot detect most integrator bugs, one of its checks can never fail, and it can be defeated through environment variables.
- **Reimplementation: the shooting data is independently confirmed; the existence conclusion is unconfirmed.** The rest state and the eigenvalue count are confirmed rigorously. The reimplementation used its own integrator, a Taylor method with a high-order a priori enclosure, eigen-coordinates and no QR, and its own manifold enclosure, a quadratic-cone lemma rather than a series. With them:
  - The orbit at c1 leaves rest along the negative unstable direction (a < 0, then U < -0.1).
  - The orbit at c2 leaves along the positive one (a > 0, then U > 0.1).
  - Both results are rigorous, with radii of order 1e-25.

  This agrees with the README's "c1 enters K-, c2 enters K+", as far as the sign of the unstable coordinate can show it. The isolating block and the Wazewski step were not rebuilt, and neither was the claim that every orbit is in the interior of B at xi = 53. The reimplementation's interval-in-c run loses tightness around its xi = 130, which is a limit of its method. A 90-digit shooting, not rigorous, gives c* = 1.10274770973415924914786773574662173325505338378182087892726005..., confirming 62 digits. It matches every digit the README quotes and lies inside [c1, c2] (c* - c1 = 3.57e-26).
- **Prior art: new as far as reached, but the priority check is incomplete.**
  - None of the four named papers proves a pulse for a smooth firing rate at a fixed, non-small eps, as far as they could be read.
    - Zhang 2005 was read only on pp. 489-490.
    - Zhang, JDE 2004, only through its abstract and two secondary sources.
    - Pinto, Jackson and Wayne 2005, and Sandstede 2007, only through their abstracts.
  - Every model visible in these readings uses a Heaviside rate. Pinto, Jackson and Wayne treat eps as fixed, but with a Heaviside rate.
  - Two or three new searches found no competing result.
  - Zhang 2005 from Sect. 2 on, and Theorem 1 of Zhang JDE 2004, must still be read with library access before any priority claim.

## Findings

### Must-fix

1. **M1. The written proofs are missing** (QUALITY.md item 1). The README describes the block lemma, the shooting argument, the manifold tail bound and the reduction, but proves none of them. MATH.md supplies drafts of all of them, and these should be moved into the manuscript and checked again. *Source: math.*
2. **M2. A check in `run_all.sh` can never fail.** Line 28 greps `'^dU 0.05 cone PD'`, and `block_check_iv.py:77` prints that prefix both before "CERTIFIED" and before "FAILED". I confirmed this by reading the two lines. Mutation M34 forces FAILED, and the check still prints OK. The fix is to grep for `-> CERTIFIED`. The theorem itself is unaffected, because `prove_pulse.py` re-certifies the block in arb. *Source: code and math, independently.*
3. **M3. The harness can pass a block that fails its own conditions.** `prove_pulse.py:43,121` enforce the block and manifold conditions with `assert`, and `run_all.sh` does not clear the `NF_*` environment variables. Running the unmodified code with `NF_DU=0.15 PYTHONOPTIMIZE=1` prints all 15 OK, while the proof log records `cone_pd False, entrance_ok False`. The fix is to replace each `assert` with an explicit check that exits nonzero, and to have `run_all.sh` unset or pin every `NF_*` variable. *Source: code (reproduced, `code/env_mutation.sh`).*

### Should-fix

4. **S1. `run_all.sh` has no power against integrator bugs.** 13 of the 16 integrator mutations still pass all 15 checks, including:
   - no Lagrange remainder;
   - no Picard test;
   - a point instead of the a priori box;
   - B^T in place of B^-1;
   - dropping d/dkappa;
   - the Jacobian taken at xbar.

   At order 30, tolerance 1e-45 and 256 bits, these terms sit more than 20 orders of magnitude below the widths that decide the proof. Soundness of the integrator therefore rests on reading the code, which two reviewers did and which found nothing, and not on the harness. `test_lohner2.py neg` is not run by `run_all.sh`. The fix is to add a low-order, low-precision sensitivity test like `code/lohner_sensitivity.py`, which catches M01, M02c, M04, M05 and M07, together with the existing negative control. *Source: code.*
5. **S2. The Jacobian test has no pass threshold** (`run_all.sh:31`, `test_jacobian.py:37`). An error of 4.7e-2 still prints OK. *Source: code and math.*
6. **S3. The block labelled "certified" is not the block the proof uses.** `block.py` and `data/block_certificate.json` use r = 1.25 rho, while the proof uses r = 4 rho with a recomputed rho. `block_check_iv.py` re-checks (C) and (E) but never the U-range, and a mutation that triples the U-range (M14) passes. The separate review reports, in `review/second/math/check_block.py`, that the U-range of the proof block is at most 0.0486589 < 0.05 in mpmath.iv; this verification did not rerun that script. *Source: code, math, and the separate review.*
7. **S4. The README says the set of speeds whose orbit enters each cone is open.** That is false without the qualifier "while staying in B since xi = 53". It also calls the cones "forward invariant in B", which should read "invariant relative to B". *Source: math.*
8. **S5. Two lemmas the proof needs are stated nowhere.**
   - The surface lemma. In 5D there is a line of equilibria (0, a, a, 0, a), and the fifth eigenvalue at rest is 0, transverse to Y = S(U). The proof needs the manifold point to lie on the surface, which follows from the first integral logit(Y)/beta - U = -theta.
   - Continuity of the manifold point in kappa.

   *Source: math.*
9. **S6. The `block.py` docstring justifies (E) by the "affine" argument, which covers only (C).** (E) holds because both of its terms are convex in s. *Source: math.*
10. **S7. Descartes' rule and the imaginary-axis argument exist only as a code comment.** Write them out. The argument is correct: it was checked in exact rational arithmetic, and the reimplementation confirmed it independently. *Source: math and reimplementation.*
11. **S8. `test_lohner.py` is not run by `run_all.sh`, and `test_lohner2.py` crashes without an argument.** *Source: math and code.*
12. **S9. Priority is not yet checked from the primary texts.** Read Zhang, J. Dyn. Differ. Equ. 17 (2005), from Sect. 2 on, and the hypotheses of Theorem 1 in Zhang, JDE 197 (2004). Hao and Vaillancourt (2015) say those hypotheses "cannot ensure the existence" of the solutions. *Source: prior art.*

### Nits

13. **"U reaches about 0.76" is a rigorous lower bound only.** The math check certifies sup U >= 0.7596; the reimplementation certifies a peak in [0.7597, 0.7745].
14. **The README never states the direction of travel.** With c > 0, u = U(x + ct) moves left. The kernel is even, so the reflection x -> -x gives a right-moving pulse.
15. **"Exactly a pulse" needs a definition of pulse** for the converse direction.
16. **The manifold is described as valid for |t| <= 1 but is proved only on |t| < 1.** Only t = 1/4 is used, so this does not affect the proof.
17. **In `block_data`, rho is replaced by its midpoint without re-asserting the U-range bound.**
18. **The negative controls each fail for more than one reason**, so none of them isolates (C), (E), s < 1, the between-steps check or the cone test. For example, the c = 1.1024 control fails by leaving |x| < 5 at xi about 14.6, before any cone logic runs.
19. **`block_check_iv.py:74` adds two upper bounds with round-to-nearest.** It is not directed rounding, but it is harmless at the margins observed.
20. **Stale-file risks.** `block_check_iv.py` may read a stale committed `block_certificate.json`, and a PASS `proof_*.json` from an earlier run can survive a crash. The logs themselves are overwritten before each check reads them.
21. **The README says the summary is in `data/run_all.txt`, but `run_all.sh` does not write that file.**
22. **The "perturbed eigenvalue" control in `certify_rest.py:172` starts 3.8e-9 from lambda(c1), not 1e-15 away.**
23. **Every `run_all.sh` run rewrites the `time_s` field in `data/*.json`.** This dirties the working tree.

## Unconfirmed

- **The existence conclusion is not reproduced by independent code.** Only the mathematics was checked, by two readers. The isolating block, the relative invariance of the cones, and the interior-of-B claim at xi = 53 for the whole speed interval were not reproduced.
- **The content of Zhang 2005 beyond its first two pages, and of Zhang JDE 2004 beyond its abstract.**
- **Pinto and Ermentrout's sign convention for the travelling direction.** It does not matter, by the reflection in item 14.
- **The correctness of Arb (python-flint 0.9.0), which every rigorous step relies on.**

## Recommended next steps before the README says "reviewed"

1. Fix M2 and M3 in `run_all.sh` and `prove_pulse.py`, then re-run the mutation driver (`review/code/mutate.py`) to confirm that M34 and the environment mutation are now caught.
2. Add a sensitivity test for the integrator (S1) and a threshold for the Jacobian test (S2).
3. Write the proofs from MATH.md into the manuscript, including the surface lemma and the corrected openness statement.
4. Read the two Zhang papers in full. The draft RESEARCH.md entry is in PRIOR-ART.md and was not applied.
