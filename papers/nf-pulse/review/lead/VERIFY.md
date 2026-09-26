# Referee verification of `papers/nf-pulse`: merged verdict

Date: 2026-09-26. Four independent checks, each run by its own agent in parallel, then merged here by the
session that launched them. Each check's full report and scripts are in this folder:

| Check | Report | Scripts |
|---|---|---|
| 1. Mathematics | [`math/MATH.md`](math/MATH.md) | `math/charpoly_check.py`, `math/surface_check.py`, `math/block_points_check.py` |
| 2. Code audit and mutation tests | [`code/CODE.md`](code/CODE.md), `code/mutation_results.txt` | `code/mutate.py`, `code/lohner_stress.py` |
| 3. Independent reimplementation | not committed (see "Reimplementation files" below) | not committed |
| 4. Prior art | [`priorart/PRIORART.md`](priorart/PRIORART.md) | `priorart/scripts/` |

A second, concurrent review of the same folder by another session sits beside this one
(`review/MATH.md`, `review/PRIOR-ART.md`, `review/code/`, `review/math/`, `review/reimpl/`, `review/second/`).
This verdict does not use or assess it.

## Verdict

**No gap was found in the proof as it is run by `sh code/run_all.sh` in a clean environment. The existence
theorem is confirmed by reading, and (after a second round, below) independently recomputed with a separately
designed block and integrator.** In detail:

- **Confirmed by reading (math check):** the reduction to the wave ODE, the invariance of Y = S(U) on the
  orbit used, the eigenvalue count at rest for every c > 0, the unstable-manifold series and its tail bound,
  conditions (C) and (E) at every point of B for every kappa in the ball, and the Wazewski-type shooting.
  Five of these arguments are not written anywhere in the paper folder yet (F1 to F5 below); MATH.md
  supplies them.
- **Confirmed by code audit:** the a priori enclosure, the Lagrange remainder, the mean-value map with its
  d/dkappa column, the QR-based Lohner update and the between-steps path check are rigorous as written. No
  float decides a rigorous inequality, the parameters, c1 and c2 are exact rationals, and each inequality
  points the right way. The step width `h = float((t - tp).mid())` in the between-steps check (`prove_pulse.py:148`) is exact
  today, because the step lengths are dyadic, but it is fragile (nit C7).
- **Recomputed independently (reimplementation, own integrator, no code read):** rest state and eigenvalues
  for all c in [c1, c2]; the orbit at c1 leaves with U < -1 and the orbit at c2 with U > +1, which are
  opposite sides, as claimed. A validated bisection narrows the switch to an interval of width 1.5e-32
  that contains the claimed speed. A 60-digit shooting agrees with all 33 quoted digits.
  In the first round the isolating block, the whole-interval run and the Wazewski step were not recomputed;
  the second round (`reimpl/block/BLOCK.md`, section "Independent existence step" below) did them.
- **Prior art:** the specific result (logistic S, kernel e^{-|x|}/2, eps = 1/10, gamma = 0, computer-assisted)
  looks new as far as reached. However, the README's framing must change (P1), and priority remains
  **unconfirmed** until the full texts of the Zhang papers and Pinto, Jackson and Wayne are read (P3).

## Findings

Severity: must-fix, should-fix, nit. Status: confirmed (reproduced or proved), unconfirmed.

### Must-fix

- **C1. The rigorous gates of the proof driver are Python `assert` statements** (`prove_pulse.py` lines 43
  and 121, `manifold.py:91`, `block.py:84`). Running with `PYTHONOPTIMIZE=1 NF_DU=0.15` and no code change
  prints all 15 checks OK and three `VERDICT PASS`. The log itself records `cone_pd: False`. Confirmed by the
  code check, and reproduced independently by the merging session on a scratch copy. The proof as normally run is
  not affected, but a certificate must not depend on the interpreter's flags. Replace each `assert` with an
  explicit check that prints FAIL and exits non-zero, and make `run_all.sh` refuse to run with
  `PYTHONOPTIMIZE` set.
- **P1. The literature framing omits the closest prior work.** Burlakov, Oleynik and Ponosov,
  *Mathematics* 13 (2025) 701, doi:10.3390/math13050701 (open access, read in full; existence checked on
  Crossref). It treats the same Pinto-Ermentrout model and allows a fixed eps with
  0 < eps < (sigma + 4)^-1, which includes eps = 1/10. Its Theorem 3 gives travelling waves for continuous
  rates that approach a Heaviside, conditional on a Heaviside pulse meeting their conditions (17) to (19)
  and (21). The prior-art check reads it as not covering this theorem, for these reasons: it assumes a C^1
  kernel (e^{-|x|}/2 is not C^1 at 0); by that check's reading, its Lemma 5 needs integrability that a
  logistic with S(0) > 0 lacks; it verifies no concrete example; and it is not computer-assisted. The
  README must cite it and state the difference. Confirmed that the paper exists and is on this model. The
  claim that it does not cover the present theorem rests on one reader.

### Should-fix

- **F1 (math).** "The set of speeds whose orbit enters each cone is open" is false as worded. It needs
  "while its path since xi = 53 stays in the interior of B", which is what the code checks.
- **F2 (math).** B is not shown to be isolating, and the cones are forward invariant only while the orbit
  stays in B. Neither stronger property is needed, but the README's wording overstates what is proved.
- **F3 (math).** `data/block_certificate.json` and the run_all "B" checks describe a block with r = 1.25 rho,
  but the proof uses r = 4 rho, which `prove_pulse.py` re-checks. The mpmath re-check (`block_check_iv.py`)
  does not re-check that block's U-range bound.
- **F4 (math).** Openness needs the manifold point P_kappa(1/4) to be continuous in kappa. It follows from the
  tail bound validated over the whole kappa ball, but the paper does not say so.
- **F5 (math).** The 5D system has a line of equilibria (0, a, a, 0, a), so "the surface Y = S(U) is
  invariant" is not enough by itself. MATH.md proves that the specific orbit lies on the surface.
- **C2 (code).** `NF_R_OVER_RHO=0.5` gives a block with r < rho, and all 15 checks still pass. The code never
  checks r > rho. `run_all.sh` should unset every `NF_*` variable, and the driver should check r > rho.
- **C3 (code).** Two checks in `run_all.sh` (the mpmath.iv re-check, line 28, and the Jacobian test, line 31)
  grep for text that is printed on both success and failure, so they cannot fail except by a crash.
- **C4 (code).** 21 of 32 mutations that weaken rigor pass all 15 checks. Examples: dropping the Taylor
  remainder, skipping the a priori test, replacing the rigorous inverse of Q by its transpose, weakening
  (C) or (E), dropping the kappa width, dropping the manifold tail, and removing the path check. This is
  expected: the true orbit still satisfies the inequalities, so an end-to-end run cannot see lost rigor. But
  it means the suite gives no evidence that the rigor is present. The integrator tests (`test_lohner*.py`)
  are not in `run_all.sh` and set no exit status. Unit tests of each rigorous component are needed.
  `code/lohner_stress.py` already catches the remainder and Jacobian mutations.
- **P2 (prior art).** Pinto, Jackson and Wayne (2005) already prove existence at a fixed eps, for a
  Heaviside rate ("make no other assumptions about the recovery rate", from the abstract). The novelty
  must therefore be stated as "a smooth S at a fixed eps", not "a fixed eps".
- **P3 (prior art).** The full texts of Zhang, J. Dyn. Differ. Equ. 17 (2005), Zhang, J. Differential
  Equations 197 (2004), Pinto, Jackson and Wayne (2005) and Sandstede (2007) could not be reached. Their
  abstracts and zbMATH reviews show a Heaviside rate (Zhang), fixed eps with a Heaviside (Pinto, Jackson and
  Wayne) and stability only (Sandstede). Also unread: Enculescu, Physica D 196 (2004), and Zhang,
  Math. Z. 255 (2006). No priority claim before these are read. Note that the README's second Zhang
  reference title was wrong: J. Differential Equations 197 (2004) is "Existence, uniqueness and exponential
  stability of traveling wave solutions of some integral differential equations arising from neuronal
  networks".
- **R1 (reimplementation).** Keep the status "not independently reviewed" in the README. The
  reimplementation covers only the ends of the interval and the speed, not the block or the shooting step.

### Nits

- **F6.** The stated reason for checking (E) only at s in {smin, smax} ("the sets are convex") is wrong. The
  right reason is that the bound is convex in s. The conclusion holds.
- **F7.** "U reaches about 0.76" is proved only as a lower bound (0.75966) by the proof. The reimplementation
  gives a rigorous upper bound of 0.76094 on the c1 orbit and a numerical maximum of 0.759716.
- **F8.** The negative control at c = 1.1024 fails at xi of about 14.6, before the block is reached, so it tests
  the shooting, not the block.
- **F9.** "A homoclinic orbit ... is exactly a pulse": only the direction from a homoclinic orbit to a pulse is
  proved and used.
- **C5.** The M checks choose sigma with a float heuristic (`manifold.py:180`), while `prove_pulse.py:119`
  hardcodes sigma = 1/7 and re-validates the manifold itself, through an `assert` (see C1). Both give 1/7 today,
  but they would diverge silently if either changed.
- **C7.** `prove_pulse.py:148` rebuilds the step length as a float instead of taking it from the integrator.
  This is exact for the current dyadic steps. A change to the step-size rule could round it down and leave
  the end of a step unchecked.
- **C8.** `block_check_iv.py` reads T back from `data/block_certificate.json` and hardcodes its own copies
  of the parameters.
- **C6.** T is built from `numpy.linalg.eig` and then stored exactly, which is sound. The block's quality
  depends on the float eigenvectors, but its correctness does not.
- **N1.** The eigenvalue argument should add one sentence: the number of roots in the right half plane
  cannot change as c varies, because no root crosses the imaginary axis.

## Reimplementation files

The reimplementation agent wrote its report (REIMPL.md) and scripts, but could not move them into this
folder: the session's permission checks blocked its `mv` and `cp` into `review/lead/reimpl/`, and it did not try
to get around that. They are in this session's scratch directory, which is not part of the repository. Older
copies it had left in `review/reimpl/` and `review/lead/reimpl/` are removed in this commit, because they no
longer match the reported results. The scripts are `common.py`, `rest_eigen.py`, `vi_integrate.py`,
`rig_bisect.py`, `test_enclosure.py`, `shoot_mp.py` and `sanity_conv.py`. Until the owner has them copied here,
the reimplementation results above cannot be reproduced from the repository.

Its results, as reported:

- Rest (0, S(0), S(0), 0), unique; S'(0) = 0.13296113341580309828...; eigenvalues, as enclosures of radius
  about 4e-25 over the whole kappa ball: 0.968761160579321787, -0.124653132559362268, -0.583109889199161753
  and -1.167823871645100103. The unstable eigenvector has a positive U component.
- Integrator: its own Taylor method with a rigorously bounded error, carried forward componentwise (no Lohner
  or Picard step). The start point is placed on the unstable manifold by a cone lemma checked in arb. At c1 the
  orbit exits with U = -1.00091893135121 +/- 5e-15; at c2 it exits with U = +1.016560024028 +/- 2e-13. It was
  tested against an 80-digit mpmath solution, and a negative control that shifts kappa by 1e-30 is detected.
- Sixteen validated bisections: the switch lies in [1.1027477097341592491478677357466125,
  1.1027477097341592491478677357466278], which contains the claimed value.
- Non-rigorous 60-digit shooting, two runs with different precision, order and start point:
  c* = 1.10274770973415924914786773574662173325505338378182087892726..., about 58 trusted digits. Max U is
  0.759716. Q from the ODE matches w*S(U) by quadrature to 6e-16.

## Before the status can move past "not independently reviewed"

1. Fix C1 and C2, and make every check in `run_all.sh` able to fail (C3).
2. Add unit tests of the rigorous components to `run_all.sh` (C4).
3. Write the proofs of F1 to F5 into the paper (MATH.md has drafts), and correct the wording of F1, F2, F6 and F9.
4. ~~Rebuild the block and the Wazewski step independently.~~ Done in the second round (`reimpl/block/`).
5. Cite Burlakov, Oleynik and Ponosov (2025) and Pinto, Jackson and Wayne (2005), and restate the novelty (P1, P2).
6. Read the full texts listed in P3. The draft RESEARCH.md entry is in `priorart/PRIORART.md` and has not been
   applied.

## Independent existence step (second round)

A separate agent, which read only the equations and the first-round reimplementation (not `code/`, `data/`, or the
math and code reviews), built its own existence argument. Report: [`reimpl/block/BLOCK.md`](reimpl/block/BLOCK.md).

- **Block (confirmed, exact rational arithmetic, `block_lemma.py`).** Its own eigenvector matrix; N = {|a| <= 1/80,
  |b|_2 <= 1/80}, L = a^2 - |b|^2. With the mean value theorem, s in [0.0676, 0.2598] over N, and for all kappa in
  [1/c2, 1/c1]: the cone condition dL/dxi >= |z|^2/10, strict inflow on the b-faces and strict outflow on the
  a-faces (so, unlike the original B, N is an isolating block). The conditions are affine in (s, kappa) and the
  smallest eigenvalue is concave, so the four corners suffice; there the matrices are exact rationals, checked by
  Sylvester minors. An orbit that stays in N tends to rest (proof in BLOCK.md, via Barbalat's lemma).
- **All speeds at once (confirmed, `kappa_run.py`, 40 s; rerun by the merging session with the same result).** From a
  manifold point in an eigenframe that moves with kappa, every c in [c1, c2] is in the interior of N at xi = 170:
  a in [+/- 6.87e-5], |b|_2 <= 0.0079853 < 1/80.
- **Ends (confirmed, `exit_runs.py`, about 2 min).** With every step from xi = 170 checked to stay in N: c1 reaches
  the cone a < -|b| at xi = 175.125 and so leaves through a = -r; c2 reaches a > |b| at xi = 174.625 and leaves
  through a = +r.
- **Shooting.** Exit through a = +-r is strict, so the two exit sets are open and disjoint; c1 and c2 lie in different
  ones, so some c in (c1, c2) stays in N, and its orbit is homoclinic to rest. Continuity of the manifold point in c
  is argued from the unstable manifold theorem with parameters, not computed.
- **Negative controls (all fail as they must).** Larger blocks (r = 1/20, 1/30), a margin set too high, a bad
  multiplier, speeds on the wrong side of c* at either end, a speed range 1000 times wider, and a speed shifted by
  5e-27 that the integrator tells apart.
- **Findings.** S2 (should-fix): keep "not reviewed outside this project" until a person has read one of the two
  proofs. N3 (nit): a write-up of the whole-interval run should say how the speed spread is kept from being
  multiplied by the overestimate of the error bound.

Together with the reduction proved in `math/MATH.md` (a homoclinic orbit of the wave ODE gives a pulse), this makes
the theorem confirmed by two independent computations. Both still rest on python-flint (Arb) being correct, and
neither has been read by a person.

## Fixes applied (2026-09-26, same branch, at the owner's request)

| Finding | Fix | Where |
|---|---|---|
| C1 (must-fix) | Every rigorous gate is now `nfcore.require()`, which raises `CertificateError` and is not removed by `python -O`; `run_all.sh` refuses to run with `PYTHONOPTIMIZE` set. Checked: `PYTHONOPTIMIZE=1 NF_DU=0.15 sh code/run_all.sh` now stops with FAIL, and `NF_DU=0.15 python3 -O prove_pulse.py c1 53` stops with `CertificateError`. | `nfcore.py`, `prove_pulse.py`, `block.py`, `manifold.py`, `certify_rest.py`, `run_all.sh` |
| C2 | `run_all.sh` unsets every `NF_*` variable; the driver requires r > rho and the U-range of B inside (-DU, DU); two new negative controls (a block reaching U = 0.15, and r < rho) must be refused by the driver. | `block.proof_block`, `run_all.sh` |
| C3 | The Jacobian test prints `JACOBIAN PASS` or `FAIL` (threshold 1e-45); `run_all.sh` greps the verdict of the mpmath.iv re-check, not the text printed in both cases. | `test_jacobian.py`, `run_all.sh` |
| C4 | `test_lohner.py`, `test_lohner2.py neg` (remainder dropped must be detected) and `test_stress.py` (the review's low-order stress test, speed point and speed interval) now run in `run_all.sh` with verdicts and exit status. The a priori and QR-inverse mutations are still not detectable by any test; the code audit read those parts as sound. | `run_all.sh`, `test_*.py` |
| F3, C8 | `block.py` now certifies the block the proof uses (r = 4 rho, same construction as the driver, `block.proof_block`) and stores rho exactly (mantissa and exponent); `block_check_iv.py` re-checks that block's U-range and r > rho and stops if its own parameters differ from `nfcore.py` and `certify_rest.py`. | `block.py`, `block_check_iv.py`, `prove_pulse.py` |
| C5 | One exact sigma, `manifold.SIGMA = 1/7`, for the M checks and the driver; `manifold.py` requires that `choose_sigma` still agrees. | `manifold.py`, `prove_pulse.py` |
| C7 | The between-steps check uses an exact upper bound of the step length, not a float. | `prove_pulse.py` |
| F6 | Docstring now gives the right reason for checking s only at its two ends. | `block.py` |
| F1, F2, F4, F5, F7, F9, N1, P1, P2, R1 | README: openness stated with the path condition; B not called isolating and the cones not called forward invariant; continuity of the manifold point in c; the line of equilibria and why the orbit is on Y = S(U); U > 0.7596 as a proved lower bound; "gives a pulse" instead of "exactly a pulse"; the eigenvalue count argument completed; Pinto, Jackson and Wayne (2005) and Burlakov, Oleynik and Ponosov (2025) cited and distinguished; status wording keeps "not reviewed outside this project". | `README.md`, `notes/QUALITY.md` |
| F8 | The two new driver negative controls test the block; the c = 1.1024 control stays as a test of the shooting. | `run_all.sh` |
| Reimplementation files | Copied into `reimpl/` at the owner's request. | `reimpl/` |

`sh code/run_all.sh` after these fixes: 20 checks (9 proof steps, 4 integrator tests, 7 negative controls), all OK,
about 1 min 50 s on four cores. The proof's numbers did not change (same block, same manifold, same verdicts).
