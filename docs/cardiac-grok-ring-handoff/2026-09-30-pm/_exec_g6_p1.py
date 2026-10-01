#!/usr/bin/env python3
"""G6/P1 N=32 isolated AZero adaptive speed pilot. Grok-only. NOT G8. NOT admitted_for_proof."""
from __future__ import annotations
import hashlib, json, os, shutil, signal, subprocess, sys, time
from pathlib import Path
from datetime import datetime, timezone

BASE = Path("/Users/chasehendrick/Documents/Codex/2026-09-29/github-plugin-github-openai-curated-remote")
PM = BASE / "outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm"
PREF = BASE / "work/cardiac-study/tissue-scalability-preflight"
G2_BIN = PREF / "runs/azero-large-return-build-n32-v1/ring_flow"
EXPECTED_BIN_SHA = "4b24c4b7a63e117b46fefdda807e817735823822012af6d281a58bdf6a990408"
TAG = "box20-azero-adaptive-radius3e10-speed-pilot-grok-20260930-v1"
ATTEMPTS = BASE / "outputs/cardiac-study/tissue-ring/ring32-certification/rigorous-attempts"
ATTEMPT = ATTEMPTS / TAG
WALL_S = 3600
NATIVE_BUDGET_S = 3595
RSS_MIB = 2048
STOP_MS = 1.0
PASS_BAR = 1.3
ORDER = 20
RADIUS = "3e-10"

EXPECT_PINS = {
    "AZeroPrunedCellwiseRingMap.hpp": "c252a3bcff9b4092659b4f08d407d8f6e9c7cd06db962f5ec3506a8149251e10",
    "AZeroPrunedSparseMap.hpp": "31d1eb16d06c333eb64535e7b8981680e54b6e60321c1344fe1d77508af21fc8",
    "ZeroPrunedCellwiseRingMap.hpp": "6817be29a468657e17073aefe037722cf51605ea26bb3ed66ea2e7b843289527",
    "ZeroPrunedSparseMap.hpp": "c2c0f5174f62785776195ccf69b04b1dfcf4963ea2a95389424212adf5e53043",
    "CellwiseRingMap.hpp": "9818bfdc6848216ca1e8303059bfd13bade8d172c27c865a379119f22e19cf7f",
}

sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()

def et_label() -> str:
    return subprocess.check_output(["date", "+%Y-%m-%dT%H:%M:%S%z (ET)"], text=True).strip()

def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def hex_mid(b: dict) -> float:
    return 0.5 * (float.fromhex(b["lo"]) + float.fromhex(b["hi"]))

def hex_lo(b: dict) -> float:
    return float.fromhex(b["lo"])

def hex_hi(b: dict) -> float:
    return float.fromhex(b["hi"])

def verify_pins():
    live = {}
    for name, expect in EXPECT_PINS.items():
        h = sha(PREF / name)
        if h != expect:
            raise SystemExit(f"PIN DRIFT {name}: {h}")
        live[name] = h
    # production ZeroPruned must remain untouched
    if live["ZeroPrunedSparseMap.hpp"] != EXPECT_PINS["ZeroPrunedSparseMap.hpp"]:
        raise SystemExit("production ZeroPrunedSparseMap drift")
    return live

def lane_busy() -> list:
    out = subprocess.check_output(["ps", "axo", "pid,pgid,rss,etime,command"], text=True)
    hits = []
    for line in out.splitlines()[1:]:
        if "ring_flow" in line and "grep" not in line and "_exec_g6_p1" not in line:
            # ignore Claude/ChatGPT helpers that mention native in long argv
            if "/ring_flow" in line or line.strip().endswith("ring_flow") or "ring_flow --" in line:
                hits.append(line.strip())
            elif "tissue-scalability" in line and "ring_flow" in line:
                hits.append(line.strip())
    # tighter: look for our binary name as executable
    out2 = subprocess.check_output(["ps", "-axo", "pid=,pgid=,command="], text=True)
    for line in out2.splitlines():
        parts = line.strip().split(None, 2)
        if len(parts) < 3:
            continue
        cmd = parts[2]
        if "ring_flow" in cmd.split()[0] or "/ring_flow " in cmd or cmd.endswith("/ring_flow"):
            if "Claude" in cmd or "ChatGPT" in cmd or "Helper" in cmd:
                continue
            hits.append(line.strip())
    # dedupe
    return sorted(set(hits))

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
            break  # partial last line while writing
    return rows

def kill_pgid(pgid: int, sig=signal.SIGTERM) -> None:
    try:
        os.killpg(pgid, sig)
    except ProcessLookupError:
        pass

def proc_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False

def main():
    # Become session leader so supervisor PID==PGID (macOS has no setsid binary).
    # Single-fork + setsid; parent exits; child continues (launched under nohup).
    if os.getpgrp() != os.getpid() or True:
        pid = os.fork()
        if pid > 0:
            # parent prints child pid then exits
            print(json.dumps({"supervisor_child_pid": pid}), flush=True)
            sys.exit(0)
        os.setsid()

    supervisor_pid = os.getpid()
    supervisor_pgid = os.getpgrp()
    started_mono = time.monotonic()
    start_et = et_label()
    start_utc = utc_now()

    live_pins = verify_pins()
    busy = lane_busy()
    if busy:
        (PM / "AZERO-G6-P1-BLOCKED.json").write_text(json.dumps({
            "schema": "azero-g6-p1-blocked-v1",
            "reason": "lane_busy",
            "hits": busy,
            "writtenAtET": et_label(),
            "admitted_for_proof": False,
            "P1_started": False,
        }, indent=2) + "\n")
        raise SystemExit(f"ABORT lane busy: {busy}")

    bin_sha = sha(G2_BIN)
    if bin_sha != EXPECTED_BIN_SHA:
        raise SystemExit(f"G2 binary sha mismatch: {bin_sha}")

    if ATTEMPT.exists():
        raise SystemExit(f"tag collision / refuse resume: {ATTEMPT}")
    ATTEMPT.mkdir(parents=True, exist_ok=False)
    inputs = ATTEMPT / "inputs"
    inputs.mkdir()

    # Freeze provenance (isolated; do not touch production ZeroPruned headers)
    shutil.copy2(G2_BIN, ATTEMPT / "ring_flow")
    os.chmod(ATTEMPT / "ring_flow", 0o755)
    if sha(ATTEMPT / "ring_flow") != EXPECTED_BIN_SHA:
        raise SystemExit("copied binary sha mismatch")
    for name in [
        "AZeroPrunedSparseMap.hpp", "AZeroPrunedCellwiseRingMap.hpp",
        "ring_flow_azero.cpp",
    ]:
        shutil.copy2(PREF / name, inputs / name)
    shutil.copy2(PREF / "ZeroPrunedSparseMap.hpp", inputs / "ZeroPrunedSparseMap.hpp.REFERENCE-ONLY")
    shutil.copy2(PREF / "ZeroPrunedCellwiseRingMap.hpp", inputs / "ZeroPrunedCellwiseRingMap.hpp.REFERENCE-ONLY")
    audit_src = BASE / "work/cardiac-study/tissue-proof-review/azero-supplier-review-v1/SUPPLIER-SOURCE-AUDIT.json"
    if audit_src.exists():
        shutil.copy2(audit_src, inputs / "SUPPLIER-SOURCE-AUDIT.json")
    shutil.copy2(PREF / "runs/azero-large-return-build-n32-v1/RESULT.json", inputs / "G2-BUILD-RESULT.json")
    shutil.copy2(PM / "AZERO-G6-P1-LAUNCH.json", inputs / "LAUNCH.json")
    shutil.copy2(__file__, inputs / "SUPERVISOR.py")

    tubes_path = ATTEMPT / "TUBES.jsonl"
    raw_path = ATTEMPT / "RAW-FLOW.json"
    flow_log = ATTEMPT / "FLOW.log"
    binary = ATTEMPT / "ring_flow"
    cmd = [
        str(binary), "--box", RADIUS, str(tubes_path),
        str(ORDER), str(NATIVE_BUDGET_S), "adaptive", str(RSS_MIB),
    ]

    # Update launch receipt with live supervisor identity
    launch_update = {
        "supervisor_pid": supervisor_pid,
        "supervisor_pgid": supervisor_pgid,
        "native_cmd": cmd,
        "attempt_dir": str(ATTEMPT),
        "process_start_et": start_et,
        "process_start_utc": start_utc,
        "cwd": str(PREF),
    }
    (ATTEMPT / "SUPERVISOR-START.json").write_text(json.dumps(launch_update, indent=2) + "\n")
    # append to PM launch
    launch_pm = json.loads((PM / "AZERO-G6-P1-LAUNCH.json").read_text())
    launch_pm.update(launch_update)
    (PM / "AZERO-G6-P1-LAUNCH.json").write_text(json.dumps(launch_pm, indent=2) + "\n")

    with raw_path.open("w") as so, flow_log.open("w") as se:
        native = subprocess.Popen(
            cmd,
            cwd=str(PREF),
            stdout=so,
            stderr=se,
            start_new_session=True,
        )
    native_pid = native.pid
    native_pgid = native_pid  # start_new_session ⇒ PGID==PID
    (ATTEMPT / "PIDS.json").write_text(json.dumps({
        "supervisor_pid": supervisor_pid,
        "supervisor_pgid": supervisor_pgid,
        "native_pid": native_pid,
        "native_pgid": native_pgid,
        "start_et": start_et,
        "cmd": cmd,
    }, indent=2) + "\n")
    # also merge into PM launch
    launch_pm["native_pid"] = native_pid
    launch_pm["native_pgid"] = native_pgid
    (PM / "AZERO-G6-P1-LAUNCH.json").write_text(json.dumps(launch_pm, indent=2) + "\n")

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
            # stop when enclosure clearly past ~1.0 ms
            if hex_lo(tubes[-1]["timeEnd"]) >= STOP_MS or physical_ms >= STOP_MS:
                stop_reason = "stop_physical_ms_reached"
                break
        if rc is not None:
            stop_reason = "native_exited"
            break
        if elapsed >= WALL_S:
            stop_reason = "wall_time_cap"
            break
        # progress heartbeat every ~30s
        if int(elapsed) % 30 < poll_s:
            hb = {
                "elapsed_s": elapsed,
                "tubes": len(tubes),
                "physical_ms": physical_ms,
                "native_alive": rc is None,
                "et": et_label(),
            }
            (ATTEMPT / "HEARTBEAT.json").write_text(json.dumps(hb, indent=2) + "\n")
        time.sleep(poll_s)

    # dual-PGID cleanup: native first
    cleanup = {
        "order": ["verify", "kill native PGID first", "await", "supervisor exits"],
        "stop_reason": stop_reason,
        "native_pid": native_pid,
        "native_pgid": native_pgid,
        "supervisor_pid": supervisor_pid,
        "supervisor_pgid": supervisor_pgid,
    }
    if native.poll() is None:
        # verify identity before signal
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
            # still try wait briefly
            try:
                native.wait(timeout=2)
            except Exception:
                pass
    else:
        cleanup["native_signal"] = "already_exited"
    cleanup["native_exit"] = native.poll()
    cleanup["confirmed_native_gone"] = not proc_alive(native_pid)
    (ATTEMPT / "CLEANUP.json").write_text(json.dumps(cleanup, indent=2) + "\n")

    elapsed_s = time.monotonic() - started_mono
    tubes = read_tubes(tubes_path)
    if tubes:
        physical_ms = hex_mid(tubes[-1]["timeEnd"])

    # parse RAW-FLOW if any
    raw = {}
    try:
        txt = raw_path.read_text().strip()
        if txt:
            raw = json.loads(txt.splitlines()[-1])
    except Exception as e:
        raw = {"parse_error": str(e)}

    # tube metrics
    guards_ok = True
    coords_ok = True
    for t in tubes:
        if len(t.get("domainGuards", [])) != 4384:
            guards_ok = False
        if len(t.get("physicalTube", [])) != 576:
            coords_ok = False

    s_per_tube = (elapsed_s / len(tubes)) if tubes else None
    s_per_ms = (elapsed_s / physical_ms) if physical_ms > 0 else None

    # ZeroPruned baseline from on-disk interrupted adaptive
    zp_s_per_tube = 258.15079923215256
    zp_s_per_ms = 2153.545969601511
    zp_physical_ms = 0.8391070449076334
    zp_tubes = 7
    zp_wall = 1807.055594625068

    speedup_s_per_ms = (zp_s_per_ms / s_per_ms) if s_per_ms and s_per_ms > 0 else None
    speedup_s_per_tube = (zp_s_per_tube / s_per_tube) if s_per_tube and s_per_tube > 0 else None

    # Pass bar: ≳1.3× s/ms material for P1
    speed_pass = bool(speedup_s_per_ms is not None and speedup_s_per_ms >= PASS_BAR)
    structural_ok = bool(tubes) and guards_ok and coords_ok and live_pins

    # verdict
    if stop_reason == "stop_physical_ms_reached" and structural_ok:
        gate_verdict = "PASS" if speed_pass else "COMPLETE_BELOW_SPEED_BAR"
    elif stop_reason == "wall_time_cap" and physical_ms >= STOP_MS and structural_ok:
        gate_verdict = "PASS" if speed_pass else "COMPLETE_BELOW_SPEED_BAR"
    elif stop_reason == "wall_time_cap":
        gate_verdict = "INCOMPLETE_WALL"
    elif stop_reason == "native_exited" and raw.get("flowSucceeded") is True:
        # full return unexpectedly — still speed pilot numbers; do NOT claim G9
        gate_verdict = "PASS" if speed_pass else "COMPLETE_BELOW_SPEED_BAR"
    elif stop_reason == "native_exited":
        gate_verdict = "FAIL_NATIVE" if not tubes else "PARTIAL_NATIVE_EXIT"
    else:
        gate_verdict = "UNKNOWN"

    end_et = et_label()
    end_utc = utc_now()

    # next recommendation
    if gate_verdict in ("PASS",) and speed_pass:
        next_rec = "G7 joint pilot+supplier ROLE-07 review; do NOT start G8/G9 without named go"
    elif gate_verdict in ("COMPLETE_BELOW_SPEED_BAR", "PARTIAL_NATIVE_EXIT") and speedup_s_per_ms and speedup_s_per_ms < 1.05:
        next_rec = "A-zero not material on N=32 path; consider fallback fixed h=1/4 ZeroPruned speed pilot (SPEED-DESIGN); stop A-zero speed claims"
    elif gate_verdict == "COMPLETE_BELOW_SPEED_BAR":
        next_rec = "Report raw numbers; optional more diagnostics on skip rate; or fallback h=1/4; no G8"
    elif gate_verdict == "FAIL_NATIVE":
        next_rec = "Diagnose native error from RAW-FLOW/FLOW.log; do not claim speed; consider fallback h=1/4"
    elif gate_verdict == "INCOMPLETE_WALL":
        next_rec = "Did not reach 1ms in 3600s — diagnose; do not extrapolate full period as certificate"
    else:
        next_rec = "PM review artifacts; no G8/G9"

    receipt = {
        "schema": "azero-g6-p1-speed-receipt-v1",
        "gate": "G6",
        "pilot": "P1",
        "tag": TAG,
        "verdict": gate_verdict,
        "speed_pass_ge_1_3x_s_per_ms": speed_pass,
        "all_structural_ok": structural_ok,
        "writtenAtET": end_et,
        "writtenAtUTC": end_utc,
        "agent": "Grok-only",
        "machineId": "056ff109-1c8e-49fc-9983-1c1caa02e796",
        "start_et": start_et,
        "start_utc": start_utc,
        "stop_reason": stop_reason,
        "wall_s_budget": WALL_S,
        "wall_s_elapsed": elapsed_s,
        "rss_mib": RSS_MIB,
        "physical_ms_reached": physical_ms,
        "stop_physical_ms_target": STOP_MS,
        "tubes": len(tubes),
        "s_per_tube": s_per_tube,
        "s_per_ms": s_per_ms,
        "coords_per_tube": 576,
        "guards_per_tube_expected": 4384,
        "guards_ok_all_tubes": guards_ok,
        "coords_ok_all_tubes": coords_ok,
        "binary_sha256": EXPECTED_BIN_SHA,
        "supplier": "AZeroPrunedSparseMap",
        "mode": "box",
        "radius": RADIUS,
        "order": ORDER,
        "step": "adaptive",
        "sites": 32,
        "baseline_zeropruned_adaptive": {
            "tag": "box20-zero-pruned-adaptive-radius3e10-grok-20260930-v1",
            "tubes": zp_tubes,
            "physical_ms": zp_physical_ms,
            "wall_s": zp_wall,
            "s_per_tube": zp_s_per_tube,
            "s_per_ms": zp_s_per_ms,
            "source": "on-disk TUBES.jsonl + RUN-REPORT.json (interrupted; not resumed)",
        },
        "speedup_vs_zeropruned_s_per_ms": speedup_s_per_ms,
        "speedup_vs_zeropruned_s_per_tube": speedup_s_per_tube,
        "pass_bar": PASS_BAR,
        "admitted_for_proof": False,
        "P1_started": True,
        "P1_finished": True,
        "production_headers_swapped": False,
        "G8": False,
        "G9": False,
        "full_period_return": False,
        "spatial_existence_certified": False,
        "spatial_stability_certified": False,
        "attempt_dir": str(ATTEMPT),
        "tubes_path": str(tubes_path),
        "raw_flow": raw if isinstance(raw, dict) else {"raw": raw},
        "native_exit": native.poll(),
        "pids": {
            "supervisor_pid": supervisor_pid,
            "supervisor_pgid": supervisor_pgid,
            "native_pid": native_pid,
            "native_pgid": native_pgid,
        },
        "cleanup": cleanup,
        "live_pins": live_pins,
        "next_recommendation": next_rec,
        "does_not_prove": [
            "full_period_return",
            "existence",
            "stability",
            "header_swap",
            "theorems",
            "continuum",
        ],
        "tube_times_ms": [
            {"stepIndex": t["stepIndex"], "timeEnd_mid": hex_mid(t["timeEnd"]), "step_mid": hex_mid(t["step"])}
            for t in tubes
        ],
    }
    receipt_path = PM / "AZERO-G6-P1-SPEED-RECEIPT.json"
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n")
    receipt_sha = sha(receipt_path)

    summary = {
        "schema": "azero-g6-p1-execution-summary-v1",
        "writtenAtET": end_et,
        "writtenAtUTC": end_utc,
        "agent": "Grok-only",
        "machineId": "056ff109-1c8e-49fc-9983-1c1caa02e796",
        "gate": "G6",
        "pilot": "P1",
        "tag": TAG,
        "verdict": gate_verdict,
        "speed_pass_ge_1_3x_s_per_ms": speed_pass,
        "wall_s_elapsed": elapsed_s,
        "physical_ms_reached": physical_ms,
        "tubes": len(tubes),
        "s_per_tube": s_per_tube,
        "s_per_ms": s_per_ms,
        "baseline_zp_s_per_tube": zp_s_per_tube,
        "baseline_zp_s_per_ms": zp_s_per_ms,
        "speedup_s_per_ms": speedup_s_per_ms,
        "speedup_s_per_tube": speedup_s_per_tube,
        "pass_bar": PASS_BAR,
        "stop_reason": stop_reason,
        "admitted_for_proof": False,
        "P1_started": True,
        "P1_finished": True,
        "production_headers_swapped": False,
        "G8": False,
        "G9": False,
        "receipt_path": str(receipt_path),
        "receipt_sha256": receipt_sha,
        "attempt_dir": str(ATTEMPT),
        "next_recommendation": next_rec,
        "binary_sha256": EXPECTED_BIN_SHA,
    }
    summary_path = PM / "AZERO-G6-P1-SUMMARY.json"
    summary_path.write_text(json.dumps(summary, indent=2) + "\n")

    # also write attempt RUN-REPORT (non-certificate)
    run_report = {
        "status": "speed pilot complete or stopped — no theorem certificate",
        "schema": "azero-g6-p1-run-report-v1",
        "tag": TAG,
        "supplier": "AZeroPrunedSparseMap",
        "sites": 32,
        "mode": "box",
        "order": ORDER,
        "scaled_radius": RADIUS,
        "budget_seconds": WALL_S,
        "rss_limit_bytes": RSS_MIB * 1024**2,
        "step_policy": "adaptive",
        "utc_started": start_utc,
        "utc_ended": end_utc,
        "flow_seconds": elapsed_s,
        "step_count": len(tubes),
        "last_time_mid_ms": physical_ms,
        "stop_reason": stop_reason,
        "flow_succeeded": False,  # speed pilot stop ≠ full return success
        "spatial_existence_certified": False,
        "spatial_stability_certified": False,
        "admitted_for_proof": False,
        "binary_sha256": EXPECTED_BIN_SHA,
        "command": cmd,
        "native_exit": native.poll(),
        "speedup_s_per_ms": speedup_s_per_ms,
        "verdict": gate_verdict,
    }
    (ATTEMPT / "RUN-REPORT.json").write_text(json.dumps(run_report, indent=2) + "\n")

    print(json.dumps({
        "done": True,
        "verdict": gate_verdict,
        "speed_pass": speed_pass,
        "tubes": len(tubes),
        "physical_ms": physical_ms,
        "elapsed_s": elapsed_s,
        "s_per_tube": s_per_tube,
        "s_per_ms": s_per_ms,
        "speedup_s_per_ms": speedup_s_per_ms,
        "receipt": str(receipt_path),
        "summary": str(summary_path),
        "stop_reason": stop_reason,
    }), flush=True)

if __name__ == "__main__":
    main()
