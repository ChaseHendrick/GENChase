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
"""High-precision (NOT rigorous) shooting for the fast pulse speed of Faye's model.

Leaves the rest state along the unstable manifold (parametrised to order N), integrates the embedded wave ODE
with an adaptive Taylor method in arb midpoint arithmetic, and classifies the orbit by the regions of
Hastings (2017), Proposition 1, which are positively invariant:
    E_dn = {v < 0, w < 0, 1/(1+beta) < q < 1}   (sign -1),    E_up = {v > 1, w > 0, 1/(1+beta) < q < 1}   (+1).
Bisection in c then brackets the speed at which the classification switches.  Numerical only.

usage: FAYE_EPS=1/20 python3 shoot_hp.py prec nbits c_lo c_hi
"""
import sys, time, math
from flint import arb, arb_mat, ctx
import fcore as fc
import manifold as mf


def mid(x):
    return arb(x.mid())


def integrate(x, kappa, T, tol_exp, order=40, record=None, stop=None, hmax=0.25):
    t = arb(0)
    tol = 2.0 ** tol_exp
    while t < T:
        cs = fc.taylor(x, kappa, order)
        m = max(abs(float(cs[i][order].mid())) for i in range(5)) + max(abs(float(cs[i][order - 1].mid())) for i in range(5))
        m = max(m, 1e-300)
        h = arb(min(hmax, (tol / m) ** (1.0 / order) * 0.5))
        if t + h > T:
            h = T - t
        x = [mid(fc.horner(cs[i], h)) for i in range(5)]
        t = t + h
        if record is not None:
            record.append((float(t.mid()), [float(xi.mid()) for xi in x]))
        if stop is not None:
            r = stop(x)
            if r:
                return r, t, x
    return 0, t, x


def classify(x):
    u, v, w, q, Y = x
    lo = 1 / (1 + fc.params()[2])
    if lo < q < 1:
        if v > 1 and w > 0:
            return +1
        if v < 0 and w < 0:
            return -1
    return 0


def shoot(c, N=60, T=4000, order=40, record=None):
    kappa = 1 / c
    prec = ctx.prec
    lam, a = mf.coefficients_numeric(mid(kappa), N)
    nrm = [max(abs(float(ai.mid())) for ai in an) for an in a]
    R = max((nrm[n] / nrm[n - 5]) ** 0.2 for n in range(N - 4, N + 1))
    theta0 = arb(2.0 ** (-(prec - 10) / (N + 1)) / R / 2)
    x = [mid(fc.horner([an[i] for an in a], theta0)) for i in range(5)]
    return integrate(x, kappa, arb(T), -prec + 20, order=order, record=record, stop=classify)


def bisect(c_lo, c_hi, nbits, **kw):
    s_lo = shoot(c_lo, **kw)[0]
    s_hi = shoot(c_hi, **kw)[0]
    assert s_lo != s_hi and s_lo != 0 and s_hi != 0, (s_lo, s_hi)
    for it in range(nbits):
        cm = mid((c_lo + c_hi) / 2)
        sm = shoot(cm, **kw)[0]
        if sm == s_lo:
            c_lo = cm
        elif sm == s_hi:
            c_hi = cm
        else:
            raise RuntimeError('no escape within T at c=%s' % cm)
    return c_lo, c_hi, s_lo, s_hi


if __name__ == '__main__':
    prec = int(sys.argv[1]); nbits = int(sys.argv[2])
    ctx.prec = prec
    c_lo, c_hi = arb(sys.argv[3]), arb(sys.argv[4])
    t0 = time.time()
    lo, hi, slo, shi = bisect(c_lo, c_hi, nbits)
    print('eps', fc.eps_txt(), 'prec', prec, 'bracket', lo.str(int(prec * 0.3), radius=False), hi.str(int(prec * 0.3), radius=False),
          'signs', slo, shi, 'time %.1fs' % (time.time() - t0))
