# Third in-project reading of release 2.2.0 (2026-09-27)

This file records a third adversarial reading, made inside the project, of what release 2.2.0 adds to the paper. The
referee was briefed only with the paper and its programs: it did not see `notes/` or anything outside the paper's
folder, and it edited no files. It is not an outside review, and nobody outside the project has read these passages.
The first two readings of the same additions are recorded in `review-identities-2026-09-27.md`; the quality record,
`QUALITY.md` item 6, summarizes both files. The report is reproduced verbatim below; the response to each finding
follows it.

## The report (verbatim)

REFEREE REPORT: release 2.2.0 additions to papers/minimal-winding (paper/minimal-winding.tex, RELEASES.md §2.2.0, code/verify_general_mu.py, code/verify_central_vortex.py, data/*-2026-09-27.txt). Files outside that folder and notes/ were not opened; no files were edited.

SUMMARY
No mathematical error found in the material 2.2.0 adds. I re-derived independently every closed form: Remark 2 (P = u + 1/(2u), P − √2 = (√2u−1)²/(2u), the u ↦ 1/(2u) invariance, fastest collapse cos 2χ = 3/5 from d/dx[sin x/(5−3cos x)] ∝ 5cos x − 3, w = (1+√2)/2 + i/2 and the angles π/8, 5π/8, π/4); Gröbli (μ_i = a − 3/2, a + 3/2, a; radicand 3a² − 9; the two substitutions; P² − 2 = (2a²−9)²/(12(a²−3))); Proposition 1 (G = 2C³ + 8C² + C/4 − 8, depressed cubic s³ − (125/42)s + 124√7/1323, 5√70/21 and −124√10/3125, c0 = 0.67398388394798…, c1 = −0.92438936791888…, c2 = −2.7733103…; at c0, c1 P equals P+ = 2.2038550160… and P− = 1.0647059762… to 40 digits, and direct critical-point search agrees); the worked examples (Gotoda: x = 1/2 is a root of (19) at Γ0 = −3/4, the ring swap preserves the relative rotation θ, coth t = 3, a = 21/4, b = 3, D = 19/4, minimum 3√33/16 at cos 2θ = 4/7, and the Gotoda configuration satisfies Σ_{i<j}ΓiΓj = 0 with zero angular impulse; Γ0 = 1/2: x = 3, (6,2,6), S = 6/(3 − e^{−2iθ}), κ = 3i/(π(3 − e^{2iθ})) vs Lemma 3 at μ = 1: 4i/(π(3 − e^{2iχ})) with θ = χ − π, |z1−z2| = √3/2); the F_n expansion (derived independently with SymPy in h = n^{−1/2}: E_n − √(n/2) = 29√2h/24 + 529√2h³/960, so 29/(12√(2n)) is right, the 1/n coefficient is 265/576, the next coefficient is −14351√2/207360 ≈ −0.0979, consistent with the remainder band [−0.28, −0.07]; the ratios 1.5777…, 1.1754…, 1.0544… are right); Chen–Walsh–Wheeler (triple: harmonic condition and zero impulse hold, after relabel w = 1/3 − (√7/3)i ∈ A+ with θ0 > π/2, P = 5√7/2; quartet: after turning by π/6, |1 + √3/2 − i/2|² = 2 + √3 = x2, argument −π/12 + π/6 = π/12, (2√3+5)/(4−√3) = 2+√3, P = 2√3 − 3/4).
Independent confirmation of the Gröbli transcription: from Lemma 6 at β = 1, P = |S|/(2√rad) with S = Σμ_i(μ_j+μ_k)/(μ_k−μ_j); for every harmonic triple (m1, m2, −m1m2/(m1+m2)) SymPy gives S = −(2a² + [(m2−m3)(m3−m1)(m1−m2)/(m1m2m3)]a − 3), exactly the numerator the program transcribes for Gröbli's (12). So the transcription is physically right for all circulations, not only (1,1,−1/2).
Programs: verify_general_mu.py 140/140 (49 s), verify_central_vortex.py 102/102; both outputs match data/verify-general-mu-2026-09-27.txt and data/verify-central-vortex-2026-09-27.txt (the general-mu file differs only in its timing line). RELEASES' new-check counts are right (19 = 6 in 10j + 6 in 10k + 4 in 10l + 3 in 10m; 22 in section 8). Versions match requirements.txt (Python 3.11, SymPy 1.14.0, mpmath 1.3.0). The PDF was built after the .tex and has 40 pages. The new checks would catch a wrong formula: 10k ties the Gröbli transcription to the Biot–Savart-validated Remark 2 formula through the substitution; 10l cross-checks two independent closed forms; the Gotoda and quartet checks evaluate the Biot–Savart velocities directly; the F_n band check fails at n = 10^12 if 29 or 265 is changed at all (e.g. 266 gives about 1.7·10³ outside the band).
Claims are labelled adequately and the novelty wording in the additions is modest ("by our calculation", "an observation about the two formulas", "we have not checked the minimizers").

VERDICT: minor revision. No must-fix errors; the should-fix items are a credit gap, a notation clash, a citation-version gap and an under-stated argument.

FINDINGS
1. [should-fix] Gröbli is not credited as the earliest closed form of P for every μ. Remark 2 (line 298) calls the μ = 1 formula "a specialization" of Gröbli's coefficient, and the program transcribes his (8) and (12) for general circulations, so Gröbli's ϰ is 2P in closed form for every harmonic triple (1877). Yet the intro (line 60) attributes the two rates to Kimura and Aref, Section 2 (line 88) lists Conte–de Seze ("Earlier, …"), Kimura, Demina–Kudryashov and Gallay–Šverák as closed forms but not Gröbli, and the Discussion (line 928) says the minimization is considered by "neither [aref2010], [cds1980] nor [kimura1987]", silent on Gröbli. Evidence: the general identity S = −(2a² + [(m2−m3)(m3−m1)(m1−m2)/(m1m2m3)]a − 3) above; for μ = 1 the minimum √2 is one line away in Gröbli's own variable by the paper's own P² − 2 = (2a²−9)²/(12(a²−3)). Fix: credit Gröbli §10, Eqs. (8), (9), (12), as the first closed form of P for all harmonic triples in Section 2 and next to Lemma 3; state whether §10 discusses the extremum of ϰ; add Gröbli to the Discussion sentence at line 928; the "not found P minimized" claims (lines 60, 934) should explicitly include Gröbli.
2. [should-fix] Notation clash on u and k. Section 3 already defines u = μ + 1 + 1/μ (line 176, used in the proof of Theorem 1(c), line 216); Remark 2, in the same section, redefines u = tan χ, and Section 6's disclaimer "unrelated to u of Section 3" (line 580) is now ambiguous. Likewise Remark 2 writes k for Gröbli's ϰ "because κ is taken", but k is also taken in Section 3: k = (1 − μ)(2 + μ)(1 + 2μ) in the direct proof (line 228). RELEASES also uses u. Fix: rename tan χ (e.g. v or ℓ) and Gröbli's coefficient (keep ϰ, a distinct glyph, or K_G), or add explicit "(not the u, k above)" notes. Minor, same kind: Section 5's new c = 29/(12√2) and σ_n (line 538) reuse c (Sections 4, 6) and σ (Theorem 1(c), Proposition 1); Gröbli's a sits next to Lemma 1's a, b and Remark 1's a/b.
3. [should-fix] Which version of Chen–Walsh–Wheeler is cited is not stated. The text (line 940) cites Eqs. (4.4)–(4.6), Definition 4.1, Theorems 1.3 and 4.4, Examples 4.2 and 4.3, Corollary 4.6 and Sect. 1, and flags a misprint "in arXiv:2506.04093v1"; the bibliography (cww2026, line 977) lists the Math. Ann. version first. It does not say whose numbering is used or whether the journal version still has the misprinted third position, while the other preprint-cited entries (kas2018, hgl2007, cds1980, dgc2023) say "whose … numbering is cited". Fix: add "arXiv:2506.04093v1, whose numbering is cited" (or the journal numbering) and state whether the published version corrects the quartet's third position.
4. [should-fix] The non-degeneracy argument rests on unstated properties of CWW's map V. Line 940, "Their non-degeneracy … except at isolated values of θ", needs (i) V real-analytic in its parameters near the family, so its maximal minors are analytic in θ, and (ii) V equivariant under dilations and positive rescalings of the circulations, which holds only if the rate parameter or normalization of V scales with them (e.g. (z, Γ, κ) ↦ (λz, Γ, λ^{−2}κ)); if V fixes a normalization, the members along the arc must be renormalized analytically in θ, which is possible because κ(θ) ≠ 0. The conclusion is plausible, but a reader cannot check it without CWW's Eq. (4.4). Fix: state V's form, or at least the two properties used and that the normalization is analytic in θ along the arc.
5. [nit, bordering on should-fix] Line 566, "Under others the two constants differ by a factor independent of θ", is false as literally written: normalizing the three vortices by |z3 − z1| = 1 instead of |z1 − z2| = 1 multiplies κ by |w|² = 1 + (√3/2)cos χ, which depends on θ. Fix: "if |z1 − z2| and the radius of the positive ring are fixed at other values".
6. [nit] verify_central_vortex.py line 480 (and the committed output) labels a check "at five angles (two of them expanding)". The angles are 0.3, 0.7, 1.2, 2.0, 3.5; only θ = 2.0 expands (at θ = 3.5, sin 7 = 0.657 > 0, so it collapses). Fix the label to "one of them expanding", or add a second expanding angle such as 5.0.
7. [nit] verify_general_mu.py lines 1151 and 1156–1157: Table 1 (line 859) reports a cubic residual at most 5 × 10^{−60} and "P = P+, P− there to 10^{−60}", but the checks accept 10^{−55} and 10^{−50} and the label says "to 50 digits". The actual values (4.36e−60, 3.11e−61) meet the table, but the checks would pass values the table does not permit. Fix: tighten the thresholds, or align the table and label.
8. [nit] verify_general_mu.py line 1173 (10m) is labelled "(exact)" but compares floats (float(th0h) > float(pi/2)). Fix: test cos θ0 = −√7/14 < 0 in SymPy.
9. [nit] The 10k negative control (verify_general_mu.py line 996) only checks that the misprinted μ1μ3μ3 gives some different expression, which almost any change would. Fix: run the misprinted coefficient through the a = √3/cos χ substitution and show it fails to equal u + 1/(2u), mirroring the positive check.
10. [nit] RELEASES §2.2.0 "How it was checked" says "Every addition is proved in the text", which overstates: the Gröbli and Goodman readings, Kimura's Eq. (4.4) and the CWW misprint are statements about sources; the programs check transcriptions, not the sources. Fix: "every mathematical addition is proved in the text; the readings of Gröbli, Goodman, Kimura and CWW are checked for internal consistency against the Biot–Savart velocities".
11. [nit] Line 940, "…the bounds describe the approach only while the cores are small compared with the separations", is heuristic and cites no theorem for patches following a collapsing point-vortex configuration. Fix: phrase it as an expectation, or cite a point-vortex limit theorem valid up to times before the collision. Optionally add the English translation of Yudovich (1963), USSR Comput. Math. Math. Phys. 3, 1407–1456, to the bibliography entry at line 1047.
12. [nit] Remark 2 (line 298) is now one paragraph of about 450 words covering five topics (the Lemma 1 proof, the u-form and involution, the minimizing triangle, Kimura, and Gröbli with the translation note). Split it into two or three paragraphs.

WHAT I COULD NOT VERIFY (no access): Gröbli's original printed equations and page numbers; Goodman's (10.9); Kimura's Eqs. (4.4) and (4.6); Gotoda's Fig. 3(b) and Eq. (3.13); CWW's Eqs. (4.4)–(4.6), misprint and convention; the Crippa–Stefani theorem numbers; the Math. Ann. article data. Internal consistency supports the first three and the CWW sign convention: the transcribed Gröbli (12) is correct for all harmonic triples, Kimura's A and B match Biot–Savart to 2e−51, and both CWW configurations collapse in the paper's convention.

## Response (2026-09-27)

All twelve findings are fixed; none is left open. Line numbers below are those of the report, which refer to the
manuscript as it was read. The fixes were checked by rerunning both programs and rebuilding the PDF (last section);
they were not given a further reading.

### What Gröbli's §10 says about an extremum

Read for this response in the original (Bayerische Staatsbibliothek scan bsb11358655, printed pp. 55–59, all of §10)
and in Goodman's translation (arXiv:2404.01305v1, §10, pp. 36–39, with Fig. 6 on p. 40). §10 derives Eqs. 1) to 15):
the squared sides s_i² = λ_i t with the time measured from the collision (p. 55), the harmonic condition 4) and the
shape parameters μ_i = a − (m_j − m_k)/m_i of Eq. 8) (p. 56), the rate μ of Eq. 9) and the rotation
dϑ = ϰ dt/(2t) with ϰ in closed form, Eqs. 11) and 12) (p. 57), and the logarithmic spirals 15) (p. 58). It then
remarks that for given circulations the arbitrary constant a gives infinitely many shapes, that the triangle is
right-angled when a equals one of −(m_j − m_k)/(m_j + m_k), two of which always satisfy the conditions on a, and that
the isosceles shape is impossible (p. 58), and works one example, m₁ : m₂ : m₃ = 3 : −2 : 6, a = 2 (p. 59, Fig. 6),
whose printed exponent √3/5 is 1/ϰ. Nowhere does §10 minimize ϰ, bound it, or discuss its extremum, in the
original or in the translation. So Gröbli gives P = |ϰ|/2 in closed form for every triple of circulations with
1/m₁ + 1/m₂ + 1/m₃ = 0, and the paper's statement that it has not found P minimized stands, now naming him.

### The findings

1. **Fixed.** Section 2 now opens its list of closed forms with Gröbli, §10, Eqs. (8), (9), (12), pp. 56–57, as the
   first closed form of P, for every triple with 1/Γ₁ + 1/Γ₂ + 1/Γ₃ = 0 (P = |ϰ|/2). A new paragraph after Lemma 3
   writes his closed form out for general circulations, notes that Lemma 6 at β = 1 gives the same value (the
   referee's identity, now checked in the program), and says what else §10 contains and that it does not discuss the
   extremum. Remark 2 calls its formula Gröbli's closed form at (1, 1, −1/2). The Discussion sentence now reads "which
   none of Gröbli [§10], Aref, Conte and de Seze and Kimura considers", adding that Gröbli gives the ratio in closed
   form but does not discuss its extremum; the Introduction's "not found P minimized" names "Gröbli's §10 included",
   and the Discussion's "not found … stated in the literature" reads "from Gröbli's §10 on". The novelty statements
   did not have to be weakened: §10 contains no extremum. `verify_general_mu.py` 10k gains three checks: the identity
   through Lemma 6 for every harmonic triple, symbolic in m₁, m₂ and a; Gröbli's |ϰ|/2 against the Biot–Savart P for
   μ ∈ {0.1, 0.3, 0.5, 0.8, 1, 2}, two angles on each arc (to 1.05 × 10⁻⁴⁸, with his Eq. (8) consistent to
   8.6 × 10⁻⁴⁹); and his example of Fig. 6 (ϰ = 5/√3, P = 5√3/6 by Biot–Savart, one orientation collapsing and its
   mirror image expanding).
2. **Fixed.** tan χ is now v in Remark 2, the Discussion, Table 1, RELEASES.md, CHANGELOG.md, QUALITY.md and the
   labels of `verify_general_mu.py`; u is again only μ + 1 + 1/μ in Section 3, so Section 6's disclaimer is
   unambiguous. Section 5's disclaimer adds that its v = ζⁿ is unrelated to v = tan χ (Remark 4 also has a local
   v = β ln(1/ρ), defined where it is used). Gröbli's coefficient is written ϰ (\varkappa), his own glyph, said to be
   distinct from κ, and never k. His shape constant and shape parameters are written a_G and μᴳᵢ, so they no longer sit
   next to Lemma 1's a, b and Remark 1's a/b. The proof of the F_n expansion no longer names c or σ_n: it expands
   arsinh((2(n − 1))^{−1/2}) directly and writes the 1/n coefficient as 841/576 − 1.
3. **Fixed.** The bibliography entry reads "arXiv:2506.04093v1, whose numbering is cited; the numbers cited are the
   same in the journal version". The journal version (Math. Ann. 396 (2026) 5, 40 pp., CC BY 4.0) was reached for this
   response: Sect. 4.1 (pp. 26–29) has the same Eqs. (4.4)–(4.6), Definition 4.1 and Examples 4.2 and 4.3, and
   Theorems 1.3 and 4.4 and Corollary 4.6 keep their numbers; it prints the quartet's third position as
   −√3/2 − 1 − i/2 (p. 29), as v1 does, so the misprint is not corrected there. The paper now says "In
   arXiv:2506.04093v1 and in the published version the third position … is printed as −√3/2 − 1 − i/2; it has to be
   read as −√3/2 − 1 + i/2"; Table 1 and the programs' labels say the same.
4. **Fixed.** The paragraph now states V from their Eq. (4.4), V_k(Λ) = Σ_{j≠k} γ_j/(2πi(z_k − z_j)) + iΩ z̄_k on
   Λ = (z, γ, Ω) ∈ ℂᴺ × ℝᴺ × ℂ, which is the same in both versions, notes that V(Λ) = 0 is the self-similar motion
   about the origin with Ω = iκ̄ (their printed Ω for both examples), and states the two properties it uses, both read
   off from that formula: V is rational in the real coordinates with denominators |z_k − z_j|², so real-analytic
   while the vortices are distinct; and a rotation, a dilation (z, γ, Ω) ↦ (λz, γ, λ⁻²Ω), a factor
   (z, γ, Ω) ↦ (z, cγ, cΩ) with c > 0 and a relabeling are real-linear isomorphisms L with V ∘ L = A ∘ V, A invertible,
   so D_ΛV(LΛ) L = A D_ΛV(Λ). Since V fixes neither the size nor Ω, no renormalization along the arc is needed: the
   positions are analytic in θ, the circulations fixed, and Ω = iκ̄(θ) is analytic by Lemma 3 and by the formula for S
   in Section 5. Checked: V = 0 at the triple with their printed Ω and 1/κ, and along A₊ for μ = 1/2 with
   Ω = iκ̄(θ) (`verify_general_mu.py` 10m); V ∘ L = A ∘ V for the four symmetries at a point with V ≠ 0 (10m); V = 0 at
   the quartet with their printed Ω (`verify_central_vortex.py` part 8).
5. **Fixed.** The sentence now reads "if |z₁ − z₂| and the radius of the positive ring are fixed at other values, or
   the circulations are multiplied by other constants, the two constants differ by a factor independent of θ".
6. **Fixed.** The check now uses six angles, 0.3, 0.7, 1.2, 2.0, 3.5 and 5.0, counts the expanding ones and requires
   exactly two (2.0 and 5.0); the label says so, and so does Table 1 ("six angles, two of them expanding").
7. **Fixed.** The thresholds are tightened to what Table 1 states: the residual of the cubic below 10⁻⁵⁹ (Table 1 now
   says ≤ 10⁻⁵⁹; observed 4.36 × 10⁻⁶⁰) and P = P₊, P₋ to 10⁻⁶⁰ (observed 3.11 × 10⁻⁶¹); the labels say "to 1e-59
   (60 digits)" and "to 1e-60 (60 digits)".
8. **Fixed.** 10m now tests cos θ₀ = −√7/14 exactly in SymPy and that it is negative (`is_negative`), with no floats.
9. **Fixed.** The negative control runs the misprinted coefficient through a_G = √3/cos χ and shows that the result is
   not v + 1/(2v): the difference is not identically zero, and at v = 1, where Remark 2 gives 3/2, it is
   9/10 − 3√6/5 ≈ −0.570.
10. **Fixed.** RELEASES.md now says "Every mathematical addition is proved in the text. The readings of Gröbli,
    Goodman, Kimura and Chen, Walsh and Wheeler are statements about sources: the programs check them for internal
    consistency and against the Biot–Savart velocities, not against the sources themselves."
11. **Fixed.** The sentence now reads "we expect, but do not prove, that the bounds describe the approach only while
    the cores are small compared with the separations". The Yudovich entry adds the English translation, USSR Comput.
    Math. Math. Phys. 3 (1963) 1407–1456, doi:10.1016/0041-5553(63)90247-7 (checked on Crossref; not opened).
12. **Fixed.** Remark 2 is now three paragraphs: the μ = 1 formula, its bound by Lemma 1 and Kimura's rates; the form
    P = v + 1/(2v), the involution and the minimizing triangle; and Gröbli's closed form at (1, 1, −1/2) with the
    translation note.

### On "What I could not verify"

- Gröbli's printed equations and page numbers, and Goodman's (10.9): checked against the scan and the translation
  (above). The paper's page range for §10 is corrected from pp. 55–58 to pp. 55–59, since the example of Fig. 6 on
  p. 59 belongs to it.
- CWW's Eqs. (4.4)–(4.6), the misprint, the convention and the journal data: checked in both versions (finding 3);
  their printed Ω equals iκ̄ in the paper's convention for both configurations (finding 4). The journal data (volume
  396, article 5, published online 23 July 2026, CC BY 4.0) agree with Crossref.
- Kimura's Eqs. (4.4) and (4.6), Gotoda's Fig. 3(b) and Eq. (3.13), and the Crippa–Stefani theorem numbers were not
  re-opened for this response; they were read on 2026-09-27 and 2026-09-26 (RESEARCH.md) and are unchanged.

## Checks after the fixes (2026-09-27)

- `python3 code/verify_general_mu.py`: 145 checks, all pass; output in `data/verify-general-mu-2026-09-27.txt`.
- `python3 code/verify_central_vortex.py`: 103 checks, all pass; output in `data/verify-central-vortex-2026-09-27.txt`.
- `pdflatex` three times (no bibtex; the bibliography is inline): 41 pages, 43 references, no undefined references;
  the one overfull box (Section 8, the paragraph on `certify_sqg60.py`) was there before.
- The page count moved from 40 to 41; README.md, RELEASES.md, QUALITY.md item 7, `submission/arxiv-metadata.md`
  and `submission/CHECKLIST.md` say 41.
