# Adversarial review: fourier/alln.py (Stage E for every N >= 8 and the cable)

Date: 2026-10-02. Referee: an independent agent reading; I did not write the code. No repository file was edited.
Scope: fourier/alln.py (docstring sections 0 to 9 and the code), fourier/test_alln.py,
results/fourier-existence-alln.json, fourier/data/alln/{pieces,controls}.jsonl and run_code.json, and the parts of
branch.py (assemble, HessBound.W, centre_distance, check_piece_order), existence.py and arbmodel.damping that alln.py calls.
Every command ran under `timeout`, `nice -n 10`, one process.

## Verdict

No UNSOUND finding and no GAP that affects the theorem. All eps dependence of F, DF and A is accounted for. Lemma T is
correct and the code implements it. The operator is well posed at eps = 0. The gluing and the Stage E identification
are correct. I re-proved two pieces the builder had not re-proved, and both reproduce the logged bounds bit for bit.
There are four WEAK TEST findings. The most important is that the test mutation built for the tail's eps range
(`tail_at_centre`) is never run, and the existing Lemma T test passes when the mutation is switched on. There are four
MINOR findings. Once at least W1 is fixed (W2 to W4 are recommended), the record may be listed as having passed
in-project adversarial review. No outside review has taken place.

## Findings

### W1 (WEAK TEST): the eps range of the explicit tail inverses has no detecting test
- Location: test_alln.test_lemma_T; alln.tail_bounds_eps `_mutate=("tail_at_centre",)`.
- Evidence: the mutation exists, but no test runs it. I monkeypatched `alln.tail_bounds_eps` to always apply
  `tail_at_centre` (d_m at e_c only, not the range over the piece) and ran the builder's `test_lemma_T`. It PASSES, so
  the mutation is not detected. The test samples 25 random m and random eps inside the piece, and it compares against
  the global sups Abar0 and Abar1, which are dominated by small m. A sweep of my own over m = 13, 16, ..., 391 at the
  two endpoints eps = 0 and 1/4096 of the cable piece finds 2 violations of the mutated sups out of 254 cases. The
  mutation lowers some Abar0 entries by up to a factor of 14.
- Fix: test at both piece endpoints for every m in (K, m_max] and assert that `tail_at_centre` is detected. Better
  still, check per m that the point inverse A_m(eps) lies in one of the sub-enclosures of A_m. This needs
  `A_explicit` to be kept for all m <= m_max in a test mode, not only for m <= K'.

### W2 (WEAK TEST): C_n = sup |A_m J'_n| is never tested against point products
- Location: test_lemma_T calls tail_bounds_eps with `Jp = {0: 0}` and `n_explicit = 0`. Also, its J0hat is a float
  recomputation rather than the piece's J0hat.
- Evidence: the bound that enters Z1's tail rows, T = sum_n C_n nu^|n| + ..., is never compared with any
  |A_m(eps) J'_n|.
- Fix: run piece_blocks (or reuse `reprove`'s blocks) to get the piece's J0hat and J'_n midpoints. Then, for a few n
  (both signs, |n| <= n_explicit and |n| > n_explicit) and for m at both signs, assert
  |A_m(eps) J'_n| <= C_n entrywise at the piece endpoints.

### W3 (WEAK TEST): the widened-piece negative control fails for reasons that are not isolated
- Location: test_negative_widened_piece ([0, 1]); controls.jsonl widen entries.
- Evidence: the piece [0, 1] reaches eps = 1, where d_m = 0 for every m. It can fail through anything, for example a
  float Newton RuntimeError. That would make the test error rather than pass, but it would never show that the
  eps-width terms are load bearing. The [0, 1/16] control is more useful: there Z1 = 1.27, driven by the V row. Even
  so, no test shows that dropping only delta B1g (branch `drop_B1g`) is caught. On the cable piece, B1g changes Z1
  only from 0.198668 to 0.198716.
- Fix: keep the float cross-check that B1g is at least the float block and at most 2 times it (it is sound). Then add
  a test that the eps-width terms are load bearing: either (a) the widest closing piece fails with B1g and Y0g
  present and the float ||A_fin (J_fin(eps) - J_fin(e_c))|| at an endpoint exceeds the mutated Z1 contribution, or
  (b) the widened control checks that its failure is the radii polynomial at Y0 or Z1, not an exception.

### W4 (WEAK TEST): the Stage E inclusion negative control cannot miss
- Location: test_stage_E_identification, omega shifted by 1e-2.
- Evidence: in the piece's weights (eta_om about 0.0149) the shift is about 0.67, which is roughly 1.4e3 times
  r_uniqueness (4.9e-4). Any norm conversion error under three orders of magnitude would still pass.
- Fix: shift omega by (1 + 1e-3) eta_om r_hi + d0 and assert failure; shift by (1 - 1e-3)(eta_om r_hi - d0) and
  assert success. This tests the eta weighting and the omega component of centre_distance.

### M1 (MINOR): a misstated inequality in docstring section 4 (cable regularity)
- "|a*_{m,V}| (omega* |m| + 4 pi^2 D m^2) <= |g_m| + ..." is not correct as written: |i omega m + d_m| >= max(omega |m|,
  d_m), and the sum is not a lower bound. The conclusion is unaffected. From the V equation,
  |a*_{m,V}| <= |g_{m,V}| / d_m(0) and g is in l^1 with decay e^{-rho|m|}. In any case phi* is in l^1_nu, so it is
  analytic on the strip, and a classical solution needs nothing more. Also remove the "+ ...": the V equation has no
  other term.

### M2 (MINOR): docstring section 3 says m_max is "the least integer" with the property
- The code takes max(K + 1, ceil(rowmax / theta_t / omega_bar) + 1) and then increments, so it may exceed the least
  such integer. This is harmless, because theta is recomputed and certified < 1. Reword as existence.py section 4 does.

### M3 (MINOR): failure messages report the G_Ks "range" instead of the eps range
- branch.assemble logs and raises "radii polynomial not negative on [0.0275, 0.0275]" (visible in controls.jsonl).
  For alln pieces, put the eps range in the label or message.

### M4 (MINOR): the run_code.json note does not match the diff
- The note says that later edits touched "the docstring, collect(), current_plan() (overlap type), reprove() and
  controls()". The git diff from the launch version 8baaadb (sha c3123c..., which matches
  `alln_py_sha256_at_run_launch`) to 4f6a88c actually touches split() (overlap to Fraction), collect() (the run_code
  field) and controls()/widen_controls(). Neither the docstring nor reprove() changed. None of these functions enter a
  bound, so the note is only inaccurate. Over the same window, branch.py changed only its docstring and branch's own
  piece_blocks return dict, which alln.py does not use. existence.py, arbmodel.py, fourier_eval.py and centre.py are
  unchanged.

## What I checked and found correct

1. **Lemma T (section 3) and tail_bounds_eps.**
   - M = Dg - J0hat with Dg = diag(iy + d, iy, ...), d real >= 0, gives |Dg^{-1}| <= I/y. The Neumann series bounds
     |M^{-1}| <= S_G / Y, and m / y = 1 / omega_bar gives |m M^{-1}| <= S_G / omega_bar. The bound
     sum_{k>=3} G^k <= theta^3 / (1 - theta) * ones is valid entrywise.
   - The code certifies theta < 1 from G = |J0hat| / Y with Y = omega_bar (m_max + 1).
   - For K < m <= m_max, the d range comes from arbmodel.damping on the eps hull. sqrt is applied to a nonnegative
     ball and sinc is entire. I checked the enclosure against 65 point values on [0, 1/4096] for m = 1, 13, 40, 200
     and 391; all are contained. The range is clipped at 0, and the union of consecutive balls covers [dlo, dhi].
     Inversion uses the Arb ball matrix and raises ZeroDivisionError, turned into ProofFailure.
   - Negative m: A_{-m} = conj A_m. C_n uses both A_m J'_n and A_m conj(J'_n) for |n| <= n_explicit, and Abar0 |J'_n|
     otherwise.
   - Every |m| > K and every eps in the piece is covered: explicitly for m <= m_max, by Lemma T beyond (which holds
     for every d >= 0). Abar0, Abar1 and C_n are maxima over both ranges.
2. **Well-posedness at eps = 0.**
   - F itself need not map X into a Banach space. The fixed-point map is defined mode by mode. For |m| > K the
     identity A_m (i omega_bar m - J0hat + d_m E) = I gives
     T(x)_m = -A_m [i (omega - omega_bar) m a_m + J0hat a_m - g_m(a)], which is bounded on X because sup |m A_m| <=
     Abar1 < inf.
   - Equivalently, A_m d_m E = I - A_m (i omega_bar m - J0hat) is bounded by 1 + Abar0 |J0hat| + omega_bar Abar1.
   - T is C^1 on the ball: the bilinear term goes through Abar1, and g is analytic on the polydisc. Fixed points are
     exactly the componentwise zeros of F, because A_fin is invertible (its compression has norm <= Z1 < 1) and each
     A_m is an inverse.
3. **eps dependence of Y0 and Z1.**
   - In DF(xbar; eps) and F(xbar; eps), eps enters only through d_m(eps) on the (V, m) diagonal and the (V, m)
     residual entries.
   - Finite rows x finite columns: A_fin is fixed, Delta = diag(d_m(eps) - d_m(e_c)) with the mean value theorem per
     m, and B1g is the column norm of |A_fin| on (V, m) divided by nu^|m| times |DD_m|. That matches the code, and its
     place in the weighted block norm is right.
   - Finite rows x tail columns contain no d.
   - Tail rows: A_m(eps) is built with the same eps as DF, so (I - A DF)_m = A_m sum_n J'_n y_{m-n} exactly. The sups
     over eps are taken in Lemma T, so there is no mismatch between eps_c and eps in the tail.
   - Y0 tail rows: F_m = -g_m does not depend on eps, and A_m(eps) is bounded by the maximum over the sub-enclosures
     (conjugated for negative m), or by Abar0 beyond m_max, plus the Cauchy tail. Y0g is the Arb product A_fin W over
     the box.
   - The Hessian/Z2 bound depends on f only and contains no eps.
   - Independent float check (my probe3): ||A(eps) F(xbar; eps)|| includes the tail rows K < |m| <= 40 with A_m(eps)
     at eps itself, evaluated at the endpoints and centre of pieces 0, 8 and 72. It stays below the logged Y0 in all
     cases, for example 7.2522e-7 against Y0 = 7.2546e-7 on the cable piece. The rigorous Y0p per component dominates
     the float tail-row contribution of m = 13 and 14, the only tail modes above the float noise floor.
4. **dd_m (section 5).**
   - The series for S and S', the ratio bounds W / ((2k+2)(2k+3)) and W / (2k(2k+3)) (both decreasing in k), the
     remainders t_n / (1 - q_n) and u_n / (1 - q'_n), and W = up(w) >= |w| are all correct.
   - The closed forms are used only when w > 1 is certain. I verified S' = (cos s - S) / (2w).
   - No sqrt-based derivative is used near eps = 0: d_m = 4 pi^2 D m^2 S(pi^2 m^2 eps)^2 is entire in eps, and only
     arbmodel.damping's value uses sqrt, on a nonnegative ball, which is valid.
   - The sub-interval cover of [e_lo, e_hi] uses 10 > pi^2.
5. **Continuity and gluing (section 6).**
   - Uniform contraction gives ||x*(eps') - x*(eps)|| <= ||T_eps'(x*) - T_eps(x*)|| / (1 - kappa). Pointwise
     continuity follows by dominated convergence with the l^1_nu majorant
     Abar1 |omega - omega_bar| |a_m| + Abar0 |J0hat a_m - g_m|.
   - glue_eps uses ||xbar_a - xbar_b||_{eta_b} + r_lo(a) max(eta_a / eta_b) <= r_hi(b), checks the overlap, and
     computes centre_distance including omega.
   - check_piece_order enforces strictly increasing endpoints and r_lo < r_hi. There are no non-consecutive overlaps.
   - The maximum lhs / r_uniqueness is 0.0075. The chain starts at 0 and reaches 1/64 with no missing plan leaves and
     no failures.
6. **Stage E identification (section 7).**
   - Same F at eps = 1/N^2: 4 pi^2 D m^2 S(pi^2 m^2 / N^2)^2 = 4 N^2 D sin^2(pi m / N). Same level phase
     (centre.level_exact), same nu (rho0 = 1/4), and Stage E weights of 1 (settings.eta is None). The conversion
     factor max 1 / eta_c is right.
   - The four Stage E record hashes in the inclusion entries equal those in results/fourier-review-status.json, which
     records Stage E as having passed in-project review.
7. **branch.assemble with G_Ks fixed.**
   - assemble uses `delta` only as dl * Y0g and dlz * B1g. The G_Ks fields enter only the Hessian-cover containment
     check ("0.0275" against "0.0275") and the record.
   - Nothing G_Ks-specific, such as an i_Ks derivative, is computed in assemble. The g derivative blocks live in
     branch.piece_blocks, which alln.py replaces with its own piece_blocks.
   - HessBound is built at the point G_Ks = 0.0275, the default of arbmodel.params used by alln's f evaluations.
8. **Code after the run, and re-proofs.**
   - The launch hash c3123c... is commit 8baaadb. The diff to the final code is listed in M4, and no bound-relevant
     code changed.
   - I re-proved two pieces the builder did not re-prove, from their stored centre, weights, r_* and radii R, with the
     final code: piece 8, [7/4096, 1/512] (interior), and piece 70, [245/16384, 249/16384] (near 1/64). For both:
     Y0, Z1, Z2, r_existence, r_uniqueness and both T bounds are equal in exact hex; the Hessian cover digest is
     equal; and the deterministic float Newton reproduces the centre digest. About 38 s each.

## Test assessment (summary)

These tests can fail and test what they claim:
- reprove bit for bit;
- the cover, gluing and order checks in collect;
- the float cross-checks of B1g and Y0g (bounded above and below);
- drop_g_width (compared with float endpoint residuals: 7.25e-7 against a mutated Y0 of 3.4e-11);
- the gluing negatives (r_uniqueness replaced by r_existence, a distant piece);
- the log tools;
- the damping series cross-checks (including the "far" exclusion).

These are weak or missing: W1 to W4 above. `no_dd lowers Y0 and Z1` only shows the terms are nonzero; magnitudes are
covered by the float cross-check.

## Commands run (all bounded)
- reprove of pieces 8 and 70 (scratchpad/reprove2.py, timeout 1700, nice 10): all bounds equal.
- probe.py: arbmodel.damping interval enclosure on [0, 1/4096]; the `tail_at_centre` detection sweep (2/254 violations).
- probe2.py: builder test_lemma_T under `tail_at_centre`: passes (not detected).
- probe3.py, probe4.py, probe5.py: float ||A(eps) F(xbar; eps)|| including tail rows at piece endpoints, compared with
  Y0 and Y0p by component (consistent; float noise at m >= 16 identified as such: it changes with the FFT size).
