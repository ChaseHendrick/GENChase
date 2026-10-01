# Quality record: Stable Rotating Waves in Rings of a Modified Ventricular Myocyte Model Near a Hopf Point: Computer-Assisted Proofs in Fourier Space

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

## Record (2026-10-01, first draft of `paper/cardiac-rings.tex`)

- [ ] **1. Complete proofs.** Open. The draft writes out the proofs of every lemma and theorem the certificates rest
  on (Section 4, Lemmas 4.1 to 4.8, for existence; Section 5, the lemmas, corollaries and theorems numbered 5.1 to 5.17,
  for stability, adapted from `code/fourier/LEMMAS-stability.md` and the docstrings of `fourier_eval.py` and
  `existence.py`), and the CAPD argument of Section 6. What is missing: (a) three facts about operators with compact
  resolvent are cited from Kato (1976) by chapter and section only, and the book has not been checked against a copy
  for the exact statements and numbering; (b) the written proofs in this manuscript have not yet been read by anyone
  but their drafter (the lemma file they adapt was read, see item 6); (c) the Y0 and Z1 assembly of Section 4.5 is
  described at the level of the inequalities used, not every index range of the program; a reader should decide
  whether that is complete enough.
- [x] **2. Rigorous computation.** Every inequality of the proofs is decided in Arb ball arithmetic (python-flint
  0.9.0, pinned) by `code/fourier/existence.py` and `code/fourier/stability.py`, or in CAPD interval arithmetic by
  `code/proofs/verify.cpp`; floating point only proposes centres, frames and weights. The programs raise
  `ProofFailure` or `InputMismatch` at the first failed check and write no record then (`stability.py` also refuses
  to run if a Stage E source hash differs). Negative controls are in `code/fourier/test_*.py`; the in-project reviews
  ran them and further mutation probes (`review/stageS-stability-review-2026-10-01.md`, probe log: delta 7e-6 and
  6.321e-6 at N = 8, anti-diffusion, dropped A_1, lying floating data, S = I, flipped tail scaling all fail at the
  stated step; `review/stageE-existence-review-2026-10-01.md`: perturbations within the uniqueness ball;
  `review/fix-second-reading-2026-10-01.md`: the dominance test fails on single-term deletions). The CAPD verifier had
  a five-lens review (`review/verifier-review-2026-10-01.json`) and runs on CAPD with the crossing patch. Limits,
  stated in Section 9 of the paper: a few negligible terms cannot be detected by any test, and no stored log of a
  complete run of the test suites is kept in this folder.
- [x] **3. Every claim labelled.** The manuscript's "Labels" paragraph (Section 1) labels Theorems A and B
  computer-assisted and the lemmas proved, Kato's facts cited; Section 7 collects the numerical observations (leading
  exponents, the N = 8 sharpness 6.32095e-6 against 6.321e-6, the negative controls, the Hopf numerics, the period
  differences) and says that none is used in a proof or stated as a theorem; the identification with Erhardt's Hopf
  branch is labelled numerical (Section 3 and Section 9); the other pipeline's intervals are labelled a consistency
  check, not a publication (Remark 3.1). The README's "Status of the results" uses the same labels. Checked by the
  drafter only.
- [ ] **4. Sources read.** Open. The proof steps depend on Erhardt's model source (read; hash recorded), on Kato
  (1976) for three standard facts (not checked against a copy), and on the library contracts of Arb and CAPD (trust
  base, not citations). Background works and how far each was read are recorded in RESEARCH.md (entries of 2026-10-01)
  and `research/cardiac-cycle-certificates/notes/readings-rings-2026-10-01.md`: Erhardt (2025) read in full;
  Bayer-Leine and Gameiro-Lessard read in the stated sections; Di Marco et al. (2016) known from search snippets only;
  Paullet-Ermentrout (1994), Church-Lessard (2022), Arioli-Koch (2020) from abstracts; Ermentrout (1992) Theorem 3.1
  and Lemma 3.2 read. Kato must be read for item 4 to close.
- [x] **5. Prior article review.** RESEARCH.md, entries "2026-09-30 cardiac ring wave certification and next
  targets", "2026-10-01 cardiac cell and ring certificates: model origin, earlier rigorous work and the weak-coupling
  prediction", "2026-10-01 cardiac rings on the Fourier/Hill route: earlier computer-assisted lattice and Floquet
  work" and "2026-10-01 cardiac rings: the four open readings", with every query in
  `research/cardiac-cycle-certificates/notes/prior-article-rings-2026-10-01.md`. The only novelty sentence of the
  draft (Section 1, "Novelty") is "no earlier computer-assisted proof found in the logged searches", for the cell
  and for a rotating wave in a ring, and the draft credits Erhardt for the oscillation and equivariant Hopf theory for
  the expectation of rotating waves. The ledger lists readings to do before submission (Paullet-Ermentrout, Ashwin-Swift,
  Hoppensteadt-Izhikevich Theorem 9.2, papers citing Erhardt 2025, the full text of Di Marco et al.); the draft says
  so in Section 9.
- [ ] **6. Adversarial second reading.** Open. The programs and the lemma file had in-project adversarial readings by
  separate AI agent sessions, every finding was fixed, and a second reading of the fixes found nothing unsound
  (`review/*.md`, outcome in `data/fourier-review-status.json`). No reader has yet been briefed with this manuscript
  and its programs, which the item requires. No outside review has taken place.
- [ ] **7. Reproducible.** Open. `code/run_all.sh` checks the copies against the records' 90 hashes (passes) and
  reruns Stage E and Stage S in a scratch folder; the N = 1 and N = 8 proofs were rerun from these copies on
  2026-10-01 and reproduce the period enclosures and every stability bound exactly (`notes/rerun-2026-10-01.md`);
  N = 16, 32, 64 and the CAPD certificate were not rerun from here. No PDF has been built (no TeX toolchain was
  available), so no page count is stated, and `paper-sync --check` applies only from status "ready".
