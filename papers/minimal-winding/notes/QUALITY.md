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

## Record (2026-09-25)

- [x] **1. Complete proofs.** Theorem 1 and Corollary 1 (three Euler vortices; Corollary 1 also has a direct proof
  from Lemmas 1 and 3), Theorem 2 with Remark 4 (the alpha-models, every alpha > -2), Propositions 1 to 4, Theorem 3
  (a strong vortex with weak tight pairs) and the lemmas are proved in the paper. Theorems 4 and 5 are
  computer-assisted (item 2).
- [x] **2. Rigorous computation.** Theorems 4 and 5 are proved by the Krawczyk operator in ball arithmetic
  (FLINT/Arb through python-flint, 320 bits) in `certify_collapses.py` and `certify_sqg60.py`, with negative controls
  in `certify_controls.py`; the resultants and sextics of Theorem 1 are exact (`verify_general_mu.py`), and so are
  the identities of the direct proof (`verify_direct_proof.py`).
- [x] **3. Every claim labelled.** Section 7 separates the certified results (Theorems 4 and 5) from the numerical
  ones (N = 7 to 12, 33, 61 and 603, the two-arm family and its extrapolation), and the README does too.
- [x] **4. Sources read.** The proofs are self-contained apart from standard tools (resultants, the Krawczyk test);
  the works credited in the Discussion are background, and RESEARCH.md records how far each was read.
- [x] **5. Prior article review.** RESEARCH.md: the final prior-article search of the pre-submission review (28 queries), the
  generalizations entry O and the owner-supplied full texts. The paper's novelty statements say "we have not found".
  Open: O'Neil, Regul. Chaotic Dyn. 12 (2007) 117-126 (four-vortex collapse configurations at a fixed rate) is
  unread (paywalled); it bears on the four-vortex minimum of Theorem 4 only.
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
  sqg60-certificate.json.
- [x] **7. Reproducible.** The programs in `code/` run from the companion (release 2.0.0,
  doi:10.5281/zenodo.22963796); `paper-check` and `paper-sync --check` pass.
