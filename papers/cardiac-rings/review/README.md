# Reviews

Copies of the in-project adversarial readings of the programs and lemmas this paper rests on, and of the manuscript.
The readings of the programs and lemmas were made in the study the programs come from, whose records stay in the
project's development repository; they were copied here on 2026-10-01, and the two `alln-existence-*` files on
2026-10-02. The manuscript readings were written for this folder. Each reading was made inside the project by a
separate AI agent session instructed to find errors. None is an outside review, and none of the program readings read
the manuscript `paper/cardiac-rings.tex`; the two `manuscript-reading-*` files, the Appendix A reading and the third
reading of 2026-10-02 are readings of the manuscript itself.

| File | What was read | Outcome |
|---|---|---|
| `fourier-stage1-review-2026-10-01.md` | `fourier/arbmodel.py`, `fourier/fourier_eval.py` and their tests | no way found for an output ball to miss its value; findings on tests and API, fixed |
| `stability-lemmas-review-2026-10-01.md` | `fourier/LEMMAS-stability.md` (Section 5 of the paper) | no error making a theorem false; three gaps (G1 tail feasibility, G2 radius, G3 far bound) and eight minor items, addressed in the lemma file |
| `stageE-existence-review-2026-10-01.md` | `fourier/existence.py`, its tests and records (Section 4) | no unsound finding; weak tests, one documentation gap, four minor items, addressed |
| `stageS-stability-review-2026-10-01.md` | `fourier/stability.py`, its tests and records | no unsound finding; one provenance gap, weak tests, five minor items, addressed |
| `fix-second-reading-2026-10-01.md` | the fixes to Stage E and Stage S | no fix unsound; records may be labelled as having passed in-project adversarial review; N1 to N4 open or minor |
| `verifier-review-2026-10-01.json` | the CAPD verifier `proofs/verify.cpp` (Theorem A(i)), five lenses | led to the hardening of the verifier and to the CAPD crossing patch |
| `manuscript-reading-1-2026-10-01.md` | the first draft of `paper/cardiac-rings.tex`, with `data/` and the review files | no false theorem; 6 errors (rounding and wording, E1 to E6), 6 gaps (G1 to G6), 4 citation items, one AGENTS.md item and exposition and typesetting items; all addressed in the draft of 2026-10-01 (listed in the project's quality record, item 6, which stays in the development repository), checked by the second reading |
| `manuscript-reading-2-2026-10-01.md` | the revised draft, its new passages and the link program (rerun) | nothing unsound; link confirmed; two wrong numbers (R1, R2), gaps R3 to R6, citations R7 to R9, exposition; all fixed |
| `fix-check-2026-10-01.md` | (record by the drafting session, not a review) | where each finding of the second reading is fixed |
| `appendixA-reading-2026-10-02.md` | Appendix A (operators with compact resolvent) and its uses in Section 5 | no error; two gaps in the hand-off from Section 5 (G1, G2) and exposition items, fixed the same day |
| `alln-existence-review-2026-10-02.md` | `fourier/alln.py` (Theorem C), its tests, record and the parts of `branch.py` it calls; copied from the study | nothing unsound, no gap affecting the theorem, two pieces re-proved bit for bit; four weak tests (W1 to W4) and four minor items |
| `alln-existence-fixcheck-2026-10-02.md` | (record by the program's author, not an independent reading; copied from the study) | how W1 to W4 and M1 to M4 were fixed, no bound changed; tests 13 of 13 passed |
| `third-reading-2026-10-02.md` | the whole manuscript, including Theorem C (Sections 2.3 and 4.8), Appendix A and Remark 7.1, in five parts (existence proofs; stability proofs and Appendix A; numbers against the records; claims and sources; the CAPD argument and reproducibility), each finding checked by two further sessions; with a summary of a conformance audit against the released papers | no gap in the proofs; 47 confirmed findings (5 must, 21 should, 21 nit) on the record of checks, the trust base, rerun statements, citations and reading bases, and a few numbers rounded the wrong way; the file says how each was fixed (by the drafting session; the fixes have not been read by a further reader) |

The outcome for the Fourier route is recorded in `data/fourier-review-status.json`, outside the hashed records; it
covers Stage E and Stage S for N = 1, 8, 16, 32, 64, not yet the record of Theorem C.
In the readings of the programs and lemmas, paths are relative to the study folder, whose layout `code/` reproduces
(`fourier/stability.py` there is `code/fourier/stability.py` here, and the study's records in `results/` that this
paper uses are copied in `data/`); the manuscript readings use paths relative to this folder. "Scratchpad" refers to the session
workspaces in which probes ran, which are not kept. On 2026-10-02 the paths that pointed into the development
repository were shortened for this archive, and nothing else was changed:

- a path into this paper's folder is written relative to it: the first line of each `manuscript-reading-*` file,
  line 3 of `appendixA-reading-2026-10-02.md` and line 143 of `manuscript-reading-2-2026-10-01.md`;
- a path into the study folder is written relative to that folder: the four `location` fields of
  `verifier-review-2026-10-01.json` and the two absolute paths in its `why` fields (lines 220 and 225), whose `README.md` is the study's own, and line 142 of
  `manuscript-reading-2-2026-10-01.md`, which now says that the command ran in the study folder;
- line 28 of `fix-check-2026-10-01.md` names the two copies of `link_cell.py` as the study folder's `fourier/` and this
  folder's `code/fourier/`.

The other files are unchanged.
