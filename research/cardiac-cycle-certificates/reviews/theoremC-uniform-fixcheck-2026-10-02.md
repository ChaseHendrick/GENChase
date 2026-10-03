# Theorem C uniform stability independent fix check, 2026-10-02

This is an in-project adversarial reading by a separate AI agent session. No outside review is claimed. The reviewer did not implement the proof programs or tests. The accepted 1.0.0 results remain outside the change.

## Evidence and scope

The findings to close are the 21 entries in `theoremC-uniform-review-2026-10-02-partial.json`: L1 to L6, C345-1 to C345-6, F1 to F9. That historical report remains unchanged. Its F4 duplicates the missing report referenced by C345-2. The starting snapshot is `4d2ce4f`. The final implementation is being edited, so this initial document grants no source admission or result acceptance.

## Argument independently examined

For each group, the finite quadratic path is an untrusted approximation. The covered polynomial family contains the path on the wider complex strip, so the Hessian bound applies about every point of the path. The bound on `I - A DF` adds the point contribution, `h B'` and `h^2 B''`. The finite compression with norm below one makes the square finite inverse nonsingular; the explicit tail inverses then make A injective. The self-map and contraction inequalities give a zero about the moving centre for every real parameter in the unit.

Taylor coefficients in the parameter and their integral remainders bound the residual and Jacobian coefficients. The finite-degree path, joint holomorphy on the checked model domain and coefficient extraction justify use of the strip Fourier bounds. Identification by inclusion in every Theorem B uniqueness ball associates that zero with the logged branch.

The Hill window has constant, affine and quadratic terms plus an entrywise uniform error. Expansion through order four bounds the comparison operator. The inverse defect, boundary distances and the Schur-complement inequalities give the same spectral count at each parameter separately. The single neutral eigenvalue and the tail resolvent argument give one algebraically simple multiplier 1 and 17 strictly contracted multipliers. A positive uniform lower bound for the period turns each unit's exponent bound into its reported full-period multiplier bound. Piece or group intervals can be united only where the exact parameter ranges overlap.

This reasoning supports quantitative uniform orbital stability with asymptotic phase on admitted units. It does not extend that stability claim to the entire Hopf bridge, where only qualitative small-amplitude and isolated-point stability are available.

## Admission conditions to check after implementation

- L1 to L5 and C345-1, C345-2, C345-5, C345-6: correct variables and finite-polynomial domain; injectivity implication; matching lemma numbers and measured Z2 scale; joint holomorphy; honest report reference; xi in the mathematical interval rather than the ball's rounded rim; Fubini and containment of each piece in the unit.
- L6: separately exercise B' and B'' and their finite-to-tail and tail-row bounds, with a control that detects dropping the moving-centre contribution.
- C345-3: independently check the fourth-order coefficient at complex theta, beyond inclusion monotonicity.
- C345-4: independently check the identification norm, including the quadratic term, full parameter interval and Fourier weights.
- F1: each covered piece agrees with the admitted Theorem B record, and that record is hashed.
- F2: every used unit is tied to import-time proof-program and dependency hashes; historical ambiguous receipts do not count as final units.
- F3: exact piece and group ranges, centre digests and exact uniqueness radii agree with the branch record.
- F5: coverage refusal controls and gap-aware interval merging; actual half-unit reproduction and fallback behavior, including legacy failures lacking a part field.
- F6: bit-for-bit reproduction of a current-source logged piece at its recorded settings, with no silent skip.
- F7 to F9: explicit overlap before merging; outward upper bounds; actual unit settings; lemma/test hashes; one immutable read for validation, collection and hashing.

## Final verification

The subsequent code has a final branch manifest, exact logged-input re-proofs, source/dependency binding, exact piece-digest/range/weight/radius matching, rejection of test mutations, Theorem B record-to-snapshot checks, complete-coverage refusal and gap-aware interval merging. The new direct fourth-order complex-theta comparison uses 80-digit differentiation of the generated model through mpmath, independently of the Jet recurrence. These are appropriate source changes, subject to execution and final source freeze.

Fifteen independent pure-bookkeeping controls passed against AST-extracted functions from `branch_stability.py` SHA-256 `e10b46342d668f45107662a8fd564dc783c94a1fb0214feb5bf4453689dc5313`: exact current piece/group evidence accepted; stale program/dependency hashes, MUTATED evidence, altered piece range/digest/weights/uniqueness, wrong group, unlisted piece, missing piece range and narrower group interval rejected; a gap splits intervals, while touching intervals merge. The system-Python run had a 30-second signal deadline. This does not execute numerical proof code or establish final units.

That initial runtime limitation was subsequently resolved by the coordinator's pinned Python 3.12 environment with python-flint 0.9.0. The implementer reports 7/7 branch quick checks and 6/6 stability quick checks; I read the saved logs, including the independent complex fourth-order derivative and the sparse three-part operator oracle. The complete numerical acceptance suites remain pending.

I independently ran 86 assertions in the pinned runtime: a box crossing zero for a complex quadratic polynomial in the last state component and highest retained mode, with nonuniform weights; the moving-centre contraction step; specific refusal when Z1 equals one and when rho leaves its certified domain; and strict JSONL refusal without modifying damaged bytes. The external supervisor enforced a 60-second deadline and measured 54.0 MiB peak aggregate RSS; the run finished successfully in 0.54 seconds. Receipt: `review-boundary-receipt-2026-10-02.json`. The first sandboxed supervisor launch failed in process monitoring and killed its child; the successful retry used approved process-monitoring access. No numerical success is assigned to the failed launch.

The coordinator's separate G0P0 numerical re-proof pilot passed in 30.4 seconds and its exact manifest resumed without repeating the piece, as reported to this reviewer. This reviewer did not duplicate the pilot or start a full ODE or large proof run.

## Per-finding final source disposition

| Finding | Independent disposition |
|---|---|
| L1 | Correct separate test-vector formula in Lemma 11.0. Source argument closed. |
| L2 | Lemma 11.0 now requires a polynomial supported on modes through K. Its wider-strip use is justified. |
| L3 | The point norm is dominated by the path norm; both guards and the finite-compression injectivity argument are present. |
| L4 | Code references now match 11.4, 11.5 and 11.6. |
| L5 | Inconsistent 500 multiplier removed; the mathematical bound is unchanged. |
| L6 | Three-part sparse operator oracle and isolated B'' check pass in the implementer's quick suite. The full suite invokes the moving-centre mutation and must pass after final units exist. |
| C345-1 | Joint holomorphy and holomorphic coefficient extraction are explicit; box domains support the Fourier inclusion contract. |
| C345-2 | Reference now names the actual partial JSON review, fixes and this fix check. |
| C345-3 | Independent 80-digit fourth derivative at two complex theta values passed in the quick suite. |
| C345-4 | Weighted quadratic norm oracle passed; the independent mixed complex, crossing-zero boundary run additionally passed. |
| C345-5 | Application restricted to real xi0 in [-h,h], without claiming the rounded extra rim of D. |
| C345-6 | Fubini, box-cover domain and every piece's containment in I are explicit. |
| F1 | Collection binds the exact Theorem B record bytes, source hashes, immutable log hashes and all covered piece metadata. |
| F2 | Final logs require import-time program/dependency pins and branch input digests. Ambiguous historical units cannot supply final coverage. |
| F3 | Piece/group matching checks exact range, centre, weights, rho0, piece digest and uniqueness radius. Mutation controls passed. |
| F4 | Duplicate of C345-2, now corrected. |
| F5 | Coverage/gap/fallback controls pass. Actual half-unit re-proof twice is explicitly required by the full suite and remains pending. |
| F6 | Refreshed `_piece` loads the final admitted unit, fails if absent and re-proves with its exact logged settings. No silent comparison skip remains. Actual final bit-for-bit reproduction remains pending. |
| F7 | Gaps stop interval merging; independent controls passed. |
| F8 | Decimal and binary display bounds round upward and the exact rational bound is retained. |
| F9 | Data validation and hash use immutable snapshots; actual unit settings and separate lemma/test hashes are recorded. Strict reader controls passed. |

## Source admission and remaining result acceptance

The source fixes and theorem argument are admitted for bounded scientific reruns. No remaining source or mathematical blocker was found in this scope. This is conditional source admission, not certification of the old or new numerical results.

The branch manifest pins all implementation dependencies used here: branch, existence, centre, Arb model, Fourier evaluator, generated Arb model, stability, reference model and scales. `arbmodel.model` requires the generated bytes equal a fresh generation from the reference. The Hessian worker cache key includes the exact cover specification, cover centres and piece settings; each cached cover is rebuilt over its recorded g hull, R and rho2 and its coefficient digest is checked before use. The proof still checks cover membership and radius conditions. No cached scalar from an earlier source version supplies a proof.

Reviewed final source digests:

| File | SHA-256 |
|---|---|
| branch.py | e5739a1583b44b8c355e8f74e8d47360c0c9af12f62988f4c2649dd4e5b274bf |
| branch_stability.py | b04c1f827867cf5bbba31ed99f10e74cc6469b998ad43d3ad2372235cca59463 |
| test_branch.py | ffc2b5508bb82b6d254ea76a27a5aad77163d9dd4ba8d21e38e4d240b4085d59 |
| test_branch_stability.py | 527ef31bf59afb9bdb2dc68a2ae0c1c0d38d5d160ff2c75c72324ef2d2dbc317 |
| LEMMAS-stability.md | 9dc27ff8d0e9d219435fd01141d3b7fa28e16358cab9d1897ed34327c033fcc8 |

Before theorem or publication acceptance: re-prove all 712 pieces with those sources; rederive all 711 gluings; collect the complete matching branch record; certify every branch piece's uniform stability with admitted units; run full branch/stability acceptance and negative suites, including actual logged-piece and half-unit reproduction; and verify all final source/data hashes. No claim of a complete final numerical certificate is made in this review. Earlier ambiguous hashes and failures remain evidence and were not overwritten.

## Separate Linux shard orchestration admission

The subsequently added helper `.github/scripts/cardiac-branch-shards.py` and opt-in workflow `.github/workflows/cardiac-reproof.yml` were reviewed separately from the unchanged mathematical proof sources. The first strengthened parser failed on actual canonical history: positive Infinity is present in the three diagnostic fields `rec.strips.{J,dg_f,dg_J}.S_over_L_max`. That failed actual-input probe was reported before launch. The repair permits positive Infinity only at those exact paths, preserves canonical values and hashes, and refuses NaN, negative Infinity and nonfinite numbers anywhere else. Exact proof bounds continue to use hexadecimal rationals and strict inequalities. No accepted historical input was rewritten.

The helper partitions complete groups modulo six. Independent checks on the actual data give group counts 10, 10, 10, 9, 9, 9 and piece counts 124, 124, 124, 112, 116, 112, covering exactly all 57 groups and 712 pieces once. Shards require current-source/input identities, canonical typed settings/metadata, centre identities, exact polynomial/contraction/radius bounds, positive nonconstant-orbit margin and ordered positive frequency/period enclosures. Missing or duplicate shards and changed group metadata are refused. Merge requires all six artifacts and all 712 distinct pieces, calls the admitted final validator and rederives all 711 gluings before writing the merged log. Existing evidence and collected-record paths are checked before mutation, output creation is exclusive, and replacement of an existing Mac log requires an explicit backup option.

The workflow uses six Ubuntu 24.04 runners, three single-threaded workers per runner, explicit job/command budgets and a checked pinned Linux python-flint wheel. Artifacts are downloaded from the same workflow run; both shard and merge artifacts are retained on failure. It has read-only repository permissions and an explicit opt-in push condition. It does not publish, merge a PR or promote manuscript status.

Twenty-eight independent synthetic and actual-partition controls passed in 0.41 seconds with a 30-second signal deadline. Receipt: `review-linux-shard-helper-receipt-2026-10-02.json`. The final inspected helper SHA-256 is `ae49cff4e26394a780ef6061b2b9a75b4615d112c368af4cefd362897d32443c`; workflow SHA-256 is `68b0645d5754f5bb9c6276127f8f488c25d0fd73f6c05a751fcfa6f757ca4e83`, at checkpoint `6d64a97`. The helper changed immediately before that checkpoint to strengthen metadata and positivity gates, so the earlier helper hash was explicitly superseded and the expanded controls were rerun.

This admits the orchestration for the requested opt-in bounded calculation. It is not a completed 712-piece distributed reproof, numerical stability certificate or publication acceptance. Final artifacts must still pass the complete admitted mathematical collectors and negative suites.

The initial cloud runtime preflight invoked the complete Arb-model test script and failed solely because its separate CAPD comparison binary was unavailable. That failure was not converted into a passed full suite. The revised Arb-only workflow explicitly runs the pinned-wheel test and all 14 remaining native arithmetic/model controls, with each selector independently checked to match current tests. `test_b_capd` remains unrun on these runners and is not claimed as passed; accepted 1.0.0 CAPD evidence is unchanged. This scoped runtime correction does not change any proof source. The inspected replacement workflow SHA-256 is `097b45fdf079da657f36368ddd0b2b15c09952749d83c200dd7b32b456c3e421`, superseding the workflow digest above; helper digest is unchanged.

The final frozen workflow additionally records runtime metadata before tests and retains wheel-check and model-control logs as artifacts; pipefail preserves failed test exit codes through tee. Those logging edits leave the verified selector set unchanged. The final admitted workflow SHA-256 is `95030df6258d84a8b00c2e3fc217f037bc30326c7ba1ae7c03cba3abb79fa6b5`, superseding both earlier workflow digests. Helper SHA-256 remains `ae49cff4e26394a780ef6061b2b9a75b4615d112c368af4cefd362897d32443c`. The failed first workflow run `37075927471` remains failure evidence. The requested relaunch is admitted, with complete scientific computation and result acceptance still pending.

## Actual complete conductance-branch certificate accepted

Cloud workflow run `37076139080` completed all six shards and the merged certificate. I independently inspected immutable snapshots of its actual merged final log and producer summary with the frozen admitted sources. Every one of the 712 unique receipts passes exact source/input/settings/centre identity and rational radii-polynomial, contraction, radius, nonconstant-orbit and positive frequency/period gates. The complete final validator accepts exactly 57 historical groups and the reviewed interval `[0.027499735464, 0.02778996093]`. Every producer piece summary and exact setting agrees with its final receipt; source/document, log and centre hashes match.

All 711 adjacent gluing inequalities were independently rederived in native Mac Arb arithmetic. Every one passes and the 711 complete gluing records are bit-for-bit equal to the Linux producer records. The minimum exact gluing slack is `828405937334717/2305843009213693952`, strictly positive. No piece proof or ODE integration was duplicated in this independent read-only check. The successful bounded process exited 0 in 11.50 seconds with 289.81 MiB peak aggregate RSS under a 120-second, 512-MiB supervisor. An initial reviewer receipt formatter failed after the checks on a shadowed Path variable; its failure and the complete successful rerun are both preserved in `review-cloud-branch-final-receipt-2026-10-02.json`.

Final merged log SHA-256: `cd3fb0811f7bc67aa20a0298088d58a9768b158b720a3cea0c8e35c6a87b20e8`. Immutable cloud producer summary SHA-256: `099c0c9460c726991b01f3395ece2fb0b5939d545801b2d7bc22c689a175f195`. The producer's log-path metadata identifies its cloud staging path. It must be preserved verbatim; a subsequent collector run on the byte-identical canonical installed log produces a new canonical summary with a separate hash and runtime/path context. Editing producer metadata would invalidate its reviewed hash.

The actual conductance-branch certificate is accepted in this precise scope: existence, local uniqueness, continuity and minimal period for every conductance in the exact covered interval. The review registry may record that scoped acceptance and these hashes. This decision does not promote inherited point stability, quantitative uniform branch stability, the 68-piece Hopf amplitude branch, Hopf bridge closure or the 1.1.0 manuscript/release. The broader uniform-stability acceptance suites and other pending publication gates remain required. Accepted published 1.0.0 evidence is unchanged.

The coordinator installed the final log byte for byte and generated a new canonical summary. Its canonical log path and installed log hash pass. Exact proof fields of every piece, all711gluings, groups, settings, source/document identities and centre/log hashes agree with the preserved producer. The three untrusted float display diagnostics `Y0_over_cap` at G2P8, G16P8 and G50P3 differ only in their final digits and do not decide any exact proof gate. Canonical summary SHA-256: `0ac338b9b09ea91775c180d35b7c95e075dc1956aa28e4a311f2623f388e17e3`. The registry binds this new canonical hash, preserving the producer hash and the limited accepted scope.

## Conditional manuscript methods draft

Read-only review of `papers/cardiac-rings/notes/v2-branch-methods-draft-2026-10-02.md` found no new mathematical or source blocker relative to the admitted lemmas. The draft supplies the Fourier residual/injective inverse, finite/tail contraction, continuity and gluing, moving affine and quadratic tube identification, Taylor remainder arithmetic, all-parameter Hill coefficient enclosures, closed Hill domain and Floquet multiplicities, finite-window/tail Schur count and local orbital stability with phase. The draft correctly separates the conductance result from the accepted ring/cable theorem and does not claim uniform nonlinear constants. This is a conditional argument review, not acceptance of missing uniform numerical certificates or a publication decision. The opening branch-admission status predates the separate scoped actual712/711 acceptance and can be updated; several inline math wrappers need editorial repair. Receipt: `review-branch-methods-draft-receipt-2026-10-02.json`.

Final editorial refresh independently verified: only the opening checkpoint paragraph was updated to cite the actual scoped branch acceptance and one trailing space at line430 was removed. Reconstructing the preceding bytes gives the originally reviewed draft hash, so all mathematical argument sections are unchanged. Final draft SHA-256: `05aa42c39b51c028bfcb47c2a3b52ad46201e731bedff43e835ab02bae1ff7ea`. The receipt preserves both hashes and the prior conditional scope.
