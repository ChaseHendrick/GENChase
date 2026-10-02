# Independent review of fourier/LEMMAS-stability.md (Stage S lemmas)

Reviewer: independent adversarial reading, 2026-10-01. No repository file was edited. Scratch scripts are in
`scratchpad/review/` (feas.py, feas2.py, sc.py, kap.py, jordan.py). Every numerical statement below is a floating-point
experiment, not a proof.

## Verdict

I found no error that makes a stated theorem false. The proofs of Lemma 1.0, Lemma 1.1, Theorem 1 (both
inequalities), Corollaries 1.2 and 1.3, Lemma 2, Lemmas 3.1 to 3.6 and 3.8, Theorem 3, Lemma 4.1 and Theorem 4 hold
as written, up to the minor points below. There is one serious problem, and it is about feasibility, not soundness:
Lemma 3.4's tail bound, used as checklist item 5 says, makes theta_T = theta_c rho_T about 90 to 190 at any practical
K_e, while both (SG) and (SC) need theta_T < 1. The certificate as specified cannot pass. One fix, a fixed diagonal
weight on the 18 cell components, brings theta_T down to about 0.3 (G1). There are two more gaps a program must
close: G2 (which Stage E radius to use) and G3 (Lemma 3.7's far bound).

## Findings

### G1 (GAP, serious for feasibility; soundness unaffected). Lemma 3.4 / checklist item 5: the kappa_r bound makes (C4) unreachable

Where: Lemma 3.4 (rho_T := max_r kappa_r / (gamma_r - ||Fr||)), Lemma 3.5 (both forms need theta_T = theta_c rho_T < 1),
checklist item 5.

Problem. kappa_r = ||U_r||_{1->1} ||U_r^{-1}||_{1->1} for the eigenvector matrix of X_r = A0c - d_r E is about 850 to
900 in the scaled variables. That is the same "A_0 eigenvector condition number 854" that PLAN-large-rings.md cites as
the reason to avoid eigencoordinates in the tail. The Im gap gamma_r is about omega (K_e + 1 - N/2) - 0.12. So
rho_T is roughly 900 / (0.117 (K_e - N/2)), while theta_c is about sigma_off, which is about 0.20.

Check (feas.py, feas2.py, sc.py; centre_N8_K32 and centre_N64_K32, J_n from a 512-node DFT in double):
* sigma_off = sum_{n != 0} ||J_n||_{1->1} = 0.204 and ||J_0||_{1->1} = 17.8 (N = 8; the same at N = 64).
* At K_e = N/2 + 8 the Lemma 3.4 bound is rho_T of about 940 to 995, so theta_T is about 190. At K_e = N/2 + 16,
  rho_T is about 450 and theta_T is about 92. Reaching theta_T < 1 this way needs K_e - N/2 of about 1500.
* The true sup of ||(mu - B_m)^{-1}||_{1->1} over sampled mu in closure(Omega) and m in Tl is 5.9 at offset 8 and 1.83
  at offset 16, for N = 8 and N = 64 alike. Then theta_T is 1.2 at offset 8 and 0.37 at offset 16. With that true
  value, (SC) holds in floating point for all 738 window columns at N = 8 (K_e = 20) and all 1746 at N = 64
  (K_e = 48), with fm_j set to 0 and zeta = 1. With the Lemma 3.4 bound, every column fails.

Fix (any one of these):
(a) Give the tail norm per-component weights s_l > 0. This is the same as an exact diagonal (power-of-two) similarity
    S of the cell coordinates, the same in every mode. S commutes with E and changes no eigenvalue. Every tail quantity
    (theta_c, t_w, r_j, b_m, kappa_r, Fr) is then computed in the S-weighted 1-norm. In kap.py, an optimized S (with
    column scaling of U) gives kappa = 7.0 and sigma_off = 0.085. The Lemma 3.4 bound is then rho_T = 3.8 and
    theta_T = 0.32 at offset 16, and theta_T = 0.65 at offset 8. The lemma's text already allows "an equivalent norm".
    Section 3.2 only needs to let zeta_T be a diagonal 18-vector instead of a scalar. Lemma 3.3's sentence "the tail
    weight is the constant zeta_T, so the weighted block norm is the 1->1 norm" then becomes "the S-weighted 1->1
    norm".
(b) Or bound ||(z - X_r)^{-1}|| directly: Arb inversion over a finite cover of the z-region
    {Re z in [-delta, R_0], Im z >= omega_lo (K_e + 1) - h} for Im z up to some Z, and the Neumann bound
    1 / (|z| - ||X_r||) beyond Z (as existence.py section 4 does for A_m). This needs more code and is tight.
Either way, checklist item 5 and pitfall 8 should say that kappa_r in the unweighted scaled 1-norm is fatal.

### G2 (GAP, checklist omission; numerically decisive). Which Stage E radius r enters Lemma 4.1

Where: 4.1 ("a radius r"), Lemma 4.1 (t_j = eta_j r), checklist "Inputs from Stage E".

Problem. The N = 8 record (results/fourier-existence-N8.json) has two radii: r_existence = 5.4e-28 and
r_uniqueness = 1e-12. The zero lies in both balls. Lemma 4.1 is valid with either, but eps_{kl} is about
19 M_k t / R^2. With M_k <= 0.112 (polydisc S_max) and R = 1/1024, this is about 2.2e6 t. At t = 1e-12, eps is about
2.2e-6 entrywise, and ||eps||_{1->1} is about 4e-5. That is larger than the near-axis margins (dist_j about 1.3e-6 at
N = 8, about 4.3e-6 at N = 64) once multiplied into Fm. At t = 5.4e-28, eps is about 1e-21.

Fix: state in 4.1 and in checklist item 2 that r = r_existence (the smallest certified radius) and eta are read from
the record, and that the lemma also needs t_j < R_j.

### G3 (GAP, small). Lemma 3.7's far bound for b_m uses the tail form where it is not assumed

Where: Lemma 3.7, last bullet. For |m| > K_e + n_c, the bound b_m <= (beta_max / zeta_T) Gtail(|m| - K_e) / 2 uses
||A_n|| <= s_1 q_1^{|n|} + s_2 q_2^{|n|} for every |n| >= |m| - K_e >= n_c + 1. The lemma assumes this form only for
|n| > n_A, so the step fails when n_c < n_A.

Fix: require n_c >= n_A. Or state, as 4.1 in fact gives (the strip bound for J_n and Lemma 4.1 hold for every n), that
the tail form holds for all n.

### M1 (MINOR). (SG) needs a sup over m, not "for every m"

Where: Lemma 3.5 (SG), "(b_m + theta_c) rho_T < 1 for every m in Tl". The operator-norm bound is the sup over
infinitely many column blocks. Pointwise strict inequalities do not give a sup below 1.

Fix: "sup_m (b_m + theta_c) rho_T < 1". With the monotone far bound of Lemma 3.7 the sup is a max of finitely many
numbers, so the program is unaffected if it uses that bound.

### M2 (MINOR). Lemma 3.4 / section 3.3: rho_T is stated as a bound on a neighbourhood

Where: section 3.3 ("rho_T >= sup ... over mu in a neighbourhood of closure(Omega)") and Lemma 3.3. Lemma 3.4's rho_T
bounds the resolvent on {Re mu >= -delta, |Im mu| <= h}, and on that set only. On a neighbourhood the bound is
kappa / (gamma - eps' - ||Fr||), which is slightly larger. Lemma 3.3 needs the neighbourhood only for invertibility and
holomorphy, which strictness gives, and the norm bound only on Gamma, so nothing breaks.

Fix: define rho_T as the bound on the closed set, and say "invertible with a uniformly bounded inverse" on the
neighbourhood.

### M3 (MINOR). The weighted norm of section 3.2 mixes coordinate systems

"||P||_zeta := sum_j zeta_j |(V^{-1} P_W)_j| + ..., in the coordinates of Scal" combines a formula in the original
coordinates with a remark about Scal coordinates. Lemma 3.5 uses the norm on Scal coordinates v,
sum_j zeta_j |v_j| + zeta_T sum_m |v_m|_1. The two definitions are the same norm, transported. Say which is meant.

### M4 (MINOR). Contour orientation not stated

The Riesz projection (1 / 2 pi i) contour integral of (mu - H)^{-1} needs Gamma positively (counterclockwise)
oriented. State it.

### M5 (MINOR). (S2)(ii) cites Lemma 3.8 "at mu = 0", but Lemma 3.8 assumes a disc

The mu = 0 part of Lemma 3.8's proof alone gives algebraic simplicity of 0, which is what (S2)(ii) needs. Say "the
mu = 0 part of Lemma 3.8". Also, injectivity of the bordered operator on D x C is an infinite-dimensional check. No
program step is specified for it; it would need its own Schur/tail argument.

### M6 (MINOR). Theorem 4(iii): the bound on [0, t_1] is compressed

"The time before t_1 is bounded and handled by Gronwall" also needs |sigma - (s - T)| <= C dist(x_0, O) modulo T.
This holds because sigma_inf = lim(t_k - kT) differs from t_1 - T = T - s + (t_S(z_0) - T) by O(|z_1 - x*|). One more
line would make it explicit. The statement is correct.

### M7 (MINOR). Sources: the toy script's centred count is not a confirmation

Rerunning `scratchpad/lemmas/toy.py`: the centred half-open strip gives "count 15, expected 15", but its matching
distance is 1.6e-3. Floating-point rounding put both -3.03 +- 1.75i inside and both -3.29 +- 1.75i outside, so the
count of 15 is a coincidence. The offset strip matches to 3e-13 with count 15. This is pitfall 1 itself.
Self-review item 1 already says the check was redone in an offset strip; only the offset-strip output should be cited.

### M8 (MINOR, unconfirmed). Kato references

Kato's Theorem III.6.29 (in Section III.6.8, operators with compact resolvent: the spectrum is isolated eigenvalues of
finite algebraic multiplicity, and compactness at one point gives compactness at all) matches my recollection of the
2nd edition. So do Sections III.6.4 (separation of the spectrum) and III.6.5 (isolated eigenvalues; for a finite-rank
projection, Ran P = ker (T - lambda)^m). Section III.6.1 for holomorphy of the resolvent is plausible. I did not check
them against a copy.

### Feasibility observations (not errors)

* (C1)'s conditions b < omega_lo N and -a < omega_lo N are not used in the soundness proof of Theorem 3. Only
  b - a >= omega N and (C5) are. If Omega contained +-i omega N, the count would be at least 2 and (C5) could not
  pass. The text is right that the conditions are needed to pass, but they are not needed for soundness.
* Truncation eigenvalues with positive real part (Re about 1.3e-3 to 1.5e-3) sit at the window edge (Im about
  +-(K_e - 1) omega). The recommended rectangle b = omega (N/2 + 1/4) keeps them out. (C5) gave a count of exactly 1
  in floating point at N = 8 (K_e = 20) and at N = 64 (K_e = 48).
* At N = 64 the leading near-axis eigenvalue is -9.342e-6 +- i omega, so dist_j = 4.34e-6 for delta = 5e-6. The copies
  of 0 at +-i omega N k lie outside Omega with dist_j of about 0.44 (N = 8).

## What I checked and found correct

1. Lemma 1.0. B is bounded with ||B|| <= alpha, by Young's inequality and d_m <= 4c. (lambda - D_0)^{-1} is compact
   as a norm limit of truncations. The Neumann factorization holds for Re lambda > alpha, since
   |lambda + i omega m| >= Re lambda. Compactness transfers through the resolvent identity. D is dense (it contains
   the finite sequences). Lemma 3.6 follows, and it answers the question about the right edge: Re mu > alpha does
   imply the resolvent set in l^1 with the -i omega m diagonal.
2. Lemma 1.1. I re-derived Q L(t) Q^{-1} = L(t + tau) index by index. Z(t) = Q^{-1} Y(t + tau) solves the same
   equation with Z(0) = M_tau. The induction is correct.
3. Theorem 1(a). G is L-invariant: (H - mu) maps ker (H - mu)^k into ker (H - mu)^{k-1}, which lies inside the
   domain. The chain rule gives y_j' = (A u + c E Delta_N u)(theta_j). y(tau) = Q iota*(u(tau)). Injectivity of iota*
   follows from the polynomial-in-n argument: the top coefficient is T^{k*} / k*! (K^{k*} p)(theta_j(t)), and it
   vanishes for all t, so K^{k*} p = 0. iota*(G) is M_tau-invariant with M_tau similar to lambda e^{tau K_G} there, so
   dim G <= m(lambda).
4. Theorem 1(b). B = mu + log(I + K) / tau, with e^{tau B} = M_tau on W. Pi(t + tau) = Q Pi(t), so
   Pi_j(t) = Pi_0(t + j tau) and Pi_0 is T-periodic. Component 0 of L(t) Pi = Pi' + Pi B gives L p_w = p_{B w}; the
   neighbour Pi_{-1} = Pi_{N-1} becomes p_w(theta - 2 pi / N) by periodicity. iota is injective because
   p_w(2 pi j / N) = w_j. (L - mu)^r = 0 on iota(W). Both inequalities are therefore proved, with generalized
   eigenvectors included. The proof gives more than equal dimensions: the restrictions are similar, so the Jordan
   structures agree.
   Numerical test (jordan.py). Take a constant-coefficient 3-dimensional ring (N = 3, c = 0.7) with a Jordan block of
   size 2 that persists for every d, and gauge it by y_j = R(theta_j) z_j, where R rotates the non-V components. Since
   R fixes e_V, E R = R E = E, so the coupling is unchanged, and A(theta) = R B R^T + omega R' R^T has nonzero
   |A_1| = 0.40 and |A_2| = 0.25. The dimensions of ker (M_tau - lambda)^k for k = 1, 2, 3 are [1, 2, 2] for each of
   the three Jordan multipliers, and the Galerkin H_0 (K = 40) gives exactly the same dimensions at
   mu = log(lambda) / tau and at the branch shifted by i omega N. The simple eigenvalues give [1, 1, 1] in both. One
   cluster of tiny multipliers (|lambda| about 6e-4, spacing about 1e-3) shows [1, 2, 2] for M only; this is a
   singular-value tolerance artifact ((1e-3)^2 is below the 1e-5 tolerance), not a counterexample.
5. Corollary 1.2. (i) conjugation and i omega N periodicity, with multiplicities through Theorem 1. (ii) the exact
   count 18N per half-open strip of height omega N. (iii) G_rho(M^N) = sum of G_lambda over lambda^N = rho.
   (iv) I re-derived H_q = S^{-1} (H_0 + i omega q) S line by line. The rerun of toy.py confirms (iv) to 1e-13 and the
   offset-strip correspondence to 3e-13.
6. Corollary 1.3. M_tau F(x*) = F(x*), Dg = M_tau + F(x*) Dt_g on T Sigma, the block-triangular form, and the README's
   g = Q^{-1} P with Sigma = {V_0 = s} (the V_0 component of Q^{-1} P is P's V_{N-1} = s).
7. Lemma 2 and the reduction to q = 1..floor(N/2). L phi' = 0 by differentiating (P). Membership in S_{-omega/2} gives
   q = 0..N-1. conj(i omega q) + i omega N = i omega (N - q). Each q in floor(N/2)+1..N-1 maps into 1..floor(N/2).
8. Lemma 3.1 (Kato's projection lemma) and Lemma 3.2. The factorization, compactness, joint norm continuity of
   R_s(mu) on the compact set [0,1] x Gamma, rank = sum of algebraic multiplicities, and local constancy by Lemma 3.1
   all hold. The resolvent bound is needed on the whole contour for every s. (SG) gives it uniformly in s. (SC) proves
   invertibility for each (s, mu) separately, which suffices, because continuity of the inverse is automatic on the
   open set of invertible operators.
9. Section 3.2. The blocks of Ehat, including Ehat_TT = sum over n != 0 with m - n in Tl, plus A_0 - A0c. Ehat is
   bounded. The exact omega is kept in D_T, which avoids the unbounded (omega - omega_bar) m term. The window enclosure
   with [omega] contains the true H_WW. Lemma 3.4 uses only omega_lo. This handling of omega is sound.
10. Lemma 3.3. The tail resolvent is compact (block norms tend to 0) and holomorphic on a neighbourhood of
    closure(Omega), so its contour integral vanishes. The rank equals #{lambda_j in Omega}.
11. Lemma 3.4. Both lower bounds on |z - lambda_{r,l}| hold for Re mu >= -delta, |Im mu| <= h and |m| >= K_e + 1.
    Then Neumann. It is uniform over the infinitely many tail modes, through finitely many residues r and
    |m| >= K_e + 1. It is sound; only its size is a problem (G1).
12. Lemma 3.5. (SG): the column sums in the weighted l^1 norm, with window column j bounded by zeta_j fm_j + r_j and
    tail block m by zeta_T (b_m + theta_c) rho_T. (SC): the tail inverse bound rho_T / (1 - theta_T), uniform in s; the
    Schur complement sign (+s^2 from (-s E_WT)(...)^{-1}(-s E_TW)); ||Ehat_WT||_zeta <= bhat and
    ||Ehat_TW e_j||_zeta <= r_j. The zeta_T factors cancel, so (SC) is independent of a scalar zeta_T. The equivalence
    with invertibility of I - s Ehat R_D also checks.
13. Theorem 3, final step. Re mu < R_0 by Lemma 3.6. Translating by i omega N k into [a, a + omega N) inside [a, b]
    uses b - a >= omega_hi N. Boundary cases are excluded because Gamma lies in the resolvent set, so mu' is in Omega,
    mu' = 0, and the multiplicity is 1. "Exactly one lambda_j in Omega" plus the homotopy gives exactly one eigenvalue
    of H_0 in Omega with algebraic multiplicity 1, and Lemma 2(a) identifies it as 0. The contour covers one full
    period, as the proof needs.
14. Lemma 3.8. Each case (l(v) != 0, ker H = span v, no Jordan chain, no other eigenvalue in the disc) checks.
15. Lemma 4.1. |phi_j - phibar_j| <= ||a_j - abar_j||_nu <= eta_j r on |Im theta| <= rho0, which is exactly
    existence.py's norm max(|omega| / eta_om, max_k ||a_k||_nu / eta_k). The majorant
    Phi = M_k prod_j (1 - t_j / R_j)^{-1} gives d_l Phi(t) - d_l Phi(0) = eps_{kl} as written. Only terms with
    alpha_l >= 1 and |alpha| >= 2 enter. The strip and limit argument for the Fourier bound is right. With existence.py's
    defaults (rho0 = 1/4, rho2 = 1), rho_e = 1/4.
16. Theorem 4. (i) and (ii) follow from Corollary 1.2 and Theorem 3. (iii): the transversality derivative is
    |F(x*)|^2, DPm(x*) = Pi_Sigma Y(T) on T Sigma, the Jordan-scaled norm with induced row-sum norm
    <= spectral radius + eta, the contraction on a convex ball in Sigma, the summable return-time defects, the
    asymptotic phase sign, and kappa^k <= C e^{-delta' t}. This is a correct self-contained Andronov-Witt proof. It
    is conditional on Stage E, whose own status is "awaiting adversarial review".

## Things a program needs that the checklist omits

1. The tail norm choice of G1 (per-component weights S), or a direct resolvent cover. Without it, step 5 fails.
2. r = r_existence from the Stage E record (G2), and an assertion that t_j < R_j.
3. n_c >= n_A, or the tail form asserted for all n (G3). The supremum form of (SG) (M1).
4. Window and b_m coefficient ranges. The window needs [A_n] for |n| <= 2 K_e, and b_m needs |n| <= 2 K_e + n_c.
   Stage E's K' = 80. At N = 64 with K_e = N/2 + 16 = 48, 2 K_e = 96 > K', so the strip tail form is used there
   (sound; S_J e^{-81} is negligible).
5. Outward rounding of the reported bounds e^{-delta T_lo} and e^{-delta tau_lo}, with tau_lo = T_lo / N.
6. The contour orientation (M4), and a statement that a, b, R_0 and -delta are exact dyadics, so that the (C5)
   comparisons are exact.
7. A step for Lemma 3.8 / (S2), if it is used: an infinite-dimensional bordered injectivity test is not specified.
8. Theorem 4 inherits Stage E's status. The Stage S record must not say "verified" before Stage E's does.
