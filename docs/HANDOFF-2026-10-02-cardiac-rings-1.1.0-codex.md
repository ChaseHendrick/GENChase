# Cardiac-rings continuation checkpoint, 2026-10-02

This continues the morning handoff in `HANDOFF-2026-10-02-cardiac-rings-1.1.0.md`. Read this update first. The owner asked to keep this pass within approximately one hour and accelerate the calculation. The reviewed mathematical sources remain frozen while the bounded proof jobs run. No new 1.1.0 publication is admitted by this checkpoint.

## Accepted publication and current branch

The published **cardiac-rings 1.0.0** preprint remains [doi:10.5281/zenodo.23101322](https://doi.org/10.5281/zenodo.23101322). It includes fixed-cell and 8/16/32/64-cell ring stability results, and all-size ring/cable existence results. Do not confuse those independent published Fourier certificates with the older, partial native 32/64-cell experiments.

The working branch is `claude/inspiring-edison-twrpsg`, in [draft PR #264](https://github.com/ChaseHendrick/GENChase/pull/264). Initial reviewed checkpoint `70b7f48` hardened the branch, uniform-stability and Hopf acceptance gates. Commit `6d64a97` added the fresh Hopf interval record and parallel branch workflow. Commit `92362ae` corrected the workflow's arithmetic-preflight scope and preserved its failed first attempt. Existing main, earlier releases and the companion manuscript have not been replaced.

## Completed work

- The branch and stability programs now bind every final record to current imported source digests, exact historical input identity, settings and centres. Complete collection requires 57 groups, all 712 pieces and 711 freshly rederived gluings. Partial logs, stale data, mismatched settings and mutated results are refused.
- The Hopf collector requires current exact Theorem A evidence, all 68 fresh amplitude certificates, current gluing and zero-amplitude identification, and the complete final branch snapshot. Exact freshly recomputed inequalities govern admission. Equality to earlier Linux proposal bounds is retained as a diagnostic.
- Separate in-project fix checks admitted the frozen programs for bounded reruns. This is not outside or human review and does not imply acceptance of every pending numerical theorem.
- Native branch quick checks passed 7/7 and stability quick checks passed 6/6. Hopf bookkeeping passed 42/42 and the second native pilot passed 21/21. Separate adversarial controls exercised exact bounds, sources, coverage, metadata and failures. Earlier failed fixtures and the first Mac pilot's historical-equality failures remain documented.
- Fresh full Theorem A passed independent exact-record inspection. It has 516 intervals, with 286 left, one central and 229 right, exact target coverage, strict signs and the required critical/stable eigenvalue separation. Record SHA-256 is `8101ac680cd3856653c00bd76a0d5230e29b6b732fc16c2cf4d07b6c55f4b797`. The scientific run took 306.4 seconds; the external supervisor measured 307.56 seconds. See `review-theoremA-final-receipt-2026-10-02.json`.
- The isolated Mac arithmetic runtime was checked against the actual macOS wheel and installed-file hashes. Its wheel differs from the pinned Linux wheel. Never replace the historical Linux pin with the Mac hash or report them as equal.
- A fresh Zenodo audit downloaded the actual 1.0.0 source archive. It is a Publication / Preprint and contains the matching manuscript PDF. Archive SHA-256 is `1ba739c5cccbfe602f34a16173b16dd8839dddce5965486ef7885e19dfc307d7`; PDF SHA-256 is `77526c6c5395dfa7475097e435f2a4374deb890ad311e8459759d94538768014`. The audit is `docs/paper-zenodo-release-audit-2026-10-02-cardiac-rings-refresh.json`.
- All four current manuscript figures were rendered and inspected. No label or legend overlaps the data axes. The new branch/Hopf figure remains a candidate figure until its records, source digest, caption and manuscript integration are finalized.
- `tools/build.js --check`, `tools/science.js`, `tools/lint.js`, `tools/paper-check.js` and `git diff --check` passed. The paper check applies to the existing 1.0.0 package. CI on `70b7f48` completed successfully; later commits need their own observed results.
- A dated primary-source research ledger now credits the established validated-continuation and Hopf-desingularization methods. A dedicated forward-citation search and complete methodology readings remain required before submission. No first-ever claim has been established.

## Faster computation and failure provenance

The branch workflow partitions complete groups among six independent Linux runners, with three single-threaded proof workers each. The source programs and exact inequalities are unchanged. The helper requires exact metadata, sources, historical input and centre identities, complete assigned coverage, and exact fresh polynomial/contraction inequalities. Merge requires all 712 distinct pieces and rederives all 711 gluings before writing. Twenty-eight separate reviewer controls and the helper's twelve rejection controls passed.

The first workflow, [37075927471](https://github.com/ChaseHendrick/GENChase/actions/runs/37075927471), failed before scientific computation because the full arithmetic test invocation needed an unavailable CAPD comparison binary. The Linux wheel and 15 native controls passed. The corrected workflow explicitly runs those 15 native controls, with the wheel check retained. The external CAPD-binary comparison is unrun and unclaimed in this Arb-only workflow. No scientific test was edited.

The replacement run is [37076139080](https://github.com/ChaseHendrick/GENChase/actions/runs/37076139080), producing commit `92362aebfb40499a7d6c68214e621af7fcb3644c`. Each shard had a 2,400-second proof budget and 45-minute job limit. Its output includes runtime details, arithmetic-control logs and proof data. Successful merge produced artifact `cardiac-branch-merged`. It was downloaded into a new directory for inspection against the producing commit and scientific source hashes, preserving the local partial log.

That replacement run completed successfully at 2026-10-02 23:38:38 UTC, approximately 30 minutes after creation. The downloaded merged artifact contains exactly 57 groups, 712 distinct current-source pieces and 711 rederived gluings over [0.027499735464, 0.02778996093]. Its scientific source and historical-input hashes match the frozen checkout. Merged log SHA-256 is `cd3fb0811f7bc67aa20a0298088d58a9768b158b720a3cea0c8e35c6a87b20e8`; producer summary SHA-256 is `099c0c9460c726991b01f3395ece2fb0b5939d545801b2d7bc22c689a175f195`. The producer summary retains its original computed/awaiting-review status. It claims no uniform stability.

All six downloaded runtime artifacts independently confirm the pinned Linux wheel and 15 passing native model controls. Their original logs are preserved in `research/cardiac-cycle-certificates/reviews/parallel-runtime-2026-10-02/`, with hashes in `linux-shard-runtime-receipt-2026-10-02.json`. The raw `nproc` values were obtained with `OMP_NUM_THREADS=1`; they must not be interpreted as runner hardware core counts. Full applicable GitHub checks on producing commit `92362ae` completed successfully.

The historical input contains positive `Infinity` in only the three permitted strip diagnostics `rec.strips.{J,dg_f,dg_J}.S_over_L_max`. Exact hexadecimal proof bounds govern admission. The helper rejects NaN, negative infinity and nonfinite values elsewhere, while preserving the exact historical identity. See the helper review receipt for the initial ingestion failure and subsequent actual-data checks.

The local branch batch used five workers with a 1,920-second inner budget, 2,100-second outer cap and 3 GiB aggregate RSS cap. A previous three-worker batch was intentionally stopped after 36 pieces to increase parallelism. Only owned processes were stopped and completed current-source pieces were preserved. The full Hopf amplitude attempt used three workers, a 2,000-second inner budget, a 2,150-second outer cap and a 1.75 GiB aggregate RSS cap. Hopf workers emit completed cover groups, so an initially empty output file does not establish inactivity or a failure.

At the resumed session checkpoint, both owned local proof groups were manually stopped and their supervisor receipts preserved. Host sleep extended elapsed real time beyond the monotonic timers; active supervisor times were 1,535.20 seconds for the second local branch batch and 703.15 seconds for Hopf. The local branch stopped with 128 current-source pieces and 10 groups, complete JSONL tail, SHA-256 `8c7fa1f953f4ebc9dedaaa3a95d81c72660de57512b1099ffcccd07cf5f2c7e5`. It is a partial computation, preserved separately from the complete Linux artifact. No production Hopf amplitude receipts completed. This was an intentional checkpoint stop after interruption, not a failed radii-polynomial certificate or a completed 68-piece theorem.

## Next steps after the bounded jobs

1. Inspect actual completed branch and Hopf records, not saved `certified` booleans alone. Partial or budget-limited logs remain resumable and do not admit a complete theorem. Preserve initial failures and their receipts.
2. After complete branch acceptance, run the frozen uniform-stability program against that exact final snapshot. Its final path is `fourier/data/branch/stability_uniform_K12_final.jsonl`. Do not reuse historical stability success to promote the new theorem. Re-run fallback and negative controls against actual final unit settings.
3. Require all 68 current Hopf amplitude receipts, rederive all 67 amplitude gluings and zero-amplitude identification, and rederive the bridge inclusions against complete final branch uniqueness radii. Run full native negative/acceptance suites. Do not claim quantitative uniform stability throughout the Hopf bridge.
4. Integrate the candidate methods only after complete scientific acceptance, with theorem numbering distinct from the existing paper's all-size result. The old manuscript remains the accepted 1.0.0 paper. Update its abstract, introduction, limitations, reproducibility and observed Erhardt-value comparison without speculative explanation.
5. Follow `papers/cardiac-rings/notes/v2-quality-plan-2026-10-02.md` for figures, byte-identical companion synchronization, separate review, publication checks and release. Rebuild figures from accepted records and keep labels/legends outside graph axes. Preserve `chase@hendrickresearch.com`, proper title capitalization and the distinction between manuscript rights and program/data licenses.
6. Merge only with applicable current CI and resolved findings, release `1.1.0` through the papers workflow, then inspect the actual deposited Zenodo source ZIP for its manuscript PDF. Archive as a preprint. Existing archives stay up and GENChase itself does not go to Zenodo.

Publication completeness is tracked in the quality plan. A faster computing workflow and a passed Theorem A component do not by themselves make the 1.1.0 manuscript ready.

## Final installed branch checkpoint

The separate reviewer subsequently accepted the actual complete branch in the limited scope of existence, local uniqueness, continuity and minimal period. Its independent Mac inspection passed every current-source/input/centre/exact-bound check and rederived all 711 gluings, bit-identical to the Linux producer. The successful review took 11.50 seconds and 289.81 MiB; an earlier local reviewer receipt-formatting error is preserved in the final receipt. See `reviews/review-cloud-branch-final-receipt-2026-10-02.json` and the scoped entry added to `results/fourier-review-status.json`. Inherited point-stability claims, uniform stability, the Hopf amplitude branch and bridge, and the 1.1.0 release are explicitly excluded from this admission.

The final Linux log is installed byte for byte at `fourier/data/branch/run_K12_final.jsonl`. The 128-piece Mac log is preserved at `run_K12_mac_partial_2026-10-02.jsonl`. The immutable original Linux producer summary is `reviews/branch-linux-collected-2026-10-02.json`. A fresh canonical collector produced `results/fourier-branch-gks.json`, SHA-256 `0ac338b9b09ea91775c180d35b7c95e075dc1956aa28e4a311f2623f388e17e3`, in 6.77 seconds with 258.09 MiB. Its metadata correctly refers to the canonical path and Mac collector; actual proof pieces remain the Linux computation. Three display-only `Y0_over_cap` ratios differ in their last float digit. All other scientific data and the 711 gluings are identical. Installation provenance is in `reviews/branch-canonical-install-receipt-2026-10-02.json`.

The candidate methods draft is `papers/cardiac-rings/notes/v2-branch-methods-draft-2026-10-02.md`. It distinguishes proposed conductance Theorem D from the existing all-size Theorem C and gives the underlying Banach, gluing and uniform-stability arguments. It remains a draft requiring manuscript review and integration. Its stability statements remain conditional on the pending fresh stability calculation; it does not claim completion of the Hopf bridge.

## Continuation after the reviewed branch

The owner resumed the work. Commit `81744b5` launches the separately reviewed six-shard uniform-stability calculation in [run 37088569093](https://github.com/ChaseHendrick/GENChase/actions/runs/37088569093). Each shard has three workers and a 2,400-second proof budget. All six runners entered the numerical step. Final complete coverage and independent review remain pending; historical successful stability units do not admit the new theorem. The helper checks exact available tube, identification and contraction bounds, current sources, inputs and settings. Public SC column bounds are summarized as floats, so the review does not claim independent exact reconstruction of those columns. The guarded producer recomputes the interval inequalities. See `review-continuation-orchestration-receipt-2026-10-02.json`.

A new review found that the Hopf bridge could consume older point-proof successes without current-source binding. The corrected Hopf program, SHA-256 `8635b9337fe9f26b1e712700da583e3e409ef8d6b3fa889ae7fbab882ff2bd0c`, binds fresh point inputs, centres, effective settings, Hessian covers and exact proof bounds, and excludes historical successes from bridge and point-stability claims. Twenty-seven separate rejection controls passed. A native isolated existence-only point proof at G_Ks = 0.02778 passed in 82.69 seconds; no Stage S calculation was run or claimed. The pilot and its independent record inspection are preserved under `reviews/fresh-hopf-point-pilot-2026-10-02/` and `review-hopf-fresh-point-actual-receipt-2026-10-02.json`. The production bridge must generate its own fresh point.

Because the Hopf source changed, Theorem A was recomputed rather than having its old source hash replaced. The fresh computation passed in 130.38 seconds with a sampled aggregate peak RSS of 96.19 MiB. Its record SHA-256 is `430e769e30f0502adb5775e2395b5d19529b64b959b357632195b4a0ee4722f6`. The separate reader checked all 516 intervals, exact coverage, side signs, central and complementary-spectrum bounds, transversality, Lyapunov sign and imaginary separation in 0.52 seconds. That component has limited acceptance in `results/fourier-review-status.json`; amplitude continuation, bridge closure, uniform stability and publication are excluded. The previous full Theorem A remains byte-identical in `reviews/theoremA-before-point-gate-2026-10-02.json`.

The workflow supports independent stability and Hopf stages with separate concurrency keys, so one does not wait for the other. Ordinary pushes skip both numerical stages. An explicit stage marker or dispatch is required. Merge rechecks each stage's own complete artifacts even if the other stage fails, and cannot turn partial receipts into accepted records. Every runtime retains the pinned Linux wheel and native model controls; the unavailable external CAPD binary comparison remains unrun.

Fifty malformed inline mathematics delimiters in the candidate methods draft were repaired. The exact editorial replacements and before/after hashes are recorded in `methods-delimiter-repair-2026-10-02.json`. No mathematical assertion or scientific program changed in that editorial repair. Main manuscript integration, rebuilt figures, complete new numerical certificates, companion synchronization and release remain pending.

## Status check (2026-10-03, Claude session)

- The uniform-stability shard run [37088569093](https://github.com/ChaseHendrick/GENChase/actions/runs/37088569093) (commit `81744b5`) ended in **failure**; no complete fresh stability coverage exists yet. Read its logs, fix, and rerun with the `[cardiac stability]` marker.
- The Hopf reproof run [37088805596](https://github.com/ChaseHendrick/GENChase/actions/runs/37088805596) (commit `cf73fd1`) **succeeded**; check that its artifacts were collected into the branch before relying on them.
- Later runs (3 to 6) were skipped by design (no stage marker).
- `node tools/paper-check.js --paper cardiac-rings --release` fails only on the README lacking a 1.1.0 version and DOI, but `paper/cardiac-rings.pdf` was not rebuilt after the large `.tex` change, and the manuscript review is not done. Do not release until those gates pass.


## Stability lineage correction after failed-workflow status check (2026-10-03)

The earlier statement that failed run 37088569093 leaves no complete fresh stability cover is superseded by the actual preserved artifacts and subsequent independently reviewed recovery. The GitHub workflow remains failed. Its six shard jobs each ended at the orchestration error `invalid exact moving-center contraction`; the merge job then refused the missing six final wrapper artifacts. The native producer computations had finished and preserved all 63 successful whole-group or half-group certificates. Six whole-group SC failures, G11 through G16, remain in the immutable log; their twelve successful half-group fallbacks complete coverage.

A new read-only source and collector audit passed in 5.88 seconds, 299.83 MiB self RSS, with exit 0 under a 110-second alarm. All ten scientific source byte hashes at producer commit `81744b5cccacf6463b1cdd0aff1f316c44cff4a1` equal the current imported source hashes. In particular, `branch_stability.py` remains `b04c1f827867cf5bbba31ed99f10e74cc6469b998ad43d3ad2372235cca59463`. Every successful row passed the reviewed source/input/typed settings/centres/fallback and exact available-bound gates. The installed log `be4560cfe6c38da2b8dbcb2fb12950768a6d18b1f1248b8e19c14ea1bb59f6f9` is the byte-identical concatenation of all six original raw producer logs. The unchanged current scientific collector, called with `write=False`, reproduced the installed record `d6c960c9cf61d5464e4519874cd5223c199c26e97adfc7120a67348cc8608ee5` without any field difference. The original recovery record differs only in its isolated log path.

The complete cover is 63 used units over all 712 pieces of the single-cell conductance interval `[0.027499735464, 0.02778996093]`. Recovery replaces no stored scientific row. For all 35 independently rounded derivative sums that exceed their finer stored kappa, the exact larger majorant and stronger self-map inequality pass. The recorded outward multiplier upper bound `0.998413816` is strictly below one. No complete physics reproof is required to repair this serialization gate failure. The original failed workflow and all actual failed whole-group attempts remain preserved.

All seven unchanged original piece controls subsequently passed in run 37089576992. All thirteen unchanged original group/half controls plus one additional fresh half comparison passed in run 37091152974 and were independently reviewed. Group cached serialization tests use genuinely freshly computed isolated fixtures; they do not claim numerical bit reproduction of earlier bounds. The finite SC column vectors are absent from public JSON, so admission retains the fresh source-bound native Arb producer proofs for all 63 certificates rather than claiming a separate exact reconstruction of every SC column. This correction establishes the scoped uniform-stability component, not external peer review or manuscript release readiness. Receipt: `research/cardiac-cycle-certificates/reviews/review-stability-lineage-refresh-2026-10-03.json`.

## Final manuscript and release preparation (2026-10-02, after the lineage correction)

The original failed uniform workflow is preserved. Its actual current-source raw numerical outputs passed the
stronger exact collector and independent lineage checks described above. The complete Hopf results from successful
run 37088805596 are installed in both the canonical study and companion, including all 68 pieces, 67 gluings,
the zero identity and fresh existence-only bridge. The original stability piece/group/half and Hopf suites passed;
branch quick checks passed. No full current branch test-suite run is claimed by this checkpoint.

The final manuscript source is `9d86b2d22b96b52c691100cdf6b728088f9f9faea1f317276c70ce17c17bdfac`.
Successful [build 37093181017](https://github.com/ChaseHendrick/GENChase/actions/runs/37093181017) produced the installed
73-page PDF, SHA-256 `ad23140dee90edaafc65c8571896089a81b464bc737cae88a1adecae37de22a1`. Two independent builds,
each using three TeX passes, gave byte-identical final PDFs. Separate structured and visual inspections admitted
the final PDF: no undefined references/citations, all fonts embedded, no off-page text; 70 pages were pixel-identical
to the previously fully inspected corrected build, including all four figures; changed pages 66, 72 and 73 were
visually inspected clean. The minor unchanged 2.69937-pt proof box protrusion and three spacing diagnostics are
recorded, with no clipping or collision. The email remains chase@hendrickresearch.com. Reading-status comments
were removed from two bibliography entries without changing the accurate source-reading scope paragraph.

Actual fresh tracked-companion staging at c574f0b passed `alln,continuation` in 29.6365 seconds with 436.031 MiB
sampled peak RSS. All 84 code/data files matched committed bytes, all 14 then-current provenance pins matched,
and exact collection/gluing/tube/zero/bridge comparisons passed. This is fresh stored-proof reproduction, not a
new reproof of every numerical piece. Final PDF-audit provenance adds three individually inspected exact hash
pins, for 17 total; manuscript/email/parent-folder-link checks remain strict.

The 1.1.0 seven-item quality record is complete, and the README, release notes and preparation plan now state the
discharged Theorem D and actual check scopes. The registry is `ready`, while `archiveVersion=1.0.0` and
`codeDoi=10.5281/zenodo.23101322` still identify the actually downloaded and verified existing preprint.
Local `paper-check --paper cardiac-rings --release`, complete `paper-check`, `paper-sync --check cardiac-rings`,
`build --check`, science inventory, lint and staged diff whitespace checks passed. Applicable CI must still be
observed on the final pushed commit before merging; earlier green commits are not substitutes.

Next: update and ready PR #264, observe all required final-commit checks, merge, then dispatch the papers workflow
with `paper=cardiac-rings` and `release=1.1.0`. Do not hand-push or move a tag. Verify the actual released GitHub
source ZIP and the new Zenodo Publication / Preprint ZIP against the installed manuscript and reviewed code/data.
Only after the deposited archive passes should a follow-up update the DOI/archive-version pair and recommended
citation. No new DOI or publication is asserted by this preparation checkpoint; the 1.0.0 archive remains available.
