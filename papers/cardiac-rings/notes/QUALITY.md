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

## Record (2026-10-01, `paper/cardiac-rings.tex` after two in-project readings of the manuscript; updated 2026-10-02 for Appendix A, Theorem C and Remark 7.1)

- [ ] **1. Complete proofs.** Open. The draft writes out the proofs of every lemma and theorem the certificates rest
  on (Section 4, Lemmas 4.1 to 4.8, for existence, and, since 2026-10-02, Lemmas 4.9 to 4.14 with the proof of Theorem C
  in Section 4.8, for existence for every N >= 8 and the cable; Section 5, the lemmas, corollaries and theorems numbered 5.1 to 5.17,
  for stability, adapted from `code/fourier/LEMMAS-stability.md` and the docstrings of `fourier_eval.py` and
  `existence.py`), the CAPD argument of Section 6 and Lemma 6.1 (the two cell proofs enclose the same orbit). The
  reading of 2026-10-01 (`review/manuscript-reading-1-2026-10-01.md`) found every proof of Section 5 complete and
  correct as written apart from its G4 (fixed), and asked for a precise Y0/Z1 assembly (G1), the coefficient
  enclosures beyond n_A (G2) and the CAPD argument (G3), all now written out. On 2026-10-02 the three facts about
  operators with compact resolvent that Section 5 had cited from Kato (1976) by chapter and section (discrete spectrum
  of eigenvalues of finite algebraic multiplicity; the Riesz projection onto the generalized eigenspaces, of rank
  n(H, Omega); holomorphy of the resolvent) were given complete proofs in a new Appendix A (Lemmas A.1 to A.3,
  Proposition A.4, Theorem A.5, Lemma A.6, Theorem A.7), on the l^1 spaces the paper uses, from elementary facts only
  (Neumann series, Hahn-Banach, Cauchy-Goursat for a rectangle, the identity theorem, Jordan decomposition in finite
  dimension; the Riesz-Schauder theory is not cited but replaced by a finite-rank determinant argument, Theorem
  A.5(ii)). Section 5.1, the proofs of Theorem 5.3, Lemma 5.9 (homotopy count) and Lemma 5.11 (comparison operator)
  now cite the appendix, with Kato kept as "see also"; the Labels paragraph and the Limitations item were updated, and
  `code/fourier/LEMMAS-stability.md` (with its canonical copy) cites the appendix the same way. An adversarial
  reading of Appendix A and its uses in Section 5 by a separate AI agent session within the project
  (`review/appendixA-reading-2026-10-02.md`, 2026-10-02; not an outside review) found no error, checked every proof
  A.1 to A.7 line by line with numerical sanity checks, and reported two gaps in the hand-off from Section 5, both
  fixed the same day: G1, Lemma 5.9 is now stated on X = l^1_w(J) and its proof is "This is Theorem A.7"; G2, Section
  5.4 now states D(Dhat) (tail coordinates with sum |m| |v_m|_1 finite), Scal^{-1}(D) = D(Dhat), that Ehat is the
  displayed bounded block operator (the d_m terms cancel by eq. (damping)) so that Dhat + Ehat = Scal^{-1} H_0 Scal
  with equal domains, and the proof of Lemma 5.11 shows that the tail inverse maps onto D(D_T) via
  ||B_m (mu - B_m)^{-1}|| <= 1 + |mu| rho_T. Exposition items X1 to X10 were also addressed: the list of elementary
  facts (X1); the index set renamed J and the remainder in Theorem A.5(ii) renamed Delta, with K renamed calligraphic K
  and the perturbation in Lemmas A.2(e) and A.6 renamed calligraphic E (X2); e < 1/r (X3); the orientation of the
  inner edges in Lemma A.3(d) (X4); Lemma A.6 restated without the redundant hypothesis (X5); R(lambda)X = D(H) proved
  (X6); the domain convention cited in Section 5.1 (X7); Lemma 5.8 named as the one prerequisite from the body in the
  appendix's opening paragraph, not moved (X8); the block-diagonal norm argument in Lemma 5.11 (X9); the Limitations
  item records this reading (X10). The lemma file was changed the same way for G1 and G2. What is missing: (a) the
  fixes of 2026-10-02 have not been checked by a second reader; (b) the passages revised after the second reading
  (R3 to R6 and the exposition items, `review/fix-check-2026-10-01.md`) have not been read by a third reader; (c) Theorem
  C (every N >= 8 and the cable, 2026-10-02) is proved in Section 4.8 by Lemmas 4.9 (tail resolvents for every
  damping), 4.10 (the fixed-point map, well defined at eps = 0), 4.11 (the derivative of d_m), 4.12 (bounds uniform
  over a piece), 4.13 (Z2 from a Hessian bound, proved as Lemma 4.7) and 4.14 (continuity and gluing), written out
  from the docstrings of `code/fourier/alln.py` and `branch.py`; its integration had one in-project reading
  (`review/alln-integration-reading-2026-10-02.md`), whose fixes have not been read by a second reader; (d) the G_Ks
  branch with uniform stability and the Hopf bridge are still being computed and reviewed in the study and are not in
  this draft (a TODO comment after Theorem C in the source marks where they go); they must be proved in full here
  before this item can close.
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
  complete run of the test suites is kept in this folder. Theorem C (2026-10-02): every inequality is decided in Arb by
  `code/fourier/alln.py` (with the bound assembly and Hessian cover of `code/fourier/branch.py`), which raises
  `ProofFailure` at a failed check and logs the piece as failed; the record `data/fourier-existence-alln.json` stores
  every piece's exact inputs (run log `code/fourier/data/alln/pieces.jsonl`, hashed); negative controls (dropping the
  parameter-width terms is detected, widened pieces fail at the radii polynomial) are in the record and in
  `code/fourier/test_alln.py`, which also re-proves five pieces bit for bit (13 of 13 tests passed,
  `review/alln-existence-fixcheck-2026-10-02.md`). The program had an in-project adversarial reading
  (`review/alln-existence-review-2026-10-02.md`: nothing unsound; weak tests W1 to W4 and minor items fixed by the
  program's author).
- [x] **3. Every claim labelled.** The manuscript's "Labels" paragraph (Section 1) labels Theorems A, B and C
  computer-assisted and the lemmas proved, including the facts about operators with compact resolvent, which Appendix A
  now proves (Lemmas A.1 to A.3, Proposition A.4, Theorem A.5, Lemma A.6, Theorem A.7; Kato is kept as "see also" and
  no step depends on it; checked by `review/appendixA-reading-2026-10-02.md`). Theorem C states what its record
  proves (which N, the space and the balls of uniqueness, the period only to about 1.2e-5 ms) and claims stability only
  for N = 8, 16, 32, 64 through Theorem B; Remark 7.1 (the weak-coupling phase reduction) is labelled numerical and
  is used in no proof, and the controls of Theorem C are listed in Section 7 as numerical. Section 7 collects the numerical observations (leading
  exponents, the N = 8 sharpness 6.32095e-6 against 6.321e-6, the negative controls, the Hopf numerics, the period
  differences) and says that none is used in a proof or stated as a theorem; the identification with Erhardt's Hopf
  branch is labelled numerical (Section 3 and Section 9); the other pipeline's intervals are labelled a consistency
  check, not a publication (Remark 3.1); the sharpness at N = 8 and the negative controls are labelled as runs not kept
  as records. The README's "Status of the results" uses the same labels. The manuscript reading of 2026-10-01 checked
  the labels ("Labels: Section 7 is numerical and unused, and the Hopf identification is labelled numerical") and
  every printed number against the records; its unsafe roundings (E1 to E4) are fixed.
- [ ] **4. Sources read.** Open. The proof steps depend on Erhardt's model source (read; hash recorded) and on the
  library contracts of Arb and CAPD (trust base, not citations). Since 2026-10-02 they no longer depend on Kato (1976):
  the three facts once cited from it are proved in Appendix A, and the book is cited as the standard reference only
  ("see also"), so it is background, not a source of a proof step; it has still not been checked against a copy. The
  in-project reading of Appendix A (`review/appendixA-reading-2026-10-02.md`) found its proofs complete from the stated
  elementary facts and its citations in Section 5 matching what is proved, which is what replaces the reading of
  Kato for the resolvent and Riesz-projection facts. Background works and how far each was read are recorded in RESEARCH.md (entries of 2026-10-01)
  and `research/cardiac-cycle-certificates/notes/readings-rings-2026-10-01.md`: Erhardt (2025) read in full;
  Bayer-Leine and Gameiro-Lessard read in the stated sections; Di Marco et al. (2016) known from excerpts of its abstract;
  the reading status of every cited background work is listed in Section 9 of the paper ("How far the background
  sources were read"). Whether item 4 can close without reading Kato is for the coordinator to decide after a
  reading of Appendix A. Since 2026-10-02 the paper also cites van den Berg, Lessard and Mischaikow (Math. Comp. 79
  (2010)) as background for rigorous parameter continuation, known from its abstract (Crossref record), not a source
  of a proof step; it is listed in Section 9 but not yet in the RESEARCH.md ledger. Theorem C uses no external result
  beyond those of Sections 4.1 to 4.6; Remark 7.1 cites Ermentrout (1992), Theorem 3.1 and Lemma 3.2 (read,
  pp. 1674-1677), for a numerical comparison only.
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
  Hoppensteadt-Izhikevich Theorem 9.2, papers citing Erhardt 2025, the full text of Di Marco et al.); they are tracked
  here, not in the draft, which states only how far each work was read and that the papers citing Erhardt were not
  checked for a continuation of the first Hopf branch (Section 9, 2026-10-01). Theorem C (2026-10-02) adds no novelty
  statement: the searches did not cover traveling waves of continuum cables of detailed ionic models, and Section 9
  says that no novelty is claimed for the cable wave.
- [x] **6. Adversarial second reading.** Two in-project readings of the manuscript with its programs, each by a
  separate AI agent session told to find errors; no outside review has taken place. Reading 1
  (`review/manuscript-reading-1-2026-10-01.md`): no false theorem; its findings E1 to E6, G1 to G6, C1 to C4, A1 and
  the exposition items were fixed (fixes: outward-rounded CAPD bounds, exact dyadic delta, r_ex entries, |abar_1V|
  bound, the link of the two cell proofs proved as Lemma 6.1 with `code/fourier/link_cell.py`, epsilon in the
  coordinates S at both radii, the Y0/Z1 assembly with the codomain of F, coefficient enclosures beyond n_A, the CAPD
  argument of Section 6, the ball B_c in the proof of Theorem 5.17(iii), what is certified and the rerun
  differences, reading status, citations and novelty wording, no review labels in the draft; X9 removed on 2026-10-01: the toy-model parenthesis and the draft history are gone, and the half-open strip
  remark keeps only its mathematics).
  Reading 2 (`review/manuscript-reading-2-2026-10-01.md`), of the revised passages, with a rerun of the link: nothing
  unsound, the link confirmed; two wrong numbers in statements (R1, delta for N = 1; R2, the period width) and
  gaps R3 to R6, citations R7 to R9 and exposition items, all fixed; where each is fixed is recorded in
  `review/fix-check-2026-10-01.md`. Reading 2 stated that a check of these fixes, recorded in the review folder,
  suffices for this item; that record is the fix-check file, made by the drafting session, and the fixes after
  reading 2 have not been read by a third reader.
- [ ] **7. Reproducible.** Open. `code/run_all.sh` checks the copies against the records' 90 hashes (passes) and the
  15 hashes of the Theorem C record (passes), runs the link of Lemma 6.1 (passes), with the argument `alln` re-derives
  Theorem C's gluing and Stage E identifications in Arb from the stored data (rerun from the copies on 2026-10-02:
  identical to the record), and reruns Stage E and Stage S in a scratch folder; the N = 1 and N = 8 proofs were rerun from these copies on
  2026-10-01 and reproduce the period enclosures and every stability bound exactly (`notes/rerun-2026-10-01.md`);
  N = 16, 32, 64 and the CAPD certificate were not rerun from here, and the 73 pieces of Theorem C were not re-proved
  from here (test_alln.py, about 15 minutes, re-proves five of them; it passed in the study). The PDF builds with
  `sh tools/paper-build.sh cardiac-rings` (TeX Live 2023, Ubuntu 24.04; 40 pages on 2026-10-02, after Appendix A,
  Theorem C and Remark 7.1; the log has no undefined references and one overfull line of 2.7 pt). Still open: a full
  rerun of N = 16, 32 and 64 and of the CAPD certificate from the copies, a rerun of test_alln.py from the copies,
  bit-reproducible Y0, Z1, Z2 and r_ex (BLAS threads are not pinned in existence.py; the fix is queued), and
  `paper-sync --check`, which applies only from status "ready".
