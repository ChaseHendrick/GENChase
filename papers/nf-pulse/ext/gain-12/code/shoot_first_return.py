#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""High-precision (NOT rigorous) shooting by FIRST RETURN, for the one-pulse homoclinic at gain 12.

The escape classifier of shoot_hp.py (E_up = {Q > 1, P > 0}, E_dn = {Q < 0, P < 0}) records only where the orbit
finally goes.  At gain 12 an orbit near the fast pulse fires, returns near rest, and may fire again, so its switch
can be that of a multi-pulse.  Here the orbit is classified at its FIRST return after the excitation (max U > 0.3):
+1 if it first enters the cone K+ = {y1 > |y'|} of the block coordinates y = T (x - x*) inside |y| < R0, or E_up;
-1 if it first enters K- or E_dn.  Bisection in c brackets the switch.
"""
import sys, time
import numpy as np
from flint import arb, ctx, fmpq
import nfcore as nf, shoot_hp as sh, block as bl

R0 = 0.05


def classifier():
    T, Ti = bl.setup()
    Tm = [[arb(T[i, j].mid()) for j in range(4)] for i in range(4)]
    xs = nf.rest_state()
    st = {'excited': False}

    def stop(x):
        c = sh.classify(x)
        if c:
            return c
        if not st['excited']:
            if x[0] > 0.3:
                st['excited'] = True
            return 0
        d = [x[i] - xs[i] for i in range(4)]
        y = [sum((Tm[a][i] * d[i] for i in range(4)), arb(0)) for a in range(4)]
        yf = [float(v.mid()) for v in y]
        ny = np.linalg.norm(yf[1:])
        if np.hypot(yf[0], ny) < R0 and abs(yf[0]) > ny:
            return 1 if yf[0] > 0 else -1
        return 0
    return stop


def shoot(c, T=300):
    return sh.shoot(c, T=T, record=None) if False else _shoot(c, T)


def _shoot(c, T):
    kappa = 1 / c
    lam, a = sh.manifold_coeffs(kappa, 60, arb(1))
    nrm = [max(abs(float(ai.mid())) for ai in an) for an in a]
    R = max((nrm[n] / nrm[n - 5]) ** 0.2 for n in range(56, 61))
    theta0 = arb(2.0 ** (-(ctx.prec - 10) / 61) / R / 2)
    x = sh.eval_manifold(a, theta0)
    return sh.integrate(x, kappa, arb(T), tol_exp=-ctx.prec + 20, order=40, stop=classifier())


if __name__ == '__main__':
    ctx.prec = int(sys.argv[1])
    mode = sys.argv[2]
    if mode == 'scan':
        lo, hi, n = float(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5])
        for i in range(n + 1):
            c = lo + (hi - lo) * i / n
            r, t, x = _shoot(arb(c), 300)
            print('%.6f' % c, r, round(float(t.mid()), 2), flush=True)
    else:
        nbits = int(sys.argv[3]); c_lo = arb(sys.argv[4]); c_hi = arb(sys.argv[5])
        t0 = time.time()
        s_lo = _shoot(c_lo, 300)[0]; s_hi = _shoot(c_hi, 300)[0]
        assert s_lo != s_hi and s_lo and s_hi, (s_lo, s_hi)
        for _ in range(nbits):
            cm = arb(((c_lo + c_hi) / 2).mid())
            sm = _shoot(cm, 300)[0]
            if sm == s_lo:
                c_lo = cm
            elif sm == s_hi:
                c_hi = cm
            else:
                raise RuntimeError('unclassified at c=%s' % cm)
        print('prec', ctx.prec, 'bracket', c_lo.str(60, radius=False), c_hi.str(60, radius=False), s_lo, s_hi,
              'time %.1fs' % (time.time() - t0))
