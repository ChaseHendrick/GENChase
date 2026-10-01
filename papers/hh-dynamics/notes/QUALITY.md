# Quality record: Hopf Bifurcations and Bistability in the Hodgkin-Huxley Equations at the 1952 Parameters: Computer-Assisted Proofs

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

## Record (2026-09-27, with the first manuscript, `paper/hh-dynamics.tex`, its revision after three in-project readings, and the revision for release after three more)

- [x] **1. Complete proofs.** The manuscript writes out every step that the programs rely on: the Jacobian and its
  characteristic polynomial (Lemma 2.4), the quartic lemma that replaces the Routh-Hurwitz criterion (Lemma 4.1, with
  a self-contained proof of the root counts), linearized stability and instability (Lemmas 4.2, 4.3), the two
  enclosures of Psi (Lemma 4.4), the first Lyapunov coefficient of the four-dimensional test system (Lemma 4.5), the a
  priori, variational and mean-value enclosures and the Lohner update, with the invariant that keeps the centre of a
  set inside its hull (Lemmas 5.1 to 5.4), the section crossing, the derivative of the Poincare map, the minimal period
  and the local return map, the Floquet multipliers (Lemmas 5.5 to 5.8), the consequence of the Krawczyk test that the
  proofs use, uniqueness in the whole box included (Lemma 5.9), Gershgorin's discs with counting and realness, the
  contraction, orbital asymptotic stability and the saddle-type instability for the local return map (Lemmas 5.10 to
  5.13), and the proofs of Theorems 1, 2, 4, 5, Proposition 2.3, Corollaries 3, 6, 7 and Remark 3.1. Two published
  theorems are used as stated, with their hypotheses checked in the text: Theorem H, the Andronov-Hopf theorem with the
  first Lyapunov coefficient, from Kuznetsov's Scholarpedia article (read in full), and Theorem K, Rump's Theorem 13.3
  exactly as printed (Section 13 and Lemma 10.5, which its proof uses, read in full). Evidence: the analysis reading of
  2026-09-27 (`notes/referee-2026-09-27-analysis.md`) read every written proof; the fourth reading
  (`notes/referee-2026-09-27-revision.md`) read every proof revised after it (Theorem 5(c), Lemma 5.9 with Theorem K,
  Lemmas 5.6 to 5.8, 5.12 and 5.13, the Lohner invariant, Remark 3.1, Corollary 7) and found no error; the fifth and
  sixth (`notes/referee-2026-09-27-changes.md`, `-fixes.md`) read the proofs of Theorems 4 and 5 and Corollary 7 as
  changed for the check that the sets integrated contain the boxes of the proofs, and found no error.
- [x] **2. Rigorous computation.** Every computer step of a proof is decided in Arb ball arithmetic by a committed program
  that prints every check, stops at the first failed check (or exception) with a nonzero exit status, and has negative
  controls: `code/certify_equilibria_hopf.py` (256 bits; 40 checks: 17 proof, 6 consistency, 5 negative controls, 8 self-tests, 4 cross-checks), `code/certify_bistability.py` (96 bits; 93 checks: 36 proof, 27 negative controls, 23 self-tests, 7 numerical-only) and
  `code/identify_stable_orbit.py` (33 checks: 19 proof, 6 negative controls, 8 cross-checks); printed bounds are rounded outward and re-read as exact rationals. The
  sets that the runs integrate are checked, in exact rationals, to contain the boxes of the proofs. Evidence: all three
  were run on 2026-09-27 with the committed code (`data/certify_equilibria_hopf.txt`; `data/certify_bistability.txt`, in full, stage 4b in two worker processes, no piece from a checkpoint, 53.1 min, which repeats the output of 2026-09-26 line for line apart from run times, the added checks and controls, the stage-4b header and the covering field of the piece lines (the 60 lines agree otherwise), a path, the counts and the summary's paragraph on the Hopf program; `data/identify_stable_orbit.txt`; every check passed). The five mutations of the computation reading that had
  passed every check now stop the programs (a finite-difference cross-check of Theorem 2(d); a Krawczyk control with a
  widened DP(Z); the covering check and its control; a control with the contraction bound 0.5), and
  `code/mutation_study.py` (`data/mutation_study.txt`) repeats them with the other ten and two more on copies of the
  programs after unmutated baselines: 17 mutations; the 16 not marked weak all stopped the program at a failed check (the five of the reading among them: H2 at the transversality cross-check, B4 at the widened-DP control, B6 and B7 at the covering check, B13 at the contraction-bound control), and the one marked weak passed. The mutation list of the reading of 2026-09-26 was not kept; the
  manuscript no longer cites it.
- [x] **3. Every claim labelled.** The manuscript labels every result proved, computer-assisted, cited or numerical
  (the "Labels" paragraph of Section 1, which allows a computer-assisted result to name the cited theorem it uses;
  Theorems 1, 2, 4, 5, Proposition 2.3, Remark 3.1 and Corollaries 3, 6, 7 computer-assisted; the lemmas proved;
  Theorems H and K cited), collects the numerical results in Section 8, where none is stated as a theorem (among them
  the small cycles below J_H2 of `code/numerics_h2.py`), and states what is not claimed (Remark 3.2, Section 10). The
  README labels the same results in the same way (rewritten for release on 2026-09-27), and the mutation study is
  labelled "not part of any proof" wherever it appears.
- [x] **4. Sources read.** Every source that a proof step uses was read in full where the step depends on it:
  Hodgkin and Huxley (1952), the summary of the equations and parameters (pp. 518-520, with Table 3 and its footnote)
  and pp. 510, 515, 516, in the scanned pages at PubMed Central; Rump (2010), Section 13 with Theorems 13.1 to 13.3 and
  their proofs, and Lemma 10.5, which the proof of Theorem 13.3 uses (the author's version); Kuznetsov's Scholarpedia
  article, in full (Theorem H is cited from it, not from the book, which no proof uses); DLMF 13.2.2, 24.2.1, 24.2.2,
  Table 24.2.1, 25.6.1 and 25.6.2. Gershgorin's theorem and the Lohner representation are proved in the manuscript,
  and Krawczyk's test is used in Rump's form, so Gershgorin (1931), Lohner (1987), Krawczyk (1969) and Moore (1977),
  not read, are credits, not dependencies. Every background citation is recorded in RESEARCH.md with how far it was
  read (the entry of 2026-09-27 "Hodgkin-Huxley manuscript before release ...", with the list of all of them), and
  the manuscript's Section 10 and bibliography say the same. Read today besides: Labouriau's thesis, Chapter IV (the
  open copy at WRAP), Hassard and Shiau (1996) in full (a copy the owner downloaded; not in the repository), the
  first page of Du and Hassard (2001) again. Known from abstracts, reviews or citing papers rather than the full text: Du
  and Hassard (2001; abstract and zbMATH review, full text by subscription only), Hassard (1978),
  Rinzel and Miller (1980), Hassard and Shiau (1989), Shiau and Hassard (1991), Labouriau (1985, 1989); none of them
  is a source of a proof step.
- [x] **5. Prior article review.** RESEARCH.md, entries of 2026-09-25 (survey and neuroscience scout), 2026-09-26 (the
  1952 constants; bistability at J = 8) and 2026-09-27 (prior articles for the manuscript; sources for its proofs; the
  entry after the three readings; the entry before release, with 25 arXiv searches through the search page, since the
  API refused them again, and 4 PubMed searches, both run on 2026-09-27 after they failed in the morning). The
  manuscript's Section 10 lists the searches. Every novelty statement stays within what they reached: the manuscript
  claims no earlier proof found only of a stable periodic orbit of large amplitude away from the Hopf points and of
  bistability, claims no priority for the unique equilibrium, the Hopf points or their criticality (Theorems 1, 2,
  Corollary 3), and says that Du and Hassard (2001), unread beyond a first page that describes a local method, limits
  its novelty statement too.
- [x] **6. Adversarial second reading.** Six readings on 2026-09-27, made within the project by separate AI agents, each
  told to find errors: three of the whole manuscript and its programs (its mathematics, its computations with 15
  mutations, its claims and literature; their 18 surviving findings, 5 must-fix, all fixed and answered in
  `notes/referee-2026-09-27-analysis.md`, `-computation.md`, `-claims-literature.md`); a fourth, briefed only with
  `paper/`, `code/` and `data/`, of every part revised in answer to them (`notes/referee-2026-09-27-revision.md`: no
  must-fix; 3 should-fix and 4 minor findings, all fixed); a fifth of every change to the programs and the text made
  for release (`notes/referee-2026-09-27-changes.md`: no must-fix; 6 should-fix and 5 minor, all fixed or answered);
  a sixth of those fixes (`notes/referee-2026-09-27-fixes.md`: no must-fix; 1 should-fix and 5 minor, answered). One
  change after the sixth reading, a negative control weakened to what it can show, was not read again; it is recorded
  there. None of these readings is outside the project.
- [x] **7. Reproducible.** The programs run from the companion with `code/requirements.txt` (python-flint, mpmath, SymPy,
  numpy, SciPy, matplotlib; the mutation study uses only the standard library); their outputs are in `data/`, and
  `code/hh_make_numbers.py` and `code/hh_make_figures.py` rebuild every number, table and figure of the manuscript
  from them. `node tools/paper-check.js` and `node tools/paper-sync.js --check hh-dynamics` pass (run on 2026-09-27 after the last changes), and the
  counts stated are current: 29 pages in the README (30 until the shortening of 2026-10-01; RELEASES.md gives the count of the release it describes), and the check counts in the manuscript (generated),
  the README, RELEASES.md and this record, from the committed outputs.
