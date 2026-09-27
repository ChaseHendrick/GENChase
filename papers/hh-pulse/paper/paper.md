---
title: "The propagated action potential of Hodgkin and Huxley at their 1952 constants: a computer-assisted existence proof"
author: "Chase Hendrick, Independent Researcher (ORCID 0009-0002-9754-6087)"
status: "Draft, 2026-09-27. Not reviewed outside this project. See notes/QUALITY.md for what has and has not been checked."
---

## Abstract

In 1952 Hodgkin and Huxley computed their propagated action potential by hand, shooting in the conduction speed on
their travelling-wave equation (J. Physiol. 117, eq. (31)), and noted that the solution "goes off towards either
+infinity or -infinity" on the two sides of the speed. The existence proofs that followed, by Hastings (1976) and
Carpenter (1977), treat modified systems in which the gating variables are slowed or sped up by small parameters. We
give a computer-assisted proof, in ball arithmetic, that the unmodified equation, with Hodgkin and Huxley's rate
functions and constants as printed (including the leak potential 10.613 mV), has a pulse, an orbit homoclinic to rest,
at 18.5 C and at 6.3 C. At 18.5 C the speed K parameter is pinned in an interval of width 3e-45, which gives a
conduction speed of 18.731888247880483540468313433296243876955750774 m/s (to about 45 digits) for the fibre constants of
their p. 528, against the 18.8 m/s they computed. The proof leaves rest along its one-dimensional unstable manifold,
carries a whole speed interval through the spike with a validated Taylor integrator, and closes with an isolating block
with a cone condition around rest and a Wazewski-type shooting argument. [Computer-assisted.]

## 1. Introduction

**The question.** A travelling wave V(x, t) = V(t - x/theta) of the Hodgkin-Huxley cable equation solves eq. (31) of
Hodgkin and Huxley (1952, p. 524),

    d^2V/dt^2 = K { dV/dt + (1/C_M) [ g_K n^4 (V - V_K) + g_Na m^3 h (V - V_Na) + g_l (V - V_l) ] },
    K = 2 R_2 theta^2 C_M / a,

together with their equations for m, n, h. A propagated action potential is a solution that starts and ends at rest.
Hodgkin and Huxley found it numerically, at K = 10.47 /ms and 18.5 C (their p. 528). **Is there a proof that it
exists, at their own constants?**

**What was known** (details in Section 6). Hastings (1976) proved existence for a class of Hodgkin-Huxley-type systems in
which n and h are slowed by a factor epsilon, "for epsilon sufficiently small", and wrote that "it is not clear that
our results apply to the original HODGKIN-HUXLEY system" (p. 230). Carpenter (1977) proved existence for a generalized
Hodgkin-Huxley system under abstract hypotheses, with n and h slowed by epsilon and m sped up by 1/delta, "for small
epsilon" (Theorem 3.4) and "all small delta" (Theorem 4.2), and showed that the pulse is lost when either parameter is
too large (Theorem 5.1(B)). Neither treats epsilon = delta = 1 at the 1952 functions. Computer-assisted proofs of
travelling pulses exist for the FitzHugh-Nagumo equation (Arioli and Koch 2015, and others), not, as far as we found,
for Hodgkin-Huxley.

**What we prove.** Theorems 1 and 2 (Section 3): at 18.5 C and at 6.3 C, with the 1952 rate functions and constants
and the printed leak potential, the travelling-wave system has a pulse, with the speed parameter K in an explicit
interval of width 3e-45 at 18.5 C and 2.8e-61 at 6.3 C. [Computer-assisted.] The same holds at 18.5 C with the leak
potential that makes the resting current exactly zero (Remark 1). [Computer-assisted.]

**Priority, conditionally.** On the searches logged in the repository (RESEARCH.md, entries of 2026-09-25 to
2026-09-27; `papers/hh-dynamics/work/traveling-wave/prior-art-log.md`), this is the first existence proof for the
unmodified 1952 equations. The statement is conditional: Hastings (1976) was read on pp. 229-230 only; Foote and
Chen, "Traveling wave properties of the Hodgkin-Huxley equations", Chinese J. Math. 9 (1981) 1-23, was not read at
all; zbMATH Open has no review of either (Zbl 0374.35004, Zbl 0472.35048), and MathSciNet was not reachable.
Carpenter (1977) was read in full.

## 2. The equations

We use the modern sign convention u = -V (depolarization, mV), t in ms, C_M = 1 uF/cm^2. Eq. (31) is odd in V and
keeps its form:

    u'' = K (u' + I(u, m, n, h)),   I = 120 m^3 h (u - 115) + 36 n^4 (u + 12) + 0.3 (u - E_l),
    x'  = phi (alpha_x(u) (1 - x) - beta_x(u) x),   x = m, n, h,   phi = 3^((T - 6.3)/10),

with alpha_m = Psi((25 - u)/10), beta_m = 4 e^(-u/18), alpha_n = Psi((10 - u)/10)/10, beta_n = e^(-u/80)/8,
alpha_h = 0.07 e^(-u/20), beta_h = 1/(e^((30 - u)/10) + 1), Psi(x) = x/(e^x - 1) (Psi(0) = 1), and
**E_l = 10.613 mV**, Hodgkin and Huxley's V_l = -10.613 mV (Table 3) in our convention. The state is
y = (u, u', m, n, h) in R^5. The speed is theta = sqrt(K a / (2 R_2 C_M)), with a = 238 um and R_2 = 35.4 ohm cm
for the fibre of their p. 528.

With the printed E_l the resting current is not exactly zero at u = 0 (Table 3's footnote says the value was chosen to
make it zero; with the printed rate functions the exact value is 10.5989...). Rest is then the equilibrium
y* = (u*, 0, m_inf(u*), n_inf(u*), h_inf(u*)) with

    u* = 0.0036206688079425688368876905420... mV     [computer-assisted: an interval Newton step in ball
                                                       arithmetic; unique within 1e-3 mV of this value]

and it does not depend on T. A pulse is a non-constant solution with y(t) -> y* as t -> +-infinity.

## 3. Results

**Theorem 1 (18.5 C).** [Computer-assisted.] Let T = 18.5 C. For some K* in (K1, K2), with K1 and K2 the exact binary
fractions of `papers/hh-dynamics/work/traveling-wave/data/pulse_proof_18.5_El10.613_config.json`,

    K1 = 10.438051060101123692276486238318579121858669770478...,   K2 - K1 = 3.000e-45 (to 4 digits),

the system of Section 2 has a pulse. It leaves rest along the branch of the unstable manifold on which u increases,
and max u > 90.58 mV. The corresponding speed lies in

    (18.73188824788048354046831343329624387695575077276, 18.73188824788048354046831343329624387695575077548) m/s.

**Theorem 2 (6.3 C).** [Computer-assisted.] Let T = 6.3 C. For some K* in (K1, K2), with K1 and K2 the exact binary
fractions of `data/pulse_proof_6.3_El10.613_config.json`,

    K1 = 4.51063243827085102104174385842888070411449431302344897921140063822623...,   K2 - K1 = 2.800e-61,

the system of Section 2 has a pulse, and max u > 102.98 mV. The corresponding speed lies in

    (12.313756720162298508179797283771499327244899734708115548799408270,
     12.313756720162298508179797283771499327244899734708115548799408655) m/s.

**Remark 1 (the zero-current leak potential).** [Computer-assisted.] With E_l = 10.5989209693916785... (the value
that makes the resting current zero at u = 0) Theorem 1 holds with K2 - K1 = 3e-45 and the speed in
(18.73216081438890211377538515402816936801773373586, 18.73216081438890211377538515402816936801773373858) m/s.

**Remark 2 (numerical, not proved).** High-precision multiple shooting gives K* = 10.43805106010112369227648623831857
912185866977197832623... at 18.5 C and K* = 4.510632438270851021041743858428880704114494313023448979211400... at
6.3 C (printed E_l), which Theorems 1 and 2 confirm to 45 and 61 digits.
Hodgkin and Huxley's K = 10.47 /ms is 0.3 per cent higher; their 18.8 m/s is our 18.73 rounded after a hand
integration. The measured speed in that fibre was 21.2 m/s.

**Not claimed.** Uniqueness of the pulse or of K*; stability; other temperatures; the slow pulse that Huxley (1959)
and later authors found numerically.

## 4. The proof

The proof has five computed hypotheses (H1 to H5) and an argument that uses only them, the local unstable manifold
theorem with parameters, and continuous dependence on initial data and parameters. All computations are in ball
arithmetic (FLINT/Arb through python-flint 0.9.0) at 256 bits; each program stops on a failed check.

**(H1) Rest and its eigenvalues** (`certify_rest_wave.lemma_A`). For every K in [K1, K2], the characteristic
polynomial P of Df(y*) has one simple real root lambda_u in an enclosed interval (P(a) < 0 < P(b), P' > 0 on [a, b])
and the quotient P/(x - lambda_u) satisfies the Hurwitz inequalities. So W^u(y*) is a curve and W^s(y*) is
four-dimensional.

**(H2) Where W^u leaves a small box** (`certify_rest_wave.lemma_B`). In z = T_B (y - y*), with T_B an exact binary
matrix inverting a rigorously enclosed eigenbasis (unstable, fast real, complex pair, slow real) to about 1e-70, let
B = {|z1| <= r_B, |z2| <= s2, z3^2 + z4^2 <= s3^2, |z5| <= s5} with r_B = 1e-25 (18.5 C) or 1e-32 (6.3 C) and
s_j of order r_B^2. Checked over B and the K interval: every stable face is strictly inflowing, and D A + A^T D
(D = diag(1, -1, -1, -1, -1), A the interval matrix of T_B Df T_B^-1 over B) is positive definite. **Lemma 1.** The
branch of W^u tangent to +e1 leaves B through the face z1 = r_B. *Proof.* Near y* the branch lies in the interior of
B, since the eigenvector is e1 up to 1e-70 while the aspect ratio of B is at least 1e-26; there L = z1^2 - |z'|^2 > 0.
Since f(y*) = 0 and B is convex, z' = A-bar(z) z with A-bar an average of Jacobians over the segment [y*, y], so
dL/dt = z^T (D A-bar + A-bar^T D) z > 0 for z != 0. The orbit cannot leave through a stable face (strict inflow),
and cannot stay in B for all time (its omega-limit set would lie in a level set of L, which the cone condition allows
only at y*, where L = 0 < L(orbit)). **(H2')** z1' > 0 on the whole face z1 = r_B, so the exit is transversal and the
exit point p(K) depends continuously on K (the local unstable manifold depends continuously on K; the first exit time
is continuous at a transversal exit from the interior).

**(H3) The closing block** (`block0.py`). In zeta = M (y - y*), M = diag(10, 7, 1, 1, 40) T (T an exact binary
approximate inverse eigenbasis), let B0 = {|zeta_1| <= r, |zeta_s|_2 <= rho}, zeta_s = (zeta_2, ..., zeta_5), with
rho = 0.8, r = 0.84 (18.5 C) and rho = 0.6, r = 0.63 (6.3 C). Checked on a cover of B0 by cells (interval Cholesky
factorizations), for every K in the interval: (C) D A + A^T D is positive definite for A = M Df(x) M^-1, x in B0;
(E) lambda_max(sym A_ss) + |A_s1|_2 < 0 for x in B0 with |zeta_1| <= rho. **Lemma 2.** While an orbit is in B0,
L = zeta_1^2 - |zeta_s|^2 increases strictly; every boundary point of B0 with L <= 0 is a point of strict entrance;
the cones K+ = {L > 0, zeta_1 > 0} and K- = {L > 0, zeta_1 < 0} cannot be left while the orbit stays in B0; and an
orbit that stays in B0 for all t >= t0 tends to y*. *Proof.* zeta' = A-bar zeta as in Lemma 1, the average taken over
the segment [y*, y], which lies in B0 (and in {|zeta_1| <= rho} when |zeta_1| <= rho). The smallest eigenvalue of
D A + A^T D is concave in A and lambda_max(sym A_ss) + |A_s1|_2 is convex, so the bounds (C) and (E), valid for every
Df(x) in the region, hold for averages. Then dL/dt > 0 for zeta != 0; at a boundary point with L <= 0 we have
|zeta_s| = rho and |zeta_1| <= rho (because r > rho), and d|zeta_s|^2/dt / 2 <= (lambda_max(sym A-bar_ss) +
|A-bar_s1|) rho^2 < 0; L > 0 persists, so zeta_1 keeps its sign; and the omega-limit set of an orbit that stays in
B0 is invariant, lies in a level set of L, hence is {y*}. The face |zeta_1| = r is not used.

**(H4) The interval run** (`prove_pulse.py interval`). A C^0 Lohner integrator in the six variables (y, K), K' = 0
(`lohner6.py`; Taylor jets of order 40 with derivatives in the initial point, `hhjet6.py`), carries a set containing
{(p, K) : p in the exit set of (H2), K in [K1, K2]} from t = 0 to t = T_enter and encloses it in the interior of B0.
Each step uses an a priori enclosure W (Xh + [0, h] f(W) inside W), tightened by Taylor's theorem at low order; the
Lagrange remainder of order 41 enclosed over four subintervals of the step; the mean-value form of the Taylor
polynomial over the hull; and the QR representation of the set.

**(H5) The endpoint runs** (`prove_pulse.py K1`, `K2`). For K = K1 (resp. K2) the exit set is carried to T_enter, lies
in int B0 there, and is carried further in steps of 2^-7 ms with the whole path of every step enclosed (Taylor
polynomial over [0, h] plus the remainder) and inside int B0, until the set lies in K- (resp. K+).

**Proof of Theorems 1 and 2 from (H1) to (H5).** For K in [K1, K2] let x_K be the solution with x_K(0) = p(K). It lies
on W^u(y*), so x_K(t) -> y* as t -> -infinity, and K -> x_K(t) is continuous, uniformly for t in compact intervals.
Let S+ (resp. S-) be the set of K for which there is t >= T_enter with x_K([T_enter, t]) in int B0 and x_K(t) in K+
(resp. K-). Both are open in [K1, K2] (finitely many open conditions over a compact time interval); they are disjoint
(Lemma 2: a cone cannot be left while in B0); and K2 is in S+, K1 in S- (H5). Since [K1, K2] is connected, some K* is in
neither. By (H4), x_{K*}(T_enter) is in int B0. If x_{K*} left B0, then at the first time t_e at which it reaches the
boundary, either L <= 0, and the orbit enters B0 strictly there, so it was outside B0 just before t_e, which it was
not; or L > 0, and then it was in K+ or K- just before t_e while in int B0, so K* would be in S+ or S-. Hence
x_{K*}(t) stays in B0 for t >= T_enter and tends to y* (Lemma 2). It is not constant. So it is a pulse, and the speed
bounds follow from theta = sqrt(K a / (2 R_2 C_M)) in ball arithmetic. The lower bound on max u is a lower end of the
enclosure of u at a step end of the interval run. QED.

**What is not part of the proof.** The numerical centre K* (Remark 2), used only to place [K1, K2]; the choice of the
weights, radii and T_enter; floating-point step-size heuristics (they choose step lengths; every enclosure is checked).

## 5. Computations, controls and checks

Table: stages at 18.5 C (printed E_l), one process at a time, 256 bits, order 40.

| stage | result | CPU time |
|---|---|---|
| setup (H1, H2, H2', H3) | lambda_u = 10.89231...; Lemma B passes; z1' > 0 on the exit face; B0 certified on 1232 + 5916 cells | seconds |
| interval (H4) | at T_enter = 13.625 ms: zeta_1 in [-0.341, 0.341], abs(zeta_s) <= 0.63603 < 0.8 | 597 s |
| K1 (H5) | enters K- at 13.6875 ms, path in int B0 | 570 s |
| K2 (H5) | enters K+ at 13.6875 ms, path in int B0 | 561 s |
| negative control: K interval shifted by 40 half-widths | zeta_1 about 13 at T_enter, outside B0: fails, as it must | 566 s |
| negative control: alpha_m times (1 + 1e-12 (u - u*)^2) | the whole set escapes below u = -60 mV at 6.72 ms: fails, as it must | 602 s |
| negative controls in setup | a bracket above lambda_u; Lemma B faces 100 times thinner; B0 with radius x 1.5: all rejected | seconds |

Table: the same at 6.3 C (printed E_l).

| stage | result | CPU time |
|---|---|---|
| setup (H1, H2, H2', H3) | lambda_u = 4.97403...; Lemma B at r_B = 1e-32; z1' > 0 on the exit face; B0 certified on 3590 + 1374 cells | seconds |
| interval (H4) | at T_enter = 36.125 ms: zeta_1 in [-0.273, 0.273], abs(zeta_s) <= 0.4563 < 0.6 | 1237 s |
| K1 (H5) | enters K- at 36.2578125 ms, path in int B0 | 1279 s |
| K2 (H5) | enters K+ at 36.234375 ms, path in int B0 | 1293 s |
| negative control: K interval shifted by 40 half-widths | zeta_1 about 10 at T_enter, outside B0: fails, as it must | 1276 s |
| negative control: alpha_m times (1 + 1e-12 (u - u*)^2) | the whole set escapes below u = -60 mV at 17.20 ms: fails, as it must | 1298 s |
| negative controls in setup | as at 18.5 C: all rejected | seconds |

At 6.3 C the numerical centre had to be computed with a local error budget 1e-8 times tighter than at 18.5 C: the
budget is written for the growth rate at 18.5 C, and with the looser one K* was off by about 5e-59, which the
interval run detected (zeta_1 = -86 at T_enter, outside B0).

**Independent re-check of (H3).** `block_check_iv.py` is a separate program: mpmath interval arithmetic at 113 bits,
the Jacobian from hand-derived formulas, M^-1 in exact rational arithmetic, its own cover and Cholesky test, and its
own enclosure of the rest state by bisection. It confirms (C) and (E) at both temperatures and rejects the enlarged
block.

**Tests** (`test_lohner6.py`). The six-variable jets agree with an independent Picard implementation and with central
differences in K. Lohner enclosures through the upstroke, at orders 30 and 8, contain a high-precision reference
solution computed with a different step sequence; at order 8 with the remainder term dropped the enclosure misses
it, as it must.

**Consistency.** The numerical values predict zeta_1(K1) = -0.3046 and zeta_1(K2) = 0.3406 at T_enter (18.5 C, zero-
current E_l); the rigorous enclosures are -0.30474 and 0.34075.

## 6. Comparison with Carpenter (1977) and Hastings (1976)

Carpenter's Theorem 3.4 (p. 353) proves, under the abstract Hypotheses (3.1, CUBIC, H) and (3.3, HOM, H), that the
reduced system (3.1, H), with m = m_inf(V) and n, h multiplied by epsilon, has a homoclinic solution "for small
epsilon > 0"; Theorem 4.2 (p. 357) restores m as a fast variable "for all small delta > 0"; and Theorem 5.1(B)
(pp. 357-358) shows that the pulse is lost when epsilon or delta is too large. Her method, isolating blocks and a
Wazewski-type shooting in the speed around a singular orbit, is the same kind of topological argument as ours, applied
where the small parameters make the orbit computable by hand; ours applies it to a validated numerical orbit at
epsilon = delta = 1. Hastings's theorem (pp. 229-230, read) needs n and h slowed by a small epsilon and hypotheses he
did not verify for the 1952 functions.

## 7. Reproducibility

The programs are in `papers/hh-dynamics/work/traveling-wave/code/` (Apache-2.0), with python-flint 0.9.0, numpy and
scipy. From that folder:

    python3 test_lohner6.py
    HH_EL=10.613 python3 hp_pulse.py 18.5 10.5                      # numerical centre (about 15 minutes)
    HH_EL=10.613 python3 block0.py 18.5
    HH_EL=10.613 python3 prove_pulse.py 18.5 config 1.5e-45 1e-25 13.625 1e-16 1e-70
    HH_EL=10.613 python3 prove_pulse.py 18.5 setup
    for s in interval K1 K2 neg-shift neg-model; do HH_EL=10.613 python3 prove_pulse.py 18.5 $s; done
    HH_EL=10.613 python3 block_check_iv.py 18.5
    HH_EL=10.613 python3 prove_pulse.py 18.5 summary                 # exit status 0 iff all as expected
    # 6.3 C: the same with "6.3", hp_pulse.py 6.3 23.0 and config 1.4e-61 1e-32 36.125 1e-35 1e-70
    # zero-current E_l: the same without HH_EL

The certificates are `data/pulse_proof_<T>_El10.613_*.json` and `*_summary.txt` in that folder.

## References

- Arioli, G., Koch, H. Existence and stability of traveling pulse solutions of the FitzHugh-Nagumo equation. Nonlinear
  Anal. 113 (2015) 51-70. doi:10.1016/j.na.2014.09.023.
- Carpenter, G. A. A geometric approach to singular perturbation problems with applications to nerve impulse
  equations. J. Differential Equations 23 (1977) 335-367. doi:10.1016/0022-0396(77)90116-4.
- Foote, J. R., Chen, K.-H. Traveling wave properties of the Hodgkin-Huxley equations. Chinese J. Math. 9 (1981)
  1-23. Zbl 0472.35048. (Not read.)
- Hastings, S. P. On travelling wave solutions of the Hodgkin-Huxley equations. Arch. Rational Mech. Anal. 60 (1976)
  229-257. doi:10.1007/BF01789258. (Read: pp. 229-230.)
- Hodgkin, A. L., Huxley, A. F. A quantitative description of membrane current and its application to conduction and
  excitation in nerve. J. Physiol. 117 (1952) 500-544. (Read: pp. 519-528 and Table 3.)
- Huxley, A. F. The quantitative analysis of excitation and conduction in nerve. Nobel Lecture, 11 December 1963.
- Lohner, R. J. Enclosing the solutions of ordinary initial and boundary value problems. In: Computer Arithmetic,
  Teubner (1987) 255-286. (Method reference; not read here.)
