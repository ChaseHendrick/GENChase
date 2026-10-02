# Adversarial reading of Appendix A (cardiac-rings.tex), 2026-10-02

File: papers/cardiac-rings/paper/cardiac-rings.tex (812 lines). Appendix A is lines 688-810; downstream uses
read: Section 5.1 (lines 310-328), Theorem 5.3 (lines 340-350), Lemmas 5.8-5.11 (lines 394-447), Lemma 5.12
and Theorem 5.13 (lines 449-501) as far as they use the appendix, and the Limitations item (line 603).

## Summary

No ERROR found. Every proof in Appendix A was checked line by line and is correct as written. Two GAPs, both in
how Section 5 hands its operators to the appendix rather than in the appendix itself, and a list of EXPOSITION
items. Numerical sanity checks (numpy, a 12x12 non-normal matrix with a 3x3 Jordan block) agree with every
identity tested.

## ERROR

None.

## GAP

G1 (line 402-408, Lemma 5.9, homotopy count). The lemma is stated for "D-hat closed with compact resolvent" on an
unnamed Banach space, and its proof cites Theorem A.5(iv) and Lemma A.6. Theorem A.5 is proved only on
X = l^1_w(I) (its part (i) needs Lemma A.1, which uses the coordinate projections of l^1_w). So the cited results
do not prove Lemma 5.9 as stated; they prove it on l^1_w(I), which is the only place it is used. The proof in
the body also asserts, without argument, that R_s(mu) is compact and norm continuous on [0,1] x Gamma; that is
supplied only in Theorem A.7. Fix: add "on X = l^1_w(I)" (or "on the space of the Scal-coordinates") to the
hypotheses, and replace the proof by "This is Theorem A.7." The conclusion used in Theorem 5.13 is unaffected.

G2 (lines 418-420 and 441-447, D-hat, E-hat and Lemma 5.11). The domain of D-hat (and of its tail part D_T) is
never stated, and E-hat is defined as the difference Scal^{-1} H_0 Scal - D-hat, which a priori lives only on a
common domain. Theorem 5.13 needs H(1) = D-hat + E-hat to equal Scal^{-1} H_0 Scal as operators, including
domains, before Theorem A.7 and the similarity give n(H_0, Omega). Lemma 5.11 also needs mu - D_T to be a
bijection from D(D_T) onto the tail space, which depends on what D(D_T) is. Each piece is routine:
(a) define D(D-hat) = {v : sum_{m in Tl} |m| |v_m|_1 < infinity} (window coordinates unrestricted), which is the
maximal domain of the block-diagonal D-hat because |B_m v_m|_1 >= (omega|m| - ||X_r||)|v_m|_1;
(b) note Scal^{-1}(Dsp) = D(D-hat) because Scal acts only on finitely many coordinates;
(c) say that E-hat is given by the displayed block formulas, which define a bounded operator on the whole space
(the d_m terms cancel exactly because X_{m mod N} uses d_{m mod N} = d_m, eq. (damping); the tail diagonal leaves
A_0 - A_0^c), so H(1) = D-hat + E-hat = Scal^{-1} H_0 Scal on D(D-hat);
(d) in Lemma 5.11, (mu - B_m)^{-1} maps into D(D_T) because ||B_m (mu - B_m)^{-1}||_{1->1} <= 1 + |mu| rho_T,
so the block inverse is a bijection of the tail space onto D(D_T) with norm at most rho_T.
Fix: add one sentence each for (a)-(c) after the definition of D-hat, and (d) in the proof of Lemma 5.11.

## EXPOSITION

X1 (line 692). "Besides the Neumann series we use only the following elementary facts" undercounts: the proofs
also use total boundedness of relatively compact sets (Lemma A.1), determinants and Cramer's rule (Theorem
A.5(ii)), existence of Riemann integrals of uniformly continuous functions (line 721), and boundedness of
coordinate functionals on a finite-dimensional space. All elementary; say "besides standard facts of linear
algebra, metric spaces and the Riemann integral, we use ...".

X2 (lines 694-703 and 781-789). Symbol clashes: I is both the index set of l^1_w(I) and the identity (e.g.
"||I - Pi_n|| <= 1" on line 703); E is the voltage projection (Section 2), the perturbation in Lemma A.2(e), and
K - F in Theorem A.5(ii), with e = ||E||; K = R(lambda_0) in A.5(ii) versus K_G and K in Theorem 5.3. Rename the
index set (e.g. calligraphic J) and the remainder in A.5(ii) (e.g. K - F =: W, w := ||W||).

X3 (line 781). e < 1/(2r) is more than needed: the proof uses only that {|zeta| >= 1/r} lies in Z = {|zeta| > e},
for which e < 1/r suffices. Harmless; either keep or write e < 1/r.

X4 (line 735, Lemma A.3(d), frame argument). Checked correct: closure(Omega') \ Omega is the union of the two
full-height strips [x0-eps, x0] x [y0-eps, y1+eps], [x1, x1+eps] x [y0-eps, y1+eps] and the two strips
[x0, x1] x [y0-eps, y0], [x0, x1] x [y1, y1+eps]; each closed strip lies in the open set where F is holomorphic;
shared edges cancel, outer edges give Gamma', inner edges give -Gamma. The sentence only mentions the cancelling
interior edges; add "and the edges on Gamma are traversed opposite to Gamma".

X5 (line 797). The hypothesis rho(H) != empty in Lemma A.6 is redundant (Gamma in rho(H_0) already gives the
nonempty resolvent set that Lemma A.2 needs for H_0). Harmless.

X6 (line 709-710, A.2(b)). "R(lambda) maps X onto D(H)" is stated but its one-line reason (x = R(lambda)(lambda -
H)x for x in D(H)) is not in the proof. Add it.

X7 (line 312). Section 5.1 defines G_mu(H) = union_k ker(H - mu)^k without the iterated-domain convention that
the appendix makes explicit (line 694). Add "(with the convention of Appendix A)".

X8 (lines 394-400 and 809). Theorem A.7 uses Lemma 5.8 from Section 5; acceptable, but moving Lemma 5.8 into the
appendix (or citing it explicitly as a prerequisite in the appendix's opening paragraph) makes the appendix
self-contained.

X9 (line 446, Lemma 5.11). "for fixed mu the blocks of the inverse tend to 0, so it is compact": add that on this
l^1 space the norm of a block-diagonal operator is the supremum of the 1->1 norms of its blocks, so the finite
truncations converge in norm (the same reason Lemma 5.4 gives for D_0).

X10 (line 603). The Limitations item says the appendix "has not yet had an adversarial reading of its own".
After the fixes, update it to record this reading (date, scope, findings and that no error was found), without
claiming an outside review.

## Checked and found correct

- Setting (line 694): rho(H) nonempty implies H closed (argument correct); definition of ker(H - mu)^k with
  iterated domains; approximable operators form a closed two-sided ideal-like subspace (AKB argument).
- Spaces (line 696): X_sp = l^1(Z; C^18) and the Scal-coordinate space (window coordinates plus Tl x {1..18},
  weights 1, norm on line 420) are both l^1_w(I) with I countable. The cell-coordinate similarity S is diagonal,
  so the S-conjugated space is still of this form.
- Lemma A.1: correct. Pi_n finite rank, ||I - Pi_n|| <= 1 and Pi_n x -> x in l^1_w; finite eps-net; one n works
  for all net points because tails decrease in n; ||K - Pi_n K|| <= 2 eps. (This is the approximation-property
  argument for a space with a monotone basis, written out.)
- Lemma A.2: (a) both identities and commutativity; (b); (c) Neumann series, openness, continuity, derivative
  -R(mu)^2; (d) via R(lambda) = R(lambda0) + (lambda0 - lambda) R(lambda) R(lambda0); (e) factorization
  (lambda - H - E) = (I - E R(lambda))(lambda - H) on D(H) and the second resolvent identity (uses
  D(H + E) = D(H)).
- Lemma A.3: (a)-(c) by Riemann sums and closedness of H in (c) (hypothesis that HF is continuous is met in every
  use: HR(lambda) = lambda R(lambda) - I); (d) Cauchy-Goursat via functionals on B(X) and Hahn-Banach; the
  four-rectangle frame (see X4); (e) Fubini on each pair of edges via functionals.
- Proposition A.4: (a) choice eps = d0/2, every frame point within sqrt(2) eps < d0 of Gamma, so the frame lies
  in rho(H); deformation to Gamma'; P^2 computation (resolvent identity with Gamma and Gamma' disjoint, inner
  winding numbers 1 and 0, Fubini for the second term) correct; PR = RP; PX in D(H), HP bounded, PH = HP on
  D(H); M closed and H-invariant. (b) telescoping inverse on ker(H - mu)^k and the scalar integrals. (c)
  (zeta - H)Q = I - P and Q(zeta - H) = I - P on D(H). (d) spec T in Omega intersect spec H; the explicit
  inverse S = (zeta - T)^{-1}P + Q(zeta)(I - P) is a two-sided inverse (both compositions checked, including
  (I - P)x in D(H)); G_mu(H) subset M by (b), = ker(T - mu)^{dim M}; Jordan decomposition gives
  M = sum of G_mu(H) and rank P = n(H, Omega). Note that (d) does not need compact resolvent, only dim M finite.
  (e) finite-rank F with ||P - F|| < 1 is injective on M.
- Theorem A.5: (i); (ii) factorization (mu - H) = (lambda0 - mu)(zeta - K)(lambda0 - H) on D(H) verified
  algebraically and numerically (residual 2e-14); zeta - K = (zeta - E)(I - G(zeta)); the finite determinant
  d(zeta) = det(I - Phi(zeta)) is holomorphic on the connected set Z = {|zeta| > e} and tends to 1; d != 0 gives
  invertibility with inverse (lambda0 - mu)^{-1} K (zeta - K)^{-1}; d = 0 gives an eigenvector x = Ky = zeta y;
  the zero set in {|zeta| >= 1/r} is compact in Z and hence finite by the identity theorem; mu -> zeta is a
  bijection of the punctured disc onto {|zeta| >= 1/r}. (iii) finite multiplicity and G_mu = ker(H - mu)^m
  with m = dim G_mu, via an isolating square. (iv).
- Lemma A.6: second resolvent identity applied to H_0 with E = E_1 - E_0, integrated; bound
  |Gamma| C^2 ||E_1 - E_0|| / (2 pi). Numerically satisfied (with a large margin, as expected).
- Theorem A.7: R_s(mu) = R_D(mu)(I - s E R_D(mu))^{-1} compact; continuity of (s, mu) -> I - s E R_D(mu) and of
  inversion (the stated perturbation bound for inverses is correct; checked numerically); uniform bound C on the
  compact [0,1] x Gamma; ||P(s) - P(s')|| <= |Gamma| C^2 ||E|| |s - s'| / (2 pi); Lemma 5.8 (whose proof is
  correct: injectivity of P on Ran P', then exchange roles once rank P' is known finite) gives local, hence
  global, constancy of the rank on [0,1].
- The homotopy is H(s) = D-hat + s E-hat with D-hat unbounded and E-hat bounded (not H(s) = D + s(H0 - D) with an
  unbounded difference): the omega m term stays in B_m (line 420), the d_m terms cancel exactly, and every block
  of E-hat is bounded (subject to G2 for the formal domain statement). So Lemma A.6 and Theorem A.7 apply.
- Downstream hypotheses: Lemma 5.4 (H_0 closed on Dsp with compact resolvent on X_sp; ||B|| <= alpha uses
  ||E||_{1->1} = 1 since E = e_V e_V^T, and d_m <= 4c; resolvent-identity step correct) supplies the hypothesis of
  Theorem A.5 used in Theorem 5.3 (finite-dimensional G_mu(H_0), nilpotent (H_0 - mu)|_G). Lemma 5.11 supplies
  for D-hat: compact resolvent, Gamma in rho(D-hat) (dist_j > 0 and N_eta contains closure(Omega)), the tail
  resolvent holomorphic on N_eta so its contour integral vanishes (A.2(c), A.3(d)), and the resolvent bound.
  Lemma 5.12 supplies invertibility of I - s E-hat R_D(mu) on [0,1] x Gamma (equivalent to invertibility of
  mu - D-hat - s E-hat because mu - D-hat is a bijection D -> X). Theorem 5.13 then uses Theorem A.7 at s = 1,
  similarity by Scal, and Gamma in rho(H_0); all consistent with what is proved (modulo G2).
- Section 5.1 (line 320): the three facts quoted match Lemma A.2(c) and Theorem A.5(ii)-(iv) exactly.

## Numerical sanity checks (scratchpad/chk.py, numpy)

Rectangle contour integral by Gauss-Legendre on each edge, H = S J S^{-1} with a 3x3 Jordan block inside Omega:
trace P = 3.0000000000000178 (count 3), |P^2 - P| = 4e-14, |PH - HP| = 7e-14; deformation to the enlarged
rectangle changes P by 1.6e-14; factorization (A-factor) residual 1.9e-14; inverse-perturbation bound and the
Lemma A.6 bound both hold.

## Verdict

Appendix A itself is correct and complete at the level of a referee-grade proof: every lemma, proposition and
theorem (A.1 to A.7) is proved from the stated elementary facts, and the downstream citations in Section 5 match
what is proved. Once G1 (state Lemma 5.9 on l^1_w(I), cite Theorem A.7) and G2 (state D(D-hat), the boundedness
of E-hat as a block operator on the whole space, H(1) = Scal^{-1} H_0 Scal with equal domains, and the range of
the tail inverse) are fixed, and the Limitations line 603 is updated, QUALITY items 1 (every theorem proved in
full) and 4 (as far as the resolvent and Riesz-projection facts are concerned) may be checked as far as
Appendix A is concerned. The EXPOSITION items are recommended but not required for that check.
