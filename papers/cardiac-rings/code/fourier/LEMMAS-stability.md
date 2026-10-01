# Stage S lemmas: the ring's Floquet spectrum through one Hill operator

Status: written 2026-10-01, before any Stage S code (PLAN-large-rings.md, step 3). Every statement below is proved
here by hand or reduced to a cited textbook fact; nothing in this file is a computational result. The proofs have had
one self-adversarial reading by their author (section 8) and one independent reading by a referee in this project's
session (report in the session scratchpad, `lemmas-review.md`; no error found, three gaps and eight minor items, all
addressed in section 9); this is not an outside review. The plan requires a
second, independent reading before any record says "verified".

Contents

0. Setting and notation
1. Hill-sector lemma (Theorem 1 and its corollaries)
2. The trivial multiplier (Lemma 2)
3. Exclusion and isolation by a Riesz-projection homotopy (Theorem 3)
4. Conclusion theorem with Stage E (Theorem 4)
5. What the program must compute (checklist)
6. Pitfalls
7. Sources and related work
8. Self-review
9. Review response (independent referee, 2026-10-01)

## 0. Setting and notation

* Cells j in Z_N (indices mod N), x_j in R^18, x = (x_0, ..., x_{N-1}) in R^{18N}. The ring field is
  F(x)_j = f(x_j) + c E (x_{j-1} - 2 x_j + x_{j+1}), with c = N^2 / 64000 (per ms) and E = e_V e_V^T the projection
  on the V component. For N = 1 the coupling term is c E (x_0 - 2 x_0 + x_0) = 0. Everything below may be read in
  the scaled variables of `fourier/arbmodel.py` (z = x / sigma, sigma diagonal and exact): a constant diagonal change
  of variables is a similarity, it commutes with E, and it changes no eigenvalue or multiplier.
* The shift Q: (Q x)_j = x_{j+1}. F(Q x) = Q F(x), Q^N = I, and Q is an isometry for every norm that treats the cells
  symmetrically (for instance the Euclidean norm).
* The rotating wave. omega > 0, T = 2 pi / omega, tau = T / N. phi: R -> R^18 is 2 pi periodic, real analytic and
  nonconstant, with phi(theta) = sum_m a_m e^{i m theta}, and solves the profile equation

      (P)   omega phi'(theta) = f(phi(theta)) + c E (Delta_N phi)(theta),
            (Delta_N p)(theta) := p(theta - 2 pi/N) - 2 p(theta) + p(theta + 2 pi/N).

  Then x_j(t) := phi(theta_j(t)), theta_j(t) := omega t + 2 pi j / N, solves the ring ODE (x_{j +- 1}(t) =
  phi(theta_j(t) +- 2 pi / N), and indices mod N are consistent because phi is 2 pi periodic), and x(t + tau) = Q x(t)
  because theta_j(t + tau) = theta_{j+1}(t). Write x* := x(0).
* Damping. For a 2 pi periodic p with Fourier coefficients P_m, Delta_N p has coefficients
  (e^{-2 pi i m/N} - 2 + e^{2 pi i m/N}) P_m = -4 sin^2(pi m / N) P_m. Put d_m := 4 c sin^2(pi m / N). Then
  0 <= d_m <= 4 c, d_{-m} = d_m, d_{m+N} = d_m, d_{N-m} = d_m, and c E Delta_N acts on mode m as -d_m E.
* Coefficients. A(theta) := Df(phi(theta)) = sum_n A_n e^{i n theta}, a real analytic 2 pi periodic 18 x 18 matrix
  function, so A_{-n} = conj(A_n) and ||A_n|| decays exponentially.
* Linearization. y' = L(t) y with (L(t) y)_j = A(theta_j(t)) y_j + c E (y_{j-1} - 2 y_j + y_{j+1}). Y(t) is its
  fundamental matrix, Y(0) = I; Y(t) = D phi_t(x*) for the ring flow phi_t. The Floquet multipliers of the wave
  (with respect to the period T) are the eigenvalues of the monodromy Y(T), with algebraic multiplicity. Put
  M_tau := Q^{-1} Y(tau) = D h(x*), h := Q^{-1} phi_tau (the README's shift-reduced map before the section is taken).
* Multiplicities. For a square matrix M, m(lambda; M) is the algebraic multiplicity (0 if lambda is not an
  eigenvalue) and G_lambda(M) the generalized eigenspace. For an operator H, G_mu(H) := union over k of
  ker (H - mu)^k and m(mu; H) := dim G_mu(H).
* Function space. |.|_1 is the l^1 norm on C^18 and ||B||_{1->1} the induced matrix norm (largest column sum of
  absolute values). X := l^1(Z; C^18) with ||P|| = sum_m |P_m|_1, and D := {P in X : sum_m |m| |P_m|_1 < inf}.
  A sequence P in D is the coefficient sequence of the C^1 function p(theta) = sum_m P_m e^{i m theta}, with
  p' = sum_m i m P_m e^{i m theta} (both series converge absolutely and uniformly).
* The Hill operator H_0: D -> X,

      (H_0 P)_m = -i omega m P_m + sum_n A_n P_{m-n} - d_m E P_m.

  For P in D it is the coefficient sequence of L p, where

      L p := -omega p' + A p + c E Delta_N p

  (the product A p has coefficients sum_n A_n P_{m-n} because both series converge absolutely). The ansatz
  y_j(t) = e^{mu t} p(theta_j(t)) gives y_j' = e^{mu t} (mu p + omega p')(theta_j) and
  (L(t) y)_j = e^{mu t} (A p + c E Delta_N p)(theta_j), so it solves the linearization iff L p = mu p, that is
  H_0 P = mu P. This fixes the sign convention: P_m multiplies e^{i m (omega t + 2 pi j / N)}, the diagonal is
  -i omega m, and the convolution is sum_n A_n P_{m-n} with A_n the coefficient of e^{i n theta}. The prototype
  (`prototypes/fourier-feasibility/rw_fourier.py`, `hill_spectrum`; `hill.py`) uses exactly this convention: its A_n
  is `fft(J)/L` of samples at theta_k = 2 pi k / L (the coefficient of e^{i n theta}), its block (m, m') is A_{m-m'},
  its diagonal is -i omega m, and its damping -4 c sin^2(pi m / N) sits on the V entry. A scratch check
  (`scratchpad/lemmas/toy.py`: 3-dimensional cells, N = 5, random trigonometric A) reproduces e^{mu tau} = eig(M_tau)
  to 3e-13 with this convention, in the OFFSET half-open strip a = -omega N / 2 + 0.3 (count 15 = 3N), and misses by
  4e-2 with the opposite sign of the diagonal. Its centred strip also prints "count 15", but there the match is only
  1.6e-3: rounding put both copies of one eigenvalue on Im = +- omega N / 2 inside and both copies of another outside,
  so that count is a coincidence (pitfall 1), not a confirmation.

## 1. Hill-sector lemma

### Lemma 1.0 (the operator)

H_0 is closed on D, has compact resolvent, and {mu : Re mu > alpha} lies in its resolvent set, where
alpha := sum_n ||A_n||_{1->1} + 4 c. Its spectrum consists of isolated eigenvalues mu with m(mu; H_0) finite, and
G_mu(H_0) is the range of the Riesz projection of mu.

Proof. Split H_0 = D_0 + B with (D_0 P)_m = -i omega m P_m on D and B P := (sum_n A_n P_{m-n} - d_m E P_m)_m. B is
bounded on X with ||B|| <= sum_n ||A_n||_{1->1} + max_m ||d_m E||_{1->1} <= alpha (Young's inequality on l^1).
D_0 is closed on D (a diagonal operator with its maximal domain). For lambda not in i omega Z, (lambda - D_0)^{-1} is
the diagonal operator with entries (lambda + i omega m)^{-1}; it is compact, because it is the norm limit of its
finite truncations: the error of the truncation to |m| <= M is sup_{|m| > M} |lambda + i omega m|^{-1} -> 0. If
Re lambda > alpha, then ||(lambda - D_0)^{-1}|| <= 1 / Re lambda (|lambda + i omega m| >= Re lambda), so
||B (lambda - D_0)^{-1}|| < 1, and lambda - H_0 = (I - B (lambda - D_0)^{-1}) (lambda - D_0) is a bijection D -> X
with inverse (lambda - D_0)^{-1} (I - B (lambda - D_0)^{-1})^{-1}, which is compact. H_0 is closed (a closed operator
plus a bounded one). A resolvent that is compact at one point is compact at every point of the resolvent set (the
resolvent identity R(lambda) = R(lambda_0) (I + (lambda_0 - lambda) R(lambda))). The remaining statements are the
standard consequences of a compact resolvent: Kato 1976, Theorem III.6.29 (numbering to be confirmed against a copy, see section 7) (spectrum = isolated eigenvalues of finite
algebraic multiplicity) and Section III.6.5 (for an isolated eigenvalue with finite-rank Riesz projection, the range of
the projection is ker (H - mu)^k for all large k). QED

### Lemma 1.1 (twisted periodicity)

L(t + tau) = Q L(t) Q^{-1}, Y(t + tau) = Q Y(t) M_tau for all t, Y(k tau) = Q^k M_tau^k, and Y(T) = M_tau^N.

Proof. (Q L(t) Q^{-1} y)_j = (L(t) Q^{-1} y)_{j+1} = A(theta_{j+1}(t)) y_j + c E (y_{j-1} - 2 y_j + y_{j+1})
= (L(t + tau) y)_j, since ((Q^{-1} y)_k = y_{k-1}) and theta_{j+1}(t) = theta_j(t + tau). Hence
Z(t) := Q^{-1} Y(t + tau) satisfies Z' = Q^{-1} L(t + tau) Y(t + tau) = L(t) Z, so Z(t) = Y(t) Z(0) = Y(t) M_tau, i.e.
Y(t + tau) = Q Y(t) M_tau. Induction: Y((k+1) tau) = Q Y(k tau) M_tau = Q^{k+1} M_tau^{k+1}. With k = N and Q^N = I,
Y(T) = M_tau^N. QED

### Theorem 1 (Hill-sector lemma)

For every mu in C,

      m(mu; H_0) = m(e^{mu tau}; M_tau).

Proof. Let lambda = e^{mu tau}.

(a) m(mu; H_0) <= m(lambda; M_tau). Let G := G_mu(H_0), viewed through the Fourier correspondence as a space of C^1
functions on which L acts; G is finite dimensional (Lemma 1.0) and L-invariant, and L_G := L|_G = mu + K_G with K_G
nilpotent. For p in G put u(t) := e^{t L_G} p in G and y_j(t) := u(t)(theta_j(t)). Writing u(t) in a basis of G
(C^1 functions) with smooth coefficients, the chain rule gives
y_j'(t) = (L_G u(t))(theta_j) + omega u(t)'(theta_j) = (A u(t) + c E Delta_N u(t))(theta_j)
= A(theta_j) y_j + c E (y_{j-1} - 2 y_j + y_{j+1}), so y solves the linearization with y(0) = iota*(p), where
iota*(p) := (p(2 pi j / N))_{j in Z_N}. Since theta_j(t + tau) = theta_{j+1}(t), y(tau) = Q iota*(e^{tau L_G} p); also
y(tau) = Y(tau) iota*(p). Hence

      M_tau iota* = iota* e^{tau L_G}   on G.

iota* is injective on G: if iota*(p) = 0 then y = 0, so for all t, j, n: 0 = u(t + n T)(theta_j(t)) (theta_j(t + nT) =
theta_j(t) + 2 pi n) = e^{mu (t + nT)} sum_k ((t + n T)^k / k!) (K_G^k p)(theta_j(t)). For fixed t and j this is
e^{mu(t + nT)} times a polynomial in n that vanishes at every integer n, so all its coefficients vanish. If p != 0, let
k* be the largest k with K_G^k p != 0; the coefficient of n^{k*} is (T^{k*} / k*!) (K_G^{k*} p)(theta_j(t)), so
K_G^{k*} p vanishes at every point theta_j(t), i.e. everywhere, a contradiction. So iota*(G) is an M_tau-invariant
subspace of dimension dim G on which M_tau is similar to e^{tau L_G} = lambda e^{tau K_G}, whose only eigenvalue is
lambda. Hence iota*(G) is contained in G_lambda(M_tau) and dim G <= m(lambda; M_tau).

(b) m(mu; H_0) >= m(lambda; M_tau). Let W := G_lambda(M_tau), r := dim W, and assume r >= 1. On W, M_tau = lambda (I + K)
with K nilpotent. Put B := mu I + (1/tau) sum_{k=1}^{r} (-1)^{k+1} K^k / k on W (a finite sum). Then e^{tau B} =
e^{mu tau} exp(log(I + K)) = lambda (I + K) = M_tau on W (the identity exp(log(1 + x)) = 1 + x of formal power series
holds for nilpotent x), B commutes with M_tau|_W, and the only eigenvalue of B is mu. Define the linear maps
Pi(t) := Y(t) e^{-t B}: W -> C^{18N}. By Lemma 1.1, for w in W (W is invariant under B and M_tau),
Pi(t + tau) w = Q Y(t) M_tau e^{-tau B} e^{-t B} w = Q Y(t) e^{-t B} w = Q Pi(t) w. Componentwise
Pi_j(t + tau) w = Pi_{j+1}(t) w; hence Pi_j(t) w = Pi_0(t + j tau) w and Pi_0(t + T) w = Pi_N(t) w = Pi_0(t) w. So
p_w(theta) := Pi_0(theta / omega) w is 2 pi periodic and Pi_j(t) w = p_w(theta_j(t)). Y is C^infinity in t (L(t) is),
so p_w is C^infinity and its coefficient sequence lies in D. Differentiating Y(t) w = Pi(t) e^{t B} w and replacing w
by e^{-t B} w gives L(t) Pi(t) w = Pi'(t) w + Pi(t) B w. Component 0 at time t = theta / omega reads
A(theta) p_w(theta) + c E (Delta_N p_w)(theta) = omega p_w'(theta) + p_{Bw}(theta), i.e.

      L p_w = p_{B w}.

The map iota: w -> p_w is injective (p_w(2 pi j / N) = Pi_j(0) w = w_j). So iota(W) is an L-invariant subspace of
dimension r on which L is similar to B; (L - mu)^r vanishes on it, so iota(W) is contained in G_mu(H_0) and
m(mu; H_0) >= r. QED

### Corollary 1.2

(i) spec H_0 = {mu : e^{mu tau} in spec M_tau}. It is invariant, with multiplicities, under mu -> mu + i omega N and
under mu -> conj(mu) (M_tau is real).

(ii) For every real a, let S_a := {mu : a <= Im mu < a + omega N} (half-open, height 2 pi / tau). Then
mu -> e^{mu tau} is a bijection from spec H_0 intersected with S_a onto spec M_tau preserving algebraic multiplicities,
and the multiplicities of the eigenvalues of H_0 in S_a add up to exactly 18 N.

(iii) Floquet multipliers. For rho != 0,

      m(rho; Y(T)) = sum over mu in spec H_0 intersected with S_a, e^{mu T} = rho, of m(mu; H_0).

(iv) Sectors. Let H_q (q in Z) be H_0 with d_m replaced by d_{m+q}. Then H_q is similar to H_0 + i omega q, by the
index shift (S P)_k := P_{k-q}: (H_q P)_m = (H_0 S P)_{m+q} + i omega q (S P)_{m+q}. Consequently H_{q+N} = H_q, and the
"N sectors" picture (spec H_q intersected with a strip of height omega, q in Z_N) gives the same multiset of
multipliers e^{mu T} as one block H_0 on a strip of height omega N. The sectors carry no information beyond H_0: a
Floquet solution e^{nu t} e^{2 pi i q j / N} p(theta_j) equals e^{(nu - i omega q) t} ptilde(theta_j) with
ptilde(theta) = e^{i q theta} p(theta), a sector 0 solution.

Proof. (i) Theorem 1, both directions (for (b) any branch mu of log(lambda) / tau may be chosen, so every
mu with e^{mu tau} = lambda is an eigenvalue). Invariance: e^{(mu + i omega N) tau} = e^{mu tau} e^{2 pi i}.
(ii) mu -> e^{mu tau} is injective on S_a (its period is 2 pi i / tau = i omega N) and onto C \ {0}; M_tau is
invertible (Y(tau) is), so every eigenvalue lambda has exactly one logarithm in S_a; the multiplicities of M_tau add up
to 18 N. (iii) Y(T) = M_tau^N (Lemma 1.1). C^{18N} is the direct sum of the G_lambda(M_tau); each is invariant under
M_tau^N, and on G_lambda the only eigenvalue of M_tau^N is lambda^N, so G_rho(M_tau^N) is the sum of the G_lambda with
lambda^N = rho. With lambda = e^{mu tau}, lambda^N = e^{mu T}; apply (ii). (iv) Direct substitution with k = m + q,
d_{(k - q) + q} = d_k. QED

Remarks. The count is 18N per half-open strip of height omega N, e.g. -omega N / 2 <= Im mu < omega N / 2. The
prototype's test |Im mu| <= omega N / 2 + 1e-12 is the closed strip, which counts an eigenvalue on Im mu = +- omega N / 2
twice; such eigenvalues are not exceptional (section 6, pitfall 1). Different mu in S_a may give the same multiplier
e^{mu T} (they differ by i omega q, q not in N Z), and the multiplier's multiplicity is then the sum; the reduced map
does not merge them (e^{mu tau} is injective on S_a).

### Corollary 1.3 (reduced section map; agrees with the README's Rings argument)

Let Sigma be a C^1 hypersurface through x* with F(x*) not tangent to it (F(x*) = x'(0) != 0 because phi is
nonconstant), and let g(z) := Q^{-1} phi_{t_g(z)}(z) on a neighbourhood of x* in Sigma, with t_g a C^1 function,
t_g(x*) = tau and g(Sigma) in Sigma. (The README's g = Q^{-1} P, S0 = {V_0 = s}, is of this form when its crossing is the one at
time tau, which the README's section-time check establishes.) Then

      det(lambda I - M_tau) = (lambda - 1) det(lambda I - Dg(x*)),

so spec Dg(x*) = {e^{mu tau} : mu in spec H_0 intersected with S_a} with one copy of the eigenvalue 1 (from mu = 0)
removed, multiplicities included.

Proof. M_tau F(x*) = F(x*): Y(tau) F(x*) = F(x(tau)) = F(Q x*) = Q F(x*). Dg(x*) = Q^{-1} (Y(tau) + F(x(tau)) Dt_g) =
M_tau + F(x*) Dt_g(x*) on T Sigma, and it maps T Sigma into T Sigma, so Dg(x*) = Pi_Sigma M_tau restricted to T Sigma, where
Pi_Sigma is the projection onto T Sigma along F(x*). In the splitting C^{18N} = span F(x*) + T Sigma, M_tau is block upper
triangular with diagonal blocks 1 and Dg(x*). QED

Hence the README's reduced-map margin is 1 - e^{(max Re mu) tau} with tau = T / N, and the full-period multipliers are
the N-th powers.

## 2. The trivial multiplier

### Lemma 2

(a) P* := (i m a_m)_m (the coefficients of phi') lies in D, is nonzero, and H_0 P* = 0.

(b) m(1; Y(T)) = sum_{q=0}^{N-1} m(i omega q; H_0).

(c) Hence the multiplier 1 is algebraically simple iff m(0; H_0) = 1 and i omega q is not an eigenvalue of H_0 for
q = 1, ..., N - 1. By the symmetries of Corollary 1.2(i) it suffices to check q = 1, ..., floor(N / 2): conj(i omega q)
= -i omega q = i omega (N - q) - i omega N, so i omega q is an eigenvalue iff i omega (N - q) is.

Proof. (a) phi is analytic, so sum_m m^2 |a_m|_1 < inf and P* in D; phi is nonconstant, so P* != 0. Differentiating
(P) (legitimate: phi is analytic) gives omega phi'' = A phi' + c E Delta_N phi', i.e. L phi' = 0. (b) Corollary 1.2(iii)
with rho = 1 and a = -omega / 2: e^{mu T} = 1 iff mu in i omega Z, and i omega q lies in S_{-omega/2} iff
-1/2 <= q < N - 1/2, i.e. q = 0, ..., N - 1. (c) From (a), m(0; H_0) >= 1. QED

Meaning. i omega q in spec H_0 with q != 0 mod N means that M_tau has the eigenvalue e^{2 pi i q / N}, a neutral mode of
the reduced map (a spatial phase twist). It is invisible as a separate multiplier of Y(T), where it merges with 1.

Computable sufficient conditions. (S1) The certificate of Theorem 3 implies (c) (all of i omega Z lies in
{Re mu >= -delta}, and Theorem 3 leaves only i omega N Z there, simple). (S2) A lighter test of (c) alone:
(i) mu = i omega q is in the resolvent set of H_0 for q = 1, ..., floor(N / 2): the single-point version of the
small-gain inequality of section 3.3 (with Gamma replaced by the one point mu; no count is needed), and (ii) 0 is
algebraically simple: the mu = 0 part of Lemma 3.8 (injectivity of the bordered operator at mu = 0 only). (S2) is NOT a
required check and no program step is specified for it: injectivity of the bordered operator on D x C is an
infinite-dimensional statement that would need its own window/tail (Schur) argument, which this file does not write
out. The required route is (S1).

## 3. Exclusion and isolation by a Riesz-projection homotopy

Goal: for given delta > 0, certify

      (G)   spec H_0 intersected with {Re mu >= -delta} = i omega N Z, each eigenvalue algebraically simple.

By Corollary 1.2(i) it is enough to count in one rectangle. No eigenvalue is counted disc by disc: the only count is
the rank of a Riesz projection, carried along a homotopy whose resolvent is bounded on a contour.

### 3.1 Two abstract lemmas

Lemma 3.1 (projections close in norm have equal rank). If P, P' are bounded projections on a Banach space, ||P - P'||
< 1 and rank P is finite, then rank P' = rank P.
Proof. If x is in Ran P' and P x = 0, then ||x|| = ||(P' - P) x|| < ||x|| unless x = 0; so P maps Ran P' injectively
into Ran P and rank P' <= rank P, in particular finite. Exchange the roles. QED

Lemma 3.2 (homotopy count). Let Dhat be closed on a domain dense in X with compact resolvent, Ehat bounded, Omega a
bounded open rectangle with boundary Gamma contained in the resolvent set of Dhat, and suppose that for every
(s, mu) in [0, 1] x Gamma the bounded operator I - s Ehat R_D(mu) is invertible, R_D(mu) := (mu - Dhat)^{-1}
(sufficient: sup over mu in Gamma of ||Ehat R_D(mu)|| < 1). Let H(s) := Dhat + s Ehat and
n(H, Omega) := sum over eigenvalues mu in Omega of m(mu; H). Then Gamma lies in the resolvent set of every H(s), each
H(s) has compact resolvent, n(H(s), Omega) is finite, and n(H(1), Omega) = n(Dhat, Omega).
Proof. mu - H(s) = (I - s Ehat R_D(mu)) (mu - Dhat) is a bijection with inverse
R_s(mu) = R_D(mu) (I - s Ehat R_D(mu))^{-1}, compact. (s, mu) -> R_s(mu) is norm continuous on the compact set
[0, 1] x Gamma (R_D is continuous on its resolvent set and inversion is continuous), hence uniformly continuous. The
spectrum of H(s) is discrete (Lemma 1.0's argument: Kato 1976, Theorem III.6.29), so Omega, which is bounded and whose
boundary lies in the resolvent set, contains finitely many eigenvalues. The Riesz projection
P(s) := (1 / 2 pi i) contour integral over Gamma of R_s(mu) d mu (Gamma positively, i.e. counterclockwise, oriented;
here and in Lemma 3.3) is a projection whose range is the sum of the
generalized eigenspaces of the eigenvalues inside Gamma (Kato 1976, Sections III.6.4 and III.6.5; numbering to be
confirmed), so its rank is
n(H(s), Omega). P(s) is norm continuous in s, so by Lemma 3.1 its rank is locally constant, hence constant on [0, 1].
QED

### 3.2 The comparison operator

Cell coordinates. The program first fixes an invertible diagonal 18 x 18 matrix S = diag(s_1, ..., s_18) with s_l
powers of two, and works in the coordinates P_m = (I x S) Ptilde_m, i.e. the same S in every mode of every cell. This is
an exact similarity: H_0 becomes (I x S)^{-1} H_0 (I x S), whose coefficients are S^{-1} A_n S, whose diagonal -i omega m
is unchanged, and whose damping is unchanged because S is diagonal and so commutes with E = e_V e_V^T. Spectra,
algebraic multiplicities and the domain D are unchanged (S is a fixed matrix). From here to the end of section 3, A_n,
A0c, X_r, B_m, V, U_r and every norm |.|_1, ||.||_{1->1} mean the S-coordinates versions; in particular theta_c, t_w,
r_j, b_m, Fr and rho_T are all computed in the 1-norm of the S-coordinates, the same norm in which (SG) and (SC) are
stated, so the norms match. (S = I is allowed but, in the scaled variables of arbmodel, makes the tail unreachable:
see Lemma 3.4, route A, and pitfall 8.)

Data chosen by the program (floating point; their accuracy affects only whether the test passes, never soundness):

* a window W := {m : |m| <= K_e} (n_W := 18 (2 K_e + 1) coordinates) and the tail Tl := {m : |m| > K_e};
* V, an invertible complex n_W x n_W matrix with exactly representable entries (approximate eigenvectors of the
  window block), and Lambda = diag(lambda_1, ..., lambda_{n_W}), exactly representable (approximate eigenvalues);
* A0c, an exactly representable real 18 x 18 matrix (the midpoint of the enclosure of A_0);
* for each residue r in {0, ..., floor(N / 2)}: U_r invertible and Lambda_r = diag(lambda_{r,1}, ..., lambda_{r,18})
  exactly representable, approximately diagonalizing X_r := A0c - d_r E;
* weights zeta_1, ..., zeta_{n_W} > 0 for the window coordinates and zeta_T > 0 for every tail coordinate;
* the rectangle Omega := (-delta, R_0) x (a, b) (Re, Im), with Gamma := its boundary.

The similarity Scal := V on the window coordinates and the identity on the tail is bounded, boundedly invertible, and
maps D onto D (it changes finitely many coordinates). Define

      Dhat := Lambda (on the window coordinates, scalar) direct sum, over m in Tl, of B_m,
      B_m := -i omega m I + X_{m mod N} = -i omega m I + A0c - d_m E,
      Ehat := Scal^{-1} H_0 Scal - Dhat.

With H_0 written in blocks (window W, tail Tl) as [[H_WW, H_WT], [H_TW, H_TT]]:

      Ehat_WW = Fm := V^{-1} H_WW V - Lambda,      Ehat_WT = V^{-1} H_WT,
      Ehat_TW = H_TW V,                            Ehat_TT = H_TT - (direct sum of B_m),

and Ehat_TT acts on the tail by (Ehat_TT P)_m = sum_{n != 0, m - n in Tl} A_n P_{m-n} + (A_0 - A0c) P_m. Ehat is bounded
(Fm is finite; the other blocks are convolutions with summable kernels). The true omega and the true A_n enter Dhat and
Ehat; the program never needs them, only enclosures (section 4.1). Note that B_m contains the exact omega and d_m: they
are not moved into Ehat (an omega error times m is unbounded, section 6, pitfall 6).

The weighted norm is defined on the Scal-coordinates v = Scal^{-1} P (scalar window coordinates v_j, tail blocks
v_m in C^18): ||v||_zeta := sum_j zeta_j |v_j| + zeta_T sum_{m in Tl} |v_m|_1. All operator norms ||.||_zeta in sections
3.3 to 3.5 refer to operators acting on these coordinates (Dhat, Ehat, their blocks). Transported back to P it is
||P|| = sum_j zeta_j |(V^{-1} P_W)_j| + zeta_T sum_{m in Tl} |P_m|_1, the same norm; it is equivalent to the norm of X. For a bounded operator on a weighted l^1 space, the norm is the
supremum of the weighted column sums.

### 3.3 The certificate inequalities

Notation for the bounds (all upper bounds, computed in ball arithmetic as in section 5):

* dist_j := distance from lambda_j to Gamma (exact geometry of a rectangle; a lower bound suffices).
* Window columns: fm_j := (1 / zeta_j) sum_i zeta_i |Fm_ij| and
  r_j := zeta_T sum_{w in W} t_w |V_{(w,.), j}|_1, where V_{(w,.), j} is the 18-vector of rows (w, 1..18) of column j and
  t_w := sum over n with |w + n| > K_e of ||A_n||_{1->1}. (r_j bounds ||Ehat_TW e_j||_zeta.)
* Tail columns from window rows: for m in Tl, b_m := max_k (1 / zeta_T) sum_j zeta_j |(V^{-1} H_{W,m})_{j,k}|, where
  H_{W,m} is the n_W x 18 block with rows (w, l) and entries (A_{w-m})_{l,k}. With
  beta_{(w,l)} := sum_j zeta_j |(V^{-1})_{j,(w,l)}| one has b_m <= max_k (1 / zeta_T) sum_{(w,l)} beta_{(w,l)} |(A_{w-m})_{l,k}|.
* Tail-to-tail: theta_c := sigma_off + ||A_0 - A0c||_{1->1}, sigma_off := sum_{n != 0} ||A_n||_{1->1}.
* Tail resolvent (Lemma 3.4): rho_T >= sup of ||(mu - B_m)^{-1}||_{1->1} over mu in closure(Omega) and m in Tl
  (Lemma 3.4 delivers it on an explicit neighbourhood Nb_eta of closure(Omega), which is more than needed; on Nb_eta
  only invertibility with a uniformly bounded inverse is used).

Lemma 3.3 (the comparison operator). Assume (C1), (C2) and (C3) of Theorem 3. Then Dhat has compact resolvent, Gamma lies in
its resolvent set, n(Dhat, Omega) = #{j : lambda_j in Omega}, and for mu in Gamma,
||(mu - Dhat)^{-1}||_zeta <= max(max_j 1 / dist_j, rho_T).
Proof. Dhat is block diagonal; its window part is the diagonal matrix Lambda. For the tail part D_T, Lemma 3.4 gives
mu - B_m invertible with ||(mu - B_m)^{-1}||_{1->1} <= rho_T for all mu in the open neighbourhood Nb := Nb_eta of
closure(Omega) and all m in Tl, so mu - D_T is a bijection with bounded inverse (the direct sum of the block inverses;
the tail weight is the constant zeta_T, so the weighted block norm is the 1->1 norm of the S-coordinates) and Nb lies in
the resolvent set of D_T. For a fixed mu_0, ||(mu_0 - B_m)^{-1}|| -> 0 as |m| -> inf (Lemma 3.4(c)), so (mu_0 - D_T)^{-1} is a
norm limit of finite-rank operators, i.e. compact. The resolvent of D_T is holomorphic on Nb (Kato 1976, Section
III.6.1, numbering to be confirmed), so its contour integral over Gamma vanishes, and the Riesz projection of Dhat for Omega is
diag(1 if lambda_j in Omega else 0) on the window and 0 on the tail. Its rank is #{j : lambda_j in Omega}
(dist_j > 0 rules out lambda_j on Gamma). The bound is the norm of a block-diagonal operator. QED

Lemma 3.4 (tail blocks). Let r = m mod N (r and N - r give the same X_r = A0c - d_r E), h := max(|a|, |b|),
omega_lo <= omega, g_0 := omega_lo (K_e + 1) - h, and, for eta >= 0,

      Zset_eta := {z : -delta - eta <= Re z <= R_0 + eta, Im z >= g_0 - eta},
      Nb_eta   := {mu : -delta - eta < Re mu < R_0 + eta, |Im mu| < h + eta}   (open, contains closure(Omega) if eta > 0).

(a) Reduction. For mu in Nb_eta (resp. closure(Omega)) and m in Tl, mu - B_m = z - X_r with z := mu + i omega m, and
    either z or conj(z) lies in Zset_eta (resp. Zset_0): Re z = Re mu, and Im z = Im mu + omega m >= omega_lo (K_e + 1) - h
    - eta when m >= K_e + 1, Im z <= -(g_0 - eta) when m <= -(K_e + 1). Since X_r is real,
    (conj(z) - X_r)^{-1} = conj((z - X_r)^{-1}) has the same 1->1 norm. Hence: if, for some eta > 0 and every r,
    z - X_r is invertible on Zset_eta with ||(z - X_r)^{-1}||_{1->1} <= rho_T there, then for every mu in Nb_eta and
    every m in Tl, mu - B_m is invertible with ||(mu - B_m)^{-1}||_{1->1} <= rho_T.
(b) Two routes to the hypothesis of (a); the program states which one it used.
    Route A (primary): weighted approximate diagonalization. With U_r invertible (its columns may be scaled freely) and
    Lambda_r = diag(lambda_{r,l}) exactly representable, Fr := U_r^{-1} X_r U_r - Lambda_r (in balls, d_r a ball),
    kappa_r >= ||U_r||_{1->1} ||U_r^{-1}||_{1->1} (S-coordinates), and

        gamma_r := min over l of max( -delta - eta - Re lambda_{r,l},  g_0 - eta - |Im lambda_{r,l}| ),

    if gamma_r > ||Fr||_{1->1} for every r, the hypothesis holds with rho_T := max_r kappa_r / (gamma_r - ||Fr||_{1->1}).
    Route B (alternative): direct cover. Choose Z > max_r ||X_r||_{1->1} (upper bound) and cover the bounded part
    {z in Zset_eta : Im z <= Z} by finitely many closed boxes Bx (exact dyadic corners). For each box and each r, invert
    the ball matrix zB I - [X_r] in Arb, where zB is a complex ball containing Bx; Arb's inversion either fails or returns
    a ball matrix containing the inverse of every point matrix in the input ball (its general containment contract),
    and a returned finite ball shows that every z - X_r, z in Bx, is invertible. Let rho_Bx be an upper bound of the
    1->1 norm of the returned ball. For Im z >= Z, |z| >= Z > ||X_r|| and the Neumann series give
    ||(z - X_r)^{-1}||_{1->1} <= 1 / (Z - ||X_r||_{1->1}). The hypothesis holds with
    rho_T := max( max_{Bx, r} rho_Bx, max_r 1 / (Z - ||X_r||_{1->1}) ). (This is the construction of existence.py
    section 4 for A_m, with a Neumann far bound; it is tight but needs a 2-D cover of a region of size about
    (R_0 + delta) x (Z - g_0).)
(c) For fixed mu, ||(mu - B_m)^{-1}||_{1->1} <= 1 / (|mu + i omega m| - ||X_r||_{1->1}) -> 0 as |m| -> inf.
Proof. (a) is shown in its statement. Route A: z - X_r = U_r (z - Lambda_r - Fr) U_r^{-1}. For z in Zset_eta and each
l, |z - lambda_{r,l}| >= Re z - Re lambda_{r,l} >= -delta - eta - Re lambda_{r,l} and |z - lambda_{r,l}| >=
Im z - |Im lambda_{r,l}| >= g_0 - eta - |Im lambda_{r,l}|, so the diagonal matrix z - Lambda_r has inverse of norm
<= 1 / gamma_r (the 1->1 norm of a diagonal matrix is its largest modulus), and the Neumann series gives
||(z - Lambda_r - Fr)^{-1}|| <= 1 / (gamma_r - ||Fr||); multiply by ||U_r|| ||U_r^{-1}|| <= kappa_r. Route B: the
boxes cover the bounded part, the Neumann bound the rest (Im z >= Z implies |z| >= Z). (c) is the Neumann bound. QED

Remark (why route A needs S). In the scaled variables with S = I, kappa_r is about 850 to 900 (the "A_0 eigenvector
condition number 854" of the plan), and the referee measured (floating point) rho_T about 940 to 995 and
theta_T = theta_c rho_T about 190 at K_e = N/2 + 8, about 92 at K_e = N/2 + 16; theta_T < 1 would need K_e - N/2 of
about 1500. The true sup of the tail resolvent was 5.9 (offset 8) and 1.83 (offset 16). With an optimized power-of-two
S and column scaling of U_r the referee measured kappa about 7.0, sigma_off about 0.085, rho_T about 3.8 and theta_T
about 0.32 at K_e = N/2 + 16 (0.65 at N/2 + 8). These numbers are floating-point experiments, not bounds.

Lemma 3.5 (small gain on Gamma, two forms). Assume (C1), (C2) and (C3) of Theorem 3.
(SG) If fm_j + r_j / zeta_j < dist_j for every j, and sup_{m in Tl} (b_m + theta_c) rho_T < 1 (a supremum over
infinitely many column blocks; with the monotone far bound of Lemma 3.7 it is a maximum of finitely many numbers), then
sup over mu in Gamma of ||Ehat (mu - Dhat)^{-1}||_zeta < 1.
(SC) (Schur-complement form.) If theta_T := theta_c rho_T < 1, bhat := sup_{m in Tl} b_m is finite, and for every j

      fm_j + bhat rho_T r_j / ((1 - theta_T) zeta_j) < dist_j,

then I - s Ehat (mu - Dhat)^{-1} is invertible for every (s, mu) in [0, 1] x Gamma.
In both cases the hypothesis of Lemma 3.2 holds. (SC) does not depend on zeta_T (b_m scales as 1 / zeta_T and r_j as
zeta_T), and it only asks for the product of the window-to-tail coupling bhat and the tail-to-window coupling r_j of
each column to be small, which is the structure of the problem (near-axis eigenvectors are small at the window edge);
(SG) asks for each separately.
Proof. (SG) For v in X, Ehat (mu - Dhat)^{-1} v = sum_j Ehat e_j v_j / (mu - lambda_j) + sum_{m in Tl} Ehat_{:,m}
(mu - B_m)^{-1} v_m. The weighted norm of column j of Ehat is at most zeta_j fm_j + r_j (window rows: Fm; tail rows:
||H_TW V e_j||_zeta <= zeta_T sum_{m in Tl} sum_w ||A_{m-w}||_{1->1} |V_{(w,.),j}|_1 = r_j). The weighted norm of the
column block m (18 columns, weight zeta_T each) applied to u in C^18 is at most zeta_T (b_m + theta_c) |u|_1 (window rows:
the definition of b_m; tail rows: sum_{m' in Tl, m' != m} ||A_{m'-m}|| + ||A_0 - A0c|| <= theta_c). Hence the norm is at
most max(max_j (fm_j + r_j / zeta_j) / dist_j, sup_m (b_m + theta_c) rho_T) < 1.
(SC) Fix (s, mu). Split coordinates into window (K) and tail (R). The tail block of mu - Dhat - s Ehat is
(I - s Ehat_TT (mu - D_T)^{-1}) (mu - D_T), invertible with ||(mu - D_T - s Ehat_TT)^{-1}||_zeta <= rho_T / (1 - theta_T)
(||Ehat_TT (mu - D_T)^{-1}|| <= theta_c rho_T). By the block (Schur) factorization, mu - Dhat - s Ehat is invertible iff
the Schur complement Sc := mu - Lambda - s Fm - s^2 Ehat_WT (mu - D_T - s Ehat_TT)^{-1} Ehat_TW is invertible
(the factorization is valid for an operator with a finite-dimensional block: both triangular factors are bijections of
the domain). Write Sc = (I - Cc (mu - Lambda)^{-1}) (mu - Lambda) with Cc := s Fm + s^2 Ehat_WT (...)^{-1} Ehat_TW. Column j
of Cc has weighted norm at most zeta_j fm_j + bhat (rho_T / (1 - theta_T)) r_j, because ||Ehat_TW e_j||_zeta <= r_j
and ||Ehat_WT||_zeta <= bhat: for a tail vector u, ||Ehat_WT u||_zeta <= sum_{m,k} |u_{m,k}| sum_j zeta_j
|(V^{-1} H_{W,m})_{j,k}| <= sum_{m,k} |u_{m,k}| zeta_T b_m <= bhat ||u||_zeta. So
||Cc (mu - Lambda)^{-1}||_zeta <= max_j (fm_j + bhat rho_T r_j / ((1 - theta_T) zeta_j)) / dist_j < 1. Then
mu - H(s) = mu - Dhat - s Ehat is invertible, which is equivalent to the invertibility of I - s Ehat (mu - Dhat)^{-1}
because mu - Dhat is. QED

Lemma 3.6 (the right half plane). If R_0 > alpha (Lemma 1.0), then {Re mu >= R_0} lies in the resolvent set of H_0.
Proof. Lemma 1.0. QED

Lemma 3.7 (bounds for the coupling sums from coefficient bounds). Suppose ball enclosures [A_n] of A_n are known for
|n| <= n_A and the tail form ||A_n||_{1->1} <= s_1 q_1^{|n|} + s_2 q_2^{|n|} holds for EVERY n (q_1, q_2 < 1; section
4.1 supplies it for every n, since the strip bound on J_n and Lemma 4.1 hold for all n; the enclosures are used where
they are sharper, the tail form where n is outside their range). If a program has the tail form only for |n| > n_A,
it must take n_c >= n_A, which makes every index used in the last bullet satisfy |n| >= n_c + 1 > n_A. Then, with Gtail(k) := sum over |n| >= k of (s_1 q_1^{|n|} + s_2 q_2^{|n|}) = 2 sum_i s_i q_i^k / (1 - q_i)
for k >= 1:
* sigma_off <= sum_{0 < |n| <= n_A} ||[A_n]||_{1->1} + Gtail(n_A + 1);
* t_w <= sum over |n| <= n_A with |w + n| > K_e of ||[A_n]|| + Gtail(n_A + 1);
* b_m for K_e < |m| <= K_e + n_c: from the entrywise |[A_{w-m}]| (or the entrywise version of the tail bound when
  |w - m| > n_A);
* b_m for |m| > K_e + n_c: b_m <= (beta_max / zeta_T) sum_{w in W} ||A_{w-m}||_{1->1}
  <= (beta_max / zeta_T) Gtail(|m| - K_e) / 2 (the indices n = w - m have one sign and |n| >= |m| - K_e), which decreases in
  |m|, so its value at |m| = K_e + n_c + 1 bounds all larger |m|; beta_max := max beta_{(w,l)}.
Proof. Sums of upper bounds; the geometric sums are exact. The bound sum_l |M_{l,k}| <= ||M||_{1->1} gives
sum_{(w,l)} beta_{(w,l)} |(A_{w-m})_{l,k}| <= beta_max sum_w ||A_{w-m}||_{1->1}. QED

Lemma 3.8 (bordered test, optional cross-check of isolation). Let H have compact resolvent, H v = 0, v != 0, and let
l be a bounded functional. If the bordered operator Bmu(x, s) := ((H - mu) x + s v, l(x)) on D x C is injective for
every mu in a closed disc Dd around 0, then 0 is the only eigenvalue of H in Dd and it is algebraically simple.
Proof. mu = 0: if l(v) = 0 then B0(v, 0) = 0, so l(v) != 0. If H x = 0, x' := x - (l(x) / l(v)) v gives B0(x', 0) = 0, so
x' = 0 and ker H = span v. If H x = v (a Jordan chain), then B0(x - (l(x) / l(v)) v, -1) = 0, impossible; so
ker H^2 = ker H and m(0; H) = 1. mu != 0 in Dd: if (H - mu) x = 0 with x != 0, then x and v are independent
(different eigenvalues); with alpha := l(x) / l(v), Bmu(x - alpha v, -alpha mu) = (alpha mu v - alpha mu v, 0) = 0
and x - alpha v != 0, a contradiction. QED
(This avoids counting near 0 but needs a cover of the rest of {Re mu >= -delta} by point exclusions; Theorem 3 needs
neither. Lemma 3.8 is listed as an independent cross-check of the isolation of 0 and for test (S2) of section 2.)

### Theorem 3 (the certificate)

Let the following be checked in ball arithmetic (every quantity an upper bound where it is compared from above, a lower
bound where compared from below):

(C0) Inputs: omega in [omega_lo, omega_hi] with omega_lo > 0; enclosures [A_n] of the true A_n for |n| <= n_A and the
     tail form of Lemma 3.7 (section 4.1); [d_m] containing d_m.
(C1) Geometry: delta > 0; R_0 > alpha^up, alpha^up := sum_{|n| <= n_A} ||[A_n]||_{1->1} + Gtail(n_A + 1) + 4c;
     a < 0 < b with b - a >= omega_hi N, b < omega_lo N and -a < omega_lo N.
(C2) Tail: a fixed exact S (section 3.2) and some eta > 0 for which the hypothesis of Lemma 3.4(a) is established by
     route A (gamma_r > ||Fr||_{1->1} for r = 0, ..., floor(N / 2)) or route B, giving rho_T; all in S-coordinates.
(C3) Window: V invertible, with an enclosure of V^{-1}; Fm enclosed from the ball matrix [H_WW] (which contains the true
     H_WW: blocks [A_{w-w'}] plus diag(-i [omega] w - [d_w] E)); dist_j > 0 for every j.
(C4) Small gain: either (SG) or (SC) of Lemma 3.5.
(C5) Count: exactly one lambda_j lies in Omega.

Then (G) holds: every eigenvalue of H_0 with Re mu >= -delta lies in i omega N Z and is algebraically simple. Equivalently
every mu in spec H_0 \ i omega N Z has Re mu < -delta.

Proof. By Lemmas 3.3 and 3.5, Lemma 3.2 applies to Dhat and Ehat, so n(Scal^{-1} H_0 Scal, Omega) = n(Dhat, Omega) = 1
by (C5), and Gamma lies in the resolvent set of H_0. A similarity by Scal (bounded, boundedly invertible, mapping D onto
D) preserves eigenvalues and generalized eigenspaces, so n(H_0, Omega) = 1. 0 lies in Omega (by (C1), -delta < 0 < R_0
and a < 0 < b) and is an eigenvalue (Lemma 2(a)); so it is the only eigenvalue in Omega and m(0; H_0) = 1. Now let mu be
an eigenvalue with Re mu >= -delta. By Lemma 3.6, Re mu < R_0. Since b - a >= omega_hi N >= omega N, some
mu' := mu + i omega N k has a <= Im mu' < a + omega N <= b, and mu' is an eigenvalue with the same multiplicity
(Corollary 1.2(i)). mu' is not on Gamma (Gamma is in the resolvent set), so -delta < Re mu' < R_0 and a < Im mu' < b,
i.e. mu' in Omega, hence mu' = 0 and mu in i omega N Z, with m(mu; H_0) = m(0; H_0) = 1. QED

Remark (which conditions are for soundness). The proof uses b - a >= omega N (from b - a >= omega_hi N) and (C5).
The conditions b < omega_lo N and -a < omega_lo N are not needed for soundness: if Omega contained +- i omega N the count
would be at least 2 and (C5) could not pass. They are listed so that a correct spectrum can pass.

Remark (the quantities named in the plan). The resolvent of the truncation is not bounded separately: on Gamma, in the
coordinates of V, (mu - H_WW)^{-1} = V (mu - Lambda - Fm)^{-1} V^{-1}, and the window column conditions of (SG)/(SC) are a
weighted bound of (mu - Lambda)^{-1} times the perturbation, evaluated on the whole contour at once through
dist_j = min over Gamma of |mu - lambda_j|. The left edge Re mu = -delta and the two horizontal edges Im mu = a, b
enter only through dist_j and through h in Lemma 3.4. Periodicity in Im mu is used in the last step of the proof
instead of a cylinder contour: the rectangle covers one full period (b - a >= omega N) and excludes +- i omega N.

## 4. Conclusion theorem with Stage E

### 4.1 How the Stage E ball enters

Stage E (`fourier/existence.py`, status "awaiting adversarial review") proves, for a centre (omega_bar, abar) and a radius
r, a unique zero (omega, a) of its map with |omega - omega_bar| <= eta_om r and ||a_k - abar_k||_nu <= eta_k r for each
component k, nu = e^{rho0}. Let phibar := sum_m abar_m e^{i m theta} and J(theta) := Df(phibar(theta)) = sum_n J_n
e^{i n theta}. Stage E already encloses J_n for |n| <= K' (aliased DFT, fourier_eval Lemma 3) and gives an entrywise
strip bound |J_{n,jk}| <= S_{J,jk} e^{-rho |n|}, and, for its Z2, a bound M_k >= sup |f_k(phibar(theta) + w)| over
|Im theta| <= rho2 and the polydisc |w_j| <= R_j.

Which radius. The Stage E record (e.g. results/fourier-existence-N8.json) carries two radii: r_existence, the radius of
the ball, about the centre, in which the record places the zero, and r_uniqueness, the radius of the ball in
which the zero is unique. Both balls contain the zero, so Lemma 4.1 is valid with either, but eps is linear in t, and at
N = 8 the referee estimated ||eps||_{1->1} about 4e-5 with r_uniqueness = 1e-12, far above the near-axis margins
(dist_j about 1.3e-6), against about 1e-21 with r_existence = 5.4e-28. The program must therefore read
r := r_existence and the weights eta (eta_om, eta_k) from the Stage E record, not recompute or retype them, and must
assert t_j := eta_j r < R_j for every j (a check that fails the run), since Lemma 4.1 is void otherwise.

Lemma 4.1 (perturbation of the coefficients). Let r := r_existence, rho_e := min(rho0, rho2) > 0,
t_j := eta_j r, assume t_j < R_j for every j (asserted by the program), and let

      eps_{kl} := (M_k / R_l) [ (1 - t_l / R_l)^{-1} prod_j (1 - t_j / R_j)^{-1} - 1 ].

Then for |Im theta| <= rho_e: |A_{kl}(theta) - J_{kl}(theta)| <= eps_{kl}, and for every n,
|(A_n - J_n)_{kl}| <= eps_{kl} e^{-rho_e |n|}.
Proof. For |Im theta| <= rho0, |phi_j(theta) - phibar_j(theta)| <= sum_m |a_{j,m} - abar_{j,m}| e^{rho0 |m|} <= t_j, so
w := phi(theta) - phibar(theta) lies in the polydisc of radii t. On the polydisc of radii R, f_k(phibar(theta) + w) =
sum_alpha c_alpha w^alpha with |c_alpha| <= M_k R^{-alpha} (Cauchy's inequality, as in existence.py section 6(i)).
Then d_l f_k(phibar + w) - d_l f_k(phibar) = sum over alpha with alpha_l >= 1, |alpha| >= 2 of alpha_l c_alpha
w^{alpha - e_l}, whose modulus is at most the same sum for the majorant Phi(t) := M_k prod_j (1 - t_j / R_j)^{-1}, namely
d_l Phi(t) - d_l Phi(0) = eps_{kl}. A - J is holomorphic near the strip |Im theta| <= rho_e and 2 pi periodic (both are,
by Stage E's strip covers). fourier_eval Lemma 2 needs holomorphy on an open set containing the closed strip, which
holds for every strip |Im theta| <= rho'' with rho'' < rho_e (phi is holomorphic on the open strip |Im theta| < rho0);
it gives |(A_n - J_n)_{kl}| <= eps_{kl} e^{-rho'' |n|} for every rho'' < rho_e, hence for rho_e. QED

Lemma 4.1 is stated in the scaled variables of Stage E. In the cell coordinates S of section 3.2 every bound
transforms exactly: (S^{-1} M S)_{kl} = M_{kl} s_l / s_k, so [J_n], S_J and eps are replaced entrywise by their entries
times s_l / s_k (exact for powers of two). The bounds below are then taken in S-coordinates.
Consequently the program may use [A_n] := [J_n] + ball(0, eps e^{-rho_e |n|}) for |n| <= n_A (entrywise), and
||A_n||_{1->1} <= ||S_J||_{1->1} e^{-rho |n|} + ||eps||_{1->1} e^{-rho_e |n|} for EVERY n (both bounds hold for all n): the
form of Lemma 3.7 with
(s_1, q_1) = (||S_J||, e^{-rho}) and (s_2, q_2) = (||eps||, e^{-rho_e}). An alternative that avoids M_k: evaluate Df on
the sample balls phibar(theta_k) + polydisc(t) and on the strip cover thickened by the polydisc; the DFT of these
enclosures, with the aliasing bound computed from the thickened strip sup, contains the true A_n directly. Either way
the true A is never needed, only enclosures that contain it. omega enters H_WW as the ball [omega_lo, omega_hi] and the
tail only through omega_lo in Lemma 3.4 and through (C1).

The window needs [A_n] for |n| <= 2 K_e and b_m needs |n| <= 2 K_e + n_c; with n_A smaller, the tail form is used for
the missing n (entrywise S_J e^{-rho |n|} + eps e^{-rho_e |n|}), which is sound but loose.

### Theorem 4 (stability of the rotating wave)

Assume Stage E (existence of the zero (omega, phi) in the stated ball, with phi real, nonconstant, and the strip covers
that make A analytic on |Im theta| <= min(rho, rho_e)) and the certificate of Theorem 3 for some delta > 0, with the
inputs of (C0) built as in 4.1. Then, for the ring of N cells:

(i) the monodromy Y(T) has the eigenvalue 1 algebraically simple, and the other 18N - 1 Floquet multipliers rho satisfy
    |rho| < e^{-delta T} <= e^{-delta T_lo}, T_lo := 2 pi / omega_hi;
(ii) M_tau = Dh(x*) has the eigenvalue 1 algebraically simple and all others of modulus < e^{-delta tau}; for every
    section map g as in Corollary 1.3 (in particular the README's, when its crossing is the one at tau), the spectral
    radius of Dg(x*) is < e^{-delta tau};
(iii) the orbit O := {x(t)} is locally exponentially orbitally stable with asymptotic phase: for every delta' < delta
    there are eps_0 > 0 and C such that every initial state x_0 with dist(x_0, O) < eps_0 satisfies, for some sigma in R
    and all t >= 0, |phi_t(x_0) - x(t + sigma)| <= C e^{-delta' t} dist(x_0, O).

Proof. (i) Corollary 1.2(iii) with a = -omega / 2: the multipliers are e^{mu T}, mu in spec H_0 intersected with S_a,
with multiplicities. By Theorem 3, mu = 0 is simple and the only element of i omega Z in S_a that is an eigenvalue
(Lemma 2(b),(c)); every other mu has Re mu < -delta, so |e^{mu T}| = e^{Re mu T} < e^{-delta T}. (ii) Corollary 1.2(ii)
and Corollary 1.3, with the same split. (iii) This is the classical Andronov-Witt statement; we prove it from the
Poincare map so that no textbook hypothesis needs matching. F is analytic near O (Stage E certifies that the orbit
lies in the domain of the model). Let Sigma := {z : <F(x*), z - x*> = 0}. By the implicit function theorem (the
derivative of t -> <F(x*), phi_t(z) - x*> at (T, x*) is |F(x*)|^2 > 0) there are a neighbourhood U of x* and a C^1
function t_S on U with t_S(x*) = T and phi_{t_S(z)}(z) in Sigma; the Poincare map Pm(z) := phi_{t_S(z)}(z) is C^1 on
Sigma intersected with U, Pm(x*) = x*, and, exactly as in Corollary 1.3 with Q replaced by I and tau by T,
DPm(x*) = Pi_Sigma Y(T) restricted to T Sigma, whose spectrum is spec Y(T) with one copy of 1 removed. By (i) its
spectral radius is < e^{-delta T}. Put kappa := e^{-delta' T} and choose kappa' with
(spectral radius of DPm(x*)) < kappa' < kappa. A norm with ||DPm(x*)||_* <= kappa' exists: with a Jordan form
J = S^{-1} DPm(x*) S and S_eta := diag(1, eta, eta^2, ...), S_eta^{-1} J S_eta has the same diagonal and off-diagonal
entries eta or 0, so |v|_* := |S_eta^{-1} S^{-1} v|_inf (induced norm = largest row sum) works for
0 < eta <= kappa' - (spectral radius). By
continuity of DPm, ||DPm(z)||_* <= kappa on a convex neighbourhood Nc of x* in Sigma (a ball of |.|_* in the affine
hyperplane Sigma), so Pm maps Nc into itself, is a kappa-contraction there (mean value inequality) and
|Pm^k(z) - x*|_* <= kappa^k |z - x*|_*. Below, eps_0 is taken so small that z_1 lies in Nc, and norms on C^{18N} are
compared with |.|_* by fixed constants absorbed into the C_i.
A solution starting at x_0 with |x_0 - x(s)| small (some s in [0, T)) satisfies |z_0 - x*| <= e^{Lip T} |x_0 - x(s)|
for z_0 := phi_{T - s}(x_0) (Gronwall; x(T) = x*), and t_S is defined on the full neighbourhood U of x*; so the solution
meets Sigma at the time t_1 := T - s + t_S(z_0) <= 3T at the point z_1 := phi_{t_S(z_0)}(z_0), with
|z_1 - x*| <= C_1 dist(x_0, O) (t_S and the flow are C^1). Let z_k := Pm^{k-1}(z_1) and t_{k+1} := t_k + t_S(z_k). Since t_S is C^1 and
t_S(x*) = T, |t_S(z_k) - T| <= C_2 kappa^k |z_1 - x*|, so sigma_inf := lim (t_k - k T) exists and
|t_k - k T - sigma_inf| <= C_3 kappa^k |z_1 - x*|. Put sigma := -sigma_inf. For t in [t_k, t_{k+1}],
phi_t(x_0) = phi_{t - t_k}(z_k) and x(t + sigma) = phi_{t - t_k}(x(t_k + sigma)), with
x(t_k + sigma) = x(t_k - k T - sigma_inf) (T-periodicity) within sup|F| C_3 kappa^k |z_1 - x*| of x(0) = x*, and
|z_k - x*| <= C_4 kappa^k |z_1 - x*|. Gronwall over the interval [t_k, t_{k+1}], of length t_S(z_k) <= 2T, gives
|phi_t(x_0) - x(t + sigma)| <= C_5 kappa^k |z_1 - x*|, and t <= t_{k+1} <= (k + 1) T + C_6 gives
kappa^k <= C_7 e^{-delta' t}. Finally t in [0, t_1] (t_1 <= 3T). Gronwall gives |phi_t(x_0) - x(t + s)| <=
e^{Lip t} |x_0 - x(s)| (x(t + s) = phi_t(x(s))). The phase: t_1 - T = -s + t_S(z_0) with |t_S(z_0) - T| <= C |z_0 - x*|,
and |sigma_inf - (t_1 - T)| <= sum_{k >= 1} |t_S(z_k) - T| <= C' |z_1 - x*|; hence sigma = -sigma_inf = s - T + O(dist(x_0, O)),
and by T-periodicity |x(t + sigma) - x(t + s)| <= sup|F| C'' dist(x_0, O). So on [0, t_1] the difference is at most
C_8 dist(x_0, O) <= C_8 e^{3 delta' T} e^{-delta' t} dist(x_0, O). QED

Scope of the conclusion. (i) and (ii) are spectral facts about the 18N-dimensional ODE at the single parameter set and
the single N of the run. (iii) is local; eps_0 and C are not computed. Nothing is claimed for the continuum cable or
uniformly in N. If Stage E's T is not the minimal period of the ring solution, (i) to (iii) still hold with respect
to T (the certificate also excludes i omega q, so no extra neutral multiplier is hidden).

## 5. What the program must compute (checklist)

Inputs from Stage E (read from its record, never recomputed or retyped): omega_lo, omega_hi; r = r_existence (not
r_uniqueness, section 4.1), eta, nu = e^{rho0}; the enclosures [J_n]
(|n| <= K') and S_J on |Im theta| <= rho; M_k and R (polydisc, strip rho2); the claim that the strip covers succeeded.

1. Exact constants: N, c = N^2 / 64000 as an exact rational, [d_r] for r = 0..floor(N/2) (arbmodel.damping), E.
2. Coefficients: assert t_j = eta_j r_existence < R_j for every j (fail otherwise); eps (Lemma 4.1) in Arb;
   choose the cell coordinates S (exact powers of two, section 3.2) and transform [J_n], S_J, eps exactly;
   [A_n] = [J_n] + ball(0, eps e^{-rho_e |n|}) for |n| <= n_A; the tail form (s_1, q_1, s_2, q_2), valid for every n;
   Gtail. Or the thickened-DFT alternative of 4.1. The window needs |n| <= 2 K_e and b_m needs |n| <= 2 K_e + n_c; where
   these exceed Stage E's K' (e.g. K' = 80 against 2 K_e = 96 at N = 64, K_e = 48) the tail form is used (sound).
3. alpha^up and R_0 > alpha^up (C1).
4. Geometry: delta (plan: 5e-6 per ms), a, b with b - a >= omega_hi N, b < omega_lo N, -a < omega_lo N. Recommended
   start for every N >= 1: b = -a = omega_bar (N/2 + 1/4) (an exact dyadic near it), which satisfies (C1) when the
   omega ball is tiny and puts both edges a quarter of omega away from the rows Im mu ~ omega k where the near-axis
   eigenvalues sit (pitfall 1). Then move a, b, if needed, to maximize min_j dist_j, rechecking (C1).
5. Tail, per r in 0..floor(N/2), all in S-coordinates: X_r = A0c - [d_r] E; choose eta > 0. Route A: U_r, Lambda_r
   (LAPACK on the midpoint), columns of U_r scaled (with S) to minimize kappa_r; an Arb enclosure of U_r^{-1};
   Fr = U_r^{-1} X_r U_r - Lambda_r; kappa_r; gamma_r with g_0 = omega_lo (K_e + 1) - h, h = max(|a|, |b|); check
   gamma_r > ||Fr||; rho_T. Route B: the box cover of Lemma 3.4 and the Neumann far bound. Either way record which
   route and the resulting rho_T and theta_T. With S = I, route A gives kappa_r about 850 to 900 and cannot close
   (theta_T about 90 to 190); this is expected, not a bug in the model.
6. Window: [H_WW] of size 18 (2 K_e + 1) (with -i [omega] w on the diagonal and [d_w] on the V entry); V, Lambda from
   LAPACK on the floating-point midpoint in S-coordinates (double, or higher precision for the near-axis eigenvalues);
   then V^{-1} and Fm are bounded at 128 bits at least for the rows and columns of eigenvalues with Re lambda_j > -1e-3
   (plan step 3: 53-bit balls lose 1e-7 to 1e-6 there; fourier/stability.py uses 128 bits everywhere), either by an
   Arb enclosure of V^{-1} and Fm = V^{-1} [H_WW] V - Lambda, or (the route stability.py uses) without inverting V in
   Arb: with Vi an exact floating-point approximate inverse, C := I - Vi V (Arb) and q_C := ||C||_zeta < 1 checked,
   Vi V = I - C is invertible, so V is invertible (C3) and V^{-1} = (I - C)^{-1} Vi (the factor on the left), with
   ||(I - C)^{-1}||_zeta <= 1 / (1 - q_C). Since Vi V Lambda = Lambda - C Lambda, the exact identity
   Vi (H_WW V - V Lambda) = Vi H_WW V - Lambda + C Lambda holds, so Fm = (I - C)^{-1} (Wm + C Lambda) with
   Wm := Vi [H_WW] V - Lambda (an Arb ball containing the value for the true H_WW), and
   fm_j <= (||Wm e_j||_zeta + |lambda_j| ||C e_j||_zeta) / ((1 - q_C) zeta_j),
   beta_{(w,l)} <= ||Vi e_{(w,l)}||_zeta / (1 - q_C) (item 8).
   (In Lemma 3.4, route A, U_r may be any invertible matrix and Lambda_r any diagonal one: stability.py groups nearly
   coincident eigenvalues of X_r into an orthonormal basis of their span and puts the intra-cluster coupling into Fr.)
7. Distances: dist_j = distance from lambda_j to the rectangle boundary (lower bound in Arb); check dist_j > 0; count
   #{lambda_j in Omega} with exact comparisons of the floats lambda_j against -delta, R_0, a, b: must be 1 (C5).
8. Couplings (S-coordinates): t_w (w in W); r_j; beta_{(w,l)}, beta_max; b_m for K_e < |m| <= K_e + n_c from entrywise
   [A_{w-m}]; the monotone far bound at |m| = K_e + n_c + 1 (valid because the tail form holds for every n; otherwise
   take n_c >= n_A); bhat; sigma_off; ||A_0 - A0c||; theta_c; theta_T. In (SG) the tail test is the max over the finite
   list plus the far bound (a supremum, M1 of the review).
9. Decide (SG) or (SC) (Lemma 3.5). Record the worst ratio for each window column and for the tail.
10. Record everything: delta, the certified bounds e^{-delta T_lo} on the nontrivial multipliers and e^{-delta tau_lo}
    (tau_lo = T_lo / N) for the reduced map, both rounded outward (upward) from Arb; all constants above (S, eta, the
    route of Lemma 3.4), precisions, the hashes of inputs and program. -delta, R_0, a and b are exact dyadics, so the
    count (C5) is an exact comparison. The Stage S record inherits Stage E's status: it must not say "verified" before
    the Stage E record does, and not before the second reading of this file.
11. Negative controls (must fail): delta = 7e-6 at N = 8 (true leading exponent about -6.32e-6); delta = 1e-5 at N = 64
    (about -9.34e-6); anti-diffusion c -> -c; K_e too small (tail Im-gap closes or b_m too large); a dropped coefficient
    A_1; omega_lo replaced by a value making b >= omega_lo N (the count must then become 2 or the check (C1) fail).
12. Cross-checks (not part of the proof): at N = 8 the e^{mu tau} of the near-axis lambda_j against the eigenvalues of an
    ordinary 144-dimensional monodromy; the leading exponents against -6.32e-6 (N=8), -8.57e-6 (16), -9.19e-6 (32),
    -9.34e-6 (64); optionally Lemma 3.8 at 0 and test (S2).

## 6. Pitfalls

1. Strip boundaries carry eigenvalues generically. M_tau is real, so a real negative eigenvalue of M_tau is stable under
   perturbation, and its logarithms lie exactly on Im mu = omega N / 2 + omega N Z. (The scratch toy model shows two
   such eigenvalues, -3.29 +- 1.75i and -3.03 +- 1.75i with omega N / 2 = 1.75.) Likewise real positive eigenvalues lie
   on Im mu = 0. Count in a half-open strip; never put a contour edge on Im = +- omega N / 2 without checking dist_j.
   The prototype's closed strip |Im mu| <= omega N / 2 can double count.
2. Counting truncation eigenvalues is not counting H_0's. The truncation of the prototype had 1166 eigenvalues in the
   strip where 18N = 1152 are expected (N = 64), presumably spurious edge eigenvalues of the truncation plus the
   boundary effect of pitfall 1. Theorem 3 counts only inside Omega, and a spurious eigenvalue inside Omega makes (C5) fail; it can never
   make the certificate pass wrongly.
3. Multiplicity. A multiplier of Y(T) collects all mu in the strip that differ by multiples of i omega (Corollary
   1.2(iii)); the reduced map e^{mu tau} does not merge them. The trivial multiplier's simplicity needs both m(0) = 1
   and no eigenvalue at i omega q, q = 1..N-1 (Lemma 2). Algebraic, not geometric, multiplicities are what Riesz ranks
   count.
4. Branch of the logarithm. Never form mu = log(rho) / T from a multiplier and compare imaginary parts; compare moduli
   (|e^{mu tau}| = e^{Re mu tau}) or work with mu throughout. Margins: reduced map 1 - e^{Re mu tau}, full period
   1 - e^{Re mu T}; tau = T / N, not T.
5. Sign conventions. The diagonal -i omega m goes with P_m multiplying e^{+i m theta} and A_n the coefficient of
   e^{+i n theta}; flipping one without the other changes the operator (toy model: 4e-2 mismatch).
6. omega is only known in a ball, and -i (omega - omega_bar) m is unbounded: it cannot be moved into a bounded
   perturbation. Keep the exact omega in Dhat; use [omega] in the finite window and omega_lo in the tail gap.
7. Constant-coefficient comparisons fail in resonant bands. The V-clamped averaged Jacobian has the unstable pair
   1.870e-3 +- 0.1177i, practically resonant with omega = 0.11725. A_0 - d_m E can therefore have eigenvalues with
   positive real part and imaginary part about +- omega, so B_m has eigenvalues with Re > 0 at Im about -omega (m -+ 1).
   Constant-coefficient blocks are legitimate only where the imaginary gap separates them from Omega: Lemma 3.4 needs
   omega_lo (K_e + 1) - h - |Im lambda_{r,l}| > ||Fr|| for every eigenvalue with Re lambda_{r,l} >= -delta, so
   K_e >= N/2 + 2 at the very least, and in practice K_e - N/2 of about 8 or more. Never use A_0 eigencoordinates as
   the comparison inside the window (|m| <= N/2 + 1).
8. Conditioning. cond(V) is reported as 2e3 to 6e3 and the A_0 eigenvector condition number as 854. In the unweighted
   scaled 1-norm the latter is fatal for the tail: route A of Lemma 3.4 with S = I gives theta_T about 90 to 190 at any
   practical K_e. Use the cell coordinates S (referee: theta_T about 0.32 at K_e = N/2 + 16) or route B. Every tail
   quantity must be computed in the same S-coordinates as the window quantities; mixing norms is unsound. In (SG) the
   tail-column condition contains V^{-1} at the window edge, where the spurious truncation eigenvectors live; it may
   fail even though the problem is well posed. (SC) needs only the product bhat r_j, which is small for the near-axis
   columns; use (SC) first, enlarge K_e second, and choose zeta (small zeta_j for fast or spurious columns with large
   dist_j) third.
9. Thin margins. At N = 8 with delta = 5e-6, the leading pair sits at Re about -6.32e-6, so dist_j is about 1.3e-6; the
   column sums fm_j for those columns must be well below that. Use 128-bit balls on those rows (plan step 3); a
   53-bit product can lose 1e-7 to 1e-6.
10. Enclosures, not values. A_n must be enclosures of the true A_n (Stage E ball, aliasing, tails), not the centre's
    floating coefficients. A0c in B_m is an arbitrary exact matrix; its difference to A_0 goes into theta_c.
11. The rectangle must cover a full period (b - a >= omega_hi N) and exclude +- i omega N (b < omega_lo N,
    -a < omega_lo N); otherwise the count is not 1 even when the spectrum is fine, or (worse) a region is not covered.
12. Right edge. R_0 must exceed alpha^up, which in scaled variables may be large; this costs nothing (dist_j to the
    right edge is large) but must not be forgotten: Omega is bounded only because of Lemma 3.6.
13. The section of the README. Corollary 1.3 needs the reduced map's crossing to be the one at time tau. Theorem 4 does
    not need any particular section (it uses the orthogonal hyperplane), so the Fourier route needs no crossing check.

## 7. Sources and related work

* T. Kato, Perturbation Theory for Linear Operators, 2nd edition, Springer (Grundlehren der mathematischen
  Wissenschaften 132), 1976: Section III.6.1 (the resolvent is holomorphic on the resolvent set), Sections III.6.4 and
  III.6.5 (Riesz projections of separated parts of the spectrum and of isolated eigenvalues), Theorem III.6.29 (closed
  operators with compact resolvent). These are the only external results used; everything else is proved above. The
  section and theorem numbers are from memory and are TO BE CONFIRMED against a copy (the referee's recollection agrees
  but was not checked against a copy either); the facts are standard. Arb's containment contract for ball matrix
  inversion (Lemma 3.4, route B) is a property of the library, part of the trust base, not a mathematical citation.
* Floquet's theorem, Hill's method and the Andronov-Witt theorem are classical; the proofs above are self-contained
  and do not rely on a particular textbook statement.
* The plan (step 3, "Missing") requires a prior-article search before any wording about novelty, crediting Castelli and
  Lessard (Floquet theory via Fourier series in validated numerics), Figueras, Gameiro, Lessard and de la Llave
  (validation for non-polynomial nonlinearities), Johnson and Zumbrun (convergence of Hill's method) and Golubitsky and
  Stewart (symmetry and Z_N networks). The exact titles and theorem numbers are to be taken from that search; none is
  cited here, and none of the lemmas above depends on them.

## 8. Self-review

One adversarial rereading by the author. What was checked and what changed:

1. Sector claim (task statement: "18N in the strip |Im mu| <= omega N / 2", sectors H_q for q in Z_N). Checked: H_q is
   similar to H_0 + i omega q (Corollary 1.2(iv)), so sectors add nothing, and the correct count is 18N per HALF-OPEN
   strip of height omega N for the single block H_0. The closed strip was replaced by the half-open one after the
   scratch toy model (N = 5) showed four eigenvalues exactly on Im mu = +- omega N / 2 (pitfall 1). Both the count and
   the toy model's e^{mu tau} = eig(M_tau) agreement (3e-13) were rechecked with an offset strip.
2. The first draft of Theorem 1 proved only "eigenvalue iff eigenvalue" and planned a Jordan-chain argument for
   multiplicities. Replaced by the two dimension inequalities (a), (b), which together give equality without
   assuming anything about chains; (a) needed injectivity of iota*, which was first argued at t = 0 only (wrong: u(t)
   moves with t); fixed by the polynomial-in-n argument over t + nT.
3. Direction (b) first assumed analyticity of Y in complex t to put p_w in the domain. Not needed: X = l^1 with weight 1
   and the domain sum |m| |P_m| < inf only needs p_w in C^3, and p_w is C^infinity. The function space was chosen as
   l^1 (not l^1_nu) for this reason; the certificate uses an equivalent weighted l^1 norm, which does not change the
   spectrum.
4. Theorem 3, first draft: the region {Re mu >= -delta} was unbounded and the comparison count included the right
   half plane. Added Lemma 3.6 (Neumann bound for Re mu > alpha) and the right edge R_0 > alpha^up.
5. Theorem 3, first draft: the rectangle height was "omega N" with the true omega, unknown. Replaced by fixed a, b with
   b - a >= omega_hi N and |a|, b < omega_lo N; the last step of the proof was rewritten to translate an eigenvalue into
   [a, a + omega N) and then into Omega, treating the boundary cases through Gamma being in the resolvent set.
6. omega uncertainty: an early version put (omega - omega_bar) m into Ehat; that operator is unbounded. Moved the exact
   omega into Dhat (pitfall 6); Lemma 3.4 now uses omega_lo.
7. Lemma 3.5 (SG): the column-block bound for a tail column first omitted the tail-to-tail coupling on the same block
   (A_0 - A0c); added as part of theta_c. (SC) was added after estimating that the separate tail-column condition of
   (SG) multiplies cond(V)-sized entries of V^{-1} at the window edge by |A_1|; (SC) needs only their product with r_j
   and is independent of zeta_T. Checked that (SC) implies the hypothesis of Lemma 3.2 for every s, including the s^2
   factor and the s-dependence of the tail inverse (the bound rho_T / (1 - theta_T) is uniform in s).
8. Lemma 3.4: the lower bound |z - lambda| >= -delta - Re lambda uses Re z = Re mu >= -delta; it is applied only on
   closure(Omega), where this holds. The bound is applied to every m in Tl uniformly through omega |m| >= omega_lo (K_e + 1).
9. Lemma 2(c): the reduction to q <= floor(N/2) uses conjugation symmetry plus i omega N periodicity; rechecked that
   conj(i omega q) = -i omega q = i omega (N - q) - i omega N.
10. Theorem 4(iii): the first draft used the reduced map with Q; replaced by the full-period Poincare map on the
    orthogonal hyperplane, which needs no symmetry and no particular section. The asymptotic phase sign was fixed
    (x(t + sigma) with sigma = -lim (t_k - k T)).
11. Citations: only Kato's book is cited, by section and by Theorem III.6.29, which I am confident of. The Andronov-Witt
    theorem, Gelfand's formula and the Bauer-Fike theorem are not cited; the needed facts are proved inline. The four
    names in section 7 are reported from the plan and not cited as sources.
12. Second pass (after writing): Lemma 2(c) reworded (the conjugation argument was garbled); Theorem 4(iii): the
    Jordan-scaling norm now states the induced norm and the admissible eta, the contraction neighbourhood Nc and the
    smallness of eps_0 are explicit, and the first crossing is taken through the section-time function on the full
    neighbourhood U (the first draft applied the map Pm, defined only on Sigma, to a point off Sigma); Lemma 4.1: the
    Cauchy coefficient bound needs holomorphy on an open set containing the closed strip, which phi only has on
    |Im theta| < rho0, so the bound is taken for rho'' < rho_e and passed to the limit; Lemmas 3.3 and 3.5 now also
    assume (C3) (dist_j > 0 is used); in Corollary 1.3 the section-time function was renamed t_g (s is the README's
    section level); checklist item 4 now gives one starting rectangle valid for every N >= 1 (b = -a =
    omega_bar (N/2 + 1/4)), checked against (C1) for N = 1 (b = 0.75 omega_bar < omega_lo).
13. Empirical check only (not part of any proof): the toy model in the scratchpad confirms Theorem 1, the sign
    convention, the 18N-type count in an offset half-open strip, and Corollary 1.2(iv) (H_q against H_0 + i omega q to
    1e-13).

Places where I am not fully certain, for the second reader:

* Lemma 3.5 (SC), the weighted-norm bookkeeping: the proof now writes out ||Ehat_WT||_zeta <= bhat and
  ||Ehat_TW e_j||_zeta <= r_j in one weighted norm, and the zeta_T factors cancel; the code must use exactly these
  definitions (b_m with the factor 1 / zeta_T, r_j with the factor zeta_T), or simply set zeta_T = 1.
* The citations of Kato's book are by section and by Theorem III.6.29; the second reader should confirm the section
  numbers against a copy (the facts themselves are standard: holomorphy of the resolvent, Riesz projections of an
  isolated part of the spectrum, discreteness of the spectrum under a compact resolvent).
* Lemma 4.1 needs |Im theta| <= rho0 for the l^1_nu bound and |Im theta| <= rho2 for M_k; rho_e = min(rho0, rho2) is
  the strip used. t_j < R_j is now an asserted check (G2).
* Feasibility of route A with a weighted S rests on the referee's floating-point measurement (theta_T about 0.32); it
  is not yet a computed bound.
* Whether (SG) or (SC) closes at N = 64 with K_e - N/2 about 8 is a numerical question not answered here (pitfall 8).

## 9. Review response (independent referee, 2026-10-01)

The referee found no error that makes a stated theorem false. Each gap and minor item, and what changed:

* G1 (tail bound unreachable: kappa_r about 850 to 900 gives theta_T about 90 to 190). Section 3.2 now fixes exact
  power-of-two cell coordinates S (the same diagonal similarity in every mode; it commutes with E and changes no
  spectrum), and every quantity of section 3 is computed in the 1-norm of these coordinates, the norm of (SG) and (SC).
  Lemma 3.4 was rewritten: (a) a reduction, with an explicit neighbourhood Nb_eta of closure(Omega), to a resolvent
  bound for the 18 x 18 matrices X_r on the half-strip Zset_eta (conjugation symmetry handles m < 0); (b) route A
  (primary), the weighted approximate diagonalization with eta built into gamma_r, and route B (alternative), an Arb
  box cover of the bounded part plus the Neumann far bound 1 / (Z - ||X_r||), as in existence.py section 4; (c) the
  decay as |m| -> inf from the Neumann bound. The remark after Lemma 3.4, (C2), checklist item 5 and pitfall 8 record
  that route A with S = I cannot close, and the referee's floating-point measurements with S (kappa about 7.0,
  theta_T about 0.32 at K_e = N/2 + 16), labelled as experiments.
* G2 (which Stage E radius). Section 4.1 now explains r_existence against r_uniqueness and requires r := r_existence and
  eta read from the Stage E record; Lemma 4.1 states r = r_existence and assumes t_j < R_j, which checklist item 2
  makes an asserted check that fails the run. Lemma 4.1 also says how its bounds transform to the S-coordinates.
* G3 (Lemma 3.7 far bound). Lemma 3.7 now assumes the tail form for every n, which section 4.1 supplies (the strip bound
  on J_n and Lemma 4.1 hold for all n), and says that a program with the tail form only for |n| > n_A must take
  n_c >= n_A. Checklist item 8 repeats it.
* M1. (SG) now requires sup over m in Tl of (b_m + theta_c) rho_T < 1, and notes that with the monotone far bound it is a
  finite maximum.
* M2. rho_T is defined as the bound on closure(Omega); Lemma 3.4 delivers invertibility and the bound on the explicit
  open neighbourhood Nb_eta, which Lemma 3.3 uses only for invertibility and holomorphy.
* M3. The weighted norm is now defined on the Scal-coordinates, with its transport to P stated as the same norm.
* M4. The contour Gamma is positively (counterclockwise) oriented, stated in Lemma 3.2 and used in Lemma 3.3.
* M5. (S2)(ii) now cites the mu = 0 part of Lemma 3.8 only, and (S2) is marked as not required, with no program step,
  because bordered injectivity on D x C needs its own window/tail argument; the required route is (S1).
* M6. Theorem 4(iii) now treats [0, t_1] explicitly: Gronwall from x(s), and sigma = s - T + O(dist(x_0, O)) modulo T.
* M7. Section 0 now cites only the offset-strip toy result (3e-13, count 15) and says why the centred-strip count of 15
  is a coincidence (match only 1.6e-3).
* M8. The Kato section and theorem numbers are marked "to be confirmed against a copy" where they are cited and in
  section 7.

Also from the referee's list of program needs: the checklist now asks for outward rounding of the reported bounds
(with tau_lo = T_lo / N), exact dyadic -delta, R_0, a, b, the coefficient ranges against Stage E's K', and a Stage S
record that does not say "verified" before Stage E's does. A remark after Theorem 3 notes that b < omega_lo N and
-a < omega_lo N are needed to pass, not for soundness.
