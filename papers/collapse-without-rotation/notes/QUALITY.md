# Quality record: Point-Vortex Collapse Without Rotation

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

## Record (2026-09-25)

- [x] **1. Complete proofs.** Theorem 1 (weak clusters; part (d) with explicit constants), Corollary 1, Theorem 2 and
  Corollary 2 (one weak triple), Theorem 3 (the family for any nondegenerate translating cluster), Lemma 1
  (nondegenerate translating clusters of every size), Corollary 3 (sharpness for every number of weak vortices) and
  Proposition 1 (no mirror-symmetric collapse with nonzero total circulation) are proved in the paper, step by step.
  The proof of Theorem 1 follows the structure of the companion paper's Theorem 3 and writes out every step (Steps 1
  to 5 and part (d)).
- [x] **2. Rigorous computation.** The computer steps inside proofs are exact computer algebra: the identities of
  Theorem 1 (`verify_cluster_identities.py`, 62 checks with negative controls) and the first-order coefficient of
  Theorem 2 over Q(t)(omega) (`verify_triple_branch.py`), and the exact base cases of Lemma 1
  (`verify_sharpness_all_n.py`). Computations at 40 to 60 digits and the ball-arithmetic recheck of the continuum limit
  support numerical statements only.
- [x] **3. Every claim labelled.** The introduction says which results are proved and that Sections 4, 5.2, 5.3 and 6
  and the expansion of Section 3.3 beyond one triple are numerical or formal; the README's "Status of the results"
  says the same.
- [x] **4. Sources read.** Proof steps depend on the companion paper (Theorem 3, Proposition 4), read in full, and on
  standard results (implicit function theorem, Hurwitz's theorem). O'Neil, Theor. Comput. Fluid Dyn. 24 (2010), read
  in full (Section 6, numerical); Aref et al., Vortex crystals (2003), Sects. II, VIII and IX read; O'Neil,
  Nonlinearity 26 (2013), abstract only, cited as background. RESEARCH.md records each.
- [x] **5. Prior article review.** RESEARCH.md, entries of 2026-09-25 ("prior article review for the follow-up paper on collapse
  without rotation", "sharpness of sqrt(3)/2 for every number of weak vortices"), and `prior-articles-2026-09-25.md` in this
  folder. The paper claims no priority for translating configurations or for collapsing vortex sheets, and credits
  O'Neil for both.
- [x] **6. Adversarial second reading.** The weak-cluster theorem (`referee-weak-clusters-2026-09-25.md` in this
  folder: sound with fixes, all applied); the whole draft (8 must-fix items, all applied; RESEARCH.md); Lemma 1,
  Theorem 3 and Corollary 3 (no mathematical error; gaps and wording fixed in ChaseHendrick/GENChase#159).
- [x] **7. Reproducible.** Ten programs, 373 checks (376 with `--large`), each stopping on a failed check;
  `paper-check` and `paper-sync --check` pass; 24 pages.
