"""Compare the CAPD vector field (double and interval) with the Python reference at random physiological states.

Each component must agree with the Python value to a relative 1e-10 (double), and the interval enclosure must
contain a 50-digit mpmath evaluation of the same decimal model. Usage: python3 compare_rhs.py <compare_rhs binary>
"""
import os, random, subprocess, sys
import mpmath as mp
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "model"))
from tp06_18d import PARAMS, field  # noqa: E402

mp.mp.dps = 50
random.seed(20261001)
pts = []
for _ in range(40):
    V = random.uniform(-90, 40)
    gates = [random.uniform(0.001, 0.999) for _ in range(13)]
    conc = [random.uniform(5e-5, 1e-3), random.uniform(0.5, 5), random.uniform(5e-5, 5e-3), random.uniform(5, 15)]
    pts.append([V] + gates + conc)
inp = "\n".join(" ".join(repr(v) for v in p) for p in pts) + "\n"
out = subprocess.run([sys.argv[1]], input=inp, capture_output=True, text=True, check=True).stdout.split("\n")
rows = [list(map(float, l.split())) for l in out if l.strip()]


class MPM:  # mpmath namespace with exact decimal constants: the Python source uses float literals,
    exp, log, sqrt = mp.exp, mp.log, mp.sqrt  # so the mp check converts the evaluation point exactly and
    # accepts the float-literal rounding (relative ~1e-16) through the tolerance below.


worst_d = 0.0; worst_out = 0.0
for k, p in enumerate(pts):
    fpy = field(p, PARAMS)
    fmp = field([mp.mpf(v) for v in p], {kk: mp.mpf(str(vv)) for kk, vv in PARAMS.items()}, M=MPM)
    for i in range(18):
        d, lo, hi = rows[18 * k + i]
        ref = fpy[i]
        worst_d = max(worst_d, abs(d - ref) / max(1e-300, abs(ref)))
        v = float(fmp[i])
        tol = 1e-13 * max(abs(v), 1e-30)
        if not (lo - tol <= v <= hi + tol):
            worst_out = max(worst_out, min(abs(v - lo), abs(v - hi)) / max(abs(v), 1e-300))
            print("outside enclosure", k, i, lo, hi, v)
print(f"points {len(pts)}; worst relative double difference {worst_d:.2e}; enclosure misses beyond float-literal tolerance: {worst_out:.2e}")
sys.exit(0 if worst_d < 1e-10 and worst_out == 0 else 1)
