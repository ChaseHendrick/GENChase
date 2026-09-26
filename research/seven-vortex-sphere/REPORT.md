# Seven vortices on the sphere: the pentagonal bipyramid is a strict local minimum

Status of this folder (2026-09-26): research work in progress, not
published. Everything below is labelled **proved** (a written argument plus a
rigorous computation in this folder establishes it), **numerical** (floating point, no error
control) or **estimate**.

## 1. Summary

| Statement | Status |
|---|---|
| The pentagonal bipyramid B is a strict local minimum, modulo rotations, of the logarithmic energy of 7 points on S^2, with an explicit neighbourhood (Theorem 1, Corollary 2) | **proved** (computer-assisted: exact arithmetic in Q(sin 2pi/5) plus Arb ball arithmetic) |
| The corresponding equilibrium of 7 identical point vortices on the sphere is Lyapunov stable modulo rotations ("SO(3)-stable") (Theorem 3) | **proved** from Theorem 1 by the standard Lyapunov argument |
| After eliminating the nondegenerate directions, the energy along the 2-dimensional degenerate plane grows like exactly (1/10)\|delta\|^4, where delta is the degenerate displacement in chart coordinates (Proposition 4) | **proved** (exact identity in K) |
| No certificate of the Kryvonos-Liehr-Taylor form whose polynomial minorant has only double contact at the inner product t = 0 can prove global optimality for N = 7 (Proposition 5) | **proved** (short written argument using the exact kernel) |
| Numerical three-point SDP bounds for N = 7 fall short of E(B) (Section 7) | **numerical** |
| B is the global minimizer (ground state) | **open**. Not proved here. |

Energy convention: E(X) = - sum_{i<j} log \|x_i - x_j\| for X = (x_0, ..., x_6) in (S^2)^7. The vortex
Hamiltonian of Constantineau et al. is H = - sum_{i<j} ln(\|v_i - v_j\|^2) = 2E, so critical points,
minima and stability statements transfer verbatim. At the bipyramid,

    E(B) = -6 log 2 - (5/2) log 5 = -8.18247786444...

(pole-pole distance 2, ten pole-ring distances sqrt 2, and the pentagon's side and diagonal
2 sin 36 deg and 2 sin 72 deg, whose product is sqrt 5).

## 2. Prior art

### 2.1 Sources read (full text, local copies in the session scratchpad, not committed)

**Constantineau, Garcia-Azpeitia, Garcia-Naranjo, Lessard, "Determination of stable branches of
relative equilibria of the N-vortex problem on the sphere", arXiv:2309.04320 v2 (6 Nov 2023; Commun.
Math. Phys. 2024).** Quotes (verbatim):

- Remark 6.3: "Denote by a the equilibrium configuration attained when z = 0 (the pentagonal bipyramid
  of Table 1.1). The zero eigenvalue of the matrix Q2 at this point corresponds to a 2-dimensional null
  space of d2H(a) spanned by the real and imaginary parts of the vector Ĉ1,2. These vectors lie on the
  space U2 of the symplectic slice defined in Lemma 4.6 and are therefore transversal to so(3).a. This
  leads to the surprising conclusion that, according to Definition 3.1, the SO(3)-orbit of the pentagonal
  bipyramid is a degenerate critical manifold of H when N = 7. In particular, it is not possible to
  determine that this configuration is a local minimum of H, nor that it is a stable equilibrium of (2.8),
  using only information from the second derivatives of H. This degenerate situation is reminiscent of
  the well-known Thomson heptagon problem of stability of a ring of 7 vortices on the plane (see e.g.
  [37, 60])."
- Section 6.1: "The case N = 7 is special. On the one hand it is widely conjectured to be the ground state
  (see e.g. Conjecture 11.1 of [4]). On the other hand, according to the computation in section 6.2, it is a
  degenerate critical point of H so we cannot even prove that it is a local minimiser or conclude stability
  by the study of the Hessian, see Remark 6.3 for details." ([4] = C. Beltrán Álvarez, "On Smale's 7th
  problem" (Spanish), Gac. R. Soc. Mat. Esp. 23 (2020).)
- Section 6.2, N = 7: they prove (Proposition 6.2) that the Z5 branch of relative equilibria with the
  pentagon at height z is stable for 0 < \|z\| < 0.188132, and note that "both the angular velocity ω and
  the momentum µ vanish at the pentagonal bipyramid which is attained when z = 0". Their matrix Q2 =
  diag(15, 15 z^2) is singular exactly at z = 0, which is the case left open and settled here.

**Kryvonos, Liehr, Taylor, "Energy minimization for eight points on the sphere", arXiv:2609.22077
(submitted 18 Sep 2026).** Abstract (verbatim, first sentences): "We study the energy minimization problem
for eight points on the unit sphere. For the logarithmic and Coulomb energies, we show that the unique
global minimizer up to congruence is a square antiprism with height characterized by a unique stationarity
equation. The proof is computer-assisted and fully verified in Lean." Their Table 1 lists the known
optimal cases N = 2, 3, 4, 5, 6 and 12; the paper does not discuss N = 7 (checked by full-text search:
no occurrence of "seven", "N = 7" or "bipyramid" outside the N = 5 case). **Their method is not a
branch-and-bound.** It is Cohn and Woo's three-point semidefinite bound: a Hermite polynomial minorant
H_s of degree 12 touching the potential at the candidate's inner products, and a polynomial identity (4.5)
"(H_s(u) + H_s(v) + H_s(t))/3 - e_s/28 = sum_k <F_k, R_k> + sum_j Sym(g_j z_j^T W_j z_j)" with positive
semidefinite F_k, W_j, verified exactly, followed by an equality analysis. Section 7 of this report
adapts exactly this to N = 7.

**Armentano, Bentancur, Carrasco, Fiori, Valdés, Velasco, "Characterization of logarithmic Fekete
critical configurations of at most six points in all dimensions", arXiv:2502.10152.** Verbatim: "For 7
points on S2, there is a critical configuration that the Hessian does not classify [13, Remark 6.3],
although it is believed that it is a global minimum [6][Conjecture 11.1]." And: "Theorem 2. For the
Fekete problem with n = 7 points in S2, the only critical configuration having a dipole is the 1:5:1."
("dipole" = antipodal pair; 1:5:1 = the pentagonal bipyramid.) They add: "Our theorem reduces the
problem of proving the conjecture ... to showing that some energy minimizer must necessarily have at
least one dipole." They do not prove local minimality.

**Dragnev, "Log-optimal configurations on the sphere", arXiv:1504.02544.** Treats N = 5 on S^2 and
N = 6, 7 in higher dimensions (seven points on S^4); nothing on seven points on S^2.

**Laurent-Polz, Montaldi, Roberts, "Point vortices on the sphere: stability of relative equilibria",
arXiv:math/0402430 (J. Geom. Mech. 2011).** Section 9 treats "a ring of n vortices of unit strength,
together with two polar vortices" with general polar strengths; no nonlinear-stability statement at the
degenerate equal-strength N = 7 equilibrium was found in the text.

### 2.2 Queries (2026-09-26), all recorded

Additional source found by the independent check (Section 8): Amore, Figueroa, Ramos, "Exploring the
energy landscape of the logarithmic potential: local minima and stationary states", arXiv:2512.12416
(J. Stat. Phys. 2026): numerical only, up to N = 160, with Hessians checked only for nonnegative
eigenvalues, and nothing specific about the degeneracy at N = 7.

Web search: "pentagonal bipyramid 7 points logarithmic energy sphere local minimum proof";
"Kryvonos Liehr Taylor square antiprism logarithmic energy 8 points Lean"; "seven points sphere
logarithmic energy critical configurations antipodal pair global minimizer"; "\"pentagonal bipyramid\"
\"point vortices\" sphere stability degenerate seven vortices". arXiv listing search (results in
`prior-art-queries.txt`): all fields "seven points sphere energy", "pentagonal bipyramid",
"bipyramid vortices", "Fekete seven points", "logarithmic energy sphere minimizer"; authors Kryvonos,
Liehr, Garcia-Naranjo, Lessard (every listing since Sep 2023 read by title). Semantic Scholar citation
lists: arXiv:2309.04320 is cited by 2502.10152 only; 2502.10152 and 2609.22077 have no recorded citing
papers. The arXiv export API refused requests from this machine (HTTP 406), so the listing search pages
were used instead; Google Scholar was not reachable from this machine, which is a gap in the search.

**Conclusion of the search:** no proof of local minimality, stability or global optimality of the
pentagonal bipyramid for the logarithmic energy of 7 points on S^2 was found, by Kryvonos, Liehr and
Taylor, by the Lessard group, or by anyone else, up to 26 Sep 2026.

## 3. Setup

**Chart.** Rotate so that x_0 is the north pole N = (0,0,1) and project the other six points
stereographically from N, z = (X + iY)/(1 - Z). From \|p - p'\|^2 = 4\|z - z'\|^2/((1+\|z\|^2)(1+\|z'\|^2))
and \|p - N\|^2 = 4/(1+\|z\|^2),

    E = F(z) := - sum_{1<=i<j<=6} log|z_i - z_j| + 3 sum_{i=1}^{6} log(1 + |z_i|^2) - 21 log 2.

B corresponds to z_S = 0 and z_k = w^k, w = e^{2 pi i/5}, k = 0..4. Chart coordinates (11 real):
z_S = x + iy, z_k = w^k (1 + u_k + i v_k), with the gauge v_0 = 0 (fixes the rotation about the pole
axis). Every term of F is c log Q(w) with Q a real quadratic polynomial, Q(0) > 0.

**Field.** All data at B lie in K = Q(s), s = sin(2 pi/5), the root near 0.951 of 16 s^4 - 20 s^2 + 5.
(The squared distances lie in Q(sqrt 5), but the chart's rotation by w^k brings in sin(2 pi/5), which
is not in Q(sqrt 5); K contains sqrt 5 = 8 s^2 - 5 and cos(2 pi/5) = 2 s^2 - 3/2.) `kfield.py` implements
exact arithmetic in K; signs of nonzero elements are decided by Arb enclosures (a nonzero element of K
is never 0, so the precision loop terminates).

## 4. Theorems and proofs

Let T_4 F be the exact degree-4 Taylor polynomial of F at 0 (`model.py`, series of log(1+P) in K).

**Exact facts (E1-E4), `local_certificate.py`.**
- E1. grad F(0) = 0 exactly.
- E2. The Hessian H (11 x 11, entries in K) has rank 9. The kernel basis N (two columns) and a basis
  C (nine columns) of range(H) = ker(H)^perp are obtained by exact Gram-Schmidt, each column scaled by a
  rational close to 1/norm; H N = 0 and C^T N = 0 are checked exactly. A = C^T H C satisfies
  A - lam0 I > 0 with lam0 = 11154279477/41943040000 = 0.26593875... (exact LDL^T in K, all pivots > 0).
- E3. The cubic F_3(N xi) vanishes identically in xi.
- E4. With b_a(xi) = D F_3(N xi)[C e_a] (quadratic in xi) and eta*(xi) = -A^{-1} b(xi), the effective
  quartic q(xi) = F_4(N xi) - (1/2) b(xi)^T A^{-1} b(xi) is computed exactly. It has only the monomials
  xi_1^4, xi_1^2 xi_2^2, xi_2^4, and

  **Proposition 4 (exact).** q(xi) = \|N xi\|^4 / 10, where \|.\| is the Euclidean norm of the chart
  vector N xi. The kernel consists exactly of the vectors whose only nonzero coordinates are the u_k,
  forming the wavenumber-2 pattern u_k = a cos(4 pi k/5) + b sin(4 pi k/5) (latitude displacements of the
  pentagon; the poles and all azimuthal coordinates are fixed to first order), consistent with
  Constantineau et al.'s description of the null space. In particular q(xi) >= 0.099899 \|xi\|^4, proved by
  the exact coefficient test q - kappa0 (xi_1^2 + xi_2^2)^2 = alpha X^2 + beta X Y + gamma Y^2 with
  X = xi_1^2, Y = xi_2^2 and alpha, beta, gamma >= 0 in K.

**Rigorous enclosures (R2-R4), Arb at 200 bits.** Write w(xi) = N xi + C eta*(xi) and
G(xi, zeta) = F(N xi + C(eta*(xi) + zeta)) - F(0).
- R2 (reduced energy along rays). For a unit vector u, phi_u(r) = G(r u, 0) is analytic in r. Its Taylor
  coefficients a_0..a_3 vanish and a_4 = q(u), by E1-E4 (the r^4 coefficient is F_4(Nu) + D F_3(Nu)[C
  eta*(u)] + (1/2) eta*(u)^T A eta*(u) = q(u)); the computed enclosures at the 96 arc midpoints contain
  these values with radius below 3e-74; the program now *requires* each enclosure to contain the exact value (and all three residuals to be below 1e-50), so an error in the Taylor model or in the Schur sign stops the proof instead of passing silently. The coefficients a_5..a_16 are enclosed over 96 arcs covering the
  circle by a mean-value form (value at the arc centre plus an Arb enclosure of the t-derivative over
  the arc, computed with dual-number power series). The tail j >= 17 is bounded by Cauchy's estimate
  on the complex disc \|r\| <= R = 0.12: there \|w_i(ru)\| <= omega_i := \|N_i\| R + \|C_i\| h R^2 with
  h = 1.20152 >= sup \|eta*(u)\|, every term obeys \|P(w)\| <= sum \|coef\| omega^alpha < 1 and
  \|log(1+P)\| <= -log(1 - \|P\|), giving \|phi_u\| <= M = 3.364. Result: phi_u(r) >= kappa1 r^4 with
  kappa1 = 0.09940 for 0 <= r <= rho_xi = 0.001.
- R3 (gradient along the reduced curve). g1(xi) = C^T grad F(w(xi)) has Taylor coefficients 0 in degrees
  0, 1, 2 (exactly: grad F(0) = 0, C^T H N = 0, and b + A eta* = 0), and the same method gives
  \|g1(xi)\| <= gamma \|xi\|^3 with gamma = 2.97814 for \|xi\| <= rho_xi.
- R4 (convexity across). On the box \|w_i\| <= beta_i := \|N_i\| rho_xi + \|C_i\| (h rho_xi^2 + rho_zeta),
  rho_zeta = 0.002, which contains every w = N xi + C(eta*(xi) + theta zeta), the third derivatives of each
  term (closed form for log(1+P), P quadratic) are enclosed, giving \|Hess F(w) - H\|_2 <= \|D\|_2 by the
  mean-value theorem and Perron's monotonicity, and lambda_min(C^T Hess F(w) C) >= lam0 - \|C\|_2^2 \|D\|_2
  >= mu = 0.06647 (Weyl).

**Theorem 1 (strict local minimum in the chart; proved).** For \|xi\| <= 0.001 and \|zeta\| <= 0.002,

    F(N xi + C(eta*(xi) + zeta)) - F(0) >= 0.01661 |zeta|^2 + 0.09927 |xi|^4.

Consequently F(w) > F(0) for every chart point 0 < \|w\|_2 <= 6.6e-4.

*Proof.* Taylor's theorem in zeta with Lagrange remainder along the segment (inside the box of R4):
G(xi, zeta) = G(xi, 0) + g1(xi).zeta + (1/2) zeta^T [C^T Hess F(.) C] zeta >= kappa1 X^4 - gamma X^3 Y +
(mu/2) Y^2 with X = \|xi\|, Y = \|zeta\| (R2, R3, R4). By AM-GM, gamma X^3 Y <= (mu/4) Y^2 + (gamma^2/mu) X^6,
so G >= (mu/4) Y^2 + (kappa1 - gamma^2 rho_xi^2/mu) X^4, and kappa1 - gamma^2 rho_xi^2/mu >= 0.09927. The
map (xi, zeta) -> w is a bijection (w = M(xi, eta) with M = [N C] invertible, zeta = eta - eta*(xi));
with the exact inverse, \|xi\| <= 1.41422 \|w\| and \|zeta\| <= 3.00000 \|w\| + h (1.41422 \|w\|)^2, so
\|w\| <= 6.6e-4 lies in the domain; w != 0 gives (xi, zeta) != 0 and hence G > 0. QED.

**Corollary 2 (orbit form; proved).** Let B = (b_0, ..., b_6) be the labelled bipyramid. If X in (S^2)^7,
g in SO(3), \|x_i - g b_i\| <= 7.2e-5 for all i, and X is not a rotation of B, then E(X) > E(B).

*Proof* (`orbit_radius.py`). WLOG g = id. The rotation about the axis x_0 x N taking x_0 to N moves
every unit vector by at most \|x_0 - N\| <= delta; then x_2 (the pentagon vertex b_2 = (1,0,0)) is within d = 2
delta of (1,0,0), so its azimuth phi satisfies \|phi\| <= arcsin d and the rotation about the z-axis by
-phi moves every point by at most 2 sin(\|phi\|/2). Now every point is within d' = 2 delta + 2 sin(arcsin(2
delta)/2) of B, x_0 = N and v_0 = 0, so X is in the chart. By the identity \|p - p'\| =
2\|z - z'\|/sqrt((1+\|z\|^2)(1+\|z'\|^2)), \|z_S\| <= d'/sqrt(4 - d'^2) and \|z_k - w^k\| <= e* with e* the
verified bound for the fixed point of e = d' sqrt(2(1 + (1+e)^2))/2. Hence \|w\|_2 <= sqrt(e_S^2 + 5 e*^2)
<= 6.59982e-4 < 6.6e-4 at delta = 7.2e-5, and Theorem 1 applies (if X were not a rotation of B then w != 0).
QED.

**Theorem 3 (nonlinear stability; proved).** The pentagonal bipyramid is an equilibrium of 7 identical
point vortices on the sphere, and it is Lyapunov stable modulo rotations: for every epsilon > 0 there is
delta > 0 such that if dist(X(0), O) < delta then dist(X(t), O) < epsilon for all t in R, where O =
SO(3).B and dist(X, O) = min_g max_i \|x_i - g b_i\|.

*Proof.* B is a critical point of H = 2E (E1, together with rotation invariance), so all velocities vanish
and B is an equilibrium. H is conserved; O is compact; by Corollary 2, H > H(B) on U \ O where U = {dist < 7.2e-5}.
Given epsilon (WLOG < 7.2e-5), let m = min{H(X) : dist(X, O) = epsilon} > H(B) (compact set, strict
inequality pointwise). By continuity of H and compactness of O there is delta < epsilon with H < m on
{dist < delta}. A solution starting there cannot reach {dist = epsilon} since H is constant along it,
so it stays in {dist < epsilon}, which also excludes collisions and gives global existence. QED.

This is the "SO(3)-stability" of Constantineau et al. (their Section 2.4: "a solution whose initial
condition is close to any of these equilibria ... will be constrained to evolve in such way that the vortices
are at every time near the vertices of a rotated version of such equilibrium"), obtained here without the
Hessian test, which is inconclusive at N = 7. Stability of the point B itself is not claimed: nearby
configurations with nonzero momentum are relative equilibria rotating slowly about their momentum axis.

**What the proof rests on.** Exact rational arithmetic (Python `fractions`) in K; Arb ball arithmetic
(python-flint 0.9.0, 200-bit), including `arb_series` for power series and `log`; Cauchy's estimate for
analytic functions on a polydisc; the mean-value theorem; Weyl's inequality; Perron-Frobenius monotonicity
of the spectral norm on nonnegative matrices. Floating point is used only to choose parameters (radii,
trial constants) and in `numerics.py`, never in a proved inequality.

## 5. Negative and positive controls (`negative_controls.py`)

Through the same rigorous pipeline:

| Perturbed energy | Expected | Result |
|---|---|---|
| F - (1/5)\|xi(w)\|^4 | fail (quartic 0.1 - 0.2 < 0) | fails at R1; float check: min over eta of F_pert at \|xi\| = 0.05 is below F(0) in all 12 directions (max -6.3e-7) |
| F - (11/100)\|xi(w)\|^4 | fail (just past the threshold 1/10) | fails at R1; float descent confirmed (max -6.5e-8) |
| F - (9/100)\|xi(w)\|^4 | pass | passes (proved) |
| F - (1/20)\|xi(w)\|^4 | pass | passes (proved) |
| F + 0.001 xi_1(w)^3 | fail at E3 | fails at E3; float descent at s = -0.001, -0.002 |
| F - 10 (c_1.w)^2 | fail at E2 | fails at E2 (Hessian indefinite) |

The threshold behaviour (fails at beta = 0.11, passes at 0.09) matches q = \|N xi\|^4/10.

Other configurations of 7 points (float, **numerical**): the equatorial heptagon (D7h, E = -6.81069) and
the symmetric critical points 1:6 (C6v, E = -7.70589) and 1:3:3 (C3v, E = -8.17856, only 0.0039 above
E(B)), located by 40-digit root finding of the symmetric gradient (residual gradient ~ 1e-15), all have a
negative Hessian eigenvalue (-3.0000, -1.6286, -0.0298) and are rejected; the octahedron plus one point
is not critical (gradient norm 1.7). The bipyramid shows exactly 3 + 2 zero eigenvalues. (The requested
"octahedron plus one" control is therefore a non-critical control, not a critical one.)

## 6. Numerics (`numerics.py`, **numerical**)

- 400 seeded random starts (seeds 0-399, L-BFGS on x_i/\|x_i\|, gradient tolerance 1e-12): all 400
  final energies equal -8.18247786 to eight decimals, i.e. E(B). This reproduces the scratch observation
  quoted in the task and is evidence, not proof, for global optimality.
- Reduced energy along the degenerate plane, (min over eta of F(N xi + C eta) - F(0)) / \|N xi\|^4 over 8
  directions: 0.09993-0.09994 at \|xi\| = 0.02, 0.09957-0.09960 at 0.05, 0.0982-0.0985 at 0.1, 0.092-0.094
  at 0.2. The limit 1/10 is the exact value of Proposition 4; the scratch value "0.0999 t^4, the same in
  every direction" is the same constant seen at finite t.

## 7. The global statement: what was attempted and how far it got

**7.1 The template.** As quoted in Section 2, Kryvonos-Liehr-Taylor use the three-point bound, not a
branch-and-bound. For N points the summation argument of their (4.4)-(4.6) becomes: over the
N(N-1)(N-2) ordered triples of distinct indices, sum (H(u)+H(v)+H(t))/3 = 2(N-2) E_H(Y), and
Psi_Y R_k = 6 M_k(Y) with

    R_k = 6 S_k(u,v,t) + 6/(N-2) [S_k(u,u,1) + S_k(v,v,1) + S_k(t,t,1)] + delta_k0 6/((N-1)(N-2)) J

(the repeated-index triples contribute 3 D_k + N delta_k0 J to M_k, with D_k = sum_{i != j} S_k(t_ij, t_ij, 1)
and S_k(1,1,1) = delta_k0 J). For N = 8 this is exactly their R_k. For N = 7 the identity reads
(H(u)+H(v)+H(t))/3 - e/21 = sum_k <F_k, R_k> + SOS and yields 10 (E_H(Y) - e) >= 0.

**7.2 An obstruction (Proposition 5; proved).** Let H be any function with H <= phi on [-1, 1), phi(t) =
-(1/2) log(2 - 2t), and H = phi at the inner product t = 0, with (phi - H)''(0) > 0 (contact of order
exactly two, as for KLT's Hermite minorants). Then inf_Y E_H(Y) < E(B), so no lower bound for E_H,
three-point or otherwise, can certify E >= E(B). *Proof.* Take the chart curve w(s) = s N xi_0. By E1-E3,
E(Y(s)) - E(B) = O(s^4). The pole-to-ring inner products are +-(\|z_k\|^2 - 1)/(\|z_k\|^2 + 1) = +-u_k + O(u^2),
and u_k(s) = s (N xi_0)_{u_k} is not identically zero (Proposition 4), so some pair has t_ij(s) = s tau + O(s^2)
with tau != 0 and node t = 0. Then E_H(Y(s)) = E(Y(s)) - sum (phi - H)(t_ij(s)) <= E(B) + O(s^4) -
(1/2)(phi - H)''(0) tau^2 s^2 + O(s^3) < E(B) for small s != 0. QED. So a sharp certificate needs contact of
order at least four at t = 0 (the ring-ring inner products do not move to first order along the kernel, so
this argument does not force it at cos 72 deg or cos 144 deg).

**7.3 Numerical three-point bounds (`three_point_sdp.py`, numerical).** The code was first validated on
N = 8: with KLT's degree-12 Hermite minorant it returns e* = -10.42801732 against the antiprism's
-10.42801778 (difference -4.6e-7, i.e. sharp within solver tolerance), reproducing their theorem
numerically. For N = 7:

| minorant H | degree | extra constraint | solver status | bound e* | E(B) - e* |
|---|---|---|---|---|---|
| double contact at 0, cos 72, cos 144 | 8 | | optimal | -8.19098919 | 8.5e-3 |
| double contact | 10 | | optimal_inaccurate | -8.18655291 | 4.1e-3 |
| double contact | 12 | | optimal_inaccurate | -8.18479856 | 2.3e-3 |
| double contact | 12 | Gram-determinant multiplier | optimal | -8.18437917 | 1.9e-3 |
| double contact | 14 | | optimal_inaccurate | -8.18399900 | 1.5e-3 |
| fourth-order contact at all three nodes | 14 | | optimal_inaccurate | -8.18399626 | 1.5e-3 |
| fourth-order contact | 16, 16 + Gram, 18 | | did not finish within 40 min (no result) | | |

In every completed case the bound stays below E(B) = -8.18247786 by about 1e-3 or more, while the
same code is sharp to 5e-7 for N = 8. The double-contact rows are consistent with Proposition 5, which
says they can never be sharp. At degree 14, fourth-order contact does not close the gap. These are
floating-point SDP values (several flagged "optimal_inaccurate" by Clarabel, in a monomial basis that is
poorly conditioned at high degree), so they are evidence, not proof, that the three-point method in this
form, at these degrees, does not reach N = 7. Whether a higher degree, a better-conditioned basis
(Gegenbauer/Chebyshev), or extra constraints could make it sharp is open.

**7.4 Branch-and-bound (estimate).** `global_estimate.py` models an interval branch-and-bound in the
11-dimensional quotient with centred-form bounds (box width h certified when the gap exceeds c2 h^2, c2 =
6.93). Along the degenerate plane the gap is only (1/10)\|xi\|^4, so boxes shrink like \|xi\|^2: about
10^15.6 boxes near the minimum with the present local radius 6.6e-4, 10^11.8 even with a local radius of
0.05, before the rest of the space (including the 1:3:3 saddle 0.0039 above E(B)). This exceeds this
machine's budget (4 cores, runs under an hour) by many orders of magnitude, so it was not attempted.

**7.5 Where the global problem stands.** Global optimality is not proved. Combined with the theorem of
Armentano et al. (the only critical configuration with an antipodal pair is the bipyramid), it would suffice
to show that some minimizer has an antipodal pair. A three-point certificate would additionally need a
minorant with fourth-order contact at t = 0 (Proposition 5) and slack terms vanishing to fourth order along
the degenerate plane.

## 8. Independent adversarial check

An independent subagent, without access to this conversation's reasoning, was asked to break the proof:
re-derive the degenerate expansion in a different parametrization, rerun everything from a copy, mutate the
code, audit every inequality, and re-open the sources. Its verdicts, in its own words, abridged:

- Theorem 1: "sound with fixable gaps"; Corollary 2: "sound"; Proposition 4: "sound, confirmed
  independently to 25 digits"; Theorem 3: "sound, standard Lyapunov argument given Cor. 2";
  Proposition 5: "sound".
- Independent derivation (exponential-map tangent coordinates in R^3, 14 variables, mpmath at 60 digits,
  rotations removed by a linear slice): intrinsic Hessian with 5 zeros (\|ev\| < 1.3e-60), the others
  0.75, 0.75, 2.25, 2.25, 3.0 (x5); null space = pure latitude displacements of the pentagon, wavenumber 2;
  cubic on the kernel < 1.8e-60; Schur-reduced quartic = 0.1 to 25 digits in every direction (F_4 alone
  0.325, Schur correction -0.225); direct Newton minimisation over the complement gives (E_min - E(B))/t^4
  = 0.0999226, 0.0999807, 0.0999952, 0.0999992 at t = 0.02, 0.01, 0.005, 0.002. In the chart it found the
  smallest complement eigenvalue 0.26593903 (orthonormal complement). 400 random points of the Theorem 1
  domain evaluated in mpmath: min of G / (0.01661\|zeta\|^2 + 0.09928\|xi\|^4) = 1.0073, no counterexample.
- Rerun from a copy: all outputs matched this report.

**Issues it found, and what was done:**

| Issue | Severity | Fix |
|---|---|---|
| D1: in R3 a ball that straddled 0 was squared, its square root was nan, and Python's `max` silently kept the previous value (6352 arc evaluations affected), so the printed gamma = 2.8104 was not a proved bound | major (rigor) | `umax`: every ball is replaced by its exact upper endpoint before comparison and must be finite; `sa` is made a nonnegative upper bound before squaring. Proved gamma is now 2.97814 (the checker's independent fix gives the same number); xi^4 coefficient 0.09928 -> 0.09927; chart radius 6.6e-4 and delta0 = 7.2e-5 unchanged. |
| D2: the arc half-width used `max` on overlapping balls, so the cover of the circle was not provable by about 1e-59 rad | minor (rigor) | half-width = `umax` of the exact upper endpoints |
| D3: the Arb consistency checks a_0..a_3 = 0, a_4 = q, g_0..g_2 = 0 were only printed; a mutated Schur sign or scaled quartic Taylor coefficients "PROVED" silently | medium (design) | now enforced (`require`), and the exact identity q = \|N xi\|^4/10 is required in the main run; both mutations re-tested and now stop with "enclosure of a_4 does not contain q(u)" |
| D4: `hmax` used the same max-of-sqrt pattern (not triggered) | low | same fix |
| D5: proof steps used `assert` (removed by `python -O`) | low | replaced by `require` / explicit exceptions |
| D6: cosmetic errors in this report (h rounded down, lam0 rounded up, x_1 for x_2) | cosmetic | corrected |

Its mutation table: 23 mutations; caught before the fixes: field coefficient 2.9 and 3.1 (E1), a kernel cubic
(E3), J = 4 and a single arc (no admissible radius). Silently accepted: the one-sided bounds (M/10, lam0 x3,
fx/100, h/100, dropping the mean-value term or third-derivative terms, gamma = 0, and so on). These are upper or
lower bounds that no internal test can exercise in the favourable direction; the checker re-derived each by
hand and found them correct apart from D1 and D2. The Taylor/Schur mutations are now caught (D3).
Prior-art quotes were verified verbatim against the PDFs; one nuance: Proposition 6.2 of Constantineau et al.
states positive definiteness of Q1, and the stability conclusion follows it in the text.

## 9. Reproduce

```
pip install python-flint==0.9.0 numpy scipy mpmath cvxpy clarabel scs   # versions in Section 10
cd research/seven-vortex-sphere
python3 kfield.py               # field self-test
python3 local_certificate.py    # Theorem 1: exact part + Arb enclosures; writes certificate.json (~5 s)
python3 orbit_radius.py         # Corollary 2: delta0 = 7.2e-5
python3 negative_controls.py    # Section 5 (~30 s)
python3 numerics.py             # Section 6 (numerical, a few minutes)
python3 three_point_sdp.py 12            # Section 7.3, N = 7 (numerical)
python3 three_point_sdp.py 12 --n8       # validation on N = 8
python3 three_point_sdp.py 14 --contact4 # fourth-order contact minorant
python3 global_estimate.py      # Section 7.4 (estimate)
```

## 10. Environment

Python 3.11.15, python-flint 0.9.0 (Arb/FLINT), numpy 2.4.6, scipy 1.17.1, mpmath 1.3.0, cvxpy 1.9.3,
Clarabel 0.11.1, SCS; Linux, 4 cores.
