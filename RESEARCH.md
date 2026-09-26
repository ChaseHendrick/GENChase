# RESEARCH

Ledger of prior-article searches and physics claims for GENChase. Handwritten, not generated. Last updated 2026-09-24.

Agents: read this file **before** a web search for "has this been done", "is this a new law", or "never been theorized". Humans: the same, if you are about to spend an afternoon proving a negative.

The catalog of what the file actually contains is [`techniques.json`](techniques.json). Derived identities live in [`IDENTITIES.md`](IDENTITIES.md). This file is only about what was looked up, what was derived, and what was not.

## Current novelty status

**Confirmed novel findings among the five candidates: 0.** Mathematical proofs and numerical checks establish validity, not historical originality. The fifth contains the second and fourth; there are not four confirmed discoveries remaining after correcting the first.

The [2026-09-20 audit of all five candidates](identities/NOVELTY-AUDIT.md) supersedes earlier unqualified first-discovery or uniqueness assertions in this chronological ledger. The first formula explicitly specializes Gröbli’s 1877 spiral coefficient; priority of the optimized minima remains unconfirmed. The [follow-up comparison](identities/ORIGINALITY-FOLLOWUP.md) supplies the substitution. The personal name has been retired in favor of Three-vortex collapse bound. Their families and the spin–collapse product are classical; the exact minima were not located in the sources inspected. The fifth contains the second and fourth. Old skip decisions and rejected-family claims below are historical search notes, not current novelty certifications.


## 2026-09-23 — proved candidates (priority unconfirmed)

Two algebraic floors were derived and Float64-verified on this box. **Neither is stamped into IDENTITIES.md.** Confirmed novel findings among the original five candidates remain **0**. These notes correct a bad μ≠1 witness and record an explicit n=5 specialization plus a full-text Koiller read.

### A. Unequal-μ three-vortex product floor (μ = 1/2)

Circulations Γ = (1, 1/2, −1/3) on Gotoda’s L = 0 collapsing arc. Product from the 2π Biot–Savart / Prop. 2.1 kernel (not Gotoda (3.3) B):

    P(θ) = (14 sin²θ + 6√7 cosθ + 21) / [2(14 cosθ + √7) sinθ]
         ≥ P⋆ ≈ 2.203855016036133

Equality at the unique collapsing-arc critical cosine (cubic in cos θ). Closed form:

    P⋆ = √(605/324 + (7√5201)/162 · cos(⅓ arccos(245351√5201 / 5201²)))

Minpoly over ℚ: 8748 x⁶ − 49005 x⁴ + 27794 x² + 18723 = 0 (casus irreducibilis). μ ↔ 1/μ shares the product.

**Correction.** The adjacent-open / skip-table figure ≈1.741 used Gotoda (3.3) B, which disagrees with Prop. 2.1 when Γ₁ ≠ Γ₂. That witness is withdrawn. The corrected floor is ~2.204.

**Second correction (2026-09-23, later).** P⋆ ≈ 2.2039 is the minimum on Gotoda’s arc 0 < θ < θ₀ only. For Γ₁ ≠ Γ₂ the L = 0 family has a second collapsing branch, the opposite triangle orientation (π < θ < 2π − θ₀ in the same parametrization), whose minimum is lower: P_min ≈ 1.064705976271204, the other positive root of the same sextic, = √(605/324 + (7√5201)/162 · cos(⅓ arccos(245351√5201 / 5201²) − 2π/3)). So the μ = 1/2 floor is P_min, not P⋆. The critical point was in the earlier derivation (cos θ ≈ −0.924) but was set aside as expanding; that holds only for sin θ > 0. Independent Biot–Savart validation, including direct time integration and the μ → 1 limit (both branches → √2): `papers/minimal-winding/code/verify_floors_independent.py`; note: `papers/minimal-winding/paper/minimal-winding.pdf`.

**Status.** Proved candidate; priority unconfirmed. Same classical L = 0 family as √2. RESEARCH already forbids stamping μ≠1 as a new identity row. See `identities/sources/unequal-mu-half-draft-2026-09-23.md`, `identities/sources/unequal-mu-half-Pstar-closed-2026-09-23.md`, `tools/verify-unequal-mu-half.js`.

### B. Explicit n = 5 polygon / two-ring floor

Specialize the classical two-ring family (Koiller §11; candidate 5) at n = 5:

    ω₀ t_c = (127√2 − 24 cos(5θ)) / (80 sin(5θ))
           ≥ √31682 / 80 ≈ 2.224929774172659

Equality at cos(5θ⋆) = 12√2 / 127. Parallel to the already-written F₂, F₃, F₄ radicals; first explicit cleared radical for n = 5 in-repo.

**Status.** Proved candidate; priority unconfirmed. Specialization of candidate 5, not a sixth independent discovery. See `identities/sources/new-formula-candidate-2026-09-23.md`, `tools/verify-new-formula-candidate.js`, and the F₅ note in `identities/polygon-collapse.md`.

### C. Koiller et al. 1985 full-text read

Full Physica D 16 (1985) 27–61 was reconstructed and read on this box (35 pages). §11 Prop. 12 + (11.1)–(11.5): two-ring virial collapse and logarithmic-spiral rates as functions of fixed relative angle. **Does not** state √29/3, √322/9, equality cosines for the optimized floors, general F_n, or a pitch/product min over angle. Verdict: **does not kill** candidates 4–5 optimized floors. Family classical; optimized floors still priority-unconfirmed. Residual kill risk: Aref 1982 and O’Neil 2007 full texts. Notes: `identities/sources/koiller1985-read-2026-09-23.md` (analysis only; copyrighted PDF not committed).

### D. Open-web / OA sweep (same day)

Live indexed searches did not hit the radicals, P⋆ closed form, or equality angles as prior statements. Absence of an OA hit is **not** novelty. Details: `identities/sources/internet-search-2026-09-23.md`, `identities/sources/internet-search-live-2026-09-23.md`.

### E. Paper v1 and citation check (same day)

The two results are written up as one paper, `papers/minimal-winding/paper/minimal-winding.typ` (PDF beside it, `papers/minimal-winding/paper/minimal-winding.pdf`), with self-contained proofs. It also proves the equal-circulation case: for Γ = (1, 1, −1/2), P = (3 − cos 2φ)/(2 sin 2φ) ≥ √2 on both collapsing arcs, a reparametrization of Gröbli's spiral coefficient. The two-ring product is written as (K_n − √(2n − 1) cos nθ)/(2n sin nθ) with K_n = (n − 1) sinh((n + 2)a/2), cosh a = n/(n − 1); Koiller et al. §11 already has the circulation condition and the rates as functions of the angle, so only the constant and the minimum are claimed.

Citation check: Gotoda is J. Dyn. Differ. Equ. 33 (2021) 1759–1777. Gröbli's dissertation was a Göttingen degree printed in Zürich (1877). Tavantzis–Ting (1988) give the contracting and expanding K = 0 families and their stability. Krishnamurthy–Stremler (2018) relate the collapse time and the distance travelled before collapse to the triangle; that distance is √(1 + 4P²) times the initial distance. **Demina–Kudryashov, TCFD 28 (2014) 357–368, is the closest prior work:** its abstract gives explicit double-ring configurations of two regular polygons with arbitrary circulations. Its full text is unread, and it must be read before any submission claims the ring minimum. Searches for 1.0647, 2.2039, the sextic, √31682/80 and 2.22493 found nothing but this repository. Many publisher and archive hosts were blocked from the session, so this is weak evidence of absence.

### F. General circulation ratio and the √3/2 bound (same day)

The paper now covers every circulation ratio. Any self-similar three-vortex collapse normalizes to Γ = (1, μ, −μ/(1+μ)) with 0 < μ ≤ 1. For each μ, each collapsing arc (one per orientation of the triangle) has one critical point of P = |ω₀|t_c, and the squared minima are roots of an explicit cubic Q(μ, y), irreducible over ℚ[μ, y], which gives the μ = 1/2 sextic at μ = 1/2 and (y − 2)² at μ = 1. The least winding P₋(μ) increases strictly from √3/2 (μ → 0, not attained) to √2 (μ = 1). So every self-similar three-vortex collapse has |ω₀|t_c > √3/2, sharp. Equivalently, each vortex travels more than twice its initial distance from the collision point. Proofs are in the paper. Checks:

- `papers/minimal-winding/code/verify_general_mu.py`: 94 checks, with output in `papers/minimal-winding/data/`.
- An independent re-derivation in the session: κ, P, K, the resultant, the discriminant, Res_y(Q, Q_μ), and irreducibility for all 277 μ = a/b with b ≤ 30.
- An adversarial referee pass on the μ = 1/2 version.

References added and checked: Aref, Rott and Thomann, Annu. Rev. Fluid Mech. 24 (1992) 1–21; Newton, *The N-Vortex Problem*, AMS 145 (2001). Before claiming priority, read three papers in full:

- **Aref 2010.** It gives both rates, so P is their ratio.
- **Krishnamurthy–Stremler 2018.** It covers distance travelled before collapse, which is √(1 + 4P²) × the initial distance. An earlier read of §3.5 noted a numerical observation that this normalized distance exceeds 2. That observation is exactly what the √3/2 bound proves, so check it and cite it.
- **Demina–Kudryashov 2014.**

### G. Access attempt for the three open papers (same day, later)

Tried to read Demina–Kudryashov 2014, Aref 2010 and Krishnamurthy–Stremler 2018 in full.

- **Blocked hosts.** The session's egress policy blocked every host that has them: people.iith.ac.in (the KS postprint), vtechworks.lib.vt.edu and backend.orbit.dtu.dk (open copies of Aref 2010), link.springer.com, arxiv.org, academia.edu, researchgate, core.ac.uk, semanticscholar, archive.org and mathnet.ru.
- **No arXiv version.** None of the three is on arXiv. The Hugging Face paper index and the owner's Google Drive have no copy either.
- **Search summaries.** These return only the abstracts already recorded in entry E.
- **Status.** Nothing new is known about their contents. Read them from a browser: the Aref 2010 and KS postprints are free at the hosts above, and Demina–Kudryashov needs library access.
- **Related open papers:**
  - Demina–Kudryashov arXiv:1407.1641 extends the same polynomial method.
  - arXiv:2607.16490 (collapse of three vortices on surfaces) may summarize the planar literature.
  - Neither was reachable in full from the session.

### H. Aref 2010 read in full (same day, later)

The owner provided the author's copy, which is not committed.

- **What it contains:**
  - Ω (25a) and τ (25d) in terms of the side lengths.
  - The necessary conditions γ₂ = 0 (from conservation of H) and L = 0 for self-similar motion (Sect. II B, Eq. 12).
  - The zero-impulse circle (20a), centered at −Γ₁/(Γ₁+Γ₂) with radius Γ*/(Γ₁+Γ₂), Γ* = √(Γ₁² + Γ₁Γ₂ + Γ₂²).
  - Logarithmic-spiral trajectories ρ = ρ₀ exp(−φ/(2Ωτ)) (29c), where Ωτ is our P.
  - A linear-stability analysis, and the remark that a reflected configuration has parameters (Ω, −τ).
- **What it does not contain:** any minimization or bound of Ωτ over configurations.
- **Verdict:** DOES NOT KILL Theorem 1 or Corollary 1. The paper now credits [3] for the spiral exponent, the necessary conditions (Lemma 2) and the circle.
- **Still to read:** Demina–Kudryashov 2014 and Krishnamurthy–Stremler 2018.

### I. Gotoda arXiv v1, Section 3, read (same day, later)

The owner provided the arXiv PDF; it is not committed.

- **Positions.** Eq. (3.6) is identical to the paper's positions (5).
- **Normalization.** Gotoda uses the same normalization (Γ₁ ≥ Γ₂ > 0 > Γ₃, Γ₃ = −Γ₁Γ₂/(Γ₁+Γ₂)) and the same θ₀.
- **Conditions.** Eqs. (3.1)–(3.2) state that Γ_H = 0 and M = 0 are necessary and sufficient for self-similar collapse.
- **Both orientations.** Fig. 1 plots A(θ) over the full circle, so both collapsing orientations appear there.
- **The (3.3) typo.** In Eq. (3.3), A agrees with Biot–Savart, but B does not when Γ₁ ≠ Γ₂. Replacing (Γ₁² + Γ₂²)(Γ₂λ₁ + Γ₁λ₂) by (Γ₁ + Γ₂)(Γ₁²λ₁ + Γ₂²λ₂) fixes it to 10⁻³¹, on five test cases including (10, 1). This settles the old "(3.3) discrepancy": it is a typo in the printed formula, not an error in our computation.
- **Verdict.** No minimization of the product; DOES NOT KILL.
- **Paper edits.** The paper now cites [6, Sect. 3] for the parametrization and the normalization, and adds the arXiv number to the reference.

### J. Second attempt at the two open papers, and later papers (same day, later)

The aim was to learn what Krishnamurthy–Stremler 2018 §3.5 and Demina–Kudryashov 2014 contain without a copy of either.

- **Queries (WebSearch):**
  - `"Finite-time collapse of three point vortices in the plane" pdf vtechworks OR mathnet OR researchgate OR semanticscholar`
  - `"Rotation, collapse, and scattering of point vortices" Demina Kudryashov pdf arXiv preprint`
  - `Krishnamurthy Stremler three vortex collapse "distance traveled" circumcenter collapse time energy relation cited result`
  - `Krishnamurthy Stremler 2018 self-similar collapse "distance" traveled vortices "twice" OR "greater than" initial distance numerical observation`
  - `"On the collapse of three point vortices on surfaces" arXiv 2607.16490 abstract`
  - `Demina Kudryashov 2014 double-ring vortex configurations collapse "two regular polygons" angular velocity collapse rate circulations`
  - `"Self-similar collapse of three vortices in the generalised Euler and quasi-geostrophic equations" Physica D 2022 authors abstract`
  - `"Sufficient and necessary conditions for self-similar motions of three point vortices in generalized fluid systems" Physica D abstract authors`
  - `Kudela "Self-similar collapse of n point vortices" Journal of Nonlinear Science 2014 abstract rings polygons`
  - `three point vortices collapse "collapse time" "angular velocity" product minimum OR lower bound "logarithmic spiral" number of turns before collapse`
  - `"Intrinsic dynamical shadowing of point vortices and finite time singularities" arXiv 2609.25989`
  - `Borisov Mamaev Kilin "Dynamics of three vortices on a plane and a sphere" III noncompact case collapse scattering nlin/0503057 collapse time rotation`
  - `arxiv.org Demina Kudryashov "collapse" "scattering" point vortices polynomials double-ring 2013 OR 2014 arXiv`
  - `arXiv 1407.1641`
  - Hugging Face paper index: `three point vortices collapse`, `point vortex collapse self-similar`, `vortex polygons rings collapse`.
- **Hosts.** Every scholarly host and metadata API tried was blocked: arxiv.org, export.arxiv.org, OpenAlex, Crossref, Semantic Scholar, Unpaywall, OpenCitations, zbMATH, Europe PMC, scholar.archive.org, APS, AIP and MDPI. The Hugging Face paper index has none of the relevant arXiv ids.
- **Search summaries.** They repeat the two abstracts and nothing from §3.5 or from the double-ring section. Do not take a search summary as a reading.
- **Krishnamurthy–Stremler is already covered.** The 2026-09-20 entries below record a download of the whole postprint (21 pages), whose relevant sections (§§3.4–3.5) were read. `identities/NOVELTY-AUDIT.md` item 4 gives §3.5, eqs. (3.26)–(3.29): the normalized path length is √(1 + 4P²), and they observe numerically that it exceeds 2, with no sharp bound. The paper now credits that observation, and Corollary 1 proves it. Verdict: DOES NOT KILL. Check this ledger before calling a paper unread.
- **Demina–Kudryashov 2014 is still unread.** It is the main remaining priority risk, for the two-ring minimum. *(Later: read in full in entry N.)* Entry K lists the other papers that are unread or known only from summaries.
- **New to the ledger:** Borisov and Lebedev, RCD 3(4) (1998), "Dynamics of three vortices on a plane and a sphere III: noncompact case, problems of collapse and scattering" (arXiv nlin/0503057); Krishnamurthy–Aref–Stremler, PRF 3 (2018) 024702 (arXiv:1706.00731); arXiv:2609.25989 (2026, shadowing after a burst); and a Physica D paper (2024) on necessary and sufficient conditions for self-similar motion in generalized fluid systems (authors not confirmed).
- **Already in the ledger:** Demina–Kudryashov arXiv:1407.1641 and arXiv:2607.16490 (entry G); Kudela 2014 and Reinaud–Dritschel–Scott 2022 (the 2026-09-19/20 entries, which record from summaries that they minimize the collapse time, not P).
- **Status.** Priority is still unconfirmed. The free papers are on arXiv, which only this session blocks, so the owner can fetch them.

### K. Four papers read (2026-09-24)

The owner downloaded four arXiv papers; the copies are not committed. For each, the abstract, the introduction and every section on collapse or self-similar motion were read in full, and the rest was searched for rotation, spirals, path length, collapse time and bounds.

- **Borisov and Lebedev 1998 (nlin/0503057).** The collapse conditions (the harmonic condition and D = 0) and the homogeneous solutions M_k = C_k τ. Its angular velocities are for the equilateral and collinear relative equilibria only. Nothing on rotation during collapse, spirals, path length or minima. **DOES NOT KILL.**
- **Krishnamurthy, Aref and Stremler 2018 (1706.00731).** The collapse time through the triangle's angles (Eq. 46b), and L = 0, γ₂ = 0 as necessary and sufficient for self-similar motion. For L = 0 the circumcircle passes through the center of vorticity (Eq. 40), so the circumcenter starts one circumradius from the collision point. That confirms that Krishnamurthy–Stremler's normalized circumcenter path length equals √(1 + 4P²). No rotation rate, spiral or minimum. **DOES NOT KILL.**
- **Demina and Kudryashov, arXiv:1407.1641.** A polynomial method for multi-particle systems. Point vortices appear only in the introduction, which cites their 2014 paper for collapse. No rings, no rates. **DOES NOT KILL, and does not replace the 2014 paper.**
- **Drivas, Khanikati and Khanikati 2026 (2607.16490).** Theorem 1.1: every three-vortex collapse on the plane or the sphere is self-similar; none is self-similar on the hyperbolic plane. Its review of planar collapse cites Leoncini et al. 2000, Krishnamurthy–Stremler 2018 and Aref 2010, and states no bound on rotation or path length. **DOES NOT KILL.** The paper now cites Theorem 1.1 to say that Corollary 1 covers every planar three-vortex collapse.
- **Also in the same round.** A review found that Table 1 claimed an agreement of 6 × 10⁻²⁵ for the μ-grid minima. That figure came from a mislabeled metric in `verify_general_mu.py`; the true figure is 4.5 × 10⁻²¹. The script and the paper are corrected. The paper's other verification claims now each map to a committed check (section 10 of that script).
- **Still unread:**
  - Demina–Kudryashov 2014: library or purchase; the main risk, for the rings.
  - The cited Tavantzis–Ting 1988, Kimura 1987 and Aref 1979: abstracts only.
  - The full texts of Kudela 2014 and Reinaud–Dritschel–Scott 2022.

### L. Four more papers read, and four citations added (2026-09-24, later)

- **Borisov and Lebedev 1998 (nlin/0503057), read in full by two independent readers.** Conditions for collapse and scattering in the Lie–Poisson formulation. Collapse needs D = 0 (zero angular impulse) and is impossible when ΣΓ = 0; homogeneous collapse needs Σ1/Γ = 0. The scattering condition for D ≠ 0 is a numerical conjecture, and collapse sufficiency is a qualitative phase-plane argument. No rotation during collapse, spirals, path length, extrema or rings. **DOES NOT KILL.** Now cited as "obtained conditions" (not "derived the conditions").
- **Krishnamurthy, Aref and Stremler 2018 (1706.00731), read in full by two independent readers.** Equations of motion for the circumcircle and the angles. Eq. (40): for L = 0 the circumcircle passes through the center of vorticity at all times. Eq. (46b): the collapse time, which agrees with the paper's t_c. No rotation rate, P, spirals, path length or minimum. **DOES NOT KILL.** Now cited, and its Eq. (40) explains why Krishnamurthy–Stremler's normalized circumcenter path length is √(1 + 4P²).
- **Reinaud, Dritschel and Scott 2022 (Physica D 434, 133226), open access, point-vortex sections read.** Collapse conditions and collapse time in generalized Euler/QG models. The collapse-time maps (Fig. 3, β = 0.25–1.5) have local minima in a normalization that fixes the like-signed pair's separation; P is scale-free. Nothing on the rotation rate or bounds. **DOES NOT KILL.** Now cited to draw that contrast.
- **Reinaud, Dritschel and Scott 2022, full text (2026-09-24, owner-supplied PDF, 14 pages).** Searched the whole text for rotation, spirals, angular velocity, winding, minima and bounds. Spirals appear only as a qualitative observation of the trajectories (Section 4); the one minimum is of the collapse time tau along a curve in the (s1, kappa2) map of Fig. 3, in a normalization that fixes a separation. No rotation rate, no P and no bound. **DOES NOT KILL**, now on the full text rather than the point-vortex sections alone. Both manuscripts already cite it for this contrast.
- **Leoncini, Kuznetsov and Zaslavsky 2000 (physics/9908055), read in full.** Near-collapse dynamics for two identical vortices. Their fastest collapse (Fig. 18, collapse time 4π/3) is the maximum collapse rate at a fixed distance between the identical vortices. Direct Biot–Savart confirms t_c = 4π/3 there, at cos 2β = 3/5, with P = 3/2 (`verify_general_mu.py` 10f). The √3/2 in their caption is the energy parameter Λ = e^{4πH}. **DOES NOT KILL.** Now clarified in the Discussion.
  - Side note, not in the paper: evaluating Λ = Y^k/X = R₂R₃/R₁² at that configuration gives √(2/5), not √3/2. Their Eq. (49), as printed, does not match Biot–Savart either. There seems to be an internal inconsistency or misprint in their paper; it is not pursued.
- **Still unread:**
  - Demina–Kudryashov 2014, which the owner has decided not to buy for now; the main risk, for the rings.
  - The cited Tavantzis–Ting 1988, Kimura 1987 and Aref 1979, known from abstracts.
  - Kudela 2014.

### M. Kimura 1987, Gallay–Šverák 2026 and Anurag–Goodman 2026 read (2026-09-24, later)

Copies supplied by the owner, not committed.

- **Kimura 1987 (J. Phys. Soc. Jpn. 56, 2024–2030), read in full; pages also read as images.**
  - What it has: the similarity solution z = k f(t) with f f̄′ = C = A + iB. Up to his 2π, C is the paper's κ; his spirals (3.7) and collision time t* = −1/(2A) (3.9) are the paper's.
  - He also gives the conditions (3.20)–(3.21) and (3.33), and the zero-impulse circle (3.34)–(3.35), split into two arcs of collapse and two of expansion.
  - Sect. 4 treats Γ = (2, 2, −1) in exactly the parametrization of Remark 2 and of the `three-vortex-bound` tab. Eq. (4.4) gives A and B. The committed check `verify_general_mu.py` 10g confirms κ = (A + iB)/(4π) for Γ = (1, 1, −1/2), to 2 × 10⁻⁵¹. So the Remark 2 formula for P, and the tab's closed form, are the ratio B/(−2A) of his published rates.
  - What it does not have: he minimizes t* (Eq. 4.6, cos 2θ = 3/5, where P = 3/2), not the product. He never forms P, and has no minimum √2, no general-μ minimum, no bound √3/2 and no rings.
  - **DOES NOT KILL Theorem 1, Corollary 1 or the ring results.** It does take the closed form of the equal-circulation case, which the paper never claimed as new. The paper and the tab credit now name him, and the `three-vortex-bound` priority rows further down are updated.
- **Gallay and Šverák 2026 (arXiv:2609.10847), read in full by two independent readers.**
  - Prop. 5.2 proves that every collision is a self-similar collapse, z_j(t) = (1 − t/T)^(1/2 + is) a_j. They call this well known, citing Tavantzis–Ting, Leoncini et al. and Aref 2010.
  - The rates are in closed form, (5.10), (5.11), (E.1). In the paper's notation T = t_c and s = −ω₀t_c, so |s| = P. They show only s ≠ 0 (Remark E.2).
  - Both readers recomputed the minima of |s| from their formulas and reproduced Theorem 1's values.
  - Regularization of collisions holds only up to rotations, because the triangle makes infinitely many turns (Sect. 5.2). Whether it holds at all depends on the perturbation (Theorems 5.8, 5.10, 5.15).
  - No bound or extremum of s, no path length, no rings. **DOES NOT KILL.**
  - Now cited, with Corollary 1 stated as sharpening s ≠ 0 to |s| > √3/2. A reader warned against suggesting that minimal-winding collapses are the regularizable ones: by that reader's reading of their Prop. 5.4 and Theorem 5.8, no collision on the arc A₊ is regularizable by perturbing positions. The paper does not suggest it.
- **Anurag and Goodman 2026 (arXiv:2504.16038v2), read in full by two independent readers.**
  - A Jacobi and Lie–Poisson reduction removes translations and rotations. At Γ = (2/3, 2/3, −1/3) with zero angular impulse, collapsing triangles are rays through the triple-collision point (Fig. 5.6).
  - The reduction removes the rotation, so P cannot appear. No rates, bounds or rings. **DOES NOT KILL.**
  - Context only; not cited. Readers note that their Eq. (5.1) and a sign convention are internally inconsistent as printed.
- **Kudela 2021 (Energies 14, 943, open access, CC BY), full text layer read; figures not viewed.** The owner supplied it as a free stand-in for the paywalled Kudela 2014.
  - It restates, citing his two 2014 papers (J. Nonlinear Sci. and Fluid Dyn. Res. 46, 031414) and Demina–Kudryashov 2014, the self-similar solution z_k(t) = √(1 − t/T_c) e^{−iλ_i(0) T_c ln(1 − t/T_c)} z_k(0) with T_c = −1/(2λ_r(0)) (Eqs. 14–16). That is a logarithmic spiral whose coefficient λ_i(0)T_c is ±P, but it is never named, bounded or minimized.
  - The method, attributed to the 2014 papers: Newton's method from a Levenberg–Marquardt start finds collapse positions for given circulations. Stepping the Hamiltonian then traces collapse curves, with T_c plotted against H (Figs. 4b, 21b). The examples are n = 50 vortices with one, two or four strong vortices, forming vortex sheets that trap passive tracers.
  - There is no minimization of P or of T_c, no bound, and no concentric rings. **DOES NOT KILL.**
  - It lowers but does not remove the Kudela 2014 risk. It describes the 2014 method in a way consistent with no minimization of P, but that is indirect. The 2026-09-20 entries say, from summaries, that Kudela 2014 has collapse-time minima; nothing in the 2021 paper shows one.
- **Still unread:**
  - Demina–Kudryashov 2014: the main risk, for the rings.
  - Tavantzis–Ting 1988 and Aref 1979: abstracts only.
  - Kudela 2014 (J. Nonlinear Sci.; also Fluid Dyn. Res. 46, 031414): summaries, plus his 2021 restatement.

### N. Demina–Kudryashov 2014 read, and a completeness sweep (2026-09-24, later)

- **Demina and Kudryashov 2014 (Theor. Comput. Fluid Dyn. 28, 357–368), read in full.** The owner bought it; the copy is not committed. Two independent readings from the page images (the text layer drops the Greek letters), an independent numerical check at 50 digits, two referees and a reconciliation.
  - Sect. 3 gives the two-ring collapse family with an optional central vortex Γ₀. At Γ₀ = 0, their Eq. (37) is the paper's circulation condition with x = r², and their Eq. (36) is the paper's constant S as a function of e^{inθ}; the difference is a multiple of the circulation condition, checked exactly and against Biot–Savart for n = 2 to 8 (`verify_general_mu.py` 10h).
  - They state that every relative rotation other than e^{inθ} = ±1 collapses or scatters, without saying which. For this family they never separate the two rates or evaluate their ratio (their Eq. (10) does contain the coefficient β/(2α), whose absolute value is P, for the general solution), and they minimize or bound nothing. No K_n, F_n, table, or three-vortex result.
  - **DOES NOT KILL** any result. It under-credited them, though: the paper now credits their Eqs. (36)–(37) in the Introduction, Section 4 and the Discussion, their general-N solution (7)–(12) in Section 2, and their conditions (26)–(28) in the proof of Lemma 2. The paper must not say that they "do not form the ratio".
  - Their Table 1 seven-vortex collapse (Fig. 1a) is self-similar with the printed Ω to 50-digit precision (residual 1e-50) and has P = 12433/(1240√155) = 0.805 < √3/2 (10i). The paper now says that the bound of Corollary 1 does not carry over to larger systems. Their Table 2, Fig. 2a has a misprinted sign of Γ₀; do not cite it.
- **The Introduction's [1, 14] for "every zero-impulse configuration moves self-similarly"** rested on Aref 1979, which was not read. It now cites Gallay–Šverák Sect. 4.5.2 and Krishnamurthy–Aref–Stremler, both read in full.
- **Completeness sweep.** One agent mined the reference lists of every paper read (Borisov–Lebedev, Krishnamurthy–Aref–Stremler, Kimura, Leoncini et al., Reinaud et al., Drivas et al., Gallay–Šverák, Anurag–Goodman, Demina–Kudryashov 2014 and 1407.1641, Kudela 2021, Gotoda, Aref 2010, O'Neil 2007, Aref 1982). A second ran about 70 WebSearch queries: forward citations of Kimura 1987, Koiller 1985, Demina–Kudryashov 2014, Aref 2010, Krishnamurthy–Stremler 2018 and O'Neil 2007; "three point vortices" collapse "angular velocity" minimum; "self-similar collapse" logarithmic spiral bound; rotation angle, rotation number, winding number, pitch angle, minimal winding; concentric polygons collapse rate; collapse path length; Hiraoka; Hernández-Garduño–Lacomba; Gallay–Šverák follow-ups; generalized Euler and SQG collapse (Badin–Barry, Reinaud, Chen–Liu, Taylor–Llewellyn Smith); sphere; 2025–2026 arXiv collapse papers; a Russian-language query. WebFetch was refused for arxiv.org, ntrs.nasa.gov, vtechworks.lib.vt.edu and others, so every item below is judged from abstracts and search summaries only.
  - **Must read before submission:** Stremler 2021 (RCD 26, 482–504; his review after Krishnamurthy–Stremler 2018; paywalled); Conte–de Seze 2015 (Mod. Phys. Lett. B 29, 1530017; arXiv:1511.00069, free); the zero-impulse section of Tavantzis–Ting 1988. *(Later: Conte–de Seze read in entry O and cited in #139; Hernández-Garduño–Lacomba and Grotto–Romito–Viviani also read in entry O and cited. Stremler 2021 and Tavantzis–Ting 1988 remain unread.)*
  - **Cite after reading:** Hernández-Garduño–Lacomba 2007 (arXiv:math-ph/0412024), Hiraoka 2008 and 2009, Synge 1949, Grotto–Romito–Viviani 2024 (arXiv:2307.05133).
  - **Optional:** O'Neil 2007 RCD, Chen–Liu 2024 Physica D (authors Jiahe Chen and Qihuai Liu, which settles entry J's "authors not confirmed"), the reviews [4] and [16].
  - **Dismissed:** Aref 1979 and Kudela 2014 (low risk, see above), Kimura 1990/1991, Novikov 1975 and 1980, the reductions that remove rotation (Anurag–Goodman–O'Grady 2024, Luo–Chen–Liu 2022, Ohsawa 2019), and the desingularization, regularity and tracer papers.
- **Still unread:** every item in the sweep lists above, all judged from abstracts only; the three must-reads come first.

### O. Generalizations of the winding bound (2026-09-24, later)

- **What was searched.** Agents searched reference lists and ran web searches for five directions: N >= 4 vortices, the sphere, the alpha-models, the three-vortex shape sphere, and consequences for scattering. They also searched the DK 2014 central-vortex rings. Notes, statuses and local re-check scripts are in `research/generalizations-2026-09-24/`.
- **Conclusion.** No source found minimizes the winding for N = 4, for any N, in the alpha-models, on the sphere, or for the central-vortex rings. Each is still unconfirmed, not new.
  - **Unread risks.** O'Neil 2007 (RCD 12, 117-126) computes four-vortex collapse configurations and is the first to read before stating the N = 4 minimum P_4 = 0.7978968 < sqrt(3)/2. The n = 2 central-vortex literature publishes both rates; nobody checked whether it prints their ratio.
  - **Sphere.** The time law and the collapsing shapes are classical (Borisov-Lebedev 1998; Kidambi-Newton 1998, 1999). Credit them.
- **O'Neil 2007 access (checked 2026-09-24).** Web search finds only the Springer page (doi:10.1134/S1560354707020013, paywalled); no arXiv or author copy. Its abstract: finiteness of four-vortex relative equilibria (at most 56) and a method that yields all collapse configurations with a given velocity-to-position ratio, i.e. fixed kappa, not a minimum over kappa. Gotoda 2020 (arXiv:2002.09624), the other hit, is already read (entry on Gotoda (3.3)). Do not re-search; buy or borrow O'Neil 2007.
- **Gotoda arXiv v1, Sections 3.2-4 read (same day; entry I covered Section 3 only).** The owner provided the PDF; it is not committed. Sect. 3.2 gives the Novikov-Sedov parallelogram (four vortices) and its five-vortex extension with A and B in closed form, eq. (3.13). Sect. 4.1 continues collapsing families numerically for the fixed strengths (1, ..., 1, -(N-2)/2), N = 4..10, and proves the two four-vortex relative equilibria at the family's ends (Prop. 4.1). Sect. 4.2 does the same for the seven-vortex strengths (1, 1, -2, -2, -2, -2, 3/2). Everything is plotted as A against H; the rotation rate B is not computed along the numerical families, their ratio is never formed, and nothing is minimized over shapes or circulations. **DOES NOT KILL** the N = 4 minimum or the decrease with N; it should be credited as the source of the continuation picture and of the N = 4..10 families. O'Neil 2007 remains the unread risk.
- **Conte-de Seze, arXiv:1511.00069, read (same day).** The owner provided the PDF; it is not committed. This is a 1980 Saclay report (DPhG/PSRM/1697/80), printed in 2015. Sect. 4, 'Q = 0. Triple collision in a finite time, expanding motion' (pp. 24-25), writes the zero-impulse motion as z_j = z_j,0 (1 - t/t_c)^(1/2 - i omega t_c): a logarithmic spiral about the barycentre whose winding per unit ln rho^2 is |omega t_c|, i.e. our P. It gives -2 omega + i/t_c in closed form in the shape variable zeta for arbitrary strengths. So a closed form for the complex rate predates Kimura 1987 (entry M). It also gives the qualitative scattering picture: for Q = 0, J != 0 and energy in ]E(P3), 0[, every orbit reaches the circle J = 0 only asymptotically, with repulsive and attractive halves, and each vortex is asymptotic to a logarithmic spiral. It never bounds or minimizes omega t_c, and gives no rotation law with ln|L|. **DOES NOT KILL** the three-vortex bound or the scattering law C1/C2. **The paper should credit it** next to Kimura for the closed-form rate and the spiral, and C1 should credit it for the qualitative scattering picture.
- **Lewkowicz-Kudela, arXiv:1512.05116, read in full (same day).** The owner provided the PDF; it is not committed. It finds collapsing configurations numerically by steepest descent followed by Newton, and gives one seven-vortex example, Gamma = 2 pi (2, 2, -4, -4, -4, -4, 3): omega ~ -0.0261 - 0.2315 i, so P ~ 4.4. It also studies the loss of self-similarity against the working precision. It never computes, bounds or minimizes the rotation, and nothing depends on N. **DOES NOT KILL** the N-vortex results.
- **Five more uploads read or triaged (same day).** None was committed.
  - **Hernández-Garduño-Lacomba** (arXiv:math-ph/0412024; J. Math. Fluid Mech. 9, 2007) prove that every total collision of three vortices is self-similar and that there are no binary collisions. They say nothing on the rotation. Cite them for that fact.
  - **Grotto-Romito-Viviani** (arXiv:2307.05133) select a continuation after collapse by vanishing noise. They get a distribution over continuations, where a deterministic cutoff selects one. There is no winding bound. Cite them beside Gallay-Šverák, and credit them if the C3/C4 orientation leads are pursued.
  - **Grotto-Pappalettera** (arXiv:2505.19782) cover generalized-SQG bursts and collapses. Their Prop. 2.1 characterizes self-similar three-vortex motion (H = L = 0) and gives the spiral Z(t) with rotation b/((4 - alpha) a) log(t - t0); they cite Reinaud 2021 (GAFD 115, 369-392) for SQG. They do not bound b/a. So the alpha-model floor (A4) is not anticipated, but it must credit Prop. 2.1. Their alpha is 2 minus ours: Euler is 2 there and 0 here, and SQG is 1 in both.
  - **Vankerschaver-Leok** (arXiv:1211.4560) use a spherical three-vortex collapse (1, 1, -1/2) only to test integrators, with no rotation law. It does not touch the sphere loxodrome law.
  - **O'Neil's 1985 PhD thesis** (UIUC, UMI 8521651; ProQuest preview only). The contents list 7.4 'Collapse Configurations' and 8.3 'Angular Momentum 0' for four vortices, but the preview stops at the front matter. It is unread and joins O'Neil 2007 as the risk for N = 4.
  - **Paper edit:** Conte-de Seze, Hernández-Garduño-Lacomba and Grotto-Romito-Viviani are now cited in the paper (PR #139).
- **Alpha-model prior article review (same day).**
  - **Badin-Barry (arXiv:1805.10127), read in full.** They give no winding result. Lemma 2 of the alpha-model draft (#140) reproduces their SQG interval 0.387464 < Gamma < 1/2.
  - **Chen-Liu 2024** (Physica D 470, 134392; sciencedirect.com and its abs page are blocked by the egress proxy; no arXiv copy found by search, although one search summary claimed a May 2024 preprint). According to search summaries it gives necessary and sufficient conditions (Gamma_H = 0 and L = 0) and 'explicit and exact expressions for each nontrivial self-similar solution', and says collapse versus expansion depends only on the strengths. So it is the main risk for the draft's Lemmas 2-3 (explicit circulations, rate formula). No summary mentions a bound on rotation or spiral angle.
  - **JPSJ 90 124401 (2021)** (pdf at journals.jps.jp, which is blocked) and **JPSJ 92 084401 (2023)**, the latter on the linear stability of the self-similar motions (collapse unstable, expansion stable), are unread. *(Later the same day: JPSJ 92 084401 was read; see the next items. JPSJ 90 124401 remains unread.)*
  - All three need the owner to fetch them; do not re-search.
  - **Chen-Liu abstract and introduction** (pasted by the owner). They give conditions depending only on the strengths, explicit solutions (Thms 2.1-2.2), and the SQG interval (Thm 4.1); there is no winding result. They quote Reinaud 2021's SQG collapse time in side lengths and Donati-Godard-Cadillac's spiral (A.19). Sections 2-4 are unread.
  - **Iwayama-Yajima 2023** (JPSJ 92, 084401, open access; uploaded) was read: a linear stability analysis. B/A appears only in the exponent of the YOI21 solution and is never evaluated, bounded or minimized. **DOES NOT KILL.** The draft (#140) credits it, with YOI21 (JPSJ 90, 124401), for the spiral form.
- **Local re-checks (same day).** Independent scripts in `research/generalizations-2026-09-24/checks/` confirm the N = 4..25 minimizers, the alpha-model floor, the central-vortex ring infimum, the shape-sphere formula, the scattering rotation law and the sphere loxodrome law. That is verification of the mathematics, not of priority.
- **Do not** call the bound universal. It fails at N = 4, as DK 2014's Table 1 already shows at N = 7 (entry N).

### P. Six more free papers read for the N-vortex and zero-winding results (2026-09-24, night)

The owner provided the PDFs; none is committed. Text was extracted and searched for rotation, winding, spirals, angular velocity, minimization, parallelograms and four- or five-vortex collapse, then the matching passages were read.

- **Gotoda 2024** (arXiv:2410.14973, enstrophy variations in collapse). Sect. 2.3 says that for N >= 4 "explicit formulae for configurations leading to self-similar collapse have not been established in general". It uses the Novikov-Sedov (1979) parallelogram examples for four and five vortices and studies enstrophy dissipation, not the rate or the winding.
- **Gotoda-Sakajo 2017** (arXiv:1705.00146). This covers three-vortex enstrophy dissipation in Euler-Poincaré models, and mentions a numerically found quadruple collapse. Nothing on winding.
- **Hernández-Garduño-Lacomba 2006** (arXiv:math-ph/0609016). Zero virial is necessary for a regular total collision of N vortices, illustrated on the Novikov-Sedov parallelogram. They also classify partial four-vortex collisions. Nothing on winding or on the rate kappa.
- **Yu 2021** (arXiv:2103.06037 and 2111.07292). Finiteness of four-vortex stationary configurations, which are relative equilibria and collapse configurations at fixed kappa. There is no minimum over kappa.
- **Drivas-Khanikati-Khanikati 2026** (arXiv:2607.16490). This covers three-vortex collapse on surfaces. It bears on the sphere notes but gives no winding law.
- **Conclusion.** None of these gives a minimum or bound on the winding for N >= 4, or a collapse that does not rotate. The four- and five-vortex minima found here, a strong central vortex with the others around it, are not Novikov-Sedov parallelograms.
- **New numerical fact.** Within the four-vortex Novikov-Sedov parallelogram family (Gamma = (1, 1, b, b), b^2 + 4b + 1 = 0), the least winding is 3 sqrt(5)/4 = 1.67705098312484 to 15 digits. It occurs where the diagonals meet at cos theta = sqrt(5/8), for both roots b. It is not derived symbolically yet.
- **Lewkowicz** (arXiv:1512.04668, a 2011 Wroclaw report, translated), read the same night. It covers four Euler vortices with fixed circulations. It maps the set of collapsing and rotating quadruples by minimizing the residual |U|^2 with a gradient method. Its Lemma 3.1 writes the collapsing spiral z(t) = z0 + sqrt(2 Re w t + 1) exp(i Im w/(2 Re w) ln(2 Re w t + 1)) (Z - z0), whose coefficient Im w/(2 Re w) is our P, but it never minimizes or bounds that coefficient. It does not anticipate the four-vortex minimum. Re-search: no.
- **Still unread, free.** O'Neil 1987 (Trans. AMS 302, 383-425) is free from ams.org (read in entry Q). Still paywalled: O'Neil 2007, Kimura 1987 Sects. other than 4, and Novikov-Sedov 1979.
- **Volunteer search (PR #141).** Growth from certified minima gives, at alpha = 2, P = 0.0676 (N = 9), 0.0237 (N = 10) and P = 0 (N = 11). The N = 11 point is a collapse without rotation, confirmed at 60 digits by tools/vortex-precision-check.py. Priority is unconfirmed: search for non-rotating (kappa real) self-similar collapse before any claim.

### Q. A dedicated search for collapse without rotation (2026-09-24, late)

- **Why.** The volunteer search now has two collapses with P = 0, that is with kappa real, so that every vortex moves straight at the centre: alpha = 2 at N = 11 (entry P), and SQG, alpha = 1, at N = 60 (experiments/VORTEX-COLLAPSE.md). Entry P asked for this search before any claim.
- **Queries (WebSearch).**
  - "point vortices" collapse "without rotation" OR "non-rotating" OR "purely radial" self-similar configuration;
  - point vortices self-similar collapse without rotation real collapse rate "homothetic";
  - homothetic collapse configuration point vortices real eigenvalue no rotation O'Neil collapse configurations;
  - point vortices "complex circulations" collapse configurations relative equilibria O'Neil imaginary circulation self-similar;
  - Kudela self-similar collapse many point vortices rotation angular velocity zero;
  - surface quasi-geostrophic point vortices collapse many vortices self-similar spiral rotation vanishes;
  - generalized SQG alpha point vortex N-vortex collapse configuration existence many vortices 2025 2026 arXiv;
  - N point vortices alpha model collapse "zero angular velocity" OR "no rotation" OR "non-rotating collapse" SQG many vortices numerical;
  - O'Neil 1987 "Stationary configurations of point vortices" Transactions AMS pdf collapse;
  - one Russian-language query (коллапс точечных вихрей автомодельный без вращения конфигурация), which returned nothing on point vortices.
- **Access.** The egress proxy refused arxiv.org, ams.org and osti.gov, both to WebFetch and to curl, and the Hugging Face paper index does not hold these papers. Everything new here is judged from search summaries and abstracts, together with the papers already read in entries I to P.
- **What was found.** No source reports a self-similar collapse with kappa real, for any alpha or N.
  - The alpha-model papers (Badin-Barry 2018, Reinaud-Dritschel-Scott 2022, Chen-Liu 2024, Grotto-Pappalettera 2025) treat three vortices, where the bound P > sqrt(3+alpha)/(2+alpha) of the draft in #140 rules out P = 0, or bursts and collapses built from three.
  - The N-vortex papers are all Euler: O'Neil 1987 and 2007 as Lewkowicz-Kudela (arXiv:1512.05116) summarize them, Kudela 2014 and 2021, Gotoda 2020 and 2024, Lewkowicz 2011. No summary or text read mentions kappa real.
- **Why O'Neil 1987 is the risk for Euler but not for alpha != 0.** At alpha = 0 the law is holomorphic: the conjugate velocity of vortex j is (1/2 pi i) sum_k Gamma_k/(z_j - z_k). A self-similar configuration with rate kappa therefore satisfies sum_k Gamma_k/(z_j - z_k) = 2 pi i conj(kappa) (conj(z_j) - conj(z_c)). Multiplying every circulation by e^(i phi) with phi = arg(kappa) - pi/2 turns this into the relative-equilibrium equation with real angular velocity |kappa|. So an Euler collapse with kappa real is a relative equilibrium of purely imaginary circulations. O'Neil 1987 allows complex circulations, so it was the paper to check (it does not use them this way; see the next item). The observation is elementary and is recorded only to explain that check; it is not claimed as new. For alpha != 0 the kernel (z_j - z_k)|z_j - z_k|^(-alpha-2) is not holomorphic, the phase trick fails, and O'Neil's algebraic framework does not apply. Both zero-winding collapses found here have alpha != 0.
- **O'Neil 1987 read (Trans. AMS 302, 383-425; the owner supplied the PDF, which is not committed).** Text extracted and searched; the definitions (pp. 386-387), the remark on L = 0 (p. 390), Chapter 7 (pp. 411-414) and the four-vortex collapse figures (pp. 420-424) read in full.
  - Definition 1.1.3: a configuration is collapsing if V_l = w(z_l - z_0) with Re(w) != 0, and a relative equilibrium if w = i lambda with lambda real. A real w is allowed by the definition but never singled out, computed or discussed.
  - Complex circulations appear only as an algebraic device for counting equilibria and rigidly translating configurations (p. 394: "we allow the kappa_l to take on complex values; this generalization is not needed until Chapter 5"). They are not used to produce collapses, and the phase correspondence above does not appear.
  - Theorem 7.4.1: for n > 3 and almost every real choice of circulations with L = 0, every collinear relative equilibrium lies on a one-dimensional family of collapse configurations. Section 8.5 computes such families for four vortices (Figures 7-12) and marks their relative equilibria, the zero crossings of the collapse rate Re(V_l/z_l). The zero crossings of the rotation, Im(w) = 0, are not examined.
  - Nothing bounds or minimizes the rotation relative to the collapse rate, for any n.
  - **DOES NOT KILL** the zero-winding collapses (alpha = 1 at N = 60, alpha = 2 at N = 11), which lie outside its Euler setting, nor the four-vortex least winding P_4 = 0.7978968 (entry O). Its one-dimensional collapse families at fixed circulations are the classical source for the families the search continues and should be credited wherever they are used.
- **Conclusion.** Nothing found anticipates a collapse without rotation for alpha = 1 or alpha = 2. That is a statement about this search, not a priority claim.
- **Still unread:** O'Neil 2007, O'Neil's 1985 thesis, Kudela 2014, and Sections 2-4 of Chen-Liu 2024. Re-search: no.

## Do this, do not do that

**Do**

- Add a line here the same day you search. A search that is not written down will be done again.
- Record the query, the date, what you opened, what you could not open, and the conclusion in one sentence.
- Credit the paper in the tab. A missing browser demo is not new science.
- Before deriving a candidate identity, search the web and the papers for the closed form and for the extremum. If a paper already states either, stop. Do not spend an afternoon rediscovering a published lock.

**Do not**

- Re-run a search this file marks skip, unless you have a newly named repository, paper, or site that was previously unreachable.
- Put a personal name on existing mathematics or claim originality from a numerical check or unsuccessful literature search. Use descriptive names, credit the primary sources, and retain unresolved priority as unconfirmed.
- Private-name a published equation plus a feedback term. `track` and `causticsea` already made that mistake in draft and were renamed.
- Treat **familiarity** / "seen elsewhere" as a measurement or a prior-article result. It is a curator's call from 2026, five named buckets, never a number, never the default sort.
- Parse `studio.html` to answer "what is in the catalog". Read `techniques.json`.
- Search Shadertoy, Observable, OpenProcessing, fxhash, Art Blocks, arXiv, VisualPDE, Wikipedia, or journal pages and then write "I did not find it" as if those sites had loaded. From the machines that did this work they usually do not. See [Search limits](#search-limits).

## Search limits

The September 2026 checks were web search plus GitHub. That is the whole window.

| Could be opened | Could not |
|---|---|
| GitHub repositories and READMEs | arxiv.org |
| Web search result snippets | doi.org and most journal / lab pages |
| A few GitHub-hosted project pages | visualpde.com |
| | observablehq.com |
| | shadertoy.com |
| | openprocessing.org |
| | fxhash.xyz |
| | artblocks.io |
| | Wikipedia |

Firm claims rest on source read on GitHub. Claims that rest on search snippets alone are weaker. A negative result is weakest of all where the likeliest home for the thing is a site in the right-hand column. `cortex` is the named example.

Exact query strings from those sessions were not logged. That is why this file exists: the next search should write the query down.

## What "new" is allowed to mean

Copied from the README, restated so an agent does not have to infer it.

| Kind | Allowed? | Where it lives |
|---|---|---|
| A published result under a new name | No | nowhere |
| New as an artifact (this seed, this plate) | Yes, always | the export |
| New as working software (a seeded, paletted, print-ready browser plate of a published system) | Yes, with a named nearest neighbor | README bullets, this file |
| A result derived here, uniqueness-checked against the papers, with a plate whose check can miss | Yes | [`IDENTITIES.md`](IDENTITIES.md) |
| A published equation plus a feedback term | Not an invention | `track`, `causticsea` |
| Familiarity bucket `unseen` | Editorial, not a result | `techniques.json` |

> Editorial correction, 2026-09-21: personal labels have been removed throughout this ledger. Dated entries retain historical search context; superseded statements of originality or first discovery are not current conclusions. See identities/ORIGINALITY-FOLLOWUP.md.

## Physics

**Classical models and unconfirmed candidate bounds.** The catalog cites its source models; implementation accuracy is tracked separately in VALIDATION.md. Zero novel findings are confirmed. The three-vortex expression specializes Gröbli’s 1877 spiral coefficient. The parallelogram and quincunx bounds are elementary corollaries of published rates. Historical absence claims below are superseded by the explicit originality follow-up.

**The derived locks.** The statements, the minima, what they are not, and how the checks miss live in [`IDENTITIES.md`](IDENTITIES.md). Three point vortices of circulations 1, 1, -1/2 collapse self-similarly when L = 0 (Gröbli 1877; Aref, Phys. Fluids 22, 057104, 2010). Aref gave the collapse rate and the spin as separate formulae. On this family their dimensionless product is

    omega t_c = (2 - cos^2 theta) / sin(2 theta)

which has a unique minimum of sqrt(2) at tan theta = 1/sqrt(2), the triangle with angles 22.5, 45, and 112.5 degrees. At construction theta = 45 degrees the same product is 3/2. The formula is a specialization of Gröbli’s published coefficient; priority of the elementary optimization remains unconfirmed. The factors at this length are t_c = (pi/3)(4u + 1/u) and 2 pi omega = 3(2u^2+1)/(4u^2+1); the t_c minimum 4pi/3 at u = 1/2 is Leoncini, Kuznetsov and Zaslavsky (2000) and is not claimed. The plate reports omega t_c / sqrt(2) against 1, the similarity residual against 0, and signed L against 0. Off the L = 0 circle, all three numbers miss on purpose. Miss is a grade, not a crash.

Do not re-derive this unless the check is missing the lock. Do not search the name of the tab as if it were a published law. Do not put that name on a different system.

**The parallelogram lock.** Four point vortices of circulations (1, 1, −2−√3, −2−√3) at the vertices of a parallelogram with diagonal ratio √(2+√3) collapse self-similarly (Novikov and Sedov, Sov. Phys. JETP 50, 297, 1979). Gotoda (2020) eq. (3.13) gives A(θ) and B(θ) separately. Their product is

    omega t_c = (√3/4) (4 − cos 2θ) / sin(2θ)

which has a unique minimum of 3√5/4 at cos 2θ = 1/4. Direct Biot-Savart on this family (2π kernel) matches that closed form. The plate is `#parallelogram-lock`. Off the parallelogram, the numbers miss on purpose. Miss is a grade, not a crash. Do not claim Novikov-Sedov's t_* or ω separately, and do not put a private name on their motion.

**The quincunx lock.** Five point vortices of circulations (−1, −1, 1/2, 1/2, −3/4), four at the vertices of a parallelogram and one at the crossing of the diagonals, with diagonal ratio 1/√2, collapse self-similarly (Novikov and Sedov 1979; Gotoda's five-vortex example). Gotoda (2020) eq. (3.13) with γ3 ≠ 0 gives A(θ) and B(θ) separately. Their product is

    omega t_c = (3/16) (7 − 4 cos 2θ) / sin(2θ)

which has a unique minimum of 3√33/16 at cos 2θ = 4/7. Direct Biot-Savart on this family (2π kernel) matches that closed form. The plate is `#quincunx-lock`. Off the quincunx, the numbers miss on purpose. Miss is a grade, not a crash. Do not claim Novikov-Sedov's t_* or ω separately, and do not put a private name on their motion. A different five-vortex slice with diagonal ratio μ = 3 recovers the three-vortex bound’s product identically; that is not a third identity and is not claimed.

Do not re-derive these unless the check is missing the lock. Do not search the name of a tab as if it were a published law. Do not put a personal name on a different system.

**Checked 2026-09-20, not a fourth row.** Web search plus Gotoda arXiv:2002.09624 (opened), Novikov and Sedov 1979 (opened), O'Neil 1987 snippets, Hampton-Roberts-Santoprete arXiv:1208.4204 snippets, Kudela 2014 snippets, and the JTAM existence-criterion paper snippets. Direct Biot-Savart on the remaining exact families. Queries: `Gotoda A(theta) B(theta) omega collapse time product minimum five vortex`, `Novikov Sedov five vortex diagonal ratio closed form omega t_c`, `O'Neil 1987 four vortex collapse explicit kite`, `self-similar four vortex collapse kite trapezoid exact`.

| Candidate | What it actually is |
|---|---|
| Five-vortex NS, ρ = d₁²/d₂² = 2 | Reciprocal of the quincunx. Same product. Already in IDENTITIES.md. |
| Five-vortex NS, ρ = 3 | Recovers the three-vortex bound identically. Already not claimed. |
| Five-vortex NS, ρ = 4 | ω t_c = 5(35 − 8 cos 2θ)/(96 sin 2θ) ≥ 5√1161 / 96. A nested radical, not a floor like √2. Not claimed. |
| Three-vortex L = 0, Γ = (1, μ, −μ/(1+μ)), μ ≠ 1 | Prop. 2.1 / 2π kernel product (not Gotoda (3.3) B). For μ = 1/2: P = (14 sin²θ + 6√7 cosθ + 21) / [2(14 cosθ + √7) sinθ] ≥ P⋆ ≈ 2.203855 with closed trig/Cardano form (2026-09-23) on Gotoda’s arc; the opposite-orientation branch has the lower global floor P_min ≈ 1.064705976271204 (same sextic; see §A second correction). Older ~1.741 witness from Gotoda (3.3) B is withdrawn. Same L = 0 family as √2. Proved candidate; priority unconfirmed. Do not stamp as a new identity row. |
| Kite, non-parallelogram isosceles trapezoid, equilateral plus interior | Biot-Savart scan: no self-similar L = 0 collapsing family (similarity residual never jointly small with I = 0 and finite positive τ). |
| Seven-vortex Gotoda (4.4), Γ = (1,1,−2,−2,−2,−2,3/2) | Numerical H-A curves. O'Neil 1987 and Kudela 2014: existence and numerical positions, not A(θ), B(θ). |
| Trapezoidal / kite four-vortex papers | Relative equilibria (central configurations), not self-similar collapse. |
| Five-vortex NS, μ = φ, √2, 3/2, and other distinguished ratios | Product still C(a − b cos 2θ)/sin 2θ. Min is a messy radical. Reciprocal pairs share the product. Not claimed. |
| Five-vortex NS, μ = 2+√3 | Center circulation vanishes. Recovers the parallelogram lock identically. Already in IDENTITIES.md. |
| Four-vortex (1,1,1,−1) isosceles + axis; kite; isosceles trapezoid (1,1,−1,−1) | Gotoda 4.1 is numerical H-A. Direct Biot-Savart (2π kernel): similarity residual never jointly small with I = 0 and finite positive τ. |
| O'Neil 1987 explicit quadruple; hollow-vortices arXiv:2506.04093 triples/quadruples | Single published configurations, not a 1-parameter family with a unique interior min. |
| Kallyadan–Shukla, Phys. Rev. Fluids 7, 114701 (2022) | Numerical 1-parameter families along closed curves. No closed A(θ), B(θ). |
| Wall / image / disk; periodic strip (Aref 1996) | Same-sign boundary collapse is impossible (Donati–Godard-Cadillac–Iftimie 2024). Mixed-sign and periodic-strip: no closed product min found. |
| Gotoda 2025 θ_Z / θ_L / θ_c | Numerical grid bracket only (θ_137 < θ_Z < θ_138). No closed form. |
| Love leapfrog T(α), T·U | Period is complete elliptic K, E in α (Tophøj–Aref eq. 11). Not a floor like √2. Existence α = 3−2√2 and stability α = φ^{-2} are already in the published-locks table. |
| Three-vortex collapse on a sphere | Kidambi–Newton 1998/1999: collapse times and partner states. Each vortex has a distinct azimuthal velocity; a single ω t_c is not defined the way it is in the plane. |
| SQG / generalized Euler three-vortex | Badin–Barry 2018; Reinaud GAFD 2020 / Physica D 2022. Collapse time has a numerical min (τ ≈ 0.3657 on one slice). No closed A(θ), B(θ). |
| Moore–Saffman ellipse in strain; Kida | Two axis ratios iff e/ω₀ < 0.15 (irrotational strain); breakup above. Kida 1981 solves the time-dependent ellipse. Published bounds, not a product min. |
| Heton / two-layer point vortices | Hogg–Stommel; Helfrich–Send contour dynamics. Finite-core, no closed A(θ), B(θ). |
| Calogero goldfish | Isochrony and matrix-eigenvalue solution are published. Not a vortex-collapse product. |
| Stuart cat's eyes; Mallier–Maslowe | Exact Euler families. Circulation independent of the concentration parameter. No unpublished product min. |
| Thomson N-gon + center | Unique N+1 equilibrium with N on a circle (Aref–van Buren). Relative equilibrium, not collapse. |
| Peregrine / Akhmediev / Kuznetsov–Ma | \|u\|_max / \|u\|_∞ = 3 is Peregrine; Akhmediev AF = 1+2√(1−2a). Published. |
| Crowdy H-states Ω(a,N) | Explicit relative-equilibrium rotation (JFM 913, R5, 2021, eq. 3.11). Kirchhoff-class, not collapse. Do not claim a min of Ω. |
| Baker–Saffman–Sheffield hollow row | 1-parameter R = U∞/q₀. Perimeter non-monotonic (BSS 1976 fig. 3); energetics in Baker 1980. Not a collapse product. |
| Stremler–Aref periodic parallelogram | Integrable three-vortex motion (JFM 392, 101, 1999). Not self-similar collapse. Periodic strip already logged. |
| Sakajo four-vortex on a sphere | Self-similar four-vortex collapse is impossible (Phys. Fluids 19, 017109, 2007). Partial non-self-similar triple collapse is numerical examples (PRE 78, 016312, 2008). |
| Kaden / Pullin vortex-sheet spirals | r ∝ θ^{-μ} (Kaden 1931; Pullin). Published self-similar sheet, not a point-vortex product min. |
| Borisov–Kilin–Mamaev three vortex rings | Existence of threefold leapfrogging via Poincaré maps (RCD 2013; FDR 46, 031415, 2014). No closed period-speed product min. |
| Tacchi Appendix B / Kimura 1987–1990 | Named thesis "M. Tacchi, Dynamique des tourbillons dans les fluides bidimensionnels" is not in theses.fr, HAL, arXiv, or Google Scholar (checked 2026-09-20). The living M. Tacchi is Matteo Tacchi-Bénard (control theory / SOS, INSA Toulouse 2021); not vortex dynamics. Kimura JPSJ 56, 2024 (1987) is the general similarity solution (A, B; collinear 3-vortex is a cubic). Kimura Fluid Dyn. Res. 3, 98 (1988) is a two-page complex-time note, not a coefficient table. Kimura Physica D 46, 439 (1990) is complex-time singularities. Tavantzis–Ting 1988 is the 3-vortex revisit. Do not re-derive Kimura's cubic. Do not reopen Tacchi. |
| Norbury–Fraenkel vortex rings | Numerical 1-parameter family α ∈ [0, √2]. Thin-core Kelvin–Dyson log speed; Hill's spherical vortex at the fat end. Lowest dimensionless energy is Hill's. Not an algebraic collapse product. |
| Pocklington hollow vortex pair | Translating 1-parameter family. Crowdy–Llewellyn Smith–Freilich 2013: U monotonic decreasing with area. Compressible first-order speed min is Krishnamurthy–Llewellyn Smith 2023. |
| Lamb–Chaplygin dipole | Isolated exact Euler dipole. kR = j_{1,1} ≈ 3.8317; U_max/U_0 ≈ 2.49 (Flor 1994). Not a 1-parameter collapse family. |
| Komineas–Papanicolaou magnetic 3-vortex | Gröbli analog, completely integrated (JMP 51, 042705, 2010). Published. |
| Point vortices on the hyperbolic plane | Nava-Gaxiola–Montaldi JMP 55, 102702 (2014): relative equilibria, not a collapse product. |
| Crowdy vortex layers on a wedge | Exact uniform-vorticity corners (EJAM 2004). Not a point-vortex collapse product. |
| Kudela n-vortex collapse | Numerical configurations (J. Nonlinear Sci. 2014; FDR 2014). Same class as Kallyadan–Shukla. |
| Moffatt–Kimura filament pair | JFM 2019: similarity s ∼ (τc−τ)^{1/2}, κ ∼ (τc−τ)^{-1/2}. The product sκ = 2 sin α; at α = π/4 this is √2. Published. Do not claim the three-vortex bound’s √2 here. |
| Burgers stretched vortex | Gaussian core; dissipation per unit length Φ = Γ²γ/8π independent of ν (Burgers 1948). |
| Föppl vortex pair behind a cylinder | Locus r² − 1 = 2 r y; κ = (r²+1)(r²−1)²/r⁵. Published 1-parameter equilibrium, not collapse. |
| Benjamin–Ono algebraic soliton | c = A/4, Δ = 4/A, so \|c\|Δ = 1. Textbook. ILW interpolates to KdV. |
| Degasperis–Procesi / Novikov peakons | Explicit elementary N-peakon formulas (Lundmark–Szmigielski; Hone–Lundmark–Szmigielski). Camassa–Holm peakons are already `#peakon`. |
| Platonic vortex crystals on a sphere | Tetrahedron, octahedron, cube, icosahedron, dodecahedron are equilibria (Tokieda; Newton). 1-parameter periodic families from them (J. Nonlinear Sci. 2022). Relative equilibria, not a collapse product min. |
| Two vortices + circular cylinder | Föppl; integrable when total impulse and circulation vanish (Borisov et al. 2021). |
| Euler elastica | Elliptic integrals (Euler 1744; nine shapes). Not an algebraic product min of two rates. |
| Delaunay unduloid / nodoid | H = 1/(a+c); neck and bulge explicit (Delaunay 1841). Elliptic generating roulette. |
| Catenoid–helicoid Bonnet family | Isometric 1-parameter associate family. Textbook. |
| Maclaurin spheroid | Ω²/(πGρ) has a numerical max 0.449331 at e ≈ 0.92996 (Maclaurin 1742). Jacobi bifurcation e = 0.812670. Not an algebraic floor. |
| Calogero–Moser equilibrium frequencies | ω_s² = 2s(n−s) (Calogero). Integer. Goldfish already logged. |
| KdV two-soliton phase shift | δ = (2/k) log\|(k₂+k₁)/(k₂−k₁)\|. Published. No interior algebraic min in μ = k₂/k₁. |
| Kerr ISCO | Closed cube-root formula (Bardeen–Press–Teukolsky). Photon-sphere λ/Ω_ph = 1 already logged. |
| ABC flow | Beltrami: H = k_u U²/2. Energy–enstrophy–helicity locked. |
| Stokes 120° / Michell highest wave | Crest angle 120° (Stokes 1880). H/λ ≈ 0.141 numerical. Speed–amplitude turning points numerical. |
| Wilton ripples | 1:2 gravity-capillary resonance. Existence published. |
| Toda 3-particle | Completely integrable; periods elliptic. Numerical orbit families. |
| Lagrange sleeping top | Stability λ² > 4 m g l I₁ / I₂³. Elliptic in the large. |
| Ginzburg–Landau κ = 1/√2 | Type I / II surface-energy zero. Abrikosov 1957. Isolated published lock. Do not claim. |
| 4-body kite / rhombus CC | Unique convex kite for given masses (Leandro; Roberts 2025). Rhombus φ(μ) is a degree-12 polynomial. Homographic motion is Keplerian. Roberts infimum m₁/(m₂+m₃+m₄) = (25+3√69)/2 is Routh's restricted 3-body mass in a limiting kite. Isolated, published. |
| Laplacian growth / Hele-Shaw | Polynomial maps form a cusp at closed t₀. Saffman–Taylor selects λ = 1/2 (Combescot; Mineev-Weinstein). Isolated. |
| Kapitza inverted pendulum | (a/l)(ω/ω₀) > √2 (Stephenson 1908; Kapitza). Published threshold, not a 1-param product min of two dynamical rates. Do not claim the three-vortex bound’s √2. |
| Jeffery orbits | T γ̇ = 2π(r + 1/r). Unique min 4π at r = 1 by AM-GM (Jeffery 1922). Published. |
| Rayleigh–Plateau slender | Most-unstable λ = 2π√2 R (inviscid slender). Exact max is a Bessel root kR ≈ 0.697. Published. |
| Cotes inverse-cube spirals | Finite-time fall when μ > h² (Cotes 1722). Trajectories closed. Not a product min. |
| Gold–Hoyle flux tube | Uniform twist. Energy vs twist: numerical. |
| Kirchhoff–Routh in a domain | Equilibria of N vortices in a bounded domain (Crowdy 2005; Kuhl). Existence, not a collapse product. |
| Von Kármán street | Isolated published lock: b/l = arcosh(√2)/π ≈ 0.2806; U = Γ/(l√8) at that ratio (von Kármán 1911). Crowdy–Green 2011 hollow streets: special aspect ~0.34–0.36 is numerical. Do not claim. |
| Saffman–Szeto / Pierrehumbert pairs | 1-parameter corotating and translating patches. Endpoint is touching (Sadovskii). Numerical. Ω ∈ (0, γ/2) (global bifurcation, Hassainia–Wheeler). Not algebraic. |
| Deem–Zabusky V-states | m-fold rotating patches. Bifurcation Ω_m = (m−1)/(2m) from Rankine (Kelvin). Limiting shapes numerical. Hassainia–Hmidi SQG V-states exist, explicit Ω at bifurcation. Relative equilibria. |
| Sadovskii vortex pair | Touching translating pair. Existence 2025 (Choi–Sim–Jeong, Annals of PDE; arXiv:2507.00910). Speed W_p variational, not a closed algebraic min of two rates. |
| Ptolemaic / Abrashkin–Yakubovich | Exact Euler: z = f(s)e^{iω₁t} + g(s̄)e^{iω₂t}. Contains Gerstner and Kirchhoff as cases (already logged). Two free frequencies, not a unique interior product min. |
| Guderley converging shock | Similarity exponent λ is an ODE eigenvalue (Guderley 1942). γ=1.4 sphere λ ≈ 1.3944 (numerical). Self-similarity of the second kind. Not algebraic. |
| Crow instability | Most-unstable λ/b ∈ [6,10] depending on a/b (Crow 1970; Leweke–Le Dizès–Williamson). Bessel cut-off. Numerical max. |
| Havelock n-gon | Point-vortex n-gon stable for N<7, N=7 marginal, N>7 unstable (Thomson; Havelock 1931). Finite-core: N≥7 unstable (Saffman). Ω = (n−1)κ/(4π a²) published. Relative equilibrium. |
| McGehee triple collision | Blow-up of n-body total collision. 10 fixed points on the collision manifold. Homothetic Lagrange/Euler arcs. Not a 1-param product min. |
| Chaplygin 1899/1903 dipoles | Elliptical patch in shear (Moore–Saffman/Kida, already); translating dipole; non-symmetric dipole on a circle (Meleshko–van Heijst 1994). Isolated exact Euler. |
| Two vortex pairs past a cylinder | Symmetric equilibria: degree-14 polynomial in the position (Lopes). Always unstable to antisymmetric modes. Relative equilibria. |
| Lane–Emden polytropes | Exact for n = 0, 1, 5: ξ₁ = √6, π, ∞ (Lane 1870; Emden 1907). Isolated published. Other n numerical. |
| Sedov–Taylor–von Neumann blast | R = β (E t²/ρ₀)^{1/5}. D t / R = 2/5. β(γ=1.4) ≈ 1.033 numerical. Isolated published. |
| BKT / Kosterlitz–Thouless | k_B T_c = π J / 2; universal jump ρ_s(T⁻)/T = 2/π (Kosterlitz–Thouless 1973). Isolated published lock. Do not claim. |
| Figure-eight three-body | Moore 1993; Chenciner–Montgomery Ann. Math. 2000. Variational existence. Period by Kepler scaling. Numerical, not algebraic. |
| Miche / Penney–Price standing wave | Limiting crest 90° (Penney–Price 1952; Taylor 1953). Steepness numerical (~0.627). Progressive 120° already logged. |
| Lundquist force-free | B_z = B₀ J₀(α r), B_θ = B₀ J₁(α r). Reversal at j_{0,1} ≈ 2.4048 (Lundquist 1950). Isolated Bessel. Gold–Hoyle already logged. |
| Ritter dam-break | u_front = 2√(g h₀), rarefaction −√(g h₀) (Ritter 1892). Isolated published. Not a 1-param product min. |
| Aref tripole | Γ = (1, 1, −2) collinear or equilateral relative equilibrium. Published Ω (Aref; van Heijst–Kloosterziel). Not collapse. |
| Novikov vortons | 3D discrete-filament analog. Homogeneous collapse under the same L = 0, I = 0 conditions (Novikov 1983 JETP). Same 2D skip. |
| Widnall vortex-ring instability | One unstable azimuthal mode; wave number set by core size (Widnall–Bliss–Tsai 1973/1974). Numerical / Bessel. Crow already logged. |
| Euler collinear three-body | Fifth-degree in z = R₂₃/R₁₂. Homographic Kepler. Not a product min. Roberts kite already logged. |
| Sitnikov problem | Restricted 3-body on the axis. Circular case elliptic; e > 0 chaotic (Sitnikov 1960; Alekseev). Not algebraic. |
| Roche lobe / Hill sphere | Shape vs q numerical. Eggleton r₁/A = 0.49 q^{2/3}/(0.6 q^{2/3}+ln(1+q^{1/3})) is a fit, not a product min. L1 is a published saddle. |
| Chandrasekhar mass | Ultra-relativistic n=3 Lane–Emden (already logged). M_Ch ≈ 1.4 M_⊙ numerical. Isolated published. |
| Jeans / Toomre Q | λ_J = c_s √(π/Gρ). Q = c_s κ /(π G Σ) ≥ 1 (Toomre 1964). Isolated published stability threshold, not a 1-param product min. Do not claim. |
| Noh implosion | Uniform inflow, accretion shock at constant D. Density jump ((γ+1)/(γ−1))^n. Isolated published. Guderley already logged. |
| Barenblatt dipole / PME | Self-similar first-kind (Barenblatt–Zel'dovich 1957). Second-kind anomalous exponent when capillary retention. Not a vortex-collapse product. |
| Carrier–Greenspan | Hodograph linearizes NSWE on a slope. Runup R = 2 η_max for one family; Bessel J₀ standing wave. Isolated published / elliptic. Ritter already logged. |
| Nekrasov wave | Nonlinear integral equation for Φ(θ). Highest progressive 120° already logged (Stokes). Steepness numerical. |
| Davey–Stewartson lumps / dromions | Exact 2+1 lumps (Davey–Stewartson 1974). KP lump already `#lump`. Phase shifts published. |
| Tkachenko waves | Vortex-lattice displacement waves. ω ∝ k (slow) or k² (quantum Hall). Baym 2003; Andereck–Glaberson 1982. Published dispersion. |
| Schubart orbit | Collinear 3-body, two binaries per period (Schubart 1956). Existence variational. Numerical period. Figure-eight already logged. |
| Batchelor q-vortex / Sullivan | Exact NS. Batchelor 1964 trailing vortex; Sullivan 1959 two-cell. Burgers already logged. Isolated exact. |
| Prandtl–Batchelor | Closed-streamline vorticity is constant as Re → ∞ (Prandtl 1904; Batchelor 1956). A theorem, not a product min. |
| Rayleigh–Bénard | Free-free Ra_c = 27π⁴/4 at k d = π/√2 (Rayleigh 1916). Isolated published. Rigid-rigid Ra_c ≈ 1707.76 numerical. Not a 1-param product min. Do not claim. |
| Taylor–Couette | Thin-gap Ta_c ≈ 1708 (Taylor 1923). Same number as rigid-rigid Ra. Isolated published threshold. |
| Landau damping / two-stream | Collisionless Vlasov. Two-stream growth from a cold-beam cubic. Landau γ from the Landau contour. Published kinetic theory, not an algebraic interior min of two rates. |
| Rossby / Eady | L_d = N H / f. Eady max growth k c_i / σ_E ≈ 0.31 at μ ≈ 1.61 (Eady 1949). Numerical max. Isolated published length. |
| Onsager negative T | Bounded phase space → T < 0 (Onsager 1949). Joyce–Montgomery mean-field. Critical β* < 0. Statistical, not a collapse product. |
| Hill lunar | Variational orbit is a Fourier/power series in m (Hill 1878). Not a finite formula. Sitnikov / Euler collinear already logged. |
| Feynman–Onsager | Superfluid circulation κ = h/m (Onsager 1949; Feynman 1955). Isolated published quantum. |
| Alfvén | v_A = B / √(μ₀ ρ). Isolated published speed. Magnetosonic √(v_A² + c_s²) at θ = π/2. Not a 1-param product min. |
| Gotoda unused NS | Closed A(θ), B(θ) exist only for 3-vortex, parallelogram 4, and five-vortex (arXiv:2002.09624 §§3.1–3.2). N≥6 and (1,1,1,−1) are numerical H-A curves. Novikov–Sedov 1979: exact 3, 4, 5 only. No unused closed family. |
| Rott 1994 doubly periodic four | Vanishing mass, moments, polar inertia. Integrable. Two periods (configuration plane and absolute). Winding number = their ratio. Abstract: "simple closed-form results"; path patterns still numerical. Not a unique unpublished algebraic interior min of a 1-param product. Leapfrog already logged. |
| Eckhardt 1989 integrable four | Vanishing total circulation and impulse. Reduced 1DOF. Periods elliptic (Love-class). Not a floor like √2. |
| Jeffery–Hamel | Exact NS in a wedge. Critical α_c = K(k²)/m², complete elliptic (Rosenhead; Fraenkel). tan 2β = 2β has β* ≈ 2.247. Not algebraic. |
| Rolling disk (Routh) | Steady lean α, precession Ω, spin ω. Routh 1905; O'Reilly. Critical lean arctan of a nested radical ≈ 71.4° (uniform disk). Isolated published stability threshold, not a 1-param product min. |
| Double pendulum | Small-oscillation ω±. Equal mass/length: √(2±√2) √(g/l), product √2 g/l. Textbook. Vs length ratio λ, product ω+ω− = √((1+M)/λ) monotonic. Isolated published. Do not claim. Do not put a personal name on this √2. |
| Fadeev sheet | Exact MHD 1-param islands (Fadeev 1965). Harris f=0 end. Like Stuart for MHD. Isolated published family, no unpublished product min. |
| Larichev–Reznik modon | β-plane dipole. Interior Bessel, exterior K. Lamb–Chaplygin already logged. Isolated published. |
| Critical catenoid | w = coth w. Transcendental, Kapitza-class. Volume (π/2)R²h at threshold is a corollary of the same root. Isolated. |
| Chaplygin sleigh / Clebsch | Nonholonomic or rigid-body-in-fluid. Integrable cases (Kirchhoff, Clebsch, Kovalevskaya, Goryachev–Chaplygin). Periods elliptic/hyperelliptic. Lagrange top already logged. |
| gSQG / α-Euler | Badin–Barry 2018; Reinaud Physica D 2022. Three-vortex collapse exists; SQG can be non-self-similar. Tables of t_c numerical. 2D Euler slice is the three-vortex bound. Not a new algebraic floor. |
| Massive point vortices | Zbarsky arXiv:2402.07316: collapse impossible under mass conditions. Opposite of a fourth row. |
| Hollow-vortex implosion | arXiv:2506.04093 desingularizes existing point-vortex collapses. No new closed A, B. |
| Vortices on surfaces | Sphere already Kidambi. Ellipsoid / bean (Proc. A 2015): Green's functions not closed. No unused collapse product. Cone NS (Phys. Fluids 25, 2147, 1982) is a 2-param exact family, existence numerical. Wedge already logged. |
| Zipoy–Voorhees | Photon r = (2+1/γ)M, ISCO (3+1/γ ± √(5−1/γ²))M. Isolated published radii vs deformation. Extreme Kerr already logged. Not a 1-param product of two rates. |
| Prandtl punch | q = 2k(1+π/2). Isolated published 1920. |
| Kasner | Lifshitz–Khalatnikov u. Two constraints, three exponents. Published parametrization. Product of three expansion rates is not a two-rate identity. Do not claim. |
| Camassa–Holm 2-peakon | Phase shift 2 ln\|1−λ1/λ2\| (Camassa–Holm 1993). KdV 2-soliton already logged. Peakon already in the studio. |
| Chen–Walsh–Wheeler 2025 hollow implosion | arXiv:2506.04093. First rigorous self-similar collapsing hollow vortices. Single circular: U_c(γ, Ω, κ) explicit; Ω and κ independent, no shape-parameter product min. Multiple: generic desingularization of existing point-vortex collapses (the three locks). Not a fourth row. Cite as the Euler realization of the three-vortex bound / parallelogram / quincunx. |
| Grotto–Pappalettera 2025 gSQG | arXiv:2505.19782. Self-similar Z(t) = ((4−α)a(t−t0))^{1/(4−α)} exp(i(θ0+b/((4−α)a) log)). a, b not closed in shape. α=2 is 2D Euler (the three-vortex bound). α=1 SQG: numerical example. Existence, not a floor. |
| White–McDonald 2025 sheets | Proc. R. Soc. A 481, 20250362. Exact vortex-sheet equilibria by conformal mapping. 1-param γ; properties from a numerical algebraic equation. Not a closed two-rate min. |
| PRFluids 2025 four-vortex RE | Phys. Rev. Fluids 10, 084708. Continua of relative equilibria, not collapse. |
| Nested two-triangle 6-vortex | **Earlier rejection corrected 2026-09-20.** Ratios 1, 1/2, 2 miss the necessary virial-zero ratios (3±√5)/2. Koiller et al. 1985 §11 is a newly identified primary source for the two-ring collapse. A direct derivation gives (11−√5 cos 3θ)/(6 sin 3θ) ≥ √29/3. Proved candidate; priority unresolved. See identities/double-triangle.md and the correction below. |
| BEC two-vortex trap | ω(b) of a rigidly rotating pair has a published global min (Navarro; Pelinovsky Proc. A). One rate vs separation, not a product of two. Tkachenko already logged. |
| Hicks doughnut | Hollow ring with swirl. Thin-core series (Hicks 1884; Saffman 1970). Norbury–Fraenkel already logged. |
| Fukumoto–Miyazaki | Filament + axial flow. Permanent form = elastica (already logged). Hasimoto already in the studio. |
| Coaxial leapfrog rings | Helmholtz 1858. 3D Euler existence: CPAM 2024; García–Hassainia–Hmidi arXiv:2603.21644 (Mar 2026). KAM/Nash–Moser, not an algebraic floor. Love leapfrog already logged. |
| 3-vortex μ≠1 cubic | **Corrected 2026-09-23.** Gotoda (3.3) B disagreed with Prop. 2.1 when Γ₁≠Γ₂; the ~1.741 |B/2A| witness is withdrawn. Corrected μ=1/2 floor on Gotoda’s arc is P⋆≈2.203855; the global floor over both collapsing orientations is P_min ≈ 1.064705976271204 (same sextic; §A second correction). μ=1 still recovers √2. Same family as the three-vortex bound, not a new row. Do not claim. |
| Gallay–Sverak 2026 | arXiv:2609.10847 (9 Sep 2026). Hopf/ζ reduction, new energy inequalities H(ζ_A)>H(ζ_B), near-collision regularization. Not a two-rate product min. Cite; do not claim. |
| Rott 1994 body | Still AIP-blocked. Abstract: winding number = ratio of two periods; "beyond a certain level of the analysis, still the more practical method of solution" is step-by-step integration. No unpublished algebraic interior min extracted. Leapfrog already logged. |
| Möbius / Klein vortices | Balabanova–Montaldi Physica D 488, 135084 (Apr 2026); arXiv:2202.06160v3. One/two vortex motion, N-ring RE with coth/tanh angular velocities. Two-vortex fixed equilibria: nested-radical y. No collapse product. Catenoid coth already logged. |
| Four bugs / mice | Square: isolated T=L/v. Parallelograms stay parallelograms then converge to a square (Chapman–Trefethen Proc. A 2011; Golich et al.). Not a self-similar 1-param with two-rate floor. |
| C-metric | Photon surface algebraic in acceleration α. Isolated published radii. Extreme Kerr already logged. |
| Three-heton | Two-layer analog of 3-vortex. No closed unused A, B found. gSQG already logged. |
| Brizard XMHD X-point | arXiv:2504.07311v4 (Aug 2025). Self-similar 2D XMHD. Collapse time Jacobi elliptic in a quartic potential. Elliptic, published. Dai–Guerra–Wu arXiv:2405.00324 exclude some EMHD self-similar blowups. |
| Kozai–Lidov | Critical i = arccos √(3/5). Isolated published. Period is elliptic / a numerical fit. |
| Taylor cone | Half-angle 49.3° is the zero of P_{1/2}. Isolated published 1964. Alternative 33.5° also published. |
| Vortex + source | Single spiral vortex: log-spiral pitch Γ/Q. Isolated textbook. n-vortex with sources: no unused closed A, B. Kudela already numerical. |
| Hopfion / Belavin–Polyakov | Hopf invariant H = nm (two integers). Scale modulus isolated. Derrick. Not two dynamical rates. |
| Riemann ellipsoids | Two frequencies ω_l, ω_r vs axes. Riemann 1860. Sequences numerical or elliptic. Maclaurin–Jacobi already logged. |
| Chiral / active vortices | Self-reverting vortices: simulation. No closed collapse product. |
| Relativistic point vortices | No unused closed collapse product found. GR Larson–Penston D ≈ 1.439 is numerical. |
| SIR / Kermack–McKendrick | Peak at R0 S = 1. Final size implicit / Lambert W. Time-to-peak Padé (2023). Isolated published. Doubling × r = ln 2 is textbook. |
| Keller–Segel | Mass threshold 8π. Type-II λ(t) ~ √(T−t) exp(−√\|ln(T−t)\|), published. Not a two-rate algebraic floor. |
| Lotka–Volterra | Small-amp ω = √(αδ). Finite amplitude complete elliptic. Volterra averages published. |
| Kingman coalescent | E[Tk] = 4N / (k(k−1)). Isolated published waiting times. Discrete k, not a 1-param product min. |
| Hawk–dove ESS | p* = V/C. Isolated published. Replicator converges, no oscillation floor. |
| Nicholson–Bailey | Unstable fixed point, expanding cycles. Isolated published. |
| Little's law | L = λW always. Identity, not a min. 1961. |
| Kelly criterion | f* = p − q. Isolated published. |
| Kleiber / WBE | 3/4 scaling. Empirical / published theory. |
| Extra-μ five-vortex (Gotoda 3.13) | Same (a−b cos 2θ)/sin 2θ. ρ=−3 recovers the three-vortex bound √2 (diagonal ratio 3, already skipped). Other ρ: nested-radical floors, same formula as the quincunx. Not a new family. |
| Kallyadan–Shukla 2022 | Phys. Rev. Fluids 7, 114701. Linear system for similarity; 1-param families numerical, vortices on closed curves. No unused closed A, B. |
| Geostrophic 3-vortex 2025 | JPSJ 94, 094402. Collapse is non-self-similar. No single ω t_c. |
| Pentagon + centre | I = 5 Γ R² ≠ 0. Cannot collapse. |
| Periodic strip / parallelogram 3-vortex | Aref–Stremler 1996/1999. Zero net circulation, integrable, mapped to advection. Rational Γ: all motions periodic. Not a plane-style collapse product. |
| Jackiw–Pi / Chern–Simons | Static Liouville vortices. Scale-free BPS. Not a two-rate collapse floor. |
| Optical vortex annihilation | Core-size hydrodynamics, numerical/experiment. Fibich PRL 2006 is Kerr self-focusing. |
| Novikov peakon collision | Finite-time collision / ill-posedness below s=3/2. Not a 1-param two-rate algebraic min. |
| Abelian Higgs 3-vortex | Moduli geodesics; 2025 reconnection of filaments, not a point-collapse product. |
| Massive vortices on an annulus | Radial oscillation + precession; critical mass is an isolated published threshold. |
| Akhmediev breather β ω | β=√(8a(1−2a)), ω=2√(1−2a), a∈(0,1/2). Product βω has unique max 8√3/9 at a=1/6. Both factors are Akhmediev 1986; max MI gain is the published a=1/4, not this product. Same class as Jeffery AM-GM and Kirchhoff λ/(1+λ)². Do not claim. |
| Kidambi–Newton sphere | Collapse times t₁≠t₂ (partner states) are in the 1999 paper. Each vortex has a distinct angular velocity. No single ω t_c. |
| Wilberforce pendulum | Two normal modes, avoided crossing, textbook 1894. Product of uncoupled frequencies is the tuning condition, published. |
| Elliptic billiard / Poncelet | Rotation number is a quotient of elliptic integrals. 3-periodic caustic λ* published. Cayley conditions. |
| Ostrovsky–Hunter highest | Isolated published c=π²/9, peaked parabola explicit. |
| Matsuno Yanai / MRG | Isolated published dispersion ω=√((k/2)²+1)−k/2. |
| FitzHugh–Nagumo canards | Numerical canard locus. Two timescales, not an unpublished algebraic product min. |
| Vortices on a cone | No closed A, B found. Ellipsoid/bean already skipped. |

Do not re-derive these. Do not put a personal name on a μ ≠ 1 three-vortex product. Do not put a personal name on a distinguished-μ five-vortex slice, on O'Neil's quadruple, on a numerical family, on Love's elliptic period, on Kidambi–Newton's spherical t_c, on Peregrine's 3, on Moore–Saffman's 0.15, on Crowdy's H-state Ω, on Kaden's spiral, on Kimura's cubic, on Lamb–Chaplygin's j_{1,1}, on Hill's energy min, on Moffatt–Kimura's sκ = √2, on Burgers' Φ, on Föppl's locus, on Maclaurin's Ω max, on Ginzburg–Landau's 1/√2, on Kapitza's √2, on Jeffery's 4π, on Routh's (25+3√69)/2, on Saffman–Taylor's 1/2, on von Kármán's arcosh(√2)/π, on BKT's π/2, on Toomre's Q = 1, on Rayleigh's 27π⁴/4, or on the double-pendulum √2.

**Rejected as inventions.**


- `track` is a self-written waveguide (Monro, de Sterke, Poladian, J. Mod. Opt. 1998) and a photorefractive soliton (Segev) on a sine-Gordon breather. Open loop (eta = 0) recovers the Lorentz speed.
- `causticsea` is Swift-Hohenberg as its own phase screen. Laser-induced surface patterns are already modelled with Swift-Hohenberg (Rudenko, Colombier, Itina, Stoian, Phys. Rev. Lett. 130, 226201, 2023).
- A Swift-Hohenberg loop is not a new law. Neither is a sine-Gordon breather with an index written from strain.

**Published locks, do not rediscover.** Web-searched 2026-09-20. Each of these is already in a named paper. Do not derive them, and do not put a private name on them.

| Lock | Where it already is |
|---|---|
| Leapfrog existence α = 3 − 2√2; stability at 1/α = φ² | Love 1883; Tophøj and Aref 2013; Behring and Goodman, Phys. Rev. Fluids 4, 124703 (2019); exact analysis 2023 |
| Kirchhoff ellipse Ω = ω ab/(a+b)²; circle is Ω = ω/4 | Kirchhoff; Love stability for a/b < 3 |
| Photon-sphere Lyapunov λ = 1/(3√3 M); λ/Ω_ph = 1 in geometric units | Cardoso et al.; textbook Schwarzschild |
| Crapper energy and momentum integrals | Hogan 1979; Crapper, JFM 94, 13 (1979) |
| Gerstner kinetic energy equals potential | Standard; e.g. Henry, Gerstner's water wave and mass transport |
| Kidambi–Newton spherical three-vortex collapse times and partner states | Kidambi and Newton, Physica D 116, 143 (1998); Nuovo Cimento C 22, 779 (1999) |
| Finite-core / QG collapse-time numerical minima | Reinaud, GAFD 2020; Reinaud and Dritschel 2022 |
| t_c minimum 4π/3 on Γ = (1,1,−1/2) at this length | Leoncini, Kuznetsov and Zaslavsky 2000. Not the three-vortex bound’s product min. |
| Aref Ω and τ separately; product as log-spiral pitch | Aref 2010 eqs. 25a, 25d, 29c |
| Love leapfrog period T(α) | Complete elliptic integrals K, E (Love 1893; Tophøj and Aref 2013 eq. 11). Not an algebraic floor. |
| Moore–Saffman ellipse in irrotational strain | Two axis ratios iff e/ω₀ < 0.15; breakup above (1971) |
| Peregrine rogue-wave amplitude | \|u\|_max / \|u\|_∞ = 3; Akhmediev AF = 1+2√(1−2a) |
| Thomson centered regular N-gon | Unique N+1 equilibrium with N identical vortices on a circle (Aref and van Buren 2005) |
| Hasimoto filament soliton | c = 2τ; κ_max from the sech profile. Already the `#hasimoto` check. |
| Crowdy H-states Ω(a,N) | JFM 913, R5 (2021) eq. (3.11). Relative equilibrium. |
| Kaden algebraic spiral | r ∝ (t/θ)^{2/3} (Kaden 1931). |
| Sakajo: no self-similar 4-vortex collapse on a sphere | Phys. Fluids 19, 017109 (2007). |
| Kimura similarity A, B; collinear 3-vortex cubic | JPSJ 56, 2024 (1987). Already the machinery of the three locks; the cubic is the μ ≠ 1 skip. |
| Lamb–Chaplygin dipole | kR = first zero of J_1; U_max/U_0 ≈ 2.49 (Lamb; Flor 1994). |
| Norbury–Fraenkel / Hill | Lowest dimensionless ring energy is Hill's spherical vortex. |
| Pocklington translating hollow pair | U decreases monotonically with area (Crowdy et al. 2013). |
| Komineas–Papanicolaou magnetic Gröbli | JMP 51, 042705 (2010). Complete 3-vortex integration. |
| Moffatt–Kimura filament-pair similarity | sκ = 2 sin α; at α = π/4 this is √2 (JFM 2019 eq. 10.5). Not the three-vortex bound. |
| Burgers vortex dissipation | Φ = Γ²γ/8π independent of ν (1948). |
| Föppl cylinder pair | Locus r² − 1 = 2ry (1913). |
| Benjamin–Ono soliton | \|c\|Δ = 1. |
| Ginzburg–Landau type I / II | κ = λ/ξ = 1/√2 (Ginzburg–Landau 1950; Abrikosov 1957). Isolated. Not the three-vortex bound. |
| Maclaurin spheroid Ω max | Ω²/(πGρ) ≈ 0.449331 at e ≈ 0.92996 (1742). Numerical, not algebraic. |
| Stokes 120° crest | Highest gravity wave. H/λ ≈ 0.141 numerical (Michell; Toland). |
| Kerr ISCO | Bardeen–Press–Teukolsky cube-root formula. Photon-sphere λ/Ω already logged. |
| Routh / kite CC mass | (25+3√69)/2 (Roberts 2025, from Routh 1875). Isolated. |
| Kapitza product | (a/l)(ω/ω₀) > √2. Threshold, not the three-vortex bound. |
| Jeffery T γ̇ | min 4π at a sphere (1922). |
| Saffman–Taylor | λ = 1/2. Isolated. |
| Rayleigh–Plateau slender | λ = 2π√2 R. |

the three-vortex bound’s closed form and min √2 were not in those sources. Tacchi Appendix B remains unread. Kimura 1987 is the general similarity theory, not a fourth product min.

## Engineering that was checked (not science)

These are software claims. They transfer. They are not physics.

- Plates that check themselves against a predicted observable. Ordinary in computational physics teaching tools (percolation vs 91/48, Ising vs Onsager). Not found as a habit in generative-art tools, which expose a seed and rarity traits. Searched September 2026; negative on the art-platform side, snippet-level.
- `fieldCells()`: a technique declares it is already grid-limited so the print path stops spending memory on resolution that cannot exist.
- Sharpness as two numbers (edge acutance and multi-scale acuity). Average detail alone calls a Penrose tiling blurry.
- Lint for size controls that offer an option the sanitizer clamps away.
- Recipe v2 / `legacyFill`: a hash carries only diffs from defaults, so a moved default would rewrite old plates. Modules declare the old default. `node tools/recipe.js` derives its cases from the file.
- `applyHash` builds on the module defaults, not on whatever the viewer already had on screen.
- Familiarity buckets and `llms.txt` / `techniques.json` so a model does not scrape `studio.html`.
- `exportSVG` returns null when the vector picture would disagree with the plate (xy lic-only, chladni contour-only, gerstner woodcut-only, crapper never), so print falls through to PNG.
- WebGL LRU with a GL cap of 8 and `loseContext`, so visiting many GPU tabs does not kill the early ones silently.
- Video export (WebM, or MP4 where that is all the browser encodes) of a live plate. That is a clip of the plate in time, not a print.

`tools/sharp.js` counts in AGENTS.md are stale and optimistic. They predate a floor on edge acutance. Re-run `sh tools/sharpall.sh` before citing them. That is about an hour on a software renderer and has not been done.

## Per-tab status

130 techniques. `science only` means the paper is credited and nobody logged a "is there already a browser plate" search. That is most of the studio. Do not upgrade a `science only` row to "never been done" without searching, and do not search it unless you are about to claim software novelty.

Familiarity is listed so you do not confuse it with prior-article status.

| id | name | familiarity | prior-article status | re-search |
|---|---|---|---|---|
| `life` | Artificial Life | ubiquitous | science only | never searched |
| `physarum3d` | Physarum 3D | occasional | science only | never searched |
| `cortex` | Cortical Planforms | rare | software search | reopen if Observable/Shadertoy up |
| `bec` | Vortex Lattice | occasional | software search | skip unless new source |
| `physarum` | Physarum | occasional | science only | never searched |
| `phyllotaxis` | Phyllotaxis | common | science only | never searched |
| `hl` | Hastings–Levitov | occasional | science only | never searched |
| `lichtenberg` | Lichtenberg | common | science only | never searched |
| `snowflake` | Gravner–Griffeath | common | science only | never searched |
| `growth` | Differential Growth | common | science only | never searched |
| `cyclic` | Cyclic Competition | occasional | science only | never searched |
| `landscape` | Drainage Networks | common | software search | skip unless new source |
| `kpz` | Rough Growth | common | science only | never searched |
| `potts` | Foam & Grains | occasional | science only | never searched |
| `liesegang` | Liesegang Rings | rare | science only | never searched |
| `grains` | Force Chains | common | science only | never searched |
| `skyrmion` | Magnetic Skyrmions | rare | science only | never searched |
| `tonertu` | Flocking | rare | science only | never searched |
| `hyperbolic` | Hyperbolic Turing | unseen | software search | skip unless new source |
| `sle` | Schramm-Loewner Evolution | occasional | science only | never searched |
| `fractal` | Fractal Geometry | ubiquitous | science only | never searched |
| `lens` | Gravitational Lens | occasional | science only | never searched |
| `rotor` | Rotor Routers | unseen | unseen (editorial) | never searched |
| `web` | Cosmic Web | occasional | science only | never searched |
| `faraday` | Faraday Waves | occasional | science only | never searched |
| `film` | Thin Film | common | science only | never searched |
| `timecrystal` | Time Crystal | rare | science only | never searched |
| `growdomain` | Growing Domain | unseen | unseen (editorial) | never searched |
| `spinice` | Spin Ice | rare | science only | never searched |
| `vegetation` | Vegetation Bands | common | science only | never searched |
| `aztec` | Arctic Circle | occasional | science only | finite-size constant searched 2026-09-26; implementation never searched |
| `skin` | Skin Effect | occasional | science only | never searched |
| `rmt` | Random Matrices | unseen | software search | skip unless new source |
| `stealth` | Stealthy Points | rare | science only | never searched |
| `lozenge` | Lozenge Tilings | unseen | unseen (editorial) | finite-size constant searched 2026-09-26; implementation never searched |
| `arago` | Arago Spot | occasional | science only | never searched |
| `ust` | Spanning Trees | rare | science only | never searched |
| `cppn` | Neural Patterns | common | science only | never searched |
| `rogue` | Rogue Wave | occasional | science only | never searched |
| `aharonov` | Aharonov–Bohm | occasional | science only | never searched |
| `pendulum` | Double pendulum flip time | ubiquitous | science only | never searched |
| `anderson` | Anderson | occasional | science only | never searched |
| `fput` | FPUT Recurrence | occasional | science only | never searched |
| `schrodinger` | Schrödinger | common | science only | never searched |
| `excitable` | Excitable Media | common | science only | never searched |
| `soliton` | KdV Soliton | common | science only | never searched |
| `cyclicca` | Cyclic Automaton | common | science only | never searched |
| `chimera` | Chimera States | occasional | science only | never searched |
| `ssh` | SSH Edges | rare | science only | never searched |
| `swarm` | Swarmalators | occasional | science only | never searched |
| `amb` | Active Model B+ | rare | science only | never searched |
| `aubry` | Aubry–André | unseen | unseen (editorial) | never searched |
| `cahn` | Cahn–Hilliard | occasional | science only | never searched |
| `ohta` | Ohta–Kawasaki | rare | science only | never searched |
| `hopf` | Hopf Fibration | occasional | science only | never searched |
| `swift` | Swift–Hohenberg | rare | science only | never searched |
| `pfc` | Phase-field crystal | rare | science only | never searched |
| `lp` | Lifshitz–Petrich | occasional | science only | never searched |
| `cloak` | Pendry Cloak | occasional | science only | never searched |
| `xy` | XY / Kosterlitz–Thouless | common | science only | never searched |
| `cgl` | Complex Ginzburg–Landau | occasional | science only | never searched |
| `vortex` | Abrikosov | occasional | science only | never searched |
| `nematic` | Active Nematics | occasional | science only | never searched |
| `darkroom` | Dark Room | occasional | science only | never searched |
| `fluid` | Fluid | ubiquitous | science only | never searched |
| `sandpile` | Abelian Sandpile | common | science only | never searched |
| `kakeya` | Kakeya | rare | science only | never searched |
| `ks` | Kuramoto–Sivashinsky | occasional | science only | never searched |
| `breather` | SG Breather | occasional | science only | never searched |
| `turing` | Turing Patterns | common | science only | never searched |
| `holomorphic` | Holomorphic dynamics | ubiquitous | science only | never searched |
| `klein` | Klein Tunnel | occasional | science only | never searched |
| `gyroid` | Gyroid | occasional | science only | never searched |
| `dendrite` | Dendritic Growth | common | science only | never searched |
| `purcell` | Purcell Swimmer | rare | science only | never searched |
| `exceptional` | Exceptional Point | unseen | unseen (editorial) | never searched |
| `meissner` | Meissner | occasional | science only | never searched |
| `tennis` | Tennis Racket | occasional | science only | never searched |
| `flow` | Flow Field | ubiquitous | science only | never searched |
| `chemotaxis` | Chemotaxis | common | science only | never searched |
| `smectic` | Smectic focal conics | rare | science only | never searched |
| `reaction` | Reaction-Diffusion | common | science only | never searched |
| `tilings` | Aperiodic Tilings | common | science only | never searched |
| `percolation` | Percolation | ubiquitous | science only | never searched |
| `attractors` | Attractors | ubiquitous | science only | never searched |
| `airy` | Airy Beam | occasional | science only | never searched |
| `chirikov` | Chirikov map | occasional | science only | never searched |
| `hofstadter` | Hofstadter butterfly | occasional | science only | never searched |
| `weierstrass` | Weierstrass | occasional | science only | never searched |
| `scars` | Helmholtz scars | occasional | science only | never searched |
| `kitaev` | Kitaev Chain | rare | science only | never searched |
| `caustics` | Optical caustics | common | science only | never searched |
| `veselago` | Veselago Lens | rare | science only | never searched |
| `devil` | Devil's Staircase | rare | science only | never searched |
| `talbot` | Talbot carpet | occasional | science only | never searched |
| `orbitals` | Hydrogen orbitals | common | science only | never searched |
| `loschmidt` | Loschmidt Echo | rare | science only | never searched |
| `boy` | Boy's Surface | occasional | science only | never searched |
| `pearls` | Indra's Pearls | common | science only | never searched |
| `ising` | Ising Model | ubiquitous | science only | never searched |
| `thouless` | Thouless Pump | rare | science only | never searched |
| `convection` | Rayleigh–Bénard | common | science only | never searched |
| `reuleaux` | Reuleaux | occasional | science only | never searched |
| `apollonian` | Apollonian | occasional | science only | never searched |
| `chladni` | Chladni & Waves | common | science only | never searched |
| `track` | Track | unseen | family+feedback | do not claim invention |
| `knotlight` | Knotted Light | occasional | science only | never searched |
| `causticsea` | Caustic Sea | rare | family+feedback | do not claim invention |
| `kp` | Soliton Web | occasional | software search | skip unless new source |
| `gerstner` | Gerstner | occasional | software search | skip unless new source |
| `eight` | Figure Eight | occasional | software search | skip unless new source |
| `peakon` | Peakon | occasional | software search | skip unless new source |
| `photon` | Photon Sphere | common | software search | skip unless new source |
| `crapper` | Crapper | occasional | software search | skip unless new source |
| `hasimoto` | Hasimoto | occasional | software search | skip unless new source |
| `lump` | Lump | occasional | software search | skip unless new source |
| `three-vortex-bound` | Three-vortex collapse bound | unseen | identity | do not re-derive |
| `parallelogram-lock` | Parallelogram lock | unseen | identity | do not re-derive |
| `quincunx-lock` | Quincunx lock | unseen | identity | do not re-derive |
| `double-triangle-bound` | Polygon collapse bounds | rare | proved candidate; priority unresolved | 2026-09-20 partial primary-source review; full-text check pending |
| `maxwell` | Maxwell FDTD | occasional | science only | never searched |
| `molecular` | Molecular Dynamics | occasional | science only | never searched |
| `surfaces` | Parametric Surfaces | familiar | science only | never searched |
| `nonreciprocal` | Nonlinear Active Mixture | obscure | science only | never searched |
| `plasma` | Kinetic Plasma | occasional | science only | never searched |
| `shallow` | Shallow Water | occasional | science only | never searched |
| `neural-mass` | Neural Populations | occasional | science only | never searched |
| `hodgkin-huxley` | Hodgkin-Huxley Membranes | occasional | science only | never searched |
| `direct-gravity` | Direct Gravity | common | science only | never searched |
| `volume-wave` | Wave volume | occasional | science only | never searched |

## Notes on the rows that are not `science only`

### Derived identities (the physics claims that are not in the cited papers)

The statements are in [`IDENTITIES.md`](IDENTITIES.md). Do not duplicate them here.

**`three-vortex-bound` (Three-vortex collapse bound).** `#three-vortex-bound` still opens it. Classical specialization implemented here; historical originality unconfirmed. Search notes: Aref 2010 eqs. 25a and 25d give Omega and tau separately. Aref eq. 29c already writes the product as the pitch of the logarithmic spiral. Kudela 2014 and Reinaud-Dritschel 2022 minimize collapse time, not the product. Krishnamurthy-Stremler 2018 give dimensionless tau-tilde as a function of angles, no min sqrt(2). Closed form and min: not in those papers. **Update 2026-09-24:** Kimura 1987 (J. Phys. Soc. Jpn. 56, 2024), Sect. 4, Eq. (4.4), gives A and B in exactly this parametrization for Γ = (2, 2, −1), so the closed form is B/(−2A) of his rates, one division away; he minimizes the collision time (Eq. 4.6, cos 2θ = 3/5), not the product, and the min √2 is not in his paper. The module credit now names Kimura. Off the L=0 circle the check marks miss on purpose. Re-search: YES do not re-derive; reopen only if a newly named paper states this closed form or this minimum.

**`parallelogram-lock` (Parallelogram lock).** Classical specialization implemented here; historical originality unconfirmed. Search notes: Novikov-Sedov 1979 give t_* and ω separately for the parallelogram family. Gotoda 2020 eq. (3.13) writes A(θ) and B(θ) separately and plots Hamiltonian against collapse rate. Neither forms the product ω t_c or states min 3√5/4 at cos 2θ = 1/4. Off the parallelogram the check marks miss on purpose. Re-search: YES do not re-derive; reopen only if a newly named paper states this closed form or this minimum. Do not claim Novikov-Sedov's t_* or ω separately.

**`quincunx-lock` (Quincunx lock).** Classical specialization implemented here; historical originality unconfirmed. Search notes: Novikov-Sedov 1979 give the five-vortex parallelogram-plus-center motion. Gotoda 2020 eq. (3.13) with γ3 ≠ 0 writes A(θ) and B(θ) separately and plots this family (γ1 = −1, γ2 = 1/2, γ3 = −3/4) as Hamiltonian against collapse rate. Gotoda 2024/2025 (arXiv:2410.14973) studies filtered-vortex enstrophy on the same family numerically. Full-text extract of Gotoda 2020 contains no 4/7, no √33, no ω t_c product, no −B/(2A) minimum. Web search for 3√33/16 and cos 2θ = 4/7 as a vortex product returned no hits. Direct Biot-Savart (2π kernel) matches (3/16)(7 − 4 cos 2θ)/sin(2θ). Off the quincunx the check marks miss on purpose. A five-vortex slice with μ = 3 recovers the three-vortex bound’s product identically and is not claimed. Re-search: YES do not re-derive; reopen only if a newly named paper states this closed form or this minimum. Do not claim Novikov-Sedov's t_* or ω separately, and do not put a personal name on this plate.

### Published family plus a feedback term (not inventions)

**`track` (Track).** Self-written waveguide (Monro, de Sterke, Poladian 1998) + photorefractive soliton (Segev) on a sine-Gordon breather. NOT an invention. Do not private-name it. Open loop must recover Lorentz speed. Re-search: YES do not claim invention.

**`causticsea` (Caustic Sea).** Swift-Hohenberg height as its own phase screen. Laser-induced surface patterns already modelled with SH (Rudenko et al. PRL 2023). NOT an invention. Name is the picture. Re-search: YES do not claim invention.

### Browser / print implementation searches (September 2026)

**`cortex` (Cortical Planforms).** Ermentrout-Cowan 1979, Bressloff 2001. No interactive browser version found. WEAKEST negative: Observable and Shadertoy could not be opened. Reopen only if those sites are reachable. Re-search: REOPEN if Observable or Shadertoy is reachable.

**`bec` (Vortex Lattice).** Browser rotating GPE exists: George Stagg WebGL "Trapped & Rotating" (2019), click-inject, damped real time. GPUE is CUDA winding detection. Combo of imag-time + winding + density filter + vector export in a page: not found. Re-search: YES unless a newly named repo or paper.

**`landscape` (Drainage Networks).** FastScape / fastscapelib / LandLab are notebook codes, no browser target on fastscapelib roadmap. Browser "erosion" is droplet hydraulic CG, different model. Re-search: YES unless a newly named repo or paper.

**`hyperbolic` (Hyperbolic Turing).** Gray-Scott on {p,q} Poincare disk. Nearest: Shintyakov Hyperbolic CA (discrete CA, not PDE). VisualPDE "hyperbolic RD" is PDE class, not geometry. Do not re-search that collision. Re-search: YES unless a newly named repo or paper.

**`rmt` (Random Matrices).** Continuous-beta sheet (Dumitriu-Edelman). DPPy and general-beta samplers exist. Spatial beta axis as one image: not found. Could sit in a paper not read. Re-search: YES unless a newly named repo or paper.

**`kp` (Soliton Web).** Sato/Hirota tau, Miles Y, Kodama/Biondini webs. Matplotlib/Mathematica notebooks in the papers. Seeded paletted print-ready browser plate of the exact tau: not found. Re-search: YES unless a newly named repo or paper.

**`gerstner` (Gerstner).** Gerstner 1802 / Rankine 1863. Tessendorf two-train is graphics and is labeled as such. Browser print plate of the exact Lagrangian map with orbit RMS check: not found in the search that was run. Re-search: YES unless a newly named repo or paper.

**`eight` (Figure Eight).** Moore 1993, Chenciner-Montgomery 2000, Simo 16-digit IC. The orbit is famous. Seeded print plate with |L|, energy drift, return distance: searched, not found as a studio tab. Re-search: YES unless a newly named repo or paper.

**`peakon` (Peakon).** Camassa-Holm 1993, BSS multi-peakon. Speed=amplitude sampled from the field. Browser print plate: searched, not found. Re-search: YES unless a newly named repo or paper.

**`photon` (Photon Sphere).** Schwarzschild / Darwin / Synge. Capture ring at 3M, b=3sqrt(3)M. Many relativity demos exist. This plate checks b_meas and r_ph from the integrator. Re-search: YES unless a newly named repo or paper.

**`crapper` (Crapper).** Crapper JFM 1957; Hur and Vanden-Broeck 2020 same profile at g=sigma=0. Steepness identity. Browser print plate: searched, not found. Re-search: YES unless a newly named repo or paper.

**`hasimoto` (Hasimoto).** Hasimoto JFM 1972 LIA to NLS. kappa_max/(2 nu) and c/(2 tau0) from the polyline. Browser print plate: searched, not found. Re-search: YES unless a newly named repo or paper.

**`lump` (Lump).** Manakov et al. 1977 KP-I lumps. Distinct from kp (KP-II webs). Residual by FD of the rational field. Browser print plate: searched, not found. Re-search: YES unless a newly named repo or paper.

### Familiarity "unseen" is not a search

**`rotor` (Rotor Routers).** Levine-Peres 2009 rotor-router / internal DLA. Familiarity "unseen" is editorial. No dedicated "browser version?" search logged. Re-search: NO search yet; do not treat unseen as a negative result.

**`growdomain` (Growing Domain).** Crampin, Gaffney, Maini 1999 Turing on a growing domain. Familiarity "unseen" is editorial. No dedicated implementation search logged. Re-search: NO search yet; do not treat unseen as a negative result.

**`lozenge` (Lozenge Tilings).** Propp-Wilson CFTP lozenge tilings, Cohn-Kenyon-Propp limit shape. Familiarity "unseen" is editorial. Aztec (arctic circle) is a sibling tab and was not separately searched either. The 2026-09-26 search below was for the finite-size constant of the frozen area, not for implementations. Re-search: NO implementation search yet; do not treat unseen as a negative result.

**`aubry` (Aubry–André).** Aubry-Andre 1980 localization without disorder. Familiarity "unseen" is editorial. No dedicated implementation search logged. Re-search: NO search yet; do not treat unseen as a negative result.

**`exceptional` (Exceptional Point).** Bender-Boettcher PT / Heiss exceptional points. Familiarity "unseen" is editorial. No dedicated implementation search logged. Re-search: NO search yet; do not treat unseen as a negative result.


## Queries worth not repeating

Write the query next time. These are the families that were already run, reconstructed from the README rather than from a query log, so they are approximate. If you re-open one, log the exact string below.

| About | What was looked for | Result |
|---|---|---|
| `hyperbolic` | browser Gray-Scott on a hyperbolic tiling; hyperbolic CA | Shintyakov Hyperbolic CA Simulator (discrete CA). VisualPDE hit is the wrong sense of hyperbolic. |
| `rmt` | continuous beta ensemble as a single image, beta as a spatial axis | DPPy and general-beta samplers. The sheet presentation not found. |
| `bec` | browser rotating Gross-Pitaevskii vortex lattice with winding detection | George Stagg WebGL 2019 (click-inject, damped real time). GPUE is CUDA. |
| `cortex` | interactive Wilson-Cowan / retinocortical map in a browser | Not found. Observable and Shadertoy were unreachable. Weakest negative in the file. |
| `landscape` | browser stream-power / Braun-Willett / FastScape | Research codes are Python/C++/Fortran. Browser erosion is droplet CG. |
| `kp` | browser KP-II resonant soliton webs from the exact tau function | Notebooks in the papers. No seeded print plate found. |
| `gerstner` `eight` `peakon` `photon` `crapper` `hasimoto` `lump` | seeded print-ready browser plate of the exact solution, with the self-check | Papers and some demos. Combined studio object not found in the search that was run. |
| `three-vortex-bound` | the closed form of omega t_c on Gamma=(1,1,-1/2) and its min sqrt(2) | Product as spiral pitch: Aref 2010 eq. 29c. The rates A and B in this very parametrization: Kimura 1987 Eq. (4.4), so the closed form is their ratio (read 2026-09-24). Min √2: not in Gröbli 1877, Kimura 1987, Aref 2010, Krishnamurthy-Stremler 2018, Kudela 2014. |
| `track` `causticsea` | is a published PDE plus a feedback term an invention | No. Named prior articles in both cases. |
| self-checking gen-art | a generative art tool that measures an observable against theory | Not found on art platforms (seed + traits). Physics teaching tools do this routinely. Rechecked 2026-09-24 (log entry below): still not found; the nearest science-art studios, Simunauts and Morphon, could be read only through search snippets. |
| `flow` `attractors` `turing` formula entry | typing the equations of a simulation into a browser studio | Not searched, and not new: interactive formula entry for PDEs in the browser is the core of VisualPDE (Walker, Townsend, Chudasama and Krause, Bull. Math. Biol. 85:113, 2023; see the 2026-09-24 survey entry). The Flow Field custom field and the Attractors custom ODE (2026-09-25) follow it and are credited to it, and so does the Turing tab's custom reaction (2026-09-25), typed reaction terms with the diffusion built in, which is VisualPDE's own use. Re-search: skip. |
| comparable public projects | a public tool combining per-technique numerical validation, per-model citations, seeded recipe links and physical-size print or SVG export | Not found, 2026-09-24 (log entry below). Nearest in rigor: VisualPDE (PDEs only, peer reviewed). Nearest science-art studios: Simunauts (84 browser simulations), Morphon (63, iOS). Snippet-level negative. |

## Still open

Do these only if you need the answer. Do not do them to look busy.

1. **Reopen `cortex`** if Observable, Shadertoy, or OpenProcessing actually load. That negative is explicitly weak.
2. **The five editorial-unseen tabs** (`rotor`, `growdomain`, `lozenge`, `aubry`, `exceptional`) have never had a dedicated implementation search. Familiarity is not that search.
3. **Every `science only` row** has no logged "browser plate?" search. Run one only when you are about to write a README bullet claiming software novelty for that tab.
4. **arXiv / journals.** If those hosts are reachable, Three-vortex collapse bound (the closed form and the min, not Aref's product) and the KP / Crapper / Hasimoto exact-solution plates are the first things to check against the PDF, not against a snippet.
5. **`tools/sharpall.sh`** is a measurement, not a prior-article search, and it is stale. Redo before quoting sharpness counts.
6. **fxhash / Art Blocks / OpenProcessing** as homes for lookalikes of the self-checking-plates claim. Unreachable in September 2026. On 2026-09-24 the fxhash boilerplate on GitHub and search snippets of the Art Blocks docs confirmed the seed-as-artwork model and no science; their galleries and OpenProcessing were still not opened.
7. **The 2026-09-24 comparable-projects survey** rests mostly on snippets. Reopen it when visualpde.com, simunauts.vercel.app, apps.apple.com or softology.pro load, and check print sizing, citations and validation page by page.

## How to add a line

Append, do not rewrite history. Use this shape:

    ### YYYY-MM-DD  `<id or topic>`  query: "<exact string>"
    Opened: (URLs that loaded)
    Blocked: (hosts that did not)
    Conclusion: one sentence.
    Re-search: skip until <condition>, or never, or reopen.

If the conclusion changes a row in the table, change the table in the same commit. If you add a technique, add a row the same day, even if the status is `science only`.

If you are an agent and you did not search, do not invent a row.

## Log

### 2026-09-19  ledger created  query: (none; compiled from README "What is actually new" and the search limits already stated there)

Opened: this repository (`README.md`, `techniques.json`, `AGENTS.md`)

Blocked: none for this pass

Conclusion: first ledger, so future agents do not re-run the September 2026 searches. No new search was performed this day.

Re-search: n/a

### 2026-09-19  hash renamed to `#three-vortex-bound`  query: (none)

Opened: this repository

Blocked: none

Conclusion: the plate is Three-vortex collapse bound, so the canonical hash is `#three-vortex-bound`. The identity is a historical candidate with unconfirmed priority: the check misses off the L=0 circle, and the closed form and min require a complete literature review. A later agent may claim another result the same way (derive, check the papers, a plate whose check can miss, write IDENTITIES.md). It may not put a name on a published equation or on someone else's result.

Re-search: n/a

### 2026-09-19  `three-vortex-bound` renamed  query: (none)

Opened: this repository

Blocked: none

Conclusion: display name is Three-vortex collapse bound. Hash `#three-vortex-bound` is unchanged.

Re-search: n/a

### 2026-09-19  the three-vortex bound uniqueness  query: point vortex collapse dimensionless product omega t_c minimum sqrt(2) octant triangle; Aref 2010 three vortex collapse rate angular frequency product; Gröbli collapsing triangle tan theta 1/sqrt(2) 22.5 45 112.5; "self-similar collapse" vortices sqrt(2) omega t_c

Opened: Aref, Phys. Fluids 22, 057104 (2010), full PDF via VTechWorks bitstream 2b7fd3cf-09d3-4fe7-8558-a9948a899f1d. Krishnamurthy and Stremler 2018 postprint at people.iith.ac.in. Gröbli 1877 English translation arXiv:2404.01305 HTML. Search snippets for Kudela 2014, Reinaud and Dritschel 2022 Physica D 434 133226.

Blocked: AIP HTML paywall (PDF was used instead). Most journals.

Conclusion: the motion is Gröbli. Omega and tau separately are Aref 25a and 25d. The product as log-spiral pitch is Aref 29c. Collapse-time minima exist in Kudela 2014 and Reinaud 2022, of tau, not of omega tau. The closed form (2-cos^2 theta)/sin(2 theta) on Gamma=(1,1,-1/2) and unique min sqrt(2) at tan theta=1/sqrt(2) were not in those sources. That is Three-vortex collapse bound: not Gröbli's motion under a new name, and not Aref's product under a new name.

Re-search: do not re-derive. Reopen only if a newly named paper states this closed form or this minimum.

### 2026-09-19  Tacchi / Kimura named in the identity writeup  query: Tacchi Dynamique des tourbillons dans les fluides bidimensionnels Appendix B Kimura 1988 vortex collapse coefficients

Opened: search snippets only. The identity writeup names M. Tacchi, Dynamique des tourbillons dans les fluides bidimensionnels, Appendix B, documenting related explicit coefficients in an example attributed to Kimura (1988).

Blocked: the thesis PDF itself.

Conclusion: named, not read. Reopen when the appendix can be opened. Do not treat a snippet as a reading of the coefficients. If that appendix already states omega_0 t_c = (2-cos^2 theta)/sin(2 theta) and the min sqrt(2) at tan theta = 1/sqrt(2), the uniqueness claim has to be revised the same day.

Re-search: reopen when Tacchi Appendix B or Kimura 1988 is in hand.

### 2026-09-20  second identity search  query: three vortex collapse omega t_c minimum circulation ratio (1, mu, -mu/(1+mu)); Leoncini Kuznetsov Zaslavsky fastest collapse 4pi/3; leapfrogging period translation speed product Love Tophøj Aref; Novikov-Sedov parallelogram four vortex collapse omega tau; Hasimoto kappa r_max torsion; Kida ellipse strain collapse; Kidambi Newton sphere collapse time angular velocity product; Crapper capillary steepness maximum energy; Kudela 2014 Reinaud Dritschel 2022 collapse time minimum

Opened: Aref 2010 PDF via VTechWorks (bitstream 2b7fd3cf-09d3-4fe7-8558-a9948a899f1d). Krishnamurthy and Stremler 2018 postprint at people.iith.ac.in (dimensionless tau-tilde = -sin B sin(A+B)/sin(A+2B), and hat-tau at fixed separation, plotted, not closed-form minimized in u = tan theta). Leoncini, Kuznetsov and Zaslavsky, arXiv physics/9908055 / Phys. Fluids 12, 1911 (2000): figure caption states a fastest collapse with tau = 4pi/3. Search snippets and HTML for Tophøj-Aref 2013, Behring-Goodman 2019/2022, Novikov-Sedov JETP 50, 297 (1979), Gotoda 2020, Hasimoto JFM 1972, Kida JPSJ 1981, Kidambi-Newton Physica D 1998, Crapper JFM 1957, Kudela Fluid Dyn. Res. 46, 031414 (2014), Reinaud-Dritschel-Scott Physica D 434, 133226 (2022). Direct Biot-Savart algebra on the L = 0 circle in this repo (2pi kernel).

Blocked: most journal HTML. Tacchi appendix still unread. Leoncini body text was font-encoded; the 4pi/3 statement is from the arXiv figure caption, not from a full re-typeset of every equation.

Conclusion: no second identity of the historical candidate-selection criterion shipped. On Gamma = (1,1,-1/2) the product splits as t_c = (pi/3)(4u + 1/u) and 2 pi omega = 3(2u^2+1)/(4u^2+1) with u = tan theta and |z1-z2| = 1. Those are Aref 25a/25d in this angle; they belong under Three-vortex collapse bound as factors, not as a new name.

Re-search: do not re-derive the three-vortex bound. Do not claim the t_c minimum, the general-mu sextic, leapfrog silver/golden, Novikov-Sedov, Hasimoto 4, Kirchhoff 1/4, or Kidambi-Newton. Reopen only if a newly named paper states the three-vortex bound’s closed form or min, or if Tacchi Appendix B is in hand. A later algebraic, unpublished product with a unique interior extremum and a plate whose check can miss may still be claimed the same way the three-vortex bound was.

### 2026-09-20  Leoncini 2000 fastest collapse  query: Leoncini Kuznetsov Zaslavsky "Motion of three vortices near collapse" tau 4pi/3 Lambda sqrt(3)/2 fastest

Opened: arXiv physics/9908055 PDF (saved). Search snippets of Phys. Fluids 12, 1911 (2000).

Blocked: AIP HTML. Body text of the PDF is font-encoded on this machine; caption text was readable via the arXiv HTML extract: "fastest collapse value Lambda = sqrt(3)/2" and "tau = 4pi/3".

Conclusion: the fastest collapse time in the standard normalization is already in that paper. IDENTITIES.md records the factor formulas under Three-vortex collapse bound and does not claim the t_c bound. the three-vortex bound’s product min sqrt(2) at tan theta = 1/sqrt(2) is a different extremum (scale-invariant) and was not found in this paper's extracted captions.

Re-search: skip unless a full text extract is needed to check whether they also minimize omega t_c. If they do, revise the three-vortex bound uniqueness the same day.

### 2026-09-20  literature-first identity hunt  query: "omega t_c" OR "ω t_c" OR "Ω τ" three vortices collapse minimum sqrt(2); leapfrogging vortex pairs golden ratio Tophøj Aref Behring Goodman; photon sphere Lyapunov exponent orbital frequency ratio Schwarzschild; Kirchhoff elliptical vortex maximum angular velocity aspect ratio; Crapper capillary wave energy maximum Hogan; Gerstner wave kinetic potential energy ratio; three point vortices on a sphere collapse Kidambi Newton; Tacchi Dynamique des tourbillons Appendix B Kimura pdf

Opened: web search result snippets and reachable HTML. arXiv abs/pdf for physics/9908055, 1908.08618 (Behring-Goodman), 2410.14973 (Gotoda enstrophy). Krishnamurthy-Stremler 2018 postprint at people.iith.ac.in. St Andrews GAFD preprint 10023/24112 (Reinaud QG collapse, numerical τ min ≈ 0.3657). JETP Novikov-Sedov PDF at jetp.ras.ru. Kidambi-Newton 1998/1999 abstracts (collapse times and partner states on the sphere). Kirchhoff Ω = ω ab/(a+b)² in AMS glossary and Love. Photon-sphere λ = 1/(3√3 M) in Cardoso-lineage reviews and arXiv 2307.06415. Crapper/Hogan JFM 1979 energy integrals. Henry "Gerstner's water wave and mass transport" (T = V). IOP plasma-book extract with a different-family τ_c = (5−3 cos 2θ) ℓ²/(12 sin 2θ), min at θ = ±½ arccos(3/5).

Blocked: Tacchi thesis PDF still unread. Kimura 1988 Fluid Dyn. Res. 3, 98 is a two-page conference note on complex-time singularities, not a coefficient table. Most journal HTML.

Conclusion: no second identity of the historical candidate-selection criterion. The nearby beautiful locks are published (table above). the three-vortex bound’s closed form (2−cos²θ)/sin(2θ) and min √2 at tan θ = 1/√2 were not in those sources. Search first; do not rediscover.

Re-search: skip the rows in the published-locks table unless a newly named paper appears. Reopen Tacchi Appendix B / Kimura 1988 coefficients when the files can be opened. Reopen the three-vortex bound uniqueness only if a newly named paper states that closed form or that minimum.

### 2026-09-20  five-vortex quincunx product  query: Gotoda 2002.09624 eq 3.13 five vortex A(theta) B(theta) gamma_3; Novikov-Sedov JETP 50 297 five vortex parallelogram plus center t_* omega; "3 sqrt(33)/16" OR 3√33/16 vortex collapse; "cos 2θ" "4/7" vortex collapse minimum; Gotoda 2410.14973 enstrophy five vortex Hamiltonian against collapse rate; mu=3 five vortex recovers (3-cos 2θ)/(2 sin 2θ)

Opened: Gotoda arXiv 2002.09624 HTML (ar5iv) section 3.2 / eq. (3.13) for A(θ), B(θ) on the parallelogram, including γ3; conditions (3.11)–(3.12) I = 0, Γ_H = 0. Gotoda arXiv 2410.14973 HTML: numerical enstrophy on the four- and five-vortex Novikov-Sedov families, plots of H vs A, no product min. Novikov-Sedov JETP PDF extract: t_* and ω separately. Full-text extract /tmp/gotoda.txt: no 4/7, no √33, no ω t_c, no −B/(2A) as a minimized product. Web search for 3√33/16 and cos 2θ = 4/7 as a vortex lock: no hits. Direct Biot-Savart algebra on Γ = (−1, −1, 1/2, 1/2, −3/4), d1/d2 = 1/√2 (2π kernel) matches ω t_c = (3/16)(7 − 4 cos 2θ)/sin(2θ). Critical point of (7 − 4 cos φ)/sin φ is cos φ = 4/7, min √33, hence 3√33/16. Plate `#quincunx-lock` lock 1.000, broken misses. The μ = 3 five-vortex slice recovers the three-vortex bound’s (3 − cos 2θ)/(2 sin 2θ) ≥ √2 identically; logged and not claimed.

Blocked: most journal HTML. Tacchi appendix still unread.

Conclusion: a third identity of the historical candidate-selection criterion. Gotoda states A(θ) and B(θ) separately and does not form the product or its unique interior min. Novikov-Sedov state the motion, t_*, and ω separately. Do not claim those. Do not put a personal name on this plate.

Re-search: do not re-derive. Reopen only if a newly named paper states ω t_c = (3/16)(7 − 4 cos 2θ)/sin(2θ) or min 3√33/16 at cos 2θ = 4/7.

### 2026-09-20  hunt outside Novikov-Sedov  query: self-similar four vortex collapse isosceles (1,1,1,-1) closed form omega t_c; Novikov Sedov five vortex golden ratio diagonal mu phi product minimum; Kallyadan Shukla 2022 self-similar vortex configurations closed A(theta); O'Neil 1987 explicit four vortex collapse family; hollow vortices arXiv:2506.04093 collapsing quadruple omega kappa product; point vortices half-plane wall image self-similar collapse exact; three point vortices periodic strip collapse; Gotoda 2410.14973 theta_Z closed form; three vortex collapse product min circulation ratio mu sqrt(17/15)

Opened: Gotoda arXiv 2002.09624 HTML (ar5iv) eqs. (3.3)–(3.8), (3.13), §4.1 uniform-strength family. Gotoda arXiv 2410.14973 HTML: θ_Z is a 200-point grid bracket. Hollow-vortices arXiv:2506.04093 HTML examples 4.2 (triple) and 4.3 (O'Neil quadruple): single configs, published Ω and 1/κ. Kallyadan–Shukla Phys. Rev. Fluids 7, 114701 (2022) abstract: numerical families. Donati–Godard-Cadillac–Iftimie arXiv:2403.17900: same-sign boundary collapse impossible. Aref 1996 periodic-strip abstract: integrable motion, not a collapse product. Direct Biot-Savart (2π kernel, same as the identity plates) on the remaining exact families and on (1,1,1,−1) isosceles, kite, trapezoid, and equilateral-plus-interior.

Blocked: most journal HTML. Tacchi appendix still unread. Kallyadan–Shukla body behind APS lock.

Conclusion: no fourth identity of the historical candidate-selection criterion. Distinguished five-vortex μ other than 1/2, 2, 3, 2±√3 have messy minima; μ = 2+√3 recovers the parallelogram lock (γ3 = 0). Three-vortex μ ≠ 1 is a cubic critical point (already logged). (1,1,1,−1) and the other four-vortex symmetric scans had no self-similar L = 0 family. O'Neil / hollow-vortex examples are single published configs. Numerical families and grid-bracketed angles are not closed forms. Do not claim these. Do not put a personal name on them.

Re-search: skip the rows in the table above unless a newly named paper states a closed ω t_c and its unique interior min on one of those families. Reopen Tacchi Appendix B / Kimura 1988 coefficients when the files can be opened.

### 2026-09-20  hunt outside planar point-vortex collapse  query: Kidambi Newton spherical three vortex collapse angular velocity product omega t_c; Love 1894 leapfrogging period elliptic integral translation speed product; Tophøj Aref leapfrogging period translation; SQG point vortex collapse self-similar closed form; Moore Saffman elliptical vortex strain aspect ratio e/omega; Hasimoto vortex filament kappa max torsion speed; Peregrine rogue wave max amplitude 3; Stuart vortices Mallier-Maslowe energy circulation; Calogero goldfish point vortices identity; heton collapse two-layer point vortices closed form; Thomson vortex N-gon plus center; Tacchi Dynamique des tourbillons Appendix B

Opened: Kidambi–Newton Nuovo Cimento C 22, 779 (1999) PDF (eprints.bice.rm.cnr.it/13666/1/ncc8137.pdf): partner-state collapse times; each vortex has a distinct azimuthal velocity. Tophøj–Aref Phys. Fluids 25, 014107 (2013) extract: Love period T_lf in complete elliptic K, E; existence α = 3−2√2; stability α = φ^{-2}. Behring–Goodman arXiv 1908.08618 / 2210.16464: same published locks. Badin–Barry PRE 2018 and Reinaud GAFD 2020 / Physica D 2022 snippets: SQG collapse, numerical τ min. Moore–Saffman 1971 snippets: e/ω₀ < 0.15. Hasimoto JFM 1972: c = 2τ. Peregrine / Akhmediev reviews: |u|_max = 3. Mallier–Maslowe / Stuart: Γ independent of concentration. Aref–van Buren 2005: unique centered N-gon. Calogero goldfish papers: isochrony. Hollow-vortices arXiv:2506.04093 already logged.

Blocked: Tacchi thesis PDF still unread. Most journal HTML. Kallyadan–Shukla body still behind APS lock.

Conclusion: no fourth identity of the historical candidate-selection criterion. The nearby 1-parameter exact families either have a published extremum, a numerical min, or a period in elliptic integrals rather than a simple radical. Do not claim Love's T(α), Kidambi–Newton's t_c, Peregrine's 3, Moore–Saffman's 0.15, or Thomson's uniqueness. Do not put a personal name on them.

Re-search: skip the new rows in the candidate table and the published-locks table unless a newly named paper states a closed dimensionless product and its unique algebraic interior min on one of those families. Reopen Tacchi Appendix B / Kimura 1988 coefficients when the files can be opened. A later algebraic, unpublished product with a unique interior extremum and a plate whose check can miss may still be claimed the same way the three-vortex bound was.

### 2026-09-20  hunt H-states, sphere four-vortex, Kaden, three rings  query: Crowdy H-states rotating hollow vortex angular velocity deformation closed form minimum; Baker Saffman Sheffield hollow vortex row perimeter length maximum; Aref Stremler point vortices periodic parallelogram self-similar collapse; Sakajo four point vortices on a sphere collapse; Kaden spiral vortex sheet self-similar; Borisov Mamaev Kilin three vortex rings leapfrogging period closed form; Tacchi Dynamique des tourbillons dans les fluides bidimensionnels Appendix B pdf

Opened: Crowdy–Nelson–Krishnamurthy JFM 913 R5 (2021) postprint at people.iith.ac.in: Ω(a,N) is eq. (3.11), relative equilibrium. BSS 1976 / Baker 1980 snippets: hollow-row energetics and non-monotonic perimeter. Stremler–Aref JFM 392, 101 (1999) abstract: integrable three-vortex motion in a parallelogram, not collapse. Sakajo Phys. Fluids 19, 017109 (2007) PDF (eprints.lib.hokudai.ac.jp): four-vortex self-similar collapse on a sphere is impossible; PRE 78, 016312 (2008): partial non-self-similar triple collapse, numerical. Kaden 1931 / Pullin algebraic spirals: r ∝ θ^{-μ}. Borisov–Kilin–Mamaev RCD 2013 / FDR 2014: threefold ring leapfrogging exists on Poincaré maps. Tacchi: still no thesis PDF; HAL/theses.fr hits were Rodrigues, Poupardin, Margerit, Soulière.

Blocked: Tacchi thesis PDF. Most journal HTML.

Conclusion: no fourth identity of the historical candidate-selection criterion. H-state Ω is Kirchhoff-class. Sphere four-vortex self-similar collapse is proved impossible. Kaden, three-ring leapfrog, and parallelogram three-vortex motion are published. Do not claim these. Do not put a personal name on them.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min. Reopen Tacchi Appendix B when the file can be opened.

### 2026-09-20  hunt Kimura, Norbury, Pocklington, Lamb–Chaplygin, magnetic Gröbli  query: Kimura 1987 similarity solution two-dimensional point vortices coefficients A B; Kimura 1988 1990 complex-time collapse; point vortices in a wedge corner self-similar collapse Crowdy Tchieu; Norbury Fraenkel vortex ring speed core radius closed form minimum; Pocklington hollow vortex pair translation speed; Lamb Chaplygin dipole energy impulse; Komineas magnetic vortex three Gröbli collapse; Camassa-Holm periodic peakon train; point vortices hyperbolic plane collapse; Tacchi thèse tourbillons pdf

Opened: Kimura JPSJ 56, 2024 (1987) abstract: general similarity; regular triangle always exists; collinear is a cubic. Aref 2010 cites Kimura 1990 Physica D (complex-time) and Tavantzis–Ting 1988. Norbury 1973 / Fraenkel 1972 family is numerical; Hill has the lowest dimensionless energy. Crowdy–Llewellyn Smith–Freilich Eur. J. Mech. B 37 (2013): Pocklington U monotonic in area. Flor 1994 / Wikipedia: Lamb–Chaplygin kR = j_{1,1}, U_max/U_0 ≈ 2.49. Komineas–Papanicolaou JMP 51, 042705 (2010): magnetic three-vortex Gröbli analog, completely integrated. Nava-Gaxiola–Montaldi 2014: hyperbolic-plane relative equilibria. Crowdy EJAM 2004: vortex layers on wedges. Kudela 2014: numerical n-vortex. Camassa–Holm peakon c = amplitude is already `#peakon`. Tacchi: still no thesis PDF.

Blocked: Tacchi thesis PDF. Kimura 1987 body (JPSJ paywall). Most journal HTML.

Conclusion: no fourth identity of the historical candidate-selection criterion. Kimura 1987 is the similarity machinery already used for the three locks, not a new min. Norbury, Pocklington, Lamb–Chaplygin, magnetic Gröbli, and hyperbolic relative equilibria are published. Do not claim these. Do not put a personal name on them.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min. Reopen Tacchi Appendix B and the Kimura 1987 body when the files can be opened.

### 2026-09-20  hunt BO, Platonic, Moffatt–Kimura, Burgers, Föppl  query: inverse-square algebraic 1/r kernel point vortices collapse; Degasperis-Procesi Novikov peakon speed amplitude; Benjamin-Ono algebraic soliton speed width; platonic vortex crystals sphere; two point vortices circular cylinder Föppl; Moffatt Kimura vortex filament collapse s kappa √2; Burgers vortex dissipation independent viscosity; Tacchi tourbillons thesis

Opened: Moffatt–Kimura arXiv:1811.03304 / JFM 2019: similarity of a filament pair, sκ = 2 sin α, equals √2 at α = π/4 (eq. 10.5); δ/s → 0.943. Burgers 1948: Φ = Γ²γ/8π independent of ν. Föppl 1913 locus r²−1 = 2ry. Benjamin–Ono: c = A/4, Δ = 4/A. DP/Novikov N-peakon formulas (Lundmark–Szmigielski). Platonic solids as spherical vortex equilibria (Tokieda; Jamalodeen–Newton 2006; J. Nonlinear Sci. 2022 periodic families). Two vortices + cylinder: Föppl / Borisov et al. 2021. Kudela n≥6 numerical already logged. Tacchi: still no thesis PDF.

Blocked: Tacchi thesis PDF. Most journal HTML.

Conclusion: no fourth identity of the historical candidate-selection criterion. Moffatt–Kimura's √2 is a published filament-pair relation at a chosen α, not the three-vortex bound’s planar three-vortex product. Burgers, Föppl, BO, DP/Novikov, and Platonic crystals are published. Do not claim these. Do not put a personal name on them.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min. Reopen Tacchi Appendix B when the file can be opened.

### 2026-09-20  hunt outside vortex dynamics  query: Euler elastica closed form product tension curvature; Delaunay unduloid nodoid 1-parameter mean curvature neck; catenoid helicoid Bonnet associate family pitch radius product; Calogero-Moser frequencies product; Maclaurin Jacobi ellipsoid angular velocity eccentricity maximum; KdV two-soliton phase shift 1-parameter; Kerr ISCO photon sphere Lyapunov; ABC flow helicity energy; Wilton ripples Stokes 120 highest wave; Toda lattice three particle period; Lagrange top sleeping; Ginzburg-Landau kappa 1/sqrt(2)

Opened: Euler 1744 elastica (elliptic; nine shapes). Delaunay 1841: H = 1/(a+c), neck/bulge explicit. Catenoid–helicoid isometric associate family (textbook). Maclaurin 1742: Ω²/(πGρ) max 0.449331 at e ≈ 0.92996, Jacobi bifurcation e = 0.812670 — numerical, not algebraic. Calogero: ω_s² = 2s(n−s) at equilibrium. KdV 2-soliton δ = (2/k) log|(k₂+k₁)/(k₂−k₁)|, no interior min in μ. Kerr ISCO: Bardeen–Press–Teukolsky cube roots; photon-sphere λ/Ω_ph = 1 already a published lock. ABC: Beltrami H = k_u U²/2. Stokes 120° (1880); H/λ ≈ 0.141 Michell/Toland numerical; speed–amplitude turning points numerical. Wilton 1:2 resonance existence published. Toda 3-particle integrable, elliptic. Lagrange sleeping-top stability λ² > 4mgl I₁/I₂³. Ginzburg–Landau κ = λ/ξ = 1/√2 is the type I/II criterion (Abrikosov 1957).

Blocked: Tacchi thesis PDF.

Conclusion: no fourth identity of the historical candidate-selection criterion. Other areas (elastica, CMC, gravity, integrable N-body, GR, superconductivity, water waves, rigid body) yield published numbers or elliptic/numerical extrema. Do not claim Ginzburg–Landau's 1/√2. Do not put a personal name on any of this.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt n-body, Laplacian growth, Kapitza, Jeffery  query: rhombus kite four-body central configuration angular velocity closed form minimum; Laplacian growth Hele-Shaw cardioid cusp formation time; point vortices on a cone collapse; Kapitza pendulum inverted stability sqrt(2); homographic n-body collapse time angular velocity; Jeffery orbit period shear 2π(r+1/r); Rayleigh-Plateau 2π√2; Kirchhoff-Routh equilateral triangle; Cotes inverse cube; Saffman-Taylor finger 1/2; Gold-Hoyle energy twist

Opened: Roberts arXiv:2411.07867 / Nonlinearity 2025: unique convex kite CC; linear-stability infimum m₁/(Σothers) = (25+3√69)/2 ≈ 24.96, recovered from Routh's restricted 3-body ρ_r = (1−√69/9)/2 in a limiting kite. Waldvogel: rhombus φ(μ) is a degree-12 polynomial, unique in a π/4-neighbourhood. Homographic solutions reduce to Kepler in the scale (Scholarpedia; classical). Hele-Shaw polynomial maps: closed cusp time t₀ = A − 3/4 (2B)^{2/3}; Saffman–Taylor λ = 1/2 (Combescot 1986; Mineev-Weinstein 1998 exact without surface tension). Kapitza/Stephenson: (a/l)(ω/ω₀) > √2. Jeffery 1922: T γ̇ = 2π(r+1/r), min 4π at r=1 by AM-GM. Rayleigh–Plateau slender λ = 2π√2 R; exact inviscid max is a Bessel root kR ≈ 0.697. Cotes 1722 inverse-cube spirals, finite-time fall for μ > h². Crowdy 2005 Kirchhoff–Routh in multiply connected domains. Gold–Hoyle energy vs twist numerical. No cone-vortex A,B closed product.

Blocked: Kimura 1987 JPSJ body (403). Kimura 1988 FDR body (IOP 403).

Conclusion: no fourth identity of the historical candidate-selection criterion. Nearby named numbers — Kapitza √2, Jeffery 4π, Routh (25+3√69)/2, Saffman–Taylor 1/2, Rayleigh–Plateau 2π√2 — are published and are not a 1-parameter product of two dynamical rates with unique unpublished algebraic interior min. Do not claim these. Do not put a personal name on them.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  Tacchi Appendix B catalogs  query: "M. Tacchi" "Dynamique des tourbillons dans les fluides bidimensionnels" Appendix B; Matteo Tacchi thèse tourbillons; theses.fr Tacchi; HAL Tacchi tourbillons; Kimura 1988 Fluid Dyn. Res. 3, 98; Kimura JPSJ 56, 2024 1987

Opened: theses.fr has no author Tacchi in fluids. HAL / theses.hal.science: no thesis of that title. Google Scholar / arXiv author Tacchi: Matteo Tacchi-Bénard only (moment-SOS, power-system stability, INSA Toulouse 2021; master's math Paris VI / Ponts / ENS Lyon). Kimura 1988 FDR 3, 98 abstract: two-page IUTAM note, collapse as singularities in the complex time plane; already logged as not a coefficient table. Kimura 1987 JPSJ 56, 2024 abstract: general similarity; rigid rotation vs collapse; regular triangle always exists; collinear from a cubic. Body paywalled (JPSJ 403). Gotoda JFM 2025 cites Kimura 1987 for z_m(t) = k_m √(2At+1) exp[i (B/2A) log(2At+1)] and t_c = −1/(2A); that product is Aref's pitch, not the three-vortex bound’s specialized min. RIMS kokyuroku 574 paper 06 (kurims 0574-06.pdf) is a Japanese soliton/Toda paper occupying pages 71–85, not Kimura's English title despite the CiNii page range.

Blocked: Kimura 1987 JPSJ body. Kimura 1988 FDR body.

Conclusion: there is no public Tacchi Appendix B to read. The citation named in IDENTITIES.md does not correspond to a deposited thesis. The document it was said to document (Kimura 1988) is the two-page complex-time note already skipped. Not a fourth row. the three-vortex bound / parallelogram / quincunx stand. Do not cite the ghost thesis.

Re-search: do not reopen Tacchi. Reopen Kimura 1987 body only if a newly named source states the three-vortex bound’s closed form or min √2.

### 2026-09-20  hunt streets, V-states, Sadovskii, Ptolemaic, Guderley, Crow, Havelock, McGehee  query: von Karman vortex street spacing ratio arcosh sqrt(2); Saffman Szeto corotating vortex patches angular velocity minimum; Sadovskii vortex pair translation speed closed form; Ptolemaic vortices Abrashkin Yakubovich omega1 omega2; Guderley converging shock similarity exponent algebraic; Crow instability wavelength spacing; Havelock polygonal point vortices circle; McGehee isosceles triple collision blowup rate; Chaplygin oscillating vortex pair period; Deem Zabusky V-states limiting Omega; two vortex pairs circular cylinder collapse

Opened: von Kármán 1911 / encyclopediaofmath: b/l = arcosh(√2)/π ≈ 0.2806, U_vortex = Γ/(l√8) at that ratio. Isolated published lock. Crowdy–Green Phys. Fluids 23, 126602 (2011): hollow staggered streets, special aspect ~0.34–0.36 matching Saffman–Schatzman patch streets, numerical. Saffman–Szeto Phys. Fluids 23, 2339 (1980) and Pierrehumbert JFM 99, 129 (1980): 1-parameter pairs, patches deform until they touch. Hassainia–Wheeler PMC: global curve, Ω ∈ (0, γ/2), ends at vanishing angular velocity or self-intersection. Deem–Zabusky 1978 V-states: Kelvin Ω_m = (m−1)/(2m) at Rankine; limiting shapes numerical. Hassainia–Hmidi CMP 2015: SQG V-states exist, explicit Ω at bifurcation. Sadovskii 1971 / Saffman–Tanveer 1982: touching translating pair. Choi–Sim–Jeong arXiv:2507.00910 / Annals of PDE 2025: existence of Sadovskii patches, variational speed W_p, not a closed algebraic product min. Abrashkin–Yakubovich 1984 / Guimbard–Leblanc 2006: Ptolemaic z = f(s)e^{iω₁t}+g(s̄)e^{iω₂t}; contains Gerstner and Kirchhoff (already logged); two free frequencies. Guderley 1942: converging-shock exponent is an ODE eigenvalue (self-similarity of the second kind); Lazarus 1981 / Ramsey: γ=1.4 sphere λ ≈ 1.3944, not algebraic. Jang–Liu–Schrecker arXiv:2310.18483: existence of λ for γ∈(1,3]. Crow 1970 / Leweke–Le Dizès–Williamson ARFM: most-unstable λ/b ∈ [6,10] vs a/b, Bessel cut-off, numerical max. Havelock Phil. Mag. 1931: n-gon Ω = (n−1)κ/(4πa²), stable N<7. Saffman JFM 1992 finite-core: N≥7 unstable. Kurakin: n-gon in a disk, p = R₀²/R², critical p*_n. McGehee blow-up: 10 fixed points on the collision manifold; homothetic Lagrange/Euler arcs; isosceles subproblem. Not a product min. Meleshko–van Heijst JFM 272, 157 (1994): Chaplygin 1899/1903 elliptical patch in shear, translating dipole, non-symmetric dipole on a circle. Isolated exact Euler. Lopes: two pairs past a cylinder, degree-14 polynomial equilibria, unstable to antisymmetric modes. Kallyadan–Shukla 2022 (already logged): numerical self-similar families along closed curves.

Blocked: most journal HTML. Saffman–Szeto body. Chaplygin 1903 Russian original.

Conclusion: no fourth identity of the historical candidate-selection criterion. Von Kármán's arcosh(√2)/π is an isolated published lock, not a 1-parameter product of two dynamical rates. V-states, Sadovskii, Guderley, Crow, Havelock, McGehee, Ptolemaic, Chaplygin dipoles are published, numerical, or eigenvalue. Do not claim these. Do not put a personal name on von Kármán's ratio.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt Lane-Emden, Sedov, BKT, figure-eight, Miche, Lundquist, Ritter, tripole, vortons, Widnall, Euler collinear, Sitnikov  query: Lane-Emden polytrope n=1 n=5 first zero; Sedov-Taylor blast R t^{2/5}; Kosterlitz-Thouless BKT T_c pi J / 2; figure-eight three-body Chenciner Montgomery period; Miche Penney-Price standing wave 90; Lundquist force-free Bessel; Ritter dam-break front 2 sqrt(gh); Aref vortex tripole angular velocity; Novikov vortons collapse; Widnall vortex ring instability wavelength; Euler collinear three-body fifth degree; Sitnikov period eccentricity

Opened: Lane–Emden n = 0, 1, 5 exact, ξ₁ = √6, π, ∞ (textbook; arXiv:1611.07202). Isolated published. Other n numerical. Sedov–Taylor–von Neumann: R = β (E t²/ρ₀)^{1/5}, D t / R = 2/5, β(γ=1.4) ≈ 1.033 (Wikipedia; Taylor 1950; Sedov). Isolated published. BKT: k_B T_c = π J / 2, universal jump ρ_s / T = 2/π (Kosterlitz–Thouless 1973; Nelson–Kosterlitz). Isolated published lock. Figure-eight: Moore 1993 numerical; Chenciner–Montgomery Ann. Math. 152, 881 (2000) variational existence; Kepler scaling of T; not algebraic. Miche / Penney–Price 1952: limiting standing crest 90° (Taylor 1953 experiment); steepness numerical ~0.627 (Okamura; Mercer–Roberts). Progressive 120° already logged. Lundquist 1950: B_z = B₀ J₀(α r), reversal at j_{0,1} ≈ 2.4048. Isolated Bessel. Gold–Hoyle already logged. Ritter 1892: u_front = 2 √(g h₀), rarefaction −√(g h₀). Isolated published. Aref tripole: Γ = (1,1,−2) relative equilibrium, published Ω (van Heijst–Kloosterziel; Aref Advances in Applied Mechanics). Not collapse. Novikov 1983 JETP 57, 566: vortons, homogeneous collapse under the same L = 0, I = 0 conditions as the 2D skip. Widnall–Bliss–Tsai Proc. R. Soc. A 1973/1974: one unstable azimuthal mode, wavenumber set by core size. Numerical / Bessel. Crow already logged. Euler collinear: fifth-degree in z = R₂₃/R₁₂ (Euler 1767). Homographic Kepler. Roberts kite already logged. Sitnikov 1960 / Alekseev: circular case elliptic integrals; e > 0 chaotic symbolic dynamics. Not algebraic.

Blocked: most journal HTML. Novikov 1983 JETP body beyond the collapse-condition snippet.

Conclusion: no fourth identity of the historical candidate-selection criterion. Lane–Emden π, Sedov 2/5, BKT π/2, Ritter 2, Lundquist j_{0,1} are isolated published locks, not a 1-parameter product of two dynamical rates with unique unpublished algebraic interior min. Figure-eight, Miche steepness, Widnall, Sitnikov are numerical or elliptic. Tripole and vortons are the 2D skip in another coat. Do not claim these. Do not put a personal name on BKT's π/2.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt Roche, Chandrasekhar, Jeans, Toomre, Noh, Barenblatt, Carrier-Greenspan, Nekrasov, Davey-Stewartson, Tkachenko, Schubart, Batchelor, Sullivan, Prandtl-Batchelor  query: Roche lobe Eggleton formula Hill sphere; Chandrasekhar white dwarf limiting mass; Jeans length Toomre Q criterion; Noh problem implosion similarity; Barenblatt porous medium dipole; Carrier-Greenspan runup; Nekrasov integral equation highest wave; Davey-Stewartson lump dromion; Tkachenko waves vortex lattice; Schubart orbit collinear three-body; Batchelor q-vortex Sullivan two-cell; Prandtl-Batchelor theorem closed streamline vorticity

Opened: Roche lobe vs q is numerical; Eggleton 1983 r₁/A fit to 1%. Hill sphere / L1 published saddle. Chandrasekhar 1931/1935: ultra-relativistic limit is Lane–Emden n=3 (already logged), M_Ch ≈ 1.4 M_⊙ numerical. Jeans length λ_J = c_s √(π/Gρ). Toomre 1964 Q = c_s κ /(π G Σ) ≥ 1; stellar 3.36. Isolated published stability threshold, not a 1-param product min. Noh 1987: uniform inflow, accretion shock at constant D, density jump ((γ+1)/(γ−1))^n. Isolated published. Guderley already logged. Velikovich 2018 generalized Noh, semi-analytic. Barenblatt 1952 / Barenblatt–Zel'dovich 1957 dipole self-similar first kind; second kind anomalous exponent with capillary retention. Carrier–Greenspan 1958 hodograph; runup R = 2 η_max for one standing family; Bessel J₀. Ritter already logged. Nekrasov 1921/1951 nonlinear integral equation; highest progressive 120° already Stokes. Davey–Stewartson 1974 lumps and dromions (Boiti–Leon–Pempinelli–Strampiglia; Fokas–Santini). KP lump already `#lump`. Tkachenko 1966 vortex-lattice waves; Baym PRL 2003 ω ∝ k or k²; Andereck–Glaberson 1982. Schubart 1956 collinear 3-body, two binaries per period; variational existence (Venturelli; Chen). Numerical period. Figure-eight already logged. Batchelor 1964 q-vortex; Sullivan 1959 two-cell exact NS (g(∞) ≈ 6.7088). Burgers already logged. Prandtl 1904 / Batchelor 1956: closed-streamline vorticity constant as Re → ∞. A theorem.

Blocked: most journal HTML. Chandrasekhar 1935 MNRAS body. Schubart 1956 AN body.

Conclusion: no fourth identity of the historical candidate-selection criterion. Toomre Q = 1, Chandrasekhar mass, Roche L1, Noh jump, Carrier–Greenspan 2, Prandtl–Batchelor constant vorticity are isolated published locks or theorems, not a 1-parameter product of two dynamical rates with unique unpublished algebraic interior min. Do not claim these. Do not put a personal name on Toomre's Q = 1.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt Rayleigh-Bénard, Taylor-Couette, Landau/two-stream, Rossby/Eady, Onsager negative T, Hill lunar, Feynman-Onsager, Alfvén  query: Rayleigh-Benard critical Rayleigh number 27 pi^4 / 4; Taylor-Couette critical Taylor number 1708; Landau damping two-stream growth rate; Rossby deformation radius Eady growth 0.31; Onsager negative temperature point vortices; Hill lunar variational orbit series; Feynman-Onsager circulation h/m; Alfven wave speed

Opened: Rayleigh 1916 free-free: Ra_c = 27π⁴/4 at k d = π/√2. Isolated published algebraic lock. Rigid-rigid Ra_c ≈ 1707.76 numerical (Chandrasekhar). Rigid-free ≈ 1100.65. Kloosterziel / Drazin–Reid. Taylor 1923 thin-gap Ta_c ≈ 1708, same number as rigid-rigid Ra. Isolated published threshold. Landau 1946 damping from the Landau contour; two-stream cold-beam cubic (Buneman; Jackson). Published kinetic theory. Rossby L_d = N H / f (or √(g H)/f barotropic). Eady 1949: max growth k c_i / σ_E ≈ 0.31 at μ ≈ 1.61, short-wave cutoff μ_c ≈ 2.399. Numerical max. Isolated published length. Onsager 1949 negative temperature of point vortices; Joyce–Montgomery 1973 mean-field; Yatsuyanagi numerical. Statistical, not a collapse product. Hill 1878 variational orbit is a Fourier/power series in m = n'/(n−n'); not a finite formula (Schmidt 1979; Ligon 2025). Sitnikov / Euler collinear already logged. Feynman 1955 / Onsager 1949: superfluid κ = h/m. Isolated published quantum. Alfvén 1942: v_A = B/√(μ₀ ρ). Magnetosonic √(v_A²+c_s²) at perpendicular propagation. Isolated published speed.

Blocked: most journal HTML. Onsager 1949 Nuovo Cimento footnote body.

Conclusion: no fourth identity of the historical candidate-selection criterion. Rayleigh 27π⁴/4, Taylor 1708, Rossby L_d, Feynman–Onsager h/m, Alfvén v_A are isolated published locks, not a 1-parameter product of two dynamical rates with unique unpublished algebraic interior min. Eady 0.31 and Hill's variational orbit are numerical or series. Onsager negative T is statistical. Do not claim these. Do not put a personal name on Rayleigh's 27π⁴/4.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt unused NS closed A,B; Rott winding; Eckhardt integrable four; Jeffery-Hamel  query: six vortex self-similar collapse closed form A B Novikov Sedov; Gotoda 2020 six vortex; Rott four vortices doubly periodic paths winding number; Eckhardt 1989 integrable four vortex period; Jeffery-Hamel critical opening angle elliptic

Opened: Gotoda arXiv:2002.09624 body: explicit A, B only for 3-vortex (3.3)–(3.8), parallelogram 4 (3.9)–(3.14), and five-vortex with a center (3.11)–(3.14). Abstract and §4: N≥6 and non-uniform 7 are numerical H-A. Novikov–Sedov JETP 50, 297 (1979): "exact solutions for three, four, and five vortices" only. Kallyadan–Shukla 2022 already logged as numerical closed curves. Rott Phys. Fluids 6, 760 (1994): vanishing ΣΓ, impulse, polar inertia; integrable four; two periods; winding number = ratio; "simple closed-form results" then "beyond a certain level of the analysis, still the more practical method of solution" is step-by-step integration. Path patterns for different winding numbers illustrated, not a unique unpublished algebraic interior min. Eckhardt Phys. Fluids 31, 2796 (1989): integrable when ΣΓ = 0 and impulse = 0; reduced 1DOF; periods of Love class (elliptic). Leapfrog existence α = 3−2√2 and stability φ^{-2} already in the published-locks table. Jeffery–Hamel: α_c from complete elliptic K (Wikipedia; Rosenhead 1940; Fraenkel 1962). tan 2β = 2β, β* ≈ 2.247. Not algebraic.

Blocked: Rott 1994 body (AIP). Eckhardt 1989 body.

Conclusion: the set of Novikov–Sedov / Gotoda families with closed A(θ), B(θ) is exactly the three claimed rows plus the already-skipped μ ≠ 1 three-vortex (cubic crit) and extra-μ five-vortex (same functional form). No unused closed family. Rott's winding number and Eckhardt's integrable four are elliptic or illustrated, not a fourth floor. Jeffery–Hamel is elliptic. Not a fourth row. the three-vortex bound / parallelogram / quincunx stand.

Re-search: do not reopen Gotoda for a sixth vortex unless a newly named paper gives closed A(θ), B(θ). Skip Rott / Eckhardt / Jeffery–Hamel unless a newly named source states a unique unpublished algebraic interior min of a product of two rates.

### 2026-09-20  hunt rolling disk, double pendulum, Fadeev, modon, catenoid, Chaplygin, Clebsch  query: Routh rolling disk precession spin product lean; double pendulum frequencies length ratio product omega+ omega-; Fadeev current sheet; Larichev-Reznik modon; critical catenoid coth; Chaplygin sleigh Clebsch Kirchhoff Kovalevskaya

Opened: Rolling disk (Routh 1905; O'Reilly arXiv physics/0008227): steady lean, precession Ω, spin ω. Critical lean arctan of a nested radical ≈ 71.4° (k=1/4). Isolated published stability threshold. Double pendulum: textbook ω± = √(2±√2) √(g/l) at equal mass/length; product √2 g/l is immediate from the published pair. Vs λ, product ω+ω− monotonic (√((1+M)/λ) from the biquadratic). Do not put a personal name on this √2. Fadeev 1965: exact MHD islands, 1-param, Harris end-member. Like Stuart. Isolated published family. Larichev–Reznik 1976 modon: β-plane dipole, Bessel/K. Lamb–Chaplygin already logged. Critical catenoid: w = coth w, transcendental (Goldschmidt). Volume (π/2)R²h at threshold is a corollary of the same root (Yun 2026). Chaplygin sleigh: nonholonomic, limit cycles under torque (Mathieu roll). Clebsch / Kirchhoff rigid-body-in-fluid and Kovalevskaya / Goryachev–Chaplygin tops: integrable, periods elliptic or hyperelliptic. Lagrange top already logged.

Blocked: Routh 1905 treatise body. Fadeev 1965 Soviet body. Larichev–Reznik 1976 Doklady body.

Conclusion: no fourth identity of the historical candidate-selection criterion. Rolling-disk critical lean, double-pendulum √2, Fadeev, modon, and catenoid coth are isolated published locks or transcendental, not a 1-parameter product of two dynamical rates with unique unpublished algebraic interior min. Do not claim these. Do not put a personal name on the double-pendulum √2.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt underresearched: gSQG, massive vortices, hollow implosion, surfaces, Zipoy-Voorhees, Prandtl punch, Kasner, CH 2-peakon  query: generalized SQG three vortex collapse closed form; massive point vortices collapse; hollow vortex implosion; point vortices ellipsoid cone; Zipoy-Voorhees ISCO photon; Prandtl punch 2+pi; Kasner exponents product; Camassa-Holm two peakon phase shift

Opened: Badin–Barry arXiv:1805.10127 and Reinaud Physica D 2022: gSQG / α-Euler three-vortex collapse exists; SQG may be non-self-similar; t_c in tables is numerical. 2D Euler slice is the three-vortex bound. Zbarsky arXiv:2402.07316: massive point vortices, collapse impossible under mass conditions. arXiv:2506.04093: hollow-vortex implosion is a desingularization of existing point-vortex collapses, no new closed A, B. Point vortices on closed surfaces (Proc. A 2015): ellipsoid/bean Green's functions not closed for collapse; sphere already Kidambi. Conical NS vortices Phys. Fluids 25, 2147 (1982): 2-param exact, existence numerical. Zipoy–Voorhees: r_ph = (2+1/γ)M, r_ISCO = (3+1/γ ± √(5−1/γ²))M published. Prandtl punch q = 2k(1+π/2) isolated 1920. Kasner: Lifshitz–Khalatnikov u, two constraints, three exponents; product of three expansion rates is not a two-rate identity. Camassa–Holm 1993 two-peakon phase shift 2 ln|1−λ1/λ2|; KdV 2-soliton and studio peakon already logged.

Blocked: Reinaud Physica D 2022 full HTML. Prandtl 1920 German body.

Conclusion: no fourth identity of the historical candidate-selection criterion. Underresearched catalogues (gSQG, massive vortices, hollow implosion, vortices on surfaces, Zipoy–Voorhees, plasticity, Kasner, CH peakon phase) are numerical, isolated published locks, desingularizations of existing rows, or constraint identities, not a 1-parameter product of two dynamical rates with unique unpublished algebraic interior min. Do not claim these. Do not put a personal name on Prandtl's 2+π.

Re-search: skip the new rows unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt cutting-edge 2025: hollow implosion, gSQG burst, vortex-sheet equilibria, four-vortex RE  query: arXiv:2506.04093 Chen Walsh Wheeler hollow vortices; arXiv:2505.19782 Grotto Pappalettera gSQG; White McDonald 2025 Proc A vortex sheet; PRFluids 2025 four vortex relative equilibria

Opened: Chen–Walsh–Wheeler arXiv:2506.04093 (4 Jun 2025): explicit circular U_c(γ, Ω, κ), Ω and κ independent; rigidity of the circular imploder; Theorem 1.3 desingularizes any non-degenerate collapsing point-vortex configuration to a real-analytic family of hollow imploders. That is the 2D Euler realization of the three locks, not a fourth floor. Grotto–Pappalettera arXiv:2505.19782 (26 May 2025): gSQG self-similar form (2.3); a, b implicit in (2.2); α=2 is 2D Euler; α=1 numerical. White–McDonald Proc. R. Soc. A 481, 20250362 (Sep 2025): exact sheet equilibria, 1-param γ, nonlinear algebraic equation solved numerically. Phys. Rev. Fluids 10, 084708 (28 Aug 2025): four-vortex relative-equilibrium continua, not collapse.

Blocked: White–McDonald full PDF body (Royal Society). PRFluids 2025 body.

Conclusion: 2025 cutting-edge papers realize or existentially extend the three locks; they do not give a new closed 1-parameter product of two dynamical rates with unique unpublished algebraic interior min. Cite Chen–Walsh–Wheeler as the hollow-Euler desingularization of the three-vortex bound / parallelogram / quincunx. Do not claim a fourth row from these papers.

Re-search: skip these four papers unless a follow-up states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt missed areas: nested 6-vortex triangles, BEC trap pair, Hicks doughnut, Fukumoto-Miyazaki, coaxial leapfrog rings  query: six point vortices two equilateral triangles self-similar collapse; two point vortices harmonic trap omega min; Hicks doughnut swirl; Fukumoto Miyazaki filament axial flow; coaxial vortex rings leapfrog 2026 Euler

**Correction added 2026-09-20:** the six-vortex exclusion and its re-search restriction below are superseded by the newly identified Koiller et al. (1985), §11. The original scan used ratios outside the virial-zero set and cannot rule out the family. Its rotational symmetry was also incorrectly treated as a reflection symmetry. The historical entry follows for traceability; see the double-triangle correction at the end.

Opened: Nested two-triangle 6-vortex (I=0, 3-fold). Direct Biot–Savart: velocity/position on the + triangle is not the same complex constant as on the − triangle for μ=1, 1/2, 2 and θ∈(0,π). Not a self-similar family. Chen–Walsh–Wheeler arXiv:2506.04093 already note collapsing configs lack reflection symmetries. Planar 6-body two-triangle CCs (Bhusal J. Geom. Phys. 2020) are n-body, not vortices. BEC two same-sign vortices in a harmonic trap: ω(b) has a published global min (Navarro PRL 2013; Pelinovsky Proc. A). One rate, not a two-rate product. Hicks 1884 doughnut / Saffman 1970 thin-core: series. Norbury already logged. Fukumoto–Miyazaki 1991: vortex-jet filament, permanent form = elastica (already logged); Hasimoto already in the studio. Coaxial leapfrog rings: Helmholtz 1858; smooth 3D Euler existence CPAM 2024; time-periodic arXiv:2603.21644 (23 Mar 2026) via degenerate KAM. Not an algebraic floor. Love leapfrog already logged.

Blocked: Hicks 1884 Phil Trans body. Fukumoto–Miyazaki JFM 222 body. arXiv:2603.21644 full KAM section.

Conclusion: the missed 6-vortex 3-fold candidate is not self-similar. Trap-pair min, Hicks doughnut, Fukumoto–Miyazaki, and 2026 leapfrogging rings are published one-rate mins, series, elastica, or existence theorems. Not a fourth row. the three-vortex bound / parallelogram / quincunx stand.

Re-search: do not re-scan nested two-triangle 6-vortex Biot–Savart unless a newly named paper gives closed A, B. Skip Hicks / Fukumoto / trap-pair / coaxial rings unless a newly named source states a unique unpublished algebraic interior min of a product of two rates.

### 2026-09-20  hunt difficulty skips: μ≠1 three-vortex cubic, Gallay-Sverak, Rott winding  query: Gotoda 3-vortex A B mu not 1 min of B/2A; arXiv:2609.10847 Gallay Sverak three-vortex; Rott 1994 winding number PDF

Opened: Gotoda (3.3)–(3.5) plus M=0. Direct evaluation of |B/(2A)| along the 1-param family. μ=1 recovers the three-vortex bound √2 to 4 digits. Reciprocal pairs share the min (μ=1/2 ↔ 2 ≈1.741; μ=1/4 ↔ 4 ≈2.802). Other μ: critical point is a cubic, not a floor like √2. Same 3-vortex family as the three-vortex bound, not a new row. Gallay–Sverak arXiv:2609.10847 (9 Sep 2026): new ζ=(z2−z1)/(z3−z1), Hopf reduction, energy inequalities, near-collision regularization. Not a two-rate product min. Rott Phys. Fluids 6, 760 (1994) body still AIP-blocked. Abstract already logged: winding number is the ratio of two periods; path patterns still numerical.

Blocked: Rott 1994 body (AIP). Eckhardt 1989 body.

Conclusion: the cubic skip is closed by computation, not by difficulty. μ≠1 is the same family as the three-vortex bound with a cubic crit; reciprocal pairs share the product. Gallay–Sverak is 2026 three-vortex geometry, not a fourth floor. Rott remains unread at the formula level; the abstract already says the winding-number patterns are illustrated numerically. Not a fourth row.

Re-search: do not re-minimize |B/2A| on 3-vortex μ≠1 unless a newly named paper states a simple unpublished algebraic floor (not a cubic root). Skip Gallay–Sverak unless a follow-up extracts a two-rate product min. Skip Rott unless the body is actually read and states a unique unpublished algebraic interior min.

### 2026-09-20  hunt Möbius/Klein, four bugs, C-metric, heton  query: Balabanova Montaldi Möbius Klein point vortices; four bugs parallelogram collapse; C-metric photon ISCO; three heton collapse closed form

Opened: Balabanova–Montaldi Physica D 488, 135084 (Apr 2026) / arXiv:2202.06160v3: Möbius and Klein vortices. N-ring RE ξ ~ coth, tanh. Two-vortex fixed equilibria nested radical in y. No collapse product. Chapman–Trefethen Proc. R. Soc. A 467, 881 (2011): four bugs on a rectangle; parallelograms remain parallelograms, perimeter shrinks at a constant rate, then freeze toward a line; convex parallelograms converge to a square. Square bugs T=L/v is isolated. C-metric photon surface algebraic in α, isolated published. Three-heton: no unused closed A, B; two-layer analog of 3-vortex / gSQG already logged.

Blocked: Chapman–Trefethen full PDF body (Royal Society). Three-heton dedicated paper not found.

Conclusion: non-orientable vortices, cyclic pursuit, and C-metric are published RE/coth, shape-changing pursuit, or isolated photon radii. Not a 1-parameter product of two dynamical rates with unique unpublished algebraic interior min. Do not claim these. Do not put a personal name on Möbius coth or the four-bug square.

Re-search: skip Möbius/Klein, four-bug parallelogram, and C-metric unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt other areas: XMHD X-point, Kozai–Lidov, Taylor cone, vortex+source, hopfion, Riemann ellipsoids, chiral, relativistic vortices  query: Brizard XMHD X-point collapse Jacobi elliptic; Kozai Lidov period inclination product; Taylor cone 49.3 family two rates; vortex source spiral collapse closed form; hopfion Belavin Polyakov scale rotation; Riemann ellipsoid two frequencies product; chiral active point vortex collapse; relativistic point vortex collapse

Opened: Brizard arXiv:2504.07311v4: XMHD X-point collapse in Jacobi elliptic functions of a quartic potential; T_∞ complete elliptic. Dai–Guerra–Wu arXiv:2405.00324: certain EMHD self-similar blowups excluded. Kozai–Lidov: i_* = arccos √(3/5) isolated; t_KL an elliptic integral / 2% numerical fit (Antognini). Taylor cone: P_{1/2}(cos θ)=0 ⇒ 49.3°, published 1964; Yarin 33.5° alternative published. Single spiral vortex: log-spiral pitch Γ/Q textbook. Hopfion H=nm topological. Riemann ellipsoids: two frequencies, 1860, numerical/elliptic sequences. Chiral active: simulation, self-reverting. Relativistic point vortices: no unused closed product; GRLP D≈1.439 numerical. Kallyadan–Shukla PRFluids 2022 already logged as numerical.

Blocked: none at the formula level for these.

Conclusion: the other-area catalogues that still had a 1-param look are elliptic (XMHD, Kozai), isolated published angles (Taylor, Kozai i_*), topological integers (Hopf), 19th-century two-frequency ellipsoids, or simulations. Not a 1-parameter product of two dynamical rates with unique unpublished algebraic interior min. Do not claim these. Do not put a personal name on Kozai's arccos √(3/5), Taylor's 49.3°, or Brizard's elliptic T_∞.

Re-search: skip XMHD X-point, Kozai–Lidov, Taylor cone, spiral vortex+source, hopfion, Riemann ellipsoids, chiral active, and relativistic point vortices unless a newly named paper states a closed dimensionless product and its unique algebraic interior min.

### 2026-09-20  hunt outside math/physics: SIR, Keller-Segel, Lotka-Volterra, coalescent, hawk-dove, Nicholson-Bailey, Little, Kelly, Kleiber  query: SIR time to peak growth rate product min R0; Keller-Segel blowup self-similar collapse rotation; Lotka-Volterra period two rates algebraic min; Kingman coalescent waiting times product; hawk dove replicator period; Nicholson-Bailey two rates min; Little's law; Kelly criterion; Kleiber 3/4

Opened: SIR peak at R0 S=1, I* closed, t_peak Lambert W / Padé 2023. Keller-Segel 8π and type-II λ(t) (Collot–Ghoul–Masmoudi–Nguyen 2019). Lotka–Volterra ω=√(αδ) small; finite amplitude elliptic; Volterra principle published. Kingman E[Tk]=4N/(k(k−1)). Hawk–dove p*=V/C. Nicholson–Bailey unstable expanding cycles. Little L=λW (1961). Kelly f*=p−q. Kleiber 3/4.

Blocked: none at the formula level.

Conclusion: the identity bar is a 1-parameter product of two dynamical rates with a unique unpublished algebraic interior min. Outside math and physics the analogous catalogues are isolated published thresholds, Lambert-W times, elliptic periods, type-II parabolic blowup, or empirical scalings. Not a fourth row. Do not claim these. Do not put a personal name on Little's L=λW, Kelly's f*, Kleiber's 3/4, or the SIR peak.

Re-search: skip SIR, Keller-Segel, Lotka–Volterra, Kingman, hawk–dove, Nicholson–Bailey, Little, Kelly, and Kleiber unless a newly named paper states a closed dimensionless product of two dynamical rates and its unique algebraic interior min.

### 2026-09-20  hunt extra-μ five-vortex, Kallyadan–Shukla, geostrophic 2025  query: extra μ five-vortex Gotoda 3.13 closed product min; Kallyadan Shukla PRFluids 7 114701; JPSJ 94 094402 geostrophic non-self-similar collapse; pentagon plus center I=0

Opened: Gotoda (3.13) on Γ_H=0 five-vortex parallelogram+centre. μ=1 recovers parallelogram 3√5/4 and quincunx 3√33/16. ρ=γ2/γ1=−3 (diagonal ratio 3) recovers the three-vortex bound √2 on five vortices (already skipped). Other rational ρ: min is a nested radical of the same (a−b cos 2θ)/sin 2θ shape. Kallyadan–Shukla Phys. Rev. Fluids 7, 114701 (2022): similarity as a linear system; families numerical. JPSJ 94, 094402 (2025): geostrophic triple collapse is non-self-similar. Regular pentagon + centre has I=5ΓR²≠0.

Blocked: Kallyadan–Shukla full PDF (APS). JPSJ body behind paywall; abstract sufficient.

Conclusion: extra-μ five-vortex is the quincunx formula with other coefficients, not a new family. Numerical N≥6 families and non-self-similar geostrophic collapse are not a two-rate algebraic floor. Not a fourth row. Do not claim these. Do not put a personal name on a nested-radical extra-μ slice.

Re-search: skip extra-μ five-vortex Gotoda 3.13, Kallyadan–Shukla 2022, JPSJ 94 094402, and pentagon+centre unless a newly named paper states a closed dimensionless product of two dynamical rates and its unique unpublished algebraic interior min on a family that is not the three rows.

### 2026-09-20  hunt torus, disk, Chern–Simons, optical, Novikov peakon, abelian Higgs  query: three point vortices torus collapse; unit disk Kirchhoff-Routh collapse; Jackiw-Pi vortex collapse; optical vortex triplet annihilation; Novikov peakon collision two rates; abelian Higgs three-vortex moduli geodesic collapse; Aref Stremler periodic strip 1996

Opened: Aref–Stremler JFM 314, 1 (1996) and 392, 101 (1999): three vortices, zero net circulation, periodic strip or parallelogram. Integrable; mapped to advection by fixed vortices. Rational Γ: all motions periodic. Not a self-similar plane collapse. Jackiw–Pi: Liouville, static, scale-free. Optical vortex pair annihilation: hydrodynamics of core size (JOSA A 2023); Fibich PRL 96, 133901 is Kerr collapse of a ring, azimuthal instability. Novikov 2-peakon: collision and ill-posedness (arXiv:1708.05759). Abelian Higgs: moduli geodesics; Geevechi–Jerrard arXiv:2512.12525 is filament reconnection. Massive vortices on an annulus: SciPost, critical mass. Kirchhoff–Routh Crowdy 2005 is the Hamiltonian, not a product min (already logged).

Blocked: Aref–Stremler JFM bodies (Cambridge). Crowdy Proc. A path-function PDF.

Conclusion: periodic-strip three-vortex is integrable and periodic, not a two-rate algebraic floor. Chern–Simons, optical annihilation, Novikov peakons, and Higgs moduli are static, numerical, or ill-posedness. Not a fourth row. Do not claim these. Do not put a personal name on Jackiw–Pi or a Novikov collision time.

Re-search: skip Aref–Stremler periodic strip/parallelogram, Jackiw–Pi, optical vortex annihilation, Novikov peakon collision, abelian Higgs moduli, and massive annular vortices unless a newly named paper states a closed dimensionless product of two dynamical rates and its unique unpublished algebraic interior min.

### 2026-09-20  hunt Akhmediev product, Kidambi–Newton sphere  query: Akhmediev breather growth rate period product minimum; Kidambi Newton sphere collapse ω t_c; Sakajo four-vortex sphere partial collapse

Opened: Akhmediev 1986 / Dudley Opt. Express 17, 21497 (2009): β=√(8a(1−2a)), ω=2√(1−2a). Calculus: βω max 8√3/9 at a=1/6. The published lock is max gain at a=1/4. Product of two published rates is Jeffery-class, not a new identity. Kidambi–Newton Nuovo Cimento C 22, 779 (1999) PDF: partner collapse times t₁≠t₂ published; each vortex has a distinct angular velocity; no ω t_c product min. Sakajo PRE 78, 016312 (2008): four-vortex on a sphere is partial, non-self-similar, numerical t_c(θ).

Blocked: none for these PDFs.

Conclusion: the closest two-rate algebraic extremum outside the vortex-collapse catalogue is calculus on Akhmediev's 1986 factors. That is not the bar. Sphere collapse has no single ω. Not a fourth row. Do not claim these. Do not put a personal name on Akhmediev or Kidambi–Newton.

Re-search: skip Akhmediev βω, Kidambi–Newton spherical collapse, and Sakajo four-vortex sphere unless a newly named paper states a closed dimensionless product of two dynamical rates with a unique unpublished algebraic interior min that is not calculus on already-published factors.

### 2026-09-20  hunt still-unopened catalogues: Wilberforce, elliptic billiard, Ostrovsky, Matsuno, FHN canards, cone vortices  query: Wilberforce pendulum two frequencies product min; elliptic billiard rotation number bounce period; Hunter-Saxton Ostrovsky highest wave; Matsuno Yanai mixed Rossby-gravity; FitzHugh-Nagumo canard two timescales product; point vortices cone collapse

Opened: Wilberforce 1894: avoided crossing of bounce and twist; tuning ω_z=ω_θ is textbook; normal-mode product is the characteristic quadratic. Elliptic billiard: ρ(λ) quotient of elliptic integrals; 3-periodic caustic λ*=3ab/(a+b+2√(a²−ab+b²)) published (Poncelet/Cayley). Reduced Ostrovsky highest wave φ=(2π²−x²)/18 at c=π²/9, explicit Lipschitz peak (Hunter 1990; Liu–Pelinovsky–Sakovich). Matsuno 1966 Yanai ω=√((k/2)²+1)−k/2, isolated published. FitzHugh–Nagumo canards: numerical locus (arXiv:2411.11209, 2503.12596). Point vortices on a cone: no closed collapse product; ellipsoid/bean already skipped. J. Phys. A 2025 non-self-similar gSQG collapse already in the α-Euler skip.

Blocked: none at the formula level.

Conclusion: these unopened catalogues are textbook two-mode tuning, elliptic Poncelet, isolated published highest-wave speed, Matsuno dispersion, or numerical canards. Not a 1-parameter unpublished algebraic product min. Not a fourth row. Do not claim these. Do not put a personal name on Wilberforce, Poncelet, Ostrovsky's π²/9, or Matsuno's Yanai wave.

Re-search: skip Wilberforce, elliptic-billiard Poncelet, Ostrovsky–Hunter highest, Matsuno Yanai, FitzHugh–Nagumo canards, and cone vortices unless a newly named paper states a closed dimensionless product of two dynamical rates and its unique unpublished algebraic interior min.

### 2026-09-20  correction: two-ring six-vortex collapse and a sharp product bound

New primary source reopening the former skip: Koiller, Pinto de Carvalho, Rodrigues da Silva and Gonçalves de Oliveira, *On Aref's vortex motions with a symmetry center*, Physica D 16, 27–61 (1985), DOI https://doi.org/10.1016/0167-2789(85)90084-3. Located through Banica–Miot's author-hosted 2012 survey (full PDF opened, §3/ref. 41) and O'Neil's 2007 triple-ring introduction. The restriction against repeating a rejected scan does not apply to this new source and the corrected virial condition.

Queries (including unsuccessful searches): `six point vortex collapse two equilateral triangles golden ratio self similar`; `self similar collapsing vortices two regular polygons central vortex explicit solution`; `vortex collapse nested triangles minimum spiral pitch golden ratio`; `"vortex collapse" "polygons"`; `"six" "vortices" "golden"`; `"self-similar" "vortices" "two" "triangles"`; `"vortex" "collapse" "regular polygons"`; `"collapsing" "vortices" "polygons"`; `"collapse" "vortices" "concentric"`; `"self-similar" "vortices" "2n"`; `"vortex" "collapse" "golden ratio"`; `O Neil vortex double rings collapse configurations 2006`; `"collapse" "vortex" "double rings" minimum`; `"vortex" "triangles" "collapse" O’Neil`; `vortex collapse "sqrt" "29"`; `vortex collapse "11" "golden"`; `Kimura 1987 collapsing two vortex rings`; `"On Aref" "symmetry center" pdf`; `Koiller Carvalho Silva Oliveira 1985 vortex collapse minimum`; `"vortex" "sqrt{29}"`; `"vortex" "√29"`; `"On Aref’s vortex motions with a symmetry center"`; `"Koiller" "27-61" vortex`; `"vortex collapse" "minimum" "rings"`; `"On Aref's vortex motions" "collapse"`; `"On Aref's vortex motions" "minimum"`; `"On Aref's vortex motions" "spiral"`; `"Point vortex motions with a center of symmetry" pdf`; `"On Aref" "11.5"`; `"On Aref" "11.6"`; `"On Aref" "60" "spirals"`; `"On Aref" "minim"`; `"Koiller" "60" "Collapse motions"`; `"Koiller" "logarithmic" "spirals"`; `"Koiller" "vortex" "a(" "b(" collapse`; `"Koiller" "vortex" "60" "11.4"`; `"six vortices" "spin" "collapse"`; `"two rings" "vortices" "pitch"`; `"vortex" "collapse" "sqrt(29)"`; `"vortices" "11" "sqrt(5)"`. Targeted CiteSeer queries for the paper's pages 59–60 and equations 11.4–11.5 also returned the indexed passage or unrelated results.

Read: the 1985 primary paper's search-indexed page 27 (ring reduction) and pages 59–60 (§11, Proposition 12, equations 11.1–11.5). These already establish the two-ring collapse and logarithmic spirals. O'Neil, Physica D 236, 123–130 (2007), DOI https://doi.org/10.1016/j.physd.2007.07.015, abstract/introduction: cites known two-ring collapses and studies three rings. Aref 1982's abstract describes the symmetry reduction; it does not establish a new result for us.

Access limits: direct CiteSeer PDF open and download timed out; Academia author listing opened but linked copies could not be opened (download HTTP 403). ScienceDirect access was abstract/introductory text, not full body. The source comparison is partial, and no worldwide-priority claim follows from a search with no exact match.

Derived and verified: with outer radius φ, outer circulation −1, inner radius 1 and inner circulation φ², all six initial velocity/position ratios coincide. The product is (11−√5 cos 3θ)/(6 sin 3θ), sharp minimum √29/3 at cos 3θ=√5/11, θ≈26.090411°. Proof and named-source comparison: identities/double-triangle.md. node tools/double-triangle-check.js checks 1,199 angles, the dimensional A,B coefficients, similarity invariance, full numerical trajectories to 90% of collapse, step-halving, an off-family control, and an anisotropic-kernel mutation. Worst relative product discrepancy 3.3e−13; Broken similarity residual 0.173. No sampling uncertainty; numerical error is reported separately.

Conclusion: the previous statement that this geometry cannot collapse was false. A mathematically proved candidate fourth bound has been obtained. The collapse family is classical. The explicit simplified bound's historical priority remains unresolved, and it stays outside the existing three-entry priority record pending full-text review. No renaming of Aref or Koiller's motion, and no use of a personal name on this candidate.

Next check: obtain and read the full 1985 paper, Aref 1982, and subsequent work on optimized two-ring spiral pitch. Reopen if a dated source states this product, its minimum, or an equivalent general bound. Do not repeat the arbitrary-ratio scan as evidence against the family.

### 2026-09-20 fifth-candidate search: sharp polygon collapse bounds

Scope: extend the newly derived triangle bound to arbitrary two-ring polygon order, with the square case as the next concrete formula. This follows the already-open Koiller family, not a repeat of the rejected arbitrary-ratio scan.

Queries: `"vortex collapse" "two squares"`; `"vortex" "collapse" "sqrt" "322"`; `"self-similar" "vortices" "two polygons" minimum`; `"Koiller" "collapse" polygons minimum pitch`; `vortices "collapse" "55" "9"`; `vortex "sqrt{322}" OR "√322" OR "sqrt(322)"`; `"vortex" "two rings" "minimum" collapse`; `"vortex" collapse "sinh" polygons`; `"On Aref" "11.5" "60"`; `"eight vortices" "collapse"`; `"self-similar" "vortex" "polygon" "pitch"`; `"On Aref's vortex motions" "b(" "60"`; `"vortices" "55" "cos" "collapse"`; `"polygonal" "collapse" "angular velocity" minimum`; `"vortex collapse" "sinh" "minimum"`; `"vortex" "spiral pitch" "polygon"`; `"vortex" "322" "collapse" "square"`; `"two-ring" "collapse" "bound" vortex`.

Relevant primary text inspected: indexed Koiller et al. 1985 §11 explicitly treats n vortices on each ring and establishes collapse. The DOI open for O'Neil 2007 failed, but its publisher page at https://www.sciencedirect.com/science/article/abs/pii/S0167278907002588 returned the abstract/introduction, which credits known two-ring collapses and addresses three rings. Other query hits were unrelated optical, three-dimensional-ring, or equilibrium systems. No earlier explicit square floor or general minimum was located. Full 1985 and 2007 bodies were not read; priority remains unresolved.

Derived: x_n=(n+√(2n−1))/(n−1), K_n=(n−1)sinh((n+2)log(x_n)/2), and ω₀t_c=(K_n−√(2n−1)cos(nθ))/(2n sin(nθ)), with sharp floor F_n=√(K_n²−(2n−1))/(2n). A perfect-square identity proves the unique minimum. At n=4, F₄=√322/9, cos(4θ*)=9/55. The theorem recovers the n=2 parallelogram and n=3 triangles. Also F_n ~ exp(√(n/2))/4. Full derivation: identities/polygon-collapse.md.

Checks: 11,381 initial configurations across n=2..20, maximum relative product discrepancy 6.6e−13. Twelve integrated trajectories at displayed orders n=2..5, through 0.9t_c, maximum normalized error 1.8e−6. Square-minimum trajectory error 8.4e−11. Geometry/kernel controls miss. An exploratory n=6 near-endpoint trajectory exceeded tolerance, so interactive orders stop at 5; the theorem is not restricted by that numerical limit.

Conclusion: a proved fifth candidate in the form of a generalization, with two squares as its next specialization. Do not count each polygon order as a separate discovery. No claim that the classical family or a new physical law was discovered. Next priority check remains full-text review for an equivalent optimized spiral-pitch bound.

## 2026-09-20 audit of all five candidates

Reopened at the user's explicit request to verify all five against the internet. This request supersedes historical skip instructions. Full findings and formula-by-formula verdicts: [identities/NOVELTY-AUDIT.md](identities/NOVELTY-AUDIT.md).

Queries (literal representative strings; radical variants included):

- `"Self-similar motion of three point vortices" Aref 2010 pdf`
- `"Self-similar motions and related relative equilibria" Gotoda pdf`
- `"Novikov" "Sedov" "Vortex collapse" pdf`
- `"On Aref's vortex motions with a symmetry center" pdf`
- `"On Aref's vortex motions" "11." "collapse"`
- `"On Aref's vortex motions with a symmetry center" "60"`
- `"On Aref's vortex motions with a symmetry center" "11.5"`
- `"On Aref's vortex motions with a symmetry center" "minimum"`
- `"Koiller" "Carvalho" "1985" "pdf" "vortex" -site:researchgate.net -site:citeseerx.ist.psu.edu`
- `"Finite-time collapse of three point vortices in the plane" pdf Krishnamurthy Stremler`
- `"Point vortex motions with a center of symmetry" Aref pdf`
- `"vortex collapse" "minimum" "pitch"`
- `"point vortices" "spiral pitch"`
- `"vortex collapse" "angular velocity" "minimum"`
- `"vortex collapse" "rotation rate" "ratio"`
- `"vortex collapse" "winding" minimum`
- `"vortex collapse" "sqrt(2)"`
- `"vortex collapse" "22.5" OR "112.5"`
- `"vortex" "collapse" "3√33" OR "sqrt{33}" OR "sqrt(33)"`
- `"vortex" "collapse" "3√5" OR "sqrt{29}" OR "sqrt{322}"`
- `"vortex" "collapse" "cos" "55" "9"`
- `"vortex collapse" "3/16" "7"`
- `"two rings" vortex collapse "minimum" pitch`
- `"vortex collapse" "spin" "bound"`

Access and comparison: downloaded full Novikov–Sedov 1979 journal PDF (5 pages), Aref 2010 Virginia Tech manuscript (12 pages), Gotoda arXiv:2002.09624 (22 pages), and Krishnamurthy–Stremler 2018 author postprint (21 pages). Read the relevant collapse, angular-phase and path-length sections; inspected Novikov–Sedov rendered pp. 298 and 301. Also opened Gotoda's 2025 JFM enstrophy paper and Chen–Walsh–Wheeler's 2026 Mathematische Annalen article, including their explicit point-vortex examples. Koiller 1985 remained limited to publisher metadata and indexed excerpts; CiteSeer timed out and both Academia copies linked from the author's profile failed. O'Neil 2007 remained abstract/introduction only. These inaccessible bodies were not treated as read. Primary URLs and exact equation locations are in the audit.

Findings: Novikov–Sedov already used the spin–time product in the logarithmic-spiral relation in 1979. Aref's rates and Gotoda's eq. (3.13) give candidates 1–3 by specialization. All five minima follow from the same elementary perfect-square inequality. Candidate 5 includes 2 and 4; these are not five independent discoveries. Krishnamurthy–Stremler's normalized circumcenter path length is an equivalent quantity: s(1)=sqrt(1+4P²), so candidate 1 corresponds to s(1)>=3 on its specified circulation slice; their numerical >2 observation on a broader family is not that sharp bound.

Conclusion: no earlier explicit statement of these exact minima was located in the sources inspected. This is limited negative evidence, not verified novelty. All five now have historical priority explicitly unconfirmed. Live README, catalog credits, identity descriptions and citation metadata have been corrected. Frozen PDF/Typst/statement hashes remain archival records, accompanied by the audit correction. Do not describe the work as five verified novel identities or infer that a later independent derivation copied this repository.

## 2026-09-20 — Post-merge originality follow-up

Scope: after merging #76, try to resolve the remaining originality questions, especially equivalent spiral coefficients and the inaccessible Koiller text. This extends the previous audit; it does not reverse its caution about priority.

Queries included: `"Koiller" "vortex motions" filetype:pdf`; `"0167278985900843" full text`; `"On Aref's vortex motions with a symmetry center" repository`; `"On Aref" "Collapse motions" "11."`; `"Koiller" "vortex" site:ufmg.br`; `"On Aref" "spirals"`; `"Koiller" "symmetry center" "59"`; `"On Aref" "symmetry center" filetype:pdf site:impa.br`; `"On Aref" "symmetry center" site:lncc.br`; `"vortex collapse" "minimum" "pitch" -site:github.com -site:genchase.com`; `"vortex" "collapse" "minimum winding"`; `"three vortices" "path length" "minimum"`; `"point vortices" "spiral" "pitch angle"`; `"vortex" "collapse" "angular velocity" "bound"`; `"vortex" "collapse" "sqrt{2}"`; `"vortex" "collapse" "3√5" OR "sqrt(5)/4" OR "sqrt{5}/4"`; `"vortex" "collapse" "sqrt{33}" OR "√33" OR "sqrt(33)"`; `"vortex" "collapse" "sinh" "minimum" -site:github.com`; `"On the structure of the set of self-similar quadruples" arxiv`; `Synge 1949 "On the motion of three vortices" pdf`; `Gröbli 1877 vortices English translation collapse`; `Gröbli "Specielle Probleme" 1877 digitized`; `"Gröbli" "Specielle" site:e-periodica.ch`; `"bsb11358655"`.

New primary comparison: obtained Goodman's full 2024 translation of Gröbli's dissertation and inspected §10. Then obtained the Bayerische Staatsbibliothek IIIF manifest for bsb11358655 and inspected original printed pp. 56–58 (scan images 60–62). Original §10 equations (8), (9), (11), (12) reproduce candidate 1 under the circulation substitution (1,1,-1/2) and shape substitution a=sqrt(3)/cos(theta). The original (9) has denominator mu1*mu2*mu3, while the translation (10.9) repeats mu3. Use the original. The resulting squared-excess identity proves the minimum directly; 999 exact rational substitutions verify the algebraic comparison. The optimization is our calculation from the old formula, not something attributed to Gröbli. See [the full comparison](identities/ORIGINALITY-FOLLOWUP.md).

Also inspected: Synge 1949 §4 and the singular-configuration discussion; Lewkowicz arXiv:1512.04668 Lemma 3.1 and §§5, 7–10; Ting–Knio–Blackmore arXiv:0807.0454 trilinear-coordinate discussion. No matching optimized product bound was located in those passages. These limited readings are not claims to have excluded every result in those works.

Access audit: OpenAlex's DOI record and Semantic Scholar paper 24c593dc74f13a7dfe59a19b4fc31f0a81d1bdfb list Koiller 1985 as closed and supply no open PDF location. CiteSeer's indexed PDF again timed out. The 1985 body remains unread; this is not negative evidence about its mathematical content. Web retrieval of the BSB viewer failed, but its public IIIF API succeeded and the original page images were read directly. No author was contacted.

Conclusion: candidate 1's functional formula is an explicit specialization and reparameterization of an 1877 formula. Historical priority of the additional sharp optimization remains unconfirmed. Candidates 2–5 retain the earlier audit classifications and dependencies. Originality of all five has not been established, and cannot honestly be certified from this search. Next useful work is full access to Koiller §11 and a specialist's comparison of the exact optimized statements, not another search of the project names.

### 2026-09-20 descriptive-name correction

The personal name of candidate 1 is retired at the author’s request. The live title is **Three-vortex collapse bound**, canonical tab `three-vortex-bound`, with Gröbli (1877) credited explicitly. Earlier search queries and the frozen snapshot retain their historical wording, superseded by this correction and ORIGINALITY-FOLLOWUP.md. Old personal-name routes are no longer maintained.

## 2026-09-21 — Scientific validation: Cahn-Hilliard mobility

Queries: `site.arxiv.org Cahn Hilliard degenerate mobility polynomial free energy surface diffusion Lee Munch Suslina`; `site.nist.gov Cahn Hilliard variable mobility divergence equation`.

Opened NIST PFHub Benchmark 1, https://pages.nist.gov/pfhub/benchmarks/benchmark1.ipynb/, especially the free-energy/dynamics and boundary-condition sections, and Lee, Munch and Suli, https://arxiv.org/pdf/1507.02410. The conservative equation places mobility inside the divergence. The existing optional degenerate update uses M(c) times a chemical-potential Laplacian and omits the mobility-gradient contribution. A conservative face-flux discretization is the correction target. The paper also cautions against identifying quadratic degenerate mobility with pure surface diffusion for polynomial free energies. The proposed stencil tests are not a reproduction of PFHub's full benchmark or proof of continuum convergence. No novelty claim is involved.

### 2026-09-21  wave and convection numerical audit

Queries: `Visscher 1991 A fast explicit algorithm for the time-dependent Schrodinger equation PDF norm staggered`; `site.edu Visscher algorithm Schrodinger staggered probability norm 1991`; `"Visscher" "A fast explicit" filetype:pdf -site:researchgate.net -site:scirp.org -site:citeseerx.ist.psu.edu -site:scispace.com`; `site.edu "Visscher" "probability" Schrödinger algorithm`; `site.dedalus-project.readthedocs.io Rayleigh Benard convection buoyancy free slip Nusselt`; `Rayleigh Benard Nusselt 1 sqrt Ra Pr volume average w T free fall units paper`.

Read: [Visscher's author-uploaded paper](https://www.researchgate.net/publication/253168396_A_fast_explicit_algorithm_for_the_time-dependent_Schrodinger_equation), original Computers in Physics 5, 596–598 (1991), equations 7–8 and stability appendix; [official Dedalus Rayleigh–Bénard example](https://github.com/DedalusProject/dedalus/blob/master/examples/ivp_2d_rayleigh_benard/rayleigh_benard.py); [Pandey, Scheel and Schumacher (2018)](https://www.nature.com/articles/s41467-018-04478-0), Methods equations 10–14; [Whitehead and Doering (2011)](https://arxiv.org/pdf/1104.2278), page 2 and Figure 1. Visscher's DOI page did not open. A [TU Wien thesis landing page](https://repositum.tuwien.at/handle/20.500.12708/160075) supplied a summary only and was not used as equation evidence.

Conclusion: fixed-step undamped Visscher evolution preserves a cross-time modified norm, not the old mixed-time display density. Its conditional stability must include the actual potential envelope. The two-dimensional matrix bound and Fourier benchmarks are derivations for this implementation. Convection's free-fall coefficients and buoyancy sign agree with the sources; stress-free tangential velocity and the instantaneous heat diagnostic required corrections. Numerical controls reproduce the old failures. Neither audit establishes novelty or reproduces complete experimental/turbulent results; bounded evidence and remaining gaps are in validation/SCHRODINGER.md and validation/CONVECTION.md. Earlier access limitations in this chronological ledger describe those earlier sessions, not this successful source retrieval.

## 2026-09-21 — New simulation modules and compute-intensive experiments

Read the current catalog before searching for missing models. The selected additions are classical Maxwell FDTD and Lennard–Jones molecular dynamics. Further candidates are kinetic plasma and nonlinear shallow water. These are established scientific models; neither GitHub availability nor a large example count establishes correctness or originality. The concise comparison is in [research/MODULE-RESEARCH.md](research/MODULE-RESEARCH.md).

Inspected actual repository licenses and source: RobinKa/maxwell-simulation (MIT), Allen-Tildesley/examples (CC0), JuliaVlasov/GEMPIC.jl (MIT), and clawpack/riemann plus clawpack/pyclaw (BSD-3-Clause). Primary numerical references included the official Meep FDTD introduction, the Allen–Tildesley Python guide, Kraus et al. arXiv:1609.03053, and Clawpack's exact shallow-water Riemann treatment. These are references for original implementations; no external application runtime is bundled.

A WebGPU molecular demo was excluded from scientific reuse because its single kick/drift update was labeled velocity Verlet and its force direction appeared reversed in inspected source. A linearized shallow-water demo was not treated as a nonlinear shock solver. pmocz/pic-python's actual license is GPL-3.0, so it was not copied into this Apache-licensed implementation. These are bounded source inspections, not measured upstream validation.

Exact module-discovery queries:


All on 2026-09-21. Multiquery outputs were noisy and sometimes dominated by one query, so several were narrowed/repeated within this discovery pass; none were old ledger skip searches.

1. `site:github.com Maxwell FDTD WebGL license`
2. `site:github.com Lennard Jones javascript molecular dynamics LICENSE`
3. `site:github.com shallow water simulation WebGL MIT`
4. `site:github.com elastic wave simulation javascript license`
5. `site:github.com "Lennard-Jones" "JavaScript" "license"`
6. `site:github.com "particle-in-cell" "MIT"`
7. `site:github.com "material point method" "WebGL"`
8. `site:github.com pmocz "particle-in-cell"`
9. `site:github.com "Lennard-Jones" "JavaScript" "MIT" simulation`
10. `site:github.com "molecular dynamics" javascript license verlet`
11. `site:github.com/pmocz "particle-in-cell"`
12. `site:github.com "Lennard-Jones" "JavaScript" "MIT"`
13. `site:github.com "molecular dynamics" "JavaScript" "Verlet"`
14. `site:github.com Allen Tildesley examples license Lennard Jones`
15. `site:github.com mathmod "400"`
16. `MathMod github 400 mathematical models Abderrahman`
17. `site:clawpack.org shallow water Riemann book exact solver`


Primary URLs and access record:


Web open:
- https://github.com/RobinKa/maxwell-simulation
- https://github.com/timdrysdale/webgl-fdtd
- https://github.com/Binamraaa/interactive-shallow-water-model
- https://github.com/pmocz/pic-python
- https://github.com/RobinKa/maxwell-simulation/blob/master/LICENSE
- https://arxiv.org/abs/1609.03053
- https://meep.readthedocs.io/en/latest/Introduction/
- https://www.clawpack.org/riemann_book/html/Shallow_water.html
- https://www.clawpack.org/v5.10.x/riemann/Shallow_water_Riemann_solvers.html
- https://github.com/Allen-Tildesley/examples/blob/master/python_examples/GUIDE.md

Web failed (license later read successfully through GitHub API):
- https://github.com/Binamraaa/interactive-shallow-water-model/blob/main/LICENSE — cache miss.
- https://github.com/scttfrdmn/webgpu-compute-exploration/blob/main/LICENSE — cache miss.
- https://juliavlasov.github.io/GEMPIC.jl/stable/ — tool internal fetch error; raw documentation read instead.

Direct raw source reads, all successful:
- https://raw.githubusercontent.com/RobinKa/maxwell-simulation/master/src/em/kernels/simulation.ts
- https://raw.githubusercontent.com/Binamraaa/interactive-shallow-water-model/main/shallow_water_model.py
- https://raw.githubusercontent.com/scttfrdmn/webgpu-compute-exploration/main/js/examples/molecular-dynamics.js
- https://raw.githubusercontent.com/JuliaVlasov/GEMPIC.jl/master/README.md
- https://raw.githubusercontent.com/JuliaVlasov/GEMPIC.jl/master/docs/src/strong_landau_damping.md
- https://raw.githubusercontent.com/Allen-Tildesley/examples/master/python_examples/md_nve_lj.py
- https://raw.githubusercontent.com/Allen-Tildesley/examples/master/python_examples/md_lj_module.py

Direct API reads: for each of RobinKa/maxwell-simulation, Binamraaa/interactive-shallow-water-model, scttfrdmn/webgpu-compute-exploration, JuliaVlasov/GEMPIC.jl, pmocz/pic-python, fetched `https://api.github.com/repos/{owner}/{repo}`, `/license`, and `/git/trees/{default_branch}?recursive=1`. License contents were base64-decoded and read, not inferred from badges. For Allen-Tildesley/examples fetched `/license` and `/commits/master`. For clawpack/riemann and clawpack/pyclaw fetched repository metadata, `/license`, and `/commits/master`.

## 2026-09-21 — MathMod collection identification

The user recalled a scientific program with roughly 400 examples and later said MathMod was probably the one. This is a plausible identification, not a confirmed quote from the original comment.

Exact web queries: `"400" "simulations" "VisualPDE"`; `"MathMod" "400" models`; `"400" "models" "mathematical" software simulations`; `MathMod GitHub 400 mathematical models`; `MathMod official library 400 examples`.

Opened primary pages: https://github.com/parisolab/mathmod ; https://github.com/parisolab/mathmod/releases ; https://sourceforge.net/projects/mathmod/ ; https://raw.githubusercontent.com/parisolab/mathmod/master/mathmodcollection.js . A secondary download page suggested 400 examples, but the counted primary files are the evidence below. The web-tool open of Licence.txt failed; direct HTTPS retrieval succeeded.

Direct HTTPS/API reads: https://raw.githubusercontent.com/parisolab/mathmod/master/Licence.txt ; https://raw.githubusercontent.com/parisolab/mathmod/master/mathmodcollection.js ; https://raw.githubusercontent.com/parisolab/mathmod/master/advancedmodels.js ; https://api.github.com/repos/parisolab/mathmod/commits/master . Revision dcf4eb81039602899c46a93c4ce1ef3bf7c8a756. Python JSON parsing with strict=False (a literal control character prevents strict parsing of the main file) counted 399 MathModels in the main collection and 186 in the advanced collection. These are entry counts, not a deduplicated count of independent models. No downloaded executable or collection script was executed.

MathMod describes a 3D implicit/parametric surface plotter, not 400 independently validated dynamical solvers. Its repository Licence.txt includes the GPL version 2 text, while SourceForge lists GPLv3/LGPLv3 metadata: provenance needs resolution before any bundled reuse. No MathMod code or collection has been copied into GENChase. Published mathematical equations can be considered individually for original implementations with scientific attribution and checks. Selected numerical simulation additions in this batch are Maxwell and Lennard–Jones, researched separately; they are established physics, not discoveries or MathMod ports.

## 2026-09-21 — Maxwell implementation source audit


Read AGENTS.md, the module contract, validation/README.md, and the research ledger before searching. No Maxwell/FDTD/Yee entry or skipped Maxwell search was present. This is an implementation of classical equations, not a novelty search or claim.

Exact searches:
- `Yee 1966 numerical solution initial boundary value problems Maxwell equations isotropic media DOI`
- `site.eecs.wsu.edu schneidj ufdtd chapter 8 TMz Courant`

Opened primary/author sources:
- https://doi.org/10.1109/TAP.1966.1138693 redirects to the IEEE record for K. S. Yee (1966); accessible response had no paper body. Do not claim the original paper's full text was read.
- https://eecs.wsu.edu/~schneidj/ufdtd/chap8.pdf, John B. Schneider's author-hosted notes: section 8.3, equations 8.3–8.12, spatial and temporal staggering, material coefficients; square-grid Courant limit example at 1/sqrt(2). Only equations and method descriptions used; no source-code copying.
- https://eecs.wsu.edu/~schneidj/ufdtd/chap7.pdf, sections 7.2–7.4: physical wave speed, staggered harmonics and finite-grid dispersion. The implementation's two-dimensional Fourier-mode benchmark is derived independently from its declared discrete operators.

Planned scope: periodic lossless TMz fields in normalized units, positive stationary dielectric coefficient, uniform positive permeability. No conducting wall, source injection, absorbing-boundary/PML, dispersive or nonlinear material claim. GPU code and CPU benchmark are new implementations from the equations; Yee/Schneider are credited. Numerical comparisons support bounded correctness and convergence, not originality.

## 2026-09-21 — Molecular implementation source audit

# Molecular module research, 2026-09-21

Read project AGENTS.md, RESEARCH.md, catalog, module contract and validation contract. No new web query was needed after the GitHub-discovery pass; its exact query and URL log is in `github-module-research.md` in this directory.

Fresh primary sources read in that pass:

- https://github.com/Allen-Tildesley/examples (authors' 2017 book companion)
- https://github.com/Allen-Tildesley/examples/blob/master/COPYING.txt (actual CC0-1.0 file via GitHub `/license` API)
- https://github.com/Allen-Tildesley/examples/blob/master/python_examples/GUIDE.md
- https://raw.githubusercontent.com/Allen-Tildesley/examples/master/python_examples/md_nve_lj.py
- https://raw.githubusercontent.com/Allen-Tildesley/examples/master/python_examples/md_lj_module.py
- https://api.github.com/repos/Allen-Tildesley/examples/license
- https://api.github.com/repos/Allen-Tildesley/examples/commits/master

Inspected commit: `4818bc821a5acbfb3ebfc54ef9117968bdb22ad1`. The code demonstrates real velocity Verlet, pair potentials, periodic boundaries and energy/temperature diagnostics. Its basic NVE LJ case is 3D and cut-and-shifted; our original 2D JavaScript uses explicitly **force-shifted** energy and force. Do not compare our thermodynamics to its 3D EOS, and do not claim bare-LJ equilibrium radius for the force-shifted pair potential.

Implementation uses published equations, no copied solver code, no external runtime, no novelty claim. The development checks use independent finite-difference energy gradients, differently expressed all-pairs forces, an independently integrated RK4 trajectory with reference refinement, and actual browser exports. Original authors remain credited. The tempting MIT WebGPU showcase was rejected for its integration labeling and apparent force-sign defects; see the discovery notes.

## 2026-09-21 — Useful experiment and prior-article screening



1. [Bor, Turduev and Kurt, Scientific Reports 6, 30871 (2016)](https://www.nature.com/articles/srep30871). Full article text read, especially design approach and numerical/experimental results. It uses differential evolution with TMz FDTD to optimize dielectric-cylinder arrangements for focusing, and compares with microwave measurements. This directly rules out claiming dielectric-rod search or AI-independent algorithmic design as a new idea. The reported focusing is near-field; it is not evidence for arbitrary far-field superresolution.
2. [Meep official adjoint tutorial on GitHub](https://github.com/NanoComp/meep/blob/master/doc/docs/Python_Tutorials/Adjoint_Solver.md). Read minimax broadband mode-converter section and implementation setup. Existing tools already handle multiple objectives, worst-case wavelength objectives and minimum feature constraints. This is a reference implementation and possible independent verifier, not a novelty certificate.
3. [Tang et al., Time Reversal Differentiation of FDTD for Photonic Inverse Design (2023), author-hosted PDF](https://danlimsw.com/files/tang_et_al_2023_time_reversal_differentiation_of_fdtd_for_photonic_inverse_design.pdf). Read methods and the time-domain delay example on pp. 7–8. The authors optimize dielectric structure for a delayed field window and explicitly discuss residual resonances. Their [published code repository](https://github.com/jerrytang513/TimeReversalDirectDifferentiation) opened; code was not executed or audited. Direct time-window pulse design already exists.
4. [Elbek et al., Tailoring robust photonic components using stochastic topology optimization (2026), DTU institutional record](https://orbit.dtu.dk/en/publications/tailoring-robust-photonic-components-using-stochastic-topology-op/). Read institutional abstract only. It describes Gaussian-field geometric errors, sampling and robustness across wavelengths/geometries. Fulltext link returned an internal retrieval error; do not treat the full paper as inspected. Its abstract alone defeats a broad novelty claim for stochastic photonic robustness.
5. [Whitelam and Tamblyn, Physical Review E 101, 052604 (2020)](https://journals.aps.org/pre/abstract/10.1103/PhysRevE.101.052604). Read publisher abstract only; article body requires access. It establishes prior AI-controlled temperature/chemical-potential self-assembly protocols. It does not establish that our exact 2D LJ quench experiment was done. arXiv HTML/PDF retrieval failed; [NRC fulltext archive](https://publications-cnrc.canada.ca/eng/view/ft/?id=0f1b7155-a5cd-443b-ba24-76025345031a) timed out.
6. [Hammond et al. photonic foundry constraints (2021), DOI 10.1364/OE.431188](https://doi.org/10.1364/OE.431188): search returned substantive publisher excerpts on erosion/dilation robustness; opening the DOI failed. Meep's read tutorial independently documents the related functionality. Do not cite this as a fully read article here.
7. [Temperature protocols to guide selective self-assembly of competing structures, PNAS (2022)](https://doi.org/10.1073/pnas.2119315119): publisher search extract described repeated heating/cooling for selective assembly; opening the DOI failed. Not used for a quantitative claim or an exact comparison with monodisperse LJ.

The search also surfaced [MAPS, official DATE 2025 framework](https://github.com/ScopeX-ASU/MAPS), [a MEEP-verified inverse-design benchmark repository](https://github.com/pberlizov/nanophotonics-inverse-design), and a [2025 PRX multiobjective self-assembly study](https://journals.aps.org/prx/abstract/10.1103/PhysRevX.15.011075). These were search leads only, not opened or independently reviewed. They are not evidence that GENChase's proposed exact setup is new. Further searches should target the final frozen geometry/objective and named nearest papers rather than repeat this broad survey.

### Exact searches run on 2026-09-21

1. `robust inverse design dielectric photonic device worst case fabrication defects pulse FDTD topology optimization`
2. `inverse design photonic broadband time domain pulse routing temporal response dielectric`
3. `Lennard Jones two dimensional crystallization nonmonotonic cooling protocol optimization machine learning annealing`
4. `"Lennard-Jones" "cooling" "reinforcement learning"`
5. `"Lennard-Jones" "optimal" "annealing" crystallization protocol`
6. `site:github.com photonic inverse design robust fdtd meep`
7. `"crystallization" "nonmonotonic" "protocol" simulation`
8. `machine learning optimal temperature protocol self assembly crystallization reinforcement learning molecular dynamics`
9. `"Lennard-Jones" "temperature protocol"`
10. `"crystallization" "thermal cycling" "two-dimensional" Lennard Jones`
11. `"Learning to grow" "Whitelam" "Tamblyn" pdf`
12. `"robust" "inverse design" "missing" "cylinders" photonic`
13. `"photonic" "single defect" "inverse design"`

Also opened unsuccessful arXiv variants `https://arxiv.org/html/1912.08333` and `https://arxiv.org/pdf/1912.08333`; the search-result abstract at `https://arxiv.org/abs/1912.08333` was available. Read source sections were found using in-page searches for `37.4` (Tang), `worst-case` (Meep) and `Fulltext` (DTU). No general search result was treated as proof that a proposal has never appeared before.


The full pulse-router proposal motivated a smaller periodic field-concentration experiment, not an implementation of calibrated transmission or AI-versus-optimizer comparisons. See [experiments/MAXWELL-SEARCH.md](experiments/MAXWELL-SEARCH.md) for the frozen setup, complete 69-run result and failed improvement hypothesis. No novel scientific finding is established.

## 2026-09-21 — Maxwell boundary follow-up

No new literature query. Reused the declared Yee model and frozen search configuration. Fourteen forward solves compare equal cell spacing and physical geometry in unit and doubled-width periodic boxes at two resolutions, with zero-source and wrong-curl controls. The uniform-medium target score drops 98.48% and 98.13%; the two material finalists reverse rank. This supports a boundary contamination diagnosis for the original window. It is not a measurement of what fraction of energy followed one path, proof of hard discrete causality, or novel physics. Full records: [protocol and limits](experiments/MAXWELL-BOUNDARY.md), [results](experiments/results/maxwell-boundary.json).

## 2026-09-21 — Molecular preparation sensitivity


Read GENChase RESEARCH.md before these searches; no matching molecular preparation-memory entry or skip instruction was found. This literature scan preceded the experiment protocol and all experiment trajectories.

Exact search queries, in order:

1. `Lennard Jones initial velocity correlations structural order memory isolated fluid shear relaxation molecular dynamics`
2. `two dimensional Lennard Jones fluid initial conditions bond orientational order nonequilibrium relaxation shear`
3. `Widmer Cooper Harrowell Fynewever 2004 isoconfigurational ensemble initial velocities structural propensity`
4. `Lennard Jones transient structure after shear cessation orientational order molecular dynamics`
5. `Lennard Jones sinusoidal transverse velocity initial profile decay molecular dynamics structure`

Primary pages opened and read:

- https://journals.aps.org/prl/abstract/10.1103/PhysRevLett.93.135701 — Widmer-Cooper, Harrowell and Fynewever, *How Reproducible Are Dynamic Heterogeneities in a Supercooled Liquid?* (2004). Abstract read; full text gated. A prior article on separating configuration-dependent dynamical propensity from random dynamical variation. This is background, not an assertion that their exact protocol matches ours.
- https://pubs.rsc.org/en/content/articlelanding/1986/f2/f29868201365 — Heyes, *Shear thinning and thickening of the Lennard-Jones liquid. A molecular dynamics study* (1986). Abstract read. Shear-induced structural ordering and disorder are established; its driven liquid and regime differ from this finite isolated 2D relaxation experiment.
- https://arxiv.org/abs/cond-mat/0208389 — Errington, Debenedetti and Torquato, *Quantification of Order in the Lennard-Jones System*. Abstract read. Established bond/translational order diagnostics in a shifted-force LJ model; equilibrium and nonequilibrium preparation. No equation-level reproduction claimed.
- https://arxiv.org/abs/1103.5379 — Wierschem and Manousakis, *Simulation of melting of two dimensional Lennard-Jones solids* (2011), PRB 83, 214108. Abstract read. Established 2D bond-orientational diagnostics; their Monte Carlo, large-size correlations and phase tests are much broader than a local-order statistic from N=256 trajectories.

Failed primary opens, not treated as verified evidence:

- https://nagoya.repo.nii.ac.jp/record/26355/files/1_5026536.pdf — *Stress-structure coupling and nonlinear rheology of Lennard-Jones liquid*, HTTP 429.
- https://journals.aps.org/pra/abstract/10.1103/PhysRevA.35.1786 — transverse-current autocorrelation article, cache-miss fetch failure.

Search results seen but not opened/read: https://www.researchgate.net/publication/8195311_How_Reproducible_Are_Dynamic_Heterogeneities_in_a_Supercooled_Liquid ; https://arxiv.org/abs/2108.08164 ; https://research.ibm.com/publications/orientational-ordering-induced-by-shear-deformation-in-an-amorphous-lennard-jones-solid ; https://onlinelibrary.wiley.com/doi/10.5402/2012/342642 .

Decision: the broad hypothesis is established science, not a candidate novel formula. A controlled reproduction can usefully measure the current module's sensitivity to finite warmup and initial velocity organization. No absence-of-search-result novelty claim; no priority or exhaustive literature claim. Distinguish finite-time preparation dependence with surviving flow from structural memory after flow decay. A null outcome is retained.

Completed experiment: eight-seed N256 paired late C6 contrasts organized−Gaussian +0.00520 (95% t interval −0.02901 to +0.03941), organized−shuffled +0.00179 (−0.02191 to +0.02549). Frozen effect threshold not met. Selected half-step contrasts changed sign and failed the frozen refinement guard (absolute changes 0.062–0.106); retained explicitly. All trajectories, conservation guards, coordination guards and independent metric controls pass. Therefore no supported structural-memory claim, no equivalence/no-memory claim, and no novelty claim. Full protocol and results: experiments/MOLECULAR-MEMORY.md and experiments/results/molecular-memory.json; script tools/molecular-memory.js. The useful finding is limited interpretability of small-sample finite-warmup structural measurements, not a new law.

## 2026-09-21 — Robust Maxwell selection

# Maxwell robust-layout follow-up literature screen — 2026-09-21

Read GENChase's AGENTS.md, module contract, validation documentation, RESEARCH.md, the original Maxwell reference note and ai-experiment-research.md before this follow-up. The earlier search's nominal/worst-perturbation hypothesis failed. The new boundary experiment finds >98% reduction in the uniform short-window score after doubling domain width. Neither result establishes novelty.

## Sources and limits

- [Blankrot and Heitzinger, “On the robust optimization of photonic structures for asymmetric light transmission,” thesis chapter 6, 2020](https://www.heitzinger.info/Papers/Blankrot2020thesis.pdf). The indexed author-hosted chapter abstract and introduction explicitly compare ordinary and worst-case optimization of a 53-dielectric-rod structure under radius errors. This is particularly close prior work for the nominal/robust tradeoff; it rules out claiming that tradeoff, dielectric-rod robustness or worst-case optimization as new. The direct PDF open/find failed, so this was an indexed excerpt, not a full-text inspection. [Blankrot's publication page](https://bblankrot.github.io/) confirms the title/authors and submitted-publication status; do not imply a verified journal publication from that page.
- [Men, Freund, Nguyen, Saa-Seoane and Peraire, “Fabrication-Adaptive Optimization, with an Application to Photonic Crystal Design” (2014)](https://arxiv.org/abs/1307.5571). Read the arXiv abstract and bibliographic record, not the full paper. Robust/fabrication-aware photonic optimization predates this work.
- [Official Meep adjoint tutorial](https://meep.readthedocs.io/en/latest/Python_Tutorials/Adjoint_Solver/). Read the minimax waveguide example and assumptions. Worst-case multiobjective photonic optimization is established. This is a methodological reference, not independent execution or validation of GENChase.
- Existing ai-experiment-research.md already records Bor/Turduev/Kurt's 2016 dielectric-cylinder FDTD focusing optimization, Tang et al.'s 2023 time-window optimization and stochastic robust photonics. Do not repeat their broad novelty claims.

No exact match for the planned twelve-of-twenty-four-site, compact-source, raw-regional-Ez², every-single-deletion, domain-ranking protocol surfaced in the queries below. That is a search outcome, not evidence of historical originality. The useful narrow contribution would be reproducible evidence of whether objective and periodic-domain choices change layout rankings and whether any selection advantage survives held-out defects. It would remain a bounded model result, not a novel physical law or optimization method.

## Exact queries on 2026-09-21

1. `robust photonic design missing dielectric rod defects worst case optimization periodic boundary finite difference time domain`
2. `photonic crystal topology optimization robustness fabrication errors worst case objective boundary conditions`
3. `"photonic" "missing rod" "optimization"`
4. `"photonic" "boundary" "optimization" "spurious"`
5. `"photonic" "nominal" "worst-case" "cylinders"`
6. `"robust optimization" "photonic" "single" "deletion"`
7. `"Robust optimization of photonic structures for asymmetric light transmission"`
8. `"photonic" "single-rod" "robust" optimization`
9. `"photonic" "periodic boundary" "ranking" optimization`
10. `Blankrot Heitzinger robust photonic structures asymmetric light transmission 2020 2021 DOI`
11. `"Robust optimization" "asymmetric light transmission" -site:researchgate.net -site:scribd.com`

Other results about topological protection, sensors, band gaps and unrelated structure optimization were not used to substantiate this experiment. A negative exact-string search is not a novelty certificate.

## 2026-09-21 — Schrödinger correlation experiment

# Correlated-disorder experiment research, 2026-09-21

Read GENChase AGENTS.md and RESEARCH.md before searching. This is a new bounded model experiment, not a reopening of the vortex identity searches. **Changing quantum transport with disorder correlations is established physics, not a novelty candidate.** No historical-priority claim is made for the small protocol below.

Exact queries:

1. `correlated disorder two dimensional wavepacket spreading Anderson localization Gaussian correlations quantum particles`
2. `site:arxiv.org two dimensional correlated disorder quantum wave packet expansion localization speckle`

Primary sources opened:

- https://arxiv.org/pdf/0807.3698 — Miniatura, Kuhn, Delande and Mueller, *Quantum Diffusion of Matter Waves in 2D Speckle Potentials* (2008 preprint). Read introduction, section 2 on zero-mean potentials, correlation functions and variance, plus section 6 on finite-size limitations. This directly establishes prior study of correlated 2D disorder and expanding matter waves. Our finite lattice/filtered-noise experiment does not reproduce their continuum optical-speckle calculation.
- https://www.cpht.polytechnique.fr/cpht/uquantmat/publications/papers/piraud2013njp15_075007.pdf — Piraud, Pezze and Sanchez-Palencia, *Quantum transport of atomic matter waves in anisotropic two-dimensional and three-dimensional disorder*, NJP 15, 075007 (2013). Read abstract and opening context only; no claim to have audited the 47-page derivation. Disorder statistics affecting transport are explicitly treated in prior articles.
- https://www.nature.com/articles/s41467-020-18652-w — *Observation of two-dimensional Anderson localisation of ultracold atoms* (2020), publisher full text. Read introduction and the section distinguishing classical trapping from interference-induced localization. Finite-time reduced spread alone is insufficient to identify Anderson localization.

In-page queries: `Abstract` in the Piraud PDF; `trapping` in the 2020 article; `Finite system size` in Miniatura. No inaccessible source was used as if read.

Frozen useful question: for eight independent seeds of a fixed, unit-spacing 64x64 finite discrete Hamiltonian, does a binomial-smoothed potential change the packet's spatial variance at time 24 by more than ordinary seed variation, compared with a permutation of the **exact same potential values**? The permutation matches the complete one-point histogram as well as mean/RMS. No fitting or optimization is performed, so no fitted model has an independent-holdout requirement. Eight seeds are a small sample, with paired bootstrap uncertainty reported.

Use a single compact Gaussian-like complex initial packet in all pairs; actual audited Visscher shader, no absorber, correct half-time initialization, positive centered density for spread and unclipped cross-time invariant for numerical integrity. Fixed time step 0.1, then 0.05 for every pair. Enlarge the periodic lattice to 128x128 at spacing 1 by repeating the exact 64x64 material tile and keeping the packet unchanged. This isolates sensitivity to the wavefunction boundary while preserving local disorder; it is not a thermodynamic limit or continuum grid refinement. Explicitly report boundary-strip density, local initial potential-energy expectation and finite-time/finite-seed limitations. A smaller spread can include classical trapping and is never labeled proved localization.

## 2026-09-21 — Cahn calibration and Python analysis

# Cahn coarsening calibration research — 2026-09-21

Read current RESEARCH.md in GENChase-science and the existing Cahn validation/code before this study. Root had already searched phase ordering and supplied these primary sources; no duplicate search queries were issued. Opened the supplied primary pages directly:

- https://arxiv.org/abs/cond-mat/9501089 — A. J. Bray, *Theory of Phase Ordering Kinetics*, Advances in Physics 43, 357 (1994). Abstract read. Established long-time coarsening/scaling framework.
- https://arxiv.org/abs/cond-mat/9303011 — A. J. Bray and A. D. Rutenberg, *Growth Laws for Phase Ordering*, PRE 49, R27 (1994). Abstract read. Growth laws from energy-dissipation arguments for conserved and nonconserved fields. Do not call such laws novel.
- https://journals.aps.org/pre/abstract/10.1103/PhysRevE.47.3025 — Chakrabarti, Toral and Gunton, *Late-stage coarsening for off-critical quenches: Scaling functions and the growth law*, PRE 47, 3025 (1993). Abstract read, full text gated. Established 2D Cahn–Hilliard structure-factor length measures and modified Lifshitz–Slyozov growth with asymptotic exponent 1/3.
- https://arxiv.org/html/cond-mat/9501089v3 — failed cache-miss open; not used. The actual abstract lists v1; no full-text content was obtained from this attempted URL.

Additional exact search queries: none. These sources suffice to reject novelty of a general Cahn coarsening power law. The bounded experiment asks whether a simple finite-time calibration predicts unseen seeds, epsilon and later times on GENChase's actual finite lattice, not whether it discovers an exponent or continuum law. An empirical fit that fails any frozen acceptance guard will be rejected rather than retuned.

Before production trajectories, a zero homogeneous timing fixture and a sinusoidal timing/readback fixture were run to estimate affordable GPU workload. No random coarsening trajectories or fit data were inspected when choosing the protocol.

Result: 22 GPU trajectories and a Python standard-library fit/whole-seed bootstrap/held-out analysis. Candidate A=5.3290, p=0.18172 has 3.41% pooled held-out relative RMSE versus 9.44% for the fitted one-third baseline, but p changes from 0.14727 to 0.22050 between frozen windows (difference 0.07323 > 0.05). The frozen acceptance rule REJECTS the calibration. Narrow within-window bootstrap interval does not cover systematic window dependence. Selected dt-halving/larger-domain/conservation/independent-mode controls pass. No new formula or growth-law claim; no post-result retuning. Full exact protocol and results live in experiments/CAHN-SCALING.md, experiments/results/cahn-scaling.json, and experiments/results/cahn-scaling-analysis.json; reproducible producers are tools/cahn-scaling.js and tools/cahn-scaling.py.

## 2026-09-21 — Classical surface module


Read the repository research ledger before querying. Exact searches:

1. `site:math.* Dini surface Enneper parametrization curvature university`
2. `Enneper catenoid Dini surface site:edu parametrization Gaussian curvature`
3. `"Dini" "surface" site:math.uci.edu`
4. `"Dini" "surface" site:edu "curvature" parametrization`

Read the complete short UCI Enneper and Brown §7.3 pages cited above. Read the
Enneper curvature section in the [ETSU course PDF](https://math.etsu.edu/multicalc/prealpha/Chap3/Chap3-8/printversion.pdf).
Read the indexed Harvard Dini formula and URI exercise text. Direct page/PDF
fetches of those last two sources failed (Harvard cache/403, URI certificate/502),
so no claim of reading their full source documents is made. A search preview of
the [UCI Dini-family note](https://www.math.uci.edu/~vmm/docs/DiniKuenBreather.pdf)
uses a different parameterization; the full fetch timed out and that form is
not implemented. The Dini metric and curvature used by the benchmark were
independently derived from the explicit map above.

Opened the official [MathMod collection](https://raw.githubusercontent.com/parisolab/mathmod/master/mathmodcollection.js)
and found the four exact collection names above. This confirms selection
provenance, not numerical equivalence with MathMod. Existing Boy, Klein and gyroid
catalog entries were excluded from this selection. No historical novelty search
is needed for a module explicitly presenting these classical examples.


## Electrostatic kinetic-plasma module references — 2026-09-21

Read AGENTS.md, module contract, VALIDATION.md, validation/README.md, the plasma entries in RESEARCH.md, and github-module-research.md before implementation. The ledger already establishes Landau damping and two-stream physics as classical; no novelty search or personal naming is appropriate.

Primary algorithm source inspected: [J. U. Brackbill, On Energy and Momentum Conservation in Particle-in-Cell Plasma Simulation (2015 preprint)](https://arxiv.org/html/1510.08741), especially §§3.1–3.5, equations19–21,30–32,37–41, and stated finite-grid/energy limitations. Our original implementation will use standard CIC charge deposition at cell centers, periodic finite-difference Poisson/Gauss solve on edges, averaged center electric field and matching linear gather, with leapfrog. The paper explicitly distinguishes its momentum behavior from exact energy conservation; the module must preserve that distinction. No paper code is copied.

Also opened [GEMPIC, Kraus et al.](https://arxiv.org/abs/1609.03053) as a distinction: this module does not implement its geometric method and may not claim those properties. Opened the practitioner-authored [ES-PIC method explanation](https://www.particleincell.com/2010/es-pic-method/) for normalization and deposition context; no code copied. The prior discovery ledger already inspected permissive GEMPIC repository licensing and rejected copying GPL pic-python source.

Exact queries:

- `site.particleincell.com electrostatic particle in cell plasma oscillations cloud in cell Poisson momentum conserving`
- `electrostatic particle in cell finite difference Poisson cloud in cell leapfrog plasma oscillations Birdsall Langdon notes`

Planned evidence: independent dense periodic Poisson solution; cold-mode oscillation against omega_p=1; fixed-time temporal/spatial refinement; charge/Gauss/momentum diagnostics explicitly labeled numerical identities; particle-number deposition-noise ensemble with known expectation; finite/high-load and print preservation checks. No quantitative Landau-damping or arbitrary two-stream growth-rate claim without a separate benchmark. The original source is Apache-2.0 under GENChase's existing license.


## Shallow-water module research — 2026-09-21

Read AGENTS.md, tools/modules/CONTRACT.md, validation/README.md, current RESEARCH.md and the existing GitHub shortlist before work. Nonlinear depth/momentum shocks are absent from the current catalog and differ from incompressible fluid, buoyant convection and analytic water-wave modules.

Primary pages freshly opened:

- https://www.clawpack.org/riemann_book/html/Shallow_water.html — equations, eigenvalues u±sqrt(gh), shock curves, rarefaction invariants, and the wet dam-break solution; dry-state caveats. Read the exact-solution derivation. Reference: Ketcheson, LeVeque and del Razo, *Riemann Problems and Jupyter Solutions* (2020).
- https://www.clawpack.org/riemann_book/html/Approximate_solvers.html — conservative finite-volume flux differences, CFL interpretation, numerical diffusion of first-order methods and approximate Riemann-solver scope. Read.
- https://www.clawpack.org/riemann_book/html/Shallow_water_approximate.html — requested primary approximate-solver chapter; no relied-on text beyond the other two verified chapters.
- https://github.com/clawpack/riemann/blob/master/LICENSE and https://raw.githubusercontent.com/clawpack/riemann/master/LICENSE — actual BSD-3-Clause license freshly read, copyright 1994–2018 Clawpack Developers. No code copied or translated; original implementation of the standard equations/flux, so no imported dependency or third-party code notice is introduced.

Exact additional query: `site.clawpack.org Rusanov shallow water positivity Lax Friedrichs CFL`. Search returned Clawpack docs plus unrelated third-party material. No secondary snippets used for scientific claims. The positivity condition below is derived directly for the actual first-order update rather than attributed to an unread paper.

Chosen scope: 2D wet, flat-bottom nondimensional Saint-Venant equations, g=1; conserved state (h, hu, hv), local Lax–Friedrichs/Rusanov flux; forward Euler with dt=CFL*dx/(max(|u|+sqrt(h))+max(|v|+sqrt(h))) and 0<CFL<=0.8. Positive-depth coefficients give a sufficient positivity condition; no clipping and no dry-bed/bathymetry/rotation claims. Periodic edges or reflecting wall ghost states are explicit. First-order shock smearing is a limitation, not concealed as physical viscosity. Independent exact wet dam-break reference comes from the primary rarefaction/shock relations, not the production flux.


## Nonlinear active mixture research, 2026-09-21

Read the ledger and searched the existing catalog for nonreciprocity before selecting a recent distinct model. Exact searches: `2025 nonreciprocal Cahn Hilliard model pattern formation traveling waves chaos`; `2024 2025 odd elasticity continuum simulation nonreciprocal pattern formation`.

Opened and read the primary full article https://www.nature.com/articles/s41467-025-61728-8 , Saha and Golestanian, published 7 August 2025. Read equations 1–5, travelling-wave section equations 8–11, and numerical methods. Implement equation 5 independently, with finite differences and Heun; the paper uses spectral methods. Readback guards and bounded comparisons do not reproduce the paper's long-time phase diagram. The plane-wave convention used for checks is exp(i(qx−omega*t)), as in equation 11; substitution in equation 5 fixes the sign. Equation 8 uses the opposite phase convention and must not be copied without checking that sign.

This is recent published research, not original GENChase mathematics. No paper text, figures, solver code or data copied. Search results for 2024 odd viscoelasticity and 2025 other nonreciprocal models were not selected or claimed implemented.


## 2026-09-21 — analytic-wave implementation audit

This revisits implementation accuracy, not the originality searches already marked skip. Exact queries: `site.arxiv.org Akhmediev Kuznetsov Ma breather formula a 1/2 nonlinear Schrodinger`; `KdV two soliton tau function 1 exp eta interaction coefficient university`. Primary references selected for direct equation comparison: Haragus–Pelinovsky, arXiv:2112.14426; Benes–Kasman–Young, *On Decompositions of the KdV 2-Soliton*, author PDF https://kasmana.people.charleston.edu/solitons.pdf. Source review found a mismatched NLSE normalization, an unsupported Kuznetsov–Ma expression, and additive independent KdV pulses presented as a collision. None is novel mathematics. Corrections and equation-residual controls will be recorded separately.


## 2026-09-21 — geometric construction audit

Exact implementation-review searches: `site.math.brown.edu Reuleaux triangle constant width support`; `site.arxiv.org Apollonian circle packing Descartes reflection b1 new 2 sum`; `site.nilesjohnson.net Hopf fibration stereographic linking`. Opened primary author references Graham–Lagarias–Mallows–Wilks–Yan, arXiv:math/0010298; Niles Johnson, https://nilesjohnson.net/hopf.html and the linked David Lyons elementary introduction; Andrejs Treibergs, https://www2.math.utah.edu/~treiberg/M4531hw.pdf. Reviewed the coordinate/reflection formulas and constant-width construction, not novelty. Existing Hopf status hard-coded a theoretical linking number; Reuleaux width used the triangle vertices rather than curved arcs; the Apollonian seed did not form a tangent Descartes quadruple. These require implementation and observable corrections.


## 2026-09-21 — PDE family and neuroscience implementation audit

The PDE family review corrected the phase-field-crystal stencil mismatch, parameter-dependent timestep ceilings, hidden value clipping, Ohta reference-mean handling and batch rollback. Independent shader-versus-Float64 checks cover PFC, Swift–Hohenberg, Kuramoto–Sivashinsky, Ohta–Kawasaki, Active Model B+ and Cahn–Hilliard fixtures. The resulting status is partial: finite-grid agreement and guard behavior are recorded, while fixed-physical-domain convergence, phase selection, long-time behavior, stochastic forcing and global nonlinear stability remain open. Full details and source comparisons are in `validation/PDE-FAMILY.md`.

The Hodgkin–Huxley and Montbrió–Pazó–Roxin modules implement established equations, with independent analytic/reference ODE checks and actual print-state preservation tests. They make no novelty, clinical, finite-neuron or experimental claim. Their bounded assumptions and remaining parameter-domain gaps are recorded in `validation/HODGKIN-HUXLEY.md` and `validation/NEURAL-MASS.md`.

## 2026-09-21: contributor proposal references

Reference verification only, not an originality search or new simulation. Queries included
`Hopf 1950 The partial differential equation u_t u u_x mu u_xx Wiley DOI`,
`site.arxiv.org 1910.09175 Kovacs Rogolino heat transport`, and
`Fisher 1937 wave of advance advantageous genes doi 10.1111`.
Primary records confirm [Hopf (1950)](https://doi.org/10.1002/cpa.3160030302),
[Kovacs and Rogolino](https://arxiv.org/abs/1910.09175), and
[Fisher (1937)](https://doi.org/10.1111/j.1469-1809.1937.tb02153.x).
Catalog inspection found existing Schnakenberg kinetics and a Hopf-Cole cosmic-web model.
The two draft contributor proposals therefore cover a scalar Fisher-KPP front and
finite-relaxation heat transport. They are proposed implementations of published science,
not discoveries. See `docs/CONTRIBUTOR-TASKS.md`.


## 2026-09-21: heavy computation reference checks


2026-09-21. Reference verification for a direct CPU gravity module, not an originality search.
Queries: `site.aanda.org gravitational softening Plummer force potential N body Dehnen 2001`
and `site.nvidia.com GPU Gems 3 fast N body simulation softening velocity verlet`.
Opened the author chapter by Nyland, Harris and Prins:
https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-31-fast-n-body-simulation-cuda
and Dehnen's primary preprint https://arxiv.org/abs/astro-ph/0011568 .
The implementation uses established all-pairs Plummer-softened Newtonian gravity and
velocity Verlet, restricted to planar coordinates. It claims neither novelty nor a
paper-reproduced galaxy state. Softening and finite-time limitations are in DIRECT-GRAVITY.md.



Date: 2026-09-21.
Query: `site.hplgit.github.io fdm book wave three dimensional stability Courant sqrt`.
Read the author-hosted [multidimensional wave stability analysis](https://hplgit.github.io/fdm-book/doc/pub/wave/html/._wave-solarized004.html), equations 94 through 100, including the three-dimensional bound (99).
The source gives the centered finite-difference dispersion relation and the constant-speed stability bound. The new implementation specializes it to an equal-spacing periodic unit cube and uses a strict 0.95 margin. The method is established numerical analysis. No historical-originality search or novelty claim is implied.

Native backend installation was checked against https://docs.cupy.dev/en/stable/install.html using query `site.docs.cupy.dev stable install cupy CUDA requirements`. The optional backend requires compatible CUDA hardware; no CUDA run is claimed on the local Mac.

The native CPU worker option was checked against https://numpy.org/doc/stable/reference/thread_safety.html. Workers read shared positions/masses, write disjoint force rows and finish before the next trajectory update; no hardware-independent speedup is claimed.


## 2026-09-22: CGL and fixed-field vortex corrections

A runtime sweep exposed CGL checkerboard growth and nonfinite vortex presets. These
are repairs to established models, not new formulas. Reviewed Aranson and Kramer,
[Rev. Mod. Phys. 74, 99 (2002), Eq. 1](https://empslocal.ex.ac.uk/people/staff/ma99ewb/articles/Aronson_and_Kramer.pdf),
which uses positive imaginary diffusion and negative imaginary cubic saturation.
The old shader had the opposite diffusion sign. The corrected update uses exact
local cubic flow and explicit complex diffusion with internal substeps derived from
the five-point Fourier symbol. This changes existing CGL recipes' numerical results.

For magnetic discretization, checked the link-variable description in
[Phys. Rev. Research 7, 013066 (2025)](https://journals.aps.org/prresearch/pdf/10.1103/PhysRevResearch.7.013066).
The vortex implementation now uses unit-modulus links, exact local saturation and
a bounded explicit diffusion step. It remains a reduced fixed-field model with zero
order-parameter edges, not a self-consistent electromagnetic solution. Previous
critical-field and vortex-count-versus-flux claims were removed. Existing vortex
recipes change because the magnetic stencil, edges and stepping were corrected.

Queries: `Aranson Kramer complex Ginzburg Landau equation 2002 review 1+i b`;
`Ginzburg Landau link variable discretization gauge invariant finite difference exp vector potential`.
These searches concerned implementation conventions, not a novelty investigation.
See [bounded correction checks](validation/GL-CORRECTIONS.md) for evidence and gaps.

## 2026-09-22: independent field and collapse-family evidence

Reviewed Gotoda's [self-similar point-vortex equations](https://arxiv.org/abs/2002.09624), equations 2.4 through 2.6, for the three classical collapse-family implementation audit. This checks the similarity solution and collapse-time convention, not historical novelty. Local independent calculations and real export checks are recorded in validation/VORTEX-FAMILIES.md.

The GL full-field audit adds independent CPU solutions and print-pixel references to the earlier equation/discretization review. It exposed artificial amplitude loss from small-angle SwiftShader trigonometric evaluation. A bounded polynomial rotation fixes the measured error without loosening the full-field tolerance. The original failure, corrected results, finite domains and physical claims excluded from review are recorded in validation/GL-FIELD-REVIEW.md. No new novelty search or physical-model claim is made.

2026-09-22: Scientific claim review, not a priority search. Gyroid nodal versus exact minimal surface: Gandy et al., CPL336(2001),187-195, doi:10.1016/S0009-2614(00)01418-4. Circle-map finite averages versus rotation intervals: Alsedà and Borrós-Cullell, arXiv:2012.03340. Corrections and computed evidence are recorded in validation/PERIODIC-FIELD-REVIEW.md.

### 2026-09-22: Wilson spanning-tree implementation review

Query: `David Wilson 1996 generating random spanning trees more quickly than the cover time pdf Microsoft research`. Read Wilson 1996 Figure 1 and Theorem 1 at https://sites.math.rutgers.edu/~zeilberg/akherim/WilsonSpanningTree.pdf. The implementation follows last-exit arrows; ideal random successors are an assumption. Root-dependent commute-time complexity replaces the unqualified mean-hitting-time wording. This is established in prior articles, not an originality claim. Numerical and print evidence: validation/UST.md.

### 2026-09-24  comparable public projects  query: 54 queries, listed below
Scope: is there a public project that combines a broad catalog of real simulations, per-technique numerical validation with failure controls and error bars, per-model citations, seeded recipe links and physical-size print or SVG export. This is a positioning search, not a physics priority search.

Queries, verbatim and in order (two carried a domain filter, shown in brackets): `VisualPDE Bulletin of Mathematical Biology Walker Nicolopoulos-Salle Van Gorder`; `github visualpde repository license`; `visualpde.com about examples shareable link WebGL`; `Softology Visions of Chaos Windows modes free download`; `"Visions of Chaos" softology over 300 modes Lenia physarum reaction-diffusion closed source`; `softology.pro Visions of Chaos "modes" Lenia "Smooth Life" "Reaction-Diffusion" list`; `Visions of Chaos source code not open source Jason Rampe free commercial usage`; `complexity-explorables.org Dirk Brockmann explorables license`; `"Complexity Explorables" Creative Commons license explorables count`; `PhET Interactive Simulations number of simulations license CC-BY open source HTML5`; `falstad.com math physics applets ripple tank quantum electromagnetism list`; `Wolfram Demonstrations Project number of demonstrations Wolfram Player free`; `Golly cellular automata open source GPL cross-platform version 5`; `NetLogo Models Library number of models license GPL`; `Evgeny Demidov WebGL simulations ibiblio e-notes reaction diffusion`; `Art Blocks tokenData hash deterministic seed generative script reproducible output`; `fxhash $fx.hash $fx.rand deterministic PRNG generative token documentation`; `generative art scientific simulation validation convergence test error bars reproducible seed browser`; `browser simulation gallery reaction diffusion ising lenia physarum generative art`; `Karl Sims reaction-diffusion tool browser save image`; `Dan Schroeder physics.weber.edu HTML5 simulations Ising model lattice Boltzmann molecular dynamics`; `"generative art" simulation "print" export 300 dpi reaction-diffusion web app poster`; `interactive PDE solver browser WebGL gallery Gray-Scott Swift-Hohenberg Cahn-Hilliard Ginzburg-Landau`; `Morphon app App Store simulations generative`; `Simunauts "generative explorables" simulations published equation`; `"Morphon" generative art app simulations Ising Lenia Gray-Scott export resolution price`; `complex systems explorable simulations website percolation sandpile Ising Kuramoto open source`; `"Visions of Chaos" "modes" number softology 2025 OR 2026 version`; `PhET simulations count 2025 "simulations" physics chemistry math biology translated languages`; `softology.pro voc.htm "Visions of Chaos" Windows application "free" features` [softology.pro]; `softology Visions of Chaos Lenia mode blog`; `"Visions of Chaos" "hundreds of" OR "over 200" OR "over 300" modes fractals cellular automata Windows`; `Complexity Explorables number of explorables "explorables" Brockmann HU Berlin TU Dresden d3`; `NetLogo Models Library "sample models" count "over 600" OR "hundreds" models`; `VisualPDE numerical methods timestepping forward Euler RK4 accuracy validation "VisualPDE"`; `"Validating VisualPDE" analytical solutions convergence heat equation error`; `VisualPDE share link save screenshot image export resolution "Share" "Save"`; `VisualPDE random seed RAND noise reproducible "seed"`; `chalkdust "On the cover" VisualPDE examples explore gallery`; `Falstad applets source code GitHub license pfalstad`; `Wolfram Demonstrations Project license CC BY-NC-SA "Wolfram Player" browser cloud`; `Wolfram Demonstrations Project "13,000" OR "12,000" OR "14,000" interactive Demonstrations`; `"generative art" simulations "validation" convergence "error bar" physics studio open source`; `science art prints generated from physics simulations seed reproducible "fine art print" reaction diffusion Ising`; `Nervous System generative design simulation Floraform Hyphae reaction diffusion prints`; `Simunauts simulations PNG export video seed share link`; `"Visions of Chaos" softology "free" "closed source" OR "not open source" OR "source code is not"`; `Morphon app "sixty-three simulations" OR "63 simulations" iPhone iPad`; `"tokenData.hash" Art Blocks docs "same output" deterministic` [docs.artblocks.io, github.com, help.artblocks.io]; `Ready reaction-diffusion GollyGang pattern files references papers Gray-Scott Pearson "Ready"`; `Visions of Chaos softology mode count "Mode" list tutorials "Lenia" "Physarum" "Smoothed Particle Hydrodynamics"` [softology.pro]; `github generative art studio scientific simulations "validation" "convergence" seeded recipe print export citations`; `Simunauts simulations generative art published equation seed`; `Morphon app simulations Ising Lenia Gray-Scott iPhone`.

Opened: https://github.com/Pecnut/visual-pde (with `about.md` and `LICENSE.md`); https://github.com/GollyGang/ready/ and its releases; https://github.com/dirkbrockmann/complexity-explorables-reduced-selection; https://github.com/NetLogo/models; https://github.com/aw-pr/emergence-lab; https://github.com/skulitom/primordia; https://github.com/Artem1bar/morphogen; https://github.com/pfalstad/ripplegl; https://github.com/phetsims; https://github.com/jasonwebb/reaction-diffusion-playground; https://github.com/fxhash/fxhash-simple-boilerplate.
Blocked: visualpde.com, link.springer.com, benjaminwalker.info, softology.pro, softologyblog.wordpress.com, archive.org, conwaylife.com, www.complexity-explorables.org, phet.colorado.edu, www.falstad.com, en.wikipedia.org, demonstrations.wolfram.com, www.ibiblio.org, docs.artblocks.io, docs.fxhash.xyz, docs.netlogo.org, simunauts.vercel.app, apps.apple.com, arxiv.org, filae.site, gigazine.net, dataspaces.cids.tu-dresden.de. rocs.hu-berlin.de failed DNS.

Found ([F] a page opened; [S] a search snippet only):
- **VisualPDE.** Browser PDE solver compiled to WebGL [S]; code MIT, text CC BY 4.0 [F]; Walker, Townsend, Chudasama and Krause, Bull. Math. Biol. 85:113 (2023) [S]; about 60 examples including Gray-Scott, Swift-Hohenberg, Cahn-Hilliard and Navier-Stokes [S]; copy-link sharing and a settable RAND seed [S]; a "Validating VisualPDE" page against analytical solutions [S]. No physical-size print export or error-barred measured exponents found. Closest in rigor, PDEs only.
- **Simunauts** (simunauts.vercel.app). 84 browser simulations on one self-contained page, "every image is produced by a published equation", seeded, share links restoring seed, palette and settings, PNG/WebM export [S]. Print sizing, license, citations and validation not checked.
- **Morphon** (iPhone and iPad). 63 on-device GPU simulations, including Ising, XY, Potts, percolation, Lenia, Gray-Scott, BZ and shallow water; no analytics or servers; PNG/MP4 export [S]. Price, source and validation not checked.
- **Visions of Chaos** (Softology). Windows application, free including commercial use, fractals, cellular automata, Gray-Scott reaction-diffusion and Physarum [S]. Mode count, source availability, seeds and validation not checked.
- **Ready** (GollyGang). GPL-3.0 OpenCL desktop reaction-diffusion and PDE tool; last release v0.11.0, 2023-01-27 [F].
- **Education and demonstration sites.** PhET, 170+ HTML5 simulations, CC BY 4.0 [S]; Complexity Explorables, about 50 D3 explorables [S]; Falstad applets, ripple tank GPL-2.0+ [F]; Wolfram Demonstrations, 13,000+, CC BY-NC-SA 3.0, Wolfram Player [S]; NetLogo, more than 200 sample models [S]. No seeds, print export or validation records found.
- **fxhash and Art Blocks.** The same seed-as-artwork model: a hash seeds a PRNG and the same hash must give the same output [F: fxhash boilerplate; S: Art Blocks docs]. No science.
- **Small repositories.** emergence-lab, MIT, TypeScript and WebGL2, 18 simulations, kernel tests [F]; morphogen, MIT, 12 systems, seeded share URL, PNG/WebM [F]; primordia, MIT, Rust and wgpu, 5 worlds, GPU-versus-CPU tests [F].

Conclusion: No public project was found that combines per-technique numerical validation records, per-model citations, seeded recipe links and physical-size print or SVG export. This negative rests mostly on snippets and is weaker than a page-level one. The resulting plan is [docs/RESEARCH-GRADE.md](docs/RESEARCH-GRADE.md).
Re-search: reopen when visualpde.com, simunauts.vercel.app, apps.apple.com or softology.pro load; otherwise skip until a newly named project appears.

### 2026-09-25  owner-supplied full texts for the minimal-winding paper  read: nine PDFs, targeted to the manuscript's pinpoints

- **Conte and de Seze, arXiv:1511.00069v1** (40 pp., World Scientific typeset). Sect. 4, "Absolute motions for nongeneric strengths", p. 24: z_j = z_{j,0}(1 - t/t_c)^{1/2 - i omega t_c}; p. 25: the closed form of -2 omega + i/t_c, omega has the sign of K, and every vortex runs a logarithmic spiral about the barycentrum, collapsing in finite time or expanding. The manuscript's [Sect. 4, pp. 24-25] is right for v1; the bibitem now says the page numbers are v1's. The MPLB journal printing was not checked.
- **Krishnamurthy, Aref and Stremler, arXiv:1706.00731v2**. Eq. (40): |Z - z_cv|^2 = R^2 when L = 0, as cited. The journal (PRF) numbering is still unchecked.
- **Gallay and Sverak, arXiv:2609.10847v1**. Sect. 4.5.2 (self-similar motion on the Casimir circle when sigma = 0), Prop. 5.2(c) with Eq. (5.5) (z_j = (1 - t/T)^{1/2+is} a_j) and Eq. (5.11) (s != 0), Remark E.2, Eq. (E.1), Theorems 5.8, 5.10 and 5.15, Sect. 1 ("regularization ... always obtained up to rotations") and Sect. 5.2 ("infinitely many rotations on the approach to the collision") all support the manuscript. Pinpoint refined to [Prop. 5.2, Eqs. (5.5), (5.11)].
- **Drivas, Khanikati and Khanikati, arXiv:2607.16490v1**. Theorem 1.1: every collapsing configuration on the plane or sphere is self-similar. As cited.
- **Hernandez-Garduno and Lacomba, arXiv:math-ph/0412024v1**. Theorem 1: for three point vortices on the plane all total collisions are self-similar. Pinpoint added as [Theorem 1] (arXiv numbering; the J. Math. Fluid Mech. version was not checked).
- **Synge, Canad. J. Math. 1 (1949) 257-270** (Cambridge Core copy). Sect. 4, Eq. (4.10) and Theorem 8: when k2 k3 + k3 k1 + k1 k2 = 0, each point on the conic (4.11) in trilinear coordinates corresponds to "a single infinity of similar configurations of both orientations". Now cited in the introduction as reference [25]. No winding, rotation-rate or path bound. **DOES NOT KILL.**
- **Aref, Phys. Fluids 25 (1982) 2183** (the published scan, read as page images). Eqs. (3a, 3b) are the reduced two-ring system for circulations kappa and lambda, both arbitrary: the manuscript's [Eq. (3)] and "for arbitrary circulations" are right.
- **Grotto, Romito and Viviani, arXiv:2307.05133v1** ("Zero-Noise Selection for Point Vortex Dynamics after Collapse"). The abstract states the zero-noise limit gives a probability distribution over continuations, as the manuscript says.
- **Xiang Yu, arXiv:2103.06037v4 and 2111.07292v1** (finiteness of stationary configurations of the planar four-vortex problem). Received, not read. Relevant to the alpha draft's four-vortex Section 5 only.
- **Hiraoka, RIMS Kokyuroku Bessatsu B13 (2009) 35-43** ("Remarks on collision manifolds and nonexistence of non self-similar collision solutions in the 3-vortex problem", read later the same day). Theorems 1.1-1.2 restate his Nonlinearity 21 (2008) results: under the collision conditions the triple collision is regularizable when k1 = k2, and when k1 != k2 a solution ending in collision cannot be continued by one leaving it. Sect. 3 gives a geometric reason that no non-self-similar collision exists (all triple-collision solutions tend to the hyperbolic curve psi(x) = 0 on the collision manifold); the proof is in the 2008 paper. Hernandez-Garduno and Lacomba (2007) is earlier and keeps the credit; the manuscript now cites Hiraoka [Sect. 3] beside it. The 2008 paper (paid) bears on the Discussion's regularization paragraph and is still unread.
- **Tavantzis and Ting, Phys. Fluids 31 (1988) 1392-1409** (the owner's purchased copy, a scan read as page images: abstract, Sects. I.B-I.C and II, pp. 1392-1399). They work with the side lengths as variables. For K = k1k2 + k2k3 + k3k1 = 0 the one-parameter families of contracting and expanding similar triangles are Synge's (Sect. I.B.3); their new result (Sect. I.C statement (i), proved in Sect. II) is that the contracting family is unstable and the expanding family asymptotically stable, stability meaning the side ratios stay close. Nothing read concerns the absolute rotation, the collapse time or a bound on either, so no priority issue for P. The manuscript's sentence now says this, with [Sect. II].
- **Krishnamurthy and Stremler, Regul. Chaotic Dyn. 23 (2018) 530-550** (the owner's copy). All four citations hold. Sect. 3.1: L = 0 and gamma_2 = 0 are necessary and sufficient, and "the only possible form of finite-time collapse is self-similar collapse". Sects. 3.3-3.5 relate the angles, strength ratio, energy, collapse time and circumcenter distance. Sect. 3.5, Eqs. (3.26)-(3.29): phi_1 = -tau~ K_1 log(1 - t~), so P = tau~ |K_1| in their notation, and s~(1) = 2 tau~ |K_2|, with the sentence "numerically we find that s~(1) > 2". Since |Z~(0)| = 1, tau~ |K_2| = sqrt(1/4 + tau~^2 K_1^2), so s~(1) = sqrt(1 + 4P^2), the manuscript's expression; they state no bound and do not minimize. The manuscript now pinpoints Sect. 3.1 (twice), Sects. 3.3-3.5 and Eq. (3.28a), and says P = tau~ |K_1| in their notation. This closes the priority question for this paper; Stremler 2021 is the remaining one.
- **Hiraoka, Nonlinearity 21 (2008) 361-379** (the owner's copy). Variables: side lengths R_i and signed area A, so rotation is quotiented out. Theorem 1: for k1 = k2 (the two like-signed vortices) the triple collision is topologically regularizable in Easton's sense, under the equivalence (5) that identifies the two equal vortices; Theorem 2: not for 0 < |k1 - k2| < epsilon. Method: McGehee's collision manifold. Prop. 2.8: no non-self-similar triple collision solutions (after HGL 2007, which keeps priority). Nothing on the rotation angle, collapse time bound or P. Now cited in both the self-similarity sentence [Prop. 2.8] and the Discussion's regularization paragraph [Theorems 1, 2] (26 references).
- **Stremler, Regul. Chaotic Dyn. 26 (2021) 482-504**, doi:10.1134/S1560354721050038 (the owner's copy, searched in full for collapse, self-similar, distance, travel, bound, spiral and rotation). The review reformulates three-vortex motion in the interior angles and treats the cases Gamma_1 = Gamma_2 = +-Gamma_3. Self-similar motion takes one paragraph (Sect. 3, Eqs. (3.8)-(3.9)), which refers to Krishnamurthy-Stremler 2018 for collapse and expansion. It states no bound on the distance traveled or on the rotation and does not repeat the s~(1) > 2 observation. No priority issue; the Discussion's credit to Krishnamurthy-Stremler 2018 stands, and the manuscript need not cite this review. With this, every must-read for the minimal-winding paper is done; its priority search is closed.
- **Leoncini, Kuznetsov and Zaslavsky, Phys. Fluids 12 (2000) 1911-1927** (the owner's copy of the journal version). It agrees with the arXiv reading: Lambda = e^{4 pi H} = Y^k/X (Sect. II), and Fig. 18's caption reads "fastest collapse value Lambda = sqrt(3)/2", collapse time tau = 4 pi/3. So the sqrt(3)/2 there is the energy parameter, not P, as the manuscript says; Fig. 18 keeps its number. They also note (p. 1921) that contracting self-similar motion is unstable and expanding asymptotically stable, crediting their Ref. 30, Tavantzis and Ting. No change to the manuscript.
- **Aref, Rott and Thomann, Annu. Rev. Fluid Mech. 24 (1992) 1-21** (the owner's copy). P. 17: Groebli's Sect. 10 treats self-similar motions "where the vortices move along logarithmic spirals and can collapse to a point (which must be the centroid) in a finite time", with two necessary conditions (the harmonic mean of the circulations vanishes, and a second invariant vanishes); Fig. 3 (p. 18) shows Groebli's self-similar expansion and Aref's 1979 construction. The review does not mention Novikov-Sedov 1979. The manuscript's "see [art1992] for the history" holds, now with [p. 17, Fig. 3]. Paper 1's reading list is complete.
- Re-search: none needed for these items; the journal versions of KAS 2018 and HGL 2007 remain the only open pinpoint checks among them.

### 2026-09-25  pre-submission review of the minimal-winding paper  three independent reviews, fixes applied

- **Mathematics.** An independent re-derivation from Eq. (1) (SymPy exact algebra, mpmath 40-60 digits, independent Biot-Savart code for 3,990 three-vortex shapes and the rings n = 2-8) found no mathematical error. Gaps closed in the text: Q(1, y) = 6912(y - 2)^2(4y + 1) for Theorem 1(b), (c) at mu = 1; the proof that P_+ grows without bound (y_2 > sigma - 2 with sigma the sum of the roots); Remark 1 now says the 277 values are mu = a/b in lowest terms with 2 <= b <= 30 and why irreducibility of the sextic gives the radicals claim.
- **Wording and credit fixed.** "product of the two rates" was wrong (P is their ratio, rotation rate times collapse time); "They note that s != 0" had the wrong antecedent (now Gallay and Sverak); Synge's curve is "a conic" (Synge's word); the spiral exponent now credits Novikov-Sedov p. 298 and Conte-de Seze Sect. 4 beside Aref 2010 Eq. (29c); Aref 2010 Eq. (20) is (20a); the four-vortex row credits Novikov-Sedov's rates; Demina-Kudryashov softened per entry N (their general solution contains the ratio, Eq. (10)); O'Neil 2007 stated as in the full reading (finitely many collapse configurations for each fixed complex rate); Reinaud-Dritschel-Scott: one minimum along a curve in Fig. 3; the time-reversal sentence corrected (conjugation alone reverses time); the self-similarity credits in chronological order; the seven-vortex counterexample now prints its circulations and positions; Gotoda's arXiv v1 Eq. (3.3) misprint is stated in the text; the discriminant factors B and E renamed Delta_1 and Delta_2, since B and C were also Kimura's letters.
- **Bibliography.** Grotto-Romito-Viviani now cited in its journal version (Physica D 457 (2024) 133947, with a different title; the manuscript's one-sentence description rests on the arXiv v1 abstract, and the journal version has not been read); Conte-de Seze's Mod. Phys. Lett. B 29 (2015) 1530017 added; Borisov-Lebedev pp. 74-86 (two search results, not the journal page); Hernandez-Garduno-Lacomba marked as arXiv theorem numbering.
- **Final prior-article search (28 queries, logged in the reviewer's notes, 2026-09-25).** Nothing states or minimizes a lower bound on the rotation, spiral pitch, |omega_0| t_c, Kimura's |B|/(-2A) or the path length before three-vortex collapse, in the plane, alpha/SQG models or on the sphere, nor the two-ring minimum. Publisher sites were blocked, so this rests on snippets and abstracts. New, not killing: Donati and Godard-Cadillac (Nonlinearity 2023, Hoelder regularity of collapse trajectories); Leoncini et al. arXiv:2609.25989.
- **Not done here, owner's decisions:** a direct hand-checkable proof of P > sqrt(3)/2 (the computer-algebra certificates are in code/); title wording ("winding" vs "winding rate"); trimming Section 5 and Table 1 (RCD does not consider papers under 10 journal pages); the AI-assistance statement's detail; the Demina-Kudryashov ring-plus-centre family (the math review finds P > sqrt(3)/2 there too, infimum sqrt(3)/2 as |Gamma_0| -> infinity).
- Re-search: skip for these items.

### 2026-09-25  a direct proof of the three-vortex bound P > sqrt(3)/2  added to the minimal-winding paper

- **What.** A proof of Corollary 1 that needs only Lemma 1 (the elementary inequality) and Lemma 3, not Theorem 1, its resultants or interval arithmetic. With k = (1-mu)(2+mu)(1+2mu), T = 2R + (1-mu)C and V = 3(1+mu)^2(R - C^2): k^2 + 27mu^2(1+mu)^2 = 4R^3, T^2 = RM^2 + V, and 9(1+mu)^2 N = 2R(T^2+V) + kMT turn Eq. (Ptheta) into P = (2 - x^2 + x cos psi)/(2|x| y sin psi) with x^2 + y^2 = 1, and Lemma 1 gives P^2 >= 3/4 + 3(1+mu)^2 sin^2(theta)/M^2 > 3/4. Equivalent certificate: 4R^3(N^2 - 3mu^2(R-C^2)M^2) = (kN + 3mu^2 MT)^2 + 48mu^2(1+mu)^2R^2(R-C^2)^2. A four-line sharpness argument (sin theta = -sqrt(3)mu/2 on A_-) completes Corollary 1 without Theorem 1.
- **Where it came from.** It is the shape-sphere / Cauchy-Schwarz argument sketched in research/generalizations-2026-09-24/README.md, which had been fitted numerically but never derived; the three identities are the missing derivation, in the paper's variables. The alpha-winding draft's argument also specializes to alpha = 0 but needs its side-length lemmas; it was not used, so the second paper keeps its own proof.
- **Checks.** The four identities were verified twice in SymPy, independently (the proving agent's script and a separate one-off check). code/verify_direct_proof.py (29 exact checks, output in data/verify-direct-proof-2026-09-25.txt) now ships with the paper. The proving agent also checked P > sqrt(3)/2 from Biot-Savart at 110 digits on 119,006 collapsing configurations (mu from 1e-12 to 1e6, both arcs, points within 1e-40 of the arc ends) and on 3,000 random triangles with harmonic circulations, and ran negative controls (a constant sqrt(3)/2 + delta fails; dropping zero impulse or the harmonic condition, the SQG kernel, and seven vortices all go below sqrt(3)/2).
- **Prior article review.** Not searched separately: it is a proof of a result already searched (see the pre-submission review entry). The paper now has 14 pages. Re-search: skip.

### 2026-09-25  owner-supplied full texts for the alpha-winding draft  read: YOI 2021, IYW 2025, the Reinaud 2021 Correction

- **Yasunaga, Otobe and Iwayama, J. Phys. Soc. Jpn. 90 (2021) 124401** (6 pp., doi:10.7566/JPSJ.90.124401; the owner's copy, not committed), "Self-similar motion of three point vortices for a generalized two-dimensional fluid system". Their alpha is 2 minus ours, over 0 < alpha <= 3 (ours -1 <= alpha < 2); the prefactor (alpha-2)Psi(alpha) vanishes at their alpha = 0, our alpha = 2 (p. 1, Eq. 2). Sect. 2: H = M = 0 (after BB18) as Eqs. (9)-(10). Sect. 3, two equal circulations: the gamma_3 range and the position curves (Figs. 1-3). Sect. 3.1.1: at their alpha -> 0, gamma_3 = -1/3 at the collinear shape with sides 1/phi, 1, phi (Eqs. 21-25). Sect. 3.2: 0.387464 at theta = 0 for SQG. Sect. 4 and Appendix: the spiral (Eq. 31), A + iB from the initial positions (Eq. 32), tau* = -1/((4-alpha)A) (Eq. A.9); A + iB is the draft's kappa_0 and their exponent is +-|omega_0| t_c. Figs. 4-5 plot A and B against theta for two equal circulations; B/A is never formed, bounded or minimized, and that family cannot approach the infimum. **DOES NOT KILL.** Pinpoints for the draft: spiral [Eqs. (31), (32), (A.9)]; Remark 2's alpha = 2 endpoint and golden-ratio collinear shape [Sect. 3.1.1]; r1 r3 = r2^2 is immediate from Eqs. (9) and (21) but not stated there.
- **Iwayama, Yajima and Watanabe, J. Phys. A 58 (2025) 075701** (24 pp., open access, doi:10.1088/1751-8121/adaef8; the middle author is T. Yajima, per the byline and ORCID list). Same alpha as YOI. Sect. 2.4: on M = 0, self-similar iff h = 0 (Eq. 2.6). Sect. 3.1: no non-self-similar collapse for 2 < alpha <= 3 (ours -1 <= alpha < 0). Sect. 3.2: for 0 < alpha < 2 the h != 0 trajectories reach the origin ("possible existence"; Sect. 2.5 says finite-time convergence and the triangle inequality are still needed). Sect. 4 (SQG, sigma1 = sigma3): quartic (4.2), p* in radicals (4.3), sigma* in radicals (4.6), equal to the root of the draft's 4g^4 - 8g^3 + g^2 - 2g + 1 to 28 digits, collinear at sigma*, equilateral at 1/2 (p. 10); (4.7) is the draft's Lemma 2 identity; non-self-similar collapse needs sigma* <= sigma <= 1/2 (4.19) and approaches r23 = p* r12 (4.17). Sect. 5: numerics; trajectories pass isosceles and near-collinear shapes before collapsing. Nothing on the rotation. **DOES NOT KILL** the bound. **PARTIAL** for Remark 2's SQG endpoint (credit Eq. (4.6) and p. 10) and for open problem 5 (the quartic is Eq. (2.6), solved in radicals for equal circulations in Eq. (4.3)). The draft's unqualified "isosceles, equilateral and collinear triangles never collapse" fails outside self-similar motion; the draft must say "self-similar" there and in three other places. IYW's ref. [18] prints "Chen J and Liu A"; keep Q. Liu.
- **Correction to Reinaud, GAFD 115(4) (2021) I** (3 pp., doi:10.1080/03091929.2020.1848127, correcting doi:10.1080/03091929.2020.1828402; a scan, read as page images). It replaces the data of Figs. 6 and 7 (collapse time tau) and re-shows Fig. 5, whose test collapses occur "at t = tau, the value predicted by the analytical calculation". In the page-10 text, Sc now runs from 0 to 0.5200 (not from 0.559), and the sentence placing the tau minimum (s ~ 0.68 to 0.61) is replaced by "tau -> infinity as s -> Sc and s -> 1, corresponding to the two relative equilibria". No rotation, winding or bound. **DOES NOT KILL.** The draft's second-hand statements are unaffected. The article itself (pp. 369-392) is still unread. The tau min ~ 0.3657 attributed to "Reinaud GAFD 2020" in the 2026-09-20 rows came from the preprint and is unverified against the corrected article.
- **Draft fixes found, not yet applied (one revision pass after Chen-Liu is read):** YOI bibitem title and DOI; "T. Yajima"; Reinaud DOIs and the Correction; "self-similar" added to four collapse statements and to the definition; IYW's result stated as "possible existence" for 0 < alpha < 2; credit YOI Sect. 3.1.1 and IYW Eq. (4.6) in Remark 2; open problem 5 rephrased (any quartic is solvable in radicals); alpha >= 2 described as statements about the kernel system, since the fluid model's prefactor vanishes at alpha = 2.
- Re-search: no. Remaining must-reads for the draft: Chen-Liu (Physica D 470, 2024) Sects. 2-4 and the Reinaud 2021 article.

### 2026-09-25  two rings with a central vortex, and a leading-order remark  added to the minimal-winding paper

- **What (Proposition 3).** Two concentric regular n-gons (circulation x at radius 1, -1 at radius sqrt(x), relative rotation theta, zero angular impulse) and a vortex Gamma0 at the center. Self-similar for every theta iff (n-1)x^2 - 2(n - Gamma0)x + (n-1) - 2Gamma0 = 0, i.e. Gamma0 = ((n-1)x^2 - 2nx + n - 1)/(2(1-x)). Every real Gamma0 has exactly one root x > 1, and one in (0,1) when Gamma0 < (n-1)/2; the ring swap (circulations times -1/x, reflection) maps the root x < 1 for Gamma0 to the root 1/x for -Gamma0/x with the same P, so x = e^{2t}, t > 0. Then collapse iff sin(n theta) > 0 and P = (a - b cos n theta)/(2n sin n theta), a = coth t cosh nt + n sinh nt, b = coth t. The minimum over theta is sqrt(D^2 - n^2)/(2n), D = coth t sinh nt + n cosh nt > 2n, so P > sqrt(3)/2 for every n >= 2, every Gamma0 and both roots. On the root x > 1 the minimum decreases strictly from infinity to sqrt(3)/2 as Gamma0 runs from -infinity to infinity (infimum, not attained), and equals sqrt(3)/2 + sqrt(3)(1 + 2n^2)h^2/36 + O(h^4) with h = 1/(Gamma0 - 1/2). Gamma0 = 0 gives t = eta/2, b = sqrt(2n-1), a = K_n and the minimum F_n of Proposition 2, so F_n > sqrt(3)/2.
- **Proof idea.** Lemma 1 (the elementary inequality) as for Gamma0 = 0, since a > |b|; a^2 - b^2 = D^2 - n^2; D > 2n from sinh nt >= n sinh t (so coth t sinh nt >= n cosh t > n) and n cosh nt > n; D increases with t because coth t sinh nt = cosh t times a sum of cosh terms; Gamma0 = (n + coth t)/2 - (n-1)e^{2t}/2 decreases in t.
- **Checks.** The scratch derivation was re-derived independently before writing, and nothing in it failed. code/verify_central_vortex.py (80 checks, about 8 s; output in data/verify-central-vortex-2026-09-25.txt): the derivation for symbolic n, every proof identity, a second certificate of D > 2n for n = 2..7 (a polynomial with nonnegative coefficients), the expansion (exact, and the remainder over h^4 bounded for Gamma0 = +-1e3..1e5), Demina-Kudryashov Eqs. (36)-(37) for general Gamma0 (exact, and (36) against Biot-Savart to 3e-48), Biot-Savart for all 2n + 1 vortices at 50 digits on 295 configurations (n = 2, 3, 4, 5, 7; Gamma0 from -1999.5 to 250; both roots), golden-section minima at 30 digits in 13 cases, and negative controls (a constant sqrt(3)/2 + 1e-6 fails at Gamma0 = +-2000; dropping zero impulse or the circulation condition breaks self-similarity). n = 2, x = 2, Gamma0 = 3/2 gives the minimum 3 sqrt(33)/16 exactly, the value of the 2026-09-20 five-vortex entry.
- **Credit and prior articles.** The family and its rates are Demina and Kudryashov's (TCFD 28 (2014), Sect. 3, Eqs. (36)-(37)); per entry N they minimize or bound nothing. For n = 2 it is the Novikov-Sedov five-vortex collapse, with rates in closed form in Gotoda, Eq. (3.13) of arXiv:2002.09624v1; per the 2026-09-20 entries and the extra-mu five-vortex row, those sources give rates only. The final prior-article search of the pre-submission review found no minimum or bound of the winding for the rings. This closes the review's open item "the Demina-Kudryashov ring-plus-centre family". The seven-vortex DK collapse (P = 0.805 < sqrt(3)/2) has three pairs around the center, not two regular polygons, so there is no conflict.
- **Remark 4 is a leading-order calculation only, not a theorem.** A strong vortex 1 with weak pairs gamma_k at Z_k and -gamma_k + sigma_k at Z_k(1 + gamma_k u_k): to leading order the pair separation moves at the common rate only if u_k = 1/2 + i y_k and sigma_k = gamma_k^2 (the three-vortex harmonic value to that order), the pair's impulse about the strong vortex vanishes to leading order, and P -> (y^2 + 3/4)/(2y) >= sqrt(3)/2, with equality only for u_k = e^{i pi/3} and equal distances. The three-vortex minimizers as mu -> 0 and the ring minimizers as Gamma0 -> infinity both reduce to it. Nothing is claimed for exact configurations outside the two families; the scratch Newton solves of five-vortex configurations (two pairs) that stayed above sqrt(3)/2 are not in the paper.
- **Also added.** Figure 2 (the minimizing configurations at mu = 1/2 and mu = 0.05 with their spiral paths, the angle arctan 2P and the path length), a sentence in the Introduction on why P is worth minimizing (Kimura and Aref computed the two rates; Aref Eq. (29c) ties P to the spiral), and a Discussion paragraph "Meaning and limits". The paper now has 16 pages and two figures.
- Re-search: skip.

### 2026-09-25  owner-supplied full texts, later: Chen-Liu 2024, Donati-Godard-Cadillac, Demina-Kudryashov arXiv:1407.1641

- **Chen and Liu, "Sufficient and necessary conditions for self-similar motions of three point vortices in generalized fluid systems", Physica D 470 (2024) 134392** (the owner's copy, 11 pp.; not committed). Theorems 2.1 (0 < alpha <= 3, alpha != 2, their alpha) and 2.2 (Euler) give necessary and sufficient conditions and the explicit self-similar solutions in generalized Jacobi coordinates: J1(t) (the size) and the rotation angle Theta2(t) = Theta20 + c ln|1 + (...) t| with c = upsilon0/chi(Theta10) (Euler) or 2 nu0/((4 - alpha) omega) (alpha != 2), in closed form in the shape angle Theta10 and the circulations. So the rotation coefficient, which is P up to normalization, is explicit there. Sect. 4 applies Theorem 2.1 to SQG: Theorem 4.1 (sigma1 = sigma2, the range of sigma3 for self-similar motion, after Badin-Barry) and Theorem 4.2 (sigma1 : sigma2 = 1 : 2). A search of the text for minimum, maximum, fastest, bound and inequality finds none about the rotation or collapse rates: they do not bound or minimize the coefficient. **DOES NOT KILL** the alpha-winding bound, but **PARTIAL** for the draft's Lemma 3 (P in closed form): the draft must credit Chen-Liu Theorems 2.1, 2.2 for the explicit rotation coefficient and present its own contribution as the minimization. Check at the revision pass: the draft's secondhand Reinaud statements quoted "as Chen-Liu report them", and the exact normalization linking their coefficient to P.
- **Donati and Godard-Cadillac, arXiv:2111.14230v4 (2023)**, "Hoelder regularity for collapses of point-vortices" (the owner's copy, 40 pp.). Trajectories are Hoelder with exponent 1/(alpha+1) up to collapse, optimal via a three-vortex collapse (Appendix A.2). Appendix A.1, Eq. (A.19): a self-similar collapse has x_j(t) = x_j(0)((T - t)/T)^{1/(alpha+1)} exp(-iDT ln((T - t)/T)), so DT plays the role of P; it is not bounded or minimized. **DOES NOT KILL** either paper. Now cited in the minimal-winding Introduction beside Novikov-Sedov, Conte-de Seze and Aref for the spiral form [App. A, Eq. (A.19)] (27 references).
- **Demina and Kudryashov, "Multi-particle dynamical systems and polynomials", arXiv:1407.1641v1 (2014)** (29 pp.; the owner's download). The polynomial method behind their 2014 TCFD paper, for general multi-particle systems; the word collapse appears twice and no bound, minimum or rotation rate is stated. **DOES NOT KILL.** Not cited.
- Re-search: skip for these items.

### 2026-09-25  prior article review for the strong-vortex theorem, the gravity comparison and N >= 4 winding  arXiv and university hosts reachable

- **Why.** The asymptotic theorem (a strong vortex with k weak, tight opposite-sign pairs: lim inf P >= sqrt(3)/2, equality only at u = e^{i pi/3}, equal radii and pair net circulation eps^2 a^2) replaces Remark 4 of the minimal-winding paper, and its Discussion gains a sentence contrasting vortex collapse with gravitational collapse. Both needed a search first. The owner widened the network policy, so arXiv, Crossref, zbMATH, archive.org, umn.edu and vtechworks were read directly; notes, PDFs and the check scripts are in the session scratch (priorart/), not committed.
- **Theorem: CLEAN for the bound, its equality case and k >= 2 pairs; PARTLY ANTICIPATED for the one-pair picture.**
  - Krishnamurthy and Stremler, RCD 23 (2018) 530-550 (read), Sect. 3.6, Fig. 9 and Sect. 4: as g -> -1 "a small vortex dipole (vortices 1 and 2) moving in the field of a strong, fixed vortex (vortex 3)", and on their slice A = pi/3 the self-induced motion makes the angle pi/3 with the motion induced by vortex 3. They compute collapse time and energy only: no rotation rate, no P, no extremum. A check reproduced their Fig. 9 angles and found P -> sqrt(3)/2 from above along that slice (0.866052 at g = -255/256), which they do not say. Credited in the paper.
  - Sreedharan Kallyadan and Shukla, Eur. J. Mech. B/Fluids 89 (2021) 458-472 (arXiv:2003.00445v2 read): a free pair beside a fixed vortex, self-similar iff G0G1 + G0G2 + G1G2 = 0 and M = 0, spiral collapse; one pair, O(1) circulations, no rate or bound.
  - Nothing on this limit in Gallay-Sverak arXiv:2609.10847, Aref 2010, Leoncini et al. 2000, Conte-de Seze, Synge, Chen-Liu or Drivas et al. (text searched). Exactly opposite dipoles near a fixed vortex (Ryzhov-Koshel EPL 102 (2013) 44004; Koshel et al. PoF 30 (2018) 096603) fail the harmonic condition. Nothing on several pairs or satellites.
- **Gravity comparison: citable, and not found stated anywhere.** Wintner, The Analytical Foundations of Celestial Mechanics (Princeton 1941; read in the 1947 printing, same pagination), Sect. 370 bis (I), p. 286: a homographic solution is homothetic iff C = 0; Sect. 378, p. 299: for homographic solutions C = 0 is necessary and sufficient for a simultaneous collision. Sundman, Acta Math. 36 (1913) 105-179 (total collision needs zero angular momentum; Weierstrass stated it in 1889). Siegel, Ann. of Math. 42 (1941) 127-168, and Moeckel-Montgomery, J. AMS 38 (2025) 225-241, Thm 1: the rotation angle converges at a planar total collision when the limit central configuration is isolated. Nearest remarks, none of which sets the two side by side: Hernandez-Garduno and Lacomba call the zero-impulse condition an extension of Sundman's theorem; Aref 2010 speaks of central configurations by analogy with celestial mechanics. The paper's sentence is limited to three vortices and the ring families.
- **N >= 4 winding and P = 0: open in everything reached.** Yu, Adv. Math. 435 (2023) 109378 (arXiv:2103.06037v4 read): his Lambda = +-i is the non-rotating collapse; Thm 6.2 shows none for the Novikov-Sedov circulations (1, 1, k, k); finiteness for fixed Lambda; no existence. Yu arXiv:2111.07292v1: its four-vortex finiteness for all Lambda is contradicted by the Novikov-Sedov family (checked: four angles at fixed circulations, spread 1e-32); do not cite. Yu and Zhu, Math. Ann. 392 (2025): five-vortex finiteness. Hampton-Moeckel 2009, Gotoda 2021 and arXiv:2410.14973, Lewkowicz(-Kudela), Grotto-Pappalettera, Zbarsky arXiv:2402.07316, Lacomba (vortex-sources) and Newton-Ostrovskyi arXiv:1006.0543: no rotation bound, no real-kappa collapse. The correspondence "Euler kappa real = relative equilibrium of the circulations i Gamma" is not stated in anything reached.
- **O'Neil 2007 (Physica D 236) Fig. 5, "omega proportional to 1 + (4/9)i", is not a low-winding collapse.** Read naively as velocity over position it would give P = 2/9. A direct search of triple-ring collapses with circulations +-1 (the harmonic condition forces three triangles, or pentagons with a central vortex) finds nothing below P = 1.0187 (triangles) and 2.477 (pentagons with a centre) from 150 constrained minimizations each, so the figure's omega must follow the other convention, giving P = 9/8, above that minimum. Numerical, and the minima are not certified; scratch triplering/.
- Not reachable: Kimura 1987, Novikov-Sedov 1979, Newton 2001, Kudela 2014, O'Neil 2007 (RCD 12), Siegel-Moser section numbers, Saari 2005 content.
- Re-search: no for the theorem and the gravity sources; the N >= 4 questions stay open.

### 2026-09-25  two corrections to the alpha-winding record

- **The stored eleven-vortex zero-winding point expands; its mirror image collapses.** `vortex-grow-a2-n11-s0-c12.json` has kappa = +0.004549 under the alpha-winding paper's Eq. (bs), so as stored it moves outward. Its mirror image z -> conj(z) collapses (for real kappa this is the same as reversing every circulation). Entries P and Q, and the 0.6.2 CHANGELOG, call the stored point a collapse; read that as the mirror image. The existence claim is unaffected.
- **Section 5 of the alpha-winding draft quoted the Hessian eigenvalues of the Lagrangian of 2P, not of P.** The text minimizes P, so the eigenvalues are half those printed: 1.106, 6.289 and 9.377 instead of 2.21, 12.58 and 18.75. Positive definiteness is unaffected. Corrected in the .tex and .typ, and the PDF rebuilt.

### 2026-09-25  prior article review for the follow-up paper on collapse without rotation  full notes in papers/collapse-without-rotation/notes/prior-articles-2026-09-25.md

- **Weak clusters around a strong vortex (a cluster acts as a dipole whose moment plays the pair's tilt; lim inf P >= sqrt(3)/2; a (+,+,-) triple goes below at first order): CLEAN.** Nearest: Kudela, Energies 14 (2021) 943 [read] (50-vortex collapses with strong vortices, weak ones on sheets; the spiral term never evaluated); Drivas-Glukhovskiy-Khesin arXiv:2401.08512 [read] (a pair with net circulation O(eps^2), no background vortex, no collapse); Leoncini et al. arXiv:2609.25989 [read] (monopole clusters). Credit, no kill.
- **Phase diagram of collapse without rotation in the alpha-models (thresholds alpha*(N), least N per alpha, alpha_inf near 0.7): CLEAN.** Every alpha-model collapse paper reached treats three vortices; Grotto-Pappalettera 2025 builds non-self-similar collapses from three.
- **Continuum limit (point vortices plus a vortex sheet collapsing self-similarly): PARTLY ANTICIPATED, unread.** O'Neil, Theor. Comput. Fluid Dyn. 24 (2010) 39-44, doi:10.1007/s00162-009-0106-9, reports collapsing vortex sheets with a strong vortex (abstract and Kudela's description only; Springer blocked). The draft makes no novelty claim about the continuum limit until it is read.
  - **2026-09-25, read in full (the owner supplied the PDF, which is not committed): PARTLY ANTICIPATED, credited.** O'Neil approximates each sheet by 50 to 300 identical point vortices (symmetric discretization) and solves the point-vortex collapse equations by Newton's method with a truncated SVD. Fig. 1 and 2: one point vortex -1 and one sheet of circulation 2 at beta/alpha = 0.5, 0.3, 0.1 (P = 1, 5/3, 5 in our notation, P = alpha/(2 beta)). Fig. 3 top: an S-shaped sheet through the center with point vortices -1 and -0.98 on either side, beta/alpha = 1 (P = 1/2), the same type as the paper-2 continuum limit; Fig. 3 bottom: two sheets, point vortices -0.8 and -1, P = 5/4. His Eq. (6a) is the continuum circulation condition used in paper 2. He does not minimize P, solve the continuous equations directly, or relate the sheets to finite minimizers. Paper 2, Section 6, now credits him for the configuration type and claims only the direct spectral solution, the minimum P_inf = 0.47736 along the family and the agreement with the finite family; Kudela's secondhand description is no longer used.
- **Linear stability of self-similar collapse for N > 3: CLEAN.** Zbarsky arXiv:2402.07316, p. 20 [read], states it has not been obtained; Lewkowicz-Kudela arXiv:1512.05116 [read] show precision-dependent shrinking (credit).
- **Referee of the weak-cluster theorem: SOUND WITH FIXES** (statement only: the zero-dipole case made explicit, class and scope wording, no strict-bound analogue for clusters), all applied in the draft.
- **One weak triple, proved (same day):** Theorem 2 of the draft turns the first-order drop of item 1 into a theorem for one triple, by the implicit function theorem applied to the system with the degenerate combination divided by gamma; slope 2 sqrt(3) g1 g2 g3/S computed exactly over Q(t)(omega) (code/verify_triple_branch.py, 62 checks). Covered by the item-1 search above (CLEAN); no new search needed.
- **Second reader of the whole draft: 8 must-fix items (statement ranges, wording, one continuation record, labels), all applied.**
- Re-search: no for items 1, 2 and 4; O'Neil 2010 read (above).

### 2026-09-25  sharpness of sqrt(3)/2 for every number of weak vortices (papers/collapse-without-rotation/)

- **Result (proved in the draft):** Lemma 1 builds a nondegenerate translating cluster of every size m >= 2 (bases: the pair (1, -1) and the triangle (1, 1, -2), whose moving-frame stagnation points are the roots of z^3 + 3z + 2, discriminant -216; induction: vortices +-eps at two simple stagnation points, holomorphic implicit function theorem, and a sqrt(eps) rescaling that gives two new simple stagnation points). Theorem 3 (the one-triple proof for any such cluster) and Corollary 3 then give sharpness of Theorem 1(a) for every n, with a non-explicit c_n. Numerically: clusters of 4 to 15 vortices grown this way from both starting clusters, and one of 101, with their collapse families at 40 digits; from the triangle P - sqrt(3)/2 ~ -1.11 to -1.19 gamma, from the pair ~ -1.3 to -3.1 gamma^2 (code/verify_sharpness_all_n.py, 37 checks, 40 with --large).
- **Prior articles:** translating configurations of point vortices are classical; O'Neil, Trans. AMS 302 (1987) counts rigidly translating configurations (entry Q; the count uses complex circulations as a device). The draft cites him and does not claim that translating clusters of every size are new; what it uses is the explicit nondegenerate construction with simple stagnation points, which it proves directly. Second reader (same day): no error; fixes applied. To read before 'preparing': Aref, Newton, Stremler, Tokieda and Vainchtein, Vortex crystals, Adv. Appl. Mech. 39 (2002) 1-79 (translating configurations; cited by O'Neil 2010, not yet read), and O'Neil, Nonlinearity 26 (2013) in full (singular continuation; read only in summary), in case either already contains the construction.
  - **2026-09-25, both checked.** Aref, Newton, Stremler, Tokieda and Vainchtein, *Vortex crystals*, Adv. Appl. Mech. 39 (2003) 1-79 (doi:10.1016/S0065-2156(02)39001-X; the Illinois TAM report copy, not committed), read Sects. II, VIII and IX: the equilateral triangle with zero total circulation translates (Sect. II, Eq. (18b)); with circulations +-Gamma of equal magnitude, translating configurations exist only for triangular numbers of each sign, by Bartman's analysis of the Adler-Moser polynomials (Sect. IX); Sect. VIII sketches a heuristic nested-scale replacement for stationary configurations. No weak vortices at stagnation points, no nondegeneracy: **DOES NOT CONTAIN** the construction of Lemma 1; the paper now cites it for the triangle and the triangular-number restriction. O'Neil, Nonlinearity 26 (2013) 777-804: abstract only (full text paywalled at IOP): singular continuations in which two or more vortex positions coincide at some parameter values; Lemma 1 places weak vortices at distinct simple stagnation points, a different device. It stays 'read only in summary', as the paper says. Re-search: no.

### 2026-09-25  survey of open questions within reach  (session survey; scratch probes not committed)

- **Stable self-similar expansion of N >= 4 point vortices: OPEN (as far as reached).** Zbarsky, arXiv:2402.07316 p. 20 and arXiv:1912.10862 pp. 4-5 [read], names the stability of such configurations as the missing step for extending his confinement theorem beyond three vortices; Novikov-Sedov 1979 [read]. Three queries, nothing found. A binary64 probe found 3 of 40 random four-vortex and 3 of 32 five-vortex collapses whose time reversal is linearly stable (all shape exponents of the collapse with positive real part); not certified. Whether this is the stability Zbarsky needs requires a closer reading of his argument.
- **Computer-assisted proofs for Hodgkin-Huxley (subcritical Hopf near 9.78 uA/cm^2, bistability): none found.** Three searches found computer-assisted proofs for FitzHugh-Nagumo only; Hassard 1978 and Rinzel-Miller 1980 are numerical. Montbrio-Pazo-Roxin: bifurcations already in closed form (2015); no limit cycles by a Dulac function r^-2 (the survey's own derivation, not found in the literature checked). Cortex planform selection: classical.
- **Four Euler vortices always rotate:** Yu 2023, Theorem 6.2, covers circulations (1, 1, k, k) only; otherwise open in everything reached.
- Re-search: no for the Zbarsky and Hodgkin-Huxley items before acting on them, unless a week passes.

### 2026-09-25  prior article review for the stable-expansion note (papers/stable-expansion/)

- **Stable self-similar expansion of N >= 4 point vortices: CLEAN as far as reached.** Read: Zbarsky, Commun. Math. Phys. 388 (2021) 707-733 (arXiv:1912.10862, pp. 4-5: stability for N >= 4 missing; orbital linear stability not enough) and arXiv:2402.07316 (after Cor. 16); Novikov-Sedov 1979 Sect. 4 (symmetric parallelograms, numerical remark only); Gotoda, J. Dyn. Differ. Equ. 33 (2021) (no stability); Ibrahim-Shen arXiv:2609.23719 (hierarchical configurations, long-time persistence; expansions only cited). Abstract only: Kallyadan-Shukla, Phys. Rev. Fluids 7 (2022) 114701 (linear-algebra search for self-similar configurations; full text paywalled, to read before 'preparing'). Iwayama-Yajima, J. Phys. Soc. Jpn. 92 (2023) 084401: three vortices only. Queries: "linearly stable self-similar expanding configuration four point vortices stability"; "self-similar expansion point vortices stable N vortices dispersal spectral stability similarity variables"; "O'Neil relative equilibrium and collapse configurations of four point vortices stability"; "Kallyadan Shukla ... linear stability"; "Sreethin Kallyadan point vortex 2023-2025".
- Result: two certified examples (N = 4 and 5) and an exact spectral lemma; the note credits Zbarsky for the question, Tavantzis-Ting and Iwayama-Yajima for three vortices, Kallyadan-Shukla for the linear-algebra formulation.
- Re-search: read Kallyadan-Shukla in full; otherwise no.

### 2026-09-25  nonlinear stability and vortex patches for the stable-expansion note

- **Nonlinear stability of the certified expansions: standard method, new application.** That a manifold of equilibria whose transverse spectrum lies in the open left half-plane attracts nearby solutions exponentially, each to one equilibrium, is classical: Aulbach, Lecture Notes in Mathematics 1058 (1984), doi:10.1007/BFb0071569 [checked on Crossref and Springer; cited, not reread]. The note proves the version it needs (modulo rotation, sharp rate 1/size, forced version) directly and credits Aulbach. The energy fixing the limit uses sum_{j<k} Gamma_j Gamma_k = 0 (exact for both circulation vectors) and dH/dsigma != 0 (certified; equivalent to b' != 0 by a left-null-vector argument).
- **Vortex patches near expanding configurations of N >= 4: no confinement theorem found.** Read: Zbarsky arXiv:1912.10862v2 in full (only the recovery of bootstrap assumption 1, via Lemma 1(ii), uses N = 3; his (34) omits the time dependence of f_{k,2}, harmless). Davila-del Pino-Musso-Parmeshwar, arXiv:2410.18220 (2024), read pp. 1-5: a construction of smooth solutions concentrated near the N = 3 expanding spiral, with uniform support radius; they remark (p. 4) that their construction goes through for the 4- and 5-point spirals of Novikov-Sedov under analogous conditions on the masses. That is a construction of particular solutions, not confinement for all nearby patch data. Queries: "vortex patches self-similar expanding point vortex configuration four vortices confinement Zbarsky"; "self-similar point vortices vortex patches expanding stability four vortices 2025". Not read: Global Persistence of Nearly Radial Concentrated Vortices in a Bounded Domain, arXiv:2609.00645 (bounded domain, title only).
- Result: Theorem 4 of the note carries Zbarsky's theorem to the two certified configurations, with Proposition 1 in place of his Lemma 1(ii); it needs a specialist's check before 'preparing'.
- Re-search: no, unless a week passes; read the published CMP version of Zbarsky if it becomes available, in case its numbering or estimates differ from arXiv v2.

### 2026-09-25  the certificate theorems cited in the minimal-winding paper (second reading of Sections 6 to 8)

- **Why.** The second reading of Sections 6 to 8 found that the paper did not state or cite the theorems its certificates rest on. Searched for and checked: R. Krawczyk, Computing 4 (1969) 187-201 (Springer page, doi:10.1007/BF02234767); R. E. Moore, SIAM J. Numer. Anal. 14 (1977) 611-615 (SIAM and Semantic Scholar pages); S. M. Rump, Acta Numer. 19 (2010) 287-449 (full text, TUHH copy with corrections, read: Theorem 13.2, Theorem 13.3 and its proof, pp. 88-89); F. Johansson, IEEE Trans. Comput. 66 (2017) 1281-1292 (IEEE and arXiv:1611.02831 pages); A. Neumaier, Interval Methods for Systems of Equations, Cambridge UP 1990 (bibliographic data only; not cited in the paper, since its theorem numbers could not be checked).
- **What the paper uses.** Rump's Theorem 13.3: if S(X, x~) = -R f(x~) + (I - R Jf(x~ + X)) X lies in int(X) with 0 in X, then R and every matrix of Jf(x~ + X) are nonsingular and f has a unique root in x~ + X (uniqueness from the nonsingularity, as in its proof). certify_ball_ad.krawczyk is this test with X - x~ in place of X. Krawczyk and Moore are cited as the origin; Arb (Johansson) is the trust base, not a proof step. The second-order step is written out in the paper (implicit function theorem, Hessian of the reduced objective, Sylvester), so no optimization text is cited.
- Result: Section 8 now states the theorem with these citations. No novelty claim involved.
- Re-search: no.

### 2026-09-25  neuroscience scout: open questions for a rigorous-computation result  (session scout; scratch probes not committed)

- **Chaos in the space-clamped Hodgkin-Huxley ODE at the 1952 parameters: open as far as reached.** Read in full: Guckenheimer and Oliva, SIAM J. Appl. Dyn. Syst. 1 (2002) 105-114 (author copy); p. 106: "we do not give a rigorous proof that chaos exists in this system"; p. 111 conjectures that no threshold function exists near their current and that the basin boundary is fractal. The 164 papers citing it (Semantic Scholar titles, abstracts where present) contain no proof; Cessac and Samuelides, Eur. Phys. J. ST 142 (2007), misreport it as rigorous, Rubin and Wechselberger, Biol. Cybern. 97 (2007), call it evidence. arXiv abstract searches ('"Hodgkin-Huxley"' with "Smale horseshoe", "covering relations", "topological entropy", "symbolic dynamics"; '"Hodgkin" "CAPD"'; '"neuron model"' and '"conductance-based"' with "computer-assisted proof"), PubMed (Hodgkin-Huxley[tiab] with horseshoe, computer-assisted, interval arithmetic, rigorous) and the CAPD applications page found nothing. A float64 probe: the published periodic points p1, p2 are not periodic points of the return map at the published current (they miss by about 0.16), so the horseshoe has to be relocated. Not read: Oliva's thesis, Guckenheimer and Meloon (2000), Rinzel and Miller (1980).
- **Hopf points and bistability at the 1952 parameters.** Troy, Quart. Appl. Math. 36 (1978) 73-83, read in full: Hopf proved only for the system with n and h slowed by a small parameter, under assumptions "made on the basis of numerical evidence"; the bistable window is a conjecture there. Guckenheimer and Worfolk, arXiv:chao-dyn/9304010, Sect. 5: "These diagrams have not been proved to be correct". Hassard and Shiau (1989, 1991), Fukai et al. (2000): abstracts only.
- **Traveling pulse of the HH cable equation: probably open at the 1952 rates, not verified from the primary source.** Keener and Sneyd, Mathematical Physiology, 1st ed., Sect. 9.4.2, credit existence to Hastings and Carpenter (for modified systems, per Troy); Hastings 1976 not reachable. Arioli and Koch, Nonlinear Anal. 113 (2015), did the FitzHugh-Nagumo analogue at epsilon = 0.01.
- **Neural-field pulses with a smooth sigmoid at fixed epsilon: open as far as reached.** Hastings, arXiv:1503.04057v2, Sect. 1: "we are not aware of any existence proof for pulses which covers all reasonable smooth functions S", and an interval-arithmetic check is "feasible ... but we have not carried out such a check"; Dyson, arXiv:2511.17328v2, proves the Heaviside case for small epsilon and leaves the sigmoidal case open. arXiv '"neural field"' with computer-assisted, rigorous numerics, interval arithmetic, Newton-Kantorovich or radii polynomial: no hits.
- Result: `papers/hh-dynamics/` is started on the Hodgkin-Huxley questions; the neural-field pulse is being scouted further.
- Re-search: no for these items unless a week passes; read Oliva's thesis before any chaos claim and Hastings 1976 before any traveling-pulse claim.

### 2026-09-26  the Hodgkin-Huxley constants, from the 1952 paper itself

- Read: Hodgkin and Huxley, J. Physiol. 117 (1952) 500-544, eq. (26), eqs. (12), (13), (20), (21), (23), (24) and Table 3 (column 2 read from the rendered page of a scanned copy; PMC and the publisher refused the download). Table 3: C_M = 1.0, V_Na = -115, V_K = +12, V_l = -10.613 with the footnote "Exact value chosen to make the total ionic current zero at the resting potential (V = 0)", g_Na = 120, g_K = 36, g_l = 0.3.
- Finding: with the printed rate functions, the value that makes the resting current zero is 10.5989209693917... (magnitude), not 10.613; Guckenheimer and Oliva's 10.599 is this value. With 10.613 the resting current is -0.00422 uA/cm2. We have not seen this noted elsewhere, but did not search for it.
- Result: `papers/hh-dynamics/` treats E_l as the interval [10.59, 10.62], so its qualitative statements hold for both values; the Hopf currents shift with E_l by 0.3 times the difference (9.7754... and 154.5224... at 10.613; 9.7797... and 154.5267... at 10.5989...), a correction from the independent reading of 2026-09-26.
- Re-search: no.

### 2026-09-26  conservation of the pseudo-energy for vortex patches (stable-expansion, Appendix A)

- Why: the appendix cited Marchioro and Pulvirenti (1994) for the conservation of the pseudo-energy of Yudovich solutions in the plane, without a location anyone could check. Read: Zbarsky, arXiv:1912.10862v2, p. 18 (says it can be checked "with a simple computation", no proof); Gamblin, Iftimie and Sideris, Comm. PDE 24 (1999), author PDF, pp. 5, 16-17 (a constant of the motion for classical solutions); Marchioro and Pulvirenti, CMP 91 (1983) (full) and Marchioro, CMP 116 (1988) (through p. 50): point-vortex energies only; Gallay and Sverak, arXiv:2110.13739, (1.13): definition only; Brownfield, arXiv:2511.09772, p. 3: asserted; Ciampa, Crippa and Spirito, arXiv:1905.09720, Def. 5.1 and Prop. 5.2, and Ciampa, arXiv:2103.01792, Def. 2.9 and Prop. 2.10: the L2 kinetic energy only, which needs zero total circulation. Not readable here: Marchioro and Pulvirenti (1994), Majda and Bertozzi.
- Result: the paper proves the conservation itself (Lemma 6: the flow-map representation, a domination by |u| <= U and the antisymmetry of the kernel). The facts it uses are cited to Crippa and Stefani, Calc. Var. PDE 63 (2024) 168, arXiv:2110.15648 (Theorems 1.6 and 3.3, whole plane) and Ambrose, Kelliher, Lopes Filho and Nussenzveig Lopes, JDE 259 (2015), arXiv:1401.2655v1 (Remark 2.4). Yudovich (1963) treats bounded domains (as the Serfati-solutions paper, p. 2, notes), so the whole-plane statements now cite the whole-plane sources as well.
- Re-search: no.

### 2026-09-26  neural-field travelling pulse with a smooth sigmoid at fixed eps: prior article review, then a computer-assisted proof  (session agent; `papers/nf-pulse/`)

- Why: the scout of 2026-09-25 found the question open (Hastings, arXiv:1503.04057v2, Sect. 1: "we are not aware of any existence proof for pulses which covers all reasonable smooth functions S", after "some partial results" of Scheel and Faye).
- Citations of Hastings 2017 (doi:10.1017/S0308210516000044): Semantic Scholar 0 (both records), OpenAlex 0, Crossref 0, zbMATH ci:1367.35058 0 (the ci: query positive-controlled on ci:1055.70005).
- Titles and abstracts of the papers citing Pinto and Ermentrout 2001 (Semantic Scholar, 328), Faye and Scheel (Semantic Scholar, 44) and Faye 2013 (OpenAlex, 25), scanned for computer-assisted, rigorous numerics, interval, validated, radii polynomial, Kantorovich, enclosure: none.
- arXiv abstracts, nothing relevant: '"neural field"' with computer-assisted, "rigorous numerics", "interval arithmetic", validated numerics, "radii polynomial", Newton-Kantorovich, "computer-assisted proof"; '"neural field" "traveling pulse"' (4 hits, none rigorous); "Pinto-Ermentrout"; Amari and Wilson-Cowan with computer-assisted. Control 'computer-assisted heteroclinic': 17 hits. zbMATH ab:"neural field" with those terms: 0 (control: 12 hits).
- Read: Hastings v2 (Sects 1, 2 up to Theorem 1, 4); Faye and Scheel, arXiv:1311.6508 (Sects 1 to 2.3: pulses for sufficiently small eps under (H1)-(H3)); Faye 2013 (Sects 1, 2, 5: Pinto and Ermentrout built only the singular solution and did "not prove that it persists"); Pinto and Ermentrout 2001 (Sects 1, 2.1, 3.2, 4, Appendix); Dyson, arXiv:2511.17328v2 (Heaviside, small eps; the sigmoid case posed as open) and arXiv:1810.05142 (v2 text and v1 abstract); Arioli and Koch on FitzHugh-Nagumo (the method's precedent). Not reachable: Zhang, J. Dyn. Differ. Equ. 17 (2005), and Zhang (2004); not read: Pinto, Jackson and Wayne (2005).
- Result: nothing found; a computer-assisted proof of the fast pulse at beta = 20, theta = 1/4, eps = 1/10, gamma = 0, with the speed in [1.1027477097341592491478677, + 1e-25], passes (`papers/nf-pulse/code/run_all.sh`), not independently reviewed.
- Re-search: no, unless a week passes; read the Zhang papers before any claim of priority.

### 2026-09-26  neuroscience questions with impact beyond mathematics: a scout over public data  (session scout; pilots in scratch, not committed)

- Why: the owner asked for a result neuroscientists, not only mathematicians, would notice. Scope: questions a public dataset can decide (DANDI, Allen, IBL, MICrONS, FlyWire, Stringer 2019, TVSD).
- 1/n eigenspectrum and the smoothness bound alpha >= 1 + 2/d: Stringer et al. 2019 (abstract; full text through a summarizer), Pospisil and Pillow, PNAS 2025, and its correction (full text through a summarizer: cvPCA is biased; mouse V1 is a broken power law; only the natural-image recordings analysed; the bound not tested), Gauthaman, Menard and Bonner 2025, Ghosh et al. arXiv:2509.13459 (abstract), Liu, Sederberg et al., Entropy 2026. No test of the bound with a bias-corrected estimator found. Ranked first.
- MICrONS like-to-like and higher-order wiring: Ding et al. 2025, full PDF (Methods read); the public BossDB tables. Its Extended Data Fig. 14 already conditions on axon-dendrite co-travel at the synaptic scale. Ranked second; an out-of-sample replication needs a CAVE token from the owner's account.
- Avalanche criticality: abstracts of Beggs and Plenz 2003, Priesemann 2014, Wilting and Priesemann 2018, Ma 2019, Fontenele 2019, Touboul and Destexhe 2017, Morrell et al. 2024, Calvo et al. 2026, Cambrainha et al., Carcamo and Lynn arXiv:2609.09438, Sipling arXiv:2604.21071; through a summarizer: Destexhe and Touboul 2021, Morales et al. 2023, Hengen and Shew 2025. No brain-wide IBL avalanche test against fitted latent-variable nulls found; crowded. Ranked third.
- Aperiodic slope as an E/I marker: Diehl and Redish 2024 (through a summarizer); lightly scouted. Representational drift: eight abstracts through PubMed; crowded. FlyWire: abstracts of Dorkenwald, Lin and Shiu 2024, Lappalainen 2024, Currier and Clandinin 2025; crowded without functional data.
- Result: the first two are being pursued; pilot analyses are in scratch and unpublished.
- Re-search: no for these items unless a week passes; read Stringer 2019 and Pospisil and Pillow 2025 in full (not through a summarizer) before any claim.

### 2026-09-26  anything outside fluids and neuroscience close to a new result? (session sweep of the repository)

- Why: the owner asked whether any other part of the studio is close to a significant result. Read: techniques.json, validation/ (records, per-family notes, COMPARISON-AUDIT.md), VALIDATION.md, docs/RESEARCH-GRADE.md, docs/wip/, COMPUTE.md, this ledger, IDENTITIES.md.
- Queries: 'Aztec diamond expected area frozen polar regions finite size correction n^{4/3} Tracy-Widom mean' (opened Debin, de Kemmeter and Ruelle, arXiv:2301.00600, full text: n = 500, 100,000 samples, the 2^(-5/6) n^(1/3) edge scale; no mean shift or frozen-area correction discussed; Johansson, arXiv:math/0306216, listed, not reopened); 'rotor-router aggregation outradius minus inradius bounded conjecture simulation largest number of particles Friedrich Levine' (snippets only: the rim conjecture tested to at least 4e9 particles; the rotor tab caps at 5e4); 'computer-assisted proof Klausmeier vegetation traveling stripe rigorous numerics existence fixed parameters' (snippets only: Carter and Doelman prove existence in a singular-perturbation regime; nothing found at fixed parameters).
- Result: nothing outside the vortex, Hodgkin-Huxley and neural-field work is close to a significant result. Every disagreement beyond an error bar has a documented or likely cause (SLE discretization, lozenge lattice effects at small depth, the module bugs listed in COMPARISON-AUDIT.md); the causticsea wavelength excess is likely an estimator bias (zero crossings counted along rows measure lambda/|cos theta| for oblique stripes). The best minor candidate is the explicit n^(-2/3) finite-size constant of the arctic regions (Aztec and lozenge) from the Tracy-Widom mean and the edge scale along the arctic curve, which would make those tabs' validation exact; no source found calls it open, and aztec, lozenge and rotor remain "never searched" in the per-tab table.
- Re-search: no, unless a week passes.

### 2026-09-26  open problems across the studio's models that a rigorous computation could settle  (session search)

- Why: the owner asked what else is close to a notable result. Scope: open problems attached to the models the studio simulates, where interval or ball arithmetic, validated integration, SAT or exact enumeration could give a definitive answer in weeks. The ledger's skip entries (Hodgkin-Huxley chaos, neural-field pulse, stable vortex expansion) were not re-searched.
- Double pendulum (`pendulum`): non-integrability and chaos at the classical equal-mass, equal-length parameters still unproved as far as reached. Szuminski and Kapitaniak, J. Sound Vib. 611 (2025) 119099, arXiv:2602.21123: "a significant step toward proving the long-sought non-integrability of the classical double pendulum"; Salnikov, arXiv:1303.4904: monodromy generators "along a particular solution obtained numerically"; Dullin's Melnikov preprint: chaos only near two uncoupled pendulums. Ranked first (a validated horseshoe on an energy level, and by Kozlov no analytic second integral there).
- Spiral waves in excitable media (`excitable`): Sandstede and Scheel, arXiv:2002.10352v3, Sect. 12.1: existence "has been proved only in the special case of the complex Ginzburg-Landau equation" and near a Hopf bifurcation; no computer-assisted spiral found.
- Kuramoto critical connectivity (`chimera`, `swarm`): Kassabov, Strogatz and Townsend, arXiv:2105.11406, mu_c <= 0.75; Lepsveridze and Zhang, arXiv:2608.20010, lower it to 3/4 - eta with eta not made explicit; lower bound 11/16 as cited there.
- Mandelbrot area (`holomorphic`): rigorous upper bound 1.68288 (Bittner, Cheong, Gates and Nguyen, arXiv:1410.1212); 1.506591856 is pixel counting; a certified lower bound not confirmed.
- Heesch numbers (`tilings`): record 6; Kaplan, arXiv:2105.09438, polyforms to 19-ominoes "up to six, but nothing higher".
- Long shots: Polya-Szego for pentagons (Bogosel and Bucur, arXiv:2203.16409; Cheng, Gui, Hu and Li, arXiv:2609.18500, many sides only); Smale's sixth problem for five bodies (Albouy and Kaloshin 2012; Moczurad and Zgliczynski, arXiv:2601.01165).
- Not worth pursuing: the Henon attractor at (1.4, 0.3) (Galias and Tucker 2015: not a finite computation); the standard map's critical parameter (a 2e-4 gap; Figueras, Haro and Luque 2017); percolation and self-avoiding-walk constants (third decimal only); fluid blow-up (large-team programmes). Already settled: Lorenz, Feigenbaum, figure-eight KAM stability, Kuramoto-Sivashinsky chaos, localized Swift-Hohenberg and Gray-Scott patterns, the Apollonian gasket dimension.
- Resting on search snippets or secondary sources only: Jungreis 0.9718, Wierman and Oberly 0.666894, the connective-constant lower bound 2.62002, the Mandelbrot lower bound. Not loaded: conwaylife.com (403), the CAPD site and osti.gov (503).
- Result: no realistic breakthrough; the double pendulum is the best weeks-scale target, noticed widely in popular terms and modestly by experts, with a scoop risk from Szuminski's group.
- Re-search: no, unless a week passes.

### 2026-09-26  open problems in point-vortex dynamics that a computer-assisted proof could settle  (session search)

- Why: the owner asked what else is close to a notable result. Not repeated: the ledger's winding, collapse, Yu, Zbarsky, Hampton-Moeckel and O'Neil items.
- Seven identical vortices on the sphere (logarithmic-energy points, N = 7): Constantineau, Garcia-Azpeitia, Garcia-Naranjo and Lessard, arXiv:2309.04320 (CMP 2024), Remark 6.3: the pentagonal bipyramid "is a degenerate critical manifold of H when N = 7 ... it is not possible to determine that this configuration is a local minimum ... using only information from the second derivatives"; Beltran (2020), Conjecture 11.1, as cited there. Kryvonos, Liehr and Taylor, arXiv:2609.22077 (18 Sep 2026), prove N = 8 (computer-assisted, Lean) and skip N = 7. Scratch numerics (not committed): five zero Hessian eigenvalues, quartic growth 0.0999 t^4 along the extra null space, 400 descents all at E = -8.18247786. The global case is the smallest open case of Smale's 7th problem for the logarithmic energy.
- Five and eight identical planar vortices: Aref, J. Math. Phys. 48 (2007) 065401, Sect. IV (N = 5 list "In all likelihood ... complete ... but a proof has not been given"); Kim, arXiv:2609.15090, Remark 1.5; Hampton, arXiv:1810.13011, Conjecture 3; Faugere and Svartz, ISSAC 2012 (hal-00777791, abstract only; PDF blocked) claim all equilibria for N <= 7. Scratch counts (not committed): 5 classes for N = 5, 8 for N = 6, 12 for N = 7, 19 for N = 8 with one chiral pair; Euler characteristics match.
- Nonlinear stability of four-vortex relative equilibria with circulations of both signs: Ohsawa, arXiv:2406.12144v2: "their nonlinear stability is an open question" (citing Roberts 2013); the rhombus case proved there for -2 + sqrt 3 < gamma < 0.
- Smaller items: non-self-similar total collapse for N >= 4 (Lewkowicz, arXiv:1512.04668; partial collapses in Grotto and Pappalettera 2022, Drivas and Khanikati, arXiv:2607.16490); imploding hollow vortices from non-degenerate collapses (Chen, Walsh and Wheeler, arXiv:2506.04093, Theorem 1.3); exact counts at Yu and Zhu's exceptional five-vortex circulations (arXiv:2103.11975).
- Long shots, not suited to computer-assisted proof in weeks: non-collision collapse (Donati, Godard-Cadillac and Iftimie, arXiv:2403.17900), finite-time unbounded trajectories (Godard-Cadillac, arXiv:2101.11258), Zbarsky's Conjecture 4 (arXiv:2402.07316), the inviscid limit through a collision (Gallay and Sverak, arXiv:2609.10847).
- Not reached: Vortex Crystals (2003) and Newton's book (2001) as open-problem lists; the Faugere and Svartz PDF and thesis. Blocked: HAL PDFs, dl.acm.org, royalsocietypublishing, researchgate, pubmed.
- Result: no breakthrough within weeks; the seven-vortex sphere configuration is the one result a broad community (discrete energy, Smale's 7th problem) would notice, about 15% for the global statement in weeks, and a group that proved N = 8 on 18 Sep 2026 is the obvious competitor.
- Re-search: no for the five- and four-vortex items; recheck arXiv for N = 7 by Kryvonos, Liehr and Taylor before starting it.


### 2026-09-26  bistability of rest and repetitive firing in Hodgkin-Huxley at J = 8: prior articles, then a computer-assisted proof  (session agents; `papers/hh-dynamics/`)

- Prior articles: the 2026-09-25 survey found no computer-assisted proof of bistability or of the subcritical Hopf point for the Hodgkin-Huxley equations; Hassard (1978) and Rinzel and Miller (1980) are numerical, and Troy proves the Hopf bifurcation only with n and h slowed (as far as an independent reader reached; Hassard not read in full). Guckenheimer and Labouriau, "Bifurcation of the Hodgkin-Huxley equations: a new twist", Bull. Math. Biol. 55 (1993) 937-952: **not read**. Known only from citations: Guckenheimer and Oliva (2002), ref. [11], among studies of the bifurcations of the Hodgkin-Huxley vector field; and Guckenheimer and Worfolk, arXiv:chao-dyn/9304010 (1993), Sect. 5, which describes the work with Labouriau: bifurcations of equilibria from Maple expressions, while global bifurcations "could only be studied by numerically integrating the HH equations". So, secondhand, it is symbolic and numerical, not a proof. It must be read before any claim of priority for the bistability.
- Result: `code/certify_bistability.py` proves, at J = 8 and for every E_l in [10.59, 10.62] (equivalently every J in [7.9931, 8.0021] at E_l = 10.613), a unique, locally asymptotically stable equilibrium (Theorem A) and an orbitally asymptotically stable periodic orbit with period in [16.005827509, 16.013912063] ms reaching u >= 95.953 mV (Theorem C), hence bistability; at E_l = 10.613, 10.5989... and 10.599 also an unstable periodic orbit of saddle type (Theorem B). 84 checks, 0 failed. An independent reading (the model against the 1952 equations, 13 mutations of the code) found outward rounding missing from printed bounds, a Poincare map that could start off its section, and weak controls (10 of 13 mutations unnoticed); all fixed, all 13 now caught. The fixes have not had a second reading.
- Re-search: no, except to read Guckenheimer and Labouriau (1993) and Hassard (1978).

### 2026-09-26  neural-field pulse with a smooth sigmoid at fixed eps: the Zhang papers, Pinto-Jackson-Wayne, Sandstede, Enculescu, and a 2025 paper the ledger missed  (session agent, two passes; `papers/nf-pulse/review/lead/priorart/`)

- Why: the entry of the same day left Zhang (2005), Zhang (2004) and Pinto, Jackson and Wayne (2005) unread before any claim of priority.
- Read in full: Burlakov, Oleynik and Ponosov, Mathematics 13 (2025) 701, doi:10.3390/math13050701 (CC BY; found through Dyson, arXiv:2511.17328v2, ref. [8]). Same model with decay sigma, eps < (sigma + 4)^-1 allowed; Theorem 3: under conditions (17)-(21) on a Heaviside pulse, "for each beta in [0, infinity), there exists a regular travelling wave solution" for continuous firing rates tending to the Heaviside. Kernel assumed C^1 (A1), so e^{-|x|}/2 is outside; the proof of Lemma 5 needs f(U) integrable, which a logistic with S(0) > 0 is not (our reading); the conditions are verified for no example; not computer-assisted.
- Read, abstracts, zbMATH reviews or the author's own later statement only: Zhang, JDDE 17 (2005), Zbl 1082.45009: Heaviside, eps = 0 and 0 < eps << 1; Zhang and Hutt, J. Appl. Anal. Comput. 4 (2014) 1-68 (open), state the same system with "The gain function is given by the Heaviside step function" (p. 4). Zhang, JDE 197 (2004) 162-196, titled "Existence, uniqueness and exponential stability of traveling wave solutions of some integral differential equations arising from neuronal networks": abstract (CORE record 82068390) and Zbl 1054.45005: scalar, Heaviside, fixed-point existence. "On stability of traveling wave solutions in synaptically coupled neuronal networks" is Zhang, DIE 16 (2003) 513-536: stability. Pinto, Jackson and Wayne, SIADS 4 (2005), full published abstract (OpenAlex, Crossref): "A Heaviside step function governs the activation", recovery rate not restricted to a singular limit, two traveling pulses in the monostable case. Sandstede, IJBC 17 (2007): spectral implies nonlinear stability. Ermentrout, Jalics and Rubin, SIAM J. Appl. Math. 70 (2010): stimulus-locked waves with a smooth rate.
- Not reached, content unknown: Enculescu, Physica D 196 (2004) 362-386 (Zbl 1049.92008, review withheld; MSC 92C20, 45K05, 92B20, 65R99); Zhang, Math. Z. 255 (2006) 283-321 (Zbl 1186.92012, review withheld; MSC 92C20, 45K05).
- Full texts sought for all six and not reached: ScienceDirect, SIAM, World Scientific and ResearchGate 403; Springer client challenge; Unpaywall, Semantic Scholar and OpenAlex closed except JDE 2004 (bronze, but the ScienceDirect PDF 403 and the CORE copy missing); author pages: Wayne (math.bu.edu) TLS failure and 503, Sandstede (bjornsandstede.com, Google Sites) captcha or login, Zhang (lehigh.edu/~liz5) no PDFs, Pinto (URI Digital Commons) from 2012 only; CiteSeerX and web.archive.org unreachable; arXiv: none of the six.
- Searches: arXiv abstracts '"neural field"' with pulse sigmoid, pulse smooth existence, "traveling pulse" sigmoidal, "travelling pulse" sigmoidal: 0 each; computer-assisted "traveling pulse": 0 (controls: computer-assisted "traveling wave" 13, '"neural field" "traveling wave" existence' 10). OpenAlex title and abstract '"neural field" "traveling pulse" sigmoidal existence' 0, '"neural field" "rigorous numerics"' 0 (control '"neural field" "traveling wave"' 115, which lists Burlakov et al.). Citers (Semantic Scholar) of Zhang 2005 (15), Pinto-Jackson-Wayne (60), Sandstede (60), Zhang JDE 2004 (96), Zhang DIE 2003 (77), Burlakov et al. (2), Enculescu 2004 (13), Zhang Math. Z. (13): nothing further. CORE by DOI and title: only JDE 2004.
- Result: open as far as reached for the specific claim (a smooth S with S(0) > 0, kernel e^{-|x|}/2, explicit eps = 1/10, proved by computer); Burlakov et al. must be cited and distinguished, and Pinto, Jackson and Wayne cited as the fixed-eps Heaviside result. Six papers are known from abstracts, reviews or classification only; Enculescu (2004) and Zhang, Math. Z. (2006) not at all.
- Re-search: no, unless a week passes; read all six through a library before any claim of priority, Enculescu (2004) and Zhang, Math. Z. (2006) first.

### 2026-09-26  finite-size constant of the arctic regions, Aztec diamond and hexagons  (session agent; `research/arctic-finite-size/`)

- Why: the entry above named it the best minor candidate. The question is whether anyone has published the n^(-2/3) correction to the expected frozen (polar) area, or the n^(4/3) term of the area in absolute units, for uniform domino tilings of the Aztec diamond or lozenge tilings of an a x b x c hexagon, or an exact finite-n expected frozen area.
- Queries (web, verbatim):
  - 'Aztec diamond expected area polar regions finite-size correction n^{-2/3} Tracy-Widom mean'
  - '"arctic circle" domino tilings "expected" frozen area finite n correction'
  - '"Aztec diamond" "finite-size" arctic curve Tracy-Widom mean shift simulation'
  - 'Prähofer Spohn "Domain wall fluctuations of the six-vertex model at the ice point" journal'
  - 'lozenge tilings hexagon expected area frozen regions finite size correction Tracy-Widom mean'
  - '"Aztec diamond" "temperate region" OR "disordered region" expected area exact finite n Krawtchouk Fredholm determinant'
  - '"Tracy-Widom" "mean" correction arctic boundary tilings "n^{1/3}" expected position frozen boundary shift inward'
  - 'Gorin "Lectures on random lozenge tilings" edge Airy "curvature" frozen boundary fluctuation scale'
  - '"arctic circle" Aztec diamond simulation "area" polar regions n^{4/3} OR "n^{-2/3}" subleading'
  - 'Ferrari Frings "Finite time corrections in KPZ growth models" arXiv'
  - 'boxed plane partitions hexagon "Tracy-Widom" frozen boundary fluctuations Baik Kriecherbauer McLaughlin Miller hexagon scaling constant'
  - '"random tiling" OR "domino tiling" "expected" "frozen region" area asymptotic expansion "Tracy-Widom" "-1.77"'
  - '"polar regions" OR "frozen regions" "expected area" Aztec diamond OR "plane partitions" asymptotics correction'
- Read in full text (arXiv PDF):
  - Johansson, arXiv:math/0306216, and Johansson, arXiv:math/0011250. The latter gives the Krawtchouk edge scale on every line, eq. (2.72), proof sketched; the Hahn law, Theorem 4.1; and the hexagon polar zone, sec. 4.2.
  - Prähofer and Spohn, arXiv:2305.09502, J. Phys. A 57 (2024) 025001. The closest item: eq. (7) and the remark "The Tracy-Widom distribution has a negative mean. Therefore Eq. (7) indicates that the actual first level line is slightly above the macroscopic edge profile"; Gamma_Aztec(x), eq. (24); the per-tile probability, eq. (28). They do not integrate it to a frozen area.
  - Lyberg, Korepin and Viti, arXiv:2303.14669; Allegra, Dubail, Stéphan and Viti, arXiv:1512.02872; Stéphan, arXiv:1901.02770 and arXiv:2003.06339.
  - Petrov, arXiv:1202.3901 (Theorem 8.1); Aggarwal and Huang, arXiv:2108.12874 (Theorem 2.10, the scale from slope and curvature).
  - Chhita, Johansson and Young, arXiv:1212.5414 (Theorem 2.7).
  - Jockusch, Propp and Shor, arXiv:math/9801068; Cohn, Elkies and Propp, arXiv:math/0008243; Cohn, Larsen and Propp, arXiv:math/9801059.
  - Ferrari and Spohn, arXiv:cond-mat/0605406: no closed scale along the curve.
  - Debin, de Kemmeter and Ruelle, arXiv:2301.00600: eq. (9) says only that the mean shift is of order n^(1/3).
- Grepped: Duse and Metcalfe, arXiv:1412.6653 and arXiv:1507.00467; Borodin and Ferrari, arXiv:0804.3035.
- Not reached: Gorin's lecture notes (2021); Baik, Kriecherbauer, McLaughlin and Miller (2007); Ferrari and Frings, arXiv:1104.2129 (abstract only); citation lists of Prähofer and Spohn and of Aggarwal and Huang.
- Result: not found. The pointwise ingredients are published: the Airy scale along the curve (Johansson 2002, eq. 2.72; Prähofer and Spohn; Aggarwal and Huang; Petrov) and the observation that the TW mean shifts the line (Prähofer and Spohn). No source found integrates them into the n^(-2/3) constant of the expected frozen area, and none computes the expected frozen area exactly at finite n.
- Derived and checked in `research/arctic-finite-size/REPORT.md`: C = -E[TW2] 2^(-2/3) Gamma(5/6)^2/Gamma(5/3) = 1.5747513 for the Aztec polar fraction; -0.8741793 (a closed form with 2F1(1/2, 5/3; 5/2; -3)) and -0.3403242 for the free fraction of the regular and 3:5:6 hexagons. The expansion is heuristic; exact finite-n values to order 2560 (Aztec), side 1024 (regular) and k = 192 (3:5:6) fit the constants to 8e-6, 3e-5 and 1e-5, within the fits' uncertainties. An adversarial check recomputed the constants by the Prähofer-Spohn and Aggarwal-Huang scales and several exact values by Kasteleyn and Gessel-Viennot counts; all agree. Logged in IDENTITIES.md as a candidate with unconfirmed priority.
- Adversarial check, same day:
  - Queries: 'expected area frozen region Aztec diamond finite size correction n^{-2/3} Tracy-Widom mean'; '"arctic circle" "polar region" expected size finite n correction Tracy-Widom mean shift'; 'lozenge tiling hexagon expected number of frozen lozenges finite size correction arctic ellipse'.
  - The Semantic Scholar list of the nine papers citing Prähofer and Spohn was pulled; three abstracts were read, the rest not in full.
  - Nearest: Stéphan, arXiv:2608.02903 (2026), re-read. "shifting the exterior particle distribution by ±1.964 times its standard deviation effectively removes the leading finite size correction", for arctic-curve positions; the word "area" does not occur.
- Re-search: no, unless a week passes. Before any claim, read the remaining citers of Prähofer and Spohn (2023) and those of Aggarwal and Huang (2021) in full, and Gorin's book, for an expected-area computation.


### 2026-09-26  studies of the same day whose prior-article searches are logged in their own folders  (session agents; added when they were merged)

Each study below searched the literature before it computed, and logged the queries, the sources read and what was not reached in its own folder; this entry points to those logs so that a later search starts there. None of the results has been reviewed outside this project.
- Neural-field pulse extensions (`papers/nf-pulse/ext/`): the slow pulse, Pinto and Ermentrout's own gain 12, the range eps in [0.08, 0.13693], Faye's (2013) model with synaptic depression, and steps toward spectral stability (not proved: the winding-number step was not completed). Pinto and Ermentrout (2001) and Faye (2013) read in full from author copies; Sandstede (2007), on which nonlinear stability would rest, not reached. Logs: each `ext/<name>/REPORT.md`. Re-search: no, except Sandstede (2007) through a library.
- Hodgkin-Huxley chaos (`papers/hh-dynamics/work/chaos/REPORT.md`): Oliva's Cornell thesis (1998) is on the complex Henon map and does not treat Hodgkin-Huxley; Guckenheimer and Meloon (2000) has no Hodgkin-Huxley example and no proof. No proof of chaos found. Re-search: no.
- The Hodgkin-Huxley propagated action potential (`papers/hh-dynamics/work/traveling-wave/`, log `prior-art-log.md`): Hastings (1976) and Carpenter (1977) prove pulses only with artificial small parameters; every computer-assisted pulse proof found is for FitzHugh-Nagumo. Open as far as reached (the session put about 85 per cent on it); Section 1.5 of the report lists what must be read before any claim of priority. Re-search: no.
- The double pendulum (`research/double-pendulum/PRIOR-ART.md`): no proof of chaos or of non-integrability for the equal double pendulum found (Szuminski and Kapitaniak 2025, Stachowiak and Szuminski 2015, Salnikov 2013, Dullin 1994, Kaheman et al.); Bolotin and Negrini, Russ. J. Math. Phys. 5 (1997), may cover non-integrability near the top of the potential if their parameter domain contains the equal case, and was not reached. Re-search: no, but read Bolotin and Negrini (1997) before any claim of priority.
- Seven vortices on the sphere (`research/seven-vortex-sphere/`, queries in `prior-art-queries.txt`): the pentagonal bipyramid as a strict local minimum; the global statement stays open. Re-search: no.
- Eight identical planar vortices (`research/eight-vortex-crystals/REPORT.md`, Sect. 7): no rigorous existence proof of an asymmetric relative equilibrium for the logarithmic potential found; Moczurad and Zgliczynski proved the analogue for the Newtonian potential. Re-search: no.
- Five identical planar vortices (`research/five-vortex-equilibria/REPORT.md`, Sect. 2): not the first proof that the list is complete; Faugere and Svartz (ISSAC 2012) state that their exact method computes all equilibria for N <= 7 but print explicit solutions only for N = 4 and 7. What is added is an explicit certified list by an independent method. Re-search: no.
- Mixed-sign four-vortex stability (`research/four-vortex-stability/REPORT.md`, Sect. 1): nonlinear stability of the collinear Group I family of Menezes and Roberts and of a convex kite family not found in the literature reached; Rhombus A already proved by Ohsawa. Re-search: no.
