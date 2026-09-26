#!/usr/bin/env python3
"""Referee check (b),(d),(f): (1) the validated manifold coefficients (from ../../code/manifold.py) satisfy the
invariance equation lam t P'(t) = F(P(t)) and lie on the surface Y = S(U) (both up to the truncation), and the tail
bound dominates the size of the coefficients actually beyond N; (2) an independent non-rigorous integration of the
ORIGINAL 4D system (mpmath odefun, S evaluated directly) from P(1/4) at c1 and c2 to xi = 62, reporting y = T(x - x*),
L = y1^2 - |y'|^2 and the first cone entry, to compare with the rigorous PASS results (K- at 58.375 for c1, K+ at
57.75 for c2)."""
import sys, json
sys.path.insert(0, '../../code')
from flint import arb, ctx, fmpq
ctx.prec = 256
import nfcore as nf, certify_rest as cr, manifold as mf
import mpmath as mp
mp.mp.dps = 60

s = nf.dS(arb(0))
T = json.load(open('../../data/block_certificate.json'))['T']
Tm = mp.matrix(T)
S0 = 1 / (1 + mp.exp(5))
Sm = lambda u: 1 / (1 + mp.exp(-20 * (u - mp.mpf(1) / 4)))

for name, cc in (('c1', cr.C1), ('c2', cr.C2)):
    kappa = 1 / cc
    co = cr.charpoly_coeffs(kappa, s, nf.EPS)
    lam = cr.refine(co, arb('0.5'), arb('1.2'))
    sigma = arb(fmpq(1, 7))
    ok, a, r, info = mf.validate(kappa, lam, sigma, 80)
    # compare with a longer series: coefficients 81..120 must be dominated by the tail bound r
    a2, _, _ = mf.coefficients(kappa, lam, sigma, 120)
    tail = [sum(abs(float(a2[n][i].mid())) for n in range(81, 121)) for i in range(5)]
    print(name, 'validated', ok, ' tail radii r_i:', ['%.2e' % float(x.mid()) for x in r])
    print('    sum_{81..120} |a_n,i| (should be <= r_i):', ['%.2e' % x for x in tail])
    # invariance residual and surface residual at t in [-1, 1]
    lamm = mp.mpf(lam.mid().str(70, radius=False)); km = mp.mpf(kappa.mid().str(70, radius=False))
    A = [[mp.mpf(a2[n][i].mid().str(70, radius=False)) for i in range(5)] for n in range(121)]
    worst_inv = worst_surf = 0
    for t in [mp.mpf(j) / 8 for j in range(-8, 9)]:
        P = [sum(A[n][i] * t ** n for n in range(121)) for i in range(5)]
        dP = [sum(n * A[n][i] * t ** (n - 1) for n in range(1, 121)) for i in range(5)]
        U, V, Q, Pp, Y = P
        d = km * (Q - U - V)
        Fv = [d, km * U / 10, Pp, Q - Y, 20 * Y * (1 - Y) * d]
        worst_inv = max(worst_inv, max(abs(lamm * t * dP[i] - Fv[i]) for i in range(5)))
        worst_surf = max(worst_surf, abs(Y - Sm(U)))
    print('    max_t |lam t P\' - F(P)| = %s ; max_t |Y - S(U)| on P(t) = %s  (t in [-1,1], 120 terms)' % (
        mp.nstr(worst_inv, 3), mp.nstr(worst_surf, 3)))
    # independent orbit, 4D, from P(1/4)
    x0 = mf.evaluate(a, r, arb(fmpq(1, 4)))
    y0 = [mp.mpf(v.mid().str(70, radius=False)) for v in x0[:4]]
    f = lambda t, y: [km * (y[2] - y[0] - y[1]), km * y[0] / 10, y[3], y[2] - Sm(y[0])]
    sol = mp.odefun(f, 0, y0, tol=mp.mpf(10) ** -55, degree=40)
    xs = [0, S0, S0, 0]
    entered = None; maxU = 0
    for j in range(0, 62 * 8 + 1):
        t = mp.mpf(j) / 8
        x = sol(t)
        maxU = max(maxU, x[0])
        y = Tm * mp.matrix([x[i] - xs[i] for i in range(4)])
        L = y[0] ** 2 - sum(y[i] ** 2 for i in range(1, 4))
        if j == 53 * 8:
            print('    xi=53: y =', [mp.nstr(v, 6) for v in y], ' |y\'| =', mp.nstr(mp.sqrt(L * 0 + sum(y[i] ** 2 for i in range(1, 4))), 6))
        if t >= 53 and entered is None and L > 0:
            entered = (t, 'K+' if y[0] > 0 else 'K-')
    print('    max U on [0, 62] = %s ; first xi >= 53 (grid 1/8) with L > 0: %s' % (mp.nstr(maxU, 6), entered))
