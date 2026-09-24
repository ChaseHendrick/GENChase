# Feasibility test at fixed P: with b frozen, try to solve the self-similarity equations from random starts.
# If P is below the global min, no solution should exist.
import sys, json
import numpy as np
from nv import Model, biot_savart_check

P = float(sys.argv[1]); nstart = int(sys.argv[2]); seed = int(sys.argv[3])
b = 2 * P
m = Model(4)
rng = np.random.default_rng(seed)

def res(w):
    return m.res(np.concatenate([w, [b]]))
def jac(w):
    return m.jac(np.concatenate([w, [b]]))[:, :-1]

found = []
nconv = 0
for s in range(nstart):
    w = np.empty(11)
    mode = s % 3
    if mode == 0:     # generic random
        w[:3] = rng.uniform(-1, 1, 3)
        r = np.sqrt(rng.uniform(0, 1, 4)) * 0.6
    elif mode == 1:   # hierarchical-like start: weak cluster near a strong vortex
        w[:3] = rng.uniform(-0.4, 0.4, 3)
        r = np.concatenate([[rng.uniform(0, 0.05)], rng.uniform(0.2, 0.6, 1).repeat(3) + rng.normal(0, 0.05, 3)])
    else:             # wide circulations
        w[:3] = rng.uniform(-3, 3, 3)
        r = np.sqrt(rng.uniform(0, 1, 4)) * 1.0
    th = rng.uniform(0, 2 * np.pi, 4)
    if mode == 1:
        th[1:] = th[1] + rng.normal(0, 0.15, 3)
    w[3:] = np.column_stack([r * np.cos(th), r * np.sin(th)]).ravel()
    ok = False
    for it in range(200):
        rr = res(w)
        nr = np.linalg.norm(rr)
        if not np.isfinite(nr):
            break
        if nr < 1e-12:
            ok = True; break
        J = jac(w)
        try:
            step = J.T @ np.linalg.solve(J @ J.T + 1e-12 * np.eye(9), rr)
        except np.linalg.LinAlgError:
            break
        t = 1.0
        while t > 1e-8:
            wn = w - t * step
            if np.linalg.norm(res(wn)) < nr:
                break
            t *= 0.5
        if t <= 1e-8:
            break
        w = wn
    if ok:
        G = np.concatenate([[1.0], w[:3]]); z = w[3:].reshape(4, 2) @ np.array([1, 1j])
        D = np.abs(z[:, None] - z[None, :]) + 1e9 * np.eye(4)
        ks = biot_savart_check(G, z)
        sp = np.abs(ks - ks.mean()).max() / abs(ks.mean())
        if D.min() > 1e-6 and sp < 1e-8:
            nconv += 1
            found.append({'G': G.tolist(), 'dmin': float(D.min()), 'kappa': [ks.mean().real, ks.mean().imag]})
print('P', P, 'starts', nstart, 'solutions found', nconv)
json.dump(found[:50], open('fixedP_%g_s%d.json' % (P, seed), 'w'))
