#!/usr/bin/env python3
"""ext_scan_q.py -- as ext_scan.py but the radius grid is uniform in q = r^n (needed for large n, where r* -> 1).
usage: python3 ext_scan_q.py n"""
import sys
import numpy as np
from ext_scan import roots_beta, nullP

n = int(sys.argv[1])
qs = np.concatenate([np.linspace(0.01, 0.99, 99), np.linspace(1.05, 20.0, 60)])
gs = np.linspace(0, 2 * np.pi, 721)[:-1]
allp = []
for q in qs:
    r = q**(1.0 / n)
    be, g = roots_beta(n, r, gs, nb=2881)
    if len(be) == 0:
        continue
    P, x, sv = nullP(n, r, be, g)
    for k in np.where(sv < 1e-9)[0]:
        allp.append((P[k], r, be[k], g[k], q))
allp = np.array(allp)
o = np.argsort(allp[:, 0])
print('n = %d: %d surface points; smallest P:' % (n, len(allp)))
for k in o[:6]:
    print('  P = %.6f  q = %.3f  r = %.5f  beta = %.4f  gamma = %.4f' % (allp[k, 0], allp[k, 4], allp[k, 1], allp[k, 2], allp[k, 3]))
for lo, hi in ((0, 0.5), (0.5, 0.99), (1.0, 100)):
    sel = allp[(allp[:, 4] > lo) & (allp[:, 4] < hi)]
    if len(sel):
        print('  q in (%g, %g): min P = %.6f' % (lo, hi, sel[:, 0].min()))
