"""Newton-Krylov for the rotating-wave fixed point of the shift map (rotwave.py), resumable.
Usage: python3 solve_rw.py N c start(.json ring state | .npz previous) steps rtol [central 0/1]
Saves results/rw_N{N}_c{c}.npz (u, history)."""
import sys, json, time, os
import numpy as np
import tp06_19d as M
from rotwave import ShiftMap, newton
from hybrid import run

N, c, start, steps, rtol = int(sys.argv[1]), float(sys.argv[2]), sys.argv[3], int(sys.argv[4]), float(sys.argv[5])
central = bool(int(sys.argv[6])) if len(sys.argv) > 6 else True
p = M.params("author")
sm = ShiftMap(N, c, p, rtol=rtol)
out = "results/rw_N%d_c%g.npz" % (N, c)
hist0 = []
if start.endswith(".npz"):
    d = np.load(start, allow_pickle=True)
    u = d["u"]; q0 = float(d["q0"]); hist0 = list(d["hist"])
else:
    y = np.array(json.load(open(start))["y_final"])
    o = run(sm.ring, y, 0.0, 5000.0, rtol=1e-8, method="BDF", stop=lambda e: e[1] == 0 and e[2] == 1)
    x = o["y"].copy(); x[0] = -40.0
    u = sm.red(x); q0 = sm.Q(x)
t0 = time.time()
u, hist = newton(sm, u, q0=q0, steps=steps, central=central)
np.savez(out, u=u, q0=q0, hist=np.array(hist0 + hist, dtype=object), N=N, c=c, rtol=rtol)
print("map evaluations %d, %.1f s, saved %s" % (sm.nev, time.time() - t0, out))
