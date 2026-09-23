# Minimal winding in self-similar point-vortex collapse: companion note

This is the repository's working note for the paper *Minimal winding in the self-similar collapse of three point vortices and of two concentric vortex polygons* (Chase Hendrick). The paper is the reviewed version and is meant to be posted as its first public version (v1). This note keeps what the paper leaves out: how the results were found, what was corrected on the way, what the verification covers, and what is still open before submission.

- Paper source: [`unequal-mu-n5-floors-2026-09-23.typ`](unequal-mu-n5-floors-2026-09-23.typ) (Typst)
- Paper PDF: [`artifacts/unequal-mu-n5-floors-2026-09-23.pdf`](artifacts/unequal-mu-n5-floors-2026-09-23.pdf)
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
   - **Corollary 1.** |ω₀|t_c > √3/2 for every self-similar three-vortex collapse, and the bound is sharp. Equivalently, every vortex travels more than twice its initial distance from the collision point.
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

- **First correction.** An early witness gave a minimum near 1.741. It came from a quotient built with Gotoda's Eq. (3.3) for the rotation rate B. Off the equal-circulation slice, that quotient disagrees with the Biot–Savart velocities and with Gotoda's own Prop. 2.1: at θ = 0.8 it gives 1.746 where Biot–Savart gives 2.207 (see `gotoda33QuotientVsRaw` in the JSON). We have not checked whether the discrepancy is in Gotoda's printed (3.3) or in how it was transcribed here, so the paper does not mention it.
- **Second correction.** The corrected formula was then minimized on 𝓑 only, which gives 2.2039. For Γ₁ ≠ Γ₂ the opposite orientation also collapses. Its critical point, cos θ ≈ −0.924, had been set aside as "expanding", but that holds only when sin θ > 0. The minimum over the whole family is 1.0647. The earlier drafts in `identities/sources/` carry dated correction notes.

## What the verification covers

There are two programs, and both need `mpmath` and `sympy`.

- `python3 research/verify_general_mu.py` checks the general-μ theory. It runs 94 checks in about 25 s, and its output is in `artifacts/verify-general-mu-2026-09-23.txt`. The output also contains an argument not used in the paper: Q(μ, ·) is irreducible for every rational μ ≠ 1, shown via an elliptic curve of rank 0. That argument has not been refereed.
- `python3 research/verify_floors_independent.py --json research/artifacts/verify-floors-independent-2026-09-23.json` checks μ = 1/2 and the rings. It takes about a minute.

`python3 research/plot_minimal_winding.py` redraws the figure.

The μ = 1/2 checks:

- **Three vortices.** The program generates the shapes independently of Gotoda's parametrization, fixing two vortices and moving the third around the zero-impulse circle, with 4000 shapes in 60-digit arithmetic. The three velocity quotients agree to 9 × 10⁻⁶¹, and 2000 of the 4000 shapes collapse.
  - P has two local minima over the collapsing shapes. They match the closed forms to 2 × 10⁻⁶¹ (`branchMinimaVsClosedFormsAbsDiff`).
  - The closed-form P(θ) agrees with direct evaluation on both arcs to 10⁻⁵⁹.
- **Direct integration.** A Taylor-series integration at 30 digits from the minimizing configuration shows |z_j − z_c|² following 1 − t/t_c to 5 × 10⁻³¹ up to 0.9 t_c.
- **Exact algebra (SymPy).** Checked exactly:
  - Lemma 2, for all three vortices;
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
| Gotoda 2021 | arXiv version, Sect. 3, read earlier | The parametrization. Re-check Sect. 3 against the journal version before submission. |
| Aref 2010 | Author manuscript, eqs. (25) and (29), read earlier | Both rates and their product in the spiral. **Read in full before submission**, since P is the ratio of its two rates. |
| Krishnamurthy and Stremler 2018 | Abstract; §3.5 of the postprint read earlier | Distance travelled before collapse. The earlier read noted a numerical observation that the normalized distance exceeds 2, which Corollary 1 proves with the sharp constant. **Verify §3.5 and cite it.** |
| Aref, Rott and Thomann 1992; Newton 2001 | Bibliographic data verified | History and general theory. |
| Tavantzis and Ting 1988; Leoncini et al. 2000; Aref 1979 | Abstracts | Context only. |
| **Demina and Kudryashov 2014** | **Abstract only** | **Closest prior work for the rings.** Explicit double-ring configurations of two regular polygons with arbitrary circulations. Must be read in full before submission. |

Searches for the numbers and the sextic found only this repository. That is weak evidence, because many publisher hosts were unreachable. See the RESEARCH.md ledger for 2026-09-23, entries A–E.

## Before submission

The submission package is in [`submission/`](submission/): arXiv metadata (categories, MSC, a TeX abstract under the 1920-character limit, CC BY 4.0 license), an endorsement request and a cover letter for *Regular and Chaotic Dynamics*. The author's contact email is kept out of this public repository; the author has a private copy of the PDF with the email for arXiv and the journal.

Still open:

1. **Read three papers in full:** Demina and Kudryashov (2014), Aref (2010) and Krishnamurthy and Stremler (2018) §3.5. An attempt on 2026-09-23 could not reach them because the session's network policy blocks the hosting sites (people.iith.ac.in, vtechworks.lib.vt.edu, orbit.dtu.dk, link.springer.com, arxiv.org). If one of them states a minimum of Theorem 1, Proposition 1 or 2, or the √3/2 bound, cite it and narrow the Discussion sentence "We have not found … in the literature". If Krishnamurthy and Stremler observe the path-length bound (> 2) numerically, say that Corollary 1 proves it.
2. **Re-check Gotoda's parametrization** against the journal version.
3. **Endorsement:** start the arXiv submission to get a code, then send [`submission/endorsement-request.md`](submission/endorsement-request.md) to one established physics.flu-dyn author.
4. **Journal:** most journals take LaTeX or Word, so the Typst source would need a LaTeX transcription at acceptance. Fill in the suggested reviewers in the cover letter.

## Not claimed

- No new dynamical family. Both families are classical.
- No name on any result, and no `IDENTITIES.md` row from this work.
- The literature verdicts cover only the texts read. They do not certify novelty.
- No copyrighted publisher PDF is in the repository.
