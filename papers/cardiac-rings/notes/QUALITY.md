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

## Record (2026-10-01, `paper/cardiac-rings.tex` after two in-project readings of the manuscript)

- [ ] **1. Complete proofs.** Open. The draft writes out the proofs of every lemma and theorem the certificates rest
  on (Section 4, Lemmas 4.1 to 4.8, for existence; Section 5, the lemmas, corollaries and theorems numbered 5.1 to 5.17,
  for stability, adapted from `code/fourier/LEMMAS-stability.md` and the docstrings of `fourier_eval.py` and
  `existence.py`), the CAPD argument of Section 6 and Lemma 6.1 (the two cell proofs enclose the same orbit). The
  reading of 2026-10-01 (`review/manuscript-reading-1-2026-10-01.md`) found every proof of Section 5 complete and
  correct as written apart from its G4 (fixed), and asked for a precise Y0/Z1 assembly (G1), the coefficient
  enclosures beyond n_A (G2) and the CAPD argument (G3), all now written out. What is missing: (a) three facts about
  operators with compact resolvent are cited from Kato (1976) by chapter and section only, and the book has not been
  checked against a copy for the exact statements and numbering; (b) the passages revised after the second reading
  (R3 to R6 and the exposition items, `review/fix-check-2026-10-01.md`) have not been read by a third reader.
- [x] **2. Rigorous computation.** Every inequality of the proofs is decided in Arb ball arithmetic (python-flint
  0.9.0, pinned) by `code/fourier/existence.py` and `code/fourier/stability.py`, or in CAPD interval arithmetic by
  `code/proofs/verify.cpp`; floating point only proposes centres, frames and weights. The programs raise
  `ProofFailure` or `InputMismatch` at the first failed check and write no record then (`stability.py` also refuses
  to run if a Stage E source hash differs). Negative controls are in `code/fourier/test_*.py`; the in-project reviews
  ran them and further mutation probes (`review/stageS-stability-review-2026-10-01.md`, probe log: delta 7e-6 and
  6.321e-6 at N = 8, anti-diffusion, dropped A_1, lying floating data, S = I, flipped tail scaling all fail at the
  stated step; `review/stageE-existence-review-2026-10-01.md`: perturbations within the uniqueness ball;
  `review/fix-second-reading-2026-10-01.md`: the dominance test fails on single-term deletions). The CAPD verifier had
  a five-lens review (`review/verifier-review-2026-10-01.json`) and runs on CAPD with the crossing patch. The link
  of the two cell proofs is decided in exact rationals by `code/fourier/link_cell.py`, which exits nonzero on a failed
  check and has a negative control (radii divided by 10 must fail; `data/link_cell.txt`). Limits, stated in Section 9
  of the paper: a few negligible terms cannot be detected by any test; the link assumes that the CAPD and Arb
  translations of the model define the same function (compared at 104 points by the tests); no stored log of a
  complete run of the test suites is kept in this folder.
- [x] **3. Every claim labelled.** The manuscript's "Labels" paragraph (Section 1) labels Theorems A and B
  computer-assisted and the lemmas proved, Kato's facts cited; Section 7 collects the numerical observations (leading
  exponents, the N = 8 sharpness 6.32095e-6 against 6.321e-6, the negative controls, the Hopf numerics, the period
  differences) and says that none is used in a proof or stated as a theorem; the identification with Erhardt's Hopf
  branch is labelled numerical (Section 3 and Section 9); the other pipeline's intervals are labelled a consistency
  check, not a publication (Remark 3.1); the sharpness at N = 8 and the negative controls are labelled as runs not kept
  as records. The README's "Status of the results" uses the same labels. The manuscript reading of 2026-10-01 checked
  the labels ("Labels: Section 7 is numerical and unused, and the Hopf identification is labelled numerical") and
  every printed number against the records; its unsafe roundings (E1 to E4) are fixed.
- [ ] **4. Sources read.** Open. The proof steps depend on Erhardt's model source (read; hash recorded), on Kato
  (1976) for three standard facts (not checked against a copy), and on the library contracts of Arb and CAPD (trust
  base, not citations). Background works and how far each was read are recorded in RESEARCH.md (entries of 2026-10-01)
  and `research/cardiac-cycle-certificates/notes/readings-rings-2026-10-01.md`: Erhardt (2025) read in full;
  Bayer-Leine and Gameiro-Lessard read in the stated sections; Di Marco et al. (2016) known from search snippets only;
  the reading status of every cited background work is listed in Section 9 of the paper ("How far the background
  sources were read"). Kato must be read for item 4 to close.
- [x] **5. Prior article review.** RESEARCH.md, entries "2026-09-30 cardiac ring wave certification and next
  targets", "2026-10-01 cardiac cell and ring certificates: model origin, earlier rigorous work and the weak-coupling
  prediction", "2026-10-01 cardiac rings on the Fourier/Hill route: earlier computer-assisted lattice and Floquet
  work" and "2026-10-01 cardiac rings: the four open readings", with every query in
  `research/cardiac-cycle-certificates/notes/prior-article-rings-2026-10-01.md`. The only novelty sentence of the
  draft (Section 1, "Novelty") is "no earlier computer-assisted proof found in the logged searches", for a periodic
  orbit of a detailed ionic cardiac cell model and for a rotating wave in a ring of diffusively coupled cells (narrowed
  after the manuscript reading, which pointed to Kapela-Zgliczynski's computer-assisted choreographies with the same
  cyclic-shift symmetry; they are cited next to the sentence, as are Arioli-Koch 2015, Kuehn-Queirolo and Church et
  al. 2026), and the draft credits Erhardt for the oscillation and equivariant Hopf theory for
  the expectation of rotating waves. The ledger lists readings to do before submission (Paullet-Ermentrout, Ashwin-Swift,
  Hoppensteadt-Izhikevich Theorem 9.2, papers citing Erhardt 2025, the full text of Di Marco et al.); the draft says
  so in Section 9.
- [x] **6. Adversarial second reading.** Two in-project readings of the manuscript with its programs, each by a
  separate AI agent session told to find errors; no outside review has taken place. Reading 1
  (`review/manuscript-reading-1-2026-10-01.md`): no false theorem; its findings E1 to E6, G1 to G6, C1 to C4, A1 and
  the exposition items were fixed (fixes: outward-rounded CAPD bounds, exact dyadic delta, r_ex entries, |abar_1V|
  bound, the link of the two cell proofs proved as Lemma 6.1 with `code/fourier/link_cell.py`, epsilon in the
  coordinates S at both radii, the Y0/Z1 assembly with the codomain of F, coefficient enclosures beyond n_A, the CAPD
  argument of Section 6, the ball B_c in the proof of Theorem 5.17(iii), what is certified and the rerun
  differences, reading status, citations and novelty wording, no review labels in the draft; X9 kept by choice).
  Reading 2 (`review/manuscript-reading-2-2026-10-01.md`), of the revised passages, with a rerun of the link: nothing
  unsound, the link confirmed; two wrong numbers in statements (R1, delta for N = 1; R2, the period width) and
  gaps R3 to R6, citations R7 to R9 and exposition items, all fixed; where each is fixed is recorded in
  `review/fix-check-2026-10-01.md`. Reading 2 stated that a check of these fixes, recorded in the review folder,
  suffices for this item; that record is the fix-check file, made by the drafting session, and the fixes after
  reading 2 have not been read by a third reader.
- [ ] **7. Reproducible.** Open. `code/run_all.sh` checks the copies against the records' 90 hashes (passes), runs the
  link of Lemma 6.1 (passes) and reruns Stage E and Stage S in a scratch folder; the N = 1 and N = 8 proofs were rerun from these copies on
  2026-10-01 and reproduce the period enclosures and every stability bound exactly (`notes/rerun-2026-10-01.md`);
  N = 16, 32, 64 and the CAPD certificate were not rerun from here. The PDF builds with `sh tools/paper-build.sh
  cardiac-rings` (TeX Live 2023, Ubuntu 24.04; 26 pages; on 2026-10-01 the log had no undefined references and one
  overfull line of 2.7 pt). Still open: a full rerun of N = 16, 32 and 64 and of the CAPD certificate from the copies,
  bit-reproducible Y0, Z1, Z2 and r_ex (BLAS threads are not pinned in existence.py; the fix is queued), and
  `paper-sync --check`, which applies only from status "ready".
