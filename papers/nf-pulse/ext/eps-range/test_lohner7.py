#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Tests of lohner7 (not part of the proof):
 1. with eps a thin ball, lohner7 encloses the same solution as the original 6D integrator ../../code/lohner.py;
 2. the time-rescaled flow at s encloses the plain flow at time r(eps) s (a point in eps, a dyadic r);
 3. the Jacobian of the rescaled Taylor jet agrees with central finite differences of taylor_vals.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from flint import arb, arb_mat, ctx, fmpq
import lohner7 as L7
import lohner as L6
import nfcore as nf
ctx.prec = 128
x0 = [arb('0.035'), arb('0.01'), arb('0.08'), arb('0.07'), arb('0.0135')]
kap = arb('0.9068')
nf._EPS = fmpq(1, 10)
ok = True
# 1
X6 = L6.LohnerSet.from_box(x0 + [kap])
X6, _, _ = L6.integrate(X6, 3.0, order=20, tol=1e-30, hmax=0.25)
X7 = L7.LohnerSet.from_box(x0 + [kap, arb(fmpq(1, 10))])
X7, _, _ = L7.integrate(X7, 0.0, 3.0, order=20, tol=1e-30)
h6, h7 = X6.hull(), X7.hull()
for i in range(5):
    ok &= h6[i].overlaps(h7[i])
print('1. 6D vs 7D at t=3: max |mid diff| = %.2e, radii %.1e %.1e' % (
    max(abs(float((h6[i] - h7[i]).mid())) for i in range(5)), max(float(v.rad()) for v in h6[:5]), max(float(v.rad()) for v in h7[:5])))
# 2: r = 1 + b (eps - e_m) with eps = 7/64, e_m = 3/32, b = 4 -> r = 1 + 4/64 = 1.0625, r s = 2.125 (all exact)
e = arb(fmpq(7, 64))
Xa = L7.LohnerSet.from_box(x0 + [kap, e])
Xa, _, _ = L7.integrate(Xa, 0.0, 2.0, order=20, tol=1e-30, rho=(4.0, 3 / 32))
Xb = L7.LohnerSet.from_box(x0 + [kap, e])
Xb, _, _ = L7.integrate(Xb, 0.0, 2.125, order=20, tol=1e-30)
ha, hb = Xa.hull(), Xb.hull()
ok2 = all(ha[i].overlaps(hb[i]) for i in range(5))
print('2. rescaled s=2 (r=1.0625) vs plain t=2.125: overlap %s, max |mid diff| %.2e' % (ok2, max(abs(float((ha[i] - hb[i]).mid())) for i in range(5))))
ok &= ok2
# 3: jet vs finite differences
L7.RHO[0], L7.RHO[1] = arb(3), arb('0.09')
z = x0 + [kap, e]
vals, grads = L7.taylor_jet(z, 8)
hh = arb('1e-20')
err = 0.0
for m in range(7):
    zp = list(z); zp[m] = zp[m] + hh
    zm = list(z); zm[m] = zm[m] - hh
    vp, vm = L7.taylor_vals(zp, 8), L7.taylor_vals(zm, 8)
    for i in range(5):
        for k in range(9):
            fd = (vp[i][k] - vm[i][k]) / (2 * hh)
            err = max(err, abs(float((fd - grads[i][k][m]).mid())))
print('3. jet vs finite differences: max err %.2e' % err)
ok &= err < 1e-12
print('ALL TESTS PASS' if ok else 'TEST FAILURE')
