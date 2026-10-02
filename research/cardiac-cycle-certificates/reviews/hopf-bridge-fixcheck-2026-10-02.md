# Hopf bridge independent fix check, 2026-10-02

This is an in-project adversarial reading by a separate AI agent session. No outside review is claimed. The reviewer did not implement the proof programs or tests. The accepted 1.0.0 proofs are outside this change's scope.

## Snapshot examined

The initial reading compared `03a3d08` with the unreviewed snapshot `4d2ce4f`, following `docs/HANDOFF-2026-10-02-cardiac-rings-1.1.0.md`. Final source admission and rerun acceptance are pending below. Earlier evidence remains in `hopf-bridge-review-2026-10-02.md`.

## Initial findings

- GAP 1: the conjugate-eigenvalue exclusion fix is mathematically sufficient. For a real matrix the conjugate is an eigenvalue, Gershgorin places it in some disc, and exclusion of every disc except D2 identifies it with D2's simple eigenvalue. Containment of the entire enclosure in D2 is unnecessary. The new code implements this exclusion. This is a sound alternative to the review's suggested stronger containment check.
- GAP 2 remains open in the snapshot: only 2 of 68 piece records have exact re-proofs tied to its program. `reproof_compare` compares the exact Y0, Z1, Z2, radii, polynomial signs, contraction, frequency and parameter endpoints, cover and centre digests. `reprove_status` binds a receipt to the current program and current piece-line digest. This machinery is appropriate, but its existence does not substitute for the remaining runs.
- GAP 3: the structural checker checks rational adjacency and coverage of W, recorded counts, left/right signs, negative other eigenvalues, transversality, frequency and Lyapunov-coefficient signs. This rechecks bookkeeping, not interval inequalities. The collector only warns on an old Theorem A program hash and can still claim closure. Final acceptance must refuse that case.
- The collector trusts `gluing_gks.json` unless the number of amplitude pieces changed. Equal counts do not bind the centre, weights, radii, source or branch snapshot. The branch snapshot reader explicitly reads the legacy `run_K12.jsonl`. After branch finalization, gluing must be rederived against the source-bound final branch and admitted record. A stale earlier bridge check is not sufficient evidence for the final artifact.
- WEAK TEST 1: the code moves the two previously red controls to tight piece 13 and requires the radii-polynomial failure message. This addresses the diagnosed large-slack and arbitrary-exception weaknesses; execution is pending. The earlier 51-check run with two failures stays historical evidence.
- WEAK TEST 2: independent finite-mode float Y1 and Z2 sanity checks are added at the first and last pieces, with the lower-estimate limitation stated. These cannot prove a global bound, but exercise the previously unexamined terms.
- WEAK TEST 3: the code separately exercises the parameter containment guard and ball inclusion, widening a copied record to bypass the former. It checks ball inclusion on pieces three positions away because immediately adjacent balls can legitimately contain the point.
- MINOR 1 and MINOR 3: the corrected four-significant-digit comparison and the explanation of the g-disc condition are mathematically appropriate. MINOR 2 remains contingent on the final source/data hashes, consistent status and actual completed fix check.

## Scientific scope

The amplitude branch gives existence and gluing to the Hopf point. Hopf theory gives qualitative stability for sufficiently small amplitude without an explicit parameter range. Stage S gives stability at isolated identified bridge points. Neither proves quantitative uniform stability throughout the bridge. The separate Theorem C uniform branch calculation must be admitted on its exact recorded interval and source-bound units.

## Final verification

The subsequent implementation has strict exact 68-piece input checks, final receipt and Theorem A paths, all-dependency hashes, exact receipt comparisons, rejection of stale Theorem A evidence and refusal of incomplete current-source re-proofs. Those are appropriate fixes to the snapshot's acceptance weakness. The new exact Theorem A aggregation includes the central interval and refuses missing exact interval bounds; display floats do not decide it.

Nine independent pure-bookkeeping controls passed against AST-extracted functions from `hopf.py` SHA-256 `7a84c96693888001359a0ca80af5220bebdacb7614f5b9ae9c0993e6de201a82`: accept a complete exact cover; reject a gap, missing central bound, missing interval bound, one-bit aggregate change, negative imaginary enclosure, wrong sign, inverted central enclosure and short window. This system-Python run used an exact-rational decoder for hex dyadics and a 30-second signal deadline. It did not import Flint or execute a proof.

An additional argument gap was reported to the coordinator: Theorem A(c) says adjacent positive-imaginary eigenvalues cannot be among the 16 negative-real eigenvalues. On the right of the Hopf point the critical eigenvalue also has negative real part. A checked real-part separation in the common-polydisc interval J repairs that identification. A cheap exact-rational audit of the snapshot found all 207 noncentral intervals meeting J satisfy the needed separation: their minimum critical lower real part is `-1.49591e-6`, above the stable upper bound `-4.692685240107801e-5`. The central interval must be included in the implemented check. The final source must contain the check and corresponding theorem argument before admission.

Pending the final implementation of that argument and source-bound final branch gluing, final file digests, numerical controls and required reruns. The default local Python lacks Flint, and the bundled Python has NumPy but lacks Flint and SciPy; no numerical checks were represented as passed. This document does not yet admit large final runs or certify the final result.

## Subsequent source admission check

The earlier pending paragraphs describe earlier snapshots. The coordinator subsequently provided a pinned native Python 3.12 environment with python-flint 0.9.0, NumPy 2.4.6 and SciPy 1.17.1. The source now repairs Theorem A(c) with global imaginary separation rather than the earlier suggested real-part comparison. Every critical imaginary lower bound, including the central interval, exceeds the exact maximum absolute imaginary bound of the 16 stable discs. At a shared endpoint in the common equilibrium polydisc, the matrices agree and exactly one eigenvalue can lie above that imaginary threshold. Thus the chosen critical eigenvalues agree even when their real parts are negative. The revised proof states this argument explicitly.

I independently executed three local interval spectral controls in the pinned runtime: at G_H and shifted by 1e-9 to each side. Conjugate exclusion, wrong-disc refusal, stable-disc negativity, expected left/right real signs and critical/stable imaginary separation passed. The central critical lower imaginary endpoint was about 0.119341401778, while the stable absolute imaginary upper bound was about 0.03175641654. This 5.28-second run used 78.8 MiB peak aggregate RSS and a 60-second external limit. It did not recompute the entire Theorem A cover. Receipt: `review-hopf-spectral-receipt-2026-10-02.json`. Its source hash predates the subsequent fresh-result acceptance changes.

The original native piece-0 pilot proved a radii polynomial but failed three historical equality controls, with differences in the last digits of Y0, Z1, Z2 and radii-derived outputs. Its 20-check, three-failure evidence remains in `/private/tmp/cardiac-hopf-short-tests.log`. This failure is not described as a passing historical reproduction. A floating inverse difference is a possible cause, not an established diagnosis.

The coordinator authorized new complete final certificates for the same exact inputs. The historical pieces and earlier reproofs remain unchanged. A final receipt now stores the full fresh public result and exact hexadecimal bounds, the original piece-line digest, full cover-record digest, exact effective settings and all scientific source pins. Acceptance requires nonnegative Y0 and Z2, 0 <= Z1 < 1, 0 < r_lo <= r_hi <= the original exact r_star, strict negativity of both stored polynomial upper bounds, and a contraction upper bound below one. Each polynomial upper bound must dominate the exact rational expression Y0 + (Z1 - 1)r + Z2 r^2/2; the contraction upper bound must dominate Z1 + Z2 r_hi. The frequency and period enclosures must be ordered and positive. Source/input metadata and settings must agree exactly. Historical equality is diagnostic only. Float display fields do not decide acceptance. The gate refuses test mutations and private runtime objects.

The fresh-results implementation initially attempted to serialize assemble's private Centre/Arb objects. This reviewer reported that runtime blocker; the author excluded `_obj` from public receipts and retained the objects only for tests. The associated test fixture also needs the public result when making a JSON copy. Both acceptance and test serialization must be checked by the next native pilot before numerical admission.

I independently ran 86 synthetic exact acceptance assertions: all 68 preserved fixtures satisfy the scalar inequalities; a historical mismatch does not by itself invalidate a fresh certificate; modified signs, radii, understated polynomial or contraction bounds, metadata, weights, floating settings, nonboolean success, zero frequency and MUTATED output are refused; public receipts serialize. This is a boundary test using copied fixture data, not 68 new scientific reproofs. It passed in 1.63 seconds with 93.77 MiB peak aggregate RSS under a 60-second external limit. Receipt: `review-hopf-fresh-gate-receipt-2026-10-02.json`.

The collector requires all 68 current-source fresh results before constructing states. Its 67 adjacent amplitude gluings, eps=0 identification, endpoint enclosures and bridge inclusions use the new bounds. A failed eps=0 identification raises before any unconditional Theorem B statement. The bridge snapshot validates the complete final branch manifest, rederives all 711 branch gluings, and checks the exact collected branch record against source pins, log/centre snapshot hashes, range and 712 connected pieces. The branch record is parsed and hashed from the same byte read. Collection calls bridge checks directly and cannot use saved success flags from an earlier equal-sized chain.

## Per-finding source disposition

| Finding | Independent disposition |
|---|---|
| GAP 1 | Conjugate exclusion is sufficient; local native controls passed. |
| GAP 2 | Complete current-source 68-piece fresh certificates are mandatory. No historical equality claim is retained as proof. Actual complete rerun remains pending. |
| GAP 3 | Exact full Theorem A cover, central interval, bound aggregates, signs and source provenance are required. Stale evidence is refused. Full interval rerun remains pending. |
| WEAK TEST 1 | Tight piece 13 and the precise radii-polynomial failure condition are present; actual full negative run remains pending. |
| WEAK TEST 2 | First/last finite-mode Y1 and Z2 cross-checks are present. First-piece sanity checks passed in the historical native pilot despite its historical equality failures; last-piece checks remain pending. |
| WEAK TEST 3 | Parameter containment and ball inclusion controls are separate and use sufficiently distant pieces. First-piece pilot controls passed; full suite remains pending. |
| MINOR 1 | Four-significant-digit comparison is correctly stated. |
| MINOR 2 | Final source pins, exact current evidence gates and conservative pending numerical status are present. Final artifact hashes remain required. |
| MINOR 3 | The g-disc and conjugate-eigenvalue explanation is corrected. |
| Additional A(c) gap | Exact global imaginary separation repairs right-of-Hopf eigenvalue identification; argument and cheap native controls passed. |
| Additional stale gluing gap | Final branch snapshot and all current gluings are mandatory; saved bridge success is not accepted. |

This admits the mathematical acceptance design for bounded reruns after the serialization fixture correction. It does not establish the complete final numerical certificate. Before theorem or publication acceptance, the reviewed final sources must produce all 68 fresh certificates, the complete current Theorem A cover, all 67 amplitude gluings and eps=0 identification, and the final branch bridge inclusions. The full negative/acceptance suites and final source/data hashes must then pass. Uniform stability on the Hopf bridge is not claimed.

## Admitted source freeze

The public test fixture correction was inspected in the actual file: it uses `rr0["result"]`, while keeping `obj0["res"]` for direct mathematical controls. The implementer reports 42/42 native bookkeeping checks passing in 14.33 seconds with 99.08 MiB peak aggregate RSS before that fixture-only edit. The independent 86-assertion run used the identical mathematical program and lemma, with the preceding test hash recorded in its receipt.

Final source admission is granted for bounded scientific reruns with these inspected digests:

| File | SHA-256 |
|---|---|
| hopf.py | c4e4f77abad02362adbddffbb0a6a356221ec451d31ee0175399e944064759c3 |
| test_hopf.py | 30db4b3f6903e8bea14efaf26ffaeea7c11b8272172c06cb5c098604bfdf9244 |
| LEMMAS-hopf.md | 6ac96e4b9f8c0be8c42c912296ca3af3a96784995b9cdb171ead3327905a607c |
| branch.py used by final gluing | e5739a1583b44b8c355e8f74e8d47360c0c9af12f62988f4c2649dd4e5b274bf |

No remaining source or mathematical blocker was found in this scope. The second native pilot and every complete numerical acceptance condition above remain required. Changing any pinned source requires refreshed evidence. This review is source admission, not completed result acceptance, outside review, or a certificate of uniform stability on the Hopf bridge.

## Native second pilot examined

The subsequently completed `/private/tmp/cardiac-hopf-short-tests-fresh.log` contains 21 passing checks and zero failures in 107.1 seconds. I read the saved output; the implementer, not this reviewer, executed that pilot. It includes the A-core interval signs and conjugate/left-eigenpair refusals, actual piece-0 recomputation under the admitted sources, serialization of its public fresh receipt, the one-bit comparison control, source/line status counting, curve and Cauchy mutations, first-piece Y1/Y2/Zc/Z2 sanity checks and beyond-cover refusal. The output explicitly reports the historical bound mismatch as diagnostic while the newly computed exact certificate passes. The earlier three-failure pilot remains preserved separately. The admitted source hashes were independently rechecked afterward and are unchanged.

This clears the isolated pilot prerequisite for scheduling complete final Hopf runs. The complete numerical acceptance requirements remain pending; one freshly certified piece is not a 68-piece certificate.
