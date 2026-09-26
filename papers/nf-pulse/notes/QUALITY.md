# Quality record: A Travelling Pulse in a Neural Field with a Smooth Firing Rate

The bar every paper in this repository meets before it is published or preprinted; see
`papers/minimal-winding/notes/QUALITY.md` for the full wording of the seven items. This file stays in GENChase.

## Record (2026-09-26, updated after the review in `review/lead/` the same day)

- [ ] **1. Complete proofs.** No manuscript yet. The block lemma, the Wazewski-type shooting argument, the tail
  induction for the unstable manifold and the reduction of the integral equation to the wave ODE are stated in the
  program docstrings and `README.md`; drafts of every argument, with the gaps the review found closed (openness of
  the cone sets, continuity of the manifold point in c, the orbit on Y = S(U) despite the line of equilibria of the
  5D system), are in `review/lead/math/MATH.md`, not yet in a manuscript.
- [ ] **2. Rigorous computation.** Ball arithmetic throughout the proof chain (FLINT/Arb, 256 bits): rest state,
  unstable manifold, block, and a C^0-Lohner interval Taylor integrator. The block conditions are re-checked in
  mpmath interval arithmetic. The integrator was read line by line in the review (`review/lead/code/CODE.md`): no
  soundness hole; its must-fix (rigorous gates written as `assert`, removed by `python -O`) and should-fixes
  (environment variables, checks that could not fail, integrator tests outside `run_all.sh`) are fixed. The mutation
  table there shows that end-to-end runs cannot detect lost rigor; the integrator tests now in `run_all.sh` catch
  the remainder and Jacobian mutations, not the a priori or QR-inverse ones.
- [ ] **3. Every claim labelled.** To do with the manuscript. The README labels the pulse speed from shooting and the
  high-precision orbit as numerical.
- [ ] **4. Sources read.** Pinto and Ermentrout (2001), Faye and Scheel (arXiv:1311.6508), Faye (2013), Hastings
  (arXiv:1503.04057v2) and Dyson (arXiv:2511.17328v2, arXiv:1810.05142) read in the parts listed in RESEARCH.md.
  Burlakov, Oleynik and Ponosov, Mathematics 13 (2025) 701, read in full in the review. Read only through abstracts
  and zbMATH reviews: Zhang, J. Dyn. Differ. Equ. 17 (2005); Zhang, J. Differential Equations 197 (2004); Pinto,
  Jackson and Wayne (2005); Sandstede (2007). Not reached at all: Enculescu, Physica D 196 (2004); Zhang, Math. Z.
  255 (2006). Full texts of all six sought and not reached (`review/lead/priorart/PRIORART.md`); read them through a
  library.
- [ ] **5. Prior article review.** RESEARCH.md, entries of 2026-09-26 (neural-field travelling pulse; and the second one, with
  Burlakov, Oleynik and Ponosov (2025), now cited and distinguished in the README). The six papers in item 4 must be
  read before any claim of priority.
- [x] **6. Adversarial second reading.** `review/lead/VERIFY.md` (2026-09-26): mathematics, code audit with 32
  mutations, an independent reimplementation from the equations (including its own block and shooting argument,
  `review/lead/reimpl/block/`), and prior articles, each by its own reader; no
  gap in the proof; every must-fix and should-fix applied in the same change. Not yet reviewed outside the project.
- [ ] **7. Reproducible.** `code/run_all.sh` reruns the chain, the integrator tests and the negative controls from this folder in about
  two minutes and exits with status 1 if a check fails.
