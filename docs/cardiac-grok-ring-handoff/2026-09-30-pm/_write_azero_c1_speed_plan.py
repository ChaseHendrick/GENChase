#!/usr/bin/env python3
import hashlib, json, time
from pathlib import Path

PM = Path("<workspace>/outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm")
PREF = Path("<workspace>/work/cardiac-study/tissue-scalability-preflight")
HANDOFF = PM.parent / "GROK-HANDOFF.md"
BINDINGS = PM.parent / "HANDOFF-BINDINGS.json"
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
NOW_ET = time.strftime("%Y-%m-%d %H:%M:%S ET")
NOW_UTC = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

refs_sha = {}
for name in [
    "AZERO-ADMISSION-PLAN-v1.md", "AZERO-CONTROLS-RUN-20260930.json",
    "AZERO-CONTROLS-RUN-20260930-v2.json", "ROLE-07-azero-controls-REVIEW.json",
    "SPEED-DESIGN-v1.md", "SPEED-DESIGN-v1.json", "CLEANUP-DUAL-PGID.json",
    "box20-zero-pruned-adaptive-radius3e10-grok-20260930-v1-STOPPED.json",
]:
    p = PM / name
    if p.exists():
        refs_sha[name] = sha(p)
refs_sha["GROK-HANDOFF.md"] = sha(HANDOFF)
refs_sha["HANDOFF-BINDINGS.json"] = sha(BINDINGS)
refs_sha["A-ZERO-PROPOSAL-V1.json"] = sha(PREF / "A-ZERO-PROPOSAL-V1.json")
for h in [
    "AZeroPrunedCellwiseRingMap.hpp", "AZeroPrunedSparseMap.hpp",
    "ZeroPrunedCellwiseRingMap.hpp", "ZeroPrunedSparseMap.hpp",
    "ring_flow_zero_pruned.cpp",
]:
    refs_sha[h] = sha(PREF / h)

az_cell = refs_sha["AZeroPrunedCellwiseRingMap.hpp"]
az_sp = refs_sha["AZeroPrunedSparseMap.hpp"]
zp_sp = refs_sha["ZeroPrunedSparseMap.hpp"]

md_lines = []
A = md_lines.append
A("# AZERO-C1-SPEED-ADMISSION-PLAN-v1 — Grok-only")
A("")
A("**Status:** DESIGN ONLY. Next action = **await user go**. Do **not** start a 32 C1, A-zero native pilot, or production header swap from this document alone.")
A(f"**Written:** {NOW_ET}")
A("**Agent:** Grok-only executor")
A("**MachineId:** `<redacted>`")
A("**PM dir:** `outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm/`")
A("")
A("Companion: `AZERO-C1-SPEED-ADMISSION-PLAN-v1.json` (same directory).")
A("")
A("---")
A("")
A("## 0. Goal")
A("")
A("Obtain a **rigorous 32-site (then 64) C¹ orbital-return path** that is **materially faster** than the measured adaptive ZeroPruned plateau (~**h≈0.121 ms ≈ 1/8**, ~**4.3–5 min/tube**, ~**31–37 h** extrapolated full period T≈53.6 ms), **without weakening** directions, guards, remainder inclusion, radius, or order gates.")
A("")
A("A-zero (exact-zero **variation** skip: omit `J·A` only when complete outward `A=[0,0]` and both `J` endpoints finite) is the candidate **per-tube** speed lever after controls C1–C6 passed. It is **not** yet proof-admitted for `ring_flow` / C¹ tubes.")
A("")
A("---")
A("")
A("## 1. Current A-zero status (do not invent)")
A("")
A("| Item | Status |")
A("| --- | --- |")
A("| Controls tag | `20260930-v3` (C1 retained `20260930-v2`) |")
A("| C1–C5 | **PASS** |")
A("| C6 independent review | **ACCEPT** |")
A("| ROLE-07 | **accept** / `CONTROLS_PASS_BUT_NOT_ADMITTED_FOR_PROOF` |")
A("| Production ZeroPruned / Cellwise headers | **Unchanged** (live sha match pins) |")
A("| `A-ZERO-PROPOSAL-V1.json` flags | Still `coefficientControlsPassed=false`, `sourceAuditPassed=false`, `status=unexecuted prototype; not admitted` (stale vs C5/C6 artifacts — reconcile under G1; do not silently flip proof flags) |")
A("| Proof reliance / theorems | **Forbidden** |")
A("| C2 lesson | Prior FAIL was **harness batch vs sparse**, not A-zero skip; equality retained via **Cellwise-sparse vs AZero-sparse** |")
A("")
A("Pinned prototype hashes (live):")
A("")
A(f"- `AZeroPrunedCellwiseRingMap.hpp` `{az_cell}`")
A(f"- `AZeroPrunedSparseMap.hpp` `{az_sp}`")
A(f"- Production `ZeroPrunedSparseMap.hpp` `{zp_sp}` (must not be replaced until **G8**)")
A("")
A("---")
A("")
A("## 2. Cost baseline (ZeroPruned adaptive C1)")
A("")
A("From `SPEED-DESIGN-v1` + interrupted tag `box20-zero-pruned-adaptive-radius3e10-grok-20260930-v1` (7 tubes, stopped for H64 pivot; dir preserved):")
A("")
A("| Quantity | Value |")
A("| --- | --- |")
A("| N / mode / radius / order | 32 / box / 3e-10 / 20 |")
A("| Supplier | ZeroPrunedSparseMap (accepted audit) |")
A("| Plateau h | ≈0.12109375 ms (`0x1.fp-4`) after first cut-in |")
A("| Observed | ≈258 s/tube (4.30 min/tube); planning **≈5 min/tube** |")
A("| Coords / guards | 576 / 4384 per tube |")
A("| Tubes / period | T/h ≈ 53.588/0.121 ≈ **~440** |")
A("| Extrapolated full period | **~31.7 h** (obs) … **~36.7 h** (5 min/tube) |")
A("| A-zero per-tube speedup | **unknown** until timed sparse-path bench (G5/P0) |")
A("")
A("A-zero does **not** change tube count by itself (unless later combined with a separately admitted larger fixed h). Upside is **s/tube** via fewer exact-zero-A products on the sparse path that `*SparseMap` selects for OdeSolver.")
A("")
A("---")
A("")
A("## 3. Gap list: CONTROLS_PASS → proof-usable C¹ speed path")
A("")
A("| # | Gap | Why it blocks | Closure artifact |")
A("| ---: | --- | --- | --- |")
A("| 1 | **No `ring_flow` wiring** | Only `ring_flow_zero_pruned.cpp` / `sparse` / `cellwise` exist. **Zero** `AZero` includes in `ring_flow*`. | Isolated `ring_flow_azero.cpp` (`AZeroPrunedSparseMap`) + build/run scripts **parallel to** ZeroPruned — never overwrite ZeroPruned |")
A("| 2 | **No AZero build/launch runner** | `build_large_zero_pruned_flow.py` / `run_large_zero_pruned_flow.py` hard-copy and **assert** ZeroPruned header SHAs + ZeroPruned audit schema | `build_large_azero_flow.py` + `run_large_azero_flow.py` with AZero audit schema and pin asserts |")
A("| 3 | **No AZero supplier source audit** | ZeroPruned has `tissue-proof-review/zero-pruned-supplier-review-v1/SUPPLIER-SOURCE-AUDIT.json`. AZero has only admission C6 + proposal | `tissue-proof-review/azero-supplier-review-v1/SUPPLIER-SOURCE-AUDIT.json` |")
A("| 4 | **Sparse-path consistency (C2 lesson)** | C5-step/C4 harnesses used OdeSolver on **non-Sparse** Cellwise/AZero Cellwise (batch). Production flow uses `*SparseMap` → sparse override where A-zero skip lives. Batch C5 does **not** exercise the skip in flow. | G4: N=3 C¹ **sparse** tube/coeff equivalence AZeroSparse vs ZeroPrunedSparse |")
A("| 5 | **Proposal flag ledger** | Proposal JSON still denies coefficient/source flags despite C5/C6 artifacts | G1: reconcile from artifacts only; keep proof/spatial false until G8+ |")
A("| 6 | **No measured speed evidence** | Unknown whether skip rate beats ~5 min/tube | G5 micro-bench then G6 N=32 pilot |")
A("| 7 | **V5 / checker supplier scope** | V5 admits ZeroPruned order20 box C1; AZero is a new supplier class | Separate adapter review; do not silently widen V5 |")
A("| 8 | **RSS/wall / dual-PGID ops** | Native `ring_flow` uses `start_new_session` ⇒ separate PGID from supervisor | Every heavy launch documents dual PGID; kill **native first** |")
A("| 9 | **Full return ≠ speed pilot** | Fast early window does not certify existence/period/stability | G9+ only after G8; handoff residual/K/H gates remain |")
A("")
A("---")
A("")
A("## 4. Ordered gates G0…G9 (stop-on-fail)")
A("")
A("**Policy:** fail-closed; unique tags; Grok-only; **one heavy native at a time**; no Claude; no continuum/PDE; no 32/64 theorem claims from pilots.")
A("")
A("### G0 — Design accept / authorization")
A("- **Pass:** User/coordinator explicitly authorizes next executable gate (default: **await user go**).")
A("- **Fail:** Any native start without go.")
A("- **Artifacts:** this plan md/json sha in launch receipt.")
A("")
A("### G1 — Ledger reconcile (no proof flip)")
A("- **Pass:** Update `A-ZERO-PROPOSAL-V1.json` **control flags** from C5/C6 artifact SHAs only; retain `admitted_for_proof=false`, `largePilotLaunched=false`, `spatialExistenceCertified=false`, `spatialStabilityCertified=false`, `existingSourcesModified=false`.")
A("- **Fail:** Setting proof/spatial true; editing ZeroPruned headers.")
A("- **Review:** ROLE-07 spot-check flags vs artifacts.")
A("")
A("### G2 — Isolated AZero flow TU (compile-only OK)")
A("- **Pass:** `ring_flow_azero.cpp` = copy of `ring_flow_zero_pruned.cpp` with `AZeroPrunedSparseMap` only; `build_large_azero_flow.py` freezes pins into `runs/<tag>/` and compiles; **does not** modify ZeroPruned runner/headers.")
A("- **Fail:** In-place production edit; compile error; missing AZero pin assert.")
A("- **Sparse lesson:** Map type **must** be `AZeroPrunedSparseMap` (sparse override), never bare `AZeroPrunedCellwiseRingMap` for flow.")
A("- **Artifacts:** `runs/azero-large-return-build-n32-v1/RESULT.json`, binary sha, BUILD.log.")
A("")
A("### G3 — AZero supplier source audit")
A("- **Pass:** Independent audit: declared diff only (rename + cmath + exact-zero-A skip in sparse); full columns/states/dense A0/remainders; pins match; C1–C6 linked; `accepted=true` for **isolated runner use only**; still `admitted_for_proof=false` for theorems.")
A("- **Fail:** Undeclared diff; pin mismatch; accept without C1–C5; rubber-stamp.")
A("- **Artifacts:** `tissue-proof-review/azero-supplier-review-v1/SUPPLIER-SOURCE-AUDIT.json`.")
A("- **Review:** ROLE-07 (not sole implementer stamp).")
A("")
A("### G4 — Sparse-path C¹ equivalence (N=3 fixture)")
A("- **Pass:** Coeff **and** OdeSolver tube compare **AZeroPrunedSparseMap vs ZeroPrunedSparseMap** on identical N=3 seeds; hexfloat equality **or** fail-closed mutual inclusion with equal width; remainder checks; all columns; dense-A0 included; nonfinite-J never-omits retained.")
A("- **Fail:** Missing column; batch-path-only compare; weakened equality without ROLE-07 exception (default: keep hexfloat on coeff).")
A("- **Artifacts:** `a-zero-admission-grok/g4-sparse-c1-equivalence-grok/<tag>/results/*`.")
A("- **Wall/RSS:** ≲ few–15 min / <1 GiB (mark measured).")
A("")
A("### G5 — Micro speed bench (smallest truthful speed evidence)")
A("- **Pass:** Timed N=3 (or N=8 if N=3 skip density too low) C¹ sparse tubes, identical step policy, AZero vs ZeroPruned; report s/tube (+ optional skip counters); **no theorem**.")
A("- **Fail:** Incomparable configs; batch Cellwise as AZero path.")
A("- **Success metric:** AZero s/tube **materially lower** (planning **≳1.2×**). If **&lt;1.05×** → A-zero not a speed path → **fallback** (§6).")
A("- **Does NOT prove:** N=32/64 return time, existence, stability, header swap.")
A("")
A("### G6 — N=32 C¹ AZero speed pilot (isolated runner; headers untouched)")
A("- **Pass:** Unique tag e.g. `box20-azero-adaptive-radius3e10-speed-pilot-grok-<date>-v1`; radius **3e-10**, order **20**, **all 576 dirs / 4384 guards**, strict remainder; wall **3600 s**, RSS **2048 MiB**; stop at **≥ ~1.0 ms** physical or budget/failure; compare s/ms and s/tube to ZeroPruned adaptive baseline (~258 s/tube).")
A("- **Fail:** Remainder/domain failure; dropped dirs/guards; wrong binary; second concurrent heavy native.")
A("- **Pass (speed):** ≳**1.3×** s/ms vs adaptive ZeroPruned early window with gates intact (planning bar).")
A("- **Does NOT prove:** full-period return, residual inclusion, theorem.")
A("- **Wall/RSS:** ≤1 h by budget; full-period extrapolation labeled **non-certificate**. AZero full-period hours = **unknown** until s/tube measured.")
A("")
A("### G7 — Pilot + supplier joint review")
A("- **Pass:** ROLE-07 accepts G3+G4+G5/G6; sparse-path consistency; no production swap yet.")
A("- **Fail:** Accept without G4; weakened guards.")
A("- **Artifacts:** `ROLE-07-azero-c1-speed-REVIEW.json`.")
A("")
A("### G8 — Named production-admission gate (header / default supplier)")
A("- **Pass:** Explicit user/coordinator go **naming G8**; then either (a) admit parallel `run_large_azero_flow.py` as authorized alternate for new tags, or (b) new immutable AZero flow TU with full re-audit — **never** silently rewrite historical ZeroPruned audits.")
A("- **Fail:** Swap without go.")
A("- **Default until go:** production C¹ path remains ZeroPruned.")
A("")
A("### G9 — Full 32 (then 64) return attempts under admitted AZero path")
A("- **Pass:** Fresh immutable tags; full budgets; handoff workstreams 1–5 still required for theorems.")
A("- **64:** Separate finite budget; one-step pilots do **not** authorize full 64 return.")
A("")
A("---")
A("")
A("## 5. Recommended first executable pilot (after user go)")
A("")
A("**Smallest truthful speed evidence = G5 (P0), not a full 32 C1.**")
A("")
A("| Field | Value |")
A("| --- | --- |")
A("| **Id** | P0 / G5 |")
A("| **Tag pattern** | `azero-n3-c1-sparse-speed-bench-grok-YYYYMMDD-v1` |")
A("| **N / order** | 3 / 20 |")
A("| **Maps** | `AZeroPrunedSparseMap` vs `ZeroPrunedSparseMap` |")
A("| **Mode** | box micro-width + dense-A0 variant; identical seeds |")
A("| **Tubes / wall** | 8–16 tubes or wall ≤300 s |")
A("| **RSS** | ≤512–768 MiB |")
A("| **Metric** | wall s/tube AZero vs ZeroPruned |")
A("| **Proves** | Whether A-zero skip yields material per-tube speed on sparse C¹ path |")
A("| **Does NOT prove** | 32/64 returns, header swap, theorems, continuum |")
A("| **Requires** | G0 + G2 + G4 (G1/G3 strongly preferred before any claim of supplier readiness) |")
A("")
A("**Only if P0 shows material speedup (or user explicitly prioritizes 32 evidence):** G6 P1 N=32 AZero speed pilot under isolated `ring_flow_azero` binary.")
A("")
A("**Next action from this design file:** **await user go** (authorize G1 and/or G2). Do **not** auto-start P0/P1.")
A("")
A("---")
A("")
A("## 6. Fallback (if A-zero gates fail)")
A("")
A("Per `SPEED-DESIGN-v1`, **admit-able today** without A-zero:")
A("")
A("> **N=32 C1 box, radius 3e-10, order 20, ZeroPruned, FIXED h=1/4**, tag `box20-zero-pruned-fixed-quarter-radius3e10-speed-pilot-grok-…`, wall 3600 s / RSS 2048 MiB, stop ≥~1 ms, strict remainder, all dirs/guards.")
A("")
A("Planning ~**2×** fewer tubes vs h≈0.121 if remainder holds. If fixed-quarter fails closed → calibrate fixed h=1/8, then stop. **Do not** silently jump to order cuts, radius widen, or header swap.")
A("")
A("Use when: G4 fails; G5 speedup &lt;~1.05×; G6 remainder-fails; or user prioritizes admit-able lever over A-zero wiring.")
A("")
A("---")
A("")
A("## 7. Explicit non-actions")
A("")
A("1. No production ZeroPruned→AZero **header replacement** until **G8** named go.")
A("2. No claiming 32/64 existence / period / stability / nonsynchrony theorems from speed pilots.")
A("3. No continuum / PDE / sync-only / floating-eigenvalue “proofs”.")
A("4. No Claude; **Grok-only** for this path.")
A("5. **One heavy native** Mac CAPD/`ring_flow` at a time.")
A("6. Dual-PGID cleanup: verify identities → **kill native PGID first** → supervisor → re-ps (`CLEANUP-DUAL-PGID.json`).")
A("7. Never resume/append interrupted dirs (`box20-…-20260930-v1` preserved).")
A("8. Do not compare AZero **batch** to ZeroPruned **sparse** for admission (C2 lesson).")
A("9. Do not lower order20 or drop directions/guards for speed.")
A("10. Do not start P0/P1/G6 from this document without user go.")
A("")
A("---")
A("")
A("## 8. Codebase blockers found (design-time)")
A("")
A("| Blocker | Evidence |")
A("| --- | --- |")
A("| No AZero `ring_flow` TU | `ring_flow_*.cpp` has no `AZero` string |")
A("| Launch scripts pin ZeroPruned | `run_large_zero_pruned_flow.py` asserts ZeroPruned audit + header SHAs |")
A("| Proposal ledger stale | `A-ZERO-PROPOSAL-V1.json` still false control flags despite C5/C6 PASS |")
A("| Sparse vs batch gap in C5-step | OdeSolver used non-Sparse AZero Cellwise (skip inactive) |")
A("| No AZero supplier audit dir | Unlike `zero-pruned-supplier-review-v1` |")
A("| Linux box not ready | `BOX-LINUX-FEASIBILITY.json` — Mac lane only |")
A("| A-zero s/tube unknown | No bench receipt yet |")
A("")
A("Non-blockers: `AZeroPrunedSparseMap` already overrides to sparse (correct for flow); prototypes compile in admission harness; C1–C6 under `a-zero-admission-grok/`.")
A("")
A("---")
A("")
A("## 9. Rough expectations")
A("")
A("| Item | Estimate | Confidence |")
A("| --- | --- | --- |")
A("| G2 compile | ≲3 min | High |")
A("| G4 N=3 sparse equiv | ≲5–15 min wall | Med |")
A("| G5 micro bench | ≲5–15 min | Med |")
A("| G6 N=32 ≤1 ms window | ≤3600 s by cap | High budget / unknown AZero s/tube |")
A("| Full period under AZero | **unknown** until G5/G6 | Unknown |")
A("| ZeroPruned full period baseline | ~31–37 h | Med (early-tube extrapolate) |")
A("")
A("---")
A("")
A("## 10. Sources consulted (sha256)")
A("")
for k in sorted(refs_sha):
    A(f"- `{k}`: `{refs_sha[k]}`")
A("")
A("---")
A("")
A("## 11. Next action")
A("")
A("**await user go** — authorize G1 (ledger) and/or G2 (isolated `ring_flow_azero` build). Default: no native pilot.")
A("")

(PM / "AZERO-C1-SPEED-ADMISSION-PLAN-v1.md").write_text("\n".join(md_lines))

plan = {
  "schema": "azero-c1-speed-admission-plan-v1",
  "agent": "Grok-only",
  "designOnly": True,
  "writtenAtET": NOW_ET,
  "writtenAtUTC": NOW_UTC,
  "machineId": "<redacted>",
  "pmDir": "outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm/",
  "noClaude": True,
  "noProductionHeaderModification": True,
  "noFull32C1Started": True,
  "noPilotStarted": True,
  "nextAction": "await_user_go",
  "goal": "Rigorous 32-then-64 C1 orbital-return path materially faster than ZeroPruned adaptive ~h=1/8 plateau (~31-37h extrapolated), without weakening gates; A-zero as per-tube lever after controls pass.",
  "azeroStatus": {
    "controlsTag": "20260930-v3",
    "C1_to_C5": "PASS",
    "C6": "ACCEPT",
    "ROLE07": "accept",
    "verdict": "CONTROLS_PASS_BUT_NOT_ADMITTED_FOR_PROOF",
    "admitted_for_proof": False,
    "productionHeadersUnchanged": True,
    "c2RootCause": "harness Cellwise-batch vs AZero-sparse; not A-zero skip bug",
    "proposalFlagsStillFalseInFile": True
  },
  "costBaseline": {
    "tag": "box20-zero-pruned-adaptive-radius3e10-grok-20260930-v1",
    "sites": 32, "radius": "3e-10", "order": 20,
    "plateau_h_ms": 0.12109375,
    "s_per_tube_observed": 258.2,
    "s_per_tube_planning": 300,
    "tubes_per_period_approx": 440,
    "full_period_hours_obs_to_plan": [31.7, 36.7],
    "period_T_ms": 53.588,
    "coords": 576, "guards_per_tube": 4384
  },
  "gaps": [
    {"id": 1, "name": "no_ring_flow_azero"},
    {"id": 2, "name": "no_azero_build_launch_runner"},
    {"id": 3, "name": "no_azero_supplier_source_audit"},
    {"id": 4, "name": "sparse_path_consistency"},
    {"id": 5, "name": "proposal_ledger_stale"},
    {"id": 6, "name": "no_speed_measurement"},
    {"id": 7, "name": "V5_supplier_scope"},
    {"id": 8, "name": "dual_pgid_ops"},
    {"id": 9, "name": "pilot_neq_theorem"}
  ],
  "gates": [
    {"id": "G0", "name": "design_accept_await_go", "stopOnFail": True},
    {"id": "G1", "name": "ledger_reconcile", "review": "ROLE-07", "stopOnFail": True},
    {"id": "G2", "name": "isolated_ring_flow_azero_build", "mapTypeRequired": "AZeroPrunedSparseMap", "stopOnFail": True},
    {"id": "G3", "name": "azero_supplier_source_audit", "review": "ROLE-07", "stopOnFail": True},
    {"id": "G4", "name": "sparse_c1_equivalence_n3", "review": "ROLE-07", "stopOnFail": True},
    {"id": "G5", "name": "micro_speed_bench", "review": "ROLE-07", "stopOnFail": True},
    {"id": "G6", "name": "n32_azero_speed_pilot", "review": "ROLE-07", "stopOnFail": True,
     "doesNotProve": ["full_period", "existence", "stability", "header_swap"]},
    {"id": "G7", "name": "joint_pilot_supplier_review", "stopOnFail": True},
    {"id": "G8", "name": "named_production_admission", "stopOnFail": True, "defaultUntilGo": "production remains ZeroPruned"},
    {"id": "G9", "name": "full_32_then_64_returns", "stopOnFail": True}
  ],
  "recommendedFirstPilot": {
    "id": "P0", "gate": "G5",
    "tagPattern": "azero-n3-c1-sparse-speed-bench-grok-YYYYMMDD-v1",
    "sites": 3, "order": 20,
    "maps": ["AZeroPrunedSparseMap", "ZeroPrunedSparseMap"],
    "tubesOrWall": "8-16 tubes or wall<=300s",
    "rssCapMiB": 768,
    "successMetric": "AZero s/tube materially lower than ZeroPruned (planning >=1.2x)",
    "doesNotProve": ["n32_return", "n64_return", "header_swap", "theorems", "continuum"],
    "requiresPriorGates": ["G0", "G2", "G4"]
  },
  "recommendedSecondPilot": {
    "id": "P1", "gate": "G6",
    "tagPattern": "box20-azero-adaptive-radius3e10-speed-pilot-grok-YYYYMMDD-v1",
    "sites": 32, "mode": "box", "radius": "3e-10", "order": 20,
    "supplierBinary": "ring_flow_azero / AZeroPrunedSparseMap",
    "wall_s": 3600, "rss_mib": 2048, "stopPhysicalTimeMs": 1.0,
    "retainDirs": 576, "retainGuardsPerTube": 4384,
    "baselineCompare": "ZeroPruned adaptive ~258 s/tube early window",
    "requires": "P0 material speedup OR explicit user prioritize-32"
  },
  "fallback": {
    "source": "SPEED-DESIGN-v1",
    "description": "N=32 ZeroPruned fixed h=1/4 radius 3e-10 order20 speed pilot",
    "tagPattern": "box20-zero-pruned-fixed-quarter-radius3e10-speed-pilot-grok-YYYYMMDD-v1",
    "when": ["G4 fail", "G5 speedup <~1.05x", "G6 remainder fail", "user prefers admit-able lever"]
  },
  "nonActions": [
    "no production ZeroPruned->AZero header replacement until G8",
    "no 32/64 theorem claims from pilots",
    "no continuum/PDE/sync-only/eigenvalue proofs",
    "no Claude",
    "one heavy native at a time",
    "dual PGID: kill native first",
    "never resume interrupted dirs",
    "no batch-vs-sparse admission compares",
    "no order/direction drop for speed",
    "do not start pilot without user go"
  ],
  "codebaseBlockers": [
    {"id": "no_ring_flow_azero", "severity": "high"},
    {"id": "run_large_zero_pruned_asserts_zp_pins", "severity": "high"},
    {"id": "proposal_flags_stale", "severity": "medium"},
    {"id": "no_azero_supplier_audit_dir", "severity": "high"},
    {"id": "c5_step_used_batch_map", "severity": "high"},
    {"id": "azero_s_per_tube_unknown", "severity": "medium"},
    {"id": "linux_box_not_ready", "severity": "low"}
  ],
  "wallRssExpectations": {
    "G2_compile_min": "<=3",
    "G4_G5_min": "5-15 (mark measured)",
    "G6_cap_s": 3600,
    "G6_rss_mib": 2048,
    "full_period_azero_h": "unknown until G5/G6",
    "full_period_zeropruned_h": [31.7, 36.7]
  },
  "sourcesConsultedSha256": refs_sha,
  "roleReviewContractPath": "ROLE-AZERO-C1-SPEED-REVIEW-CONTRACT.json"
}
(PM / "AZERO-C1-SPEED-ADMISSION-PLAN-v1.json").write_text(json.dumps(plan, indent=2) + "\n")

role = {
  "schema": "azero-c1-speed-review-contract-v1",
  "roleId": "ROLE-AZERO-C1-SPEED-REVIEW",
  "aliases": ["ROLE-07-extension", "independent_reviewer"],
  "writtenAtET": NOW_ET,
  "machineId": "<redacted>",
  "notImplementer": True,
  "scope": "Independent review of A-zero C1 speed admission gates G3–G7; must not rubber-stamp implementer; must not authorize G8 header swap without explicit user go naming G8",
  "mustVerify": [
    "live sha256 of AZeroPruned* and ZeroPruned* match pins",
    "source diff is rename/cmath/exact-zero-A skip only",
    "flow TU uses AZeroPrunedSparseMap (sparse override), not batch Cellwise",
    "C2 lesson: no batch-vs-sparse false FAIL or false PASS",
    "G4 equivalence artifacts before G6 speed claims",
    "G5/G6 retain 576 dirs and whole-tube guards on N=32",
    "remainder fail-closed",
    "dual-PGID cleanup order documented on any heavy launch",
    "admitted_for_proof remains false until full handoff theorem package",
    "production ZeroPruned headers untouched unless G8 go"
  ],
  "acceptOnlyIf": ["checklist all passed", "stop-on-fail honored", "no undeclared source edits"],
  "rejectIf": ["header swap without G8", "theorem claim from pilot", "weakened hexfloat without documented exception", "concurrent second heavy native ignored"],
  "outputs": ["ROLE-07-azero-c1-speed-REVIEW.json or ROLE-AZERO-C1-SPEED-REVIEW.json under PM"],
  "planRef": "AZERO-C1-SPEED-ADMISSION-PLAN-v1.md"
}
(PM / "ROLE-AZERO-C1-SPEED-REVIEW-CONTRACT.json").write_text(json.dumps(role, indent=2) + "\n")

out = {
  "md": str(PM / "AZERO-C1-SPEED-ADMISSION-PLAN-v1.md"),
  "md_sha256": sha(PM / "AZERO-C1-SPEED-ADMISSION-PLAN-v1.md"),
  "md_bytes": (PM / "AZERO-C1-SPEED-ADMISSION-PLAN-v1.md").stat().st_size,
  "json": str(PM / "AZERO-C1-SPEED-ADMISSION-PLAN-v1.json"),
  "json_sha256": sha(PM / "AZERO-C1-SPEED-ADMISSION-PLAN-v1.json"),
  "json_bytes": (PM / "AZERO-C1-SPEED-ADMISSION-PLAN-v1.json").stat().st_size,
  "role_contract": str(PM / "ROLE-AZERO-C1-SPEED-REVIEW-CONTRACT.json"),
  "role_contract_sha256": sha(PM / "ROLE-AZERO-C1-SPEED-REVIEW-CONTRACT.json"),
  "nextAction": "await_user_go",
}
print(json.dumps(out, indent=2))
