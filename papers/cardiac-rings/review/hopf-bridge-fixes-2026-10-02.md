# Hopf bridge review fixes, 2026-10-02

Scope: `fourier/hopf.py`, `fourier/test_hopf.py`, `fourier/LEMMAS-hopf.md`. This maps all findings in
`hopf-bridge-review-2026-10-02.md` to the implementation after the unreviewed snapshot `4d2ce4f`.
The comparison base is `03a3d08`. The original review and all historical computation logs remain intact.
No commit, push, release, full 68-piece re-proof or complete Theorem A cover rerun was performed for this fixes report. The root-authorized isolated G_H core and single-piece test are separately logged below.
Status: in-project mathematical source admission passed, including the fresh-bound amendment; complete numerical acceptance pending.

| Finding | Applied fix | Verification and outstanding evidence |
| --- | --- | --- |
| GAP 1 | `spectrum_on` certifies that the conjugate eigenvalue ball avoids every Gershgorin disc except D2. Realness of A, Gershgorin coverage and the isolated single-eigenvalue disc then identify the conjugate with D2. The proof in Theorem A(a),(d) states this argument. The stronger full-ball inclusion is diagnostic only, because it can fail on point intervals. | Snapshot contains the check and its wrong-exempt-disc negative control in `test_theorem_A_core`. It remains required in the final full-cover run. |
| GAP 2 | `reprove_all` rebuilds every cover from logged centres, uses exact weights/settings/r_star, and stores the complete freshly certified public result: exact radii-polynomial bounds, both radii, g/omega/period enclosures and digests. Exact rational checks require each stored polynomial/contraction upper bound to dominate its expression and satisfy the strict proof inequalities. Historical equality is diagnostic only, with no floating tolerance introduced. `_obj` is excluded from serialized receipts and mutated proof output is refused. Each new record pins all 12 scientific/contract source files at import, the exact piece input line, the entire cover record and effective settings. `collect` requires exactly distinct indices 0 through 67 and exact coverage [0,6427/50000], with all 68 current complete matches. Bare match flags, float-only settings, missing/stale/failed evidence and duplicate piece or cover IDs cannot count. Strict final JSONL parsing rejects malformed complete lines, nonobject records and nonempty partial tails. A partial final append is an explicit failure requiring repair, never silently counted. Resume uses the latest attempt for each current input/source set, including failures. | Native evidence controls passed in the pinned runtime, including a 40-control run after the fresh-bound change; the final serialization/mutation controls passed 42 checks in 14.33 s wall / 99.08 MiB aggregate peak RSS. Earlier AST-extracted schema controls also passed. Complete final proof arithmetic remains pending. The historical two-piece reproof log is preserved, but supplies zero final-source matches. |
| GAP 3 | `check_theoremA_cover` checks the entire left + G_H + right chain over W using exact rational endpoints. Every interval must carry an exact other-eigenvalue upper bound and a positive ordered imaginary enclosure. G_H is mandatory in the same aggregate. Exact equality replaces the previous float tolerance for the maximum upper bound. Counts, adjacency, endpoint coverage, sign of Re lambda, transversality, l1 and omega signs are checked. A(c) now identifies the critical branch across adjacent intervals with a globally checked strict imaginary separation from the 16 stable discs, including G_H, without inferring identity from negative real parts. `collect` rejects a stale full-source pin. | Synthetic exact cover passes; controls reject gaps, wrong signs, missing G_H, float-only bounds, a one-bit aggregate alteration negative imaginary parts, and critical/stable imaginary overlap on either an ordinary or central interval. The isolated native G_H core passed its spectrum, transversality, l1 and negative controls. The final complete cover rerun is pending. |
| WEAK TEST 1 | Full-mode controls use tight piece 13: triple its parameter width, or recompute its centre line at e_hi + (e_hi-e_lo)/2. `_control_fails_by_radii` counts only failure beginning with the intended radii-polynomial failure message. A cover/domain/other failure does not count. | Snapshot implementation inspected. The historical scratch run reported Y0 3.37e-3 and 5.48e-3 against r_star 1e-3; this session did not rerun those computations. Full-mode green acceptance remains required. |
| WEAK TEST 2 | `_float_crosscheck` now checks Y1 by a central difference along the centre tangent, and obtains finite-mode lower estimates for Z2 using random corner perturbations and hill climbing, on piece 0 and the final piece. These must lie below the rigorous bounds. | Snapshot implementation inspected. These sampled float estimates are sanity checks and cannot prove an all-direction rigorous bound. Full execution remains required. |
| WEAK TEST 3 | Part B controls match the radii failure explicitly. Part C checks the containment guard separately and calls `branch.point_on_branch` with a widened record to bypass only that guard, on pieces three positions before/after G53P6, where the actual ball inclusion must fail. | Snapshot implementation inspected. `gks_branch_snapshot` now requires all 712 final pieces, validates their current-source manifest and all 711 gluings, and binds the complete final branch record hash. Collection re-derives the bridge ball inclusions against that final evidence; it cannot accept historical gluing flags. These mathematical computations await the final branch run. |
| MINOR 1 | Theorem A(e) and test wording say agreement with Erhardt's -2.6838 to about four significant digits, difference about 6.5e-5. | Text checked. The Hopf parameter discrepancy of about 1.5e-8 remains an observation; no cause is inferred. |
| MINOR 2 | Program, lemma document and result-generation status distinguish source admission from complete numerical acceptance. Fix mapping points to this report. New final logs are `theoremA_final.json`, `reprove_final.jsonl` and `gluing_gks_final.json`; `theoremA.json` and `reprove.jsonl` stay historical. Collection fails before writing unless all current-source requirements pass. | The historical `results/fourier-hopf.json` was deliberately not overwritten. It is stale after these edits and must be regenerated only after final evidence is complete, then checked with the full test. Root coordinates README/review-status/companion synchronization. |
| MINOR 3 | Lemma B3 explains that the Hessian sup MH is bounded only on the group's g-disc. eta_g r_star <= G_R puts gbar + Delta g in that disc even though f is affine in g. | Sentence checked against the Kc term and the implemented disc check. |

## Tests actually run

- Parsed both changed Python files with the system Python AST parser: passed.
- Executed `test_evidence_gates` with AST-extracted actual validator functions: 27 checks, 0 failed, 2.28 s,
  peak RSS 87.0 MiB. A subsequent two-control extension passed 29 checks in 2.42 s with the same peak RSS. Explicit schema-only stubs supplied `Centre.K`, the FLINT version string and synthetic
  dyadic bound encoding. No Arb or SciPy proof arithmetic executed. This is an acceptance-logic test only.
- Runtime inspection found system Python, `/private/tmp/pdfvenv/bin/python` and the bundled Codex Python.
  None had the complete existing SciPy + python-flint 0.9.0 scientific environment. The bundled Python had NumPy.
  This initial lookup limitation was resolved by the root's workspace runtime setup. This agent installed nothing.
- Native `test_hopf.py --bookkeeping-only` in `work/cardiac-proof-venv/bin/python`: 34 checks, 0 failed,
  4.58 s wall, kernel peak child RSS 117.25 MiB. Receipt: `/private/tmp/cardiac-hopf-bookkeeping.log.receipt.json`.
  A `subprocess.run` wall timeout of 30 s bounded this single-process check; no RSS cap was asserted. The sandbox
  denied `nice` setpriority but the test ran and exited 0. The normal supervisor first failed before any test
  because sandboxed psutil PID enumeration was denied; root verified that elevated supervision can inspect it.

- First native isolated G_H core and piece-0 pilot: 20 checks, 3 failures, 93.70 s wall, sampled aggregate
  peak RSS 410.28 MiB under 300 s / 2500 MiB supervision. The three failures all depended on exact historical
  equality; the new Arb proof itself and spectrum/transversality/l1, mutation and float controls passed.
  Y0, Z1, Z2, r_existence and dependent polynomial/contraction outputs differed from the historical record.
  A different floating-point inverse is a hypothesis; this run does not establish the cause. The failing log
  remains `/private/tmp/cardiac-hopf-short-tests.log` with its receipt. No production evidence was written.
- Fresh-bound native bookkeeping amendment: 34 checks passed in 10.90 s wall / 107.39 MiB aggregate peak RSS;
  six explicit fresh-inequality tampering additions then passed 40 checks in 14.15 s wall / 104.63 MiB.
  Public serialization/mutation controls then passed 42 checks in 14.33 s wall / 99.08 MiB.
  Logs: `/private/tmp/cardiac-hopf-bookkeeping-fresh.log`, `/private/tmp/cardiac-hopf-bookkeeping-final.log`,
  `/private/tmp/cardiac-hopf-bookkeeping-public.log`.

- Second native isolated G_H core and piece-0 pilot after fresh-bound admission: 21 checks, 0 failures,
  108.14 s wall, sampled aggregate peak RSS 326.02 MiB under 300 s / 2500 MiB supervision. The actual public
  reproof receipt serialized successfully. Fresh exact inequalities, source/input matching, last-attempt
  failure semantics, coefficient mutation checks, Y1/Z2 float sanity checks and the intended cover refusal passed.
  Historical bound discrepancies remain diagnostic. Log and receipt:
  `/private/tmp/cardiac-hopf-short-tests-fresh.log`, `/private/tmp/cardiac-hopf-short-tests-fresh.log.receipt.json`.
  Source SHA-256: hopf.py `c4e4f77abad02362adbddffbb0a6a356221ec451d31ee0175399e944064759c3`;
  test_hopf.py `30db4b3f6903e8bea14efaf26ffaeea7c11b8272172c06cb5c098604bfdf9244`.

## Finite rerun plan, after independent source check

Freeze the full pinned source set before the first scientific rerun. Editing any pinned file invalidates all
final-source matches. Run under a process-group timeout/watchdog, `nice -n 10`, and
`OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1`. The existing workspace interpreter is
`/Users/chasehendrick/Documents/Codex/2026-09-29/github-plugin-github-openai-curated-remote/work/cardiac-proof-venv/bin/python`.
The root's `work/cardiac-bounded-run.py` supervisor provides finite wall, sampled aggregate RSS and log caps,
with process-group termination. On this macOS sandbox, its PID enumeration needs elevated execution; root has verified elevated supervision for authorized tests. Commands below use `timeout` as notation for that verified bounded supervision.

1. `timeout 60 python3 test_hopf.py --bookkeeping-only`: expected seconds, no proof run. Native run passed in 4.58 s with 117.25 MiB kernel peak child RSS.
2. `timeout 300 python3 hopf.py --reprove-pieces 0 --workers 1 --budget 240`: one scientific proof to measure
   actual wall time and peak RSS before selecting concurrency. The first native core+piece-0 pilot took 93.70 s and peaked at 410.28 MiB aggregate RSS; its proof passed
   but the old historical-equality test failed. The second fresh-acceptance pilot passed 21 checks in 108.14 s / 326.02 MiB; all 68 pieces remain to be rerun.
3. `timeout 300 python3 hopf.py --theorem-a`: historical full-cover run took 223 to 234 s on one core.
   Writes the new `theoremA_final.json`. This is scheduled work, not a run reported here.
4. `timeout 3600 python3 hopf.py --reprove-all --workers 3 --budget 3300`: expected about 6,600 CPU seconds
   from the review's historical costs, approximately 2,200 seconds on three unconstrained workers plus overhead.
   Repeat the finite command if coverage remains incomplete. Groups rebuild once and emit after completing,
   so an external watchdog is the hard wall cap; the internal budget stops future collection work.
   Choose three workers only after measured one-worker RSS permits it. No memory claim is inferred from CPU cost.
5. `timeout 300 python3 hopf.py --bridge`, then `timeout 300 python3 hopf.py --collect`: only after current Theorem A and all 68 piece records pass.
   The bridge command writes the new final gluing log; collection independently re-derives branch gluings, bridge inclusions and identification, then writes the result. Expected cost and RSS are not yet measured.
6. `timeout 2400 python3 test_hopf.py`: full controls and six representative reproofs. The previous failing
   pre-fix acceptance run took 1,223 s; no post-fix full runtime or RSS has been measured. The optional
   `--rerun-theorem-a` adds approximately 240 s. This full test exceeds the short-test budget for the fixes phase.

The legacy Hopf logs and the published 1.0.0 evidence are preserved. Final branch collection must precede the
Hopf bridge/gluing refresh so G53P6's final uniqueness radius and current branch evidence are used.

## Claim limits

Uniform exponential orbital stability with asymptotic phase is claimed only over the G_Ks branch interval
[0.027499735464, 0.02778996093], after its separate final uniform certificate passes. Isolated Stage S bridge
point bounds and the qualitative small-amplitude Hopf theorem do not imply uniform stability on the entire
bridge to g_H. The amplitude branch's G_Ks monotonicity is not certified. These modified-cell statements do not
establish clinical validity or physiological action-potential accuracy. No historical priority claim is made.
