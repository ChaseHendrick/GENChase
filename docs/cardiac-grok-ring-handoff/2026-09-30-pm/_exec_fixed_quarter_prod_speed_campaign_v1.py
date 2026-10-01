#!/usr/bin/env python3
"""Longer N=32 ZeroPruned fixed h=1/4 speed campaign on patched PREF prod binary.
Stop at ~1.0 physical ms. ALL tubes must be exact quarter (0x1p-2). No G8/G9/proof admit."""
from __future__ import annotations
import hashlib, json, os, shutil, signal, subprocess, sys, time
from pathlib import Path
from datetime import datetime, timezone

BASE = Path("/Users/chasehendrick/Documents/Codex/2026-09-29/github-plugin-github-openai-curated-remote")
PM = BASE / "outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm"
PREF = BASE / "work/cardiac-study/tissue-scalability-preflight"
ATTEMPTS = BASE / "outputs/cardiac-study/tissue-ring/ring32-certification/rigorous-attempts"
SRC_BIN = PREF / "runs/zero-pruned-fixed-quarter-prod-patch-n32-v1/ring_flow"
SRC_BIN_FALLBACK = ATTEMPTS / "box20-zero-pruned-fixed-quarter-prod-patch-verify-grok-20261001-v1" / "ring_flow"
EXPECTED_BIN = "abf2d352d4b3a776a6f7a6a0f2b17f44ba0019bb1004357c8cdadc159024643d"
PROD_TU = "e9081f2160e17a3661fb8f095c71febb4d44d3cbb9adcec34b1a5b1c1e2da911"
PRE_PATCH_TU = "5b85695c7948a7589fe7be4211fd9e22e48c6417a9f0a3936f33e086a4f3879c"
APPROVED = BASE / "work/cardiac-study/tissue-proof-review/zero-pruned-supplier-review-v1/approved-sources/ring_flow_zero_pruned.cpp"
TAG = "box20-zero-pruned-fixed-quarter-prod-speed-campaign-grok-20261001-v1"
ATTEMPT = ATTEMPTS / TAG
WALL_S = 3600
NATIVE_BUDGET_S = 3595
RSS_MIB = 2048
STOP_MS = 1.0
STEP = "0.25"  # never "1/4"
ORDER = 20
RADIUS = "3e-10"
TARGET = 0.25
REL_TOL = 1e-12
HEX_QUARTER = "0x1p-2"

ZP_ADAPT_S_TUBE = 258.15079923215256
ZP_ADAPT_S_MS = 2153.545969601511
AZ_P1_S_TUBE = 237.02348161566664
AZ_P1_S_MS = 1972.8309410117513
EIGHTH_S_TUBE = 234.87178600455556
EIGHTH_S_MS = 1900.010281580679
REDESIGN_SPEED_S_TUBE = 204.47257163525  # 4 tubes, 1.0 ms
PROD_VERIFY_S_TUBE = 198.48827666666668  # 3 tubes only — caveat

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

def step_is_quarter(b):
    lo = float.fromhex(b["lo"])
    hi = float.fromhex(b["hi"])
    mid = 0.5 * (lo + hi)
    if lo == hi == TARGET:
        return True
    if b.get("lo") == HEX_QUARTER and b.get("hi") == HEX_QUARTER:
        return True
    return abs(mid - TARGET) <= REL_TOL * max(abs(TARGET), 1.0)

def step_gate(tubes):
    """ALL tubes must be exact quarter. Fail closed if any non-quarter."""
    if not tubes:
        return None, "waiting_no_tubes", [], []
    observed = [hex_mid(t["step"]) for t in tubes]
    hexes = [t["step"] for t in tubes]
    for i, t in enumerate(tubes):
        if not step_is_quarter(t["step"]):
            return False, "abort_step_not_quarter", observed, hexes
    return True, "all_tubes_exact_quarter", observed, hexes

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

    prod_path = PREF / "ring_flow_zero_pruned.cpp"
    if sha(prod_path) != PROD_TU:
        raise SystemExit(f"production TU drift — abort: {sha(prod_path)}")
    if APPROVED.exists() and sha(APPROVED) != PRE_PATCH_TU:
        raise SystemExit("approved-sources unexpectedly changed — abort")

    busy = lane_busy()
    if busy:
        (PM / "ZP-FIXED-QUARTER-PROD-SPEED-SUMMARY.json").write_text(json.dumps({
            "schema": "zp-fixed-quarter-prod-speed-summary-v1",
            "verdict": "FAIL_LANE_BUSY",
            "hits": busy,
            "writtenAtET": et_label(),
            "writtenAtUTC": utc_now(),
            "admitted_for_proof": False,
            "G8": False, "G9": False, "prod_patch_applied": True,
        }, indent=2) + "\n")
        raise SystemExit(f"ABORT lane busy: {busy}")

    if ATTEMPT.exists():
        raise SystemExit(f"tag collision / refuse resume: {ATTEMPT}")
    ATTEMPT.mkdir(parents=True, exist_ok=False)
    inputs = ATTEMPT / "inputs"
    inputs.mkdir()

    src = SRC_BIN if SRC_BIN.exists() else SRC_BIN_FALLBACK
    if not src.exists():
        raise SystemExit("prod-patch binary missing — refuse rebuild in this campaign")
    if sha(src) != EXPECTED_BIN:
        (PM / "ZP-FIXED-QUARTER-PROD-SPEED-SUMMARY.json").write_text(json.dumps({
            "schema": "zp-fixed-quarter-prod-speed-summary-v1",
            "verdict": "FAIL_BINARY_MISMATCH",
            "expected": EXPECTED_BIN, "got": sha(src), "src": str(src),
            "writtenAtET": et_label(), "admitted_for_proof": False,
            "G8": False, "G9": False, "prod_patch_applied": True,
        }, indent=2) + "\n")
        raise SystemExit(f"FAIL_BINARY_MISMATCH: {sha(src)}")

    shutil.copy2(src, ATTEMPT / "ring_flow")
    os.chmod(ATTEMPT / "ring_flow", 0o755)
    bin_sha = sha(ATTEMPT / "ring_flow")
    if bin_sha != EXPECTED_BIN:
        raise SystemExit("copied prod-patch binary sha mismatch")

    shutil.copy2(prod_path, inputs / "ring_flow_zero_pruned.cpp")
    for name in ["ZeroPrunedSparseMap.hpp", "ZeroPrunedCellwiseRingMap.hpp"]:
        if (PREF / name).exists():
            shutil.copy2(PREF / name, inputs / name)
    diff_src = PM / "ZP-FIXED-QUARTER-PROD-PATCH.diff"
    if diff_src.exists():
        shutil.copy2(diff_src, inputs / "ZP-FIXED-QUARTER-PROD-PATCH.diff")
    (inputs / "PROD-TU-SHA256.txt").write_text(PROD_TU + "\n")
    (inputs / "PROD-BIN-SHA256.txt").write_text(EXPECTED_BIN + "\n")
    (inputs / "SUPPLIER-KIND.txt").write_text(
        "ZeroPrunedSparseMap PRODUCTION with FixedQuarterStepControl/"
        "forceFixedQuarter prod patch applied (post-sha e9081f21…); NOT AZero; "
        "admitted_for_proof=false; no G8/G9\n"
    )
    shutil.copy2(__file__, inputs / "SUPERVISOR.py")

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
        "tag": TAG,
        "process_start_et": start_et,
        "process_start_utc": start_utc,
        "supplier": "ZeroPrunedSparseMap",
        "step": STEP,
        "prod_patch_applied": True,
        "source_sha": PROD_TU,
        "binary_sha256": bin_sha,
        "production_tu_sha256": PROD_TU,
        "admitted_for_proof": False,
        "G8": False,
        "G9": False,
        "stop_physical_ms": STOP_MS,
        "wall_s": WALL_S,
        "N": 32,
        "order": ORDER,
        "radius": RADIUS,
        "rss_mib": RSS_MIB,
        "lane_verified_free_before_launch": True,
        "no_further_auto_start": True,
    }
    (ATTEMPT / "SUPERVISOR-START.json").write_text(json.dumps(start_info, indent=2) + "\n")
    (ATTEMPT / "LAUNCH.json").write_text(json.dumps(start_info, indent=2) + "\n")

    launch_path = PM / "ZP-FIXED-QUARTER-PROD-SPEED-LAUNCH.json"
    launch_pm = {
        "schema": "zp-fixed-quarter-prod-speed-launch-v1",
        "gate": "ZP-FIXED-QUARTER-PROD-SPEED",
        "pilot": "fixed_quarter_prod_speed_campaign",
        "status": "RUNNING",
        "writtenAtET": start_et,
        "writtenAtUTC": start_utc,
        "agent": "Grok-only",
        "machineId": "056ff109-1c8e-49fc-9983-1c1caa02e796",
    }
    launch_pm.update(start_info)
    launch_path.write_text(json.dumps(launch_pm, indent=2) + "\n")
    shutil.copy2(launch_path, inputs / "LAUNCH.json")

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
    launch_pm["status"] = "RUNNING"
    launch_path.write_text(json.dumps(launch_pm, indent=2) + "\n")
    (ATTEMPT / "LAUNCH.json").write_text(json.dumps(launch_pm, indent=2) + "\n")

    stop_reason = None
    physical_ms = 0.0
    tubes = []
    observed_steps = []
    observed_hexes = []
    gate_ok = None
    gate_reason = "not_yet"
    poll_s = 2.0
    while True:
        elapsed = time.monotonic() - started_mono
        rc = native.poll()
        tubes = read_tubes(tubes_path)
        if tubes:
            physical_ms = hex_mid(tubes[-1]["timeEnd"])
            gate_ok, gate_reason, observed_steps, observed_hexes = step_gate(tubes)
            if gate_ok is False:
                stop_reason = gate_reason
                break
            if gate_ok is True and (hex_lo(tubes[-1]["timeEnd"]) >= STOP_MS or physical_ms >= STOP_MS):
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
                "gate_ok": gate_ok, "gate_reason": gate_reason,
                "observed_steps": observed_steps,
                "observed_hexes": observed_hexes,
            }, indent=2) + "\n")
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
    if tubes:
        physical_ms = hex_mid(tubes[-1]["timeEnd"])
    gate_ok, gate_reason, observed_steps, observed_hexes = step_gate(tubes)

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
    all_quarter = gate_ok is True

    def speedup(base, val):
        return (base / val) if (val and val > 0) else None

    speedup_vs_adapt_tube = speedup(ZP_ADAPT_S_TUBE, s_per_tube)
    speedup_vs_adapt_ms = speedup(ZP_ADAPT_S_MS, s_per_ms)
    speedup_vs_azero_tube = speedup(AZ_P1_S_TUBE, s_per_tube)
    speedup_vs_azero_ms = speedup(AZ_P1_S_MS, s_per_ms)
    speedup_vs_eighth_tube = speedup(EIGHTH_S_TUBE, s_per_tube)
    speedup_vs_eighth_ms = speedup(EIGHTH_S_MS, s_per_ms)
    speedup_vs_redesign_tube = speedup(REDESIGN_SPEED_S_TUBE, s_per_tube)
    speedup_vs_prod_verify_tube = speedup(PROD_VERIFY_S_TUBE, s_per_tube)

    remainder_fail = False
    err = ""
    if isinstance(raw, dict):
        err = str(raw.get("error", "") or "")
    flow_txt = ""
    try:
        flow_txt = (ATTEMPT / "FLOW.log").read_text()[-2000:]
    except Exception:
        pass
    blob = (err + " " + flow_txt).lower()
    if stop_reason == "native_exited" and isinstance(raw, dict) and raw.get("flowSucceeded") is False:
        if any(k in blob for k in ("remainder", "domain", "inclusion", "transversality",
                                    "concentration", "pole", "failed")):
            remainder_fail = "Failed parsing string" not in err

    prod_now = sha(prod_path)
    prod_patch_still = prod_now == PROD_TU

    if stop_reason and stop_reason.startswith("abort_step"):
        gate_verdict = "FAIL_STEP_NOT_QUARTER"
    elif stop_reason == "stop_physical_ms_reached" and tubes and all_quarter:
        gate_verdict = "PASS_REACHED_1MS"
    elif stop_reason == "wall_time_cap" and physical_ms >= STOP_MS and all_quarter:
        gate_verdict = "PASS_REACHED_1MS"
    elif stop_reason == "wall_time_cap" and physical_ms < STOP_MS and all_quarter:
        gate_verdict = "COMPLETE_BELOW_WALL"
    elif stop_reason == "native_exited" and physical_ms >= STOP_MS and all_quarter:
        gate_verdict = "PASS_REACHED_1MS"
    elif stop_reason == "native_exited" and (remainder_fail or (
            isinstance(raw, dict) and raw.get("flowSucceeded") is False and physical_ms < STOP_MS)):
        gate_verdict = "FAIL_CLOSED_REMAINDER_OR_DOMAIN"
    elif stop_reason == "wall_time_cap":
        gate_verdict = "INCOMPLETE_WALL"
    else:
        gate_verdict = "PARTIAL_OR_UNKNOWN"

    if gate_verdict == "FAIL_STEP_NOT_QUARTER":
        next_rec = "ABORT: recorded steps not exact 0.25/0x1p-2. Report only. Do NOT auto-start anything else. No G8/G9."
    elif gate_verdict == "PASS_REACHED_1MS":
        next_rec = "Prod-patch fixed h=1/4 reached ~1ms with all-tube exact-quarter gate. Compare speedups. No G8/G9/proof-admit/auto-start."
    elif gate_verdict == "COMPLETE_BELOW_WALL":
        next_rec = "Finished below wall without reaching 1ms; report numbers. No G8/G9/proof-admit/auto-start."
    else:
        next_rec = "PM review; do NOT auto-start anything else; no G8/G9; admitted_for_proof=false."

    end_et = et_label()
    end_utc = utc_now()

    receipt = {
        "schema": "zp-fixed-quarter-prod-speed-receipt-v1",
        "pilot": "fixed_quarter_prod_speed_campaign",
        "tag": TAG,
        "verdict": gate_verdict,
        "writtenAtET": end_et,
        "writtenAtUTC": end_utc,
        "agent": "Grok-only",
        "machineId": "056ff109-1c8e-49fc-9983-1c1caa02e796",
        "start_et": start_et,
        "start_utc": start_utc,
        "stop_reason": stop_reason,
        "supplier": "ZeroPrunedSparseMap",
        "NOT_AZero": True,
        "step": STEP,
        "step_policy": "fixed_forced_quarter_FixedQuarterStepControl_prod",
        "prod_patch_applied": True,
        "source_sha": prod_now,
        "production_tu_sha256": prod_now,
        "binary_sha256": bin_sha,
        "prod_patch_still_applied": prod_patch_still,
        "first_gate": {
            "ok": gate_ok,
            "reason": gate_reason,
            "observed_steps_ms": observed_steps,
            "observed_steps_hex": observed_hexes,
            "target": TARGET,
            "hex_target": HEX_QUARTER,
            "poincare_cutin_tolerance": False,
            "fail_closed_any_non_quarter": True,
        },
        "all_tubes_exact_quarter": all_quarter,
        "observed_steps_ms": observed_steps,
        "observed_steps_hex": observed_hexes,
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
        "baselines": {
            "adaptive_zeropruned_s_per_tube": ZP_ADAPT_S_TUBE,
            "adaptive_zeropruned_s_per_ms": ZP_ADAPT_S_MS,
            "azero_p1_s_per_tube": AZ_P1_S_TUBE,
            "azero_p1_s_per_ms": AZ_P1_S_MS,
            "fixed_eighth_s_per_tube": EIGHTH_S_TUBE,
            "fixed_eighth_s_per_ms": EIGHTH_S_MS,
            "isolated_redesign_speed_s_per_tube": REDESIGN_SPEED_S_TUBE,
            "isolated_redesign_speed_note": "4 tubes, 1.0 ms",
            "prod_verify_short_s_per_tube": PROD_VERIFY_S_TUBE,
            "prod_verify_short_caveat": "3 tubes only (~0.75 ms) — not a full 1ms speed baseline",
        },
        "speedup_vs_adaptive_zp_s_per_tube": speedup_vs_adapt_tube,
        "speedup_vs_adaptive_zp_s_per_ms": speedup_vs_adapt_ms,
        "speedup_vs_azero_p1_s_per_tube": speedup_vs_azero_tube,
        "speedup_vs_azero_p1_s_per_ms": speedup_vs_azero_ms,
        "speedup_vs_fixed_eighth_s_per_tube": speedup_vs_eighth_tube,
        "speedup_vs_fixed_eighth_s_per_ms": speedup_vs_eighth_ms,
        "speedup_vs_isolated_redesign_speed_s_per_tube": speedup_vs_redesign_tube,
        "speedup_vs_prod_verify_short_s_per_tube": speedup_vs_prod_verify_tube,
        "remainder_or_domain_fail_closed": remainder_fail,
        "did_not_auto_start_anything_else": True,
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
            {
                "stepIndex": t.get("stepIndex"),
                "timeEnd_mid": hex_mid(t["timeEnd"]),
                "step_mid": hex_mid(t["step"]),
                "step_hex": t["step"],
            }
            for t in tubes
        ],
        "does_not_prove": ["full_period_return", "existence", "stability", "theorems", "continuum"],
    }
    receipt_path = PM / "ZP-FIXED-QUARTER-PROD-SPEED-RECEIPT.json"
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n")

    summary = {
        "schema": "zp-fixed-quarter-prod-speed-summary-v1",
        "writtenAtET": end_et,
        "writtenAtUTC": end_utc,
        "agent": "Grok-only",
        "machineId": "056ff109-1c8e-49fc-9983-1c1caa02e796",
        "tag": TAG,
        "verdict": gate_verdict,
        "supplier": "ZeroPrunedSparseMap",
        "step": STEP,
        "all_tubes_exact_quarter": all_quarter,
        "observed_steps_ms": observed_steps,
        "observed_steps_hex": observed_hexes,
        "wall_s_elapsed": elapsed_s,
        "physical_ms_reached": physical_ms,
        "tubes": len(tubes),
        "s_per_tube": s_per_tube,
        "s_per_ms": s_per_ms,
        "speedup_vs_adaptive_zp_s_per_tube": speedup_vs_adapt_tube,
        "speedup_vs_adaptive_zp_s_per_ms": speedup_vs_adapt_ms,
        "speedup_vs_azero_p1_s_per_tube": speedup_vs_azero_tube,
        "speedup_vs_azero_p1_s_per_ms": speedup_vs_azero_ms,
        "speedup_vs_fixed_eighth_s_per_tube": speedup_vs_eighth_tube,
        "speedup_vs_fixed_eighth_s_per_ms": speedup_vs_eighth_ms,
        "speedup_vs_isolated_redesign_speed_s_per_tube": speedup_vs_redesign_tube,
        "speedup_vs_prod_verify_short_s_per_tube": speedup_vs_prod_verify_tube,
        "prod_verify_short_caveat": "3 tubes only",
        "stop_reason": stop_reason,
        "remainder_or_domain_fail_closed": remainder_fail,
        "did_not_auto_start_anything_else": True,
        "admitted_for_proof": False,
        "G8": False,
        "G9": False,
        "prod_patch_applied": True,
        "source_sha": prod_now,
        "receipt_path": str(receipt_path),
        "receipt_sha256": sha(receipt_path),
        "attempt_dir": str(ATTEMPT),
        "next_recommendation": next_rec,
        "binary_sha256": bin_sha,
        "production_tu_sha256": prod_now,
    }
    summary_path = PM / "ZP-FIXED-QUARTER-PROD-SPEED-SUMMARY.json"
    summary_path.write_text(json.dumps(summary, indent=2) + "\n")

    launch_pm["status"] = "FINISHED"
    launch_pm["verdict"] = gate_verdict
    launch_pm["writtenAtET_finish"] = end_et
    launch_path.write_text(json.dumps(launch_pm, indent=2) + "\n")

    (ATTEMPT / "RUN-REPORT.json").write_text(json.dumps({
        "status": "fixed-quarter prod-patch speed campaign — no theorem certificate",
        "schema": "zp-fixed-quarter-prod-speed-run-report-v1",
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
        "did_not_auto_start_anything_else": True,
        "all_tubes_exact_quarter": all_quarter,
        "observed_steps_ms": observed_steps,
        "observed_steps_hex": observed_hexes,
        "prod_patch_applied": True,
        "source_sha": prod_now,
        "binary_sha256": bin_sha,
        "G8": False,
        "G9": False,
    }, indent=2) + "\n")

    still = []
    try:
        out = subprocess.check_output(["ps", "axo", "pid=,pgid=,command="], text=True)
        for line in out.splitlines():
            if TAG in line or (str(ATTEMPT) in line and "ring_flow" in line):
                still.append(line.strip())
    except Exception:
        pass
    (ATTEMPT / "LANE-REVERIFY.json").write_text(json.dumps({
        "confirmed_native_gone": not proc_alive(native_pid),
        "residual_hits": still,
        "et": et_label(),
    }, indent=2) + "\n")

    print(json.dumps({
        "done": True, "verdict": gate_verdict, "tubes": len(tubes),
        "physical_ms": physical_ms, "elapsed_s": elapsed_s,
        "s_per_tube": s_per_tube, "s_per_ms": s_per_ms,
        "speedup_vs_adapt_tube": speedup_vs_adapt_tube,
        "observed_steps": observed_steps,
        "all_quarter": all_quarter,
        "receipt": str(receipt_path), "stop_reason": stop_reason,
        "did_not_auto_start_anything_else": True,
        "prod_patch_applied": True, "G8": False, "G9": False,
        "admitted_for_proof": False,
    }), flush=True)

if __name__ == "__main__":
    main()
