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
