#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Test (not part of the proof): the Taylor recursion and its forward-mode gradients in lohner.taylor_jet
against fcore.taylor and against central finite differences in high precision, and fcore.vfield (used for the
a priori enclosure) against the first Taylor coefficient."""
from flint import arb, ctx
ctx.prec = 300
import fcore as fc, lohner as lo
x = [arb('0.31'), arb('0.42'), arb('0.07'), arb('0.6'), fc.S(arb('0.31')), arb('3.9')]
p = 25
vals, grads = lo.taylor_jet(x, p)
ref = lo.taylor_vals(x, p)
dv = max(abs(float((vals[i][k] - ref[i][k]).mid())) for i in range(5) for k in range(p + 1))
h = arb(10) ** -30
dg = 0.0
for m in range(6):
    xp = list(x); xm = list(x)
    xp[m] = xp[m] + h; xm[m] = xm[m] - h
    vp = lo.taylor_vals(xp, p); vm = lo.taylor_vals(xm, p)
    for i in range(5):
        for k in range(p + 1):
            fd = (vp[i][k] - vm[i][k]) / (2 * h)
            dg = max(dg, abs(float((fd - grads[i][k][m]).mid())) / (1 + abs(float(fd.mid()))))
f = fc.vfield(x[:5], x[5])
dvf = max(abs(float((f[i] - ref[i][1]).mid())) for i in range(5))
print('max |vfield - first Taylor coefficient| = %.3e' % dvf)
print('max |vals_jet - vals| = %.3e' % dv)
print('max rel |J_AD - J_FD| = %.3e' % dg)
print('TEST PASS' if dv < 1e-60 and dg < 1e-40 and dvf < 1e-60 else 'TEST FAIL')
