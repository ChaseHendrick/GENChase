"""Upper fold: natural continuation of the B family in J from the end of continuation2.json, secant predictor,
step halved on failure; then a local fit of J against the h gate at the last points. NUMERICAL."""
import json
import numpy as np
import hhk

q = json.load(open('continuation2.json'))
pts = [(np.array(q[-40]['g']), q[-40]['J']), (np.array(q[-1]['g']), q[-1]['J'])]
dJ = 2e-3
rows = []
while dJ > 1e-8:
    (g0, J0), (g1, J1) = pts[-2], pts[-1]
    J = J1 + dJ
    g = g1 + (g1 - g0) * (J - J1) / (J1 - J0)
    ok = False
    for it in range(15):
        x, info, M = hhk.P(g, J, var=True)
        if info['status'] != 0 or info['umax'] > 50:
            break
        d = np.linalg.solve(M - np.eye(3), -(x - g))
        g = g + d
        if np.abs(d).max() > 1e-4:
            break
        if np.abs(d).max() < 1e-13:
            ok = True
            break
    if ok and abs(g[2] - g1[2]) < 50 * abs(g1[2] - g0[2]) * max(1, dJ / (J1 - J0)):
        x, info, M = hhk.P(g, J, var=True)
        mu = np.sort(np.linalg.eigvals(M).real)
        pts.append((g.copy(), J))
        rows.append(dict(J=J, g=list(g), mu=list(mu), T=info['t'], resid=float(np.abs(x - g).max()), umax=info['umax']))
        print(repr(J), g, mu, info['t'], flush=True)
    else:
        dJ /= 2
json.dump(rows, open('upper_fold.json', 'w'), indent=0)
