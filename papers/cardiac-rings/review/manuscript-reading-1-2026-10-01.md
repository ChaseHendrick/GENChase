# Referee report: paper/cardiac-rings.tex (draft of 2026-10-01)

This report comes from a separate in-project agent session that was told to find errors. It is not an outside review.
Line numbers refer to the .tex file. Every number in the theorems and tables was checked against data/*.json with
exact decimal expansions of the stored doubles. The proofs were checked as written in the paper, against
LEMMAS-stability.md, the existence.py and stability.py docstrings, and the review files. No TeX build was possible,
so the LaTeX findings come from reading the source.

## Verdict

I found no error that makes a theorem false. Every period enclosure, multiplier bound, delta, K_e, theta_T, (SC)
ratio, rho_T, theta_c, bhat, q_C, dist_min, Y0, Z1, Z2, r_un, m_max, run time and numerical observation traces to a
record or a review file. Six printed numbers are rounded in the unsafe direction or are labelled "exact" when they
are not (E1 to E4). There is one real inconsistency of wording: the abstract and introduction speak as if parts (i)
and (ii) of Theorem A were about the same orbit, which the paper says it has not proved (E5). The stability half
(Section 5) is complete and correct as written and keeps every review fix. The existence half is correct, but the
Y0/Z1 assembly is not stated precisely enough to check without the code (G1). The bibliography has one wrong title,
and the related-work section leaves out several precedents that the project's own notes and ledger list (C1 to C4).
Under the current AGENTS.md wording, two sentences saying "nobody outside the project has reviewed it" should not be
in the draft (A1).

## ERROR

**E1 (lines 112, 551). CAPD bounds printed below the stored doubles.** The record stores q_upper =
0x1.ff4df088d18aap-1 = 0.99864150686405150914..., but the paper says the multipliers have modulus "at most
0.9986415068640515", which is about 9e-20 below the bound actually proved. Likewise "max_b(...) <= 0.9986425883346934",
where the stored double is 0.99864258833469343734... These are the shortest repr strings, not upper bounds.
Fix: print 0.99864150686405151 and 0.99864258833469344, or the hex values. The rounded "< 0.998642" is fine.

**E2 (line 115). delta for N = 1 is called "an exact dyadic number" but the printed decimal is not.** The record has
delta_exact = 23058430092137/2^59 = 4.00000000000001049160758...e-5. The printed 4.0000000000000105e-5 is larger, so
the statement as printed (modulus < e^{-delta T}) is slightly stronger than what was proved. Fix: write
"delta = 23058430092137/2^59 = 4.000000000000010491...e-5", in the same form as Theorem B(c). On line 127, "="
before the 25-digit decimal of 5764607523035/2^60 should be "≈" (the exact value is
5.0000000000006636358129696873...e-6), and the same applies to r_un on line 125 (the exact double is
9.99999999999999979886647629...e-13, so the printed ...6477 is rounded up).

**E3 (Table 1, lines 140 and 143). r_ex is "rounded up here", but two entries are rounded down.** N = 8: the record
has 1.643907057...e-28, printed 1.6439 (rounded up it is 1.6440). N = 64: the record has 1.640705824...e-28, printed
1.6407 (should be 1.6408). The N = 1, 16 and 32 entries are correct. Fix: 1.6440 and 1.6408.

**E4 (line 302). "|abar_{1,V}| >= 0.11525" is false.** The record lower bound is 0.11524721316635894, which is below
0.11525. Fix: ">= 0.11524".

**E5 (abstract line 51, introduction line 68, README). The text implies that the two cell theorems describe the same
orbit.** The abstract says the Fourier proof "bounds the same multipliers by 0.99785888", and line 68 says Theorem A
"is proved twice". Line 120 and Remark 3.1 say correctly that the identity of the two orbits is not proved. Fix:
"bounds the 17 nontrivial multipliers of its orbit by ..." and "Theorem A has two parts, proved independently ... (we
have not proved that they describe the same orbit)". Also add this to the Limitations section, which does not list
it now. The README abstract repeats "the same multipliers" and needs the same change. Optional and cheap: evaluate
phi_abar(0) in Arb (it is within r_ex of phi_*(0)), map it into the CAPD frame coordinates and test membership in the
CAPD box. CAPD's uniqueness would then identify the two orbits.

**E6 (line 512). The comparison of epsilon at the two radii mixes coordinate systems.** "‖epsilon‖ would be about
4e-5 with r_un" is the referee's estimate in the Stage E scaled variables (LEMMAS-stability.md, section 4.1). The
1.2e-12 it is compared with is the record's eps_1norm_S, which is in the cell coordinates S. Since epsilon is
linear in r, the S-coordinate value at r_un would be about 1.2e-12 x (1e-12 / 1.64e-28), roughly 7e3. The argument
for r_ex becomes stronger, but the sentence as written is wrong. Fix: give both values in S coordinates, or both in
scaled variables.

## GAP

**G1 (Section 4.5, lines 260 to 266). The Y0/Z1 assembly cannot be checked without the code.** (QUALITY item 1(c)
asks for a decision on this point. My decision is that it is not yet complete enough.)
(a) "Adding finite-row and tail-row bounds per output and input component gives Z1" does not say how the finite-row
contributions of finite columns and of tail columns combine. The program takes, for each (c, c'),
max(sup over finite columns, sup over tail columns) + T_{cc'} (existence.py docstring, section 5). Write this
formula out, together with Z1 = max_c sum_{c'} (...), and say how the omega column and the phase row enter.
(b) C_n for |n| <= 12 is "formed explicitly for K < m <= m_max", but the paper does not say how m > m_max is
handled for those n (by |A_m||J'_n| <= (S_G/Y)|J'_n|). State it.
(c) Y0: say that for K < |m| <= K' the computed A_m are used (m_max = 391 > K' = 80), and give the closed-form tail
sum with Abar0 S_g as an explicit expression.
(d) Section 4.2 says "define F on X", but F_m contains i omega m a_m, so F maps X into a weaker space (weights
nu^{|m|}/|m|). Then A must be defined, and injective, on that space. Name the codomain. Lemma 4.5's "A injective"
is meant on that space.

**G2 (Lemma 5.13, the window entries of (C3); stability.py docstring step 2). Enclosures of A_n for |n| > n_A are not
defined in the paper.** At N = 64 the window needs A_n up to |n| = 2K_e = 96, and b_m needs |n| up to
2K_e + n_c = 120, but n_A = K' = 80. The program uses the entrywise tail form
ball(0, S_J e^{-rho|n|} + eps e^{-rho_e|n|}). The paper's (C0) and Lemma 5.13 speak only of "[A_n] for |n| <= n_A",
and "bounded from the entrywise enclosures" (line 463) has no meaning past n_A. Fix: one sentence after line 512 that
states the entrywise tail enclosure and that it holds for every n by Lemma 5.16 and the strip bound. The n_c >= n_A
fix from the lemma review is correctly replaced by "the tail form holds for every n" (line 463), and that is sound.

**G3 (Section 6, line 551, and Theorem A(i)). Orbital asymptotic stability from the CAPD contraction is asserted
without an argument.** Refer to the proof of Theorem 5.17(iii), which applies with the CAPD section and Q = I, or
give the standard two-line argument. Also state that the eigenvalues of Dg are the nontrivial multipliers by
Corollary 5.6 with N = 1. Also state what makes x = xhat + A(0, y) a parametrization of the section: xhat_V = s
exactly (0.8 in scaled variables, which the record's section_level_hex confirms), and columns 2 to 18 of A have zero
V-component. Theorem A(i) promises "an explicit ball", but the paper never gives it. Point to the record's radii and
frame hash.

**G4 (proof of Theorem 5.17(iii), line 528). P maps N_c into itself only if N_c is a ball.** A convex
neighbourhood with ‖DP‖_* <= kappa does not give P(N_c) ⊂ N_c. Take N_c = {z in Sigma : |z - x*|_* <= epsilon}.
On line 530, choose s with |x^0 - x(s)| = dist(x^0, O) (it exists by compactness); the final bound needs this, but
the text says only "small". Line 528 "0 < eta <= kappa' - (spectral radius)" should be typeset as one formula, and
eta here clashes with eta_tail of Lemma 5.10.

**G5 (Section 8, line 575, against review/fix-second-reading-2026-10-01.md lines 11 and 45). The reproducibility
statements disagree.** The second reading says "The Stage E rerun reproduced Y0, Z1, Z2, r_existence, r_uniqueness
and T exactly" at every N. The paper's own rerun (notes/rerun-2026-10-01.md) found that the binary values of Y0, Z1,
Z2 and r_ex differ, and guesses that unpinned BLAS threads in existence.py are the cause. A referee will ask which
statement is true. Fix: pin BLAS threads in existence.py as stability.py does, or explain the difference (another
machine or another numpy?), and state in the paper which r_ex the Stage S records consumed (they hash the stored
Stage E record, so the stored value is the one that counts).

**G6 (Limitations, line 582 onward).** Add the unproved "same orbit" point (E5). The list of "Sources known
incompletely" is partial. GSS 1988 is known from its table of contents only. Castelli-Lessard, Rucklidge-Silber and
de Wolff are known from abstracts. Johnson-Zumbrun was read at its first page. The Kugler et al. and Erhardt-Solem
papers are known from abstracts. Figueras et al. and Courtemanche et al. are known from metadata. Ermentrout 1992 was
read at pp. 1674-1677 only (ledger line 2209). As written, the list implies that these were read. Either complete
the list or say that the reading status of every background source is in the ledger and notes.

## CITATION

**C1 (line 645). Wrong title.** Crossref (doi:10.1088/0951-7715/11/5/015) gives Rucklidge and Silber, "Bifurcations
of periodic orbits with spatio-temporal symmetries", not "Instabilities of ...". The project notes carry the same
wrong title and should be corrected too.

**C2 (lines 60, 637, 639). Kugler.** Crossref spells the name Kügler, and the 2017 author order is Kügler, Bulelzai,
Erhardt. "Kugler, Erhardt and Bulelzai related ..." gives the wrong order for keb2017. Use "Kügler et al." and
{\"u} in the bibliography.

**C3 (Related work, line 70 to 72). Precedents in the project's own ledger and notes that are not cited.**
- Arioli and Koch, Nonlinear Anal. 113 (2015) 51-70: a computer-assisted existence and stability proof for the
  FitzHugh-Nagumo pulse (ledger lines 1870 and 2210). Line 72 cites only Czechowski-Zgliczynski "without stability"
  for FitzHugh-Nagumo, which leaves out the one computer-assisted FHN stability result.
- Kapela and Zgliczynski, simple choreographies (arXiv math/0304404; ledger line 2211): a computer-assisted proof of
  periodic solutions with the same T/N cyclic-shift symmetry x_{j+1}(t) = x_j(t + T/N). This is the nearest
  computer-assisted precedent for a discrete-wave symmetry and should be cited next to the novelty sentence.
- Kuehn and Queirolo, arXiv:2202.05073: computer-assisted periodic orbits in recurrent neural networks.
- Church, Dai, Henot, Lappicy and Vassena, SIADS 25 (2026), doi:10.1137/25M1748275: computer-assisted families of
  stable periodic orbits (notes Q2; how they prove stability is not verified). Without it, line 70 ("the exclusion
  and counting step ... is what a stability proof needs in addition") reads as if no computer-assisted stability
  proof for a periodic orbit in the Fourier/radii-polynomial setting existed.
- Castelli-Lessard 2013 compute R in Phi(t) = Q(t)e^{Rt}, which gives all Floquet exponents of an ODE orbit and so
  could decide stability. The present wording ("computed the Floquet normal form") is accurate, but the framing of
  line 70 should allow for it.
- Optional: Barker-Zumbrun 2016 and Beck-Jaquette (arXiv:2105.06895) for validated spectral stability, and
  Hupkes-Sandstede for analytical lattice-pulse stability.
- Novelty (line 74): the wording "found no earlier computer-assisted proof ... in the logged searches" is within the
  ledger (lines 2212 to 2213), and Q2 of the prior-article note supports "ring of coupled ODE cells". Given the
  choreographies, I recommend "a ring of diffusively coupled cells" and a citation of Kapela-Zgliczynski in the same
  paragraph.

**C4 (line 587). Ashwin-Swift (1992) and Hoppensteadt-Izhikevich (1997) are named without bibliography entries.**
Cite them or drop the names.

The remaining attributions were checked against the notes and are correct:
- Gameiro-Lessard Sec. 1 quotation and Sec. 7 method.
- Bayer-Leine Theorem 4 with b > ln 2 and pseudospectra in floating point.
- Johnson-Zumbrun, stated as background only, with the correct caveat.
- Di Marco et al. as unstable and metastable, with the snippet disclaimer.
- Erhardt 2025 Table 2, Hopf at 0.027907858929580, supercritical, stable cycles.
- The Erhardt-Solem arXiv identity.
- GSS Ch. XVIII Sec. 4 (verified in the readings note).
- Paullet-Ermentrout (abstract only, as stated).
- Ermentrout 1992 Theorem 3.1.
- Courtemanche-Glass-Keener.
- Kato, stated as unconfirmed.

Every other bibliography entry I checked on Crossref has the correct volume, pages and year: Arioli-Koch 2020,
Bayer-Leine, Gameiro-Lessard, Di Marco, Czechowski-Zgliczynski, CAPD, Arb, Ermentrout, Paullet-Ermentrout,
Church-Lessard, Castelli-Lessard, FGLdlL, de Wolff, Erhardt 2025, Erhardt-Solem x2, GS1985, Johnson-Zumbrun,
Pecora-Carroll, TP06 and PLoS 2018. Line 317 says the theorem numbers of Kato have not been checked, while line 585
says "theorem and section numbers". Make the two agree.

## AGENTS.md compliance

**A1 (lines 76 and 588; README line "Not peer reviewed, and not reviewed by anyone outside the project").**
AGENTS.md (owner's decision of 2026-09-26) says: "for now, these drafts carry no label saying that nobody outside the
project has reviewed them; their quality records and review files still state what was and was not checked, and no
text may claim an outside review that has not taken place." The sentences "nobody outside the project has reviewed
it" (line 76) and "Nobody outside the project has reviewed any of this work" (line 588) are such labels. Recommend
keeping the factual description of the in-project checks (who read what, by separate AI agent sessions) and moving
the "nobody outside" sentence to notes/QUALITY.md and review/README.md, or asking the owner. No sentence claims an
outside review, so that rule is met.

Also checked against AGENTS.md:
- No em dashes; "--" is used only for en-dashes in name pairs.
- Author: Chase Hendrick, the same address block as the other manuscripts.
- No "first" claim; "Novelty" stays within the ledger.
- Model naming: "Erhardt's 18-state modification ... rather than 'the TP06 cell'", and the title says "Modified". The
  keyword "ten Tusscher--Panfilov model" is acceptable, but "modified ten Tusscher--Panfilov model" would be safer.
- Labels: Section 7 is numerical and unused, and the Hopf identification is labelled numerical.
- Classical credit for equivariant Hopf theory and Andronov-Witt.

## EXPOSITION

- **X1. Undefined terms.** "Stage E" (Section 5.6 title, lines 500 and 537), "Stage S" and "route A" (line 540;
  Lemma 5.10 has no routes in the paper) are never defined. "Synchronous" (Theorem B(b)) is used without a
  definition (all x_j equal). Define them, or replace them with "the existence program of Section 4" and so on.
- **X2. Notation clashes.**
  - Sigma = diag(2^{e_i}) of Section 2.1 and S = diag(2^{e_1..e_18}) of Section 5.5 use the same symbols e_i for
    different exponents (scales.txt against the record's S_exponents [0, -4, 0, -9, ...]).
  - \mathcal T is both the Newton map (line 224) and the tail matrix of Z1 (line 266).
  - F_m is both the profile residual (eq. F) and V^{-1}H_WW V - Lambda (line 417).
  - Y is the fundamental matrix, the bound Y_0, the boxes Y_B, and omegabar(m_max+1) in Lemma 4.6.
  - G is G_lambda(M), G in Theorem 5.3, and G = G_0/Y.
  - W is the window, W = G_lambda(M_tau) and W_k(r), W_m.
  - S_0 is the CAPD section and the Jordan basis.
  - N_0, N_1 and N_c clash with the ring size N.
  - s is the section level, the homotopy parameter and s_j.
  - E is the voltage projection, E_k and \hat E.
  - delta_{kV} clashes with the rate delta.
  - A is the Newton operator, A(theta) and the CAPD frame.
  - c is the coupling, c_k, c_alpha and the component index c.
  At least separate the Section 5 scaling exponents, the two \mathcal T, the two F_m and the two Y.
- **X3 (Proposition 4.4, line 205).** "E_k[-1,1](1+i)" is the diagonal segment {t(1+i)}, not the square that the proof
  (and fourier_eval.py, Q = acb([-1,1],[-1,1])) uses. Write E_k([-1,1] + i[-1,1]).
- **X4 (Theorem B(a), lines 125, 113).** phi_* is in physical units (phi_{*,V}(0) = s), but "the Fourier coefficients
  of phi_*" are meant in scaled variables. Write Sigma^{-1}phi_*.
- **X5 (line 87).** "C_m = 1" against "C_m = 185 pF": give units for both (the factor 5.405 = 1/0.185 implies 1 uF
  against 0.185 uF).
- **X6 (line 82).** The model file SHA-256 is truncated ("a50f6c08...25670"). Give the full hash,
  a50f6c08b4360dd257cce389a39ae72fda51e3642641bf5b8e5fced6c2225670 (model/tp06_18d.py line 5).
- **X7 (line 496).** "if Omega contained ±i omega N, (C5) could not pass" is imprecise, because (C5) counts the float
  lambda_j. Say "the certificate could not pass (by Theorem 5.15 the count would be at least 2)".
- **X8 (line 443).** "has a bounded inverse mu - D_T" should read "mu - D_T has a bounded inverse".
- **X9.** Process history in the mathematical text (Remark 5.5 "An early draft ... was corrected", line 315 toy model,
  line 575 rerun detail) would normally go to a supplement or the notes. This is the author's choice.
- **X10.** In line 537, "alpha^up ≈ 17.85" is the N = 8 value; at N = 64 it is 18.10. R_0 = 32 holds for all N. Say
  "17.85 to 18.10".
- **X11.** Theorem A(ii) cites "the sense of Theorem B(a)", which is stated only for N in {8, ..., 64}. Say "with
  N = 1".

## TYPO / LaTeX

- **T1 (line 82).** \file{bifurcation analysis/...} is a url-type command, and url drops spaces, so it prints
  "bifurcationanalysis/". Use \PassOptionsToPackage{obeyspaces}{url} before xurl, or \texttt{bifurcation\
  analysis/TP06\_18d\_endo\_bif.m}.
- **T2 (Table 1, line 137).** The header "lower end of the enclosure of T (ms; the upper end adds one unit in the last
  digit)" sits in an l column with 25-digit entries and will overflow the 6.5in text width. Move the parenthesis to
  the caption, or use p{} or tabularx. Table 2 is close to the limit as well.
- **T3.** No undefined \ref, \eqref or \cite. Every environment is balanced (26 proofs, 18 lemmas, 3 thmx, 2
  theorem, ...). Macros \re, \im, \spec, \one, \file, \Lop, \Dsp and \Xsp are all defined. Labels defined but never
  referenced (harmless): eq:H0, eq:damping, lem:Z2, lem:coeffs, rem:halfopen and most sec:*.

## What I checked and found correct

- **Theorem A(i).** The period decimal ends are correct outward roundings of 0x1.acaf249c533cfp+5 and
  0x1.acaf24ea88f37p+5. Also correct: 17 = the sum of the 14 block sizes; order 30 at 128 bits and order 20; 732 s.
  The section level 0x1.999999999999ap-1 equals exactly 4 times the double nearest 0.2 (s/sigma_V). The Fourier
  period lies inside the CAPD period. The first-return argument for the minimal period is valid.
- **Theorem A(ii) and Table 2.** delta, e^{-delta T} <= 0.99785887471237484938..., the abstract's 0.99785888, and the
  leading exponent -4.71382e-5 are consistent with the float multiplier 0.997477 in numerics-hopf-orbit.json.
- **Table 1.** Every period lower end matches the records exactly, the upper ends equal the lower ends plus one ulp,
  the widths are 1e-26, and the Z1 values are correctly rounded. The N = 8 example has Y0 = 1.3096e-28,
  Z2 = 6.4001e10, contraction 0.267, and m_max = 391. Z1 + Z2 r_un = 0.267 and p(r_un) = -7.65e-13 recompute from
  the record. r_ex sits just above Y0/(1 - Z1).
- **Table 2 and line 540.** All five full-period and reduced-map bounds match the records digit for digit. Also
  matching: K_e = floor(N/2) + 16 (16, 20, 24, 32, 48); theta_T; the worst (SC) ratios; rho_T 3.578; theta_c 0.0787;
  bhat 0.856; q_C 2.6e-14; dist_min 1.32e-6; the eigenvalue in Omega 3.3e-16 - 3.9e-15i; and count 1. Geometry:
  b = -a = omegabar(N/2 + 1/4) satisfies all of (C1). The run times (26, 48, 80, 184, 479 s) and the 3.6 GB peak
  memory match.
- **Section 7.** The leading exponents of all five N, the sharpness pair (6.32095e-6 certified with ratio 0.398;
  6.321e-6 fails with count 3) and the negative controls (counts 9 and 127 columns) match the stageS review log. The
  Hopf numerics (0.0279078439 against 0.0279078589, 5e-7; frequency 3e-7) and the V range 0.14 to 0.26 mV match.
  The period differences and their ratios (3.92 and 3.98) are correct. Remark 3.1's intervals and the containment of
  the N = 1, 8, 16 periods match docs/CARDIAC-HANDOFF-2026-09-30.md.
- **Proofs found complete and correct as written.**
  - Section 4: Lemmas 4.1 to 4.3 and Proposition 4.4 (apart from X3).
  - Lemma 4.5 (radii polynomial).
  - Lemma 4.6: the Neumann tail; the row-sum argument for G^k is right.
  - Lemma 4.7 and the W_k(r) formula: I verified the second-derivative sum P[(sum s)^2 + sum s^2].
  - The Z2 assembly.
  - Lemma 4.8: the conjugation argument, realness via uniqueness at r_un, minimal period from a_{*,1,V} ≠ 0,
    nonsynchrony, and the 1-wave exclusion. The Z1 tail-row identity (By)_m = sum_n A_m J'_n y_{m-n} was rederived.
  - Section 5: Lemma 5.1. Lemma 5.2. Theorem 5.3, both directions: the injectivity argument with the polynomial in n
    and the construction of p_w, including p_w(2 pi j/N) = w_j. Corollary 5.4, (i) to (iv); I verified the shift
    similarity for (iv). Remark 5.5 (log of negative reals on omega N/2 + omega N Z). Corollary 5.6 (block triangular
    form). Lemma 5.7. Lemmas 5.8 and 5.9. Lemma 5.10 (the half-strip estimate for m < 0 by conjugation). Lemma 5.11.
    Lemma 5.12 (the Schur complement, the column bounds r_j and bhat, and s <= 1). Lemma 5.13 (the far bound
    G_tail(|m| - K_e)/2, decreasing). Lemma 5.14. Theorem 5.15: every edge case of the strip translation (Re = -delta
    and Im = a are excluded because Gamma is in the resolvent set). Lemma 5.16: the epsilon majorant formula was
    rederived, and the limit rho'' -> 1/4 is handled. Theorem 5.17(i) and (ii), and (iii) apart from G4. The
    Gronwall and phase bookkeeping on [0, t_1] is correct.
- **Review fixes carried into the paper.**
  - Half-open strip: Corollary 5.4(ii) and Remark 5.5.
  - Route A with weighted coordinates S: the S coordinates are used throughout Section 5.5, and the record's route
    is A.
  - r = r_existence in Lemma 5.16: stated and justified (apart from E6).
  - t_j < R_j asserted.
  - Far bound valid because the tail form holds for every n, which replaces n_c >= n_A.
  - The sup over m in (SG): (SG) is not used, and SG_also_holds = false in every record.
  - The C = I - Vi V route: Lemma 5.14 and (C3).
  - Contour orientation stated, rho_T on the neighbourhood N_eta, and the expanded [0, t_1] bound (M2, M4, M6).
- **"Same orbit".** It is stated as not proved at line 120 and in Remark 3.1 (but see E5).
- **Reproducibility.** The 90-hash check is reported. The record status strings ("awaiting adversarial review") are
  explained by fourier-review-status.json.
