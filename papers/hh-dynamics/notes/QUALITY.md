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

## Record (2026-09-27, with the first manuscript, `paper/hh-dynamics.tex`, and its revision after three in-project readings)

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
  first Lyapunov coefficient, from Kuznetsov's Scholarpedia article (read 2026-09-27, the sections "Two-dimensional
  Case", "Multi-dimensional Case" and "First Lyapunov Coefficient"; the book it cites was not checked), and Theorem K,
  Rump's Theorem 13.3 (Acta Numer. 2010, p. 89) exactly as printed, with f on a domain D and the root in
  x~ + S(X, x~). Evidence: the analysis reading of 2026-09-27 (`notes/referee-2026-09-27-analysis.md`) read every
  written proof and found no error that breaks a theorem; its findings on statements and hypotheses (the boxes of
  uniqueness in Theorem 5, the stability at the Hopf points in the abstract, the first-return map in the stability
  lemmas, Rump's form of the Krawczyk theorem, the centre of a Lohner set) are fixed as that file records. Not read
  again: the fixes, Lemma 5.9, the restated Lemmas 5.6 to 5.8, 5.12 and 5.13, Remark 3.1 and Corollary 7 with its
  proof.
- [ ] **2. Rigorous computation.** `code/certify_equilibria_hopf.py` (Arb, 256 bits; 38 checks: 17 proof, 6
  consistency, 5 negative controls, 8 self-tests, 2 cross-checks), `code/certify_bistability.py` (Arb, 96 bits; 84
  checks: 30 proof, 24 negative controls, 23 self-tests, 7 numerical-only) and `code/identify_stable_orbit.py` (Arb,
  96 bits; 27 checks: 16 proof, 3 negative controls, 8 cross-checks; added 2026-09-27 for Corollary 7) decide every
  inequality in ball arithmetic, round printed bounds outward and re-read them as exact rationals, and have negative
  controls. The computation reading of 2026-09-27 reran the first two from copies (outputs identical to the committed
  ones apart from run times; stage 4b through a driver calling the same function with the same arguments) and made 15
  mutations. Held open: five of those mutations passed every check and control (a factor 2 dropped from the
  transversality formula; the Krawczyk operator reduced to a Newton step; the E_l interval dropped from the initial
  sets; DP enclosed over a sub-box of Z; the contraction bound no longer required), so the controls do not isolate
  these ingredients, although the code as written implements them; one stopped `certify_equilibria_hopf.py` by an
  exception rather than a failed check; `certify_equilibria_hopf.py` reports every check before it exits with an
  error rather than stopping at the first; stage 4b of `certify_bistability.py` is fixed at four worker processes and
  prints nothing until all pieces are done; `identify_stable_orbit.py` has not been read by anyone else.
- [x] **3. Every claim labelled.** The manuscript labels every result proved, computer-assisted, cited or numerical
  (the "Labels" paragraph of Section 1, which allows a computer-assisted result to name the cited theorem it uses;
  Theorems 1, 2, 4, 5, Proposition 2.3, Remark 3.1 and Corollaries 3, 6, 7 computer-assisted; the lemmas proved;
  Theorems H and K cited), collects the numerical results in Section 8, where none is stated as a theorem (among them
  the small cycles below J_H2 of `code/numerics_h2.py`), and states what is not claimed (Remark 3.2, Section 10). The
  README labels the same results in the same way (2026-09-27, after the readings).
- [ ] **4. Sources read.** Read: Hodgkin and Huxley (1952), the equations and Table 3; Guckenheimer and Oliva (2002),
  Troy (1978) and Guckenheimer and Labouriau (1993, the authors' copy of the printed paper, read 2026-09-27) in full;
  Kuznetsov's Scholarpedia article on the Andronov-Hopf bifurcation (the statement and the l1 formula used); DLMF
  13.2.2, 24.2.1, 25.6.2 and Sect. 24.2; Rump (2010), Sect. 13 with Theorems 13.1 to 13.3 and their proofs. In part:
  Troy (1977), Hastings (1976), Guckenheimer and Worfolk (1993, Sect. 5), Fukai et al. (2000, I and II), Lu, Xin and
  Rinzel (2023). Abstracts or reviews only: Troy (1976), Best (1979), Guttman, Lewis and Rinzel (1980), Du and Hassard
  (2001), Labouriau (1985, 1989), Hassard and Shiau (1989), Shiau and Hassard (1991), Arioli and Koch (2015, with the
  start of Sect. 1), Czechowski and Zgliczynski (2016), van den Berg, Lessard and Queirolo (2021), Church and Queirolo
  (2024), Zgliczynski (2002); the title only: Hassard and Shiau (1996); not read: Lohner (1987), Krawczyk (1969),
  Moore (1977), Gershgorin (1931). Every background citation is recorded in RESEARCH.md with how far it was read
  (entries of 2026-09-25 to 2026-09-27, the last one written after the readings), and the manuscript's Section 10 and
  bibliography say the same. Still to read before "ready": Du and Hassard (2001) in full, Hassard (1978), Rinzel and
  Miller (1980), Labouriau (1985, 1989) and Hassard and Shiau (1989, 1991, 1996) in full, and Kuznetsov's book for
  the statement of the Hopf theorem that the Scholarpedia article summarizes.
- [ ] **5. Prior article review.** RESEARCH.md, entries of 2026-09-25 (survey and neuroscience scout), 2026-09-26 (the
  1952 constants; bistability at J = 8) and 2026-09-27 (prior articles for the manuscript; sources for its proofs; the
  entry written after the readings). After the claims reading, the novelty sentence claims no earlier proof found only
  of the unique equilibrium on a range of currents (asserted without proof by Guckenheimer and Labouriau, p. 941), of a
  stable periodic orbit of large amplitude away from the Hopf points, and of bistability; it claims no priority for
  Theorem 2 or Corollary 3, which Du and Hassard may contain. To do: obtain Du and Hassard (2001) in full, rerun the
  arXiv queries that the arXiv API refused on 2026-09-27, and read Labouriau and Hassard and Shiau in full.
- [x] **6. Adversarial second reading.** Three readings of the manuscript and its programs on 2026-09-27, made within
  the project by separate AI agents, each told to find errors and briefed with the paper and its programs: its
  mathematics (every written proof, the model against the 1952 equations, the code behind each computer-assisted
  step), its computations (reruns from copies, independent recomputations in mpmath and scipy of every number of the
  theorems, 15 mutations) and its claims and use of the literature. Each finding was then put to two further agents
  asked to refute it: 18 findings survived (5 must-fix, which name 4 distinct defects: the boxes of uniqueness in
  Theorem 5(c), the stability at the Hopf points in the abstract and introduction, the ball about E_l* rounded outward
  as a domain of validity, and the novelty sentence), 8 were refuted. Every must-fix finding is fixed, and every
  finding, with the skeptics' reasons for the refuted ones, is answered in `notes/referee-2026-09-27-analysis.md`,
  `notes/referee-2026-09-27-computation.md` and `notes/referee-2026-09-27-claims-literature.md`. The computation
  reading's reruns of `certify_equilibria_hopf.py` (changed on 2026-09-27) and `certify_bistability.py` (changed after
  the mutation reading of 2026-09-26) are the second reading of those program fixes. None of these readings is outside
  the project. Not read again: the fixes of this round and what they added (listed under item 1, and
  `code/identify_stable_orbit.py`, `code/numerics_h2.py`).
- [ ] **7. Reproducible.** The programs run from this folder with `code/requirements.txt`; their outputs are in
  `data/`, and `code/make_numbers.py` and `code/make_figures.py` rebuild every number, table and figure of the
  manuscript from them (the computation reading reproduced the generated block and the PDF text exactly). No companion
  repository yet.
