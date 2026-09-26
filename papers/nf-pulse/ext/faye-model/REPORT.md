# A travelling pulse in Faye's neural field with synaptic depression: a computer-assisted proof at fixed eps

Extension of `papers/nf-pulse/` (the Pinto-Ermentrout proof) to the second model. Work in progress, **not independently
reviewed**; see "Check" below for the adversarial reading that was done.

## Outcome

**Proved by computer, at Faye's own eps = 0.01, and also at eps = 1/20 and eps = 1/50.**
For lambda = 20, kappa = 0.22, b = 4.5, beta = 5 (Faye's illustration values), a fast travelling pulse exists at eps =
1/100, 1/50 and 1/20, with its speed enclosed in an interval of width 10^-144, 10^-88 and 10^-28 respectively. Every
step is a ball-arithmetic computation; `sh code/run_all.sh <eps>` reruns each, with 14 checks: 5 negative controls and 2 tests (one
with its own negative control). An independent adversarial check (Sect. 8) found no mathematical error at 1/20 and 1/50 and
several minor issues, all fixed; a follow-up check of eps = 1/100 and of the fixes found no mathematical error either. Before any claim leaves this folder the proof needs outside review of its
mathematics and code (Sect. 8).

## 1. The model, from the sources

**Faye**, "Existence and stability of traveling pulses in a neural field equation with synaptic depression", SIAM J.
Appl. Dyn. Syst. 12(4) (2013) 2032-2067 (author copy `SynDepTPulseRevisedBis.pdf`, dated September 5, 2013, from the
author's page at the Institut de Mathematiques de Toulouse). Quoted from Sect. 2:

- Model (2.1): "tau du(x,t)/dt = -u(x,t) + int_R J(x - y) q(y,t) S(u(y,t)) dy,  (1/eps) dq(x,t)/dt = 1 - q(x,t) - beta
  q(x,t) S(u(x,t))", with "We assume units of time t to be 10ms each and we set tau = 1 (10ms)."
- Firing rate (2.2): "S(u) = 1/(1 + e^(-lambda(u - kappa)))" "with threshold kappa and gain lambda".
- Kernel (2.3): "We take the excitatory weight function J to be a normalized exponential [26], J(x) = (b/2) e^(-b|x|)",
  "where b > 0 is the effective range of excitatory distribution."
- Parameters. Sect. 3.2: "For the simplicity of this paper, we always illustrate our results in the case of lambda =
  20, kappa = 0.22, b = 4.5 and beta = 5 which are similar to the values used in Kilpatrick & Bressloff [26]." The
  captions of Figs. 1, 6, 7 and 8 use these values with "eps = 0.01"; the text introducing Fig. 6(b) says "for eps =
  0.005" while the Fig. 6 caption says "eps = 0.01" (an inconsistency in the source, noted, not resolved here). Sect. 2:
  "1/eps typically ranges from 20 to 80 and thus eps ~ 0.01 - 0.05 can be consider as a small parameter".

So the earlier notes are **confirmed**: lambda = 20, kappa = 0.22, b = 4.5, beta = 5, eps = 0.01 (Faye's figures).

**Hastings**, "Existence of travelling pulses in a neural model", arXiv:1503.04057v2 (16 Aug 2015; Proc. Roy. Soc.
Edinburgh A 147 (2017)). His (1.1)-(1.3) are the same model with tau = 1, "J(x) = (b/2) e^(-b|x|)" and "S(u) = 1/(1 +
e^(lambda(kappa - u)))"; footnote 3 gives "lambda = 20, kappa = 0.22, beta = 5, b = 4.5" ("the same parameter values as
were chosen for illustration in [4]", i.e. Faye). His reference [4] reads "Siam J. of Dynamical Systems 10(2013),
147-160"; the paper is in volume 12, pages 2032-2067 (SIAM, and Faye's page), so that reference is garbled.

**What is already proved for this model.**

- Faye, Theorem 3.1: "Suppose that (lambda, kappa, b, beta) in Pi. Then there exists eps_1 > 0 such that for all 0 <
  eps < eps_1, there exists c(eps) = c* + O(eps) for which problem (2.1) has a traveling pulse solution of the form
  (u(x+ct), q(x+ct)) with lim_{xi -> +-infinity} (u, q) = (u0, q0)." Pi (Definition 3.1) is the set where Hypotheses
  2.1, 2.2 and 3.1 hold. Hypothesis 3.1: "the wavespeed selected by the front is strictly greater than the wavespeed
  selected by the back. Hence, the jump back must occur along the center direction at the knee." Theorem 4.1 adds
  spectral stability for 0 < eps < eps_2. No value of eps_1 is given, and Hypothesis 3.1 is not verified rigorously
  for lambda = 20, kappa = 0.22 (Hastings: "This condition can only be verified by numerical integration of the fast
  system.").
- Hastings, Theorem 1: "If Conditions 1- 5 are satisfied, and eps is positive and sufficiently small, then there are
  at least two positive values of c, say c^* > c_*, such that (2.1) has a non-constant solution p satisfying lim_{t ->
  -infinity} p(t) = lim_{t -> infinity} p(t) = p0." It drops Faye's Hypothesis 3.1 and covers his S. Theorem 2 gives
  the same conclusion at a given eps from hypotheses on one solution of the fast system (2.2) at c = c1 and one of (2.1)
  at (eps, c1). Remark 2 and footnote 4: "For the parameter values used by Faye, a standard ode solver suggests that
  (eps, c1) = (.005, .34) satisfies the conditions in Theorem 2. If the conjecture in Remark 1 is true then it appears
  that (eps, c1) = (.05, .2) would work." Sect. 1: "We believe [...] that it is feasible to check existence rigorously
  for particular positive values of eps > 0, using precise numerical analysis based on interval arithmetic, but we have
  not carried out such a check." Sect. 4.5 ("Can the hypotheses of Theorem 2 be checked rigorously for a specific (eps,
  c1)?") outlines that check: a high-order expansion of the unstable manifold in interval arithmetic, then a rigorous
  ODE solver.
- Faye and Scheel, arXiv:1311.6508v1: Theorem 1 is for the nonlocal FitzHugh-Nagumo equation (their (1.4)), with
  linear recovery, "for every sufficiently small eps > 0", under (H1)-(H3); (H3) assumes a front and a back of equal
  speed with the back at "0 < v = v* < v_max". They note it applies to neural fields with linear adaptation (their
  (1.6)). It does not treat synaptic depression. Hastings (Sect. 4.3) discusses Faye and Scheel's hypothesis that the
  jump down occurs above the knee for the Pinto-Ermentrout model; that the same hypothesis fails for Faye's model, where
  the back is at the knee (Faye's Hypothesis 3.1), is our inference, not a statement of Hastings.

So for Faye's parameter values, existence was known only for eps "sufficiently small", with no explicit bound (Faye:
under his Hypotheses 2.1, 2.2 and 3.1, the last not verified rigorously for these values; Hastings: without Hypothesis
3.1, under his Conditions 1-5). Hastings proposed a computer-assisted check at a fixed eps
and did not carry it out. The result below is such a check, done by a different route from his Theorem 2: it does not
verify his hypotheses, it closes the orbit with an isolating block at rest and a Wazewski-type argument in c, and it
gives one pulse (the fast one), not two.

## 2. The wave ODE and the rest state

With xi = x + c t (c > 0: the pulse moves to the left), v = J * (q S(u)), w = v' and k = 1/c, Faye's (2.8) is

    u' = k (v - u),   v' = w,   w' = b^2 (v - q S(u)),   q' = eps k (1 - q - beta q S(u)).

It is exact: (b^2 - d^2/dxi^2) (b/2) e^(-b|xi|) = b^2 delta, and a bounded solution of b^2 v - v'' = b^2 q S(u) is
unique (the homogeneous solutions e^(+-b xi) are unbounded). So a solution homoclinic to rest is exactly a travelling
pulse of the field equation. The programs add Y = S(u) (Y' = lambda Y (1 - Y) u'), which makes the field polynomial; the
surface Y = S(u) is invariant.

**Rest (certified, `certify_rest.py`).** Equilibria have v = u, w = 0, q = 1/(1 + beta S(u)), u = q S(u), i.e.
F(u) = u (1 + beta S(u)) - S(u) = 0 with u in (0, 1). F has exactly one zero in [0, 1] (2000 pieces, each with a
certified sign or certified F' > 0), so x* = (u0, u0, 0, q0) is unique: u0 = 0.0151017095592381945561125429894...,
q0 = 0.924491452203809027219437285053... (balls of radius below 1e-31). With s = S'(u0), q0 s = 0.29710041638... < 1
(certified), which is Hastings's h'(u0) > 0.

**Dimension count.** The characteristic polynomial of the linearisation (derived symbolically; the code evaluates
exactly these coefficients) is, with A = 1 + beta S(u0) = 1/q0,

    p(mu) = mu^4 + k(1 + eps A) mu^3 + (eps k^2 A - b^2) mu^2 + b^2 k (q0 s - 1 - eps A) mu + b^2 eps k^2 (q0 s - A).

For every c > 0: the signs of the coefficients are +, +, ?, -, - because q0 s < 1 < A, so there is exactly one
positive root (Descartes); Im p(i w) = w (c1 - c3 w^2) with c1 < 0 < c3 vanishes only at w = 0, and p(0) < 0, so no
root is on the imaginary axis and the number of roots with positive real part does not depend on c. At the certified
brackets the four roots are real, simple and enclosed (one positive, three negative), so **for every c > 0 the rest
state has a one-dimensional unstable and a three-dimensional stable manifold**, and the problem is to shoot in c alone
(this agrees with Hastings's Lemma 3). The eigenvalues at the pulse speed are:

| eps | eigenvalues at c* (enclosed, ball arithmetic) |
|---|---|
| 1/20 | -5.8270, -2.3697, -0.22642, 4.1587 |
| 1/50 | -5.3907, -2.0102, -0.071552, 4.2013 |
| 1/100 | -5.3079, -1.9195, -0.033686, 4.2120 |

The small eigenvalue is the slow recovery of q (about -eps k (1 + beta S(u0))): it is what makes small eps expensive.

## 3. The proof, adapted from `papers/nf-pulse/`

The argument and most of the code are those of `papers/nf-pulse/`; what changed is the model, the manifold tail bound,
the Taylor recursion and its gradients, and the block.

1. **Unstable manifold** (`manifold.py`). Parametrisation method: P(t) = sum a_n t^n with mu t P'(t) = F(P(t)), in the
   5D embedding, a_1 = sigma v (u-component of v is 1, so t > 0 is the branch on which u increases), (n mu - A) a_n =
   N_n for n >= 2, with the three nonlinear terms -b^2 y_q y_Y, -eps k beta y_q y_Y and lambda k [(1 - 2 Y0) y_Y m -
   y_Y^2 m], m = y_v - y_u. The coefficients are balls that enclose the exact ones for every kappa in the ball [1/c2,
   1/c1]. The tail (n > N) lies in an l^1 ball of radius K rho with K = 1/((N+1) mu_lo - ||A||_inf) (Neumann series)
   whenever G0 + Z(K rho) <= rho, with G0 the exact tail of the nonlinearity of the polynomial part and Z a
   Banach-algebra bound; this is checked in ball arithmetic. The 5D rest point has an extra eigenvalue 0 (the Y
   direction), which does not resonate with n mu, so every coefficient is determined; `validate` also asserts that
   (n mu - A) a_n - N_n contains 0 for every n <= N, with N_n taken from the polynomial products used for the tail.
   The series converges for |t| <= 1 uniformly in kappa, so c -> P_c(theta0) is continuous. It is the unstable manifold
   of the 4D system: along the orbit through P_c(theta0), G = Y - S(u) satisfies G' = lambda (1 - Y - S(u)) u' G, whose
   coefficient is integrable as xi -> -infinity (u' decays exponentially there), and G -> 0 backward, so G = 0: the
   orbit lies on the invariant surface Y = S(u) and projects to the one-dimensional unstable manifold of rest in the 4D
   system (unique, since the unstable eigenvalue is simple), on the branch where u increases.
2. **Integration** (`lohner.py`): the C^0-Lohner interval Taylor integrator of `papers/nf-pulse/code/lohner.py`, with
   the Taylor recursion of this model and its forward-mode gradients (tested against finite differences in
   `test_jacobian.py`, and the whole integrator against mpmath's `odefun` on the original 4D system in `test_lohner.py`).
3. **Block** (`block.py`). Around rest, coordinates y = T (x - x*), L = y1^2 - |y'|^2, B = {|y1| <= r, |y'| <= rho},
   r > rho. The Jacobian of the 4D field depends on x only through a = q S'(u) and sg = S(u), affinely for fixed k. For
   x in B, F(x) - F(x*) = Abar (x - x*) with Abar = DF(abar, sgbar), (abar, sgbar) in the rectangle of values over B.
   Two conditions are certified at the four corners of that rectangle, for all kappa in its ball: (C) D M + M^T D > 0
   (M = T Abar T^(-1), D = diag(1, -1, -1, -1), interval Sylvester) and (E) lambda_max(sym M22) + ||M21||_2 < 0 (a
   bound t on lambda_max certified by t I - sym M22 > 0, plus the Frobenius norm). Both are convex in M, so the corners
   suffice. `block_check_iv.py` re-checks both in mpmath's interval arithmetic with none of the model code (its own rest
   state, its own inverse of T, interval Cholesky). The frame T is an eigenbasis of DF at a reference point chosen by a
   floating-point search (`explore_block.py`), which only needs to produce something that then passes the checks; the
   block is stretched along the slow direction so that it reaches down the left slow branch (q from 0.825 at eps = 1/20,
   0.797 at 1/50, 0.843 at 1/100), which is what keeps the integration short.
4. **Block lemma** (proved here; written out because the base folder has no written version). (a) By (C) and
   convexity, dL/dxi = y^T (D M + M^T D) y >= m |y|^2 with m > 0 along orbits in B, so L increases strictly away from x*.
   (b) By (E), at a point of B with |y'| = rho and |y1| <= rho (so L <= 0), d|y'|^2/dxi <= 2 rho^2 (||M21|| +
   lambda_max) < 0: such boundary points are strict entrance points. (c) An orbit that stays in B for all later xi has
   L increasing and bounded, so the integral of m |y|^2 is finite, and with y' bounded, y -> 0 (Barbalat): it
   converges to x*.
5. **Shooting** (`prove_pulse.py`). For c in I = [c1, c2] let x_c be the orbit through P_c(theta0), with sigma and
   theta0 fixed in `config.py` and the same in all three runs (so the family of start points is continuous in c).
   Rigorous runs show: (i) x_c(T) is in int B for every c in I (one Lohner run with c as a sixth variable); (ii) the
   orbit at c1 stays in int B on [T, t1] (every step range checked) and reaches the open cone K(s1) = {L > 0, s1 y1 > 0};
   (iii) the orbit at c2 does the same and reaches K(s2), s2 = -s1. Let Omega_s = {c in I : x_c([T, t]) is in int B and
   x_c(t) is in K(s) for some t >= T}. Each Omega_s is open (continuous dependence; int B and K(s) are open), they are
   disjoint (once L > 0 in B, L stays positive, so y1 cannot change sign), and c1, c2 lie in different ones. I is
   connected, so some c* in (c1, c2) is in neither. Its orbit never meets the boundary of B: at a first contact point,
   either |y1| = r > rho >= |y'|, so L > 0 there and, just before, x_c* was in int B and in a cone (so c* in Omega),
   or |y'| = rho with |y1| <= rho, which (b) forbids, or |y'| = rho with |y1| > rho, where again L > 0 (same
   contradiction). So x_c* stays in B, tends to x* by (c), and came from x* along the unstable manifold: a homoclinic
   orbit, hence a pulse.

## 4. Theorem

**Theorem (computer-assisted).** In Faye's model (2.1)-(2.3) with tau = 1, lambda = 20,
kappa = 11/50, b = 9/2 and beta = 5, let (u0, q0) be the homogeneous steady state (it is unique; u0 =
0.0151017095592381945561..., q0 = 0.9244914522038090272194...). For each eps and interval [c1, c2] below there are a
speed c in (c1, c2) and a smooth nonconstant profile (U, Q) with (U, Q)(xi) -> (u0, q0) as xi -> +-infinity such that
u(x, t) = U(x + ct), q(x, t) = Q(x + ct) solves (2.1). The profile leaves rest on the branch of the unstable manifold
on which U increases, and sup U exceeds the stated bound.

| eps | c1 (c2 = c1 + 10^-n) | n | sup U > |
|---|---|---|---|
| 1/100 (Faye's value) | 0.331516307336865436625730534879459225272579301510008102579492382002165938803776928641803147054296415442903177208307894457102622838035779556072008 | 144 | 0.77145 |
| 1/50 | 0.3123155710060636100917070892169975669710796369835436898185985170714422661677578484618711 | 88 | 0.68250 |
| 1/20 | 0.2471826276516696269906434087 | 28 | 0.50435 |

Scope: one parameter point of Faye's family and three fixed values of eps, one pulse each (the fast one). Nothing here
concerns stability (Faye's Theorem 4.1), uniqueness, the slow pulse of Hastings's Theorem 1, or eps near 0 (which
Faye and Hastings cover asymptotically). The bracket at eps = 1/100 contains the speed to 144 digits; the numerical
value to 160 digits is 0.33151630733686543662573053487945922527257930151000810257949238200216593880377692864180314705
42964154429031772083078944571026228380357795560720084463066305960565416 (numerical, `shoot_ms.py`).

## 5. What is rigorous and what is numerical

**Rigorous (ball arithmetic in python-flint 0.9.0/Arb, every decision a certified inequality; not independently
reviewed):** the rest state and its uniqueness, q0 s < 1, the eigenvalue count for every c > 0, the enclosure of the
unstable eigenvalue and eigenvector, the manifold with its tail, the block conditions (also re-checked in mpmath.iv),
the three integration runs and the cone entries, and the lower bound on sup u.

**Numerical only, not proved:** the speeds to more digits than the brackets (from `shoot_hp.py` and `shoot_ms.py`);
the values of c* at eps = 0.03, 0.07 and the absence of a pulse at eps = 0.1 (floating-point scan, see below); the slow
pulse (a second sign switch at small c, e.g. near c = 0.0758 at eps = 0.05, 0.0258 at eps = 0.01, not studied); the
front speed c0* = 0.35000 of Hastings's fast system (2.2) at q = q0 (floating-point shooting), which the fast pulse
speeds approach as eps decreases, as Hastings (Sect. 2: "It will follow from the proofs of these results that as eps
-> 0, c^* -> c^*_0") and Faye's c(eps) = c* + O(eps) lead one to expect;
the block shapes (a floating-point search whose output is then certified); the cost estimates.

Numerical scan of the fast pulse speed (float shooting in `c` from 0.005 to 1, classification by Hastings's
Proposition 1 invariant regions; numerical only):

| eps | fast pulse c* | slow pulse (second switch) |
|---|---|---|
| 0.01 | 0.33152 | 0.02584 |
| 0.02 | 0.31232 | 0.03847 |
| 0.03 | 0.29217 | 0.05009 |
| 0.05 | 0.24718 | 0.07578 |
| 0.07 | 0.18091 | 0.12157 |
| 0.10 | none found | none found |

At eps = 0.1 every sampled c in [0.005, 1] escapes upward, so the two pulse branches appear to meet between eps = 0.07
and 0.1. This is why the task's fallback value 0.1 is not available for this model.

## 6. Cost at eps = 0.01 and how it was met

**Estimate first.** The expensive part is the slow return along the left branch, during which the fast unstable
direction (eigenvalue about 4.2) keeps expanding. A floating-point estimate from the reduced slow flow q' = eps k (1 - q
(1 + beta S(s_L(q)))) gave a return from the landing point (q about 0.35) to the block edge (q about 0.84) of about 59
units of xi at eps = 0.01 (8 at eps = 0.05), and about 111 decimal digits of expansion on that stretch, plus the front
and the knee. A plain bisection shooter (every shot from rest, about 500 halvings, each integrating to xi of about 75 at
about 700 bits) was estimated at several hours, too slow. The floating-point block search did not find a block reaching further down
the branch than q of about 0.84 at eps = 0.01 (not proved impossible; a block with one quadratic form has to handle the
Jacobian over the whole q-range, and the margin of the slow direction is only about 0.034).

**What it took (observed in the runs, numerical).** The c-sensitivity of the orbit grows about 1.85 decimal digits
per unit of xi on the left branch (from the shooting stages); the rigorous enclosure picked up about 67 more digits
than that through the front and the knee, so the local error of the integrator has to be far below the bracket width.

| eps | bracket width | precision | Taylor order | local tol | T_enter | cone entry (c1, c2) | time per run (4 cores shared) |
|---|---|---|---|---|---|---|---|
| 1/20 | 1e-28 | 256 bits | 30 | 1e-45 | 12.5 | 14.23, 14.40 | about 5 s |
| 1/50 | 1e-88 | 600 bits | 70 | 1e-140 | 30 | 46.91, 46.42 | about 1 min |
| 1/100 | 1e-144 | 900 bits | 120 | 1e-240 | 74 | 76.61, 76.54 | about 5 min |

The brackets come from a staged shooter (`shoot_ms.py`): bisection whose shots restart from a checkpoint by linear
interpolation between the two end orbits, at reduced precision, with the end orbits recomputed from rest after each
stage. Its first version interpolated the end states too, which compounds a second-order error from stage to stage;
plain shots and the rigorous runs showed that its eps = 1/50 bracket was wrong beyond about 40 digits, and the fix
(recompute the end orbits) was then confirmed by plain shots at both bracket ends. The eps = 1/100 search took 30
minutes at 720 bits.

Failed attempts, recorded because they show where the margins are: eps = 1/50 at 480 bits (the enclosure grew faster
than the separation of the end orbits, so c1 and c2 were still indistinguishable when it blew up); eps = 1/100 at 800
bits (enclosure lost near xi = 70); eps = 1/100 with a 150-digit bracket at 900 bits (projected to fail the same way,
stopped); with a 144-digit bracket and T_enter = 78 (the end orbits had already left the block by 78). T_enter = 74
works.

## 7. Negative controls and tests

Each `run_all.sh` run includes: a rest-state control (lambda = 80, kappa = 1/10, which has three equilibria by a
floating-point scan, is refused: the uniqueness certificate cannot certify monotonicity near the extra zeros); a perturbed eigenvalue that must not enclose a root; the block scaled by 1.5 (refused: the cone or entrance
condition fails at a corner); the orbit at c1 asked to reach the opposite cone (refused: wrong cone); a speed far from
the pulse speed (refused: the orbit leaves before T_enter). Tests (not part of the proof): the Taylor jet gradients
against central differences and the vector field against the Taylor recursion (`test_jacobian.py`); the integrator against mpmath's `odefun` on the original 4D system,
with a control in which b is perturbed by 1e-20 and the enclosures must exclude that solution (`test_lohner.py`, passes; its xi <= 1 version runs inside `run_all.sh`).

## 8. Check (adversarial second reading)

An independent subagent reviewed the work adversarially, working in a copy of the folder and with its own code.

**Verdict (eps = 1/20 and 1/50): "minor issues. I found no mathematical error in the proof chain at eps = 1/20 and eps
= 1/50."** What it did:

- Reran `run_all.sh` at both eps from a copy: all checks passed; `test_lohner.py` passed.
- Recomputed with its own code, none of the project's modules: the characteristic polynomial (sympy; the difference
  from the stated p is exactly 0); u0, q0, q0 s and the eigenvalues at both eps (agree); the block conditions at both eps
  from the stored T with exact rational arithmetic and its own bounds (all corners pass; at eps = 1/50 the worst
  entrance margin is -0.00118, thin but certified); and a non-rigorous shooting on the original 4D system with S
  evaluated directly: at eps = 1/20, speeds up to c1 escape into {v < 0, w < 0} and from c2 up into {v > 1, w > 0}, with
  max u about 0.50436 against the rigorous lower bound 0.50435; at eps = 1/50 the sides agree at 20 digits (first check) and at the full 88-digit bracket (follow-up).
- Re-read Faye (author copy), Hastings (arXiv v2) and Faye-Scheel: the model, kernel, firing rate, parameters and the
  theorems are quoted correctly.
- Mutation tests at eps = 1/20: wrong b^2 in the recursion, a sign in the manifold nonlinearity, eps perturbed by
  1e-12, a bracket moved off c*, a sign in the characteristic polynomial and in the eigenvector were all caught by the
  proof steps; wrong gradients in the jet only by the Jacobian test (which is in `run_all.sh`).

**Findings and what was done.**

1. REPORT.md was an unfinished template. Completed.
2. r > rho, which the first-contact step needs, was not enforced (a mutation to 0.99 passed). Now asserted in
   `block.check` and `block_check_iv.py`.
3. sigma was chosen per run from floating-point data; the three runs must use the same family P_c(theta0). It agreed in
   every log, but by rounding luck. Now fixed per eps in `config.py`.
4. A dropped Lagrange remainder in the integrator was caught only by `test_lohner.py`, which was not in `run_all.sh`;
   `fcore.vfield` (used for the a priori enclosure) was not tested. Now `test_lohner.py 1` is in `run_all.sh` (a
   dropped remainder fails it at xi = 1, checked), and `test_jacobian.py` compares vfield with the Taylor recursion.
5. The claimed consistency check of the manifold recursion did not exist. Now `validate` asserts (n mu - A) a_n - N_n
   contains 0 for all n <= N (a sign mutation in the recursion fails it at n = 3, checked).
6. The embedding argument (why P lies on the 4D unstable manifold) and the continuity of c -> P_c(theta0) were not
   written. Added in Sect. 3 (the G = Y - S(u) argument the reviewer suggested).
7. "Hastings: unconditionally" was wrong; his Theorem 1 assumes his Conditions 1-5. Corrected.
8. Wording about Hastings Sect. 4.3 and the source of c^* -> c^*_0 was loose. Corrected. (Also noted: the arXiv
   metadata title of 1503.04057 is "Existence of Traveling Waves in a Neural Model"; the PDF's title is the one quoted.)
9. The three-equilibria negative control is refused because monotonicity cannot be certified, not because three zeros
   are counted: a weak control, now described as such in Sect. 7.

Mutations that weaken a bound or remove a check (dropping -||A|| from K, setting G0 = 0, deleting the phase-2
step-range check) cannot be caught by a pass/fail harness; the reviewer checked by reading that the unmutated code
implements them correctly.

**Follow-up verdict (eps = 1/100 and the fixes): "minor issues only; no mathematical error found."** The reviewer
reran `run_all.sh 1/100` serially from a fresh copy (all 14 checks OK, 23 min); diffed every file and confirmed each fix
(the r/rho = 0.99, vfield b^2 -> b, N_Y sign and dropped-remainder mutations are now all caught; the `choose_h` change
only affects step selection, every step is still validated); recomputed the eigenvalues at eps = 1/100 (-5.30787511,
-1.91949797, -0.0336863820, 4.21198846) and the block conditions from the stored T with its own exact-rational method
(all four corners pass; entrance margins down to -0.00138, thin but certified); and ran its own non-rigorous integrator
on the original 4D system at the full 144-digit bracket, at 240 and at 280 digits: c1 escapes into {v < 0, w < 0} and c2
into {v > 1, w > 0} both times, with max u 0.771454 against the rigorous lower bound 0.7714525. Its remaining findings
(unfilled placeholders, the count of negative controls, a misquote of its first check, test and timing descriptions)
were fixed in this report.

## 9. Rerun

From `papers/nf-pulse/ext/faye-model/code/` (Python 3.11, `python3 -m pip install -r ../../../code/requirements.txt`):

    sh run_all.sh 1/20        # about 3 minutes (mostly the mpmath reference in the integrator test)
    sh run_all.sh 1/50        # about 4 minutes on 4 cores (about 5 serially)
    sh run_all.sh 1/100       # about 10 minutes on 4 cores (about 23 serially)
    FAYE_EPS=1/20 python3 test_lohner.py    # about 8 minutes (mpmath reference solution)

Each prints one line per check and exits with status 1 if a proof step fails or a negative control passes; full logs
go to `data/logs/` (not tracked), certificates to `data/*.json`, and the one-line summaries of the last runs are in
`data/run_all_eps1_20.txt`, `data/run_all_eps1_50.txt` and `data/run_all_eps1_100.txt` (all checks passed). The brackets, block shapes and integration settings
are in `code/config.py`. Numerical (not needed for the proof): `FAYE_EPS=1/50 python3 shoot_ms.py 480 0.3123155
0.3123157 100 60` recomputes the eps = 1/50 bracket; `explore_block.py eps c` searches a block shape.

## Files

| File | Role |
|---|---|
| `code/fcore.py` | Model, exact rational parameters (eps from `FAYE_EPS`), rest state, Taylor recursion |
| `code/certify_rest.py` | Rest state, uniqueness, q0 s < 1, eigenvalue count, eigenvector residual; controls |
| `code/manifold.py` | Unstable manifold to order N with a validated tail |
| `code/lohner.py` | The C^0-Lohner integrator of the base folder with this model's Taylor jet |
| `code/block.py`, `code/block_check_iv.py` | Block certificate, and its independent mpmath.iv re-check |
| `code/prove_pulse.py` | The three proof runs and the negative controls |
| `code/config.py` | Per-eps brackets, block shapes and settings |
| `code/run_all.sh` | The whole chain with its controls |
| `code/test_jacobian.py`, `code/test_lohner.py` | Tests |
| `code/shoot_hp.py`, `code/shoot_ms.py`, `code/orbit_hp.py`, `code/explore_block.py` | Numerical only |
