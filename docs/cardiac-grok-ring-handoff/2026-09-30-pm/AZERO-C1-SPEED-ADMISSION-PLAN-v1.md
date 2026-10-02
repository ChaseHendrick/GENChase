# AZERO-C1-SPEED-ADMISSION-PLAN-v1 — Grok-only

**Status:** DESIGN ONLY. Next action = **await user go**. Do **not** start a 32 C1, A-zero native pilot, or production header swap from this document alone.
**Written:** 2026-09-30 10:03:24 ET
**Agent:** Grok-only executor
**MachineId:** `<redacted>`
**PM dir:** `outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm/`

Companion: `AZERO-C1-SPEED-ADMISSION-PLAN-v1.json` (same directory).

---

## 0. Goal

Obtain a **rigorous 32-site (then 64) C¹ orbital-return path** that is **materially faster** than the measured adaptive ZeroPruned plateau (~**h≈0.121 ms ≈ 1/8**, ~**4.3–5 min/tube**, ~**31–37 h** extrapolated full period T≈53.6 ms), **without weakening** directions, guards, remainder inclusion, radius, or order gates.

A-zero (exact-zero **variation** skip: omit `J·A` only when complete outward `A=[0,0]` and both `J` endpoints finite) is the candidate **per-tube** speed lever after controls C1–C6 passed. It is **not** yet proof-admitted for `ring_flow` / C¹ tubes.

---

## 1. Current A-zero status (do not invent)

| Item | Status |
| --- | --- |
| Controls tag | `20260930-v3` (C1 retained `20260930-v2`) |
| C1–C5 | **PASS** |
| C6 independent review | **ACCEPT** |
| ROLE-07 | **accept** / `CONTROLS_PASS_BUT_NOT_ADMITTED_FOR_PROOF` |
| Production ZeroPruned / Cellwise headers | **Unchanged** (live sha match pins) |
| `A-ZERO-PROPOSAL-V1.json` flags | Still `coefficientControlsPassed=false`, `sourceAuditPassed=false`, `status=unexecuted prototype; not admitted` (stale vs C5/C6 artifacts — reconcile under G1; do not silently flip proof flags) |
| Proof reliance / theorems | **Forbidden** |
| C2 lesson | Prior FAIL was **harness batch vs sparse**, not A-zero skip; equality retained via **Cellwise-sparse vs AZero-sparse** |

Pinned prototype hashes (live):

- `AZeroPrunedCellwiseRingMap.hpp` `c252a3bcff9b4092659b4f08d407d8f6e9c7cd06db962f5ec3506a8149251e10`
- `AZeroPrunedSparseMap.hpp` `31d1eb16d06c333eb64535e7b8981680e54b6e60321c1344fe1d77508af21fc8`
- Production `ZeroPrunedSparseMap.hpp` `c2c0f5174f62785776195ccf69b04b1dfcf4963ea2a95389424212adf5e53043` (must not be replaced until **G8**)

---

## 2. Cost baseline (ZeroPruned adaptive C1)

From `SPEED-DESIGN-v1` + interrupted tag `box20-zero-pruned-adaptive-radius3e10-grok-20260930-v1` (7 tubes, stopped for H64 pivot; dir preserved):

| Quantity | Value |
| --- | --- |
| N / mode / radius / order | 32 / box / 3e-10 / 20 |
| Supplier | ZeroPrunedSparseMap (accepted audit) |
| Plateau h | ≈0.12109375 ms (`0x1.fp-4`) after first cut-in |
| Observed | ≈258 s/tube (4.30 min/tube); planning **≈5 min/tube** |
| Coords / guards | 576 / 4384 per tube |
| Tubes / period | T/h ≈ 53.588/0.121 ≈ **~440** |
| Extrapolated full period | **~31.7 h** (obs) … **~36.7 h** (5 min/tube) |
| A-zero per-tube speedup | **unknown** until timed sparse-path bench (G5/P0) |

A-zero does **not** change tube count by itself (unless later combined with a separately admitted larger fixed h). Upside is **s/tube** via fewer exact-zero-A products on the sparse path that `*SparseMap` selects for OdeSolver.

---

## 3. Gap list: CONTROLS_PASS → proof-usable C¹ speed path

| # | Gap | Why it blocks | Closure artifact |
| ---: | --- | --- | --- |
| 1 | **No `ring_flow` wiring** | Only `ring_flow_zero_pruned.cpp` / `sparse` / `cellwise` exist. **Zero** `AZero` includes in `ring_flow*`. | Isolated `ring_flow_azero.cpp` (`AZeroPrunedSparseMap`) + build/run scripts **parallel to** ZeroPruned — never overwrite ZeroPruned |
| 2 | **No AZero build/launch runner** | `build_large_zero_pruned_flow.py` / `run_large_zero_pruned_flow.py` hard-copy and **assert** ZeroPruned header SHAs + ZeroPruned audit schema | `build_large_azero_flow.py` + `run_large_azero_flow.py` with AZero audit schema and pin asserts |
| 3 | **No AZero supplier source audit** | ZeroPruned has `tissue-proof-review/zero-pruned-supplier-review-v1/SUPPLIER-SOURCE-AUDIT.json`. AZero has only admission C6 + proposal | `tissue-proof-review/azero-supplier-review-v1/SUPPLIER-SOURCE-AUDIT.json` |
| 4 | **Sparse-path consistency (C2 lesson)** | C5-step/C4 harnesses used OdeSolver on **non-Sparse** Cellwise/AZero Cellwise (batch). Production flow uses `*SparseMap` → sparse override where A-zero skip lives. Batch C5 does **not** exercise the skip in flow. | G4: N=3 C¹ **sparse** tube/coeff equivalence AZeroSparse vs ZeroPrunedSparse |
| 5 | **Proposal flag ledger** | Proposal JSON still denies coefficient/source flags despite C5/C6 artifacts | G1: reconcile from artifacts only; keep proof/spatial false until G8+ |
| 6 | **No measured speed evidence** | Unknown whether skip rate beats ~5 min/tube | G5 micro-bench then G6 N=32 pilot |
| 7 | **V5 / checker supplier scope** | V5 admits ZeroPruned order20 box C1; AZero is a new supplier class | Separate adapter review; do not silently widen V5 |
| 8 | **RSS/wall / dual-PGID ops** | Native `ring_flow` uses `start_new_session` ⇒ separate PGID from supervisor | Every heavy launch documents dual PGID; kill **native first** |
| 9 | **Full return ≠ speed pilot** | Fast early window does not certify existence/period/stability | G9+ only after G8; handoff residual/K/H gates remain |

---

## 4. Ordered gates G0…G9 (stop-on-fail)

**Policy:** fail-closed; unique tags; Grok-only; **one heavy native at a time**; no Claude; no continuum/PDE; no 32/64 theorem claims from pilots.

### G0 — Design accept / authorization
- **Pass:** User/coordinator explicitly authorizes next executable gate (default: **await user go**).
- **Fail:** Any native start without go.
- **Artifacts:** this plan md/json sha in launch receipt.

### G1 — Ledger reconcile (no proof flip)
- **Pass:** Update `A-ZERO-PROPOSAL-V1.json` **control flags** from C5/C6 artifact SHAs only; retain `admitted_for_proof=false`, `largePilotLaunched=false`, `spatialExistenceCertified=false`, `spatialStabilityCertified=false`, `existingSourcesModified=false`.
- **Fail:** Setting proof/spatial true; editing ZeroPruned headers.
- **Review:** ROLE-07 spot-check flags vs artifacts.

### G2 — Isolated AZero flow TU (compile-only OK)
- **Pass:** `ring_flow_azero.cpp` = copy of `ring_flow_zero_pruned.cpp` with `AZeroPrunedSparseMap` only; `build_large_azero_flow.py` freezes pins into `runs/<tag>/` and compiles; **does not** modify ZeroPruned runner/headers.
- **Fail:** In-place production edit; compile error; missing AZero pin assert.
- **Sparse lesson:** Map type **must** be `AZeroPrunedSparseMap` (sparse override), never bare `AZeroPrunedCellwiseRingMap` for flow.
- **Artifacts:** `runs/azero-large-return-build-n32-v1/RESULT.json`, binary sha, BUILD.log.

### G3 — AZero supplier source audit
- **Pass:** Independent audit: declared diff only (rename + cmath + exact-zero-A skip in sparse); full columns/states/dense A0/remainders; pins match; C1–C6 linked; `accepted=true` for **isolated runner use only**; still `admitted_for_proof=false` for theorems.
- **Fail:** Undeclared diff; pin mismatch; accept without C1–C5; rubber-stamp.
- **Artifacts:** `tissue-proof-review/azero-supplier-review-v1/SUPPLIER-SOURCE-AUDIT.json`.
- **Review:** ROLE-07 (not sole implementer stamp).

### G4 — Sparse-path C¹ equivalence (N=3 fixture)
- **Pass:** Coeff **and** OdeSolver tube compare **AZeroPrunedSparseMap vs ZeroPrunedSparseMap** on identical N=3 seeds; hexfloat equality **or** fail-closed mutual inclusion with equal width; remainder checks; all columns; dense-A0 included; nonfinite-J never-omits retained.
- **Fail:** Missing column; batch-path-only compare; weakened equality without ROLE-07 exception (default: keep hexfloat on coeff).
- **Artifacts:** `a-zero-admission-grok/g4-sparse-c1-equivalence-grok/<tag>/results/*`.
- **Wall/RSS:** ≲ few–15 min / <1 GiB (mark measured).

### G5 — Micro speed bench (smallest truthful speed evidence)
- **Pass:** Timed N=3 (or N=8 if N=3 skip density too low) C¹ sparse tubes, identical step policy, AZero vs ZeroPruned; report s/tube (+ optional skip counters); **no theorem**.
- **Fail:** Incomparable configs; batch Cellwise as AZero path.
- **Success metric:** AZero s/tube **materially lower** (planning **≳1.2×**). If **&lt;1.05×** → A-zero not a speed path → **fallback** (§6).
- **Does NOT prove:** N=32/64 return time, existence, stability, header swap.

### G6 — N=32 C¹ AZero speed pilot (isolated runner; headers untouched)
- **Pass:** Unique tag e.g. `box20-azero-adaptive-radius3e10-speed-pilot-grok-<date>-v1`; radius **3e-10**, order **20**, **all 576 dirs / 4384 guards**, strict remainder; wall **3600 s**, RSS **2048 MiB**; stop at **≥ ~1.0 ms** physical or budget/failure; compare s/ms and s/tube to ZeroPruned adaptive baseline (~258 s/tube).
- **Fail:** Remainder/domain failure; dropped dirs/guards; wrong binary; second concurrent heavy native.
- **Pass (speed):** ≳**1.3×** s/ms vs adaptive ZeroPruned early window with gates intact (planning bar).
- **Does NOT prove:** full-period return, residual inclusion, theorem.
- **Wall/RSS:** ≤1 h by budget; full-period extrapolation labeled **non-certificate**. AZero full-period hours = **unknown** until s/tube measured.

### G7 — Pilot + supplier joint review
- **Pass:** ROLE-07 accepts G3+G4+G5/G6; sparse-path consistency; no production swap yet.
- **Fail:** Accept without G4; weakened guards.
- **Artifacts:** `ROLE-07-azero-c1-speed-REVIEW.json`.

### G8 — Named production-admission gate (header / default supplier)
- **Pass:** Explicit user/coordinator go **naming G8**; then either (a) admit parallel `run_large_azero_flow.py` as authorized alternate for new tags, or (b) new immutable AZero flow TU with full re-audit — **never** silently rewrite historical ZeroPruned audits.
- **Fail:** Swap without go.
- **Default until go:** production C¹ path remains ZeroPruned.

### G9 — Full 32 (then 64) return attempts under admitted AZero path
- **Pass:** Fresh immutable tags; full budgets; handoff workstreams 1–5 still required for theorems.
- **64:** Separate finite budget; one-step pilots do **not** authorize full 64 return.

---

## 5. Recommended first executable pilot (after user go)

**Smallest truthful speed evidence = G5 (P0), not a full 32 C1.**

| Field | Value |
| --- | --- |
| **Id** | P0 / G5 |
| **Tag pattern** | `azero-n3-c1-sparse-speed-bench-grok-YYYYMMDD-v1` |
| **N / order** | 3 / 20 |
| **Maps** | `AZeroPrunedSparseMap` vs `ZeroPrunedSparseMap` |
| **Mode** | box micro-width + dense-A0 variant; identical seeds |
| **Tubes / wall** | 8–16 tubes or wall ≤300 s |
| **RSS** | ≤512–768 MiB |
| **Metric** | wall s/tube AZero vs ZeroPruned |
| **Proves** | Whether A-zero skip yields material per-tube speed on sparse C¹ path |
| **Does NOT prove** | 32/64 returns, header swap, theorems, continuum |
| **Requires** | G0 + G2 + G4 (G1/G3 strongly preferred before any claim of supplier readiness) |

**Only if P0 shows material speedup (or user explicitly prioritizes 32 evidence):** G6 P1 N=32 AZero speed pilot under isolated `ring_flow_azero` binary.

**Next action from this design file:** **await user go** (authorize G1 and/or G2). Do **not** auto-start P0/P1.

---

## 6. Fallback (if A-zero gates fail)

Per `SPEED-DESIGN-v1`, **admit-able today** without A-zero:

> **N=32 C1 box, radius 3e-10, order 20, ZeroPruned, FIXED h=1/4**, tag `box20-zero-pruned-fixed-quarter-radius3e10-speed-pilot-grok-…`, wall 3600 s / RSS 2048 MiB, stop ≥~1 ms, strict remainder, all dirs/guards.

Planning ~**2×** fewer tubes vs h≈0.121 if remainder holds. If fixed-quarter fails closed → calibrate fixed h=1/8, then stop. **Do not** silently jump to order cuts, radius widen, or header swap.

Use when: G4 fails; G5 speedup &lt;~1.05×; G6 remainder-fails; or user prioritizes admit-able lever over A-zero wiring.

---

## 7. Explicit non-actions

1. No production ZeroPruned→AZero **header replacement** until **G8** named go.
2. No claiming 32/64 existence / period / stability / nonsynchrony theorems from speed pilots.
3. No continuum / PDE / sync-only / floating-eigenvalue “proofs”.
4. No Claude; **Grok-only** for this path.
5. **One heavy native** Mac CAPD/`ring_flow` at a time.
6. Dual-PGID cleanup: verify identities → **kill native PGID first** → supervisor → re-ps (`CLEANUP-DUAL-PGID.json`).
7. Never resume/append interrupted dirs (`box20-…-20260930-v1` preserved).
8. Do not compare AZero **batch** to ZeroPruned **sparse** for admission (C2 lesson).
9. Do not lower order20 or drop directions/guards for speed.
10. Do not start P0/P1/G6 from this document without user go.

---

## 8. Codebase blockers found (design-time)

| Blocker | Evidence |
| --- | --- |
| No AZero `ring_flow` TU | `ring_flow_*.cpp` has no `AZero` string |
| Launch scripts pin ZeroPruned | `run_large_zero_pruned_flow.py` asserts ZeroPruned audit + header SHAs |
| Proposal ledger stale | `A-ZERO-PROPOSAL-V1.json` still false control flags despite C5/C6 PASS |
| Sparse vs batch gap in C5-step | OdeSolver used non-Sparse AZero Cellwise (skip inactive) |
| No AZero supplier audit dir | Unlike `zero-pruned-supplier-review-v1` |
| Linux box not ready | `BOX-LINUX-FEASIBILITY.json` — Mac lane only |
| A-zero s/tube unknown | No bench receipt yet |

Non-blockers: `AZeroPrunedSparseMap` already overrides to sparse (correct for flow); prototypes compile in admission harness; C1–C6 under `a-zero-admission-grok/`.

---

## 9. Rough expectations

| Item | Estimate | Confidence |
| --- | --- | --- |
| G2 compile | ≲3 min | High |
| G4 N=3 sparse equiv | ≲5–15 min wall | Med |
| G5 micro bench | ≲5–15 min | Med |
| G6 N=32 ≤1 ms window | ≤3600 s by cap | High budget / unknown AZero s/tube |
| Full period under AZero | **unknown** until G5/G6 | Unknown |
| ZeroPruned full period baseline | ~31–37 h | Med (early-tube extrapolate) |

---

## 10. Sources consulted (sha256)

- `A-ZERO-PROPOSAL-V1.json`: `e09cdea5baf9399f8ecde7128233b122fe554d84c6e9f36b52e476791fff4644`
- `AZERO-ADMISSION-PLAN-v1.md`: `5f7ab523875723c8b42565dfabce11ac4924d631049e25e2d4c0afc8aee48dbc`
- `AZERO-CONTROLS-RUN-20260930-v2.json`: `cd5c43069cf387e783eee56a13da1f1358e7b270f55a2d7ca48d1db1e7cfd86c`
- `AZERO-CONTROLS-RUN-20260930.json`: `bfeca3db0e017df7258ffba53168bdc58c8edc42f4ef6af7cf1aac7826083cd0`
- `AZeroPrunedCellwiseRingMap.hpp`: `c252a3bcff9b4092659b4f08d407d8f6e9c7cd06db962f5ec3506a8149251e10`
- `AZeroPrunedSparseMap.hpp`: `31d1eb16d06c333eb64535e7b8981680e54b6e60321c1344fe1d77508af21fc8`
- `CLEANUP-DUAL-PGID.json`: `42555563a498ee62a4fbbdad0a446ed1b3f8b33f64aa5ef6ffb0111822ca1b91`
- `GROK-HANDOFF.md`: `e70918bf2501a008ad131ecfd9289eb83a4f1ed172a858c10ed66cac1e16ed57`
- `HANDOFF-BINDINGS.json`: `5cec92ebe438eca4bba9ba5c210d30b85b5a39e19957064826b4ce126196503b`
- `ROLE-07-azero-controls-REVIEW.json`: `48f61278fffe3355b53499d0c703db2fae8da94643cfa7f763e9baad7b6cc8ef`
- `SPEED-DESIGN-v1.json`: `20581f867263aac3fdab61a1e2665af65c1a387508e2155279f89355ff99e62e`
- `SPEED-DESIGN-v1.md`: `e33bab12191c719106c0c40a7e2f156d4197b6a79663e396f5d662cfc8a82316`
- `ZeroPrunedCellwiseRingMap.hpp`: `6817be29a468657e17073aefe037722cf51605ea26bb3ed66ea2e7b843289527`
- `ZeroPrunedSparseMap.hpp`: `c2c0f5174f62785776195ccf69b04b1dfcf4963ea2a95389424212adf5e53043`
- `box20-zero-pruned-adaptive-radius3e10-grok-20260930-v1-STOPPED.json`: `f681b7da2603a38fc35fb9853c3aee5dbc0d1366867d763bac6a6eefec509544`
- `ring_flow_zero_pruned.cpp`: `5b85695c7948a7589fe7be4211fd9e22e48c6417a9f0a3936f33e086a4f3879c`

---

## 11. Next action

**await user go** — authorize G1 (ledger) and/or G2 (isolated `ring_flow_azero` build). Default: no native pilot.
