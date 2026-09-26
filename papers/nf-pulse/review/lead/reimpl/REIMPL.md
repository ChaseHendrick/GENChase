# Independent reimplementation: the nf-pulse speed claim

Reviewer: an independent reimplementer (Claude, working as a sub-agent), 2026-09-26.
Rule followed: nothing in `papers/nf-pulse/code/` or `papers/nf-pulse/data/` was read, imported or
copied. The only project file read was `papers/nf-pulse/README.md`, for the statement of the claim.
Everything below was derived from the model equations and written from scratch.

## Verdicts in one table

| Part of the claim | Status | How |
|---|---|---|
| Wave ODE `U' = k(Q-U-V)`, `V' = eps k U`, `Q' = P`, `P' = Q - S(U)`, `k = 1/c` | **confirmed** | derived by hand (section 1) |
| Rest state unique, `S'(0) < 1`, one unstable and three stable eigenvalues, for all c in [c1, c2] | **confirmed (rigorous)** | `rest_eigen.py`, arb |
| Orbit leaves rest on the branch where U increases | **confirmed (rigorous, for the orbit that this reimplementation follows)** | cone lemma + `vi_integrate.py` |
| At c1 the orbit leaves one way, at c2 the other | **confirmed (rigorous, modulo the correctness of this new code)** | `vi_integrate.py`: c1 exits with U < -1, c2 with U > +1 |
| c* = 1.10274770973415924914786773574662... | **confirmed to all 33 digits quoted** (rigorous escape-sign bracket of width 1.5e-32; two numerical brackets agreeing to about 58 digits) | `rig_bisect.py`, `shoot_mp.py` |
| U reaches about 0.76 | **confirmed** (numerical 0.759716; rigorous upper bound 0.76094 on the c1 orbit) | `shoot_mp.py`, `vi_integrate.py` |
| Existence of a pulse for some c in (c1, c2) | **unconfirmed** by this reimplementation | the isolating block and the Wazewski step were not rebuilt (section 6) |

No finding refutes any part of the claim. Findings are listed in section 7.

## 1. The wave ODE (derived)

With `u(x,t) = U(xi)`, `v = V(xi)`, `xi = x + c t`: `u_t = c U'`, `v_t = c V'`. Hence
`c U' = -U - V + w*S(U)` and `c V' = eps (U - gamma V) = eps U` (gamma = 0). With
`Q = w*S(U)` and `(1 - d^2/dxi^2) w = delta`, `Q - Q'' = S(U)`, i.e. `Q'' = Q - S(U)`. With `P = Q'`
and `k = 1/c`:

    U' = k (Q - U - V),   V' = eps k U,   Q' = P,   P' = Q - S(U).

This agrees with the README. Rest: `V' = 0` forces `U = 0` (eps k is not 0 and gamma = 0), then
`P = 0`, `Q = S(0)` and `V = Q - U = S(0)`. With gamma = 0 there is no fixed-point equation to solve:
the rest state is unique for every c > 0. All programs work in deviation coordinates
`y = x - rest` and write `S(U) - S(0) = D(U) = A (1 - e^{-beta U}) / ((1 + A)(1 + A e^{-beta U}))`,
`A = e^{beta theta} = e^5`, with `1 - e^{-beta U}` from `expm1`; this keeps full relative accuracy when
U is of order 1e-50.

## 2. Task 1: rest and eigenvalues (rigorous) - `rest_eigen.py`

Ball arithmetic (python-flint arb, 256 bits), `k` taken as ONE ball containing `1/c` for every
c in [c1, c2] (`k = 0.9068257328243023363032398 +/- 8.5e-26`).

* `S(0) = 0.006692850924284855559361980381325180393744 +/- 9e-45`.
* `S'(0) = beta S0 (1 - S0) = 0.1329611334158030982799706900828847351026 +/- 7e-42 < 1`.
* Characteristic polynomial (derived by hand from `lam U = k(Q-U-V)`, `lam V = eps k U`,
  `lam Q = P`, `lam P = Q - s U`):
  `p(lam) = lam^4 + k lam^3 + (eps k^2 - 1) lam^2 + k (s - 1) lam - eps k^2`.
  Cross-checked against arb's own `charpoly` of the 4x4 Jacobian (coefficients overlap).
* Signs of p at -2, -1, -3/4, -1/4, -1/20, 1/2, 3/2 are `+ - - + - - +`, certified for the whole
  k-ball: four sign changes, so four distinct real roots in disjoint intervals; since p has degree 4
  these are all the eigenvalues. Exactly one is positive. Enclosures valid for all c in [c1, c2]
  (radii set by the k-ball):

  | eigenvalue | enclosure |
  |---|---|
  | lam_u | 0.968761160579321787055365 +/- 3.9e-25 |
  | lam_slow | -0.124653132559362267515550 +/- 1.4e-25 |
  | lam_2 | -0.583109889199161753091305 +/- 2.5e-25 |
  | lam_3 | -1.167823871645100102751750 +/- 3.3e-25 |

  At the point values c1 and c2 the same code gives enclosures of radius below 1e-30.
* Unstable eigenvector, normalised to U-component 1:
  `v_u = (1, eps k/lam_u, -s/(lam_u^2 - 1), -s lam_u/(lam_u^2 - 1))`
  `= (1, 0.0936067391762504291669921, 2.1619058902845036088706, 2.0943704593352876299588)`
  (radii below 4e-23); `J v - lam v` contains 0 in every entry. Its U-component is positive, so the
  branch `+v_u` is the one on which U increases.
* The README's general argument (Descartes plus the imaginary axis) also checks out by hand:
  the imaginary part of `p(i w)` is `k w (s - 1 - w^2)`, which vanishes only at w = 0 because s < 1,
  and `p(0) = -eps k^2 < 0`. See finding N1 for one missing sentence.

## 3. Task 2: rigorous shooting at c1 and c2 - `vi_integrate.py`

### 3a. The integrator (new design; not C0-Lohner, no Picard a priori box)

One step from an exact centre `y_n` with a componentwise error bound `z_n`
(`|x_true(t_n) - y_n| <= z_n`):

1. **Polynomial.** `p(t)`, a degree-48 Taylor polynomial at `y_n`, computed by Picard iteration on
   truncated power series and then rounded to exact dyadic coefficients. It is not trusted: it is
   just some polynomial.
2. **Rigorous defect.** `r(t) = p'(t) - f(p(t))`. Taylor's theorem with the Lagrange remainder gives
   `r(t) = sum_{k<N} r_k t^k + t^N r^{(N)}(xi)/N!` with xi in [0, t]. The `r_k` are computed in ball
   arithmetic at t = 0 (they are rounding-size), and `r^{(N)}(xi)/N!` is the N-th coefficient of the
   expansion of r about xi, enclosed by evaluating the whole expansion at the BALL `tau = [0, h]`
   (p shifted to `tau + s` by Horner in power series, then `f` applied with arb power-series exp and
   division; the N-th coefficient of `p'(tau+s)` is 0 since p' has degree N-1). This gives
   `rho >= sup_{[0,h]} |r|` componentwise. A step is accepted only when this rigorous rho meets the
   tolerance (relative 2^-166); otherwise h is halved.
3. **Error propagation by a comparison principle.** `e = x - p` satisfies `e' = A(t) e - r` with
   `A(t) = int_0^1 Df(p + theta e) d theta`, which lies in `Df(tube)` while `|e| <= eta`
   (tube = hull of `p([0,h])` plus `[-eta, eta]`, convex). Then `D+|e_i| <= A_ii |e_i| +
   sum_{j != i} |A_ij| |e_j| + rho_i`, so `D+|e| <= M |e| + rho` with M the Metzler (quasimonotone)
   majorant of Df over the tube. The only state-dependent entry of Df is `-S'(U)`, bounded by
   `beta / (4 cosh^2(beta(U - theta)/2))` evaluated with monotonicity in |U - theta|. By the comparison
   theorem for quasimonotone linear systems (Kamke, Mueller; see W. Walter, *Differential and Integral
   Inequalities*), `|e(t)| <= e^{Mt} z_n + int_0^t e^{M(t-s)} rho ds`.
4. **A priori step (continuity argument, not Picard).** With `M+` = M with its diagonal (all entries
   <= 0) replaced by 0, `e^{Mt} <= e^{M+ t}` entrywise and `e^{M+ t}` is nondecreasing, so
   `sup_{[0,h]} |e| <= Z = e^{M+ h}(z_n + h rho)`. The tube radius eta is accepted only if `Z < eta`
   componentwise. Then the solution cannot reach the tube boundary on [0, h] (first-exit-time
   argument) and exists there.
5. **Update.** `z_{n+1} = e^{Mh} z_n + h e^{M+ h} rho + rad(p(h))`, `y_{n+1} = mid(p(h))`. Matrix
   exponentials are arb's rigorous `arb_mat.exp`.

Numerically the Metzler majorant in the original coordinates overestimates the true growth along
this orbit by only about 10^5 to 10^9 over the whole run, so no QR or coordinate changes are needed
at 320 bits.

### 3b. Start on the unstable manifold: a linear cone lemma

`T` is an exact dyadic approximation of the eigenvector matrix (columns lam_u, lam_slow, lam_2,
lam_3), `y = T (a, b)`, `b in R^3`. In arb: `L~ = T^{-1} J T`, `nu_a = min L~_11`,
`nu_s = max_{i>1} L~_ii`, `eta_off = max |L~_ij|, i != j` (5.7e-90 here), and the nonlinear term
`g = T^{-1}(0, 0, 0, -(D(U) - s U))` with `|D(U) - sU| <= S2 U^2 / 2`, `|U| <= C_U (|a| + |b|)`, so
`|g_i| <= gamma (|a| + |b|)^2`. On `Omega = {|a| <= r_a, |b|_inf <= r_b}`, `F = |b|_inf - L |a|`:

* (C1) `eta_off (1 + 2L + 3L^2) + gamma (1 + L)^3 r_a < L (nu_a - nu_s)` gives `D+F < 0` on `{F = 0}`;
* (C2) `nu_s + eta_off / L + 2 eta_off + gamma (1 + 1/L)^2 r_b < 0` gives `D+|b| <= -kappa |b|` on `{F >= 0}`;
* (C3) `nu_a - 3 eta_off L - gamma (1 + L)^2 r_a > 0` gives `a' > 0` in the cone for a > 0.

Lemma. Under C1 to C3, every point of Omega whose backward orbit stays in Omega and tends to rest
lies in `{|b| <= L|a|}`, and for every `0 < delta <= r_a` the branch of the unstable manifold with
a > 0 contains a point with `a = delta`.
Proof sketch. If such a point had F > 0, then going backward F stays > 0 (at a first backward
contact with F = 0, C1 would make F decrease forward, a contradiction), so by C2 `|b|` grows
exponentially backward, contradicting convergence to rest. For existence: points of the local
unstable manifold with small a > 0 lie in the cone; the cone is forward invariant in Omega (C1) and
a increases there (C3) while `|b| <= L|a| <= r_b`, so the forward orbit passes `a = delta`, and that
point's backward orbit stays in Omega and tends to rest.

Checked in arb with `L = 2^-150`, `r_b = 2^-315`, `r_a = r_b / L ~ 2.1e-50`, `delta = 2^-166`
(about 1.1e-50): all three hold at c1 and at c2. The start set is `a = delta`, `|b_i| <= L delta`,
i.e. a centre `delta T e_1` with an initial error of 2.3e-95 (relative 2e-45).

### 3c. Results

| | c1 | c2 |
|---|---|---|
| steps / run time | 1210 / 22 s | 985 / 17 s |
| stop (xi from the start point) | 180.675 | 183.286 |
| U at stop (rigorous) | -1.00091893135121 +/- 5.2e-15 | 1.016560024028 +/- 1.8e-13 |
| Q - S0 at stop | -2.18701598554478 +/- 8.6e-15 | 1.587082986407 +/- 6.3e-13 |
| unstable eigen-coordinate a at stop | -1.026724649 +/- 4.4e-10 | 0.5072385428 +/- 1.2e-11 |
| worst relative width along the run | 3.3e-15 | 1.7e-13 |
| **leaves** | **U -> negative side (a < 0)** | **U -> positive side (a > 0)** |

The two logged orbits agree in all printed digits up to xi = 150 and separate in the slow return:
at xi = 170, U = -7.6807e-3 (c1) against -7.5873e-3 (c2), each with an
error bound of 1.6e-19. The pulse itself has -0.44 < U < 0.77, so |U| > 1 is past the pulse.

This matches the claim: slightly below c* the orbit leaves one way (U down, a < 0, which I take to
be the README's cone K-) and slightly above it leaves the other way (U up, a > 0, K+). The README's
cones and block were not rebuilt, so "K-" and "K+" here are identified only by the sign of the
unstable coordinate.

Controls (`python3 vi_integrate.py lo hi`): at c = 1.1027477 the orbit exits with U < -1 and at
1.1027478 with U > +1, as the non-rigorous float and mpmath runs predict.

### 3d. Rigorous bracket of the switch - `rig_bisect.py`

Validated runs at `c1 + K * 1e-27` give: K = -10 and 35 exit down, K = 36 and 110 exit up. Sixteen
further validated bisections, each with a sign-definite enclosure, put the switch of the escape sign
in

    [1.102747709734159249147867735746612548828125, 1.1027477097341592491478677357466278076171875]

(width 1.5e-32). The claimed 1.10274770973415924914786773574662 lies inside it, 7.5e-33 above the
lower end. This is a statement about the sign of the escape, not a proof that a pulse exists.

### 3e. Test of the integrator - `test_enclosure.py`

From one exact start point (`2^-20 v_u`, zero initial error) at c1, the enclosures at xi = 10, 20,
30, 40 (radii 1e-52 to 8e-39) contain the 80-digit mpmath Taylor solution of the same problem
(largest distance from centre / radius: 1.1e-10). Negative control: the mpmath solution with k
perturbed by 1e-30 falls outside an enclosure.

## 4. Task 3: 60-digit shooting (not rigorous) - `shoot_mp.py`

Method: deviation coordinates; the unstable manifold by the parameterisation method to order M
(`(J - n lam_u) a_n = -[nonlinear part]_n`, the nonlinear part of `D(U(sigma))` from the exp and
quotient recurrences), evaluated at `sigma` with `|a_1 sigma| = 10^start`; a Taylor method of order
N with the classical coefficient recurrences, adaptive step, local tolerance `10^-(dps-8)` relative;
the sign of the escape (sign of U when |U| first exceeds 1 after the pulse) at each speed; plain
bisection from [1.1027477, 1.1027478] down to width `10^-(dps-18)`. This code shares no integrator
with `vi_integrate.py` (recurrences here, Picard on arb power series there).

| run | dps | Taylor order | manifold order | start | size of last manifold term | halvings | time |
|---|---|---|---|---|---|---|---|
| A | 80 | 40 | 24 | 1e-8 | 3.7e-182 | about 180 | 27 min |
| B | 76 | 32 | 16 | 1e-6 | 1.9e-90 | about 170 | 34 min |

Final escape-sign brackets:

    A: [1.1027477097341592491478677357466217332550533837818208789272600521127,
        1.1027477097341592491478677357466217332550533837818208789272600602694]   width 8.2e-63
    B: [1.102747709734159249147867735746621733255053383781820878927220647,
        1.102747709734159249147867735746621733255053383781820878927287467]       width 6.7e-59

A lies inside B. Numerical value (60 significant digits, the digits common to both brackets and
their midpoints):

    c* = 1.10274770973415924914786773574662173325505338378182087892726...

Agreement with the claimed `1.10274770973415924914786773574662...`: all 33 quoted significant
digits agree (the difference, 1.7e-33, is the truncation of the quoted value). Error estimate: the
two runs, which differ in precision, both orders, and the start distance by a factor 100, agree to
within B's bracket (6.7e-59), so I trust about 58 digits; I did not estimate the error of run A
beyond that. The README's 55-digit value was not visible to me (it is in `data/`, which I did not
read); it can be compared with the line above.

The rigorous bracket of section 3d contains c* above, 6.1e-33 below its upper end.

## 5. Task 4: max U and the integral-equation check (not rigorous) - `sanity_conv.py`

`sanity_conv.py` recomputes the orbit (70 digits) at the run A value of c*, keeps the part up to
30 time units before its numerical escape (xi <= 158.2 from the start point), and evaluates
`w*S(U) = S0 + w*D(U)` with `w = e^{-|x|}/2` by exact exponential recursions for the two one-sided
integrals, with 24-point Gauss-Legendre quadrature on every Taylor step, plus the two tails
(linear unstable manifold before the start, slow stable direction after the stop).

* max U on the pulse: **0.759716243810** (float, dense sampling), at 21.26 time units after a start
  with U = 1e-8. The claim "U reaches about 0.76" holds. The rigorous run at c1 gives the upper bound
  0.760934784619 (the tube hull over each step makes it loose).
* `|Q_ODE - (w*S(U) - S0)|` at interior step nodes (xi in [5, 133]): **5.6e-16**; `|P_ODE - (w*S(U))'|`:
  4.4e-16. Both at float round-off, so the ODE orbit solves the integral equation to working
  accuracy. Near the cut-off ends the discrepancy rises to 1e-5, which is the crude tail model, not
  the orbit.
* max `|Q - S0|` = 0.983 on the pulse.

This is numerical evidence only; it does not replace a proof that a bounded homoclinic solution of the
ODE gives a pulse (the README states this reduction; with gamma = 0 and Q bounded it is the standard
uniqueness of the bounded solution of `Q'' - Q = -S(U)`, which I agree with but did not write out).

## 6. What is rigorous here and what is not

Rigorous (ball arithmetic, assuming python-flint/Arb and this new code are correct):
the rest state, `S'(0) < 1`, the four real eigenvalues with one positive for all c in [c1, c2], the
unstable eigenvector, the cone lemma conditions, and the sign of U when the orbit on the a > 0 branch
of the unstable manifold reaches |U| > 1, at c1 (negative) and c2 (positive), and at the 16 bisection
speeds.

Not rigorous: the 60-digit shooting, the max of U on the pulse (only an upper bound on the c1
orbit is rigorous), and the convolution check.

Not done at all (so the existence claim stays **unconfirmed** here):
* an isolating block around rest and the proof that the cones K+ and K- are forward invariant in it;
* the Wazewski / connectedness argument that some c in (c1, c2) enters neither cone and stays in the
  block, and that such an orbit converges to rest;
* validated integration over the whole interval [c1, c2] at once (only its two ends were run);
* the reduction "a bounded homoclinic orbit of the ODE is a pulse of the integro-differential
  equation" was checked only numerically (section 5), not proved.

The rigorous parts are also only as good as this code, which nobody else has read. Its main risks,
stated so that a reader can check them: the Lagrange-remainder defect bound (step 2), the Metzler
majorant entries (step 3: row U `[-k_lo, k_hi, k_hi, 0]`, row V `[eps k_hi, 0, 0, 0]`, row Q
`[0, 0, 0, 1]`, row P `[max S', 0, 1, 0]`), and the cone lemma constants.

## 7. Findings

No finding refutes the claim. All findings are about the write-up.

* **N1 (nit).** README, Method, "Rest": "for every c > 0 the rest state has exactly one unstable and
  three stable eigenvalues (Descartes' rule and the imaginary axis)". Descartes gives exactly one
  positive real root, and the imaginary-axis computation (`Im p(iw) = k w (s - 1 - w^2)`, `p(0) < 0`)
  shows no crossing for any c > 0; to conclude that the other three roots have negative real part one
  still needs the continuity step "the number of roots in the right half plane is constant in c > 0,
  and equals 1 at one computed c" (or a Routh-Hurwitz check). The conclusion is right; on [c1, c2] it is
  verified directly here (four real roots, section 2). State the continuity step in the written proof.
* **N2 (nit).** With gamma = 0 the rest state is `(0, S(0), S(0), 0)` for every c, with no equation
  to solve; the written proof can say so in one line (the review task anticipated a fixed-point
  equation, which exists only for gamma > 0).
* **S1 (should-fix, for the README's status wording, not for the mathematics).** The ends-of-interval
  behaviour, the eigenvalue structure and the digits of c* are now reproduced by an independent
  reimplementation, but the isolating block, the Wazewski step and the whole-interval integration
  are not. The README should keep describing the existence theorem as not independently reviewed
  until someone rebuilds or reads those three pieces; this reimplementation supports only the parts
  marked confirmed above.

## Files

| File | What | Time |
|---|---|---|
| `common.py` | constants, `c1`, `c2`, `S'` enclosure | - |
| `rest_eigen.py` | Task 1 | < 1 s |
| `vi_integrate.py` | Task 2 integrator and cone start; `python3 vi_integrate.py c1 c2` | ~40 s |
| `rig_bisect.py` | Task 2 extension: validated bisection of the switch | ~8 min |
| `test_enclosure.py` | test of the integrator against mpmath, with a negative control | ~1 min |
| `shoot_mp.py` | Task 3; `python3 shoot_mp.py 80 40 24 -8` (run A), `76 32 16 -6` (run B) | 27 min, 34 min |
| `sanity_conv.py` | Task 4; `python3 sanity_conv.py <c>` | a few seconds |
| `*_output.txt`, `shoot_mp_*.txt` | the outputs quoted in this file | - |
