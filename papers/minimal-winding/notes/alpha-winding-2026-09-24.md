# A sharp winding bound in the alpha-models: companion note

This was the repository's working note for the draft preprint *A sharp winding bound for the self-similar collapse of three point vortices in the α-models* (Chase Hendrick), kept as its record. By the owner's decision (2026-09-25) that draft was merged into the minimal-winding paper, *Minimal Winding in the Self-Similar Collapse of Point Vortices*, where its results are Section 4 (Lemmas 4 to 6, Theorem 2, Corollary 2, Remarks 4 and 5) and part of Section 7. Numbering below is the draft's: its Lemmas 2 and 3 are now Lemmas 5 and 6, its Theorem 1 is Theorem 2, its Remarks 1 and 2 are Remarks 4 and 5, and its Section 5 is Section 7.

- Paper source: [`../paper/minimal-winding.tex`](../paper/minimal-winding.tex) (LaTeX, the manuscript), with a Typst copy of the same text, [`../paper/minimal-winding.typ`](../paper/minimal-winding.typ); keep the two in step
- Paper PDF: [`../paper/minimal-winding.pdf`](../paper/minimal-winding.pdf), the LaTeX build, which `sh tools/paper-build.sh minimal-winding` remakes
- Verification programs: [`../code/verify_alpha_winding.py`](../code/verify_alpha_winding.py), with output [`../data/verify_alpha_winding.txt`](../data/verify_alpha_winding.txt); [`../code/verify_alpha_extension.py`](../code/verify_alpha_extension.py); [`../code/verify_alpha_equal_circulations.py`](../code/verify_alpha_equal_circulations.py), which replaces `symmetric_family.py` of the research folder; and [`../code/verify_many_vortices.py`](../code/verify_many_vortices.py), which checks the 33- and 61-vortex configurations now stored in [`../data/`](../data/)

Cite the person, Chase Hendrick, not the GitHub handle. No result here carries a personal name.

## Results

The model is dz_j/dt = (i/2π) Σ Γ_k (z_j − z_k)/|z_j − z_k|^(2β), with β = 1 + α/2. Here α = 0 is Euler and α = 1 is SQG. P = |Im κ|/(2|Re κ|) is the rotation per unit decrease of ln λ², where λ is the size. For α = 0 it equals the first paper's |ω₀|t_c. For other α, |ω₀|t_c = P/β.

1. **Lemma 2 (circulations).** A self-similar motion that changes size needs a scalene, non-collinear triangle, with Γ_i = c r_i²/(f_j − f_k), where f = r^(−2β) and the indices are cyclic. Exactly one orientation of each such triangle collapses. On scalene triangles this is equivalent to zero angular impulse together with Σ Γ_jΓ_k r_i^(−α) = 0; for α = 0 that sum becomes the harmonic condition Σ Γ_jΓ_k = 0.
2. **Lemma 3 (rates).** 2π Im κ is half the sum of the isolated pair rates, and P = |S|/(8·Area), where S = Σ_cyc r_i² coth(β ln(r_k/r_j)). The circulations drop out.
3. **Theorem 1.** For every α > −1 (every kernel whose velocity decays with distance), P > √(3+α)/(2+α), sharp and not attained. The bound is approached by a weak opposite-signed dipole spiralling into a strong vortex. Corollary 1 gives the path ratio (4+α)/(2+α), the spiral angle arccos((2+α)/(4+α)), and |ω₀|t_c > 2√(3+α)/(2+α)².
4. **Section 5 (Euler, N ≥ 4, numerical).** Four vortices reach P₄ = 0.7978967838…, a strict local minimum. Two-arm families reach P = 0.5172291322… at N = 33 and 0.4981844392… at N = 61. Whether P can tend to 0 as N grows is open.

## How each claim was checked

The explorer derived the proof, a separate checker verified it, and it was then re-derived and re-checked from scratch for this draft (`verify_alpha_winding.py`, sections 1 to 6):

- **Lemmas 2 and 3:** Biot–Savart on 700 random triangles, relative error at most 3·10⁻³⁸.
- **Exact identities:** every exact identity of the proof checks in SymPy.
- **The inequality chain:** 20,000 random points, run with precision adapted to ρ^(2β).
- **Sharpness:** near-extremal configurations.
- **α ≤ −1:** the scan there, which is not claimed as a result.

Two traps: in double precision, step (i) appears to fail at small ρ and large β, and the α ≤ −1 scan dips below the bound. Both are rounding errors, and both disappear once the precision grows with |ln ρ|.

The N-vortex data and their checks are in [`generalizations-2026-09-24/`](../../../research/generalizations-2026-09-24/).

## Range of the theorem

The first version of the proof needed α > −0.896, because its m ≥ 2 case used the crude bound 12β² − 3β − 2 > 0. Keeping m in that case gives D(m) = ((1+β)m − 2)² + (1 + 6β − βm² − m)/3, which is convex and increasing from m = 2, where D(2) = 4β² + (2β − 1)/3 > 0. So the proof now covers every β > 1/2, that is α > −1, which is exactly where the velocity decays with distance. Check [2] verifies D symbolically; check [3] now samples β from just above 1/2.

## Below α = −1

Remark 1 extends the theorem to α ≥ −59/40 with one computer-assisted step: `verify_alpha_extension.py` subdivides 0.2622 ≤ β ≤ 1/2, 3/2 ≤ m ≤ 2 in interval arithmetic (1205 boxes, all resolved). Remark 2 adds the exact α = 2 equal-circulation formula and the exact SQG endpoint, checked by `generalizations-2026-09-24/checks/symmetric_family.py`. The paper now ends with an Open problems section.

## Read

- **Badin and Barry 2018** (arXiv:1805.10127), read in full. They derive the necessary conditions for collapse in Nambu form. For SQG they show collapse is self-similar when H = 0 and not self-similar when H ≠ 0. For circulations (1, −Γ, 1) they find self-similar SQG collapse exactly for 0.387464… < Γ < 1/2 (their Lemma 1). There is no rotation, spiral or winding bound, so the theorem is not anticipated. Lemma 2 reproduces their interval and their H = 0 side ratio 0.751484 at Γ = 0.49 (check [7] of `verify_alpha_winding.py`), and the paper credits them for this.

- **Chen and Liu 2024** (Physica D 470, 134392): abstract and introduction read (the owner pasted them; the full text is blocked here). They give necessary and sufficient conditions that depend only on the strengths, explicit solutions in Jacobi coordinates (Theorems 2.1–2.2), and the SQG interval analytically (Theorem 4.1). They state no rotation or winding result. Their introduction quotes Reinaud 2021's SQG collapse time in side lengths, which has the form of Lemma 2's Re κ at α = 1, and Donati and Godard-Cadillac's general-α spiral (A.19). Both are now credited. Sections 2–4 are unread; compare Theorems 2.1–2.2 with Lemmas 2–3 before submission.
- **Iwayama and Yajima 2023** (JPSJ 92, 084401, open access), read in the parts that matter. It is a linear stability analysis: collapse is unstable and expansion stable. The solution f(t) = (1 − τ/τ*)^((1 + iB/A)/(4 − α)) comes from Yasunaga, Otobe and Iwayama 2021 (JPSJ 90, 124401), and Appendix A only defines A + iB (our κ) through the velocities. B/A is never evaluated, bounded or minimized, so the theorem is not anticipated. Both papers are credited for the spiral form.
- **Donati and Godard-Cadillac 2023** (Nonlinearity 36, 5773; arXiv:2111.14230), Appendix A read. (A.19) is exactly the self-similar spiral, x_j(t) = x_j(0)((T−t)/T)^(1/(α+1)) exp(−iDT ln((T−t)/T)); their α is ours + 1, and Euler is α = 1. A.2 constructs one right-triangle three-vortex collapse for every α. They do not bound D·T.
- **Godard-Cadillac, C. R. Math. 361 (2023) 355–362** (open access), read. It gives Hölder regularity for three-vortex mono-scale collapses in the α-models and says nothing on rotation, so it is not cited.
- **Iwayama, Yajima and Watanabe 2025** (J. Phys. A 58, 075701) is cited from its abstract (non-self-similar collapse); read it before submission.
- **The paper itself no longer states what was read** (the owner's choice). It says only that no bound on the winding was found in the literature, and it no longer claims that the circulation and winding formulas are absent from Chen and Liu. This note is the record.

## Before submission

- **Read Chen and Liu 2024 Sections 2–4** (Physica D 470, 134392; paywalled). Theorems 2.1–2.2 may overlap Lemmas 2–3.
- **Read Reinaud 2021** (GAFD 115, 369–392). It covers the SQG case.
- **Read the relevant parts of Reinaud, Dritschel and Scott 2022 again.**
- **Read O'Neil 2007** (RCD 12, 117–126) and **O'Neil's 1985 thesis**. They are the priority risk for the four-vortex value in Section 5.
- **If any of these states the bound or the formula for P,** credit it and cut the claim. Record every reading in `RESEARCH.md`.
