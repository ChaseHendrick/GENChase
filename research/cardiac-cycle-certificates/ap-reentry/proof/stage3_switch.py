"""Pilot stage 3 (SCOPING.md section 8, item 3): rigorous enclosures across the internal h/j switch at V = -40 mV.

The switch is a section split: segment 0 runs with the cell's V >= -40 (second) branch to the section {V_k = -40,
decreasing} (CAPD PoincareMap, patched; every step certified on its enclosure, the crossing certified monotone by a
validation re-run); segment 1 starts on the section (V_k = -40 exactly) with the V < -40 branch, the cell exempted
only while it is certified falling. C1: the section-to-section derivatives compose by the chain rule, which is
the saltation rule (SCOPING section 6.2). The centre kind is C0 in multiprecision (mp0, 128 bits, order 30, the
route SCOPING section 6.4 recommends) or C0 in double intervals (c0).
Cases:
  cell   one uncoupled cell from cell 11 of the N = 16 orbit at t = 32.5 ms (V = -39.78 mV, falling); 1 ms after the
         switch; kinds c1, c0, mp0; negative control c0 without the switch (the reference must fall outside).
  ring2, ring4   rings of 2 and 4 cells taken from orbit cells 10-11 and 9-12 at t = 32.6 ms (c = 0.035); 0.1 ms
         after the switch; kinds c0 and mp0, for the cost of the multiprecision centre versus N.
  ring16 the N = 16 ring on the orbit at t = 32.6 ms (cell 11 crosses at 32.676 ms); 0.1 ms after the switch; c0
         from a POINT (box radius 0): the width growth of a double-interval centre at N = 16.
Reference: the hybrid floating-point integrator (Radau rtol 1e-12, event at -40 mV) from the box centre.
Records cost (wall per step, peak RSS). Writes results/stage3_switch.json. Nothing here is a theorem.
Usage: python3 stage3_switch.py AP_PROOF WORKDIR [cases...]
"""
import json, os, sys
import numpy as np
from common import M, Ring, run, to_capd, write_box, write_plan, read_out, run_ap_rss, inside, HERE, AP

binary, work = sys.argv[1], sys.argv[2]
want = sys.argv[3:] or ["cell", "ring2", "ring4", "ring16"]
os.makedirs(work, exist_ok=True)
p = M.params("author")
sec = json.load(open(os.path.join(AP, "results", "orbit_N16_c0.035_section_state.json")))
x0 = np.array(sec["x"], float)
resfile = os.path.join(HERE, "results", "stage3_switch.json")
res = json.load(open(resfile)) if os.path.exists(resfile) else {}
res["note"] = ("Pilot stage 3: certified passage through the internal h/j switch at -40 mV (section split, branch "
               "flip, saltation by composition); cost of the C0 multiprecision centre. Pilot / dry run; no theorem.")


def orbit_state(t):
    ring = Ring(16, 0.035, p)
    lo0 = x0[:16] < -40
    lo0[0] = False
    o = run(ring, x0, 0.0, t, rtol=1e-12, method="Radau", lo0=lo0, max_step=0.01)
    return o["y"].reshape(19, 16), o["lo"]


def float_ref(N, c, x, lo, cross, t_after):
    ring = Ring(N, c, p)
    o = run(ring, x, 0.0, 50.0, rtol=1e-12, method="Radau", lo0=lo, max_step=0.01, stop=lambda e: e[1] == cross and e[2] == -1)
    assert o["stopped"], "no crossing"
    o2 = run(ring, o["y"], o["t"], o["t"] + t_after, rtol=1e-12, method="Radau", lo0=o["lo"], max_step=0.01)
    return o["t"], o["y"], o2["y"], o["events"] + o2["events"]


CASES = {}
if any(c != "cell" for c in want):
    Y32_6, lo32_6 = orbit_state(32.6)
if "cell" in want:
    Y32_5, _ = orbit_state(32.5)
    CASES["cell"] = dict(N=1, c="0", x=Y32_5[:, 11].copy(), cross=0, after=1.0, kinds=["c1", "c0", "mp0", "c0_NO_SWITCH"])
for name, cells in (("ring2", [10, 11]), ("ring4", [9, 10, 11, 12]), ("ring16", list(range(16)))):
    if name in want:
        CASES[name] = dict(N=len(cells), c="0.035", x=Y32_6[:, cells].ravel(), cross=cells.index(11), after=0.1,
                           kinds=["c0"] if name == "ring16" else ["c0", "mp0"])

for case in want:
    C = CASES[case]
    N, x, cross = C["N"], C["x"], C["cross"]
    lo = x[:N] < -40
    tstar, xstar, xend, events = float_ref(N, float(C["c"]), x, lo, cross, C["after"])
    z = to_capd(x, N)
    cdir = os.path.join(work, case)
    os.makedirs(cdir, exist_ok=True)
    box = os.path.join(cdir, "start_box.txt")
    rel = 0.0 if case == "ring16" else 1e-10  # ring16: a point start, to measure the growth of a double-interval centre
    write_box(box, z, rel=rel)
    out = res.get(case, {})
    out.update(dict(N=N, coupling=C["c"], crossing_cell=cross, float_crossing_time_ms=tstar, after_switch_ms=C["after"],
                    float_events=[(float(a), int(b), int(c)) for a, b, c in events], box_relative_radius=rel))
    low0 = " ".join(str(int(v)) for v in lo)
    lo1 = lo.copy(); lo1[cross] = True
    low1 = " ".join(str(int(v)) for v in lo1)
    segs = ["segment 0 start box %s point %s end section %d -40 -1 low %s" % (box, box, cross, low0),
            "segment 1 start previous end duration %r low %s exempt %d -1" % (C["after"], low1, cross)]
    for kname in C["kinds"]:
        kind = kname.split("_")[0]
        extra = {"negative_control_no_switch": 1} if "NO_SWITCH" in kname else {}
        rdir = os.path.join(cdir, kname)
        os.makedirs(rdir, exist_ok=True)
        for f in os.listdir(rdir):
            os.remove(os.path.join(rdir, f))
        plan = os.path.join(rdir, "plan.txt")
        write_plan(plan, N, C["c"], segs, order=20, mp_order=30, mp_bits=128, ghk_degree=24, ghk_theta_mV=1, checkpoint_every=500, **extra)
        rec = dict(kind=kind)
        tot_steps, tot_wall, peak = 0, 0.0, 0.0
        for i in range(2):
            rc, tail, wall, rss = run_ap_rss(binary, ["segment", plan, str(i), kind, rdir], os.path.join(rdir, "run.log"), timeout=3300,
                                             as_cap_gb=6)
            peak = max(peak, rss)
            jf = os.path.join(rdir, "seg%d_%s.json" % (i, kind))
            if not os.path.exists(jf):
                rec["seg%d" % i] = dict(rc=rc, ok=False, error=tail.strip().splitlines()[-1] if tail.strip() else "")
                break
            js = json.load(open(jf))
            rec["seg%d" % i] = dict(ok=js["ok"], error=js["error"], steps=js["steps"], validation_steps=js["validation_steps"],
                                    T=js["T"], wall_s=round(js["wall_s"], 3), process_wall_s=round(wall, 1), window_steps=js["window_steps"],
                                    end_c0_max_relative_diameter=js["end_c0_max_relative_diameter"])
            if kind == "c1":
                rec["seg%d" % i]["end_derivative_max_rel_width_big_entries"] = js["end_derivative_max_rel_width_big_entries"]
            tot_steps += js["steps"] + js["validation_steps"]; tot_wall += js["wall_s"]
            if not js["ok"]:
                break
        rec["peak_rss_GiB"] = round(peak, 4)
        rec["wall_per_step_s"] = round(tot_wall / max(1, tot_steps), 5)
        if all(rec.get("seg%d" % i, {}).get("ok") for i in range(2)):
            o0 = read_out(os.path.join(rdir, "seg0_%s.out" % kind))
            o1 = read_out(os.path.join(rdir, "seg1_%s.out" % kind))
            i0, inf0 = inside(to_capd(xstar, N), o0["X"])
            i1, inf1 = inside(to_capd(xend, N), o1["X"])
            rec.update(section_image_contains_reference=i0, section_info=inf0, end_contains_reference=i1, end_info=inf1,
                       crossing_time_contains_reference=bool(o0["T"][0] <= tstar <= o0["T"][1]), crossing_time=o0["T"])
            if kind == "c1":  # composed derivative: DPhi_after (seg 1) * DP_section (seg 0)
                D0 = o0["D"]; D1 = o1["D"]
                Dm = 0.5 * (D1[:, :, 0] + D1[:, :, 1]) @ (0.5 * (D0[:, :, 0] + D0[:, :, 1]))
                rec["composed_derivative_max_abs"] = float(np.abs(Dm).max())
                rec["section_derivative_row_of_crossing_cell_max_abs"] = float(np.abs(0.5 * (D0[19 * cross, :, 0] + D0[19 * cross, :, 1])).max())
        out[kname] = rec
        print(case, kname, json.dumps({k: rec.get(k) for k in ("peak_rss_GiB", "wall_per_step_s", "section_image_contains_reference",
                                                                "end_contains_reference", "crossing_time_contains_reference")}),
              json.dumps(rec.get("seg0")), json.dumps(rec.get("seg1")), flush=True)
        res[case] = out
        json.dump(res, open(resfile, "w"), indent=1)
