#!/usr/bin/env python3
"""
ext_cont.py -- continuation in n of the b3-free extension minimum (ext_refine.py), predicting (q = r^n, beta, gamma)
by extrapolation in 1/n and solving the Lagrange system at 60 digits; each point certified by direct Biot-Savart.
usage: python3 ext_cont.py nmax [list of extra n]
"""
import sys
import json
import mpmath as mp
from ext_refine import build, refine, config, biot_savart

mp.mp.dps = 60
seeds = {5: (mp.mpf('0.90331015515227299972990868669708194565960553660596'), mp.mpf('0.52375270350535224356917755354650872380275521907457'), mp.mpf('0.32035918736140174724354859738318707213749608338109')),
         6: (mp.mpf('0.92737922655477672869170696790757509329644201370389'), mp.mpf('0.47807785460245207584177234548694274395935081525544'), mp.mpf('0.27791319230746424653237395501513922649926789204179'))}
nmax = int(sys.argv[1])
ns = list(range(7, nmax + 1)) + [int(a) for a in sys.argv[2:]]
hist = {k: (v[0]**k, v[1], v[2]) for k, v in seeds.items()}      # store (q, beta, gamma)
rows = []
for n in ns:
    ks = sorted(hist)[-2:]
    (n1, a1), (n2, a2) = (ks[0], hist[ks[0]]), (ks[1], hist[ks[1]])
    # linear extrapolation in x = 1/n
    x1, x2, x = mp.mpf(1) / n1, mp.mpf(1) / n2, mp.mpf(1) / n
    pred = [a2[i] + (a2[i] - a1[i]) * (x - x2) / (x2 - x1) for i in range(3)]
    r0 = pred[0]**(mp.mpf(1) / n)
    F = build(n)
    r, b, g = refine(n, F, r0, pred[1], pred[2])
    vec = F['vec'](r, b, g)
    vec = [vec[i] / vec[5] for i in range(6)]
    P = abs(vec[0]) / (2 * abs(vec[1]))
    pos, gam, _ = config(n, r, b, g, vec)
    bs = biot_savart(pos, gam)
    Pbs = abs(bs['kappa'].imag) / (2 * abs(bs['kappa'].real))
    # local-min margin on the surface
    worst = mp.inf
    h = (1 - r) * mp.mpf('1e-3')
    for dr, dg in [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)]:
        rr, gg = r + dr * h, g + dg * mp.mpf('1e-3') * 0.1
        bb = mp.findroot(lambda y: F['det'](rr, y, gg), b)
        worst = min(worst, abs(F['Psig'](rr, bb, gg)) - P)
    hist[n] = (r**n, b, g)
    row = dict(n=n, P=mp.nstr(P, 40), P_bs=mp.nstr(Pbs, 40), dP=mp.nstr(abs(P - Pbs), 3), spread=mp.nstr(bs['spread'], 3),
               L=mp.nstr(bs['L'], 3), pairs=mp.nstr(bs['pairs'], 3), r=mp.nstr(r, 30), q=mp.nstr(r**n, 20), beta=mp.nstr(b, 20),
               gamma=mp.nstr(g, 20), G0=mp.nstr(vec[2], 20), G1=mp.nstr(vec[3], 20), G2=mp.nstr(vec[4], 20), margin=mp.nstr(worst, 4))
    rows.append(row)
    print('n=%3d P=%s |P-P_BS|=%s spread=%s q=%s beta=%s gamma=%s G0/n=%s G1=%s G2=%s margin=%s'
          % (n, mp.nstr(P, 22), row['dP'], row['spread'], mp.nstr(r**n, 10), mp.nstr(b, 10), mp.nstr(g, 10), mp.nstr(vec[2] / n, 10),
             mp.nstr(vec[3], 10), mp.nstr(vec[4], 10), row['margin']), flush=True)
json.dump(rows, open('ext_cont_%d.json' % nmax, 'w'), indent=1)
