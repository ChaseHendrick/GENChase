# Second reading of the fixes to Stage E and Stage S (2026-10-01)

I am an independent referee working inside this project's session. This is not an outside review. I edited no repository file. Probes ran on a private copy in `scratchpad/fixrev/ccc/`. Every run was N = 8 or a fast check.

I read these diffs:
- Stage E: `git diff ebe1b6f HEAD -- fourier/existence.py fourier/test_existence.py`. `existence.py` has not changed since f7cdf1a.
- Stage S: `git diff fa2fa50 HEAD -- fourier/stability.py fourier/test_stability.py fourier/LEMMAS-stability.md`. HEAD is 6b3925f.

## Verdict

No fix changed a bound in an unsound direction. The Stage E rerun reproduced Y0, Z1, Z2, r_existence, r_uniqueness and T exactly. The Stage S margins at the same delta are equal or better, and theta_T and the multiplier bounds are bit-identical. The test hooks cannot reach a written record.

One item is still partly open: GAP 1 of Stage S asked for a standing check of the stored Stage E record hash. It is enforced only when a record is written. Today every hash matches.

**Overall: both the Stage E and Stage S records may be labelled as having passed in-project adversarial review.** The caveat on relabelling is in N2 below.

## Stage E findings

| Finding | Status | Evidence |
|---|---|---|
| WEAK TEST 1 (controls at the 1e-8 scale) | ADDRESSED | The docstring now calls the old controls "residual-detection controls" and says they would fail for any correct proof. Two within-uniqueness controls were added: `test_within_uniqueness_omega` (omega + 2^-85) and `test_within_uniqueness_a32_component5` (a_{+-32,5} + 2^-85, perturbed symmetrically so the centre stays conjugation-symmetric). Each asserts r' >= D - r and Y0' >= 0.999 (1 - Z1) D, or else proof failure. Both inequalities follow from A DF(xbar) = I - B with ||B|| <= Z1. |
| WEAK TEST 2 (a dropped Z1 or Y0 term cannot be seen) | ADDRESSED, with one documented exception | `_float_blocks` reimplements the referee's z1float. `test_float_estimate_below_certified` checks, per component, Z1, the ft block, the T block and the Y0 tail. There are mutation tests for T, ft and Y0_tail. SJ_tail cannot be detected: the change is about 1e-11, and the docstring says so. `test_mutation_SJ_tail_not_detectable` pins the change below 1e-9. That is honest, and it matches the referee's observation. |
| GAP 1 (conjugation identity f(conj z) = conj f(z)) | ADDRESSED | Section 7 now gives the inductive argument operation by operation. The family phibar + h is closed under conjugation, and no connectedness argument is needed. I re-audited `tp06_18d_arb.py`: 55 `exp(`, 4 `log(`, 3 `sqrt(` and no `abs`, `.real`/`.imag`, `if`, `<`/`>`, `float(`, `max`/`min` or `tanh`. That matches the audit claim. The fix did not cite the stage-1 review item as proposed; instead it audits the file directly, which is stronger. |
| MINOR 1 (m_max wording) | ADDRESSED | The docstring now says that m_max may exceed the least such integer. |
| MINOR 2 (`_q` docstring) | ADDRESSED | It now says "NOT necessarily exact". |
| MINOR 3 (r_uniqueness is r_*) | ADDRESSED | Each record has `r_uniqueness_set_by_r_star` (true in the N = 1 record) and `r_uniqueness_note`. |
| MINOR 4 (`amax` returns an unrounded value) | ADDRESSED | `amax` now returns `up(a)` or `up(b)`. That is only wider, so it is safe. |

## Stage S findings

| Finding | Status | Evidence |
|---|---|---|
| GAP 1 (Stage E provenance not enforced) | PARTIAL | Most of it is fixed. `stage_e_inputs` raises InputMismatch if any recorded Stage E source hash differs from the current file, or if a source in `ex.SOURCES` is missing. `run()` hashes the sources before and after the run, refuses to write if they or the Stage E record changed, and stores the hash of the exact bytes it read. `test_neg_provenance` passes: I ran it and it raised "Stage E sources differ ... existence.py". All Stage S records were rerun, and every stored `stage_e_record_sha256` equals the current Stage E file (my check below). Still missing: the proposed "lint or test check that `stage_e_record_sha256` equals the current Stage E file" for the committed records. Nothing outside `stability.py` reads that field, so a later change to a Stage E record would go unnoticed until someone reruns Stage S. |
| WEAK TEST 1 (no dominance test) | ADDRESSED | `test_dominance_N8` compares fm, r_j, b_m, beta, sigma_off and rho_T against independent floating-point values in long double. It can fail; see "Can the new tests fail?" below. The docstring lists the one-term deletions that stay undetectable because they are negligible (q_C terms, Gtail, the far bound, eps, the damping in X_r), consistent with the review. |
| WEAK TEST 2 (no `expect_text`) | ADDRESSED | Anti-diffusion now expects "(C5) ... is 9", drop-A1-everywhere expects "(C5)" and drop-A1-proof-only expects "(SC)". |
| WEAK TEST 3 (floating data that lie; sharp pair) | ADDRESSED | Hook `lie_lead_re` plus `test_neg_lying_float_data` (expects "(SC)"). Sharp pair: 6.32095e-6 must be certified and 6.321e-6 must fail at "(C5) ... is 3". The test prints the margin and says that the float exponent is not certified. |
| MINOR 1 (eig in unscaled coordinates) | ADDRESSED | `eig` now runs on the S-scaled midpoint, `H * Ss[None,:] / Ss[:,None]` = S^{-1} H S, with an exact power-of-two scaling. The old `/Ss[:,None]` is removed, so the S direction is consistent. The N = 32 worst (SC) ratio drops from 0.774 to 0.154. V is untrusted data, so this cannot affect soundness. |
| MINOR 2 (not bit-reproducible) | ADDRESSED | BLAS threads are set to 1 before numpy is imported, and the record shows `threads_pinned_before_numpy` (true in all five records). `search_S` now uses a fixed sweep count instead of wall time. |
| MINOR 3 (spec does not describe the V^{-1} route) | ADDRESSED | See LEMMAS item 6 below. |
| MINOR 4 (settings merged onto DEFAULTS) | ADDRESSED | `st = dict(rec["settings"])`. The required-keys list (rho0, rho, rho2, R, L, M, prec_g, prec_J, strip_nx, strip_rtol, strip_max_evals, eta) covers every `st[...]` used in `stage_e_inputs`. I checked that by grep. |
| MINOR 5 (rho_T is loose) | No action needed, none taken | The dominance test records the ratio, 5.58. |

## (2) Soundness of the fixes and reachability of the hooks

- **Bounds.** No Stage E bound expression changed except `amax`, which now rounds up and is therefore only wider. The Stage E rerun gives identical Y0, Z1, Z2, r_existence, r_uniqueness and T_ms at every N. In Stage S, the only change on the proof path is the choice of untrusted floating data (V, Lambda, S). The Arb checks (q_C < 1, fm_j, (SC), (C5) on the exact floats actually used) are unchanged. delta, theta_T and the multiplier bounds are bit-identical to fa2fa50 for N = 1, 8, 16, 32 and 64. The (SC) worst ratios are 0.104, 0.090, 0.084, 0.154 and 0.169, down from 0.206, 0.092, 0.084, 0.774 and 0.169.
- **`_mutate` and `_diagnostics` in existence.py.**
  - `prove()` refuses any settings key that starts with `_`. I checked this by calling `prove(1, {'_mutate': ('T',)})` and `prove(1, {'_diagnostics': True})`; both raised ValueError.
  - An unknown mutation name raises an error.
  - A mutated `prove_centre` output carries `MUTATED`.
  - No other module calls `ex.prove_centre`. `branch.py` has its own separate `_mutate`.
  - No committed record has `MUTATED` or `_diag`.
- **Stability controls** (`lie_lead_re`, `dump`, `skip_count`, `skip_sanity`, `drop`, `omega_lo`, `Ke`, `damping_sign`). `run()` has no `controls` parameter and calls `certify` without one. `settings` is never merged into `controls`. `skip_count` is still checked again before any conclusion (stability.py:787). All five records have `controls = null`. `dump` only adds output and changes no computation.
- **No check was weakened.** Every old negative control is still present, and three of them now have tighter `expect_text`.

## (3) Provenance at HEAD (SHA-256 computed independently)

- All five `fourier-existence-N*.json` records: all 7 `sources_sha256` entries equal the current files, `centre_sha256` matches, there is no `MUTATED` key, and the date is 2026-10-01.
- All five `fourier-stability-N*.json` records:
  - all 8 source hashes equal the current files, including `stability.py`;
  - `stage_e_record_sha256` equals the SHA-256 of the current `fourier-existence-N*.json`;
  - `stage_e_sources_match` is all true;
  - `centre_sha256` matches;
  - `controls` is null.
- The working tree is clean for this folder except `fourier/branch.py`, which another agent is editing. It is not in either SOURCES list.

## (4) Can the new tests fail?

I ran `test_dominance_N8` on the private copy, N = 8, about 86 s per run:

| Run | Result |
|---|---|
| Unmodified | PASSED. Min ratios: fm 1, r 1.386, b_m 1.223, beta 1, sigma_off 1, rho_T 5.58. These match the referee's probe. |
| `sigma_off` without the n = +-1 terms | FAILED: "sigma_off: certified bound below the float value at 1 entries" |
| `t_w` without the n = +-1 terms (enters r_j) | FAILED: "r_j: certified bound below the float value at 8 entries" |

So the dominance test detects a single-term deletion in a tight bound (sigma_off) and also in a looser one (r_j, about 1.39 times the float value). `test_neg_provenance` fails as required when it is given a bad hash.

I did not rerun the Stage E float and mutation tests (an N = 1 prove plus the float blocks). By inspection:
- `test_mutation_T_detected` asserts that the float estimate of T is above 1e-3 while the certified T is 0. That is the dominance check failing, stated directly.
- `test_mutation_ft_detected` runs the real comparison and requires a violation.

## (5) LEMMAS item 6 against the code

It matches. Item 6 now states:
- eig of the midpoint in S-coordinates, at 128 bits (`DEFAULTS prec = 128`);
- C := I - Vi V with q_C < 1, and V^{-1} = (I - C)^{-1} Vi with the factor on the left;
- the identity Vi(H V - V Lambda) = Wm + C Lambda;
- fm_j <= (||Wm e_j|| + |lambda_j| ||C e_j||) / ((1 - q_C) zeta_j);
- beta <= ||Vi e|| / (1 - q_C);
- the route A clustering sentence.

The code does the same (stability.py lines 701 to 725): Cm = Vi V - I, which has the same absolute values as C; csW from Wm = Vi H V - Lambda; and fm and beta exactly as stated. I re-derived the sign: Vi V Lambda = Lambda - C Lambda. The beta bound agrees with the lemma's definition of beta as ||V^{-1} e_{(w,l)}||_zeta.

## New issues

- **N1 (GAP, process; the residue of Stage S GAP 1).** No standing test or lint checks that a committed stability record's `stage_e_record_sha256` equals the current Stage E record. Grep found no reader outside `stability.py`. Add a cheap test that recomputes these hashes, and the source hashes of both stages, for every committed record.
- **N2 (MINOR, consequence for labelling).** The Stage S records hash the full bytes of the Stage E record, and the Stage E records carry `status: "computed; awaiting adversarial review"`. If the review label is written by editing the Stage E records' `status`, every Stage S hash becomes stale. To label without breaking the chain, either:
  - rerun Stage S after relabelling Stage E (about the cost of the last rerun); or
  - record the review outcome outside the hashed records (for example in the review file or a ledger) and leave the record bytes unchanged.

  The same applies to the Stage S records' own `status` if anything later hashes them.
- **N3 (MINOR).** The provenance checks hash the files on disk. The `existence`, `fourier_eval` and similar modules are imported at module load, before `run()` takes its first hash (cur0). If a source were edited between import and cur0, the in-memory code would differ from the hashed file. The window is tiny and only matters if someone edits sources while a run is starting. To close it, hash at import time, or compare against hashes taken when the modules were imported.
- **N4 (MINOR, test).** The Stage E Y0 dominance check covers only the tail rows. The finite part, about 1e-40, cannot be estimated in double precision. The docstring states this, so no action is needed.

No UNSOUND item. No WEAK TEST beyond the documented undetectable negligible terms.
