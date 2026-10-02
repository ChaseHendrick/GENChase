"""Driver of the reentry proof program (ap-reentry/RUNBOOK.md). Untrusted orchestration: it prepares inputs from the
floating-point orbit, launches `ap_proof` (resuming from checkpoints after any interruption), composes, verifies and
writes a record with hashes. Every rigorous statement is made by ap_proof; this script only decides what to run.

  python3 driver.py prepare --run-dir DIR --instance N16 [--split-times 8,16,24] [--parallel-boxes 1e-7] [--jac A.npy B.npy]
  python3 driver.py prepare --run-dir DIR --instance dry3          # DRY RUN: N = 3, c = 0.15, not a rotating wave
  python3 driver.py run     --run-dir DIR [--jobs J] [--kinds c1,mp0] [--call-timeout S] [--nice 15] [--max-calls 1000]
  python3 driver.py chain   --run-dir DIR
  python3 driver.py verify  --run-dir DIR
  python3 driver.py record  --run-dir DIR
  python3 driver.py status  --run-dir DIR

Environment: AP_PROOF (path of the ap_proof binary), AP_REENTRY_WORK (float intermediates: Jacobians), as in README.
"""
import argparse, hashlib, json, os, subprocess, sys, time
import numpy as np
from common import M, Ring, run, to_capd, from_capd, write_box, write_plan, read_out, HERE, AP

STUDY = os.path.dirname(AP)
SOURCES = ["ap-reentry/proof/ring19.hpp", "ap-reentry/proof/engine.hpp", "ap-reentry/proof/ap_proof.cpp", "model/setup.hpp",
           "model/tp06_capd.hpp", "ap-reentry/proof/driver.py", "ap-reentry/proof/common.py", "ap-reentry/proof/frame_leaf.py",
           "proofs/capd-6.1.0-genchase.patch"]
CAPD_COMMIT = "03dc5628203334b214bb7d9fd63788a175521005"


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def binary():
    b = os.environ.get("AP_PROOF", "")
    if not b or not os.path.exists(b):
        sys.exit("set AP_PROOF to the ap_proof binary (RUNBOOK.md, build)")
    return b


def cfg_path(d):
    return os.path.join(d, "config.json")


# ---------------------------------------------------------------------------------------------------- prepare
def float_events(N, c, x, lo0, tmax=200.0):
    ring = Ring(N, c, M.params("author"))
    o = run(ring, x, 0.0, tmax, rtol=1e-12, method="Radau", lo0=lo0, max_step=0.01, stop=lambda e: e[1] == 1 % N and e[2] == 1)
    assert o["stopped"], "cell 1 did not cross -40 mV upward"
    return o["t"], o["events"]


def state_at(N, c, x, lo0, t):
    ring = Ring(N, c, M.params("author"))
    o = run(ring, x, 0.0, t, rtol=1e-12, method="Radau", lo0=lo0, max_step=0.01)
    return o["y"], o["lo"]


def fd_jacobian(N, c, x, h=1e-6):
    """central-difference Jacobian of rotwave.ShiftMap at x (rotwave coordinates), for the dry-run instance"""
    sys.path.insert(0, AP)
    from rotwave import ShiftMap
    sm = ShiftMap(N, c, M.params("author"), rtol=1e-12, method="Radau")
    u = sm.red(x)
    n = len(u)
    J = np.zeros((n, n))
    for k in range(n):
        e = np.zeros(n); e[k] = h
        J[:, k] = (sm.P(u + e)[0] - sm.P(u - e)[0]) / (2 * h)
    Pu, tau, ev = sm.P(u)
    return J, sm.full(Pu), tau


def cmd_prepare(a):
    d = os.path.abspath(a.run_dir)
    os.makedirs(d, exist_ok=True)
    if a.instance == "N16":
        N, c = 16, "0.035"
        sec = json.load(open(os.path.join(AP, "results", "orbit_N16_c0.035_section_state.json")))
        x = np.array(sec["x"], float)
        work = os.environ.get("AP_REENTRY_WORK", "")
        jac = a.jac or [os.path.join(work, "Jstar_N16_c0.035_0.npy"), os.path.join(work, "Jstar_N16_c0.035_152.npy")]
        dry = False
    elif a.instance == "dry3":
        N, c = 3, "0.15"
        sec = json.load(open(os.path.join(AP, "results", "orbit_N16_c0.035_section_state.json")))
        x16 = np.array(sec["x"], float)
        lo16 = x16[:16] < -40; lo16[0] = False
        Y0 = x16.reshape(19, 16)
        Y32, _ = state_at(16, 0.035, x16, lo16, 32.55)
        Y32 = Y32.reshape(19, 16)
        x = np.stack([Y0[:, 0], Y0[:, 3], Y32[:, 11]], axis=1).ravel()
        J, Pfloat, tau = fd_jacobian(N, float(c), x)
        np.save(os.path.join(d, "dry_jac.npy"), J)
        np.save(os.path.join(d, "dry_state.npy"), x)
        np.save(os.path.join(d, "dry_P_float.npy"), Pfloat)
        jac = [os.path.join(d, "dry_jac.npy")]
        dry = True
    else:
        sys.exit("unknown instance")
    state_file = os.path.join(d, "state.npy")
    np.save(state_file, x)
    frame = os.path.join(d, "frame.txt")
    r = subprocess.run([sys.executable, os.path.join(HERE, "frame_leaf.py"), "--N", str(N), "--c", c, "--state", state_file,
                        "--jac"] + jac + ["--out", frame, "--rho0", str(a.rho0)], capture_output=True, text=True, timeout=3600)
    if r.returncode:
        sys.exit("frame_leaf failed: " + r.stderr)
    frame_info = json.loads(r.stdout.strip().splitlines()[-1])
    rr = subprocess.run([binary(), "leafbox", frame, d], capture_output=True, text=True, timeout=600)
    if rr.returncode:
        sys.exit("leafbox failed: " + rr.stderr + rr.stdout)
    # events of the floating-point shift interval (from the section state)
    lo0 = x[:N] < -40
    lo0[0] = False
    tau, ev = float_events(N, float(c), x, lo0)
    internal = [e for e in ev if not (e[1] == 1 % N and e[2] == 1)]
    cuts = sorted(float(t) for t in a.split_times.split(",")) if a.split_times else []
    # segment list: cuts and internal events in time order; the last segment ends at cell 1 upward
    marks = sorted([(t, "cut", None) for t in cuts] + [(e[0], "event", e) for e in internal]) + [(tau, "terminal", None)]
    segs, lo, t0, exempt = [], lo0.copy(), 0.0, [(0, 1)]
    for i, (t, kind, e) in enumerate(marks):
        low = " ".join(str(int(v)) for v in lo)
        ex = "".join(" exempt %d %d" % ce for ce in exempt)
        if i == 0:
            start = "start affine %s point %s" % (os.path.join(d, "leaf_affine.txt"), os.path.join(d, "leaf_point.txt"))
        elif marks[i - 1][1] == "cut" and a.parallel_boxes:
            ys, los = state_at(N, float(c), x, lo0, marks[i - 1][0])
            bf = os.path.join(d, "start_box_%d.txt" % i)
            write_box(bf, to_capd(ys, N), rel=a.parallel_boxes)
            start = "start box %s" % bf
            low = " ".join(str(int(v)) for v in los)
        else:
            start = "start previous"
        if kind == "cut":
            segs.append("segment %d %s end duration %r low %s%s" % (i, start, t - t0, low, ex))
            exempt = []
        elif kind == "event":
            segs.append("segment %d %s end section %d -40 %d low %s%s" % (i, start, e[1], e[2], low, ex))
            lo[e[1]] = not lo[e[1]]
            exempt = [(e[1], e[2])]
        else:
            segs.append("segment %d %s end section %d -40 1 low %s%s" % (i, start, 1 % N, low, ex))
        t0 = t
    plan = os.path.join(d, "plan.txt")
    write_plan(plan, N, c, segs, order=a.order, mp_order=a.mp_order, mp_bits=a.mp_bits, ghk_degree=24, ghk_theta_mV=a.theta,
               checkpoint_every=a.checkpoint_every)
    cfg = dict(instance=a.instance, dry_run=dry, N=N, coupling=c, float_tau_ms=tau, float_events=[(float(t), int(k), int(s)) for t, k, s in ev],
               split_times=cuts, parallel_boxes=a.parallel_boxes, frame=frame_info, created=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
               inputs={os.path.basename(f): sha(f) for f in jac + [state_file, frame, plan]},
               status="pilot / dry run; no theorem" if dry else "prepared; no theorem until verify passes and the record is reviewed")
    json.dump(cfg, open(cfg_path(d), "w"), indent=1)
    print(json.dumps(dict(run_dir=d, N=N, segments=len(segs), tau=tau, events=cfg["float_events"], frame=frame_info)))


# ---------------------------------------------------------------------------------------------------- run
def seg_done(d, i, kind):
    f = os.path.join(d, "seg%d_%s.json" % (i, kind))
    if not os.path.exists(f):
        return None
    return json.load(open(f))["ok"]


def plan_segments(d):
    segs = []
    for line in open(os.path.join(d, "plan.txt")):
        w = line.split()
        if w and w[0] == "segment":
            segs.append(dict(index=int(w[1]), start=w[w.index("start") + 1]))
    return segs


def cmd_run(a):
    d = os.path.abspath(a.run_dir)
    b = binary()
    segs = plan_segments(d)
    kinds = a.kinds.split(",")
    log = open(os.path.join(d, "driver.log"), "a")
    calls = 0
    for kind in kinds:
        # a segment can start once its predecessor is done (start previous) or at once (affine / box start; C1 only)
        running, crashes = {}, {}
        while True:
            pending = [s for s in segs if seg_done(d, s["index"], kind) is None and s["index"] not in running]
            failed = [s["index"] for s in segs if seg_done(d, s["index"], kind) is False]
            if failed:
                log.write("%s: %s segment(s) %s failed; stopping\n" % (time.ctime(), kind, failed)); log.flush()
                print("FAILED", kind, failed)
                return 1
            if not pending and not running:
                break
            ready = [s for s in pending if s["index"] == 0 or (kind == "c1" and s["start"] != "previous")
                     or seg_done(d, s["index"] - 1, kind)]
            while ready and len(running) < a.jobs:
                s = ready.pop(0)
                cmd = ["nice", "-n", str(a.nice), "timeout", str(a.call_timeout), b, "segment", os.path.join(d, "plan.txt"),
                       str(s["index"]), kind, d]
                log.write("%s: launch %s\n" % (time.ctime(), " ".join(cmd))); log.flush()
                running[s["index"]] = subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT)
                calls += 1
            if calls > a.max_calls:
                print("too many calls"); return 1
            time.sleep(2)
            for i, pr in list(running.items()):
                if pr.poll() is not None:
                    log.write("%s: segment %d %s exited %d\n" % (time.ctime(), i, kind, pr.returncode)); log.flush()
                    del running[i]  # rc 124 (timeout): not done; relaunched next round and resumes from its checkpoint
                    if pr.returncode not in (0, 1, 124) and seg_done(d, i, kind) is None:
                        crashes[i] = crashes.get(i, 0) + 1
                        if crashes[i] >= 3:
                            print("segment %d %s crashed %d times without a record (see driver.log)" % (i, kind, crashes[i]))
                            return 1
    print("run complete:", kinds)
    return 0


def cmd_chain(a):
    d = os.path.abspath(a.run_dir)
    b = binary()
    rc = []
    for kind in ("c1", "mp0", "c0"):
        if all(seg_done(d, s["index"], kind) for s in plan_segments(d)):
            args = [b, "chain", os.path.join(d, "plan.txt"), kind, d] + ([os.path.join(d, "leaf_ref.txt")] if kind != "c1" else [])
            r = subprocess.run(args, capture_output=True, text=True, timeout=3600)
            print(r.stdout.strip(), r.stderr.strip())
            rc.append(r.returncode)
    return max(rc) if rc else 1


def cmd_verify(a):
    d = os.path.abspath(a.run_dir)
    cfg = json.load(open(cfg_path(d)))
    args = [binary(), "verify", os.path.join(d, "frame.txt"), d, os.path.join(d, "verify.json")] + (["--dry-run"] if cfg["dry_run"] else [])
    r = subprocess.run(args, capture_output=True, text=True, timeout=3600)
    print(r.stdout.strip(), r.stderr.strip())
    return r.returncode


def cmd_record(a):
    d = os.path.abspath(a.run_dir)
    cfg = json.load(open(cfg_path(d)))
    segs = plan_segments(d)
    rec = dict(schema="ap-reentry-run-record-v1", config=cfg,
               status=("DRY RUN: mechanical test of the proof program on a small instance; not a proof, no theorem"
                       if cfg["dry_run"] else "no theorem unless verify.json says verified and the record is reviewed"),
               segments={k: [json.load(open(os.path.join(d, "seg%d_%s.json" % (s["index"], k))))
                             for s in segs if os.path.exists(os.path.join(d, "seg%d_%s.json" % (s["index"], k)))]
                         for k in ("c1", "mp0", "c0")},
               verify=json.load(open(os.path.join(d, "verify.json"))) if os.path.exists(os.path.join(d, "verify.json")) else None,
               hashes={s: sha(os.path.join(STUDY, s)) for s in SOURCES},
               binary_sha256=sha(binary()), capd_commit=CAPD_COMMIT)
    try:
        rec["repository_commit"] = subprocess.run(["git", "-C", STUDY, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
        rec["sources_dirty"] = subprocess.run(["git", "-C", STUDY, "status", "--porcelain", "--"] + SOURCES, capture_output=True,
                                              text=True).stdout.strip() != ""
    except Exception:  # noqa: BLE001
        pass
    if cfg["dry_run"]:  # consistency with the floating-point map at the centre
        try:
            N = cfg["N"]
            P = np.load(os.path.join(d, "dry_P_float.npy"))
            o = read_out(os.path.join(d, "chain_mp0.out" if os.path.exists(os.path.join(d, "chain_mp0.out")) else "chain_c0.out"))
            zP = to_capd(P, N)
            # chain image is sigma P (unshifted); float P is shifted: P_cell k = image_cell k+1
            img = o["X"]
            sh = np.array([img[19 * ((k + 1) % N) + a] for k in range(N) for a in range(19)])
            rad = 0.5 * (sh[:, 1] - sh[:, 0]); mid = 0.5 * (sh[:, 0] + sh[:, 1])
            rec["dry_run_float_P_vs_centre_enclosure"] = dict(
                max_abs_diff_over_radius=float(np.max(np.abs(zP - mid) / np.maximum(rad, 1e-300))),
                max_rel_diff=float(np.max(np.abs(zP - mid) / np.maximum(np.abs(zP), 1e-300))),
                note="float rotwave.P (Radau rtol 1e-12) at the centre versus the rigorous centre enclosure; the float value is "
                     "not expected inside an enclosure narrower than its own error")
        except Exception as e:  # noqa: BLE001
            rec["dry_run_float_P_vs_centre_enclosure"] = str(e)
    json.dump(rec, open(os.path.join(d, "record.json"), "w"), indent=1)
    print("record", os.path.join(d, "record.json"))
    return 0


def cmd_status(a):
    d = os.path.abspath(a.run_dir)
    for s in plan_segments(d):
        row = []
        for k in ("c1", "mp0", "c0"):
            st = seg_done(d, s["index"], k)
            ck = os.path.exists(os.path.join(d, "seg%d_%s.ckpt" % (s["index"], k)))
            row.append("%s:%s%s" % (k, {None: "-", True: "ok", False: "FAILED"}[st], "+ckpt" if ck else ""))
        print("segment", s["index"], s["start"], " ".join(row))
    return 0


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("prepare"); p.add_argument("--run-dir", required=True); p.add_argument("--instance", required=True)
    p.add_argument("--split-times", default=""); p.add_argument("--parallel-boxes", type=float, default=0.0)
    p.add_argument("--jac", nargs="*"); p.add_argument("--rho0", type=float, default=1e-9); p.add_argument("--order", type=int, default=20)
    p.add_argument("--mp-order", type=int, default=30); p.add_argument("--mp-bits", type=int, default=128)
    p.add_argument("--theta", type=float, default=1.0); p.add_argument("--checkpoint-every", type=int, default=200)
    r = sub.add_parser("run"); r.add_argument("--run-dir", required=True); r.add_argument("--jobs", type=int, default=1)
    r.add_argument("--kinds", default="c1,mp0"); r.add_argument("--call-timeout", type=int, default=3300); r.add_argument("--nice", type=int, default=15)
    r.add_argument("--max-calls", type=int, default=100000)
    for name in ("chain", "verify", "record", "status"):
        q = sub.add_parser(name); q.add_argument("--run-dir", required=True)
    a = ap.parse_args()
    return dict(prepare=cmd_prepare, run=cmd_run, chain=cmd_chain, verify=cmd_verify, record=cmd_record, status=cmd_status)[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main() or 0)
