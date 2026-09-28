# Quality record: The propagated action potential of Hodgkin and Huxley at their 1952 constants

The bar every paper in this repository meets before it is published or preprinted; see
`papers/minimal-winding/notes/QUALITY.md` for the full wording of the seven items. This file stays in GENChase.

## Record (2026-09-27)

- [x] **1. Complete proofs.** Evidence: Section 4 of the manuscript proves Lemma 0 (a cone condition gives the inertia
  of the rest state, so (H1) follows from (H2) without the Routh-Hurwitz criterion), Lemma 1 (the exit of the unstable
  branch from the box B and the continuity of the exit point in K, proved from the cone condition, the unstable
  manifold theorem without parameters and the continuity of the flow, instead of an unread parametric manifold
  theorem), Lemma 2 (the closing block), and Theorems 1 and 2 from the computed hypotheses. Appendix A proves the
  integrator's steps (a priori enclosure, Lagrange remainder on subintervals, mean-value form and the set update, the
  path enclosure) and states the rigorous tail bound for Psi near 0; Appendix B proves the one-variable interval Newton
  lemma used for the rest state, the interval Cholesky lemma and the cover of the block by cells. Found open on
  2026-09-27 and closed the same day: the continuity of p(K) (it cited a parametric manifold theorem that had not been
  read), the integrator lemmas (only described), the interval Newton and Cholesky facts (unproved), and the reliance of
  (H1) on the Routh-Hurwitz criterion (now an independent check that the proof does not use). This is the author's
  own check; item 6 is where it is tested.
- [x] **2. Rigorous computation.** Evidence: every proof step is ball arithmetic (FLINT/Arb via python-flint 0.9.0,
  256 bits; 128 bits for enclosures that only widen) in `code/` (`certify_rest_wave.py`, `block0.py`, `hhjet6.py`,
  `hhseries.py`, `lohner6.py`, `hh_prove_pulse.py`); each stage stops on a failed check; negative controls (a bracket
  above lambda_u, thinner Lemma B faces, an enlarged block, a shifted K interval, alpha_m perturbed away from rest) run
  their own code and fail as they must; `hh_block_check_iv.py` re-checks the block in mpmath interval arithmetic with
  independent code; `test_lohner6.py` tests the integrator with a negative control.
- [x] **3. Every claim labelled.** Evidence: the manuscript labels Theorems 1 and 2, Remark 1 and the rest state
  [Computer-assisted], Remark 2 [numerical, not proved], says which branch statement is numerical, and lists what is
  not claimed; the README does the same.
- [x] **4. Sources read.** Evidence: every source a proof step uses was read: Hodgkin and Huxley (1952) pp. 519-528 and
  Table 3 (the equations and constants), in a scan of the paper; Teschl, Ordinary Differential Equations and Dynamical
  Systems (AMS GSM 140, 2012), the statements cited (Corollary 2.15, Theorem 6.1, Lemmas 6.3, 6.5, 6.6, Theorems 9.4,
  9.5, and the Routh-Hurwitz statement of p. 72 for the unused check), read on 2026-09-27 in the author's preliminary
  version, which he makes available with the publisher's permission. Sources credited for the methods and the software
  (Lohner 1988, Wazewski 1947, Conley 1975 and 1978, Zgliczynski 2009, Johansson 2017, FLINT, python-flint, mpmath;
  and Carpenter 1976, listed next to Carpenter 1977; added on 2026-09-27 after review-1, S1; the papers' bibliographic
  data checked in Crossref or zbMATH Open, the software versions read from the installed packages) are not
  premises of any proof step, and the reference list says which were not read. Sources that bear only on earlier work
  or comparison and on no proof step: Carpenter (1977), read in full; Hastings (1976), pp. 229-230 only; Foote and Chen (1981), not
  read; Arioli and Koch (2015), read in the parts cited; Ikeda, Mimura and Tsujikawa (1987, 1989), abstracts; Huxley
  (1959), not read (cited only for what is not claimed). The manuscript says so in Section 1 and in the reference list.
- [x] **5. Prior article review.** Evidence: RESEARCH.md entries of 2026-09-25, 2026-09-26 and 2026-09-27 and
  `papers/hh-dynamics/work/traveling-wave/prior-art-log.md` (A)-(J), summarized in Appendix C of the manuscript. After
  review-1 (S2) the statement is only that the searches found no earlier proof, and the manuscript names the two
  papers that could not be obtained (Hastings 1976 beyond pp. 229-230, Foote and Chen 1981; the owner tried to obtain
  both) and that zbMATH Open has no review of either.
- [ ] **6. Adversarial second reading.** Open. So far only checks inside the session that produced the proof: the
  tests, the independent block program, the consistency of the rigorous and numerical values, the full rerun of item
  7, and a rereading of the proof by the same agent. An independent reviewer told to find errors, briefed only with
  the paper and its programs, has not read it.
- [ ] **7. Reproducible.** `code/requirements.txt` pins the versions; `code/run.sh` reruns every computation from
  scratch, one bounded process at a time. A first full rerun (`sh code/run.sh all`, started 2026-09-27 14:37 UTC from
  commit 391ae68, ended 18:41 UTC) printed `run.sh all: ALL AS EXPECTED`: the certificates of the two printed-leak
  proofs came out unchanged apart from run times, and those of Remark 1 changed only in the last digits of K1 and K2
  (8.0e-62), because the committed ones had been computed from an older numerical centre (REPORT.md 4.5 in
  `papers/hh-dynamics/work/traveling-wave/`). Pending: the review (`notes/review-1.md`) found that the 6.3 C runs used
  the binary temperature 6.29999999999999982 C (M1) and that `run.sh` could pass on stale certificates (M4); the item
  waits for the fixed programs and their rerun.
