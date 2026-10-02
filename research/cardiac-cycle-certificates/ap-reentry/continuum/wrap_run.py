"""Driver of the CAPD wrapping pilot (wrap_pilot.cpp) on the numerical travelling wave. Measurement, not a proof.

For a collocation solution (tw_bvp.py, NUMERICAL) it builds a start box of relative radius REL around the profile
point at phase s0 (the first collocation point after s0), runs wrap_pilot for DURATION ms with the h/j branch of that
part of the orbit, and compares the end enclosure with a floating-point reference (scipy Radau, rtol 1e-12, from the
box centre). It summarizes the growth: the C0 radius, the derivative norm (the true expansion of the flow, from the
C1 run), the ratio radius / (r0 * |D|) (the excess of the enclosure over linear growth: wrapping), the relative width
of the derivative enclosure, the step size and the cost per step.
Usage: python3 wrap_run.py SOL.npz S0_MS DURATION_MS KIND REL OUT_PREFIX [--dim 21 --kappa-rel R] [--timeout S]
  S0_MS: phase on the wave (s = 0 is the upstroke crossing V = -40); the branch is that of the piece containing s0.
"""
import argparse, json, os, subprocess, sys, time
import numpy as np
from scipy.integrate import solve_ivp

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tw_model as TM  # noqa: E402
import tw_bvp as B  # noqa: E402

BIN = os.environ.get("WRAP_PILOT", "/root/bin/wrap_pilot")


def kappa_str(k):
    s = "%.12g" % k
    assert abs(float(s) - k) <= 1e-12 * k
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sol"); ap.add_argument("s0", type=float); ap.add_argument("duration", type=float)
    ap.add_argument("kind"); ap.add_argument("rel", type=float); ap.add_argument("out")
    ap.add_argument("--dim", type=int, default=20); ap.add_argument("--kappa-rel", type=float, default=0.0)
    ap.add_argument("--timeout", type=int, default=3300); ap.add_argument("--order", type=int, default=20)
    ap.add_argument("--log-every", type=int, default=1)
    a = ap.parse_args()
    x, L, mesh, kappa, H0, beta = B.load(a.sol)
    S, Y = B.profile(x, L, mesh)
    TA = x[L.iTA]
    k = int(np.searchsorted(S, a.s0))
    s0, y0 = float(S[k]), Y[:, k].copy()
    low = bool(s0 > TA)
    ks = kappa_str(kappa)
    kap = float(ks)
    z0 = y0 / TM.SIGMA
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    box = a.out + "_start.txt"
    with open(box, "w") as f:
        f.write("# wrap pilot start: phase %.6f ms of %s, relative radius %g\n" % (s0, os.path.basename(a.sol), a.rel))
        f.write("%d\n" % a.dim)
        for v in z0:
            r = a.rel * abs(v)
            f.write("%s %s\n" % (float(v - r).hex(), float(v + r).hex()))
        if a.dim == 21:
            r = a.kappa_rel * kap
            f.write("%s %s\n" % (float(kap - r).hex(), float(kap + r).hex()))
    t0 = time.time()
    cmd = ["nice", "-n", "10", "timeout", str(a.timeout), BIN, box, ks, repr(a.duration), a.kind, "low" if low else "high", a.out,
           str(a.order), "1", "24", str(a.log_every)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    wall = time.time() - t0
    res = dict(status="wrapping pilot; measurement only, no theorem", solution=os.path.basename(a.sol), kappa=ks, s0_ms=s0,
               V0_mV=float(y0[0]), branch="low" if low else "high", duration_ms=a.duration, kind=a.kind, rel_radius=a.rel,
               dim=a.dim, kappa_rel_radius=a.kappa_rel, rc=r.returncode, stdout=r.stdout.strip()[-500:], stderr=r.stderr.strip()[-500:],
               process_wall_s=round(wall, 1))
    js = a.out + ".json"
    if os.path.exists(js):
        res["pilot"] = json.load(open(js))
    tsv = a.out + ".tsv"
    if os.path.exists(tsv):
        T = np.genfromtxt(tsv, names=True, delimiter="\t")
        t, rad, Dn, Drel, h = T["t"], T["c0_max_rad_scaled"], T["D_norm_inf_mid"], T["D_rel_width_big"], T["h"]
        r0 = max(a.rel * np.max(np.abs(z0)), 1e-300)
        marks = [m for m in (0.5, 1, 2, 3, 5, 10, 15, 20, 30, 50) if m <= t[-1] + 1e-9]
        rows = []
        for m in marks:
            i = int(np.searchsorted(t, m))
            i = min(i, len(t) - 1)
            row = dict(t_ms=float(t[i]), steps=int(T["step"][i]), c0_max_radius_scaled=float(rad[i]),
                       c0_radius_over_r0=float(rad[i] / r0), V_lo=float(T["V_lo"][i]), V_hi=float(T["V_hi"][i]),
                       wall_s=float(T["wall_s"][i]))
            if a.kind == "c1":
                row.update(D_norm_inf=float(Dn[i]), wrapping_ratio_radius_over_r0_D=float(rad[i] / (r0 * max(Dn[i], 1e-300))),
                           D_rel_width_big_entries=float(Drel[i]))
            rows.append(row)
        steps = T["step"]
        hpos = h[h > 0]
        res["growth"] = rows
        res["mean_step_ms"] = float(np.mean(hpos)) if len(hpos) else None
        res["steps_per_ms"] = float(len(hpos) / max(t[-1], 1e-12))
    # floating-point reference from the box centre over the reached time
    end = a.out + ".end"
    if os.path.exists(end):
        L2 = open(end).read().split("\n")
        ok = L2[0].split()[1] == "1"
        tl, tr = (float.fromhex(v) for v in L2[1].split())
        n = int(L2[2])
        X = np.array([[float.fromhex(v) for v in L2[3 + i].split()] for i in range(n)])
        tend = 0.5 * (tl + tr)
        f = lambda s, y: TM.field(y, kap, low)  # noqa: E731
        jacf = lambda s, y: TM.jac(y, kap, low)  # noqa: E731
        sol = solve_ivp(f, (0.0, tend), y0, method="Radau", rtol=1e-12, atol=1e-14 * TM.SIGMA, jac=jacf, max_step=0.01)
        yref = sol.y[:, -1] / TM.SIGMA
        lo, hi = X[:20, 0], X[:20, 1]
        inside = bool(np.all((yref >= lo) & (yref <= hi)))
        rad = 0.5 * (hi - lo)
        res["end"] = dict(ok=ok, t=[tl, tr], reference_inside=inside, reference_solver_success=bool(sol.success),
                          max_dist_to_mid_over_radius=float(np.max(np.abs(yref - 0.5 * (lo + hi)) / np.maximum(rad, 1e-300))),
                          max_rel_width=float(np.max(2 * rad / np.maximum(np.abs(0.5 * (lo + hi)), 1e-3))),
                          V_end_mV=float(0.5 * (lo[0] + hi[0]) * TM.SIGMA[0]))
    json.dump(res, open(a.out + "_summary.json", "w"), indent=1)
    print(json.dumps({k: v for k, v in res.items() if k != "growth"}, indent=1))
    for row in res.get("growth", []):
        print(json.dumps(row))


if __name__ == "__main__":
    main()
