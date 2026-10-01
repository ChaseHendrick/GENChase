#!/usr/bin/env python3
"""Fixed h=0.25 ZeroPruned N=32 speed pilot v3. Isolated maxStep>=0.25 attempt TU. Stop ~1ms. No h=1/8 auto."""
from __future__ import annotations
import hashlib, json, os, signal, subprocess, sys, time
from pathlib import Path
from datetime import datetime, timezone

BASE = Path("/Users/chasehendrick/Documents/Codex/2026-09-29/github-plugin-github-openai-curated-remote")
PM = BASE / "outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm"
PREF = BASE / "work/cardiac-study/tissue-scalability-preflight"
TAG = "box20-zero-pruned-fixed-quarter-radius3e10-speed-pilot-grok-20260930-v3"
ATTEMPT = BASE / "outputs/cardiac-study/tissue-ring/ring32-certification/rigorous-attempts" / TAG
EXPECTED_BIN = "12234f1e184a08dc779cf17cf56632252b53d9192dfe331b9a05014269d52b21"
PROD_TU = "5b85695c7948a7589fe7be4211fd9e22e48c6417a9f0a3936f33e086a4f3879c"
WALL_S = 3600
NATIVE_BUDGET_S = 3595
RSS_MIB = 2048
STOP_MS = 1.0
STEP = "0.25"
ORDER = 20
RADIUS = "3e-10"
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

def main():
    pid = os.fork()
    if pid > 0:
        print(json.dumps({"supervisor_child_pid": pid}), flush=True)
        sys.exit(0)
    os.setsid()
    supervisor_pid = os.getpid(); supervisor_pgid = os.getpgrp()
    started_mono = time.monotonic(); start_et = et_label(); start_utc = utc_now()

    if sha(PREF/"ring_flow_zero_pruned.cpp") != PROD_TU:
        raise SystemExit("production TU drift")
    binary = ATTEMPT/"ring_flow"
    if sha(binary) != EXPECTED_BIN:
        raise SystemExit(f"v3 binary sha mismatch {sha(binary)}")
    # refuse if tubes already progressing (resume)
    if (ATTEMPT/"TUBES.jsonl").exists() and (ATTEMPT/"TUBES.jsonl").stat().st_size > 0:
        raise SystemExit("refuse resume: TUBES nonempty")

    tubes_path = ATTEMPT/"TUBES.jsonl"
    raw_path = ATTEMPT/"RAW-FLOW.json"
    flow_log = ATTEMPT/"FLOW.log"
    cmd = [str(binary), "--box", RADIUS, str(tubes_path), str(ORDER), str(NATIVE_BUDGET_S), STEP, str(RSS_MIB)]

    start_info = {"supervisor_pid": supervisor_pid, "supervisor_pgid": supervisor_pgid,
                  "native_cmd": cmd, "process_start_et": start_et, "process_start_utc": start_utc,
                  "isolated_maxstep": "I(1)/I(4)", "step": STEP}
    (ATTEMPT/"SUPERVISOR-START.json").write_text(json.dumps(start_info, indent=2)+"\n")
    launch_pm = json.loads((PM/"ZP-FIXED-QUARTER-V3-LAUNCH.json").read_text())
    launch_pm.update(start_info)
    (PM/"ZP-FIXED-QUARTER-V3-LAUNCH.json").write_text(json.dumps(launch_pm, indent=2)+"\n")

    with raw_path.open("w") as so, flow_log.open("w") as se:
        native = subprocess.Popen(cmd, cwd=str(PREF), stdout=so, stderr=se, start_new_session=True)
    native_pid = native.pid; native_pgid = native_pid
    (ATTEMPT/"PIDS.json").write_text(json.dumps({
        "supervisor_pid": supervisor_pid, "supervisor_pgid": supervisor_pgid,
        "native_pid": native_pid, "native_pgid": native_pgid, "start_et": start_et, "cmd": cmd,
    }, indent=2)+"\n")
    launch_pm["native_pid"]=native_pid; launch_pm["native_pgid"]=native_pgid
    (PM/"ZP-FIXED-QUARTER-V3-LAUNCH.json").write_text(json.dumps(launch_pm, indent=2)+"\n")

    stop_reason=None; physical_ms=0.0; tubes=[]; poll_s=2.0
    while True:
        elapsed = time.monotonic()-started_mono
        rc = native.poll()
        tubes = read_tubes(tubes_path)
        if tubes:
            physical_ms = hex_mid(tubes[-1]["timeEnd"])
            # early integrity: first completed fixed steps should be ~0.25 (allow first possibly smaller)
            if len(tubes) >= 2:
                s2 = hex_mid(tubes[1]["step"])
                if abs(s2 - 0.25) > 1e-6:
                    stop_reason = "abort_step_not_quarter"
                    break
            if hex_lo(tubes[-1]["timeEnd"]) >= STOP_MS or physical_ms >= STOP_MS:
                stop_reason = "stop_physical_ms_reached"; break
        if rc is not None:
            stop_reason = "native_exited"; break
        if elapsed >= WALL_S:
            stop_reason = "wall_time_cap"; break
        if int(elapsed) % 30 < poll_s:
            (ATTEMPT/"HEARTBEAT.json").write_text(json.dumps({
                "elapsed_s": elapsed, "tubes": len(tubes), "physical_ms": physical_ms,
                "native_alive": rc is None, "et": et_label(),
                "last_step": hex_mid(tubes[-1]["step"]) if tubes else None,
            }, indent=2)+"\n")
        time.sleep(poll_s)

    cleanup={"order":["verify","kill native first","await"], "stop_reason": stop_reason,
             "native_pid": native_pid, "native_pgid": native_pgid,
             "supervisor_pid": supervisor_pid, "supervisor_pgid": supervisor_pgid}
    if native.poll() is None:
        try: ps=subprocess.check_output(["ps","-p",str(native_pid),"-o","pid=,pgid=,command="], text=True).strip()
        except subprocess.CalledProcessError: ps=""
        cleanup["native_ps_before_signal"]=ps
        if str(ATTEMPT) in ps or "ring_flow" in ps:
            kill_pgid(native_pgid, signal.SIGTERM); cleanup["native_signal"]="SIGTERM"
            for _ in range(30):
                if native.poll() is not None: break
                time.sleep(0.5)
            if native.poll() is None:
                kill_pgid(native_pgid, signal.SIGKILL); cleanup["native_signal_escalation"]="SIGKILL"
                try: native.wait(timeout=10)
                except Exception: pass
        else:
            cleanup["native_signal"]="skipped_identity_mismatch"
    else:
        cleanup["native_signal"]="already_exited"
    cleanup["native_exit"]=native.poll()
    cleanup["confirmed_native_gone"]=not proc_alive(native_pid)
    (ATTEMPT/"CLEANUP.json").write_text(json.dumps(cleanup, indent=2)+"\n")

    elapsed_s = time.monotonic()-started_mono
    tubes = read_tubes(tubes_path)
    if tubes: physical_ms = hex_mid(tubes[-1]["timeEnd"])
    raw={}
    try:
        txt=raw_path.read_text().strip()
        if txt: raw=json.loads(txt.splitlines()[-1])
    except Exception as e:
        raw={"parse_error": str(e)}

    guards_ok = all(len(t.get("domainGuards",[]))==4384 for t in tubes) if tubes else False
    coords_ok = all(len(t.get("physicalTube",[]))==576 for t in tubes) if tubes else False
    s_per_tube = (elapsed_s/len(tubes)) if tubes else None
    s_per_ms = (elapsed_s/physical_ms) if physical_ms>0 else None
    steps = [hex_mid(t["step"]) for t in tubes]
    true_quarter = len(tubes)>=2 and all(abs(s-0.25)<1e-6 for s in steps[1:])  # allow first transient

    remainder_fail=False
    err=str(raw.get("error","")) if isinstance(raw, dict) else ""
    flow_txt=""
    try: flow_txt=(ATTEMPT/"FLOW.log").read_text()[-2000:]
    except Exception: pass
    blob=(err+" "+flow_txt).lower()
    if stop_reason=="native_exited" and raw.get("flowSucceeded") is False:
        if any(k in blob for k in ("remainder","domain","inclusion","transversality","concentration","pole","failed")):
            remainder_fail = "Failed parsing string" not in err

    cli_parse_fail = "Failed parsing string" in err
    if stop_reason=="abort_step_not_quarter":
        gate_verdict="ABORT_STEP_NOT_QUARTER"
    elif cli_parse_fail:
        gate_verdict="FAIL_CLI_STEP_PARSE"
    elif stop_reason=="native_exited" and (remainder_fail or (raw.get("flowSucceeded") is False and physical_ms < STOP_MS)):
        gate_verdict="FAIL_CLOSED_REMAINDER_OR_DOMAIN"
    elif stop_reason=="stop_physical_ms_reached" and tubes and guards_ok and coords_ok and true_quarter:
        gate_verdict="PASS_REACHED_1MS"
    elif stop_reason=="stop_physical_ms_reached" and tubes and guards_ok and not true_quarter:
        gate_verdict="REACHED_1MS_BUT_NOT_TRUE_QUARTER_STEPS"
    elif stop_reason=="wall_time_cap" and physical_ms>=STOP_MS and true_quarter:
        gate_verdict="PASS_REACHED_1MS"
    elif stop_reason=="wall_time_cap":
        gate_verdict="INCOMPLETE_WALL"
    else:
        gate_verdict="PARTIAL_OR_UNKNOWN"

    if gate_verdict.startswith("FAIL_CLOSED"):
        next_rec="FAIL_CLOSED remainder/domain: report only. Do NOT auto-start h=1/8."
    elif gate_verdict=="PASS_REACHED_1MS":
        next_rec="True fixed h=0.25 reached ~1ms. Compare speedups. No G8/G9/full return without named go. Do not auto-start h=1/8."
    else:
        next_rec="PM review; do NOT auto-start h=1/8; no G8/G9."

    end_et=et_label(); end_utc=utc_now()
    speedup_vs_adapt_tube=(ZP_ADAPT_S_TUBE/s_per_tube) if s_per_tube else None
    speedup_vs_adapt_ms=(ZP_ADAPT_S_MS/s_per_ms) if s_per_ms else None
    speedup_vs_azero_tube=(AZ_P1_S_TUBE/s_per_tube) if s_per_tube else None
    speedup_vs_azero_ms=(AZ_P1_S_MS/s_per_ms) if s_per_ms else None

    receipt={
      "schema":"zp-fixed-quarter-speed-receipt-v1","pilot":"fixed_h_quarter_speed","tag":TAG,
      "verdict":gate_verdict,"writtenAtET":end_et,"writtenAtUTC":end_utc,"agent":"Grok-only",
      "machineId":"056ff109-1c8e-49fc-9983-1c1caa02e796","start_et":start_et,"start_utc":start_utc,
      "stop_reason":stop_reason,"supplier":"ZeroPrunedSparseMap","NOT_AZero":True,
      "step":STEP,"step_policy":"fixed","isolated_maxstep_patch":"setMaxStep(I(1)/I(4)) attempt-local only",
      "production_ring_flow_zero_pruned_untouched": sha(PREF/"ring_flow_zero_pruned.cpp")==PROD_TU,
      "true_quarter_steps_from_tube2": true_quarter, "observed_steps_ms": steps,
      "sites":32,"mode":"box","radius":RADIUS,"order":ORDER,
      "wall_s_budget":WALL_S,"wall_s_elapsed":elapsed_s,"rss_mib":RSS_MIB,
      "physical_ms_reached":physical_ms,"stop_physical_ms_target":STOP_MS,
      "tubes":len(tubes),"s_per_tube":s_per_tube,"s_per_ms":s_per_ms,
      "guards_ok_all_tubes":guards_ok,"coords_ok_all_tubes":coords_ok,
      "binary_sha256":EXPECTED_BIN,
      "baselines":{"adaptive_zeropruned_s_per_tube":ZP_ADAPT_S_TUBE,"adaptive_zeropruned_s_per_ms":ZP_ADAPT_S_MS,
                   "azero_p1_s_per_tube":AZ_P1_S_TUBE,"azero_p1_s_per_ms":AZ_P1_S_MS},
      "speedup_vs_adaptive_zp_s_per_tube":speedup_vs_adapt_tube,
      "speedup_vs_adaptive_zp_s_per_ms":speedup_vs_adapt_ms,
      "speedup_vs_azero_p1_s_per_tube":speedup_vs_azero_tube,
      "speedup_vs_azero_p1_s_per_ms":speedup_vs_azero_ms,
      "remainder_or_domain_fail_closed": remainder_fail and gate_verdict.startswith("FAIL_CLOSED"),
      "did_not_auto_start_h_eighth":True,"admitted_for_proof":False,"G8":False,"G9":False,
      "full_period_return":False,"spatial_existence_certified":False,"spatial_stability_certified":False,
      "attempt_dir":str(ATTEMPT),"raw_flow":raw if isinstance(raw,dict) else {"raw":raw},
      "native_exit":native.poll(),"pids":{"supervisor_pid":supervisor_pid,"supervisor_pgid":supervisor_pgid,
                                          "native_pid":native_pid,"native_pgid":native_pgid},
      "cleanup":cleanup,"next_recommendation":next_rec,
      "tube_times_ms":[{"stepIndex":t["stepIndex"],"timeEnd_mid":hex_mid(t["timeEnd"]),"step_mid":hex_mid(t["step"])} for t in tubes],
      "does_not_prove":["full_period_return","existence","stability","theorems","continuum"],
    }
    receipt_path=PM/"ZP-FIXED-QUARTER-V3-SPEED-RECEIPT.json"
    receipt_path.write_text(json.dumps(receipt, indent=2)+"\n")
    summary={
      "schema":"zp-fixed-quarter-speed-summary-v1","writtenAtET":end_et,"writtenAtUTC":end_utc,
      "agent":"Grok-only","machineId":"056ff109-1c8e-49fc-9983-1c1caa02e796","tag":TAG,
      "verdict":gate_verdict,"supplier":"ZeroPrunedSparseMap","step":STEP,
      "true_quarter_steps_from_tube2":true_quarter,"observed_steps_ms":steps,
      "wall_s_elapsed":elapsed_s,"physical_ms_reached":physical_ms,"tubes":len(tubes),
      "s_per_tube":s_per_tube,"s_per_ms":s_per_ms,
      "speedup_vs_adaptive_zp_s_per_tube":speedup_vs_adapt_tube,
      "speedup_vs_adaptive_zp_s_per_ms":speedup_vs_adapt_ms,
      "speedup_vs_azero_p1_s_per_tube":speedup_vs_azero_tube,
      "speedup_vs_azero_p1_s_per_ms":speedup_vs_azero_ms,
      "stop_reason":stop_reason,"remainder_or_domain_fail_closed":receipt["remainder_or_domain_fail_closed"],
      "did_not_auto_start_h_eighth":True,"admitted_for_proof":False,"G8":False,"G9":False,
      "receipt_path":str(receipt_path),"receipt_sha256":sha(receipt_path),
      "attempt_dir":str(ATTEMPT),"next_recommendation":next_rec,"binary_sha256":EXPECTED_BIN,
      "production_ring_flow_zero_pruned_untouched":True,
    }
    (PM/"ZP-FIXED-QUARTER-V3-SUMMARY.json").write_text(json.dumps(summary, indent=2)+"\n")
    (ATTEMPT/"RUN-REPORT.json").write_text(json.dumps({
      "status":"fixed-quarter v3 speed pilot — no theorem certificate",
      "tag":TAG,"supplier":"ZeroPrunedSparseMap","step":STEP,"isolated_maxstep":"I(1)/I(4)",
      "flow_seconds":elapsed_s,"step_count":len(tubes),"last_time_mid_ms":physical_ms,
      "stop_reason":stop_reason,"flow_succeeded":False,"admitted_for_proof":False,
      "verdict":gate_verdict,"command":cmd,"native_exit":native.poll(),
      "did_not_auto_start_h_eighth":True,"true_quarter_steps_from_tube2":true_quarter,
    }, indent=2)+"\n")
    print(json.dumps({"done":True,"verdict":gate_verdict,"tubes":len(tubes),"physical_ms":physical_ms,
                      "elapsed_s":elapsed_s,"s_per_tube":s_per_tube,"steps":steps,
                      "true_quarter":true_quarter,"stop_reason":stop_reason,
                      "did_not_auto_start_h_eighth":True}, flush=True))

if __name__=="__main__":
    main()
