# Quality record: A finite rank window cannot show that a neural population code satisfies the eigenspectrum smoothness bound

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
5. Prior article review: the prior-article searches are logged in RESEARCH.md, and every novelty statement stays
   within what they reached.
6. Adversarial second reading: every proof has been read by an independent reviewer told to find errors, briefed
   only with the paper and its programs, and every must-fix finding is fixed and recorded.
7. Reproducible: the programs run from the companion with its `requirements.txt`, `paper-check` and
   `paper-sync --check` pass, and the page and check counts stated are current.

## Record (2026-09-26)

- [x] **1. Complete proofs.** Proposition 1 and Corollary 1 are the only formal results and are proved in Section 2.
  Proposition 1 uses Braun (JMLR 2006), Lemmas 5 and 8, as stated there (the triangle inequality gives the sum of the
  tail masses; positivity gives the maximum; his matrices are uncentred, which the note says). Corollary 1 is proved in
  full, including the C^1 differentiability of the torus code. Both referee readings checked them line by line and
  found them correct (`review-1.md`, `review-2.md`).
- [x] **2. Rigorous computation.** No proof uses a computer. Every computed result is labelled numerical in the note and
  the README; the programs assert every worded claim (`code/make_numbers.py`) and `verify_independent.py` recomputes
  selected numbers by independent code paths, with a negative control for the Proposition 1 check.
- [x] **3. Every claim labelled.** The note states that Proposition 1 and Corollary 1 are proved and everything else is
  numerical; the README says the same. Numerical results are not stated as theorems.
- [ ] **4. Sources read.** Read in the parts the note uses: Stringer et al. (2019) with its Supplementary
  Information; Pospisil and Pillow (2025); Davidovich and Roudi (arXiv:2204.08525); Braun (2006);
  Shawe-Taylor et al. (2005), Sects. I-III; Kong and Valiant (arXiv:1602.00061v5, Sects. 1 and 3); Spigler, Geiger and
  Wyart (arXiv:1905.10843, Sects. 1 and 7). Only the abstract of Koltchinskii and Gine (2000), cited as such; Widom
  (1963) not reached, so the note states the Matern tail-rate assumption instead of citing it. Open until Koltchinskii
  and Gine is read or dropped.
- [x] **5. Prior article review.** RESEARCH.md, entry of 2026-09-26 (finite rank windows and the eigenspectrum
  smoothness bound). The note says its central point is elementary and partly anticipated (Stringer's SI Example 3,
  Pospisil and Pillow, Davidovich and Roudi) and lists what it adds.
- [ ] **6. Adversarial second reading.** Two in-project readings by independent referees told to find errors
  (`review-1.md`: major revision, five must-fix items; `review-2.md`: minor revision, two must-fix items). The fixes of
  both are applied; the fixes of the second have not been read again, and no one outside the project has read the note.
- [ ] **7. Reproducible.** The programs rerun every number from the downloaded inputs (README), and
  `make_numbers.py` reproduces `paper/numbers.tex`, the tables and `out/numbers.json` byte for byte from `out/` alone.
  Open until a full rerun from the downloaded inputs has been done from this folder.
