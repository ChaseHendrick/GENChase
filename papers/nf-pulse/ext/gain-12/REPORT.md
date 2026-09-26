# The fast pulse at Pinto and Ermentrout's own firing rate (gain-12 extension)

**Chase Hendrick**, drafted in this repository by the owner's decision of 2026-09-26, as an extension of
`papers/nf-pulse/` (see "Independent check" below for what an adversarial subagent did and did not check).
This folder changes nothing outside itself.

## Outcome

**Proved by computer (ball arithmetic), not yet reviewed:** the fast travelling pulse exists at logistic gain 12,
which is Pinto and Ermentrout's (1 + tanh(6(u - theta)))/2, with theta = 1/4, eps = 3/20, feedback decay 0 and the
kernel e^(-|x|)/2. The speed is enclosed in an interval of width 10^-25. At this point the rest state is a
saddle-focus (a complex pair of stable eigenvalues), so the isolating block of `papers/nf-pulse/` had to be
generalised; that generalisation, and one more obstacle that was not the complex eigenvalues, are described below.

## Theorem (computer-assisted)

Let S(u) = (1 + tanh(6 (u - 1/4)))/2 = 1/(1 + e^(-12 (u - 1/4))), eps = 3/20, gamma = 0, w(x) = e^(-|x|)/2, and

    u_t = -u - v + (w * S(u)),     v_t = eps (u - gamma v).

There are a speed c in [c1, c2], with

    c1 = 1.04753749779917111554998626,     c2 = c1 + 10^-25 = 1.04753749779917111554998636,

and a smooth nonconstant profile (U, V) with (U(xi), V(xi)) -> (0, S(0)) as xi -> +-infinity, S(0) = 1/(1 + e^3), such
that u = U(x + ct), v = V(x + ct) solves the equations. The profile leaves rest (as xi increases from -infinity) on the
branch of the unstable manifold where U increases.

Numerically (not proved): the speed is 1.04753749779917111554998631150479..., the peak of U is about 0.622 (the
rigorous run encloses U at every step end below 0.6224), U undershoots to about -0.400, and, with xi = 0 at the
manifold point P_c(1/4) used by the proof, U crosses 0 at xi about 9.4 (down), 31.2 (up), 43.0 and 54.7 (to xi = 60), the
oscillation of a saddle-focus approach.

Scope: one smooth firing rate at one parameter point with eps fixed and not small. Nothing here concerns stability,
uniqueness, the slow pulse, or other gains.

## Pinto and Ermentrout's firing rate and parameters (read from the author copy)

Source: D. J. Pinto and G. B. Ermentrout, "Spatially structured activity in synaptically coupled neuronal networks:
I. Traveling fronts and pulses", SIAM J. Appl. Math. 62 (2001) 206-225, author copy at
https://sites.pitt.edu/~phase/bard/pubs/siap62a.pdf (read in full through the appendix; not committed).

- Model, eq. (3): "u_t(x, t) + u(x, t) = ∫ w(x − x′)P(u(x′, t) − θ)dx′ − v(x, t), (1/ϵ) v_t(x, t) + βv(x, t) = u(x, t),
  ϵ ≪ 1." Their beta is the feedback decay, called gamma here.
- Firing rate, p. 210: "As a particular example, consider P(u −θ) = 1/2(1 + tanh(β(u −θ))), or, as a limiting case
  (β →∞), P(u −θ) = H(u −θ)". (In this sentence beta is the tanh gain, not the feedback decay.)
- The only smooth rate with a stated gain is in the caption of Fig. 5 (p. 215): "(S) Numerically determined speed when
  P is sigmoidal but with the same linear slope as L, i.e., P(u−θ) = (1/2)(1+tanh(6(u−θ)))", where L is "P(U) = 0 for
  (U −θ) < (−1/12), .5+6(U −θ) for (−1/12) ≤(U −θ) ≤(1/12), 1 for (U −θ) > (1/12)", and the kernel of that figure is
  e^(-|y|/.3)/(2(.3)) with no recovery variable (fronts).
- **What "gain" means here.** (1 + tanh(z))/2 = 1/(1 + e^(-2z)), so the tanh gain 6 is the logistic gain 12:
  S(u) = 1/(1 + e^(-12(u - theta))). Its maximal slope is S'(theta) = 12/4 = 3. As printed, L has slope 6 on its linear
  piece, so the two slopes differ by a factor 2 despite "the same linear slope"; a logistic with maximal slope 6 would
  have gain 24. We take the formula as printed (tanh gain 6, logistic gain 12); the gain-20 proof of `papers/nf-pulse/`
  sits between the two readings.
- Pulse figures. Sect. 3.1 takes "the decay of negative feedback is weak (i.e., β = 0)" with the Heaviside rate, "Note
  that, in the following calculations, we need not assume ϵ is small", and "we consider the case in which
  w(z) = e−|z|/2". Fig. 7 has two panels labelled "θ =.25, ε =.20" and "θ =.25, ε =.15"; Fig. 8 ("Examples of two pulse
  solutions which satisfy (5)") is labelled "θ =.25, ε =.15" with the pulses "c=-.45, a=2.2" and "c=-.80, a=4.9"
  (their c < 0 is our c > 0 after xi = x + ct). Fig. 1(c) is "numerically from the model system described by (2)
  (θ = .25,τ = .15)"; the paper does not say which parameter tau is, and we do not use it.

**Choice of point.** theta = 1/4, eps = 3/20, gamma = 0 and w = e^(-|x|)/2 are exactly those of Figs. 7 (right) and 8,
the one setting in which Pinto and Ermentrout show both pulses; the firing rate is their Fig. 5 sigmoid in place of
their Heaviside. It is a meaningful test because (i) the rest state is a saddle-focus there, which the gain-20 block
could not handle; (ii) S'(0) = 0.542 instead of 0.133, so the linearisation varies strongly across any neighbourhood of
rest; (iii) eps is 50% larger than in the gain-20 proof. (For comparison only: their Heaviside fast pulse at this
eps has speed .80; the smooth one here is faster, about 1.0475.)

**Complex eigenvalues at rest: yes.** Certified (R3, R5 below): for c in [c1, c2] the eigenvalues are
lu = 0.8588669270450529842..., l1 = -1.3984304519661291742..., and a +- i w = -0.2075281200500902846... +- 0.2659762597889014813... i
(enclosures of radius below 1e-24 in `data/rest_certificate.json`).
Numerically the pair is complex at gain 12 for eps in {0.10, 0.15, 0.20} and every c in [0.3, 2] tried, while at gain 20,
eps = 1/10 all four roots are real.

## What was generalised, and what actually stood in the way

1. **Rest state (`certify_rest.py`).** The gain-20 certificate demanded four real sign changes of the characteristic
   polynomial p. Now: two certified sign changes give lu > 0 and l1 < 0; the quotient q(l) = p(l)/((l - lu)(l - l1)) =
   l^2 + b l + c0 has the exact coefficients b = k + lu + l1 and c0 = -eps k^2/(lu l1), and the enclosures certify
   b > 0, c0 > 0, b^2 - 4 c0 < 0 (R3). R5 certifies l1 < a (the pair is the leading stable eigenvalue) and lu > |a|
   (lu/|a| = 4.1385...).
2. **Block (`block.py`).** The gain-20 construction took the real parts of the eigenvectors, which with a complex pair
   gives two equal columns and a singular T (kept as a negative control). New construction: real Jordan basis
   [v_u, v_1, Re w, Im w] of A(S'(0), 1/C_REF); P > 0 from the Lyapunov equation J_s^T P + P J_s = -I for the 3 x 3
   stable block J_s; P = R^T R; T = diag(1, R) V^-1 stored exactly. In these coordinates the stable quadratic form is
   the Euclidean norm, and the gain-20 conditions (C) and (E) apply unchanged. (E) is now certified sharply, as
   positive definiteness of -sym(At_22) - f I with f >= ||At_21||_F, instead of by Gershgorin. At this particular
   point the Lyapunov step turns out not to be needed: the independent check found that R = I also passes, because
   in the real Jordan basis sym(J_s) = diag(l1, a, a) is already negative definite. The Lyapunov form is what makes
   the construction general (for a non-normal stable block, for example a Jordan block or strongly unequal scalings).
3. **The complex eigenvalues were not the real obstacle.** Once the block was built in real Jordan form, two other
   things had to be overcome.
   - *The size of the block.* Over |U| <= 0.05 (the gain-20 block) the divided differences of S range over
     [0.311, 0.915]; neither (C) nor (E) holds (refused in both libraries). With Gershgorin, (E) failed already at
     |U| <= 0.02; with the sharp test it holds there; at 0.025 it held for one of eight weightings tried and at 0.03 for none. The block
     is |U| <= 0.02 with rho = 0.00727, r = 4 rho.
   - *The shooting bracket.* The escape classifier of `shoot_hp.py` (does the orbit eventually enter {Q > 1, P > 0} or
     {Q < 0, P < 0}?) switches at 1.04753749781039441558361656747... (numerical). The rigorous integrator showed the orbit
     there fires, returns near rest (|y'| about 0.03 at xi = 29), fires again at xi = 32, and again at xi = 58: the
     switch belongs to a multi-pulse, not to the one-pulse homoclinic, and the proof fails there (negative control N3).
     A first-return classifier (`shoot_first_return.py`: after U first exceeds 0.3, which cone of the block the orbit
     enters first, or which escape region) switches at 1.0475374977991711155499863115048..., about 1.1e-11 lower, and
     that bracket proves. This is what one expects near a Shilnikov homoclinic orbit (a saddle-focus with a
     one-dimensional unstable manifold and lu > |Re| of the leading stable pair, R5), near which multi-pulse orbits
     accumulate; that explanation is **numerical and heuristic here**: we did not check the hypotheses of Shilnikov's
     theorem in this 4D system, nor read its source for this report.

## Block lemma and shooting argument (as used; written here, not reviewed)

Notation: x = (U, V, Q, P), F the 4D wave vector field (U' = k(Q - U - V), V' = eps k U, Q' = P, P' = Q - S(U), k = 1/c),
x* = (0, S(0), S(0), 0), y = T(x - x*), y = (y1, y'), L(y) = y1^2 - |y'|^2, B = {|y1| <= r, |y'| <= rho},
K+ = {L > 0, y1 > 0}, K- = {L > 0, y1 < 0}, I_U = [-0.02, 0.02] (the certified U-range of B lies inside), and
kappa-ball K = [1/c2, 1/c1].

**Exact linear form.** S is the only nonlinearity, so F(x) = F(x) - F(x*) = A(s~, k)(x - x*) with
s~ = (S(U) - S(0))/U = S'(zeta) for some zeta between 0 and U (mean value theorem; s~ = S'(0) if U = 0). On B,
U is in I_U, and S' is increasing on (-inf, 1/4) because S'' = 144 S(1 - S)(1 - 2S) > 0 there, so s~ is in
[smin, smax] = [S'(-0.02), S'(0.02)]. Hence y' = At(s~) y along orbits in B, At(s) = T A(s, k) T^-1.

**(C)** For all s in [smin, smax] and k in K, H(s, k) = D At + At^T D (D = diag(1, -1, -1, -1)) is positive definite.
Certified at s = smin and s = smax with k the whole ball (interval Sylvester minors; independently interval Cholesky
in mpmath.iv); H is affine in s and positive definiteness is convex, so every s in between follows.
**(E)** For the same s, k: lam_max(sym At_22) + ||At_21||_2 < 0. Certified at both ends as above; the left side is a
convex function of s (a largest eigenvalue of an affine symmetric matrix plus a norm of an affine vector).

**Lemma.** Fix k in K and a solution x(xi).
(a) While x(xi) is in B, dL/dxi = y^T H(s~(xi), k) y >= mu |y|^2 for a mu > 0 independent of xi (H is continuous
    and positive definite on the compact set [smin, smax] x K).
(b) If x(xi0) is in B with L > 0, then L stays positive and y1 keeps its sign while the orbit stays in B (y1 = 0
    forces L <= 0). So K+ and K- are forward invariant relative to B.
(c) Every point of the boundary of B with L <= 0 is a strict entrance point. On the face |y1| = r, L <= 0 would
    need r <= |y'| <= rho, impossible since r = 4 rho > rho; so the point is on the face |y'| = rho, with
    |y1| <= |y'| = rho < r, and
    d/dxi |y'|^2/2 = y'^T sym(At_22) y' + y'^T At_21 y1 <= rho^2 (lam_max + ||At_21||_2) < 0 by (E); also |y1| < r there.
    So an orbit at such a point is in the interior of B just after it: it cannot leave B there.
(d) An orbit that stays in B for all xi >= xi0 converges to x*: if L > 0 at some time, L increases and is bounded on B,
    and by (a) the integral of |y|^2 is finite with y' bounded (F is bounded on B), so y -> 0 and L -> 0, a
    contradiction; so L <= 0 throughout, and the same integrability argument gives y -> 0.
(e) Consequently an orbit in B at xi0 with L <= 0 either stays in B forever (and tends to x*) or, at the first time
    it leaves B, has L > 0; by (d) an orbit that enters K+ or K- inside B leaves B in finite time.

**Shooting.** For c in [c1, c2] let x_c be the orbit through the point P_c(1/4) of the parametrised unstable
manifold (sigma = 1/7). Certified: (P) x_c(45) is in the interior of B for every c in [c1, c2] (one Lohner run with
the speed as a ball); (P1) x_{c1} stays in the interior of B for xi in [45, 59.125] (step enclosures) and is in K-
at xi = 59.125; (P2) likewise x_{c2} is in K+ at xi = 59.25. Let A+- be the set of c for which x_c enters K+- at
some xi >= 45 while x_c([45, xi]) is in B. The sets are disjoint by (b). They are open: for c in A+, before the first
time L > 0 the orbit is in the interior of B by (c) (it starts there at 45 and cannot reach the boundary with L <= 0),
so there is xi2 with x_c([45, xi2]) in the interior of B and y_c(xi2) in the open set K+; continuous dependence on c
of the manifold point and of the flow keeps both for nearby c. c1 is in A- and c2 in A+, and [c1, c2] is connected, so
some c is in neither. By (e) its orbit stays in B for all xi >= 45 and tends to x*; as xi -> -infinity it tends to x*
along the unstable manifold. It is nonconstant (it leaves along the unstable eigenvector with U increasing, sigma > 0).
The reduction from this homoclinic orbit of the wave ODE to a travelling pulse is that of `papers/nf-pulse/README.md`
(a bounded Q is unique); the 5D polynomial embedding Y = S(U) used by the integrator is exact on the invariant surface,
on which the unstable manifold lies.

Inherited and still owed as written proofs (as for the gain-20 proof, `papers/nf-pulse/README.md`): the tail bound of
the unstable manifold, the continuous dependence of the parametrised manifold point on c, and the reduction to the
wave ODE.

## What is rigorous and what is numerical

Rigorous (python-flint arb balls; no floating-point decisions): R1 to R5; the manifold coefficients and tail for
|t| <= 1 at c1, c2 and the whole interval; (C) and (E) on |U| <= 0.02 over the kappa-ball (and independently in
mpmath.iv); the Lohner enclosures; (P), (P1), (P2). Floating point is used only to choose T, the Lyapunov matrix, step
sizes and the bracket, each of which the rigorous steps then take as given.

Numerical only: the speed beyond the bracket (c* = 1.04753749779917111554998631150479..., from 256-bit shooting,
confirmed at 384 bits); the escape-classifier switch at 1.04753749781039... and its interpretation as a multi-pulse;
the Shilnikov interpretation; the peak (0.6223), undershoot (-0.400) and second zero of U; the eigenvalue survey over eps and c.

## Negative controls (all refused, as they should be)

| Control | Where | Result |
|---|---|---|
| theta = 0 (S'(0) = 3 > 1) | `certify_rest.py` | refused (Descartes argument unavailable) |
| perturbed eigenvalue (by 1e-15) | `certify_rest.py` | refused (p does not contain 0) |
| four real roots, the gain-20 certificate's premise | `certify_rest.py` | refused (2 sign changes) |
| manifold scaling sigma x 8 | `manifold.py` | tail bound refused |
| block |U| <= 0.05, the gain-20 size | `block.py`, `block_check_iv.py` | (C) and (E) refused in both libraries |
| block U in [-0.05, 0.15] | `block.py` | refused |
| gain-20 block construction (real parts of eigenvectors) | `block.py` | refused (singular T) |
| orbit at c1 asked to reach K+ | `prove_pulse.py` | refused (reaches K-) |
| c = 1.040, far from the speed | `prove_pulse.py` | refused (leaves |x| < 5 at xi = 12.4) |
| the escape-classifier bracket [1.04753749781039441558361652, +1e-25] | `prove_pulse.py` | refused (|y'| = 0.86 at xi = 45) |
| Lohner integrator with its remainder dropped (order 8) | `test_lohner2.py neg` (in `run_all.sh`) | fails to contain the mpmath solution |
| in_K / in_int_B on enclosures straddling the cone or the block boundary | `test_decisions.py` | refused |
| rho / 0.95 (U-range beyond 0.02); U-range recomputed independently | `test_decisions.py` | refused; 0.019495 < 0.02 |

Tests (not part of the proof): the Jacobian with d/dkappa against finite differences; the Lohner enclosures against an
independent mpmath solution of the original 4D system at the gain-12 parameters, to xi = 12 and at production settings
to xi = 55 (`data/test_lohner*.txt`).

## Independent check

An independent subagent (fresh context, read-only on the repository, working on a copy) was asked to rerun the chain
from a copy, run mutation tests, recompute a decisive number with its own code, check the block lemma line by line,
and check every quotation against the author copy.

**Verdict: "sound with minor issues"; no gap found in the logic or in the rigorous code.**

What it did and found (its report, condensed):

- Rerun from a copy: all 21 checks of the chain at that time passed; each negative control failed for the stated
  reason; T identical to the stored one; `lohner.py`, `manifold.py`, `shoot_hp.py` byte-identical to the gain-20 code.
- Independent recomputation (own code, no repository imports): the eigenvalues by the Krawczyk test in mpmath.iv for
  kappa in [1/c2, 1/c1] (unique roots lu, l1 and a +- i w, agreeing with `data/rest_certificate.json`); the identity
  (1 + tanh 6z)/2 = 1/(1 + e^(-12z)); and its own order-60 Taylor integrator at 80 digits (S by its exponential series,
  not the Y-embedding): the c1 orbit enters K- at xi = 59.125 with y1 = -5.8604505e-5 (repository -5.86045047e-5), the
  c2 orbit has y1(59.25) = +6.1434113e-5 (repository 6.14341127e-5), both stay far inside B on [45, 59.25], and at the
  escape-classifier speed the orbit fires at xi = 2.8, 32.1 and 61.5, confirming the multi-pulse account.
- Mathematics: the linear form, the endpoint convexity for (C) and (E), (E) as coded, the entrance argument, the
  convergence claim, openness and disjointness, the kappa-ball, the U-range bound (independently 0.0194947834 < 0.02)
  and the step-range coverage all checked; floating-point decisions occur only where they cannot produce a PASS.
- Mutation tests: caught were swapped cone sides, swapped bracket ends, block 0.03, eps = 1/10 (with the block either
  refused or passing at 0.01), a scaled row of T, and checking only s = smin (caught only through the negative
  controls). **Not caught** by the chain at that time: the Lagrange remainder dropped in `lohner.step`, midpoint
  decisions in `in_int_B` and `in_K`, the phase-2 step-range check disabled, and `u_range` without its rho term.

Fixes made after the check:

1. [minor, coverage] Added `test_decisions.py` (containment decisions on straddling enclosures, the step range at
   interior times, the U-range, an independent recomputation of the U-range, and the identity of the T used by the
   proof with the T re-checked by `block_check_iv.py`) and `test_lohner2.py neg` to `run_all.sh`, now 23 checks. Rerun
   with mutations: midpoint decisions and `u_range` without the rho term are now refused (`ALL DECISION CONTROLS FAIL`),
   and a dropped remainder is refused by the Lohner control. The disabled phase-2 step-range check is still not caught
   by any automatic control; its correctness rests on reading (`prove_pulse.py`, the `phase == 'inside'` branch of
   `cb`) and on the independent integration above, which shows the orbits far inside B on [45, 59.25].
2. [minor] Eigenvalue digits in this report were those of the escape-classifier speed, not of [c1, c2]; corrected
   from `data/rest_certificate.json`.
3. [minor] The positions of the zeros of U were given in a different normalisation of xi; corrected (and recomputed
   here: 9.36, 31.22, 42.97, 54.72 on [0, 60] at c = 1.0475374977991711155499863115048).
4. [minor] The sentence in lemma (c) about the face |y1| = r was garbled; rewritten (it uses r = 4 rho > rho).
5. [minor] The docstring of `block.py` still described (E) by Gershgorin; corrected.
6. [note, not adopted] The check said the firing-rate quotation is on printed p. 208; it is on printed p. 210 (PDF
   page 5, whose running head is 210), as this report says.
7. [note] `prove_pulse.py` recomputes T with numpy on each run and certifies it itself, so the proof does not depend
   on the platform; the second-library re-check is of the stored T, and `test_decisions.py` (D5) now checks that the
   two coincide. The environment variables NF_BETA and NF_EPS change the model for exploration only;
   `block_check_iv.py` types 12 and 3/20 independently, and the mutation with eps = 1/10 made the chain fail rather
   than prove the wrong system.

The check is not an independent review of the mathematics by a person, and the written proofs listed above are
still owed.

## Rerun

From the repository root, with the pinned requirements (`python3 -m pip install -r papers/nf-pulse/ext/gain-12/code/requirements.txt`):

```
sh papers/nf-pulse/ext/gain-12/code/run_all.sh                              # 23 checks, about 2 min on 4 cores
cd papers/nf-pulse/ext/gain-12/code
python3 test_lohner.py; python3 test_lohner2.py prod                       # longer tests, a few minutes
python3 shoot_first_return.py 256 bisect 88 1.0475374977 1.0475374979     # numerical speed, about 80 s
python3 shoot_hp.py 256 88 1.0 1.05                                         # the escape-classifier switch, about 2 min
python3 check_ends_hp.py 384                                                # first return of c1 and c2 at 384 bits
```

The summary is in `data/run_all.txt`, the certificates in `data/*.json`; full logs go to `data/logs/` (not tracked).

## Files

`code/` is a copy of `papers/nf-pulse/code/` with these changes: `nfcore.py` (parameters beta = 12, eps = 3/20; the
environment variables NF_BETA and NF_EPS override them for exploration only, and every certificate records the values
it ran with), `bracket.py` (new), `certify_rest.py` (complex pair, R5), `block.py` (real Jordan form, Lyapunov form,
sharp entrance test, controls), `block_check_iv.py` (generalised), `prove_pulse.py` (block |U| <= 0.02, entry at
xi = 45, interval negative control), `shoot_first_return.py` and `check_ends_hp.py` (new, numerical), `test_decisions.py` (new), the
tests (parameters). `RESEARCH.md` is not updated, because this task was confined to this folder; the ledger entry
of 2026-09-26 for `papers/nf-pulse/` covers the prior-art search, and no literature search on Shilnikov orbits in
neural fields was made for this report. `lohner.py`, `manifold.py` and `shoot_hp.py` are unchanged.

License: Apache-2.0, as `papers/nf-pulse/` (see its NOTICE).
