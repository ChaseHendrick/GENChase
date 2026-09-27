# In-project review (2026-09-27) of the controls W1, W2 and Z3 of the stability proof

**This is an in-project review by an independent agent session (a separate headless Claude Code session started for
it), made on 2026-09-27. It is not an outside review.** The controls W1, W2 (`ext/stability/winding_controls.py`) and
Z3 (`ext/stability/simple_zero.py`) were added after the readings of 2026-09-27 and had not been read separately. The
session was briefed only with a copy of `paper/`, `code/`, `data/` and `ext/` (without the `REPORT.md` files), was
asked to find errors in the controls and in what the manuscript says about them, and was not allowed to run the long
computations. The report follows verbatim; the response is at the end.

---

# Review of the controls W1, W2 and Z3

## Verdict (one line)
W1, W2 and Z3 do what the manuscript says and the table/proposition text describing their numeric outcomes is accurate and reproducible from the committed data, but the manuscript's reproducibility table misstates how the controls were run, one control's pass/fail is silently entangled with an unrelated proof step's status, and none of the three controls exercises the numerically distinct large-|λ| regime where most of the real winding computation's work is done.

## Must fix (a control that does not do what the manuscript says, or a false sentence)

1. **paper/nf-pulse.tex:777 vs ext/stability/run_all.sh:66 — false statement about how W1/W2 are computed.** The reproducibility table states that, in the non-quick run, "the four pieces of the controls" take "2.5 to 10.5 min each on **one core**", as opposed to the six winding pieces which run "on four cores". But `run_all.sh` line 66 invokes `python3 winding_controls.py run 4`, i.e. with `nproc=4`, exactly like the real winding pieces (`python3 winding.py $p 4`, line 60). Running `sh ext/stability/run_all.sh` today does not run the controls on one core.
   Supporting evidence that this is not just a stale comment but reflects a real inconsistency: the committed timing data is inconsistent with 4-way parallelism. The six main-box pieces (computed with `nproc=4`) show 1.27–2.41 s/evaluation (`ext/stability/data/winding_right_up.json` etc.: `evaluations`/`time_s`); the four control pieces (`winding_ctrl0_a.json`, `winding_ctrl0_b.json`, `winding_ctrlN_a.json`, `winding_ctrlN_b.json`) show 12.5–15.2 s/evaluation — roughly a 4× higher per-evaluation wall time, and squares of comparable size (segment length ≤ 1/50 in both cases) evaluated closer to λ=0, where the matrices involved are no larger than at the box's far corners, give no reason to expect the *opposite* of what more parallelism would produce. This is consistent with the committed control pieces having actually been produced at `nproc=1`, contradicting the "4" hard-coded in the current script.
   Fix: make the script and the text agree — either change `run_all.sh` line 66 to `winding_controls.py run 1` (matching the text and the apparent provenance of the committed data), or, if `nproc=4` is intended going forward, update the reproducibility table to say "four cores" for the controls too and regenerate the committed timing artifacts so the quoted range is accurate. This does not affect the soundness of W1/W2 (the enclosures are process-count-independent), only the reproducibility instructions.

## Should fix

2. **ext/stability/simple_zero.py:157 — Z3 (negative control) is silently ANDed into the status line that Table tab:stabchecks/run_all.sh use for Z2 (the proof step).** `cert = cert1 and excl and mean_ok`, and `'SIMPLE ZERO: CERTIFIED' if cert else ...` is exactly the string `run_all.sh:53` greps for to validate the check labelled "Z: λ=0 is a simple zero of the Evans function … " (Table row "Z1, Z2 → Proposition prop:simplezero"). `mean_ok` is the outcome of Z3, the negative control, which the table and the proof of Proposition prop:simplezero present as a distinct, separately-graded check ("Z3 of Table tab:stabchecks", run_all.sh:54, pattern `'contains 0: True'`). As implemented, if Z3 fails for any reason, the log line that certifies the *proposition* (not just the negative control) also reads "NOT CERTIFIED", even though `cert1` (Z1) and `excl` (the real content of Z2, that 0∉ enclosure of D̃'(0)) may both be correct. This is fail-safe (it can only make the run fail when it should not, never pass a wrong result), so it is not a soundness bug, but it means Table tab:stabchecks' framing of Z1/Z2 as independent of the Z3 negative control does not match the code, and a future maintainer debugging a "Z2 failed" line would have to realize the actual cause may be Z3.
   Fix: gate `'SIMPLE ZERO: CERTIFIED'` on `cert1 and excl` alone, and print/exit on `mean_ok` as an independent final line (as W1/W2's `winding_controls.check()` already does for its own negative control, cf. finding 4 below for the corresponding code-duplication issue).

3. **No control exercises the large-|λ| numerical regime.** W1's square is `[-1/25,1/25]²` (`ext/stability/winding_controls.py:29-31`) and W2's is `[1/10,3/10]×[-1/10,1/10]` (lines 32-34); Z1/Z2/Z3's Cauchy circle has radius `1/25` (`ext/stability/simple_zero.py:34`, `R = fmpq(1,25)`). All three therefore only ever call `evans_rig.evans()` for |λ| ≤ 0.3, a small corner of the box that Proposition prop:winding actually certifies, `R_box = [-1/20,9/2]×[-38/5,38/5]` (`ext/stability/winding.py:25-27`), most of whose 1976 segments lie at |λ| up to 4.5 (real) or 7.6 (imaginary). Since the matrix norms entering the majorant recursion in `evans_rig.step_matrices` (`N0 = ‖M‖`, growing with λ through `Amat(l, nu)`), and the eigenvalue magnitude `nu(λ)` itself, both scale with λ, the numerical regime actually exercised at the far corners of `R_box` (more subdivisions in `substeps`, a much larger exponential factor `f(λ) = exp(-(ν(λ)-ν_c)·136)`) is materially different from what W1/W2/Z3 probe. The committed per-evaluation timings support this: they are, if anything, lower for far-corner segments than for the near-origin controls once the nproc discrepancy of finding 1 is accounted for, but in any case none of the three controls ever evaluates `evans()` at a λ resembling the box's outer boundary. Consequently, a bug that only manifests once N0/ν grow large (an overflow, a majorant recursion sign/index error that only bites once terms dominate, a step-subdivision bug triggered only above some size threshold) would pass W1, W2 and Z3 undetected, and the manuscript nowhere states this limitation for the stability proof's controls (Section sec:method's "Tests and negative controls" paragraph discusses this style of gap only for Theorem thm:fast, and explicitly says "the programs of the stability proof have had no mutation study" without listing which faults W1/W2/Z3 miss). Recommend either adding a third control square placed near a far corner of `R_box` (with a locally known sign of D̃, if one can be established numerically) or adding a sentence to the "Tests and negative controls" paragraph noting that W1/W2/Z3 only test the near-origin numerical regime.

4. **ext/stability/winding_controls.py:42-62 (`decide`) duplicates ext/stability/winding.py:184-216 (`combine`) instead of calling it.** Both implement the identical "sum arg_change, divide by 2π, find the unique overlapping integer in a small window, check the SHA-256/speed-bracket agreement across pieces, check the pieces form a closed path" logic, but as two independently maintained copies. A future change to the decision rule in `winding.combine` (e.g., widening the candidate-integer search window, or changing the "unique" tolerance) will not automatically propagate to `winding_controls.decide`, so the control could silently start testing a different acceptance rule than the one used by the real proof step it is supposed to control. Since the manuscript is being fairly precise about "the same code" being reused (winding.py's proof text: "the program winding.py combine decides this…"; the controls' own docstring: "run through the same code: winding.main on two small closed boxes"), this asymmetry between the enclosure code (genuinely shared) and the decision code (duplicated) is worth fixing: have `winding_controls.decide` call `wd.combine`'s decision logic (factored into a helper) rather than reimplementing it.

## Minor

5. Both `ext/stability/simple_zero.py:34` (`R = fmpq(1, 25)`) and `ext/stability/winding_controls.py:29-31` (`ctrl0`'s corners at `F(1,25)`) independently hard-code the same "1/25" radius/half-width with no shared constant; if one file's value is ever changed without the other (e.g. to shrink/enlarge the Cauchy circle), the two will silently drift out of the "same neighborhood of the known zero" relationship the manuscript's prose implicitly relies on. Not currently a bug (they agree), just an avoidable coupling.

6. paper/nf-pulse.tex:782-798 (the SHA-256 provenance paragraph) explains, for the winding number and its controls, that `code/nfcore.py`, `code/certify_rest.py` and `code/block.py` are not fingerprinted by `winding.py`'s `fingerprint()`. `simple_zero.py:fingerprint()` (lines ~90-93) has the exact same three-file scope (`evans_rig.py`, `simple_zero.py`, `pulse_records.pkl`) and the exact same gap, but this is never stated explicitly for Z1/Z2/Z3. Not inaccurate, just an omission that a reader checking only the winding-side text might miss when auditing the Z-side sha256 guarantees.

## What was checked (files and lines read, commands run with their output)
- Read in full: `ext/stability/winding.py`, `ext/stability/winding_controls.py`, `ext/stability/simple_zero.py`, `ext/stability/evans_rig.py`, `ext/stability/run_all.sh`.
- Read `paper/nf-pulse.tex` lines 600-799 (Lemmas evans/lp, the Evans-function construction, Propositions prop:winding and prop:simplezero and their proofs, Lemma lem:multiplicity, Theorem thm:stab's proof, Table tab:stabchecks, Section sec:method including the "Tests and negative controls" paragraph and "Trust base", the Reproducibility section's command table and SHA-256 table).
- Verified line by line that `winding_controls.py` calls `winding.main` (not a reimplementation) for the enclosure/segment code, that its `BOXES` corners trace `[-1/25,1/25]²` (ctrl0/W1) and `[1/10,3/10]×[-1/10,1/10]` (ctrlN/W2) counterclockwise, and that these keys are absent from `winding.COVERS` (so `winding.py combine` never touches them).
- Verified that `simple_zero.py`'s `job()` computes `Dsq` once per arc and reuses it for both the Z1/Z2 numerator (`Dsq*e*delta`) and the Z3 mean-value numerator (`Dsq*delta`) — confirming the manuscript's "computed from the same enclosures" claim for Z3.
- Confirmed `evans_rig.evans()` has no branching keyed on which script or λ-region calls it: same function used by `winding.py`'s `job`/`node_job` and by `simple_zero.py`'s `job`.
- Ran `python3 ext/stability/winding_controls.py check` from `ext/stability/`: output `CTRL0 WINDING NUMBER 1 AS EXPECTED`, `CTRLN WINDING NUMBER 0 AS EXPECTED`, `WINDING CONTROLS: PASS`, matching the committed `winding_controls.json`.
- Cross-checked numbers in `ext/stability/data/winding_ctrl0_{a,b}.json`, `winding_ctrlN_{a,b}.json`, `winding_controls.json`, `simple_zero.json`, `winding_{right_up,top,left_up,left_down,bottom,right_down}.json` and `winding.json` against every numeric claim in Propositions prop:winding/prop:simplezero and Table tab:stabchecks (argument-change intervals, |D| lower bounds, segment/evaluation counts, the winding-number decision, D̃'(0)/(w̃ᵀv)(0)/D'(0) ranges, the mean-value half-width ≈0.021) — all matched, including the 1976-segment total and the "no segment had to be split" claim (segment counts equal `⌈L·50⌉` exactly, with no excess from splitting).
- Ran `sha256sum` on `ext/stability/evans_rig.py`, `winding.py`, `simple_zero.py`, `data/pulse_records.pkl` and confirmed the first-16-hex-digit prefixes match paper/nf-pulse.tex's SHA-256 table (lines ~790-797) exactly.
- Computed and compared time/evaluation ratios across the six main winding pieces and the four control pieces to assess the nproc-4-vs-"one core" claim (finding 1).
- Read `.gitignore`; confirmed no per-run `.log` files are committed, consistent with the manuscript's statement that only `run_all.txt` and the JSON/`.txt` data pieces are committed.

## What was not checked
- Did not run `winding.py`, `winding_controls.py run`, or `simple_zero.py` (excluded by instructions as long computations); all numeric agreement above rests on the already-committed JSON/`.txt` outputs plus the one permitted quick command (`winding_controls.py check`).
- Did not verify the mathematical correctness of the Evans-function enclosure itself (`evans_rig.py`'s majorant recursions, Krawczyk test, Taylor-model wrapping) beyond confirming it is literally the same function invoked by both the proof step and the controls; a genuine derivation-level bug in `evans_rig.py` that is wrong everywhere (not just at large λ) would presumably be caught by W1/W2/Z3 as described, but I did not attempt an independent re-derivation of the enclosure bounds by hand.
- Did not read `code/nfcore.py`, `code/certify_rest.py`, `code/block.py`, `code/lohner.py`, `code/prove_pulse.py`, `ext/stability/pulse_enclosure.py`, `ext/stability/large_lambda.py`, `ext/stability/ess_spectrum.py`, or `ext/stability/part3_symbolic.py` in any depth — these feed E1/E2/L1/L2/P1-4/S, which are outside the requested scope (W1, W2, Z3).
- No git history is available (this is not a git repository), so I could not check whether `run_all.sh`'s `winding_controls.py run 4` argument was changed after the committed control-piece data and the reproducibility timing table were produced, versus the table simply having been wrong from the start; finding 1 is stated as a present-tense script/prose mismatch, not a claim about when it arose.
- Did not check `review/` or `notes/` (excluded per instructions, and not present in this copy).
- Did not attempt to construct an actual mutant of `evans_rig.py` to empirically confirm the large-|λ| coverage gap (finding 3); that conclusion rests on reading the majorant-recursion code and the timing data, not on an executed mutation test.

---

## Response (2026-09-27, the manuscript's writer)

1. Controls "on one core" while `run_all.sh` passes four workers (must fix). **Fixed in the text.** The times stored
   in the control pieces are those of one worker, as the review's timing comparison shows (the Reruns of
   `notes/QUALITY.md` record a recomputation of the four pieces with `winding_controls.py run 1` in 17 minutes); the
   full script runs them with four workers. The table
   of Section 8 now says "which took 2.5 to 10.5 min each on one core (the script runs them with four workers)". The
   number of workers does not change the pieces.
2. Z3 coupled to the line that reports Z2 (should fix). **Fixed in the text, not in the program.** Section 6 now says
   that the line of `simple_zero.py` that reports Z1 and Z2 also requires Z3 to be refused, a coupling that can fail a
   correct run and never pass a wrong one. The program was not changed: its SHA-256 prefix is printed in Section 8,
   and changing it would mean recomputing the Cauchy integral on the shared machine for no change of any result.
3. No control at large |lambda| (should fix). **Fixed in the text.** Section 6 now says that W1, W2 and Z3 evaluate the
   Evans function only for |lambda| <= 0.32 and would not detect a fault of its enclosure that shows only at larger
   |lambda|, where most of the boundary of the box lies. No further control was added.
4. The decision step of the controls is a copy of that of `winding.py combine` (should fix). **Fixed in the text:** the
   proof of Proposition 5.6 now says that the controls call `winding.main` for the enclosure and segment code and use a
   copy of the decision step of `winding.py combine`. The programs were not changed (`winding.py` is fingerprinted by
   the stored pieces).
5. The radius 1/25 in two files (minor). **Not changed**; the two values agree.
6. The fingerprint of `simple_zero.py` has the same scope as that of the winding pieces (minor). **Not changed**:
   `simple_zero.py` is recomputed by every run of the check script, including the quick one, so it does not rely on a
   stored piece whose fingerprint could go stale; the base modules it imports are those listed in Section 8.

## The brief given to the session

    You are an independent reviewer of a computer-assisted proof. Your job is to find errors: check that three controls of the stability proof do what the manuscript says, and that the manuscript does not overstate them. Be adversarial and precise; do not praise.
    
    Material (read only files inside the current directory): nf-pulse/paper/nf-pulse.tex (the manuscript) and its programs and outputs in nf-pulse/code/, nf-pulse/ext/ and nf-pulse/data/. Ignore files the manuscript names under review/ or notes/ (not in this copy) and do not look for them elsewhere. Do not open any path outside the current directory. Do not edit any file. Do not run the long computations (winding.py run, winding_controls.py run, simple_zero.py); you may run quick commands such as python3 ext/stability/winding_controls.py check from nf-pulse/ext/stability/, and python3 for your own small checks (scratch files in ./scratch/ only).
    
    The controls, in Table tab:stabchecks and the proofs of Propositions prop:winding and prop:simplezero (Section 5):
    - W1 (control): ext/stability/winding_controls.py runs the winding computation of winding.py on the square [-1/25, 1/25]^2 and must find winding number 1 (around the zero lambda = 0).
    - W2 (negative control): the same on [1/10, 3/10] x [-1/10, 1/10], where there is no zero; it must find winding number 0, so that the false statement that D~ vanishes there is refused.
    - Z3 (negative control): ext/stability/simple_zero.py encloses D~(0) by the mean value over the same 128 arcs as the Cauchy integral for D~'(0); the enclosure must contain 0, so that the false statement D~(0) != 0 is refused.
    Check, reading the code line by line: that each control uses the same enclosure code as the proof step it controls (evans_rig.py, the segment test of winding.py, the arcs of simple_zero.py); that the stored pieces (ext/stability/data/winding_ctrl*.json and *_segments.txt) and data/winding_controls.json support the stated results, including the SHA-256 check; that ext/stability/run_all.sh prints the lines of Table tab:stabchecks from these outputs with patterns that cannot pass on a wrong result; whether a control could pass even if the code it controls were wrong in a way that matters (say which faults each control would and would not detect); and whether every sentence of the manuscript about W1, W2 and Z3 (Table tab:stabchecks, the proofs of Propositions prop:winding and prop:simplezero, and Section sec:method "Tests and negative controls") is accurate.
    
    Write your report in Markdown with these sections and nothing else before or after it:
    # Review of the controls W1, W2 and Z3
    ## Verdict (one line)
    ## Must fix (a control that does not do what the manuscript says, or a false sentence)
    ## Should fix
    ## Minor
    ## What was checked (files and lines read, commands run with their output)
    ## What was not checked
    Number the findings; give for each the location (file and line), what is wrong, why, and a concrete fix.
