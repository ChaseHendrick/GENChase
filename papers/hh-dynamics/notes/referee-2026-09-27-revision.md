# Referee report, 2026-09-27: the revised parts (fourth reading)

An in-project reading by a separate AI agent (a headless Claude session started for it), briefed only with a copy of
`paper/`, `code/` and `data/` at c47296c (no `notes/`, no research ledger, no git history) and told to find errors in
the parts revised after the three readings of the morning: Theorem 5(c) and Tables 3 to 5, the abstract's stability
statement, Theorem 5's domain at E_l*, the novelty sentence, Theorem K and Lemma 5.9, Lemmas 5.6 to 5.8, 5.12 and
5.13, the Lohner set invariant, Corollary 7 with `code/identify_stable_orbit.py`, Remark 3.1 and `code/numerics_h2.py`.
It was not allowed to run `certify_bistability.py` or `identify_stable_orbit.py` (the machine is shared and they were
to be rerun separately). It is not an outside review. The report is reproduced verbatim; its line numbers refer to the
manuscript at c47296c.

---

# Report on hh-dynamics.tex (revised parts), with code/ and data/

This reading was made within the project by a separate AI agent. It is not an outside review.

## VERDICT

**Minor revision.** I found nothing that makes a stated theorem false or unsupported. The revised parts hold up against the code, against the committed outputs and against Rump's own text. What remains are some overstated box sizes, references to material that is not in the released folder, wrong file names in the reproduction instructions, and weak negative controls.

## MUST-FIX

None found.

## SHOULD-FIX

**S1. The uniqueness boxes are described by one "radius", but they are not cubes** (Theorem 5(c), line 532; proof of 5(c), line 868; Theorem 4, line 522; Table 5 caption, line 559).

- **What is wrong.** Theorem 5(c) says the section point of Γ_u is "the only fixed point of the first-return map in a box of radius about 10^{-14} to 2·10^{-14}". Theorem 4 says "in a box of radius about 4.6·10^{-7}". Both numbers are only the largest half-width. The boxes on which Krawczyk or the contraction is actually proved are narrower in the other coordinates.
- **Evidence.**
  - `data/certify_bistability.txt` line 160 (Γ_u, E_l = 10.613): `C^1 run over Z (radius [2.03e-15 3.29e-15 2.13e-14])`.
  - Line 201 (E_l*): `[1.00e-15 1.64e-15 1.08e-14]`.
  - Line 242 (E_l = 10.599): `[1.94e-15 3.27e-15 2.13e-14]`.
  - For Theorem 4, `data/identify_stable_orbit.txt` lines 50, 58, 66, 74 give box half-widths of about (4.6e-7, 2.3e-7, 4.0e-7). Stage 4b prints `box radius ~4.6e-07` = `max(r['zr'])` (`certify_bistability.py` line 273).
  - A reader who takes "a box of radius 2·10^{-14}" as a cube gets uniqueness claimed in m and n on a region 6–10 times wider than proved. For Theorem 4 the overstatement is 2 times in n.
- **Fix.** Give the half-widths per coordinate (m, n, h), or write "a box with half-widths at most …". The stable-orbit boxes at 1e-15 (1.00, 1.00, 1.21–1.22)·10^{-15} are fine as stated.

**S2. The claims and checks refer to material that is not in the paper's folder** (Section 1, line 382; Section 8, line 920; Section 9, line 984; Section 10, line 988).

- **What is wrong.** The novelty sentence is said to be "limited by the searches behind them, which are recorded in the project's research ledger (entries of 2026-09-25 to 2026-09-27) and summarized in Section 9". There are two problems:
  - Section 9 does not summarize the searches. It lists what was read, and says only that the arXiv and PubMed searches of 2026-09-27 could not be run. It never says which searches did run (databases, terms).
  - The ledger, `notes/referee-2026-09-27-*.md` (line 984) and `work/chaos/` (lines 920, 988) are all described as being "in the folder of this paper". The folder, as released and as the Data-availability statement describes it (line 991), holds only `paper/`, `code/` and `data/`.
- **Consequence.** A reader cannot check the scope of the priority statement, the responses to the earlier readings, or the chaos numerics cited in Section 8.
- **Wording of the novelty claims.** Otherwise it is consistent with what the paper says was read:
  - The G&L (read in full) and Hastings quotations support "stated without proof".
  - Du–Hassard, Hassard 1978 and Rinzel–Miller are correctly marked as unread, or read only in part.
  - No priority is claimed for Theorem 2 or Corollary 3.
- **Fix.** Add to Section 9 a short list of the searches that ran (service, terms, date), or drop "summarized in Section 9". Either ship the ledger, notes and work/chaos material, or stop describing them as being in the folder.

**S3. The reproduction commands and figure captions name files that do not exist** (lines 508, 590, 958, 959).

- **What is wrong.** Section 7 says to run `python3 code/make_numbers.py` and `python3 code/make_figures.py`. The captions of Figures 1 and 3 cite `code/make_figures.py`.
- **Evidence.** The files are `code/hh_make_numbers.py` and `code/hh_make_figures.py` (`ls code/`). The tex header comment (lines 2–3) and line 893 already use the right names. The printed commands fail as written.
- **Fix.** Rename in the text.

## MINOR

**M1. The negative controls of Corollary 7 are real but far from the margin** (proof, line 880; `identify_stable_orbit.py` lines 218–224).

- Each control tests K against the box of a piece ≈ 28 pieces away. There K is 10.0–10.4 box radii off (I recomputed 10.001 in h for 10.599, 10.06 for E_l*), so "at least 10 box radii" is true.
- These controls do call the real `k_in_box` and `in_piece`, but they would pass even if the test were loosened: for example `contains` instead of `contains_interior`, or radii scaled wrongly by any factor below about 10.
- Suggested extra control: the true piece's box shrunk to 0.1 of its radii. The centre of K sits at 0.12–0.18 radii from the box centre, so that inclusion must fail.

**M2. The "pieces" are Arb balls, not decimal intervals** (proof of Theorem 4, line 872).

- `prove_piece` works on `arb(lo).union(arb(hi))`, which is slightly wider than [lo, hi] (radius about 5e-29). That only strengthens the result.
- "When E_l is the common end of two pieces, either box serves" is right for existence. It is not shown that the two boxes hold the same fixed point, except at 10.613 and 10.599, where Corollary 7 does show it. The chosen convention (take the left piece) makes Γ(E_l) well defined, so this is wording only.

**M3. Page numbers and cited content.**

- Rump's Theorem 13.3 is cited at "p. 89" (line 982). That is the page in the author's preprint. The journal version is Acta Numer. 19, pp. 287–449, so either cite the theorem number alone or give the journal page.
- "Guckenheimer and Worfolk [p. 23]" (lines 371, 441) is an arXiv page. The bibliography gives the chapter as pp. 241–277.
- hs1996 is cited (line 371) for isolated branches of periodic solutions computed by "purely numerical techniques", although the paper says only its title was read. Cite hs1989 and sh1991 alone for that.

**M4. "Independent reading"** (lines 911, 966) is used for readings made within the project by AI agents. Section 9 explains this, but using the same wording in Sections 6 and 7 would avoid a misreading.

## Parts checked and found correct

1. **Item 1 — Theorem 5(c) and Tables 3–5.** Uniqueness is claimed only in the Krawczyk boxes Z. Table 5 is presented as enclosures (outward roundings of K), and its caption's "10^2 to 10^4 times narrower" checks out: the table width is 1e-11 against box widths of 2e-15 to 4.3e-14, a ratio of 2.3e2 to 5e3. Every entry of Tables 3, 4 and 5 matches the balls in stages 4 and 7 after outward rounding (checked row by row). The quoted box radii (\SboxRad*, \UboxRad*) match stage 4. The only caveat is S1.
2. **Item 2 — the abstract's stability statement** matches Theorem 2(a),(b) and its proof (Lemma 4.1 with a1, a3, a4 > 0 on [-12, 115]). The checks of Lemma 4.1's proof hold, including the example λ⁴+2λ³−λ²+2λ+1 with D3 = −12.
3. **Item 3 — the E_l balls are as stated.**
   - The E_l* ball has radius 3.10·10^{-26} (below 1e-25). Arb's printed ball [10.5989209693916785221988785 ± 6.21e-26] contains it, and it in turn contains the 256-bit enclosure of E_l*.
   - `arb('10.613')` and `arb('10.599')` at 96 bits have radii 5.0e-29 and 6.0e-29 (below 1e-28).
   - `section_set` carries the whole ball as a Lohner direction (r0 = ball − mid), so the statements hold on the full ball.
4. **Item 5 — Theorem K and Lemma 5.9.**
   - Theorem K is Rump's Theorem 13.3 verbatim (checked in the text of Ru10.pdf), including the closing injectivity remark.
   - Lemma 5.9's proof is complete. Existence comes from Theorem K. The zero lies in K because z̄ + S ⊂ K by the inclusion property. Uniqueness in the whole box follows from the mean-value matrix, which lies in the entrywise hull.
   - `certlib.krawczyk` computes exactly the stated K, with R = inv(mid(DP(Z)) − I) and the same Z as the C¹ run.
5. **Item 6 — Lemmas 5.3, 5.5, 5.6, 5.12 and 5.13.** The proofs are sound. Every application checks that the fixed point is interior to the box the program uses: K ⊂ int Z in Theorem 5, and P_E(Z) ⊂ int Z in Theorem 4. That makes the program's first-hit map equal to the local return map. The code's step types (D), (N), (P), (H), including the "approach" and "extend" branches, match Lemma 5.2.
6. **Item 7 — the Lohner invariant.**
   - `LSet.from_box` sets r = 0 and r0 = `arb(0, r)` or `ball − mid`.
   - `advance` sets `z = Z − Z.mid()` and `rn = (Binv*A)*r + Binv*z`, so 0 ∈ r′ by induction.
   - r0 is never changed. So x̄ ∈ hull, and Lemma 5.3 applies with the centre.
7. **Item 8 — Corollary 7 program.**
   - `identify_stable_orbit.py` checks that the ball of each value lies in the piece ball that `prove_piece` uses. It covers every piece containing the value (2, 1 and 2 pieces).
   - It checks `contains_interior` of K against exactly the box used in the proof, and re-proves P_E(Z) ⊂ int Z and ‖DP‖∞ < 1 on those pieces.
   - The proof of Theorem 4 defines Γ(E_l) in those pieces from these printed boxes, which is consistent. Caveats are in M1 and M2.
8. **Item 9 — Remark 3.1 and Section 8.** Remark 3.1 follows from the checks in part A: J_ss ≥ 36·n∞(115)⁴·127 ≥ 4089.48 for u ≥ 115, J_ss′ > 0 on [-12, 115], and J_ss(-12) < 0, together with the signs in part B. The numbers in Section 8 match `data/numerics_h2.txt`: ratios 14.42, 14.36, 14.32; multipliers ≤ 0.987 (printed 0.986824); the extrapolation through the last two points is 14.2927, printed 14.29. The frequency bounds 62.445 and 62.478 Hz and the Table 6 ratios also check. Nothing is stated beyond what is computed.
9. **Section 7 claims.** The SHA-256 prefixes in Section 7 all match the files. The `--no-ball` rerun differs from the committed output only in stage 4b, the ledger count (144 against 333), the summary and the check counts, as `\RerunText` says.

## WHAT WAS CHECKED AND NOT CHECKED

Commands, all run with `nice -n 19 timeout 600`, one process at a time, on copies in `./scratch/`:

- **`python3 code/certify_equilibria_hopf.py`** (scratch copy): 38 checks, 0 failed, 10.2 s. Its output is identical to `data/certify_equilibria_hopf.txt` apart from run times (`diff` after filtering time lines).
- **`scratch/elball.py`** (python-flint at 96 bits):
  - E_l* ball radius 3.1009e-26.
  - `arb('10.613')` radius 5.01e-29; `arb('10.599')` radius 6.02e-29.
  - The 256-bit E_l* enclosure lies inside the 96-bit ball: True.
- **`scratch/transv.py`** (mpmath at 40 digits, my own model and finite differences):

  | Hopf point | Re dλ/du | dJss/du | Re dλ/dJ | J_H |
  |---|---|---|---|---|
  | H1 | 0.05019086897 | 2.671281689 | 0.01878905889 | 9.775437995393126 |
  | H2 | −0.08240867284 | 18.34451286 | −0.004492279161 | 154.522433665808 |

  These agree with Theorem 2(c),(d). The factor-2 mutation mentioned in Section 6 is therefore not present in the committed values.
- **`diff`** of `data/certify_bistability.txt` against `data/certify_bistability_no_ball_2026-09-27.txt`: only the expected differences (item 9 above).
- **`sha256sum`** of the 15 listed files: all prefixes match the table.
- **Rump (2010):** downloaded `Ru10.pdf` from tuhh.de and read Section 13 (Theorems 13.1–13.3 with their proofs).
- **Code read:** `certify_bistability.py`, `certlib.py`, `hh_lohner.py`, `ball_stable.py`, `identify_stable_orbit.py`, `numerics_h2.py`.

Not checked:

- **Not run, as the brief requires:** `certify_bistability.py` and `identify_stable_orbit.py`. Their committed outputs were taken as given.
- **Not read:** `hh_arb.py` (the model at 96 bits) and `hh_ball.py`, beyond the E_l* computation; `outward.py`; `tests_integrator.py`.
- **Not re-verified:**
  - Kuznetsov's Scholarpedia statement (Theorem H), which is outside the listed items.
  - Lemma 3.3's proof (a psi-series lemma).
  - The literature search itself.

---

## Response (the manuscript's writer, 2026-09-27)

No must-fix finding. Every should-fix and minor finding is applied; none was put to skeptics, since each is a
correction of wording, of a file name or of a control, checked directly against the files.

### Should-fix

- **S1. Fixed.** Theorem 4 now says "a box with half-widths at most about 4.6e-7", and Theorem 5(c) "a box with
  half-widths at most about 1.21e-15" (Gamma_s) and "from about 2.03e-15 to 2.13e-14" (Gamma_u), at E_l = 10.613,
  with the other two values in the proof of 5(c), which now lists the largest half-widths of both boxes and the
  smallest of the saddle's. The numbers are generated from the stage-4 lines "C^1 run over Z (radius [...])" by
  `code/hh_make_numbers.py` (new macros `\UboxRadMin*`). The proofs of Theorems 4 and 5 say "half-widths" throughout.
- **S2. Fixed.** Section 10 now lists the searches themselves (services, queries, dates; "Other sources, and the
  searches"), and the introduction points there instead of to the research ledger. The pointer to
  `notes/referee-2026-09-27-*.md` is removed from the manuscript (the notes stay in GENChase and are not released).
  The data-availability statement now names the companion repository and says that its `work/` holds numerical studies
  in progress that are not part of the paper, so the pointers to `work/chaos/` in Sections 8 and 11 point to files that
  the release contains.
- **S3. Fixed.** Section 9 names `code/hh_make_numbers.py` and `code/hh_make_figures.py`, and so do the captions of
  Figures 1 and 2.

### Minor

- **M1. Fixed.** `code/identify_stable_orbit.py` has a new negative control: K of each value against the box of its own
  piece with the half-widths shrunk to 0.1 (the centre of K is 0.12 to 0.18 half-widths from the centre of the box),
  which must fail. The mutation I1 of `code/mutation_study.py` (the inclusion tested against a box with five times its
  half-widths) is caught by it. The proof of Corollary 7 reports the control.
- **M2. Fixed.** The proof of Theorem 4 says that each piece is carried as Arb's ball of [lo, hi], which contains the
  decimal interval, and that when E_l is the common end of two pieces each box holds exactly one fixed point, Gamma(E_l)
  is taken from the left piece, and at 10.613 and 10.599 the two fixed points coincide by Corollary 7.
- **M3. Fixed.** Rump's theorem is cited by number (the page 89 was that of the author's version); Guckenheimer and
  Worfolk's page is given as p. 23 of the arXiv preprint; the introduction no longer cites Hassard and Shiau (1996),
  of which only the title was read, for "purely numerical techniques", and mentions it only for its subject.
- **M4. Fixed.** Section 7 now says "in-project reading"; the paragraph "Runs" of Section 9, which said "independent
  reading", is rewritten.
