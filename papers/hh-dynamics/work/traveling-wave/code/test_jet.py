#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Tests (non-rigorous checks of the rigorous code): the jet's Jacobian against finite differences of the float
field, the gradients of a Taylor coefficient against 200-bit central differences, Psi near its removable singularity,
and a short Lohner integration of the upstroke against scipy's DOP853."""
import sys
import numpy as np
from flint import arb, arb_mat, ctx
import hhjet as J
import hhseries as S
import hhwave as H
import lohner_hh as L

ok = True
W = H.Wave(18.5)
ctx.prec = 200
K, phi, EL = arb('10.4'), arb(W.phi), arb(W.EL)
pt = [30.0, 200.0, 0.3, 0.4, 0.5]
x = [arb(v) for v in pt]
Jm = np.array([[float(a.mid()) for a in r] for r in J.jacobian(x, K, phi, EL)])
err = np.max(np.abs(Jm - W.jac(np.array(pt), 10.4)) / (1 + np.abs(Jm)))
print('Jacobian vs float central differences: max relative error %.1e (expect < 1e-6)' % err)
ok &= err < 1e-6
v, g = J.jet(x, K, phi, EL, 6)
eps = arb(10) ** -20
worst = 0.0
for j in range(5):
    xp = list(x); xp[j] += eps
    xm = list(x); xm[j] -= eps
    cp, cm = S.taylor(xp, K, phi, EL, 6), S.taylor(xm, K, phi, EL, 6)
    for i in range(5):
        fd = (cp[i][5] - cm[i][5]) / (2 * eps)
        worst = max(worst, float(abs(g[i][5][j] - fd).mid()) / (1e-30 + abs(float(g[i][5][j].mid()))))
print('gradient of the 5th Taylor coefficient vs 200-bit differences: max relative error %.1e (expect < 1e-30)' % worst)
ok &= worst < 1e-30
x = [arb('25.0000001'), arb(100), arb('0.3'), arb('0.4'), arb('0.5')]
c1 = S.taylor(x, K, phi, EL, 3)
x2 = [arb('25.0000001') + arb(10) ** -12] + x[1:]
c2 = S.taylor(x2, K, phi, EL, 3)
d = float(abs(c1[2][2] - c2[2][2]).mid())
print('Psi branch near u = 25 (series of 1/G) is continuous: |difference| %.1e for a 1e-12 shift (expect < 1e-9)' % d)
ok &= d < 1e-9
ctx.prec = 128
Kf = 10.4383548291
F = L.Field(arb(Kf), arb(W.phi), arb(W.EL))
x0 = [arb(v) for v in W.rest + 1e-3 * W.unstable_dir(Kf)[1]]
X = L.LSet(x0, arb_mat(5, 1), [arb(0)], arb_mat([[1 if i == j else 0 for j in range(5)] for i in range(5)]),
           [arb(0, 1e-20)] * 5)
Xe, t, ns = L.integrate(F, X, 1.0, p=20, tol=1e-32)
s, sol = W.shoot(Kf, delta=1e-3, dense=True)
ref = sol.sol(1.0)
hull = Xe.hull()
inside = all(abs(float(hull[i].mid()) - ref[i]) <= float(hull[i].rad()) + 1e-8 * (1 + abs(ref[i])) for i in range(5))
print('Lohner enclosure at t = 1 ms (u = %s) contains the DOP853 solution up to its 1e-8 tolerance: %s'
      % (hull[0].str(10), inside))
ok &= inside
print('ALL TESTS PASSED' if ok else 'SOME TEST FAILED')
sys.exit(0 if ok else 1)
