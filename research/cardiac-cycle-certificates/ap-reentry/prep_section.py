"""Integrate a ring state for R rotations of cell 0 with the adaptive hybrid integrator and save the state on the
section S_0 = {V_0 = -40 mV, upward} in shift-map coordinates.
Usage: python3 prep_section.py N c in(.npy|.json) R out.npz [rtol]"""
import sys, json, time
import numpy as np
import tp06_19d as M
from rotwave import ShiftMap
from hybrid import run

N, c, src, R, dst = int(sys.argv[1]), float(sys.argv[2]), sys.argv[3], int(sys.argv[4]), sys.argv[5]
rtol = float(sys.argv[6]) if len(sys.argv) > 6 else 1e-9
p = M.params("author")
sm = ShiftMap(N, c, p, rtol=rtol, method="BDF")
y = np.load(src) if src.endswith(".npy") else np.array(json.load(open(src))["y_final"])
t0 = time.time()
o = run(sm.ring, y, 0.0, 5000.0, rtol=rtol, method="BDF", stop=lambda e: e[1] == 0 and e[2] == 1)
y, lo = o["y"], o["lo"]
per, lags = [], []
for r in range(R):
    o = run(sm.ring, y, 0.0, 5000.0, rtol=rtol, method="BDF", lo0=lo, stop=lambda e: e[1] == 0 and e[2] == 1)
    acts = {}
    for te, i, d in o["events"]:
        if d == 1 and i not in acts:
            acts[i] = te
    per.append(o["t"]); lags.append([acts.get(i + 1, np.nan) - acts.get(i, 0.0 if i == 0 else np.nan) for i in range(N - 1)])
    y, lo = o["y"], o["lo"]
    print("rotation %d period %.9f  lag spread %.6f" % (r + 1, o["t"], np.nanmax(lags[-1]) - np.nanmin(lags[-1])), flush=True)
x = y.copy(); x[0] = -40.0
u = sm.red(x)
np.savez(dst, u=u, q0=sm.Q(x), periods=np.array(per), N=N, c=c)
print("saved", dst, "Q", sm.Q(x), "secs %.1f" % (time.time() - t0))
