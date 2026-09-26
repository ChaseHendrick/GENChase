# Quality record: Rigorous Dynamics of the Hodgkin-Huxley Equations at the 1952 Parameters

The bar every paper in this repository meets before it is published or preprinted; see
`papers/minimal-winding/notes/QUALITY.md` for the full wording of the seven items. This file stays in GENChase.

## Record (2026-09-26)

- [ ] **1. Complete proofs.** No manuscript yet. Proved so far, by program: the equilibrium and Hopf statements of
  `certify_equilibria_hopf.py`.
- [ ] **2. Rigorous computation.** `certify_equilibria_hopf.py` is ball arithmetic throughout (FLINT/Arb, 256 bits),
  with negative controls; the integrator for the periodic orbits is being written.
- [ ] **3. Every claim labelled.** To do with the manuscript.
- [ ] **4. Sources read.** Hodgkin and Huxley (1952): eq. (26), the rate equations and Table 3 read from the scanned
  paper (the constants from the rendered page). Guckenheimer and Oliva (2002) read in full. Still to read: Hassard
  (1978) and Rinzel and Miller (1980) on the Hopf points; Kuznetsov's book for the l1 formula, eq. (3.20).
- [ ] **5. Prior article review.** RESEARCH.md, entries of 2026-09-25 (neuroscience scout) and 2026-09-26 (the 1952 constants).
  To do: whether the criticality of the two Hopf points has been proved before.
- [ ] **6. Adversarial second reading.** Not yet.
- [ ] **7. Reproducible.** The program runs from this folder with `code/requirements.txt`.
