"""High-precision (non-rigorous use of the rigorous Taylor code) refinement of a periodic orbit:
Newton iteration on the midpoints of thin C^1 runs at high working precision."""
import time
import numpy as np
from flint import arb, arb_mat, acb_mat, ctx
from hh_lohner import Integrator, poincare, col, ident
from certlib import section_set
from hh_arb import HH

SCALE = [100, 1, 1, 1, 10]


def hp_orbit(kind, sec, zbar, Estr, log, prec=192, order=30, tol_rem=1e-45, iters=3, J=8):
    old = ctx.prec
    ctx.prec = prec
    try:
        sysm = HH(J)
        E = arb(Estr)
        z = [arb(v) for v in zbar]
        F = [1, 2, 3]
        for it in range(iters + 1):
            t0 = time.time()
            integ = Integrator(sysm, order=order, tol=tol_rem * 1e-3, tol_rem=tol_rem, hmax=2.0, C1=True,
                               scale=SCALE)
            S = section_set(5, sec.idx, sec.c, F, z, [0, 0, 0], [(4, E)], True)
            res = poincare(integ, S, sec)
            P = [res['P'][j, 0] for j in F]
            DP = arb_mat(3, 3, [res['DP'][a, b] for a in F for b in F])
            G = col([P[i].mid() - z[i] for i in range(3)])
            defect = max(abs(float(G[i, 0].mid())) for i in range(3))
            log('    %s orbit, iteration %d: |P(z) - z| = %.3e, radius of P(z) %.1e, %d steps, %.1fs'
                % (kind, it, defect, max(float(p.rad()) for p in P), res['steps'], time.time() - t0))
            if it == iters:
                break
            A = DP.mid() - ident(3)
            dz = A.solve(-G)
            z = [(z[i] + dz[i, 0]).mid() for i in range(3)]
        log('    %s orbit (E_l = %s, not a proof): section point m, n, h =' % (kind, Estr))
        for nm, v in zip('mnh', z):
            log('      %s = %s' % (nm, v.str(40)))
        log('      return time from this point = %s' % res['tau'].str(40, radius=True))
        ev = acb_mat(DP.mid()).eig()
        ev = sorted(ev, key=lambda v: -abs(complex(v)))
        log('      nontrivial multipliers (eigenvalues of mid DP; DP radius %.1e): %s' % (
            max(float(DP[a, b].rad()) for a in range(3) for b in range(3)),
            ', '.join(v.real.mid().str(30) for v in ev)))
        return z, res
    finally:
        ctx.prec = old
