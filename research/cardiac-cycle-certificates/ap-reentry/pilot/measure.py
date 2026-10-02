"""Run one pilot integration (timing19) as a child process and record its wall time and peak resident memory.

The child runs at nice 10, under an address-space cap (RLIMIT_AS) and with oom_score_adj 1000 (so the kernel's
out-of-memory killer would pick it before the long proof runs sharing the machine), with a wall-clock timeout.
Peak RSS is resource.getrusage(RUSAGE_CHILDREN).ru_maxrss of this wrapper after the child exits (kB on Linux).
Usage: python3 measure.py NAME TIMEOUT_S AS_CAP_GB -- timing19 ARGS...   (writes results/NAME.json)
"""
import json, os, resource, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
name, timeout_s, cap_gb = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
cmd = sys.argv[sys.argv.index("--") + 1:]
out_json = cmd[6]  # timing19's out.json argument


def pre():
    os.nice(10)
    cap = int(cap_gb * 2 ** 30)
    resource.setrlimit(resource.RLIMIT_AS, (cap, cap))
    try:
        with open("/proc/self/oom_score_adj", "w") as f:
            f.write("1000")
    except OSError:
        pass


t = time.time()
try:
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_s, preexec_fn=pre)
    rc, so, se = r.returncode, r.stdout, r.stderr
except subprocess.TimeoutExpired as e:
    rc, so, se = "timeout", (e.stdout or b"").decode() if isinstance(e.stdout, bytes) else (e.stdout or ""), ""
wall = time.time() - t
ru = resource.getrusage(resource.RUSAGE_CHILDREN)
rec = dict(name=name, command=[os.path.basename(cmd[0])] + cmd[1:6], returncode=rc, wall_s=round(wall, 2),
           user_cpu_s=round(ru.ru_utime, 2), sys_cpu_s=round(ru.ru_stime, 2),
           peak_rss_bytes=ru.ru_maxrss * 1024, peak_rss_GiB=round(ru.ru_maxrss / 2 ** 20, 3),
           address_space_cap_GiB=cap_gb, nice=10, timeout_s=timeout_s,
           host=dict(cpus=os.cpu_count(), loadavg_at_end=os.getloadavg()), stderr_tail=se[-1500:])
try:
    rec["run"] = json.load(open(out_json))
except Exception as e:  # noqa: BLE001
    rec["run"] = None
    rec["run_error"] = str(e)
json.dump(rec, open(os.path.join(HERE, "results", name + ".json"), "w"), indent=1)
print(json.dumps({k: rec[k] for k in ("name", "returncode", "wall_s", "peak_rss_GiB")}))
if rec["run"]:
    print(json.dumps({k: rec["run"][k] for k in ("steps", "mean_step_excluding_last_ms", "wall_per_step_mean_s",
                                                 "fraction_of_T", "end_c0_max_relative_diameter",
                                                 "end_derivative_max_entry_width_scaled") if k in rec["run"]}))
