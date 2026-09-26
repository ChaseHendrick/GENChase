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

- [x] **1. Complete proofs.** Lemma 1, Theorems 1 and 2, Corollary 1, Theorem 3, Corollary 2 and Proposition 1 are
  proved in the paper. Theorem 4 is proved in full in Appendix A (2026-09-26): Lemmas A.1 to A.5 and Propositions A.1
  and A.2 write out, for any number of patches, every estimate of Zbarsky's argument, with the other patches acting
  on a patch only through the strain of their field; two slips of his arXiv version are corrected there.
- [x] **2. Rigorous computation.** Theorems 1 and 2 by the Krawczyk test in ball arithmetic (FLINT/Arb) with enclosures
  of traces of powers of the Jacobian (`verify_stable_expansion.py`, 58 checks, including an unstable four-vortex
  control and a three-vortex control); the exact vanishing of the sum of pairwise products of the circulations in
  rational arithmetic.
- [x] **3. Every claim labelled.** The direct integrations and the random sample of Section 6 are labelled numerical
  in the paper and the README.
- [ ] **4. Sources read.** Zbarsky, arXiv:1912.10862v2, read in full for the appendix (the epsilon-dependent
  estimates from the rendered PDF, since the text extraction drops every epsilon). Kallyadan and Shukla (2022) is
  background only (abstract read; by the owner's decision of 2026-09-25 its full text is not read). Open: the appendix
  uses the conservation of the pseudo-energy for Yudovich solutions, cited to Marchioro and Pulvirenti (1994) without a
  checked location; a source that can be read, or a proof in the paper, closes the item.
- [x] **5. Prior art.** RESEARCH.md, entries of 2026-09-25 ("prior art for the stable-expansion note" and "nonlinear
  stability and vortex patches"); Leoncini, El Kettani and Ugalde, arXiv:2609.25989, read in full and cited.
- [ ] **6. Adversarial second reading.** Two second readers read Sections 4 and 5 (Theorem 3, Proposition 1 and the
  first version of Theorem 4), and their fixes are in (CHANGELOG v0.7.0). A third independent reading of Section 5 and
  Appendix A (2026-09-26), briefed with the paper and Zbarsky's arXiv version and told to find errors, found no gap;
  its must-fix items (a constant in the geometric bound, one slip wrongly attributed to Zbarsky, a LaTeX error) and its
  should-fix items (the C^1 regularity of the centres, the bootstrap at T_*, the count of turns, the chi conditions,
  notation) are fixed. Still to be read and recorded: Lemma 1 and Theorems 1 and 2 with their certificates.
- [x] **7. Reproducible.** `verify_stable_expansion.py` (58 checks) and `survey_expansions.py`; `paper-check` passes;
  18 pages.
