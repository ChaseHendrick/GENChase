# Quality record: Minimal Winding in the Self-Similar Collapse of Point Vortices

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

## Record (2026-09-25, updated 2026-09-27 for release 2.2.0 and its third reading)

- [x] **1. Complete proofs.** Theorem 1 and Corollary 1 (three Euler vortices; Corollary 1 also has a direct proof
  from Lemmas 1 and 3), Theorem 2 with Remark 4 (the alpha-models, every alpha > -2), Propositions 1 to 4, Theorem 3
  (a strong vortex with weak tight pairs) and the lemmas are proved in the paper. Theorems 4 and 5 are
  computer-assisted (item 2). Release 2.2.0 (2026-09-27), the results of the retired identities note: the forms
  P = v + 1/(2v) and P - sqrt(2) = (sqrt(2) v - 1)^2/(2v), v = tan chi, the invariance under v -> 1/(2v), the angles
  of the minimizing triangle and the reduction to Groebli's coefficient in Remark 2; after Lemma 3, that Groebli's
  closed form gives P = |varkappa|/2 for every triple of circulations, which Lemma 6 at beta = 1 confirms by a
  direct computation (added after the third reading); the closed forms c_m of the critical
  cosines in Proposition 1 and its proof; the two examples with n = 2 after Proposition 3; the expansion
  F_n = (1/4) e^sqrt(n/2) (1 + 29/(12 sqrt(2n)) + 265/(576 n) + O(n^(-3/2))) in Section 5; and, in the Meaning and
  limits paragraph, the identification of the triple and the quartet of Chen, Walsh and Wheeler with members of the
  families of Propositions 1 and 2, the invariance of their non-degeneracy under similarities, a positive factor in
  the circulations and relabeling, and the analyticity argument that gives non-degeneracy on those arcs except at
  isolated angles; since the third reading the argument states the form of their map V (their Eq. (4.4)) and the two
  properties of it that it uses, real-analyticity and the behaviour under those symmetries. Each is proved in the
  text, with no new numbered environment.
- [x] **2. Rigorous computation.** Theorems 4 and 5 are proved by the Krawczyk operator in ball arithmetic
  (FLINT/Arb through python-flint, 320 bits) in `certify_collapses.py` and `certify_sqg60.py`, with negative controls
  in `certify_controls.py`; the resultants and sextics of Theorem 1 are exact (`verify_general_mu.py`), and so are
  the identities of the direct proof (`verify_direct_proof.py`). No step added in release 2.2.0 uses a computer;
  its additions are checked exactly and at 30 to 60 digits in `verify_general_mu.py` (checks 10j to 10m, 152 in
  all: the forms and angles of Remark 2; Groebli's Eqs. (8), (9), (11), (12) symbolically for (1, 1, -1/2) and for
  every triple of circulations that can collapse against Lemma 6 at beta = 1, with r_i^2 = lambda mu^G_i for lambda
  of either sign and Heron's formula factored in the side lengths, and under relabeling and a change of sign; against
  Biot-Savart for six values of mu and, since the fourth reading, on 188 triangles of 47 triples in random order and
  sign with a_G on both branches and the area taken from the coordinates; and on his example of Fig. 6, with the
  translation's misprinted denominator run through the same substitution and a wrong sign of his K as negative
  controls; the trigonometric roots of the cubic of Proposition 1, to the tolerances Table 1 states; and the triple
  of Chen, Walsh and Wheeler as the configuration theta = pi/2 of the family mu = 1/2, its center of vorticity, kappa
  and the Omega of their map V formed from their printed Omega and collapse time, V at the triple shifted to its
  center of vorticity and along A+, the unshifted triple and the printed real Omega alone as negative controls, V's
  behaviour under the symmetries, and, as a numerical observation at 30 digits that the argument does not use, the
  rank of D_Lambda V at 199 points of A+ and of the n = 2 arc) and in `verify_central_vortex.py` (part 8, 103 checks in all: the
  n = 2 examples and the quartet of Chen, Walsh and Wheeler exactly and against Biot-Savart, with their map V and with
  the quartet's misprinted position as a negative control; the series
  of E_n and of the F_n expansion with its coefficients 29/(12 sqrt 2) and 265/576; F_n at n = 10^k, k = 1..6, and
  n = 10^8, 10^12, where n^(3/2) times the remainder stays in [-0.28, -0.07]; and the coefficient 30 in place of 29
  as a negative control).
- [x] **3. Every claim labelled.** Section 7 separates the certified results (Theorems 4 and 5) from the numerical
  ones (N = 7 to 12, 33, 61 and 603, the two-arm family and its extrapolation), and the README does too. The
  release 2.2.0 additions are proved and are listed in Table 1 as checks of proved statements; the equality of
  the two constants kappa after Proposition 3 is stated as an observation about two formulas, not as a
  correspondence between motions; the result of Chen, Walsh and Wheeler is cited, not proved; the paper proves that
  the two configurations they verify are members of its mu = 1/2 and n = 2 families and deduces non-degeneracy on
  those arcs except at isolated angles, and it says that it has not checked the minimizers or the other families.
- [x] **4. Sources read.** The proofs are self-contained apart from standard tools (resultants, the Krawczyk test);
  the works credited in the Discussion are background, and RESEARCH.md records how far each was read. For
  release 2.2.0 (RESEARCH.md, log of 2026-09-27): Groebli 1877, Sect. 10, re-read in the original (BSB scan,
  printed pp. 55-59, all of Sect. 10: Eqs. (1) to (15) and the example of Fig. 6 on p. 59) and in Goodman's
  translation, arXiv:2404.01305v1, Sect. 10, pp. 36-39, which the bibliography cites, read in full a second time
  for the third reading to see whether it discusses an extremum of his coefficient (it does not); Chen, Walsh and
  Wheeler, arXiv:2506.04093v1 and Math. Ann. 396 (2026) 5, read for the abstract, Sect. 1, Sect. 4.1 (the map V of
  Eq. (4.4), Definition 4.1, Examples 4.2 and 4.3 with Eqs. (4.5) and (4.6)), Theorems 1.3 and 4.4 and Corollary
  4.6, not their proofs, the journal version (pp. 26-29 of 40) fetched and compared for the third reading: the same
  numbering and the same sign of the quartet's third position as v1; Sect. 4.1 of v1 re-read for the fourth reading:
  the triple of Example 4.2 is printed with its center of vorticity -2i/sqrt7, a real Omega = 35/(264 pi) and
  1/kappa = sqrt7/(132 pi), kappa being the collapse time, and their Lambda_0 is that triple shifted by its center of
  vorticity, with the Omega of V equal to Omega - i/(2 kappa) by the definition at the start of Sect. 4.1; the quartet
  is printed with its center of vorticity at the origin and with the Omega of V; the paper uses the form of V,
  Definition 4.1 and the two examples as stated there, and notes that sign; the parameters of Gotoda's
  Fig. 3(b) checked in arXiv:2002.09624v1, Sect. 3.2. Yudovich 1963, cited for the global existence of vortex
  patches, was not opened: it is cited as Chen, Walsh and Wheeler (Sect. 1, their ref. [53]) and the stable-expansion
  record of 2026-09-26 recall it, for bounded domains, with Crippa and Stefani, Calc. Var. PDE 63 (2024) 168,
  Theorems 1.6 and 3.3 (read on 2026-09-26), for the whole plane. The sentence is background, not a step of a
  proof.
- [x] **5. Prior article review.** RESEARCH.md: the final prior-article search of the pre-submission review (28 queries), the
  generalizations entry O and the owner-supplied full texts. The paper's novelty statements say "we have not found".
  Since the third reading of release 2.2.0 the statements that P has not been found minimized name Groebli's Sect. 10
  explicitly (Introduction, Discussion): read in the original, pp. 55-59, it gives varkappa, that is 2P, in closed
  form for every triple of circulations and describes the possible shapes, but does not discuss the extremum; this
  narrows the wording and adds no claim.
  Open: O'Neil, Regul. Chaotic Dyn. 12 (2007) 117-126 (four-vortex collapse configurations at a fixed rate) is
  unread (paywalled); it bears on the four-vortex minimum of Theorem 4 only. Release 2.2.0 adds no novelty
  statement: the sentence after Proposition 3 still says that the sources give the rates and none minimizes or
  bounds their ratio, now naming them, and the expansion of F_n carries no claim, since no prior-article search
  for it is logged. The identification of the Chen-Walsh-Wheeler configurations claims nothing new about them.
- [x] **6. Adversarial second reading.** Three independent reviews of the three-vortex paper (RESEARCH.md,
  "pre-submission review of the minimal-winding paper", 2026-09-25; mathematics re-derived, fixes applied). The parts
  added when the alpha-model draft was merged in had two further independent readings on 2026-09-25, each briefed
  only with the paper and its programs and told to find errors, each re-deriving the steps and rerunning every
  program. Reading A, Sections 4 and 5 (Lemmas 4 to 6, Theorem 2, Remark 4, Corollary 2, Propositions 2 and 3): no
  mathematical error; must-fix: Lemma 6 stated P = |S|/(8A) for expansions too (now stated for collapses, with the
  sign of Re kappa used), and Corollary 2 did not exclude a vortex starting at the collision point (now excluded:
  that would make the triangle collinear). Reading B, Sections 6 to 8 (Theorem 3, Proposition 4, Theorems 4 and 5 and
  the certificates): no mathematical error, the certificates rerun and pass; must-fix: the theorems the certificates
  rest on were neither stated nor cited (now stated, with Krawczyk 1969, Moore 1977, Rump 2010 Theorem 13.3 and
  Johansson 2017, the trust base and the balls for non-dyadic parameters), and the angular impulse was said to be
  proved by the program (it vanishes by Section 2; the program checks that its enclosure contains 0). Should-fix
  items applied: Lemma 4 and 5 proofs written out, the standing hypothesis alpha > -2 moved to the start of Section 4,
  notation clashes renamed (b to ell and q_0, t to s, u to v, beta_j to varrho_j, K to K_4), the directed extremal
  angle and its asymptotics, the Figure 3 range, the ring interchange's rescaling and root count, the Section 7
  equation count, coordinate-dependent eigenvalues, the second-order argument written out, the SQG control described
  correctly, "computed at 50 digits" for the non-certified collapses, 1.717, a rigorous sign check of the objective
  in certify_collapses.py part 5 (94 checks), the side ratio at Gamma = 0.49 solved exactly (0.7514840918), the
  subdivision count (336 leaves, 733 boxes), stale labels in verify_general_mu.py, and no run time in
  sqg60-certificate.json. Release 2.2.0 (2026-09-27): four in-project adversarial referee readings of the added
  passages (Remark 2, the statement and proof of Proposition 1, the expansion of F_n and the examples after
  Proposition 3 in Section 5, the new rows of Table 1 and the Meaning and limits paragraph; the fourth only of the
  newest of them), each told to find errors. None of them is an outside review. The first two, on 2026-09-27, were one of the mathematics and one of the claims
  and attribution, and their brief was wider than this item's wording: at least one referee, by its own account, was
  briefed with the branch as a diff against main (the paper, its programs and data, and the records moved from
  identities/), the AGENTS.md rules and the files of identities/, not only with the paper and its programs; the
  other's brief is not recorded beyond its subject. They raised 11 serious findings; an in-project skeptic re-checked
  each against the files and the sources, recomputing every number, and confirmed 10 and refuted 1. Must-fix, all
  fixed: this item had been ticked before those readings were recorded, and merging would have synced the unread
  additions to the public companion (found by both readings; fixed by recording them here); the Discussion credited
  the global existence of vortex patches only to a 2026 secondary discussion (now Yudovich 1963, with Crippa and
  Stefani 2024 for the whole plane). Should-fix, all fixed: the two configurations Chen, Walsh and Wheeler verify are
  members of the paper's mu = 1/2 and n = 2 families (now said and proved, with the misprint of their quartet, and
  non-degeneracy deduced on those arcs except at isolated angles); "n times the remainder at most 0.46" held only at
  the tested n (now the coefficient 265/576 is stated and proved, and the program checks the limit); the note's
  retirement and the deletion of its Zenodo metadata were presented as settled without an owner's decision (then
  marked pending everywhere; the owner decided the same day, so the retirement is now in effect by the owner's
  decision of 2026-09-27, and the records cite that decision); the Parallelogram and Quincunx plates printed the
  signed product (now |omega_0| t_c); the papers.json note was stale; identities/README.md misstated the
  fingerprints of the note's files. Refuted: that the note's Kimura erratum misstates note.typ (the note cites Kimura
  1987 only for the set-up, never Eq. (4.4); a clarifying parenthesis was added anyway). The nits that were plainly
  right were applied. Findings, verdicts and fixes: `notes/review-identities-2026-09-27.md`. The third reading,
  on 2026-09-27 after those fixes, was briefed only with the paper and its programs (it did not see notes/ or
  anything outside the paper's folder), re-derived every closed form of the additions independently, among them
  Groebli's coefficient for every triple of circulations through Lemma 6, and reran both programs. Verdict: minor
  revision, no must-fix. Its four should-fix findings are fixed: Groebli's Sect. 10 is credited as the first closed
  form of P for every triple of circulations (Section 2, after Lemma 3, Remark 2), and the statements that P has not
  been found minimized name it (Sect. 10, read again in the original, does not discuss the extremum); the notation
  clashes are removed (tan chi is v, Groebli's coefficient varkappa, his shape constant and parameters a_G and
  mu^G_i, and the expansion of F_n no longer uses c and sigma_n); the citation of Chen, Walsh and Wheeler names
  arXiv:2506.04093v1 as the numbering cited and says that the journal version has the same numbers and the same
  misprint; and the non-degeneracy argument states the form of their map V and the two properties it uses. Its eight
  nits are applied (the wording after Proposition 3, a sixth angle in verify_central_vortex.py so that two expand,
  tolerances matching Table 1, an exact test of cos theta_0 < 0, a negative control run through the substitution,
  the RELEASES.md wording on sources, the finite-core sentence stated as an expectation with the English translation
  of Yudovich 1963, and Remark 2 in three paragraphs). The fixes were checked by rerunning the two programs (145 and
  103 checks) and rebuilding the PDF (41 pages). Report, verdicts and the response to each finding:
  `notes/review-identities-3-2026-09-27.md`. The fourth reading, on 2026-09-27 after those fixes, was narrow: briefed
  only with the paper and its programs, it read the three newest passages (the paragraph on Groebli's closed form
  after Lemma 3, the passage on Chen, Walsh and Wheeler in the Discussion, and their checks in the two programs),
  re-derived Groebli's identity through Lemma 6 and the four symmetries of their map V in SymPy, checked 229
  Biot-Savart cases of its own, and reran both programs. It raised one must-fix and two should-fix findings, all
  fixed. Must-fix: the paper said that their printed Omega is i conj(kappa) for both of their examples, but their
  triple as quoted has its center of vorticity at -2i/sqrt7, so no Omega makes it a zero of V, and the Omega they
  print for it is real; the paper now starts from the triple shifted to its center of vorticity, as they do, with
  Omega = i conj(kappa) = (35 - sqrt7 i)/(264 pi) formed as in their Sect. 4.1 from their printed Omega and collapse
  time, and says that the printed Omega is i conj(kappa) for the quartet only; Table 1 matches. Should-fix: the check
  that 16A^2 equals the radicand compared a polynomial with itself reordered (now Heron's formula factored in the side
  lengths, symbolically, and the area from the coordinates on the Biot-Savart triangles); the Biot-Savart check
  labelled "every harmonic triple" covered only the normalized family (now also 188 triangles of 47 triples in random
  order and sign, and an exact check of relabeling and a change of sign). Its four nits are applied: the program forms
  the Omega of V from the printed values; a numerical rank check of D_Lambda V along both arcs, stated in the paper as
  an observation the argument does not use; "every triple of circulations that can collapse" in the Discussion; and
  "r_i^2 proportional to mu^G_i", with the factor of either sign. The fixes were checked by rerunning the two programs
  (152 and 103 checks) and rebuilding the PDF (42 pages); they were not given a further reading. Report, verdicts and
  the response to each finding: `notes/review-identities-4-2026-09-27.md`.
- [x] **7. Reproducible.** The programs in `code/` run from the companion (release 2.1.0,
  doi:10.5281/zenodo.22966989; release 2.2.0 is not yet made); `paper-check` and `paper-sync --check` pass
  (2026-09-27, after the fixes of the fourth 2.2.0 reading), and the stated counts are current: 42 pages, 43
  references, 152 checks in `verify_general_mu.py` and 103 in `verify_central_vortex.py`.
