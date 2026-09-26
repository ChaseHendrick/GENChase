# Referee verdict: transversal homoclinic orbit of the classical double pendulum (research/double-pendulum)

Referee: independent adversarial agent, 2026-09-26. Nothing under /home/user/GENChase was modified. All work is in
this folder: `dp/` (copy of the project), `mut/` (mutation battery), `indep/` (independent Arb/Python code),
`src/` (downloaded prior-art PDFs and text).

## Overall verdict

**Confirmed, with minor caveats.** Theorem 1 (at E = -1/2, 0, 1/2) is supported by a computation I reran and could
not break, and the written proof in REPORT.md Section 4 has no gap that I could find that affects the result. At
E = 0 I checked the decisive numbers independently: the fixed point, its hyperbolicity and its multiplier
rigorously (my own Arb code, not CAPD), and the 9-return edge images, the crossing point and the crossing slope
numerically at high precision. Corollaries 1-3 follow by standard arguments; Corollary 3 (global analytic
non-integrability) rests on an unquantified but standard persistence argument, and whether it is new still
depends on Bolotin-Negrini (1997), which I could not reach either.

What rests on trust: CAPD's rigorous integrator and Poincare map (I read the parts that matter; see 3.3), the
compiler and floating-point rounding, and the correct coding of the derivative chain in stage 3. The last one is
not self-checking (mutations P8, P9 below pass). I checked it by reading and by an independent slope computation
that lands inside the certified interval.

## Issues, ranked by severity

None of these invalidates the result.

1. **(Medium, presentation/scope) Novelty of Corollary 3 is unresolved.** Bolotin-Negrini, Russ. J. Math. Phys. 5
   (1997) 415-436, and Bolotin's NATO ASI chapter "Variational criteria for nonintegrability and chaos in
   Hamiltonian systems" (Springer, DOI 10.1007/978-1-4899-0964-0_14) are behind paywalls here. Springer redirected
   to a login and ResearchGate and ScienceDirect returned 403. The report already says this honestly.
   Fix: keep the hedge; get the paper before claiming Corollary 3 as new.
2. **(Low) The derivative chain in stage 3 is load-bearing but not self-validating.** If one factor is dropped (P8)
   or the order is reversed (P9), the program still prints PROVED, with a different slope interval ([-0.159, -0.046]
   and [-0.308, -0.308] instead of [-6.21, -0.524]). The shipped code has the right order and count: D f(Z) first,
   then D f(Y_0), ..., D f(Y_{k-2}), k factors in all. My independent slope, -1.33620214, lies in the certified
   interval and in neither mutated one. Fix: add a comment or an assert on the factor count, and quote the
   independent slope in the report as a cross-check.
3. **(Low, rigor hygiene) A few double-precision inequalities are not outward rounded.**
   - Stage 2: `cm = max|w|/au` is a double division, compared with alpha (margin 3.6e-4 against 1e-3).
   - Stage 2: `|y_p| + alpha (a + |x_p|) < b` is computed in doubles, and it checks only the matched endpoint pairs
     (right with right, left with left), not the worst mixed pair (margin: about 2.5e-8 against 4e-8).
   - Stage 3: the cover of [x1, x2] by nseg pieces takes its last endpoint as `x1 + (x2-x1)*nseg/nseg`, not `x2`. I
     checked that this equals x2 exactly for all four segment/nseg combinations used, so there is no gap in
     practice.
   Every margin is many orders of magnitude above double rounding, so no conclusion changes. Fix: do these
   comparisons in `interval` and set the last endpoint to x2 explicitly.
4. **(Low) Stage 3 does not check the lift domain explicitly** (`liftable` is called in stages 1 and 2 only). This
   is safe because CAPD's interval `sqrt` throws on a negative argument (Interval_Fun.hpp:291-294), and the throw
   is caught as a failure (pieces) or aborts the run (edges). Near q_0 the lift argument is about 5.3. Fix: add
   `liftable` calls for clarity.
5. **(Low) The first-return property relies on reading CAPD's code.** I read it and agree with REPORT Section 9.
   `integrateUntilSectionCrossing` calls `getSign(..., true)` on every step, and that calls `checkTransversability`
   (PoincareMap_templateMembers.h:396-414). If the step enclosure meets t1 = 0, this throws unless grad(t1) . F
   over the *whole* step enclosure excludes 0. So t1 is monotone on any step that meets the section, no upward
   crossing can be skipped, and the nret-th return is the true nret-th return. After a call, the set is left
   "just after the section" (PoincareMap_templateOperator.h), so repeated calls in `piece()` count returns
   correctly. `C1DoubletonSet(x, C, r0)` starts the derivative at the 4x4 identity (C1DoubletonSet.hpp:54-65), so
   `mon` is D phi with respect to the 4-dimensional point, and `Pi DP L` is the correct chain rule.
6. **(Low, maths) Small omissions in the written proofs** (Section 4):
   - Corollary 3: "F constant on each M_E for |E| < eps" needs M_E inside U for E near 0. This holds because H is
     proper (the configuration space T^2 is compact), but it should be said.
   - Lemma 1: det DP = 1 exactly, because the return map of a two-degree-of-freedom Hamiltonian flow preserves
     dt2 ^ dp2 on {t1 = 0}. That gives |lambda_s| = 1/|lambda_u| directly; the (C3) det test is then only a
     consistency check. It is not wrong, just redundant.
   - Section 1 says "Section 7 records the adversarial check"; it is Section 8.
7. **(Cosmetic) One quote is not in the abstract.** The Stachowiak-Szuminski quote ("Until now, there is no closed
   mathematical proof confirming its non-integrability.") is exact but comes from the introduction (p. 1 of
   arXiv:1511.01850), not the abstract. The report does not say it is from the abstract, so this is fine as long
   as that stays so.

## What I reran, with outputs

### 1. Full rerun from a copy (`dp/`, reusing the built CAPD via CAPD_CONFIG)

`sh code/run_all.sh` (about 7 min wall clock, 4 threads):

    RESULT: OK                       (check_field.py: CAPD field string == Hamilton's equations, exactly)
    E0: PROVED
    Ehalf: PROVED
    Eminushalf: PROVED
    control_uncoupled_E0: fails, as it must
    control_mut_segment: fails, as it must
    control_mut_alpha: fails, as it must

The new E0, Ehalf and Eminushalf logs are identical to the committed ones, apart from the order of the piece lines
(which comes from OpenMP).

### 2-3. Mutation battery (`mut/run_mut.sh`, `mut/all.sh`, each run on E0.cfg, stopped at the first FAIL)

| mutation | first failing stage |
|---|---|
| D1 gravity 2 g sin t1 -> 2.01 g sin t1 | stage 1 Krawczyk (K far from B) |
| D2 gravity coefficient * (1 + 1e-7) | stage 1 Krawczyk (fixed point moves 3.7e-8 > r = 1e-9) |
| D3 gravity coefficient * (1 + 1e-14) | passes: the fixed point moves about 1e-14, well inside B, and every margin is large. This is legitimate robustness. |
| D4 sign of the coupling term in dp2/dt | stage 1 Krawczyk |
| D5 lift uses -sqrt (wrong branch) | stage 1 Krawczyk |
| D6 sign error in d p1 / d p2 of the lift (derivative only) | stage 1 still passes (only C changes); stage 2 fails: cone ratio 0.61, mu 1.12, 1000 failures |
| D7 section direction PlusMinus | stage 1 Krawczyk |
| C1 shift 0 | stage 1 Krawczyk |
| C2 alpha = 0.1 | stage 2 (C3): graph of slope alpha leaves N0 |
| C3 k = 8 instead of 9 | stage 3 (C4): edges not separated |
| C4 target line m = 1 (t2 = pi) | stage 3 (C4): edges not separated |
| P2 `hit` always false (skip transversality) | stage 3: the nhit > 0 guard fails |
| P10 lift derivative omitted from L | stage 2 fails (mu 0.71) |
| P1 band yR of zero width | passes (a weaker set; the code cannot detect that) |
| P4 skip one of the 1000 stage-2 sub-boxes | passes (cover completeness is by construction; I checked the cover by reading) |
| P5 `far` uses only the near endpoint | passes (a smaller band; same remark) |
| P7 applyDir without sub-division | passes, with a wider slope interval [-6.61, -0.485]; sound, only less sharp |
| P8 drop one derivative factor in stage 3 | passes with a wrong slope (see issue 2) |
| P9 reverse the order of the derivative chain | passes with a wrong slope (see issue 2) |
| P11 use the flow derivative in place of the Poincare-map derivative (drop the return-time correction) | stage 1 still passes; stage 2 fails (mu 0.71, cone ratio 3.9, 1284 failures) |

Reading: every model, lift, section, shift, segment and cone mutation is caught by the stage whose hypothesis it
breaks. The mutations that pass all weaken or corrupt the checking code itself, which no program can detect in
itself. For each of them I checked the shipped code by hand: the band formula, `far` (the hull over both
endpoints), full grid coverage with 1e-6 relative overlap, the direction chain order, and the mean-value lift
remainder.

Line-by-line rigor review (prove.cpp, dp.h). These are all correct:
- Krawczyk operator: `K = p0 - C F(p0) + (I - C DF(B))(B - p0)` with F = f~ - id and DF(B) = Df(B) - I.
- The symmetry argument G(K) in B and uniqueness give G p = p. The reversibility in the lift, G f~ G = f~^{-1},
  re-derived: the deck translation is inverted by G.
- The mean-value lift remainder in `derivC1` and `piece`: rem contains (a~ - am)(A r)_0 + (b~ - bm)(A r)_1.
- The sub-box offsets `rrl` cover p0 + A(rc + rr), because Ai is an interval enclosure of A^{-1}.
- The (C2) image by mean value, `Ai (f(zc) - p0) + M rrl`.
- The cone check over the whole interval t in [-alpha, alpha].
- The sign-constancy check for (C1).
- `applyDir` gives valid enclosures: each sub-slope's image is an interval quotient, and the hull contains the
  union.
- The E values are exact rationals (1/2 is I(1)/I(2)).

### 4. Independent recomputation (not CAPD): `indep/`

Code: `dparb.py` (Hamilton's equations derived again with sympy from H; Taylor order 30 in python-flint/Arb at 256
bits; validated Picard rough enclosure; Lagrange remainder; the crossing time by interval Newton; every step that
meets t1 = 0 must have t1' of one sign), `mvint.py` (mean-value set propagation with the variational equation), and
the drivers `kraw3.py`, `otherE.py`, `edges_nr.py`.

**Rigorous (ball arithmetic, independent of CAPD), E = 0:**
- The Newton iteration started from (0, -1.46) gives p* = (0, -1.46237309247985834743226754164).
- F(p*) = f~(p*) - p* is in ([-3.89176e-19 +/- 3.2e-25], [2.14839e-19 +/- 4.2e-25]); the return time is
  [2.9534890103949463318 +/- 8.7e-21].
- On B = p* + [-1e-17, 1e-17]^2, the enclosure of DF(B) is
  [[-2.904328184, 5.261110407], [0.4992227172, -2.904328184]], each entry to +/- 1e-9.
- **Krawczyk: K is in the interior of B; G(K) is in B.** So there is a unique fixed point of f~ in B, and it lies on
  Fix(G).
- Over B: trace = -3.808656368 +/- 8.3e-10 and det = 1 +/- 1.2e-9, hence hyperbolic, with
  **lambda_u in [-3.52496566 +/- 2.5e-9]** (the report's bound |lambda_u| >= 3.52385 holds).
- p*_2 lies inside CAPD's enclosure [-1.4623730924803009, -1.4623730924794167].

**Rigorous at the config points (point enclosures), E = -1/2 and 1/2:**
- The residuals f~(p0) - p0 are about 1e-16 and 1e-15. The return times [3.70477454618 +/- 7e-13] and
  [2.56436222486 +/- 3e-12] lie inside the report's intervals.
- trace Df(p0) is -3.231536538 and -3.332800075, both inside the report's intervals.
- det is 1 +/- 1e-14.
- lambda_u is -2.884904628 and -2.999400070, consistent with mu = 2.88345 and 2.99875. (These are point
  derivatives, not a full Krawczyk.)

**Numerical, high precision (Taylor order 30 and 24, steps 0.02 and 0.01, midpoint-reset Arb, no error
control):** f~^9 of z = p0 + x v_u at E = 0 gives

| x | t2 + 18 pi | p2 | report's certified enclosure of t2 |
|---|---|---|---|
| -1.8870e-5 | +1.52049688278525e-3 | 0.820117020585811 | [1.51906e-3, 1.52193e-3] |
| -1.8838e-5 | -3.11657765030988e-3 | 0.826314993834828 | [-3.11800e-3, -3.11515e-3] |

The two step sizes agree to 15 digits, and H is conserved to 1e-28. The crossing of t2 = 0 is at
x = -1.88595114003792e-5, inside the two pieces the program found, [-1.886e-5, -1.8859e-5]. Its image has
p2 = 0.822148135, inside the report's [0.822049, 0.822252], and the slope is
**dp2/dt2 = -1.336202144**, inside the certified [-6.21, -0.524]. It matches the report's numerical -1.336.

### 5. Prior art (PDFs downloaded to `src/`, text extracted)
Quotes checked verbatim (up to ligatures):
- arXiv:2602.21123: both quotes are exact. The first is in the abstract; the second is on p. 3, where it
  continues "... is still missing - an explicit particular solution has yet to be found".
- arXiv:1511.01850: exact, in the introduction.
- arXiv:1303.4904: exact. It uses m = l = 1 ("all the masses as well as all the lengths ... equal to 1").
- arXiv:2209.10132: both fragments are exact.
- Dullin (author preprint dopePRELIM.pdf): "we assume epsilon << 1" and "it can naturally give results close to an
  integrable case only" are exact. The equal case maps to (1/2, 1/2, 1/2). Note that Dullin's own abstract says
  "proving it to be a chaotic system"; that claim is perturbative, so the report's reading is fair.

Bolotin-Negrini 1997 and Bolotin's 1995 chapter: not reached (paywalls). The only descriptions available agree with
the report: "in a certain domain of parameters" (zbMATH), and energies near the top of the potential
(Moauro-Negrini). Moauro-Negrini's own abstract, "under a certain restriction on the ratio of masses" and "large
energy", surfaced again in search.

Five independent web searches (computer-assisted proof, chaos in the double pendulum, interval arithmetic,
horseshoe or positive entropy for equal masses, recent Morales-Ramis work) found no rigorous proof of chaos or
non-integrability for the classical equal-mass, equal-length double pendulum. The hits were the forced damped
pendulum, restricted and variable-length double pendula, numerics (0812.0393, 2312.13436, 2403.07000, 2608.20276)
and perturbative Melnikov results. This agrees with the report's verdict, within the limits of a web search.

### 6. Mathematics of Section 4
- Reversibility: R(q, p) = (-q, p) preserves H and reverses omega. For 0 < s < tau, R phi_{tau-s}(x) meets t1 = 0
  only at downward crossings, because an upward crossing maps to an upward crossing. So P G = G P^{-1} holds.
  Checked.
- Krawczyk uniqueness and existence: correct as written.
- Lemma 1: correct. Lemma 2: the induction, the monotonicity from the constant sign in (C1), the expansion
  |x(f z) - x_p| >= mu |x(z) - x_p|, and the use of (C2) to stay in N0 are all correct. Lemma 3: IVT on a
  continuous lift, G W^u = W^s, uniqueness of the branch through q by injective immersion, and
  det[v, DG v] = 2 v1 v2 != 0 are all correct.
- Corollary 1: Smale-Birkhoff, then Abramov with roof at most N T_max, then the variational principle. Correct.
- Corollary 2: the Kozlov argument is correct. Its points are: z_n != w because the pieces f^n(D) are disjoint in
  the parameter of the immersion from the local piece; identity theorem on each arc; the union of the arcs is
  open; M_E is connected. I checked that M_E is connected for -1 < E < 1: the configuration region
  {V <= E} contains t1 = 0 for every t2, so it is a connected annulus.
- Corollary 3: correct, modulo the properness remark in issue 6. The standard definition of functional
  independence is used.
- Symmetry claim: G(K) in B is only tested on the t2 component, which is enough because G leaves p2 unchanged.
