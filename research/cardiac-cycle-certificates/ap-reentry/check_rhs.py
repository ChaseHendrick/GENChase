"""Compare the C right-hand side (libtp06.so via hybrid.Ring with $TP06_LIB) with tp06_19d.py on random ring states."""
import os, sys
import numpy as np
import tp06_19d as M
from hybrid import Ring

rng = np.random.default_rng(3)
for conv in ("author", "erhardt"):
    p = M.params(conv)
    worst = 0.0
    for trial in range(50):
        N = int(rng.integers(3, 20))
        Y = np.repeat(M.Y0[:, None], N, axis=1)
        Y[0] = rng.uniform(-90, 50, N); Y[1:14] = rng.uniform(0.01, 0.99, (13, N))
        Y[14] = rng.uniform(5e-5, 1e-3, N); Y[15] = rng.uniform(1, 4, N); Y[16] = rng.uniform(5e-5, 5e-3, N)
        Y[17] = rng.uniform(8, 14, N); Y[18] = rng.uniform(130, 140, N)
        lo = rng.random(N) < 0.5
        istim = rng.uniform(0, 52, N)
        a = Ring(N, 0.033, p, fast=True); b = Ring(N, 0.033, p, fast=False)
        assert a.lib is not None, "set TP06_LIB"
        fa = a.rhs(0.0, Y.ravel(), lo, istim); fb = b.rhs(0.0, Y.ravel(), lo, istim)
        worst = max(worst, np.max(np.abs(fa - fb) / (np.abs(fb) + 1e-12 * np.repeat(np.abs(Y).max(axis=1), N))))
        Z = np.stack([Y.ravel() * (1 + 1e-3 * rng.standard_normal(19 * N)) for _ in range(3)], axis=1)
        ga = a.rhs(0.0, Z, lo, istim); gb = b.rhs(0.0, Z, lo, istim)
        worst = max(worst, np.max(np.abs(ga - gb) / (np.abs(gb) + 1e-9)))
    print(conv, "max relative difference C vs numpy:", worst)
