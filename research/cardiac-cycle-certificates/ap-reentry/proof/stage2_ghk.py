"""Pilot stage 2 (SCOPING.md section 8, item 2): the GHK window node and its remainder bound on a single cell
crossing V = 15 mV, rigorous C0 and C1 runs of ap_proof (N = 1), with negative controls.

Cases (single uncoupled baseline cell, author convention, states taken from the converged N = 16 orbit):
  fast: cell 0 of the orbit at the section (V = -40, rising): the upstroke crosses 15 mV at about 0.63 ms; 1 ms.
  slow: cell 13 of the orbit at the section (V = 15.85, plateau): drifts across 15 mV at about 22.5 ms; 25 ms.
Runs per case: C1 (window degree 24) and C0 (degree 24) are the positive tests; C0 with degree 4 shows a large
remainder handled by the Gronwall inflation; negative controls: C0 degree 4 WITHOUT inflation (the reference must
fall outside), C0 forcing the quotient representation through 15 mV (the run must stop). Theta (window when
|V - 15| < theta on the set's hull) is 8 mV so that the window is used for most of the slow case.
Reference: tp06_19d (1/exprel, no window) integrated with Radau rtol 1e-12 from the box centre to the midpoint of
the certified segment time. Writes results/stage2_ghk.json. Nothing here is a theorem.
Usage: python3 stage2_ghk.py AP_PROOF WORKDIR DENSE_NPZ [cases...]
"""
import json, os, sys, time
import numpy as np
from common import M, Ring, run, to_capd, from_capd, write_box, write_plan, read_out, run_ap, inside, HERE

binary, work, dense = sys.argv[1], sys.argv[2], sys.argv[3]
want = sys.argv[4:] or ["fast", "slow"]
os.makedirs(work, exist_ok=True)
d = np.load(dense)
Y = d["y"].reshape(19, 16, -1)
p = M.params("author")
ring = Ring(1, 0.0, p)
resfile = os.path.join(HERE, "results", "stage2_ghk.json")
res = json.load(open(resfile)) if os.path.exists(resfile) else {}
res["note"] = ("Pilot stage 2: GHK window (series around 15 mV, Bernoulli coefficients, tail bound, Gronwall C0/C1 "
               "inflation) on one uncoupled cell; rigorous CAPD runs compared with a floating-point reference. "
               "Pilot / dry run; no theorem.")
CASES = {"fast": (0, 1.0, True), "slow": (13, 25.0, False)}
RUNS = [("c1_K24", "c1", 24, {}), ("c0_K24", "c0", 24, {}), ("c0_K4", "c0", 4, {"apriori": 1e-6}),
        ("c0_K4_NO_INFLATION", "c0", 4, {"apriori": 1e-6, "negative_control_no_inflation": 1}),
        ("c0_FORCE_QUOTIENT", "c0", 24, {"negative_control_force_quotient": 1})]
for case in want:
    cell, dur, at_section = CASES[case]
    x = Y[:, cell, 0].copy()
    z = to_capd(x, 1)
    cdir = os.path.join(work, case)
    os.makedirs(cdir, exist_ok=True)
    box = os.path.join(cdir, "start_box.txt")
    write_box(box, z, rel=1e-10, point_rows=(0,) if at_section else ())
    out = res.get(case, {})
    out.update(dict(cell_of_orbit=cell, duration_ms=dur, V0_mV=float(x[0]), box_relative_radius=1e-10))
    for name, kind, K, extra in RUNS:
        rdir = os.path.join(cdir, name)
        os.makedirs(rdir, exist_ok=True)
        for f in os.listdir(rdir):
            os.remove(os.path.join(rdir, f))
        seg = "segment 0 start box %s point %s end duration %r low 0%s" % (box, box, dur, " exempt 0 1" if at_section else "")
        plan = os.path.join(rdir, "plan.txt")
        write_plan(plan, 1, "0", [seg], order=20, ghk_degree=K, ghk_theta_mV=8, checkpoint_every=2000, **extra)
        rc, txt, wall = run_ap(binary, ["segment", plan, "0", kind, rdir], os.path.join(rdir, "run.log"), timeout=3000)
        jf = os.path.join(rdir, "seg0_%s.json" % kind)
        if not os.path.exists(jf):  # the process stopped without writing a record (e.g. filib aborts on an overflow)
            rec = dict(rc=rc, ok=False, error="process stopped without a record: " + txt.strip().splitlines()[-1] if txt.strip() else "no output",
                       wall_s=round(wall, 2))
            out[name] = rec
            print(case, name, json.dumps(rec), flush=True)
            continue
        js = json.load(open(jf))
        rec = dict(rc=rc, ok=js["ok"], error=js["error"], steps=js["steps"], window_steps=js["window_steps"],
                   wall_s=round(wall, 2), wall_per_step_s=round(wall / max(1, js["steps"]), 5), T=js["T"],
                   gronwall=js["gronwall"], end_c0_max_relative_diameter=js["end_c0_max_relative_diameter"])
        if kind == "c1":
            rec["end_derivative_max_rel_width_big_entries"] = js["end_derivative_max_rel_width_big_entries"]
        if js["ok"]:
            o = read_out(os.path.join(rdir, "seg0_%s.out" % kind))
            tmid = 0.5 * (o["T"][0] + o["T"][1])
            ref = run(ring, x, 0.0, tmid, rtol=1e-12, method="Radau", lo0=np.array([False]), max_step=0.01)
            zr = to_capd(ref["y"], 1)
            ins, info = inside(zr, o["X"])
            rec.update(reference_inside=ins, **info, reference_events=len(ref["events"]))
            if kind == "c1":  # derivative vs central differences (Radau rtol 1e-12, step 1e-6 in scaled units)
                J = np.zeros((19, 19))
                for j in range(19):
                    if at_section and j == 0:
                        continue
                    hj = 1e-6 * max(abs(z[j]), 1e-3)
                    zp, zm = z.copy(), z.copy(); zp[j] += hj; zm[j] -= hj
                    a = run(ring, from_capd(zp, 1), 0.0, tmid, rtol=1e-12, method="Radau", lo0=np.array([False]), max_step=0.01)["y"]
                    b = run(ring, from_capd(zm, 1), 0.0, tmid, rtol=1e-12, method="Radau", lo0=np.array([False]), max_step=0.01)["y"]
                    J[:, j] = (to_capd(a, 1) - to_capd(b, 1)) / (2 * hj)
                Dm = 0.5 * (o["D"][:, :, 0] + o["D"][:, :, 1])
                cols = [j for j in range(19) if not (at_section and j == 0)]
                rec["derivative_mid_vs_central_difference_max_abs"] = float(np.max(np.abs(Dm[:, cols] - J[:, cols])))
                rec["derivative_max_abs_entry"] = float(np.max(np.abs(Dm)))
        out[name] = rec
        print(case, name, json.dumps({k: rec.get(k) for k in ("ok", "error", "steps", "window_steps", "wall_s", "reference_inside",
                                                               "max_rel_dist_to_mid", "max_rel_width", "max_out_over_radius")}), flush=True)
    res[case] = out
    json.dump(res, open(resfile, "w"), indent=1)
