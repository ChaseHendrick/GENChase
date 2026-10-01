# AZERO-ADMISSION-PLAN-v1 — Grok-only

**Status:** PLAN ONLY. Controls **not** executed this turn. **NOT admitted for proof.**
**Written:** 2026-09-30 09:32:45 ET
**Agent:** Grok-only executor
**MachineId:** `056ff109-1c8e-49fc-9983-1c1caa02e796`
**PM dir:** `outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm/`
**Admission root:** `work/cardiac-study/tissue-scalability-preflight/a-zero-admission-grok/`

Companion: `AZERO-ADMISSION-PLAN-v1.json` (same directory).

---

## 0. Priority and hard constraints

User priority **after H64 products**: complete A-zero admissions **C1–C6 before any fixed-quarter speed pilot**.

| Constraint | Policy |
| --- | --- |
| Production ZeroPruned / Cellwise headers | **Do NOT replace** |
| Heavy CAPD vs H64 | **Do NOT** start competing native if H64 busy |
| Proof reliance | **Forbidden** until all six + independent review accept |
| Header swap / production install | **Forbidden** until same gate |
| Fixed h=1/4 speed pilot (SPEED-DESIGN-v1) | **Deferred** until A-zero gate clears or user waives |

---

## 1. H64 status (noted; no replay)

| Field | Value |
| --- | --- |
| Tag | `ring64-H-products-grok-20260930-v1` |
| PIDs 88117 / 88119 | **not alive** |
| Supervisor exit | **0** |
| RUN-REPORT exitCode | `0` |
| Elapsed | `186.520` s (wall cap 1200) |
| RESULT status | `strict complete congruence DD passed` |
| RUN-REPORT sha256 | `6231856ccf1269f6a03f4998ab6fd47b026ae22dd9d3c77d8fed13701137403d` |
| RESULT sha256 | `5be88e88287c62714e33efc751958e9548b855fd561e2ee3fed8ebb9a9b3f5db` |

**Finished successfully.** Status recorded only. **Did not** start full H replay.

Lane for small native A-zero controls is therefore free **if** coordinator authorizes; this plan turn still launches **no** native CAPD.

---

## 2. Links (existing)

| Doc | Path | sha256 |
| --- | --- | --- |
| A-ZERO-PROPOSAL-V1 | `work/cardiac-study/tissue-scalability-preflight/A-ZERO-PROPOSAL-V1.json` | `e09cdea5baf9399f8ecde7128233b122fe554d84c6e9f36b52e476791fff4644` |
| ROLE-06-azero-small-tests | `outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm/ROLE-06-azero-small-tests.json` | `6c0d547707696499ce79a55b224bdc1ba215842c486c42b757a0a4ddb64232e9` |
| DESIGN-CONTROL-PLAN | `work/cardiac-study/tissue-scalability-preflight/a-zero-small-tests-grok-20260930-v1/DESIGN-CONTROL-PLAN.md` | `9b4f9d19bcb7919cdaae0b8f93ceff8d799f6e1f70a15a00f889b7b5ab48631d` |
| SPEED-DESIGN-v1 (deferred by priority) | `outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm/SPEED-DESIGN-v1.md` | (see file) |

Semantics (proposal): skip `J*A` only for complete outward `A=[0,0]` with both `J` endpoints finite; else preserve multiplication/order; nonfinite `J` does not omit. Retain all columns, states, dense-width A0, all remainder calls.

Prototypes (read-only): `AZeroPrunedCellwiseRingMap.hpp` (`c252a3bc…`), `AZeroPrunedSparseMap.hpp` (`31d1eb16…`).

Must **not** replace: `ZeroPrunedCellwiseRingMap.hpp` (`6817be29…`), `ZeroPrunedSparseMap.hpp` (`c2c0f517…`), `CellwiseRingMap.hpp` (`9818bfdc…`).

Prior partial: predicate unit `a-zero-small-tests-grok-20260930-v1` **14/14** — does **not** satisfy C1 CAPD / C2–C6.

---

## 3. Checklist C1–C6

### C1 — Signed-zero CAPD serialization
- **Tag prefix:** `work/cardiac-study/tissue-scalability-preflight/a-zero-admission-grok/c1-signed-zero-capd-serialization-grok/`
- **Lane:** need free lane (native CAPD)
- **While H64 busy:** design / hash / fixture draft only
- **Artifacts:** `src/c1_signed_zero_capd_serialization.cpp`, `bin/c1_signed_zero_capd_serialization`, `results/C1-RESULT.json`, `results/C1.stdout`, `results/C1.time.log`, `results/COMPILE-C1.log`, `CONTROLS.json`
- **Pass:** CAPD ±0 serialization does not change omission vs IEEE `[0,0]`; enclosure equality vs ZeroPruned on signed-zero seeds; exit 0; `admitted_for_proof=false`
- **Fail:** sign-of-zero-only enclosure/product change; round-trip endpoint drift; wall/RSS overrun
- **Limits:** wall ≤ **120 s**, RSS ≤ **512 MiB**, N≤3, order≤20
- **Est. wall:** ~30 s

### C2 — Dense A0
- **Tag prefix:** `work/cardiac-study/tissue-scalability-preflight/a-zero-admission-grok/c2-dense-a0-grok/`
- **Lane:** need free lane (native)
- **While H64 busy:** design / seed JSON draft / hash only
- **Artifacts:** `src/c2_dense_a0_controls.cpp`, `bin/c2_dense_a0_controls`, `results/C2-RESULT.json`, `inputs/DENSE-A0-SEEDS.json`, stdout/time/compile logs
- **Pass:** dense nonzero A0 never skipped; skip only outward `A=[0,0]` + finite J; nonfinite J never omits; hexfloat equality vs Cellwise on dense seeds
- **Fail:** skip on dense A0; skip with nonfinite J; enclosure mismatch; overrun
- **Limits:** wall ≤ **120 s**, RSS ≤ **512 MiB**, N≤3, order≤20
- **Est. wall:** ~60 s

### C3 — Every variation column
- **Tag prefix:** `work/cardiac-study/tissue-scalability-preflight/a-zero-admission-grok/c3-every-variation-column-grok/`
- **Lane:** need free lane (native)
- **While H64 busy:** design / column checklist / hash only
- **Artifacts:** `src/c3_every_variation_column.cpp`, `bin/c3_every_variation_column`, `results/C3-RESULT.json`, `results/C3-COLUMN-AUDIT.json`, logs
- **Pass:** all columns retained; enclosure equality vs ZeroPruned on full-column point+box N=3 sets; column count == dim each order
- **Fail:** missing column; endpoint mismatch; overrun
- **Limits:** wall ≤ **120 s**, RSS ≤ **512 MiB**, N≤3, order≤20
- **Est. wall:** ~60 s

### C4 — Rigorous remainders
- **Tag prefix:** `work/cardiac-study/tissue-scalability-preflight/a-zero-admission-grok/c4-rigorous-remainders-grok/`
- **Lane:** need free lane (native)
- **While H64 busy:** design / remainder-hook checklist / hash only
- **Artifacts:** `src/c4_rigorous_remainders.cpp`, `bin/c4_rigorous_remainders`, `results/C4-RESULT.json`, `results/C4-REMAINDER-AUDIT.json`, logs
- **Pass:** remainder call count == ZeroPruned; inclusion unchanged (equal endpoints or mutual inclusion equal width); fail-closed with baseline
- **Fail:** fewer remainder calls; weakened inclusion; overrun
- **Limits:** wall ≤ **180 s**, RSS ≤ **768 MiB**, N≤3, order≤20
- **Est. wall:** ~90 s

### C5 — Exact-linear / coefficient / step / event
- **Tag prefix:** `work/cardiac-study/tissue-scalability-preflight/a-zero-admission-grok/c5-exact-linear-coeff-step-event-grok/`
- **Lane:** need free lane (native)
- **While H64 busy:** design / extend deferred source text-only / hash only
- **Basis:** `linear_azero_controls_DEFERRED.cpp` (sha `55b49beb…`)
- **Artifacts:** `src/c5_exact_linear_coefficients.cpp`, `src/c5_exact_linear_step.cpp`, `src/c5_exact_linear_event.cpp`, `results/C5-COEFF-RESULT.json`, `results/C5-STEP-RESULT.json`, `results/C5-EVENT-RESULT.json`, `results/C5-RESULT.json`, `results/C5-NEGATIVE-CONTROLS.json`, logs
- **Pass:** N=3 kappa=9/64000 coeff match Cellwise + contain exact; `coefficientControlsPassed`; `fullStepControlsPassed`; event pass or documented N/A; negatives reject wrong derivative/coupling/point-in-box
- **Fail:** any miss vs exact/Cellwise/ZeroPruned; negative accepted; overrun
- **Limits:** wall ≤ **300 s**, RSS ≤ **768 MiB**, N≤3, order≤20
- **Est. wall:** ~180 s

### C6 — Independent source audit
- **Tag prefix:** `work/cardiac-study/tissue-scalability-preflight/a-zero-admission-grok/c6-independent-source-audit-grok/`
- **Lane:** **design/hash-only OK while H64 busy**
- **Artifacts:** `SOURCE-DIFF-vs-ZeroPruned.md`, `SOURCE-PREPARATION.json`, `PINS.json`, `SOURCE-ADMISSION.json`, `INDEPENDENT-REVIEW.json`, `LIVE-HASHES.json`, `results/C6-RESULT.json`
- **Pass:** independent reviewer recomputes hashes; diff only declared exact-zero-A gate; checklist semantics + retention flags; **accept only after C1–C5 pass**; no rubber-stamp
- **Fail:** hash mismatch; undeclared diff; accept before C1–C5; reviewer==sole implementer without role separation
- **Limits:** wall ≤ **600 s**, RSS ≤ **256 MiB** (no native required for C6 body)
- **Est. wall:** ~120 s

---

## 4. Sequence

```
[H64 busy / any heavy CAPD]     → design + hash + C6 draft ONLY
[lane free + authorized]        → C6 pins → C1 → C2 → C3 → C4 → C5 → C6 final review
[optional]                      → C2+C3 share one N=3 harness if output tags stay unique
[after ALL six + review accept] → (only then) consider header admission / speed options
[until gate]                    → no proof use; no ZeroPruned/Cellwise swap; no h=1/4 pilot
```

H64 is **finished** now → native lane free in principle; **this turn does not start native**.

---

## 5. Gate (hard)

**No proof reliance. No production header swap. No A-zero supplier install.** Until:

1. C1, C2, C3, C4, C5 each have passing `*-RESULT.json` under their unique tags, and
2. C6 `INDEPENDENT-REVIEW.json` has `verdict: accept` from a non-rubber-stamp independent pass, and
3. Proposal flags (`coefficientControlsPassed`, `fullStepControlsPassed`, `fullEventControlsPassed`, `sourceAuditPassed`) updated only from those artifacts.

Required accept artifact paths (pattern):

- `work/cardiac-study/tissue-scalability-preflight/a-zero-admission-grok/c1-…/<tag>/results/C1-RESULT.json`
- `work/cardiac-study/tissue-scalability-preflight/a-zero-admission-grok/c2-…/<tag>/results/C2-RESULT.json`
- `work/cardiac-study/tissue-scalability-preflight/a-zero-admission-grok/c3-…/<tag>/results/C3-RESULT.json`
- `work/cardiac-study/tissue-scalability-preflight/a-zero-admission-grok/c4-…/<tag>/results/C4-RESULT.json`
- `work/cardiac-study/tissue-scalability-preflight/a-zero-admission-grok/c5-…/<tag>/results/C5-RESULT.json`
- `work/cardiac-study/tissue-scalability-preflight/a-zero-admission-grok/c6-…/<tag>/INDEPENDENT-REVIEW.json`

---

## 6. Estimated total wall (if controls stay small)

| Bundle | Estimated | Hard-cap sum |
| --- | ---: | ---: |
| C1–C5 native serial | ~420 s (~7.0 min) | 840 s (14.0 min) |
| C6 design/hash | ~120 s (~2.0 min) | 600 s (10.0 min) |
| **All six serial** | **~540 s (~9.0 min)** | **1440 s (~24.0 min)** |

Assumes N=3 linear fixtures per DESIGN-CONTROL-PLAN. Planning figures only — not a certificate.

---

## 7. Explicit non-actions this turn

- Did not replace production ZeroPruned/Cellwise headers
- Did not start heavy CAPD / A-zero native harness
- Did not start fixed-quarter speed pilot
- Did not start full H64 replay
- Did not claim A-zero admitted for proof
- Did not involve Claude/Codex
