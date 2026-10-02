# Stage E adversarial review: fourier/existence.py (2026-10-01)

Reviewer: independent referee (did not write the code). Scope: `fourier/existence.py` (docstring sections 0-8 and
code), `fourier/test_existence.py`, `results/fourier-existence-N{1,8,16,32,64}.json`; read `centre.py` (loader,
Layout, level), `fourier_eval.py` (TrigPoly, strip cover, DFT enclosure) and `arbmodel.py` (damping, coupling,
f_and_df) as far as Stage E depends on them. No repository file was edited. Probes are in
`scratchpad/probe/` (perturb.py, z1float.py).

## Verdict

No UNSOUND finding. I found no bound that is not a bound, no inequality that does not follow and no omitted term
in Y0, Z1, Z2, the tail resolvent or the corollaries. The weak spot is the tests: the three negative controls
cannot tell a sound proof from an unsound one, and no test would notice if a Z1 term were dropped. Below:
2 WEAK TEST, 1 GAP (documentation only), 4 MINOR. Three numerical probes support soundness: an independent
estimate of Z1, a sampled check of the polydisc sup, and three consistency probes that perturb the centre by
about 100 times r_existence.

## Findings

### WEAK TEST 1: the negative controls cannot fail for a sound proof, and cannot catch an unsound one
- Location: `test_existence.py`, `test_negative_*`.
- Problem: all three perturbations are of size 1e-8 or more: omega + 1e-8, the N = 63 symbol (d_m changes by about
  6e-8 at m = 1), and dropping a_{+-3,V}. r_* is 1e-12, so even a perfectly sharp and correct proof must fail them
  (the radius it needs is far above r_*). The builder's remark about the crude Z2 (6.4e10) is a second reason, not
  the main one. What the controls actually show is that Y0 notices a residual of 1e-8. They would still pass if Z1
  or the tail parts of Y0 were wrongly small.
- Fix (run, see Probes): a consistency control at the scale of the claim. Perturb the centre by an exact dyadic
  delta with ||delta|| = D, where r_existence << D << r_uniqueness. Both centres then lie in each other's
  uniqueness ball, so they share the same zero x*. Hence the proof must either fail or report
  r'_existence >= D - r_existence. A sharper form is that Y0' must be about D (A DF(xbar) is about I), and a
  Y0' far below D means a residual is being missed. I ran this for omega + 2^-85, a_{+-1,V} + 2^-85 and
  a_{+-32,5} + 2^-85 (N = 1). All passed, with r'/D close to 1/(1 - Z1) = 1.256 (numbers below). Add one or two of
  these as tests. They take about 2 min each.

### WEAK TEST 2: no test would notice a dropped Z1 or Y0 term
- Location: `test_existence.py`; `existence.py` Z1 assembly.
- Problem: 1 - Z1 is about 0.80, and the largest single piece is the tail-row block T (max row sum 0.157). Deleting
  any of these would leave every test passing: T, the finite-row x tail-column block, the S_J tail beyond K', or
  the Y0 tail parts. The acceptance intervals (width about 1e-6) are about 1e17 times wider than the proved
  T enclosure, so they cannot see this either.
- Fix: add an independent floating-point lower estimate of ||I - A DF(xbar)|| on a large truncation, and assert
  that the certified per-component Z1 is at least that estimate minus a small tolerance. The estimate needs
  J_n midpoints from the Arb DFT. J_n from the double complex-step FFT has a 1e-16 noise floor, which nu^|m| blows
  up at large |m|; my first attempt gave a nonsense 2390 for this reason. Probe `z1float.py` (N = 1, columns
  |m'| <= 60, rows |m| <= 180, about 1 min) gives the following.

  | output component | float estimate | certified Z1 |
  |---|---|---|
  | V (0) | 0.0388 | 0.0678 |
  | 16 | 0.1222 | 0.2037 |
  | every other component | at most 0.0041 | at least 0.0044 |

  Every certified value is at least the estimate. This is consistent, but it is a sanity check, not a proof.

### GAP 1 (documentation): the conjugation identity f(conj z) = conj f(z) is asserted, not traced
- Location: docstring section 7.
- Problem: the real-solution argument needs f(conj z) = conj f(z) at every point phibar(theta) + h(theta) (theta
  real, |h_j| < R) that a ball element can reach. The docstring argues it from the operations used (+, -, *, /, exp,
  principal log and sqrt with Re > 0). It points to "arbmodel guards", but it does not say why this formula
  identity holds pointwise without a connectedness argument. The reason is that each elementary operation commutes
  with conjugation wherever its branch is defined, and the polydisc family at real theta is closed under
  conjugation. I did not re-audit `tp06_18d_arb.py` for a non-equivariant operation such as abs, Re/Im or a
  comparison. The fourier_eval contract forbids these, and the stage-1 review covered the file.
- Status: unconfirmed but very likely fine. Fix: add the one-sentence reason above and cite the stage-1 review
  item that covers the formula.

### MINOR
1. Docstring section 4 says "m_max is the least integer with theta <= theta_target". The code starts from a float
   guess (`ceil(...) + 1`) and only increases, so m_max may be one more than the least such integer. Harmless:
   theta is recomputed from the actual Y and checked to be < 1.
2. The `_q` docstring says it "refuses inexact values", but it does not. Exactness is checked by
   `_exact_dyadic_param`, and `theta_target` goes through `_q` alone. Harmless, because theta itself is recomputed.
3. r_uniqueness is always min(large root, r_*), so in practice it is r_* = 1e-12, set by hand rather than found.
   The record could say "uniqueness radius = the chosen Z2 validity radius r_*" so that nobody reads it as optimal.
4. In `amax`, when a > b is certain it returns `a` as is, and `a` could be a ball that is not exact. Every call site
   passes values already rounded by `up()`, so no bound is affected. For robustness, return `up(a)`.

## Checked and found correct (items 1-10 of the brief, and more)

1. **Finite rows x tail columns.** `cols_exact` covers K < |m'| <= K + L, and there |m - m'| <= 2K + L = K'. The
   Wm column is the DF(xbar) column: phase entry delta_{kV}, and row (j, m) entry -J_{m-m'}[j, k]. The i omega m
   and d_m terms vanish because m != m'. For |m'| >= K + L + 1, with |m - m'| = |m'| - sgn(m') m, each term of the
   weighted column sum divided by nu^{|m'|} is a constant times nu^{-|m'|} (phase) or (e^{-rho}/nu)^{|m'|}, so it
   decreases in |m'|. The value at mb = K + L + 1 for both signs therefore bounds the sup. |J_n| <= S_J e^{-rho|n|}
   holds for every n (Lemma 2), including n <= K'. The indexing of Wm, Wb, `lay.idx`, `_weight_rows` and the
   divisions by `nupow[|m'|]` is correct.
2. **Tail rows T.** I verified (By)_m = A_m sum_n J'_n y_{m-n} using A_m (i omega_bar m - J0hat + d_m E) = I, with
   J0hat an exact real midpoint and J'_0 = J_0 - J0hat; y_om does not enter because abar_m = 0. nu^{|m|} <=
   nu^{|m-n|} nu^{|n|} gives T = sum_{|n|<=K'} C_n nu^{|n|} + Abar0 S_J 2 q^{K'+1}/(1 - q). C_n is the maximum of
   three bounds: Neumann (S_G / Y)|J'_n| for every m > m_max, valid for both signs since |A_{-m}| = |A_m|; explicit
   Arb products A_m J'_n and A_m conj(J'_n) for K < m <= m_max with |n| <= 12, where |A_{-m} J'_n| =
   |A_m conj J'_n|; and Abar0 |J'_n| beyond n_explicit. Each is a valid entrywise bound. The column bound
   max(ff, ft) + T and its restriction to c, c' >= 1 are right.
3. **Z2 cross term.** b = y_om delta a + delta_om y_a and ||b_k|| <= 2 eta_om eta_k r. The bound
   ||A(i m b)||_c <= sum_k (N1 + Abar1)_{ck} ||b_k|| holds, with N1 the block column-sup of |A_fin| times |m| /
   nu^{|m|} (`scale_by_mode`, phase column unused) and Abar1 = sup |m A_m| (explicit for m <= m_max, Neumann
   S_G / omega_bar beyond). The omega output row uses only N0 and N1.
4. **Polydisc cover.** a_0 is replaced by acb(Re a_0 +- R, +-R), a square containing the disc of radius R in each
   component, in scaled variables (A, f and R are all scaled). a_0 enters `TrigPoly.eval_rows` once and linearly
   (pw[K] = 1 exactly), so every Phi_B contains phibar(theta) + w for all w in the polydisc and all theta in the
   box. The cover is the naive form (no df), so no midpoint is substituted for the coefficient ball. It runs over
   the full strip |Im theta| <= rho2 = 1 (`full_strip` checked). By the contract this gives holomorphy of f on an
   open U containing the compact family and |f_k| <= M_k there. The Cauchy estimate uses the same R (`Rk`), and
   Q2 uses the same rho2. Sampled check: max |f_k| over theta = x +- i, w at the corners +-2^-10 and i 2^-10 is
   0.051, below max M_k = 0.112. On the real line it is 0.027.
5. **Radii polynomial.** Z2 is a Lipschitz-type bound at xbar, ||A(DF(x) - DF(xbar))|| <= Z2 ||x - xbar||, so
   ||DT(x)|| <= Z1 + Z2 ||x - xbar||. Integrating along the segment gives Y0 + Z1 r + Z2 r^2/2, and
   Z1 + Z2 r < 1 gives the contraction. W_k(r_*) dominates W_k(||delta||) by monotonicity. The majorant
   derivatives check out: d_j P = P / (R_j - t_j), d_j^2 P = 2P / (R_j - t_j)^2, which gives
   (sum s)^2 + sum s^2. `_radii` certifies p < 0, Z1 + Z2 r < 1 and r <= r_* in Arb at both exact radii, so
   r_uniqueness = r_* is justified as a standalone contraction ball.
6. **Tail resolvent.** Neumann: B0 = J0hat - d_m E with |B0| <= |J0hat| + dmax E, dmax = up(4c) >= every d_m. This
   holds for every residue of m mod N, and N = 1 gives d_m = 0 exactly. y = omega_bar m >= Y. Each entry of G^k
   (k >= 3) is at most theta^k, and |m A_m| <= S_G / omega_bar. The explicit A_m are Arb inverses of ball matrices
   (true d_m and omega_bar inside), and negative m is handled by conjugation. Y0 tail: explicit A_m g_m for
   K < |m| <= K' (m_max is about 391 > K' = 80, so all of them are explicit), Abar0 S_g tailK beyond K'.
7. **Exactness.** The centre is read exactly (`text_to_dyadic` at 1024 bits, negation exact, symmetry and exactness
   rechecked in `prove_centre`). omega_bar is exact. A_fin is built from exact doubles, and the same A_fin appears
   in Y0, Z1, N0 and N1. The tail A_m are always enclosures of the same true inverses (same J0hat, same d_m). The
   level is exactly the double 0.2 times 4. The T and omega bounds come from exact endpoints, with outward decimals
   asserted in `dec`.
8. **Coupling through all J_n.** Finite x finite uses |n| <= 2K (explicit). Finite x tail uses explicit J up to
   |m'| = K + L, then S_J for every n. Tail rows use explicit C_n for |n| <= K', then S_J tailK. No J_n is left out.
9. **Real solution and 1-wave.** kappa is an isometry that fixes xbar and conjugates F (subject to GAP 1).
   |a*_{1V} - abar_{1V}| <= eta_V r / nu follows from ||delta a_V||_nu >= nu |delta a_{1V}|, and the code checks
   this with r = r_existence. The minimal-period, non-synchronous and 1-wave deductions are correct. omega* > 0 is
   certified through om_ball > 0.
10. **Controls.** See WEAK TEST 1 and 2.

Also checked: the sign of the damping (`tp06_18d_arb.field` uses -( ... - i_stim)/Cm, so ring_field gives
+c Laplacian and F_m + d_m E a_m is consistent); the flattening order of the Jacobian components (S_J[r][c],
enc_J.c[18 r + c] with J[i, k] = df_i/dz_k); the Lemma 3 requirement K' = 80 < M = 192; the closed forms of Q2 and
tailK; that `nupow` is long enough (K' + 2K + 4 > K + L + 1); and that the precision of each stage (PM = 128 for
products, Pg = 256 for Y0) only widens balls.

## Probes run (N = 1 centre unless stated; nice -n 10, under timeout)

| probe | result |
|---|---|
| omega + 2^-85 (D = 2.585e-26) | PROVED, Y0 = 2.585e-26, r' = 3.246e-26 >= D - r (consistent) |
| a_{+-1,V} + 2^-85 (D = 2 nu 2^-85 = 6.64e-26) | PROVED, Y0 = 6.639e-26, r' = 8.34e-26 (consistent) |
| a_{+-32,5} + 2^-85 (D = 2 nu^32 2^-85 = 1.541e-22) | PROVED, Y0 = 1.542e-22, r' = 1.937e-22 (consistent; high modes and a non-V component are seen with the right weight) |
| float lower estimate of Z1 (truncation 60/180) | max 0.122, versus certified 0.2037, and every component below its certified value |
| sampled max of f on the polydisc family | 0.051, versus M_max = 0.112 |

In each perturbation probe Y0' equals the weighted norm of the perturbation to 3 or 4 digits, and r' / D is about
1 / (1 - Z1). This is what a sound Y0 with A DF(xbar) close to I should give. A Y0 that missed a residual, or a
wrong nu weighting, would show up here. I did not run the full test suite.
