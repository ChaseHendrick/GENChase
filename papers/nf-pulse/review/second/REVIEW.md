# Referee review of the nf-pulse computer-assisted proof (second team)

Date: 2026-09-26. Four independent checks, each run by its own agent without sight of the others, then merged here.
Subject: `papers/nf-pulse/` at commit fec31cf (README.md, code/, data/). A different review session worked on the
same branch at the same time; its reports are in `papers/nf-pulse/review/` outside this folder (`MATH.md`,
`CODE.md`, `PRIOR-ART.md`, `lead/`). The two teams did not see each other's work; where they agree it is noted.

| Check | Report | Scripts |
|---|---|---|
| 1. Mathematics, steps (a) to (g) | [math/MATH.md](math/MATH.md) | `check_equilibria.py`, `check_block.py`, `check_manifold_orbit.py` |
| 2. Code audit and 44 mutations | [audit/AUDIT.md](audit/AUDIT.md) | `mutations.py`, `mutate.sh`, `mutation_results.txt` |
| 3. Independent reimplementation | [reimpl/REIMPL.md](reimpl/REIMPL.md) | `certify_rest_reimpl.py`, `manifold_reimpl.py`, `integrate_reimpl.py`, `shoot_mp.py`, `bracket_mp.py`, `compare_base.py` |
| 4. Prior art | [prior-art/PRIOR-ART.md](prior-art/PRIOR-ART.md) | none (no PDF or full text stored) |

The baseline `sh papers/nf-pulse/code/run_all.sh` passes all 15 checks in about 8 s (reproduced by the lead and by
checks 1 and 2, each on its own copy).

## Verdict

**Sound with fixes.** No finding makes the theorem false. Every mathematical step has a written proof in
`math/MATH.md`, the integrator and the block are rigorous as implemented, and an independent reimplementation with a
different method reaches the same endpoint signs and brackets the speed strictly inside [c1, c2]. The fixes are to
the test harness (two of the 15 checks cannot fail), to what the harness exercises, to labels in the certificates,
to the manuscript (proofs to be written, the 4D versus 5D distinction), and to the README's prior-art framing
(a 2025 paper must be cited and delimited). Priority is not established: four named papers were reachable only as
abstracts and reviews.

## Must-fix

**M1. The mpmath re-check of the block can never fail.** `run_all.sh:28` greps `'^dU 0.05 cone PD'`;
`block_check_iv.py:77` prints that prefix followed by `-> CERTIFIED` or `-> FAILED`. With eps set to 10 in a copy,
the log ends `-> FAILED` and run_all prints OK (audit F1). The lead read both lines in the source and confirms. The
parallel session's CODE.md F1 and MATH.md found the same. Fix: grep for `CERTIFIED$`, or exit non-zero on failure
and have run_all check the exit status.

**M2. The Jacobian test can never fail.** `run_all.sh:31` greps `'max |J_AD - J_FD|'`, which
`test_jacobian.py:37` prints unconditionally, with no threshold. Removing both d/dkappa terms raises the error to
4.7e-2 (against 2.7e-48) and run_all still prints OK (audit F2). The theorem survived this mutation only by margin:
the interval run still passed (y1 radius 3.12e-4 against the 3.38e-4 needed) and the rigorous c1 and c2 runs put y1
inside it. Fix: assert a threshold (for example 1e-40) and print a verdict token.

## Should-fix

**S1. The integrator's rigor is not exercised by run_all.** `test_lohner.py` and `test_lohner2.py` are not run, so
dropping the Lagrange remainder, the a priori inclusion, the lin term, the accumulated error or the hull Jacobian
passes all 15 checks (audit F3). These are harmless in this instance, and the audit measured why: the c1 radius at
xi = 53 is 3.2e-12 against decision margins of at least 1e-4, and the interval run's width is the propagated initial
box (radii near 1e-7, margins near 1.2e-3). `test_lohner2.py neg` does catch them (94 s). Fix: add it, or a faster
sensitivity test with a verdict, to run_all.

**S2. Nothing checks that the interval run covers both 1/c1 and 1/c2.** Running it at c1 only still passes
(audit F4). The code is correct as written (`kappa = 1/(C1 union C2)`, and the reimplementation notes the ball has
radius 3.01e-25, wider than needed); the harness should assert the containment.

**S3. The block's U-range is certified once and not re-checked, and the certified block is not the proof block.**
The `B:` line of run_all certifies r = 1.25 rho, while the proof uses r = 4 rho; `prove_pulse.block_data`
re-certifies the proof block by an assert, so the proof is sound, but the label and `block_certificate.json` are
misleading (math F2, audit F8). If the rho term is dropped from the U-range bound, the block reaches U = 0.26, above
theta = 1/4, where the block lemma fails, and every check still passes because the orbits also lie in the correct
block (audit F5). `math/check_block.py` checks the actual proof block in interval arithmetic: U-range at most
0.0486589 < 0.05, and (C) passes by interval Cholesky. Fix: certify, log and re-check the proof block itself.

**S4. (C) and (E) have no individual negative controls** (audit F6); each can be forced true with nothing failing.

**S5. (E) is certified only where |y1| <= rho, not on the whole side face.** That is all the lemma needs, but at
s_max the entrance bound is +0.0403 on the rest of the face, so an orbit can leave B through the side face while in a
cone. The sets E+ and E- must be defined through the cones (first time L > 0 inside B), not through the face
|y1| = r. The code matches the correct definition; the manuscript must state it this way (math F3).

**S6. The manuscript must say the counts and the block are four-dimensional.** With the fifth variable Y, the 5D
system has a line of equilibria (0, v, v, 0, v) and an extra zero eigenvalue; the `nfcore.rest_state` docstring
("the only equilibrium") is false in 5D. In 4D the rest point (0, S(0), S(0), 0) is isolated for every c > 0
(det J4 = -eps kappa^2), confirmed independently by the reimplementation. The manifold orbit lies on Y = S(U):
W = Y - S(U) satisfies W' = beta U'(1 - Y - S(U)) W, with a coefficient that is integrable as xi -> -infinity, so
W = 0 on the orbit. Invariance of the surface alone does not give this; the proof must be written (math F1, F4).

**S7. The K+ orientation depends on the sign of a numpy eigenvector** (`block.py:59`). As run, y1 = +3.1732 a, so
K+ is the side where U > 0 and the ends go the claimed way. A flipped sign on another LAPACK would make the proof
fail, not pass falsely. Fix: normalise so that the unstable row of T has a positive U component (reimpl, point 2).

## Nits

- `maxU_upper_phase1` (`prove_pulse.py:140, 185`) is the maximum over step-end hulls, which is a lower bound on the
  true peak, not an upper bound: logged 0.7596645, true peak about 0.7597162 (reimpl). Rename it or bound the peak
  with the a priori enclosures.
- The block centre is not checked to be an equilibrium; shifting it by 1e-3 goes undetected (audit F7).
- The c = 1.1024 negative control is refused because the orbit escapes at xi = 14.6, not by the cone logic
  (audit F8).
- `run_all.sh` rewrites tracked `data/*.json` files (timestamps change on every run).
- C1 and C2 are tiny arb balls rather than exact rationals at the point of use; harmless, since each run then covers
  slightly more kappa (math F5).
- The Sylvester test on the unsymmetrised ball matrix is valid, but the reason should be stated; the "for every
  c > 0" part of the rest check is more than the proof needs; the direction convention (xi = x + ct, so the wave moves
  left) is stated only in `nfcore.py` and should be in the README; with gamma = 0 the integral of U over a pulse is 0,
  which explains the dip below rest (math F6 to F10).

## What each check established

**Mathematics.** Each of (a) to (g) is proved in `math/MATH.md`. (a) A bounded h = Q - w*S(U) satisfies h = h'' and
is 0; xi = x + ct with c > 0 is a leftward wave, consistent with the orbit's orientation. (b) As S6. (c) Descartes
gives one positive root; no root on the imaginary axis because s = S'(0) = 0.13296 < 1 and p(0) != 0. (d) The
recursion, the closed-form resolvent, the bound p(mu) >= (3/4) mu^4 for mu >= 2, the truncation induction and the
Banach-algebra bound are correct; the certified tail radii dominate the true coefficients 81 to 120. (e) (C) holds at
every point of B and every kappa in the ball, not only at samples: the divided difference lies in
[S'(-0.05), S'(0.05)], H is affine in it, so positive definiteness at the two ends covers the range with kappa as one
ball; an orbit that stays in B tends to rest by Barbalat's lemma. (f) Openness at the first time L > 0 inside B,
continuity in kappa through the uniform tail bound, disjointness since L stays positive and y1 keeps its sign.
(g) The code checks exactly these hypotheses, nothing weaker. A 4D mpmath integration without Y agrees: after
xi = 53 the c1 orbit enters K- at 58.375, the c2 orbit K+ at 57.75, max U 0.7596. Not covered by this check: the
Lohner implementation line by line (that was check 2).

**Code audit.** `lohner.py` is sound line by line: the a priori enclosure is a valid Picard inclusion, strict, with
kappa taken from the enclosure (line 211); the Lagrange remainder has the right order and is evaluated on the whole
step's enclosure (line 232); the mean-value Jacobian is over the hull, which provably contains xbar, and the
d/dkappa terms (lines 79, 87) are correct; B^{-1} is `arb_mat.inv` of a rounded Gram-Schmidt matrix, rigorous, not a
float transpose (line 256); the between-steps check uses the same enclosure as the step. Parameters and c1, c2 are
exact `fmpq` turned into balls; no float enters a rigorous inequality. Of 44 mutations, 16 are caught and 28 pass
every check; the uncaught ones are either harmless by measured margin (S1) or holes in the harness (M1, M2, S2, S3,
S4). Caught: flipped cones, both ends in the same cone, c2 = c1, a perturbation of eps, theta, beta or c by 1e-20,
eps as the float 0.1, and a non-orthogonal B with a rigorous inverse (enclosures blow up). B = identity passes,
correctly, since it remains rigorous.

**Independent reimplementation** (no base code read until results were in). Rigorous in arb: rest is the only 4D
equilibrium; S(0) = 0.0066928509242848555593..., s = 0.1329611334158030982799...; with one ball for all c in
[c1, c2] the characteristic polynomial l^4 + k l^3 + (eps k^2 - 1) l^2 + k(s - 1) l - eps k^2 has four certified
simple real roots, lambda = 0.96876116057932178705536516... and -1.1678238716..., -0.5831098891..., -0.1246531325...
A point of the U-increasing branch at c1 and at c2 is enclosed to radius 1.0e-93 by a different method (a tapered
isolating tube around a degree-45 graph, closed by a Wazewski argument). Plain interval Taylor integration in arb
(320 bits, order 36, a priori box by Picard iteration, Lagrange remainder; no Lohner step) gives, rigorously: at c1
the unstable coordinate is certified negative from xi = 57.807 (own clock; subtract 3.6905 for the base's), sign -1;
at c2 it stays positive, minimum 3.154e-5, sign +1. Controls c1 - 1e-25 and c2 + 1e-25 give -1 and +1. Numerically
(order-60 Taylor, dps 70 and 85, agreeing to 1.2e-66, started from a coarse bracket without the claimed digits):
c* = 1.102747709734159249147867735746621733255053383781820878927260055, so c* - c1 = 3.57e-26 and c2 - c* = 6.43e-26.
The reimplementation's orbits lie inside every base enclosure at xi = 53 and at the cone-entry times. Not covered by
this check: the block and the interval run over the whole speed interval, so it confirms the endpoints and the
speed, not the theorem by itself.

**Prior art.** None of Zhang, JDE 197 (2004); Zhang, JDDE 17 (2005); Pinto, Jackson and Wayne, SIADS 4 (2005);
Sandstede, IJBC 17 (2007) could be read in full (ScienceDirect 403, Springer challenge, SIAM and World Scientific
closed, ResearchGate 403, a captcha on Sandstede's page). From zbMATH reviews and abstracts: Zhang 2004 is a scalar
front problem, "H is the Heaviside step function" (zbMATH 1054.45005); Zhang 2005 is Heaviside, "the case eps = 0 and
0 < eps << 1" (zbMATH 1082.45009); Pinto, Jackson and Wayne: "A Heaviside step function governs the activation", eps
not assumed small; Sandstede (doi:10.1142/S0218127407018695; the DOI in the task pointed elsewhere) proves spectral
implies nonlinear stability and constructs no waves. None proves a pulse with a smooth sigmoid at a fixed non-small
eps, as far as these sources show.

New and important: **Burlakov, Oleynik and Ponosov, Mathematics 13 (2025) 701, doi:10.3390/math13050701** (open
access, read in full). Same model, fixed 0 < eps < 1/(sigma + 4) (so eps < 1/4 at sigma = 0, which includes 1/10).
Theorem 3 (p. 14): a non-degenerate Heaviside pulse persists for "any sufficiently steep firing rate function
approximating the Heaviside". It does not cover the present claim: it assumes a C^1 kernel (e^(-|x|)/2 is not C^1),
gives no steepness bound (so beta = 20 is not shown covered) and checks its hypotheses on no example. The prior-art
agent also flags possible problems in its argument (the speed held fixed as the rate changes, uniqueness in a ball
despite translation invariance, and Theorem 3 claiming every beta where Theorem 2 gives beta in (0, 1]); that reading
is unconfirmed. Searches: arXiv abstract queries on neural field with sigmoid, rigorous numerics, computer-assisted,
nonlocal and interval arithmetic found no rigorous neural-field wave result; web searches found computer-assisted
pulses only for FitzHugh-Nagumo (arXiv:1507.01462, arXiv:1909.06207) and non-neural nonlocal problems
(arXiv:2505.03091, arXiv:2504.05066). The Semantic Scholar search was rate-limited and the OpenAlex budget exhausted,
so those two do not count.

**Conclusion on novelty.** The computer-assisted proof at beta = 20, theta = 1/4, eps = 1/10, gamma = 0, kernel
e^(-|x|)/2, with the speed enclosed to 1e-25, is new as far as reached. The README's framing is not: it must cite
Burlakov, Oleynik and Ponosov (2025) and say what it does and does not cover, instead of resting on Hastings's 2017
remark alone. Before any claim of priority, read the full texts of Zhang (2005) and Pinto, Jackson and Wayne (2005)
and check the 2025 argument.

### Proposed RESEARCH.md entry

```
### 2026-09-26  neural-field pulse with a smooth sigmoid: the Zhang papers, Pinto-Jackson-Wayne, Sandstede, and a 2025 existence theorem  (session agent; `papers/nf-pulse/review/second/prior-art/PRIOR-ART.md`)

- Why: the entry of the same day could not reach Zhang (2004, 2005) or Pinto, Jackson and Wayne (2005), and priority for `papers/nf-pulse/` waited on them.
- Read, not the full texts (ScienceDirect 403, Springer client challenge, SIAM and World Scientific closed, ResearchGate 403, Sandstede's page captcha): zbMATH 1054.45005 review of Zhang, JDE 197 (2004) 162-196 (scalar, w constant, "H is the Heaviside step function"); zbMATH 1082.45009 review of Zhang, "Traveling waves of a singularly perturbed system of integral-differential equations arising from neuronal networks", JDDE 17 (2005) 489-522 (Heaviside, "the case eps = 0 and 0 < eps << 1"); abstract of Pinto-Jackson-Wayne, SIADS 4 (2005) 954-984 ("A Heaviside step function governs the activation", no assumption on the recovery rate); abstract of Sandstede, IJBC 17 (2007) 2693-2704 (spectral implies nonlinear stability). zbMATH reviews of eight further Zhang neural-field papers: all Heaviside where stated; six reviews unavailable (Math. Z. 255, JJIAM 27, Physica D 239, DCDS 34, DCDS-B 16, JMN 3), not read.
- Found and read in full: Burlakov, Oleynik and Ponosov, Mathematics 13 (2025) 701, doi:10.3390/math13050701 (CC BY). Same model; Theorem 3 (p. 14): pulses exist for "any sufficiently steep firing rate function approximating the Heaviside", at fixed 0 < eps < 1/(sigma + 4), for a nonnegative C^1 kernel, if a Heaviside pulse satisfies (17)-(19), (21). No steepness bound, no example checked, e^(-|x|)/2 is not C^1; its fixed-speed formulation and the uniqueness in a ball under translation need checking.
- Searched (arXiv abstract search): '"neural field" pulse sigmoid existence' 0; '"neural field" pulse sigmoidal' 0; '"neural field" traveling pulse' 8, none rigorous for smooth rates; 'rigorous numerics "neural field"' 5, none; 'computer-assisted proof traveling wave' 10 and 'computer-assisted nonlocal' 29, none on neural fields; '"interval arithmetic" "traveling pulse"' 0. Web searches for computer-assisted or validated-numerics neural-field waves: only FitzHugh-Nagumo (Matsue arXiv:1507.01462, Czechowski arXiv:1909.06207) and non-neural nonlocal problems (Cadiot 2505.03091, Breden et al. 2504.05066). Semantic Scholar search rate-limited; OpenAlex budget exhausted.
- Result: the computer-assisted proof at beta = 20, theta = 1/4, eps = 1/10, gamma = 0, kernel e^(-|x|)/2, with the speed enclosed, is new as far as reached. The statement that no pulse is proved for a smooth firing rate at fixed eps is not: Burlakov-Oleynik-Ponosov (2025) must be cited and delimited, alongside Hastings's remark.
- Re-search: no, unless a week passes; read the full texts of Zhang (2005) and Pinto-Jackson-Wayne (2005), and check the Burlakov-Oleynik-Ponosov argument, before any claim of priority.
```

## Not done by this review

- No full text of the four named papers was read; the priority question stays open until it is.
- The Burlakov, Oleynik and Ponosov argument was read once, not verified.
- The written proofs of QUALITY.md item 1 are still absent from the paper folder; `math/MATH.md` is a referee's
  proof sketch, not the manuscript.
- No fix was applied to `papers/nf-pulse/code` (out of scope for this review).
