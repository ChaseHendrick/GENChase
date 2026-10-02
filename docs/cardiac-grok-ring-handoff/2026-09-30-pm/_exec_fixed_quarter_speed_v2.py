#!/usr/bin/env python3
"""Fixed h=1/4 ZeroPruned N=32 speed pilot. Production ZeroPruned only. Stop ~1ms. No h=1/8 auto. No G8/G9."""
from __future__ import annotations
import hashlib, json, os, shutil, signal, subprocess, sys, time
from pathlib import Path
from datetime import datetime, timezone

BASE = Path("<workspace>")
PM = BASE / "outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm"
PREF = BASE / "work/cardiac-study/tissue-scalability-preflight"
ZP_BIN = PREF / "runs/zero-pruned-large-return-build-n32-v1/ring_flow"
EXPECTED_BIN = "0945e3b652d175e752286d370a2b2a885c8db93037503c38e78e8632b3ae7ccc"
TAG = "box20-zero-pruned-fixed-quarter-radius3e10-speed-pilot-grok-20260930-v2"
ATTEMPT = BASE / "outputs/cardiac-study/tissue-ring/ring32-certification/rigorous-attempts" / TAG
AUDIT = BASE / "work/cardiac-study/tissue-proof-review/zero-pruned-supplier-review-v1/SUPPLIER-SOURCE-AUDIT.json"
WALL_S = 3600
NATIVE_BUDGET_S = 3595
RSS_MIB = 2048
STOP_MS = 1.0
STEP = "0.25"
ORDER = 20
RADIUS = "3e-10"

EXPECT_PINS = {
    "ZeroPrunedSparseMap.hpp": "c2c0f5174f62785776195ccf69b04b1dfcf4963ea2a95389424212adf5e53043",
    "ZeroPrunedCellwiseRingMap.hpp": "6817be29a468657e17073aefe037722cf51605ea26bb3ed66ea2e7b843289527",
    "ring_flow_zero_pruned.cpp": "5b85695c7948a7589fe7be4211fd9e22e48c6417a9f0a3936f33e086a4f3879c",
}

# baselines (honest on-disk)
ZP_ADAPT_S_TUBE = 258.15079923215256
ZP_ADAPT_S_MS = 2153.545969601511
AZ_P1_S_TUBE = 237.02348161566664
AZ_P1_S_MS = 1972.8309410117513

sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()

def et_label():
    return subprocess.check_output(["date", "+%Y-%m-%dT%H:%M:%S%z (ET)"], text=True).strip()

def utc_now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def hex_mid(b):
    return 0.5 * (float.fromhex(b["lo"]) + float.fromhex(b["hi"]))

def hex_lo(b):
    return float.fromhex(b["lo"])

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
    return hits

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

    for name, expect in EXPECT_PINS.items():
        h = sha(PREF / name)
        if h != expect:
            raise SystemExit(f"PIN DRIFT {name}: {h}")
    # ensure AZero not used
    if sha(ZP_BIN) != EXPECTED_BIN:
        raise SystemExit(f"ZP binary sha mismatch: {sha(ZP_BIN)}")
    audit = json.loads(AUDIT.read_text())
    if audit.get("accepted") is not True or audit.get("schema") != "cellwise-map-zero-pruned-supplier-source-audit-v1":
        raise SystemExit("ZeroPruned source audit not accepted")
    if audit.get("approvedHeaderSha256") != EXPECT_PINS["ZeroPrunedSparseMap.hpp"]:
        raise SystemExit("audit header pin mismatch")

    busy = lane_busy()
    if busy:
        (PM / "ZP-FIXED-QUARTER-V2-BLOCKED.json").write_text(json.dumps({
            "reason": "lane_busy", "hits": busy, "writtenAtET": et_label(),
            "admitted_for_proof": False,
        }, indent=2) + "\n")
        raise SystemExit(f"ABORT lane busy: {busy}")

    if ATTEMPT.exists():
        raise SystemExit(f"tag collision / refuse resume: {ATTEMPT}")
    ATTEMPT.mkdir(parents=True, exist_ok=False)
    inputs = ATTEMPT / "inputs"
    inputs.mkdir()

    shutil.copy2(ZP_BIN, ATTEMPT / "ring_flow")
    os.chmod(ATTEMPT / "ring_flow", 0o755)
    if sha(ATTEMPT / "ring_flow") != EXPECTED_BIN:
        raise SystemExit("copied ZP binary sha mismatch")
    for name in ["ZeroPrunedSparseMap.hpp", "ZeroPrunedCellwiseRingMap.hpp", "ring_flow_zero_pruned.cpp"]:
        shutil.copy2(PREF / name, inputs / name)
    shutil.copy2(AUDIT, inputs / "SUPPLIER-SOURCE-AUDIT.json")
    shutil.copy2(PM / "ZP-FIXED-QUARTER-V2-LAUNCH.json", inputs / "LAUNCH.json")
    shutil.copy2(__file__, inputs / "SUPERVISOR.py")
    # explicitly record NOT AZero
    (inputs / "SUPPLIER-KIND.txt").write_text("ZeroPrunedSparseMap (production); NOT AZeroPrunedSparseMap\n")

    tubes_path = ATTEMPT / "TUBES.jsonl"
    raw_path = ATTEMPT / "RAW-FLOW.json"
    flow_log = ATTEMPT / "FLOW.log"
    cmd = [
        str(ATTEMPT / "ring_flow"), "--box", RADIUS, str(tubes_path),
        str(ORDER), str(NATIVE_BUDGET_S), STEP, str(RSS_MIB),
    ]

    start_info = {
        "supervisor_pid": supervisor_pid,
        "supervisor_pgid": supervisor_pgid,
        "native_cmd": cmd,
        "attempt_dir": str(ATTEMPT),
        "process_start_et": start_et,
        "process_start_utc": start_utc,
        "supplier": "ZeroPrunedSparseMap",
        "step": STEP,
    }
    (ATTEMPT / "SUPERVISOR-START.json").write_text(json.dumps(start_info, indent=2) + "\n")
    launch_pm = json.loads((PM / "ZP-FIXED-QUARTER-V2-LAUNCH.json").read_text())
    launch_pm.update(start_info)
    (PM / "ZP-FIXED-QUARTER-V2-LAUNCH.json").write_text(json.dumps(launch_pm, indent=2) + "\n")

    with raw_path.open("w") as so, flow_log.open("w") as se:
        native = subprocess.Popen(cmd, cwd=str(PREF), stdout=so, stderr=se, start_new_session=True)
    native_pid = native.pid
    native_pgid = native_pid
    (ATTEMPT / "PIDS.json").write_text(json.dumps({
        "supervisor_pid": supervisor_pid, "supervisor_pgid": supervisor_pgid,
        "native_pid": native_pid, "native_pgid": native_pgid,
        "start_et": start_et, "cmd": cmd,
    }, indent=2) + "\n")
    launch_pm["native_pid"] = native_pid
    launch_pm["native_pgid"] = native_pgid
    (PM / "ZP-FIXED-QUARTER-V2-LAUNCH.json").write_text(json.dumps(launch_pm, indent=2) + "\n")

    stop_reason = None
    physical_ms = 0.0
    tubes = []
    poll_s = 2.0
    while True:
        elapsed = time.monotonic() - started_mono
        rc = native.poll()
        tubes = read_tubes(tubes_path)
        if tubes:
            physical_ms = hex_mid(tubes[-1]["timeEnd"])
            if hex_lo(tubes[-1]["timeEnd"]) >= STOP_MS or physical_ms >= STOP_MS:
                stop_reason = "stop_physical_ms_reached"
                break
        if rc is not None:
            stop_reason = "native_exited"
            break
        if elapsed >= WALL_S:
            stop_reason = "wall_time_cap"
            break
        if int(elapsed) % 30 < poll_s:
            (ATTEMPT / "HEARTBEAT.json").write_text(json.dumps({
                "elapsed_s": elapsed, "tubes": len(tubes), "physical_ms": physical_ms,
                "native_alive": rc is None, "et": et_label(),
            }, indent=2) + "\n")
        time.sleep(poll_s)

    cleanup = {
        "order": ["verify", "kill native PGID first", "await", "supervisor exits"],
        "stop_reason": stop_reason,
        "native_pid": native_pid, "native_pgid": native_pgid,
        "supervisor_pid": supervisor_pid, "supervisor_pgid": supervisor_pgid,
    }
    if native.poll() is None:
        try:
            ps = subprocess.check_output(["ps", "-p", str(native_pid), "-o", "pid=,pgid=,command="], text=True).strip()
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
    (ATTEMPT / "CLEANUP.json").write_text(json.dumps(cleanup, indent=2) + "\n")

    elapsed_s = time.monotonic() - started_mono
    tubes = read_tubes(tubes_path)
    if tubes:
        physical_ms = hex_mid(tubes[-1]["timeEnd"])

    raw = {}
    try:
        txt = raw_path.read_text().strip()
        if txt:
            raw = json.loads(txt.splitlines()[-1])
    except Exception as e:
        raw = {"parse_error": str(e)}

    guards_ok = all(len(t.get("domainGuards", [])) == 4384 for t in tubes) if tubes else False
    coords_ok = all(len(t.get("physicalTube", [])) == 576 for t in tubes) if tubes else False
    s_per_tube = (elapsed_s / len(tubes)) if tubes else None
    s_per_ms = (elapsed_s / physical_ms) if physical_ms > 0 else None

    speedup_vs_adapt_tube = (ZP_ADAPT_S_TUBE / s_per_tube) if s_per_tube else None
    speedup_vs_adapt_ms = (ZP_ADAPT_S_MS / s_per_ms) if s_per_ms else None
    speedup_vs_azero_tube = (AZ_P1_S_TUBE / s_per_tube) if s_per_tube else None
    speedup_vs_azero_ms = (AZ_P1_S_MS / s_per_ms) if s_per_ms else None

    remainder_fail = False
    err = ""
    if isinstance(raw, dict):
        err = str(raw.get("error", "") or "")
        if raw.get("flowSucceeded") is False and any(
            k in err.lower() for k in ("remainder", "domain", "inclusion", "transversality", "positive concentration", "pole")
        ):
            remainder_fail = True
        # also check FLOW.log
    flow_txt = ""
    try:
        flow_txt = (ATTEMPT / "FLOW.log").read_text()[-2000:]
    except Exception:
        pass
    if any(k in (err + flow_txt).lower() for k in ("remainder", "domain lost", "guard")) and stop_reason == "native_exited" and not tubes:
        remainder_fail = True

    # verdict
    cli_parse_fail = isinstance(raw, dict) and "Failed parsing string" in str(raw.get("error", ""))
    if cli_parse_fail:
        gate_verdict = "FAIL_CLI_STEP_PARSE"
    elif stop_reason == "native_exited" and (remainder_fail or (raw.get("flowSucceeded") is False and physical_ms < STOP_MS and len(tubes) == 0)):
        gate_verdict = "FAIL_CLOSED_REMAINDER_OR_DOMAIN" if (remainder_fail or physical_ms < STOP_MS) else "FAIL_NATIVE"
    elif stop_reason == "stop_physical_ms_reached" and tubes and guards_ok and coords_ok:
        gate_verdict = "PASS_REACHED_1MS"
    elif stop_reason == "wall_time_cap" and physical_ms >= STOP_MS and tubes and guards_ok:
        gate_verdict = "PASS_REACHED_1MS"
    elif stop_reason == "wall_time_cap":
        gate_verdict = "INCOMPLETE_WALL"
    elif stop_reason == "native_exited" and physical_ms >= STOP_MS:
        gate_verdict = "PASS_REACHED_1MS"
    else:
        gate_verdict = "PARTIAL_OR_UNKNOWN"

    # next: NEVER auto-start h=1/8
    if gate_verdict == "FAIL_CLI_STEP_PARSE":
        next_rec = "CLI step parse failed; fix step string (use 0.25). Do NOT treat as remainder fail; do NOT auto-start h=1/8."
    elif gate_verdict.startswith("FAIL"):
        next_rec = "FAIL_CLOSED: report only. Do NOT auto-start h=1/8. PM/user decide next (calibrate h=1/8 only with new explicit go)."
    elif gate_verdict == "PASS_REACHED_1MS":
        next_rec = "Fixed h=1/4 reached ~1ms with gates intact. Report speedup vs adaptive/AZero. No G8/G9/full return without named go."
    else:
        next_rec = "PM review artifacts; do NOT auto-start h=1/8; no G8/G9."

    end_et = et_label()
    end_utc = utc_now()

    receipt = {
        "schema": "zp-fixed-quarter-speed-receipt-v1",
        "pilot": "fixed_h_quarter_speed",
        "tag": TAG,
        "verdict": gate_verdict,
        "writtenAtET": end_et,
        "writtenAtUTC": end_utc,
        "agent": "Grok-only",
        "machineId": "<redacted>",
        "start_et": start_et,
        "start_utc": start_utc,
        "stop_reason": stop_reason,
        "supplier": "ZeroPrunedSparseMap",
        "NOT_AZero": True,
        "step": STEP,
        "step_policy": "fixed",
        "sites": 32,
        "mode": "box",
        "radius": RADIUS,
        "order": ORDER,
        "wall_s_budget": WALL_S,
        "wall_s_elapsed": elapsed_s,
        "rss_mib": RSS_MIB,
        "physical_ms_reached": physical_ms,
        "stop_physical_ms_target": STOP_MS,
        "tubes": len(tubes),
        "s_per_tube": s_per_tube,
        "s_per_ms": s_per_ms,
        "guards_ok_all_tubes": guards_ok,
        "coords_ok_all_tubes": coords_ok,
        "binary_sha256": EXPECTED_BIN,
        "baselines": {
            "adaptive_zeropruned_s_per_tube": ZP_ADAPT_S_TUBE,
            "adaptive_zeropruned_s_per_ms": ZP_ADAPT_S_MS,
            "azero_p1_s_per_tube": AZ_P1_S_TUBE,
            "azero_p1_s_per_ms": AZ_P1_S_MS,
        },
        "speedup_vs_adaptive_zp_s_per_tube": speedup_vs_adapt_tube,
        "speedup_vs_adaptive_zp_s_per_ms": speedup_vs_adapt_ms,
        "speedup_vs_azero_p1_s_per_tube": speedup_vs_azero_tube,
        "speedup_vs_azero_p1_s_per_ms": speedup_vs_azero_ms,
        "remainder_or_domain_fail_closed": remainder_fail,
        "did_not_auto_start_h_eighth": True,
        "admitted_for_proof": False,
        "G8": False,
        "G9": False,
        "full_period_return": False,
        "spatial_existence_certified": False,
        "spatial_stability_certified": False,
        "attempt_dir": str(ATTEMPT),
        "raw_flow": raw if isinstance(raw, dict) else {"raw": raw},
        "native_exit": native.poll(),
        "pids": {
            "supervisor_pid": supervisor_pid, "supervisor_pgid": supervisor_pgid,
            "native_pid": native_pid, "native_pgid": native_pgid,
        },
        "cleanup": cleanup,
        "next_recommendation": next_rec,
        "tube_times_ms": [
            {"stepIndex": t["stepIndex"], "timeEnd_mid": hex_mid(t["timeEnd"]), "step_mid": hex_mid(t["step"])}
            for t in tubes
        ],
        "does_not_prove": ["full_period_return", "existence", "stability", "theorems", "continuum"],
    }
    receipt_path = PM / "ZP-FIXED-QUARTER-V2-SPEED-RECEIPT.json"
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n")

    summary = {
        "schema": "zp-fixed-quarter-speed-summary-v1",
        "writtenAtET": end_et,
        "writtenAtUTC": end_utc,
        "agent": "Grok-only",
        "machineId": "<redacted>",
        "tag": TAG,
        "verdict": gate_verdict,
        "supplier": "ZeroPrunedSparseMap",
        "step": STEP,
        "wall_s_elapsed": elapsed_s,
        "physical_ms_reached": physical_ms,
        "tubes": len(tubes),
        "s_per_tube": s_per_tube,
        "s_per_ms": s_per_ms,
        "speedup_vs_adaptive_zp_s_per_tube": speedup_vs_adapt_tube,
        "speedup_vs_adaptive_zp_s_per_ms": speedup_vs_adapt_ms,
        "speedup_vs_azero_p1_s_per_tube": speedup_vs_azero_tube,
        "speedup_vs_azero_p1_s_per_ms": speedup_vs_azero_ms,
        "stop_reason": stop_reason,
        "remainder_or_domain_fail_closed": remainder_fail,
        "did_not_auto_start_h_eighth": True,
        "admitted_for_proof": False,
        "G8": False,
        "G9": False,
        "receipt_path": str(receipt_path),
        "receipt_sha256": sha(receipt_path),
        "attempt_dir": str(ATTEMPT),
        "next_recommendation": next_rec,
        "binary_sha256": EXPECTED_BIN,
    }
    summary_path = PM / "ZP-FIXED-QUARTER-V2-SUMMARY.json"
    summary_path.write_text(json.dumps(summary, indent=2) + "\n")

    (ATTEMPT / "RUN-REPORT.json").write_text(json.dumps({
        "status": "fixed-quarter speed pilot — no theorem certificate",
        "schema": "zp-fixed-quarter-run-report-v1",
        "tag": TAG,
        "supplier": "ZeroPrunedSparseMap",
        "step": STEP,
        "sites": 32,
        "flow_seconds": elapsed_s,
        "step_count": len(tubes),
        "last_time_mid_ms": physical_ms,
        "stop_reason": stop_reason,
        "flow_succeeded": False,
        "spatial_existence_certified": False,
        "spatial_stability_certified": False,
        "admitted_for_proof": False,
        "verdict": gate_verdict,
        "command": cmd,
        "native_exit": native.poll(),
        "did_not_auto_start_h_eighth": True,
    }, indent=2) + "\n")

    print(json.dumps({
        "done": True, "verdict": gate_verdict, "tubes": len(tubes),
        "physical_ms": physical_ms, "elapsed_s": elapsed_s,
        "s_per_tube": s_per_tube, "s_per_ms": s_per_ms,
        "speedup_vs_adapt_ms": speedup_vs_adapt_ms,
        "receipt": str(receipt_path), "stop_reason": stop_reason,
        "did_not_auto_start_h_eighth": True,
    }), flush=True)

if __name__ == "__main__":
    main()
