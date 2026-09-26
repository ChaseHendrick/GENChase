# The classical double pendulum is chaotic: a computer-assisted proof of a transversal homoclinic orbit

Status: computer-assisted proof, run and rerun in this repository on 2026-09-26; not independently reviewed
by a human. Section 8 records the adversarial check by an independent agent. Nothing here is published.

## 1. Result in one paragraph

For the planar double pendulum with two equal point masses on two equal massless rods under constant gravity
(units m = l = g = 1, energy measured so that the bottom rest state has E = -3), at each of the three exact
energies E = -1/2, 0 and 1/2, the flow on the energy level has a hyperbolic periodic orbit whose stable and
unstable manifolds intersect transversally. E = 0 is the energy of releasing both arms from rest in the
horizontal position. Consequently (Smale-Birkhoff) the flow on each of these energy levels contains a horseshoe
and has positive topological entropy, and (Kozlov's argument, written out in Section 4.5) every real-analytic
function on the energy level that is invariant under the flow is constant. With the persistence of transversal
homoclinic points in E, this also excludes any real-analytic first integral on the whole phase space that is
functionally independent of the energy (Corollary 3), a statement that may already follow from Bolotin and
Negrini (1997) if their parameter domain contains the equal case (Section 2; we could not read that paper).
Rigorous: the fixed point, its hyperbolicity, the local unstable manifold and the transversal crossing, all by
interval arithmetic with the CAPD library (C^0 and C^1 Lohner integrators, rigorous Poincare maps), together
with the written lemmas below. Numerical: how the orbit and the crossing were found. Not attempted: meromorphic
(Morales-Ramis) non-integrability, and an explicit lower bound on the entropy.

## 2. Prior art (full ledger in [PRIOR-ART.md](PRIOR-ART.md))

Searched on 2026-09-26: arXiv (about 35 queries, every title under "double pendulum" scanned), zbMATH Open
(18 queries), citations of Szuminski-Kapitaniak 2025, Salnikov 2013, Dullin 1994 and Ivanov 1999, the
publication lists of Wilczak, Zgliczynski and Kapela and the CAPD application pages. Every query, hit count
and relevant hit is in the ledger. What the sources say, quoted:

- Szuminski and Kapitaniak, J. Sound Vib. 611 (2025) 119099, arXiv:2602.21123, abstract: "this work represents
  a significant step toward proving the long-sought non-integrability of the classical double pendulum"; p. 3:
  "a non-integrability proof for the classical double pendulum is still missing".
- Stachowiak and Szuminski, Phys. Lett. A 379 (2015), arXiv:1511.01850: "Until now, there is no closed
  mathematical proof confirming its non-integrability."
- Salnikov, arXiv:1303.4904 (at exactly m = l = 1): numerically computed monodromy matrices printed to two
  decimals; "the (computer assisted) proof of non-integrability of the system describing the motion of a double
  pendulum is possible." No interval enclosure.
- Dullin, Z. Phys. B 93 (1994) 521-528 (author preprint): the equal case maps to coupling epsilon = 1/2, while
  the method assumes "epsilon << 1"; "it can naturally give results close to an integrable case only."
- Kaheman, Bramburger, Kutz and Brunton, arXiv:2209.10132, p. 27: "the double pendulum lacks such proofs ... we
  also lack a proof of transversality of the orbits".
- Burov (PMM 1986), Ivanov I-IV (1999-2001), Tabanov (1999), Moauro and Negrini (PMM 1998): perturbative in a
  parameter (link geometry, mass ratio) that is not small in the equal case.
- Unresolved: Bolotin and Negrini, "A variational criterion for nonintegrability", Russ. J. Math. Phys. 5 (1997)
  415-436. zbMATH (Zbl 0951.37029): "the nonintegrability of a double pendulum in a certain domain of parameters
  is proved"; Moauro and Negrini (1998, p. 892, translated): "for energy values close to the maximum of the
  potential energy". Rabinowitz, TMNA 9 (1997) 41-76, Sect. 1, describes it as "a variational criterion for the
  nonintegrability of (HS) when V is analytic". The full text was not reached, so we do not know whether the
  equal case is in their domain. Their energies are near the top of the potential (E = 3 here), far from ours,
  and their statement is non-integrability, not a horseshoe; but if their domain contains the equal case,
  Corollary 3 below is not new.

Verdict: as far as the search reached, no proof of chaos (horseshoe, positive entropy, transversal homoclinic
orbit) exists at the classical parameters, and no proof of non-integrability on a given energy level below the
top of the potential. Global analytic non-integrability is open or proved depending on Bolotin-Negrini.

## 3. Setting and statement

Coordinates: angles t1, t2 from the downward vertical, canonical momenta p1, p2. With
c = cos(t1 - t2), D = 1 + sin^2(t1 - t2) = 2 - c^2,

    H = (p1^2 + 2 p2^2 - 2 c p1 p2) / (2 D) - 2 cos t1 - cos t2.

This is the Legendre transform of L = t1'^2 + t2'^2/2 + t1' t2' c + 2 cos t1 + cos t2, the Lagrangian of equal
point masses on equal rods; general m, l, g with m1 = m2, l1 = l2 reduce to it by scaling time by sqrt(l/g)
and energy by m g l. `code/check_field.py` derives Hamilton's equations from L with sympy and proves that the
vector field given to CAPD is identical to them (exactly, by reduction modulo cos^2 + sin^2 = 1), and that the
section lift below solves H = E ([data/check_field.log](data/check_field.log)).

Energy levels. For E in (-1, 1): E is a regular value (the critical values of V are -3, -1, 1, 3), the level
M_E = H^{-1}(E) is a compact connected real-analytic 3-manifold, the lower arm can turn over (E > -1) and the
upper arm cannot (V(pi, t2) = 2 - cos t2 >= 1 > E), so t1 stays in (-pi, pi) and the plane t1 = 0 is crossed
upward once per swing of the upper arm.

Section. Sigma_E = {t1 = 0, dt1/dt > 0} in M_E, parametrized by z = (t2 mod 2 pi, p2) in
{p2^2 < 2(E + 2 + cos t2)}, with p1 = c p2 + sqrt(D (2(E + 2 + cos t2) - p2^2)) (then
dt1/dt = sqrt((2(E + 2 + cos t2) - p2^2)/D) > 0). P = P_E is the first-return map, real-analytic where defined.

Symmetry. R(t1, t2, p1, p2) = (-t1, -t2, p1, p2) preserves H and reverses the symplectic form, so it reverses
time; it maps Sigma_E to itself (dt1/dt = dH/dp1 is even in the angles), and on Sigma_E it is
G(t2, p2) = (-t2, p2). If y = P(x) = phi_tau(x), then phi_s(Ry) = R phi_{tau - s}(x) is off Sigma_E for
0 < s < tau and equals Rx at s = tau, so P G P = G, that is G P G = P^{-1}. Fix(G) = {t2 = 0 or pi}.

**Theorem 1.** For each E in {-1/2, 0, 1/2} (exact), the return map P_E has a fixed point p_E = (0, y_E) on
Fix(G) with

| E | y_E (enclosure width < 2e-12) | return time T_E | trace DP(p_E) |
|---|---|---|---|
| -1/2 | -1.24486097091(8) | [3.70477454, 3.70477455] | [-3.23158, -3.23150] |
| 0 | -1.46237309247(99) | [2.95348900, 2.95348902] | [-3.80869, -3.80863] |
| 1/2 | -1.62704495920(3) | [2.56436222, 2.56436223] | [-3.33283, -3.33278] |

(the full enclosures are in the logs). p_E is hyperbolic, with a real eigenvalue of modulus at least
3.5238, 2.8834, 2.9987 respectively and the other of modulus less than 1. Its unstable manifold W^u(p_E) and
stable manifold W^s(p_E) intersect transversally at a point q_E of Fix(G), q_E != p_E; at E = 0,
q_0 = (t2 = 0 mod 2 pi, p2 in [0.822049, 0.822252]) and q_0 = P^9(z) for a point z of W^u_loc(p_0) at
distance about 1.9e-5 from p_0. Equivalently: on M_E the periodic orbit gamma_E through p_E (period T_E; in one
period the upper arm makes one swing and the lower arm one full turn) is hyperbolic and has a transversal
homoclinic orbit.

**Corollary 1 (horseshoe, entropy).** For each such E there is N >= 1 such that P_E^N has a compact invariant
hyperbolic set on which it is topologically conjugate to the full shift on two symbols. Hence h_top(P_E) > 0,
and the flow on M_E has positive topological entropy.

**Corollary 2 (no analytic integral on the level).** For each such E, every real-analytic function on M_E (or on
a neighbourhood of M_E in phase space) that is invariant under the flow is constant on M_E.

**Corollary 3 (analytic non-integrability).** There is no real-analytic first integral F on T*T^2 (or on any
connected open set containing M_0) that is functionally independent of H.

What is rigorous: Theorem 1 is established by the interval computations of Section 5 together with Lemmas 1-3
(written proofs in Section 4). Corollaries 1-3 follow from Theorem 1 by the classical theorems cited in Section
4.4-4.6. Corollary 3 uses in addition the (standard, not computed) persistence of transversal homoclinic
points for E near 0; it is not quantified.

Why these energies are representative. E = 0 is a textbook initial condition (both arms horizontal at rest),
sits in the middle of the band -1 < E < 1 where the lower arm flips and the upper arm does not, and a
Poincare section of 60 random orbits of 400 returns each shows no visible island at plot resolution
(numerical, `code/explore.cpp`); E = -1/2 still shows a visible island, E = 1/2 none. The same family of
symmetric orbits carries the proof at all three energies, which indicates that the mechanism is not special to
one energy.

## 4. The proof

Throughout, f = P_E and the computation works in a lift of t2 to R, with f~(z) = P(z) + (2 pi, 0) so that
f~(p) = p in the lift (the lower arm turns once per period, backwards). G f~ G = f~^{-1} in the lift as well,
since G commutes with P up to the deck translation, which it inverts.

### 4.1 Fixed point (Krawczyk)

B = p0 + [-r, r]^2 with r = 1e-9, p0 a numerical approximation. With F(z) = f~(z) - z, a point matrix C
(approximately the inverse of DF(p0)) and the interval enclosure DF(B),

    K = p0 - C F(p0) + (I - C DF(B)) (B - p0).

If K is in the interior of B, F has exactly one zero in B, and it lies in K. Proof: for z in B, the mean value
theorem gives z - C F(z) in K, so z -> z - C F(z) maps B into itself and has a fixed point by Brouwer, a zero
of F once C is invertible. K in int B gives |I - C J| rho < rho componentwise for rho = (r, r) and every J in
DF(B), so the spectral radius of |I - C J| is below 1, C J is invertible for every J in DF(B); if F(z1) = F(z2),
then 0 = J~ (z1 - z2) with J~ the row-wise mean-value matrix, which lies in DF(B), so z1 = z2.
(Krawczyk, Computing 4 (1969) 187-201; Moore, Computing 19 (1977).)

Symmetry of p: G(K) is contained in B (checked), G p is a fixed point of f~ (from G f~ G = f~^{-1}), it lies in
B, and uniqueness gives G p = p. So p is on Fix(G).

### 4.2 Hyperbolicity and a quantitative local unstable manifold

Local coordinates z = p0 + A (x, y), A = [v_u v_s] with numerical eigenvectors (v_s = G v_u up to sign), and
N0 = {|x| <= a, |y| <= b}. Cone C_u = {(v_x, v_y): |v_y| <= alpha |v_x|}. Checked in interval arithmetic on a
cover of N0 by sub-boxes: for every z in N0 and |t| <= alpha, M = A^{-1} Df(z) A satisfies

- (C1) (M (1, t))_x has constant sign and modulus at least mu > 1, and |(M (1, t))_y| < alpha |(M (1, t))_x|;
- (C2) whenever the x-coordinate of f~(z) lies in [-a, a], its y-coordinate lies in (-b, b);
- (C3) |det Df| < mu on B, and |y_p| + alpha (a + |x_p|) < b.

**Lemma 1 (hyperbolicity).** Df(p) has a real eigenvalue lambda_u with |lambda_u| >= mu and another,
lambda_s, with |lambda_s| < 1. Proof: by (C1) Df(p) maps the closed interval of slopes [-alpha, alpha] into
its interior, so it has a fixed slope (intermediate value theorem): an eigenvector v in C_u with
|lambda_u| |v_x| = |(Df v)_x| >= mu |v_x|, v_x != 0. Then |lambda_s| = |det Df(p)| / |lambda_u| < 1 by (C3). (P preserves dt2 ^ dp2, so det = 1 exactly; the computed enclosure of det makes the lemma independent of that fact.)

**Lemma 2 (graph of W^u).** There is a C^1 function w: [-a, a] -> (-b, b) with |w'| <= alpha and
w(x_p) = y_p whose graph lies in W^u(p). Proof: by the stable manifold theorem (Dyatlov, arXiv:1805.11660, Sect. 4.1, Theorem 4;
analytic case: Capinski and Mireles James, arXiv:1602.02973, Sect. 2.2) the local unstable manifold is a
C^1 (here real-analytic) embedded arc through p tangent to E^u, and E^u lies in C_u (Lemma 1); so a small piece
Gamma_0 is a graph over an interval I_0 containing x_p with slopes in C_u. Suppose Gamma_n in W^u(p) is such a
graph over I_n, contained in N0. Its image f(Gamma_n) is a C^1 curve in W^u(p) whose tangents lie in C_u by
(C1), expressed in the same global coordinates, so x is strictly monotone along it: it is a graph over an
interval J. Integrating (C1) along Gamma_n from p gives |x(f(z)) - x_p| >= mu |x(z) - x_p|, and the two sides
of p are either kept or swapped (constant sign in C1), so J contains [x_p - mu d, x_p + mu d] where d is the
smaller distance from x_p to the ends of I_n. Let Gamma_{n+1} be the part of f(Gamma_n) over J intersected with
[-a, a]; by (C2) it lies in N0. After finitely many steps I_n = [-a, a].

### 4.3 The crossing of Fix(G) and its transversality

R = [x1, x2] x yR with x_p outside [x1, x2], where yR = y_p +- alpha max|x - x_p| (outward rounded). By Lemma 2
the piece of W^u(p) over [x1, x2] is an arc in R from the edge x = x1 to the edge x = x2, with tangents in
A C_u. Checked in interval arithmetic (the lift of t2 is continuous along the arc):

- (C4) the images f~^k of the two edges have t2 on opposite sides of m pi;
- (C5) for every sub-piece Z of R (a cover by pieces, bisected where needed) whose image enclosure may meet
  t2 = m pi, every line D f^k(z) A (1, t), z in Z, |t| <= alpha, has both components nonzero.

**Lemma 3.** Under (C4)-(C5), W^u(p) and W^s(p) intersect transversally at a point q in Fix(G), q != p.
Proof: the image of the arc is a continuous arc in the lift joining the two sides of t2 = m pi, so it meets
the line at a point q = f~^k(z), z in R; t2(q) = m pi means q is in Fix(G) on the cylinder, so q = G q is in
G W^u(p) = W^s(p) (because f^{-n} = G f^n G and G p = p). q != p since z != p. The tangent of W^u at q is
v = D f^k(z) (tangent at z), both of whose components are nonzero by (C5); the branch of W^s through q is the
G-image of the branch of W^u through q (W^u and W^s are injectively immersed curves), with tangent
DG v = (-v_1, v_2); det[v, DG v] = 2 v_1 v_2 != 0. For the flow this is a transversal intersection of the
two-dimensional manifolds W^u(gamma_E) and W^s(gamma_E) along the orbit of q inside M_E.

### 4.4 Horseshoe and entropy (Corollary 1)

A transversal homoclinic point of a hyperbolic fixed point of a diffeomorphism implies that some iterate has
a compact invariant hyperbolic set on which it is conjugate to the full 2-shift (Smale, "Diffeomorphisms with
many periodic points", 1965, not reached; the statement read is Perez-Stark, "Hyperbolic dynamical systems and
the Birkhoff-Smale theorem", UChicago REU 2021, Theorem 6.2: "f^n has a hyperbolic invariant set Lambda ... on
which f^n is topologically conjugate to the shift map"; sources for every classical theorem used are in
[THEOREM-SOURCES.md](THEOREM-SOURCES.md)). P_E is a real-analytic diffeomorphism of
a neighbourhood of the relevant compact set onto its image, which is all the theorem needs. Hence
h_top(P_E^N) >= log 2 and h_top(P_E) >= (log 2)/N > 0. The flow on the compact invariant set swept by the
horseshoe is a suspension of the 2-shift with a continuous positive roof function (the return time, bounded by
T_max); by Abramov's formula (read in Kucherenko and Thompson, arXiv:1909.07317, Sect. 2, eq. (2.13)), for the measure
of maximal entropy of the shift,
h(phi_1) = h(P^N)/(mean return time of P^N) >= log 2 / (N T_max) > 0, so the flow on M_E has positive
topological entropy by the variational principle.

### 4.5 No analytic integral on the level (Corollary 2; Kozlov's argument)

Let F be real-analytic near M_E and invariant under the flow; g = F restricted to Sigma_E is real-analytic
and P-invariant. g is constant, say c, on the orbit of p, so, by continuity and invariance, on
W^u(p) and W^s(p). Let D be a small arc of W^u(p) through q; it is transversal to W^s(p) at q. By the
lambda-lemma (Palis 1969, not reached; statement read in Perez-Stark, Lemma 3.11) the arcs f^n(D) converge in C^1 to a compact piece of W^u_loc(p), and for large n they
are disjoint pieces of the injectively immersed curve W^u(p), different from that piece. Take a real-analytic
arc sigma crossing W^u_loc(p) transversally at a point w != p. For large n, f^n(D) meets sigma at points
z_n != w with z_n -> w, and g(z_n) = c. So g - c restricted to sigma, an analytic function of one variable, has
non-isolated zeros and vanishes on sigma. Doing this for a one-parameter family of parallel analytic arcs
through points of W^u_loc(p) near w gives g = c on an open subset of Sigma_E; the flow-box of that set is open
in M_E and F = c on it; M_E is a connected analytic manifold, so F = c on M_E. This is the argument in Kozlov,
Russian Math. Surveys 38:1 (1983), Ch. V, Sect. 2, proof of Theorem 3 (p. 49), where it is applied to
separatrices that "intersect and do not coincide"; see also Moser, Stable and Random Motions (1973),
Theorem 3.10, as cited by Yagasaki, arXiv:2106.04930, and Cresson, arXiv:math/0509547, Theorem 1.1 (a
transversal homoclinic point excludes a non-trivial analytic first integral of an analytic map). Kozlov's own
statement for autonomous systems with two degrees of freedom (his 1996 book) was not reached, which is why the
argument is written out here.

### 4.6 Global analytic non-integrability (Corollary 3)

The fixed point p_E and the local manifolds depend continuously (in C^1 on compact pieces) on E, since P_E
depends analytically on E and p_E is hyperbolic; a transversal intersection persists under C^1-small
perturbation. So Theorem 1 at E = 0 gives a transversal homoclinic orbit for every E in some interval
(-eps, eps), eps > 0 not computed. If F is a real-analytic integral on a connected open set U containing M_0 (then M_E is contained in U for E near 0, because H is proper and M_0 compact),
Corollary 2 makes F constant on each M_E, |E| < eps, so F = phi(H) on H^{-1}(-eps, eps), dF ^ dH = 0 on an open
set, and by analyticity on all of U.

## 5. The computation

Program: `code/prove.cpp` with CAPD (commit 03dc5628 of github.com/CAPDGroup/CAPD, fetched by
`code/build.sh`; CAPD: Kapela, Mrozek, Wilczak, Zgliczynski, Commun. Nonlinear Sci. Numer. Simul. 101 (2021)
105578). Interval arithmetic in double precision with outward rounding. Every Poincare map is the rigorous
`IPoincareMap` (first crossing of t1 = 0 from t1 < 0 to t1 > 0) applied to a Lohner set; the section-coordinate
derivative is Pi DP L, where DP is CAPD's enclosure of the derivative of the 4-dimensional Poincare map and L the
interval enclosure of the derivative of the lift. Configurations: `configs/*.cfg`.

Design choice forced by the measurements. CAPD's C^1 enclosures are pessimistic for this vector field: over one
return the width of the enclosure of the derivative is about 5e4 times the width of the initial box, while the
true second derivative of the time-3 flow is about 300 (finite differences, `scratch` diagnostics), and the
overestimation compounds over several returns. So the proof never uses a C^1 enclosure over more than one
return: (i) the local box N0 is small and thin (a = 2.5e-5, b = 4e-8 at E = 0) and uses the single return P,
whose fixed point has multiplier about -3.5; (ii) along the homoclinic excursion, the C^0 enclosures Y_i of the
images of a piece are carried through the returns by one Lohner set, and the tangent lines are pushed through
the one-return derivative enclosures D f(Y_i) as exact interval images of slope intervals (a Moebius map
evaluated on 16 sub-intervals), which does not suffer the wrapping of interval matrix products.

Results ([data/E0.log](data/E0.log), [data/Ehalf.log](data/Ehalf.log), [data/Eminushalf.log](data/Eminushalf.log)):

| E | alpha | mu | max cone ratio | k | edge images (t2, shifted) | slope dp2/dt2 at the crossing |
|---|---|---|---|---|---|---|
| -1/2 | 1e-3 | 2.88345 | 6.03e-4 | 11 | [-8.05e-4, -7.88e-4] and [8.92e-4, 9.09e-4] | [-8.29, -0.0937] |
| 0 | 1e-3 | 3.52385 | 3.64e-4 | 9 | [1.519e-3, 1.522e-3] and [-3.118e-3, -3.115e-3] | [-6.21, -0.524] |
| 1/2 | 1e-3 | 2.99875 | 3.04e-4 | 11 | [3.693e-3, 3.707e-3] and [-5.347e-3, -5.333e-3] | [-21.4, -0.279] |

Robustness at E = 0 ([data/robustness_E0.log](data/robustness_E0.log)): Taylor order 12 and 30 instead of 20,
and a finer cover (1500 boxes, 50 pieces), all pass with the same conclusions.

## 6. Numerics (numerical, not part of the proof)

- `code/explore.cpp`: Poincare sections at E = -1, -1/2, 0, 1/2.
- `code/scan.cpp`: symmetric periodic orbits by shooting along Fix(G) (points z on Fix(G) with P^m(z) on
  Fix(G)); the orbit used is the fixed point of P with the smallest multiplier found at each energy.
- `code/manifold.cpp`: samples a fundamental domain of W^u(p) (log-spaced from s0 along v_u), iterates it and
  reports the crossings of Fix(G) with their slopes. At E = 0 the first crossings appear after 11 returns from
  s0 = 1e-6 (branch -v_u, s = 1.5174e-6, slope -1.336); the proof uses the same crossing two returns later on the
  fundamental domain (s = 1.886e-5, k = 9).

## 7. Controls

- Integrable limit ([configs/control_uncoupled_E0.cfg](configs/control_uncoupled_E0.cfg)): two uncoupled
  pendulums H0 = p1^2/4 + p2^2/2 - 2 cos t1 - cos t2 at E = 0. Stages 1 and 2 pass (the upright lower pendulum is
  a hyperbolic fixed point, multiplier 848.1), stage 3 fails: its unstable manifold is the separatrix
  p2 = 2|cos(t2/2)|, whose crossing of t2 = 2 pi is tangent to the horizontal, and the certified slope interval
  still contains 0 at bisection depth 16 ([-5.4e-9, 1.0e-8]). The method does not certify a horseshoe there.
- Mutations: moving the segment so that both edge images lie on one side of Fix(G) fails (C4); narrowing the
  cone to alpha = 1e-4, below the measured ratio 3.6e-4, fails (C1).

## 8. Independent adversarial check

An independent agent reran everything from a copy and tried to break it; its full verdict and its independent
code are in [check/](check/) (`VERDICT.md`, Python/Arb programs `common.py`, `dparb.py`, `mvint.py`, `kraw3.py`,
`otherE.py`, `edges_nr.py` with their outputs). Verdict: **confirmed, with minor caveats**.

- Rerun: field check OK, the three energies PROVED, the three controls fail; logs identical up to line order.
- 22 mutations of the model and configuration: gravity x2.01 and x(1 + 1e-7), the coupling sign, the other square
  root branch of the lift, the opposite crossing direction and a wrong shift all fail stage 1; a sign error in the
  lift derivative fails stage 2; k = 8 or a wrong target line fail stage 3; alpha = 0.1 fails stage 2. Gravity
  x(1 + 1e-14) passes, legitimately (the fixed point moves by about 1e-14, inside the 1e-9 box).
- Mutations of the checking code: removing the hit test is caught; weakening mutations pass, as they must. The
  stage-3 derivative chain is load-bearing and not self-checking: dropping a factor or reversing the order still
  prints PROVED with a different slope interval. The shipped chain was checked by reading and by the independent
  slope below; a factor-count assertion has since been added to `prove.cpp`.
- Independent recomputation (own Python and Arb code, not CAPD). Rigorous at E = 0: Krawczyk on a box of radius
  1e-17 succeeds, symmetric under G, trace -3.808656368 +- 8e-10, det 1 +- 1.2e-9, lambda_u = -3.52496566; the
  fixed point lies inside CAPD's enclosure. At E = +-1/2, rigorous evaluation at a single point (not a full
  Krawczyk) agrees on trace, return time and multiplier. Numerical at high precision, E = 0: the edge images after
  9 returns are t2 = +1.52049688e-3 and -3.11657765e-3 (inside CAPD's intervals); the crossing is at
  x = -1.88595114e-5, p2 = 0.822148, slope -1.3362021, inside the certified [-6.21, -0.524].
- Prior art: the quotes of Section 2 verified verbatim against the open copies; Bolotin-Negrini (1997) and
  Bolotin's 1995 chapter were not reachable for the checker either; five further searches found no proof.
- Mathematics: reversibility, Krawczyk, Lemmas 1-3, Smale-Birkhoff with Abramov and the Kozlov argument hold.
  Fixed after the check: Corollary 3 now states why M_E stays in U (H is proper); the note that det = 1 exactly;
  the section reference in Section 1; stage-2 inequalities that were compared in doubles are now decided in
  interval arithmetic (worst case over the enclosure of p), and the last piece of the segment cover ends exactly
  at x2. The three proofs and three controls were rerun after these changes with the same outcomes.

## 9. Limitations

- The proof trusts CAPD's rigorous integrator and Poincare map and the C++ compiler and floating-point rounding
  of this machine. Our sets start on the section. CAPD's documentation says the initial point "does not need to
  be on Poincare section"; its source (`PoincareMap_templateMembers.h`, `integrateUntilSectionCrossing`) first
  steps the set off the section, without looking for crossings, until the section function has the sign that
  precedes a crossing in the requested direction (here t1 < 0). Every step calls `checkTransversability`, which
  throws unless the vector field is transversal to the section on the part of the step enclosure that meets it,
  so a step contains at most one crossing, in one direction. Hence the departure phase ends right after the
  first downward crossing, and no upward crossing (a return) can be skipped. This is our reading of the code,
  not a documented guarantee.
- Corollary 3 uses an unquantified persistence argument, and may be implied by Bolotin-Negrini (1997), unread.
- No explicit entropy bound: Smale-Birkhoff gives an iterate N but no value.
- Meromorphic non-integrability (Morales-Ramis; Salnikov's monodromy computation made rigorous) was not
  attempted.
- Only three energies are proved; nothing is claimed for other E, although the orbit family and the crossing
  were followed numerically between them.

## 10. Rerun

    sh research/double-pendulum/code/run_all.sh      # builds CAPD (pinned) and the programs, about 8 minutes on 4 cores

Prints PROVED for E0, Ehalf, Eminushalf and "fails, as it must" for the three controls; logs go to `data/`.
Single runs: `_bin/prove configs/E0.cfg <threads>`. Requirements: g++, cmake, python3 with sympy.
