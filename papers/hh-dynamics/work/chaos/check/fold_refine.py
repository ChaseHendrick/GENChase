"""Refine the fold (multiplier +1) and the PD (multiplier -1) by Newton on the augmented system
[P(g) - g, det(DP(g) - sI)] = 0 in (g, J), s = +1 or -1, with finite-difference Jacobians. NUMERICAL."""
import json, sys
import numpy as np
import hhk

p = json.load(open('continuation.json'))
ev = json.load(open('continuation_events.json'))


def G(X, sgn):
    x, info, M = hhk.P(X[:3], X[3], var=True)
    return np.r_[x - X[:3], np.linalg.det(M - sgn * np.eye(3))], info, M


out = {}
for key, e in ev.items():
    sgn = 1.0 if key.startswith('fold') else -1.0
    i = int(np.argmin([abs(q['J'] - e['J']) for q in p]))
    X = np.r_[p[i]['g'], p[i]['J']]
    for it in range(12):
        g0, info, M = G(X, sgn)
        K = np.zeros((4, 4))
        for k in range(4):
            h = 1e-7 if k < 3 else 1e-6
            d = np.zeros(4); d[k] = h
            K[:, k] = (G(X + d, sgn)[0] - G(X - d, sgn)[0]) / (2 * h)
        dX = np.linalg.solve(K, -g0)
        X += dX
        print(key, it, X[3], np.abs(dX).max(), np.abs(g0).max(), flush=True)
        if np.abs(dX).max() < 1e-11:
            break
    g0, info, M = G(X, sgn)
    out[key] = dict(J=X[3], g=list(X[:3]), resid=list(g0), mu=[str(m) for m in np.linalg.eigvals(M)], T=info['t'])
    print(key, out[key])
json.dump(out, open('fold_refine.json', 'w'), indent=1)
