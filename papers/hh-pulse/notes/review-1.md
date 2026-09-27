# Referee report 1 (in-project, independent reader, 2026-09-27)

This report is kept as the record of item 6 of `notes/QUALITY.md` (the adversarial second reading). It was written
by an in-project reader (an agent working in this repository), not by an outside reviewer. No outside review of this
paper has taken place.

**Object.** `papers/hh-pulse` at commit 04ebc21 (branch hh-pulse). I read `paper/paper.md`, `README.md`,
`RELEASES.md`, every program in `code/` except `tstrip.py` and `test_tstrip.sh`, and the committed files in `data/`.
As instructed, I did not read `notes/QUALITY.md`, `papers/hh-dynamics/work/traveling-wave/REPORT.md` or any other
record of what the authors checked.

**State of the worktree.** While I worked, a full rerun (`run.sh all`, started 14:37) was rewriting the zero-current
files in `data/`. At 18:23 someone edited `paper/paper.md` and `README.md` without committing. I reviewed the
committed versions, exported with `git archive HEAD` to `/tmp/claude-0/hh-review/`. Line numbers below refer to HEAD.
Where the uncommitted edit already addresses a finding, I say so.

## Verdict

**Not ready for release.** Theorem 2 needs a rerun and restatement. Theorem 1, Remark 1 and the rest of the paper
need only minor corrections.

- **The argument is sound, as far as I could check it line by line.** This covers:
  - Lemma 0;
  - Lemma 1: the exit, the uniqueness of the exit point and its continuity in K;
  - Lemma 2;
  - the Wazewski-type shooting argument that proves Theorems 1 and 2 from (H2) to (H5);
  - the lemmas of Appendices A and B.

  The exposition has small gaps, listed below; none is an error. The programs check (H2) to (H5) as the paper states
  them, in outward-rounded ball arithmetic. I found no soundness error in the integrator (`lohner6.py`, `hhjet6.py`,
  `hhseries.py`), in Lemma B (`certify_rest_wave.py`) or in the block check (`block0.py`).
- **Theorem 1 (18.5 C, printed E_l) and Remark 1 (zero-current E_l)** are supported by the committed certificates,
  except the clause "max u > 90.58 mV" of Theorem 1 (M2).
- **Theorem 2 is not proved as stated (M1).**
  - What was run: every 6.3 C computation used the temperature 6.29999999999999982236431605997495353221893310546875 C,
    the binary double nearest 6.3, so phi = 1 - 1.95e-17, not phi = 1.
  - Why it matters: the speed parameter of the pulse at 6.3 C lies about 6e-17 from the proved interval, whose
    width is 2.8e-61.
  - Which digits hold: the digits of K* and of the speed printed for 6.3 C are right only to about 16 decimal places.
  - The fix is mechanical. I checked that (H1) to (H3) still pass at phi = 1; only the numerical centre and the
    integration stages need to be rerun.
- **Other problems.** Several numbers in Section 5 do not match the certificates (M3). The rerun script can report
  success from stale certificates (M4).

## Must-fix

### M1. Theorem 2 is proved at T = 6.2999999999999998 C, not at 6.3 C

**Where.**
- The temperature factor: `code/certify_rest_wave.py:44-45`, `phi_of(T) = arb(3) ** ((arb(T) - arb('6.3')) / 10)`.
  `T` is a Python float, parsed as `float(sys.argv[1])` at `code/prove_pulse.py:452`, `code/hp_pulse.py:164` and
  `code/block0.py:251`.
- The evidence is in the committed certificate `data/pulse_proof_6.3_El10.613_setup.json`, `lines[0]`:
  `phi = 3^((T - 6.3)/10) = [0.999999999999999980484725471752 +/- 4.11e-31]`.
- The affected text:
  - Theorem 2 (`paper/paper.md:97-105`);
  - the abstract (`paper/paper.md:15-18`, "all digits shown are proved");
  - `README.md:15-19`;
  - `RELEASES.md:21-22`.

**What is wrong.** `arb(6.3)` is the double 6.29999999999999982236..., while `arb('6.3')` is a ball around the
decimal 6.3. So phi = 3^(-1.776e-17) = 1 - 1.9515e-17. At 256 bits this ball excludes 1; I reproduced it with
python-flint 0.9.0. The numerical centre `hp_pulse.py`, the setup, the interval run, the endpoint runs, the closing
block and the summary all use this phi. So the committed certificates prove the theorem at T = 6.2999999999999998224
C.

At 18.5 C the problem does not arise, because 18.5 is a binary number: the phi ball contains 3^1.22, which I checked.
Theorem 1 and Remark 1 are not affected.

**Why it matters.** The phi ball does not contain 1, so the certificates prove nothing at 6.3 C. The printed digits
are also wrong beyond about the 16th decimal place, as this numerical (not rigorous) estimate shows:
- I bisected in K by double-precision shooting (`hhwave.bisect_K`, printed E_l) at phi = 1 and at phi = 1 +- 1e-4.
  This gives dK*/dphi = 3.20 at phi = 1.
- So the speed parameter at phi = 1 exceeds the proved one by about 3.2 x 1.95e-17 = 6.2e-17, which is 2e44 widths
  of [K1, K2].
- The code's own negative control confirms the scale: a shift of only 5.6e-60 (neg-shift) already drives zeta_1 to
  10 at T_enter.
- The speed moves by about 8.5e-17 m/s. So `4.510632438270851021...` and `12.313756720162298508...` are the values
  at the double temperature. At 6.3 C the digits from about the 17th decimal place on are different.

The independent block check does not rescue this. At 6.3 C, `block_check_iv.py:212` computes phi from `str(T)` =
'6.3'; its phi ball contains 1 but not the proof's phi. So it did not re-check the configuration the proof used.

**Fix.**
1. Compute phi from the decimal temperature. For example, `phi_of(T) = arb(3) ** ((arb(repr(T)) - arb('6.3')) / 10)`,
   or pass T as a string throughout. Record the phi ball in the config and in every certificate, and have the summary
   check that it contains 3^((T - 6.3)/10) for the decimal T.
2. Rerun at 6.3 C: `hp_pulse.py` (both passes), `block0.py`, config, every stage, `block_check_iv.py` and the
   summary.
3. Restate Theorem 2, the abstract, `README.md` and `RELEASES.md` with the new digits.

I checked the setup side in scratch. With phi = 1 exactly, the 6.3 C setup stage (H1, H2, (B'), H3 with its
negative controls) passes with the committed block and K interval. Only the centre and the integration stages need
the rerun.

Stating Theorem 2 at the double temperature instead is possible but not recommended.

### M2. "max u > 90.58 mV" in Theorem 1 is not supported

**Where.** `paper/paper.md:93`. The certificate is `data/pulse_proof_18.5_El10.613_interval.json`, whose
`u_max_lower_bound` is 90.57833935549581.

**What is wrong.** The certified lower bound is 90.5783..., which is below 90.58. The figure 90.58 is that of the
zero-current run (90.5814, `data/pulse_proof_18.5_interval.json`). In addition, the bound is stored as
`float(hx[0].lower())` (`code/prove_pulse.py:327`), which rounds to nearest rather than downward. That does not
matter at this resolution, but it is not outward rounding.

**Fix.** Write "max u > 90.57 mV" (or 90.578). The uncommitted worktree edit of 18:23 already changes it to 90.57;
commit it. Store the bound as an arb string, or round it down explicitly.

### M3. Section 5 quotes numbers that are not in the certificates

**Where.** `paper/paper.md:259-281` and `paper/paper.md:285-287`.

**What is wrong.**
- **18.5 C table, printed E_l.** It gives three numbers that differ from the certificates:

  | quantity | table | certificate |
  |---|---|---|
  | lambda_u | 10.89231... (the zero-current value) | 10.89208117... (`pulse_proof_18.5_El10.613_setup.json`) |
  | K1 enters K- at | 13.6875 ms | t_cone = 13.6953125 ms (`pulse_proof_18.5_El10.613_K1.json`) |
  | CPU times (interval, K1, K2, neg-shift, neg-model) | 597, 570, 561, 566, 602 s | 573, 580, 586, 580, 596 s |

- **6.3 C table.** The CPU times 1237, 1279, 1293, 1276, 1298 s do not match the certificates' 1297, 1297, 1287,
  1316, 1344 s.
- **The loose-tolerance run.** "zeta_1 = -86 at T_enter" for the loose-tolerance centre has no record anywhere in
  `data/`. The 5e-59 difference of the two centres does check out: I computed 4.79e-59 from
  `hp_pulse_6.3_El10.613.json` and `_tol1.json`.

**Why it matters.** Every quoted number must be traceable to a certificate. The mismatched lambda_u and t_cone show
the table was copied from another run.

**Fix.**
1. Generate both tables from the certificates with a small script. The uncommitted worktree edit of 18:23 corrects
   the values in both tables; commit it, and regenerate the tables after the M1 rerun.
2. Either keep a certificate of the failed loose-tolerance interval run in `data/` or drop the -86.

### M4. `run.sh` and the summary can certify from stale files

**Where.**
- `code/run.sh:42`: before a proof it removes only the checkpoints, the hp_pulse states and the closing block.
- `code/run.sh:52-53`: the exit status of every stage is ignored.
- `code/prove_pulse.py:410-425`: the summary reads `data/pulse_proof_<tag>_<stage>.json` without checking that these
  files belong to the current config, closing block or code.
- `code/prove_pulse.py:309`: a checkpoint is keyed on the config and the stage only.

**What is wrong.** Suppose a stage crashes: a `StepFailure`, an exception, or a kill by `timeout 7200`. The 6.3 C
stages take about 1300 s here, so on a machine about five times slower they would be killed. The certificate
committed from the earlier run then stays in place. The summary prints ALL CHECKS PASSED, and `run.sh` prints
"ALL AS EXPECTED".

So the claims in Section 7 (`paper/paper.md:321-325`), `README.md` and `code/run.sh:12` are not true of the
pipeline. They say the summary's exit status is 0 "if and only if every check passed and every negative control
failed".

There is a related hazard. `run.sh` recreates the closing block from floating-point LAPACK output, which may differ
across machines. A stale K1 or K2 certificate computed with a different block would then be accepted.

**Fix.**
1. At the start of `proof()`, delete `data/pulse_proof_<tag>_*.json` and the summary.
2. Write into every stage certificate:
   - the sha256 of the config file, of the closing-block file and of the programs;
   - the python-flint version;
   - the phi and E_l balls.
3. Have the summary recompute these and require equality. It should also require each stage's K string to match
   the config.
4. Include the code hash in the checkpoint key.
5. Make `run.sh` treat an exit status other than 0 (pass) or 1 (a written FAIL verdict) as a failure.

## Should-fix

**S1. Credit the methods.**
- The paper uses "Lohner-type", "Wazewski-type", "isolating block" and "cone condition", but cites none of their
  sources. It also does not cite the software whose correctness the proof rests on. Suggested citations (please
  verify the bibliographic details):
  - R. J. Lohner (1987), the interval Taylor method, in *Computer Arithmetic: Scientific Computation and Programming
    Languages*, Teubner;
  - T. Wazewski, Ann. Soc. Polon. Math. 20 (1947), the topological principle;
  - C. Conley, *Isolated Invariant Sets and the Morse Index*, CBMS 38 (1978), and Conley's 1975 lecture on travelling
    waves of nonlinear diffusion equations (Lecture Notes in Physics 38), the approach Carpenter built on;
  - P. Zgliczynski, J. Differential Equations 246 (2009), on cone conditions and the stable manifold;
  - F. Johansson, Arb, IEEE Trans. Comput. 66 (2017), together with python-flint and mpmath.
- Section 6 could also mention Carpenter's "Nerve impulse equations" (Lecture Notes in Math. 525, 1976, Zbl
  0364.92015), which zbMATH lists next to the 1977 paper. `AGENTS.md` asks that classical sources be credited.

**S2. The priority statement rests on two papers that were not read.**
- The statement is honestly conditional. But Foote and Chen (1981), "Traveling wave properties of the Hodgkin-Huxley
  equations", has a title directly on point, and Hastings (1976) was read on 2 of its 29 pages.
- My own search found no existence proof at the 1952 parameters (details below). Still, before a public preprint
  makes any priority statement, obtain both papers (for example by interlibrary loan) and read them. Otherwise
  reduce the sentence to "we found no ...".

**S3. The "independent reference" of the integrator test is not independent of the jets.**
- `code/test_lohner6.py:69` takes its reference from `hp_pulse.flow`, which calls `hhjet6.jet` and `hhjet6.values`.
  These are the same Taylor jets the integrator uses. So test 2 checks the enclosure machinery, not the field or the
  jets.
- `paper/paper.md:294-297` describes this accurately ("a different step sequence"). But `README.md:39-40` and
  `RELEASES.md:34-35` call the reference "independent".
- Reword those two lines. Add a field test against an independent transcription of the 1952 equations. I wrote one
  (below): it agrees to 4e-45.

**S4. The description of the model control overstates what is unchanged.**
- `paper/paper.md:283-285` says the perturbed model leaves "(H1) to (H3) unchanged".
- For (H3) this is not so. On B0, |u - u*| is of order 1 mV, so the factor 1 + 1e-12 (u - u*)^2 changes the field
  there by about 1e-12. `run_stage` re-checks Lemma B (H2) under the perturbation (`code/prove_pulse.py:293-294`) but
  does not re-check (H3).
- The control remains valid, since it only has to fail. Say instead that (H1) and (H2) are re-checked, and that (H3)
  changes by about 1e-12 and is not re-checked.

**S5. There is no LICENSE file.** `README.md:87` says "The `LICENSE` file has both", but `papers/hh-pulse` contains no
LICENSE file, only `NOTICE`. Add one (the Apache-2.0 text and the manuscript's copyright notice) or reword.

**S6. Lemma A.1 is stated in six variables, which does not quite work.**
- `paper/paper.md:340`. With K' = 0, the K component of [X] + [0, h] F(W) equals the K component of W. So
  "contained in int W" fails in R^6, and for the K1 and K2 runs, where K is a point, int W is empty.
- The code checks only the five moving components (`code/lohner6.py:147-148`), which is correct.
- State Lemma A.1 for the five-dimensional system at each fixed K in the K component of W.

**S7. Lemma A.3 uses an unstated invariant.**
- `paper/paper.md:368` uses xbar in [X]. This holds because R0 is symmetric and 0 in R is preserved by the update:
  - y - mid(y) contains 0;
  - ([J] C - C') R0 contains 0;
  - ([B'^-1][J] B) R contains 0 by induction;
  - the initial R contains 0 by construction.
- State this invariant.

**S8. (H2)(i) cites the wrong test.** `paper/paper.md:158` cites Lemma B.2 (interval Cholesky) for (H2)(i). The code
uses Gershgorin discs on the interval matrix instead (`code/certify_rest_wave.py:204-207`). That is valid, but fix
the text.

**S9. Two limit arguments skip a step.** Lemma 1(b) (`paper/paper.md:192-193`) and Lemma 2 (`paper/paper.md:226-227`)
pass from "the alpha- (omega-) limit set is {y*}" to "the orbit tends to y*". The step is standard but is not among
the cited Teschl results. Add the one-line compactness argument: otherwise a sequence of times stays away from y*,
and a further subsequence converges to a second limit point.

## Minor

- m1. `paper/paper.md:119`: "their 18.8 m/s is our 18.73 rounded" is not right, because 18.73 rounds to 18.7. Their
  K = 10.47 corresponds to about 18.76 m/s, which rounds to 18.8.
- m2. `paper/paper.md:65`: "Eq. (31) is odd in V" is not accurate; the reversal potentials and the rate functions are
  not odd. Say that the substitution u = -V, with the constants rewritten, keeps the form of the equation.
- m3. `paper/paper.md:208`: rho = 0.8 and r = 0.84 are binary floats. rho is 0.8000000000000000444, and r is
  0.8 x 1.05 in floating point, 0.8400000000000000799 (`code/block0.py:93`). Say so. The rho = 0.6, r = 0.63 case is
  similar.
- m4. `paper/paper.md:448-449`: the published title is "Existence of periodic solutions of the FitzHugh-Nagumo
  equations for an explicit range of the small parameter", doi:10.1137/15M1007707 (Crossref).
- m5. Some docstrings are out of date:
  - `code/prove_pulse.py:6-7` and `code/certify_rest_wave.py:7-8` say E_l is the zero-current value and rest is at
    u = 0;
  - `code/prove_pulse.py:10-11` lists Lemma A as hypothesis (A), which the paper no longer uses;
  - `code/prove_pulse.py:28` says "multiplied by 1 + 1e-12" where the factor is 1 + 1e-12 (u - u*)^2.
- m6. `paper/paper.md:299-300`: the Consistency paragraph uses the zero-current run. Use the printed-E_l runs of the
  theorems.
- m7. `code/block_check_iv.py:97-124`: `rest()` finds a zero by bisection on [-0.5, 0.5] and does not show it is
  unique. This is acceptable for a re-check, but say so, or check that the interval lies inside the Newton enclosure
  of `certify_rest_wave`.
- m8. `code/block_check_iv.py:221-222`: the negative control runs at maxdepth 16, against 24 for the real check, so
  its failure could in principle be a depth artefact. I checked by point sampling that it is not (below). Use the
  same depth, or record a point where the condition is violated.
- m9. Theorems 1 and 2 say the pulse leaves along the branch on which u increases "numerically". This could be
  proved cheaply by checking u - u* > 0 on the exit set E.
- m10. `code/prove_pulse.py:443`: the outward rounding of the speed bounds is guarded by a Python `assert`, which
  `python -O` removes. Use `require`.
- m11. `code/hhseries.py:40`: the tail-bound precondition N >= 2k + 2 is also an `assert`. It is always met here
  (k <= 42, N = 400), but `require` is safer.

## What I checked and reran

**The mathematics.**
- **Lemma 0.** Line by line: the identity v^*(DA + A^T D)v = 2 Re(lambda) v^* D v, the sign of x^T D x on E+ and
  E-, and the dimension count.
- **Lemma 1(a), exit.** L increases in B, so the orbit cannot stay in B forever. It cannot leave through a stable
  face by (ii), so it exits through the face z1 = r_B.
- **Lemma 1(b), uniqueness and continuity.** The uniqueness uses (iii), and the continuity uses the six-variable
  flow on its open domain.
- **Lemma 2.**
  - The averaging (4.1) over convex regions that contain y*.
  - The concavity of the smallest eigenvalue of DA + A^T D and the convexity of lambda_max(sym A_ss) + |A_s1|_2.
  - The entrance estimate on the face |zeta_s| = rho with |zeta_1| <= rho < r.
  - The invariance of the cones.
- **The shooting argument.** S+ and S- are open and disjoint, and K1 is in S- while K2 is in S+ by (H5). The case
  analysis at the first boundary time is complete. A pulse needs no more than this.
- **Appendices A and B.**
  - Lemmas A.1 to A.4, and the tail bound of the Psi series (term ratio at most 1/(n + 2) for n >= 2k + 2).
  - Lemma B.1 (interval Newton), Lemma B.2 (interval Cholesky) and Lemma B.3 (the cover).
  - Lemma B.4: the Routh-Hurwitz conditions for a quartic.
- **Teschl's textbook.** I checked every cited result against the author's preliminary version, which is openly
  available: Corollary 2.15 (p. 52), Theorem 6.1, Lemmas 6.3 and 6.5 (p. 193), Lemma 6.6 (p. 194), Theorems 9.4 and
  9.5 (p. 259), and the Routh-Hurwitz criterion (p. 72, eq. (3.45)). The numbers, pages and statements match the
  uses.

**The code against the paper.**
- **The Lohner step.** I checked:
  - the a priori enclosure test;
  - the Lagrange remainders, including over subintervals;
  - the mean-value form and the new set;
  - the path enclosure `step_range`;
  - the mixed precision, which is only a widening;
  - the dyadic step lengths and exact times;
  - the checkpoint serialisation, whose midpoint and radius are exact.
- **The jets.**
  - Picard iteration with growing truncation.
  - Forward-mode derivatives on arb_series, including d/dK.
  - The 1/G branch near the removable singularities.
  - The cache of G_k, which is valid because the constant term is the same in every pass.
- **Lemma B.** The inflow bounds, including Cauchy-Schwarz on the complex-pair face; the Gershgorin cone test; the
  transversality (B'); and the construction of the exit set, which is a superset of E.
- **`block0.py`.** The cover: exact float endpoints, the rigorous ball test, and failure at the depth limit. The
  cone test and the entrance matrix: mu is an upper bound of the Euclidean norm.
- **K1 and K2.** They are exact dyadic numbers, and the committed stage certificates carry exactly the K1 and K2 of
  the config for all three proofs.

**The vector field.**
- I wrote my own transcription of Hodgkin and Huxley's 1952 equations, in their own sign convention (V, with
  V_Na = -115, V_K = 12, V_l = -10.613 mV). I compared it in mpmath at 50 digits with `hhjet6.vfield`, after
  u = -V, at 24 random states and K values at both temperatures. The maximum relative difference is 4.0e-45, which
  is string-conversion level.
- The field is continuous through the removable singularities at u = 10 and u = 25. (My first check of those two
  points used the wrong limit; hhjet6 was right.)
- The temperature factor, the signs, the units and eq. (31) are as printed, except for the 6.3 C float issue of M1.

**The certificates.** From the committed files I recomputed:
- K2 - K1: 3.000e-45 at 18.5 C and 2.800e-61 at 6.3 C;
- the digits K1 and K2 share: 46 at 18.5 C and 61 at 6.3 C (the paper says 45 and 61);
- that the numerical K* lies in (K1, K2), for all three proofs;
- the speed intervals of Theorems 1 and 2 and Remark 1, which match the paper;
- the shift of the speed by the printed E_l: 2.73e-4 m/s;
- u* = 0.00362066880794256883688769054204... (radius 2.6e-75);
- the zero-current E_l = 10.598920969391678522...;
- the 5e-59 gap of the 6.3 C centres: 4.79e-59;
- that the K ranges of the negative controls are consistent (40 half-widths).

**Reruns in scratch** (`/tmp/claude-0/hh-review/`, each under `nice -n 19 timeout 900`, one at a time).
- `prove_pulse.py 18.5 setup`, printed E_l: output identical to the committed certificate. This includes (H1), (H2),
  (B'), (H3) on 1232 + 5916 cells, and the three setup negative controls. It took 5 s.
- `block_check_iv.py 18.5` and `6.3`, printed E_l: both pass. The cell counts are 935 + 4241 and 1447 + 974. The
  enlarged block is rejected.
- The 6.3 C setup with phi computed from the decimal temperature (phi = 1 exactly): passes (see M1).
- `certify_rest_wave.phi_of(6.3)` and `phi_of(18.5)`, with and without the decimal temperature (M1).
- Double-precision shooting at phi = 1 and phi = 1 +- 1e-4 (M1). This estimate is numerical, not rigorous.
- **Point sampling of the negative control.** I drew 4000 random points in the block and in the block enlarged 1.5
  times, and evaluated the cone and entrance conditions of (H3) at each point with point Jacobians.
  - The committed blocks satisfy both conditions with margin: the minimum of lambda_min(DA + A^T D) is 0.53 at
    18.5 C and 0.15 at 6.3 C.
  - The enlarged blocks violate them at actual points: (E) by -0.0047 at 18.5 C, and (C) by -0.023 at 6.3 C. So the
    "radius x 1.5" controls fail for a real reason, not because of the depth limit.

**Other negative controls.**
- The shifted K interval gives zeta_1 of about 13 (18.5 C) and 10 (6.3 C). This is consistent with the linear
  sensitivity shown by the endpoint runs, so it fails for the stated reason.
- The perturbed alpha_m sends the whole set below -60 mV before T_enter. This is a genuine failure, not a blow-up of
  the enclosure.
- "Faces 100 times thinner" fails because the coupling from z1 dominates when s_j is much smaller than r_B^2. The
  control is meaningful.
- "A bracket above lambda_u" fails trivially, at P(a) > 0. It is only a sanity test of the check of (H1), which the
  proof does not use.
- The control of `test_lohner6.py` (remainder dropped) misses the reference by 1.5e-7. It is meaningful for the
  machinery; see S3.

**Literature and novelty.**
- **Searches.**
  - zbMATH Open API: "Hodgkin-Huxley travelling wave" (18 hits), "... traveling wave" (33), "... pulse existence"
    (4), "... homoclinic" (14), "... rigorous numerics" (1) and "... computer-assisted" (0).
  - A general web search, with three queries.
  - Crossref, for the metadata of every reference; all correct except the title in m4.
- **What zbMATH shows.** The hits include Hastings 1976, Carpenter 1976 and 1977, Foote and Chen 1981, Ikeda, Mimura
  and Tsujikawa 1987 and 1989, and Evans and Feroe 1977. zbMATH has no review of Hastings or of Foote and Chen,
  confirming the paper. The review of Ikeda et al. 1987 confirms that they introduce a small parameter epsilon.
- **Result.** I found no existence proof, with or without a computer, of the pulse of the unmodified 1952 equations.
  I found no computer-assisted travelling-wave result for Hodgkin-Huxley.
- **What I could not reach.** The arXiv API refused this machine (HTTP 406), as the paper reports. The Semantic
  Scholar API was rate-limited (HTTP 429). The Springer (Hastings) and ScienceDirect (Carpenter) pages required
  sign-in or returned 403, and I did not try to get around that.
- **Verdict on novelty.** On what I could see, the conditional priority statement is accurate and fairly worded. The
  descriptions of Hastings and Carpenter agree with every abstract and review I could see. See S2 for what remains
  before release.

## What I did not check

- **The long stages.** I did not rerun the interval, K1, K2, neg-shift or neg-model stages, `hp_pulse.py`,
  `test_lohner6.py`, or the setup of the zero-current proof. A full rerun was already running, and I was asked not to
  start another. So my confidence in (H4) and (H5) rests on reading the code and the committed certificates, not on
  reproducing them.
- **The working tree.** I did not review the uncommitted edits made during the review, or the zero-current files the
  running rerun was rewriting. The committed HEAD set is internally consistent.
- **The internal correctness of Arb and python-flint.** I assumed:
  - that `arb_mat.inv`, `charpoly`, `arb_series` composition and `exp` return enclosures;
  - that `arb.intersection` of disjoint balls raises an exception rather than returning garbage;
  - that `arb(str)` encloses the decimal number.
- **Hodgkin and Huxley (1952).** I did not read the paper. I checked the formulas against the standard statement of
  the 1952 equations, which I know well. I did not check the page references (p. 524, p. 528), the value K = 10.47
  /ms, the quotation "goes off towards either +infinity or -infinity", or the wording of Table 3's footnote.
- **The other papers.** I did not read Hastings (1976), Carpenter (1977), Foote and Chen (1981), Arioli and Koch
  (2015) or Huxley (1959). So I did not verify the quotations and theorem numbers the paper attributes to Hastings
  and Carpenter.
- **Software versions.** I did not test on other versions of python-flint, numpy or LAPACK.

## Verification of fixes, round 1 (code)

This round checks the code fixes only. It covers commits e86e2c8 (M1, m7, m8, S3 wording), 3a0c7b1 (M4, M2
rounding, m9, m10, m11, test_field.py) and 00ee62c (the Remark 1 certificates of the first full rerun). HEAD is
3a0c7b1. The text fixes and the certificates of the second full rerun ("rerun2", started 18:59) are left for the
final round.

**Scratch copy.** I made a fresh `git archive` of HEAD at `/tmp/claude-0/hh-review/r1/`. Each check ran under
`nice -n 19 timeout 900`, one at a time. I started no computational stage and touched neither running rerun.

### M1: confirmed fixed in the code

- **Where the temperature enters.** Every rigorous program now takes the temperature as the decimal string typed on
  the command line:
  - `prove_pulse.py`, `hp_pulse.py`, `block0.py` and `certify_rest_wave.py` pass it through `C.temperature`;
  - `block_check_iv.py` checks it against its own pattern.

  `phi_of` computes 3^((T - 6.3)/10) from `arb` of that string. A float argument is read through `repr`, so
  `phi_of(6.3)` also means the decimal 6.3.
- **No float path remains.** I grepped every computation of phi in `code/` (tstrip.py excluded). The only float
  paths left are `hhwave.py` and `pulse_bvp.py`. These are double-precision helpers that make only the starting
  profile and the float start of the rest-state Newton step, so no proof step depends on them.
- **The temperature is recorded and checked.** The configuration records `T_decimal` and the phi ball. `Setup`
  refuses a configuration whose phi differs. The summary recomputes 3^((T - 6.3)/10) at 512 bits from the decimal
  temperature and requires the recorded phi to contain it.
- **test_temperature.py** passes, including its control: the old float path gives phi - 1 = -1.9515e-17, which
  excludes 0. Its check 5 is a text search for `float(sys.argv[1])` and would miss another spelling. My grep above
  covers that gap for the current code.
- **block_check_iv.py.** I ran the new version on the committed 6.3 C block and configuration of 04ebc21. Its phi
  now contains 1. Its rest zero passes the new window check (m7). It rejects the enlarged block at the full depth of
  24 (m8). It still passes on the block itself (1447 + 974 cells). It refuses the temperatures '6.3e0', '-1' and the
  float 6.3.
- **What remains for the final round.** Theorem 2 is proved only when rerun2's 6.3 C certificates exist and the
  summary accepts them with phi containing 1.

### M4: confirmed fixed

I could find no way for a stale, crashed or timed-out stage to produce ALL CHECKS PASSED or ALL AS EXPECTED.

1. **`run.sh` with the failure paths forced.** I ran `run.sh zero` in scratch with a stub `python3` first on PATH.
   The stub made the programs succeed or fail on demand but let the real summary run. The certificates of an earlier
   run were in place beforehand. Every scenario ended with `run.sh` exit status 1 and "SOMETHING FAILED":
   - every stage exits 0 but writes nothing (the summary then finds no configuration and exits 2);
   - K2 crashes (exit 2);
   - K2 hits the time limit (exit 124);
   - interval writes FAIL (exit 1);
   - neg-model hits the time limit (exit 124);
   - neg-shift crashes (exit 2);
   - both negative controls exit 0.

   In each scenario all seven of the proof's own files, the configuration included, were deleted before any stage
   ran. The printed-leak proof's seven files, which share the prefix `pulse_proof_18.5_`, were left alone: the
   deletions use exact names.
2. **The summary on a provenance-carrying copy.**
   - The setup: I took the committed Remark 1 certificates and added exactly what the new code writes, that is
     `T_decimal` and phi in the configuration, a `provenance` record in every stage certificate, and the `fail`
     reasons of the controls.
   - The baseline: the summary passes on that copy.
   - `summary-control`: it refuses all ten planted defects and passes the unaltered copy.
   - My further attacks, all refused:
     - a comment appended to `lohner6.py` or `hhwave.py` (code hash);
     - a certificate truncated as by a kill mid-write (the summary errors with exit 2);
     - the K1 certificate copied over K2;
     - the interval certificate of the printed-E_l proof copied into the zero-current proof;
     - a configuration with another `T_decimal`;
     - a setup certificate in the old format, without provenance.
3. **Nothing the theorems rely on escapes the hashes.**
   - The code: the local modules the proof path actually loads are exactly those listed in `PROGRAMS`.
   - The inputs: the configuration (K1, K2, r_B, s, T_enter, order, precision), the closing block, phi, E_l
     and the python-flint version are all hashed or compared.
   - The numerical centre enters only through the configuration.
   - Checkpoints are keyed on the configuration, the stage, the code hash and the block hash. So a checkpoint of
     other code or another block is ignored, and `run.sh` deletes them anyway.
   - Not covered, and not needed for rigour: `hp_pulse.py`, `block_check_iv.py` and the starting profiles. Editing
     either program leaves the summary passing. The independent block check is gated by `run.sh` (`|| return 1`,
     old report deleted first) but not by the summary.

**Two residual points** (should-fix, not defects of M4):
- **Internal consistency is not checked.** The summary trusts each certificate's own verdict fields. A setup
  certificate with `"C": false` but `"ok": true`, or an interval certificate with `"verdict": "PASS"` but
  `"in_int_B0_at_T_enter": false`, is accepted. No stale or crashed run can produce either; only a hand edit can.
  Recomputing `ok` from the fields, and requiring `in_int_B0_at_T_enter` for the interval and `phase2 == in_cone`
  for K1 and K2, would close this at no cost.
- **The code must stay frozen until rerun2's certificates are committed.** The provenance records the hash of the
  eight programs. Any edit to one of them after rerun2 began, even to a docstring or comment, makes every rerun2
  certificate refused. That is the intended behaviour, but the text round must not touch those eight files.

### M2 and the small items

- **M2 (rounding): confirmed.** `u_max_lower_bound` is now `float(lower)`, stepped down one ulp when the float lies
  above the arb lower bound. That is a correct downward rounding. The 90.57 of Theorem 1 is text, for the final
  round.
- **m7, m8: confirmed** (above).
- **m9: confirmed.** Setup now checks u - u* > 0 on the hull of the exit set and includes the check in `ok`.
- **m10, m11: confirmed.** The speed-bound check and the Psi-tail precondition now raise instead of using `assert`.
- **S3 (code part): confirmed.**
  - `test_field.py` is a second, independent transcription of the 1952 equations in their own sign convention. It
    covers 64 states at both temperatures and both leak potentials, including u = 10 and u = 25 and states next to
    them.
  - Its largest relative difference is 5.2e-60, well below its 1e-40 tolerance.
  - Its control (V_K = -12) is caught at 1.54.
  - `test_lohner6.py` no longer calls its reference independent.
  - `README.md:39-40` and `RELEASES.md:34-35` still do; that is for the text round.

### For the final round

- Check that rerun2's certificates carry the provenance of commit 3a0c7b1's programs, and that the summary and
  summary-control pass for all three proofs.
- Check the new 6.3 C digits against the manuscript.
- Two `run.sh` processes run concurrently on 4 cores (the 6.3 C proof, and the chain of tests, 18.5 C and zero
  current). Their files are disjoint by tag, so the results are unaffected. But the CPU times quoted in Section 5
  were measured under that load, while the paper and `run.sh` say "one process at a time". Say so, or quote times
  from an unloaded run.
- `code/tables.py` is new and untracked. It is not in `PROGRAMS`, which is right if it only formats tables from the
  certificates. I have not read it.
