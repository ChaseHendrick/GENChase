"""Test 5: can sigma(w) = 1^T (I+D)^{-1} s be <= 0 for some geometry?  (Only matters for the
unsigned P-formula in the statement.)  Random sampling plus Nelder-Mead / BFGS descent on
sigma/sum(s), with a min-distance report. Origin arbitrary (any w with generic geometry is
centred for some G)."""
import numpy as np, sys
from scipy.optimize import minimize

rng = np.random.default_rng(int(sys.argv[1]))

def sig(w):
    s = np.abs(w) ** 2
    d2 = np.abs(w[:, None] - w[None, :]) ** 2
    N = len(w)
    np.fill_diagonal(d2, 1.0)
    D = (s[:, None] - s[None, :]) / d2
    np.fill_diagonal(D, 0.0)
    v = np.linalg.solve(np.eye(N) + D, s)
    return v.sum() / s.sum()

def obj(x, N):
    w = x[:N] + 1j * x[N:]
    return sig(w)

for N in [3, 4, 5, 6, 8, 12]:
    # random sampling, several distributions
    best = np.inf
    for dist in range(4):
        for t in range(20000):
            if dist == 0:
                w = rng.normal(size=N) + 1j * rng.normal(size=N)
            elif dist == 1:
                w = rng.standard_cauchy(size=N) + 1j * rng.standard_cauchy(size=N)
            elif dist == 2:  # clusters
                c = rng.normal(size=2) @ np.array([1, 1j])
                w = rng.normal(size=N) * 0.05 + 1j * rng.normal(size=N) * 0.05 + np.where(rng.random(N) < 0.5, 0, c)
            else:  # near-collinear
                w = rng.normal(size=N) + 1j * rng.normal(size=N) * 1e-3
            val = sig(w)
            best = min(best, val)
    # descent
    dbest = np.inf; dmin_at = None
    for t in range(30):
        x0 = rng.normal(size=2 * N)
        r = minimize(obj, x0, args=(N,), method='Nelder-Mead', options=dict(maxiter=20000, xatol=1e-12, fatol=1e-15))
        w = r.x[:N] + 1j * r.x[N:]
        dm = min(abs(w[i] - w[j]) for i in range(N) for j in range(i + 1, N)) / np.sqrt((abs(w) ** 2).sum())
        if r.fun < dbest:
            dbest = r.fun; dmin_at = dm
    print('N=%2d  min sigma/sum s: random %.4g ; descent %.4g (rel. min pair distance there %.2g)' % (N, best, dbest, dmin_at), flush=True)
