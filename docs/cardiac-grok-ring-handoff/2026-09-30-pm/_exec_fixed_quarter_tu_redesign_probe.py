#!/usr/bin/env python3
"""Short probe: isolated fixed-quarter TU redesign. Wall<=300s. Stop at 3 consecutive h=0.25 tubes."""
from __future__ import annotations
import hashlib, json, os, signal, subprocess, sys, time
from pathlib import Path
from datetime import datetime, timezone

BASE = Path("/Users/chasehendrick/Documents/Codex/2026-09-29/github-plugin-github-openai-curated-remote")
PM = BASE / "outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm"
PREF = BASE / "work/cardiac-study/tissue-scalability-preflight"
TAG = "box20-zero-pruned-fixed-quarter-tu-redesign-probe-grok-20261001-v1"
ATTEMPT = BASE / "outputs/cardiac-study/tissue-ring/ring32-certification/rigorous-attempts" / TAG
PROD_TU = "5b85695c7948a7589fe7be4211fd9e22e48c6417a9f0a3936f33e086a4f3879c"
WALL_S = 300
NATIVE_BUDGET_S = 290
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
    # exact I(1)/I(4) thin, or mid within rel tol of 0.25
    if lo == hi == TARGET:
        return True
    # interval that tightly brackets 0.25 (maxStep-style)
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
    """Return (ok, count, detail). Allow optional leading non-quarter cut-in; need NEED_CONSEC consecutive quarters somewhere, prefer from tube2 like prior gates OR from tube1 if all quarter."""
    mids = [hex_mid(t["step"]) for t in tubes]
    hexes = [t["step"] for t in tubes]
    # count max consecutive quarters
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

    if sha(PREF/"ring_flow_zero_pruned.cpp") != PROD_TU:
        raise SystemExit("production TU drift — abort")
    binary = ATTEMPT/"ring_flow"
    if not binary.exists():
        raise SystemExit("missing binary")
    bin_sha = sha(binary)
    tubes_path = ATTEMPT/"TUBES.jsonl"
    if tubes_path.exists() and tubes_path.stat().st_size > 0:
        raise SystemExit("refuse resume: TUBES nonempty")

    raw_path = ATTEMPT/"RAW-FLOW.json"
    flow_log = ATTEMPT/"FLOW.log"
    cmd = [str(binary), "--box", RADIUS, str(tubes_path), str(ORDER), str(NATIVE_BUDGET_S), STEP, str(RSS_MIB)]

    start_info = {
        "supervisor_pid": supervisor_pid, "supervisor_pgid": supervisor_pgid,
        "native_cmd": cmd, "process_start_et": start_et, "process_start_utc": start_utc,
        "redesign": "forceFixedQuarter before every move", "step": STEP, "wall_s": WALL_S,
        "binary_sha256": bin_sha, "production_tu_sha256": PROD_TU,
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
        # early abort if we have tubes but none are quarter and we have >=2 (same failure mode as V3/V4)
        if len(tubes) >= 2 and best == 0:
            # check if clearly not quarter (not just waiting)
            mids = gate_detail["mids"]
            if all(abs(m - TARGET) > 1e-6 for m in mids):
                stop_reason="abort_step_not_quarter"
                break
        time.sleep(2.0)

    # dual PGID cleanup: native first
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
    (ATTEMPT/"CLEANUP.json").write_text(json.dumps(cleanup, indent=2)+"\n")

    elapsed = time.monotonic()-started_mono
    tubes = read_tubes(tubes_path)
    ok, best, gate_detail = consec_quarter_from(tubes)
    redesign_pass = redesign_pass or ok
    mids = gate_detail.get("mids", [])
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

    if redesign_pass:
        verdict = "PASS_THREE_CONSECUTIVE_QUARTER"
    elif stop_reason == "abort_step_not_quarter":
        verdict = "FAIL_STEP_NOT_QUARTER"
    elif stop_reason == "wall_budget":
        verdict = "FAIL_WALL_WITHOUT_THREE_QUARTER"
    elif stop_reason == "native_exit":
        # check RAW for enclosure failure
        raw = raw_path.read_text()[:2000] if raw_path.exists() else ""
        if "enclosure" in raw.lower() or "High Order Enclosure" in raw or "flowSucceeded\":false" in raw:
            verdict = "BLOCKED_CAPD_ENCLOSURE_OR_API"
        else:
            verdict = "FAIL_NATIVE_EXIT"
    else:
        verdict = "FAIL_UNKNOWN"

    receipt = {
        "schema": "zp-fixed-quarter-tu-redesign-probe-speed-receipt-v1",
        "pilot": "fixed_quarter_tu_redesign_probe",
        "tag": TAG,
        "verdict": verdict,
        "redesign_pass": redesign_pass,
        "prod_untouched": prod_now == PROD_TU,
        "writtenAtET": et_label(),
        "writtenAtUTC": utc_now(),
        "agent": "Grok-only",
        "machineId": "056ff109-1c8e-49fc-9983-1c1caa02e796",
        "start_et": start_et,
        "start_utc": start_utc,
        "stop_reason": stop_reason,
        "supplier": "ZeroPrunedSparseMap",
        "NOT_AZero": True,
        "step": STEP,
        "step_policy": "fixed_forced_quarter_redesign",
        "isolated_tu_only": True,
        "awaiting_user_for_prod_patch": False,
        "production_ring_flow_zero_pruned_untouched": prod_now == PROD_TU,
        "production_tu_sha256": prod_now,
        "binary_sha256": bin_sha,
        "observed_steps_ms": mids,
        "tube_times_ms": tube_times,
        "best_consecutive_quarter": best,
        "need_consecutive_quarter": NEED_CONSEC,
        "gate_detail": gate_detail,
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
        "admitted_for_proof": False,
        "G8": False,
        "G9": False,
        "attempt_dir": str(ATTEMPT),
        "does_not_prove": ["full_period_return","existence","stability","theorems","continuum"],
    }
    # next recommendation
    if redesign_pass:
        receipt["next_recommendation"] = "Redesign probe PASS: true h=1/4 tubes recorded. Optionally authorize longer speed pilot on isolated binary; prod patch still requires named gate awaiting_user_for_prod_patch=true."
    elif verdict == "BLOCKED_CAPD_ENCLOSURE_OR_API":
        receipt["next_recommendation"] = "CAPD enclosure/API hard limit at h=1/4 with forced fixed step. Document and stop; do not invent success. Consider smaller order or accept h=1/8 as max honored fixed step on this Poincare path."
        receipt["awaiting_user_for_prod_patch"] = False
    else:
        receipt["next_recommendation"] = "Redesign probe did not honor 0.25. See observed_steps_ms / tube hex. Report only; no prod patch; no G8/G9."

    # raw flow snippet
    try:
        raw_txt = raw_path.read_text()[:4000]
        receipt["raw_flow_head"] = raw_txt
    except Exception:
        receipt["raw_flow_head"] = ""

    (PM/"ZP-FIXED-QUARTER-TU-REDESIGN-SPEED-RECEIPT.json").write_text(json.dumps(receipt, indent=2)+"\n")
    summary = {
        "schema": "zp-fixed-quarter-tu-redesign-probe-summary-v1",
        "writtenAtET": et_label(),
        "writtenAtUTC": utc_now(),
        "agent": "Grok-only",
        "machineId": "056ff109-1c8e-49fc-9983-1c1caa02e796",
        "tag": TAG,
        "verdict": verdict,
        "redesign_pass": redesign_pass,
        "prod_untouched": prod_now == PROD_TU,
        "observed_steps_ms": mids,
        "tube_times_ms": tube_times,
        "best_consecutive_quarter": best,
        "wall_s_elapsed": elapsed,
        "tubes": len(tubes),
        "stop_reason": stop_reason,
        "binary_sha256": bin_sha,
        "production_tu_sha256": prod_now,
        "attempt_dir": str(ATTEMPT),
        "receipt_path": str(PM/"ZP-FIXED-QUARTER-TU-REDESIGN-SPEED-RECEIPT.json"),
        "next_recommendation": receipt["next_recommendation"],
        "admitted_for_proof": False,
        "G8": False,
        "G9": False,
    }
    (PM/"ZP-FIXED-QUARTER-TU-REDESIGN-SUMMARY.json").write_text(json.dumps(summary, indent=2)+"\n")
    (ATTEMPT/"RUN-REPORT.json").write_text(json.dumps({"receipt": receipt, "summary": summary}, indent=2)+"\n")
    print(json.dumps({"verdict": verdict, "redesign_pass": redesign_pass, "tubes": len(tubes), "mids": mids}, indent=2), flush=True)

if __name__ == "__main__":
    main()
