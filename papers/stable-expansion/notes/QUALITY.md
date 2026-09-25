# Quality record: Stable Self-Similar Expansion of Four and Five Point Vortices and Confinement of Vortex Patches

The bar every paper in this repository meets before it is published or preprinted: a companion release, a Zenodo
DOI, arXiv or a journal. `node tools/paper-check.js` refuses the status "ready" or later in `papers/papers.json` until
every item in the record below is checked, and a checked item must say what the evidence is. This file stays in
GENChase: the companion repository does not carry `notes/`.

1. Complete proofs: every theorem, proposition, lemma and corollary is proved in full in the paper or an appendix. A
   proof may use a published result only as stated there, with its hypotheses checked in the text; an argument
   adapted from another paper is written out, not summarized.
2. Rigorous computation: every computer step in a proof is exact or interval arithmetic, in a committed program that
   stops on a failed check and has negative controls.
3. Every claim labelled: each result is labelled proved, computer-assisted, formal or numerical, in the paper and in
   the README, and numerical results are never stated as theorems.
4. Sources read: every source that a proof step depends on is read in full; background citations are recorded in
   RESEARCH.md with how far each was read.
5. Prior art: the prior-art searches are logged in RESEARCH.md, and every novelty statement stays within what they
   reached.
6. Adversarial second reading: every proof has been read by an independent reviewer told to find errors, briefed
   only with the paper and its programs, and every must-fix finding is fixed and recorded.
7. Reproducible: the programs run from the companion with its `requirements.txt`, `paper-check` and
   `paper-sync --check` pass, and the page and check counts stated are current.

## Record (2026-09-25)

- [ ] **1. Complete proofs.** Lemma 1, Theorems 1 and 2, Corollary 1, Theorem 3, Corollary 2 and Proposition 1 are
  proved in the paper. Theorem 4 is not yet: its proof follows Zbarsky's proof for three patches and adapts his
  single-patch estimates (3)-(5), (14), (30)-(31) and (33)-(35) to N patches without writing them out. To do: an
  appendix that states which properties of the field of the other patches the single-patch argument uses, proves the
  estimates for any such field, and checks those properties for N patches.
- [x] **2. Rigorous computation.** Theorems 1 and 2 by the Krawczyk test in ball arithmetic (FLINT/Arb) with enclosures
  of traces of powers of the Jacobian (`verify_stable_expansion.py`, 58 checks, including an unstable four-vortex
  control and a three-vortex control); the exact vanishing of the sum of pairwise products of the circulations in
  rational arithmetic.
- [x] **3. Every claim labelled.** The direct integrations and the random sample of Section 6 are labelled numerical
  in the paper and the README.
- [ ] **4. Sources read.** Zbarsky, arXiv:1912.10862v2, is a source the proof of Theorem 4 depends on; it is to be read
  again in full while the appendix is written. Kallyadan and Shukla (2022) is background only (abstract read).
- [x] **5. Prior art.** RESEARCH.md, entries of 2026-09-25 ("prior art for the stable-expansion note" and "nonlinear
  stability and vortex patches"); Leoncini, El Kettani and Ugalde, arXiv:2609.25989, read in full and cited.
- [ ] **6. Adversarial second reading.** Two second readers read Sections 4 and 5 (Theorem 3, Proposition 1 and the
  first version of Theorem 4), and their fixes are in (CHANGELOG v0.7.0). Still to be read and recorded: Lemma 1,
  Theorems 1 and 2 with their certificates, and the appendix for Theorem 4.
- [x] **7. Reproducible.** `verify_stable_expansion.py` (58 checks) and `survey_expansions.py`; `paper-check` passes;
  12 pages.
