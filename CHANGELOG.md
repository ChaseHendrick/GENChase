# Changelog

## v0.6.1

The publication date is recorded in the GitHub release notes.

- The paper cites four more papers, each read for the purpose: Borisov and Lebedev (1998), Krishnamurthy, Aref and Stremler (2018), Reinaud, Dritschel and Scott (2022), and a clarification of Leoncini, Kuznetsov and Zaslavsky (2000). None anticipates the results.
  - The Discussion now explains why Krishnamurthy and Stremler's normalized path length equals √(1 + 4P²): the circumcircle passes through the collision point.
  - It contrasts collapse-time minima, which depend on the chosen scale, with P, which does not.
  - It notes that the √3/2 in Leoncini et al. is an energy parameter, and that their fastest collapse has P = 3/2.
- `verify_general_mu.py` adds a check of that fastest collapse (116 checks in all), and Table 1 gains a row for it.
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
