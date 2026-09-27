**Referee report on `papers/nf-pulse/paper/nf-pulse.tex`, "Travelling Pulses in a Neural Field with a Smooth Firing Rate: Computer-Assisted Existence and Spectral Stability"**

This report is an in-project reading by an independent agent (Claude), dated 2026-09-27. It is **not an outside review**. Before writing the findings I did not open `papers/nf-pulse/review/` or `papers/nf-pulse/notes/`. One exception to note: `node tools/paper-check.js` printed a one-line status that it takes from `notes/QUALITY.md`. I did not edit any file in the repository. Every rerun used a copy of the folder at `/tmp/claude-0/-home-user-GENChase/ac7d9e0e-5b9b-52ee-8f9a-025178f1bd06/scratchpad/nf`.

- **Version reviewed:** `nf-pulse.tex` with sha256 `79131b08…b425`. It was unchanged from the start of the review to the end. The worktree has uncommitted edits on top of `0267f31`.
- **PDF:** the PDF is 33 pages, not the 27 stated in the task. My pdflatex build (run three times) matches the committed PDF text exactly, with no warnings or undefined references.

## Verdict: minor revision

## Summary

I found no mathematical error that breaks any of the six theorems. I read every written proof:

- Lemmas 2.1–2.5, 3.1–3.4 and Propositions 3.5 and 3.6.
- The covering-chain argument.
- Propositions 4.1, 4.2 and Lemmas 4.3–4.5.
- Propositions 4.6 and 4.7, Lemma 4.8, and the proof of Theorem 6.

I also re-derived the key algebra myself:

- The characteristic polynomials of both models.
- The resolvent formulas and the eigenvectors v and w̃.
- The derivatives of v and w̃ in λ.
- The Volterra and Gronwall tail bounds.
- The majorant recursions of `step_matrices`.
- The second-order Taylor-model update in `evans_rig.py`.
- The Birman–Schwinger bounds (a)–(c).

**Reruns.** Every computer-assisted step I reran reproduced its stored output exactly, apart from timing fields:

- The base chain.
- The slow-pulse, gain-12 and eps-range check chains.
- The stability steps E, L, P1–P4, S, W-combine and the full 128-arc Cauchy integral, run in one process in 18 minutes.

**Numbers.** Every number I compared in the paper matches the outputs and is rounded outward. That covers speeds, radii, sup U bounds, block margins, winding intervals, D'(0), the tail constants, all of Table 1 and all of Table 2's digits.

**SHA-256.** All 16 SHA-256 prefixes in Section 8 match the files.

**What needs fixing.** The problems are in what the paper says about its programs and in some program-level gates:

- Two factual statements about the verification programs are false (must-fix).
- The reproducibility commands are not single-process as the paper says.
- Several containment and environment gates are done by hand or by `assert`.
- The winding step has no negative control.

## Must-fix

1. **§3.6, line 475 (proof of Theorem 4).** The paper says "`lohner.py`, `manifold.py` and `shoot_hp.py` are unchanged". This is false for `manifold.py`: `cmp` reports "manifold.py DIFFERS". The gain-12 copy:
   - uses `assert` where the base uses `require`;
   - chooses σ at run time with `choose_sigma`, where the base fixes `SIGMA = 1/7`.

   The paper also leaves out that `ext/gain-12/code/nfcore.py` reads β and ε from `NF_BETA` and `NF_EPS` (defaults 12 and 3/20). It has no `require`, and `ext/gain-12/code/run_all.sh` does not clear `NF_*`. The mathematics is unaffected: σ = 1/7 in `ext/gain-12/data/manifold_validation.json` and in `prove_pulse.py`. But the description of the proof's programs is wrong.

2. **Proposition 4.7 proof (line 632) and §8 (line 740).** The paper says `winding.py combine` "refuses pieces computed with a different program" and "refuses them if any of these files has changed". `fingerprint()` hashes only `evans_rig.py`, `winding.py` and `pulse_records.pkl`. `evans_rig.py` imports `code/nfcore.py` (S, dS, taylor), `code/certify_rest.py` (C1 and C2, which set the κ range of the small block) and `code/block.py` (`check`), and none of these is fingerprinted. `code/certify_rest.py` already differs from HEAD in this worktree (comments only), and `combine` still accepts the pieces. Fix: fingerprint every imported module, or state exactly which files are tied.

## Should-fix

3. **§8 table (lines 727 and 734).** The paper says "about 6 min in one process" and "about 20 min in one process". The scripts are not single-process:
   - `code/run_all.sh` puts three tests and three `prove_pulse` runs in the background. Its own header says "about two minutes on four cores".
   - `ext/stability/run_all.sh` runs `simple_zero.py 128 4` with a 4-process pool.
   - `thin_runs.sh` starts two processes at once, and the script also runs `spectrum_num.py 4`.

   My sequential timings were:
   - base chain: 5 min 44 s;
   - stability quick equivalent: about 21.5 min (pulse_enclosure 21 s, thin runs 2 min 39 s, simple_zero 18 min 13 s).

   Separately, "stored in data/run_all.txt": the scripts print to stdout and do not write that file.

4. **Missing program gate, Lemma 4.4(a) (line 610).** The sentence "The block conditions were certified on [1/c2, 1/c1], which contains this interval" is checked by no program.
   - `prove_pulse.py` in `custom:` mode (proof steps P1 and P2 of the stability chain), `pulse_enclosure.py` (P4) and `evans_rig.load` (the small block) all certify the block for κ in `(1/cr.C1).union(1/cr.C2)`.
   - None of them requires the bracket's κ to lie in that range.
   - The containment is true: c1 < c_lo < c_hi < c2, which I checked by hand.
   - Fix: add `require` statements.

5. **Program hygiene paragraph (line 767) is incomplete.**
   - The stability chain honours more environment variables than `NF_EVANS_*` and `NF_STAB_*`, because it imports `prove_pulse.py`, `certify_rest.py` and `block.py`. `NF_DU`, `NF_R_OVER_RHO` and `NF_TAG` apply, and `NF_PULSE=slow` switches C1, C2 and C_REF, and with them T and the certified κ range. `NF_EVANS_PHITOL` and `NF_EVANS_HMAX` are also read.
   - gain-12 honours `NF_BETA` and `NF_EPS`.
   - Among the `assert` gates, `assert ok_s` and `assert mrate_B > 0 and mrate_s > 0` in `evans_rig.load` matter: under `-O`, a failed small block would still produce m_E and G_R.
   - Fix: clear `NF_*`, refuse `PYTHONOPTIMIZE`, and convert these asserts to explicit checks.

6. **Line 276.** B is defined through the T "recorded in data/block_certificate.json". Every program instead recomputes T with `numpy.linalg.eig` (`block.setup`) and never compares it with the recorded T. On this machine they agree: `block_certificate.json` and the pulse records were reproduced bit for bit. On another LAPACK the bits of T can differ. Check P3 would then fail, and the proof's B would silently become a different set. Fix: load T from the certificate as exact dyadics, or require equality.

7. **No negative control for the decisive stability steps.** Table 3 has none for W or for Z. Suggestions:
   - a winding run on a small box without zeros, for example [1, 1.5] × [1, 1.5], which must return 0;
   - a Cauchy integral about a point where D̃' is known to be nonzero;
   - a mutation, for example dropping ω̃, that must be refused.

8. **Discussion, line 775.** "The saddle-focus at the rest state (Theorems 3(b) and 4)": for Theorem 3(b) this is not certified. `ext/slow-pulse/data/rest_certificate_3_20.json` records R3_iii as "NOT CERTIFIED: found 2 sign changes", and line 469 itself says "numerically". Fix: label it as numerical, or certify the complex pair.

9. **Line 707.** The Fourier-spectral eigenvalue computation "was made by the program of a separate check, which is not in the folder". Fix: add the program, or drop the claim.

## Minor and nits

10. **Lines 190 and 732.** `probe_table.md` and `table.py --certs ext/eps-range/data/probes` list four intervals, not "three" and not "the three further intervals".
11. **Line 733.** `probe_limits.sh` also attempts ε near 0.19, 0.20, 0.21 and 0.215. In `limits.txt` these lines have no verdict, and the paper does not mention them. The script also writes plain `.json`, while the stored files are `.json.gz`, and it runs four attempts at a time.
12. **Table 1.** The "least width" for [0.100, 0.105) is 1.15·10⁻⁴, printed as 1.2·10⁻⁴ (`%.1e`). State that this column is rounded, or print it exactly.
13. **Line 622.**
    - "B unitary": B comes from Gram–Schmidt on a midpoint matrix, so it is only approximately unitary, and its inverse is enclosed.
    - "Lagrange remainder" for complex, matrix-valued Φ: the Lagrange form does not apply, but the same bound follows from the integral form. Say so.
14. **§5 step (i).** Containment of the κ component of W is not strict (`W[5].contains`). This is harmless because κ' = 0, but the text should match the code.
15. **Weak negative controls.**
    - Check 2 (θ = 0) is refused at the first test, s < 1, before any root isolation.
    - L2 is refused by bound (a) alone.
    - `certify_rest`'s perturbed-eigenvalue control perturbs a value that is already 4·10⁻⁹ from the root, and `run_all` does not check it.
16. **Code comments (not in the paper).**
    - `code/run_all.sh` and `block.py` say "S' up to about 2.7" for U = 0.15. The actual value is 2.0999 (`block_certificate.json`, smax).
    - The slow-pulse label "c = c1 + about 1e-4" is wrong at ε = 3/20, where the gap is 1.1·10⁻⁶.
    - The stability `run_all.sh` header says "10 to 40 minutes"; the recorded times are 16 to 31 minutes, as the paper says.

## What was checked

**Rerun from a copy, one process at a time, each under `timeout 1500 nice -n 19`:**
- The base chain, all 20 checks. The summary is identical to `data/run_all.txt`, and all 9 JSON certificates are identical apart from `time_s`.
- `ess_spectrum.py` and `large_lambda.py` (E1, E2, L1, L2). The largest product is 0.986238951787187.
- `part3_symbolic.py`: identities a–g plus two negative controls.
- `winding.py combine`: WINDING NUMBER 1.
- `pulse_enclosure.py` (P3 and P4): RECORDS REPRODUCED.
- Both thin runs (P1 and P2): t_K = 127.3136292 and 127.6979904, JSON identical.
- Two winding segments recomputed with `evans_rig`, which reproduce the stored segment lines. The same run gave K_U = 5.748738, m_E ≥ 0.12461868, G_L = 1.8446533·10⁻⁸ and G_R = 1.7760493·10⁻⁴.
- `simple_zero.py 32 1`: CERTIFIED, D̃'(0) ∈ [−20.2, −10.2] ± 4.98i.
- `simple_zero.py 128 1`: JSON identical to the stored file apart from time.
- `ext/eps-range/run_checks.sh`, made sequential: 8 of 8 OK.
- `table.py`: both summary files reproduced byte for byte.
- `ext/slow-pulse` (26 checks) and `ext/gain-12` (23 checks), made sequential: summaries and all JSON identical.

**Mutation test.** I dropped the κ column of the Taylor jet. The run gave STRESS FAIL and JACOBIAN FAIL, as §5 claims.

**Numbers and rounding.** I compared against the outputs:
- Theorems 1–5: brackets, eigenvalue balls, sup U bounds, entry times, precisions and orders. All 144, 88 and 28 digits of Table 2 match `config.py`.
- The certificate counts: 383 PASS in `certs/` and 4 in `probes/`, with 285 + 101 made by the two versions of `chain.py`.
- The window widths, 2.88·10⁻⁶ to 4.25·10⁻⁵.
- Every figure quoted from the stability JSON outputs.

**Sources.**
- Quotations checked in the primary sources: Hastings arXiv:1503.04057v2 (p. 2 and footnote 4 on p. 6), Dyson arXiv:2511.17328v2 (abstract, pp. 7–8 and 26), Habib–Veltz arXiv:2412.03613v1 (Theorem 1, p. 7, and the "conjectured" remark, p. 2), Faye–Scheel arXiv:1311.6508v1 (Theorem 1 and p. 3). All accurate.
- The Faye-model parameters in Hastings's footnote 3 (λ = 20, κ = 0.22, β = 5, b = 4.5) match the paper.
- Two web searches found no earlier computer-assisted proof of a travelling pulse in a neural field. This is not exhaustive.

## What was not checked

- `review/` and `notes/`.
- The Faye-model chains (not rerun; I checked only the stored outputs).
- The full recomputation of the six winding pieces: I recomputed 2 of 1976 segments.
- The full eps-range sweep: I checked one interval from scratch plus the coverage.
- Burlakov–Oleynik–Ponosov (MDPI returned HTTP 403).
- Pinto–Ermentrout, Faye 2013, Pinto–Jackson–Wayne, Sandstede and the Zhang papers (paywalled).
- The neural-field simulation numbers, whose files are outside the folder. Their error ratios are internally consistent with fourth order, about 16.
- The numerical scripts (`shoot_hp.py`, `pulse_hp.py`, `spectrum_num.py`).
- The correctness of Arb and python-flint.

## Commands run, with output tails

- **Base chain:** `timeout 1500 nice -n 19 sh run_all_seq.sh` (a copy of `code/run_all.sh` without `&` and `wait`) → 20 × OK, "all checks passed", real 5m44s. A JSON diff against the stored certificates reported SAME for all 9.
- **Essential spectrum:** `python3 ess_spectrum.py` → "Re lam <= -delta0 = [-0.11270166537925831148 +/- 2.08e-21] ; CERTIFIED"; "NEGATIVE CONTROL eps = 3/10: discriminant positive = False".
- **Large eigenvalues:** `python3 large_lambda.py` → "CERTIFIED … beta/4 * bound (b,c): [0.986238951787187 +/- 3.24e-16]"; negative control "certified = False".
- **Algebra:** `python3 part3_symbolic.py` → "PART 3 ALGEBRA: CHECKED".
- **Winding:** `python3 winding.py combine` → "WINDING NUMBER 1".
- **Fingerprints:** `sha256sum` → all prefixes match the table in §8.
- **Pulse enclosure:** `NF_STAB_OUT=work/rerun python3 pulse_enclosure.py <c_lo> <c_hi> 110 120` → "RECORDS REPRODUCED" (21 s).
- **Thin runs:** `NF_PREC=384 NF_TOL=1e-95 NF_ORDER=36 prove_pulse.py custom:…272:58:-1 110`, then `custom:…273:58:1 110` → "phase2: in_K [127.3136292 +/- 4.97e-8] … VERDICT PASS" and "in_K [127.6979904 +/- 1.75e-8] … VERDICT PASS"; JSON SAME.
- **Cauchy integral:** `python3 simple_zero.py 128 1` → "Dt'(0) in [-16.3819, -14.0497] + [-1.16101, 1.16101]i … D'(0) … in [0.230893, 0.269221] + [-0.0190800, 0.0190800]i … SIMPLE ZERO: CERTIFIED", real 18m13s; "SIMPLE_ZERO JSON SAME".
- **eps-range:** `sh run_checks_seq.sh` → 8 × OK, "all checks passed", 2m54s.
- **eps-range tables:** `python3 ext/eps-range/table.py --from 0.08 --to 0.13693 --condensed --at 1/10` → "TABLE_SUMMARY_SAME"; `… --certs ext/eps-range/data/probes --at 3/20` → "PROBE_SUMMARY_SAME".
- **Slow pulse:** sequential run → "all checks passed", 1m16s; summary and JSON identical.
- **Gain 12:** sequential run → "all checks passed", 3m54s; summary and JSON identical.
- **Mutation (κ column dropped):** `test_stress.py` → "STRESS FAIL"; `test_jacobian.py` → "JACOBIAN FAIL".
- **Paper check:** `node tools/paper-check.js` → "OK nf-pulse [draft] … nf-pulse.pdf: 33 pages".

## Response (2026-09-27, the manuscript's writer)

Each finding was examined by two further agent sessions; "confirmed" means that both upheld it. Numbers of lemmas and
tables are those of the revised manuscript (37 pages; the table of the stability checks is now Table 4).

**Must-fix**

1. gain-12 programs described as unchanged (confirmed). **Fixed.** Section 4.6 now says that `lohner.py` and
   `shoot_hp.py` are identical to those of `code/`, that `manifold.py` is identical to `code/manifold.py` as it was at
   commit 3e2000a (assertions instead of explicit checks, sigma chosen at run time by `choose_sigma`, which gives 1/7,
   as `ext/gain-12/data/manifold_validation.json` records), and that `nfcore.py` sets beta = 12 and eps = 3/20 as the
   defaults of NF_BETA and NF_EPS and uses assertions. `ext/gain-12/code/run_all.sh` now clears every NF_* variable
   (so the defaults apply) and refuses PYTHONOPTIMIZE; it was rerun from a copy with NF_BETA=20 and NF_EPS=1/10 (and
   ten other NF_* variables) set in the environment, passed its 23 checks in 3 min, one process at a time, and
   reproduced its committed summary and all nine certificates apart from timing fields (`notes/QUALITY.md`).
   `ext/gain-12/REPORT.md` has a dated note. gain-12 was not changed to import the base `manifold.py`.
2. `winding.py combine` refusal overstated (confirmed). **Fixed in the text** (proof of Proposition 5.6, caption of
   Table 4, Section 8): the three fingerprinted files are named, the imported base modules are named as not
   fingerprinted, and their history since the pieces were computed is stated (`nfcore.py` unchanged; `certify_rest.py`
   and `block.py` changed only in comments). Not widened, because `winding.py` is fingerprinted itself and the six
   pieces would have to be recomputed (hours on the shared machine).

**Should-fix**

3. "In one process" (not confirmed). The wording was **changed** anyway: the times are given "with the parallel steps
   run one after another", and "stored in" became "whose committed output is".
4. Containment of the narrow bracket in [1/c2, 1/c1] not checked by a program (not confirmed: both checks found it
   stated in the text and checkable from the printed exact constants). **Not changed.**
5. Program hygiene (confirmed as part of the corresponding analysis finding). **Fixed:** every extension script now
   refuses PYTHONOPTIMIZE and clears every NF_* variable, so the `assert` gates of `evans_rig.load` (and the others
   listed in Section 9) are active when the proofs are run through the scripts; Section 9 lists the variables. The
   assertions were not converted to explicit checks (stated in Section 9 and `notes/QUALITY.md`).
6. The recomputed T (not confirmed). The text now **states** that the programs recompute T and that check P3 compares
   the recomputed records, which contain T, with the stored ones; the programs were not changed.
7. No negative control for W and Z (confirmed). **Fixed.** New program `ext/stability/winding_controls.py` runs the
   unchanged code of `winding.py` on two small squares: W1, winding number 1 on [-1/25, 1/25]^2 around the zero 0
   (total/(2 pi) in [0.98, 1.02]); W2, a negative control, winding number 0 on [1/10, 3/10] x [-1/10, 1/10] (total in
   [-0.0204, 0.0204]), so the false statement that Dt vanishes there is refused. Their pieces are stored with the same
   sha256 records and checked by `winding_controls.py check` in `run_all.sh`. For Z, the mean-value integral over the
   same 128 arcs, which must contain Dt(0) = 0, is now check Z3 of `run_all.sh` and Table 4, a negative control of the
   statement Dt(0) != 0; the text says that it is computed from the same enclosures and does not test the Cauchy
   argument independently. No mutation control (such as dropping omega~) was added, and no Cauchy integral about a
   point where Dt' is known to be nonzero; the programs of the stability proof have had no mutation study (Section 6).
   The four pieces of W1 and W2 were computed on 2026-09-27 and recomputed from a copy the same day (one core, 17 min
   in all: every piece identical to the stored one apart from its timing field, and its segment file byte for byte),
   and `sh run_all.sh quick`, rerun from a copy with the new checks, passed all 15 (`ext/stability/data/run_all.txt`).
8. Saddle-focus of Theorem 3(b) (confirmed). **Fixed:** the Discussion says the rest state is a saddle-focus in
   Theorem 4, where this is certified, and numerically in Theorem 3(b); Section 7 gives the numerical eigenvalues
   (-1.805 and -0.5921 +- 0.0655 i); "with a Lyapunov form" now refers to Theorem 4 only.
9. Fourier-spectral computation (confirmed). **Fixed:** the sentence is dropped.

**Minor and nits**

10. Four probe intervals: **fixed** (Theorem 2(b) and Section 8).
11. `probe_limits.sh`: **fixed** (Section 4.7 mentions the attempts near 0.19, 0.20, 0.21 and 0.215 with an empty
    verdict, the four attempts at a time and the plain JSON stored compressed; Section 7 too).
12. Table 1 rounding: **fixed** (the caption says the least width is rounded to two significant digits).
13. "B unitary", "Lagrange remainder": **fixed** (B approximately unitary with its inverse enclosed; the remainder
    bounded through the integral form of the Taylor remainder).
14. The kappa component of the a priori box: **fixed** (Section 6 says containment suffices there).
15. Weak negative controls: **stated, not fixed** (Section 6 says that check 2 fails at s0 < 1 before any root
    isolation and that L2 fails on bound (a) alone; no new controls reaching the root isolation or the Krawczyk steps
    were added, and the perturbed-eigenvalue control of `certify_rest.py` was not changed).
16. Code comments: **fixed** ("S' up to about 2.1" in `code/run_all.sh` and `code/block.py`; the slow-pulse label now
    reads "c = c1 rounded up at the fourth decimal (at most 1e-4 above c1)"; the header of `ext/stability/run_all.sh`
    says 16 to 31 minutes). The comment changes alter the SHA-256 prefixes of `code/block.py` and `code/run_all.sh`;
    the table of Section 8 now prints the new ones (all 16 prefixes rechecked against the files), and
    `code/run_all.sh` was rerun from a copy after the change: 20 checks passed, summary and certificates identical
    apart from timing.
