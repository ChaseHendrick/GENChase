#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
"""Test (not part of the proof) of the rigorous integrator against an independent high-precision solver: mpmath
odefun on the ORIGINAL 4D system of Faye's eq. (2.8) with S(u) evaluated directly (no Y-embedding, no shared
code).  Negative control: the same comparison against a solution with b perturbed by 1e-20 must fail, which
shows the test can detect a wrong vector field.
usage: FAYE_EPS=1/20 python3 test_lohner.py [xi_max, default 10]"""
import time, sys
from flint import arb, ctx, fmpq
import config as cf
ctx.prec = 256
import mpmath as mp
import fcore as fc, certify_rest as cr, manifold as mf, lohner as lo
ctx.prec = 256


def manifold_point(c):
    kappa = 1 / c
    mu = mf.unstable_eig(kappa)
    ok, a, r, info = mf.validate(kappa, mu, mf.choose_sigma(kappa, mu), 80)
    assert ok
    return mf.evaluate(a, r, arb(fmpq(1, 2))), kappa


def mp_solution(x0, c, db=0):
    mp.mp.dps = 70
    lam, kap, beta, b = mp.mpf(20), mp.mpf(11) / 50, mp.mpf(5), mp.mpf(9) / 2 + db
    num, den = [int(t) for t in fc.eps_txt().split('/')]
    eps = mp.mpf(num) / den
    k = 1 / mp.mpf(c)
    S = lambda u: 1 / (1 + mp.exp(-lam * (u - kap)))
    f = lambda t, y: [k * (y[1] - y[0]), y[2], b * b * (y[1] - y[3] * S(y[0])), eps * k * (1 - y[3] - beta * y[3] * S(y[0]))]
    return mp.odefun(f, 0, [mp.mpf(v) for v in x0], tol=mp.mpf(10) ** -60, degree=40)


if __name__ == '__main__':
    c = cr.C1
    box, kappa = manifold_point(c)
    X = lo.LohnerSet.from_box(box + [kappa])
    x0mid = [box[i].mid().str(70, radius=False) for i in range(4)]
    cmp_ = c.mid().str(70, radius=False)
    sol = mp_solution(x0mid, cmp_)
    bad = mp_solution(x0mid, cmp_, db=mp.mpf(10) ** -20)
    checks, badchecks = [], []
    t = 0.0
    t0 = time.time()
    TMAX = float(sys.argv[1]) if len(sys.argv) > 1 else 10
    for Tc in [tc for tc in (1, 2, 4, 6, 8, 10) if tc <= TMAX]:
        X, tt, ns = lo.integrate(X, Tc, order=30, tol=1e-45, hmax=0.25, t0=t)
        t = float(tt.mid())
        hx = X.hull()
        tm = mp.mpf(tt.mid().str(70, radius=False))
        ref, refb = sol(tm), bad(tm)
        inside = all(hx[i].contains(arb(mp.nstr(ref[i], 65))) for i in range(4))
        insideb = all(hx[i].contains(arb(mp.nstr(refb[i], 65))) for i in range(4))
        g = hx[4] - fc.S(hx[0])
        checks.append(inside and g.contains(0)); badchecks.append(insideb)
        print('xi=%4.1f contains mpmath solution: %s | Y - S(u) contains 0: %s | max radius %.2e | perturbed-b solution contained: %s (%.0fs)'
              % (t, inside, g.contains(0), max(float(v.rad()) for v in hx[:5]), insideb, time.time() - t0), flush=True)
    print('ALL CONTAIN:', all(checks))
    print('NEGATIVE CONTROL (b + 1e-20) refused at some time:', not all(badchecks))
    print('TEST PASS' if all(checks) and not all(badchecks) else 'TEST FAIL')
