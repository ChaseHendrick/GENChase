# Referee report: mathematics of the nf-pulse computer-assisted proof

Reviewer: hostile mathematical referee (Claude, agent session), 2026-09-26.
Scope: `README.md`, `code/` (nfcore, certify_rest, manifold, block, block_check_iv, lohner, prove_pulse, run_all.sh),
`notes/QUALITY.md`. I ran `sh code/run_all.sh` (all 15 checks OK, 8 s on 4 cores) and restored `data/` afterwards.
My own scripts are in `review/math/`:

| Script | What it checks | Result |
|---|---|---|
| `01_algebra.py` | exact rational identities: characteristic polynomial (4D and 5D), `zsolve`, eigenvector, split of p(iw), the `zbound` inequality, the 5D line of equilibria, the first integral | all PASS |
| `02_manifold.py` | P(1/4) on the surface Y = S(U); coefficients a_2..a_80 recomputed with plain mpmath and a linear solve; tail to order 400 against the certified r; series against an ODE solve | all PASS; true tails are 0.34 to 0.5 of the certified r |
| `03_block.py` | the block with the true nonlinear S, sampled (floating point, not a proof) | (C), (E) hold on 10^6 samples; min dL/dt / abs(y)^2 = 0.25 |

Verdict in one line: I found **no mathematical error** in the chain. Every hypothesis the argument needs is either
checked in ball arithmetic by the code or follows from a short proof that I write out below. The gaps are that
these proofs are not written anywhere in the folder (acknowledged in QUALITY.md), that two README sentences are
wrong as stated (they need a qualifier), and that two of the 15 harness checks cannot fail. Nothing below makes the
theorem false. Where I could not establish something, it is marked **unconfirmed**.

Notation. x = (U, V, Q, P), x* = (0, S0, S0, 0) with S0 = S(0) = 1/(1 + e^5), s = S'(0) = 20 e^5/(1 + e^5)^2 =
0.13296..., kappa = 1/c, K = [kappa2, kappa1] = [1/c2, 1/c1], delta = 0.05, I_U = [-delta, delta].
The wave field is F_kappa(x) = (kappa (Q - U - V), eps kappa U, P, Q - S(U)).

---

## 1. The reduction

**Travelling-wave substitution.** Put u(x, t) = U(x + ct), v(x, t) = V(x + ct). Since w is even,
(w * S(u(., t)))(x) = integral w(x - y) S(U(y + ct)) dy = integral w(xi - eta) S(U(eta)) d eta = (w * S(U))(xi) with
xi = x + ct. Then u_t = c U' and v_t = c V', so the PDE becomes c U' = -U - V + w * S(U), c V' = eps (U - gamma V).
With kappa = 1/c and Q = w * S(U) this is U' = kappa (Q - U - V), V' = eps kappa (U - gamma V). Correct.

**Green's function.** For f bounded and continuous, Q = w * f is C^2 and Q - Q'' = f, because
(1 - d^2/dxi^2) e^(-abs(xi))/2 = delta in distributions. **Uniqueness of the bounded solution:** if Q1, Q2 are two
bounded C^2 solutions of Q - Q'' = f, their difference solves D - D'' = 0, so D = a e^xi + b e^(-xi), which is bounded
on R only when a = b = 0. Proved.

**Homoclinic orbit gives a pulse.** Let (U, V, Q, P)(xi) solve the 4D wave ODE on R and tend to x* as
xi -> +-infinity. Then Q is continuous with limits, hence bounded, and Q - Q'' = Q - P' = S(U) with S(U) bounded
continuous. By uniqueness Q = w * S(U). Substituting back, (U, V) solves the travelling-wave form of the integral
equation, and u(x, t) = U(x + ct), v(x, t) = V(x + ct) is a classical (C^1 in t, continuous in x) solution of the PDE,
with (u, v) -> (0, S0) as x -> +-infinity at each fixed t. Nonconstant because the orbit is on the unstable manifold
with a_1 != 0. Proved. (The README's "a homoclinic orbit of this system is **exactly** a pulse" also claims the converse;
that needs a definition of "pulse" (bounded, C^1, with limits) and the same uniqueness argument. Not needed for the
theorem; nit.)

**Rest states.** 4D, gamma = 0: V' = 0 forces U = 0; Q' = 0 forces P = 0; P' = 0 forces Q = S(0); U' = 0 forces
V = Q - U = S(0). So x* is the **unique** equilibrium: no line of equilibria in 4D. The PDE's spatially homogeneous
rest state is also unique: u = 0 from v_t = 0, then v = S(0) because integral w = 1. Since there is only one
equilibrium, any orbit bounded and convergent at both ends is homoclinic to the same point, and both limits of the
pulse are (0, S0). The README's "(U, V) -> (0, S(0))" is correct. (With logistic S the rest v is S(0) = 0.0067, not
0 as in Pinto-Ermentrout's Heaviside setting; the README states this correctly.)

Consequence of gamma = 0 worth stating in the paper: integrating V' = eps kappa U over R gives
integral U dxi = 0, so U must change sign. The negative lobe is forced by the model, not a numerical artifact.

**Direction of travel.** The level set xi = const is x = const - ct, which moves to decreasing x: with c > 0 the
pulse travels to the LEFT. `nfcore.py` says so; the README only writes u = U(x + ct) and never states a direction, so
it is not inconsistent. The leading edge is at xi -> -infinity, where the orbit leaves rest along W^u, which is the
physically right side (medium ahead is at rest). **Pinto-Ermentrout's sign convention: unconfirmed** (I could not
read the paper). It does not matter: w is even, so x -> -x maps a left-moving pulse with speed c to a right-moving
one with the same speed; existence is unaffected. The paper should say this in one sentence.

## 2. Invariance of Y = S(U), and the fifth dimension

**The 5D system is not a faithful copy of the 4D one near rest.** In 5D (Y free), every point (0, a, a, 0, a) is an
equilibrium (checked, `01_algebra.py` A8a): there is a **line of equilibria**, and the 5D Jacobian at x* has
characteristic polynomial lambda p(lambda) (A3), i.e. an extra eigenvalue 0 with eigenvector (0, 1, 1, 0, 1). That
eigenvector has dU = 0, dY = 1, so it is **transverse** to the surface Y = S(U) (whose tangent satisfies dY = s dU).
Each equilibrium of the line lies on a different level set of the first integral below; only a = S0 is physical.

**First integral.** For Y in (0, 1) put G = (1/beta) log(Y/(1 - Y)) - U. Along the 5D field,
G' = Y'/(beta Y (1 - Y)) - U' = kappa (Q - U - V) - U' = 0 (checked numerically, A8b, drift 3e-52). On the physical
surface G = -theta.

**Lemma 2.1 (the manifold orbit is on the surface).** Let x(xi) = P(e^(lambda xi)/4), xi <= 0, be the 5D solution
given by the validated parametrisation (section 4). Then Y(xi) = S(U(xi)) for all xi, and the projection to
(U, V, Q, P) solves the 4D wave ODE.
*Proof.* Y solves the scalar linear-in-Y(1 - Y) equation Y' = beta Y (1 - Y) d(xi) with d continuous, so Y cannot
reach 0 or 1 in finite time (uniqueness; Y = 0, 1 are solutions); since Y -> S0 in (0, 1) as xi -> -infinity, Y stays in
(0, 1) for all xi. Hence G is defined and constant, and G -> (1/beta) log(S0/(1 - S0)) - 0 = -theta. So
(1/beta) logit(Y) = U - theta, i.e. Y = S(U). Then P' = Q - Y = Q - S(U), and the other equations are the 4D ones.
The same argument forward in xi shows that the 5D solution from the exact point x0(kappa) stays on the surface for
all xi. QED.

**What the code relies on.** The Lohner integrator encloses the 5D solution from every point of the initial box,
including the exact x0(kappa) = P_kappa(1/4), which lies on the surface by Lemma 2.1. The enclosure need not "cover"
the surface; it only needs to contain the exact point, which it does because the manifold enclosure contains the
exact coefficients. Sanity checks: at t = 1/4, S(U-ball) overlaps the Y-ball (radius 9e-27; `02_manifold.py` M1);
at xi = 53 the same holds for the interval, c1 and c2 enclosures. The block and cones are 4D objects (T acts on
(U, V, Q, P) only; the Y and kappa columns of `T6` are zero), which is correct given Lemma 2.1.

**Gap.** Neither the README nor any docstring states Lemma 2.1 or mentions that the 5D rest point is non-hyperbolic
with a line of equilibria. "The surface Y = S(U) is invariant" is true but is not the fact the argument needs; the
needed fact is that the constructed manifold point is on it. Should-fix (write Lemma 2.1).

## 3. Eigenvalues at rest

The 4D Jacobian is A(s, kappa) = [[-k, -k, k, 0], [eps k, 0, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]] and
det(lambda - A) = p(lambda) = (lambda^2 + k lambda + eps k^2)(lambda^2 - 1) + s k lambda
= lambda^4 + k lambda^3 + (eps k^2 - 1) lambda^2 + k (s - 1) lambda - eps k^2. Verified exactly (A1, A2).

**Proof that for every kappa > 0 there is exactly one root with Re > 0 and three with Re < 0.**
(i) Descartes: the coefficient signs are (+, +, ?, -, -) because s < 1 and eps k^2 > 0; whatever the sign of the
middle coefficient there is exactly one sign change, so exactly one positive real root. (ii) p(i w) has real part
(w^2 - eps k^2)(w^2 + 1) and imaginary part k w (s - 1 - w^2) (A6, exact). For w != 0 the imaginary part is nonzero
because s - 1 - w^2 < 0; p(0) = -eps k^2 != 0. So no root on the imaginary axis for any kappa > 0. (iii) The roots are
continuous in kappa on the connected set (0, infinity) and the degree is constant, so the number of roots in
Re < 0 is constant; at kappa in K the code certifies four simple real roots, three negative and one positive (sign
changes of p on a fixed grid, certified for the whole kappa-ball). Hence 3 stable roots for every c > 0. Note that
Descartes applied to p(-lambda) only gives "3 or 1" negative real roots; the three stable roots for other c may be
complex. The README says "three stable", not "three negative", so it is correct. s = 0.13296 < 1 is certified.

Parts (i) and (ii) are a comment in `certify_rest.py` ("proved symbolically"), not a computation. They are correct
(my exact check), but they must be written in the paper. For the proof of the theorem only the following is used:
lambda(kappa) is the unique positive root and it lies in [0.5, 1.2] (`refine` certifies opposite signs at the ends for
the whole kappa-ball, and Descartes gives uniqueness). R3(iii) and R4 (eigenvector residual) are consistency checks,
not load-bearing.

**5D.** Eigenvalues are those of p plus 0 (A3). The extra 0 is transverse to the surface (section 2). It does not
harm the manifold recursion, which needs n lambda - A5 invertible for n >= 2: n lambda > lambda > 0 is not a root of
lambda p(lambda). The block is 4D; the manifold series and the integrator are 5D (plus kappa as a sixth variable in
the integrator).

## 4. The unstable-manifold parametrisation (`manifold.py`)

**Setting.** Write F5(x* + y) = A5 y + e_Y g(y), with w = y_Q - y_U - y_V and
g(y) = beta kappa [(1 - 2 Y0) y_Y w - y_Y^2 w]. Derivation: Y' = beta kappa Y (1 - Y) w and
Y (1 - Y) = Y0 (1 - Y0) + (1 - 2 Y0) y_Y - y_Y^2 with beta Y0 (1 - Y0) = s; the linear part s kappa w is in A5. The
other four components are affine. Correct.

We seek P(t) = sum_n a_n t^n with lambda t P'(t) = F5(P(t)), a_0 = x*, a_1 = sigma v. Coefficient n gives
(n lambda - A5) a_n = e_Y g_n, where g_n depends only on a_1..a_{n-1} (g has no constant or linear term, and y_Y, w
start at index 1). The code's recursion (`coefficients`) computes exactly this convolution; `zsolve` gives
(mu - A5)^{-1} e_Y in closed form, verified exactly (A4). The eigenvector `eigvec_unstable` has residual
proportional to p(lambda) in the U and Y rows only (A5), so it is an exact eigenvector for lambda = lambda(kappa).

**Lemma 4.1 (resolvent bound).** For mu >= 2, kappa, s, eps >= 0: p(mu) >= (mu^2 - 1) mu^2 >= (3/4) mu^4, because
the other terms of p(mu) are nonnegative there. Hence abs(z_U) <= 4 kappa/(3 mu^4),
abs(z_Y) <= 1/mu + s abs(z_U), abs(z_Q) <= abs(z_Y)/(mu^2 - 1) <= (4/3) abs(z_Y)/mu^2, abs(z_P) = mu abs(z_Q),
abs(z_V) = eps kappa abs(z_U)/mu, each nonincreasing in mu. With mu0 = (N + 1) lambda_lower (about 78 for N = 80),
K_i := bound_i(mu0) >= sup_{n > N} abs(z_i(n lambda)). Proved (A7 checks the key inequality exactly).

**Lemma 4.2 (Banach algebra).** In l^1 with weight 1, norm(ab) <= norm(a) norm(b). With abar the truncation and h the
tail, write Yb = norm(abar_Y), Wb = norm(wbar), r_w = r_U + r_V + r_Q. Expanding
(Yb + h_Y)(Wb + h_w) - Yb Wb and (Yb + h_Y)^2 (Wb + h_w) - Yb^2 Wb term by term gives exactly the expression `Z(r)` in
the code. Proved.

**Lemma 4.3 (tail induction).** Let T(h)_n = (n lambda - A5)^{-1} e_Y g_n(abar + h), n > N. If
K_i (G0 + Z(r)) <= r_i for all i, where G0 = sum_{n > N} abs(g_n(abar)) (a finite sum: g(abar) is a polynomial of
degree 3N), then the exact tail satisfies sum_{n > N} abs(a_{n,i}) <= r_i.
*Proof.* For n <= N the coefficient g_n(abar + h) = g_n(abar) (h only enters at index >= N + 2), so the exact
coefficients satisfy a_n = T(a_tail)_n for n > N. For h in B_r, sum_{n > N} abs(g_n(abar + h)) <= G0 + Z(r), so
norm(T(h)_i) <= K_i (G0 + Z(r)) <= r_i: T maps B_r into itself. T is strictly lower triangular (T(h)_n depends on h_m,
m < n only), so the iterates h^(0) = 0, h^(j+1) = T(h^(j)) all lie in B_r and agree with the exact tail on indices
N + 1..N + j. For every finite M, sum_{N < n <= M} abs(a_{n,i}) is a partial sum of an iterate, hence <= r_i. Let
M -> infinity. No contraction is needed. QED.

The code checks the strict inequality G0 + Z(r) < rho with r_i = K_i rho; since K_i (G0 + Z(r)) < K_i rho = r_i, the
hypothesis holds. All quantities are upper bounds (abs_upper) and cover every kappa in the ball, every lambda in
lambda's ball, and in particular the correct pairing lambda = lambda(kappa).

**Consequences.** The series converges absolutely and uniformly on the closed disk abs(t) <= 1, so P is analytic on
abs(t) < 1 and the invariance equation holds there coefficientwise (the Cauchy products converge in l^1). Hence
x(xi) = P(e^(lambda xi)/4) solves the 5D ODE for xi <= 0 and tends to x* as xi -> -infinity: P(1/4) is on the local
unstable manifold, on the branch where U increases (a_{1,U} = sigma = 1/7 > 0). The enclosure
abs(P_i(t) - sum_{n <= N} a_{n,i} t^n) <= r_i abs(t)^(N+1) is correct. Strictly, the invariance equation is only
established on the open disk; the proof only uses t = 1/4 and 0 < t <= 1/4. Nit: say "abs(t) < 1".

**Lemma 4.4 (continuity in kappa, needed for the shooting).** kappa -> P_kappa(1/4) is continuous on K. *Proof.*
lambda(kappa) is a simple root, so analytic; each a_n(kappa) is a rational function of (kappa, lambda(kappa)) with
nonvanishing denominators; the tail bound r_i holds for every kappa in K simultaneously, so
sum_{n > M} abs(a_{n,i}(kappa)) 4^(-n) <= 4^(-M) r_i for M >= N, uniformly in kappa. A uniform limit of continuous
functions is continuous. QED. This lemma is not stated anywhere; should-fix.

**Independent confirmation.** `02_manifold.py` recomputes the coefficients to order 400 with a plain mpmath linear
solve (not flint, not the closed-form z) at the midpoint kappa: a_2..a_80 lie in the flint balls, the true tails are
0.34 to 0.50 of the certified r_i, the negative control (sigma x 8) fails as it should, and the series agrees with a
backwards ODE solve to 3e-42. The proof uses sigma = 1/7, t = 1/4, N = 80, which is also the sigma that
`choose_sigma` returns in `manifold.py`, and `prove_pulse.py` re-validates before use (`assert ok`).

## 5. The block lemma (`block.py`)

**Exact linearisation.** For x with U in I_U, F_kappa(x) - F_kappa(x*) = A(sbar(U), kappa)(x - x*) **exactly**, with
sbar(U) = (S(U) - S(0))/U (sbar(0) = s). The only nonlinearity is -S(U) in P'. S is convex on (-infinity, theta)
(S'' = beta^2 S (1 - S)(1 - 2S) > 0 there) and I_U is in (-infinity, 1/4) (asserted in `check`), so by the mean value
theorem sbar(U) is in [S'(-delta), S'(delta)] = [smin, smax] = [0.04933, 0.35325]. In y = T(x - x*):
y' = At(sbar, kappa) y, At = T A Tinv. No Jacobian enclosure over B is needed, because the vector field is exactly
linear in y with one scalar coefficient in a known interval. The nonlinearity S is enclosed correctly: only
S'(+-delta) enters, computed in arb.

**(C) holds on all of B, for all kappa in K.** The code encloses H(s, kappa) = D At + At^T D for s in {smin, smax}
and the whole kappa ball, as interval matrices, and certifies positive leading principal minors in arb. Every true
H(s_end, kappa) is symmetric and lies in the interval matrix, so is positive definite by Sylvester. H is affine in s
and the positive-definite cone is convex, so H(s, kappa) is PD for all s in [smin, smax]. By compactness there is
c > 0 with y^T H y >= c abs(y)^2 (float estimate c = 0.19, `03_block.py` B5). **Answer to the question asked: yes,
(C) is established at every point of B and for every kappa in the ball**; the code does not check only the centre.

**(E).** mu(s, kappa) := lambda_max(sym At22) + norm(At21) < 0 for s at the ends (Gershgorin plus Frobenius, upper
bounds in arb, whole kappa ball). Both terms are convex functions of s (lambda_max of an affine symmetric family is
convex; the norm of an affine vector is convex), so mu < 0 on the whole segment. The docstring justifies the endpoint
reduction only by "affine and convex sets", which covers (C) but not (E); the convexity-of-lambda_max argument should be
written. Should-fix (wording; the claim is true, B6 confirms numerically).

**U-range.** abs(U) <= abs(Tinv_00) r + norm(Tinv_{0,1:}) rho (Cauchy-Schwarz) < delta. In the proof
(`prove_pulse.block_data`, r = 4 rho, rho = 0.0072689) this is 0.04866 < 0.05. `block_data` replaces rho by its
midpoint after the loop without re-asserting the bound; this is valid (the midpoint lies in the ball for which the
upper bound was certified, and the bound is increasing in rho) but should be asserted. Nit.

B = {abs(y1) <= r, abs(y') <= rho} is compact (T invertible). L = y1^2 - abs(y')^2.

**Lemma 5.1.** Let x(xi) be a solution in B on an interval J. Then:
(a) dL/dxi = y^T H(sbar(U(xi)), kappa) y >= c abs(y)^2; L is strictly increasing unless x = x*.
(b) (relative invariance) if L(x(xi1)) > 0 and y1(xi1) > 0 then L > 0 and y1 > 0 on J after xi1; the same with
y1 < 0. (L > 0 forces abs(y1) > abs(y') >= 0, so y1 cannot change sign while L > 0.)
(c) (no L <= 0 point of the boundary is reached from inside) If x(xi) is in B on [a, tau], a < tau, and x(tau) is in
the boundary of B, then L(x(tau)) > 0.
(d) If J = [xi0, infinity) then x(xi) -> x*.
*Proof of (c).* A boundary point with L <= 0 cannot be on abs(y1) = r (that would need abs(y') >= r > rho), so it is on
abs(y') = rho with abs(y1) <= rho. There d abs(y')^2/dxi = 2 y'^T (At21 y1 + At22 y') <= 2 abs(y')^2 mu < 0. But
abs(y')^2 <= rho^2 on [a, tau] with equality at tau forces the derivative at tau to be >= 0. Contradiction.
*Proof of (d).* L is increasing and bounded by r^2, so it converges; then integral of abs(y)^2 is finite; abs(y)^2 has
bounded derivative on the compact B; by Barbalat's lemma y -> 0. QED.

Note that r > rho is used in (c); the proof uses r = 4 rho.

**Exit set.** The code does not certify what happens on the faces where L > 0, and B is not shown to be an
isolating block in Conley's sense (exit set closed, strict exit). It does not need to be: the shooting argument below
uses only Lemma 5.1. Floating-point sampling (`03_block.py` B3, B4) suggests the face abs(y1) = r is strict exit and the
whole face abs(y') = rho (including its L > 0 part) is strict entrance, so B very probably is an isolating block; this
is **unconfirmed** and not needed. The README's phrase "the cones K+ and K- are forward invariant in B" should read
"invariant relative to B" (orbits in K+ do leave B, in finite time, since dL >= c L there). Should-fix (wording).

**Independence of the re-check.** `block_check_iv.py` redoes (C) and (E) in mpmath.iv with interval Cholesky (a valid
sufficient condition for PD of every symmetric member) for the T saved by `block.py`. The load-bearing check is the arb
one inside `prove_pulse.block_data` (it re-runs `bl.check` and asserts). The two agree only because numpy's `eig`
returns the same T in both processes; fine on one machine, but the iv check is not tied to the T of the proof by
anything but determinism. Also `data/block_certificate.json` records r = 1.25 rho, rho = 0.00786 (block.py's own
choice), while the proof uses r = 4 rho, rho = 0.00727: the certificate file does not describe the block of the
proof. Should-fix.

## 6. The Wazewski-type shooting

Let phi_kappa be the 4D solution with phi_kappa(0) = P_kappa(1/4) (projection of the 5D one; Lemma 2.1). Define
K+o = {y in B: L > 0, y1 > 0}, K-o = {y in B: L > 0, y1 < 0} and

E+- = {kappa in K : there is xi >= 53 with phi_kappa([53, xi]) in B and phi_kappa(xi) in K+-o}.

Hypotheses verified by the code:
(I) phi_kappa(53) is in int B for every kappa in K (`prove_pulse.py interval`).
(T-) for kappa1 = 1/c1: phi([53, 58.375]) in int B (step-range enclosures) and phi(58.375) in K-o (`c1`).
(T+) for kappa2 = 1/c2: phi([53, 57.75]) in int B and phi(57.75) in K+o (`c2`).
(C), (E), U-range as in section 5; manifold validation for the kappa ball.

**Theorem.** There is kappa in (kappa2, kappa1), i.e. c in (c1, c2), whose orbit is homoclinic to x*.

*Proof.* (1) kappa1 in E-, kappa2 in E+ by (T-+).
(2) Disjoint: if kappa is in both with times xi+ < xi- (say), then phi is in B on [53, xi-] and in K+o at xi+; by
Lemma 5.1(b) it is in K+o at xi-, not in K-o.
(3) Open in K: let kappa0 in E+ with time xi0. Let xi* = inf{xi >= 53 : L(phi(xi)) > 0} <= xi0. On [53, xi*], L <= 0 and
phi is in B, so by Lemma 5.1(c) (applied from 53, where phi is interior by (I)) phi([53, xi*]) is in int B; by
compactness it has positive distance from the boundary. By continuity pick xi' >= xi* (xi' = 53 if xi* = 53) with
phi([53, xi']) in int B and phi(xi') in K+o (L > 0 just after xi* by 5.1(a), and y1 > 0 because the orbit is in K+o at
xi0 and 5.1(b)). int B and K+o intersected with int B are open, and kappa -> phi_kappa is continuous uniformly on
[53, xi'] (Lemma 4.4 and continuous dependence), so a neighbourhood of kappa0 is in E+. Same for E-.
(4) K is connected, so E0 = K \ (E+ union E-) is nonempty, and E0 is in the open interval by (1).
(5) Let kappa in E0. Suppose phi leaves B after 53, and let tau = sup{xi >= 53 : phi([53, xi]) in B} < infinity. Then
phi(tau) is on the boundary of B, tau > 53 by (I), and by Lemma 5.1(c) L(phi(tau)) > 0, so phi(tau) is in K+o or K-o
with phi([53, tau]) in B: kappa in E+ or E-, a contradiction. So phi stays in B for xi >= 53 and tends to x* by 5.1(d).
Backwards it tends to x* along the manifold (section 4). It is nonconstant, on the U-increasing branch. By section 1 it
is a pulse. QED.

**Answers to the specific questions.** The interval run is needed exactly for step (3) (Lemma 5.1(c) needs a start in
int B) and step (5). "Interior of B at 53" plus (T+-) suffices; the endpoint runs must also start in int B at 53,
which they do (phase 1 of `c1`/`c2` asserts `in_int_B` before phase 2). "Stays in B" is only claimed for xi >= 53,
which is all that is needed. The orbit between 0 and 53 leaves the block (U reaches about 0.76) and no statement is
made about it beyond existence of the solution.

**The README's sentence is not right as stated.** "The set of speeds whose orbit enters each cone is open" is false
without the qualifier: an orbit can enter K+ after leaving and re-entering B, and the set of such speeds need not be
open or disjoint from its K- counterpart. The correct set is E+- above (enter the cone at some xi >= 53 **while having
stayed in B since 53**), and its openness uses Lemma 5.1(c), i.e. condition (E), which the README does not connect to
openness. The code checks exactly the correct definition (step ranges in int B, then the cone). Should-fix.

## 7. From run_all.sh to the hypotheses

| run_all check | Hypothesis in the proof | Assessment |
|---|---|---|
| R: `^CERTIFIED` in certify_rest | s < 1; four real roots at K (R3 iii); eigenvector residual | s < 1 is used (Descartes, lambda unique positive root). R3(iii) and R4 are consistency checks; the proof recomputes lambda in `prove_pulse`. R3(i),(ii) are a comment, not a computation (correct, section 3). |
| R: negative control theta = 0 | none (control) | fine |
| M: c1, c2, interval VALIDATED | Lemma 4.3 for sigma = 1/7 | redundant with the `assert ok` in `prove_pulse.py`, which is the load-bearing validation. Same sigma, good. |
| M: sigma x 8 refused | control | fine |
| B: `^dU 0.05 CERTIFIED` | (C), (E) at abs(U) <= 0.05, kappa in K | redundant with `block_data`'s `assert ok`; its rho, r are not the proof's (section 5) |
| B: U to 0.15 refused | control | fine |
| B: iv re-check `^dU 0.05 cone PD` | (C), (E) again | **cannot fail**: the pattern matches the line printed on success and on failure (piping a synthetic "-> FAILED" line into the same grep matches). Must-fix in the harness |
| J: the `max abs(J_AD - J_FD)` line | none (test) | **cannot fail**: the line is printed whatever the value. Labelled "not part of the proof", but it is counted among the 15 checks |
| P: interval PASS | (I) | correct |
| P: c1, c2 PASS | (T-), (T+) | correct; step-range enclosure `step_range_y` is a valid Lagrange-remainder enclosure over [0, h] (remainder from W, the Picard enclosure of that step, polynomial part over the pre-step hull) |
| N: c1 asked for K+ refused | control | good: exercises the cone logic |
| N: c = 1.1024 refused | control | weak: fails because the orbit leaves abs(x) < 5 at xi = 14.6, never reaching the block/cone logic |

**Assumed but not checked by any program:** Lemma 2.1 (surface invariance of the manifold point); the reduction
(section 1); Descartes and the imaginary axis (section 3; now checked exactly by `01_algebra.py`); Lemmas 4.1 to 4.4
(the code implements 4.1 to 4.3 correctly; 4.4 is pure mathematics); Lemma 5.1 and the endpoint/convexity reduction
of (E); the shooting theorem; correctness of python-flint/Arb and of the Lohner integrator (about 300 lines; its own
tests `test_lohner.py` passes, 12 time units against mpmath, but it is **not run by run_all.sh**, and `test_lohner2.py`
crashes with IndexError without a mode argument). I did not audit `lohner.py` line by line beyond the step logic
(Picard enclosure, Lagrange remainder, mean-value form with the kappa column, QR re-orthogonalisation with enclosed
inverse), which reads correctly; its independent code review is **unconfirmed** here.

## Findings

**Must-fix**
1. Written proofs are absent (QUALITY item 1). Sections 1 to 6 of this report supply them; none of the claimed lemmas
   is false, but the theorem is not established until they are in the manuscript.
2. Two harness checks cannot fail: the mpmath.iv re-check (`'^dU 0.05 cone PD'` matches "-> FAILED" too) and the
   Jacobian test (prints its line regardless). QUALITY item 7 says run_all exits 1 when a check fails; for these two it
   would not. Grep for `-> CERTIFIED$` and make `test_jacobian.py` print PASS/FAIL against a threshold (or drop J from
   the count). The theorem does not depend on either, because the arb block check is re-run inside `prove_pulse.py`.

**Should-fix**
3. README: "the set of speeds whose orbit enters each cone is open" is wrong as stated; define E+- with "at some
   xi >= 53 while staying in B since 53" and prove openness with Lemma 5.1(c), which is where (E) is used.
4. README: "K+ and K- are forward invariant in B" should be "invariant relative to B" (orbits in them leave B).
5. State Lemma 2.1: the 5D embedding has a line of equilibria (extra eigenvalue 0, transverse to the surface), and the
   manifold point lies on Y = S(U) by the first integral logit(Y)/beta - U. "The surface is invariant" is not the
   needed fact.
6. State Lemma 4.4 (continuity of kappa -> P_kappa(1/4)), used for openness.
7. `block.py` docstring: the endpoint reduction for (E) needs convexity of lambda_max and of the norm in s, not
   "affine and convex sets".
8. `data/block_certificate.json` and the "B" check describe a block (r = 1.25 rho, rho = 0.00786) that is not the one
   used in the proof (r = 4 rho, rho = 0.00727). Record the proof's block, and tie the iv re-check to the same T.
9. Run `test_lohner.py` (and a fixed `test_lohner2.py`) from run_all or say they are manual; test_lohner2 crashes
   without an argument.
10. Descartes and the imaginary-axis argument are a code comment; write them out (they are correct).

**Nit**
11. "U reaches about 0.76": the logged `maxU` is the maximum of enclosures at step endpoints. Its lower end is a
    rigorous lower bound for sup U (0.75966...), its upper end is not an upper bound for sup U over all xi. Say
    "sup U >= 0.7596" or label it numerical.
12. Direction of travel (left for c > 0) is not stated in the README; Pinto-Ermentrout's convention is unconfirmed but
    irrelevant because w is even; say so.
13. "A homoclinic orbit is exactly a pulse": the converse needs a definition of pulse.
14. "validated for abs(t) <= 1": the invariance equation is proved on the open disk; only t = 1/4 is used.
15. `block_data` replaces rho by its midpoint without re-asserting the U-range bound (valid, but assert it).
16. The far-speed negative control fails by escaping abs(x) < 5, not through the cone logic.
17. README says the summary is in `data/run_all.txt`; `run_all.sh` prints to stdout and does not write that file.
18. State the consequence integral U dxi = 0 (gamma = 0): the pulse must have a negative lobe.

**Unconfirmed**
- Pinto-Ermentrout's sign convention (paper not read; does not affect the result).
- That B is an isolating block in Conley's sense (not needed; floating samples suggest yes).
- A full line-by-line audit of `lohner.py` (step logic reads correctly; `test_lohner.py` passes).
- Correctness of python-flint/Arb (standard trust assumption).
