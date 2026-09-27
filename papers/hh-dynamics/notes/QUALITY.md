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

## Record (2026-09-27, with the first manuscript, `paper/hh-dynamics.tex`)

- [ ] **1. Complete proofs.** The manuscript writes out every step that the programs rely on: the Jacobian and its
  characteristic polynomial (Lemma 2.4), the quartic lemma that replaces the Routh-Hurwitz criterion (Lemma 4.1, with
  a self-contained proof of the root counts), linearized stability and instability (Lemmas 4.2, 4.3), the two
  enclosures of Psi (Lemma 4.4), the first Lyapunov coefficient of the four-dimensional test system (Lemma 4.6), the a
  priori, variational and mean-value enclosures and the Lohner update (Lemmas 5.1 to 5.4), the section crossing, the
  derivative of the Poincare map, the minimal period and the Floquet multipliers (Lemmas 5.5 to 5.8), Gershgorin's
  discs with counting and realness, the contraction, orbital asymptotic stability and the saddle-type instability
  (Lemmas 5.10 to 5.13). Two published theorems are used as stated, with their hypotheses checked in the text: the
  Andronov-Hopf theorem with the first Lyapunov coefficient, from Kuznetsov's Scholarpedia article (read 2026-09-27;
  the book it cites was not checked), and Krawczyk's test in Rump's form (Acta Numer. 2010, Thm 13.3, read for
  minimal-winding). Open until the written proofs have had the second reading of item 6.
- [ ] **2. Rigorous computation.** `code/certify_equilibria_hopf.py` (Arb, 256 bits; 38 checks: 17 proof, 6
  consistency, 5 negative controls, 8 self-tests, 2 cross-checks; rerun 2026-09-27) and `code/certify_bistability.py`
  (Arb, 96 bits; 84 checks: 30 proof, 24 negative controls, 23 self-tests, 7 numerical-only) decide every inequality in
  ball arithmetic, round printed bounds outward and re-read them as exact rationals, and have negative controls,
  among them mutated versions of the l1 formula (added 2026-09-27). Held open: `certify_bistability.py` was last run
  in full on 2026-09-26 (a rerun of every stage except 4b on 2026-09-27, in one process, passed its 82 checks and
  reproduced the committed output line for line apart from run times; `data/certify_bistability_no_ball_2026-09-27.txt`),
  and its stage 4b is fixed at four worker processes; the changes of 2026-09-27 to
  `certify_equilibria_hopf.py` have not been read by anyone else; the program reports every check before it exits
  with an error rather than stopping at the first.
- [x] **3. Every claim labelled.** The manuscript labels every result proved, computer-assisted, cited or numerical
  (the "Labels" paragraph of Section 1; Theorems 1, 2, 4, 5 and Corollaries 3, 6 computer-assisted; the lemmas
  proved; Theorems 4.5 and 5.9 cited), collects the numerical results in Section 8, where none is stated as a
  theorem, and states what is not claimed (Remark 3.1, Section 10). The README labels the same results in the same
  way (2026-09-27).
- [ ] **4. Sources read.** Read: Hodgkin and Huxley (1952), the equations and Table 3; Guckenheimer and Oliva (2002)
  and Troy (1978) in full; Kuznetsov's Scholarpedia article on the Andronov-Hopf bifurcation (the statement and the
  l1 formula used); DLMF 13.2.2, 24.2.1, 25.6.2 and Sect. 24.2; Rump (2010), Thm 13.3. In part: Troy (1977),
  Hastings (1976), Guckenheimer and Labouriau (1993, pp. 937-938), Guckenheimer and Worfolk (1993, Sect. 5), Fukai et
  al. (2000, I and II), Lu, Xin and Rinzel (2023). Abstracts or reviews only: Troy (1976), Best (1979), Guttman, Lewis
  and Rinzel (1980), Du and Hassard (2001). Still to read before "ready": Du and Hassard (2001) in full, Hassard
  (1978), Rinzel and Miller (1980), the rest of Guckenheimer and Labouriau (1993), and Kuznetsov's book for the
  statement of the Hopf theorem that the Scholarpedia article summarizes.
- [ ] **5. Prior article review.** RESEARCH.md, entries of 2026-09-25 (survey and neuroscience scout), 2026-09-26 (the
  1952 constants; bistability at J = 8) and 2026-09-27 (prior articles for the manuscript: Du and Hassard found;
  Guckenheimer and Labouriau read in part). The manuscript claims no priority for the Hopf enclosures or the l1 signs
  and words its novelty statements as "we have not found an earlier proof" within those searches. To do: obtain Du
  and Hassard (2001) in full, rerun the arXiv queries that the arXiv API refused on 2026-09-27, and search whether the
  criticality of the two Hopf points has been proved before.
- [ ] **6. Adversarial second reading.** `certify_bistability.py`: an independent reading within the project (the
  model against the 1952 equations, 13 deliberate mutations of the code) found that 10 mutations passed unnoticed,
  that printed bounds were rounded to nearest, that a Poincare map could start off its section, that the
  certificates lacked negative controls running their own code, and that the summary needed corrections; all fixed,
  all 13 mutations now stop the program (2026-09-26). The mutation list and harness are not in this folder. Still to
  do: a second reading of those fixes, a mutation reading of `certify_equilibria_hopf.py`, and a reading of the
  written proofs of the manuscript.
- [ ] **7. Reproducible.** Both programs run from this folder with `code/requirements.txt`; their outputs are in
  `data/`, and `code/make_numbers.py` and `code/make_figures.py` rebuild every number, table and figure of the
  manuscript from them. No companion repository yet.
