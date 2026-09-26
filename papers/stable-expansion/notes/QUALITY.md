# Quality record: Stable Self-Similar Expansion of Four and Five Point Vortices and Confinement of Vortex Patches

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

- [x] **1. Complete proofs.** Lemma 1, Theorems 1 and 2, Corollary 1, Theorem 3, Corollary 2 and Proposition 1 are
  proved in the paper. Theorem 4 is proved in full in Appendix A (2026-09-26): Lemmas 3 to 8 and Propositions 2 and 3 (the
  long-time and short-time estimates) write out, for any number of patches, every estimate of Zbarsky's argument, with the other patches acting
  on a patch only through the strain of their field; two slips of his arXiv version are corrected there.
- [x] **2. Rigorous computation.** Theorems 1 and 2 by the Krawczyk test in ball arithmetic (FLINT/Arb) with enclosures
  of traces of powers of the Jacobian (`verify_stable_expansion.py`, 70 checks, 62 of them in ball or exact
  arithmetic, including two negative controls, an unstable four-vortex collapse and an unstable five-vortex collapse
  that the stability test must refuse, a Krawczyk test on a box without the zero that must fail, a positive
  three-vortex control, and positive controls of the five-vortex trace recipe on the four- and three-vortex
  matrices); the exact vanishing of the sum of pairwise products of the circulations in rational arithmetic.
- [x] **3. Every claim labelled.** The direct integrations and the random sample of Section 6 are labelled numerical
  in the paper and the README.
- [x] **4. Sources read.** Zbarsky, arXiv:1912.10862v2, read in full for the appendix (the epsilon-dependent
  estimates from the rendered PDF, since the text extraction drops every epsilon). The conservation of the
  pseudo-energy is now proved in the paper (Lemma 6, 2026-09-26) from the properties of Yudovich solutions, which
  are cited to sources read at the places checked: Crippa and Stefani, Calc. Var. PDE 63 (2024) 168 (arXiv:2110.15648),
  Theorems 1.6 and 3.3, Definition 3.2 and the proof of Theorem 3.3, for the whole plane; Ambrose, Kelliher, Lopes
  Filho and Nussenzveig Lopes, J. Differential Equations 259 (2015) (arXiv:1401.2655v1), Remark 2.4, for the
  measure-preserving flow. Marchioro and Pulvirenti (1994), unread, is no longer cited. Yudovich (1963) treats bounded
  domains and is cited for the theory's origin only. Kallyadan and Shukla (2022) is background only (abstract read; by
  the owner's decision of 2026-09-25 its full text is not read).
- [x] **5. Prior article review.** RESEARCH.md, entries of 2026-09-25 ("prior article review for the stable-expansion note" and "nonlinear
  stability and vortex patches"); Leoncini, El Kettani and Ugalde, arXiv:2609.25989, read in full and cited.
- [x] **6. Adversarial second reading.** Two second readers read Sections 4 and 5 (Theorem 3, Proposition 1 and the
  first version of Theorem 4), and their fixes are in (CHANGELOG 0.7.0). A third independent reading of Section 5 and
  Appendix A (2026-09-26), briefed with the paper and Zbarsky's arXiv version and told to find errors, found no gap;
  its must-fix items (a constant in the geometric bound, one slip wrongly attributed to Zbarsky, a LaTeX error) and its
  should-fix items (the C^1 regularity of the centres, the bootstrap at T_*, the count of turns, the chi conditions,
  notation) are fixed. Lemma 1 and Theorems 1 and 2 with their certificates (2026-09-26): an independent reading,
  briefed only with the paper and its programs and told to find errors, re-derived the steps and reran the programs;
  verdict sound with fixes. Must-fix: the exact values Gamma_4 = -4/5 and Gamma_5 = 47/35 rested on enclosures
  containing them (now proved exactly: at every zero the sum of pairwise products of the circulations vanishes, from
  the gauge equation with factor 2P - i), and the proof did not say what the Krawczyk test certifies (now: the
  unknowns, the maximum-norm boxes with uniqueness radii 1e-4 and 1e-5, and the tight enclosures on which every later
  quantity is evaluated). Should-fix items applied: the eigenvalue -2 is a single 2x2 Jordan block; the five-vortex
  trace recipe written out; checks that hold for every configuration labelled regression tests; notation; the
  controls described exactly, with a new five-vortex negative control; the abstract's sample counts; program hygiene.
  The fixes were then checked by three further independent readings (mathematics, program, text), each told to refute
  them: no must-fix; the mathematics re-derived in SymPy and 80-digit mpmath, the Krawczyk radii reproduced by separate
  code, the program's output byte-identical on rerun. Their should-fix items are applied: notation in the pairing
  argument and the summation index, the signed P, the side conditions listed in full, the controls' wording, b'(0)
  cited where it is proved, and three program controls that mutation tests showed were missing (a positive control of
  the five-vortex recipe, one shared stable5 test that the negative control runs, and a Krawczyk run that must fail,
  with the radii asserted); 70 checks. The owner signed off on this record on 2026-09-26.
- [x] **7. Reproducible.** `verify_stable_expansion.py` (70 checks) and `survey_expansions.py`; `paper-check` passes;
  20 pages.
