# Fourth in-project reading of release 2.2.0 (2026-09-27)

This file records a fourth adversarial reading, made inside the project, of the newest passages of the paper: the
paragraph on Gröbli's closed form after Lemma 3, the passage on Chen, Walsh and Wheeler in the Discussion, and the
checks of both in the two programs. The reading was narrow: the referee was briefed only with the paper and its
programs, did not see `notes/` or anything outside the paper's folder, and edited no files. It is not an outside
review, and nobody outside the project has read these passages. The first three readings of release 2.2.0 are recorded
in `review-identities-2026-09-27.md` and `review-identities-3-2026-09-27.md`; the quality record, `QUALITY.md`
item 6, summarizes all four. The report is reproduced verbatim below; the response to each finding follows it.

## The report (verbatim)

Referee report on the three new passages of papers/minimal-winding (paper/minimal-winding.tex, verify_general_mu.py, verify_central_vortex.py). No files edited. Both programs re-run and pass (145/145 checks, 79 s; "all checks passed").
Verdicts: 1. Gröbli paragraph after Lemma 3 (tex l.164-172): correct. 2. CWW passage in the Discussion (tex l.954): correct in substance (the two properties, the analyticity in θ and the conclusion hold and are not overstated), but the sentence identifying the CWW triple as a zero of V is wrong. 3. Program checks: mostly adequate and would fail on a wrong formula; one sub-check is a tautology and one check label overstates its coverage.
Evidence for 1: with m = (m1, m2, −m1m2/(m1+m2)) and μ^G_i = a − (m_j − m_k)/m_i, SymPy gives exactly Σ μ^G_i/m_i = 0 (zero angular impulse for every a_G), Lemma 5's circulations at β = 1 on these sides proportional to m_i, Lemma 6's S at β = 1 (with r_i² = μ^G_i and the paper's cyclic convention) satisfying S + (2a² + Ka − 3) = 0 identically, and the Heron product equal to the radicand. Branch conditions hold: the radicand is a quadratic in a_G with leading coefficient 3; if two μ^G_i have opposite signs the radicand is negative, so "one sign" is implied by "forming a triangle"; this leaves two half-line branches (all μ^G_i > 0, all < 0), one for each arc. The differences μ^G_i − μ^G_j are nonzero constants (±(m1²+m1m2+m2²)/…), confirming "never isosceles". Biot–Savart at 50 digits, 229 cases (42 triples in random order and sign, including (3, −2, 6) and (1, 2, −2/3), random a_G on both branches, 115 and 114): self-similar to 2e−49, |ϰ|/2 = P to relative 1.5e−49. Negative control: flipping the sign of K changes P by up to 10. Fig. 6 by hand: ϰ = 5/√3, and the triangle is right-angled.
Evidence for 2: the four equivariances (rotation with A = e^{−iφ}; dilation with Ω → λ⁻²Ω, A = 1/λ; factor c on circulations and Ω, A = c; relabelling, A the same permutation) are confirmed exactly in SymPy; the chain rule gives DV(LΛ)L = A·DV(Λ), so the rank is preserved. V is real-analytic while the vortices are distinct; Ω = i·conj(κ) is real-analytic along both arcs because the denominators (√R − μe^{iθ})(√R + e^{iθ}) and 1 − ρe^{inθ} (ρ > 1) never vanish. The minor argument is valid and correctly scoped (degenerate θ isolated in the open arc). As a numerical observation, the rank of D_Λ V is full at all 199 sampled points of A+ for μ = 1/2 (σ_min/σ_max ≥ 8e−4, 0.024 at θ = π/2), on A− and on the expanding arcs, and at 199 points of the n = 2 ring arc, so the "isolated values" caveat is conservative.
Findings: [must-fix, tex l.954] "Their triple … at −2, 1 and √7 i" … "and this is their printed Ω for both examples": the quoted triple has center of vorticity z_c = −2i/√7 ≠ 0; since Σγ_k V_k ≡ iΩ Σγ_k conj(z_k), no Ω makes it a zero of V (min over Ω of |V| = 0.0489), and the listed maps L do not include translations, so the argument must start from the shifted triple. The program (verify_general_mu.py l.1270–1273) reads CWW's printed Ω for the triple as the real number 35/(264π) and forms V's Ω as 35/(264π) − i/(2κ_CWW) = (35 − √7 i)/(264π), which equals i·conj(κ); with the real value alone |V| = 0.011. So "their printed Ω for both examples" is true only for the quartet (2√3 − 3/4 − i/2); the paper and the program disagree, and the program is the one consistent with V. Fix: "shifted to its center of vorticity −2i/√7, their triple is a zero of V with Ω = i·conj(κ) = (35 − √7 i)/(264π), formed from their printed Ω and κ as in their Sect. 4.1; for the quartet their printed Ω is i·conj(κ)"; adjust table row l.899–900 ("with their printed Ω") to match. [should-fix, verify_general_mu.py l.1017–1018 and 1023] the "16A² = the radicand" sub-check is a tautology (heronH and radH are the same polynomial reordered), so it cannot fail; compare against the area from coordinates or the factored Heron product in the side lengths. [should-fix, l.1044, label "every harmonic triple, Biot-Savart"] the numerical check covers only the normalized family (1, μ, −μ/(1+μ)), enough only because Gröbli's expression is invariant under a sign flip and under relabelling (a transposition takes a_G to −a_G and K to −K), which nothing checks; add random ordered and signed triples (my 229 cases pass) or relabel as "the normalized family". [nit, l.1273] Ω_bold is hard-coded rather than computed from the printed Ω and κ, so the combination rule is never exercised. [nit, optional] no program computes the rank of D_Λ V; a cheap rank check, labelled numerical, would back up the argument instead of resting only on CWW's Corollary 4.6. [nit, tex l.942] "Gröbli gives the ratio in closed form for every triple of circulations" should read "for every triple that can collapse (1/Γ1 + 1/Γ2 + 1/Γ3 = 0)", as l.60 and l.164 already say. [nit, tex l.172] "with r_i² = μ^G_i": on the branch where all μ^G_i < 0 the common factor is negative; say "proportional to μ^G_i", since |S|/(8A) is unchanged by a factor of either sign.
Item 3: the general symbolic check (l.1019) is a real identity test and would catch a wrong sign or coefficient of K; the Biot–Savart check (l.1044) recovers a_G from all three of Gröbli's Eqs. (8) and compares P to 1e−45, so it would fail on a wrong μ^G_i or ϰ; the Fig. 6 check tests the exact value 5/√3 and Biot–Savart for both orientations; the CWW checks test the shape ratio and that θ = π/2 lies on A+, P = 5√7/2, V = 0 at the shifted triple, along A+ and at the quartet, and the equivariances at a point where V ≠ 0 (the right design, since at a zero they would be trivial). The quartet's misprinted third position is a working negative control.

## Response (2026-09-27)

All seven findings are fixed; none is left open. Line numbers below are those of the report, which refer to the
files as they were read. The fixes were checked by rerunning both programs and rebuilding the PDF (last section);
they were not given a further reading.

### The numbers of Chen, Walsh and Wheeler, as verified for this response

Sect. 4.1 of arXiv:2506.04093v1 (pp. 19–22) was read again, with pp. 20–21 viewed as images, since the text layer does
not show which Ω is bold (RESEARCH.md, 2026-09-27, "fourth reading"). At the start of Sect. 4.1 their κ > 0 is the
collapse time, and L ∂ₜL̄ = −1/(2κ) − iΩ =: −i**Ω**; the Ω of Λ and of the map V of their Eq. (4.4) is the bold **Ω**.
Example 4.2 prints the triple z = (−2, 1, √7 i), γ = (1, 2, −2/3), z_c = −(2/√7) i, and, in regular type from Aref's
formulas, Ω = 35/(264π) and 1/κ = √7/(132π); their Λ₀ is the triple shifted by z_c. Example 4.3 prints the quartet
with z_c = 0 and the bold **Ω** = 2√3 − 3/4 − i/2 itself. Computed exactly in SymPy (`verify_general_mu.py`, 10m, and
a separate script for this response):

- the center of vorticity of the triple as printed is −2i/√7, as they print;
- κ = (−√7 + 35i)/(264π) at all three vortices, in the paper's convention (dz_k/dt = κ(z_k − z_c));
- the collapse time 1/(−2 Re κ) = 132π/√7, so their 1/κ = √7/(132π) is right;
- **Ω** = Ω − i/(2κ) = 35/(264π) − √7 i/(264π) = (35 − √7 i)/(264π) = iκ̄, and V = 0 at the shifted triple with it
  (exactly; 3.4 × 10⁻⁵² at 50 digits);
- at the triple as printed, the minimum over Ω of the Euclidean norm of V is 0.0489, as the report says; at the
  shifted triple the real printed Ω alone leaves max_k |V_k| = 0.0109 (the report's 0.011; the Euclidean norm is
  0.0134);
- for the quartet κ = −1/2 + i(8√3 − 3)/4, so iκ̄ = 2√3 − 3/4 − i/2, the printed **Ω**, and V = 0 there exactly.

So the report is right: "this is their printed Ω for both examples" held for the quartet only. The same wrong
statement is in the response to finding 4 of `review-identities-3-2026-09-27.md` and in the RESEARCH.md entry of the
third reading; those are dated records and keep their words; the new RESEARCH.md entry corrects them.

### The findings

1. **Fixed (must-fix).** The Discussion now reads, after "…with Ω = iκ̄": "Since the double sum cancels in pairs,
   Σ_k γ_k V_k = iΩ conj(Σ_k γ_k z_k). For their triple as quoted above, whose center of vorticity is −2i/√7, this
   vanishes only for Ω = 0, where V is the conjugate of the velocities, which do not vanish; so no Ω makes that
   triple a zero of V. Shifted to its center of vorticity, as they do, the triple is a zero of V with
   Ω = iκ̄ = (35 − √7 i)/(264π); the argument below starts from this shifted triple, since its maps L do not include
   translations. For the triple they print, from Aref's formulas, a real constant Ω = 35/(264π), in regular type
   while the Ω of V is in bold, and 1/κ = √7/(132π), where their κ is the collapse time; by the definition at the
   start of their Sect. 4.1 the Ω of V is the real constant minus i/(2κ), which is the value above. For the quartet,
   printed with its center of vorticity at the origin, the printed Ω is that of V, and it is iκ̄." The Table 1 row
   now says that V is evaluated at the triple shifted to its center of vorticity, with Ω − i/(2κ) formed from their
   printed Ω and collapse time, and at the quartet with its printed Ω, lists z_c = −2i/√7, κ and
   Ω − i/(2κ) = (35 − √7 i)/(264π) = iκ̄ among the results, and adds the unshifted triple and the real Ω alone as
   negative controls. `verify_general_mu.py` 10m gains two checks: the exact one above (z_c, κ at all three vortices,
   the collapse time, Ω − i/(2κ) = iκ̄) and the negative controls (the identity for Σ_k γ_k V_k; min over Ω of |V| at
   the unshifted triple, 0.0489; the real Ω alone, 0.0109). RELEASES.md, QUALITY.md (items 2, 4 and 6) and the
   CHANGELOG say the same.
2. **Fixed (should-fix).** The sub-check that compared `heronH` with `radH`, one polynomial written twice, is
   replaced by two real tests. Symbolically, with r_i² = λμᴳᵢ and λ a nonzero real symbol, Heron's formula is formed
   factored in the side lengths r_i = √(λμᴳᵢ), (r₁ + r₂ + r₃)(−r₁ + r₂ + r₃)(r₁ − r₂ + r₃)(r₁ + r₂ − r₃), expanded,
   and compared with λ² times the radicand of Gröbli's (9); the same check now tests S = −λ(2a_G² + Ka_G − 3)
   (finding 7). Numerically, on the 188 random triangles of finding 3, 16A² is taken from the coordinates by the
   shoelace formula and compared with λ² times the radicand formed from the measured sides (relative difference
   1.1 × 10⁻⁴⁸).
3. **Fixed (should-fix), by adding the cases.** The old check is relabeled "the normalized family (1, μ, −μ/(1 + μ))".
   A new Biot–Savart check at 50 digits takes 47 harmonic triples: Gröbli's (3, −2, 6) and the triple (1, 2, −2/3) of
   Chen, Walsh and Wheeler, each also relabeled with all signs changed, (−6, −3, 2) and (2/3, −1, −2), then
   (1, 1, −1/2), and 42 triples (m₁, m₂, −m₁m₂/(m₁ + m₂)) with m₁, m₂ of random sign and size in [0.05, 5], shuffled
   and multiplied by a random sign (seeded RNG). For each triple a_G is taken at random twice beyond the larger root of
   the radicand (all μᴳᵢ > 0) and twice below the smaller (all μᴳᵢ < 0), 94 + 94 = 188 triangles, built from
   coordinates with a random size, orientation, rotation and position; 89 of them expand. The check recovers a_G from
   the measured sides by his (6) and (8) (to 6.9 × 10⁻⁴⁸), tests self-similarity (spread 1.6 × 10⁻⁴⁸), the area
   (finding 2) and |ϰ|/2 = |Im κ|/(2|Re κ|) (relative 2.3 × 10⁻⁴⁸). A negative control replaces K by −K: P is then
   missed in each of the 184 triangles with |K| > 0.01 (relative difference from 3.4 × 10⁻³ to 5.97). An exact check
   adds what the report says nothing checked: m₁ ↔ m₂ with a_G ↦ −a_G turns (μᴳ₁, μᴳ₂, μᴳ₃) into (−μᴳ₂, −μᴳ₁, −μᴳ₃)
   and K into −K and keeps the numerator of (12) and the radicand of (9), and m ↦ −m keeps every μᴳᵢ and K. Table 1's
   Gröbli row lists these cases and results.
4. **Fixed (nit).** The program no longer hard-codes the Ω of V for the triple: it forms it as
   `OmC - i*invkC/2` from the printed Ω = 35/(264π) and 1/κ = √7/(132π), at 50 digits, and the new exact check forms it
   the same way in SymPy, so the combination rule of their Sect. 4.1 is exercised.
5. **Fixed (nit, optional).** Two numerical checks at 30 digits compute the rank of D_ΛV, as the real 2N × (3N + 2)
   Jacobian assembled from the complex derivatives of V (checked against central differences to 4.5 × 10⁻²⁰), at 199
   equally spaced points of A₊ for μ = 1/2 and of 0 < θ < π/2 for n = 2, where V = 0 with Ω = iκ̄. The 2N-th singular
   value is at least 7.95 × 10⁻⁴ times the largest on A₊ (0.0169 at θ = π/2) and at least 2.93 × 10⁻⁴ for n = 2
   (0.0139 at θ = π/12, the quartet turned by π/6); the smallest ratios are at the ends of the arcs. These ratios
   depend on the scaling of the coordinates (the report's 0.024 at θ = π/2 is for another normalization); the rank
   does not. The Discussion adds one sentence, "Numerically, at 199 equally spaced points of each of these two arcs
   the 2N-th singular value of D_ΛV is at least 2.9 × 10⁻⁴ times the largest (Table 1); this observation is not used
   in the argument", and Table 1's row lists the check as numerical. Not done: A₋ and the expanding arcs, which the
   report sampled; the paper makes no claim about them.
6. **Fixed (nit).** The Discussion reads "Gröbli gives the ratio in closed form for every triple of circulations that
   can collapse, 1/Γ₁ + 1/Γ₂ + 1/Γ₃ = 0 (Section 3, after Lemma 3), but does not discuss its extremum". Section 8's
   list of exact checks, which had the same phrase, now also says "that can collapse".
7. **Fixed (nit).** The paragraph after Lemma 3 reads "with r_i² proportional to μᴳᵢ, say r_i² = λμᴳᵢ with λ real and
   of the sign of the μᴳᵢ, its sum S equals −λ times the numerator of ϰ, and 16A² equals λ² times the radicand, by
   Heron's formula, so |S|/(8A) = |ϰ|/2 for either sign of λ". The program's symbolic check carries λ (finding 2).

### On the report's "Item 3"

Nothing to fix: it describes what the other checks test. The equivariances of V are still checked at a point where
V ≠ 0, and the quartet's misprinted position remains a negative control in `verify_central_vortex.py`.

## Checks after the fixes (2026-09-27)

- `python3 code/verify_general_mu.py`: 152 checks (7 new), all pass, 66.3 s in the run stored; output in
  `data/verify-general-mu-2026-09-27.txt`.
- `python3 code/verify_central_vortex.py`: 103 checks, all pass; unchanged, and its output,
  `data/verify-central-vortex-2026-09-27.txt`, is byte-identical to the committed one.
- `pdflatex` three times: 42 pages (41 before), 43 references, no undefined references; the one overfull box
  (Section 8, the paragraph on `certify_sqg60.py`) was there before. README.md, RELEASES.md, QUALITY.md item 7,
  `submission/arxiv-metadata.md`, `submission/CHECKLIST.md`, the CHANGELOG and the `papers/papers.json` note state
  42 pages and 152 checks.
- `node tools/paper-check.js`, `node tools/paper-sync.js --check minimal-winding`, `node tools/lint.js`,
  `node tools/build.js --check`, `node tools/science.js` and `npm test` pass.
