# Adversarial reading of the mathematics: `papers/nf-pulse`

Reviewer: hostile referee (mathematics only), 2026-09-26. Scope: whether the theorem in `README.md` follows from the
hypotheses that `code/run_all.sh` checks. The correctness of the Lohner integrator's code and of the ball arithmetic
library is assumed here and is audited by other reviewers.

Everything below was either proved by hand in this file, reproduced by running the chain, or tested by the scripts in
this folder. Labels: **confirmed** (proved here or reproduced), **refuted** (shown false), **unconfirmed** (not proved or
not reproduced here). Severities: **must-fix**, **should-fix**, **nit**.

What was run: `sh code/run_all.sh` from a copy in the scratchpad (not in the repository): all 15 lines OK, 7.4 s. The
scripts in this folder:

| Script | What it checks |
|---|---|
| `charpoly_check.py` | the 4D and 5D characteristic polynomials by exact rational evaluation; the 5D line of equilibria; a numerical eigenvalue count over c in [0.01, 100] |
| `surface_check.py` | Y - S(U) at the validated manifold points for c1, c2 and the interval; the series identity that forces Y = S(U) |
| `block_points_check.py` | floating-point sampling (evidence, not proof) of (C) and (E) with the nonlinear field on the block that `prove_pulse.py` actually uses |

## Summary

No must-fix gap found. The theorem follows from the checked hypotheses **provided** the missing written arguments are
supplied with the right definitions; I give those arguments below (Sections 1, 2, 5, 6). Three of the README's
statements are imprecise in a way a referee would reject as written (F1, F2, F5), and the certificate on disk
describes a different block from the one the proof uses (F3).

| # | Severity | Finding | Status |
|---|---|---|---|
| F1 | should-fix | "the set of speeds whose orbit enters each cone is open" is not true for the literal reading (enter the cone at any later time); it holds, with disjointness, for the definition in Section 6 (enter the cone while the path since xi = 53 stays in int B), which is what the code checks | README wording refuted as stated; corrected argument confirmed |
| F2 | should-fix | "isolating block" and "K+ and K- are forward invariant in B" are not what is proved. No exit condition is checked on the face \|y1\| = r or on the part of \|y'\| = rho where L > 0, so B is not shown to be isolating; the cones are invariant only relative to B (while the orbit stays in B). The shooting argument does not need more (Section 6) | confirmed that the stronger properties are unverified; confirmed they are unnecessary |
| F3 | should-fix | `data/block_certificate.json` and the run_all line "B: block around rest certified" describe r = 1.25 rho, rho = 0.00786; the proof uses r = 4 rho, rho = 0.0072689 (`NF_R_OVER_RHO` default 4 in `prove_pulse.py`). `prove_pulse.py` re-asserts (C), (E) and the U-range for its own block, so the proof is sound, but the certificate a reader checks is not the block used, and the mpmath re-check (`block_check_iv.py`) checks the matrices only, not the U-range bound that fixes [smin, smax] | confirmed |
| F4 | should-fix | Openness of E+ and E- needs continuity of kappa -> P_kappa(1/4). Not stated anywhere. It follows from the tail bound being validated on the whole kappa ball (Section 4.5) | confirmed (argument below) |
| F5 | should-fix | "the surface Y = S(U) is invariant" is true but not what is needed: the 5D rest point is **not isolated** (a line of equilibria (0, a, a, 0, a), eigenvalue 0 of the 5D Jacobian), so one must show the specific manifold orbit lies on the surface. Proof in Section 2 | confirmed |
| F6 | nit | `block.py` justifies checking (E) only at s in {smin, smax} by "the sets involved are convex"; the correct reason is that the quantity bounded (Gershgorin bound plus the 2-norm of At21) is a convex function of s | confirmed (the conclusion holds) |
| F7 | nit | "U reaches about 0.76": the runs give a rigorous lower bound 0.75966 (max of U over step-end enclosures, interval run) and no upper bound; label it | confirmed |
| F8 | nit | the negative control at c = 1.1024 uses a block certified only for kappa in [1/c2, 1/c1]; it fails before the block matters (escape from \|x\| < 5 at xi about 14.6), so it is a control of the shooting, not of the block | confirmed |
| F9 | nit | README: "a homoclinic orbit of this system is exactly a pulse" asserts an equivalence; only homoclinic implies pulse is proved and used. The README never says which way the pulse moves; `nfcore.py` says left, which is right (Section 1) | confirmed |

## 1. Reduction to the wave ODE

**Claim 1a (confirmed).** Let f be bounded and continuous on R. The bounded solutions of Q - Q'' = f are exactly
Q = w * f, w(x) = e^(-|x|)/2.
*Proof.* w * f is bounded by sup|f| (w >= 0, integral 1). Writing (w*f)(x) = (1/2) e^(-x) int_{-inf}^x e^y f(y) dy +
(1/2) e^x int_x^inf e^(-y) f(y) dy and differentiating twice gives (w*f)'' = w*f - f, so it is a C^2 bounded solution.
The difference D of two bounded solutions solves D'' = D, so D = a e^x + b e^(-x), bounded only when a = b = 0. QED.

**Claim 1b (confirmed).** Let (U, V, Q, P) be a solution of U' = kappa (Q - U - V), V' = eps kappa U, Q' = P,
P' = Q - S(U) (gamma = 0) with (U, V, Q, P) -> x* = (0, S(0), S(0), 0) as xi -> +-inf, kappa = 1/c > 0. Then
u(x, t) = U(x + ct), v(x, t) = V(x + ct) solves u_t = -u - v + w * S(u), v_t = eps u.
*Proof.* Q is bounded (convergent at both ends, continuous) and Q - Q'' = S(U) with S(U) bounded continuous, so
Q = w * S(U) by 1a. Then u_t = c U' = c kappa (Q - U - V) = -u - v + w * S(u) (convolution in x commutes with the
shift xi = x + ct at fixed t), and v_t = c V' = eps U = eps (u - 0 v). QED.

**Claim 1c (confirmed).** Direction and limits. A level set xi = xi0 is x = xi0 - ct, so for c > 0 the pulse moves
toward negative x, as `nfcore.py` says. The equilibria of the 4D wave ODE: V' = 0 forces U = 0 (gamma = 0), P' = Q' = 0
forces P = 0 and Q = S(0), U' = 0 forces V = Q = S(0). So x* is the unique equilibrium, and (U, V) -> (0, S(0)) is
the right limit. The same holds for the IDE's spatially homogeneous rest states: v_t = eps u = 0 gives u = 0, then
0 = -v + S(0). With gamma = 0 the v equation does not pin v; the u equation does. The README's limits are right.

## 2. The fifth variable Y

**Claim 2a (confirmed).** The 5D field (Y' = beta Y (1 - Y) U', P' = Q - Y) has the line of equilibria
{(0, a, a, 0, a)}, and det(l I - A5) = l p(l). *Evidence:* exact rational evaluation at 400 random points and
the field at three values of a (`charpoly_check.py`); by hand: the Y column of A5 is (0, 0, 0, -1, 0)^T and row 5 is
s times row 1, so expanding gives the factor l. Hence x* is **not** hyperbolic in 5D, and "Y = S(U) is invariant"
alone does not place the computed orbit on the surface.

**Claim 2b (confirmed).** The orbit x(xi) = P(e^(lam xi)/4) (xi <= 0) lies on Y = S(U).
*Proof.* E = Y - S(U) satisfies E' = beta U' (Y(1 - Y) - S(1 - S)) = a(xi) E with a = beta U' (1 - Y - S(U)). Since
P is analytic at 0, |x(xi) - x*| <= C e^(lam xi), so a is integrable on (-inf, 0] and E(xi0) -> 0 as xi0 -> -inf.
Then E(xi) = E(xi0) exp(int_{xi0}^{xi} a) -> 0 as xi0 -> -inf, so E = 0. QED. Consequently the 5D solution from
P(1/4) coincides (in its first four components) with the 4D solution, for all xi.
*Evidence:* `surface_check.py` finds Y - S(U) enclosing 0 at t = 1/4, 1/2, 1, -1/4 (radius 3e-76 at c1), and the
identity n Y_n = beta sum_j (Y(1 - Y))_{n-j} j U_j for every n <= 80.

**Claim 2c (confirmed).** The integrator treats Y as independent; the block argument does not rely on Y = S(U) for
the *enclosures*, because every enclosure contains the true solution (which is on the surface by 2b). The block and
the cone condition are formulated in the 4D system (A4 has -s in the P row, `T6` has zero columns for Y and kappa),
and they are applied only to the true orbit, which solves the 4D system. Nothing in B depends on Y.

## 3. Eigenvalues at rest

**Claim 3a (confirmed).** det(l I - A4) = p(l) = (l^2 + k l + eps k^2)(l^2 - 1) + s k l
= l^4 + k l^3 + (eps k^2 - 1) l^2 + k (s - 1) l - eps k^2. Derived by elimination (V = eps k U / l,
Q = -s U / (l^2 - 1), then multiply the U row by l (l^2 - 1)); matches `charpoly_coeffs` and the exact check.

**Claim 3b (confirmed).** For every k > 0 and s = S'(0) < 1: signs of the coefficients are +, +, ?, -, -, one change
whatever the middle sign, so exactly one positive root (Descartes). p(i w) = (w^2 - eps k^2)(w^2 + 1)
+ i k w (s - 1 - w^2): the imaginary part vanishes only at w = 0 (s < 1), and p(0) = -eps k^2 != 0. So no root on
the imaginary axis for any k > 0; the number of roots in Re l > 0 is constant on (0, inf); at the bracket it is 1
(R3(iii), four real simple roots, one positive). Hence one unstable (the positive root) and three roots with
Re l < 0 for every c > 0. Numerically these three are complex for c in about (0.070, 0.253) and real outside
(`charpoly_check.py`, not rigorous). s = 20 e^5/(1 + e^5)^2 = 0.1329 < 1 is certified. Only the count on the kappa
interval is used by the theorem; the "every c > 0" statement is extra.

**Claim 3c (confirmed).** The fifth eigenvalue is 0 (2a). It is harmless: the manifold equation needs
n lam - A5 invertible for n >= 2, and n lam > 0 differs from 0, from the negative-real-part roots, and from lam.

## 4. The unstable manifold (`manifold.py`)

**4.1 Homological equation (confirmed).** F(x* + y) = A5 y + e_Y g(y), g = beta k ((1 - 2 Y0) y_Y w - y_Y^2 w),
w = y_Q - y_U - y_V (Y(1 - Y) = Y0(1 - Y0) + (1 - 2 Y0) y_Y - y_Y^2 and w vanishes at rest; only the Y row is
nonlinear because P' = Q - Y is linear in 5D). Matching t^n in lam t P' = F(P): (n lam - A5) a_n = e_Y g_n, where g_n
involves only a_1..a_{n-1} (g is at least quadratic and y has no constant term). The code's convolution sums
(j = 1..n-1, with yY2 built from indices below n) implement exactly this.

**4.2 Resolvent (confirmed).** Solving (mu - A5) z = e_Y by hand: z_Y = s z_U + 1/mu, z_V = eps k z_U / mu,
z_Q = -z_Y/(mu^2 - 1), z_P = mu z_Q, z_U = -k / p(mu). Matches `zsolve`. For mu >= 2, p(mu) >= mu^2 (mu^2 - 1) >= (3/4) mu^4
(the other terms are >= 0 since k, eps, s >= 0), and each bound in `zbound` follows and decreases in mu. mu0 =
81 lam_lo is about 78 >= 2, and n lam >= mu0 for every n > 80 and every lam in its ball.

**4.3 Banach-algebra bound (confirmed).** With h the tail, g(abar + h) - g(abar) = bk [(1 - 2 Y0)(Yb hw + hY Wb + hY hw)
- (Yb^2 hw + 2 Yb hY Wb + 2 Yb hY hw + hY^2 Wb + hY^2 hw)]; `Z(r)` is the l^1 (weight 1) bound of exactly these
terms, with ||hw|| <= r_U + r_V + r_Q. G0 bounds sum_{n>N} |g_n(abar)| from the exact product polynomial.

**4.4 Tail induction (confirmed).** Let h* be the exact tail (formal, defined by the recursion) and h^(M) its
truncation to N < n <= M. T(h)_n depends on h_m, m < n, so h^(M+1) is the truncation of T(h^(M)); if
h^(M) in B_r then ||h^(M+1)_i|| <= ||T(h^(M))_i|| <= K_i (G0 + Z(r)) <= K_i rho = r_i. Base h^(N) = 0. So every
truncation, hence h*, is in B_r; the series converges on |t| <= 1 with |P_i(t) - poly| <= r_i |t|^(N+1). No
contraction is needed, as the docstring says.

**4.5 Kappa interval and continuity (confirmed; F4).** All balls enclose the value for each kappa in the ball, with
lam(kappa) in the lam ball (dependency lost, still valid). Because the bound sum_{n>N} |a_n(kappa)| <= r holds
uniformly for kappa in K = [1/c2, 1/c1] (the interval validation passes), and each a_n(kappa) is continuous
(lam(kappa) is a simple root, v(kappa) is continuous), P_kappa(1/4) is a uniform limit of continuous functions, so
it is continuous in kappa. This is needed in Section 6 and is not written anywhere.

**4.6 Branch (confirmed).** a_1 = sigma v with v_U = 1 and sigma = 1/7 > 0 (`prove_pulse.py` fixes sigma = 1/7 and
re-validates). For xi -> -inf, U(xi) = (sigma/4) e^(lam xi) + O(e^(2 lam xi)) > 0 and increasing: the orbit leaves
rest on the branch where U increases.

## 5. The block lemma (`block.py`, `block_check_iv.py`)

Notation: y = T(x - x*) in the 4D system, D = diag(1, -1, -1, -1), L(x) = y^T D y, B = {|y1| <= r, |y'| <= rho}.

**5a Mean value reduction (confirmed).** For x in B, F(x) - F(x*) = A4(s, k)(x - x*) with a single
s = (S(U) - S(0))/U: only the P row is nonlinear, and it is exactly Q - s U. s lies in [S'(-dU), S'(dU)] because
|U| < dU (U-range bound by Cauchy-Schwarz, `u_range`, value 0.04866 < 0.05 for the proof's block) and
S'' = beta^2 S(1 - S)(1 - 2S) > 0 for u < theta = 1/4, so S' is increasing on [-dU, dU]. Y does not enter.

**5b (C) gives dL/dt > 0 in B \ {x*} (confirmed).** dL/dt = y^T (D At + At^T D) y with At = T A4 Tinv; H = D At + At^T D
is affine in s for fixed kappa, PD at both ends for every kappa in the ball (interval Sylvester in arb; interval
Cholesky in mpmath), so PD for every s in between and every kappa, uniformly: dL/dt >= delta |y|^2. This holds at every
point of B (via 5a), not only at sample points. Sampling of the nonlinear field over 200 000 points of the proof's
block gives min (dL/dt)/|y|^2 = 0.248 (`block_points_check.py`).

**5c (E) gives strict entrance on {|y'| = rho, L <= 0} (confirmed).** d/dxi |y'|^2 / 2 = y'^T sym(At22) y' +
y'^T At21 y1 <= (lam_max(sym At22) + |At21|) |y'|^2 when |y1| <= |y'|. The Gershgorin plus 2-norm bound is convex in s
(F6), negative at both ends for every kappa, hence negative for all s. Sampled maximum of (d|y'|^2/dxi)/rho^2 on that
face: -0.241.

**5d Relative invariance of the cones (confirmed).** If x(xi) in B on [a, b] and L(x(a)) > 0 then L > 0 on [a, b] (L is
increasing there) and y1 keeps its sign (y1 = 0 forces L <= 0). This is the correct form of "K+ and K- are forward
invariant in B" (F2): an orbit in K+ may leave B, through |y1| = r or through the part of |y'| = rho where L > 0; no
condition on those faces is checked.

**5e Orbits that stay in B tend to rest (confirmed).** L is bounded on B and dL/dt >= delta |y|^2, so
int |y|^2 < inf; y' is bounded, so y -> 0.

**5f "Isolating" (F2).** Not verified, and not needed. The Wazewski argument in Section 6 uses only 5b, 5c, 5d, 5e.

## 6. The shooting argument

Let K = [1/c2, 1/c1] and x_kappa the solution with x_kappa(0) = P_kappa(1/4). Checked: x_kappa(53) in int B for every
kappa in K (interval run). Define

    E+ = {kappa in K : there is xi1 >= 53 with x_kappa([53, xi1]) in int B, L(x_kappa(xi1)) > 0, y1 > 0},

and E- with y1 < 0. (This is the definition that makes F1 true; "enters the cone" without the path condition is
neither obviously open nor disjoint, since an orbit may leave B and come back into the other cone.)

**Openness (confirmed, given 4.5).** x_kappa0([53, xi1]) is a compact subset of the open set int B and x_kappa0(xi1)
lies in the open set {L > 0, y1 > 0}; continuity of kappa -> x_kappa on [0, xi1] (continuous dependence on the initial
point and on kappa, plus 4.5) keeps both for nearby kappa in K.

**Disjointness (confirmed).** If kappa is in both with times xi_a < xi_b, then x([53, xi_b]) is in int B, L > 0 at
xi_a, so by 5d L > 0 and y1 keeps its sign on [xi_a, xi_b]: contradiction.

**Nonempty (confirmed from the checks).** c1 run: the step-range enclosures from 53 to t_K = 58.375 lie in int B and
the enclosure at t_K satisfies -y1 > |y'|: 1/c1 in E-. c2 run: same up to t_K = 57.75 with y1 > |y'| (margin about
0.8 per cent of |y'|, rigorous): 1/c2 in E+. The step-range enclosure (Taylor polynomial of the hull on [0, h] plus
the Lagrange term from the a priori enclosure W) is a valid enclosure of the path.

**Complement (confirmed).** K is connected, so some kappa* in K is in neither set, and kappa* is interior (the ends
are in E- and E+), so c* = 1/kappa* is in (c1, c2). For kappa*: let xi_e be the first time >= 53 with x not in int B.
If xi_e is finite, x(xi_e) is on the boundary. If L(x(xi_e)) <= 0 then |y1| <= |y'|, which with r = 4 rho > rho
forces |y'| = rho, and by 5c |y'| > rho just before xi_e, contradicting x in int B on [53, xi_e) (xi_e > 53 since
x(53) is interior). So L(x(xi_e)) > 0, hence L > 0 and x in int B slightly earlier, and kappa* would be in E+ or E-.
So xi_e is infinite, x stays in B, and x -> x* by 5e. With 4.6 and 2b the orbit is homoclinic, nonconstant
(U(0) = 0.0355 > 0), and Section 1 turns it into the pulse.

**No other exit (confirmed).** Exit through a boundary point with L <= 0 is impossible by the argument above; every
other boundary point has L > 0 and so belongs to the cone case. No isolating property is needed.

## 7. Hypotheses versus checks

Each proof hypothesis and the check that verifies it:

| Hypothesis | Verified by |
|---|---|
| s = S'(0) < 1; count of eigenvalues on K; lam enclosed | R (run_all line 1), and re-derived inside `prove_pulse.py` (`refine`) |
| manifold tail bound for sigma = 1/7 on the kappa ball, c1, c2 | `assert ok` inside `prove_pulse.py` (the run_all M lines use `choose_sigma`, which also returns 1/7) |
| (C), (E) for kappa in K, s in [S'(-0.05), S'(0.05)] | `bl.check` asserted inside `prove_pulse.py`; B line; iv re-check |
| U-range of the proof's block < 0.05 | loop in `prove_pulse.block_data` only (F3: no separate line, not in the iv re-check) |
| x_kappa(53) in int B for all kappa in K | P interval |
| 1/c1 in E-, 1/c2 in E+ | P c1, P c2 |

Needed but verified by no check (mathematics to be written, all proved in this file): the reduction (1), Y on the
surface (2b), the tail induction (4.4), continuity in kappa (4.5), the mean value reduction and relative invariance
(5a, 5d), and the shooting argument with the Section 6 definitions. Also assumed and outside this review: correctness
of the Lohner step and of the step-range enclosure code, and of arb and mpmath.iv.

Not examined here (unconfirmed): the README's statement that gain 12 gives complex eigenvalues at rest; the numerical
speed to 55 digits; the remark about a slow pulse; the priority and literature claims.
