# Referee report 2 (second in-project reading, 2026-09-28)

This is a second in-project reading, not an outside review. No outside review of this paper has taken place. The reader was briefed with `paper/paper.md`, the programs, `notes/review-1.md` and `notes/fixes-1.md`, and then checked the current manuscript and the programs those items name. `notes/QUALITY.md` was not read.

**Object.** `papers/hh-pulse` as it stands in the worktree. Line numbers are for the current `paper/paper.md` and the current programs.

**Not rerun.** The long stages were not rerun, and `run.sh all` was not started. The stored certificates were read. Their `code_sha256` is `c179fc191094c44a1b1705c4bfe04e0800cbb3e50e8e806b69106db9549929e4`, which is the hash of the eight programs as they are now. Short, read-only checks were run: digit comparisons against the certificates, `check_fail.py` (prints only), and the statements of the cited Teschl results in the author's preliminary PDF.

## Verdict

**No must-fix remains.** Theorems 1 and 2 and Remark 1 are supported by the stored certificates. The argument of Section 4 is unchanged in structure from the first reading and still matches the programs.

Two items that `fixes-1.md` marks done are not done. Neither is a must-fix:

- **m6 is not fixed.** The Consistency paragraph is still the zero-current run.
- **The load sentence is not in the manuscript.** `fixes-1.md` says Section 7 discloses that the recorded times were measured with two proofs running at once. Section 5 and Section 7 still say "one process at a time" and do not mention that load.

One new defect, also not a must-fix: Remark 2 breaks the 18.5 C numerical K* across a line, so the rendered number contains a space. The digits on either side of the break are the digits in `data/hp_pulse_18.5_El10.613.json`.

## Must-fix

### M1. Temperature as a decimal — confirmed

**Where.** `code/certify_rest_wave.py:51-64` (`temperature`, `phi_of`). `code/hh_prove_pulse.py:139` records `T_decimal` and the phi ball; `:216-217` refuses a configuration whose phi string differs; `:526-530` recomputes `3^((T-6.3)/10)` at 512 bits and requires the recorded ball to contain it. `code/hh_block_check_iv.py:207-211` (`phi_iv`) and `:215-217` take the same decimal string. `code/hp_pulse.py:164-166` and `code/block0.py:251` pass the string into `phi_of`. `code/run.sh:88-94` passes `18.5` and `6.3` as strings.

**Checked.** `data/pulse_proof_6.3_El10.613_config.json` has `T_decimal` `"6.3"` and phi `[1.000… +/- 1e-54]`, which contains 1. The same ball is in the setup line and in every stage's provenance. The old path `arb(3)**((arb(6.3)-arb('6.3'))/10)` still excludes 1 (`data/test_temperature.txt`, phi − 1 = −1.9515e-17). Theorem 2 (`paper/paper.md:117-125`), the abstract (`:13-23`), `README.md:15-25` and `RELEASES.md:25-26` quote the speed interval in `data/pulse_proof_6.3_El10.613_summary.txt`. Recomputing theta(K1) and theta(K2) from the configuration puts both printed ends strictly outside that image.

`code/hhwave.py:54-55` still has a float `phi_of`. It is the double-precision helper (Newton start for the rest state, starting profiles). No proof stage calls it. `float(6.3) - 6.3` is 0 in floating point, so this helper gives phi = 1 at 6.3; the defect was the mixed `arb(float)` path, which is gone from the proof.

### M2. Downward rounding of max u — confirmed

**Where.** `paper/paper.md:113` says max u > 90.57 mV. `paper/paper.md:122` says max u > 102.98 mV. `code/hh_prove_pulse.py:394-397` takes `float` of the arb lower end and steps it down one ulp when that float lies above the arb lower end. `code/tables.py:45-46` and `:77-79` floor the minimum of the interval, K1 and K2 bounds to two decimal places.

**Checked.** All three 18.5 C printed-E_l stage files store `u_max_lower_bound` 90.5783393554958, which is above 90.57 and below 90.58. All three 6.3 C files store 102.98082353574522, which floors to 102.98. The interval-run value alone supports both sentences, so the minimum with the endpoint runs does not borrow a bound from a single orbit.

### M3. Section 5 numbers from the certificates — confirmed

**Where.** `code/tables.py:49-80` builds the Section 5 rows and the theorem quotes from the certificates. The manuscript rows are `paper/paper.md:293-298` and `:305-310`.

**Checked against the certificates, not only against `--check`.**

- lambda_u prefixes `10.89208` and `4.974030` are the setup balls `[10.89208117… +/- 3.51e-39]` and `[4.974030360… +/- 3.94e-40]`.
- Cell counts 1232 + 5916 and 3590 + 1374 are the last setup lines.
- zeta_1 `[+/- 0.341]` and `[+/- 0.273]`, and `|zeta_s|` upper bounds rounding up to 0.63603 and 0.45631, match the interval certificates. Both are inside the blocks (0.341 < 0.84, 0.63603 < 0.8; 0.273 < 0.63, 0.45631 < 0.6).
- K1 enters K− at 13.6953125 ms and 36.2578125 ms; K2 enters K+ at 13.6875 ms and 36.234375 ms.
- CPU times in the tables are the `secs` fields: 376, 376, 375, 373, 390 and 852, 849, 852, 856, 860.
- Escape times 6.72 ms and 17.20 ms are the certificate times 6.7251911 and 17.201299, floored to 0.01 (`tables.py:72`). Both are before T_enter.
- "zeta_1 about 13" and "about 10" are the neg-shift balls `[1.3e+1 +/- 0.490]` and `[1e+1 +/- 0.339]`. Each ball lies entirely above r.
- Widths: K2 − K1 is `[3.0000e-45 +/- 3e-54]` and `[2.8000e-61 +/- 3e-70]` in the summaries. The exact differences are inside those balls. "3.000e-45" and "2.800e-61" to four digits (`paper/paper.md:111` and `:120`) are right. The abstract's 3e-45 and 2.8e-61 are the same numbers with fewer digits.
- The two 6.3 C centres differ by 4.7910301137e-59 (`hp_pulse_6.3_El10.613.json` minus `hp_pulse_6.3_El10.613_tol1.json`). "about 5e-59" (`paper/paper.md:315`) is fair. The tight centre is the one in the configuration, and it lies in (K1, K2). The loose centre does not. The proof uses the tight one, as the sentence says.
- "zeta_1 = −86" is not in the manuscript.

`tables.py --check` does not look at Remark 2, the Consistency paragraph, the 5e-59, or 2.7e-4. Those were compared by hand. See m6 and the new finding.

### M4. Stale certificates — confirmed

**Where.** `code/run.sh:51-57` deletes the seven stage files, the summary, the summary control, the numerical centre, the closing block and the checkpoints by exact names. `:65-73` require exit status 0 for stages that must pass and exit status 1 for the two negative controls. `:75-76` run the summary and then the summary control. The summary control is the last command of `proof()`, so a non-zero status from it is the status of `proof()` (`:88`, `:91`, `:94`). `code/hh_prove_pulse.py:692-698` exits 2 on an error, and no certificate is written (`:87-90`).

Provenance is `code/hh_prove_pulse.py:109-124`: sha256 of the configuration, of the closing block and of the eight programs, the python-flint version, and the phi and E_l balls. `:543-556` require equality, and require the stage K string to be the configuration's. The checkpoint key includes both hashes (`:376`).

`contradictions` (`:491-512`) recomputes the setup flag from A, B, B′, u > u* and C; an interval PASS from `in_int_B0_at_T_enter`; a K1 or K2 PASS from that flag together with `phase2 == in_cone`; and a negative-control FAIL from the stated `fail` string. The neg-shift case also requires the boolean to be false. The neg-model case also requires the reason to start with "the whole set escaped (u < -60 mV)".

`stage_summary_control` (`:618-645`) plants thirteen defects and one unaltered copy. That is the "thirteen kinds" of `paper/paper.md:336-338`. The thirteenth is a neg-shift certificate rewritten to PASS.

The summary does not recompute zeta from the printed balls. It trusts the booleans. The manuscript does not claim that it does. The stored neg-shift balls are in fact outside; see below.

## Should-fix

**S1. Credit the methods — confirmed.** `paper/paper.md:69-74` names Lohner, Wazewski, Conley, and Zgliczynski, and says the citations are not premises. Arb, FLINT through python-flint 0.9.0, and mpmath are in the same paragraph and in the references (`:521-522`, `:535-540`). Carpenter 1976 is in Section 6 (`:350-351`) and in the references (`:507-509`), marked not read.

**S2. Priority — confirmed.** `paper/paper.md:53-57` and `:495-501` say the searches found no earlier proof, name Hastings (1976) and Foote and Chen (1981) as not obtained, and limit the sentence to those searches. The same limit is in `README.md:38-41` and `RELEASES.md:34-35`. "within them" is still the last sentence of Appendix C.

**S3. Integrator test — confirmed.** `code/test_lohner6.py:8-13` says the reference uses the same jets and that the test checks the enclosures, not the field. `code/test_field.py` is the separate transcription. `data/test_field.txt` reports largest relative difference 5.22e-60, and the V_K = −12 control is caught at 1.54. The manuscript quotes 5.22e-60 (`paper/paper.md:103`) and 5.2e-60 (`:326`). `README.md:44-46` and `RELEASES.md:39-42` no longer call that reference independent.

**S4. Model control — confirmed.** `paper/paper.md:312-314` says the control re-runs the cone and inflow test, does not compare linearizations, does not re-check z1′ > 0, and does not re-check (H3), which would change by about 1e-12 on B0. That is what the code does. `hh_prove_pulse.py:361-371`: `perturb_model` is set, then `lemma_B` is required to pass (cone and inflow, `certify_rest_wave.py:216-226`). z1′ and u − u* are checked only in `stage_setup` (`hh_prove_pulse.py:312-324`). The closing block is not run again. `fixes-1.md:67-68` says "(H1) and (H2) are re-checked". The manuscript is the tighter description, and it matches the code. The stored failure is an escape of the whole hull below −60 before T_enter (below), not a blow-up.

**S5. Licence — confirmed.** `README.md:100-104` points at `NOTICE` and says the published repository carries a `LICENSE` with both texts. A `LICENSE` with both texts is also in this folder now. The original defect (a README that pointed at a missing file and nothing else) is gone.

**S6. Lemma A.1 — confirmed.** `paper/paper.md:381-394` states the enclosure for the five moving components, at each fixed K in the K component of the box, and says the program checks those five. `code/lohner6.py:134` and `:148` do that.

**S7. Lemma A.3 — confirmed.** `paper/paper.md:416-419` states that R0 and R contain 0, and why the update preserves it.

**S8. (H2)(i) — confirmed.** `paper/paper.md:178-179` cites Gershgorin, Lemma B.5. Lemma B.5 is `paper/paper.md:473-479`. `code/certify_rest_wave.py:224-226` is that test.

**S9. Limit sets — confirmed.** `paper/paper.md:213-216` (Lemma 1(b)) and `:252-255` (Lemma 2) add the compactness step: a sequence of times bounded away from y* would have a subsequence converging to another limit point.

The cited Teschl results were compared with the author's preliminary PDF (the page numbers in `paper/paper.md:541-544`). Corollary 2.15 is on p. 52 and is the extension criterion Lemma A.1 uses. Theorem 6.1, Lemmas 6.3 and 6.5 (both on p. 193) and Lemma 6.6 (p. 194) match the completeness and limit-set uses. Theorems 9.4 and 9.5 are both on p. 259. In that text M− is the set approached as t → −∞, and Theorem 9.5 states γ−(x) ⊂ U if and only if x is on M−. The paper's use for the backward orbit is the statement, not a swap of the stable and unstable theorems. Equation (3.45) on p. 72 is the determinant form of Routh–Hurwitz. The quartic inequalities in Lemma B.4 are the n = 4 case with the index shift a3, a2, a1, a0 ↔ a1, a2, a3, a4, and the proof says it does not use that check (`paper/paper.md:190` and `:471`).

## Minor

- **m1. Confirmed.** `paper/paper.md:138-139`. theta(10.47) recomputes to 18.76053… m/s, which is 18.76 m/s to two decimals. (10.47 − K*)/K* = 0.003061, so "0.3 per cent" is the one-digit form. The three rounding intervals are disjoint from Theorem 1: K* is near 10.438, and the proved speed is near 18.73188, below 18.75.
- **m2. Confirmed.** `paper/paper.md:78-80`. The change of sign is the substitution u = −V with the constants rewritten.
- **m3. Confirmed.** `paper/paper.md:232-234`. The stored hex values are the IEEE doubles: rho(18.5) = `0x1.999999999999ap-1` = 0.8000000000000000444…, r = `0x1.ae147ae147ae2p-1` = 0.8400000000000000799…, rho(6.3) = `0x1.3333333333333p-1` = 0.5999999999999999777…, r = `0x1.428f5c28f5c29p-1` = 0.6300000000000000044…. Same radii on the zero-current block.
- **m4. Confirmed.** `paper/paper.md:518-520`. Title and doi 10.1137/15M1007707.
- **m5. Confirmed.** `code/hh_prove_pulse.py:4-16` and `:30-31` name the printed leak, (H1)–(H5), and the factor `1 + 1e-12 (u − u*)^2`. `code/certify_rest_wave.py:7-11` says the default leak is the zero-current value and that `HH_EL=10.613` is the printed one.
- **m6. Not fixed.** `paper/paper.md:340` still says "At T_enter = 13.625 ms (18.5 C, zero-current E_l)" and quotes zeta_1(K1) in `[-0.30474 +/- 8.59e-6]` and zeta_1(K2) in `[0.34075 +/- 8.50e-6]`. Those are exactly the balls in `data/pulse_proof_18.5_K1.json` and `_K2.json`. The printed-E_l balls are different: `[-0.3032 +/- 1.03e-5]` and `[0.33917 +/- 8.72e-6]` in `data/pulse_proof_18.5_El10.613_K1.json` and `_K2.json`. `fixes-1.md:87-88` says the paragraph now uses the printed-E_l runs of the theorems. It does not. The sentence that is printed is true of the run it names. It is not a false digit. It is not the fix that was claimed.
- **m7. Confirmed.** `code/hh_block_check_iv.py:92-96` and `:130-134`. For `HH_EL=10.613` the bisection interval must lie within 1e-3 − 1e-12 of `U_STAR`. The float start `hhwave.Wave(18.5, EL=10.613).urest` differs from that constant by 1.8e-15, so the window sits inside the Newton interval of radius 1e-3 on which Lemma B.1 is applied (`certify_rest_wave.py:109`).
- **m8. Confirmed.** `code/hh_block_check_iv.py:172` defaults to depth 24, and `:240-242` call the enlarged block with that same default.
- **m9. Confirmed.** `paper/paper.md:127-129`. Setup sets `B_exit_u_above_rest` from u − u* > 0 on the hull of the exit set (`hh_prove_pulse.py:321-324`) and includes it in `ok` (`:334`).
- **m10. Confirmed.** `code/hh_prove_pulse.py:592` uses `require`, not `assert`. The speed ends in the three summaries were recomputed and lie strictly outside theta(K1) and theta(K2).
- **m11. Confirmed.** `code/hhseries.py:40-41` raises `ArithmeticError` when N < 2k + 2.

## Code-round items in fixes-1.md

**Internal consistency — confirmed.** See M4. The three planted self-contradictions are `hh_prove_pulse.py:637-643`.

**Code freeze — not re-checked as history.** The eight programs now hash to the value stored in every certificate read here. That is the condition that matters for these files. The git history of the rerun was not re-walked.

**CPU times under load — not fixed as claimed.** `fixes-1.md:104-106` says Section 7 says the rerun ran two proofs in parallel, so the recorded times were under that load. There is no such sentence. `paper/paper.md:287-288` and `:362` say "one process at a time", which is what `code/run.sh` does (the three proofs are sequential, and each stage waits). The stored `secs` values are not the ones review-1 recorded under load (573 s and 1297 s on the long stages). They are 376 s and 852 s. Nothing in `data/` says whether this later run was loaded. The manuscript's sentence is what `run.sh` does. It is not the disclosure the fix list claims.

A related mislabel, new and minor: the column is "CPU time" (`paper/paper.md:290`), but `secs` is wall-clock, `time.time()` at `code/hh_prove_pulse.py:360` and `:482`.

## New finding

**Remark 2 breaks K* across a line.**

**Where.** `paper/paper.md:136-137`.

**What is wrong.** The 18.5 C value is split after `…23831857`. The next line begins `912185866977197832623...`. In markdown a single line break is a space, so the rendered numeral is `…31857 91218…`. `code/tables.py` does not check Remark 2. Concatenating the two pieces gives `10.43805106010112369227648623831857912185866977197832623`, which is the leading part of `K` in `data/hp_pulse_18.5_El10.613.json` (`…77197832623694577177829239`). The 6.3 C numeral on line 137 matches `data/hp_pulse_6.3_El10.613.json` with no break. Both centres lie in the proved (K1, K2).

**Why it matters.** Remark 2 is marked numerical, not proved, so this does not touch Theorems 1 or 2. A reader who copies the rendered number does not get the value in the certificate. The first reading's demand was that every quoted number be traceable; this one is traceable only after the line break is deleted.

**Fix.** Put the numeral in one line, or in a code span, so the source cannot insert a space. Have `tables.py --check` require the Remark 2 strings as well.

No other new defect of the four kinds asked for turned up.

- **Quoted digits.** The theorem and abstract speeds, K1 prefixes (52 characters; the rounded digit of `K1.str(70)` is past that prefix), widths, u*, the zero-current E_l prefix `10.5989209693916785`, and the shift 2.7e-4 were checked. The proved speed intervals differ by about 2.7257e-4, which is 2.7e-4 to two digits. u* from `rest_state` at `HH_EL=10.613` is `[0.00362066880794256883688769054204696… +/- 5e-50]`, and the manuscript prefix `…5420` is a prefix of that ball.
- **Citations.** The Teschl uses checked above match the statements. Theorems 9.4 and 9.5 are applied to the backward orbit, which is the M− half of those statements.
- **Negative controls.** `check_fail.py` (read-only) reports that every neg-shift FAIL is outside the entrance condition in zeta_1 only, with `|zeta_s|` still inside, and that every neg-model escape time is before T_enter. The 18.5 C printed-E_l ball `[1.3e+1 +/- 0.490]` lies above 12.5, and r is 0.84. The 6.3 C ball `[1e+1 +/- 0.339]` lies above 9.6, and r is 0.63. The whole enclosure is outside B0, so the failure is not an enclosure that merely failed to fit inside. The model-control hulls are entirely below u = −60, at 6.7251911 ms and 17.201299 ms. The shifted K interval is `(K2+19d) ∪ (K2+20d)` with `d = K2−K1` (`hh_prove_pulse.py:164-166`), whose centre is exactly 40 half-widths above the centre of [K1, K2].
- **Summary.** The thirteen planted defects are the thirteen kinds the manuscript names, and the acceptance conditions match that paragraph. A hand-edited certificate whose zeta text disagreed with its boolean would still be accepted. The manuscript does not say the summary recomputes the balls, and the stored balls do not agree with that stronger claim. The stored balls do not disagree with the booleans.

## Verdict

No must-fix remains.

Not confirmed: m6 (`paper/paper.md:340` is still the zero-current run; `fixes-1.md:87-88` says otherwise). The parallel-load sentence claimed for Section 7 is not in the manuscript.

## Response (after this reading)

The three leftovers above are fixed in the manuscript. The Consistency paragraph now quotes the printed-leak balls at 18.5 C, `[-0.3032 +/- 1.03e-5]` and `[0.33917 +/- 8.72e-6]`. The table column is wall time, and the caption says `secs` is wall-clock. Each numerical K* is one line, the string stored in `hp_pulse_18.5_El10.613.json` and `hp_pulse_6.3_El10.613.json`. The sentence about two proofs running at once was not added: `run.sh` runs one process at a time, and nothing in `data/` records the load of the later run. `tables.py --check` and `check_abstract.py` passed after the edits.
