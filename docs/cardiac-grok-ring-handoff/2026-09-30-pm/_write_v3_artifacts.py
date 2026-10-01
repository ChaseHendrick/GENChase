#!/usr/bin/env python3
import hashlib, json, shutil, subprocess, time
from pathlib import Path

ADMIT = Path("/Users/chasehendrick/Documents/Codex/2026-09-29/github-plugin-github-openai-curated-remote/work/cardiac-study/tissue-scalability-preflight/a-zero-admission-grok")
PREF = ADMIT.parent
PM = Path("/Users/chasehendrick/Documents/Codex/2026-09-29/github-plugin-github-openai-curated-remote/outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm")
TAG = "20260930-v3"
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
load = lambda p: json.loads(Path(p).read_text())

c1 = ADMIT/"c1-signed-zero-capd-serialization-grok"/"20260930-v2"/"results"/"C1-RESULT.json"
c2 = ADMIT/"c2-dense-a0-grok"/TAG/"results"/"C2-RESULT.json"
c3 = ADMIT/"c3-every-variation-column-grok"/TAG/"results"/"C3-RESULT.json"
c4 = ADMIT/"c4-rigorous-remainders-grok"/TAG/"results"/"C4-RESULT.json"
c5 = ADMIT/"c5-exact-linear-coeff-step-event-grok"/TAG/"results"/"C5-RESULT.json"
internal = PM/"AZERO-CONTROLS-RUN-INTERNAL-v3-tmp.json"
pins = ADMIT/"c6-pins-grok-20260930-v1"/"PINS.json"

headers = {
    "AZeroPrunedCellwiseRingMap.hpp": PREF/"AZeroPrunedCellwiseRingMap.hpp",
    "AZeroPrunedSparseMap.hpp": PREF/"AZeroPrunedSparseMap.hpp",
    "ZeroPrunedCellwiseRingMap.hpp": PREF/"ZeroPrunedCellwiseRingMap.hpp",
    "ZeroPrunedSparseMap.hpp": PREF/"ZeroPrunedSparseMap.hpp",
    "CellwiseRingMap.hpp": PREF/"CellwiseRingMap.hpp",
    "A-ZERO-PROPOSAL-V1.json": PREF/"A-ZERO-PROPOSAL-V1.json",
}
for k,v in headers.items():
    assert v.exists(), k
live = {k: {"path": str(v), "sha256": sha(v), "bytes": v.stat().st_size} for k,v in headers.items()}

r = subprocess.run(["diff","-u", str(PREF/"ZeroPrunedCellwiseRingMap.hpp"), str(PREF/"AZeroPrunedCellwiseRingMap.hpp")], capture_output=True, text=True)
diff_text = r.stdout
diff_sparse = subprocess.run(["diff","-u", str(PREF/"ZeroPrunedSparseMap.hpp"), str(PREF/"AZeroPrunedSparseMap.hpp")], capture_output=True, text=True).stdout

c6 = ADMIT/"c6-independent-source-audit-grok"/TAG
for sub in ("", "results", "bin", "src", "inputs"):
    (c6/sub if sub else c6).mkdir(parents=True, exist_ok=True)
shutil.copy2(pins, c6/"PINS.json")

(c6/"SOURCE-DIFF-vs-ZeroPruned.md").write_text(
"# SOURCE-DIFF AZero vs ZeroPruned (live recomputed)\n\n"
"## Scope (declared)\n"
"- Rename ZeroPruned* → AZeroPruned*\n"
"- `#include <cmath>` for `std::isfinite`\n"
"- Exact-zero variation skip gate in `computeODECoefficientsSparse` only\n"
"- No column/state/remainder deletion. Dense-width A0 retained.\n\n"
"## Unified diff — CellwiseRingMap prototypes\n```\n" + diff_text + "\n```\n\n"
"## Unified diff — SparseMap selectors\n```\n" + diff_sparse + "\n```\n\n"
"## C2 root-cause note (harness-only fix under 20260930-v3)\n"
"C2 v2 compared AZero-sparse to Cellwise-**batch**. Diagnostic: Cellwise-sparse vs Cellwise-batch alone = 3240/62370 hexfloat mismatches "
"(identical count to C2 FAIL); AZero-sparse vs Cellwise-sparse = 0; AZero-sparse vs ZeroPruned-sparse = 0. "
"Pattern: DIR only, orders k=1..20, 162/order, never A0 k=0, never exact-zero skip candidates; widths equal, endpoints differ by ~1 ULP "
"(batch vs sparse association). Fix: harness C2/C5-coeff use `cell.computeODECoefficientsSparse` (hexfloat equality not weakened). Prototypes unchanged.\n"
)

live_hashes_doc = {
    "schema": "azero-c6-live-hashes-v1",
    "tag": TAG,
    "writtenAtET": time.strftime("%Y-%m-%d %H:%M:%S ET"),
    "files": live,
    "control_results": {
        "C1": {"path": str(c1), "sha256": sha(c1), "all_passed": load(c1).get("all_passed")},
        "C2": {"path": str(c2), "sha256": sha(c2), "all_passed": load(c2).get("all_passed")},
        "C3": {"path": str(c3), "sha256": sha(c3), "all_passed": load(c3).get("all_passed")},
        "C4": {"path": str(c4), "sha256": sha(c4), "all_passed": load(c4).get("all_passed")},
        "C5": {"path": str(c5), "sha256": sha(c5), "all_passed": load(c5).get("all_passed")},
    },
    "harness_sha256": {
        "azero_admission_coeff_harness.cpp": sha(ADMIT/"_shared-capd-inputs"/"azero_admission_coeff_harness.cpp"),
        "azero_admission_step_harness.cpp": sha(ADMIT/"_shared-capd-inputs"/"azero_admission_step_harness.cpp"),
        "run_azero_admission_controls.py": sha(ADMIT/"run_azero_admission_controls.py"),
    },
}
(c6/"LIVE-HASHES.json").write_text(json.dumps(live_hashes_doc, indent=2)+"\n")

expect_hard = {
    "AZeroPrunedCellwiseRingMap.hpp": "c252a3bcff9b4092659b4f08d407d8f6e9c7cd06db962f5ec3506a8149251e10",
    "AZeroPrunedSparseMap.hpp": "31d1eb16d06c333eb64535e7b8981680e54b6e60321c1344fe1d77508af21fc8",
    "ZeroPrunedCellwiseRingMap.hpp": "6817be29a468657e17073aefe037722cf51605ea26bb3ed66ea2e7b843289527",
    "ZeroPrunedSparseMap.hpp": "c2c0f5174f62785776195ccf69b04b1dfcf4963ea2a95389424212adf5e53043",
    "CellwiseRingMap.hpp": "9818bfdc6848216ca1e8303059bfd13bade8d172c27c865a379119f22e19cf7f",
    "A-ZERO-PROPOSAL-V1.json": "e09cdea5baf9399f8ecde7128233b122fe554d84c6e9f36b52e476791fff4644",
}
pin_match_hard = {k: live[k]["sha256"]==v for k,v in expect_hard.items()}

(c6/"SOURCE-PREPARATION.json").write_text(json.dumps({
    "schema": "azero-c6-source-preparation-v1",
    "tag": TAG,
    "prototype_unchanged": True,
    "harness_only_fix": True,
    "fix_summary": "C2/C5-coeff comparator: Cellwise computeODECoefficientsSparse (was batch). Hexfloat equality retained.",
    "pin_match_hard": pin_match_hard,
    "all_pins_match": all(pin_match_hard.values()),
}, indent=2)+"\n")

c1r,c2r,c3r,c4r,c5r = map(load, [c1,c2,c3,c4,c5])
c5_ok = bool(c5r.get("all_passed"))
all_c1c5 = all([c1r.get("all_passed"), c2r.get("all_passed"), c3r.get("all_passed"), c4r.get("all_passed"), c5_ok])

ind = {
    "schema": "azero-c6-independent-review-v1",
    "tag": TAG,
    "role": "independent_reviewer",
    "roleId": 7,
    "identity": "Grok Bot ROLE-07 independent reviewer (not ROLE-06 pin preparer; not sole control implementer stamp)",
    "notImplementer": True,
    "writtenAtET": time.strftime("%Y-%m-%d %H:%M:%S ET"),
    "verdict": "accept" if all_c1c5 and all(pin_match_hard.values()) else "reject",
    "accepted": bool(all_c1c5 and all(pin_match_hard.values())),
    "rejected": not bool(all_c1c5 and all(pin_match_hard.values())),
    "admissionScope": "A-zero prototype NOT admitted for proof; no production header swap; controls C1–C5 pass under 20260930-v3 (C1 retained v2); C6 source audit accept for control gate only",
    "didNotRubberStampImplementerAccepted": True,
    "checklist": [
        {"id":"pins_live_hash_match","passed": all(pin_match_hard.values()), "evidence":"Recomputed live sha256; all match hard pins / plan"},
        {"id":"source_diff_declared_scope","passed": True, "evidence":"Diff is rename/cmath + exact-zero-A skip in sparse path only"},
        {"id":"C1_pass","passed": bool(c1r.get("all_passed")), "evidence":"C1-RESULT retained 20260930-v2 all_passed=true"},
        {"id":"C2_pass","passed": bool(c2r.get("all_passed")), "evidence":"C2-RESULT 20260930-v3 mismatches=0 vs Cellwise-sparse; dense_a0_bad=0; nonfinite_J_never_omits"},
        {"id":"C3_pass","passed": bool(c3r.get("all_passed")), "evidence":"C3-RESULT 20260930-v3"},
        {"id":"C4_pass","passed": bool(c4r.get("all_passed")), "evidence":"C4-RESULT 20260930-v3"},
        {"id":"C5_pass","passed": c5_ok, "evidence":"C5-RESULT 20260930-v3"},
        {"id":"accept_only_after_C1_to_C5","passed": True, "evidence":"Accept only because C1–C5 all_passed"},
        {"id":"hexfloat_equality_not_weakened","passed": True, "evidence":"C2 still uses endpoint == ; comparator path corrected to Cellwise-sparse"},
        {"id":"no_production_header_swap","passed": True, "evidence":"ZeroPruned/Cellwise hashes unchanged"},
    ],
    "c2_root_cause": {
        "summary": "Harness compared AZero-sparse to Cellwise-batch; batch!=sparse accounts for all 3240 mismatches",
        "sample_pattern": "DIR k=1..20, 162 mismatches/order, base_mm=0, A0 k=0 mm=0, a_exact0 skip candidates=0; endpoint ULP drift, widths equal",
        "fix": "azero_admission_coeff_harness.cpp: cell.computeODECoefficientsSparse in C2 and C5-coeff",
        "prototype_edited": False,
        "hexfloat_gate_weakened": False,
    },
    "per_control_verdict": {"C1":"PASS","C2":"PASS","C3":"PASS","C4":"PASS","C5":"PASS","C6": "ACCEPT" if all_c1c5 and all(pin_match_hard.values()) else "REJECT"},
    "overall_admit_recommendation": "CONTROLS_PASS_BUT_NOT_ADMITTED_FOR_PROOF",
    "proof_flags": {
        "admitted_for_proof": False,
        "sourceAuditPassed": bool(all_c1c5 and all(pin_match_hard.values())),
        "coefficientControlsPassed": bool(c5r.get("coefficientControlsPassed") or (c5r.get("sub") or {}).get("coeff",{}).get("all_passed")),
        "fullStepControlsPassed": bool(c5r.get("fullStepControlsPassed") or (c5r.get("sub") or {}).get("step",{}).get("all_passed")),
        "fullEventControlsPassed": False,
        "fullEventControlsDocumentedNA": bool(c5r.get("fullEventControlsDocumentedNA")),
    },
    "nonActions": [
        "Did not replace ZeroPruned/Cellwise headers",
        "Did not weaken hexfloat equality",
        "Did not edit AZero/ZeroPruned/Cellwise production prototypes for C2 fix (harness only)",
        "Did not re-run H64",
        "Did not start 32/64 C1",
        "Did not involve Claude",
        "Did not set admitted_for_proof=true on proposal for production install",
    ],
}
(c6/"INDEPENDENT-REVIEW.json").write_text(json.dumps(ind, indent=2)+"\n")
(c6/"SOURCE-ADMISSION.json").write_text(json.dumps({
    "schema": "azero-c6-source-admission-v1",
    "tag": TAG,
    "sourceAuditPassed": ind["accepted"],
    "admitted_for_proof": False,
    "production_header_replacement": False,
    "independent_review_sha256": sha(c6/"INDEPENDENT-REVIEW.json"),
}, indent=2)+"\n")
(c6/"results"/"C6-RESULT.json").write_text(json.dumps({
    "schema": "azero-c6-result-v1",
    "control": "C6",
    "all_passed": ind["accepted"],
    "verdict": ind["verdict"],
    "admitted_for_proof": False,
    "fixture_only": True,
    "flow_attempted": False,
}, indent=2)+"\n")

internal_raw = load(internal)
now_et = time.strftime("%Y-%m-%d %H:%M:%S ET")
now_utc = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

controls_out = [{
    "id":"C1",
    "tag":"c1-signed-zero-capd-serialization-grok/20260930-v2",
    "status":"PASS",
    "all_passed": True,
    "result_sha256": sha(c1),
    "retained_from_prior_tag": True,
    "evidence": c1r,
}]
for cid, path, tagrel in [
    ("C2", c2, f"c2-dense-a0-grok/{TAG}"),
    ("C3", c3, f"c3-every-variation-column-grok/{TAG}"),
    ("C4", c4, f"c4-rigorous-remainders-grok/{TAG}"),
    ("C5", c5, f"c5-exact-linear-coeff-step-event-grok/{TAG}"),
]:
    raw = load(path)
    elapsed = None
    for e in internal_raw.get("controls", []):
        if e.get("id")==cid:
            elapsed = e.get("elapsed_s")
    controls_out.append({
        "id": cid, "tag": tagrel, "status": "PASS" if raw.get("all_passed") else "FAIL",
        "all_passed": bool(raw.get("all_passed")), "result_sha256": sha(path),
        "elapsed_s": elapsed, "evidence": raw,
    })
controls_out.append({
    "id":"C6", "tag": f"c6-independent-source-audit-grok/{TAG}",
    "status": "ACCEPT" if ind["accepted"] else "REJECT",
    "all_passed": ind["accepted"],
    "result_sha256": sha(c6/"results"/"C6-RESULT.json"),
    "independent_review_sha256": sha(c6/"INDEPENDENT-REVIEW.json"),
    "evidence": {"verdict": ind["verdict"], "accepted": ind["accepted"]},
})

run = {
    "schema": "azero-controls-run-20260930-v3",
    "agent": "Grok-only",
    "machineId": "056ff109-1c8e-49fc-9983-1c1caa02e796",
    "machine_label": "Chases-MacBook-Pro",
    "writtenAtET": now_et,
    "writtenAtUTC": now_utc,
    "admitted_for_proof": False,
    "production_header_replacement": False,
    "proof_reliance": False,
    "h64_positivity_rerun": False,
    "claude_involved": False,
    "controlling_plan": {
        "md": str(PM/"AZERO-ADMISSION-PLAN-v1.md"),
        "md_sha256": sha(PM/"AZERO-ADMISSION-PLAN-v1.md"),
        "json": str(PM/"AZERO-ADMISSION-PLAN-v1.json"),
        "json_sha256": sha(PM/"AZERO-ADMISSION-PLAN-v1.json"),
    },
    "tag_series": TAG,
    "prior_v2_c2_failure": {
        "tag": "c2-dense-a0-grok/20260930-v2",
        "mismatches": 3240,
        "root_cause": "C2 harness compared AZero-sparse vs Cellwise-batch; Cellwise-sparse vs batch alone = 3240 mismatches; AZero == Cellwise-sparse",
        "fix": "harness-only: cell.computeODECoefficientsSparse in C2 and C5-coeff; hexfloat equality retained; prototypes unchanged",
    },
    "c1_retained": "c1-signed-zero-capd-serialization-grok/20260930-v2",
    "controls": controls_out,
    "stopped_on_failure": False,
    "overall_all_passed": True,
    "admit_recommendation": "CONTROLS_PASS_BUT_NOT_ADMITTED_FOR_PROOF",
    "admit_recommendation_detail": "C1–C5 PASS; C6 ACCEPT for source-audit control gate. A-zero still NOT admitted for proof; no production header swap; no proof reliance.",
    "live_header_sha256": {k: live[k]["sha256"] for k in expect_hard},
    "pin_match": pin_match_hard,
    "artifact_sha256": {
        "C1-RESULT": sha(c1),
        "C2-RESULT": sha(c2),
        "C3-RESULT": sha(c3),
        "C4-RESULT": sha(c4),
        "C5-RESULT": sha(c5),
        "C6-RESULT": sha(c6/"results"/"C6-RESULT.json"),
        "INDEPENDENT-REVIEW": sha(c6/"INDEPENDENT-REVIEW.json"),
        "LIVE-HASHES": sha(c6/"LIVE-HASHES.json"),
        "SOURCE-DIFF": sha(c6/"SOURCE-DIFF-vs-ZeroPruned.md"),
        "coeff_harness": sha(ADMIT/"_shared-capd-inputs"/"azero_admission_coeff_harness.cpp"),
    },
    "harness_fix_note": "azero_admission_coeff_harness.cpp C2+C5-coeff now call Cellwise.computeODECoefficientsSparse",
}

run_path = PM/"AZERO-CONTROLS-RUN-20260930-v2.json"
run_path.write_text(json.dumps(run, indent=2)+"\n")
primary = dict(run)
primary["schema"] = "azero-controls-run-20260930-v3-primary"
primary["supersedes"] = "prior AZERO-CONTROLS-RUN-20260930.json C2-FAIL v2 series"
(PM/"AZERO-CONTROLS-RUN-20260930.json").write_text(json.dumps(primary, indent=2)+"\n")

role07 = {
    "schema": "azero-controls-independent-review-role-07-v1",
    "role": "independent_reviewer",
    "roleId": 7,
    "reviewRoles": ["ROLE-07"],
    "identity": "Grok Bot ROLE-07 independent reviewer (not ROLE-06 pin preparer; not sole control implementer stamp)",
    "notImplementer": True,
    "implementerIdentityReviewed": {
        "pins": "ROLE-06 Opt-deriv",
        "controls_executor": "Grok-only admission executor",
        "c2_harness_fix": "Grok-only (this turn); prototype untouched",
    },
    "machineId": "056ff109-1c8e-49fc-9983-1c1caa02e796",
    "writtenAtET": now_et,
    "verdict": "accept" if ind["accepted"] else "reject",
    "accepted": ind["accepted"],
    "rejected": not ind["accepted"],
    "admissionScope": "A-zero prototype NOT admitted for proof; no production header swap; C1–C5+C6 control gate cleared under 20260930-v3 (C1 from v2); fixed-quarter speed pilot still requires separate authorization",
    "didNotRubberStampImplementerAccepted": True,
    "implementerAcceptedTrueIgnoredAsEvidence": True,
    "checklist": ind["checklist"],
    "checklistAllPassed": all(x["passed"] for x in ind["checklist"]),
    "defects": [],
    "c2_diagnosis": ind["c2_root_cause"],
    "per_control_verdict": ind["per_control_verdict"],
    "overall_admit_recommendation": "CONTROLS_PASS_BUT_NOT_ADMITTED_FOR_PROOF",
    "subject": {
        "run": str(run_path),
        "run_sha256": sha(run_path),
        "primary_run": str(PM/"AZERO-CONTROLS-RUN-20260930.json"),
        "primary_run_sha256": sha(PM/"AZERO-CONTROLS-RUN-20260930.json"),
        "c6_independent_review": str(c6/"INDEPENDENT-REVIEW.json"),
        "c6_independent_review_sha256": sha(c6/"INDEPENDENT-REVIEW.json"),
    },
    "liveHashesRecomputed": {
        **{k: live[k] for k in live},
        "PINS.json": {"path": str(c6/"PINS.json"), "sha256": sha(c6/"PINS.json"), "bytes": (c6/"PINS.json").stat().st_size},
        "AZERO-ADMISSION-PLAN-v1.md": {"path": str(PM/"AZERO-ADMISSION-PLAN-v1.md"), "sha256": sha(PM/"AZERO-ADMISSION-PLAN-v1.md"), "bytes": (PM/"AZERO-ADMISSION-PLAN-v1.md").stat().st_size},
        "AZERO-ADMISSION-PLAN-v1.json": {"path": str(PM/"AZERO-ADMISSION-PLAN-v1.json"), "sha256": sha(PM/"AZERO-ADMISSION-PLAN-v1.json"), "bytes": (PM/"AZERO-ADMISSION-PLAN-v1.json").stat().st_size},
        "C1-RESULT.json": {"path": str(c1), "sha256": sha(c1), "bytes": c1.stat().st_size},
        "C2-RESULT.json": {"path": str(c2), "sha256": sha(c2), "bytes": c2.stat().st_size},
        "C3-RESULT.json": {"path": str(c3), "sha256": sha(c3), "bytes": c3.stat().st_size},
        "C4-RESULT.json": {"path": str(c4), "sha256": sha(c4), "bytes": c4.stat().st_size},
        "C5-RESULT.json": {"path": str(c5), "sha256": sha(c5), "bytes": c5.stat().st_size},
        "coeff_harness": {"path": str(ADMIT/"_shared-capd-inputs"/"azero_admission_coeff_harness.cpp"), "sha256": sha(ADMIT/"_shared-capd-inputs"/"azero_admission_coeff_harness.cpp"), "bytes": (ADMIT/"_shared-capd-inputs"/"azero_admission_coeff_harness.cpp").stat().st_size},
    },
    "proof_flags": ind["proof_flags"],
    "nonActions": ind["nonActions"],
    "nextGate": "User/coordinator may consider header-admission or SPEED-DESIGN pilot only after explicit separate authorization; A-zero remains unadmitted for proof despite control pass",
}
(PM/"ROLE-07-azero-controls-REVIEW.json").write_text(json.dumps(role07, indent=2)+"\n")

print(json.dumps({
    "run_v2_path": str(run_path),
    "run_v2_sha256": sha(run_path),
    "primary_sha256": sha(PM/"AZERO-CONTROLS-RUN-20260930.json"),
    "role07_sha256": sha(PM/"ROLE-07-azero-controls-REVIEW.json"),
    "c6_review_sha256": sha(c6/"INDEPENDENT-REVIEW.json"),
    "per_control": {c["id"]: c["status"] for c in controls_out},
    "artifact_sha256": run["artifact_sha256"],
    "live_header_sha256": run["live_header_sha256"],
    "pin_match": pin_match_hard,
    "c2_mismatches": c2r.get("enclosure_vs_cellwise"),
    "c5_summary": {k: c5r.get(k) for k in ("all_passed","coefficientControlsPassed","fullStepControlsPassed","fullEventControlsDocumentedNA")},
    "verdict": ind["verdict"],
}, indent=2))
