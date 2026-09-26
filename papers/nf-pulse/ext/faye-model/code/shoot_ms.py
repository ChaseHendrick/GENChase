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
"""Staged high-precision bisection for the fast pulse speed (NOT rigorous; the proof only needs a bracket,
and prove_pulse.py checks it).

A plain bisection integrates every shot from the rest state; at small eps the orbit must be followed for a long
time before a shot is classified, and a few hundred digits are needed.  Here the bracket [ca, cb] carries the
two end orbits at a checkpoint time tc.  For c in the bracket, x_c(tc) is approximated by linear interpolation
between x_ca(tc) and x_cb(tc) (error of second order in the bracket width, negligible while the end orbits are
still close), each shot starts there, and it is classified by the invariant regions of Hastings's
Proposition 1 (shoot_hp.classify).  The first stage is a plain bisection to relative width 1e-20.  After a batch of halvings the two new end orbits are recomputed from the rest state (an interpolated end state would
carry its second-order error into every later stage, where it is magnified) and the checkpoint is moved forward: they
are integrated at full precision until they separate to SEP.  A shot only has to resolve the separation of
the end orbits, so it runs at reduced precision (the separation's bits plus 90).
usage: FAYE_EPS=1/100 python3 shoot_ms.py prec c_lo c_hi digits [order]
"""
import sys, time, math
from flint import arb, ctx
import os
import fcore as fc
import shoot_hp as sh


SEP = float(os.environ.get('NF_SEP', '1e-20'))    # separation of the end orbits at which the checkpoint stops
SORDER = int(os.environ.get('NF_SORDER', '30'))  # Taylor order of the reduced-precision shots


def mid(x):
    return arb(x.mid())


def start_state(c, N=60):
    kappa = 1 / c
    lam, a = sh.mf.coefficients_numeric(mid(kappa), N)
    nrm = [max(abs(float(ai.mid())) for ai in an) for an in a]
    R = max((nrm[n] / nrm[n - 5]) ** 0.2 for n in range(N - 4, N + 1))
    theta0 = arb(2.0 ** (-(ctx.prec - 10) / (N + 1)) / R / 2)
    return [mid(fc.horner([an[i] for an in a], theta0)) for i in range(5)]


def step_fixed(x, kappa, h, order):
    cs = fc.taylor(x, kappa, order)
    return [mid(fc.horner(cs[i], h)) for i in range(5)]


def run_pair(xa, xb, ka, kb, t, sep, order, tol_exp, hmax=0.25):
    """Advance two orbits with common step sizes until max |xa - xb| > sep; returns states and time."""
    tol = 2.0 ** tol_exp
    while True:
        d = max(abs(float((xa[i] - xb[i]).mid())) for i in range(4))
        if d > sep:
            return xa, xb, t
        cs = fc.taylor(xa, ka, order)
        m = max(abs(float(cs[i][order].mid())) for i in range(5)) + max(abs(float(cs[i][order - 1].mid())) for i in range(5))
        h = arb(min(hmax, (tol / max(m, 1e-300)) ** (1.0 / order) * 0.5))
        xa = [mid(fc.horner(cs[i], h)) for i in range(5)]
        xb = step_fixed(xb, kb, h, order)
        t = t + h


def true_state(c, tc, order, tol_exp):
    if tc == 0:
        return start_state(c)
    return sh.integrate(start_state(c), 1 / c, tc, tol_exp, order=order)[2]


def classify_from(x, kappa, order, tol_exp, T=3000):
    return sh.integrate(x, kappa, arb(T), tol_exp, order=order, stop=sh.classify)[0]


def main(prec, c_lo, c_hi, digits, order):
    ctx.prec = prec
    tol_exp = -prec + 20
    t0 = time.time()
    ca, cb = arb(c_lo), arb(c_hi)
    # plain bisection (every shot from the rest state) to relative width 1e-20: the interpolation below has a
    # second-order error, which is harmless only once the bracket is narrow
    ctx.prec = 160                     # 1e-20 needs no more
    sa = classify_from(start_state(ca), 1 / ca, SORDER, -140)
    sb = classify_from(start_state(cb), 1 / cb, SORDER, -140)
    assert sa != sb and sa != 0 and sb != 0, (sa, sb)
    while (cb - ca) > arb('1e-20') * cb:
        cm = mid((ca + cb) / 2)
        sm = classify_from(start_state(cm), 1 / cm, SORDER, -140)
        if sm == 0:
            raise RuntimeError('unclassified shot at c = %s' % cm.str(30))
        if sm == sa:
            ca = cm
        else:
            cb = cm
    ctx.prec = prec
    ca, cb = arb(ca), arb(cb)
    print('plain bisection to width 1e-20 done (%.0fs)' % (time.time() - t0), flush=True)
    xa, xb = start_state(ca), start_state(cb)
    tc = arb(0)
    target = arb(10) ** (-digits)
    while (cb - ca) > target * cb:
        # linear interpolation of the checkpoint states
        # a shot only has to resolve the separation of the end orbits: run it at reduced precision
        sep_now = max(abs(float((xa[i] - xb[i]).mid())) for i in range(4))
        sprec = min(prec, max(128, int(-math.log2(max(sep_now, 1e-300))) + 90))
        for _ in range(24):
            cm = mid((ca + cb) / 2)
            lam = (cm - ca) / (cb - ca)
            xm = [mid(xa[i] + lam * (xb[i] - xa[i])) for i in range(5)]
            ctx.prec = sprec
            sm = classify_from([mid(v) for v in xm], 1 / cm, SORDER, -sprec + 20)
            ctx.prec = prec
            if sm == 0:
                raise RuntimeError('unclassified shot at c = %s' % cm.str(30))
            if sm == sa:
                ca, xa = cm, xm
            else:
                cb, xb = cm, xm
        # true end states at tc (integrated from the rest state, not interpolated: an interpolated end state
        # carries a second-order error that later stages would magnify), then move the checkpoint forward
        # while the end orbits stay close (linear regime)
        xa = true_state(ca, tc, order, tol_exp)
        xb = true_state(cb, tc, order, tol_exp)
        xa, xb, tc = run_pair(xa, xb, 1 / ca, 1 / cb, tc, SEP, order, tol_exp)
        print('xi_c %8.3f  width %.3e  shot prec %d  (%.0fs)' % (float(tc.mid()), float(((cb - ca) / cb).mid()), sprec, time.time() - t0), flush=True)
        # the current bracket in full, so that a run cut short can be resumed from it
        print('  bracket', ca.str(prec // 3, radius=False), cb.str(prec // 3, radius=False), flush=True)
    return ca, cb, sa, sb


if __name__ == '__main__':
    prec = int(sys.argv[1])
    digits = int(sys.argv[4])
    order = int(sys.argv[5]) if len(sys.argv) > 5 else 60
    ctx.prec = prec
    lo, hi, sa, sb = main(prec, sys.argv[2], sys.argv[3], digits, order)
    print('eps', fc.eps_txt(), 'prec', prec, 'bracket', lo.str(digits + 12, radius=False), hi.str(digits + 12, radius=False), 'signs', sa, sb)
