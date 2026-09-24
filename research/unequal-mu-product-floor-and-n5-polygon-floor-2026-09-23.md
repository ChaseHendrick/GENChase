# Minimal winding in self-similar point-vortex collapse: companion note

This is the repository's working note for the paper *Minimal winding in the self-similar collapse of three point vortices and of two concentric vortex polygons* (Chase Hendrick). The paper is the reviewed version and is meant to be posted as its first public version (v1). This note keeps what the paper leaves out: how the results were found, what was corrected on the way, what the verification covers, and what is still open before submission.

- Paper source: [`unequal-mu-n5-floors-2026-09-23.typ`](unequal-mu-n5-floors-2026-09-23.typ) (Typst)
- Paper PDF: [`artifacts/unequal-mu-n5-floors-2026-09-23.pdf`](artifacts/unequal-mu-n5-floors-2026-09-23.pdf)
- LaTeX version: [`unequal-mu-n5-floors-2026-09-23.tex`](unequal-mu-n5-floors-2026-09-23.tex), the same text for arXiv and journals. It uses [`figures/minimal-winding.pdf`](figures/minimal-winding.pdf), which `plot_minimal_winding.py` writes next to the SVG. Build it from `research/` with `pdflatex -output-directory=<scratch dir>`, run twice, so no build files land in the repository. The Typst file stays the reference text, so keep the two in step.
- Verification program: [`verify_floors_independent.py`](verify_floors_independent.py)
- Verification output: [`artifacts/verify-floors-independent-2026-09-23.json`](artifacts/verify-floors-independent-2026-09-23.json)

Cite the person, Chase Hendrick, not the GitHub handle. No result here carries a personal name.

## Results

Write P = |ω₀|t_c, the initial angular velocity times the collapse time. Each vortex moves on a logarithmic spiral, and P is the angle the configuration turns while the square of its size falls by the factor e.

1. **Every self-similar three-vortex collapse.** Any self-similar collapse of three point vortices normalizes to circulations Γ = (1, μ, −μ/(1+μ)) with 0 < μ ≤ 1 and zero angular impulse.
   - **Arcs.** The collapsing configurations form two arcs, 𝓐₊ and 𝓐₋, one for each orientation of the triangle.
   - **One minimum per arc.** P has exactly one critical point on each arc, and it is the minimum there (Theorem 1). Write P₊(μ) and P₋(μ) for the two minima.
   - **The cubic.** P₊² and P₋² are roots of an explicit cubic Q(μ, y), irreducible over ℚ. Written in u = μ + 1 + 1/μ:

         Q = μ⁶[1728(u+1)²y³ − 144(u+1)(8u³−9u−9)y² − 4(16u⁶−288u⁴−288u³−81u²−162u−81)y + 3(4u³−3u−3)²]

   - **The least winding.** For μ < 1 the two minima differ. The smaller one, P₋(μ), increases strictly from √3/2 (as μ → 0, never attained) to √2 (at μ = 1).
   - **Corollary 1.** |ω₀|t_c > √3/2 for every self-similar three-vortex collapse, and the bound is sharp. Equivalently, every vortex travels more than twice its initial distance from the collision point, and its path makes an angle of more than 60° with the direction to the collision point.
   - **Every collapse.** In the plane every three-vortex collapse is self-similar (Drivas, Khanikati and Khanikati 2026, Theorem 1.1; Krishnamurthy and Stremler 2018), so the bound holds for every collapse of three point vortices. The paper says so after Corollary 1.
2. **The ratio μ = 1/2, Γ = (1, 1/2, −1/3).** The two minima have closed forms in X = 245351/5201^{3/2} and S = 7√5201/162:

       P₋ = √(605/324 + S cos(⅓ arccos X − 2π/3)) = 1.0647059762712043…   (the least winding)
       P₊ = √(605/324 + S cos(⅓ arccos X))        = 2.2038550160361327…

   They are the positive roots of 8748x⁶ − 49005x⁴ + 27794x² + 18723, which is 16·Q(1/2, x²). That polynomial is irreducible, so the minima are not expressible by real radicals. The same irreducibility holds for all 277 rationals μ = a/b < 1 with b ≤ 30.
3. **Equal circulations, Γ = (1, 1, −1/2).** Here P = (3 − cos 2β)/(2 sin 2β) ≥ √2. This is Gröbli's spiral coefficient reparametrized, and it is included for comparison.
4. **Two concentric regular n-gons, circulations x_n and −1.** Here x_n = (n + √(2n − 1))/(n − 1) = e^η with cosh η = n/(n − 1). The winding is

       P = (K_n − √(2n − 1) cos nθ)/(2n sin nθ) ≥ F_n = √(K_n² − (2n − 1))/(2n),   K_n = (n − 1) sinh((n + 2)η/2).

   For n = 5: F₅ = √31682/80 = 2.2249297741726591…, attained at cos 5θ = 12√2/127.

## How the three-vortex result was corrected

The results changed twice on the way, and the paper states only the final version.

- **First correction.** An early witness gave a minimum near 1.741. It came from a quotient built with Gotoda's Eq. (3.3) for the rotation rate B. That formula, as printed in arXiv v1 (2002.09624), has a typo:
  - The factor (Γ₁² + Γ₂²)(Γ₂λ₁ + Γ₁λ₂) should read (Γ₁ + Γ₂)(Γ₁²λ₁ + Γ₂²λ₂).
  - With that change, (3.3) matches direct Biot–Savart to 10⁻³¹. The two forms coincide when Γ₁ = Γ₂, which is why the error only shows for unequal circulations.
  - Checked 2026-09-23 against the uploaded arXiv PDF. The journal version was not seen, so the paper does not mention the typo.
- **Second correction.** The corrected formula was then minimized on 𝓑 only, which gives 2.2039. For Γ₁ ≠ Γ₂ the opposite orientation also collapses. Its critical point, cos θ ≈ −0.924, had been set aside as "expanding", but that holds only when sin θ > 0. The minimum over the whole family is 1.0647. The earlier drafts in `identities/sources/` carry dated correction notes.

## What the verification covers

There are two programs, and both need `mpmath` and `sympy`.

- `python3 research/verify_general_mu.py` checks the general-μ theory and everything else the paper says was checked, and exits with an error if any check fails. It runs 115 checks in about 30 s, and its output is in `artifacts/verify-general-mu-2026-09-23.txt`. The output also contains an argument not used in the paper: Q(μ, ·) is irreducible for every rational μ ≠ 1, shown via an elliptic curve of rank 0. That argument has not been refereed.
- `python3 research/verify_floors_independent.py --json research/artifacts/verify-floors-independent-2026-09-23.json` checks μ = 1/2 and the rings. It takes about a minute. It prints a JSON of numbers and booleans and does not fail by itself, so read the booleans.

`python3 research/plot_minimal_winding.py` redraws the figure.

What `verify_general_mu.py` covers, by section of its output:

- **1–3, exact (SymPy).** Lemma 3 for all three vortices and general μ, the arcs, the derivative (9), the elimination to Q, and its discriminant.
- **5–7, Biot–Savart at 30–60 digits.** Lemma 3 on a fixed 6 × 6 grid of (μ, θ) and on 30 triangles built independently of the positions (5). A fourth-order Runge–Kutta integration. The arc minima by direct minimization on 26 values of μ (absolute agreement with the roots of Q: 4.5 × 10⁻²¹, limited by the minimizer's step tolerance at μ = 10⁻⁴) and on 13 rational values (5 × 10⁻⁴⁵).
- **10, added 2026-09-24:**
  - The path length r₀√(1 + 4P²)(1 − √(1 − t/t_c)), the spiral angle arctan 2P, the distances and the rotation angle, from an integration of the equations of motion for five configurations. They agree to 2 × 10⁻¹⁰.
  - Remark 2 at μ = 1: the formula, the collapsing arcs and the minimum √2 at cos 2β = 1/3.
  - Section 4 exactly for general n: from the circulation condition (11) to formula (12), the two forms of K_n, K_n > √(2n − 1), and the table for n = 2 to 5. The reduced equations (10) and the root-of-unity sums are checked numerically against the full Biot–Savart sum for n = 2 to 10.
  - The constants 605/324, σ and X of Proposition 1, exactly.
  - Each of the 277 sextics Q(a/b, ξ²) of Remark 1, factored directly.

The μ = 1/2 checks in `verify_floors_independent.py`:

- **Three vortices.** The program generates the shapes independently of Gotoda's parametrization, fixing two vortices and moving the third around the zero-impulse circle, with 4000 shapes in 60-digit arithmetic. The three velocity quotients agree to 9 × 10⁻⁶¹, and 2000 of the 4000 shapes collapse.
  - P has two local minima over the collapsing shapes. They match the closed forms to 2 × 10⁻⁶¹ (`branchMinimaVsClosedFormsAbsDiff`).
  - The closed-form P(θ) agrees with direct evaluation on both arcs to 10⁻⁵⁹.
- **Direct integration.** A Taylor-series integration at 30 digits from the minimizing configuration shows every |z_j − z_c|² following 1 − t/t_c, and every rotation angle following −ω₀t_c ln(1 − t/t_c), to 4 × 10⁻³¹ up to 0.9 t_c.
- **Exact algebra (SymPy).** Checked exactly:
  - Lemma 3 at μ = 1/2, for all three vortices (general μ: `verify_general_mu.py`, check 1d);
  - the shape circle and zero angular impulse;
  - the ring self-similarity condition;
  - the critical cubic, the resultant, irreducibility, and K₅ and F₅.
- **Rings, n = 2 to 8.** P from Biot–Savart matches the closed form to 3 × 10⁻⁵⁸, and the numerical minima match F_n to 2 × 10⁻⁶⁰.
- **The μ = 1 limit.** Branch minima computed at μ → 1 approach √2 (`branchesVsMu`).

## Literature status

| Source | What was read | Bearing on the claims |
|---|---|---|
| Gröbli 1877 | §10, original scan | The equal-circulation formula reparametrizes his spiral coefficient. |
| Novikov and Sedov 1979 | Full text | Four- and five-vortex collapse; n = 2 is their parallelogram. No minimization. |
| Aref 1982 | Full text (purchased) | Two-ring equations and integrability. Sec. III treats equal and opposite strengths, which do not satisfy the self-similar collapse condition. |
| Koiller et al. 1985 | Full text | §11 has the two-ring circulation condition, the rates as functions of the angle, and logarithmic spirals. No minimization, no K_n, no F_n. |
| O'Neil 2007 | Full text (purchased) | Finiteness for three rings. Credits Koiller for two-ring collapse. |
| Gotoda 2021 | **arXiv v1 Sect. 2–3 read 2026-09-23** | Eq. (3.6) is exactly our positions (5). Gotoda uses the same normalization, Γ₁ ≥ Γ₂ > 0 > Γ₃. He treats the whole circle θ ∈ [0, 2π), and Fig. 1 shows collapse on both orientations. Eqs. (3.1)–(3.2) state that Γ_H = 0 and M = 0 are necessary and sufficient for self-similar collapse. Eq. (3.3) gets A right, but B as printed in v1 is wrong for Γ₁ ≠ Γ₂ (see below). No minimization of −B/(2A). |
| Aref 2010 | **Full text read 2026-09-23** (author's complimentary copy, provided by the owner) | Gives Ω (25a) and τ (25d) through the side lengths. Derives the necessary conditions γ₂ = 0 and L = 0 for self-similar motion (Sect. II B), and the zero-impulse circle and its parametrization (Eqs. 20–22). Shows the trajectories are logarithmic spirals with exponent fixed by Ωτ = P (Eq. 29c). **Never minimizes or bounds Ωτ.** The paper now credits all of this. |
| Krishnamurthy and Stremler 2018 | Author postprint (21 pages) downloaded in an earlier session, and the relevant sections read (§§3.4–3.5); see `identities/NOVELTY-AUDIT.md`, item 4, and RESEARCH.md. The copy is no longer on disk. | §3.5, eqs. (3.26)–(3.29): the normalized path length before collapse, which is √(1 + 4P²) in our notation, with a **numerical** observation that it exceeds 2. No sharp bound, no minimum over configurations. Their normalization is confirmed by Krishnamurthy, Aref and Stremler 2018, Eq. (40): for zero angular impulse the circumcircle passes through the collision point, so the circumcenter starts one circumradius from it. The paper credits the observation [11, Sect. 3.5] and states Corollary 1 as its proof. Check the section number against the journal version when a copy is at hand. |
| Aref, Rott and Thomann 1992; Newton 2001 | Bibliographic data verified | History and general theory. |
| Tavantzis and Ting 1988; Leoncini et al. 2000; Aref 1979 | Abstracts | Context only. |
| **Demina and Kudryashov 2014** | **Abstract only** | **Closest prior work for the rings.** Explicit double-ring configurations of two regular polygons with arbitrary circulations. Must be read in full before submission. |

Later and related papers. The first four were read on 2026-09-24 from copies the owner downloaded, which are not committed. For each, the abstract, the introduction and every section on collapse or self-similar motion were read in full, and the rest was searched for rotation, spirals, path length, collapse time and bounds.

| Source | Read | Bearing on the claims |
|---|---|---|
| Borisov and Lebedev, "Dynamics of three vortices on a plane and a sphere III: noncompact case, problems of collapse and scattering", *Regul. Chaotic Dyn.* 3(4) (1998); arXiv nlin/0503057 | Relevant sections, rest searched | The collapse conditions (the harmonic condition and D = 0) and the homogeneous solutions M_k = C_k τ. Its angular velocities are only for the equilateral and collinear relative equilibria. No rotation during collapse, no spiral, no path length, no minimum. **Does not anticipate the results.** |
| Krishnamurthy, Aref and Stremler, "Evolving geometry of a vortex triangle", *Phys. Rev. Fluids* 3 (2018) 024702; arXiv:1706.00731 | Relevant sections, rest searched | The collapse time through the triangle's angles, Eq. (46b); L = 0 and γ₂ = 0 are necessary and sufficient for self-similar motion; for L = 0 the circumcircle passes through the center of vorticity, Eq. (40). No rotation rate, spiral or minimum. **Does not anticipate the results.** |
| Demina and Kudryashov, "Multi-particle dynamical systems and polynomials", *Regul. Chaotic Dyn.* 21 (2016); arXiv:1407.1641 | Relevant sections, rest searched | A polynomial method for integrating multi-particle systems. Point vortices appear only in the introduction, which cites their 2014 paper for collapse. No rings and no rates. **Does not anticipate the results, and does not replace the 2014 paper.** |
| Drivas, Khanikati and Khanikati, "On the collapse of three point vortices on surfaces" (2026); arXiv:2607.16490 | Relevant sections, rest searched | Every three-vortex collapse on the plane or the sphere is self-similar (Theorem 1.1). Its review of planar collapse cites Leoncini et al. 2000, Krishnamurthy and Stremler 2018 and Aref 2010, and states no bound on the rotation or the path length. **Does not anticipate the results.** The paper now cites Theorem 1.1 to extend Corollary 1 to every collapse. |
| Kudela, "Self-similar collapse of n point vortices", *J. Nonlinear Sci.* (2014), doi:10.1007/s00332-014-9207-8 | Search summaries only | Numerical self-similar collapse of n vortices. An older ledger entry (2026-09-19/20, from summaries) says it minimizes the collapse time, not P. arXiv:1512.05116, "Collapse of n vortices", is a different, related paper and not a free copy of this one. |
| Reinaud, Dritschel and Scott, *Physica D* 434 (2022) 133226, "Self-similar collapse of three vortices in the generalised Euler and quasi-geostrophic equations" | Search summaries only | Collapse conditions and collapse time in generalized models. An older ledger entry, from summaries and a St Andrews preprint, says it minimizes the collapse time, not P. Reported to be open access through the St Andrews repository; not confirmed from this session. |
| "Intrinsic dynamical shadowing of point vortices and finite time singularities" (2026); arXiv:2609.25989 | Search summary only | The reverse collapse route. Probably context only. |

Searches for the numbers and the sextic found only this repository. That is weak evidence, because many publisher hosts were unreachable. See the RESEARCH.md ledger for 2026-09-23, entries A–E.

## Before submission

The submission package is in [`submission/`](submission/): arXiv metadata (categories, MSC, a TeX abstract under the 1920-character limit, CC BY 4.0 license), an endorsement request and a cover letter for *Regular and Chaotic Dynamics*. The author's contact email is kept out of this public repository; the author keeps private copies of the PDF and the LaTeX source with the email for arXiv and the journal, described in [`submission/PRIVATE-COPIES.md`](submission/PRIVATE-COPIES.md).

Still open:

1. **Read Demina and Kudryashov (2014) in full.** It is the main remaining priority risk, and only for the rings; it needs a library login or a purchase. The other unread items are lower risk: the full texts of Kudela (2014) and Reinaud, Dritschel and Scott (2022), which the ledger records as minimizing the collapse time rather than P, and of the cited Tavantzis and Ting (1988), Kimura (1987) and Aref (1979), known here from abstracts. Krishnamurthy and Stremler (2018) §3.5 is covered by the earlier read of their postprint and is credited in the paper; confirm the section number against the journal version (Math-Net.Ru may host it) if a copy turns up.
2. **Gotoda's parametrization** was checked against arXiv v1: it is identical. The paper cites it as [7, Sect. 3], which uses no equation numbers in case the journal numbering differs.
3. **Endorsement:** start the arXiv submission to get a code, then send [`submission/endorsement-request.md`](submission/endorsement-request.md) to one established physics.flu-dyn author.
4. **Journal:** most journals take LaTeX or Word, and the LaTeX version above is ready. A journal class sets the title block, abstract, keywords and references in its own way, so those parts, and any required declarations, need adapting; the body and the mathematics carry over. Fill in the suggested reviewers in the cover letter.

## Not claimed

- No new dynamical family. Both families are classical.
- No name on any result, and no `IDENTITIES.md` row from this work.
- The literature verdicts cover only the texts read. They do not certify novelty.
- No copyrighted publisher PDF is in the repository.
