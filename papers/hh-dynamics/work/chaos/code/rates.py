"""Expansion and contraction rates, return times and stiffness along the periodic orbits of the horseshoe at
J*, and the Taylor radius of convergence along them (the input to the cost of a rigorous integrator).
NUMERICAL.    python3 rates.py    -> ../data/rates.json"""
import json
import numpy as np
import hhc
import pmap
import orbits
import horseshoe as hs

J = orbits.j_ours(7.8617827403)
S = hs.Setup(J)
p2 = np.array([0.08499590453730, 0.37635277095981, 0.43229451177364])
Cx, rC, TC, DPC, _, _ = pmap.newton_fixed(p2, J, 4.5, direction=+1)
d = json.load(open('../data/horseshoe_Jgo.json'))
AB = [p for p in d['periodic'] if p['code'] == 'AB'][0]


def along(x0, k, label):
    y0 = np.r_[4.5, x0]
    # returns, multipliers
    Mon = np.eye(3)
    y = y0.copy()
    T = 0.0
    for _ in range(k):
        x1, t, DP, _, umax, umin = pmap.P(y[1:], J, 4.5, direction=+1)
        Mon = DP @ Mon
        y = np.r_[4.5, x1]
        T += t
    mu = np.linalg.eigvals(Mon)
    mu = mu[np.argsort(-np.abs(mu))]
    # sample the orbit and the Jacobian spectrum along it
    _, umax, umin, Sm = hhc.run(y0, J, T, rec=400000, hmax=0.01)
    ev = np.array([np.linalg.eigvals(hhc.jacobian(r[1:5])) for r in Sm[::5]])
    re = ev.real
    out = {'label': label, 'returns': k, 'period_ms': T, 'multipliers': [float(m.real) for m in mu],
           'lyapunov_per_ms': [float(np.log(abs(m)) / T) for m in mu],
           'u_range': [float(Sm[:, 1].min()), float(Sm[:, 1].max())],
           'jacobian_real_part_range': [float(re.min()), float(re.max())],
           'stiffness_ratio_max': float(np.max(np.abs(re).max(axis=1) / np.maximum(np.abs(re).min(axis=1), 1e-12))),
           'fastest_rate_per_ms': float(-re.min())}
    print(json.dumps(out), flush=True)
    return out


res = {'J': J, 'EL': hhc.EL0}
res['orbits'] = [along(S.A, 1, 'A'), along(S.B, 1, 'B'), along(Cx, 1, 'C (G&O p2)'),
                 along(np.array(AB['x0']), 2, 'AB')]
res['C_point'] = Cx.tolist()
res['C_residual'] = float(np.abs(rC).max())
json.dump(res, open('../data/rates.json', 'w'), indent=1)
