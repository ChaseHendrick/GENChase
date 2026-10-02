#!/usr/bin/env python3
import json, os, time, subprocess, sys
from pathlib import Path
BASE = Path("<workspace>")
PM = BASE / "outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm"
ATTEMPT = BASE / "outputs/cardiac-study/tissue-ring/ring32-certification/rigorous-attempts/box20-zero-pruned-adaptive-radius3e10-grok-20261001-v1"
MARKER = PM / "_watch_n32_c1_20261001.DONE"
PIDFILE = PM / "_watch_n32_c1_20261001.watcher.pid"

def et():
    return subprocess.check_output(["date", "+%Y-%m-%dT%H:%M:%S%z"], text=True).strip()

def alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False

def pids():
    sup, nat = 36858, 36864
    for p in (ATTEMPT / "PIDS.json", ATTEMPT / "LAUNCH.json", PM / "N32-C1-LAUNCH.json"):
        if p.exists():
            try:
                d = json.loads(p.read_text())
                if d.get("supervisor_pid"):
                    sup = d["supervisor_pid"]
                if d.get("native_pid"):
                    nat = d["native_pid"]
            except Exception:
                pass
    return sup, nat

def main():
    # single-instance: if another watcher with same pidfile alive, exit
    if PIDFILE.exists():
        try:
            old = int(PIDFILE.read_text().strip())
            if old != os.getpid() and alive(old):
                # check cmdline contains this script
                try:
                    cmd = subprocess.check_output(["ps", "-p", str(old), "-o", "command="], text=True)
                    if "_watch_n32_c1_20261001.py" in cmd:
                        print(f"[{et()}] already_running pid={old}", flush=True)
                        return 0
                except Exception:
                    pass
        except Exception:
            pass
    PIDFILE.write_text(str(os.getpid()) + "\n")
    print(f"[{et()}] WATCHER_START pid={os.getpid()}", flush=True)
    deadline = time.time() + 13000
    while True:
        if MARKER.exists():
            print(f"[{et()}] marker_already_present", flush=True)
            return 0
        sup, nat = pids()
        a_sup, a_nat = alive(sup), alive(nat)
        tubes = 0
        tp = ATTEMPT / "TUBES.jsonl"
        if tp.exists():
            tubes = sum(1 for line in tp.read_text().splitlines() if line.strip())
        hb = "-"
        if (ATTEMPT / "HEARTBEAT.json").exists():
            try:
                d = json.loads((ATTEMPT / "HEARTBEAT.json").read_text())
                hb = f"t={d.get('tubes')} phys={d.get('physical_time', d.get('physical_ms'))} el={d.get('elapsed_s', 0):.0f}s st={d.get('status')}"
            except Exception:
                hb = "?"
        launch_st = "?"
        if (PM / "N32-C1-LAUNCH.json").exists():
            try:
                launch_st = json.loads((PM / "N32-C1-LAUNCH.json").read_text()).get("status", "?")
            except Exception:
                pass
        sum_pm = (PM / "N32-C1-SUMMARY.json").exists()
        sum_att = (ATTEMPT / "SUMMARY.json").exists()
        cleanup = (ATTEMPT / "CLEANUP.json").exists()
        print(
            f"[{et()}] sup={sup}/{int(a_sup)} nat={nat}/{int(a_nat)} tubes={tubes} hb=[{hb}] "
            f"launch={launch_st} sum={int(sum_pm)}/{int(sum_att)} cleanup={int(cleanup)}",
            flush=True,
        )
        reason = None
        if not a_sup and not a_nat:
            time.sleep(10)
            if not alive(sup) and not alive(nat):
                reason = "TERMINAL_PROCESSES_GONE"
        if (sum_pm or sum_att) and not alive(sup) and not alive(nat):
            reason = "TERMINAL_SUMMARY_PRESENT"
        if launch_st not in ("RUNNING", "STARTING", "?") and not alive(sup) and not alive(nat):
            reason = f"TERMINAL_LAUNCH_STATUS={launch_st}"
        if time.time() >= deadline:
            reason = "WATCH_DEADLINE"
        if reason:
            print(reason, flush=True)
            MARKER.write_text(json.dumps({"reason": reason, "et": et(), "sup": sup, "nat": nat}, indent=2) + "\n")
            return 0
        time.sleep(120)

if __name__ == "__main__":
    sys.exit(main() or 0)
