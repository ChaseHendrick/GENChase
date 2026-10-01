"""Columns [a, b) of the central-difference Jacobian of the shift map P (rotwave.py) at u from an npz file.
Usage: python3 jac_fd.py N c in.npz a b out.npy [rtol] [h]"""
import sys, time
import numpy as np
import tp06_19d as M
from rotwave import ShiftMap

N, c, src, a, b, dst = int(sys.argv[1]), float(sys.argv[2]), sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
rtol = float(sys.argv[7]) if len(sys.argv) > 7 else 1e-11
h = float(sys.argv[8]) if len(sys.argv) > 8 else 1e-5
sm = ShiftMap(N, c, M.params("author"), rtol=rtol, method="Radau")
u = np.load(src)["u"]
n = len(u)
b = min(b, n)
J = np.empty((n, b - a))
t0 = time.time()
for k in range(a, b):
    e = np.zeros(n); e[k] = h
    J[:, k - a] = (sm.P(u + e)[0] - sm.P(u - e)[0]) / (2 * h)
np.save(dst, J)
print("columns %d..%d done in %.1f s" % (a, b, time.time() - t0))
