# Minimal winding in self-similar point-vortex collapse: companion note

This is the repository's working note for the paper *Minimal winding in the self-similar collapse of three point vortices and of two concentric vortex polygons* (Chase Hendrick). The paper is the reviewed version and is meant to be posted as its first public version (v1). This note keeps what the paper leaves out: how the results were found, what was corrected on the way, what the verification covers, and what is still open before submission.

- Paper source: [`unequal-mu-n5-floors-2026-09-23.typ`](unequal-mu-n5-floors-2026-09-23.typ) (Typst)
- Paper PDF: [`artifacts/unequal-mu-n5-floors-2026-09-23.pdf`](artifacts/unequal-mu-n5-floors-2026-09-23.pdf)
- LaTeX version: [`unequal-mu-n5-floors-2026-09-23.tex`](unequal-mu-n5-floors-2026-09-23.tex), the same text for arXiv and journals. It uses [`figures/minimal-winding.pdf`](figures/minimal-winding.pdf), which `plot_minimal_winding.py` writes next to the SVG. Build it from `research/` with `pdflatex -output-directory=<scratch dir>`, run three times, so no build files land in the repository. The Typst file stays the reference text, so keep the two in step.
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

- `python3 research/verify_general_mu.py` checks the general-μ theory and everything else the paper says was checked, and exits with an error if any check fails. It runs 121 checks in about 30 s, and its output is in `artifacts/verify-general-mu-2026-09-23.txt`. The output also contains an argument not used in the paper: Q(μ, ·) is irreducible for every rational μ ≠ 1, shown via an elliptic curve of rank 0. That argument has not been refereed.
- `python3 research/verify_floors_independent.py --json research/artifacts/verify-floors-independent-2026-09-23.json` checks μ = 1/2 and the rings. It takes about a minute. It prints a JSON of numbers and booleans and does not fail by itself, so read the booleans.

`python3 research/plot_minimal_winding.py` redraws the figure.

What `verify_general_mu.py` covers, by section of its output:

- **1–3, exact (SymPy).** Lemma 3 for all three vortices and general μ, the arcs, the derivative (9), the elimination to Q, and its discriminant.
- **5–7, Biot–Savart at 30–60 digits.** Lemma 3 on a fixed 6 × 6 grid of (μ, θ) and on 30 triangles built independently of the positions (5). A fourth-order Runge–Kutta integration. The arc minima by direct minimization on 26 values of μ (absolute agreement with the roots of Q: 4.5 × 10⁻²¹, limited by the minimizer's step tolerance at μ = 10⁻⁴) and on 13 rational values (5 × 10⁻⁴⁵).
- **10, added 2026-09-24:**
  - The path length r₀√(1 + 4P²)(1 − √(1 − t/t_c)), the spiral angle arctan 2P, the distances and the rotation angle, from an integration of the equations of motion for five configurations. They agree to 2 × 10⁻¹⁰.
  - Remark 2 at μ = 1: the formula, the collapsing arcs and the minimum √2 at cos 2β = 1/3.
  - At μ = 1, the fastest collapse at a fixed distance between the identical vortices (Kimura's Eq. (4.6), Leoncini et al.'s Fig. 18): cos 2β = 3/5, t_c = 4π/3 and P = 3/2 (10f). Kimura's rates, his Eq. (4.4), equal κ in the Remark 2 parametrization: κ = (A + iB)/(4π) for Γ = (1, 1, −1/2) (10g).
  - Demina and Kudryashov's Eqs. (36)–(37) at Γ₀ = 0: exactly (SymPy), (37) is the circulation condition with x = r² and (36) minus S is a multiple of it; numerically, their constant against the Biot–Savart sum for n = 2 to 8 (10h). Their seven-vortex collapse (Table 1): self-similar with the printed constant, and P = 12433/(1240√155) < √3/2 (10i).
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
| Krishnamurthy and Stremler 2018 | Author postprint (21 pages) downloaded in an earlier session, and the relevant sections read (§§3.4–3.5); see `identities/NOVELTY-AUDIT.md`, item 4, and RESEARCH.md. The copy is no longer on disk. | §3.5, eqs. (3.26)–(3.29): the normalized path length before collapse, which is √(1 + 4P²) in our notation, with a **numerical** observation that it exceeds 2. No sharp bound, no minimum over configurations. Their normalization is confirmed by Krishnamurthy, Aref and Stremler 2018, Eq. (40): for zero angular impulse the circumcircle passes through the collision point, so the circumcenter starts one circumradius from it. The paper credits the observation [14, Sect. 3.5] and states Corollary 1 as its proof. Check the section number against the journal version when a copy is at hand. |
| Aref, Rott and Thomann 1992; Newton 2001 | Bibliographic data verified | History and general theory. |
| Leoncini, Kuznetsov and Zaslavsky 2000 (arXiv physics/9908055) | **Full text read 2026-09-24** (the text layer is garbled, so key pages were read as images) | Near-collapse dynamics when two vortices are identical: the equal-circulation family. Their fastest collapse (Fig. 18, collapse time 4π/3) minimizes the collapse time at a fixed distance between the identical vortices; there P = 3/2 (checked, `verify_general_mu.py` 10f), and the √3/2 in the caption is their energy parameter Λ = e^{4πH}. **Does not anticipate the results.** The paper now says so in the Discussion. |
| Kimura, "Similarity solution of two-dimensional point vortices", *J. Phys. Soc. Jpn.* 56 (1987) 2024–2030 | **Read in full 2026-09-24** (the owner supplied a copy; key pages were also read as images) | The similarity solution z = k f(t) with f f̄′ = C = A + iB: up to the factor 2π in his circulations, C is our κ, so his spirals (3.7) and collision time t* = −1/(2A) (3.9) are ours, and P = \|B\|/(−2A). The conditions (3.20)–(3.21) and (3.33); the zero-impulse circle (3.34)–(3.35), split into two arcs of collapse and two of expansion. Sect. 4 treats Γ = (2, 2, −1) in exactly the parametrization of our Remark 2 and gives A and B (4.4), whose ratio is the Remark 2 formula (checked to 40 digits); he minimizes t* instead, at cos 2θ = 3/5 (4.6), where P = 3/2. **Never forms or bounds P, and has no general-μ minimum and no rings: does not anticipate Theorem 1 or the ring results.** The paper now credits him for the similarity solution, the circle and the Remark 2 parametrization. |
| Tavantzis and Ting 1988; Aref 1979 | Abstracts | Context only. |
| Demina and Kudryashov, "Rotation, collapse, and scattering of point vortices", *Theor. Comput. Fluid Dyn.* 28 (2014) 357–368 | **Read in full 2026-09-24** (bought by the owner; two independent readings from the page images, a numerical check, two referees and a reconciliation) | Sect. 3 gives the two-ring collapse family with an optional central vortex Γ₀. At Γ₀ = 0 their Eq. (37) is our circulation condition with x = r², and their Eq. (36) is our constant S as a function of e^{inθ} (identical modulo the circulation condition; `verify_general_mu.py` 10h). They state that every relative rotation other than e^{inθ} = ±1 collapses or scatters, without saying which; for this family they never separate the two rates or evaluate their ratio, and they minimize or bound nothing. No three-vortex computation. Their Table 1 seven-vortex collapse has P = 12433/(1240√155) = 0.805 < √3/2 (10i), which shows that Corollary 1 does not carry over to larger systems. **Does not anticipate any result.** The paper now credits them in the Introduction, Section 2, Lemma 2, Section 4 and the Discussion. |

Later and related papers. The first four were read on 2026-09-24 from copies the owner downloaded, which are not committed. For each, the abstract, the introduction and every section on collapse or self-similar motion were read in full, and the rest was searched for rotation, spirals, path length, collapse time and bounds.

| Source | Read | Bearing on the claims |
|---|---|---|
| Borisov and Lebedev, "Dynamics of three vortices on a plane and a sphere III: noncompact case, problems of collapse and scattering", *Regul. Chaotic Dyn.* 3(4) (1998); arXiv nlin/0503057 | **Read in full 2026-09-24** (two independent readings) | The collapse conditions (the harmonic condition and D = 0) and the homogeneous solutions M_k = C_k τ. Its angular velocities are only for the equilateral and collinear relative equilibria. No rotation during collapse, no spiral, no path length, no minimum. **Does not anticipate the results.** Cited in the paper (Introduction; Lemma 2, see also) since v0.6.1. |
| Krishnamurthy, Aref and Stremler, "Evolving geometry of a vortex triangle", *Phys. Rev. Fluids* 3 (2018) 024702; arXiv:1706.00731 | **Read in full 2026-09-24** (two independent readings) | The collapse time through the triangle's angles, Eq. (46b); L = 0 and γ₂ = 0 are necessary and sufficient for self-similar motion; for L = 0 the circumcircle passes through the center of vorticity, Eq. (40). No rotation rate, spiral or minimum. **Does not anticipate the results.** Cited in the paper since v0.6.1 (Introduction, and Eq. (40) for the Krishnamurthy–Stremler normalization). The equation numbers are those of arXiv v2; check them against the journal version before a journal submission. |
| Demina and Kudryashov, "Multi-particle dynamical systems and polynomials", *Regul. Chaotic Dyn.* 21 (2016); arXiv:1407.1641 | Relevant sections, rest searched | A polynomial method for integrating multi-particle systems. Point vortices appear only in the introduction, which cites their 2014 paper for collapse. No rings and no rates. **Does not anticipate the results, and does not replace the 2014 paper.** |
| Drivas, Khanikati and Khanikati, "On the collapse of three point vortices on surfaces" (2026); arXiv:2607.16490 | Relevant sections, rest searched | Every three-vortex collapse on the plane or the sphere is self-similar (Theorem 1.1). Its review of planar collapse cites Leoncini et al. 2000, Krishnamurthy and Stremler 2018 and Aref 2010, and states no bound on the rotation or the path length. **Does not anticipate the results.** The paper now cites Theorem 1.1 to extend Corollary 1 to every collapse. |
| Kudela, "Self-similar collapse of n point vortices", *J. Nonlinear Sci.* (2014), doi:10.1007/s00332-014-9207-8 | Search summaries only | Numerical self-similar collapse of n vortices. An older ledger entry (2026-09-19/20, from summaries) says it minimizes the collapse time, not P. arXiv:1512.05116, "Collapse of n vortices", is a different, related paper and not a free copy of this one. |
| Kudela, "Collapse of n point vortices, formation of the vortex sheets and transport of passive markers", *Energies* 14 (2021) 943 (open access) | **Text read in full 2026-09-24**, as a free stand-in for the 2014 paper | Restates the self-similar solution of his 2014 papers as a logarithmic spiral, z_k(t) = √(1 − t/T_c) e^{−iλ_i T_c ln(1 − t/T_c)} z_k(0) (Eqs. 14–16), whose coefficient is ±P, without naming, bounding or minimizing it. Numerical n = 50 collapse configurations found by Newton's method, traced in the Hamiltonian, forming vortex sheets. No bound, no minimum, no rings. **Does not anticipate the results.** It is indirect evidence about the 2014 paper, not a substitute for reading it. |
| Reinaud, Dritschel and Scott, *Physica D* 434 (2022) 133226, "Self-similar collapse of three vortices in the generalised Euler and quasi-geostrophic equations" | **Point-vortex sections read 2026-09-24** (open access, CC BY; the owner downloaded it) | Collapse conditions and the collapse time τ (Eq. 17) in generalized Euler and QG models with parameter β. They map τ over the collapsing configurations with κ₁ = 1 and s₃ = 1 (the like-signed pair's separation fixed) for β = 0.25–1.5, and τ has local minima (Fig. 3). Those minima depend on that normalization, whereas P does not. Nothing on the rotation rate, P, spirals beyond a remark, or bounds. **Does not anticipate the results.** Cited in the Discussion since v0.6.1. |
| Gallay and Šverák, "The three-vortex system: Hopf fibration, symplectic reduction, and near-collisions" (2026); arXiv:2609.10847 | **Read in full 2026-09-24** (62 pages, two independent readings; key pages checked as images) | Every three-vortex collision is a self-similar collapse z_j(t) = (1 − t/T)^(1/2 + is) a_j (Prop. 5.2, a complete proof they call well known). The rates are in closed form on the zero-impulse circle (5.10), (5.11), (E.1), and s ≠ 0 (Remark E.2). In our notation T = t_c and s = −ω₀t_c, so \|s\| = P: P is written down there, implicitly, as a function of the shape. Collisions are regularizable only up to rotations, because the triangle makes infinitely many turns (Sect. 5.2); whether they are regularizable at all depends on the perturbation (Theorems 5.8, 5.10, 5.15). **They never bound or minimize \|s\| beyond s ≠ 0, and have no rings: does not anticipate the results.** Both readers recomputed the minima of \|s\| from Gallay and Šverák's own formulas and got Theorem 1's values (√2 at μ = 1; 1.0647059762 and 2.2038550160 at μ = 1/2). The paper now cites Prop. 5.2, (E.1), and the regularization question, where Corollary 1 sharpens s ≠ 0 to \|s\| > √3/2. |
| Anurag and Goodman, "Phase portraits and the bifurcation set for the three-vortex interaction system" (2026); arXiv:2504.16038v2 | **Read in full 2026-09-24** (two independent readings) | A Jacobi and Lie–Poisson reduction that removes translations and rotations. At Γ = (2/3, 2/3, −1/3), zero angular impulse, collapsing and expanding triangles are rays through the triple-collision point (Sect. 5.1, Fig. 5.6). The rotation, and with it P, is removed by the reduction, so P cannot appear. No rates, bounds or rings. **Does not anticipate the results. Context only; not cited** (a short citation beside Borisov and Lebedev would be reasonable if a referee asks). |
| "Intrinsic dynamical shadowing of point vortices and finite time singularities" (2026); arXiv:2609.25989 | Search summary only | The reverse collapse route. Probably context only. |

Searches for the numbers and the sextic found only this repository. That is weak evidence, because many publisher hosts were unreachable. See the RESEARCH.md ledger for 2026-09-23, entries A–E.

## Before submission

The submission package is in [`submission/`](submission/): arXiv metadata (categories, MSC, a TeX abstract under the 1920-character limit, CC BY 4.0 license), an endorsement request and a cover letter for *Regular and Chaotic Dynamics*. The author's contact email is kept out of this public repository; the author keeps private copies of the PDF and the LaTeX source with the email for arXiv and the journal, described in [`submission/PRIVATE-COPIES.md`](submission/PRIVATE-COPIES.md).

Still open:

1. **Remaining reading.** Demina and Kudryashov (2014) and Kimura (1987) were read in full on 2026-09-24 and are credited. A completeness sweep the same day (RESEARCH.md entry N) mined the reference lists of every paper read and searched for later work. It recommends, before submission:
   - **Status on 2026-09-24:** Conte and de Seze, Hernández-Garduño and Lacomba, and Grotto, Romito and Viviani were read (RESEARCH.md entry O) and are cited (#139). O'Neil 1987 was read in entry Q and bears on neither result. What remains is Stremler (2021), the zero-impulse section of Tavantzis and Ting (1988), and the optional items below.
   - **Must read:** Stremler, "Something old, something new: Three point vortices on the plane", *Regul. Chaotic Dyn.* 26 (2021) 482–504 (a review by the senior author of the path-length observation that Corollary 1 proves; paywalled); Conte and de Seze, *Mod. Phys. Lett. B* 29 (2015) 1530017, arXiv:1511.00069 (an exact solution for arbitrary circulations covering the spiral collapse; free); Tavantzis and Ting (1988), the zero-impulse section (cited from its abstract).
   - **Cite after reading the main theorem:** Hernández-Garduño and Lacomba, *J. Math. Fluid Mech.* 9 (2007) 75–86, arXiv:math-ph/0412024 (only self-similar motions reach a total collision); Hiraoka 2008 (*Nonlinearity*) and 2009 (RIMS Kokyuroku Bessatsu); Synge 1949 (*Canad. J. Math.*); Grotto, Romito and Viviani, arXiv:2307.05133.
   - **Optional:** O'Neil 2007 (*Regul. Chaotic Dyn.* 12, four-vortex collapse), Chen and Liu 2024 (*Physica D*), and the reviews [4] and [16].
   - **Not needed:** Aref (1979), now cited only for the rediscovery, and Kudela (2014), whose 2021 restatement was read.
   Krishnamurthy and Stremler (2018) §3.5 is covered by the earlier read of their postprint and is credited in the paper; confirm the section number against the journal version if a copy turns up.
2. **Gotoda's parametrization** was checked against arXiv v1: it is identical. The paper cites it as [9, Sect. 3], which uses no equation numbers in case the journal numbering differs.
3. **Endorsement:** start the arXiv submission to get a code, then send [`submission/endorsement-request.md`](submission/endorsement-request.md) to one established physics.flu-dyn author.
4. **Journal:** most journals take LaTeX or Word, and the LaTeX version above is ready. A journal class sets the title block, abstract, keywords and references in its own way, so those parts, and any required declarations, need adapting; the body and the mathematics carry over. Fill in the suggested reviewers in the cover letter.

## Not claimed

- No new dynamical family. Both families are classical.
- No name on any result, and no `IDENTITIES.md` row from this work.
- The literature verdicts cover only the texts read. They do not certify novelty.
- No copyrighted publisher PDF is in the repository.
