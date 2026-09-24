# Changelog

## Unreleased

- **Vortex solver, protocol 2.** The search runs seeds on worker threads (`--threads`), and the block's digest does not depend on the thread count. It is 2 to 3 times faster per seed, from a Cholesky solve, a chord retraction, a reduced Hessian along the tangent directions and a stall rule. Protocol 2 seeds are new starts; protocol 1 files still verify.
- **Where collapse stops rotating.** `--continue`, and the `vortex-threshold` job in the validator, follow a certified minimum as α changes and bracket the α at which it first reaches zero winding, to 10⁻⁴. `--verify` re-derives both ends and the family the branch started from.
  - 69 thresholds are recorded, all certified at both ends: the SQG family for N = 9 to 59 and the Euler family for N = 13 to 30.
  - From N = 40 on, the SQG family's thresholds follow α*(N) ≈ α∞ + 11/N. Fits put α∞ between 0.69 and 0.90; the Euler family's limit is not yet pinned down.
- **Sixty SQG vortices that collapse without rotating.** Growing the deepest SQG family reaches P = 0 at N = 60, where the thresholds predicted it. The point passes every binary64 test that applies at P = 0 and converges quadratically at 60 digits. This is strong numerical evidence, not a proof, and its priority is unconfirmed. RESEARCH.md entry Q logs a literature search that found no earlier report of such a collapse for α = 1 or α = 2.
- **Fixes from review.** The threshold verifier no longer trusts the tolerance written in a file, and checks the low-side P and the family label. A block's CPU time is no longer multiplied by its thread count. A run whose winding reaches zero is recorded as stationary rather than stalled. The threshold bracket follows P, so a point that fails one certificate test cannot hide the crossing. Threshold files are re-verified in pull requests. Reruns are compared only on the same protocol and parent.
- The volunteer runner gains three art jobs for the `cahn` and `turing` tabs, run on a contributor's computer through the studio's own recipe and print path: a seed hunt, a deep render of one recipe, and one generation of evolved children. Nothing under `src/` or `dist/` changes, and no recipe or engine API changes.
  - The step count is the recipe's `warmup` with `running:false`, verified from the status before any export. Budgets count active time and never change a plate. A deep render refuses, rather than trims, a request over its budget or over the tab's step maximum, and every art job refuses a print that would need more than half the memory.
  - Candidates are ordered by print-sharpness proxies measured on a central 1024 px crop of the real export at native pixels, at every pixel offset, with the spread over that crop and the four corner crops recorded as each candidate's sampling error. The scores are not a measure of beauty and not scientific evidence, and evolved children are unvalidated recipes. The best candidate and one other are rendered again to measure repeatability, and the ranking is called informative only when the spread between candidates exceeds twice their crop sampling error.
  - Results stay in the job folder with a local gallery page and a sealed checkpoint for Resume. Opt-in sharing adds the recipe list and at most 12 thumbnails, shared byte for byte and refused if they carry metadata; prints are never shared. The volunteer-results workflow checks art submissions structurally.
  - `tools/art-check.js` runs the three jobs end to end on small grids in a new CI job, with negative controls.
- AGENTS.md counted six `rdxCreate` tabs; there are five.
- **A research-grade plan.** `docs/RESEARCH-GRADE.md` records a dated audit of what the project still needs to be research-grade software, in priority order: outside review and publication, the exactly solvable tabs, an uncertainty gate, real-GPU runs, data export and provenance, and scope. RESEARCH.md logs the survey of comparable public projects behind it, with every query, the pages that opened and the hosts that were blocked. No public project combining validation records, citations, seeded recipes and physical print export was found; that negative rests mostly on search snippets.

## v0.6.2

The publication date is recorded in the GitHub release notes.

- **Volunteer computing for the open winding problems (#141).** The local validator gains two jobs that anyone can run on macOS or Linux, headless or in the app. They keep checkpoints, pause on battery and heat (on Apple Silicon Macs), and share results only on request:
  - `vortex-collapse` searches for self-similar collapses of N point vortices in the α-models (α = 0 Euler, α = 1 surface quasi-geostrophic) with the least winding P = |Im κ|/(2|Re κ|).
  - `vortex-grow` continues the deepest recorded family one vortex at a time.
  - A point is recorded as a certified local minimum only if it passes all of these tests:
    - the similarity equations;
    - first- and second-order optimality on the collapse manifold;
    - the conservation laws;
    - a separately written time integration;
    - the six symmetry eigenvalues of its linearization;
    - the pairing k + k′ = 2 of its stability exponents.
  - The similarity, integration, symmetry and pairing tests each have a control that must fail. The optimality and conservation tests are checked directly. A `zero-winding` status covers P = 0, where the strict second-order test cannot apply.
  - `tools/vortex-precision-check.py` re-checks minima in an independent mpmath implementation, at 60 digits by default (`--dps` sets the precision).
  - The `volunteer results` workflow re-verifies vortex result files in pull requests with the verifier from the base branch. After submissions merge, it opens a pull request that refreshes the leaderboard and `COMPUTE.md`.
  - A "Claim a seed block" issue template lets long runs avoid overlap.
- **Computer time and energy (#141).** Every volunteer job records the CPU time of its command and every process it waited for; detached processes and stopped jobs are not counted. It also records an energy figure: measured from the Linux RAPL counter where one is readable, otherwise an estimate of 1 to 20 W per busy core, labelled as an estimate. `COMPUTE.md` totals the computer time of shared jobs and recorded vortex results, and the README gains a section on contributing computer time.
- **First recorded results (#141).** These are numerical candidates, not proofs, and their priority is unconfirmed:
  - 1,596 seeds from the maintainers' own runs, in about 1 CPU hour. Of the 0.98 h, 0.38 h is wall time standing in for files recorded before CPU accounting existed.
  - For N = 4 and 5, the Euler, SQG and α = 2 minima agree with an independent Python search.
  - Growth reaches P = 0.5215733789 for 30 Euler vortices and 0.1453121018 for 24 SQG vortices.
  - At α = 2 and 11 vortices it reaches P = 0: a self-similar collapse that shrinks without rotating. It was checked at 60 digits in mpmath: similarity residual 2 × 10⁻⁶⁰, conservation laws vanishing, non-degenerate geometry. This is strong numerical evidence, not a proof.
- **Research notes on generalizations of the winding bound (#138)**, in `research/generalizations-2026-09-24/`, with independent re-check scripts and their output.
  - Each result carries a status: proved, derived, exact (SymPy) or numerical evidence. Leads that were not checked are listed separately.
  - `RESEARCH.md` entries O and P log the papers read and the searches made. None of the papers read minimizes or bounds the winding for four or more vortices. The papers read for entry P do not report a collapse without rotation; a dedicated search for non-rotating self-similar collapse has not been made yet.
- **A second draft preprint (#140)**, *A sharp winding bound for the self-similar collapse of three point vortices in the α-models*, as Typst, LaTeX and PDF, with a figure, verification programs and their output.
  - It proves P > √(3+α)/(2+α), sharp and not attained, for every α > −1. It extends the bound to α ≥ −59/40 with one interval-arithmetic step.
  - Its Section 5 reports, as numerical results only, four-vortex collapses below the three-vortex floor for α = 0, 1 and 2.
  - **It is a draft that has not been peer reviewed and is not cleared for submission.** Its companion note lists the reading still owed. The PDF attached to this release does not itself say it is a draft.
- **The first paper cites three more papers (#139)**, each read for the purpose. The Typst and LaTeX sources were edited together and both PDFs rebuilt (13 pages each):
  - Conte and de Seze, a 1980 CEN Saclay report printed in 2015 (arXiv:1511.00069). It writes the zero-impulse collapse as the spiral (1 − t/t_c)^(1/2 − iωt_c), so |ωt_c| = P, and gives the complex rate in closed form for arbitrary circulations before Kimura. It is credited in the Introduction and beside Kimura, and the Discussion says that it, like Aref and Kimura, does not minimize P.
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
