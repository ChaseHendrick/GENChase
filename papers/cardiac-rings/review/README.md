# Reviews

Copies of the in-project adversarial readings of the programs and lemmas this paper rests on, and of the manuscript. The canonical files
are in `research/cardiac-cycle-certificates/reviews/` of GENChase; they were copied unchanged on 2026-10-01. The manuscript reading was written for this folder. Each was
made inside the project by a separate AI agent session instructed to find errors. None is an outside review, and
none of the first six read the manuscript `paper/cardiac-rings.tex`, which was drafted after them; the two
`manuscript-reading-*` files are readings of the manuscript itself.

| File | What was read | Outcome |
|---|---|---|
| `fourier-stage1-review-2026-10-01.md` | `fourier/arbmodel.py`, `fourier/fourier_eval.py` and their tests | no way found for an output ball to miss its value; findings on tests and API, fixed |
| `stability-lemmas-review-2026-10-01.md` | `fourier/LEMMAS-stability.md` (Section 5 of the paper) | no error making a theorem false; three gaps (G1 tail feasibility, G2 radius, G3 far bound) and eight minor items, addressed in the lemma file |
| `stageE-existence-review-2026-10-01.md` | `fourier/existence.py`, its tests and records (Section 4) | no unsound finding; weak tests, one documentation gap, four minor items, addressed |
| `stageS-stability-review-2026-10-01.md` | `fourier/stability.py`, its tests and records | no unsound finding; one provenance gap, weak tests, five minor items, addressed |
| `fix-second-reading-2026-10-01.md` | the fixes to Stage E and Stage S | no fix unsound; records may be labelled as having passed in-project adversarial review; N1 to N4 open or minor |
| `verifier-review-2026-10-01.json` | the CAPD verifier `proofs/verify.cpp` (Theorem A(i)), five lenses | led to the hardening of the verifier and to the CAPD crossing patch |
| `manuscript-reading-1-2026-10-01.md` | the first draft of `paper/cardiac-rings.tex`, with `data/` and the review files | no false theorem; 6 errors (rounding and wording, E1 to E6), 6 gaps (G1 to G6), 4 citation items, one AGENTS.md item and exposition and typesetting items; all addressed in the draft of 2026-10-01 (list in `notes/QUALITY.md`, item 6), checked by the second reading |
| `manuscript-reading-2-2026-10-01.md` | the revised draft, its new passages and the link program (rerun) | nothing unsound; link confirmed; two wrong numbers (R1, R2), gaps R3 to R6, citations R7 to R9, exposition; all fixed |
| `fix-check-2026-10-01.md` | (record by the drafting session, not a review) | where each finding of the second reading is fixed |

The outcome for the Fourier route is recorded in `data/fourier-review-status.json`, outside the hashed records.
The paths in these files are relative to the canonical study folder, and "scratchpad" refers to the session
workspaces in which probes ran; those workspaces are not kept.
