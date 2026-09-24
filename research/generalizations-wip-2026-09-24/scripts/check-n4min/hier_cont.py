# Careful continuation of the constrained minimum in eps (weak-cluster strength), keeping a local min.
import json
import numpy as np
from hier import *

d = json.load(open('kkt_mp_120.json'))
u0 = np.array([float(s) for s in d['x']])
v, eps = from_u(u0)
v, lam, res, ok = kkt_newton(v, eps)
rows = []
fac = 0.97
target = 3e-4
while eps > target:
    e_new = max(eps * fac, target)
    v_new, lam_new, res, ok = kkt_newton(v.copy(), e_new, maxit=40, tol=1e-11)
    ev, S = reduced_hess_min(v_new, lam_new, e_new) if ok else (np.array([-1.0]), None)
    if ok and ev.min() > 0 and np.abs(v_new - v)[:3].max() < 0.05:
        v, lam, eps = v_new, lam_new, e_new
        rows.append((eps, abs(v[-1]) / 2, ev.min(), *v[0:3], v[5]))
        fac = min(0.97, fac ** 0.7)
    else:
        fac = fac ** 0.5
        if fac > 0.99995:
            print('stuck at eps', eps, 'res', res, ok); break
for r in rows[::6] + [rows[-1]]:
    print('eps %.3e  minP %.12f  redHess_min %.3e  a %s  C %.5f' % (r[0], r[1], r[2], np.round(r[3:6], 5), r[6]))
json.dump(rows, open('hier_cont.json', 'w'))
P = np.array([r[1] for r in rows])
print('monotone increasing as eps decreases:', bool(np.all(np.diff(P) > -1e-12)), ' last P', P[-1], ' sqrt3/2', np.sqrt(3) / 2)
