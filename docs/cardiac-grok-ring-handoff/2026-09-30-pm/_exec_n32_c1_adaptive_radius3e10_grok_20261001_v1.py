#!/usr/bin/env python3
"""FRESH N=32 ZeroPruned full-C1 adaptive return @ radius 3e-10, order-20.
Policy A: copy known-good adaptive binary (0945e3b6…); snapshot pre-patch TU
source (5b85695c…) into attempt inputs/. NEVER use FixedQuarter prod TU/binary.
NEVER overwrite/revert live PREF FixedQuarter source. Bypass harness
run_large_zero_pruned_flow.py (it copies live FixedQuarter PREF source).
No 64 full return. No G8/G9/proof admit from this alone. Dual PGID cleanup.
"""
from __future__ import annotations
import hashlib, json, os, shutil, signal, subprocess, sys, time
from pathlib import Path
from datetime import datetime, timezone

BASE = Path("<workspace>")
PM = BASE / "outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm"
PREF = BASE / "work/cardiac-study/tissue-scalability-preflight"
ATTEMPTS = BASE / "outputs/cardiac-study/tissue-ring/ring32-certification/rigorous-attempts"
SRC_BIN = PREF / "runs/zero-pruned-large-return-build-n32-v1/ring_flow"
SRC_BIN_FALLBACK = ATTEMPTS / "box20-zero-pruned-adaptive-radius3e10-grok-20260930-v1" / "ring_flow"
INPUTS_SRC = ATTEMPTS / "box20-zero-pruned-adaptive-radius3e10-grok-20260930-v1" / "inputs"
BACKUP_TU = PM / "backups/ring_flow_zero_pruned.cpp.pre-fixed-quarter-prod-patch-20261001"
AUDIT = BASE / "work/cardiac-study/tissue-proof-review/zero-pruned-supplier-review-v1/SUPPLIER-SOURCE-AUDIT.json"

EXPECTED_BIN = "0945e3b652d175e752286d370a2b2a885c8db93037503c38e78e8632b3ae7ccc"
ADAPTIVE_SRC = "5b85695c7948a7589fe7be4211fd9e22e48c6417a9f0a3936f33e086a4f3879c"
LIVE_FQ_TU = "e9081f2160e17a3661fb8f095c71febb4d44d3cbb9adcec34b1a5b1c1e2da911"
FORBIDDEN_BIN = "abf2d352d4b3a776a6f7a6a0f2b17f44ba0019bb1004357c8cdadc159024643d"

TAG = "box20-zero-pruned-adaptive-radius3e10-grok-20261001-v1"
ATTEMPT = ATTEMPTS / TAG
WALL_S = 10800
NATIVE_BUDGET_S = 10795
RSS_MIB = 2048
STEP = "adaptive"
ORDER = 20
RADIUS = "3e-10"
MACHINE = "<redacted>"

sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()

def et_label():
    return subprocess.check_output(["date", "+%Y-%m-%dT%H:%M:%S%z (ET)"], text=True).strip()

def utc_now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def kill_pgid(pgid, sig=signal.SIGTERM):
    try:
        os.killpg(pgid, sig)
    except ProcessLookupError:
        pass

def proc_alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False

def lane_busy():
    out = subprocess.check_output(["ps", "axo", "pid=,command="], text=True)
    hits = []
    for line in out.splitlines():
        if "/ring_flow " in line or line.rstrip().endswith("/ring_flow"):
            if any(x in line for x in ("Claude", "ChatGPT", "Helper")):
                continue
            hits.append(line.strip())
        # also block if speed campaign supervisor still up
        if "fixed-quarter-prod-speed-campaign" in line or "_exec_fixed_quarter_prod_speed_campaign" in line:
            hits.append(line.strip())
    return hits

def read_tubes(path: Path):
    if not path.exists():
        return []
    rows = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            break
    return rows

def hex_mid(b):
    return 0.5 * (float.fromhex(b["lo"]) + float.fromhex(b["hi"]))

def main():
    pid = os.fork()
    if pid > 0:
        print(json.dumps({"supervisor_child_pid": pid}), flush=True)
        sys.exit(0)
    os.setsid()

    supervisor_pid = os.getpid()
    supervisor_pgid = os.getpgrp()
    started_mono = time.monotonic()
    start_et = et_label()
    start_utc = utc_now()

    # Refuse if live FixedQuarter prod TU was reverted/overwritten
    live = PREF / "ring_flow_zero_pruned.cpp"
    live_sha = sha(live)
    if live_sha != LIVE_FQ_TU:
        raise SystemExit(f"ABORT: live FixedQuarter prod TU drift (must leave untouched): {live_sha}")
    if not BACKUP_TU.exists() or sha(BACKUP_TU) != ADAPTIVE_SRC:
        raise SystemExit(f"ABORT: adaptive backup TU missing/mismatch: {BACKUP_TU}")
    if sha(AUDIT) and True:
        audit = json.loads(AUDIT.read_text())
        if not (audit.get("accepted") is True and audit.get("schema") == "cellwise-map-zero-pruned-supplier-source-audit-v1"):
            raise SystemExit("ABORT: supplier source audit not accepted")

    busy = lane_busy()
    if busy:
        fail = {
            "schema": "n32-c1-launch-v1",
            "status": "FAIL_LANE_BUSY",
            "hits": busy,
            "writtenAtET": et_label(),
            "writtenAtUTC": utc_now(),
            "admitted_for_proof": False,
            "G8": False, "G9": False,
            "prod_fixedquarter_untouched": True,
            "live_fixedquarter_sha": live_sha,
        }
        (PM / "N32-C1-LAUNCH.json").write_text(json.dumps(fail, indent=2) + "\n")
        raise SystemExit(f"ABORT lane busy: {busy}")

    # Preserve prior / interrupted dirs — refuse resume or overwrite of NEW tag
    if ATTEMPT.exists():
        raise SystemExit(f"tag collision / refuse resume: {ATTEMPT}")

    # Never append to prior tags
    for forbid in [
        "box20-zero-pruned-adaptive-radius3e10-grok-20260930-v1",
        "box20-zero-pruned-adaptive-radius3e10-v1",
    ]:
        # just ensure we don't touch them
        p = ATTEMPTS / forbid
        if p.exists():
            pass  # preserve

    ATTEMPT.mkdir(parents=True, exist_ok=False)
    inputs = ATTEMPT / "inputs"
    inputs.mkdir()

    src = SRC_BIN if SRC_BIN.exists() else SRC_BIN_FALLBACK
    if not src.exists():
        raise SystemExit("adaptive binary missing — refuse FixedQuarter rebuild")
    got = sha(src)
    if got != EXPECTED_BIN:
        raise SystemExit(f"FAIL_BINARY_MISMATCH adaptive expected {EXPECTED_BIN} got {got}")
    if got == FORBIDDEN_BIN:
        raise SystemExit("ABORT: refused FixedQuarter prod binary abf2d352…")

    shutil.copy2(src, ATTEMPT / "ring_flow")
    os.chmod(ATTEMPT / "ring_flow", 0o755)
    bin_sha = sha(ATTEMPT / "ring_flow")
    if bin_sha != EXPECTED_BIN:
        raise SystemExit("copied adaptive binary sha mismatch")

    # Snapshot pre-patch adaptive TU source (NOT live FixedQuarter)
    shutil.copy2(BACKUP_TU, inputs / "ring_flow.cpp")
    shutil.copy2(BACKUP_TU, inputs / "ring_flow_zero_pruned.cpp.pre-fixed-quarter-prod-patch-20261001")
    if sha(inputs / "ring_flow.cpp") != ADAPTIVE_SRC:
        raise SystemExit("snapshot adaptive source sha mismatch")

    # Copy supporting inputs from known-good prior adaptive attempt (headers/libcapd/maps)
    copy_names = [
        "ZeroPrunedSparseMap.hpp", "ZeroPrunedCellwiseRingMap.hpp", "CellwiseRingMap.hpp",
        "ALL-SITES-CONTROLS-REPORT.json", "INPUTS.json", "PROPOSED-MATRICES.json",
        "SUPPLIER-SOURCE-AUDIT.json", "cardiac_model.h", "cardiac_scaled_model.h",
        "ring_model.h", "model-manifest.json", "prepare_inputs.py", "refine_seed.py",
        "candidate-inputs.json", "run_inspection.py", "generate_model.py",
        "TP06_18d_endo_bif.m", "libcapd.a", "CAPD-HEADERS.json",
    ]
    for name in copy_names:
        srcp = INPUTS_SRC / name
        if srcp.exists():
            shutil.copy2(srcp, inputs / name)
    if (INPUTS_SRC / "headers").exists():
        shutil.copytree(INPUTS_SRC / "headers", inputs / "headers")
    # Prefer canonical audit path copy as well
    if AUDIT.exists():
        shutil.copy2(AUDIT, inputs / "SUPPLIER-SOURCE-AUDIT.json")

    (inputs / "ADAPTIVE-BIN-SHA256.txt").write_text(EXPECTED_BIN + "\n")
    (inputs / "ADAPTIVE-SOURCE-SHA256.txt").write_text(ADAPTIVE_SRC + "\n")
    (inputs / "LIVE-FIXEDQUARTER-TU-SHA256-LEFT-UNTOUCHED.txt").write_text(LIVE_FQ_TU + "\n")
    (inputs / "SUPPLIER-KIND.txt").write_text(
        "ZeroPrunedSparseMap full-C1 adaptive (pre-FixedQuarter-prod-patch TU sha 5b85695c…); "
        "binary 0945e3b6… from zero-pruned-large-return-build-n32-v1; "
        "live PREF FixedQuarter prod TU e9081f21… LEFT UNTOUCHED; "
        "NOT FixedQuarter; NOT AZero; admitted_for_proof=false; no G8/G9\n"
    )
    (inputs / "BINARY-POLICY.txt").write_text(
        "policy=A copy adaptive binary; bypass harness run_large_zero_pruned_flow.py "
        "because it copies live FixedQuarter PREF/ring_flow_zero_pruned.cpp\n"
    )
    shutil.copy2(__file__, inputs / "SUPERVISOR.py")

    # Confirm live still untouched after our copies
    if sha(live) != LIVE_FQ_TU:
        raise SystemExit("ABORT: live FixedQuarter TU changed during setup")

    tubes_path = ATTEMPT / "TUBES.jsonl"
    raw_path = ATTEMPT / "RAW-FLOW.json"
    flow_log = ATTEMPT / "FLOW.log"
    cmd = [
        str(ATTEMPT / "ring_flow"), "--box", RADIUS, str(tubes_path),
        str(ORDER), str(NATIVE_BUDGET_S), STEP, str(RSS_MIB),
    ]

    start_info = {
        "schema": "n32-c1-launch-v1",
        "gate": "N32-C1-ADAPTIVE-RADIUS3E10",
        "pilot": "zero_pruned_full_c1_adaptive_return",
        "status": "STARTING",
        "supervisor_pid": supervisor_pid,
        "supervisor_pgid": supervisor_pgid,
        "native_cmd": cmd,
        "attempt_dir": str(ATTEMPT),
        "tag": TAG,
        "process_start_et": start_et,
        "process_start_utc": start_utc,
        "writtenAtET": start_et,
        "writtenAtUTC": start_utc,
        "agent": "Grok-only",
        "machineId": MACHINE,
        "supplier": "ZeroPrunedSparseMap",
        "step": STEP,
        "N": 32,
        "order": ORDER,
        "radius": RADIUS,
        "budget_s": NATIVE_BUDGET_S,
        "wall_s": WALL_S,
        "rss_mib": RSS_MIB,
        "binary_sha256": bin_sha,
        "adaptive_source_sha": ADAPTIVE_SRC,
        "adaptive_binary_policy": "A_copy_known_good_adaptive_binary",
        "live_fixedquarter_sha": live_sha,
        "prod_fixedquarter_untouched": True,
        "harness_bypassed": True,
        "harness_bypass_reason": "run_large_zero_pruned_flow.py copies live FixedQuarter PREF source",
        "admitted_for_proof": False,
        "G8": False,
        "G9": False,
        "no_64_full_return": True,
        "no_G8_G9_proof_admit_from_this_alone": True,
        "lane_verified_free_before_launch": True,
        "preserved_prior_dirs": True,
        "forbid_resume_of": [
            "box20-zero-pruned-adaptive-radius3e10-grok-20260930-v1",
            "box20-zero-pruned-adaptive-radius3e10-v1",
        ],
    }
    (ATTEMPT / "SUPERVISOR-START.json").write_text(json.dumps(start_info, indent=2) + "\n")
    (ATTEMPT / "LAUNCH.json").write_text(json.dumps(start_info, indent=2) + "\n")
    (PM / "N32-C1-LAUNCH.json").write_text(json.dumps(start_info, indent=2) + "\n")

    with raw_path.open("w") as so, flow_log.open("w") as se:
        native = subprocess.Popen(cmd, cwd=str(PREF), stdout=so, stderr=se, start_new_session=True)
    native_pid = native.pid
    native_pgid = native_pid

    pids = {
        "supervisor_pid": supervisor_pid, "supervisor_pgid": supervisor_pgid,
        "native_pid": native_pid, "native_pgid": native_pgid,
        "start_et": start_et, "cmd": cmd,
    }
    (ATTEMPT / "PIDS.json").write_text(json.dumps(pids, indent=2) + "\n")

    start_info["native_pid"] = native_pid
    start_info["native_pgid"] = native_pgid
    start_info["status"] = "RUNNING"
    start_info["writtenAtET"] = et_label()
    start_info["writtenAtUTC"] = utc_now()
    (ATTEMPT / "LAUNCH.json").write_text(json.dumps(start_info, indent=2) + "\n")
    (PM / "N32-C1-LAUNCH.json").write_text(json.dumps(start_info, indent=2) + "\n")
    # Update QUEUED to cleared
    queued_path = PM / "N32-C1-QUEUED-BEHIND-PROD-SPEED.json"
    if queued_path.exists():
        q = json.loads(queued_path.read_text())
        q["queued"] = False
        q["cleared_at_et"] = et_label()
        q["cleared_reason"] = "lane_free_c1_launched"
        q["c1_status"] = "RUNNING"
        q["c1_supervisor_pid"] = supervisor_pid
        q["c1_native_pid"] = native_pid
        queued_path.write_text(json.dumps(q, indent=2) + "\n")

    # Brief smoke: confirm native alive a few seconds
    time.sleep(3.0)
    if native.poll() is not None:
        start_info["status"] = "FAIL_NATIVE_EARLY_EXIT"
        start_info["native_exit"] = native.poll()
        start_info["flow_log_tail"] = flow_log.read_text()[-2000:] if flow_log.exists() else ""
        (ATTEMPT / "LAUNCH.json").write_text(json.dumps(start_info, indent=2) + "\n")
        (PM / "N32-C1-LAUNCH.json").write_text(json.dumps(start_info, indent=2) + "\n")
        raise SystemExit(f"native early exit {native.poll()}")

    stop_reason = None
    poll_s = 5.0
    while True:
        elapsed = time.monotonic() - started_mono
        rc = native.poll()
        tubes = read_tubes(tubes_path)
        physical = hex_mid(tubes[-1]["timeEnd"]) if tubes else 0.0
        if int(elapsed) % 30 < poll_s + 0.1:
            (ATTEMPT / "HEARTBEAT.json").write_text(json.dumps({
                "elapsed_s": elapsed, "tubes": len(tubes), "physical_time": physical,
                "native_alive": rc is None, "et": et_label(),
                "status": "RUNNING" if rc is None else "native_exited",
            }, indent=2) + "\n")
        if rc is not None:
            stop_reason = "native_exited"
            break
        if elapsed >= WALL_S:
            stop_reason = "wall_time_cap"
            break
        time.sleep(poll_s)

    # dual PGID cleanup: native first
    cleanup = {
        "order": ["verify", "kill native PGID first", "await", "supervisor exits"],
        "stop_reason": stop_reason,
        "native_pid": native_pid, "native_pgid": native_pgid,
        "supervisor_pid": supervisor_pid, "supervisor_pgid": supervisor_pgid,
    }
    if native.poll() is None:
        try:
            ps = subprocess.check_output(
                ["ps", "-p", str(native_pid), "-o", "pid=,pgid=,command="], text=True
            ).strip()
        except subprocess.CalledProcessError:
            ps = ""
        cleanup["native_ps_before_signal"] = ps
        if str(ATTEMPT) in ps or "ring_flow" in ps:
            kill_pgid(native_pgid, signal.SIGTERM)
            cleanup["native_signal"] = "SIGTERM"
            for _ in range(30):
                if native.poll() is not None:
                    break
                time.sleep(0.5)
            if native.poll() is None:
                kill_pgid(native_pgid, signal.SIGKILL)
                cleanup["native_signal_escalation"] = "SIGKILL"
                try:
                    native.wait(timeout=10)
                except Exception:
                    pass
        else:
            cleanup["native_signal"] = "skipped_identity_mismatch"
    else:
        cleanup["native_signal"] = "already_exited"
    cleanup["native_exit"] = native.poll()
    cleanup["confirmed_native_gone"] = not proc_alive(native_pid)
    cleanup["confirmed_supervisor_will_exit"] = True
    (ATTEMPT / "CLEANUP.json").write_text(json.dumps(cleanup, indent=2) + "\n")

    elapsed_s = time.monotonic() - started_mono
    tubes = read_tubes(tubes_path)
    raw = {}
    try:
        txt = raw_path.read_text().strip()
        if txt:
            raw = json.loads(txt.splitlines()[-1])
    except Exception as e:
        raw = {"parse_error": str(e)}

    flow_ok = bool(raw.get("success")) if isinstance(raw, dict) else False
    summary = {
        "schema": "n32-c1-summary-v1",
        "tag": TAG,
        "status": "COMPLETE" if flow_ok else ("NATIVE_EXIT" if stop_reason == "native_exited" else stop_reason),
        "verdict": "FLOW_SUCCESS" if flow_ok else "INCOMPLETE_OR_FAIL",
        "admitted_for_proof": False,
        "G8": False, "G9": False,
        "no_G8_G9_proof_admit_from_this_alone": True,
        "prod_fixedquarter_untouched": sha(live) == LIVE_FQ_TU,
        "live_fixedquarter_sha": sha(live),
        "adaptive_source_sha": ADAPTIVE_SRC,
        "binary_sha256": bin_sha,
        "tubes": len(tubes),
        "elapsed_s": elapsed_s,
        "stop_reason": stop_reason,
        "native_exit": native.poll(),
        "raw_success": flow_ok,
        "writtenAtET": et_label(),
        "writtenAtUTC": utc_now(),
        "attempt_dir": str(ATTEMPT),
    }
    (ATTEMPT / "SUMMARY.json").write_text(json.dumps(summary, indent=2) + "\n")
    (PM / "N32-C1-SUMMARY.json").write_text(json.dumps(summary, indent=2) + "\n")
    # final LAUNCH status
    start_info["status"] = summary["status"]
    start_info["summary"] = summary
    (PM / "N32-C1-LAUNCH.json").write_text(json.dumps(start_info, indent=2) + "\n")

if __name__ == "__main__":
    main()
