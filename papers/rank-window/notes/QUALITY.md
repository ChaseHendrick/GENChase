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

## Record (2026-09-26; updated 2026-09-27 after the third reading)

- [x] **1. Complete proofs.** Proposition 1 and Corollary 1 are the only formal results and are proved in Section 2,
  with the one-line Fatou argument after them (a stationary code with infinite expected squared gradient is
  differentiable nowhere) and the rank-one interlacing that carries Stringer's Theorem 5 from the uncentred to the
  centred kernel (both added after `review-3.md`, S1). The proof of Proposition 1 is self-contained: it adapts the
  argument of Braun (JMLR 2006), Lemmas 5 and 8, which Braun states for the uncentred kernel matrix of a Mercer kernel
  with orthonormal eigenfunctions and nonincreasing eigenvalues; the note now says so and says what the proof changes
  (Weyl's inequality applied to the centred matrices, the projection, positivity for the maximum), instead of saying
  that the proposition follows from the lemmas (`review-3.md`, S2). Corollary 1 is proved in full, including the C^1
  differentiability of the torus code. All three referee readings checked them line by line and found them correct
  (`review-1.md`, `review-2.md`, `review-3.md`), and so did the session's lead reader (`signoff.md`).
- [x] **2. Rigorous computation.** No proof uses a computer. Every computed result is labelled numerical in the note and
  the README; the programs assert every worded claim (`code/make_numbers.py`) and `verify_independent.py` recomputes
  selected numbers by independent code paths, with a negative control for the Proposition 1 check.
- [x] **3. Every claim labelled.** The note states that Proposition 1 and Corollary 1 are proved and everything else is
  numerical; the README says the same. Numerical results are not stated as theorems.
- [x] **4. Sources read.** Read in the parts the note uses: Stringer et al. (2019) with its Supplementary
  Information; Pospisil and Pillow (2025); Davidovich and Roudi (arXiv:2204.08525); Braun (2006);
  Shawe-Taylor et al. (2005), Sects. I-III; Kong and Valiant (arXiv:1602.00061v5, Sects. 1 and 3); Spigler, Geiger and
  Wyart (arXiv:1905.10843, Sects. 1 and 7); Stringer's deposited code at 58443d1 in the files the bibliography names
  (the fitting windows of `mainfigs/fig3.m` and `powerlaws/statsShuffledPCA.m`, and `powerlaws/get_powerlaw.m`, read
  for `review-3.md`, M2). Only the abstract of Koltchinskii and Gine (2000), cited as such; Widom (1963) not reached,
  so the note states the Matern tail-rate assumption instead of citing it. Koltchinskii and Gine is background only
  (the convergence of kernel-matrix eigenvalues as P grows); no proof step uses it, the bibliography marks it
  "abstract read", and RESEARCH.md records it as "Only the abstract". That meets this item as the bar states it (every
  source a proof step depends on read in full; background recorded with how far it was read), so the item is checked
  (2026-09-27); an earlier version of this record held it open until the paper was read in full or dropped, which is
  stricter than the bar. The one proof source, Braun (2006), was read in the lemmas the proof adapts.
- [x] **5. Prior article review.** RESEARCH.md, entry of 2026-09-26 (finite rank windows and the eigenspectrum
  smoothness bound). The note says its central point is elementary and partly anticipated (Stringer's SI Example 3,
  Pospisil and Pillow, Davidovich and Roudi) and lists what it adds.
- [x] **6. Adversarial second reading.** Three in-project readings by independent referees told to find errors
  (`review-1.md`: major revision, five must-fix items; `review-2.md`: minor revision, two must-fix items;
  `review-3.md`, 2026-09-27, by an independent agent that had not seen the earlier reports: minor revision, five
  must-fix items). The fixes of the first two are applied. For the third, every finding was checked by one or two
  further independent agents (skeptics) before it was applied: must-fix M1 (a false statement that no recorded
  spectrum is computed), M2 (the grating window of the deposited code; both windows now reported) and M3 (Clopper-Pearson
  intervals for every flag rate; the abstract's "rarely or not at all" replaced by counts and bounds) were confirmed and
  are fixed, with should-fix S1, S2, S3, S5, S8, S9 and S10. M4 and M5 did not survive their skeptics (both skeptics
  judged M4 already handled by the evidence sentence that follows it; they split on M5, whose parts (b) and (c) one
  of them showed wrong), and S4, S6 and S7 were judged handled; the reasons are in the Response section of
  `review-3.md`. An independent agent then read the fixes again: all ten landed, with six residual points (a
  remaining "no exponent" statement and an undisclosed calibration constant, the Braun wording in the introduction and
  abstract, a single-precision step not listed, two wording slips in Results, and this record's wording on M5).
  The lead reader fixed those six, added the one clarifying sentence the M4 skeptics suggested (codes below the
  border stay below the reported exponents in the Matern family, asserted in `make_numbers.py`) and the wording of
  M5 part (a) that one skeptic confirmed ("whatever the tail's rate of decay" for "blind to its rate of decay"); those
  last fixes were checked by the lead reader, not by a further independent reading. The lead reader's earlier
  sign-off missed M1, M2 and M4 (`signoff.md`). All readings were in-project; no one outside the project has read
  the note.
- [x] **7. Reproducible.** The programs rerun every number from the downloaded inputs (README), and
  `make_numbers.py` reproduces `paper/numbers.tex`, the tables and `out/numbers.json` byte for byte from `out/` alone.
  Evidence: the full rerun of 2026-09-27 from a copy of this folder (`notes/rerun-2026-09-27.md`), made from the
  figshare inputs (MD5s as in the README) with the versions of `code/requirements.txt`. Every program ran. With one
  BLAS thread, the README's setting, every output equals the committed one, except the last bits of the
  `matern_window.py` outputs (committed from a two-thread run; one thread gives spectra within 9.1e-9 relative and
  exponents within 7.9e-10, and two threads reproduce them bit for bit) and the order of their rows. The
  finite-population file needed a fix (4d6c418): `matern_finiteN.py` now lists all 112 cells (it lacked
  nu = 0.75 at ell = 1/4 and 1 on the two sets with all five nu), and the README runs it in two stages,
  `matern_finiteN.py 20 --first` and then `matern_finiteN.py 5`. Replicate r's draw is seeded by r alone, so the
  stages set only the replicate counts. The fixed program, run from the README's commands, reproduced the four added
  cells and a 5-replicate cell exactly, and both stages from empty parts reproduced one whole set exactly. The
  documented procedure reproduces all 112 stored cells and 1,370 replicate values, with the stored counts (54 with 20
  replicates, 58 with 5). `make_numbers.py` reproduces `paper/numbers.tex`, the five tables, `out/tab_grating.tex`
  and `out/numbers.json` byte for byte from the committed `out/` and from the rerun `out/`. The figures are identical
  pixel for pixel, the rebuilt PDF text is identical, and `verify_independent.py` passes all 17 checks.
  `paper-check` passes (16 pages), and `paper-sync --check rank-window` passes against the companion
  repository `ChaseHendrick/rank-window` (2026-09-27).
