# Quality record: A Travelling Pulse in a Neural Field with a Smooth Firing Rate

The bar every paper in this repository meets before it is published or preprinted; see
`papers/minimal-winding/notes/QUALITY.md` for the full wording of the seven items. This file stays in GENChase.

## Record (2026-09-26)

- [ ] **1. Complete proofs.** No manuscript yet. The block lemma, the Wazewski-type shooting argument, the tail
  induction for the unstable manifold and the reduction of the integral equation to the wave ODE are stated in the
  program docstrings and `README.md`, not yet written out as proofs.
- [ ] **2. Rigorous computation.** Ball arithmetic throughout the proof chain (FLINT/Arb, 256 bits): rest state,
  unstable manifold, block, and a C^0-Lohner interval Taylor integrator. The block conditions are re-checked in
  mpmath interval arithmetic. The integrator is about 900 lines of new Python that nobody else has read.
- [ ] **3. Every claim labelled.** To do with the manuscript. The README labels the pulse speed from shooting and the
  high-precision orbit as numerical.
- [ ] **4. Sources read.** Pinto and Ermentrout (2001), Faye and Scheel (arXiv:1311.6508), Faye (2013), Hastings
  (arXiv:1503.04057v2) and Dyson (arXiv:2511.17328v2, arXiv:1810.05142) read in the parts listed in RESEARCH.md.
  Not read: Zhang, J. Dyn. Differ. Equ. 17 (2005), and Zhang (2004); Pinto, Jackson and Wayne (2005).
- [ ] **5. Prior article review.** RESEARCH.md, entry of 2026-09-26 (neural-field travelling pulse). The Zhang papers must be read
  before any claim of priority.
- [ ] **6. Adversarial second reading.** Not yet: the mathematics and the code both need an independent reading.
- [ ] **7. Reproducible.** `code/run_all.sh` reruns the chain and its negative controls from this folder in under a
  minute and exits with status 1 if a check fails.
