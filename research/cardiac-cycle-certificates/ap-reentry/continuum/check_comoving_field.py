"""Cross-check of the CAPD comoving field (comoving19.hpp, via comoving_field) against tw_model.py. Test, not a proof.

Points: random states around the standard TP06 state with V spread over [-90, 45] mV and W over [-60, 350] mV/ms,
kappa in {0.8, 2.3, 4.1}, both h/j branches, the GHK factor as the quotient (|V - 15| > 0.5 mV) and as the degree-24
window polynomial (|V - 15| < 8 mV). Passes if every Python value lies in the C++ enclosure widened by 1e-12 relative
(the Python model is floating point), and the first integral H agrees likewise.
Negative control: the same comparison with the C++ field evaluated at kappa * (1 + 1e-6) must FAIL (Python value
outside the widened enclosure) at almost every point, so the check can detect a wrong kappa factor.
Writes results/check_comoving_field.json.
Usage: python3 check_comoving_field.py COMOVING_FIELD_BINARY WORKDIR
"""
import json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tw_model as TM  # noqa: E402

binary, work = sys.argv[1], sys.argv[2]
os.makedirs(work, exist_ok=True)
rng = np.random.default_rng(20261002)
pts = []
for kappa in ("0.8", "2.3", "4.1"):
    for low in (0, 1):
        for poly in (0, 1):
            for _ in range(25):
                y = np.concatenate([TM.M.Y0 * (1 + 0.05 * rng.standard_normal(19)), [rng.uniform(-60, 350)]])
                if poly:
                    y[0] = 15 + rng.uniform(-8, 8)
                else:
                    v = rng.uniform(-90, 45)
                    y[0] = v if abs(v - 15) > 0.5 else v + 1.0
                if low and y[0] > -40:
                    pass  # the branch formulas are evaluated off their side too (both are finite); compared as formulas
                pts.append((kappa, low, poly, y))


def run(kfac, tag):
    pf = os.path.join(work, "points_%s.txt" % tag)
    of = os.path.join(work, "out_%s.txt" % tag)
    with open(pf, "w") as f:
        for kappa, low, poly, y in pts:
            ks = ("%.10g" % (float(kappa) * kfac)) if kfac != 1.0 else kappa
            z = y / TM.SIGMA
            f.write("%s %d %d 24 %s\n" % (ks, low, poly, " ".join(float(v).hex() for v in z)))
    subprocess.run([binary, pf, of], check=True, timeout=600)
    rows = [[float.fromhex(t) for t in ln.split()] for ln in open(of)]
    inside_all, worst_rel, n_out = True, 0.0, 0
    for (kappa, low, poly, y), r in zip(pts, rows):
        F = np.array(r[:40]).reshape(20, 2) * TM.SIGMA[:, None]
        Hc = np.array(r[40:42])
        fp = TM.field(y, float(kappa), bool(low))
        hp = TM.H(y, float(kappa))
        lo = F[:, 0] - 1e-12 * np.abs(fp) - 1e-300
        hi = F[:, 1] + 1e-12 * np.abs(fp) + 1e-300
        ins = bool(np.all((fp >= lo) & (fp <= hi)) and Hc[0] - 1e-12 * abs(hp) <= hp <= Hc[1] + 1e-12 * abs(hp))
        inside_all &= ins
        n_out += not ins
        mid = 0.5 * (F[:, 0] + F[:, 1])
        worst_rel = max(worst_rel, float(np.max(np.abs(mid - fp) / np.maximum(np.abs(fp), 1e-12))))
    return dict(points=len(pts), python_inside_all=inside_all, points_outside=n_out, max_rel_difference_midpoint=worst_rel)


NEG = "negative_control_kappa_times_1_plus_1e-6"
res = {"note": "Floating-point cross-check of comoving19.hpp against tw_model.py; test, not a proof.",
       "check": run(1.0, "check"), NEG: run(1 + 1e-6, "neg")}
res["passed"] = bool(res["check"]["python_inside_all"] and res[NEG]["points_outside"] > 0.9 * len(pts))
os.makedirs(os.path.join(HERE, "results"), exist_ok=True)
json.dump(res, open(os.path.join(HERE, "results", "check_comoving_field.json"), "w"), indent=1)
print(json.dumps(res, indent=1))
sys.exit(0 if res["passed"] else 1)
