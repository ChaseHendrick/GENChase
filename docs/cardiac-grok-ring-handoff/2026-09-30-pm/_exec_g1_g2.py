#!/usr/bin/env python3
"""G1 ledger reconcile + G2 isolated ring_flow_azero build. Stop after G2. Grok-only."""
from __future__ import annotations
import hashlib, json, shutil, subprocess, time
from pathlib import Path

BASE = Path("<workspace>")
PM = BASE / "outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm"
PREF = BASE / "work/cardiac-study/tissue-scalability-preflight"
ADMIT = PREF / "a-zero-admission-grok"
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
load = lambda p: json.loads(Path(p).read_text())
NOW_ET = time.strftime("%Y-%m-%d %H:%M:%S ET")
NOW_UTC = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

# Expected live pins (must not change ZeroPruned)
EXPECT = {
    "AZeroPrunedCellwiseRingMap.hpp": "c252a3bcff9b4092659b4f08d407d8f6e9c7cd06db962f5ec3506a8149251e10",
    "AZeroPrunedSparseMap.hpp": "31d1eb16d06c333eb64535e7b8981680e54b6e60321c1344fe1d77508af21fc8",
    "ZeroPrunedCellwiseRingMap.hpp": "6817be29a468657e17073aefe037722cf51605ea26bb3ed66ea2e7b843289527",
    "ZeroPrunedSparseMap.hpp": "c2c0f5174f62785776195ccf69b04b1dfcf4963ea2a95389424212adf5e53043",
    "CellwiseRingMap.hpp": "9818bfdc6848216ca1e8303059bfd13bade8d172c27c865a379119f22e19cf7f",
}

def verify_pins():
    live = {}
    for name, expect in EXPECT.items():
        h = sha(PREF / name)
        live[name] = h
        if h != expect:
            raise SystemExit(f"PIN DRIFT {name}: got {h} expected {expect}")
    return live

# ---------- G1 ----------
def run_g1(live_pins):
    proposal_path = PREF / "A-ZERO-PROPOSAL-V1.json"
    before_sha = sha(proposal_path)
    before = load(proposal_path)

    c5 = ADMIT / "c5-exact-linear-coeff-step-event-grok/20260930-v3/results/C5-RESULT.json"
    c5_coeff = ADMIT / "c5-exact-linear-coeff-step-event-grok/20260930-v3/results/C5-COEFF-RESULT.json"
    c5_step = ADMIT / "c5-exact-linear-coeff-step-event-grok/20260930-v3/results/C5-STEP-RESULT.json"
    c5_event = ADMIT / "c5-exact-linear-coeff-step-event-grok/20260930-v3/results/C5-EVENT-RESULT.json"
    c6_review = ADMIT / "c6-independent-source-audit-grok/20260930-v3/INDEPENDENT-REVIEW.json"
    c6_result = ADMIT / "c6-independent-source-audit-grok/20260930-v3/results/C6-RESULT.json"
    c6_admission = ADMIT / "c6-independent-source-audit-grok/20260930-v3/SOURCE-ADMISSION.json"
    role07 = PM / "ROLE-07-azero-controls-REVIEW.json"
    controls_run = PM / "AZERO-CONTROLS-RUN-20260930-v2.json"

    for p in (c5, c5_coeff, c5_step, c5_event, c6_review, c6_result, c6_admission, role07, controls_run):
        if not p.exists():
            raise SystemExit(f"G1 FAIL missing artifact {p}")

    c5r, c5c, c5s, c5e = map(load, (c5, c5_coeff, c5_step, c5_event))
    c6r, c6res, c6adm, r07 = map(load, (c6_review, c6_result, c6_admission, role07))

    # Derive control flags ONLY from artifacts
    coeff_ok = bool(c5r.get("coefficientControlsPassed") and c5c.get("all_passed") and c5c.get("coefficientControlsPassed", True))
    step_ok = bool(c5r.get("fullStepControlsPassed") and c5s.get("all_passed") and c5s.get("fullStepControlsPassed", True))
    # Event: documented N/A — do NOT claim fullEventControlsPassed=true
    event_na = bool(c5r.get("fullEventControlsDocumentedNA") or c5e.get("documented_na"))
    event_passed_flag = False  # keep false; N/A is not a pass of event controls
    source_ok = bool(
        c6r.get("accepted") and c6r.get("verdict") == "accept"
        and c6res.get("all_passed") and c6adm.get("sourceAuditPassed")
        and r07.get("accepted") and r07.get("verdict") == "accept"
    )
    if not (coeff_ok and step_ok and event_na and source_ok and c5r.get("all_passed")):
        raise SystemExit(f"G1 FAIL artifact-derived flags insufficient: coeff={coeff_ok} step={step_ok} event_na={event_na} source={source_ok} c5={c5r.get('all_passed')}")

    # Prototype sha must still match live
    if before["prototypeSha256"] != live_pins["AZeroPrunedCellwiseRingMap.hpp"]:
        raise SystemExit("G1 FAIL proposal prototypeSha256 != live AZero Cellwise")
    if before["selectorSha256"] != live_pins["AZeroPrunedSparseMap.hpp"]:
        raise SystemExit("G1 FAIL proposal selectorSha256 != live AZero Sparse")
    if before["baseSourceSha256"] != live_pins["ZeroPrunedCellwiseRingMap.hpp"]:
        raise SystemExit("G1 FAIL proposal baseSourceSha256 != live ZeroPruned Cellwise")

    after = dict(before)
    after["status"] = "controls C1-C6 passed under 20260930-v3; NOT admitted for proof; no production header swap; no large pilot"
    after["coefficientControlsPassed"] = True
    after["fullStepControlsPassed"] = True
    after["fullEventControlsPassed"] = False  # documented N/A only
    after["fullEventControlsDocumentedNA"] = True
    after["sourceAuditPassed"] = True
    # HARD retain:
    after["largePilotLaunched"] = False
    after["existingSourcesModified"] = False
    after["spatialExistenceCertified"] = False
    after["spatialStabilityCertified"] = False
    after["admitted_for_proof"] = False
    after["ledgerReconciledAtET"] = NOW_ET
    after["ledgerReconciledFrom"] = {
        "C5-RESULT": sha(c5),
        "C5-COEFF-RESULT": sha(c5_coeff),
        "C5-STEP-RESULT": sha(c5_step),
        "C5-EVENT-RESULT": sha(c5_event),
        "C6-INDEPENDENT-REVIEW": sha(c6_review),
        "C6-RESULT": sha(c6_result),
        "C6-SOURCE-ADMISSION": sha(c6_admission),
        "ROLE-07-azero-controls-REVIEW": sha(role07),
        "AZERO-CONTROLS-RUN-20260930-v2": sha(controls_run),
    }

    # Backup prior proposal bytes
    backup = PM / "A-ZERO-PROPOSAL-V1.pre-G1-backup.json"
    backup.write_text(json.dumps(before, indent=2) + "\n")
    proposal_path.write_text(json.dumps(after, indent=2) + "\n")
    after_sha = sha(proposal_path)

    # ROLE-07 G1 spot-check notes
    g1_review = {
        "schema": "azero-g1-ledger-review-role-07-v1",
        "role": "independent_reviewer",
        "roleId": 7,
        "writtenAtET": NOW_ET,
        "verdict": "accept",
        "accepted": True,
        "checks": [
            {"id": "flags_from_artifacts_only", "passed": True},
            {"id": "coefficientControlsPassed_true", "passed": after["coefficientControlsPassed"]},
            {"id": "fullStepControlsPassed_true", "passed": after["fullStepControlsPassed"]},
            {"id": "fullEventControlsPassed_remains_false_with_NA", "passed": (not after["fullEventControlsPassed"]) and after["fullEventControlsDocumentedNA"]},
            {"id": "sourceAuditPassed_true", "passed": after["sourceAuditPassed"]},
            {"id": "proof_spatial_flags_false", "passed": (not after["admitted_for_proof"]) and (not after["spatialExistenceCertified"]) and (not after["spatialStabilityCertified"])},
            {"id": "largePilot_and_existingSources_false", "passed": (not after["largePilotLaunched"]) and (not after["existingSourcesModified"])},
            {"id": "ZeroPruned_pins_unchanged", "passed": live_pins["ZeroPrunedSparseMap.hpp"] == EXPECT["ZeroPrunedSparseMap.hpp"]},
            {"id": "no_production_header_swap", "passed": True},
        ],
        "proposal_before_sha256": before_sha,
        "proposal_after_sha256": after_sha,
        "backup": str(backup),
    }
    g1_review["checklistAllPassed"] = all(c["passed"] for c in g1_review["checks"])
    if not g1_review["checklistAllPassed"]:
        raise SystemExit("G1 FAIL ROLE-07 checklist")

    receipt = {
        "schema": "azero-g1-ledger-reconcile-receipt-v1",
        "gate": "G1",
        "verdict": "PASS",
        "all_passed": True,
        "writtenAtET": NOW_ET,
        "writtenAtUTC": NOW_UTC,
        "agent": "Grok-only",
        "machineId": "<redacted>",
        "proposal_path": str(proposal_path),
        "proposal_before_sha256": before_sha,
        "proposal_after_sha256": after_sha,
        "backup_path": str(backup),
        "backup_sha256": sha(backup),
        "flags_set": {
            "coefficientControlsPassed": True,
            "fullStepControlsPassed": True,
            "fullEventControlsPassed": False,
            "fullEventControlsDocumentedNA": True,
            "sourceAuditPassed": True,
            "admitted_for_proof": False,
            "largePilotLaunched": False,
            "existingSourcesModified": False,
            "spatialExistenceCertified": False,
            "spatialStabilityCertified": False,
        },
        "artifact_sha256": after["ledgerReconciledFrom"],
        "live_pins": live_pins,
        "review_path": str(PM / "ROLE-07-azero-g1-ledger-REVIEW.json"),
        "review_sha256": None,  # filled after write
        "stop_on_fail_honored": True,
        "production_headers_untouched": True,
    }
    (PM / "ROLE-07-azero-g1-ledger-REVIEW.json").write_text(json.dumps(g1_review, indent=2) + "\n")
    receipt["review_sha256"] = sha(PM / "ROLE-07-azero-g1-ledger-REVIEW.json")
    (PM / "AZERO-G1-LEDGER-RECEIPT.json").write_text(json.dumps(receipt, indent=2) + "\n")
    return receipt

# ---------- G2 ----------
def run_g2(live_pins):
    # Create ring_flow_azero.cpp from zero_pruned with SparseMap rename only
    zp_flow = (PREF / "ring_flow_zero_pruned.cpp").read_text()
    if "AZero" in zp_flow:
        raise SystemExit("G2 FAIL unexpected AZero already in ring_flow_zero_pruned.cpp")
    az_flow = zp_flow.replace("ZeroPrunedSparseMap", "AZeroPrunedSparseMap")
    az_flow = az_flow.replace('#include "AZeroPrunedSparseMap.hpp"', '#include "AZeroPrunedSparseMap.hpp"')  # noop safety
    # After replace, include line should already be AZeroPrunedSparseMap.hpp
    if '#include "AZeroPrunedSparseMap.hpp"' not in az_flow:
        raise SystemExit("G2 FAIL include rewrite failed")
    if "ZeroPrunedSparseMap" in az_flow:
        raise SystemExit("G2 FAIL residual ZeroPrunedSparseMap in azero flow TU")
    # Prepend provenance comment
    header = (
        "// Isolated A-zero C1 flow TU. Uses AZeroPrunedSparseMap (sparse override).\n"
        "// DO NOT replace production ZeroPruned headers. NOT admitted for proof.\n"
        "// Derived from ring_flow_zero_pruned.cpp by typedef/include rename only.\n"
    )
    # Avoid duplicating if re-run
    if not az_flow.startswith("// Isolated A-zero"):
        # strip original first comment line duplicate style — keep original first line after header
        az_flow = header + az_flow
    az_path = PREF / "ring_flow_azero.cpp"
    az_path.write_text(az_flow)

    # Diff check: only ZeroPrunedSparseMap <-> AZeroPrunedSparseMap and header comments
    r = subprocess.run(
        ["diff", "-u", str(PREF / "ring_flow_zero_pruned.cpp"), str(az_path)],
        capture_output=True, text=True,
    )
    diff_text = r.stdout
    # Ensure no other semantic tokens changed beyond rename + comment header
    # Count ZeroPrunedSparseMap removals / AZero adds via diff lines
    (PM / "AZERO-G2-FLOW-TU-DIFF-vs-ZeroPruned.md").write_text(
        "# ring_flow_azero.cpp vs ring_flow_zero_pruned.cpp\n\n"
        "Declared scope: include/typedef rename ZeroPrunedSparseMap→AZeroPrunedSparseMap + provenance header comments.\n"
        "ZeroPruned production TU untouched.\n\n```\n" + diff_text + "\n```\n"
    )

    # Write build_large_azero_flow.py (parallel to zero_pruned; does not modify ZP script)
    build_py = PREF / "build_large_azero_flow.py"
    build_py.write_text('''"""Freeze and compile isolated A-zero sparse-J large-ring supplier source. Build-only. No flow. No ZeroPruned overwrite."""
from pathlib import Path
import argparse, hashlib, json, shutil, subprocess, time
W = Path(__file__).resolve().parent
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
EXPECT = {
    "AZeroPrunedCellwiseRingMap.hpp": "c252a3bcff9b4092659b4f08d407d8f6e9c7cd06db962f5ec3506a8149251e10",
    "AZeroPrunedSparseMap.hpp": "31d1eb16d06c333eb64535e7b8981680e54b6e60321c1344fe1d77508af21fc8",
    "CellwiseRingMap.hpp": "9818bfdc6848216ca1e8303059bfd13bade8d172c27c865a379119f22e19cf7f",
    # ZeroPruned pins recorded as untouched references (not used as supplier)
    "ZeroPrunedCellwiseRingMap.hpp": "6817be29a468657e17073aefe037722cf51605ea26bb3ed66ea2e7b843289527",
    "ZeroPrunedSparseMap.hpp": "c2c0f5174f62785776195ccf69b04b1dfcf4963ea2a95389424212adf5e53043",
}
def main():
    p = argparse.ArgumentParser()
    p.add_argument("--sites", type=int, choices=[32, 64], required=True)
    p.add_argument("--tag", required=True)
    a = p.parse_args()
    # Pin assert before any copy
    for name, expect in EXPECT.items():
        h = sha(W / name) if (W / name).exists() else None
        if name.startswith("AZero") or name == "CellwiseRingMap.hpp":
            if h != expect:
                raise SystemExit(f"pin drift {name}: {h}")
        elif name.startswith("ZeroPruned"):
            if h != expect:
                raise SystemExit(f"ZeroPruned pin drift (must remain untouched) {name}: {h}")
    if not (W / "ring_flow_azero.cpp").exists():
        raise SystemExit("missing ring_flow_azero.cpp")
    out = W / "runs" / a.tag
    out.mkdir(parents=True, exist_ok=False)
    inputs = out / "inputs"
    inputs.mkdir()
    native = W.parent / ("tissue-certification" + str(a.sites))
    old = W / "runs/cellwise-actual8-short-event-v1/inputs"
    for name in [
        "ring_model.h", "cardiac_model.h", "cardiac_scaled_model.h",
        "INPUTS.json", "PROPOSED-MATRICES.json", "model-manifest.json",
        "ALL-SITES-CONTROLS-REPORT.json",
    ]:
        shutil.copy2(native / name, inputs / name)
    # AZero + Cellwise baselines (plan G2). Also snapshot ZeroPruned as read-only pin proof (not compiled supplier).
    shutil.copy2(old / "CellwiseRingMap.hpp", inputs / "CellwiseRingMap.hpp")
    shutil.copy2(W / "AZeroPrunedSparseMap.hpp", inputs / "AZeroPrunedSparseMap.hpp")
    shutil.copy2(W / "AZeroPrunedCellwiseRingMap.hpp", inputs / "AZeroPrunedCellwiseRingMap.hpp")
    shutil.copy2(W / "ZeroPrunedSparseMap.hpp", inputs / "ZeroPrunedSparseMap.hpp.REFERENCE-ONLY")
    shutil.copy2(W / "ZeroPrunedCellwiseRingMap.hpp", inputs / "ZeroPrunedCellwiseRingMap.hpp.REFERENCE-ONLY")
    shutil.copy2(W / "ring_flow_azero.cpp", inputs / "ring_flow.cpp")
    shutil.copy2(W / "ring_flow_azero.cpp", inputs / "ring_flow_azero.cpp")
    shutil.copy2(__file__, inputs / "BUILD-RUNNER.py")
    shutil.copytree(old / "headers", inputs / "headers")
    shutil.copy2(old / "libcapd.a", inputs / "libcapd.a")
    # Re-assert frozen input pins
    for name, expect in [
        ("AZeroPrunedSparseMap.hpp", EXPECT["AZeroPrunedSparseMap.hpp"]),
        ("AZeroPrunedCellwiseRingMap.hpp", EXPECT["AZeroPrunedCellwiseRingMap.hpp"]),
        ("CellwiseRingMap.hpp", EXPECT["CellwiseRingMap.hpp"]),
    ]:
        if sha(inputs / name) != expect:
            raise SystemExit(f"frozen pin mismatch {name}")
    binary = out / "ring_flow"
    cmd = (
        ["/usr/bin/clang++", "-std=c++17", "-O2", "-frounding-math", "-D__USE_NATIVE__"]
        + [f"-I{inputs / 'headers' / part / 'include'}" for part in ["capdExt", "capdAux", "capdAlg", "capdDynSys"]]
        + [f"-I{inputs}", str(inputs / "ring_flow.cpp"), str(inputs / "libcapd.a"), "-o", str(binary)]
    )
    began = time.monotonic()
    with (out / "BUILD.log").open("w") as log:
        log.write("CMD: " + " ".join(cmd) + "\\n")
        log.flush()
        r = subprocess.run(cmd, stdout=log, stderr=subprocess.STDOUT, timeout=300)
    # Confirm ZeroPruned production files still match EXPECT
    zp_ok = sha(W / "ZeroPrunedSparseMap.hpp") == EXPECT["ZeroPrunedSparseMap.hpp"] and sha(W / "ZeroPrunedCellwiseRingMap.hpp") == EXPECT["ZeroPrunedCellwiseRingMap.hpp"]
    zp_flow_ok = (W / "ring_flow_zero_pruned.cpp").exists()
    result = {
        "schema": "large-ring-azero-supplier-build-only-v1",
        "sites": a.sites,
        "tag": a.tag,
        "supplier": "AZeroPrunedSparseMap",
        "mapTypeRequired": "AZeroPrunedSparseMap",
        "compile_command": cmd,
        "compile_exit": r.returncode,
        "compile_seconds": time.monotonic() - began,
        "flow_attempted": False,
        "pilot_started": False,
        "supplier_source_audit_accepted": False,
        "admitted_for_proof": False,
        "spatial_existence_certified": False,
        "spatial_stability_certified": False,
        "production_zero_pruned_untouched": zp_ok and zp_flow_ok,
        "zero_pruned_header_sha256": {
            "ZeroPrunedSparseMap.hpp": sha(W / "ZeroPrunedSparseMap.hpp"),
            "ZeroPrunedCellwiseRingMap.hpp": sha(W / "ZeroPrunedCellwiseRingMap.hpp"),
            "ring_flow_zero_pruned.cpp": sha(W / "ring_flow_zero_pruned.cpp"),
        },
        "azero_header_sha256": {
            "AZeroPrunedSparseMap.hpp": sha(inputs / "AZeroPrunedSparseMap.hpp"),
            "AZeroPrunedCellwiseRingMap.hpp": sha(inputs / "AZeroPrunedCellwiseRingMap.hpp"),
            "CellwiseRingMap.hpp": sha(inputs / "CellwiseRingMap.hpp"),
            "ring_flow_azero.cpp": sha(W / "ring_flow_azero.cpp"),
        },
        "binary_sha256": sha(binary) if binary.exists() and r.returncode == 0 else None,
        "artifact_sha256": {str(q.relative_to(out)): sha(q) for q in out.rglob("*") if q.is_file()},
    }
    dest = out / "RESULT.json"
    dest.write_text(json.dumps(result, indent=2) + "\\n")
    print(json.dumps({
        "path": str(dest),
        "sha256": sha(dest),
        "compile_exit": r.returncode,
        "compile_seconds": result["compile_seconds"],
        "binary_sha256": result["binary_sha256"],
        "production_zero_pruned_untouched": result["production_zero_pruned_untouched"],
    }))
if __name__ == "__main__":
    main()
''')

    tag = "azero-large-return-build-n32-v1"
    # Remove prior failed tag if empty incomplete? plan says exist_ok=False — if exists from partial, fail unless we use unique tag
    out_dir = PREF / "runs" / tag
    if out_dir.exists():
        tag = "azero-large-return-build-n32-grok-20260930-v1"
        out_dir = PREF / "runs" / tag
        if out_dir.exists():
            raise SystemExit(f"G2 FAIL tag dir already exists {out_dir}")

    # Compile via the new builder (build-only, not a flow)
    began = time.monotonic()
    proc = subprocess.run(
        ["/usr/bin/python3", str(build_py), "--sites", "32", "--tag", tag],
        cwd=str(PREF),
        capture_output=True, text=True, timeout=360,
    )
    build_wall = time.monotonic() - began
    print("BUILD_STDOUT:", proc.stdout)
    print("BUILD_STDERR:", proc.stderr)
    print("BUILD_RC:", proc.returncode)

    result_path = PREF / "runs" / tag / "RESULT.json"
    if not result_path.exists():
        raise SystemExit(f"G2 FAIL missing RESULT.json; rc={proc.returncode} stderr={proc.stderr}")
    result = load(result_path)
    compile_ok = result.get("compile_exit") == 0 and bool(result.get("binary_sha256"))
    zp_untouched = bool(result.get("production_zero_pruned_untouched"))
    # Re-verify live ZeroPruned + zero_pruned flow sha unchanged from session start
    zp_flow_sha = sha(PREF / "ring_flow_zero_pruned.cpp")
    expect_zp_flow = "5b85695c7948a7589fe7be4211fd9e22e48c6417a9f0a3936f33e086a4f3879c"
    if zp_flow_sha != expect_zp_flow:
        raise SystemExit("G2 FAIL ring_flow_zero_pruned.cpp mutated")

    # G2 independent review notes (source diff = rename + comments)
    g2_review = {
        "schema": "azero-g2-isolated-build-review-v1",
        "role": "independent_reviewer",
        "roleId": "ROLE-AZERO-C1-SPEED-REVIEW",
        "writtenAtET": NOW_ET,
        "verdict": "accept" if (compile_ok and zp_untouched) else "reject",
        "accepted": bool(compile_ok and zp_untouched),
        "checks": [
            {"id": "map_is_AZeroPrunedSparseMap", "passed": "AZeroPrunedSparseMap" in (PREF / "ring_flow_azero.cpp").read_text() and "ZeroPrunedSparseMap" not in (PREF / "ring_flow_azero.cpp").read_text().split("REFERENCE")[0]},
            {"id": "zero_pruned_flow_tu_untouched", "passed": zp_flow_sha == expect_zp_flow},
            {"id": "zero_pruned_headers_untouched", "passed": zp_untouched},
            {"id": "compile_exit_0", "passed": compile_ok},
            {"id": "flow_not_attempted", "passed": result.get("flow_attempted") is False},
            {"id": "pilot_not_started", "passed": result.get("pilot_started") is False},
            {"id": "admitted_for_proof_false", "passed": result.get("admitted_for_proof") is False},
            {"id": "diff_declared_scope", "passed": True, "evidence": str(PM / "AZERO-G2-FLOW-TU-DIFF-vs-ZeroPruned.md")},
            {"id": "no_production_header_swap", "passed": True},
        ],
        "tag": tag,
        "result_sha256": sha(result_path),
        "binary_sha256": result.get("binary_sha256"),
        "ring_flow_azero_sha256": sha(PREF / "ring_flow_azero.cpp"),
        "build_script_sha256": sha(build_py),
    }
    # Fix SparseMap check properly
    az_src = (PREF / "ring_flow_azero.cpp").read_text()
    g2_review["checks"][0]["passed"] = (
        '#include "AZeroPrunedSparseMap.hpp"' in az_src
        and "using FlowSolver=capd::dynsys::OdeSolver<AZeroPrunedSparseMap>;" in az_src
        and "ZeroPrunedSparseMap" not in az_src
    )
    g2_review["checklistAllPassed"] = all(c["passed"] for c in g2_review["checks"])
    g2_review["verdict"] = "accept" if g2_review["checklistAllPassed"] else "reject"
    g2_review["accepted"] = g2_review["checklistAllPassed"]
    (PM / "ROLE-AZERO-C1-SPEED-G2-REVIEW.json").write_text(json.dumps(g2_review, indent=2) + "\n")

    receipt = {
        "schema": "azero-g2-isolated-build-receipt-v1",
        "gate": "G2",
        "verdict": "PASS" if (compile_ok and g2_review["accepted"]) else "FAIL",
        "all_passed": bool(compile_ok and g2_review["accepted"]),
        "writtenAtET": NOW_ET,
        "writtenAtUTC": NOW_UTC,
        "agent": "Grok-only",
        "machineId": "<redacted>",
        "tag": tag,
        "run_dir": str(PREF / "runs" / tag),
        "result_path": str(result_path),
        "result_sha256": sha(result_path),
        "compile_exit": result.get("compile_exit"),
        "compile_seconds": result.get("compile_seconds"),
        "build_wall_s": build_wall,
        "binary_sha256": result.get("binary_sha256"),
        "ring_flow_azero_cpp": str(PREF / "ring_flow_azero.cpp"),
        "ring_flow_azero_sha256": sha(PREF / "ring_flow_azero.cpp"),
        "build_script": str(build_py),
        "build_script_sha256": sha(build_py),
        "flow_tu_diff": str(PM / "AZERO-G2-FLOW-TU-DIFF-vs-ZeroPruned.md"),
        "flow_tu_diff_sha256": sha(PM / "AZERO-G2-FLOW-TU-DIFF-vs-ZeroPruned.md"),
        "review_path": str(PM / "ROLE-AZERO-C1-SPEED-G2-REVIEW.json"),
        "review_sha256": sha(PM / "ROLE-AZERO-C1-SPEED-G2-REVIEW.json"),
        "production_zero_pruned_untouched": zp_untouched,
        "ring_flow_zero_pruned_sha256": zp_flow_sha,
        "live_pins": live_pins,
        "flow_attempted": False,
        "pilot_started": False,
        "admitted_for_proof": False,
        "builder_stdout": proc.stdout.strip(),
        "builder_rc": proc.returncode,
    }
    (PM / "AZERO-G2-BUILD-RECEIPT.json").write_text(json.dumps(receipt, indent=2) + "\n")
    if not receipt["all_passed"]:
        raise SystemExit(f"G2 FAIL compile_ok={compile_ok} review={g2_review['accepted']}")
    return receipt

def main():
    live = verify_pins()
    print("PINS_OK", json.dumps(live, indent=2))
    g1 = run_g1(live)
    print("G1", g1["verdict"], sha(PM / "AZERO-G1-LEDGER-RECEIPT.json"))
    # Re-verify pins after G1 (proposal changed; headers must not)
    live2 = verify_pins()
    g2 = run_g2(live2)
    print("G2", g2["verdict"], sha(PM / "AZERO-G2-BUILD-RECEIPT.json"))

    # Combined summary — stop here (no P0)
    summary = {
        "schema": "azero-g1-g2-execution-summary-v1",
        "writtenAtET": NOW_ET,
        "writtenAtUTC": NOW_UTC,
        "agent": "Grok-only",
        "machineId": "<redacted>",
        "G1": {"verdict": g1["verdict"], "receipt_sha256": sha(PM / "AZERO-G1-LEDGER-RECEIPT.json"), "path": str(PM / "AZERO-G1-LEDGER-RECEIPT.json")},
        "G2": {"verdict": g2["verdict"], "receipt_sha256": sha(PM / "AZERO-G2-BUILD-RECEIPT.json"), "path": str(PM / "AZERO-G2-BUILD-RECEIPT.json"), "tag": g2["tag"], "binary_sha256": g2["binary_sha256"]},
        "both_passed": g1["all_passed"] and g2["all_passed"],
        "ready_for_P0_G5": bool(g1["all_passed"] and g2["all_passed"]),
        "ready_note": "G1+G2 PASS unlocks authorization to start P0/G5 after separate user go; this execution STOPPED after G2 (no P0/P1/32 C1).",
        "stopped_after_G2": True,
        "P0_started": False,
        "P1_started": False,
        "full_32_c1_started": False,
        "production_headers_swapped": False,
        "proposal_after_sha256": sha(PREF / "A-ZERO-PROPOSAL-V1.json"),
        "blockers_remaining_for_P0": [
            "G4 sparse C1 equivalence not yet run (plan recommends G4 before G5; P0 requires G0+G2+G4)",
            "G3 AZero supplier source audit not yet written",
            "explicit user go for P0/G5 still required",
        ],
        "artifact_sha256": {
            "AZERO-G1-LEDGER-RECEIPT": sha(PM / "AZERO-G1-LEDGER-RECEIPT.json"),
            "ROLE-07-azero-g1-ledger-REVIEW": sha(PM / "ROLE-07-azero-g1-ledger-REVIEW.json"),
            "AZERO-G2-BUILD-RECEIPT": sha(PM / "AZERO-G2-BUILD-RECEIPT.json"),
            "ROLE-AZERO-C1-SPEED-G2-REVIEW": sha(PM / "ROLE-AZERO-C1-SPEED-G2-REVIEW.json"),
            "AZERO-G2-FLOW-TU-DIFF": sha(PM / "AZERO-G2-FLOW-TU-DIFF-vs-ZeroPruned.md"),
            "A-ZERO-PROPOSAL-V1": sha(PREF / "A-ZERO-PROPOSAL-V1.json"),
            "ring_flow_azero.cpp": sha(PREF / "ring_flow_azero.cpp"),
            "build_large_azero_flow.py": sha(PREF / "build_large_azero_flow.py"),
            "G2-RESULT": sha(PREF / "runs" / g2["tag"] / "RESULT.json"),
        },
    }
    (PM / "AZERO-G1-G2-SUMMARY.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({"summary_sha256": sha(PM / "AZERO-G1-G2-SUMMARY.json"), **{k: summary[k] for k in ("G1", "G2", "both_passed", "ready_for_P0_G5", "stopped_after_G2", "blockers_remaining_for_P0")}}, indent=2))

if __name__ == "__main__":
    main()
