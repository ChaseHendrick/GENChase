# Theorem C uniform review fixes, 2026-10-02

This is an in-project source-fix record for the 21 findings in
`theoremC-uniform-review-2026-10-02-partial.json`. It is not a certificate of the final rerun.
The independent fix check and all final numerical computations remain required.
Historical logs and existing theorem results have not been rewritten by these fixes.

## Per-finding evidence

| ID | Fix and exact scope | Evidence and remaining check |
|---|---|---|
| L1 | Root coordinates the Lemma 11.0 test-vector notation: use a separate vector v for DF(x)-DF(y). | Documentation fix outside this agent's four-file scope. Confirm in independent fix check. |
| L2 | `_z2` applies to finite polynomial centres within the hull. Root coordinates the precise polynomial hypothesis in Lemma 11.0. | Group path has only modes through K. Documentation fix check remains. |
| L3 | Group proof explicitly requires `Z1_point < 1`; `lemma_11_1` independently requires `Z1_path < 1`. | `prove_group_uniform` source has both guards. Root coordinates the lemma implication. |
| L4 | Code now references Hill coefficients 11.4, comparison operator 11.5 and theorem 11.6. | Source inspection of module docstring and group proof stages. |
| L5 | Group motivation no longer uses the inconsistent `500 x 3e-3` value. | Source inspection of the moving-centre motivation. |
| L6 | New sparse operator oracle checks finite/finite, finite/tail and tail blocks separately and isolates B'' without h B'. A full test invokes `drop_moving_centre`, checks exclusion from collection and the nonzero independent path increment. | `test_operator_blocks_each_part_and_second_order` and `test_group_drop_moving_centre_hook_detected`. Sparse mathematical quick test passed; full mutation/half reproduction tests remain scheduled after final logs. |
| C345-1 | Jet docstring states holomorphy in a neighbourhood of the input box; root coordinates joint holomorphy in inputs and parameter in the lemma text. | Documentation and code-domain guards inspected. Independent fix check remains. |
| C345-2 | Root coordinates replacing the nonexistent final reading reference with the actual partial JSON review and explicit final-review status. | This report records fixes separately, without claiming a completed reading. |
| C345-3 | Independent mpmath differentiation of the original exact-decimal model checks c4 at two complex theta values. Its evaluation uses no Jet or DJet recurrence. | `test_complex_fourth_order_independent`, 80 decimal digits, fourth derivative divided by 24. Passed on the isolated macOS arm64 runtime. Existing tests for orders 1 to 3 remain. |
| C345-4 | A sparse quadratic weighted polynomial has an independently known endpoint supremum, checked at 101 points. Controls show dropping d^2, collapsing the interval to its midpoint or removing nu weights underestimate it. | `test_poly_norm_weighted_quadratic_sup`. Passed on the isolated macOS arm64 runtime. Original uniqueness-radius negative control remains. |
| C345-5 | Jet and `_path_coeffs` explicitly restrict the base set to [-h,h]; they do not claim enclosure on the rounded extra rim of D. | Source inspection. Root coordinates matching lemma wording. |
| C345-6 | `group_data` explicitly checks P_i subset I. Root coordinates Fubini and the box-cover domain statement. | Code check present; documentation fix check remains. |
| F1 | Stability collect reads the final branch snapshot, matches every piece to the complete Theorem B record by range, centre, digest, weights and uniqueness radius, validates complete connected gluing and hashes the exact record bytes. | Pure structural negative controls for missing pieces, range/radius/digest/weight mismatches, incomplete connected coverage and stale hashes pass. Final theorem record cannot be collected before reruns. |
| F2 | Both programs snapshot source hashes before importing proof modules, compare them after import and retain import-time values in workers. Final branch manifest binds historical input and centres; every actual reproof stores source hashes and the input-piece digest. Stability collection admits only matching source versions and excludes mutations. | Changed-source and mutation controls pass; isolated G0P0 actual reproof and source binding passed, resume skipped it without changing the log. Full runtime coverage/bit reproduction checks remain. |
| F3 | Piece coverage requires exact range, centre, weights, rho0, branch-piece digest and logged uniqueness radius. Group coverage requires listing the piece, exact per-piece range/digest, unit range containment and matching identification radius/digest/range. | Piece and group mismatches are rejected by passing pure structural controls. |
| F4 | Same missing-review-reference correction as C345-2, coordinated by root. | Independent documentation fix check remains. |
| F5 | Coverage negatives cover wrong group, omitted piece, wrong digest, narrower unit, radius mismatch and half-unit matching. Interval merging stops at a gap. Pure fallback plan tests whole group, both halves, individual failed halves, piece fallback, already-covered halves and legacy missing part. A full test actually proves a half twice and compares exact fields. | Three pure bookkeeping/fallback tests pass via AST extraction of the unchanged function bodies. Half numerical reproduction is required in the full suite and is unrun. |
| F6 | Piece acceptance uses the final logged unit's exact settings and requires a match; absence is an explicit failure. It compares rho, theta_T and multiplier hex values without the old silent K_e skip. | Source inspection. Final piece rerun plus `test_branch_stability.py piece` remains required. Historical G0P0 is preserved, with no claim it is reproduced by current code. |
| F7 | `_covered_runs` merges only actually overlapping covered intervals. | Passing structural control yields two intervals for a gap and joins the overlapping second and third pieces. |
| F8 | Multiplier text rounds decimal upper bounds toward positive infinity. The numeric field uses an upward binary float and includes the exact rational bound. The theorem names the full-period nontrivial multiplier bound. | Passing exact rational rounding controls; final worst value not recomputed here. |
| F9 | Collectors parse and hash the same immutable byte snapshots. Branch records store per-piece settings; stability records store per-unit settings. Sources use import-time hashes; documents and tests are hashed separately. | Source inspection and structural controls. Existing final log tails are never repaired silently. Final record generation remains pending. |

## Bounded checks actually run

All numerical checks used the root-provided isolated Python 3.12.14 environment with python-flint 0.9.0,
FLINT 3.6.0, NumPy 2.4.6, SciPy 1.17.1 and mpmath 1.3.0. This is macOS arm64. Its wheel differs from the
historical Linux wheel. The historical `FLINT_PIN` was not replaced. Root separately verified the macOS wheel
SHA-256 `025fd4e77f2cbbf40f63b9cd7571aad3803deb57aecd72e7c397480fe84921a0` and 112 installed wheel files;
see the sibling workspace runtime manifest `work/cardiac-runtime-2026-10-02.json`.

Every numerical invocation had supervisor caps 300 seconds and 2500 MiB aggregate sampled RSS, with one BLAS
thread. macOS process-tree enumeration required an approved sandbox escalation; the first sandboxed supervisor
failed before testing and its `finally` block killed its child. No numerical result was claimed from that failure.

| Command/control | Result | Wall time, peak aggregate RSS | Evidence |
|---|---|---|---|
| Python `compile(..., 'exec')`, four edited files; `git diff --check` | Passed | Short structural checks | Command outputs in this session |
| Pure AST-extracted bookkeeping probe, 3 tests | Passed | 0.34 s | `/private/tmp/branch_bookkeeping_probe.py` |
| `test_branch.py quick` | 7/7 passed | 2.926 s, 249.531 MiB | `/private/tmp/cardiac-branch-quick.log` and `.receipt.json` |
| `test_branch_stability.py quick` | Final 6/6 passed | 4.536 s, 191.578 MiB | `/private/tmp/cardiac-stability-quick-fixed.log` and `.receipt.json` |
| Isolated `branch.py --reprove --workers 1 --labels G0P0 --budget 240` | Actual piece proof passed, 1/712 | 34.095 s, 711.969 MiB | `/private/tmp/cardiac-branch-pilot.log` and `.receipt.json` |
| Identical isolated reproof resume | Skipped completed piece; bytes unchanged | 4.827 s, 161.703 MiB | `/private/tmp/cardiac-branch-pilot-resume.log` and `.receipt.json` |
| `arbmodel.py --check` | Versions/reference pin/freshness/evaluation passed | 0.272 s | `/private/tmp/cardiac-model-check.log` and `.receipt.json` |
| `test_arbmodel.py -k field_contains_mpmath` | 2016 field components at 104 real and 8 complex points contained | 0.537 s | `/private/tmp/cardiac-model-field.log` and `.receipt.json` |
| `test_arbmodel.py -k jacobian` | 38304 derivative entries contained; all 18 dropped-column mutants detected | 5.867 s | `/private/tmp/cardiac-model-jacobian.log` and `.receipt.json` |
| `test_arbmodel.py -k domain_and_parameter_interval` | Domain refusals and interval inclusion/exclusion passed | 0.273 s | `/private/tmp/cardiac-model-domain.log` and `.receipt.json` |

The initial stability quick run passed 5/6 and found a test fixture typo, `(4).exp()` on a Python int. The fixture
was corrected to `arb(4).exp()`, with its exact sparse tail-column lower bound corrected to 3/4 using nu=2 and
|m|=2. The final complete quick suite passed. No proof tolerance or production bound was loosened.

The isolated pilot data directory is `/private/tmp/cardiac-branch-pilot-h74pbatk`. Its new final log has SHA-256
`dc053aa25a2165f917fb69d039d36172659f3a523b07d59c6cccf51fc4689672`, unchanged after resume. The piece's
program and source hashes match the importing process. Its input range is exactly
[0.027499735464, 0.027500264536] and uniqueness radius hex is `0x63c8b00bbcbe9p-60`.
`validate_final()` refuses this pilot with `final branch incomplete: 1 of 712 pieces`.
Production final logs and existing theorem results were not modified.

The pilot does not reproduce historical Linux Y0, Z1, Z2 or existence-radius hex values. Its validity radii
r_star and r_uniqueness match exactly. Final stability must use the recomputed final branch, as enforced in code.

Full 712-piece reproof, stability proof units, full acceptance suites, half-unit exact reproduction and independent
source-fix check remain required. No CAPD binary test or ODE integration was run in this lane.

## Exact finite rerun commands

The following use the isolated root-provided runtime and supervisor. Run from
`research/cardiac-cycle-certificates/fourier`. Freeze proof sources before the first production final run; a
changed source/input manifest makes resume refuse the log. Final logs are append-only. An incomplete final line
is preserved and refused, for explicit investigation. Root schedules the full computations after source review.

```sh
CARDIAC_PY=/Users/chasehendrick/Documents/Codex/2026-09-29/github-plugin-github-openai-curated-remote/work/cardiac-proof-venv/bin/python
CARDIAC_SUP=/Users/chasehendrick/Documents/Codex/2026-09-29/github-plugin-github-openai-curated-remote/work/cardiac-bounded-run.py

"$CARDIAC_PY" "$CARDIAC_SUP" --seconds 300 --rss-mib 2500 --log /private/tmp/cardiac-branch-quick.log -- "$CARDIAC_PY" test_branch.py quick
"$CARDIAC_PY" "$CARDIAC_SUP" --seconds 300 --rss-mib 2500 --log /private/tmp/cardiac-stability-quick.log -- "$CARDIAC_PY" test_branch_stability.py quick

# Each invocation is finite. Repeat at most eight branch invocations under root's supervisor,
# stopping as soon as all 712 pieces have completed or a proof fails.
"$CARDIAC_PY" "$CARDIAC_SUP" --seconds 3600 --rss-mib 2500 --log /private/tmp/cardiac-branch-final.log -- /usr/bin/nice -n 10 "$CARDIAC_PY" branch.py --reprove --workers 3 --budget 3300
"$CARDIAC_PY" "$CARDIAC_SUP" --seconds 300 --rss-mib 2500 --log /private/tmp/cardiac-branch-collect.log -- "$CARDIAC_PY" branch.py --collect

# Repeat at most eight stability invocations under root's supervisor,
# stopping as soon as all 712 pieces are covered or no further attempts remain.
"$CARDIAC_PY" "$CARDIAC_SUP" --seconds 3600 --rss-mib 2500 --log /private/tmp/cardiac-stability-final.log -- /usr/bin/nice -n 10 "$CARDIAC_PY" branch_stability.py --groups --workers 3 --budget 3300
"$CARDIAC_PY" "$CARDIAC_SUP" --seconds 300 --rss-mib 2500 --log /private/tmp/cardiac-stability-collect.log -- "$CARDIAC_PY" branch_stability.py --collect
"$CARDIAC_PY" "$CARDIAC_SUP" --seconds 1800 --rss-mib 2500 --log /private/tmp/cardiac-branch-tests.log -- "$CARDIAC_PY" test_branch.py
"$CARDIAC_PY" "$CARDIAC_SUP" --seconds 3600 --rss-mib 2500 --log /private/tmp/cardiac-stability-tests.log -- "$CARDIAC_PY" test_branch_stability.py
```

The supervisor pins BLAS threads. Its sampled aggregate RSS guard is not a kernel memory limit. Use a fresh
supervisor log path for each repeated production invocation, since the supervisor opens its own console log with
truncate semantics; the proof JSONL log itself remains append-only.

The final branch manifest requires exactly 57 groups, 712 pieces and the historical range
[0.027499735464, 0.02778996093]. Collection requires complete source/input matching and all 711 rederived gluings.
Stability collection refuses any missing piece and requires the complete matching Theorem B record.
No old `accepted=true` or success Boolean is promoted into a new numerical proof by reprove.

## Runtime and memory evidence

Historical JSONL timings, read without rewriting them:

- 712 branch piece `wall` values sum to 5.4727872847 CPU hours; maximum piece time 63.909 seconds.
- 57 recorded Hessian covers sum to 0.2533333333 hours. The new worker cache builds at most roughly one cover per
  worker per group, so 3 workers suggest about 6.23 CPU hours including covers, roughly 2 to 3 wall hours before
  scheduling and I/O effects. This is an estimate from old runs, not a new measurement.
- 127 successful historical stability unit `wall_s` values sum to 4.4895 CPU hours; maximum 240.1 seconds.
  Failed whole/half attempts add CPU time. Allow about 5 to 7 CPU hours and 2 to 3 wall hours at 3 workers.
- Historical logs carry no RSS. The new G0P0 pilot measured 711.969 MiB aggregate with one worker; resume measured
  161.703 MiB. A three-worker branch planning estimate is about 1.8 GiB aggregate, extrapolated from this single
  piece, not a measured all-group peak. Stability proof-unit RSS is still unmeasured. Matrix dimensions are 451 for
  K=12 and 450 for K_e=12, increasing to 594 for K_e=16. The 2500 MiB supervisor guard must remain active, and root
  should reduce workers if it triggers. The internal time budget is not an RSS limit.

No new mathematical blocker was confirmed by source inspection. The independent source review and the pinned
full numerical coverage remain prerequisites for final claims.

## Source and historical input hashes at the source-review handoff

- `fourier/branch.py`: `e5739a1583b44b8c355e8f74e8d47360c0c9af12f62988f4c2649dd4e5b274bf`
- `fourier/branch_stability.py`: `b04c1f827867cf5bbba31ed99f10e74cc6469b998ad43d3ad2372235cca59463`
- `fourier/test_branch.py`: `ffc2b5508bb82b6d254ea76a27a5aad77163d9dd4ba8d21e38e4d240b4085d59`
- `fourier/test_branch_stability.py`: `527ef31bf59afb9bdb2dc68a2ae0c1c0d38d5d160ff2c75c72324ef2d2dbc317`
- `fourier/data/branch/run_K12.jsonl`: `b761e1b150ec2a1f3165a671c7af570863bd09fce4c1d82ba7c7734ce98eafcb`
- `fourier/data/branch/stability_uniform_K12.jsonl`: `bc2d80177231be12b54fadd7dd7e1668af6e57cee6889e8cdfb1462097c9435b`
- `fourier/data/branch/centres_K12.jsonl`: `396610e93cb6b8d233776d88aacdd7a461970f3efd638eb1b8d9e1688b789b36`

## Source freeze and next-stage status

Root confirmed current-source reviewer admission for the branch and stability source hashes listed above and
launched the production branch reproof with 3 workers, internal budget 3300 seconds, external cap 3600 seconds and
aggregate sampled RSS guard 4096 MiB. No further proof-program edits were made by this implementer after the
G0P0 pilot. This launch is not proof of completion; the final 712 pieces, 711 gluings and all stability coverage
still require successful computation and collection.
