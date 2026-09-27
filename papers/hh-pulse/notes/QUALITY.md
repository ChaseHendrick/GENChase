# Quality record: The propagated action potential of Hodgkin and Huxley at their 1952 constants

The bar every paper in this repository meets before it is published or preprinted; see
`papers/minimal-winding/notes/QUALITY.md` for the full wording of the seven items. This file stays in GENChase.

## Record (2026-09-27)

- [ ] **1. Complete proofs.** The argument from the computed hypotheses (H1)-(H5) to Theorems 1 and 2, and Lemmas 1
  and 2, are written in Section 4 of the manuscript. Open: the validity of each step of the Lohner integrator (a
  priori enclosure, refined enclosure, remainder over subintervals, mean-value form, QR update) is stated in the
  program docstrings and summarized in the paper, and still has to be written out as a proof in an appendix; the
  continuity of the exit point uses the local unstable manifold theorem with parameters, which must be cited from a
  source that has been read, with its hypotheses checked.
- [x] **2. Rigorous computation.** Evidence: every proof step is ball arithmetic (FLINT/Arb via python-flint 0.9.0,
  256 bits; 128 bits for enclosures that only widen) in `papers/hh-dynamics/work/traveling-wave/code/`
  (`certify_rest_wave.py`, `block0.py`, `hhjet6.py`, `lohner6.py`, `prove_pulse.py`); each stage stops on a failed
  check; negative controls (a bracket above lambda_u, thinner Lemma B faces, an enlarged block, a shifted K interval,
  a perturbed alpha_m) run their own code and fail as they must; `block_check_iv.py` re-checks the block in mpmath
  interval arithmetic with independent code; `test_lohner6.py` tests the integrator with a negative control.
- [x] **3. Every claim labelled.** Evidence: the manuscript labels Theorems 1 and 2, Remark 1 and the rest state
  [Computer-assisted], Remark 2 [numerical, not proved], and lists what is not claimed; the README does the same.
- [ ] **4. Sources read.** Hodgkin and Huxley (1952) read on pp. 519-528 and Table 3 (the equations and constants
  the proof uses); Carpenter (1977) read in full; Hastings (1976) pp. 229-230 only; Arioli and Koch (2015) read in the
  parts cited. Open: a read source for the local unstable manifold theorem with parameters (item 1).
- [x] **5. Prior article review.** Evidence: RESEARCH.md entries of 2026-09-25, 2026-09-26 and 2026-09-27 and
  `papers/hh-dynamics/work/traveling-wave/prior-art-log.md` (A)-(J); the manuscript's priority statement is conditional
  and names what was not read (Hastings 1976 beyond pp. 229-230, Foote and Chen 1981) and that zbMATH Open has no
  review of either.
- [ ] **6. Adversarial second reading.** Open. So far only checks inside the session that produced the proof: the
  tests, the independent block program, the consistency of the rigorous and numerical values, and a rereading of the
  proof logic by the same agent. An independent reviewer told to find errors, briefed only with the paper and its
  programs, has not read it.
- [ ] **7. Reproducible.** The programs run from `papers/hh-dynamics/work/traveling-wave/code/` with python-flint
  0.9.0, numpy and scipy (manuscript, Section 7). Open: a `requirements.txt` for this paper, a companion repository,
  and `paper-check` and `paper-sync --check` for a release.
