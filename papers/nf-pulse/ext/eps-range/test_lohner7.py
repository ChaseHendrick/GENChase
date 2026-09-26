#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Tests of lohner7 and of the h-set construction of chain.py (not part of the proof):
 1. with eps a point, the lohner7 enclosure at t = 3 contains a high-precision reference solution (the original
    6D integrator ../../code/lohner.py at 320 bits and tolerance 1e-80) and meets the original's own enclosure;
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
x0 = [arb(0.035), arb(0.01), arb(0.08), arb(0.07), arb(0.0135)]      # exact dyadics
kap = arb(0.9068)
nf._EPS = fmpq(1, 10)
ok = True
# 1
ctx.prec = 320
Xr = L6.LohnerSet.from_box(x0 + [kap])
Xr, _, _ = L6.integrate(Xr, 3.0, order=40, tol=1e-80, hmax=0.25)
ref = [arb(v.mid()) for v in Xr.hull()[:5]]
ctx.prec = 128
X6 = L6.LohnerSet.from_box(x0 + [kap])
X6, _, _ = L6.integrate(X6, 3.0, order=20, tol=1e-30, hmax=0.25)
X7 = L7.LohnerSet.from_box(x0 + [kap, arb(fmpq(1, 10))])
X7, _, _ = L7.integrate(X7, 0.0, 3.0, order=20, tol=1e-30)
h6, h7 = X6.hull(), X7.hull()
ok1 = all(h7[i].contains(ref[i]) and h6[i].overlaps(h7[i]) for i in range(5))
print('1. 7D encloses the 320-bit reference and meets the 6D enclosure: %s (radii %.1e, %.1e; reference error %.1e)' % (
    ok1, max(float(v.rad()) for v in h7[:5]), max(float(v.rad()) for v in h6[:5]), float(Xr.hull()[0].rad())))
ok &= ok1
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
# 4: the Lohner set of an h-set (chain.hset_lohner) contains sample points with Y = S(U) exactly, in particular
#    corners, where the second-order remainder of the linearisation of S matters; the U-extent is made large (0.05)
import numpy as np
import chain as ch
Sd = {'w2': arb(2) ** -12, 'e_m': arb(3) * arb(2) ** -5, 'scl': 1 + arb(2) ** -100}
Sd['R0e'] = ch.rball(Sd['scl'])
rng = np.random.default_rng(1)
M = rng.normal(size=(5, 5)) * 0.01
M[0, 0] = 0.05
c5 = [arb(0.2), arb(0.01), arb(0.05), arb(0.01), arb(0.9)]
d5 = [arb(1e-3), arb(2e-4), arb(-1e-4), arb(3e-4), arb(0)]
H = {'M': M, 'c5': c5, 'd5': d5}
full, edges, cols = ch.hset_lohner(H, Sd)
hull = full.hull()
worst = 0.0
ok4 = True
for trial in range(200):
    p = rng.uniform(-1, 1, size=6)
    if trial < 64:
        p = np.array([1 if (trial >> j) & 1 else -1 for j in range(6)], dtype=float)
    z5 = [c5[j] + sum(arb(float(M[j, k])) * arb(float(p[k])) for k in range(5)) + d5[j] * arb(float(p[5])) for j in range(5)]
    pt = [z5[0], z5[1], z5[2], z5[3], ch.nf.S(z5[0]), z5[4], Sd['e_m'] + Sd['w2'] * arb(float(p[5]))]
    # the point must lie in xbar + C r0 + R for the r0 = p (componentwise enclosure of the representation)
    rep = [full.xbar[i] + sum((full.C[i, k] * arb(float(p[k])) for k in range(6)), arb(0)) + full.R[i] for i in range(7)]
    ok4 &= all(rep[i].contains(pt[i]) for i in range(7))
    worst = max(worst, abs(float((pt[4] - full.xbar[4] - sum((full.C[4, k] * arb(float(p[k])) for k in range(6)), arb(0))).mid())) / float(full.R[4].rad()))
print('4. h-set Lohner set contains 200 sample points with Y = S(U): %s (largest |Y error| / remainder radius %.2f)' % (ok4, worst))
ok &= ok4
print('ALL TESTS PASS' if ok else 'TEST FAILURE')
