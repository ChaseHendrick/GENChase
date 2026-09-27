# Referee report, 2026-09-27: the fixes of the fifth reading (sixth reading)

An in-project reading by a separate AI agent (a headless Claude session started for it), briefed only with the
programs and the manuscript as the fifth reader read them, the current versions, and the fifth reading's findings, and
told to find errors in every change between them. It was not allowed to run the certificate programs or the mutation
study. It is not an outside review. The report is reproduced verbatim.

---

# Report on the changes to hh-dynamics (code/ and paper/hh-dynamics.tex)

This reading was made within the project by a separate AI agent. It is not an outside review.

It covers only the changes between `previous/` and the current `code/` and `paper/`, as asked. The generated block, the "Runs" paragraph (Section 9) and the "What has been checked" paragraph (Section 10) were skipped.

## VERDICT

The code changes are correct. Each one does what its finding asked, and I found nothing that it breaks.

- **`initial_set_covers`:** it now decides containment exactly. It returned the expected answer in every test, including the cases the brief asked for:
  - thin sets at `arb('10.613')` and `arb('10.599')`;
  - a ball of radius 3e-26 like the one about E_l\*;
  - the piece ball;
  - one-ulp shifts;
  - the counterexample from the previous reading (centre 1 + 2^-100).

  I found no way for it to return True wrongly, or to return False at a call site in a correct run.
- **Manuscript:** the changes to lines 371, 382, 868, 872, 880 and 895 are true of the current code.
- **Open items:** there is no MUST-FIX. One SHOULD-FIX remains: the data-availability statement (SF-5 of the previous reading) is now a stronger claim, and it still cannot be verified from here. There are a few MINOR points.

## MUST-FIX

None.

## SHOULD-FIX

### S-1. The data-availability statement asserts a public repository and a release that cannot be verified here
**Where:** `paper/hh-dynamics.tex:994`

**What is wrong:** SF-5 asked the authors to confirm the repository before stating it, or else to go back to "planned". The new text goes further. It says the programs "are in the companion repository of this paper, https://github.com/ChaseHendrick/hh-dynamics, whose release 1.0.0 holds this version".

**Evidence:** both checks returned 403 through this machine's proxy:
- `curl https://api.github.com/repos/ChaseHendrick/hh-dynamics/releases/tags/v1.0.0`
- `curl https://github.com/ChaseHendrick/hh-dynamics`

Nothing in the material shows that the repository is public, that a release 1.0.0 exists, or that it matches `code/` and `data/`.

**Fix:** before submission, confirm all three facts and record the check, for example with the release tag's commit hash next to this version. Otherwise say the release is planned.

## MINOR

### m-1. The count of arXiv searches changed without a stated source
**Where:** `paper/hh-dynamics.tex:985`

**What is wrong:** "twenty-one searches … nineteen of them in the abstracts" became "twenty-five … twenty-three". No finding asked for this change, and the material holds no record of the searches, so I could not check it.

**Fix:** make sure the record of searches supports 25 and 23.

### m-2. The sentence in "Checks" reads as if the 0.5 bound were tested on the too-small box
**Where:** `paper/hh-dynamics.tex:895`

**What is wrong:** the sentence reads "the contraction test on a box too small to contain the fixed points, with the bound 1 replaced by 0.5 where …, and on the saddle orbit". These are three separate controls in `certify_bistability.py` stage 5:
- `box_factor` 0.3;
- `kappa_max` 0.5 on the normal box;
- the unstable orbit.

As written, the 0.5 test seems to belong to the small box. The wording before the change had the same ambiguity.

**Fix:** "the contraction test on a box too small to contain the fixed points; on the normal box with the bound 1 replaced by 0.5, where …; and on the saddle orbit".

### m-3. The printed lower bound can read "0.5000 > 0.5"
**Where:** `code/certify_bistability.py:413-417`

**What is wrong:** the check itself is exact (`Fraction > Fraction(1, 2)`). But `O.lo(norm_lo, 4)` rounds down. If 1/2 < norm_lo < 0.50005, the report would print "`>= 0.5000 > 0.5`", and `\CtlKappaLo` in the manuscript would become 0.5000.

**Evidence:** reproduced with `norm_lo = 0.50001` in `scratch/code/t_fmt.py`. This is cosmetic, and unlikely given norm_hi ≈ 0.544.

**Fix (optional):** print more digits, or print the exact comparison only.

### m-4. An exception before the hook is installed leaves no "STOPPED" line
**Where:**
- `code/certify_bistability.py:42-106`
- `code/identify_stable_orbit.py:31-91`

**What is wrong:** an exception raised before `sys.excepthook` is set gives no "STOPPED" line. Examples are an ImportError of flint, or an error in `ball_stable` at import. For `certify_bistability.py`, an error before `Log(OUT)` also leaves the previous report file untouched. In `identify_stable_orbit.py`, the report is written only at the end, so the old report stays in place.

This fails safe: the exit status is nonzero, and hh_make_numbers runs on the files. Still, the claim "stop at an exception with a line that says so" (tex 891, in the Ball arithmetic paragraph, which did not change) holds only after the start-up.

**Fix:** truncate the report, or install the hook, as the first statements. Or leave the code as it is and accept the point.

### m-5. The comment in line 4 of the .tex defines "the paper's folder" as the folder above `paper/`
**Where:** `paper/hh-dynamics.tex:4` (a comment only)

**What is wrong:** that is consistent with `../code` and `../data`, but "paper's folder" suggests `paper/` itself.

**Fix:** "relative to the project folder (the one that holds paper/, code/ and data/)".

## Each change, with its verdict

### Code

- **`certlib.initial_set_covers`: correct.**
  - *Structure.* It requires r = 0, an exact centre, and columns of C that are distinct exact unit vectors. The set is then exactly the product of the intervals `[xbar_i + (m_k - r_k), xbar_i + (m_k + r_k)]`.
  - *Exactness.* It forms these end points as Fractions from the exact mid and rad of the Arb balls (`outward._exact`), and compares them with the exact end points of `arb(z) + arb(0, r)` and of the parameter balls. There is no rounding anywhere.
  - *Construction.* `section_set` builds the r0 entries as `arb(0, r)` and `ball - ball.mid()`. Both are exact: the midpoint is 0 and the radius is copied. `LSet.from_box` keeps the centre exact and refuses a centre that is not. `poincare` returns S0 as the unmodified initial set: `S0 = S`, and LSet attributes are never assigned in place.
  - *Radius rounding.* For float centres, `arb(z, r)`, `arb(z) + arb(0, r)` and `arb(0, r)` give the same radius and the same exact mid. This held in 20,000 random cases.
- **The exception hooks in `certify_bistability.py:95-106` and `identify_stable_orbit.py:81-91`: correct.**
  - Both write "STOPPED: exception …", close or write the report, and call `sys.__excepthook__`, so the exit status is 1.
  - `T_START` and `log` are defined before the hooks.
  - The pool workers in `prove_piece` catch their own exceptions. A forked child inherits the hook but never calls it, since multiprocessing handles exceptions in the child itself. The report is flushed after every line, so no line is written twice.
  - The mutation study still classifies an exception as `exception`, because the hook prints no `[FAIL]`.
- **The checkpoint changes in `ball_stable.py`: correct.**
  - The digest now includes the versions of python-flint and FLINT (0.9.0 and 3.6.0 here).
  - It covers every project module a piece imports (ball_stable, certlib, hh_lohner, hh_arb, outward; grep of imports).
  - Pieces read back carry `from_checkpoint=True`, and the stage-4b line marks them "(read from the checkpoint)".
- **`hh_make_numbers.py:235`: correct.** It refuses a report if:
  - `BiCkpt` is not 0;
  - any line says "read from the checkpoint";
  - it contains "debug: numerics loaded" (the exact text at `certify_bistability.py:184`).

  The substring "read from the checkpoint" occurs in no other line of the report ("read **back** from the checkpoint" does not match).
- **The new line formats: correct.**
  - The stage-4b regex matches the new line, with and without the suffix, and captures the same seven groups.
  - The identification regex matches `piece_line`.
  - The cross-check `'    ' + ln + ', ' in committed` still holds for the new committed line.
  - `CtlKappaLo` matches the new control line exactly once, and the manuscript uses it.
- **Stage 5 κ = 0.5 control: correct.**
  - `Fraction` is imported.
  - `rk['norm_lo']` is a Fraction (from `lo_frac`), so the comparison is exact rational.
  - `infnorm_lower` is a valid lower bound for every member of the enclosure: it sums `|a_ij|.lower()` per row and takes the maximum over rows.
  - The `and` chain skips `norm_lo` when the run did not complete, which is when `norm_lo` is None.
- **Half-width printing in `identify_stable_orbit.py`: correct.**
  - `arb(0, r).rad()` is a 30-bit mag, so the conversion to a float is always exact.
  - The printed hex values are at least the radii. For example, 0x1.ef3d9418p-22 ≥ 0x1.ef3d94148p-22.
- **`mutation_study.py` sentinels: correct.**
  - The baseline stop now writes "STUDY STOPPED".
  - A "STOPPED: exception" detail no longer aborts hh_make_numbers.
  - "Full list of mutations: True" is written only when `--only` and `--no-baseline` were both absent, and hh_make_numbers requires it.
  - Every mutation's old text still occurs exactly once in the current code.
- **`certify_equilibria_hopf.py` docstring (M-5): correct.** E_l and J enter the vector field additively in u, so the derivatives do not depend on them.

### Manuscript

- **Line 371 (SF-4): fixed.**
- **Line 382 (M-3): fixed.**
- **Lines 868 and 880 (SF-1): true of the code.** The half-widths are printed exactly, and they are the radii rounded up to Arb's radius format.
- **Line 872 (M-1): true.** The quoted check name matches the code, and each piece line prints inside, covers and the norm bound.
- **Line 895 (SF-6): true of the code** ("every member of the enclosure of DP has ‖DP‖ ≥ \CtlKappaLo"). The wording issue is m-2.
- **Line 985:** see m-1.
- **Line 994:** see S-1.

## WHAT WAS CHECKED

All commands were run with `nice -n 19 timeout 600`, on copies in `./scratch/code`.

- **The diffs:**
  - `diff -ru previous/code code` and `diff -u previous/hh-dynamics.tex paper/hh-dynamics.tex`: every hunk was read.
  - A word-level diff of the .tex, made with difflib.
- **`scratch/code/t_cov.py`** (python-flint 0.9.0 / FLINT 3.6.0, `ctx.prec = 96`): every case gave the expected answer (37 of 37).
  - Thin E at 10.613 and at 10.599, C^0 and C^1: the exact box gives True; the point set against Z gives False; E at its midpoint gives False; the centre shifted by one ulp gives False; the E ball at half radius gives False; a larger E ball gives True.
  - A radius one float lower rounds to the same Arb mag and gives True, which is correct since the sets are equal.
  - A computed ball about E_l\* of radius 3.01e-26 gives True, both on Z and at the point.
  - The piece [10.59, 10.5905] gives True. Its midpoint gives False, and the box 1000 times smaller gives False.
  - An exact E gives True, and numpy float radii give True.
  - The previous finding's centre 1 + 2^-100 (built at 200 bits) against the point 1 gives False, where the old code gave True.
  - An r0 with nonzero mid gives False, and a larger radius gives True.
- **`scratch/code/t_fmt.py`:**
  - The copy of `arb_half_widths` gave exact float hex values.
  - In 20,000 random (z, r), `arb(z, r)`, `arb(z) + arb(0, r)` and `arb(0, r)` had equal radii and mid equal to z.
  - The stage-4b regex, the identification regex, the cross-check substring and the `CtlKappaLo` regex all matched lines produced by the new format strings.
  - `lo_frac(infnorm_lower(M))` is a Fraction.
- **A count of each MUTATIONS old text in the current files:** all equal 1.
- **The URL:** curl to the GitHub repository and to the release returned 403 for both.

## NOT CHECKED

- **The full programs.** I did not run `certify_bistability.py`, `identify_stable_orbit.py` or `mutation_study.py`, as the brief forbids it. The hooks, the checkpoint marking and the stage-5 control were checked by reading and by copies of small functions, not end to end.
- **The repository and its release 1.0.0** (S-1).
- **The record of arXiv searches** (m-1).
- **The skipped parts:** the generated block, Section 9 "Runs", and Section 10 "What has been checked".

---

## Response (the manuscript's writer, 2026-09-27)

No must-fix finding.

- **S-1. Fixed in the wording.** The data-availability statement now says that the programs "are published with this
  paper as its companion repository ..., whose release 1.0.0 is to hold this version". The repository is written by the
  project's publishing workflow when the paper's status becomes "ready", so it cannot be seen before.
- **m-1. Supported.** The research ledger (entry of 2026-09-27, "the arXiv and PubMed searches that failed in the
  morning") lists the 25 arXiv searches with their counts, 23 of them in the abstracts.
- **m-2. Fixed.** Section 7 lists the three contraction controls separately.
- **m-3. Moot.** A trial run of the fixed program then stopped at this control: the rigorous lower bound of
  ||DP_E||_inf over the enclosure is 0 on this piece (the enclosure of DP over Z x piece is too wide to bound the norm
  from below), so the claim "below the true bound" cannot be shown at all. The control now requires only what it
  shows, that the enclosure's upper bound (0.5439) does not meet 0.5, so that the piece must be refused although P(Z)
  lies in int Z and the runs cover Z x piece; Section 7 says so, and the report prints the upper bound only. This last
  change, a weaker condition in one negative control, was not read again; the committed run is of this version.
- **m-4. Accepted, and the sentence corrected.** Section 7 now says that the programs stop at an exception with a
  nonzero exit status and, once they have started, a line in their report that says so. An exception during the
  imports leaves no such line; `code/hh_make_numbers.py` reads only reports that end with the summary of a completed
  run.
- **m-5. Kept.** The comment reads "relative to the paper's folder (the folder that holds paper/, code/ and data/)",
  which names the folder.
