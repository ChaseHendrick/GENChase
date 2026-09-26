# Independent existence step for the nf-pulse homoclinic orbit: isolating block and shooting

Reviewer: an independent reimplementer (Claude, working as a sub-agent), 2026-09-26.
Rule followed: nothing in `papers/nf-pulse/code/`, `papers/nf-pulse/data/`, `review/lead/code/` or
`review/lead/math/` was read, imported or copied. The only project files read were `../REIMPL.md` and the
scripts of the earlier independent reimplementation in `..` (`common.py`, `vi_integrate.py`,
`rig_bisect.py`, `rest_eigen.py`, `test_enclosure.py`), which are reused here. The block, its lemma, the
whole-interval integrator, the moving-frame start set and the shooting argument below were designed for
this review from the equations.

## Verdicts

| Item | Status | Where |
|---|---|---|
| Isolating block N around rest: cone condition (P1), inflow on the b-faces (P2), outflow on the a-faces (P3), for all states in N and all c in [c1, c2] | **confirmed (rigorous, exact rational arithmetic)** | `block_lemma.py`, section 2 |
| Every orbit that stays in N for all later times tends to rest | **confirmed (proof, section 2)** | |
| For ALL c in [c1, c2] at once, the orbit from the a>0 branch of W^u is in the interior of N at xi = T = 170 | **confirmed (rigorous, modulo correctness of this new code)** | `kappa_run.py`, section 3 |
| c1: from T the orbit stays in N and enters the cone K- = {a < -\|b\|} inside N by xi = 175.125, so it leaves N through a = -r | **confirmed (rigorous, same proviso)** | `exit_runs.py` |
| c2: same with K+ = {a > \|b\|}, by xi = 174.625, leaves through a = +r | **confirmed (rigorous, same proviso)** | `exit_runs.py` |
| Wazewski / connectedness: some c in (c1, c2) has an orbit that stays in N for xi >= T and tends to rest, i.e. a homoclinic orbit of the wave ODE | **confirmed, conditional on** the standard parametric unstable manifold theorem (continuity of the start point in c, section 4) and on the correctness of python-flint/Arb and of this code, which nobody else has read | section 4 |
| Negative controls (block too large, wrong speeds, too wide a speed set, test integrator against the earlier one) | **all behave as required** | section 5 |
| A bounded homoclinic orbit of the ODE is a travelling pulse of the integro-differential equation | **unconfirmed** here (not in scope; REIMPL.md section 5 checked it numerically only) | |

Nothing found contradicts the paper's claim. Findings are in section 7.

## 1. Setting

Deviation coordinates `y = x - x*`, `x* = (0, S(0), S(0), 0)`, `kappa = 1/c`:

    U' = kappa (Q - U - V),   V' = eps kappa U,   Q' = P,   P' = Q - D(U),   D(U) = S(U) - S(0).

Mean value theorem: `D(U) = s(U) U` with `s(U) = int_0^1 S'(theta U) d theta`, which lies in
`[min S', max S']` over the segment `[0, U]`. Hence, exactly (not a linearisation),

    y' = J(s(U), kappa) y,   J(s, kappa) = [[-kappa, -kappa, kappa, 0], [eps kappa, 0, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]].

`J` is affine in `(s, kappa)`.

**Block coordinates.** `T_blk` is an exact dyadic 4x4 matrix whose columns approximate the eigenvectors
for `lambda_u = 0.9688`, `lambda_slow = -0.1247`, `lambda_2 = -0.5831`, `lambda_3 = -1.1678` at
`kappa = 1/c1` (each scaled so its U-component is exactly 1; other entries rounded to multiples of
2^-60). `Ti = T_blk^{-1}` is computed as an exact rational matrix. With `z = (a, b) = Ti y`,
`b in R^3`, the system is exactly `z' = A(s, kappa) z`, `A(s, kappa) = Ti J(s, kappa) T_blk`. At
`s = S'(0)` the off-diagonal entries of A are about 1e-18 (rounding of `T_blk`), so A is essentially
`diag(lambda_u, lambda_slow, lambda_2, lambda_3)`. Since the U-row of `T_blk` is `(1, 1, 1, 1)`,
`U = a + b_1 + b_2 + b_3` and the unstable branch with `a > 0` is the one on which U increases.

**The block.** `r = 1/80`,

    N = { z : |a| <= r, |b|_2 <= r },   L(z) = a^2 - |b|_2^2,
    K+ = { z in N : a > |b|_2 },   K- = { z in N : a < -|b|_2 }.

In N, `|U| <= |a| + |b|_1 <= r (1 + sqrt 3) <= Umax := r * 2.732051 = 0.034151 < theta`, and `S'` is
increasing on `(-inf, theta)`, so `s(U)` lies in `[s_lo, s_hi] = [0.067605, 0.259822]` (rigorous rational
bounds of `S'(-Umax)`, `S'(Umax)` from arb).

## 2. The block lemma and its proof

**Verified matrix conditions** (`block_lemma.py`). For all `(s, kappa)` in the box
`[s_lo, s_hi] x [1/c2, 1/c1]`, with `A = A(s, kappa)`, `A_aa` its (1,1) entry, `A_ab` the rest of its
first row, `A_ba` the rest of its first column, `A_bb` the lower 3x3 block, `G = diag(1, -1, -1, -1)`,
`mu = 1/10`, `mu2 = 1/2`:

* (P1) `M1 = G A + A^T G  >=  (1/10) I`;
* (P2) `H2 = [[-mu, A_ba^T], [A_ba, A_bb + A_bb^T + mu I]]  <=  -(1/50) I`;
* (P3) `H3 = [[A_aa - mu2, A_ab/2], [A_ab^T/2, mu2 I]]  >=  (1/5) I`.

*How this is verified rigorously.* Each of `M1`, `H2`, `H3` is affine in `(s, kappa)`. The smallest
eigenvalue of a symmetric matrix is a concave function of the matrix (a minimum of the linear functions
`x^T M x` over unit x), so over the parameter box it attains its minimum at one of the four vertices. At
each vertex `s` and `kappa` are exact rationals (`s_lo`, `s_hi` dyadic, `kappa = 1/c2` or `1/c1` exactly),
so `M1 - I/10`, `-H2 - I/50`, `H3 - I/5` are exact rational matrices, and their positive definiteness is
decided by Sylvester's criterion with all four leading principal minors computed exactly in `fmpq`. All
twelve tests pass. No floating point enters a decision.

**Lemma (isolating block).** For every c in [c1, c2]:

1. `dL/dxi >= (1/10) |z|^2` at every point of N.
2. On the b-faces `{|b|_2 = r, |a| <= r}`: `d|b|_2^2/dxi < 0` (strict inflow).
3. On the a-faces `{|a| = r, |b|_2 <= r}`: `d(a^2)/dxi > 0` (strict outflow).
4. Consequently the set of points of N at which the orbit leaves N is exactly `N^- = {|a| = r}`, every
   point of `N^-` is a strict egress point, and `N^-` has the two components `{a = r}` and `{a = -r}`.
5. K+ and K- are positively invariant relative to N (an orbit in K+ stays in K+ as long as it stays in
   N), and every orbit in K+ (K-) leaves N, through `a = +r` (`a = -r`).
6. An orbit that stays in N for all `xi >= xi_0` tends to `z = 0`, i.e. to x*.

*Proof.* In N, `z' = A z` with `A = A(s(U(z)), kappa)` for a value `s(U(z))` in `[s_lo, s_hi]`.

(1) `dL/dxi = d(z^T G z)/dxi = z^T (G A + A^T G) z = z^T M1 z >= |z|^2 / 10` by (P1).

(2) `d|b|^2/dxi = 2 b^T (A_ba a + A_bb b) = z^T H0 z` with `H0 = [[0, A_ba^T], [A_ba, A_bb + A_bb^T]]`, and
`H0 = H2 + diag(mu, -mu, -mu, -mu)`, so `z^T H0 z = z^T H2 z + mu (a^2 - |b|^2) <= -|z|^2/50 + mu (a^2 - |b|^2)`.
On a b-face `a^2 <= r^2 = |b|^2`, hence `d|b|^2/dxi <= -|z|^2/50 < 0`.

(3) `(1/2) d(a^2)/dxi = a (A_aa a + A_ab b) = z^T H3 z + mu2 (a^2 - |b|^2) >= |z|^2/5 > 0` on an a-face,
where `a^2 = r^2 >= |b|^2`.

(4) A point of the boundary of N lies on an a-face or on a b-face (or both). At a b-face point with
`|a| < r`, `|b|^2` strictly decreases and `a^2 < r^2` persists for a short time, so the orbit is in the
interior of N just after, and just before it was outside N: it is a strict ingress point, not an exit
point. At an a-face point (including corners), `a^2` strictly increases, so the orbit is outside N for
all small positive times: a strict egress point. So exit happens only through `{|a| = r}`, and always
strictly. The two components are disjoint closed sets.

(5) In N, `L` is nondecreasing along orbits (by (1)); on `{a = 0}` we have `L = -|b|^2 <= 0`. An orbit in
K+ has `L > 0`, hence keeps `L > 0` while in N, hence never reaches `a = 0`, hence keeps `a > 0`, so it
stays in K+ while in N. If it stayed in N forever, (6) would give `z -> 0` and `L -> 0`, contradicting
`L` nondecreasing from a positive value. So it leaves N, through `{|a| = r}` by (4), and since `a > 0`,
through `a = +r`. Same for K-.

(6) Let the orbit stay in N for `xi >= xi_0`. `L` is nondecreasing and `L <= r^2`, so by (1)
`int_{xi_0}^inf |z|^2 d xi <= 10 (r^2 - L(xi_0)) <= 20 r^2 < inf`. The vector field is bounded on the
compact set N, so `|z|^2` is uniformly continuous in xi, and Barbalat's lemma gives `|z(xi)| -> 0`. QED.

**Remark on the exit sign.** On `a = +r` the flow exits with `a' > 0`, on `a = -r` with `a' < 0`, and
between them no exit is possible, so "the sign of the exit" is well defined for every orbit that leaves.

## 3. The whole-interval computation

### 3a. Start set valid for every c in [c1, c2] (moving frame)

The earlier start set (REIMPL.md 3b) uses one eigenvector matrix for all kappa. Over a kappa set of width
8e-26 its off-diagonal defect is about 7e-25 (seen in the first attempt here), which forces a cone slope
`L >= 1e-24` and an initial error far too large for a run of length 170. Here the coordinates move with
kappa:

    y = T(kappa) (a, b),   T(kappa) = T0 + (kappa - kap0) T1,

`T0`, `T1` exact dyadics (2^-300 grid), `T1` a central-difference kappa-derivative of the eigenvector
matrix (a numerical choice; it is not trusted, only used). The matrix
`Lt(kappa) = T(kappa)^{-1} J(kappa) T(kappa)` is enclosed by the mean-value form
`Lt(kap0) + [-w, w] * dLt/dkappa(kappa set)`, with
`dLt/dkappa = T^{-1}(J' T + J T1) - T^{-1} T1 T^{-1} J T` evaluated in arb over the whole kappa ball.
The off-diagonal part is then at most 3.6e-49, and conditions C1, C2, C3 of REIMPL.md 3b hold with
`L = 2^-150`, `r_b = 2^-315` for every kappa in the set (`kappa_run_output.txt`, first lines). By that
lemma, for every c in [c1, c2] the a > 0 branch of W^u(c) passes through a point `p(c)` with `a = delta
= 2^-166`, `|b|_inf <= L delta`, i.e.

    | p(c) - y0 - (kappa - kap0) d0 | <= z0   componentwise,  y0 = delta T0 e1,  d0 = delta T1 e1,

with `z0 <= 2.3e-95`. The kappa set is `[kap0 - w, kap0 + w]`, `kap0` a 300-bit dyadic,
`w = 4.1117e-26`, and it contains `[1/c2, 1/c1]`.

### 3b. The integrator: centre + first-order kappa term + remainder (`blk_common.advance8`)

Per step, from exact centres `y_n` (state) and `d_n` (approximate kappa-derivative) and a bound `z_n`
with `|x_kappa(t_n) - y_n - (kappa - kap0) d_n| <= z_n` for every kappa in the set:

1. Degree-48 Taylor polynomials `p` (state) and `q` (variational equation
   `q' = Df_kap0(p) q + F1(p)`, `F1(y) = (Q-U-V, eps U, 0, 0) = df/dkappa`) at `kap0`, by Picard iteration
   on arb power series, rounded to exact dyadics and not trusted.
2. Rigorous defects `rho_x >= sup|p' - f_kap0(p)|`, `rho_d >= sup|q' - Df_kap0(p) q - F1(p)|` on `[0, h]`
   (Taylor coefficients at 0 plus the Lagrange term with the N-th coefficient enclosed on the ball
   `[0, h]`; the method of `vi_integrate.defect`, extended to the 8-dimensional system).
3. The error `e = x_kappa - p - (kappa - kap0) q` satisfies, for each fixed kappa, `e' = A(t) e + r(t)`
   with `A(t)` in `Df_kappa` over the segment from `p + dk q` to `x_kappa` and, because f is affine in
   kappa and only `D(U)` is nonlinear,

       r = [f_kap0(p) - p'] + dk [Df_kap0(p) q + F1(p) - q'] + dk^2 F1(q) - e4 [D(p_U + dk q_U) - D(p_U) - S'(p_U) dk q_U],

   so `|r| <= rho_x + w rho_d + w^2 |F1(q)| + e4 * 39 (w q_U)^2 / 2` (`|S''| <= beta^2/(6 sqrt 3) < 39`).
4. Comparison principle with the Metzler majorant of `Df` over the tube (kappa over the whole set, `S'`
   over the U-tube `p_U + [-w|q_U|] + [-eta, eta]`), the same a priori bootstrap and update as
   `vi_integrate.advance`: `z_{n+1} = e^{Mh} z_n + h e^{M+ h} rho + rad p(h) + w rad q(h)`.

The point of the design: the kappa spread `(kappa - kap0) d(t)` is carried exactly by `d`, so the
Metzler overestimate (10^5 to 10^9 along this orbit, REIMPL.md 3a) multiplies only the tiny remainder
terms, not the spread itself. The spread of the unstable coordinate at T is then the true one.

### 3c. Results

All with python-flint 0.9.0, arb at 320 bits, Taylor order 48, on one core each.

**Whole interval, T = 170** (`kappa_run.py`, 870 steps, 40 s):

    a in [+/- 6.87e-5],   b = ([-0.007980 +/- 4.84e-7], [0.00027 +/- 2.03e-6], [-6.5e-5 +/- 5.44e-7]),
    |b|_2 <= 0.0079853 < r = 0.0125,  |a| < r.

So for every c in [c1, c2], `phi_c(170)` is in the interior of N. (**confirmed**)

**Exit runs** (`exit_runs.py`, point kappa sets of half width about 2^-300, steps of at most 1/8 after
xi = 165, 126 s including a repeat of the interval run):

| | c1 | c2 |
|---|---|---|
| step tubes on (T, T'] inside N | all 41 | all 37 |
| T' | 175.125 | 174.625 |
| a at T' | -0.004338821278 +/- 4.2e-13 | 0.004795480778 +/- 4.3e-13 |
| \|b\|_2 at T' | <= 0.004261 | <= 0.004508 |
| state at T' | in K- (a < -\|b\|, \|a\| < r) | in K+ |
| conclusion (lemma 5) | leaves N through a = -r | leaves N through a = +r |

Consistency: the c1 and c2 point enclosures at T lie inside the interval run's enclosure
`y + (1/c - kap0) d +- z` evaluated at their own kappa. (**confirmed**)

## 4. The shooting argument

Let `phi_c` be the orbit with `phi_c(0) = p(c)` (section 3a), `c in I = [c1, c2]`.

*Continuity of p(c).* For each c, rest is hyperbolic with a one-dimensional unstable manifold, and by the
unstable manifold theorem with parameters the local unstable manifold is a C^1 curve depending
continuously on kappa. In the moving frame its a > 0 branch lies in the cone `|b| <= L a` and, by C3,
`a' > 0` along it, so it crosses the hyperplane `{a = delta}` of `T(kappa)`-coordinates exactly once and
transversally; the crossing point `p(c)` is therefore unique and, by the implicit function theorem,
continuous in c. Hence `c -> phi_c(xi)` is continuous for each xi (continuous dependence on initial data
and parameter). This step uses the standard theorem; it is not a computer check. (**confirmed as a
standard argument**, not computed)

*Definition.* By section 3c, `phi_c(T) in int N` for every c in I. Let `E+` (`E-`) be the set of c in I
for which the orbit, after T, leaves N, and leaves it first through `a = +r` (`a = -r`).

*E+ and E- are open in I and disjoint.* Disjoint by definition. Let `c0 in E+` with first exit time
`tau > T`. On `[T, tau)` the orbit is in N and, by lemma (4), not on the boundary except possibly at
b-face points, which are strict ingress points and so cannot be reached from inside; hence it is in
int N on `[T, tau)`. Pick `eps > 0` small: `a > 0` on `[tau - eps, tau + eps]` and `a(tau + eps) > r`
(strict egress). For c near c0, by continuity on the compact interval `[T, tau + eps]`: `phi_c` stays in
int N on `[T, tau - eps]` (a compact piece of the interior), has `a > 0` on `[tau - eps, tau + eps]`,
and has `a > r` at `tau + eps`. So it leaves N before `tau + eps`, its first exit is through `{|a| = r}`
(lemma 4) at a time in `(tau - eps, tau + eps)` where `a > 0`, i.e. through `a = +r`. So c is in E+.
The same for E-.

*End points.* c1 is in E- and c2 is in E+ (section 3c with lemma 5: from T to T' the orbit stays in N,
at T' it is in K-, resp. K+, and from there it leaves through `a = -r`, resp. `a = +r`, with no other
exit in between).

*Conclusion.* I is connected, E- and E+ are disjoint, open, and nonempty, so `I != E- u E+`: there is
`c* in I` whose orbit never leaves N after T (the only exits are through `|a| = r`, lemma 4). Since c1
and c2 are in `E- u E+`, `c* in (c1, c2)`. By lemma (6), `phi_{c*}(xi) -> x*` as `xi -> +inf`; by
construction `phi_{c*}(xi) -> x*` as `xi -> -inf` (it lies on W^u). It is not the rest point itself, since
`phi_{c*}(0) = p(c*)` has `a = delta != 0`. Hence **the wave ODE has a homoclinic
orbit to x* for some c in (c1, c2)**, on the U-increasing branch.

This is exactly the paper's claim at the level of the ODE, reached with an independently designed block
(a Euclidean cone in exact eigen-coordinates, verified by concavity plus exact Sylvester minors) and an
independently designed whole-interval integrator.

## 5. Negative controls

| Control | Expected | Observed | Log |
|---|---|---|---|
| (n1) block too large, r = 1/20 (s up to 1.70) | (P1)-(P3) fail | fail at the s_hi vertices | `block_lemma_output.txt` |
| (n2) r = 1/30 (s up to 0.77) | fail | (P1), (P2) fail | same |
| (n3) PD margin 1 in (P1), above lambda_min (about 0.22) | fail (test not vacuous) | fails at all vertices | same |
| (n4) mu = 3/10 > 2\|lambda_slow\| | (P2) fails | fails at all vertices | same |
| (n5) c = c1 + 30e-27 < c* used as the right end | must not reach K+ | reaches K- at 176.875 | `exit_runs_neg_output.txt` |
| (n6) c = c1 + 40e-27 > c* used as the left end | must not reach K- | reaches K+ at 177.125 | same |
| (n7) speed set [c1, c1 + 1e-22] (1000 times wider), start lemma with L = 2^-130 | not inside N at T | a in [+/- 0.092], \|b\| <= 0.069: fails | `kappa_run_neg_wide_output.txt` |
| (n8) speed set [1.1027477, 1.1027478] | fails | fails already at the start lemma (off-diagonal 3.6e-13) | `kappa_run_neg_coarse_output.txt` |
| (t1) interval enclosure vs the earlier, separately tested integrator `vi_integrate.advance` at c1, c2 | overlap | overlap in all components | `test_advance8_output.txt` |
| (t2) point at c1 + 5e-27 compared with the interval enclosure at kappa(c1) | no overlap | no overlap | same |

(n5) and (n6) also bracket c* between c1 + 30e-27 and c1 + 40e-27, consistent with REIMPL.md 3d.

## 6. What is rigorous and what is not

Rigorous, assuming python-flint/Arb and this code are correct: the block conditions (exact rational
arithmetic), the moving-frame start set, the whole-interval enclosure at T, the exit runs, the lemma
and the shooting argument built on them.

Relied on without computer check: the parametric unstable manifold theorem (continuity of p(c)), the
comparison theorem for quasimonotone systems (as in REIMPL.md), Barbalat's lemma, Sylvester's
criterion, concavity of lambda_min.

Risks a reader should check, in order: the forcing bound in 3b step 3 (the exact second-order kappa
terms), the moving-frame enclosure of `Lt` (mean-value form, 3a), the use of the U-row `(1,1,1,1)` for
`Umax`, and the "first exit" bookkeeping in `exit_runs.py` (the step sequence lands exactly on T, and
every step after it is checked).

Not done: the reduction from a bounded homoclinic orbit of the ODE to a pulse of the integral equation;
uniqueness of c*; any statement about the stability of the pulse.

## 7. Findings

No finding contradicts the paper's claim.

* **S2 (should-fix, status wording).** With this block, the existence step (isolating block, whole
  interval run, Wazewski argument) is now independently rebuilt and confirmed, on top of REIMPL.md's
  confirmation of the eigenvalue structure and the end behaviour. The README can say the existence of a
  homoclinic orbit of the wave ODE has been independently reproduced by a separate design, but both
  reimplementations are machine-written and unread by a human, and the ODE-to-pulse reduction remains
  unreviewed, so "not independently reviewed" should stay until a person has read one of them.
* **N3 (nit).** Any write-up that states a whole-interval computation should say how the kappa spread is
  kept from being multiplied by the wrapping of the error bound; the first attempt here with a fixed
  eigenframe failed the start lemma for exactly this reason (off-diagonal 7e-25 against a cone slope of
  7e-46). If the paper's block uses a fixed frame over [c1, c2], it must use a correspondingly larger cone
  slope and should report the resulting initial error.

## Files

| File | What | Time |
|---|---|---|
| `blk_common.py` | block matrix, exact A(s, kappa), moving-frame start set, whole-interval integrator | - |
| `block_lemma.py` | (P1)-(P3) exactly at the four vertices, controls n1-n4; `python3 block_lemma.py` | < 1 s |
| `kappa_run.py` | whole-interval run to T; `python3 kappa_run.py 170`; controls with extra arguments | 40 s |
| `exit_runs.py` | c1, c2 exits and consistency; `python3 exit_runs.py`; controls `python3 exit_runs.py neg` | 126 s, 90 s |
| `test_advance8.py` | cross-check against `vi_integrate.advance`, with a control | 85 s |
| `*_output.txt` | the logs quoted above | - |
