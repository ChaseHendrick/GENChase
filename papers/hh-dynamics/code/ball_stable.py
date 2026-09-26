"""The stable periodic orbit for every E_l in [10.59, 10.62]: the ball is cut into pieces, and on
each piece a box Z on the section {u = SEC_LEVEL, du/dt > 0} is shown to satisfy

    (a) P_E(Z) is contained in the interior of Z for every E in the piece      (C^0 run over Z x piece)
    (b) sup over Z x piece of ||DP_E||_inf < 1                                   (C^1 run over Z x piece)

By (a) and Brouwer, P_E has a fixed point in Z; by (b) and the mean value inequality on the convex
box Z, P_E is a contraction of Z in the max-norm, so the fixed point is unique in Z and attracting,
and every nontrivial Floquet multiplier mu satisfies |mu| <= ||DP_E(z*)||_inf < 1.  The first-return
property (and so the minimal period) is certified by the Poincare-map routine.

The section level is the single constant SEC_LEVEL: the initial sets are built from SEC.c and the crossing
is detected on SEC, and poincare() refuses an initial set that is not exactly on the section.

Bounds are returned as exact rationals (fractions.Fraction, picklable across the worker processes): the
lower bounds are exact lower endpoints of arb balls and the upper bounds exact upper endpoints.
"""
import time
import numpy as np
from flint import arb, arb_mat, ctx

from hh_lohner import Integrator, Section, poincare
from certlib import section_set, infnorm_upper, infnorm_lower
from hh_arb import HH
from outward import lo_frac, hi_frac

ORDER, TOL_REM, SCALE = 20, 1e-18, [100, 1, 1, 1, 10]
SEC_LEVEL = 20.0                     # the section of the stable orbit (Theorems B(i) and C)
SEC = Section(0, SEC_LEVEL, 1)
F = [1, 2, 3]


def _run(sysm, sec, zb, zr, E, C1):
    integ = Integrator(sysm, order=ORDER, tol=TOL_REM * 1e-3, tol_rem=TOL_REM, hmax=2.0, scale=SCALE, C1=C1)
    return poincare(integ, section_set(5, sec.idx, sec.c, F, zb, zr, [(4, E)], C1), sec)


def prove_piece(args):
    """args = (lo, hi, zguess, prec[, options]); options: 'sec' (a Section, default SEC), 'box_factor'
    (the box radius is box_factor times the defect of the centre, default 3; the negative control uses
    0.3), 'centre_iters' (iterations of P to centre the box, default 2), 'J' (default 8)."""
    lo, hi, zguess, prec = args[:4]
    opts = args[4] if len(args) > 4 else {}
    sec = opts.get('sec', SEC)
    box_factor = opts.get('box_factor', 3.0)
    centre_iters = opts.get('centre_iters', 2)
    ctx.prec = prec
    t0 = time.time()
    sysm = HH(opts.get('J', 8))
    E = arb(lo).union(arb(hi))
    zb = list(zguess)
    out = {'lo': lo, 'hi': hi, 'ok': False, 'inside': False, 'completed': False, 'norm': float('nan'),
           'norm_hi': None, 'norm_lo': None, 'zb': zb, 'zr': None, 'tau_lo': None, 'tau_hi': None,
           'umax_lo': None, 'time': 0.0, 'err': ''}
    try:
        for it in range(centre_iters):              # contraction steps to centre the box
            r = _run(sysm, sec, zb, [0, 0, 0], E, False)
            P = [r['P'][j, 0] for j in F]
            zb = [float(p.mid()) for p in P]
        r = _run(sysm, sec, zb, [0, 0, 0], E, False)
        P = [r['P'][j, 0] for j in F]
        dev = [abs(float(P[i].mid()) - zb[i]) + float(P[i].rad()) for i in range(3)]
        zr = [max(box_factor * d, 1e-13) for d in dev]
        rc = _run(sysm, sec, zb, zr, E, False)
        PZ = [rc['P'][j, 0] for j in F]
        inside = all(arb(zb[i], zr[i]).contains_interior(PZ[i]) for i in range(3))
        r1 = _run(sysm, sec, zb, zr, E, True)
        DP = arb_mat(3, 3, [r1['DP'][a, b] for a in F for b in F])
        nrmb = infnorm_upper(DP)
        ok = inside and (nrmb < 1)
        tau = r1['tau']
        out.update({'ok': ok, 'inside': inside, 'completed': True, 'norm': float(nrmb),
                    'norm_hi': hi_frac(nrmb), 'norm_lo': lo_frac(infnorm_lower(DP)), 'zb': zb, 'zr': zr,
                    'tau_lo': lo_frac(tau), 'tau_hi': hi_frac(tau), 'umax_lo': lo_frac(r1['extremes'][0][2]),
                    'PZ_minus_Z': [(PZ[i].str(10, radius=True), arb(zb[i], zr[i]).str(10, radius=True))
                                   for i in range(3)]})
    except Exception as e:                          # a failed piece is reported, not hidden
        out['err'] = repr(e)
    out['time'] = time.time() - t0
    return out


def pieces(n=60, lo=10.59, hi=10.62):
    from decimal import Decimal
    a, b = Decimal(str(lo)), Decimal(str(hi))
    step = (b - a) / n
    return [(str(a + k * step), str(a + (k + 1) * step)) for k in range(n)]


def prove_ball(z0, E0, dzdE, log, n=60, prec=96, workers=4):
    """z0: fixed point at E0 (float), dzdE: its derivative (linear predictor for the centres)."""
    from multiprocessing import get_context
    ps = pieces(n)
    args = []
    for lo, hi in ps:
        em = 0.5 * (float(lo) + float(hi))
        zg = [float(z0[i] + dzdE[i] * (em - E0)) for i in range(3)]
        args.append((lo, hi, zg, prec))
    with get_context('fork').Pool(workers) as pool:
        res = pool.map(prove_piece, args, chunksize=1)
    # split failures once
    out = []
    for r in res:
        if r['ok']:
            out.append(r)
            continue
        log('    piece [%s, %s] failed (%s); splitting' % (r['lo'], r['hi'], r['err'] or 'test'))
        from decimal import Decimal
        m = str((Decimal(r['lo']) + Decimal(r['hi'])) / 2)
        sub = [prove_piece((r['lo'], m, r['zb'], prec)), prove_piece((m, r['hi'], r['zb'], prec))]
        out.extend(sub)
    return out
