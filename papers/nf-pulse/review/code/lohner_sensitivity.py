#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""A sensitive containment test for lohner.py (code review, 2026-09-26).

run_all.sh cannot see most integrator bugs: at order 30 and tol 1e-45 the remainder, the Picard enclosure
and the wrapping terms are 20 or more orders of magnitude below the widths that decide the proof, so an
unsound integrator produces the same verdicts.  This test makes those terms matter:

 (a) point start, coarse settings (order 8, tol 1e-12): the enclosure must contain mpmath's solution;
 (b) kappa ball of radius 1e-7 around 1/c1, point start: must contain the solutions at both kappa ends
     (exercises d/dkappa in the Jacobian);
 (c) a box of radius 1e-7 in U and Q, fixed kappa: must contain the solutions from its four corners
     (exercises the C r0 + B r representation, the QR step and B^{-1}).

The reference is mpmath.odefun on the ORIGINAL 4D system (S evaluated directly, no Y), dps 40.
usage: python3 lohner_sensitivity.py <code dir>     prints one line per case and 'SENSITIVITY PASS/FAIL'.
"""
import sys, os
code = os.path.abspath(sys.argv[1])
sys.path.insert(0, code)
os.chdir(code)
from flint import arb, ctx, fmpq
ctx.prec = 256
import mpmath as mp
import nfcore as nf, certify_rest as cr, manifold as mf, lohner as lo

mp.mp.dps = 40


def ref_solution(x0, kappa_str):
    beta, theta, eps = mp.mpf(20), mp.mpf(1) / 4, mp.mpf(1) / 10
    k = mp.mpf(kappa_str)
    S = lambda u: 1 / (1 + mp.exp(-beta * (u - theta)))
    f = lambda t, y: [k * (y[2] - y[0] - y[1]), eps * k * y[0], y[3], y[2] - S(y[0])]
    return mp.odefun(f, 0, [mp.mpf(v) for v in x0], tol=mp.mpf(10) ** -32, degree=30)


def s70(a):
    return a.mid().str(45, radius=False)


def run_case(label, box5, kap, refs, times, order=8, tol=1e-12, hmax=0.25):
    X = lo.LohnerSet.from_box(box5 + [kap])
    t = 0.0
    ok = True
    for Tc in times:
        try:
            X, tt, ns = lo.integrate(X, Tc, order=order, tol=tol, hmax=hmax, t0=t)
        except Exception as e:                       # a step failure is not a containment failure
            print('%-6s t=%4.1f integrator raised %r' % (label, Tc, e)); return None
        t = float(tt.mid())
        hx = X.hull()
        for j, sol in enumerate(refs):
            ref = sol(mp.mpf(tt.mid().str(45, radius=False)))
            ins = all(hx[i].contains(arb(mp.nstr(ref[i], 38))) for i in range(4))
            if not ins:
                ok = False
                miss = max(float(abs(hx[i].mid() - arb(mp.nstr(ref[i], 38)))) - float(hx[i].rad()) for i in range(4))
                print('%-6s t=%4.1f ref %d NOT contained (excess %.2e, radius %.2e)' % (label, Tc, j, miss, max(float(hx[i].rad()) for i in range(4))))
        if ok:
            print('%-6s t=%4.1f all refs contained, radius %.2e' % (label, Tc, max(float(hx[i].rad()) for i in range(4))), flush=True)
    return ok


if __name__ == '__main__':
    c = cr.C1
    kappa = 1 / c
    s = nf.dS(arb(0)); co = cr.charpoly_coeffs(kappa, s, nf.EPS); lam = cr.refine(co, arb('0.5'), arb('1.2'))
    ok, a, r, info = mf.validate(kappa, lam, arb(fmpq(1, 7)), 80)
    x0 = mf.evaluate(a, r, arb(fmpq(1, 4)))
    xm = [arb(v.mid()) for v in x0]                     # exact point start (Y = S(U) only approximately)
    xm[4] = nf.S(xm[0])                                   # put Y on the invariant surface
    x4 = [s70(v) for v in xm[:4]]
    km = arb(kappa.mid())
    results = []
    times = [2, 4, 6, 8, 10, 12]
    # (a)
    results.append(run_case('(a)', xm, km, [ref_solution(x4, s70(km))], times))
    # (b)
    dk = arb(fmpq(1, 10 ** 7))
    kb = km + arb(0, dk.upper())
    refs = [ref_solution(x4, s70(km - dk)), ref_solution(x4, s70(km + dk))]
    results.append(run_case('(b)', xm, kb, refs, times))
    # (c)  box in U and Q (Y enclosure widened to S of the U range)
    d = fmpq(1, 10 ** 7)
    box = list(xm)
    box[0] = xm[0] + arb(0, arb(d).upper())
    box[2] = xm[2] + arb(0, arb(d).upper())
    box[4] = nf.S(box[0])
    refs = []
    for su in (-1, 1):
        for sq in (-1, 1):
            p = list(xm)
            p[0] = xm[0] + su * arb(d); p[2] = xm[2] + sq * arb(d)
            refs.append(ref_solution([s70(v) for v in p[:4]], s70(km)))
    results.append(run_case('(c)', box, km, refs, times))
    good = all(r is True for r in results)
    print('SENSITIVITY', 'PASS' if good else 'FAIL', results)
