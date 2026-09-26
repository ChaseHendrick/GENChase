#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""NUMERICAL (not rigorous): a dense high-precision table of the fast pulse, for the numerical Evans function.

The pulse leaves rest on the unstable manifold (validated series of manifold.py, evaluated at its midpoint) at the
point P(t_s) and is integrated with the Taylor method of nfcore in 320-bit midpoint arithmetic at the high-precision
speed c* of orbit_hp.py (about 55 correct digits).  xi = 0 is the point P(t_s); for xi < 0 the pulse is
P(t_s exp(lam_u xi)).  Output: data/pulse_table.npz with a uniform grid of U, V, Q, P, Y (float64) on
[XI_MIN, XI_MAX] and the rest values.
usage: python3 pulse_hp.py [t_s] [xi_max]
"""
import sys, math
import numpy as np
import _paths
from flint import arb, ctx, fmpq
ctx.prec = 320
import nfcore as nf, certify_rest as cr, manifold as mf

CSTAR = '1.102747709734159249147867735746621733255053383781820878935'


def build(t_s=fmpq(1, 10**6), xi_min=-25.0, xi_max=110.0, dx=1.0 / 128, order=36):
    ctx.prec = 320
    c = arb(CSTAR)
    kappa = 1 / c
    s = nf.dS(arb(0))
    co = cr.charpoly_coeffs(kappa, s, nf.EPS)
    lam = cr.refine(co, arb('0.5'), arb('1.2'))
    sigma = arb(fmpq(1, 7))
    ok, a, r, info = mf.validate(kappa, lam, sigma, 80)
    assert ok
    lamf = float(lam.mid())
    xs = np.arange(xi_min, xi_max + dx / 2, dx)
    out = np.zeros((len(xs), 5))
    # xi <= 0 : manifold
    for i, xi in enumerate(xs):
        if xi > 0:
            break
        t = arb(t_s) * (lam * arb(xi)).exp()
        p = mf.evaluate(a, r, t)
        out[i] = [float(v.mid()) for v in p]
    # xi >= 0 : Taylor integration on the grid (each grid step split into substeps)
    x = [arb(v.mid()) for v in mf.evaluate(a, r, arb(t_s))]
    i0 = int(round(-xi_min / dx))
    h = arb(dx) / 4
    for i in range(i0, len(xs) - 1):
        out[i] = [float(v.mid()) for v in x]
        for _ in range(4):
            cs = nf.taylor(x, kappa, order)
            x = [arb(nf.horner(cs[j], h).mid()) for j in range(5)]
    out[-1] = [float(v.mid()) for v in x]
    rest = [float(v.mid()) for v in nf.rest_state()]
    return xs, out, rest, float(kappa.mid()), lamf


if __name__ == '__main__':
    t_s = fmpq(1, 10**6)
    xmax = float(sys.argv[1]) if len(sys.argv) > 1 else 110.0
    xs, tab, rest, kap, lamf = build(t_s=t_s, xi_max=xmax)
    np.savez(_paths.DATA + '/pulse_table.npz', xi=xs, x=tab, rest=np.array(rest), kappa=kap, lam_u=lamf,
             cstar=CSTAR, t_s=float(t_s))
    Ui = tab[:, 0]
    print('kappa', kap, 'lam_u', lamf, 'max U %.6f at xi=%.3f' % (Ui.max(), xs[Ui.argmax()]))
    for xi in (-20, -10, 0, 10, 20, 30, 40, 53 + 12.83, 80, 100, xmax):
        j = int(np.argmin(abs(xs - xi)))
        print('xi=%7.2f U=% .3e V-S0=% .3e Q-S0=% .3e P=% .3e' % (xs[j], tab[j, 0], tab[j, 1] - rest[1], tab[j, 2] - rest[2], tab[j, 3]))
