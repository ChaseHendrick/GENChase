#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""RIGOROUS: enclosures of every orbit of the unstable-manifold branch for every speed c in a narrow bracket
[c_lo, c_hi], on the whole interval [XI_MINUS, T_FAR], for the rigorous Evans function (evans_rig.py).

Uses the base programs unchanged: manifold.py (validated unstable manifold), lohner.py (C^0-Lohner integrator),
block.py (isolating block) via prove_pulse.block_data.  Coordinates as in prove_pulse.py: xi = 0 at P(1/4).

 * xi in [XI_MINUS, 0]:  x(xi) = P(t), t = exp(lam_u xi)/4; node boxes P(t_n), step enclosures P([t_n, t_n+1]).
 * xi in [0, T_FAR]:     Lohner integration of the box {P(1/4)} x {kappa in 1/[c_lo, c_hi]}; node hulls and the
                         a priori step enclosures W are recorded.
 * At xi = T_B the whole enclosure must lie in the interior of the block B (with the thin runs c_lo -> K-,
   c_hi -> K+ of prove_pulse.py this re-proves the existence of a pulse with speed in (c_lo, c_hi)).
 * At xi = T_FAR the enclosure of y' = (y2, y3, y4), y = T (x - x*), gives eta0 >= |y'(T_FAR)| for the right tail.
 * Left tail: C_U with |U(xi)| <= C_U t for t = exp(lam_u xi)/4 <= 1, and lam_u >= lam_lo.
Output: data/pulse_records.pkl (exact serialisation of the balls) and data/pulse_enclosure.json.
usage: python3 pulse_enclosure.py c_lo c_hi [T_B T_FAR XI_MINUS]
"""
import sys, os, json, time, pickle, math
import _paths
from flint import arb, ctx, fmpq
PREC = int(os.environ.get('NF_STAB_PREC', '384'))
ctx.prec = PREC
import nfcore as nf, certify_rest as cr, manifold as mf, lohner as lo
import prove_pulse as pp
ctx.prec = PREC

ORDER = int(os.environ.get('NF_STAB_ORDER', '36'))
TOL = float(os.environ.get('NF_STAB_TOL', '1e-75'))


def ser(x):
    """exact serialisation of an arb ball: (mid mantissa, mid exponent, rad mantissa, rad exponent)."""
    m, e = x.mid().man_exp()
    rm, re = x.rad().man_exp()
    return (int(m), int(e), int(rm), int(re))


def deser(t):
    m, e, rm, re = t
    return arb(m) * arb(2) ** e + arb(0, arb(rm) * arb(2) ** re)


def main(c_lo, c_hi, T_B=100, T_far=115, xi_minus=-16, h_left=fmpq(1, 4)):
    t0 = time.time()
    ctx.prec = PREC
    T, Tinv, rho, r, binfo = pp.block_data()
    xstar = nf.rest_state()
    s = nf.dS(arb(0))
    cc = c_lo.union(c_hi)
    kappa = 1 / cc
    co = cr.charpoly_coeffs(kappa, s, nf.EPS)
    lam = cr.refine(co, arb('0.5'), arb('1.2'))
    sigma = arb(fmpq(1, 7))
    ok, a, rr, minfo = mf.validate(kappa, lam, sigma, 80)
    assert ok, minfo
    info = {'c_lo': c_lo.str(70, radius=False), 'c_hi': c_hi.str(70, radius=False), 'prec': PREC, 'order': ORDER,
            'tol': TOL, 'T_B': T_B, 'T_far': T_far, 'xi_minus': xi_minus, 'lam_u': lam.str(30),
            'manifold_ok': ok, 'block': binfo}
    recs = []            # (t_start, h, hull[6], W[6]) all exact / balls
    # ---- left part from the manifold
    n_left = int(round(-xi_minus / (float(h_left))))
    hl = arb(h_left)
    for n in range(n_left):
        xs = arb(xi_minus) + n * hl
        tn = (lam * xs).exp() / 4
        tn1 = (lam * (xs + hl)).exp() / 4
        hull = mf.evaluate(a, rr, tn) + [kappa]
        W = mf.evaluate(a, rr, tn.union(tn1)) + [kappa]
        assert bool(abs(tn1).upper() <= 1)
        recs.append((xs, hl, hull, W))
    # left tail constant: |P_U(t)| <= |t| (sum_{n>=1} |a_{n,U}| + r_U) for |t| <= 1
    C_U = sum((arb(an[0].abs_upper()) for an in a[1:]), arb(0)) + rr[0]
    info['C_U'] = C_U.str(15)
    info['t_minus_upper'] = ((lam * arb(xi_minus)).exp() / 4).str(15)
    info['lam_lo'] = arb(lam.lower()).str(20)
    # ---- Lohner part
    x0 = mf.evaluate(a, rr, arb(fmpq(1, 4)))
    X = lo.LohnerSet.from_box(x0 + [kappa])
    state = {'prev': X.hull(), 'maxrad': 0.0}

    def cb(tp, t, Xn, W):
        recs.append((tp, t - tp, state['prev'], W))
        state['prev'] = Xn.hull()
        return False
    X, t, ns = lo.integrate(X, T_B, order=ORDER, tol=TOL, hmax=0.25, callback=cb)
    assert float(t.mid()) == float(T_B)
    y = X.affine_image_hull(pp.T6(T), xstar + [arb(0), arb(0)])
    inB = pp.in_int_B(y, rho, r)
    info['steps_to_T_B'] = ns
    info['y_at_T_B'] = [v.str(10) for v in y]
    info['in_int_B_at_T_B'] = inB
    print('at T_B = %s: in int B: %s  y = %s (%.0fs)' % (T_B, inB, [v.str(5) for v in y], time.time() - t0), flush=True)
    X, t2, ns2 = lo.integrate(X, T_far, order=ORDER, tol=TOL, hmax=0.25, callback=cb, t0=float(t.mid()))
    assert float(t2.mid()) == float(T_far)
    y = X.affine_image_hull(pp.T6(T), xstar + [arb(0), arb(0)])
    hx = X.hull()
    eta0 = pp.ynorm2_upper(y[1:])
    info['steps_to_T_far'] = ns + ns2
    info['y_at_T_far'] = [v.str(10) for v in y]
    info['x_at_T_far'] = [v.str(10) for v in hx]
    info['maxrad_at_T_far'] = max(float(v.rad()) for v in hx[:5])
    info['eta0 >= |y\'(T_far)|'] = eta0.str(15)
    info['in_int_B_at_T_far'] = pp.in_int_B(y, rho, r)
    info['n_records'] = len(recs)
    info['time_s'] = round(time.time() - t0)
    print(json.dumps({k: v for k, v in info.items() if k != 'block'}, indent=1), flush=True)
    out = {'info': info, 'eta0': ser(eta0),
           'recs': [(ser(arb(ts)), ser(arb(h)), [ser(v) for v in hull], [ser(v) for v in W]) for ts, h, hull, W in recs],
           'C_U': ser(C_U), 'lam': ser(lam), 'kappa': ser(kappa), 'T': [[ser(T[i, j]) for j in range(4)] for i in range(4)],
           'Tinv': [[ser(Tinv[i, j]) for j in range(4)] for i in range(4)]}
    pickle.dump(out, open(_paths.DATA + '/pulse_records.pkl', 'wb'))
    json.dump(info, open(_paths.DATA + '/pulse_enclosure.json', 'w'), indent=1)
    return info


if __name__ == '__main__':
    def dec(sv):                                   # exact decimal string -> exact rational ball
        ip, fp = sv.split('.')
        return arb(fmpq(int(ip + fp), 10 ** len(fp)))
    c_lo, c_hi = dec(sys.argv[1]), dec(sys.argv[2])
    args = [int(v) for v in sys.argv[3:]]
    main(c_lo, c_hi, *args)
