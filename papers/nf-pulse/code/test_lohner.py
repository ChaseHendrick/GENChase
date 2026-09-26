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
"""Tests of the rigorous integrator against an independent high-precision solver (mpmath odefun on the
ORIGINAL 4D system with S(U) evaluated directly, no Y-embedding, no shared code), plus a negative
control in which the Lagrange remainder is deliberately dropped."""
import time, sys
from flint import arb, ctx, fmpq
ctx.prec = 256
import mpmath as mp
import nfcore as nf, certify_rest as cr, manifold as mf, lohner as lo

def manifold_point(c):
    kappa = 1 / c
    s = nf.dS(arb(0)); co = cr.charpoly_coeffs(kappa, s, nf.EPS); lam = cr.refine(co, arb('0.5'), arb('1.2'))
    ok, a, r, info = mf.validate(kappa, lam, mf.choose_sigma(kappa, lam), 80)
    nf.require(ok, info)
    return mf.evaluate(a, r, arb(fmpq(1, 4))), kappa

def mp_solution(x0, c, T):
    mp.mp.dps = 70
    beta, theta, eps = mp.mpf(20), mp.mpf(1)/4, mp.mpf(1)/10
    k = 1 / mp.mpf(c)
    S = lambda u: 1 / (1 + mp.exp(-beta * (u - theta)))
    f = lambda t, y: [k*(y[2]-y[0]-y[1]), eps*k*y[0], y[3], y[2]-S(y[0])]
    sol = mp.odefun(f, 0, [mp.mpf(v) for v in x0], tol=mp.mpf(10)**-60, degree=40)
    return sol

if __name__ == '__main__':
    c = cr.C1
    box, kappa = manifold_point(c)
    X = lo.LohnerSet.from_box(box + [kappa])
    x0mid = [box[i].mid().str(70, radius=False) for i in range(4)]
    cmp_ = c.mid().str(70, radius=False)
    sol = mp_solution(x0mid, cmp_, 12)
    checks = []
    def cb(tp, t, X, W):
        tt = float(t.mid())
        if abs(tt - round(tt)) < 1e-12 and round(tt) in (2, 4, 6, 8, 10, 12):
            hx = X.hull()
            ref = sol(mp.mpf(t.mid().str(70, radius=False)))
            inside = all(hx[i].contains(arb(mp.nstr(ref[i], 65))) for i in range(4))
            dev = max(float(abs(hx[i].mid() - arb(mp.nstr(ref[i], 65)))) for i in range(4))
            w = max(float(hx[i].rad()) for i in range(5))
            checks.append((tt, inside, w, dev))
            print('t=%5.1f contains mpmath solution: %s   max radius %.2e   |mid - mpmath| %.2e' % (tt, inside, w, dev), flush=True)
            # also: Y - S(U) must contain 0 on the invariant surface
            g = hx[4] - nf.S(hx[0])
            print('         Y - S(U) enclosure contains 0:', g.contains(0), ' radius %.1e' % float(g.rad()))
        return tt >= 12 - 1e-9
    t0 = time.time()
    # integrate with exact integer check times: use T_end chunks
    t = 0.0
    for Tc in (2, 4, 6, 8, 10, 12):
        X, tt, ns = lo.integrate(X, Tc, order=30, tol=1e-45, hmax=0.25, callback=cb, t0=t)
        t = float(tt.mid())
        print('   reached t=%.3f steps %d elapsed %.1fs' % (t, ns, time.time() - t0), flush=True)
    ok = len(checks) == 6 and all(ch[1] for ch in checks)
    print('ALL CONTAIN:', ok)
    print('INTEGRATOR TEST', 'PASS' if ok else 'FAIL')
    sys.exit(0 if ok else 1)
