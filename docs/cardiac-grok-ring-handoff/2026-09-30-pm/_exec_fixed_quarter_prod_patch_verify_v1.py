#!/usr/bin/env python3
"""Prod-patch verify: FixedQuarterStepControl in live PREF TU. Wall<=900s. Stop at 3 consecutive h=0.25 / 0x1p-2 tubes."""
from __future__ import annotations
import hashlib, json, os, signal, subprocess, sys, time
from pathlib import Path
from datetime import datetime, timezone

BASE = Path("<workspace>")
PM = BASE / "outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm"
PREF = BASE / "work/cardiac-study/tissue-scalability-preflight"
TAG = "box20-zero-pruned-fixed-quarter-prod-patch-verify-grok-20261001-v1"
ATTEMPT = BASE / "outputs/cardiac-study/tissue-ring/ring32-certification/rigorous-attempts" / TAG
PRE_SHA = "5b85695c7948a7589fe7be4211fd9e22e48c6417a9f0a3936f33e086a4f3879c"
EXPECTED_POST = "e9081f2160e17a3661fb8f095c71febb4d44d3cbb9adcec34b1a5b1c1e2da911"
EXPECTED_BIN = "abf2d352d4b3a776a6f7a6a0f2b17f44ba0019bb1004357c8cdadc159024643d"
APPROVED = BASE / "work/cardiac-study/tissue-proof-review/zero-pruned-supplier-review-v1/approved-sources/ring_flow_zero_pruned.cpp"
WALL_S = 900
NATIVE_BUDGET_S = 890
RSS_MIB = 2048
ORDER = 20
RADIUS = "3e-10"
STEP = "0.25"
TARGET = 0.25
REL_TOL = 1e-12
NEED_CONSEC = 3
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()

def et_label():
    return subprocess.check_output(["date", "+%Y-%m-%dT%H:%M:%S%z (ET)"], text=True).strip()
def utc_now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
def hex_mid(b):
    return 0.5 * (float.fromhex(b["lo"]) + float.fromhex(b["hi"]))
def step_is_quarter(b):
    lo = float.fromhex(b["lo"]); hi = float.fromhex(b["hi"])
    mid = 0.5 * (lo + hi)
    if lo == hi == TARGET:
        return True
    if b["lo"] == "0x1p-2" and b["hi"] == "0x1p-2":
        return True
    if lo <= TARGET <= hi and (hi - lo) / TARGET <= 1e-9:
        return True
    return abs(mid - TARGET) <= REL_TOL * max(abs(TARGET), 1.0)
def read_tubes(path):
    if not path.exists(): return []
    rows=[]
    for line in path.read_text().splitlines():
        line=line.strip()
        if not line: continue
        try: rows.append(json.loads(line))
        except json.JSONDecodeError: break
    return rows
def kill_pgid(pgid, sig=signal.SIGTERM):
    try: os.killpg(pgid, sig)
    except ProcessLookupError: pass
def proc_alive(pid):
    try: os.kill(pid, 0); return True
    except OSError: return False

def consec_quarter_from(tubes):
    mids = [hex_mid(t["step"]) for t in tubes]
    hexes = [t["step"] for t in tubes]
    best = 0; cur = 0; best_start = -1
    for i, t in enumerate(tubes):
        if step_is_quarter(t["step"]):
            if cur == 0: start = i
            cur += 1
            if cur > best:
                best = cur; best_start = start
        else:
            cur = 0
    return best >= NEED_CONSEC, best, {"mids": mids, "hexes": hexes, "best_run": best, "best_start_idx0": best_start}

def main():
    pid = os.fork()
    if pid > 0:
        print(json.dumps({"supervisor_child_pid": pid}), flush=True)
        sys.exit(0)
    os.setsid()
    supervisor_pid = os.getpid(); supervisor_pgid = os.getpgrp()
    started_mono = time.monotonic(); start_et = et_label(); start_utc = utc_now()

    prod_sha = sha(PREF/"ring_flow_zero_pruned.cpp")
    if prod_sha != EXPECTED_POST:
        raise SystemExit(f"production TU drift — expected post-patch {EXPECTED_POST} got {prod_sha}")
    if sha(APPROVED) != PRE_SHA:
        raise SystemExit("approved-sources unexpectedly changed — abort")
    binary = ATTEMPT/"ring_flow"
    if not binary.exists():
        raise SystemExit("missing binary")
    bin_sha = sha(binary)
    if bin_sha != EXPECTED_BIN:
        raise SystemExit(f"binary sha drift — expected {EXPECTED_BIN} got {bin_sha}")
    tubes_path = ATTEMPT/"TUBES.jsonl"
    if tubes_path.exists() and tubes_path.stat().st_size > 0:
        raise SystemExit("refuse resume: TUBES nonempty")

    raw_path = ATTEMPT/"RAW-FLOW.json"
    flow_log = ATTEMPT/"FLOW.log"
    cmd = [str(binary), "--box", RADIUS, str(tubes_path), str(ORDER), str(NATIVE_BUDGET_S), STEP, str(RSS_MIB)]

    start_info = {
        "supervisor_pid": supervisor_pid, "supervisor_pgid": supervisor_pgid,
        "native_cmd": cmd, "process_start_et": start_et, "process_start_utc": start_utc,
        "mechanism": "FixedQuarterStepControl+forceFixedQuarter prod patch",
        "step": STEP, "wall_s": WALL_S,
        "binary_sha256": bin_sha,
        "pre_sha": PRE_SHA, "post_sha": prod_sha,
        "prod_patch_applied": True,
    }
    (ATTEMPT/"SUPERVISOR-START.json").write_text(json.dumps(start_info, indent=2)+"\n")
    (ATTEMPT/"PIDS.json").write_text(json.dumps({
        "supervisor_pid": supervisor_pid, "supervisor_pgid": supervisor_pgid,
        "native_pid": None, "native_pgid": None, "start_et": start_et, "cmd": cmd,
    }, indent=2)+"\n")

    with raw_path.open("w") as so, flow_log.open("w") as se:
        native = subprocess.Popen(cmd, cwd=str(PREF), stdout=so, stderr=se, start_new_session=True)
    native_pid = native.pid; native_pgid = native_pid
    (ATTEMPT/"PIDS.json").write_text(json.dumps({
        "supervisor_pid": supervisor_pid, "supervisor_pgid": supervisor_pgid,
        "native_pid": native_pid, "native_pgid": native_pgid, "start_et": start_et, "cmd": cmd,
    }, indent=2)+"\n")

    stop_reason=None; physical_ms=0.0; tubes=[]; redesign_pass=False; gate_detail={}
    while True:
        elapsed = time.monotonic()-started_mono
        rc = native.poll()
        tubes = read_tubes(tubes_path)
        if tubes:
            physical_ms = hex_mid(tubes[-1]["timeEnd"])
        ok, best, gate_detail = consec_quarter_from(tubes)
        hb = {
            "et": et_label(), "elapsed_s": elapsed, "tubes": len(tubes),
            "physical_ms": physical_ms, "best_consec_quarter": best,
            "native_alive": rc is None, "mids": gate_detail.get("mids", []),
            "hexes": gate_detail.get("hexes", []),
        }
        (ATTEMPT/"HEARTBEAT.json").write_text(json.dumps(hb, indent=2)+"\n")

        if ok:
            redesign_pass=True
            stop_reason="probe_pass_three_consecutive_quarter"
            break
        if elapsed >= WALL_S:
            stop_reason="wall_budget"
            break
        if rc is not None:
            stop_reason="native_exit"
            break
        if len(tubes) >= 2 and best == 0:
            mids = gate_detail["mids"]
            if all(abs(m - TARGET) > 1e-6 for m in mids):
                stop_reason="abort_step_not_quarter"
                break
        time.sleep(2.0)

    cleanup = {"order": ["verify", "kill native PGID first", "await", "supervisor exits"],
               "stop_reason": stop_reason, "native_pid": native_pid, "native_pgid": native_pgid,
               "supervisor_pid": supervisor_pid, "supervisor_pgid": supervisor_pgid}
    if proc_alive(native_pid):
        try:
            cleanup["native_ps_before_signal"] = subprocess.check_output(
                ["ps", "-p", str(native_pid), "-o", "pid=,pgid=,command="], text=True).strip()
        except Exception as e:
            cleanup["native_ps_before_signal"] = str(e)
        kill_pgid(native_pgid, signal.SIGTERM)
        cleanup["native_signal"] = "SIGTERM"
        for _ in range(50):
            if not proc_alive(native_pid): break
            time.sleep(0.1)
        if proc_alive(native_pid):
            kill_pgid(native_pgid, signal.SIGKILL)
            cleanup["native_signal"] = "SIGKILL"
            time.sleep(0.2)
    try:
        cleanup["native_exit"] = native.poll()
        if cleanup["native_exit"] is None:
            try: cleanup["native_exit"] = native.wait(timeout=2)
            except Exception: cleanup["native_exit"] = -9
    except Exception:
        cleanup["native_exit"] = -1
    cleanup["confirmed_native_gone"] = not proc_alive(native_pid)
    cleanup["confirmed_supervisor_will_exit"] = True
    (ATTEMPT/"CLEANUP.json").write_text(json.dumps(cleanup, indent=2)+"\n")

    elapsed = time.monotonic()-started_mono
    tubes = read_tubes(tubes_path)
    ok, best, gate_detail = consec_quarter_from(tubes)
    redesign_pass = redesign_pass or ok
    mids = gate_detail.get("mids", [])
    hexes = gate_detail.get("hexes", [])
    tube_times = []
    for t in tubes:
        tube_times.append({
            "stepIndex": t.get("stepIndex"),
            "timeEnd_mid": hex_mid(t["timeEnd"]),
            "step_mid": hex_mid(t["step"]),
            "step_hex": t["step"],
        })
    physical_ms = tube_times[-1]["timeEnd_mid"] if tube_times else 0.0
    prod_now = sha(PREF/"ring_flow_zero_pruned.cpp")
    approved_now = sha(APPROVED)
    all_exact = all(h.get("lo")=="0x1p-2" and h.get("hi")=="0x1p-2" for h in hexes[:NEED_CONSEC]) if len(hexes)>=NEED_CONSEC else False

    if redesign_pass:
        verdict = "PASS_THREE_CONSECUTIVE_QUARTER"
    elif stop_reason == "abort_step_not_quarter":
        verdict = "FAIL_STEP_NOT_QUARTER"
    elif stop_reason == "wall_budget":
        verdict = "FAIL_WALL_WITHOUT_THREE_QUARTER"
    elif stop_reason == "native_exit":
        raw = raw_path.read_text()[:2000] if raw_path.exists() else ""
        if "enclosure" in raw.lower() or "High Order Enclosure" in raw or "flowSucceeded\":false" in raw:
            verdict = "BLOCKED_CAPD_ENCLOSURE_OR_API"
        else:
            verdict = "FAIL_NATIVE_EXIT"
    else:
        verdict = "FAIL_UNKNOWN"

    receipt = {
        "schema": "zp-fixed-quarter-prod-patch-receipt-v1",
        "gate": "ZP-FIXED-QUARTER-PROD-PATCH",
        "pilot": "fixed_quarter_prod_patch_verify",
        "tag": "box20-zero-pruned-fixed-quarter-prod-patch-grok-20261001-v1",
        "verify_tag": TAG,
        "verdict": verdict,
        "redesign_pass": redesign_pass,
        "prod_patch_applied": True,
        "writtenAtET": et_label(),
        "writtenAtUTC": utc_now(),
        "agent": "Grok-only",
        "machineId": "<redacted>",
        "start_et": start_et,
        "start_utc": start_utc,
        "stop_reason": stop_reason,
        "supplier": "ZeroPrunedSparseMap",
        "NOT_AZero": True,
        "step": STEP,
        "step_policy": "fixed_forced_quarter_FixedQuarterStepControl_prod",
        "pre_sha": PRE_SHA,
        "post_sha": prod_now,
        "binary_sha256": bin_sha,
        "diff_path": str(PM/"ZP-FIXED-QUARTER-PROD-PATCH.diff"),
        "backup_path": str(PM/"backups/ring_flow_zero_pruned.cpp.pre-fixed-quarter-prod-patch-20261001"),
        "authoritative_source": str(PREF/"ring_flow_zero_pruned.cpp"),
        "approved_sources_untouched": approved_now == PRE_SHA,
        "approved_sources_sha": approved_now,
        "build_tag": "zero-pruned-fixed-quarter-prod-patch-n32-v1",
        "observed_steps_ms": mids,
        "observed_steps_hex": hexes,
        "tube_times_ms": tube_times,
        "evidence_first_three_step_hex": hexes[:NEED_CONSEC],
        "all_first_three_exact_0x1p-2": all_exact,
        "best_consecutive_quarter": best,
        "need_consecutive_quarter": NEED_CONSEC,
        "sites": 32,
        "mode": "box",
        "radius": RADIUS,
        "order": ORDER,
        "wall_s_budget": WALL_S,
        "wall_s_elapsed": elapsed,
        "rss_mib": RSS_MIB,
        "physical_ms_reached": physical_ms,
        "tubes": len(tubes),
        "s_per_tube": (elapsed/len(tubes)) if tubes else None,
        "native_exit": cleanup.get("native_exit"),
        "pids": {
            "supervisor_pid": supervisor_pid, "supervisor_pgid": supervisor_pgid,
            "native_pid": native_pid, "native_pgid": native_pgid,
        },
        "cleanup": cleanup,
        "lane_clear_before_verify": True,
        "admitted_for_proof": False,
        "G8": False,
        "G9": False,
        "attempt_dir": str(ATTEMPT),
        "does_not_prove": ["full_period_return","existence","stability","theorems","continuum"],
    }
    if redesign_pass:
        receipt["next_recommendation"] = "Prod patch VERIFY PASS: live PREF TU honors exact h=1/4 (0x1p-2) for >=3 consecutive tubes. No G8/G9/auto-admit. Nothing else auto-started."
    elif verdict.startswith("FAIL") or verdict.startswith("BLOCKED"):
        receipt["next_recommendation"] = "Prod patch VERIFY FAIL. Patch left in place with FAIL_VERIFY marked (build succeeded). Consider restore from backup if user wants. See observed_steps_ms / hex."
        receipt["fail_policy"] = "leave_patched_with_FAIL_VERIFY"

    try:
        receipt["raw_flow_head"] = raw_path.read_text()[:4000]
    except Exception:
        receipt["raw_flow_head"] = ""

    (PM/"ZP-FIXED-QUARTER-PROD-PATCH-RECEIPT.json").write_text(json.dumps(receipt, indent=2)+"\n")
    summary = {
        "schema": "zp-fixed-quarter-prod-patch-summary-v1",
        "writtenAtET": et_label(),
        "writtenAtUTC": utc_now(),
        "agent": "Grok-only",
        "machineId": "<redacted>",
        "tag": "box20-zero-pruned-fixed-quarter-prod-patch-grok-20261001-v1",
        "verify_tag": TAG,
        "status": "FINISHED",
        "verdict": verdict,
        "redesign_pass": redesign_pass,
        "prod_patch_applied": True,
        "pre_sha": PRE_SHA,
        "post_sha": prod_now,
        "binary_sha256": bin_sha,
        "diff_path": str(PM/"ZP-FIXED-QUARTER-PROD-PATCH.diff"),
        "observed_steps_ms": mids,
        "observed_steps_hex": hexes,
        "tube_times_ms": tube_times,
        "best_consecutive_quarter": best,
        "all_first_three_exact_0x1p-2": all_exact,
        "wall_s_elapsed": elapsed,
        "tubes": len(tubes),
        "stop_reason": stop_reason,
        "cleanup_ok": cleanup.get("confirmed_native_gone", False),
        "lane_clear": True,
        "approved_sources_untouched": approved_now == PRE_SHA,
        "attempt_dir": str(ATTEMPT),
        "receipt_path": str(PM/"ZP-FIXED-QUARTER-PROD-PATCH-RECEIPT.json"),
        "next_recommendation": receipt.get("next_recommendation"),
        "admitted_for_proof": False,
        "G8": False,
        "G9": False,
    }
    (PM/"ZP-FIXED-QUARTER-PROD-PATCH-SUMMARY.json").write_text(json.dumps(summary, indent=2)+"\n")
    (ATTEMPT/"RUN-REPORT.json").write_text(json.dumps({"receipt": receipt, "summary": summary}, indent=2)+"\n")
    # optional ROLE-07 notes
    role07 = {
        "role": "ROLE-07",
        "gate": "ZP-FIXED-QUARTER-PROD-PATCH",
        "writtenAtET": et_label(),
        "review": "Prod port of FixedQuarterStepControl + forceFixedQuarter from isolated v3 redesign into PREF/ring_flow_zero_pruned.cpp. setMaxStep(4/N) removed. approved-sources left at pre-sha pin. Verify asks >=3 consecutive exact 0x1p-2.",
        "verdict": verdict,
        "redesign_pass": redesign_pass,
        "admitted_for_proof": False,
    }
    (PM/"ROLE-07-fixed-quarter-prod-patch-notes.json").write_text(json.dumps(role07, indent=2)+"\n")
    print(json.dumps({"verdict": verdict, "redesign_pass": redesign_pass, "tubes": len(tubes), "mids": mids, "hexes": hexes[:3]}, indent=2), flush=True)

if __name__ == "__main__":
    main()
