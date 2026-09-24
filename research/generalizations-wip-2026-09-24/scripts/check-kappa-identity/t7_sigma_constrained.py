"""Test 7: minimise sigma/sum(s) subject to min pair distance >= delta * rms radius and
|w_j| >= 0 free, for several delta; re-evaluate each minimiser at 50 digits.
Also a sympy check of the row identity for N=3 (symbolic)."""
import numpy as np, mpmath as mp, sympy as sp, sys
from scipy.optimize import minimize

rng = np.random.default_rng(11)
mp.mp.dps = 50

def sig_np(w):
    s = np.abs(w) ** 2; N = len(w)
    d2 = np.abs(w[:, None] - w[None, :]) ** 2; np.fill_diagonal(d2, 1.0)
    D = (s[:, None] - s[None, :]) / d2; np.fill_diagonal(D, 0.0)
    return np.linalg.solve(np.eye(N) + D, s).sum() / s.sum()

def sig_mp(w):
    N = len(w); s = [abs(x) ** 2 for x in w]
    A = mp.eye(N)
    for j in range(N):
        for k in range(N):
            if j != k:
                A[j, k] = (s[j] - s[k]) / abs(w[j] - w[k]) ** 2
    v = mp.lu_solve(A, mp.matrix(s))
    return mp.fsum([v[j] for j in range(N)]) / mp.fsum(s)

def obj(x, N, delta):
    w = x[:N] + 1j * x[N:]
    w = w / np.sqrt((abs(w) ** 2).mean())
    dm = min(abs(w[i] - w[j]) for i in range(N) for j in range(i + 1, N))
    pen = 1e3 * max(0.0, delta - dm) ** 2
    return sig_np(w) + pen

for N in [3, 4, 5, 6, 8]:
    for delta in [0.3, 0.1, 0.03]:
        best = None
        for t in range(12):
            r = minimize(obj, rng.normal(size=2 * N), args=(N, delta), method='Nelder-Mead',
                         options=dict(maxiter=40000, xatol=1e-12, fatol=1e-15))
            if best is None or r.fun < best.fun:
                best = r
        w = best.x[:N] + 1j * best.x[N:]
        w = w / np.sqrt((abs(w) ** 2).mean())
        dm = min(abs(w[i] - w[j]) for i in range(N) for j in range(i + 1, N))
        wm = [mp.mpc(float(a.real), float(a.imag)) for a in w]
        print('N=%d delta=%.2f: min sigma/sum s = %s (50-digit re-eval), achieved min dist %.3g, min |w| %.3g' % (
            N, delta, mp.nstr(sig_mp(wm), 8), dm, min(abs(w))), flush=True)

# symbolic row identity, N = 3
z = sp.symbols('z1:4'); G = sp.symbols('g1:4', real=True)
for j in range(3):
    lhs = 2 * sum(G[k] * z[j] / (z[j] - z[k]) for k in range(3) if k != j)   # = 4 pi i conj(q_j)
    rhs = sum(G) - G[j] + sum(G[k] * (z[j] + z[k]) / (z[j] - z[k]) for k in range(3) if k != j)
    print('sympy row identity j=%d:' % j, sp.simplify(lhs - rhs) == 0)
