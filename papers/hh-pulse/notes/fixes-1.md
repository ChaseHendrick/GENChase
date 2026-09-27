# Fixes for referee report 1

This file answers `notes/review-1.md`, the in-project adversarial reading of 2026-09-27. It lists each item, what was
done and the commit that did it, or why nothing was done. No outside review has taken place. Quality item 6 stays
open until the reviewer has checked these fixes.

Commits, all on branch hh-pulse, 2026-09-27:

- 00ee62c: the Remark 1 certificates of the first full rerun, and the first corrections of quoted values.
- e86e2c8: M1.
- 3a0c7b1: M4.
- 5efe380: the programs renamed; the summary recomputes verdicts.
- 05a740b: the text fixes.
- RERUN_COMMIT: the certificates of the rerun of the fixed programs, Theorem 2 restated, and the tables.

## Must-fix

- **M1, the temperature (e86e2c8).**
  - Every program now takes the temperature as the decimal string typed on the command line and passes it to
    `certify_rest_wave.phi_of`. `temperature()` checks that the string is a plain decimal number. A float given to
    `phi_of` is read through `repr`, so 6.3 means the decimal 6.3.
  - At 18.5 C the phi ball is bit for bit the old one, because 18.5 is a binary number.
  - `hh_block_check_iv.py` computes phi from the string too (`phi_iv`).
  - The configuration records the decimal temperature and the phi ball, and so does every certificate (3a0c7b1).
    The summary checks that phi encloses 3^((T - 6.3)/10) for the decimal temperature, recomputed at 512 bits.
  - `test_temperature.py` is the regression test, run by `run.sh tests`. Its negative control is the old float path,
    whose phi excludes 1.
  - The 6.3 C proof was rerun from scratch with the fixed programs (RERUN_COMMIT). Theorem 2, the abstract, README and
    RELEASES quote the new digits.
- **M2, max u (00ee62c, 3a0c7b1).** Theorem 1 says max u > 90.57 mV, and 90.578 is certified. The bound is now
  rounded down explicitly before it is stored.
- **M3, numbers not in the certificates.**
  - 00ee62c corrected the values of the Section 5 tables: lambda_u, the entry time of K1, the 6.3 C bound 0.45631,
    and the run times.
  - 5efe380 added `code/tables.py`. It generates the table rows and the quoted theorem values from the
    certificates, and `--check` requires each of them to appear verbatim in the manuscript.
  - RERUN_COMMIT regenerated the tables from the new certificates, and `tables.py --check` passes.
  - "zeta_1 = -86" had no certificate and is dropped. What remains is the difference of the two recorded 6.3 C
    centres, `hp_pulse_6.3_El10.613_tol1.json` and `hp_pulse_6.3_El10.613.json`.
- **M4, stale certificates (3a0c7b1, 5efe380).**
  - `run.sh` first deletes everything an earlier run of the proof wrote, by exact names. It stops the proof when a
    stage that must pass exits with a status other than 0, and it requires each negative control to exit with status
    1, a written FAIL verdict.
  - `hh_prove_pulse.py` exits with status 2 on any error, a failed check included.
  - Every certificate records the sha256 of the configuration, the closing block and the eight programs, the
    python-flint version, and the phi and E_l balls. The checkpoint key includes the code and block hashes.
  - The summary refuses any certificate whose provenance or K differs from the current one. It also refuses a
    negative control that failed for a reason other than its stated one. After the code round, it recomputes each
    verdict from the certificate's own fields (5efe380).
  - `summary-control` plants 13 kinds of stale, foreign or self-contradictory certificate. The summary must refuse
    each of them and accept the unaltered copy. It runs after every summary.

## Should-fix

- **S1, credit the methods and the software (5efe380, 05a740b).** Lohner 1988 (his dissertation: the Teubner chapter
  of 1987 could not be verified in Crossref or zbMATH Open, so it is not cited), Wazewski 1947, Conley 1975 and 1978,
  Zgliczynski 2009, Johansson 2017, FLINT 3.6.0 through python-flint 0.9.0, mpmath 1.3.0, and Carpenter 1976 in
  Section 6. Each is marked as not a premise of the proof.
- **S2, the priority statement (05a740b).** Hastings 1976 and Foote and Chen 1981 cannot be obtained; the owner
  tried. So they were not read. The paper now says only that the searches found no earlier proof, and it names the two
  papers that could not be obtained, in Section 1, Appendix C, README and RELEASES.
- **S3, the integrator test's reference (e86e2c8, 3a0c7b1, 05a740b).**
  - `test_lohner6.py` no longer calls its reference independent.
  - The new `test_field.py` compares the field with an independent transcription of the 1952 equations in their sign
    convention: 5.2e-60 at 64 states, and its control (V_K = -12) is caught.
  - README and RELEASES are reworded.
- **S4, the model control (05a740b).** Section 5 now says that (H1) and (H2) are re-checked and that (H3) changes by
  about 1e-12 and is not re-checked.
- **S5, the licence (05a740b).** Done as for the other papers with a companion (minimal-winding,
  collapse-without-rotation, stable-expansion). None of them keeps a LICENSE file in its folder. `tools/paper-sync.js`
  writes the LICENSE with both texts into the companion repository. The README now says so and points to NOTICE here.
  `tools/release-assets.py` attaches programs and data only, so it needs no licence file.
- **S6, Lemma A.1 (05a740b).** It is now stated for the five moving components at each fixed K. A note says the
  program checks the same.
- **S7, Lemma A.3 (05a740b).** The invariant that R0 and R contain 0, which puts xbar in [X], is stated and proved.
- **S8, (H2)(i) (05a740b).** It now cites Gershgorin's bound, Lemma B.5, which is added with its proof.
- **S9, limit sets (05a740b).** Lemma 1(b) and Lemma 2 now add the compactness step.

## Minor

- **m1 (05a740b).** K = 10.47 gives 18.76 m/s, which they report as 18.8 m/s.
- **m2 (05a740b).** The change of sign convention is now described correctly.
- **m3 (05a740b).** rho and r are binary floats, and the paper gives their exact values.
- **m4 (05a740b).** The title of Czechowski and Zgliczynski is corrected, with doi:10.1137/15M1007707.
- **m5 (e86e2c8, 3a0c7b1).** The docstrings of `certify_rest_wave.py` and `hh_prove_pulse.py` now match the paper.
  This covers the printed leak potential, the hypotheses (H1) to (H5) and the factor 1 + 1e-12 (u - u*)^2.
- **m6, consistency (RERUN_COMMIT).** The paragraph now uses the printed-E_l runs of the theorems, from their
  certificates.
- **m7 (e86e2c8).** `hh_block_check_iv.py` checks that its bisection zero lies within the window where Lemma B.1
  proves uniqueness. The check applies for HH_EL = 10.613; for the zero-current case rest is exactly u = 0.
- **m8 (e86e2c8).** The negative control of `hh_block_check_iv.py` now uses the depth limit of the check itself.
- **m9 (3a0c7b1, 05a740b).** Setup checks u - u* > 0 on the whole exit set, and the theorems state it.
- **m10, m11 (3a0c7b1).** The two `assert`s are replaced by checks that `python -O` cannot remove.

## Code round (appended to review-1)

- **Internal consistency (5efe380).** The summary recomputes each verdict from the certificate's own fields.
  `summary-control` plants three self-contradictory certificates:
  - a setup with "C": false and "ok": true;
  - an interval PASS with in_int_B0_at_T_enter false;
  - a K1 PASS that never reaches the cone.
- **Code freeze.** Rerun2 started at 19:08 UTC from 5efe380. After that no program in `code/` was edited until its
  certificates were committed.
- **CPU times under load.** Section 7 says the rerun ran two proofs in parallel on four cores that also carried other
  work, so the recorded times were measured under that load. The proofs write disjoint files, so no result is
  affected.

## Not in the review

- **Release asset names (5efe380).** `tools/release-assets.py --check`, which CI runs, failed on this branch.
  `prove_pulse.py` and `block_check_iv.py` had the names of different files in `papers/nf-pulse/code`. They are now
  `hh_prove_pulse.py` and `hh_block_check_iv.py`. The untracked `tstrip.py` (release 1.1.0 work) had its import
  changed by one line.
- **The Remark 1 certificates of the first full rerun (00ee62c).** K1 and K2 moved by 8.0e-62 from the committed ones.
  Those had been computed from an older numerical centre, from before `hp_pulse.py` kept time exactly, and were never
  rerun. The centre itself reproduced byte for byte.
