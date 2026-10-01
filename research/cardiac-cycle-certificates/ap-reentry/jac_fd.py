"""Columns [a, b) of the central-difference Jacobian of the shift map P (rotwave.py) at u from an npz file.
Resumable: saves after every column to out.npy (columns not yet done are NaN).
Usage: python3 jac_fd.py N c in.npz a b out.npy [rtol] [h] [max_seconds]"""
import sys, time, os
import numpy as np
import tp06_19d as M
from rotwave import ShiftMap

N, c, src, a, b, dst = int(sys.argv[1]), float(sys.argv[2]), sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
rtol = float(sys.argv[7]) if len(sys.argv) > 7 else 1e-11
h = float(sys.argv[8]) if len(sys.argv) > 8 else 1e-5
tmax = float(sys.argv[9]) if len(sys.argv) > 9 else 1e9
sm = ShiftMap(N, c, M.params("author"), rtol=rtol, method="Radau")
u = np.load(src)["u"]
n = len(u)
b = min(b, n)
J = np.load(dst) if os.path.exists(dst) else np.full((n, b - a), np.nan)
t0 = time.time()
done = 0
for k in range(a, b):
    if not np.isnan(J[0, k - a]):
        continue
    if time.time() - t0 > tmax:
        break
    e = np.zeros(n); e[k] = h
    J[:, k - a] = (sm.P(u + e)[0] - sm.P(u - e)[0]) / (2 * h)
    np.save(dst, J)
    done += 1
left = int(np.isnan(J[0]).sum())
print("columns %d..%d: %d computed this run, %d left, %.1f s" % (a, b, done, left, time.time() - t0))
