# A sharp winding bound in the alpha-models: companion note

This is the repository's working note for the draft preprint *A sharp winding bound for the self-similar collapse of three point vortices in the α-models* (Chase Hendrick). It is a **draft**. It has not been peer reviewed and must not be submitted until the reading list below is done.

- Paper source: [`alpha-winding-2026-09-24.typ`](alpha-winding-2026-09-24.typ) (Typst, the reference text)
- Paper PDF: [`artifacts/alpha-winding-2026-09-24.pdf`](artifacts/alpha-winding-2026-09-24.pdf)
- LaTeX version: [`alpha-winding-2026-09-24.tex`](alpha-winding-2026-09-24.tex), the same text. Build it from `research/` with `pdflatex -output-directory=<scratch dir>` run three times.
- Verification program: [`verify_alpha_winding.py`](verify_alpha_winding.py), run from the repository root; its output is [`artifacts/verify_alpha_winding.txt`](artifacts/verify_alpha_winding.txt).

Cite the person, Chase Hendrick, not the GitHub handle. No result here carries a personal name.

## Results

The model is dz_j/dt = (i/2π) Σ Γ_k (z_j − z_k)/|z_j − z_k|^(2β), with β = 1 + α/2. Here α = 0 is Euler and α = 1 is SQG. P = |Im κ|/(2|Re κ|) is the rotation per unit decrease of ln λ², where λ is the size. For α = 0 it equals the first paper's |ω₀|t_c. For other α, |ω₀|t_c = P/β.

1. **Lemma 2 (circulations).** A self-similar motion that changes size needs a scalene, non-collinear triangle, with Γ_i = c r_i²/(f_j − f_k), where f = r^(−2β) and the indices are cyclic. Exactly one orientation of each such triangle collapses. On scalene triangles this is equivalent to zero angular impulse together with Σ Γ_jΓ_k r_i^(−α) = 0; for α = 0 that sum becomes the harmonic condition Σ Γ_jΓ_k = 0.
2. **Lemma 3 (rates).** 2π Im κ is half the sum of the isolated pair rates, and P = |S|/(8·Area), where S = Σ_cyc r_i² coth(β ln(r_k/r_j)). The circulations drop out.
3. **Theorem 1.** For α > α₀ = −0.8960874362…, P > √(3+α)/(2+α), sharp and not attained. The bound is approached by a weak opposite-signed dipole spiralling into a strong vortex. Corollary 1 gives the path ratio (4+α)/(2+α), the spiral angle arccos((2+α)/(4+α)), and |ω₀|t_c > 2√(3+α)/(2+α)².
4. **Section 5 (Euler, N ≥ 4, numerical).** Four vortices reach P₄ = 0.7978967838…, a strict local minimum. Two-arm families reach P = 0.5172291322… at N = 33 and 0.4981844392… at N = 61. Whether P can tend to 0 as N grows is open.

## How each claim was checked

The explorer derived the proof, a separate checker verified it, and it was then re-derived and re-checked from scratch for this draft (`verify_alpha_winding.py`, sections 1 to 6):

- **Lemmas 2 and 3:** Biot–Savart on 700 random triangles, relative error at most 3·10⁻³⁸.
- **Exact identities:** every exact identity of the proof checks in SymPy.
- **The inequality chain:** 20,000 random points, run with precision adapted to ρ^(2β).
- **Sharpness:** near-extremal configurations.
- **α below α₀:** the scan there, which is not claimed as a result.

Two traps: in double precision, step (i) appears to fail at small ρ and large β, and the α < α₀ scan dips below the bound. Both are rounding errors, and both disappear once the precision grows with |ln ρ|.

The N-vortex data and their checks are in [`generalizations-2026-09-24/`](generalizations-2026-09-24/).

## Read

- **Badin and Barry 2018** (arXiv:1805.10127), read in full. They derive the necessary conditions for collapse in Nambu form. For SQG they show collapse is self-similar when H = 0 and not self-similar when H ≠ 0. For circulations (1, −Γ, 1) they find self-similar SQG collapse exactly for 0.387464… < Γ < 1/2 (their Lemma 1). There is no rotation, spiral or winding bound, so the theorem is not anticipated. Lemma 2 reproduces their interval and their H = 0 side ratio 0.751484 at Γ = 0.49 (check [7] of `verify_alpha_winding.py`), and the paper credits them for this.

## Before submission

- **Read Chen and Liu 2024** (Physica D 470, 134392; paywalled). It gives necessary and sufficient conditions for self-similar motion of three vortices in generalized fluids. It may contain Lemma 2 or the rate formula.
- **Read Reinaud 2021** (GAFD 115, 369–392). It covers the SQG case.
- **Read the relevant parts of Reinaud, Dritschel and Scott 2022 again.**
- **Read O'Neil 2007** (RCD 12, 117–126) and **O'Neil's 1985 thesis**. They are the priority risk for the four-vortex value in Section 5.
- **If any of these states the bound or the formula for P,** credit it and cut the claim. Record every reading in `RESEARCH.md`.
