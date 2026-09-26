#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Negative controls for the containment decisions of prove_pulse.py and block.py, which the proof runs alone do not
exercise (found by mutation testing in the independent check, REPORT.md).  Each line must print 'refused' or 'ok'.

 D1  in_K must refuse an enclosure whose midpoint is in K+ but which straddles the cone boundary.
 D2  in_int_B must refuse an enclosure whose midpoint is inside B but whose upper bound is not.
 D3  step_range_y must enclose the Taylor polynomial at interior times of a step (compared with a direct evaluation).
 D4  u_range: the chosen rho is certified (U-range < DU), and 1/0.95 times it is not, so the rho term matters.
 D4c the same bound recomputed independently in floating point (a test of the code, not a proof step).
 D5  prove_pulse's T equals the T stored in data/block_certificate.json (checked by block_check_iv.py).
"""
import json
from flint import arb, ctx, fmpq
ctx.prec = 256
import nfcore as nf, prove_pulse as pp, lohner as lo, block as bl

res = []
# D1
y = [arb('0.010', '0.002'), arb('0.0099'), arb(0), arb(0)]           # mid y1 = 0.010 > |y'| = 0.0099
res.append(('D1 in_K on a straddling enclosure', 'refused' if not pp.in_K(y, +1) else 'ACCEPTED (BAD)'))
ok_pos = pp.in_K([arb('0.010', '1e-6'), arb('0.0099'), arb(0), arb(0)], +1)
res.append(('D1b in_K on a thin enclosure inside K+', 'ok' if ok_pos else 'REFUSED (BAD)'))
# D2
T, Tinv, rho, r, info = pp.block_data()
y = [arb(0), rho * arb('0.999') + arb(0, float((rho * arb('0.01')).mid())), arb(0), arb(0)]
res.append(('D2 in_int_B on an enclosure crossing |y\'| = rho', 'refused' if not pp.in_int_B(y, rho, r) else 'ACCEPTED (BAD)'))
y = [r * arb('0.999') + arb(0, float((r * arb('0.01')).mid())), arb(0), arb(0), arb(0)]
res.append(('D2b in_int_B on an enclosure crossing |y1| = r', 'refused' if not pp.in_int_B(y, rho, r) else 'ACCEPTED (BAD)'))
# D3: one step from a point near rest; the range enclosure must contain the polynomial at t = h/3, 2h/3
xs = nf.rest_state()
x0 = [xs[0] + arb('0.001'), xs[1], xs[2] + arb('0.0005'), arb('0.0003'), nf.S(arb('0.001'))] + [1 / arb('1.0475')]
X = lo.LohnerSet.from_box(x0)
h = 0.125
Xn, W = lo.step(X, h, 30)
yr = pp.step_range_y(X.hull(), W, h, 30, T, xs)
vals = lo.taylor_vals(x0, 30)
good = True
for tt in (arb(h) / 3, 2 * arb(h) / 3):
    xt = [nf.horner(vals[i], tt) for i in range(4)]
    yt = [sum((T[a, i] * (xt[i] - xs[i]) for i in range(4)), arb(0)) for a in range(4)]
    good &= all(yr[a].overlaps(yt[a]) for a in range(4))
res.append(('D3 step_range_y encloses interior times of a step', 'ok' if good else 'MISSED (BAD)'))
# D4
DU = pp.DU
ok_rho = bool(bl.u_range(Tinv, r, rho) < DU)
bigger = rho / arb('0.95')
bad_rho = bool(bl.u_range(Tinv, bigger * pp.R_OVER_RHO, bigger) < DU)
res.append(('D4 chosen rho keeps U within DU', 'ok' if ok_rho else 'FAILED (BAD)'))
res.append(('D4b rho/0.95 is refused (the rho term of u_range matters)', 'refused' if not bad_rho else 'ACCEPTED (BAD)'))
import numpy as np
Tf = np.array([[float(T[i, j].mid()) for j in range(4)] for i in range(4)])
Ti0 = np.linalg.inv(Tf)[0]
supU = abs(Ti0[0]) * float(r.mid()) + np.linalg.norm(Ti0[1:]) * float(rho.mid())   # Cauchy-Schwarz, own code
res.append(('D4c independent (numpy) sup|U| on B = %.6f below DU' % supU, 'ok' if supU < float(DU.mid()) * (1 - 1e-9) else 'EXCEEDS (BAD)'))
# D5
Tj = json.load(open('../data/block_certificate.json'))['T']
same = all(float(T[i, j].mid()) == Tj[i][j] for i in range(4) for j in range(4))
res.append(('D5 prove_pulse T equals the stored T re-checked by block_check_iv.py', 'ok' if same else 'DIFFERENT (BAD)'))
for name, verdict in res:
    print('%-70s %s' % (name, verdict))
print('ALL DECISION CONTROLS', 'PASS' if all(v in ('ok', 'refused') for _, v in res) else 'FAIL')
