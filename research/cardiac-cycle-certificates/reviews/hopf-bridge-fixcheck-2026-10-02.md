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

The saved external supervisor receipt was also read: exit code 0, no stop reason, 108.14 seconds wall time and 326.02 MiB peak aggregate RSS. The 107.1 seconds above is the test program's own timer. The saved output, supervisor receipt and independently rechecked source digests are retained in `review-hopf-second-pilot-receipt-2026-10-02.json`.

## Actual final Theorem A record accepted

The coordinator's full current-source Theorem A calculation completed in 306.4 seconds and produced `fourier/data/hopf/theoremA_final.json`. I independently read and hashed one immutable byte snapshot, verified every scientific source pin against the admitted files, and checked the exact rational partition and hexadecimal bounds. There are 286 left intervals, one central G_H interval and 229 right intervals, totaling 516 intervals covering W without gaps. The central width is exactly 2e-13. Left/right real signs, transversality, positive frequency, negative Lyapunov coefficient, all stable-disc real bounds, central-inclusive exact real/imaginary maximum aggregates and global critical/stable imaginary separation pass. The program's structural checker also passes. The fresh G_H centre differs from the historical record in its final decimal digits and is retained exactly as calculated.

Record SHA-256: `8101ac680cd3856653c00bd76a0d5230e29b6b732fc16c2cf4d07b6c55f4b797`. The independent check finished in 1.14 seconds with 61.42 MiB peak aggregate RSS under the 60-second supervisor. Receipt: `review-theoremA-final-receipt-2026-10-02.json`.

This accepts the actual final Theorem A record in its inspected scope. It does not accept the complete amplitude-branch Theorem B, bridge closure, the 712-piece final conductance branch or uniform stability. Those complete reruns, identification/gluings, negative suites and final hashes remain required. No proof source was changed by this check.

## Fresh point provenance gate and continuation orchestration

The continuation review found another provenance boundary: `gks_points` previously admitted historical point successes without current source pins, even though the final amplitude and conductance containments were rederived. Those point successes were not independently admitted inputs for the new bridge. The repair requires current scientific source hashes, an exact centre-record and centre-coefficient digest, exact typed point/settings inputs, a guarded Hessian record, standard exact dyadic fields and rational radii-polynomial/contraction/positivity checks. Historical successes remain preserved but are ignored. Duplicate current point receipts or matching centres are refused. No historical Stage S success is promoted.

The new Hopf source SHA-256 is `8635b9337fe9f26b1e712700da583e3e409ef8d6b3fa889ae7fbab882ff2bd0c`, superseding the earlier source digests for future result acceptance. Twenty-seven independent negative controls passed in 0.78 seconds, 62.69 MiB, and actual historical point successes admitted were zero. The positive synthetic boundary fixture was never production evidence. The implementer then actually recomputed the isolated K=32 point at G_Ks=0.02778, existence only. I independently checked its real source/centre/settings/input/Hessian/exact-bound receipt and nine mutations in 0.52 seconds, 54.67 MiB. It supplies a fresh point existence certificate, not Stage S, amplitude-branch membership or bridge closure. Receipts: `review-hopf-point-gate-receipt-2026-10-02.json` and `review-hopf-fresh-point-actual-receipt-2026-10-02.json`.

The source change required a genuine new Theorem A computation. The previous record remains preserved as `theoremA-before-point-gate-2026-10-02.json`. The new record SHA-256 is `430e769e30f0502adb5775e2395b5d19529b64b959b357632195b4a0ee4722f6`. Independent exact checking passed in 0.52 seconds, 62.16 MiB: all current source pins, the 286 left intervals plus central GH interval plus 229 right intervals, exact coverage/adjacency and side signs, the negative bounds on 16 other eigenvalues including GH, global critical/stable imaginary separation, positive frequency, negative crossing derivative and negative first Lyapunov coefficient. The fresh Theorem A is accepted only in that precise scope. Receipt: `review-theoremA-point-gate-receipt-2026-10-02.json`.

The new Hopf helper binds its own bytes, all scientific sources, the accepted fresh Theorem A, all five Hopf inputs and six conductance-branch/point inputs. Its six assignments preserve whole cover groups and contain 16, 13, 11, 10, 10 and 8 pieces, exactly 68 once. Each shard starts with no reproof or pilot successes. Strict merge rejects missing/duplicate/stale receipts and changed typed settings, source/input/cover/centre identities or exact bounds before any latest-wins scientific reader can obscure them. The isolated merge preserves historical point bytes separately, recomputes the G_Ks=0.02778 point existence proof, and then calls the scientific collector to rederive all 67 amplitude gluings, eps=0 identification and the bridge against the complete current 712-piece/711-gluing branch. Stage S remains unclaimed.

Final helper SHA-256: `9b3a8699a987c40cd256521664c40e8f64b6d848b24bbed869a33d8d5b702e93`. Workflow SHA-256: `fd92f8deab87420f36b77bee1ad29495b4c539ec793053cd87f856c0150e6c23`. Thirty independent stability/Hopf structural negative controls and actual final input manifest checks passed in 4.16 seconds with 229.73 MiB peak RSS under a 120-second, 512-MiB supervisor. Receipt: `review-continuation-orchestration-final-receipt-2026-10-02.json`. This admits the bounded cloud orchestration; actual complete amplitude, bridge and uniform-stability certificates and their final acceptance suites remain pending.

The current-source `test_hopf.py --bookkeeping-only` suite subsequently passed all 42 checks with no numerical reproof: 5.97 seconds and 108.25 MiB under a 60-second/512-MiB supervisor. Its log and supervisor receipt remain at `/private/tmp/cardiac-hopf-bookkeeping-point-gate-review-2026-10-02.log`.

## Conditional Hopf manuscript methods review

The new 515-line candidate `papers/cardiac-rings/notes/v2-hopf-methods-draft-2026-10-02.md`, SHA-256 `b70aa4575c7edf54ae8ff8f05d410f3151919dcf69b93d905a162dde596245a1`, has no new mathematical implication blocker relative to the admitted current source lemmas. The review includes the expanded signed Neumann tail and finite/tail column estimates, nonsingular amplitude quotient, full-state complex Cauchy variation argument, inverse component norms, radii-polynomial closure, continuity, zero-amplitude identity and connected branch bridge. The final notation correctly places computed expressions below recorded outward majorants.

This remains a conditional argument review. Qualitative stability for sufficiently small positive Hopf amplitudes does not establish a quantitative threshold or overlap with the separate uniform-stability interval. Isolated current point existence does not prove amplitude-family membership until the actual bridge checks pass. The candidate explicitly preserves these distinctions and does not assert monotone conductance or global uniqueness. The fresh 68/67/zero-amplitude/point-membership/bridge numerical gates and scientific acceptance suites remain required. Receipt: `review-hopf-methods-draft-receipt-2026-10-02.json`.

## Actual complete amplitude and bridge collection

Cloud workflow `37088805596` completed all six amplitude shards and its fresh point/bridge merge. Independent read-only inspection of all six assignments and immutable inputs passes all 68 current source/input/typed-setting/exact-bound receipts. The current collector independently rederived all 67 adjacent amplitude inclusions, the zero-amplitude identity, the fresh existence-only point proof at g=0.02778 and both point memberships, against the current accepted conductance snapshot with all 712 pieces and 711 rederived inclusions. Ten actual receipt tampering controls were refused. The successful bounded check took 10.36 seconds and 366.05 MiB under a 120-second/512-MiB supervisor. Two prior reviewer invocations stopped on artifact-directory nesting and cloud/local path metadata, with no mathematical gate failure; both failure logs are retained in the final receipt.

Merged amplitude log SHA-256: `b46f682bf1efa32ef3f5614c081518dd714a1fe2bafea7e33eb96a1f84b61d92`. Immutable Linux producer record: `064629ec0e75f556c94d589ac293a3cf690a45450a2c3f116a7a9ac363cf4f97`. Fresh point log: `b511f99dfba1aeb165c375ed38050049c7976f12bd1493aa26e70ccc28c069fa`; point centers: `45be596308d7aff61ccecd032dd097f2e61ad395725b775e7dfd07932deb6714`. Accepted Theorem A remains the genuinely rerun current-source record `430e769e30f0502adb5775e2395b5d19529b64b959b357632195b4a0ee4722f6`. Receipt: `review-hopf-cloud-actual-receipt-2026-10-02.json`.

The new canonical collector record, SHA-256 `9b0bc96cc60336562b949bb54b33d3ecfbe462e31528bcd2153a5134857ceeff`, has a genuinely different native floating equilibrium proposal for its zero-amplitude identifying polydisc. This is not asserted bit-equal to Linux. I independently validated BOTH exact stored polydiscs directly, using current Arb evaluation on the entire complex polydisc, the Lemma K contraction/self-map test, exact containment of fresh c*(0), and exact containment of every meeting Theorem A equilibrium polydisc. Both pass. Their independently recomputed contraction bounds are below 0.001121, and self-map ratios below 0.252. The whole current canonical collector again passes 67/zero-identity/bridge closure. Apart from the polydisc itself, its P_kappa/P_radius_max display diagnostics, machine/date and explicit log-path context, every producer field agrees exactly. The direct validation took 10.15 seconds, 320.67 MiB, under 120 seconds/512 MiB. Receipt: `review-hopf-canonical-zero-receipt-2026-10-02.json`.

This admits the actual amplitude/bridge numerical collection in the scope of connected existence, local uniqueness, continuity and minimal period. Qualitative sufficiently small Hopf stability is a separate conclusion. There is no Stage S promotion, no quantitative uniform stability of the whole bridge, and no manuscript/release decision. The full original Hopf acceptance suite, including six selected piece reproofs and the tight-piece wrong-center/widening controls, is now running under a separately authorized 900-second/3500-MiB limit. Its outcome remains pending.


Final integrated checkpoint review

The native full current-source Hopf suite passed all117 checks in476.99 seconds, peak aggregate RSS633.625 MiB, with six actual selected piece reproofs and live negative controls. Its raw log and supervisor receipt are bound in review-hopf-full-original-suite-receipt-2026-10-02.json. This completes that original Hopf suite gate; it supplies no quantitative uniform stability over the entire Hopf bridge.

The final companion scratch reproduction orchestration85d45 and group helperdd3a are admitted for bounded runs after25 independent targeted controls, helper self-tests and exact tube replay of all63 actual units. The helper uses a genuine fresh cached proof fixture and explicitly excludes old-bound bit reproduction; original live group/half results remain separate. The final conditional integrated manuscript7b54 has no newly found mathematical implication blocker relative to the independently reviewed source/lemmas/drafts. Details and limitations are saved in review-final-companion-orchestration-receipt-2026-10-02.json and review-integrated-manuscript-receipt-2026-10-02.json. Package compilation and scratch numerical reproduction were not executed by this reviewer in this checkpoint.
