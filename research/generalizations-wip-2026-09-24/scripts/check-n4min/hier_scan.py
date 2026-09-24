import json, sys
import numpy as np
from hier import *

d = json.load(open('kkt_mp_120.json'))
u0 = np.array([float(s) for s in d['x']])
v, eps0 = from_u(u0)
print('eps0 =', eps0, 'constraint residual at start', np.abs(cons(v, eps0)).max())
v, lam, res, ok = kkt_newton(v, eps0)
print('at eps0: P =', abs(v[-1]) / 2, 'res', res, ok)

def run(eps_list, v):
    rows = []
    for eps in eps_list:
        v, lam, res, ok = kkt_newton(v, eps)
        ev, S = reduced_hess_min(v, lam, eps)
        u = T(v, eps)
        G = np.concatenate([[1.0], u[:3]]); z = u[3:11].reshape(4, 2) @ np.array([1, 1j])
        ks = biot_savart_check(G, z)
        spread = np.abs(ks - ks.mean()).max() / abs(ks.mean())
        rows.append((eps, abs(v[-1]) / 2, res, ok, ev.min(), spread, ks.mean().real))
        print('eps %.5g  minP %.12f  res %.1e ok %s  redHess min %.3g  BS spread %.1e  Re kappa %.6f  a %s C %.4f' % (
            eps, abs(v[-1]) / 2, res, ok, ev.min(), spread, ks.mean().real, np.round(v[0:3], 4), v[5]), flush=True)
    return rows

down = [0.3, 0.28, 0.25, 0.22, 0.2, 0.17, 0.15, 0.12, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.02, 0.015, 0.01,
        0.007, 0.005, 0.003, 0.002, 0.001, 5e-4, 2e-4, 1e-4]
up = [0.32, 0.35, 0.4, 0.45, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7]
print('--- decreasing eps'); rd = run(down, v.copy())
print('--- increasing eps'); ru = run(up, v.copy())
json.dump({'down': rd, 'up': ru}, open('hier_scan.json', 'w'), default=float)
