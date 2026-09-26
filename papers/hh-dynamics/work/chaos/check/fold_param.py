"""Fold location by natural continuation in the h gate (monotone through the fold): for fixed h solve
P(g) = g for (m, n, J), then fit J(h) by a parabola. NUMERICAL."""
import json, sys
import numpy as np
import hhk

def solve(h, X0):
    X = X0.copy()  # (m, n, J)
    for it in range(20):
        g = np.r_[X[:2], h]
        x, info, M = hhk.P(g, X[2], var=True)
        r = x - g
        dJ = 1e-6
        xp, _ = hhk.P(g, X[2] + dJ); xm, _ = hhk.P(g, X[2] - dJ)
        K = np.c_[(M - np.eye(3))[:, :2], (xp - xm) / (2 * dJ)]
        d = np.linalg.solve(K, -r)
        X += d
        if np.abs(d).max() < 1e-12:
            break
    mu = np.linalg.eigvals(M)
    return X, np.abs(r).max(), mu, info['t']

center, width = float(sys.argv[1]), float(sys.argv[2])
X = np.array([float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])])
hs = center + width * np.linspace(-1, 1, 9)
rows = []
for h in hs:
    X, r, mu, T = solve(h, X)
    rows.append((h, X[2], r, sorted(mu.real), T, X[0], X[1]))
    print(h, repr(X[2]), r, np.sort(mu.real), T, flush=True)
H = np.array([q[0] for q in rows]); J = np.array([q[1] for q in rows])
c = np.polyfit(H - center, J, 4)
rr = np.roots(np.polyder(c)); rr = rr[np.isreal(rr)].real; rr = rr[np.argmin(abs(rr))]
print('fold h', center + rr, 'J_fold', repr(np.polyval(c, rr)), 'fit resid', np.abs(np.polyval(c, H - center) - J).max())
