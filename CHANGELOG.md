# Changelog

## Unreleased

- The paper cites three more papers, each read for the purpose; the Typst and LaTeX sources were edited together and both PDFs rebuilt (13 pages each):
  - Conte and de Seze, a 1980 CEN Saclay report printed in 2015 (arXiv:1511.00069), which writes the zero-impulse collapse as the spiral (1 − t/t_c)^(1/2 − iωt_c), so |ωt_c| = P, and gives the complex rate in closed form for arbitrary circulations before Kimura. It is credited in the Introduction and beside Kimura, and the Discussion says that it, like Aref and Kimura, does not minimize P.
  - Hernández-Garduño and Lacomba (J. Math. Fluid Mech. 2007), who prove that every motion of three vortices ending in a total collision is self-similar; cited where the paper extends Corollary 1 to every collapse.
  - Grotto, Romito and Viviani (arXiv:2307.05133), who select a continuation after collapse by vanishing noise; cited beside Gallay and Šverák's regularization.
  - The Typst reference list grows from 20 to 23 entries and every citation number was remapped; the Typst and LaTeX texts carry the same 80 citations in the same order.

## v0.6.1

The publication date is recorded in the GitHub release notes.

- The paper cites four more papers, each read for the purpose: Borisov and Lebedev (1998), Krishnamurthy, Aref and Stremler (2018), Reinaud, Dritschel and Scott (2022), and a clarification of Leoncini, Kuznetsov and Zaslavsky (2000). None anticipates the results.
  - The Discussion now explains why Krishnamurthy and Stremler's normalized path length equals √(1 + 4P²): the circumcircle passes through the collision point.
  - It contrasts collapse-time minima, which depend on the chosen scale, with P, which does not.
  - It notes that the √3/2 in Leoncini et al. is an energy parameter, and that their fastest collapse has P = 3/2.
- The paper credits Kimura (1987), read in full, for the similarity solution with κ as his complex constant, the zero-impulse circle and its split into collapsing and expanding arcs, and the Remark 2 parametrization: his Eq. (4.4) gives both rates for circulations (2, 2, −1), and their ratio is the Remark 2 formula. He minimizes the collision time rather than P, and the general-μ minimum and the ring results are not in his paper.
  - The studio's Three-vortex collapse bound credit names the same equation, since its closed form is that ratio. Its vortex-family evidence was re-run for the new source hash, with all 12 recipes passing.
- The paper cites Gallay and Šverák (2026), read in full. Their collision solution is (1 − t/T)^(1/2 + is), and |s| = P. The paper cites their proof that every collision is self-similar and their closed-form rates. It also notes that Corollary 1 sharpens their s ≠ 0 to |s| > √3/2; a nonzero s is why a regularized collision is determined only up to a rotation. They do not bound or minimize s.
- The paper credits Demina and Kudryashov (2014), now read in full (bought by the author; two independent readers, a numerical check and two referees). Their Sect. 3 gives the two-ring collapse family, with an optional central vortex Γ₀: at Γ₀ = 0 their Eq. (37) is the circulation condition, and their Eq. (36) is the constant S as a function of the relative rotation. For this family they never say which rotations collapse, separate the two rates or evaluate their ratio (their general Eq. (10) does contain the coefficient whose absolute value is P); they minimize nothing and have no three-vortex results. The Introduction and Section 4 now credit their Eqs. (36)–(37), and the Discussion also says what they do not do; Section 2 cites their form of the similarity solution; the proof of Lemma 2 cites their general necessary conditions.
  - A new remark after Corollary 1: the bound does not carry over to larger systems, because the seven-vortex collapse in their Table 1 (Fig. 1a) has P = 12433/(1240√155) = 0.805 < √3/2.
  - The Introduction's sentence on what every zero-impulse configuration does now cites Gallay and Šverák, Sect. 4.5.2, and Krishnamurthy, Aref and Stremler, both read, instead of Aref 1979, which was not read, and Krishnamurthy and Stremler.
- `verify_general_mu.py` adds checks of that fastest collapse, of Kimura's rates against κ, of Demina and Kudryashov's Eqs. (36)–(37) (exactly and against Biot–Savart for n = 2 to 8), and of their seven-vortex collapse (121 checks in all), with a Table 1 row for each. The Typst PDF is now 13 pages and the LaTeX PDF 12.
- The LaTeX build instructions now say three `pdflatex` runs, which is what settles the cross-references from a clean directory.

## v0.6.0

The publication date is recorded in the GitHub release notes.

- Makes the paper *Minimal winding in the self-similar collapse of three point vortices and of two concentric vortex polygons* ready for submission:
  - Adds a LaTeX version, `research/unequal-mu-n5-floors-2026-09-23.tex`, with the same text as the Typst source, for arXiv and journals. It is in the source archive.
  - Notes that every collapse of three point vortices in the plane is self-similar (Drivas, Khanikati and Khanikati 2026), so the bound |ω₀|t_c > √3/2 covers every three-vortex collapse.
  - Credits Krishnamurthy and Stremler (2018) for the numerical observation that the normalized path length before collapse exceeds 2, which Corollary 1 proves with the sharp constant, and narrows the novelty statement to match.
  - Corrects Table 1: the direct minima on the μ grid agree with the roots of Q to 5 × 10⁻²¹, not 6 × 10⁻²⁵ as v0.5.0 stated, and 13 rational values were checked, not 12. The 6 × 10⁻²⁵ came from a mislabeled metric in the verification program.
  - Every verification claim in the paper now corresponds to a committed check. `verify_general_mu.py` adds 21 checks, for 115 in all: the path length and spiral angle from direct integration, Remark 2, the Section 4 identities for general n, the constants of Proposition 1, and each of the 277 sextics of Remark 1.
- Adds the arXiv and journal submission package in `research/submission/`: metadata, an endorsement request, a cover letter, and a note on the author's private copies, which carry the contact email that this repository deliberately leaves out.
- Records the literature read for the paper in RESEARCH.md (entries J and K) and in the paper's companion note.

## v0.5.0

The publication date is recorded in the GitHub release notes.

- 48 techniques are validated within their stated limits, up from 28 in v0.4.1. Another 3 remain partially validated and 79 unvalidated.
- New numerical evidence for Schrödinger (absorbing boundary and long-time phase), convection (coupled spatial and time convergence), Maxwell dielectric reflection and transmission, molecular equilibration and transport, plasma Landau damping, nonreciprocal interactions (long runs, several parameters), shallow water (resolution, parameters, boundaries, long runs), volume waves (long-time dispersion), Hodgkin–Huxley (parameter domain, long runs), direct gravity (large-N forces, time step and softening), the Gross–Pitaevskii condensate, SSH edge states and KPZ growth scaling.
- Print-state evidence for the excitable, turing, cyclic, chemotaxis and vegetation tabs, and for chladni, gerstner, hasimoto, tennis, eight, photon and bec.
- Adds the paper *Minimal winding in the self-similar collapse of three point vortices and of two concentric vortex polygons* in `research/`, with its source, verification programs and their output; the release attaches the PDF and the verification files. It proves that every self-similar collapse of three point vortices has |ω₀|t_c > √3/2, with the constant sharp, and corrects an earlier note: for circulations (1, 1/2, −1/3) the least |ω₀|t_c is 1.0647…, while 2.2039… is the minimum for one orientation of the triangle only.
- Fixes the SVG escape helper, which escaped nothing, and clears four other code-scanning findings.
- SECURITY.md no longer rules out a bounty.

## v0.4.1

The publication date is recorded in the GitHub release notes.

- First public release in the numbered series.
- Includes the browser art start page, offline ZIP, local checker setup, and contribution guides.
- Includes 28 techniques validated within their stated limits. Another 21 remain partially validated and 81 unvalidated.
- Corrects FPUT mode energy, elapsed-time control and integration, with independent trajectory and complete PNG comparisons.
- Publishes the browser studio through an explicit GitHub Pages Actions workflow, with a traceable deployed commit.
- Future releases use major, minor and patch numbers; dates stay in these notes and GitHub metadata.

The earlier calendar-named release is withdrawn in favor of v0.4.1.
