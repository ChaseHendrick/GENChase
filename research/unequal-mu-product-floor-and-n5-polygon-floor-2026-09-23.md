# Minimal winding in self-similar point-vortex collapse: companion note

This is the repository's working note for the paper *Minimal winding in the self-similar collapse of three unequal point vortices and of two concentric vortex polygons* (Chase Hendrick). The paper is the reviewed version and is meant to be posted as its first public version (v1). This note keeps what the paper leaves out: how the results were found, what was corrected on the way, what the verification covers, and what is still open before submission.

- Paper source: [`unequal-mu-n5-floors-2026-09-23.typ`](unequal-mu-n5-floors-2026-09-23.typ) (Typst)
- Paper PDF: [`artifacts/unequal-mu-n5-floors-2026-09-23.pdf`](artifacts/unequal-mu-n5-floors-2026-09-23.pdf)
- Verification program: [`verify_floors_independent.py`](verify_floors_independent.py)
- Verification output: [`artifacts/verify-floors-independent-2026-09-23.json`](artifacts/verify-floors-independent-2026-09-23.json)

Cite the person, Chase Hendrick, not the GitHub handle. No result here carries a personal name.

## Results

Write P = ω₀t_c, the initial angular velocity times the collapse time. Each vortex moves on a logarithmic spiral, and P is the angle the configuration turns while the square of its size falls by the factor e.

1. **Three vortices, Γ = (1, 1/2, −1/3), zero angular impulse.** The collapsing configurations form two arcs, one per orientation of the triangle. In Gotoda's parametrization they are 𝓑 = (0, θ₀) and 𝓐 = (π, 2π − θ₀), with cos θ₀ = −√7/14, and

       P(θ) = (14 sin²θ + 6√7 cos θ + 21) / (2(14 cos θ + √7) sin θ).

   P has one critical point, a minimum, on each arc:

       min over 𝓐 = √(605/324 + R cos(⅓ arccos X − 2π/3)) = 1.0647059762712043…   (the minimum over the whole family)
       min over 𝓑 = √(605/324 + R cos(⅓ arccos X))        = 2.2038550160361327…

   Here X = 245351√5201/5201² and R = 7√5201/162. Both are roots of 8748x⁶ − 49005x⁴ + 27794x² + 18723, which is irreducible over ℚ and over ℚ(√7). They are not expressible by real radicals.
2. **Equal circulations, Γ = (1, 1, −1/2).** P = (3 − cos 2φ)/(2 sin 2φ) ≥ √2 on both collapsing arcs, with equality at cos 2φ = 1/3. This reparametrizes Gröbli's spiral coefficient and is included for comparison, not as a new result.
3. **Two concentric regular n-gons, circulations x_n and −1.** Here x_n = (n + √(2n − 1))/(n − 1) = e^a with cosh a = n/(n − 1), and

       P = (K_n − √(2n − 1) cos nθ) / (2n sin nθ) ≥ F_n = √(K_n² − (2n − 1)) / (2n),   K_n = (n − 1) sinh((n + 2)a/2).

   Equality holds at cos nθ = √(2n − 1)/K_n. For n = 5, x₅ = 2, K₅ = 127√2/8 and F₅ = √31682/80 = 2.2249297741726591…, attained at cos 5θ = 12√2/127.

## How the three-vortex result was corrected

The results changed twice on the way, and the paper states only the final version.

- **First correction.** An early witness gave a minimum near 1.741. It came from a quotient built with Gotoda's Eq. (3.3) for the rotation rate B. Off the equal-circulation slice, that quotient disagrees with the Biot–Savart velocities and with Gotoda's own Prop. 2.1: at θ = 0.8 it gives 1.746 where Biot–Savart gives 2.207 (see `gotoda33QuotientVsRaw` in the JSON). We have not checked whether the discrepancy is in Gotoda's printed (3.3) or in how it was transcribed here, so the paper does not mention it.
- **Second correction.** The corrected formula was then minimized on 𝓑 only, which gives 2.2039. For Γ₁ ≠ Γ₂ the opposite orientation also collapses. Its critical point, cos θ ≈ −0.924, had been set aside as "expanding", but that holds only when sin θ > 0. The minimum over the whole family is 1.0647. The earlier drafts in `identities/sources/` carry dated correction notes.

## What the verification covers

`python3 research/verify_floors_independent.py --json research/artifacts/verify-floors-independent-2026-09-23.json` takes about a minute and needs `mpmath` and `sympy`.

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
| Krishnamurthy and Stremler 2018 | Abstract; postprint read earlier | Collapse time and distance travelled. That distance is √(1 + 4P²) × the initial distance. |
| Tavantzis and Ting 1988; Leoncini et al. 2000; Aref 1979, 2010 | Abstracts | Context only. |
| **Demina and Kudryashov 2014** | **Abstract only** | **Closest prior work for the rings.** Explicit double-ring configurations of two regular polygons with arbitrary circulations. Must be read in full before submission. |

Searches for the numbers and the sextic found only this repository. That is weak evidence, because many publisher hosts were unreachable. See the RESEARCH.md ledger for 2026-09-23, entries A–E.

## Before submission

1. Read Demina and Kudryashov (2014) in full. If it states the ring product or its minimum, cite it and remove the ring part of the sentence "We have not found the minimal values…".
2. Re-check Gotoda Sect. 3 (the parametrization and the θ range) against the journal version.
3. arXiv:
   - Submit the PDF. arXiv accepts PDF-only submissions that are not produced from TeX, and fonts must be embedded, which Typst does.
   - Suggested category: physics.flu-dyn, cross-listed to math-ph and math.DS.
   - The abstract must be under 1920 characters; the current one is about 1400.
   - A first submission to a category needs an endorsement from an established arXiv author.
   - arXiv asks authors to report significant use of generative AI; the paper has one line for this.
4. Journal: most journals take LaTeX or Word. A LaTeX transcription of the Typst source is mechanical. Journals also want a corresponding-author email, which the PDF does not include yet.
5. Choose a license when posting to arXiv. CC BY 4.0 is compatible with most journals.

## Not claimed

- No new dynamical family. Both families are classical.
- No name on any result, and no `IDENTITIES.md` row from this work.
- The literature verdicts cover only the texts read. They do not certify novelty.
- No copyrighted publisher PDF is in the repository.
