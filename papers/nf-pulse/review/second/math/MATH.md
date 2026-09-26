# Adversarial reading of the mathematics: nf-pulse (2026-09-26)

Scope: the computer-assisted proof in `papers/nf-pulse/code/` of a fast travelling pulse of the Pinto-Ermentrout
field at beta = 20, theta = 1/4, eps = 1/10, gamma = 0, with c in (c1, c1 + 1e-25). I read `README.md`,
`notes/QUALITY.md` and every file in `code/`. I ran `run_all.sh` on a copy under the scratch directory (all 15 lines
OK, 8 s) and nothing in `code/` or `data/` was modified. The review scripts in this folder:

| Script | What it checks |
|---|---|
| `check_equilibria.py` | equilibria of the 4D and 5D systems, the spectrum at rest, the characteristic polynomial, the Re > 0 count for c in [1e-3, 1e3], the closed-form resolvent of `manifold.zsolve`, and the identity for W = Y - S(U) |
| `check_block.py` | the block actually used by `prove_pulse.py` (r = 4 rho), re-checked in `mpmath.iv` with a pivoted interval inverse: (C) by interval Cholesky, (E), and the U-range; then a sampling test on the nonlinear field |
| `check_manifold_orbit.py` | the invariance equation and the surface Y = S(U) on the validated series; the tail bound against the actual coefficients 81..120; an independent 4D `mpmath.odefun` integration (no Y embedding) from P(1/4) at c1 and c2 |

Run from this folder with `python3 <script>`. The third takes about 3.5 minutes.

## Verdict

I found **no gap that invalidates the theorem**. Each of steps (a) to (g) has a complete argument, written below,
and the code checks hypotheses that are sufficient for it. The suspected line of equilibria exists **only in the
5D polynomial embedding**, not in the 4D wave ODE in which the block, the cones and the convergence argument live,
and the orbit used lies on the invariant surface Y = S(U); it therefore does not affect the proof. It does affect
how the proof has to be written, and one docstring states something false about it. There are no must-fix items
for the mathematics of the computer proof. There are should-fix items for the write-up and for the independent
re-check. The QUALITY items 1 and 6 still stand: none of what follows is in a manuscript yet.

## Findings

| # | Severity | Finding | Evidence |
|---|---|---|---|
| F1 | should-fix | The 5D embedding (U, V, Q, P, Y) has a **line of equilibria** {(0, v, v, 0, v) : v in R} through x*, and its Jacobian at x* has an eigenvalue 0 in addition to the four of the 4D system. `nfcore.rest_state` says "the only equilibrium is U = 0, V = Q = Y = S(0), P = 0", which is false for the 5D system it sits in. The 4D rest state is isolated (det J4 = -eps kappa^2 != 0). The proof is unaffected (see (a), (b)), but a manuscript must state that the equilibrium count, the eigenvalue count and the block all refer to the 4D system, and must prove that the manifold orbit lies on Y = S(U). | `check_equilibria.py`: F5(0,v,v,0,v) = 0 for v = 0.1, 0.5, S(0); eig J5 = {0.96876, 0 (to 2e-52), -0.12465, -0.58311, -1.16782}; det J4 = -0.0822332... = -eps kappa^2. `nfcore.py` line 59-60. |
| F2 | should-fix | The block certified by the `run_all` line "B: block around rest certified" (`block.py` main, r = 1.25 rho) is **not** the block the proof uses. `prove_pulse.block_data` recomputes rho for r = 4 rho (`NF_R_OVER_RHO`, default '4') and re-certifies (C), (E) with an `assert`, so the proof is sound, but the label is misleading and the independent re-check `block_check_iv.py` checks (C) and (E) only; it never checks the U-range of any block. (C) and (E) do not depend on r/rho, the U-range does. | `prove_pulse.py` lines 32-48; `block.py` main uses `rho * arb('1.25')`; `block_check_iv.py` has no U-range. `check_block.py` closes the gap: U-range of the proof block <= 0.0486589 < 0.05 in `mpmath.iv`, and (C) passes by interval Cholesky with a pivoted interval inverse. |
| F3 | should-fix | (E) is certified only on the part of the side face {\|y'\| = rho} with \|y1\| <= rho (that is L <= 0), which is exactly what the lemma needs; it is **false** as a bound on the whole side face (the same Gershgorin-Frobenius bound with \|y1\| <= r = 4 rho is +0.0403 at s = smax). So orbits may leave B through the side face while in a cone, and E+ and E- must be defined by "reaches the cone before leaving B", with openness proved at the first time L > 0 (which is in int B). Defining them by the face \|y1\| = r would be wrong. The write-up has to spell this out; the code is consistent with the correct version. | `block.py` lines 99-110 (check uses \|y1\| <= rho through the plain sum); `check_block.py`: (E) margins -0.0596, -0.0484 on \|y1\| <= rho, and -0.0259, +0.0403 with \|y1\| <= r. |
| F4 | should-fix | The reduction "a homoclinic orbit is a pulse" and the manifold-to-surface statement are only asserted ("the surface Y = S(U) is invariant"). Invariance of the surface alone does not put the computed orbit on it; one needs that the 5D unstable manifold of x* lies in the surface. Proof below ((b)); it is short and should be in the manuscript. | `nfcore.py` docstring; `README.md` Method. |
| F5 | nit | `C1`, `C2` are `arb(fmpq(...))` of non-dyadic rationals, so they are balls of radius about 2^-256, not the exact endpoints. Harmless: every run then covers a slightly larger set of kappa containing the exact endpoint. A manuscript should say "kappa in a ball containing 1/c1". | `certify_rest.py` lines 43-44. |
| F6 | nit | `interval_pd` applies Sylvester's criterion to the non-symmetrised ball matrix H. This is valid (arb's determinant encloses the determinant of every point matrix in the box, in particular of the true symmetric H), but the reason should be stated. `block_check_iv.py` symmetrises by hulls, which is also valid. | `block.py` lines 77-86. |
| F7 | nit | The comment "coefficients n <= N of g(abar) must be those used in the recursion" is not checked in code; it is automatically true, because g_n depends only on a_1..a_{n-1}. | `manifold.py` line 127. |
| F8 | nit | R3 (i)-(ii) "for every c > 0" is proved in a code comment, not by computation. It is correct (proof in (c)) and it is not needed by the proof, which uses only the certified root count on the kappa ball. The manuscript should say which of the two it uses. | `certify_rest.py` lines 139-141. |
| F9 | nit | The direction convention is stated only in `nfcore.py` ("c > 0: the pulse moves to the left"), not in `README.md`. It is correct: with xi = x + ct and c > 0 the level sets are x = const - ct. The front (the side where the orbit leaves rest) is at xi -> -infinity, i.e. the leading (left) side, and V builds up behind it (V' = eps kappa U > 0 while U > 0), which is the right physics. | `nfcore.py` line 25. |
| F10 | nit | Consistency check worth a sentence in the paper: with gamma = 0, V(+inf) - V(-inf) = eps kappa times the integral of U, so every pulse has zero mean U and must undershoot rest. This is why V returns to S(0) and not to another value, and why U goes negative. | algebra |

## Step (a): reduction to the wave ODE; the rest state

**Convention.** u(x, t) = U(xi), v = V(xi), xi = x + ct, c > 0. Then u_t = c U', so the pulse moves to the left at
speed c (F9). Convolution in x at fixed t is convolution in xi, so (w * S(u))(x, t) = (w * S(U))(xi).

**Proof.** (1) Let (U, V, Q, P) be a solution of the 4D wave ODE with sup |Q| < infinity. Put h = Q - w * S(U).
Since 0 < S < 1 and w is in L^1, w * S(U) is bounded and C^2, and (1 - d^2/dxi^2) (w * f) = f for bounded
continuous f (because (1 - d^2) e^{-|xi|}/2 = delta). From Q' = P, P' = Q - S(U) we get Q - Q'' = S(U), hence
h - h'' = 0, h = a e^{xi} + b e^{-xi}, and boundedness forces h = 0. So Q = w * S(U), and U' = kappa (Q - U - V),
V' = eps kappa (U - gamma V) with kappa = 1/c are exactly c U' = -U - V + w * S(U), c V' = eps (U - gamma V):
(U, V) is a travelling wave. A homoclinic orbit is bounded, so it gives a pulse.

(2) **Rest.** Equilibria of the 4D system with gamma = 0: V' = eps kappa U = 0 gives U = 0; Q' = P = 0;
P' = Q - S(U) = 0 gives Q = S(0); U' = kappa (Q - U - V) = 0 gives V = Q - U = S(0). So x* = (0, S(0), S(0), 0) is the
**unique** equilibrium, and it is not on a line: V is pinned by U' = 0, not by V' = 0. The Jacobian J4 has
det J4 = p(0) = -eps kappa^2 != 0, so 0 is not an eigenvalue. The PDE's homogeneous rest is the same point
(u = 0 from v_t = eps u, then v = S(0) since the integral of w is 1), so (U, V) -> (0, S(0)) as in the README.

(3) **5D.** In the embedding, U' = 0 gives Q = U + V, V' = 0 gives U = 0, Q' = 0 gives P = 0, P' = 0 gives Q = Y,
and Y' = beta Y (1 - Y) U' vanishes automatically: the equilibria are the line (0, v, v, 0, v), v in R (F1), with
tangent (0, 1, 1, 0, 1). This line meets the surface Y = S(U) only at x*, transversally (dU = 0, dY = 1 on the line,
while the surface has dY = s dU). J5 has eigenvalues {roots of p} union {0}. No step of the proof uses 5D
isolatedness: the block and its lemma are 4D (`block.A4`), and the orbit is on the surface ((b)).

Verdict (a): **proved**; the prime suspect is resolved (isolated in 4D, a line only in 5D, harmless).

## Step (b): invariance of Y = S(U) and the 5D manifold

Let W = Y - S(U). In the 5D field, W' = beta Y (1 - Y) U' - beta S (1 - S) U' = beta U' (1 - Y - S(U)) W, an exact
identity (checked at 200 random points to 4e-50 in `check_equilibria.py`). Hence the surface {W = 0} is invariant,
and on it Y' = S'(U) U', so the fifth equation is the derivative of Y = S(U) and (U, V, Q, P) solves the 4D system.

**The manifold orbit lies on the surface.** Let x(xi) be the 5D orbit P(t e^{lambda xi}), t in (0, 1], so
x(xi) -> x* and x'(xi) -> 0 exponentially as xi -> -infinity. W solves the scalar linear equation W' = a(xi) W with
a = beta U' (1 - Y - S(U)), and |a(xi)| <= C e^{lambda xi}, so the integral of a over (-infinity, xi0] is finite and
W(xi) = W(xi0) exp(-int_xi^xi0 a) tends to W(xi0) times a nonzero number as xi -> -infinity. Since W -> W(x*) = 0,
W(xi0) = 0. So the 5D manifold orbit is the lift of the 4D one. (Equivalently: the lift of the 4D parametrisation
solves the 5D invariance equation with the same a_1, and (n lambda - J5) is invertible for n >= 2, so the
coefficients coincide.) The extra eigenvalue 0 of J5 is not positive, so the 5D unstable direction at x* is still
one-dimensional, spanned by `eigvec_unstable` (Y-component s = S'(0) U-component, tangent to the surface).

Numerically, the 120-term series satisfies lambda t P' = F(P) to 6e-39 and |Y - S(U)| <= 5e-41 on t in [-1, 1]
(`check_manifold_orbit.py`).

Verdict (b): **proved**; the write-up needs this paragraph (F4).

## Step (c): eigenvalues at rest for every c > 0

p(l) = (l^2 + k l + eps k^2)(l^2 - 1) + s k l = l^4 + k l^3 + (eps k^2 - 1) l^2 + k (s - 1) l - eps k^2, k = 1/c
(checked against det(l - J4) and the numerical eigenvalues, residual 6e-51). Coefficient signs +, +, ?, -, -
(since s < 1): exactly one sign change whatever the middle sign, so by Descartes exactly one positive root.
On the imaginary axis, p(i w) = (w^2 - eps k^2)(w^2 + 1) + i k w (s - 1 - w^2); the imaginary part vanishes only at
w = 0 because s - 1 - w^2 < 0, and p(0) = -eps k^2 != 0. So no root crosses the imaginary axis as k varies in
(0, infinity), and the number of roots in Re > 0 is constant. At the certified bracket there are four sign changes
of p on the grid, so four simple real roots, one positive and three negative (`certify_rest.py`); hence exactly
one root with Re > 0 and three with Re < 0 for every c > 0. Sampling 61 values of c in [1e-3, 1e3] agrees.
s = S'(0) = 20 e^5/(1 + e^5)^2 = 0.13296 < 1 is certified in ball arithmetic.

Verdict (c): **proved** (F8: the proof itself needs only the bracket).

## Step (d): unstable manifold, tail, resolvent, Banach algebra

F(x* + y) = J5 y + e_Y g(y) with g = beta kappa [(1 - 2 Y0) y_Y w - y_Y^2 w], w = y_Q - y_U - y_V: correct, because
Q - U - V = 0 at x* and Y (1 - Y) = Y0 (1 - Y0) + (1 - 2 Y0) y_Y - y_Y^2; the linear part beta Y0 (1 - Y0) kappa w
= s kappa w is the Y row of J5.

- **Recursion.** Order n of lambda t P' = F(P): (n lambda - J5) a_n = e_Y g_n(a_1..a_{n-1}). The code's convolution
  (`coefficients`) is the Cauchy product of (1 - 2 Y0) y_Y - y_Y^2 with w, with (y_Y^2)_j using indices < j. Correct.
- **Resolvent.** `zsolve` gives (mu - J5)^{-1} e_Y in closed form; I derived it by elimination (V, Q, P, Y rows,
  then the U row gives z_U = -kappa/p(mu)) and checked it against a direct solve at mu = 2, 7.3, 80 (1e-52).
  For n >= 2, n lambda is not an eigenvalue of J5 (eigenvalues lambda, 0, and three negative), so p(n lambda) > 0.
- **Uniform bound.** For mu >= 2: p(mu) >= mu^2 (mu^2 - 1) >= (3/4) mu^4, because (k mu + eps k^2)(mu^2 - 1) >= 0 and
  s k mu >= 0; the five bounds of `zbound` follow and are decreasing in mu, so K_i >= sup_{n > N} |z_i(n lambda)| with
  mu0 = (N + 1) lambda_lo = 81 x 0.968 >= 2 (asserted). Uniform over the kappa ball.
- **Tail induction.** With abar the exact coefficients n <= N and h the exact tail, h_n = T(h)_n := z(n lambda)
  g_n(abar + h) for n > N, and T(h)_n depends only on h_m, m < n. Let h^(M) be the truncation of the exact tail to
  n <= M. Then h^(N) = 0 is in B_r and h^(M+1) is the truncation of T(h^(M)), so ||h^(M+1)_i||_1 <= ||T(h^(M))_i||_1.
  If T(B_r) is in B_r then all h^(M) are in B_r, and by monotone convergence ||h_i||_1 <= r_i: the exact series
  converges absolutely on |t| <= 1 and, being a convergent formal solution, parametrises the unstable manifold.
- **T(B_r) in B_r.** ||T(h)_i||_1 <= K_i sum_{n > N} |g_n(abar + h)| <= K_i (G0 + ||g(abar + h) - g(abar)||_1),
  G0 = sum_{n > N} |g_n(abar)|. The expansion of the difference in `Z(r)` is term by term correct (c12 (Yb rw + rY Wb +
  rY rw) and the six terms of (Yb + rY)^2 (Wb + rw) - Yb^2 Wb), with ||h_w|| <= r_U + r_V + r_Q. The check is strict
  (`lhs < rho`, then r_i = K_i rho). Ball inputs make Yb, Wb, G0 upper bounds for the exact values.
- **Evaluation.** |sum_{n > N} h_{n,i} t^n| <= r_i |t|^{N+1} for |t| <= 1, added as a ball (`evaluate`).
- **Pairs (kappa, lambda).** kappa and lambda enter as independent balls; the true pairs are among them. `refine`
  certifies opposite signs at both ends for every kappa in the ball, so the ball contains the unique positive root.

Sanity: the tail radii (c1: 3.7e-33, 4.3e-36, 3.2e-31, 2.5e-29, 1.5e-27) dominate the sums of |a_n| for n = 81..120
(1.3e-33, 1.5e-36, 1.2e-31, 9.2e-30, 7.4e-28).

Verdict (d): **proved**.

## Step (e): the block lemma

Setting: 4D, y = T (x - x*), L = y1^2 - |y'|^2, B = {|y1| <= r, |y'|_2 <= rho} with r = 4 rho, U-range of B in
I_U = [-0.05, 0.05], kappa in the ball K = [1/c2, 1/c1].

**Divided difference.** For x in B, F(x) - F(x*) = A(s~, kappa)(x - x*) with s~ = (S(U) - S(0))/U (S'(0) at U = 0),
which by the mean value theorem lies in S'([min(0,U), max(0,U)]) in [S'(-0.05), S'(0.05)] = [smin, smax], because S'
is increasing on (-infinity, theta) and 0.05 < theta. Only the P row involves S, so a single scalar s~ enters,
and y' = At(s~) y with At = T A Tinv.

**(C) holds at every point of B for every kappa in K.** dL/dxi = y^T H(s~, kappa) y with H = D At + At^T D. H is affine
in s for fixed kappa and the positive definite matrices form a convex cone, so PD at s = smin and s = smax for the
same kappa gives PD on [smin, smax]. The code evaluates H at the two s-balls with kappa as one ball, so every
(s endpoint, kappa) pair is covered; interval leading minors > 0 (F6) or interval Cholesky (`block_check_iv.py`
and `check_block.py`) prove PD for all of them. This is a proof for the whole of B and all of K, not a sample.
By compactness there is m > 0 with dL/dxi >= m |y|^2 on B for each fixed kappa. Numerically the smallest
eigenvalue of H is about 0.195; sampling the nonlinear field gives dL/dxi / |y|^2 >= 0.257.

**(E) strict entrance.** On {|y'| = rho, |y1| <= rho} (the boundary points with L <= 0; the face |y1| = r has
L >= r^2 - rho^2 = 15 rho^2 > 0), (1/2) d|y'|^2/dxi = y'^T At21 y1 + y'^T At22 y' <= rho^2 (||At21|| + lam_max(sym At22))
< 0; the expression is affine in s for fixed y, so the two endpoints suffice. Margins -0.0596 and -0.0484. See F3 for
why the bound is restricted to |y1| <= rho, correctly.

**Cones.** K+ = {L > 0, y1 > 0}, K- = {L > 0, y1 < 0}. While an orbit is in B, L is strictly increasing (unless it is
at x*), so L > 0 persists, and L > 0 forces |y1| > 0, so the sign of y1 persists: K+ and K- are forward invariant
relative to B.

**Staying in B implies convergence.** If x(xi) is in B for all xi >= xi0, L is increasing and bounded, so
int m |y|^2 < infinity; y' is bounded on B, so y is uniformly continuous and y -> 0 (Barbalat). The only equilibrium
in B is x* (4D, (a)); a 5D line of equilibria is irrelevant because the argument is in 4D and the orbit is on the
surface. Hence x -> x*.

**U-range.** `u_range` bounds |U| by |Tinv_00| r + ||Tinv_{0,1:}||_2 rho (Cauchy-Schwarz), with Tinv an arb enclosure
of T^{-1}. For the proof block (r = 4 rho) I re-checked it independently: 0.0486589 < 0.05 (F2).

Verdict (e): **proved**, for every point of B and every kappa in K.

## Step (f): the shooting argument

Let K = [1/c2, 1/c1] and x_kappa(xi) = the 4D projection of the orbit through P_kappa(1/4) at xi = 0.

Facts from the runs: (I) x_kappa(53) is in int B for every kappa in K (`interval` run, all of K and all of the
manifold box at once). (II) for kappa = 1/c1 the orbit stays in int B on [53, t1] and x(t1) is in K- (t1 = 58.375).
(III) for kappa = 1/c2 the same with K+ (t2 = 57.75).

Define E+/- = {kappa in K : there is xi1 >= 53 with x_kappa([53, xi1]) in B and x_kappa(xi1) in K+/-}.

- **Continuity in kappa.** The a_n are continuous in (kappa, lambda(kappa)) (lambda a simple root) and the tail bound
  is uniform on K, so kappa -> P_kappa(1/4) is continuous; the flow depends continuously on (x0, kappa) and exists
  up to xi = 53 + 40 by the enclosures. So kappa -> x_kappa is continuous uniformly on compact xi-intervals.
- **Before the first L > 0 the orbit is in int B.** If x(xi) is in B on [53, xi] with L <= 0 there, it cannot be on
  the boundary at any xi > 53: a boundary point with L <= 0 is a strict entrance point, so the orbit would have been
  outside B just before. At 53 it is interior by (I).
- **Openness.** Let kappa0 be in E+ and tau = inf{xi >= 53 : L > 0}. L(tau) <= 0 or tau = 53, so x(tau) is in int B
  (previous point), L is increasing after tau, and for small delta > 0 the arc [53, tau + delta] is in int B with
  x(tau + delta) in K+ (open). By continuity the same holds for kappa near kappa0. E+ and E- are relatively open.
- **Disjointness.** If the orbit reaches K+ at a and K- at b > a within B, L > 0 on [a, b] and y1 keeps its sign:
  impossible.
- **Nonempty.** 1/c1 in E-, 1/c2 in E+ by (II), (III).
- **Conclusion.** K is connected, so some kappa* in the open interval (1/c2, 1/c1) is in neither set. Its orbit never
  leaves B after 53: at an exit point the orbit is on the boundary but not at a strict entrance point, so L > 0 and
  it is in K+ or K- within B, i.e. in E+ or E-. It also never has L > 0 in B for the same reason. By (e) it tends
  to x*; backwards it tends to x* along the manifold. It is nonconstant (U reaches about 0.76), so it is a
  homoclinic orbit and, by (a), a pulse with c* = 1/kappa* in (c1, c2).

Independent numerics (4D, mpmath `odefun`, no Y embedding): at xi = 53, y = (5.22653e-5, 6.08786e-3, 1.01804e-4,
2.75328e-5) for c1 and (1.04344e-4, 6.08781e-3, 1.01720e-4, 2.74904e-5) for c2, identical to the rigorous centres;
first L > 0 after 53 at 58.375 (K-) and 57.75 (K+); max U = 0.7596. Consistent with the PASS logs.

Verdict (f): **proved**, with E+/- defined as above (F3).

## Step (g): do the checks match the hypotheses?

| Hypothesis | Where checked | Match |
|---|---|---|
| s < 1; four real simple roots on the kappa ball, one positive | `certify_rest.certify` | yes |
| lambda enclosure contains the positive root for every kappa | `certify_rest.refine`, end signs certified; `manifold.py` main asserts them again | yes |
| T(B_r) in B_r, uniform in the kappa ball | `manifold.validate` (`lhs < rho`), called by `prove_pulse` with `assert ok` | yes |
| P_kappa(1/4) enclosed | `manifold.evaluate` | yes |
| Rigorous flow enclosure (Picard a priori set, Lagrange remainder on W, mean-value form over the hull, QR Lohner update) | `lohner.rough_enclosure`, `lohner.step` | yes; the new set is xbar' + C' r0 + B' r' with the (JC - C') R0 term moved into R', which is valid, and xbar is in the hull because R0 and R contain 0 |
| (C) and (E) on the proof block, kappa ball, s endpoints | `prove_pulse.block_data` -> `block.check`, `assert ok` | yes (F2: the `run_all` "B" line is a different block) |
| U-range of the proof block in I_U | `prove_pulse.block_data` loop (`u_range(...) < DU` on a ball rho, then rho := mid, which lies in the ball) | yes; independently confirmed here |
| (I) x_kappa(53) in int B for all kappa | `prove_pulse` `interval`, `in_int_B` on the affine image hull | yes |
| (II)/(III) whole path in int B from 53, then strictly in the cone | `step_range_y` over every step ([0, h] Taylor range on the step's hull plus [0, h^{p+1}] x_{p+1}(W)), `in_K` with y1 lower bound > \|y'\| upper bound | yes; `prevhull` is the hull of the set at the start of the same step, and W is the a priori set of that hull |

Nothing weaker than the hypotheses is checked. The `abs(mid) > 5` escape test and the step-size choice are
heuristics with no role in the logic.

Verdict (g): **matches**, with F2 on labelling and on the scope of the independent re-check.

## What remains (not mathematics of this proof)

- QUALITY item 1: the proofs above, or better ones, must be written in a manuscript.
- The C^0-Lohner code has been read for logic here, not audited line by line for implementation errors such as a
  wrong index or a precision loss; that belongs to the separate code audit and reimplementation.
- Nothing here bears on priority (Zhang 2004, 2005) or on the numerical claims (the 55-digit speed, the slow pulse).
