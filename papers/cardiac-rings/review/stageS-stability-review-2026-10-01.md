# Stage S referee report: fourier/stability.py against fourier/LEMMAS-stability.md

Date: 2026-10-01. Referee: an independent adversarial reading inside this project's session (not an outside review).
Scope: fourier/stability.py, fourier/test_stability.py, results/fourier-stability-N{1,8,16,32,64}.json, against
LEMMAS-stability.md (Theorem 3, Lemmas 3.3 to 3.7, 4.1, checklist section 5). No repository file was edited. Probes ran on
a private copy (scratchpad/sref/, instrumented with dump and mutation hooks; scripts in scratchpad/sref/probes/).

## Verdict

No UNSOUND item found. The program certifies what the lemmas support, for every check I could reach. The builder's four
deviations are rigorous upper bounds of the lemma quantities. Findings are one provenance GAP, three WEAK TEST items and
five MINOR items. The N = 32 worst (SC) ratio 0.774 is explained and is not a hidden error: it is a loose floating-point
choice, and the Arb bound tracks the true value.

## Findings

### GAP 1: provenance of the Stage E inputs is recorded but not enforced, and the records are already stale

* Location: stability.py `stage_e_inputs` (`stage_e_sources_match` computed, never checked) and `run`
  (`stage_e_record_sha256` written, never checked again).
* Problem: (a) results/fourier-stability-N64.json has `stage_e_sources_match["fourier/existence.py"] = false`. The
  Stage E record it relies on was made by a different existence.py from the one hashed in its own sources. (b) The working
  tree's results/fourier-existence-N1.json and -N8.json were rewritten at 21:06 and 21:08 (uncommitted; the diff adds
  `r_uniqueness_set_by_r_star`, a note and new timings). Their SHA-256 values (628822e1..., a1bd799b...) no longer equal
  the `stage_e_record_sha256` in fourier-stability-N1/N8.json (7b1cb074..., 982f8ec3...). (c) The current existence.py
  (393f4c5b...) matches neither recorded version (d1a7cfb2..., d7b698b4...).
* Effect on soundness: none found. r_existence, omega and eta are unchanged in the diff, and the Stage S proof uses only
  the centre, omega_lo/hi, r_existence, eta and rho0 from Stage E. Everything else it recomputes. But a later
  "verified" chain would point at records that do not exist in that form.
* Fix: fail, or at least refuse to write a record, when `stage_e_sources_match` has a false entry. Add a lint or test
  check that `stage_e_record_sha256` equals the current Stage E file. Rerun Stage S after Stage E is final.

### WEAK TEST 1: no test checks that the Arb bounds dominate independently computed values; one-term omissions cannot be seen

* Location: test_stability.py (whole file).
* Problem: every negative control decides through the floating count (C5), a geometric comparison (C1) or a gross
  failure (route A, theta_T). None of them is near the margin of the quantities a bound error would shrink. Mutations
  I made in a copy all still CERTIFIED at N = 8, delta = 5e-6:
  * fm_j without the factor 1/(1 - q_C) and without |lambda_j| ||C e_j|| (that is, fm_j := ||Wm e_j||), together with
    t_w without Gtail(n_A + 1) and the far bound b_m set to 0: certified, with the same worst ratio.
  * the tail matrices X_r without the damping term -d_r E (X_0 used for every r): certified, rho_T unchanged at 3.578.
  These terms are numerically negligible (q_C about 3e-14, Gtail(81) about 1e-20, far bound about 3e-12, d_r <= 4c =
  0.004 at N = 8), so these omissions are harmless here. The point is that the suite cannot detect them, and it could not
  detect a real mis-scaling of the same size either.
* Evidence: probe3.py output: `tail_nodamp: CERTIFIED`, `fm_noC+tw_noG+nofar: CERTIFIED`.
* Fix (proposed test, about 2 min at N = 8; probe1.py is a working prototype): compute in floating point, independently
  of the Arb path, the true column sums of V^{-1} H_WW V - Lambda, the true ||H_TW V e_j||_1 (tail rows up to
  K_e + K'), the true max_k sum_j |(V^{-1} H_{W,m})_{j,k}|, the column sums of V^{-1}, sigma_off, and a sampled sup of
  ||(z - X_r)^{-1}||_{1->1} over a grid of Zset. Assert that each certified bound is >= the float value up to a
  relative 1e-6 slack (or an absolute 1e-15 slack for tiny columns). Results at N = 8:
  fm (Arb / float) >= 1.00000001 on every column with fm > 1e-11 (the minimum 0.99999 occurs on columns with fm about
  7e-12, where the difference is 8e-17, the reference computation's rounding); r_j: min ratio 1.39; b_m: min ratio 1.22;
  beta: 1.000000000000024; sigma_off 0.078728182888743 against float 0.078728182888320; rho_T 3.578 against sampled sup
  0.641.

### WEAK TEST 2: two negative controls do not say where they must fail

* Location: test_stability.py `test_neg_antidiffusion` and `test_neg_drop_A1_proof_only`, and the first call in
  `test_neg_drop_A1_detected`, which have no `expect_text`.
* Problem: any ProofFailure counts as a pass, including one from an unrelated step (S search, route A).
* Evidence (probe4.py): anti-diffusion fails at "(C5) count ... is 9". "drop A1 proof only" fails at "(SC) fails for 127
  window columns".
* Fix: `expect_text=["(C5)"]` and `expect_text=["(SC)"]`, respectively.

### WEAK TEST 3: no control makes the floating choices lie while the proof data are true

* Problem: the delta and anti-diffusion controls change the true spectrum, and the floating count follows it. Nothing
  checks that the Arb residual catches floating data that place an eigenvalue on the wrong side of Gamma. That is the
  main job of fm_j.
* Proposed control (run, and it behaves correctly): after LAPACK, move the leading near-axis pair from Re = -6.32e-6 to
  Re = -7.5e-6 and run delta = 7e-6. The count is then 1 (a lie), dist about 5e-7, and the true residual is about
  1.2e-6. Result: `ProofFailure: (SC) fails for 2 window columns, e.g. lambda = (-7.5e-06+0.1172592...j)`. Add it as a
  test hook (for example `controls={"shift_lambda": ...}`).
* Proposed sharp pair (run): delta = 6.32095e-6, which sits 1.3e-6 relative below the float |Re lambda_lead| =
  6.3209583e-6, is CERTIFIED with near-axis ratio 0.398. delta = 6.321e-6 FAILS with "(C5) count ... is 3". This is a
  stronger acceptance and negative pair than 6.3e-6 against 7e-6. Make the margins explicit in the test, since the
  float exponent is not itself certified.

### MINOR 1: the N = 32 worst (SC) ratio 0.774 is a floating-point artifact (not an error) and would be removed by choosing V in S-coordinates

* Location: stability.py step 6, `lam, Vf = np.linalg.eig(Hf)` on the UNSCALED matrix, followed by `Vf / Ss[:, None]`.
* Explanation: S has exponents from -12 to +29 (cond(S) about 2^41). LAPACK's backward error, small in the unscaled
  coordinates, is amplified by S^{-1} and the column normalization. The worst columns are the 41 (N = 8) or 65 (N = 32)
  eigenvalues at Re = -0.58356 (one per mode). The eigenvalues are distinct, with gaps of about omega, so the problem is
  not defectiveness. Float reproduction:

  | N | max fm, eig unscaled then S | max fm, eig of S^{-1} H S directly |
  |---|---|---|
  | 8 | 0.0536 | 2.4e-12 |
  | 32 | 0.437 | 4.2e-12 |

  At N = 8 the Arb fm matches the float residual to a ratio of 1.00000001 on these columns. The bound is honest, not
  hiding an error. The ratio 0.774 is fm_j (0.456) over dist_j (0.59) for lambda = -0.5836 + 1.993i, a fast mode just
  above b.
* Fix (robustness only): compute `eig` on the S-scaled float matrix, or refine V by one inverse-iteration or Newton step.

### MINOR 2: records are not bit-reproducible

* Problem: `search_S` stops on wall time (budget_s = 600), and multithreaded LAPACK returns different eigenvectors. A
  rerun at N = 8 with the recorded S gave SC worst 0.0947 at lambda = -0.5836 - 0.1172i, against the recorded 0.0923
  at -0.5836 - 2.345i. The certificate still holds; only the diagnostic values differ.
* Fix: say so in the record, or pin LAPACK threads (OMP_NUM_THREADS = 1) for the window eig.

### MINOR 3: the specification does not yet describe the program's route for V^{-1}

* Problem: (C3) and checklist item 6 ask for "an Arb enclosure of V^{-1}". The program instead uses C = I - Vi V with
  q_C < 1 and Neumann bounds. That route is correct (see below), but the lemma file should state it, with the identity
  Vi(HV - V Lambda) = Vi H V - Lambda + C Lambda and the left factor (I - C)^{-1}. Lemma 3.4 already allows any invertible
  U_r and any diagonal Lambda_r, so the clustering needs only a sentence.

### MINOR 4: settings merged onto the current existence.DEFAULTS

* Location: `st = dict(ex.DEFAULTS); st.update(rec["settings"])`.
* Problem: a key missing from the record would silently take the value in the existence.py now being edited. Today all
  keys are present (eta is null, meaning all ones, which matches Stage E's convention), so there is no current effect.
* Fix: require every key used (rho0, eta, rho, rho2, R, L, M, precisions, strip settings) to be present in the record.

### MINOR 5: rho_T is about 5.6 times the sampled true sup

* Detail: rho_T = 3.578 against a sampled sup of 0.641 at N = 8. It is valid and costs only margin (theta_T 0.28).
  No action needed.

## The builder's deviations, checked

1. **No Arb inverse of V.** Vi V = I - C with ||C||_{1->1} = q_C < 1 (checked in Arb, column sums of |Vi V - I|) gives V
   invertible and V^{-1} = (Vi V)^{-1} Vi = (I - C)^{-1} Vi. The left placement is the correct one; a right factor
   Vi (I - C')^{-1}, with C' = I - V Vi, would be a different identity. Then:
   * Fm = V^{-1}(H V - V Lambda) = (I - C)^{-1} Y with Y = Vi H V - (I - C) Lambda = Vi H V - Lambda + C Lambda, exactly.
   * Column j: ||Fm e_j||_1 <= ||(I - C)^{-1}||_{1->1} ||Y e_j||_1 <= (||Wm e_j||_1 + |lambda_j| ||C e_j||_1) / (1 - q_C),
     since C Lambda e_j = lambda_j C e_j.
   * beta_{(w,l)} = ||V^{-1} e_{(w,l)}||_1 <= ||Vi e_{(w,l)}||_1 / (1 - q_C).
   * With zeta all 1 (the only setting implemented; anything else raises), the weighted norms are the plain 1-norm and
     the induced norm is the maximum column sum. Wm = Vi [H_WW] V - Lambda is an Arb ball over every matrix in [H_WW],
     the true one included.

   Correct. The independent float check agrees (WEAK TEST 1).
2. **Stage E inputs recomputed.** [J_n], S_J and M_k come from the same fourier_eval calls (strip_sup with the J
   tolerances, the polydisc inflation of a_0 by a complex box of half-width R, which contains the disc, and
   fourier_coefficients with S from the strip, full_strip asserted). These objects need not be identical to Stage E's:
   Stage S needs only rigorous bounds for the centre's phibar, which the recomputation provides by itself. The objects
   that must be Stage E's are the centre (centre SHA-256 plus the TrigPoly digest; the digest also pins R through the
   inflated polynomial), omega_lo/hi, r_existence, eta and rho0, all read from the record. So the S_max/digest match is
   a sufficient guard for "same centre". It is not a proof that per-entry S or M_k are equal to Stage E's, but that
   equality is not needed. The remaining risk is provenance (GAP 1).
3. **Route A clustering.** Lambda_r is still the diagonal of the floating U_r^{-1} X_r U_r. The intra-cluster
   off-diagonal entries go into Fr, which Arb computes as [U_r^{-1}] X_r U_r - Lambda_r. Lemma 3.4's proof uses only
   "U_r invertible, Lambda_r diagonal, Neumann on z - Lambda_r - Fr". gamma_r therefore correctly bounds
   ||(z - Lambda_r)^{-1}||, and no block inverse is needed. The cost shows in ||Fr|| (0.36 to 0.53, against
   gamma_r of about 1.845). Sound.
4. **Trivial-eigenvector residual.** It raises InputMismatch only, so it can only stop a run. P* is scaled by
   2^{-e_r} (S^{-1} P*, the right direction). Its residual of about 1e-20 also confirms the sign convention
   (A_n coefficient of e^{+in theta}, diagonal -i omega m, damping sign) in the window; a flipped convention would leave
   an O(1) residual.

## Other items checked and found correct

* **S direction everywhere.** scl[r][c] = 2^{e_c - e_r} gives (S^{-1} M S)_{rc} for [A_n], A0c, eps, S_J and the
  tail-form balls; the float X and H use the same ratio s_c / s_r; V^S = S^{-1} V; P* uses 2^{-e_r}. A mutation that
  flips S in the tail only is self-detected (theta_T = 2e11, so route A cannot pass). The window residual fm would
  explode under a window flip.
* **Lemma 4.1.**
  * t_j = eta_{1+j} r_existence, with eta index 0 = omega (as in existence.py); t_j < R asserted.
  * eps_{kl} = (M_k / R)[(1 - t_l / R)^{-1} prod_j (1 - t_j / R)^{-1} - 1] matches the majorant derivative.
  * rho_e = min(rho0, rho2) = 1/4 = rho0, Stage E's l^1_nu strip, where |phi_j - phibar_j| <= ||a_j - abar_j||_nu
    <= t_j holds.
  * M_k is recomputed on rho2 = 1 >= rho_e with a checked full strip cover, which also certifies holomorphy of f on
    the thickened set.
  * [A_n] = ([J_n] + Q eps e^{-rho_e |n|}), with Q the box [-1,1] + i[-1,1], which contains the unit disc.
* **Tail form and Lemma 3.7.**
  * s1 = ||S^{-1} S_J S||, q1 = e^{-rho}; s2 = ||S^{-1} eps S||, q2 = e^{-rho_e}. Both hold for every n (Cauchy on the
    J strip, plus Lemma 4.1).
  * Gtail(k) = 2 sum s_i q_i^k / (1 - q_i).
  * sigma_off = sum_{0 < |n| <= 80} ||[A_n]|| + Gtail(81).
  * t_w sums ||[A_n]|| over |n| <= 80 with |w + n| > K_e, plus all of Gtail(81) (an over-count, sound).
  * r_j = sum_{(w,l)} t_w |V_{(w,l),j}|.
  * b_m for K_e < |m| <= K_e + n_c: rows (w,l), the entrywise |[A_{w-m}]| (the tail-form ball for |w - m| > 80, which
    reaches up to 2 K_e + n_c = 120 at N = 64), maximum over k.
  * Far bound: (beta_max / zeta_T) Gtail(n_c + 1) / 2, the value at |m| = K_e + n_c + 1 of a quantity that decreases
    in |m| (the indices have one sign and |n| >= |m| - K_e).
  * bhat is the maximum of all of these.
  * theta_c = sigma_off + ||[A_0] - A0c|| (the eps ball included).
* **Route A (C2).** gamma_r = min_l max(lo(-delta - eta - Re lambda_rl), lo(g_0 - eta - |Im lambda_rl|)), with
  g_0 = omega_lo (K_e + 1) - h, h = b = -a, and eta = 2^-20 exact. X_r = A0c - [d_r] E is real (A0c is the real
  midpoint and d_r is real), so the conjugation step of Lemma 3.4(a) applies. r runs over 0..floor(N/2) and
  d_{N-r} = d_r. kappa_r = ||U|| ||[U^{-1}]||. gamma_r > ||Fr|| is checked in Arb. rho_T is the maximum over r.
* **(C1).**
  * delta is rounded up to a dyadic (2^-60).
  * a = -b is an exact double; R_0 is a power of two greater than alpha^up = sigma_off + ||[A_0]|| + 4c (Lemma 1.0
    in S-coordinates, a similarity).
  * b - a >= omega_hi N, b < omega_lo N and -a < omega_lo N are all checked in Arb, so the rectangle covers one full
    period.
  * omega enters [H_WW] as the ball [omega_lo, omega_hi], and the tail only through omega_lo in g_0. B_m keeps the exact
    omega, so pitfall 6 is avoided.
* **dist_j and (C5).** These use exact Fractions of the same doubles that enter Lambda in Arb. The open-rectangle test
  uses strict inequalities. Inside points take the minimum distance to the four edges, outside points the distance to
  the closed rectangle (equal to the distance to Gamma). dist_j = 0 (an eigenvalue exactly on Gamma) raises (C3). The
  count must be 1, and the skip_count hook re-checks it before any conclusion.
* **(SC).**
  * Checked for every window column j (range(nW)) as fm_j + bhat rho_T r_j / ((1 - theta_T) zeta_j) < dist_j, with
    theta_T < 1 checked first.
  * Reduction to finitely many checks: by Lemma 3.5's proof, dist_j is the minimum over Gamma of |mu - lambda_j|, and
    rho_T bounds the tail resolvent on all of closure(Omega). One inequality per column covers every (s, mu) in
    [0, 1] x Gamma.
  * I re-derived the Schur-complement bound, including the s^2 factor and the s-uniform bound
    rho_T / (1 - theta_T).
* **Conclusions.** T_lo = lo(2 pi / omega_hi), and e^{-delta T_lo} and e^{-delta T_lo / N} are rounded up. The direction
  is right: T >= T_lo, so e^{-delta T} <= e^{-delta T_lo}.
* **Controls.** Test hooks are never passed by `run`, and any use is recorded in the output.
* **The other negative controls do what they claim.**
  * delta = 7e-6 at N = 8: (C5).
  * K_e = 5: g_0 is about 0.205, so the gamma of the 0.1177i pair is about 0.087 < ||Fr||, and route A fails, as
    claimed.
  * S = I: theta_T or route A fails, as claimed.
  * drop A1 with skip_count: the trivial-eigenvector check detects it.
  * omega_lo = b / N: (C1).
  * The monodromy cross-check is independent and can fail.

## Probe log (N = 8 unless stated; private copy, recorded S exponents)

| Probe | Result |
|---|---|
| baseline delta 5e-6 | CERTIFIED, theta_T 0.2817, SC worst 0.0947 (record 0.0923, see MINOR 2) |
| float dominance (probe1) | all bounds >= float values (ratios above) |
| eig residual, unscaled vs S coords (probe2, N = 8 and 32) | 0.054 / 2.4e-12; 0.437 / 4.2e-12 |
| tail S flipped | FAILED, theta_T = 1.96e11 (self-detected) |
| tail without damping | CERTIFIED (undetectable; WEAK TEST 1) |
| fm without C terms, t_w without Gtail, far bound 0 | CERTIFIED (undetectable; terms about 1e-12 or smaller) |
| delta 6.321e-6 | FAILED (C5), count 3 |
| delta 6.32095e-6 | CERTIFIED, near-axis ratio 0.398 |
| lying Lambda (leading pair to -7.5e-6), delta 7e-6 | FAILED (SC), 2 columns |
| anti-diffusion | FAILED (C5), count 9 |
| drop A1 in the proof data only | FAILED (SC), 127 columns |

Not run: N = 64 (cost); the N = 64 record was read only. Kato section numbers were not checked (the lemma file marks
them "to be confirmed").
