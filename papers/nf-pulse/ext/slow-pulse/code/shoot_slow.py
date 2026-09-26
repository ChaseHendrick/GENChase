#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""High-precision (NOT rigorous) shooting with a first-return criterion, for the slow pulse.

usage: python3 shoot_slow.py PREC NBITS C_LO C_HI [T]

Leaves rest on the branch of the one-dimensional unstable manifold where U increases (manifold series and
Taylor integrator of ../../../code/shoot_hp.py, arb midpoint arithmetic, tolerance 2^(20-PREC)).  After the
first excursion (U rises above theta and falls back below it) the orbit is classified by what it does next:
   +1  it fires again (U crosses theta upward) or escapes into E_up = {Q > 1, P > 0};
   -1  it escapes into E_dn = {Q < 0, P < 0} without firing again.
The switch between the two is where the orbit, after one excursion, leaves the neighbourhood of rest on one or
the other side of the unstable direction.  A switch is a homoclinic orbit (a pulse) only if the orbit actually
returns to rest there; the program therefore also prints d_min, the least distance to rest after the first
excursion and before the decision, which must go to 0 as the bracket shrinks.  At a wave-train transition it
does not (the orbit instead settles on a periodic orbit away from rest).
"""
import sys, time, math
import slowparams as sp
from flint import arb, ctx
import nfcore as nf
import shoot_hp as sh


def first_return(c, T=400, N=60, order=40, record=None):
    kappa = 1 / c
    prec = ctx.prec
    lam, a = sh.manifold_coeffs(kappa, N, arb(1))
    nrm = [max(abs(float(ai.mid())) for ai in an) for an in a]
    R = max((nrm[n] / nrm[n - 5]) ** 0.2 for n in range(N - 4, N + 1))
    theta0 = arb(2.0 ** (-(prec - 10) / (N + 1)) / R / 2)
    x = sh.eval_manifold(a, theta0)
    xs = nf.rest_state()
    th = nf.THETA
    st = {'phase': 0, 'dmin': None, 'peak': None, 'tdmin': None}

    def stop(x):
        U, V, Q, P, Y = x
        if Q > 1 and P > 0:
            return +1
        if Q < 0 and P < 0:
            return -1
        if st['phase'] == 0:
            if U > th:
                st['phase'] = 1
        elif st['phase'] == 1:
            st['peak'] = U if st['peak'] is None else st['peak'].max(U)
            if U < th:
                st['phase'] = 2
        else:
            if U > th:
                return +1
            d = math.sqrt(sum(float((x[i] - xs[i]).mid()) ** 2 for i in range(4)))
            if st['dmin'] is None or d < st['dmin']:
                st['dmin'] = d
        return 0

    r, t, xe = sh.integrate(x, kappa, arb(T), tol_exp=-prec + 20, order=order, record=record, stop=stop)
    return r, st, t


def bisect(c_lo, c_hi, nbits, T=400):
    s_lo = first_return(c_lo, T)[0]
    s_hi = first_return(c_hi, T)[0]
    assert s_lo != s_hi and s_lo != 0 and s_hi != 0, (s_lo, s_hi)
    hist = []
    for it in range(nbits):
        cm = arb(((c_lo + c_hi) / 2).mid())
        sm, st, t = first_return(cm, T)
        if sm == 0:
            raise RuntimeError('undecided within T at c=%s' % cm)
        if sm == s_lo:
            c_lo = cm
        else:
            c_hi = cm
        hist.append((it, float((c_hi - c_lo).mid()), st['dmin'], float(t.mid())))
    return c_lo, c_hi, s_lo, s_hi, hist


if __name__ == '__main__':
    prec = int(sys.argv[1]); nbits = int(sys.argv[2])
    ctx.prec = prec
    c_lo, c_hi = arb(sys.argv[3]), arb(sys.argv[4])
    T = float(sys.argv[5]) if len(sys.argv) > 5 else 400
    t0 = time.time()
    lo, hi, slo, shi, hist = bisect(c_lo, c_hi, nbits, T)
    print('params', sp.TXT, 'prec', prec)
    for it, w, dmin, t in hist[::max(1, nbits // 20)] + hist[-1:]:
        print('  step %3d  bracket width %.3e  d_min after first excursion %.3e  decided at xi = %.1f' % (it, w, dmin if dmin is not None else float('nan'), t))
    print('bracket', lo.str(60, radius=False), hi.str(60, radius=False), 'signs', slo, shi, 'time %.1fs' % (time.time() - t0))
