"""Claim 5: pseudo-arclength continuation of fixed points of P in (gates, J), from A at J* toward lower J,
through the fold, along the B family through the period doubling, to the next fold. NUMERICAL.
Folds: extremum of J along the branch (and a multiplier through +1); PD: a real multiplier through -1.
Located by cubic interpolation in arclength of J(s) resp. mu(s) + 1 on the four nearest points."""
import json, sys
import numpy as np
import hhk

Js = 7.861806449482496
A = np.array(json.load(open('../data/horseshoe_Jgo.json'))['A'])


def PJ(g, J, var=True):
    return hhk.P(g, J, var=var)


def jacobian(X):
    g, J = X[:3], X[3]
    x, info, M = hhk.P(g, J, var=True)
    dJ = 1e-6
    xp, _ = hhk.P(g, J + dJ); xm, _ = hhk.P(g, J - dJ)
    K = np.zeros((3, 4)); K[:, :3] = M - np.eye(3); K[:, 3] = (xp - xm) / (2 * dJ)
    return x - g, K, M, info


def tangent(K, tprev):
    _, _, Vt = np.linalg.svd(K)
    t = Vt[-1]
    if tprev is not None and t @ tprev < 0:
        t = -t
    return t


import sys
RESTART = len(sys.argv) > 1
if RESTART:
    q = json.load(open('continuation.json'))[-1]
    X = np.r_[q['g'], q['J']]
else:
    X = np.r_[A, Js]
r, K, M, info = jacobian(X)
t = tangent(K, None)
if (t[3] > 0) != RESTART:
    t = -t   # start toward lower J (or higher J on restart)
ds = 2e-4
pts = []
Jmax_stop = None
nfold = 1 if RESTART else 0
steps = 0
while steps < 3000:
    steps += 1
    Xp = X + ds * t
    Y = Xp.copy()
    ok = False
    for it in range(8):
        r, K, M, info = jacobian(Y)
        G = np.r_[r, t @ (Y - Xp)]
        JJ = np.vstack([K, t])
        dY = np.linalg.solve(JJ, -G)
        Y += dY
        if np.abs(dY).max() < 1e-10 * max(1.0, np.abs(M).max() / 30):
            ok = True
            break
    if not ok:
        print("newton fail", Y[3], np.abs(dY).max(), np.abs(r).max(), info["status"], info["umax"], flush=True)
    if not ok or info['status'] != 0 or info['umax'] > 50:
        ds *= 0.5
        if ds < 1e-8:
            print('stuck'); break
        continue
    r, K, M, info = jacobian(Y)
    tn = tangent(K, t)
    mu = np.linalg.eigvals(M)
    mu = mu[np.argsort(-np.abs(mu))]
    pts.append(dict(J=Y[3], g=list(Y[:3]), mu=[str(m) for m in mu], T=info['t'], resid=float(np.abs(r).max()),
                    tJ=tn[3], umax=info['umax']))
    if len(pts) > 1 and np.sign(pts[-1]['tJ']) != np.sign(pts[-2]['tJ']):
        nfold += 1
        print('fold between', pts[-2]['J'], pts[-1]['J'], flush=True)
    X, t = Y, tn
    ds = min(ds * (1.3 if it < 4 else 1.0), 2e-3)
    if steps % 5 == 0:
        print(steps, Y[3], mu, info['t'], flush=True)
    if nfold >= 2 and len(pts) > 20 and pts[-1]['J'] < pts[-20]['J'] - 1e-3:
        break
    if nfold >= 2 and len(pts) > 5:
        # a few points past the second fold
        if sum(1 for p in pts[-8:] if p['tJ'] < 0) >= 6 and pts[-1]['J'] > 7.9:
            break
json.dump(pts, open('continuation2.json' if RESTART else 'continuation.json', 'w'), indent=0)
print('done', len(pts))
