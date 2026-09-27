# Referee report, 2026-09-27: analysis

The report below is reproduced verbatim as the reader returned it. Its line numbers, and its numbers of lemmas,
theorems and remarks, refer to the manuscript it read (`paper/hh-dynamics.tex` at d152286, 24 pages). The response
after it uses the numbers of the revised manuscript; where they changed, both are given.

---

REFEREE REPORT on papers/hh-dynamics/paper/hh-dynamics.tex (and hh-dynamics.pdf, 24 pages, built 2026-09-27 04:53), worktree hh-manuscript at 67df917.

This is an in-project reading by an independent agent on 2026-09-27. It is not an outside review. I was told to look for errors. I read only the manuscript, its programs and outputs in papers/hh-dynamics/, the HH entries of RESEARCH.md, and the primary sources I could reach. I edited no file. The one program I reran was run on a copy in the session scratchpad.

VERDICT: minor revision.

The mathematics holds up. I checked the model against the 1952 equations as RESEARCH.md reads them, every written proof, and the code paths behind each computer-assisted step, and found no error that breaks a theorem. The problems are statements that claim more than the proofs deliver, plus a few gaps in lemma hypotheses. Two statements claim more than is proved and must be reworded:
(1) Theorem 5(c) claims uniqueness in the boxes of Table 3. Those boxes are about 1000 times wider than the Krawczyk boxes in which uniqueness is actually proved.
(2) The abstract and the Theorem 2 bullet say the equilibrium is "asymptotically stable except for J between two Hopf points". On the natural reading (between = open interval) this includes J = J_H1, where the equilibrium is not stable: normal form with sigma = +1 at beta = 0.
Both fixes are wording changes. No new computation is needed.

SUMMARY OF WHAT HOLDS

The model. The sign conversion u = -V and J = -I is correct. So is each rate function against HH eqs. (12), (13), (20), (21), (23), (24), after substituting V = -u: for example alpha_n = 0.01(10-u)/(exp((10-u)/10)-1) = 0.1 Psi((10-u)/10). The current equation (26) and the Table 3 constants (g_Na = 120, g_K = 36, g_l = 0.3, E_Na = 115, E_K = -12, C = 1, 6.3 C) are also correct. E_l* is right: an independent mpmath computation gives 10.59892096939167852219887852940657980278, inside the paper's interval.

Lemma 2.4. Expanding the Schur complement reproduces a1 to a4. The identity a4 = e3 Jss' is right, and so are the closed-form eigenvectors q and w.

Lemma 4.1 (the quartic lemma).
- (a) The imaginary-axis condition reduces to -D3/a1^2 = 0.
- (b), (c) The connectedness argument holds: D3 > 0 is equivalent to a2 > a3/a1 + a1 a4/a3.
- Both examples are correct: (lambda+1)^4 has D3 = 64, and lambda^4 + 2lambda^3 - lambda^2 + 2lambda + 1 has D3 = -12.

Lemmas 4.2 and 4.3 (linear stability and instability) are correct.

Lemma 4.4 is correct:
- the bound |B_n|/n! <= 4/(2pi)^n;
- the geometric tail bound for the Taylor coefficients of Psi;
- the identity e_j(w) = 1F1(j+1; j+2; w)/(j+1)!;
- the monotonicity of each e_j.

Lemma 4.6 is correct. I redid the centre-manifold coefficient and the direct evaluation of (eq:l1) by hand: <p,C> = 4 varsigma, <p,B(q,A^-1B)> = -2bc/a, and <p,B(qbar,(2iw-A)^-1B(q,q))> = 2 d phi/(e+2iw). I also recomputed two test values by hand: the planar case at omega = 1 gives -0.160417, and the coupled case at omega = 3/2 gives -0.101502.

Theorems 1 and 2 and their proofs:
- The sign argument outside [-12, 115] is correct.
- All zeros of D3 lie in the undecided pieces. Each enlarged cluster contains exactly one zero, by the enclosure of D3' and the sign change.
- The interval Newton argument is correct.
- The transversality formula lambda'(u) = -p_u/p_lambda, divided by Jss', is correct.
- The l1 computation is correct: w^T q normalisation, p = conj(w), and B and C obtained by polarisation along complex directions.
- Independently in mpmath I got u_H1 = 5.3458563970045945356, J_H1(10.613) = 9.7754379953931263325, u_H2 = 21.941907987016173702 and J_H2 = 154.52243366580800086. All lie inside the paper's intervals.

Corollary 3. The hypotheses of the cited Kuznetsov theorem are checked in the text. Matching the parameter side by the stability of the equilibrium correctly handles mu'(0) < 0 at H2.

Section 5 against the code:
- Lemma 5.1 (a priori enclosure) matches Integrator.enclose / apriori_ok.
- Lemma 5.2 (variational enclosure) matches the YV test with A_{p+1}(Y) YV.
- Lemmas 5.3 and 5.4 (mean-value form and Lohner update) match advance().
- Lemma 5.5 (step classes D, N, P, H) matches the branches of poincare(), including the 'approach' and 'extend' branches.
- The crossing formulas match _crossing().
- Lemma 5.6 matches Proj * N(T) * V.
- Lemmas 5.7 and 5.8 are correct.
- Lemma 5.10 matches gershgorin_eigenbasis and multiplier_test. The float radius is rounded up by (1+1e-15), which absorbs the rounding to nearest.
- Lemma 5.11 matches ball_stable.prove_piece.
- The stability arguments of Lemmas 5.12 and 5.13 are correct in substance. See the should-fix item on their hypotheses.

Theorem 5.9 against Rump's text. I fetched the TUHH copy of Rump (2010), pp. 88-89. See the should-fix item.

Numbers. Every number in the theorems and tables that I compared matches the data files after outward rounding. This includes J_equiv = [7.9931, 8.0021], the frequency bounds, the period union, and the Table 1-3 entries.

MUST-FIX

M1. Theorem 5(c), Table 3 caption, and the proof of 5(c) (tex lines 505, 532, 823). The theorem says "The section points of Gamma_s and Gamma_u are the only fixed points of the first-return maps in their boxes (Table 3)."
- Uniqueness is proved only in the Krawczyk box Z. Z has radius 1.00e-15 to 1.22e-15 for Gamma_s and at most 2.13e-14 for Gamma_u (data/certify_bistability.txt, the 'C^1 run over Z (radius ...)' lines).
- Table 3 lists intervals of width 1e-11, about 1000 times wider than Z. A second fixed point inside a Table 3 box but outside Z is not excluded.
- Fix option (a): state uniqueness in Z, giving its centre and radius, as Theorem 4 does for its own box.
- Fix option (b): rerun the Krawczyk test on the Table 3 boxes.
- In either case, justify that the fixed point lies in K. Rump's Theorem 13.3 states exactly this: the root lies in x~ + S(X, x~). See S2.

M2. Abstract (line 337) and the Theorem 2 bullet of the introduction (line 353). "It is asymptotically stable except for J between two Hopf points" reads naturally as asymptotic stability for every J outside the open interval (J_H1, J_H2), including J = J_H1.
- At J_H1 the equilibrium is not stable. Corollary 3 gives topological equivalence to the normal form with sigma = +1 at beta = 0, where r' = r^3.
- Theorem 2(a) itself correctly says J in [0, J_H1) or (J_H2, 200].
- Fix: write "asymptotically stable for J < J_H1 and J > J_H2", as README.md already does, and say nothing about the endpoints, or state them.

SHOULD-FIX

S1. Hypotheses of Lemmas 5.12 and 5.13, and the definition in Section 2.4 (lines 448, 794-812).
- Both lemmas are stated for any periodic orbit through y* with F_i(y*) > 0. Step 1 of 5.12 cites Lemma 5.6 for continuity of tau, but Lemma 5.6 holds only under the run hypotheses of Lemma 5.5.
- For a general orbit, the "first-return map" (smallest t > 0 with g = 0 and dg/dt > 0) can be discontinuous next to y*: if Gamma touches Sigma tangentially at an intermediate time, nearby orbits can cross upward earlier.
- The applications are fine, because z* lies in the relative interior of Z, where Lemma 5.5 holds.
- Fix: state both lemmas for the local return map given by the implicit function theorem (tau near T), or add the hypothesis "P is the first-return map on a neighbourhood of y* in Sigma and satisfies the conclusion of Lemma 5.5 there". The sentence in Section 2.4 has the same issue.

S2. The cited Theorem 5.9 is not stated as in the source (line 770). Rump (2010), Theorem 13.3, p. 89, as read in the TUHH copy:
- f is C^1 on a set D that contains x~ + X, not on all of R^n.
- The conclusion says there is "a unique root x^ of f in x~ + S(X, x~)".
- Uniqueness in the whole of x~ + X appears only in the last line of the proof ("f is injective over x~ + X").
- The paper states uniqueness in z~ + X as part of the theorem, and omits the containment of the root in z~ + S (= K). The paper needs that containment for Table 3 and for M1.
- Fix: quote the statement as Rump gives it, with D, and add the one-line injectivity argument: G(z1) - G(z2) = M~(z1 - z2), where the integral mean M~ of the Jacobians lies in the interval matrix M and is nonsingular.

S3. Novelty sentence (line 359) against Du and Hassard (2001).
- The paper says it has not found an earlier proof that the equilibrium "has no other imaginary-axis crossings than the two Hopf points".
- RESEARCH.md (2026-09-27) says that, by its abstract, Du and Hassard solve Hopf "location and recognition problems" in interval arithmetic for the HH model, and that the full text was unread.
- Section 10 raises Du and Hassard only for criticality. Fix: extend that caveat to the location and exclusion of Hopf points, and qualify the sentence in the introduction the same way.

S4. The Lohner step needs xbar in X (Sets paragraph and Lemma 5.4, lines 700-716).
- Lemma 5.3 assumes ybar is in X. The Sets paragraph only says X contains S. The centre xbar need not lie in X unless 0 is in r0 and in r.
- The code satisfies this: r0 is arb(0, r) or ball - mid, r starts at 0, and r' contains 0 because Z - mid(Z) contains 0. The paper states none of this.
- Fix: one sentence stating the invariant and why the update preserves it.

S5. Lemma 5.10(b), proof (line 781): "at t = 0 they are the centres". At t = 0 the eigenvalues are the diagonal entries of S^-1 M S, which lie in the discs D_i but need not equal the c_i. The counting argument goes through once this is corrected.

S6. Theorem 4, statement and proof (lines 495, 827).
- "a box of radius about 4.6e-7" in a theorem statement: neither the box nor its radius is specified. The per-piece centres and radii are not printed in the output ('box radius ~4.6e-07').
- Fix: print the boxes, or state an existence claim with explicit radius bounds.
- Relatedly (Remark 3.1), the check that the Theorem 5(a) Krawczyk box lies inside the stage-4b box of the same E_l would identify Gamma_s with Gamma(E_l). It costs almost nothing and is worth doing.

MINOR AND NITS

m1. Typo in Section 5 (line 677): "1 + e^{(30-u)/10} e^{-(u-u0)/10}" should read "1 + e^{(30-u0)/10} e^{-(u-u0)/10}". This is what hh_arb.rate_coeffs computes.

m2. Theorem 1 already holds for J in [0, 4089]. Part A shows Jss >= 4089.4815 for every u >= 115 and Jss' > 0 on [-12, 115]. So Theorem 1, and the stability of Theorem 2 for J > J_H2, extend to J < 4089.48 with no new computation. Remark 3.1, Section 8 and Section 10 then understate what is proved ("nothing about J > 200"; "numerically unique beyond 200").

m3. Reproducibility (line 912), "adds the tests of (l1), two controls, ...": the enumeration does not add up. Git shows the earlier output had 27 checks, including the Newton control. The 11 new checks are:
- 5 l1 self-tests;
- 2 l1 mutation controls;
- the factorisation control;
- the E_l* overlap;
- J_H1 > 8;
- the printed-bound ledger.
List them explicitly.

m4. RerunText (make_numbers.py, lines 446-506): it says "each of its 318 lines other than run times". The comparison also drops the floating-point Newton lines, the stage-6 'iteration' lines and the check-count line. Say so.

m5. The trust base (line 863) omits operations the Hopf program uses: arb sqrt, arb.pi, abs, acb conjugate, and FLINT's exact Bernoulli numbers (fmpq.bernoulli), on which Lemma 4.4(a) depends.

m6. Numbering: "Theorem 4" and "Theorem 5" sit beside "Theorem 4.5" (Kuznetsov) and "Theorem 5.9" (Krawczyk). Give the cited theorems their own counter or letters.

m7. Lemma 4.4(a), proof: "decreases in n" should be "does not increase" (for k = 0 the ratio is constant).

m8. Section 8 (line 871) says no orbits were computed at J_H2. My quick scipy LSODA run (rtol 1e-10) found stable small cycles below J_H2, with (peak-to-peak u)^2/(J_H2 - J) = 14.34 at 0.4 and 14.32 at 0.2, against the predicted 14.29. Adding this would corroborate supercriticality numerically.

m9. Wording:
- Section 8 (line 867) calls stage 6 "a Taylor code ... without error control". The integrator has rigorous remainders; it is the Newton iteration on midpoints that is uncertified.
- Section 6 (line 819) calls {zbar} x {E_l} "thin". At 96 bits arb('10.613') is a ball of radius about 1e-29.

m10. PDF layout: in Table 1, row 1, the mu_1 cell wraps ("2.25 . 10 -9" on one line, the next cell on the following line); Table 2's exponent is displaced. Possibly a pdftotext artefact; check visually.

WHAT WAS CHECKED
- Every theorem statement and the written proof of every lemma, proposition and corollary in Sections 2 to 6.
- The labels.
- The claims of Sections 7 to 10 against the data.
- make_numbers.py's outward rounding of the macros I sampled.
- The model constants and rates against RESEARCH.md's reading of HH 1952.
- Code: hh_ball.py, hh_arb.py, hh_lohner.py (all), certlib.py (all), ball_stable.py, certify_equilibria_hopf.py (all), certify_bistability.py (all), the relevant parts of outward.py and make_numbers.py.
- Rump (2010), Theorems 13.2 and 13.3 with proofs, from the TUHH PDF.
- Independent numerics: mpmath for E_l*, u_Hi and J_Hi; scipy for both J = 8 orbits (T_s = 16.0077128038, dominant mu = 0.0708968; T_u = 14.3436009481, mu = 10.3029 and 0.1968) and for the H2 cycles.

NOT CHECKED
- Kuznetsov's Scholarpedia article: HTTP 503 on both http and https on 2026-09-27. I checked the statement and the l1 formula against the standard form I know, not against the page.
- The 1952 paper itself (I relied on RESEARCH.md), Du and Hassard, Kuznetsov's book, Gershgorin (1931).
- certify_bistability.py was not rerun: about 40 minutes, and the shared 4-core machine had a load average of about 12.
- tests_integrator.py, testsys.py, hh_numerics.py, hp_refine.py, shoot_float.py and make_figures.py were not read line by line.
- No mutation testing. python-flint and Arb internals not examined. The PDF was not rebuilt; pdftotext of the committed PDF shows no '??' references.

COMMANDS (output tails)
1. Rerun of the Hopf program on a scratchpad copy: `cd <scratchpad>/hhcopy && nice -n 19 timeout 600 python3 code/certify_equilibria_hopf.py`
   exit 0; "38 checks, 0 failed: 17 proof checks, 6 consistency checks, 5 negative controls, 8 self-tests, 2 cross-checks"; "run time 15.0 s".
   `diff` against data/certify_equilibria_hopf.txt, ignoring the run-time line: IDENTICAL.
2. Independent mpmath check (dps 40), own implementation, Hopf points located as zero real part of the eigenvalues:
   "E_l* 10.59892096939167852219887852940657980278"; "uH 5.3458563970045945356 JH(10.613) 9.7754379953931263325"; "uH 21.941907987016173702 JH(10.613) 154.52243366580800086".
3. scipy DOP853 (rtol 1e-12) on the section points from the committed stage 2:
   "section u=20: |P(z)-z|=4.71e-13 T=16.0077128038 multipliers [7.08967831e-02 ...]"; "section u=5: |P(z)-z|=1.47e-13 T=14.3436009481 multipliers [1.03029125e+01 1.96847979e-01 ...]". The multipliers near 1e-9 are finite-difference noise.
4. scipy LSODA below J_H2:
   "J_H2-J=0.40 ratio p2p^2/dJ = 14.344 (predicted 14.29)"; "J_H2-J=0.20 ... 14.315"; "J_H2-J=0.10 ... 13.998" (not converged within 6000 ms).
5. Comparison of the no-ball rerun with the committed output: apart from timing lines, the only differences are the ledger line (144 bounds against 333), the three summary lines on bistability at three values, and the "82 checks passed" line.
6. `pdfinfo`: 24 pages, created 2026-09-27 04:53 UTC. `grep -c '??'` on the pdftotext output: 0.

No background process of mine is left running. The certify_bistability.py and matern_extra.py processes visible in ps belong to other sessions and were not touched. Scratch copies are under the session scratchpad (hhcopy/, hh.txt, rump.txt).

Relevant paths:
- /home/user/GENChase/.claude/worktrees/hh-manuscript/papers/hh-dynamics/paper/hh-dynamics.tex
- /home/user/GENChase/.claude/worktrees/hh-manuscript/papers/hh-dynamics/data/certify_bistability.txt
- /home/user/GENChase/.claude/worktrees/hh-manuscript/papers/hh-dynamics/code/certlib.py
- /home/user/GENChase/.claude/worktrees/hh-manuscript/papers/hh-dynamics/code/hh_lohner.py
- /home/user/GENChase/.claude/worktrees/hh-manuscript/papers/hh-dynamics/code/make_numbers.py

---

## Response (the manuscript's writer, 2026-09-27)

Before anything was applied, every must-fix and should-fix finding of the three reports was put to two further
agents told to refute it. A finding that both could not refute counts as confirmed and is fixed below; a refuted one
is not applied, and the skeptics' reasons are given. The nits were not put to the skeptics; the plainly correct ones
are applied. Numbering in the revised manuscript: Remark 3.1 is new (the range beyond J = 200), the former Remark 3.1
is now Remark 3.2, the former Lemma 4.6 is Lemma 4.5, the cited theorems are lettered (the former Theorem 4.5 is
Theorem H, the former Theorem 5.9 is Theorem K), Lemma 5.9 is new (the consequence of Theorem K that the proofs use),
and Corollary 7 is new (the identification of the stable orbits).

### Must-fix

- **M1. Fixed (confirmed by both skeptics; also found by the computation reading).** Theorem 5(c) now says that the
  section point of Gamma_s is the only fixed point of the first-return map in a box of radius about 1e-15 that
  contains it, and that of Gamma_u in a box of radius about 1e-14 to 2e-14 (the Krawczyk boxes of the proof), and
  that Table 3 gives enclosures of the section points, not boxes of uniqueness. The Table 3 caption says that each
  product of intervals is an outward rounding of the set K of the proof and that uniqueness is proved only in the
  Krawczyk boxes, about 10^2 to 10^4 times narrower. The proof of 5(c) gives the radii of Z at the three values and
  points to `data/identify_stable_orbit.txt`, which prints the Krawczyk boxes of Gamma_s exactly (float64 in hex).
  That the fixed point lies in K now follows from Rump's statement (Theorem K, root in x~ + S(X, x~)) through the new
  Lemma 5.9; see S2.
- **M2. Fixed (confirmed by both skeptics; also found by the claims reading).** The abstract now reads: "There are two
  Hopf points J_H1 < J_H2 in this range: the equilibrium is asymptotically stable for J < J_H1 and for J > J_H2, it
  has exactly two eigenvalues with positive real part for J_H1 < J < J_H2, and no eigenvalue lies on the imaginary
  axis at any current of the range other than J_H1 and J_H2." The Theorem 2 bullet of the introduction and the README
  abstract say the same; the endpoints are not asserted.

### Should-fix

- **S1. Fixed (confirmed by both skeptics).** Section 2.4 now defines the local return map at a point y of a periodic
  orbit of minimal period T, by the implicit function theorem at (T, y), and the nontrivial multipliers through it.
  Lemmas 5.8 (Floquet), 5.12 and 5.13 are stated for the local return map of an analytic vector field on R^d; Lemma
  5.8 now derives DP(y) = Pi M itself, and Step 1 of Lemma 5.12 takes the continuity of the return time from the
  implicit function theorem, not from Lemma 5.6. Lemma 5.6 is restated so that it claims only what the run gives
  (near each point of S_0 the first-hit time agrees on S_0 with an analytic solution of the implicit function
  theorem, because the hit step's window contains exactly one zero), and Lemma 5.7 gains a second statement: if S_0
  contains a neighbourhood of a fixed point y in Sigma, then near y the program's first-return map is the local
  return map at y. The proofs of Theorems 4 and 5 now say why this applies (the fixed point lies in K, inside int Z,
  or in P_E(Z), inside int Z). A skeptic noted a second failure of the old general statement, an orbit that crosses
  Sigma upward twice per period; the local return map avoids it as well.
- **S2. Fixed (confirmed by both skeptics; also found by the claims reading).** Theorem K now states Rump's Theorem
  13.3 as printed (Acta Numer. 19, p. 89): f continuously differentiable on D, x~ + X in D, Jf the interval hull of
  the Jacobians (his eq. (13.3)), conclusion a unique root in x~ + S(X, x~). The new Lemma 5.9 (proved) derives what
  the program uses: with any box enclosing G(z~) and any interval matrix enclosing the Jacobians, K in int(z~ + X)
  gives exactly one zero in z~ + X, and it lies in K; the uniqueness in the whole box is the integral-mean argument
  (the mean of the Jacobians along the segment lies in the hull, whose matrices are nonsingular). The domain is the
  box Z itself, on which P is C^1 by Lemma 5.6.
- **S3. Refuted by both skeptics, and handled anyway through a confirmed finding of the claims reading.** Skeptic 1:
  the novelty sentence is followed by "These statements are limited by the searches behind them ... some relevant
  papers could not be read in full, and they are listed there", Section 10 lists Du and Hassard and limits every
  priority statement to the searches, not only criticality, and the ledger reads "location and recognition problems"
  as local singularity-theory problems, not a global exclusion of crossings over a current range. Skeptic 2: the same,
  and the "What is known" paragraph already claims no priority for the Hopf points or their Lyapunov coefficients.
  The claims reading's must-fix (1), which was confirmed, asked for the crossing item to be qualified or dropped;
  the introduction now claims no priority for Theorem 2 or Corollary 3 at all, and Section 10 says that "the location
  and the criticality of the two Hopf points" may be in Du and Hassard.
- **S4. Fixed (confirmed by both skeptics).** The Sets paragraph of Section 5 now states the invariant: the program
  keeps 0 in r_0 and 0 in r (an initial set has r = 0 and r_0 centred at 0: the half-widths of the box on the section
  and the E_l ball minus its midpoint), the update gives 0 in r' because 0 is in r and in Z - xbar' (xbar' is the
  midpoint of Z), and r_0 is kept; hence xbar lies in S, inside X, and Lemma 5.3 applies with ybar = xbar.
- **S5. Refuted by both skeptics; clarified anyway.** Both: in the proof, "the centres" refers to the centres of the
  Gershgorin discs of M_t, introduced in the preceding sentence ("have the same centres and t times the radii"), which
  are the diagonal entries of S^-1 M S, not the c_i; those centres lie in the D_i by the hypothesis, so the counting
  is right. The sentence now reads "at t = 0 they are the centres of these discs, the diagonal entries of S^-1 M S",
  which costs nothing.
- **S6. Refuted by both skeptics as a correction; its second half was a confirmed finding of the computation reading
  and is done.** Skeptic 1: the proof of Theorem 4 describes the box (centred at a predicted fixed point, radius 3
  times the defect, P_E(Z) in int Z, contraction), which proves the clause as an existence statement; no later
  argument uses the uniqueness clause; and Remark 3.1 disclaimed the identification. Skeptic 2: the same, and "about"
  marks the radius as approximate; a rerun of one piece put the fixed point of Theorem 5(a) well inside the box. The
  identification is now proved: the new program `code/identify_stable_orbit.py` recomputes the stage-4b boxes of the
  four pieces that contain 10.613, E_l* and 10.599, with the function and arguments of stage 4b (its lines for these
  pieces are identical to the committed ones), re-proves P_E(Z) in int Z and the contraction on them, prints their
  centres and radii exactly, and checks that K of Theorem 5(a) lies in their interiors (at most 0.18 box radii from
  the centre), with three negative controls (K tested against the box of a piece that does not contain the value, 10
  box radii away, must fail). New Corollary 7 states Gamma_s = Gamma(E_l) at the three values; Remark 3.2 and Section
  10 say so. The proof of Theorem 4 now says which box defines Gamma(E_l) where two pieces meet (the piece on the
  left; Corollary 7 checks both). The theorem keeps "a box of radius about 4.6e-7 that contains it".

### Minor and nits

- **m1. Fixed.** The beta_h series now reads 1 + e^{(30-u_0)/10} e^{-(u-u_0)/10}, with u_0 defined as the voltage of
  the expansion.
- **m2. Applied as a remark.** New Remark 3.1 (computer-assisted): the checks behind Theorems 1 and 2 give exactly one
  equilibrium for every J in [0, 4089.4815), with u* in (-12, 115), and asymptotic stability for every J in
  (J_H2, 4089.4815) (J_ss >= 4089.4815 for u >= 115 is part A's third check; J_ss' > 0 and the signs of a_1, a_3, a_4
  and D_3 cover all of [-12, 115]). Remark 3.2, Section 8 and Section 10 now speak of J >= 4089.4815 instead of
  J > 200. The theorems stay on [0, 200].
- **m3. Fixed.** Section 9 lists the 11 added checks: five self-tests of the l1 routine, three negative controls (two
  mutated formulas and the factorization test at u_H1 + 1e-3), the E_l* overlap self-test, J_H1 > 8 and the ledger.
- **m4. Fixed.** `code/make_numbers.py` now writes: "Leaving out the run times, the lines of the floating-point Newton
  steps (stage 4) and of the Newton iterations of stage 6, and the count of checks, each of its N remaining lines
  occurs in the committed output, except the 4 that differ because stage 4b was skipped". "Occurs in" says what the
  comparison tests (membership, not order).
- **m5. Fixed.** The trust base now lists absolute values, complex conjugation, comparisons, sqrt, the constant pi and
  FLINT's exact rational Bernoulli numbers (fmpq.bernoulli, used with Lemma 4.4(a)).
- **m6. Fixed.** The cited theorems have their own counter, lettered H (Andronov-Hopf) and K (Krawczyk), so the paper's
  Theorems 1, 2, 4, 5 no longer sit beside Theorems 4.5 and 5.9. (The program's Theorems A, B, C keep their names.)
- **m7. Fixed.** "does not increase with n".
- **m8. Fixed.** New program `code/numerics_h2.py` (numerical only) finds the small cycles at J_H2 - J = 1, 0.5 and
  0.25 by long integration and Newton refinement: nontrivial multipliers of modulus at most 0.987, ratios 14.42,
  14.36, 14.32, and a linear extrapolation through the last two of 14.29, against the proved 14.292859. Section 8 now
  reports this; the old sentence "At J_H2 no periodic orbits were computed" is gone.
- **m9. Fixed.** Section 8 says that stage 6 runs the program's Taylor integrator at 160 bits, with rigorous
  remainders, inside an uncertified Newton iteration on midpoints. The proof of Theorem 5 now says that the program
  carries E_l as a ball E (radius below 1e-28 for 10.613 and 10.599, below 1e-25 for E_l*) and integrates
  {zbar} x E and Z x E.
- **m10. Checked; no change.** The PDF, rendered, shows Table 1 on one line per row and Table 2's exponents in place;
  the wrapping was a pdftotext artefact.

### Commands after the revision (tails)

See `notes/referee-2026-09-27-claims-literature.md`, "Commands after the revision", for the tails of the runs, the
build, `paper-check` and `lint`, which are common to the three responses.
