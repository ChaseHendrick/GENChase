"""Extrapolation of the two-arm minima P(N), N odd, to N -> infinity, with several model families.
Usage: python3 fit.py data.json [Nmax_used]   (data.json: {"N": P})"""
import sys, json, itertools
import numpy as np
D = {int(k): v for k, v in json.load(open(sys.argv[1])).items()}
Nmax = int(sys.argv[2]) if len(sys.argv) > 2 else max(D)
Ns = sorted(n for n in D if n <= Nmax and n % 2 == 1 and n >= 9)
P = np.array([D[n] for n in Ns])
print('N used:', Ns)
out = []
for off in [0.0, 1.0, 1.5]:           # m = (N - 1)/2 + off  -> tests sensitivity to the variable choice
    m = (np.array(Ns) - 1) / 2 + off
    for k in [6, 8, 10]:
        for deg in [2, 3, 4]:
            if k > len(Ns) or deg + 2 > k:
                continue
            A = np.vstack([m[-k:] ** (-i) for i in range(deg + 1)]).T
            c, *_ = np.linalg.lstsq(A, P[-k:], rcond=None)
            rms = np.sqrt(np.mean((A @ c - P[-k:]) ** 2))
            out.append((off, k, deg, c[0], rms))
            print('poly 1/m (m=(N-1)/2+%.1f) last %2d deg %d  P_inf=%.5f  c1=%.4f  rms=%.1e' % (off, k, deg, c[0], c[1], rms))
# power law P = Pinf + a m^-p (+ b m^-p-1)
m = (np.array(Ns) - 1) / 2
for k in [6, 8, 10, len(Ns)]:
    if k > len(Ns):
        continue
    best = None
    for p in np.linspace(0.3, 2.5, 2201):
        A = np.vstack([np.ones(k), m[-k:] ** (-p), m[-k:] ** (-p - 1)]).T
        c, *_ = np.linalg.lstsq(A, P[-k:], rcond=None); r = np.sum((A @ c - P[-k:]) ** 2)
        if best is None or r < best[0]:
            best = (r, p, c)
    print('power+corr last %2d: p=%.3f P_inf=%.5f rms=%.1e' % (k, best[1], best[2][0], np.sqrt(best[0] / k)))
# log model: P = Pinf + (a + b log m)/m + c/m^2
for k in [6, 8, 10, len(Ns)]:
    if k > len(Ns):
        continue
    mm = m[-k:]
    A = np.vstack([np.ones(k), 1 / mm, np.log(mm) / mm, 1 / mm ** 2]).T
    c, *_ = np.linalg.lstsq(A, P[-k:], rcond=None)
    print('log model last %2d: P_inf=%.5f  (a=%.4f, b_log=%.4f) rms=%.1e' % (k, c[0], c[1], c[2], np.sqrt(np.mean((A @ c - P[-k:]) ** 2))))
# local exponent of successive differences
print('local slope of dP vs m (should tend to -2 if P - Pinf ~ 1/m):')
d = -np.diff(P); mid = (m[1:] + m[:-1]) / 2
for i in range(1, len(d)):
    print('  m~%.1f  dP=%.3e  slope=%.3f' % (mid[i], d[i], np.log(d[i] / d[i - 1]) / np.log(mid[i] / mid[i - 1])))
