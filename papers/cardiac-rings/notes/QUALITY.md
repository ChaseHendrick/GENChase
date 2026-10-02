# Quality record: Stable Rotating Waves in Rings of a Modified Ventricular Cell Model: Computer-Assisted Proofs

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

- [x] **1. Complete proofs.** The draft writes out the proofs of every lemma and theorem the certificates rest
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
  item records this reading (X10). The lemma file was changed the same way for G1 and G2. A third in-project reading of the whole manuscript on 2026-10-02 (`review/third-reading-2026-10-02.md`; five parts,
  each by a separate AI agent session, every finding checked by two further sessions; not an outside review) read the
  text after the Appendix A fixes and after the passages revised after reading 2, including Theorem C (Sections 2.3
  and 4.8, Lemmas 4.9 to 4.14 and the proof of Theorem C), Appendix A and Remark 7.1. It found no gap in the proofs:
  the every-N argument is complete, including the cable endpoint eps = 0 and the gluing (existence part); no gap in
  Section 5 or Appendix A (stability part); the CAPD argument of Section 6 matches `code/proofs/verify.cpp` (CAPD
  part). Its confirmed findings on the proofs were statements and notation (E4, E5, E7; N3 to N6 and N8 of the
  stability part) and the four constants of Theorem C(a), which no program decided (E2); the proof now says they are
  read off the record by an exact rational check, whose program and output are in the reading. All were fixed on
  2026-10-02; these fixes have not been read by a further reader. The G_Ks branch with uniform stability and the Hopf
  bridge are not part of this paper: Section 9 calls an interval in G_Ks future work and claims no result of it.
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
  every piece's weights, radii, period enclosure and the SHA-256 of its centre, and the hash of the run log
  `code/fourier/data/alln/pieces.jsonl`, which holds every piece's exact inputs (centres, weights, r_*, R_i); the four
  constants of Theorem C(a) that summarize all pieces are read off the record by an exact rational check
  (`review/third-reading-2026-10-02.md`); negative controls (dropping the
  parameter-width terms is detected, widened pieces fail at the radii polynomial) are in the record and in
  `code/fourier/test_alln.py`, which also re-proves four pieces bit for bit (13 of 13 tests passed,
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
- [x] **4. Sources read.** The proof steps depend on Erhardt's model source (read; file hash recorded in Section 2.1)
  and on the library contracts of Arb and CAPD (trust base, Section 8, not citations). No proof step depends on Kato
  (1976): the three facts once cited from it are proved in Appendix A, Kato is cited as the standard reference only
  and was not checked against a copy, and the paper says so; the third reading (`review/third-reading-2026-10-02.md`,
  claims and sources part) confirmed that no proof step depends on Kato or on any unread source. Remark 7.1 cites
  Ermentrout (1992), Theorem 3.1 and Lemma 3.2 (read, pp. 1674-1677), for a numerical comparison only. Background
  citations and how far each was read are recorded in RESEARCH.md: the cardiac entries of 2026-09-30 and 2026-10-01
  (Erhardt 2025 read in full; Bayer-Leine and Gameiro-Lessard read in the stated sections; Di Marco et al. known from
  excerpts of its abstract; the others as Section 9 lists them), with the notes in
  `research/cardiac-cycle-certificates/notes/readings-rings-2026-10-01.md`, and the entry of 2026-10-02 "cardiac
  rings: background citations added since the readings" for van den Berg-Lessard-Mischaikow (abstract), Kato (not
  checked against a copy), Johansson (Arb) and Kapela et al. (CAPD) (cited as software, no reading recorded). Section 9
  of the paper ("How far the background sources were read") states the same reading status for every cited work.
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
  suffices for this item; that record is the fix-check file, made by the drafting session. Appendix A had its own
  adversarial reading on 2026-10-02 (`review/appendixA-reading-2026-10-02.md`). Reading 3, of 2026-10-02
  (`review/third-reading-2026-10-02.md`), read the whole manuscript after those fixes, including Theorem C (Sections
  2.3 and 4.8) and Remark 7.1, which the readings of 2026-10-01 predate, in five parts with every finding checked by
  two further sessions: no gap in the proofs; its must findings (a reading cited that did not exist, "share no
  library", the count of re-proved pieces, a bound printed below its record, stale rerun statements) and its should
  findings were fixed the same day, as recorded in that file; those fixes have not been read by a further reader.
- [x] **7. Reproducible.** From a fresh staging of the companion (`node tools/paper-sync.js --stage`) and a new
  Python 3.11.15 environment with `pip install -r code/requirements.txt` (python-flint 0.9.0, numpy 2.4.6, scipy
  1.17.1, mpmath 1.3.0, matplotlib 3.11.2), `sh code/run_all.sh 1` passed on 2026-10-02: the 90 hashes of the Fourier
  records and the 15 of the Theorem C record match, the link of Lemma 6.1 passes with its negative control, and Stage E
  and Stage S for N = 1 reproduce every compared value exactly; `code/plot_cardiac_rings.py` in the same environment
  rewrote the three figures and `paper/figures/sources.json` byte for byte (`notes/rerun-2026-10-02.md`, section 5).
  The other proofs were rerun from the same copies with the same package versions: N = 1 and 8 on 2026-10-01
  (`notes/rerun-2026-10-01.md`); on 2026-10-02 the CAPD certificate (all 28 keys of the verifier's output equal to the
  record), N = 16, 32 and 64 (enclosures and stability bounds identical), the collection step of Theorem C
  (identical) and `code/fourier/test_alln.py` (13 of 13 tests, four pieces re-proved bit for bit)
  (`notes/rerun-2026-10-02.md`, sections 1 to 3). `run_all.sh` does not check the four source hashes of the CAPD
  record; they were compared with the copies by hand and agree (Section 8 says so). `timeout 900 sh
  tools/paper-build.sh cardiac-rings` builds the PDF (45 pages on 2026-10-02, with the three figures);
  `node tools/paper-check.js --paper cardiac-rings` passes ("stages cleanly") and `node tools/paper-sync.js --check
  cardiac-rings` says "ready to publish as its own repository". The page count (45) and the check counts (90 and 15
  hashes, 13 tests, four pieces) stated in the paper and the README are current. Limits, stated in Section 8: Y0, Z1,
  Z2 and r_ex reproduce only to late digits (the floating-point inverse may depend on the BLAS thread setting; not
  investigated), 69 of the 73 pieces of Theorem C were not re-proved from the copies, and the other test files were
  not rerun from the companion.
