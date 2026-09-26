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
"""(1) Negative control for the integrator: at a coarse setting (order 8) the enclosures with the Lagrange
remainder must contain an independent mpmath solution, and the SAME run with the remainder deliberately
dropped must fail to contain it.  (2) Production settings along the whole c1 orbit (to xi = 55) against
mpmath (independent code, original 4D system)."""
import sys, time
from flint import arb, ctx, fmpq
ctx.prec = 256
import mpmath as mp
import nfcore as nf, certify_rest as cr, lohner as lo
from test_lohner import manifold_point, mp_solution

def run(order, tol, drop_rem, times, sol, box, kappa, hmax=0.25):
    X = lo.LohnerSet.from_box(box + [kappa])
    orig = lo.taylor_vals
    res = []
    if drop_rem:
        # monkeypatch: the remainder coefficient x_{p+1}(W) is replaced by 0
        def tv(x, o):
            v = orig(x, o)
            if o == order + 1:
                for i in range(5):
                    v[i][o] = arb(0)
            return v
        lo.taylor_vals = tv
    try:
        t = 0.0
        for Tc in times:
            X, tt, ns = lo.integrate(X, Tc, order=order, tol=tol, hmax=hmax, t0=t)
            t = float(tt.mid())
            hx = X.hull()
            ref = sol(mp.mpf(tt.mid().str(70, radius=False)))
            inside = all(hx[i].contains(arb(mp.nstr(ref[i], 65))) for i in range(4))
            res.append((Tc, inside, max(float(hx[i].rad()) for i in range(4)),
                        max(float(abs(hx[i].mid() - arb(mp.nstr(ref[i], 65)))) for i in range(4))))
    finally:
        lo.taylor_vals = orig
    return res

if __name__ == '__main__':
    mode = sys.argv[1]
    box, kappa = manifold_point(cr.C1)
    x0mid = [box[i].mid().str(70, radius=False) for i in range(4)]
    sol = mp_solution(x0mid, cr.C1.mid().str(70, radius=False), 60)
    if mode == 'neg':
        times = [2, 4, 6, 8, 10, 12]
        for drop in (False, True):
            t0 = time.time()
            r = run(8, 1e-12, drop, times, sol, box, kappa)
            print('order 8, remainder %s:' % ('DROPPED' if drop else 'included'))
            for Tc, ins, rad, dev in r:
                print('   t=%4.1f contains mpmath: %-5s  radius %.2e  |mid-mpmath| %.2e' % (Tc, ins, rad, dev), flush=True)
    else:
        times = [20, 30, 40, 45, 50, 55]
        r = run(30, 1e-45, False, times, sol, box, kappa)
        for Tc, ins, rad, dev in r:
            print('production t=%4.1f contains mpmath: %-5s  radius %.2e  |mid-mpmath| %.2e' % (Tc, ins, rad, dev), flush=True)
