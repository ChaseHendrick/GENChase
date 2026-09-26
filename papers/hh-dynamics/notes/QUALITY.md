# Quality record: Rigorous Dynamics of the Hodgkin-Huxley Equations at the 1952 Parameters

The bar every paper in this repository meets before it is published or preprinted; see
`papers/minimal-winding/notes/QUALITY.md` for the full wording of the seven items. This file stays in GENChase.

## Record (2026-09-26)

- [ ] **1. Complete proofs.** No manuscript yet. Proved so far, by program: the equilibrium and Hopf statements of
  `certify_equilibria_hopf.py`, and Theorems A to C (bistability at J = 8) of `certify_bistability.py`. The lemmas the
  programs rely on (the Lohner enclosure, the Krawczyk test on a Poincare section, the Floquet multipliers from
  Gershgorin discs, the contraction on the section, the sign argument for u outside [-12, 115]) are stated in the
  docstrings and still have to be written out as proofs.
- [ ] **2. Rigorous computation.** `certify_equilibria_hopf.py` is ball arithmetic throughout (FLINT/Arb, 256 bits),
  with negative controls. `certify_bistability.py` decides every inequality in Arb at 96 bits (C^0/C^1 Lohner
  integrator, Poincare maps that refuse an initial set off their section), rounds every printed decimal bound
  outward from its ball and re-checks all 333 of them as exact rationals; numpy, scipy and mpmath only propose
  candidates. 84 checks, 0 failed: 30 proof checks, 24 negative controls, 23 self-tests, 7 numerical-only.
- [ ] **3. Every claim labelled.** To do with the manuscript.
- [ ] **4. Sources read.** Hodgkin and Huxley (1952): eq. (26), the rate equations and Table 3 read from the scanned
  paper (the constants from the rendered page). Guckenheimer and Oliva (2002) read in full. Still to read: Hassard
  (1978) and Rinzel and Miller (1980) on the Hopf points; Kuznetsov's book for the l1 formula, eq. (3.20);
  Guckenheimer and Labouriau, Bull. Math. Biol. 55 (1993) 937-952, known so far only from citations (RESEARCH.md,
  2026-09-26, bistability entry).
- [ ] **5. Prior article review.** RESEARCH.md, entries of 2026-09-25 (neuroscience scout) and 2026-09-26 (the 1952 constants).
  and 2026-09-26 (bistability at J = 8). To do: whether the criticality of the two Hopf points has been proved
  before, and a reading of Guckenheimer and Labouriau (1993) before any claim of priority for the bistability.
- [ ] **6. Adversarial second reading.** `certify_bistability.py`: an independent reading (the model against the 1952
  equations, 13 deliberate mutations of the code) found that 10 mutations passed unnoticed, that printed bounds were
  rounded to nearest, that a Poincare map could start off its section, that the certificates lacked negative
  controls running their own code, and that the summary needed corrections. All are fixed and all 13 mutations now
  stop the program (2026-09-26). Still to do: a second reading of the fixes, and of the written proofs once they
  exist; `certify_equilibria_hopf.py` has had its own reading (the Hopf currents corrected, RESEARCH.md).
- [ ] **7. Reproducible.** Both programs run from this folder with `code/requirements.txt`; their outputs are in
  `data/`.
