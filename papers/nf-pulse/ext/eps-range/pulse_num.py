#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""NUMERICAL (not rigorous) pulse data used only to CHOOSE the sets of the proof in chain.py.

 kstar(eps)      kappa* = 1/c* of the fast pulse at a rational eps: bracket by the escape classification of
                 ../../code/shoot_hp.py and bisection (midpoint arithmetic).
 Tracker         the pulse point at the centre eps_m, kappa*(eps_m) and its two tangents d/deps, d/dkappa,
                 advanced segment by segment with the same time-rescaled field as the proof (lohner7), so that
                 the h-sets can be centred on the pulse and shifted with eps along the pulse family.
Nothing here is part of the proof: a wrong number only makes a covering check fail.
"""
import os, sys, math
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', '..', 'code'))
import numpy as np
from flint import arb, ctx, fmpq
import nfcore as nf, certify_rest as cr, manifold as mf, shoot_hp as sh
import manifold_ad as ad
import lohner7 as L7

NPREC = 256


def mid(x):
    return arb(x.mid())


def left_unstable(eps, kap):
    s = float(nf.dS(arb(0)).mid())
    A = np.array([[-kap, -kap, kap, 0], [eps * kap, 0, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]])
    w, V = np.linalg.eig(A.T)
    i = int(np.argmax(w.real))
    l = V[:, i].real
    return l / np.max(np.abs(l))


def x_start(eps, kap):
    """manifold point P(1/4) (midpoints), sigma = 1/7, at the current precision."""
    s = nf.dS(arb(0))
    co = cr.charpoly_coeffs(kap, s, eps)
    lam = cr.refine(co, arb('0.3'), arb('1.5'))
    lam = mid(lam)
    P = ad.point(eps, kap, lam, arb(fmpq(1, 7)), 80, arb(fmpq(1, 4)))
    return [mid(p.v) for p in P]


def step_pt(x, h, order):
    vals = L7.taylor_vals(x, order)
    return [mid(nf.horner(vals[i], arb(h))) for i in range(5)] + [x[5], x[6]]


def choose_h(x, order, tol, hmax=0.25):
    vals = L7.taylor_vals(x, order)
    m = max(max(abs(float(vals[i][order].mid())), abs(float(vals[i][order - 1].mid())) ** (order / (order - 1.0)))
            for i in range(5))
    return min(hmax, (tol / max(m, 1e-300)) ** (1.0 / order) * 0.5)


def kstar(eps_q, c_guess, nbits=126, prec=224):
    """kappa* at the rational eps_q (numerical): bracket by the escape classification of
    ../../code/shoot_hp.py (E_up = {Q > 1, P > 0} for c > c*, E_dn = {Q < 0, P < 0} for c < c*), then
    bisection for nbits bits.  Returns (kappa midpoint at NPREC bits, final bracket width in c)."""
    old = ctx.prec
    ctx.prec = prec
    nf._EPS = eps_q
    width = 1e-3
    while True:
        lo, hi = arb(c_guess - width), arb(c_guess + width)
        if sh.shoot(lo)[0] == -1 and sh.shoot(hi)[0] == 1:
            break
        width *= 2
        assert width < 0.5, 'no bracket'
    # bisection; the working precision follows the bracket width (a shot at width 2^-k needs about k + 60 bits)
    for it in range(nbits):
        wbits = -math.log2(max(float((hi - lo).mid()), 1e-300))
        ctx.prec = max(96, min(prec, 32 * math.ceil((wbits + 64) / 32)))
        cm = mid((lo + hi) / 2)
        sm = sh.shoot(cm)[0]
        if sm == -1:
            lo = cm
        elif sm == 1:
            hi = cm
        else:
            raise RuntimeError('no escape at c=%s' % cm)
    ctx.prec = NPREC
    c = mid((lo + hi) / 2)
    kap = mid(1 / c)
    wdt = float((hi - lo).mid())
    ctx.prec = old
    return kap, wdt


class Tracker:
    """pulse point and tangents d/deps, d/dkappa along the time-rescaled field (numerical)."""

    def __init__(self, eps_q, kap, order=30):
        old = ctx.prec
        ctx.prec = NPREC
        self.order = order
        eps = arb(eps_q)
        # tangents at t = 0 from the gradient of the manifold point
        s = nf.dS(arb(0))
        co = cr.charpoly_coeffs(kap, s, eps)
        lam = mid(cr.refine(co, arb('0.3'), arb('1.5')))
        P = ad.point(eps, kap, lam, arb(fmpq(1, 7)), 80, arb(fmpq(1, 4)))
        self.x = [mid(p.v) for p in P] + [kap, eps]
        te = [mid(p.g[0]) for p in P] + [arb(0), arb(1)]
        tk = [mid(p.g[1]) for p in P] + [arb(1), arb(0)]
        self.tan = [te, tk]
        self.t = 0.0
        ctx.prec = old

    def advance(self, s1, rho, tol_bits=None):
        old = ctx.prec
        ctx.prec = NPREC
        L7.RHO[0], L7.RHO[1] = arb(rho[0]), arb(rho[1])
        tol = 2.0 ** (-(tol_bits or NPREC - 40))
        while self.t < s1:
            h = min(choose_h(self.x, self.order, tol), s1 - self.t)
            vals, grads = L7.taylor_jet(self.x, self.order)
            hA = arb(h)
            J = [[mid(nf.horner([grads[i][k][m] for k in range(self.order + 1)], hA)) for m in range(7)]
                 for i in range(7)]
            self.x = [mid(nf.horner(vals[i], hA)) for i in range(5)] + [self.x[5], self.x[6]]
            self.tan = [[mid(sum((J[i][m] * tv[m] for m in range(7)), arb(0))) for i in range(7)] for tv in self.tan]
            self.t += h
        ctx.prec = old

    def copy(self):
        c = Tracker.__new__(Tracker)
        c.order, c.t = self.order, self.t
        c.x = list(self.x)
        c.tan = [list(v) for v in self.tan]
        return c

    def dkdeps(self, l):
        """kappa*'(eps) from the growth of the tangents along the unstable coordinate."""
        ye = sum((arb(float(l[i])) * self.tan[0][i] for i in range(4)), arb(0))
        yk = sum((arb(float(l[i])) * self.tan[1][i] for i in range(4)), arb(0))
        return -ye / yk


if __name__ == '__main__':
    import time
    e = fmpq(1, 10)
    t0 = time.time()
    k, w = kstar(e, 1.1027477097341592)
    print('kappa* =', k.str(50), ' c* =', (1 / k).str(45), 'bracket width %.1e' % w, '%.1fs' % (time.time() - t0))
    tr = Tracker(e, k)
    l = left_unstable(0.1, float(k.mid()))
    for T in (20, 40, 60, 70):
        tr.advance(T, (0, 0))
        print('T', T, 'x', [float(v.mid()) for v in tr.x[:4]], "kappa*' =", tr.dkdeps(l).str(40), '%.1fs' % (time.time() - t0))
