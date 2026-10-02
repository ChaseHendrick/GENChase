# SPEED-DESIGN-v1 — Grok-only (design document)

**Status:** design-only. No production headers modified. No competing heavy CAPD/native jobs launched.
**Written:** 2026-09-30 09:28:32 ET
**Agent:** Grok-only executor
**MachineId:** `<redacted>`
**PM dir:** `outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm/`

Companion machine-readable file: `SPEED-DESIGN-v1.json` (same directory).

---

## 0. Sources consulted (read-only)

| Source | Role |
| --- | --- |
| `outputs/cardiac-study/grok-ring-handoff/GROK-HANDOFF.md` (sha `e70918bf2501a008ad131ecfd9289eb83a4f1ed172a858c10ed66cac1e16ed57`) | Targets, blockers, workstreams |
| `outputs/cardiac-study/grok-ring-handoff/HANDOFF-BINDINGS.json` | Frozen INPUTS / audits; q32/q64 context via handoff table |
| Measured C1 tag `box20-zero-pruned-adaptive-radius3e10-grok-20260930-v1` | Interrupted adaptive C1 tubes (7 complete tubes) |
| Prior paused `box20-zero-pruned-adaptive-radius2e10-v1` (12 tubes) / `…-radius3e10-v1` (1 tube) | Same step plateau pattern |
| Completed `point28-zero-pruned-fixed-eighth-v1` | C0 order28 fixed h=1/8 full relative return |
| Residual replay `actual32-point-residual-independent-v2` | max|C(I-P)| ≈ 2.2485982053408272e-10 > radius 2e-10 |
| `A-ZERO-PROPOSAL-V1.json` + `ROLE-06-azero-small-tests.json` | A-zero NOT admitted; predicate-only |
| `ROLE-04-r64-pilot-notes.json` | 64 h=1/64 completed vs h=1/8 interrupted |
| `BOX-LINUX-FEASIBILITY.json` | Mac binaries do not admit Linux; box not ready |
| `ROLE-05-r64-H.json` / H64 admission budget | H64 products **not** executed / not running |

**Lane note (at design time):** measured C1 tag ended incomplete (`flow_exit=-15`, `flow_seconds≈1807`, `step_count=7`, RAW-FLOW empty). No live `ring_flow` / H64 native products observed while writing this design. Design-only; do not start a competing heavy job without coordinator approval.

---

## 1. Cost model (from measured C1 tubes)

### 1.1 Observed adaptive C1 steps (N=32, box, r=3e-10, order20, ZeroPruned)

Tag: `box20-zero-pruned-adaptive-radius3e10-grok-20260930-v1`

| stepIndex | step (ms) | timeEnd (ms) | coords | guards | domainOK |
| ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 0.1125445449076334 | 0.1125445449076334 | 576 | 4384 | true |
| 2–7 | **0.12109375** (`0x1.fp-4`) | … → **0.8391070449076334** | 576 | 4384 | true |

- Wall for 7 tubes: **1807.06 s** ⇒ **≈258.2 s/tube ≈ 4.30 min/tube** observed.
- Conservative planning figure used below: **≈5 min/tube** (matches handoff-scale estimate; covers later-tube / load variance).

### 1.2 Period geometry (handoff bindings)

| Quantity | Value |
| --- | --- |
| Ordinary relative τ₃₂ | 1.6746279415729937 ms |
| Physical period T = N·τ | **≈53.588 ms ≈ 53.6 ms** |
| Exact proposed q₃₂ | 499995373/500000000 |
| Exact proposed q₆₄ | 249998827/250000000 |
| Ordinary relative τ₆₄ | 0.8373140690363405 ms (same physical T≈53.6 ms) |

### 1.3 Extrapolation at fixed-step plateau

- Fixed-step size after first adaptive cut-in: **h ≈ 0.12109375 ms**
- Tubes for one physical period: T/h ≈ 53.588/0.12109375 ≈ **442.5 ≈ ~440 tubes**
- Wall @ 5 min/tube: 440 × 5 min ≈ **2200 min ≈ 36.7 h ≈ ~37 h**
- Wall @ observed 4.30 min/tube: ≈ **31.7 h** (optimistic lower bound from early tubes only)
- Tubes to ~1 ms: 1/h ≈ **8.3 tubes** ⇒ ~0.6–0.7 h at observed/5-min rates (early segment only)

### 1.4 Bottleneck decomposition (why ~5 min/tube)

1. **C1, all 576 directions** — full variation retained every tube (not point/C0).
2. **CAPD order 20** — admitted C1 order; Taylor/remainder cost scales with order.
3. **Sparse-J vs dense** — admitted ZeroPruned skips only exact J=[0,0]; still dense-width A₀ / full columns; not A-zero.
4. **Mac single core** — native `ring_flow` is sequential; no tube-level parallelism in the validated flow.

A partial tube set is **not** a certificate. One-step 64 pilots do **not** authorize a full 64 return budget.

---

## 2. Options ranked by rigor risk vs expected speedup

Ranking key: **lower rigor risk first within similar speedup; among admit-able options prefer highest expected speedup.**
Speedup estimates are **order-of-magnitude planning factors**, not theorems.

| Rank | Option | Rigor risk | Expected speedup (planning) | Admit status now | Notes |
| ---: | --- | --- | --- | --- | --- |
| 1 | **Larger validated fixed step** (keep remainder inclusion **strict / fail-closed**) | Low→Med | Tube-count ∝ 1/h. Adaptive already ≈0.121≈1/8, so **h=1/8 ≈ ~1.03×** only. **h=1/4 ≈ ~2×** fewer tubes if remainder/domain hold. Analog: 64 h=1/64 done (1263.95 s, 1152 coords / 1,327,104 deriv intervals / 26,304 guards); h=1/8 method source admitted but step **interrupted** @290.42 s | **Admit-able path** on ZeroPruned C1 order20 (step policy only); remainder gate unchanged | Highest **admit-able** lever for active N=32 C1 cost |
| 2 | **Order reduction only where proven safe** | Med (needs separate proof that remainder still contains) | Roughly superlinear in order for jet/remainder; speculative **~1.3–2×** if e.g. 20→16 were ever proven | **Not proven safe** for C1; V5 admits order20 for box C1; order28 is point/C0 only | Do not lower order without an independent remainder/order admission |
| 3 | **Admitted A-zero / exact-zero-A prune** | High until controls pass | Potentially large **per-tube** win (skip J·A when A=[0,0] outward) | **NOT admitted.** Predicate unit 14/14 only. Missing admissions **C1–C6** (signed-zero serialization, dense A₀, every column, remainders, exact-linear/coeff/step/event, independent source audit) | Must not replace accepted ZeroPruned headers |
| 4 | **Point return first, then box** | Low for sequencing; does not remove box cost | Point28 C0 fixed-eighth **already complete** (16 tubes, 1448 s). Box C1 still required. Residual **≈2.25e-10 > 2e-10** blocks old radius; **3e-10** is the authorized box radius | Point supplier admitted (distinct from box C1) | Useful dependency order only; not a wall-time fix for ~37 h C1 |
| 5 | **Parallel tube?** | High if forced | Usually **none** — sequential validated flow / event branch | Usually **no** | Do not claim parallel tubes without a separately audited composition theorem |
| 6 | **Linux box fresh CAPD build** | Med (port + rounding/runtime re-admission) | Hardware-dependent; Mac binaries **do not admit** Linux. Box inventory: CAPD/g++/make/cmake/GMP-MPFR-dev **absent**; not ready now | **Not ready** (`BOX-LINUX-FEASIBILITY`) | Fresh Linux compile + controls mandatory before any Linux native claim |
| 7 | **Radius / strategy changes that keep proof gates** | Low if gates identical | Radius already 3e-10 to cover residual; widening further is not a speed tool. Adaptive→fixed is strategy, covered in (1) | Radius 3e-10 authorized for C1 box | Keep all directions/guards; no silent gate weakening |

---

## 3. Explicit NON-options

Do **not** pursue any of the following as speed “fixes”:

1. **Floating eigenvalues** / numerical eigensolvers as stability proofs.
2. **Reduced models** (dropping states, sync manifolds as substitutes for full 18·N dynamics).
3. **Sync-only** arguments in place of nonsynchrony / full transverse dynamics.
4. **Continuum / PDE claims** from finite-ring numerics.
5. **Replacing accepted headers** (ZeroPruned / V5 / Cellwise baselines) **without** full admission (especially AZero prototypes).
6. Inferring a **full 64 return budget** from a one-step pilot.
7. Resuming or appending to **interrupted** run directories as checkpoints.
8. Treating a **partial tube set**, success Boolean, or positive metric alone as a theorem.

---

## 4. Recommended next experiment (finite, uniquely tagged, small-budget)

### Choice

**Highest expected speedup that can still be admitted today:**

> **N=32 C1 box, radius 3e-10, order 20, admitted ZeroPruned supplier, FIXED step h=1/4, uniquely tagged small-budget speed pilot** — measure wall vs the measured adaptive ~0.121 ms baseline, with **strict remainder inclusion** (fail-closed).

Rationale: among options that do **not** require new supplier admission, increasing h above the adaptive plateau is the only lever with **~2×** tube-count upside. h=1/8 is nearly redundant with the observed adaptive plateau. A-zero would likely beat this **after** C1–C6, but is **not** admit-able now. Order reduction is not proven safe. Linux is not ready. Parallel tubes are usually invalid.

### Pilot specification

| Field | Value |
| --- | --- |
| **Tag** | `box20-zero-pruned-fixed-quarter-radius3e10-speed-pilot-grok-20260930-v1` |
| Sites / mode | 32 / box |
| Radius | 3e-10 |
| Order | 20 |
| Supplier | ZeroPrunedSparseMap + ZeroPrunedCellwiseRingMap (accepted hashes; **no AZero**) |
| Step policy | **fixed `0.25` (1/4 ms)** |
| Directions / guards | **All 576 physical coordinates; full whole-tube guards (4384/tube expected)** |
| Remainder | **Strict inclusion retained**; any remainder/domain failure ⇒ abort, record receipt, do **not** widen radius / drop dirs / lower order |
| Budget (proposed) | **wall 3600 s**, RSS **2048 MiB** (same class as C1 launch caps; small vs ~37 h full period) |
| Stop condition | Reach physical time **≥ ~1.0 ms** **or** wall/RSS budget **or** failure — whichever first |
| Controls to retain | `domainChecksPassed`, guard count, coord count, step/time endpoints, binary/INPUTS/supplier audit SHAs, fail receipts |
| Baseline compare | Measured adaptive tag tubes (≈258 s/tube @ h≈0.121); report speedup = (baseline_s_per_ms) / (pilot_s_per_ms) on the overlapping early window |
| Launch gate | **Coordinator approval**; do **not** start if another heavy Mac CAPD / H64 product job is live |
| Isolation | New immutable attempt dir only; never overwrite paused/interrupted tags |

### If fixed-quarter fails closed

Fallback calibration (still admit-able, low speedup): fixed **h=1/8** tag `…-fixed-eighth-…-speed-pilot-…` under the same caps — confirms fixed-step overhead vs adaptive near the plateau; then stop and reassess (do not silently jump to A-zero or order cuts).

### Explicitly deferred (higher upside, not admit-able yet)

- A-zero controls C1–C6 + source audit, then a **separate** tiny N / linear harness benchmark (not production header swap).
- Linux fresh CAPD after immutable bundle + toolchain install.
- 64 fixed-eighth one-step **retry** under admitted 2400s/4GiB — separate lane after Mac C1 lane policy allows; does not by itself fix N=32 ~37 h.

---

## 5. Success metric

Must report **both**:

1. **Wall time to reach ≈1 ms** physical time (pilot primary), with tube count and s/tube.
2. **Extrapolated wall to full period ≈53.6 ms** using measured pilot s/tube × expected tube count at that h (label clearly as **extrapolation**, not a run receipt).

**Hard requirements (else metric invalid):**

- Retain **all directions** (576) and **whole-tube guards**.
- Remainder inclusion remains strict (no dropped remainder calls).
- Same admitted ZeroPruned C1 order20 supplier (no header replacement).
- Unique tag + full RUN-REPORT / TUBES / input SHAs.
- No theorem / existence / stability claim from the pilot alone.

**Pass (speed):** pilot s/ms **materially better** than adaptive baseline on the early window (target: **≳1.5×** toward ~2× from h: 0.121→0.25), with all guards/dirs intact.

**Fail-closed (still valuable):** remainder/domain failure or no speedup — keep adaptive C1 as the production path; record failure; do not weaken gates.

---

## 6. Non-actions for this design turn

- Did not modify production / accepted headers.
- Did not start CAPD native, H64 products, A-zero compile, or a second heavy Mac job.
- Did not resume interrupted directories.
- No Claude involvement.
