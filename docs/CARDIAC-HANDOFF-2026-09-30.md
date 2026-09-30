# Cardiac Study Handoff, September 30, 2026

This current note supersedes the unsuccessful-certification status in earlier handoffs. The historical handoff is preserved as HANDOFF-BEFORE-CERTIFICATE.md. Do not repeat the successful solver runs just to regenerate status records.

## Current result

The unchanged fixed smooth, potassium-clamped autonomous18-state cardiac cell has passed a computer-assisted existence and local orbital asymptotic stability proof. The fundamental period is enclosed in **[53.58551856,53.58552012] ms**. All17 nontrivial Floquet multipliers have modulus strictly below **999/1000**; the autonomous phase multiplier is one. The section fixed point is unique inside the exact tested box. There is no original19-state, EAD, clinical, global-attraction, tissue or PDE conclusion.

Read outputs/cardiac-study/CERTIFIED-ORBIT.md and CERTIFIED-ORBIT.json. The source is the unchanged literal fun_eval in TP06_18d_endo_bif.m, commit dc78f86fd218418e029ec43d945bcd0fc54b9f1e, SHA256 a50f6c08b4360dd257cce389a39ae72fda51e3642641bf5b8e5fced6c2225670. Parameters are gKr=.0153, gKs=.0275, gNa=14.838, gK1=5.405, gCaL=.000199, Cm=1, Ki=138.3, zero stimulus. All18 listed states remain dynamic and every source decimal is exact rational. Do not clip gates, freeze concentrations or change these parameters to improve a result.

The exact center/scales are in certification/candidate-inputs.json and the certificate. The scaled section radius is 3094850098213451/309485009821345068724781056. Voltage is exactly1/5 mV at the first ascending return. ordinary_tp06_check.py still defaults to the rejected gKs=.073 trial; explicitly use .0275.

## Successful evidence

- Native normalized C1 box receipt: certification/runs/20260930T053810Z-scaled. Point+box430+430 tubes,273.193s. All578 corrected derivative entries and117820 domain guards replayed. The native point residual alone fails inclusion; its full-box DP, return time and slope supply the successful joint certificate.
- MP C0 point receipt: certification/mp/runs/20260930T055806Z-mp65-point. 128-bit directed intervals,508 tubes,394.071s;69870 guards and all17 residual subtraction/scaling intervals replayed exactly. The 2^-65 step proposal tolerance is a heuristic, not a changed final criterion. This is the required tight center residual.
- Joint exact input/result: certification-checker/joint-mp65-20260930T055806Z-1e-11-{input,result}.json. from_mp_point.py gates model/center/scales/branch/provenance. The original interval_checker.py passed strict inclusion, weighted contraction, period, slope, H positivity and direct Lyapunov positivity with exactq=999/1000. Weighted contraction<.003643; minimum inclusion margin>6.2818e-12. One actual positive and35 malformed-receipt controls passed.
- Source reviews: certification-audit/source-review.md, mp-source-review.md and certification/mp/mp65-reviewed-source-extension.json. The MP65 source differs from the reviewed MP80 source only in two step-proposal literals and the inner time cap; same model, precision, remainders and acceptance test.
- Independent MP scalar controls checked234 RHS values,4212 Jacobian entries and1859 parameter enclosures. Full GMP and required targeted MPFR tests and exact-rational oscillator controls passed. The full upstream MPFR suite was incomplete and is not described as passed.

Internal CAPD Taylor/interval-Newton/doubleton objects were source-reviewed but not independently re-integrated. The result trusts the pinned CAPD source, compiler, native directed rounding, local MPFR/GMP backend and reviewed translator/checker. Raw normalized objects are not all serialized; physical transformation is source-reviewed. The arithmetic kernel alone deliberately reports orbit_certified_by_this_checker=false because it requires the separate flow audit.

Five completed native C1 attempts are recorded, including two baseline, one HO and two normalized trials. The incomplete HO run, unsuccessful affine C0 return and interrupted MP80 benchmark are preserved. Read CERTIFICATION-RESULTS.json and the BEFORE-CERTIFICATE history files. Do not overwrite successful records with update_manuscript_records.py or package_manuscript_review.py; those are historical feasibility-only helpers.

## Manuscript and quality

The current MANUSCRIPT.pdf is13 pages, with three vector figures, seven tables and12 primary/source references. It contains the exact-box theorem and complete mathematical implication proof. All current pages and figure/table layouts were inspected. No graph labels cover data; all18 state centers/scales stay on one page. Contact is chase@hendrickresearch.com. Manuscript rights remain all rights reserved, distinct from software rights. No editorial reading-status comments are in references.

MANUSCRIPT-AUDIT.json and MANUSCRIPT-STATUS.md identify current hashes/checks. cardiac-study-review.zip has39 entries and the byte-identical current PDF. Extract it and run python3 VERIFY-REVIEW.py from any cwd: all38 packaged file hashes,13 certificate provenance hashes and original exact arithmetic reproduce with standard Python. This is retained-evidence reproduction, not a fresh validated-flow integration. The earlier20-entry feasibility ZIP is retained separately.

QUALITY.md uses the same seven-item bar as the other GENChase papers. Claim/data/layout checks and bounded prior article review are complete. Final in-project adversarial review of the successful proof and source dependency inventory, committed portable solver companion, dependency notices and clean-environment solver reproduction remain open. The prior independent component reviews retain their original hashes and are not represented as a final manuscript reading. Subagents hit the account usage limit. By the owner's instruction, a real human reviewer is optional and is not a checkpoint; independent subagent review can satisfy the review item.

Rebuild the draft using work/cardiac-study/build_manuscript.py, which applies manuscript_certificate_update.py only after actual certificate/provenance gates. Keep the built-in LaTeX editor and compiler for the standalone source. Existing Tectonic exports the PDF; use the existing workspace cache, not the blocked Library cache. Then render_manuscript.py, current data/layout verification, package_certified_review.py and extracted offline verification must describe the actual current files. Do not automatically mark newly rendered pages visually inspected without inspecting them.

## Next work

The owner now asks to extend to tissue waves. Start a separate Phase F ordinary candidate study on a one-dimensional ring of coupled18-state cells, retaining this local ionic model. Distinguish a traveling phase wave, synchronized cells, a propagating action-potential pulse and a continuum wave. Define voltage-only coupling, boundaries and spatial units before assigning physical speed. A cell proof does not imply spatial existence/stability. Keep every cell's gates and concentrations dynamic. Establish a recurrent full-state candidate, resolution/coupling/solver checks, then formulate a new fixed-lattice validated return and spatial-mode stability problem. A finite-ring certificate is not a PDE certificate. No spatial certificate exists yet.

The cardiac manuscript has no public companion, release, DOI or Zenodo record. Finish pending quality items before publishing; a future release source ZIP and downloaded Zenodo archive must contain the exact reviewed PDF and be Publication / Preprint. GENChase itself stays off Zenodo. Cached third-party articles are research inputs and must not be bundled indiscriminately. No exhaustive-firstness or groundbreaking claim is established.

## Workspace and process state

All cardiac work is under /Users/chasehendrick/Documents/Codex/2026-09-29/github-plugin-github-openai-curated-remote, outside the GENChase checkout. Bundled Python is /Users/chasehendrick/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3. NumPy/SciPy are installed; plotting/PDF modules are in work/figuredeps. Proof solver runs finished and no proof compute remains running. No recurring continuation was scheduled.

The existing eight preprints have their own verified archives; their publication success does not establish cardiac publication. PR255/application sweep and the GENChase0.9 release remain separate work in the GENChase handoff. Preserve all evidence and binary/library hashes before rebuilds.

## Tissue Continuation Results

The owner requests both tissue tracks, with action-potential propagation as the primary physiological target and phase waves as the first proof-development bridge. Phase F now has ordinary rotating-wave candidates at 8 and 16 sites, with all 18 states per site dynamic, full-state shooting, and BDF/Radau cross-checks. Periods are about 53.587970984 and 53.588069102 ms; full-period scaled defects are at most 4.68e-10. The new spatial result is not certified.

Phase G explicitly changes the local target to baseline conductances and the analytic GHK extension needed across V = 15 mV. The old cell certificate is unchanged. In a 20 mm sealed cable with the published D = 0.154 mm²/ms, all 80 and 160 sites activated; ordinary speeds are about 0.69506 and 0.74295 mm/ms. The approximately 6.45% refinement difference remains unresolved. The D = 0.001 mm²/ms trial only excited the 4 directly stimulated sites and is preserved. Independent solver comparison, further refinement, recovery, and spatial stability remain pending. Read PHASE-F-TISSUE-WAVES.md and PHASE-G-ACTION-POTENTIALS.md and their retained figures and full-state arrays under outputs/cardiac-study in the local workspace. No spatial proof, clinical validation, or new cardiac publication exists. All pilot compute completed.

## Tissue Validation Continuation

September 30, 2026: action-potential propagation now has four grids (80, 160, 320, 640 sites), with fitted speeds approximately 0.695059, 0.742948, 0.758160, and 0.761802 mm/ms. Successive spatial changes decrease to 0.478%. Tight BDF and independent Radau agree at the same grid to less than 1.3e-7 relative in speed. Every site on both 160- and 320-site grids reaches the defined 90% repolarization threshold by 600 ms, with durations around 279 to 286 ms. An unforced 600 ms control never activates. A full Radau recovery run hit its cap and remains a failed receipt; the separately recorded Radau continuation from its successful 100 ms trajectory cross-checks recovery. Sampling and numerical sensitivity are documented in Phase G, not presented as rigorous error bars.

The eight-site phase wave has ordinary spatial stability evidence from four derivative calculations, with all 143 transverse section multipliers below one and inferred leading full-period modulus around 0.99966133. Relative-map inverse and Lyapunov metric proposals are retained for q = 49999/50000. Large conditioning remains a proof difficulty. Future shooting output now rejects failed roots and degenerate waves and preserves unique source-tagged attempts. Read local Phases F, G and H under outputs/cardiac-study. No spatial existence/stability certificate, continuum result, clinical validation, or new cardiac publication follows from these numerical checks.

Interval attempt: the 144-state C0 lift compiled and passed ordinary field/spatial controls. The 180-second run retained 17 complete domain-checked tubes through about 2.050044543 ms, then timed out before its proposed 6.698496373 ms endpoint. No complete return, root inclusion, or spatial stability certificate was obtained. Next optimize the validated flow cost, preserving every domain and rounding check. All numerical and interval pilot processes have finished.
