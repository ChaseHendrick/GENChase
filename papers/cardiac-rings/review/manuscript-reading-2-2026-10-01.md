# Second reading: paper/cardiac-rings.tex (revised draft of 2026-10-01)

This reading was done by a separate in-project agent session that was told to find errors. It is not an outside
review. Line numbers refer to the .tex file. No TeX build was possible, so I read the source. I concentrated on the
passages revised after reading 1: Sections 4.2, 4.4, 4.5, 5.5, the proof of Theorem 5.17(iii), Section 6, Lemma 6.1,
Theorem A(iii), the numbers changed by fixes E1 to E6, and the new citations. I also reran the link program.

## Verdict in brief

I found no error that makes a theorem false, and the link of the two cell proofs (Lemma 6.1, `link_cell.py`) is
sound. I found two wrong numbers in theorem statements. The first is the decimal approximation of delta for N = 1,
which the E2 fix introduced (R1). The second is the claimed period width of 10^-26 ms, which reading 1 missed and
which is false both for the certified binary interval and for the printed decimal interval (R2). There is one
citation update (Kuehn-Queirolo has been published) and a few small gaps and points of wording. Once R1 and R2 are
fixed, and preferably the GAP items, QUALITY item 6 can be checked (see the end of this report).

## ERROR

**R1 (line 115, Theorem A(ii)). The decimal value of delta is wrong.** The text reads
"delta = 23058430092137/2^59 ≈ 4.00000000000000010492 × 10^-5". The exact value is
23058430092137/2^59 = 4.0000000000000104916075827... × 10^-5, which is 4 × 10^-5 × (1 + 2.6 × 10^-15).
The printed decimal has two extra zeros: it equals 4 × 10^-5 + 1.05 × 10^-21, and it is 1.04 × 10^-19 below the true
value. The record (`fourier-stability-N1.json`, `delta.dec` = 0.00004000000000000010491607583) and the rerun note
agree with the exact fraction, so the decimal was miscounted when E2 was fixed. The exact fraction governs, so no
claim becomes false, but a theorem statement prints a wrong number. Fix: write "≈ 4.0000000000000104916 × 10^-5".
(The ring value 5.0000000000006636358 × 10^-6 on line 127 is correct, and so is r_un ≈ 9.9999999999999997989 ×
10^-13 on line 125.)

**R2 (abstract line 51, twice; Theorem B(b) line 126; Table 1 caption line 146 ("of width 10^-26" is implied by
line 126); README lines 20 and 24). "An interval of width 10^-26 ms" is false.** The certified binary period intervals
in `data/fourier-existence-N*.json` have widths of 1.56e-25 (N = 1), 1.50e-25 (8), 1.50e-25 (16), 1.50e-25 (32) and
1.50e-25 (64) ms. This is consistent with 2 r_ex ≈ 3.3e-28 in omega times dT/domega = 2 pi/omega^2 ≈ 457. The
printed decimal intervals (Theorem A(ii), Table 1) have 23 decimals, so they have width 10^-23. Neither is
10^-26. Reading 1 reported "the widths are 1e-26", which is also wrong. Fix: "an interval of width less than
2 × 10^-25 ms" (abstract, Theorem B(b), README). In Table 1 and Theorem A(ii), say that the printed decimal ends are
23-decimal outward roundings of binary ends 1.5 × 10^-25 apart.

## GAP

**R3 (Section 6, line 555, "The period is the return time: the first return time of a periodic orbit to a section
through it is its minimal period").** As a general statement this is false: a periodic orbit can cross a section in
the same direction several times per period. Here it is true because g(x_c) = x_c. The first return time t_1 of x_c
is then a period, so T_min ≤ t_1. At time T_min the orbit is back at x_c, crossing upward, so t_1 ≤ T_min. Fix: "Since
g(x_c) = x_c, the first return time t_1 of x_c is a period, and since the orbit is back at x_c ∈ Σ_s at its minimal
period, t_1 is the minimal period."

**R4 (Section 6, line 555, stability by the proof of Theorem 5.17(iii)).** That proof needs every solution that
starts near O to reach the contraction ball, so x_c must lie in the relative interior of B in Σ_s. This holds. The
record gives max_b(||G(0)_b||/rho_b + row sum) ≤ 0.99864258833469344 < 1, so G maps the unit ball into the ball of
radius 0.9987, and x_c = G(y_c) lies in that ball. The text does not say so. Add one clause: "x_c lies in the
relative interior of B, since G maps {||y|| ≤ 1} into {||y|| ≤ 0.99865}".

**R5 (Lemma 6.1 and Theorem A(iii); line 120). The dependence on the two translations is stated in a misleading
way.** Line 120 and the Limitations entry present "the CAPD field and the Arb field are the same function" as an
extra hypothesis of (iii). In fact (i) and (ii) are each stated for Erhardt's `fun_eval` with exact decimals, so each
already assumes that its own translation is faithful. If both are faithful, they are the same function, and (iii)
needs nothing more. What (iii) adds is that a single fault in either translation would also break the link. Suggest:
"Each of (i) and (ii) assumes that its program evaluates Erhardt's function; (iii) uses both assumptions together.
The two programs were compared at 104 points, not proved equal." Also state the dependence inside Lemma 6.1's proof,
at the step "Each g^k(p) is a point of the flow line through p". There g is the CAPD flow and the orbit is an orbit
of the Arb field.

**R6 (Section 4.2, line 216 and line 220). The domain of F.** "define F: X → X'" claims that F is defined on all of
X, but g(a) = f ∘ phi_a exists only where phi_a maps the strip into U. Lemma 4.3 asks only that Psi be defined on
B_{r*}(xbar), which Section 4.6 supplies, so nothing breaks. Fix: "on the open set of x for which ...", or "on
B_{r*}(xbar)". Also give the norm of X' (presumably max(|.|, max_k ||.||')).

## CITATION

**R7 (line 660, kq2022). Kuehn and Queirolo is published.** Crossref gives C. Kuehn and E. Queirolo, "Computer
validation of neural network dynamics: A first case study", Discrete Contin. Dyn. Syst. Ser. B 30(6) (2025)
2073-2093, doi:10.3934/dcdsb.2024145. The arXiv abstract (2202.05073) says that they prove by computer assistance
several hundred Hopf bifurcation points of recurrent neural networks, their non-degeneracy, and hence the existence
of several hundred periodic orbits. The description on line 70 ("proved Hopf bifurcation points and periodic orbits
of recurrent neural networks by computer") matches. Fix: cite the journal version, with the arXiv number kept
optionally.

**R8 (line 648, hi1997).** Crossref confirms the title, the authors, the series (Applied Mathematical Sciences),
Springer New York, 1997 and doi:10.1007/978-1-4612-1828-9. The series volume number (126) is missing; add it.

**R9 (lines 72 and 599). The reading status is reported inconsistently.**
- Line 72 says of Arioli-Koch 2015 "we have not read that paper". Line 599 lists it under "Known from abstracts",
  with "(the 2015 paper from Czechowski and Zgliczyński's account)". Crossref has no abstract for it. Say "known
  from its title and Czechowski and Zgliczyński's account" in both places.
- Line 72 says Ashwin-Swift and Hoppensteadt-Izhikevich were "not read in full", which suggests a partial reading.
  Line 599 lists both as "known from metadata". Make them agree: "known from metadata" on line 72 too.
- Line 599 lists ten Tusscher-Panfilov under "metadata or a table of contents" but annotates it "(abstract)".

Checked and correct (Crossref, plus arXiv for the two preprints):
- Arioli-Koch 2015: Nonlinear Anal. 113 (2015) 51-70, doi:10.1016/j.na.2014.09.023, title "Existence and stability
  of traveling pulse solutions of the FitzHugh-Nagumo equation". The description matches the title. The method
  claim is attributed to Czechowski-Zgliczyński, which is appropriate.
- Kapela-Zgliczyński 2003: Nonlinearity 16 (2003) 1899-1918, doi:10.1088/0951-7715/16/6/302, title as cited. The
  remark on the cyclic-shift symmetry of a choreography is the standard definition.
- Church, Dai, Hénot, Lappicy, Vassena: SIAM J. Appl. Dyn. Syst. 25 (2026) 1697-1725, doi:10.1137/25M1748275,
  arXiv:2504.03058, title as cited. I read the abstract (Crossref and arXiv). It describes a Newton-like fixed-point
  operator whose contraction is checked in interval arithmetic, applied to global families of stable periodic
  orbits delimited by transcritical bifurcations. It does not say how stability is certified, so the paper's
  parenthesis on line 70 is accurate.
- Ashwin-Swift: J. Nonlinear Sci. 2 (1992) 69-108, doi:10.1007/BF02429852, title as cited.
- Rucklidge-Silber: the title is now correct ("Bifurcations of periodic orbits with spatio-temporal symmetries",
  Nonlinearity 11 (1998) 1435-1455).

## EXPOSITION

- **X-a (line 248).** "enclosed by Arb inversion of a point matrix": for N ≥ 8 the matrix contains the ball d_m
  (`arbmodel.damping` uses `sin_pi_fmpq`, which is not exact). The enclosure is still rigorous, because Arb's
  inverse of a ball matrix contains the inverse of every member. Say "of a ball matrix whose only non-exact entries
  are the narrow balls of d_m (exact for N = 1)".
- **X-b (line 245).** The step from ||I - A_fin J_fin|| < 1 to Z1 uses that the coordinate projection onto the
  finite modes has norm 1 in X. Add those four words. The docstring has them.
- **X-c (line 268).** "the phase row and the omega output row have no tail part" mixes the rows of DF (the phase
  row) with the rows of B = I - A DF (omega and the components). Say "the omega row of B and the phase column of
  A_fin".
- **X-d (Lemma 6.1, lines 558 and 562; Theorem A(iii)).** The orbit is written "{phi_*(theta)}" (physical
  variables), but x_c and B are in scaled variables. Write {Σ^{-1}phi_*(theta)}. Separately, Σ is used for the scale
  matrix, the section Σ_s, the hyperplane of Theorem 5.17(iii), Corollary 5.6's hypersurface and the strip Σ_ρ, all
  close together in Section 6. At least rename Σ_s, or the scale matrix, in Section 6.
- **X-e (abstract line 51).** "lies in the ball in which the first proof shows its fixed point unique, so the two
  proofs are about the same orbit". Uniqueness alone does not give this. The argument uses g(B) ⊂ B and contraction,
  so that g^k(p) → x_c. Say "in the ball that the first proof shows the return map to contract".
- **X-f (Lemma 6.1, optional).** The lemma proves that x_c lies on O_F, which is what "same orbit" needs. A reader
  may ask whether x_c = p. That would need an argument that O_F meets Σ_s ∩ B only once. It is not needed, and the
  statement correctly does not claim it. Also say that the crossing direction of p plays no role, because CAPD
  defines g on all of B and only "g^k(p) lies on the flow line of p" is used.
- **X-g (line 539).** "alpha^up, which lies between 17.85 and 18.11 for the five values of N": the records give
  17.847 (N = 1), 17.851, 17.866, 17.913 and 18.104. Write "between 17.84 and 18.11".
- **X-h (line 606).** "the multipliers are within 3 × 10^-4 of the unit circle": 1 - e^{-6.32e-6 × 53.588} =
  3.39 × 10^-4. Write "about 3.4 × 10^-4".
- **X-i (line 304).** "Z2 = 6.4001 × 10^10" is the upper bound 64001393355.9 rounded down. Use "≈" or 6.4002.
- **X-j (link_cell.py).** The program takes pbar = Re a_0 + 2 Σ Re a_m and ignores Im a_0. That is correct for the
  stored centre (Im a_0 = 0x0p0 in every component), but an assertion would make the program self-contained.
  Optional.

## TYPO

None beyond the numbers above.

## What I checked and found correct

**Link (Lemma 6.1, Theorem A(iii), `link_cell.py`, `data/link_cell.txt`).**
- `timeout 300 python3 fourier/link_cell.py` in the study folder exits 0 in 0.2 s, and its output is
  byte-identical to `data/link_cell.txt`.
- The paper copy `code/fourier/link_cell.py` is identical to the research copy. The research `results/` records
  equal the paper's `data/` copies.
- The worst ratio is 0.1396 (block 7), and the negative control (radii / 10) fails in 2 blocks, as stated.
- Section level: `verify.cpp` sets level = 0.2 / scaleOf(0) = 4 × double(0.2) and refuses x̂ unless x̂_V equals it
  exactly. The frame stores "0.8", which parses to the same double. `existence.py` uses
  level_exact = arb(0.2) × 2^2, asserted exact. So p_V = s/σ_V = x̂_V exactly, and p ∈ Σ_s by the phase condition.
- The scale exponents are identical in `model/tp06_capd.hpp` (SCALE_EXP) and `arbmodel.py` (read from
  `model/scales.txt`), so both proofs use the same z.
- Frame parsing: `verify.cpp` reads x̂, A_t and the radii with `operator>>` into doubles, and the CAPD set is
  C1Rect2Set(x̂, A, r) with A = [[1,0],[0,A_t]] built from those exact doubles. The tokens are shortest-repr
  decimals, so Python float() gives the same doubles. The link reads the hashed frame and checks the radii and block
  sizes against the record.
- Arithmetic: A_t^{-1} by exact Gauss-Jordan over Fraction. y^c is exact. |y_k - y^c_k| ≤ r_ex Σ_j |(A_t^{-1})_{kj}|
  follows from |p_k - pbar_k| ≤ Σ_m |Δa_{k,m}| ≤ ||Δa_k||_ν ≤ r_ex (θ = 0, ν ≥ 1, weights 1: `eta` = null in the
  record). The V component does not enter. Blocks are consecutive in the verifier's order, and the triangle inequality
  is applied per block. sqrt_up is a strict upper bound (r^2 > n//d + 1 > x s^2). The test is strict (< ρ_b) and
  checks the Euclidean ball, which is what B is (the box run only needs to contain it).
- pbar = a_0 + 2 Re Σ_{m=1}^{K} a_m matches the centre format (a[i][m] = [re, im], m = 0..32). The centre file is
  the one whose SHA-256 the Fourier record stores, and the frame file is the one the CAPD record stores.
- Logic: p ∈ B. CAPD proves G(B) ⊂ B with contraction constant q < 1, so g^k(p) ∈ B and g^k(p) → x_c. Each g^k(p)
  lies on the flow line of p, which is the compact set O_F (granted that the two fields agree, see R5). Hence
  x_c ∈ O_F, and the two orbits coincide as sets, which is all "same orbit" means. Neither the crossing direction of
  p nor x_c = p is needed. With the same orbit, the minimal periods agree, which is consistent with the stored
  containment of the Fourier period interval in the CAPD interval (checked by the program).

**Section 4.2.** The codomain X' and ℓ'_ν with weight ν^{|m|}/(1+|m|) make (iωm a_m) ∈ X' bounded bilinear, and
g(a) and d_m E a_m lie in ℓ^1_ν ⊂ ℓ'_ν (apart from R6).

**Section 4.4.**
- A: X' → X is bounded, because sup_{|m|>K} (1+|m|)|A_m| < ∞ by Lemma 4.6 (|mA_m| ≤ S_G/ω̄).
- Injectivity: A_m are inverses, and A_fin is invertible since its compression bound is at most Z1 < 1.
- Lemma 4.6: the Neumann expansion, |B_0| ≤ G_0 (since 0 ≤ d_m ≤ 4c), and entries of G^k ≤ row sums ≤ ϑ^k.
- The C_n rule for |n| ≤ 12, with Υ^{-1} S_G |J'_n| beyond m_max; C_n = Ā_0|J'_n| for 12 < |n| ≤ K'; the
  conjugation for m < 0. All match `existence.py` §4.

**Section 4.5.**
- Y0 tail: Σ_{|m|>K'} |(A_m g_m)_c| ν^{|m|} ≤ Σ_k (Ā_0)_{ck} S_{g,k} 2q^{K'+1}/(1-q). The explicit A_m are used for
  K < |m| ≤ K' (m_max = 391 to 395 > 80 at every N).
- Z1: the tail-row identity (By)_m = Σ_n A_m J'_n y_{m-n} (re-derived from row m of DF(x̄)). T as a per-column
  bound, by summing over n = m - m'.
- The finite-row bound on tail columns, with the |m'| = K + 17 majorant (K + 16 - (-K) = K' = 80), monotone in |m'|.
- The column decomposition (finite rows + tail rows) ⇒ max(ff, ft) + T_{cc'} per block, then
  Z1 = max_c Σ_{c'}. This is a valid bound for the block-column-sup norm on X with weight 1.

**Section 5.5.**
- [A_n] = ball(0, S_J e^{-ρ|n|} + ε e^{-ρ_e|n|}) for |n| > 80 holds for every n, by Lemma 4.2 on the strip ρ = 3/2
  for J and Lemma 5.16 for A - J.
- The window needs |n| ≤ 2K_e = 96 at N = 64 and b_m needs |n| ≤ 2K_e + n_c = 120, as stated.
- The tail form gives s_1 = ||S_J||, q_1 = e^{-3/2}, s_2 = ||ε||, q_2 = e^{-1/4}.
- The ε majorant formula of Lemma 5.16 was re-derived.
- E6: ε_1norm_S = 1.2023e-12 at N = 8. Scaled linearly to r_un it gives 7.3e3 in the same coordinates, against
  dist_min = 1.32e-6. Correct.

**Theorem 5.17(iii) (G4 fix).**
- B_c is a closed |·|_*-ball in the affine Σ, so it is convex and P(B_c) ⊂ B_c because P(x*) = x*.
- The Jordan-scaled norm gives ||DP(x*)||_* ≤ ϱ + ε_J ≤ κ'.
- The choice of s by compactness, and the phase bookkeeping σ = s - T + O(dist), were re-derived.
- Minor: ϱ is used ("the spectral radius") one sentence before it is named.

**Section 6.**
- The parametrization: x̂_V exact, first row of A(0, y) zero, A_t invertible (the verifier certifies
  ||I - R A_t|| < 1/2).
- The ball and norm match `verify.cpp`.
- q is the induced block norm with ratios ρ_c/ρ_b. The invariance test is ||G(0)_b||/ρ_b + row sum < 1. The mean
  value inequality applies because M encloses DG over the box, which contains the ball.
- The eigenvalues of Dg are the nontrivial multipliers by Corollary 5.6 with N = 1 (the time map from x_c is the
  minimal period, given R3).
- Radii range 1.132e-13 to 8.354e-11 ("1.13e-13 and 8.36e-11" is fine). 14 blocks summing to 17. Orders 30 / 128 bit
  and 20. The centre time lies inside the box time. 732.3 s.

**Numbers changed by E1 to E6, checked against `data/*.json` with exact rational arithmetic.**
- E1: q_upper = 0x1.ff4df088d18aap-1 = 0.998641506864051509140... ≤ 0.99864150686405151. The max residual + row sum
  = 0.998642588334693437346... ≤ 0.99864258833469344. The CAPD period ends 53.585519048013900089... ≥
  53.5855190480139 and 53.585519630722437511... ≤ 53.585519630722438 are outward.
- E2: ring delta ≈ 5.0000000000006636358e-6 is correct; r_un ≈ 9.9999999999999997989e-13 is correct. N = 1 delta:
  see R1.
- E3: r_ex values 1.70729455e-28, 1.64390706e-28, 1.64149144e-28, 1.64087420e-28 and 1.64070582e-28 are printed
  1.7073, 1.6440, 1.6415, 1.6409 and 1.6408, all rounded up. Z1 entries are correctly rounded. The period lower ends
  match the records digit for digit, and the upper ends add one in the 23rd decimal.
- E4: |ā_{1,V}| ≥ 0.1152472 at N = 8, so "≥ 0.11524" is safe. Y0 = 1.30956e-28 → 1.3096 (up). Contraction at r_un
  0.2674. m_max = 391.
- E6: as above.
- Table 2: the full-period and reduced-map bounds match the records exactly. K_e = 16, 20, 24, 32, 48. θ_T and the
  worst (SC) ratios are correctly rounded.
- The N = 8 example: ρ_T 3.578, θ_c 0.0787, θ_T 0.2817, b̂ 0.856, q_C 2.6e-14, dist_min 1.32e-6, eigenvalue
  3.3e-16 - 3.9e-15 i, count 1.
- Run times: 26, 48, 80, 184 and 479 s, 3.6 GB, existence 114 to 125 s.
- Leading exponents of Section 7 and the near-axis (SC) ratios (< 1e-6, max 7.1e-7).
- Period differences 2.452e-3, 9.81e-5, 2.50e-5 and 6.29e-6, with ratios 3.92 and 3.98.

**AGENTS.md compliance.**
- No em dashes.
- No sentence says who has not reviewed the draft, and none claims an outside review. Line 601 describes in-project
  readings only. After this reading, update its "has not been read again".
- No "first" claim. The Novelty paragraph stays within the logged searches and cites the nearest precedents.
- Classical sources are credited: equivariant Hopf theory, Andronov-Witt and Kato.

## Can QUALITY item 6 be checked?

Not yet. It can be checked once R1 and R2 are fixed in the manuscript and in the README. Both are wrong numbers in
theorem statements and the abstract; neither invalidates a proof. R3 and R4 are short missing justifications in
Section 6 and should be fixed in the same pass. R5 and R6 are wording, but cheap. R7 to R9 and the EXPOSITION items
are recommended, not blocking. I found nothing unsound in the revised existence assembly (Sections 4.2, 4.4, 4.5),
the coefficient enclosures beyond n_A, the G4 proof, the CAPD argument or the link. So I do not think a third full
reading is needed: a check that the listed fixes were made as described, recorded in the review folder, should
suffice for item 6.

Sources: Crossref works API for the DOIs 10.1016/j.na.2014.09.023, 10.1088/0951-7715/16/6/302, 10.1137/25M1748275,
10.1007/BF02429852, 10.1007/978-1-4612-1828-9, 10.1088/0951-7715/11/5/015 and 10.3934/dcdsb.2024145; arXiv API for
2504.03058 and 2202.05073; [AIMS article page](https://www.aimsciences.org//article/doi/10.3934/dcdsb.2024145) (found
by web search).
