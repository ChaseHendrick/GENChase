# Independent reimplementation of the nf-pulse computer-assisted claim

Date: 2026-09-26. Scripts: `review/reimpl/` (see its README). Written from the equations only: nothing in
`papers/nf-pulse/code/` or `papers/nf-pulse/data/` was read, imported or copied; only `papers/nf-pulse/README.md`
was read, for the statement of the claim. Tools: python-flint 0.9.0 (Arb ball arithmetic) for everything
rigorous, mpmath 1.3.0 for the non-rigorous shooting. Two files in `review/reimpl/` (`common.py`,
`rest_eigen.py`) were not written by this reimplementation (they appeared during the work); nothing here uses them.

## Verdict in one paragraph

Everything I checked agrees with the claim. (1) Rigorous: at rest, for every c > 0, there is exactly one
eigenvalue with positive real part and three with negative real part; for c in [c1, c2] all four are real and
simple. (2) Rigorous, with a different integrator and a different manifold enclosure from the README's: the
branch of the unstable manifold on which U increases, followed at the point speed c1, fires a pulse (U peaks in
[0.75971, 0.77453]), returns towards rest and then leaves along the negative unstable direction (a < 0, then
U < -0.1). At c2 it leaves along the positive unstable direction (a > 0, then U > 0.1). Speeds 1.5e-26 apart
inside [c1, c2] (c1 + 2e-26 and c1 + 5e-26) already give opposite signs, and so do two speeds 2e-41 apart around
the numerical c*. (3) Numerical: bisection in mpmath at 90 digits brackets the speed at
1.102747709734159249147867735746621733255053383781820878927260055..., which agrees with the README's
1.10274770973415924914786773574662... in every digit the README gives (32 decimals). I confirm 62 decimals
numerically and put it in [c1, c2]. I did **not** rebuild the isolating block or the Wazewski step, and my
integrator cannot carry the whole interval [c1, c2] as one ball past about xi = 130. So the existence conclusion
itself is **unconfirmed** by this reimplementation; what is confirmed is the shooting data it rests on.

## 0. The wave ODE (re-derived)

With u = U(xi), v = V(xi), xi = x + ct: u_t = c U', and (w * S(u))(x, t) = integral of w(xi - eta) S(U(eta)) d eta
= Q(xi). Since (1 - d^2/dxi^2)(e^{-|xi|}/2) = delta, Q - Q'' = S(U). So, with kappa = 1/c and P = Q',

    U' = kappa (Q - U - V),   V' = eps kappa (U - gamma V),   Q' = P,   P' = Q - S(U).

This matches the task statement and the README. The vector field is J (x - rest) + e_4 N(U) exactly, with
N(U) = -(S(U) - S(0) - S'(0) U): the only nonlinearity is S in the P row. I checked the hand-derived Jacobian
and characteristic polynomial against Arb's `charpoly` of the Jacobian (all five coefficients overlap).

## 1. Rest state and eigenvalues (RIGOROUS; `rest.py`, output `rest_result.json`)

**Rest.** With gamma = 0, V' = 0 forces U = 0; U' = 0 gives V = Q; Q' = 0 gives P = 0; P' = 0 gives Q = S(0).
The rest state is unique: (U, V, Q, P) = (0, S(0), S(0), 0), S(0) = 1/(1 + e^5) =
0.00669285092428485555936198038133 (ball radius 5e-33). The residual of the vector field there contains 0.
s = S'(0) = beta S(0)(1 - S(0)) = 0.132961133415803098279970690083 (radius 1e-31), certified in (0, 1).

**Characteristic polynomial.** p(l) = (l^2 + k l + eps k^2)(l^2 - 1) + k s l
= l^4 + k l^3 + (eps k^2 - 1) l^2 + k (s - 1) l - eps k^2, k = kappa.

**Eigenvalues for c in [c1, c2]** (kappa taken as one ball containing 1/c for the whole interval; also at c1
and c2 separately at 256 bits). Four disjoint intervals with certified sign changes of p, so four simple real
roots:

| | eigenvalue (c in [c1, c2], one ball) |
|---|---|
| unstable | 0.9687611605793217870553652 +/- 4e-26 |
| stable | -0.1246531325593622675155500 +/- 8e-26 |
| stable | -0.583109889199161753091305 +/- 5e-25 |
| stable | -1.16782387164510010275175 +/- 1.2e-24 |

At the point speeds the radii are about 1e-76. Eigenvectors are in closed form, (1, eps k/l, -s/(l^2 - 1),
-s l/(l^2 - 1)), and (J - l) v contains 0 for each. The unstable one is about (1, 0.0936, 2.162, 2.094): all
components positive, so moving along +v_u raises U, V, Q and P together.

**All c > 0 (rigorous argument).** The coefficient signs are +, +, ?, -, - (k(s-1) < 0 because s < 1), which is
one sign change whatever the sign of eps k^2 - 1. By Descartes, p has exactly one positive real root. On the
imaginary axis, p(i w) = (eps k^2 - w^2)(-w^2 - 1) + i k w (s - 1 - w^2). The imaginary part vanishes only at
w = 0, because s < 1, and p(0) = -eps k^2 != 0. So p never has a root on the imaginary axis for any k > 0. The
roots of a monic quartic depend continuously on k, so the number of roots with positive real part is constant on
k in (0, inf). It is 1 at the certified point. Hence **for every c > 0: one positive real eigenvalue and three
with negative real part.** The stable eigenvalues are certified real only on [c1, c2]; for other c they may be
complex. This agrees with the README's "Descartes' rule and the imaginary axis".

## 2. Rigorous integration (`eigsys.py`, `manifold_cone.py`, `hoe.py`, `prove_ends.py`)

### 2.1 Coordinates

x = rest + V z, V = [v_u, v_1, v_2, v_3] (U-component of each column = 1), z = (a, b), a = unstable coordinate,
b in R^3 = stable coordinates. Exactly:

    z' = Lambda z + w N(U),   U = a + b_1 + b_2 + b_3,   w = V^{-1} e_4.

Lambda, V and w are balls that contain the exact eigen-decomposition (Arb inverse of the ball matrix), so every
ball evaluation is an enclosure. **a is the projection on the unstable eigenvector** (a = l_u . (x - rest) with
l_u the left eigenvector normalised by l_u . v_u = 1). In these coordinates the linear part is diagonal, so interval
boxes do not wrap near rest; this is what lets me start extremely close to rest.

### 2.2 Unstable-manifold enclosure: a quadratic-cone lemma (my choice, not the README's order-80 series)

Let m = beta^2/(12 sqrt 3) = 19.245, which is sup|S''|/2 (the maximum of |y(1-y)(1-2y)| on [0,1] is
1/(6 sqrt 3)), so |N(U)| <= m U^2 for all U by Taylor's theorem (N(0) = N'(0) = 0, N'' = -S''). Also
|U| <= |a| + 3 ||b||. Write lam for the unstable eigenvalue, mu for the smallest |stable eigenvalue|,
wa = |w_0|, wb = max_{i >= 1} |w_i|, and ||b|| for the max norm.

**Lemma.** If K, r, rho > 0 satisfy

    (I)   (mu + 2 lam) K > m (1 + 3 K r)^2 (wb + 2 K r wa)
    (II)  mu > wb m (K^{-1/2} + 3 rho^{1/2})^2
    (III) K r^2 < rho
    (IV)  lam > wa m r (1 + 3 K r)^2

then the branch gamma of W^u(rest) that leaves with a > 0 crosses {a = delta} for every 0 < delta <= r, and at its
first crossing ||b|| <= K delta^2.

*Proof.* Let Nb = {|a| <= r, ||b|| <= rho}, g = ||b|| - K a^2, and t* = sup{t : gamma(s) in Nb for all s <= t}
(finite or not; gamma(t) -> rest as t -> -inf, so the set is nonempty). By the unstable manifold theorem, gamma is
tangent to +v_u at rest, so a(t) > 0 and ||b(t)||/a(t) -> 0 as t -> -inf.
(A) g <= 0 on (-inf, t*]. Suppose g(t0) > 0 for some t0 < t*. First, g > 0 on all of (-inf, t0]: otherwise take
t2 = sup{t <= t0 : g(t) <= 0}; then g(t2) = 0, a(t2) != 0 (else b = 0 too and gamma would be at rest), and at such
a point the upper right Dini derivative satisfies D+ ||b|| <= -mu K a^2 + wb m a^2 (1 + 3Kr)^2 and
(K a^2)' >= 2 K lam a^2 - 2 K r wa m a^2 (1 + 3Kr)^2 (because U^2 <= a^2 (1 + 3K|a|)^2 when ||b|| = K a^2), so
D+ g < 0 by (I), which contradicts g > 0 just after t2. Second, on Nb intersected with {g > 0} we have b != 0,
a^2 < ||b||/K and U^2 <= ||b|| (K^{-1/2} + 3 rho^{1/2})^2, so D+ ||b|| <= ||b|| (-mu + wb m (K^{-1/2} +
3 rho^{1/2})^2) < 0 by (II). So ||b|| is nonincreasing on (-inf, t0] and ||b(t)|| >= ||b(t0)|| > 0 as t -> -inf,
contradicting gamma -> rest.
(B) On (-inf, t*], a > 0 (a zero of a would force b = 0 by (A)) and a' >= a (lam - wa m r (1 + 3Kr)^2) > 0 by (IV).
(C) On (-inf, t*], ||b|| <= K a^2 <= K r^2 < rho by (III), so gamma can leave Nb only through a = r. If t* were
infinite, a would be increasing and bounded while a' >= c a(t_0) > 0, which is impossible. So a(t*) = r, and by
(B) and the intermediate value theorem gamma crosses a = delta exactly once before t*, with ||b|| <= K delta^2. QED.

`manifold_cone.py` checks (I) to (IV) in ball arithmetic at each point speed with **K = 1000, r = 1e-5,
rho = 1e-6**: margins (I) 2036, (II) 0.095, (III) 9e-7, (IV) 0.969 (lam = 0.96876, mu = 0.12465, wa = 0.24231,
wb = 1.27109, m = 19.245). With delta = 1e-40 the initial set is the box {a = 1e-40, ||b|| <= 1e-77} (1e-50 and
1e-97 in the variant runs, 1e-55 and 1e-107 in the near-c* runs). The time origin xi = 0 is the crossing of
a = delta, so **my xi is shifted relative to the README's xi = 53** (my pulse fires, U > 0.5, at xi = 94.78 from
delta = 1e-40, at 118.54 from 1e-50 and at 130.42 from 1e-55).

Why this choice: it is crude (quadratic accuracy) but its proof is one page, uses only a global bound on S'' and
four scalar inequalities, and is honest by construction. The price, a starting point at 1e-40, is paid in
integration time near rest, which is cheap in eigen-coordinates.

### 2.3 Integrator: interval Taylor series + high-order a priori enclosure + mean-value form

Different from a C0-Lohner method with a Picard a priori enclosure:

* **Taylor coefficients** of order N = 40 (30 in the variant runs) by the automatic-differentiation recursion
  E = exp(-beta(U - theta)), E_m = -(beta/m) sum j U_j E_{m-j}, Y = 1/(1 + E), with the U_m-linear part of Y_m split
  off exactly and S'(U_0) - s and N(U_0) enclosed by mean-value forms intersected with direct evaluation. Without
  this, the O(U^2) nonlinearity near rest is computed as a difference of O(U) balls and the radius doubles every
  evaluation (I observed this: the stable-coordinate radius then grew like e^{1.17 xi}).
* **A priori enclosure: high-order enclosure (HOE, Nedialkov-Jackson type).** B0 = sum_{i<N} [0,h]^i z^[i](Z),
  trial box Bt = B0 inflated, B = B0 + [0,h]^N z^[N](Bt). If B lies in the interior of Bt, every solution from Z
  exists on [0, h] and stays in B (Taylor-Lagrange with the autonomous identity z^(N)(tau)/N! = z^[N](z(tau)):
  while the solution stays in Bt it lies in B, inside the interior of Bt, so it cannot reach the boundary first).
* **Step.** phi_h(y) = T(y) + h^N z^[N](y(tau)) with tau in (0, h) per component, so phi_h(Z) is enclosed by
  T(m) + DT(Z)(Z - m) + h^N z^[N](B), m = mid Z, where DT(Z) = sum_{i<N} h^i Phi^[i](Z) comes from the Taylor
  coefficients of the variational equation (checked against finite differences). No QR, no moving frame: the box
  stays axis-aligned in the eigen-coordinates. The mean-value form was needed: a direct interval Taylor sum
  evaluates sum (lam h)^n/n! with |lam|, so a contracting mode's radius grows like e^{|lam| h} per step.
* **Step control** is heuristic (it only affects efficiency). A step is accepted only if the HOE validates and the
  remainder is below max(2^-(prec-12) |z|, 1e-3 radius); otherwise h shrinks.
* **Precision** 600 bits (800 in the variant and near-c* runs). Each end is a POINT-parameter IVP: c1 and c2 are
  balls of radius about 2^-600 that contain the exact decimals, so there is no parameter wrapping.

Events are all certified by ball comparisons: FIRED (U > 0.5), RETURNED (U < -0.1 afterwards), SIGN (a has a
certified sign and |a| > 2 ||b||), LEFT (|U| > 0.1 with a certified sign, after SIGN).

### 2.4 Results (`summary.txt`, `prove_*.json`)

About 1550 steps and 25 seconds per end on one core.

| run | fired | returned | SIGN at xi | a at SIGN (radius) | ||b|| at SIGN <= | LEFT at xi | U at LEFT |
|---|---|---|---|---|---|---|---|
| c1 | 94.78 | 104.29 | 152.23 | **-0.00948337** (7e-26) | 0.00388 | 154.69 | **-0.10677** |
| c2 | 94.78 | 104.29 | 151.53 | **+0.00858786** (4e-26) | 0.00418 | 154.12 | **+0.10194** |
| c1, 800 bits, N = 30, delta = 1e-50 | 118.54 | 128.05 | 175.88 | -0.00846433 (5e-30) | | 178.42 | -0.10282 |
| c2, 800 bits, N = 30, delta = 1e-50 | 118.54 | 128.05 | 175.31 | +0.00866929 (3e-30) | | 177.89 | +0.10206 |
| c1 - 1e-20 (control) | 94.78 | 104.29 | 140.65 | -0.0338 | | 141.66 | -0.10400 |
| c2 + 1e-20 (control) | 94.78 | 104.29 | 140.61 | +0.0320 | | 141.93 | +0.10215 |
| c1 + 2e-26 (inside [c1, c2]) | 94.78 | 104.29 | 152.82 | -0.00740 (1.3e-25) | | 155.52 | -0.10536 |
| c1 + 5e-26 (inside [c1, c2]) | 94.78 | 104.29 | 152.89 | +0.00713 (1.3e-25) | | 155.67 | +0.10172 |
| c*num - 1.3e-41 (800 bits, delta = 1e-55) | 130.42 | 139.94 | 220.64 | -0.000218 (1.8e-22) | 6.5e-5 | 226.99 | -0.10418 |
| c*num + 0.7e-41 (800 bits, delta = 1e-55) | 130.42 | 139.94 | 221.34 | +0.000212 (3.6e-22) | 6.0e-5 | 227.76 | +0.10529 |

(The last two speeds are 1.10274770973415924914786773574662173325504 and ...506, which bracket the numerical c*.)

Further certified facts at c1 and c2:
* Maximum of U on the first pulse: in [0.759713, 0.774527] (lower bound from the grid points, upper bound from the
  a priori boxes). "U reaches about 0.76" is confirmed.
* Closest approach to rest after the return (grid points): ||z|| <= 0.00436 at xi = 151.2 (c1) and <= 0.00474 at
  xi = 150.5 (c2), with a = -0.00356 (c1) and +0.00324 (c2) there; in the near-c* runs ||z|| <= 7.8e-5.
* After LEFT: the c1 orbit reaches U = -1.0323 (radius 3e-20) at xi = 157.0, where my step control gives up (the
  exponential E becomes large); the c2 orbit reaches U = 27.17 (radius 4e-18) at xi = 164.2.

**Interpretation.** In terms of the sign of the projection onto the unstable eigenvector at rest: **c1 gives
a < 0 and c2 gives a > 0**, each while the orbit is within about 0.01 of rest and |a| > 2 ||b||, and each is
followed by a certified exit on that side (c1: U - U_rest < -0.1; c2: U - U_rest > +0.1). Note that U - U_rest is
negative for both orbits during the return (the pulse comes back from below, U about -0.43 at the minimum), so
the sign of U - U_rest is informative only after the unstable component dominates: at SIGN, U = -0.0132 (c1) and
+0.0044 (c2). If the README's cones K- and K+ are the cones about -v_u and +v_u, this matches "the orbit at c1
enters K-, the one at c2 enters K+". I do not know their cone definition, so the match is to the sign of a.

### 2.5 Tests of the rigorous code

* `test_vs_mpmath.py`: at every snapshot (every 5 units of xi, 31 at c1 and 32 at c2) the rigorous boxes, mapped back to (U, V, Q, P),
  contain an independent 110-digit mpmath solution (x-coordinates, mpmath eigenvector) started at a = delta, b = 0,
  a point of the initial set: 124 of 124 components contained at c1, 128 of 128 at c2.
* Negative control: shifting the mpmath speed by 1e-40 makes 122 of 124 containments fail, so the test resolves
  far below the 1e-25 scale of the claim.
* The Taylor recursion agrees with a plain recursion in the original coordinates, and the variational
  coefficients with finite differences.
* Changing the precision (600 to 800 bits), the order (40 to 30) and the manifold amplitude (1e-40 to 1e-50)
  leaves every sign unchanged.

### 2.6 The whole interval as one ball: not achieved

`prove_ends.py c1c2` carries the interval [c1, c2] as a single ball. It is valid, but parameter width is not
covered by the mean-value form, so the radius grows faster than the dynamics: 3e-26 at xi = 90, 6e-9 at 120.3,
8e-7 at 125.2, 1e-4 at 130.1, 1.5e-2 at 135.1. At xi = 120.3, every orbit with c in [c1, c2] is enclosed in
z = (0.00263272, -0.009631827, 0.034749987, -0.166314981) with radii below 1e-8, which is still about 0.17 from
rest. My method therefore does not show that the whole family is inside a block when the signs separate
(around xi = 150); that would need the parameter in the variational part (a Lohner-type or Taylor-model
treatment of c). This is a limitation of this reimplementation, not evidence against the README.

## 3. Non-rigorous 60-digit shooting (`shoot_mp.py`, `check_mp.py`)

mpmath at 90 digits, my own adaptive Taylor integrator (order 54, per-step tolerance 1e-95), start at
amplitude 1e-32 on a second-order parameterisation of the unstable manifold (error about 1e-96), bisection on the
escape direction after the return (second rise U > 0.5 counts as +, U < -1 counts as -), starting from
[1.1027, 1.1028]. 200 bisections, 32 minutes:

    lo = 1.1027477097341592491478677357466217332550533837818208789272600552526...  (escape -)
    hi = 1.1027477097341592491478677357466217332550533837818208789272600553148...  (escape +)
    width 6.2e-65

Cross-check at 110 digits, manifold amplitude 1e-36 and a different order: lo - 1e-62 escapes -, hi + 1e-62
escapes +. The mpmath max of U on the pulse is 0.75971.

**Numerical speed: c* = 1.10274770973415924914786773574662173325505338378182087892726005(5...)**, so 62
decimals are confirmed under both settings. It agrees with the README's 1.10274770973415924914786773574662...
in all 32 decimals given there, and lies in [c1, c2] (c* - c1 = 3.5747e-26). The sign pattern (below c*: -,
above: +) is the same as in the rigorous runs.

## 4. What is rigorous and what is not

Rigorous (ball arithmetic, given correct Arb/python-flint and correct code):
* Section 1: the rest state, s < 1, four real simple eigenvalues on [c1, c2] (one positive), and the all-c > 0
  statement (a pen-and-paper argument plus one certified evaluation).
* The quadratic-cone lemma (proof above) and its constants at each point speed.
* Section 2.4: for each listed point speed, the unstable-manifold branch on which U increases fires, returns, and
  leaves near rest with the stated sign of a and of U - U_rest. That includes c1 and c2 exactly (balls
  containing the decimals) and the two speeds 2e-41 apart around c*.

Not rigorous: the 62-digit speed (numerical bisection), the step-size heuristics (they affect efficiency only),
and the containment tests (tests, not proofs).

**Unconfirmed** (not reproduced here):
* The isolating block B, its quadratic form, the forward invariance of K+ and K-, and the Wazewski argument that
  some c in (c1, c2) stays in B and tends to rest. Without these, my sign results show only that the escape
  direction changes between c1 and c2 (indeed between c1 + 2e-26 and c1 + 5e-26); they do not by themselves give
  a homoclinic orbit.
* That every orbit with c in [c1, c2] lies in the interior of B at the README's xi = 53: my whole-interval
  enclosure is tight only up to about my xi = 125 (section 2.6), and I do not know B.
* The README's order-80 manifold series and its tail bound: I used a different, cruder enclosure.
* The README's statement that a bounded Q is unique, so a homoclinic orbit is exactly a pulse: plausible and
  standard (the bounded solution of Q - Q'' = S(U) is w * S(U)), but I did not write it out.
