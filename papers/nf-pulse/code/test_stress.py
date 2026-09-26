#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Low-order stress test of the rigorous integrator (from the code review of 2026-09-26,
# review/lead/code/lohner_stress.py).
#
# HOW TO RUN:   python3 test_stress.py      (from this folder; run by run_all.sh)
#
# At production settings (order 30, tol 1e-45) the Taylor remainder, the a priori set and the inverse of
# the QR factor contribute errors far below the enclosure radius, so a program that drops or corrupts any
# of them still prints the same verdicts.  This test runs the SAME integrator at low order, where
# those terms dominate: (A) from a point initial condition at c = c1, order 8, tol 1e-10; (B) from the same point with kappa a ball over c in [c1 - 1e-6, c1 + 1e-6], order 12,
# and checks that the enclosure at xi = 2, 4, 6, 8 contains independent mpmath solutions (original 4D
# system, S(U) evaluated directly), in B at both ends and the middle of the speed interval.  It prints STRESS PASS or
# STRESS FAIL and exits with status 0 or 1.  About 20 seconds.
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.chdir(HERE)
from flint import arb, ctx, fmpq
ctx.prec = 256
import mpmath as mp
import nfcore as nf, certify_rest as cr, manifold as mf, lohner as lo

ctx.prec = 256
W = fmpq(1, 10**6)
c1 = fmpq(11027477097341592491478677, 10**25)
speeds = [c1 - W, c1, c1 + W]
mp.mp.dps = 40


def manifold_box(cc):
    kappa = 1 / cc
    s = nf.dS(arb(0))
    co = cr.charpoly_coeffs(kappa, s, nf.EPS)
    lam = cr.refine(co, arb('0.5'), arb('1.2'))
    ok, a, r, info = mf.validate(kappa, lam, arb(fmpq(1, 7)), 80)
    nf.require(ok, info)
    return mf.evaluate(a, r, arb(fmpq(1, 4))), kappa


def reference(c, x0):
    k = mp.mpf(int(c.q)) / mp.mpf(int(c.p))
    S = lambda u: 1 / (1 + mp.exp(-20 * (u - mp.mpf(1) / 4)))
    f = lambda t, y: [k * (y[2] - y[0] - y[1]), k * y[0] / 10, y[3], y[2] - S(y[0])]
    return mp.odefun(f, 0, [mp.mpf(v.mid().str(50, radius=False)) for v in x0[:4]], tol=mp.mpf(10) ** -32, degree=30)


def run(name, box, kappa, cases, order, tol):
    X = lo.LohnerSet.from_box(box + [kappa])
    t, ok = 0.0, True
    for Tc in (2, 4, 6, 8):
        X, tt, ns = lo.integrate(X, Tc, order=order, tol=tol, hmax=0.25, t0=t)
        t = float(tt.mid())
        hx = X.hull()
        tm = mp.mpf(tt.mid().str(50, radius=False))
        for c, sol in cases:
            ref = sol(tm)
            inside = all(hx[i].contains(arb(mp.nstr(ref[i], 38))) for i in range(4))
            dev = max(abs(float(hx[i].mid()) - float(ref[i])) for i in range(4))
            ok &= inside
            print('%s xi=%g c=%s contained: %-5s  max radius %.2e  |mid - ref| %.2e' % (
                name, Tc, mp.nstr(mp.mpf(int(c.p)) / int(c.q), 10), inside,
                max(float(hx[i].rad()) for i in range(4)), dev), flush=True)
    return ok


# A: thin speed c1, point initial condition, order 8: the remainder and the a priori set dominate.
x0, k1 = manifold_box(arb(c1))
x0 = [arb(v.mid()) for v in x0]                         # exact point: the reference starts there too
okA = run('A', x0, k1, [(c1, reference(c1, x0))], 8, 1e-10)
# B: same point initial condition, kappa a ball over c in [c1 - 1e-6, c1 + 1e-6]: the speed width
#    must be carried by the kappa column of the Jacobian and by the initial set.
kB = 1 / arb(speeds[0]).union(arb(speeds[2]))
okB = run('B', x0, kB, [(c, reference(c, x0)) for c in speeds], 12, 1e-16)
ok = okA and okB
print('STRESS PASS' if ok else 'STRESS FAIL')
sys.exit(0 if ok else 1)
