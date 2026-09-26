"""Polish the periodic points A, B, C and AB at J* in 256-bit arithmetic: chord Newton x <- x - (DP - I)^{-1}
(P^k(x) - x) with the float64 derivative DP and the high-precision Taylor return map of taylor_hp.py.
NUMERICAL (the Taylor remainder is controlled, not enclosed).   python3 hp_newton.py -> ../data/hp_points.json"""
import json
import numpy as np
from flint import arb
import taylor_hp as tp
import pmap

tp.EL = None
EL = tp.el_exact()
d = json.load(open('../data/horseshoe_Jgo.json'))
r = json.load(open('../data/rates.json'))
J = arb(repr(d['J']))
Jf = d['J']
AB = [p for p in d['periodic'] if p['code'] == 'AB'][0]['x0']


def Php(x, k):
    y = [arb(4.5)] + list(x)
    T = arb(0)
    for _ in range(k):
        y, t = tp.to_section(y, J, EL)
        T = T + t
    return y[1:], T


out = {'J': d['J'], 'EL': EL.mid().str(30), 'points': []}
for label, x0, k in [('A', d['A'], 1), ('B', d['B'], 1), ('C', r['C_point'], 1), ('AB', AB, 2)]:
    DP = np.eye(3)
    y = np.array(x0)
    for _ in range(k):
        y1, T, D, _, _, _ = pmap.P(y, Jf, 4.5, direction=+1)
        DP = D @ DP
        y = y1
    M = np.linalg.inv(DP - np.eye(3))
    x = [arb(repr(v)) for v in x0]
    hist = []
    for it in range(6):
        px, T = Php(x, k)
        F = [px[i] - x[i] for i in range(3)]
        Ff = np.array([float(f.mid()) for f in F])
        res = float(max(abs(f.mid()) for f in F))
        hist.append(res)
        print(label, 'iteration', it, 'residual %.3e' % res, flush=True)
        if res < 1e-40:
            break
        dx = -M @ Ff
        # the float64 step loses digits; do the step in arb with the float matrix
        x = [x[i] - sum(arb(float(M[i, j])) * F[j] for j in range(3)) for i in range(3)]
        x = [arb(v.mid()) for v in x]
    out['points'].append({'label': label, 'returns': k, 'x': [v.mid().str(30) for v in x],
                          'residual_history': hist, 'period_ms': T.mid().str(25),
                          'float64_minus_hp': [float((arb(repr(x0[i])) - x[i]).mid()) for i in range(3)]})
    print(out['points'][-1], flush=True)
json.dump(out, open('../data/hp_points.json', 'w'), indent=1)
