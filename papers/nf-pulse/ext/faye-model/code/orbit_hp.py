#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Numerical only: the orbit at the lower end of the bracket, in block coordinates, to choose T_enter.
usage: FAYE_EPS=1/20 python3 orbit_hp.py prec"""
import sys, json
from flint import arb, ctx
ctx.prec = int(sys.argv[1]) if len(sys.argv) > 1 else 256
import fcore as fc, shoot_hp as sh, certify_rest as cr, block as bl
ctx.prec = int(sys.argv[1]) if len(sys.argv) > 1 else 256
kappa = (1 / cr.C1).union(1 / cr.C2)
ok, info, T, Tinv, r, rho = bl.block_for(fc.eps_txt(), kappa)
xs = fc.rest_state()
rec = []
res = sh.shoot(cr.C1, record=rec, T=400)
print('classification', res[0], 'at xi', res[1].str(6))
Tf = [[float(T[i, j].mid()) for j in range(4)] for i in range(4)]
xsf = [float(v.mid()) for v in xs]
last = None; out = []
for t, x in rec:
    y = [sum(Tf[a][i] * (x[i] - xsf[i]) for i in range(4)) for a in range(4)]
    yp = sum(v * v for v in y[1:]) ** 0.5
    inB = abs(y[0]) < float(r.mid()) and yp < float(rho.mid())
    if last is None or t - last > 1.0 or inB != out[-1][2]:
        out.append((t, x, inB, y[0], yp)); last = t
for t, x, inB, y1, yp in out:
    print('xi %7.2f u %.4f v %.4f w %+.4f q %.4f  inB %s  y1 %+.3e |y\'| %.3e' % (t, x[0], x[1], x[2], x[3], inB, y1, yp))
