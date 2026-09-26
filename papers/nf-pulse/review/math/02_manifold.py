#!/usr/bin/env python3
"""Referee check 02: the unstable-manifold parametrisation of manifold.py.

 M1 The enclosure x0 = P(1/4) used by prove_pulse.py (sigma = 1/7, N = 80) is consistent with the
    invariant surface Y = S(U): S(U-ball) must overlap the Y-ball.
 M2 Independent recomputation of the coefficients to order 400 with plain mpmath (not flint, not the
    closed-form z), at the midpoint kappa: the l^1 tail sum_{80<n<=400} |a_n| per component must lie
    below the certified r_i, and a_2..a_80 must lie inside flint's balls.
 M3 Direct check that the series solves the ODE: x(xi) = P(e^{lam xi}/4) against an mpmath ODE solve
    started at P(1/4) and run backwards to xi = -3 (should agree with P(e^{-3 lam}/4)).
"""
import sys
sys.path.insert(0, '../../code')
from flint import arb, fmpq, ctx
import mpmath as mp
ctx.prec = 256
import nfcore as nf, certify_rest as cr, manifold as mf

s = nf.dS(arb(0)); eps = nf.EPS
kappa = 1 / cr.C1.union(cr.C2)
co = cr.charpoly_coeffs(kappa, s, eps)
lam = cr.refine(co, arb('0.5'), arb('1.2'))
sigma = arb(fmpq(1, 7))
ok, a, r, info = mf.validate(kappa, lam, sigma, 80)
x0 = mf.evaluate(a, r, arb(fmpq(1, 4)))
SU = nf.S(x0[0])
print('M1 validated:', ok, '| S(U) ball', SU.str(30), '| Y ball', x0[4].str(30),
      '| overlap:', SU.overlaps(x0[4]))

# ---- M2: plain mpmath recursion by solving the linear system (n lam - A) a_n = e_Y g_n numerically
mp.mp.dps = 80
km = mp.mpf(kappa.mid().str(70, radius=False))
beta = mp.mpf(20); th = mp.mpf(1) / 4; ep = mp.mpf(1) / 10
Y0 = 1 / (1 + mp.e ** (beta * th))
sm = beta * Y0 * (1 - Y0)
lm = mp.findroot(lambda l: (l * l + km * l + ep * km * km) * (l * l - 1) + sm * km * l, 0.97)
A = mp.matrix([[-km, -km, km, 0, 0], [ep * km, 0, 0, 0, 0], [0, 0, 0, 1, 0], [0, 0, 1, 0, -1],
               [-sm * km, -sm * km, sm * km, 0, 0]])
v = [mp.mpf(1), ep * km / lm, -sm / (lm * lm - 1), -sm * lm / (lm * lm - 1), sm]
sg = mp.mpf(1) / 7
NN = 400
an = [[mp.mpf(0)] * 5, [sg * vi for vi in v]]
for n in range(2, NN + 1):
    yY = [an[j][4] for j in range(n)]
    w = [an[j][2] - an[j][0] - an[j][1] for j in range(n)]
    yY2 = [mp.fsum(yY[i] * yY[j - i] for i in range(1, j)) for j in range(n)]
    g = beta * km * mp.fsum(((1 - 2 * Y0) * yY[j] - yY2[j]) * w[n - j] for j in range(1, n))
    M = n * lm * mp.eye(5) - A
    rhs = mp.matrix([0, 0, 0, 0, g])
    sol = mp.lu_solve(M, rhs)
    an.append([sol[i] for i in range(5)])
inside = all(a[n][i].contains(arb(mp.nstr(an[n][i], 60))) or abs(an[n][i]) < 1e-60 for n in range(2, 81) for i in range(5))
print('M2 a_2..a_80 (mpmath, midpoint kappa) inside flint balls:', inside)
for i, nm in enumerate('UVQPY'):
    tail = mp.fsum(abs(an[n][i]) for n in range(81, NN + 1))
    print('   %s: sum_{81..400}|a_n| = %s   certified r = %s   ratio = %s' % (
        nm, mp.nstr(tail, 5), r[i].str(5), mp.nstr(tail / mp.mpf(r[i].mid().str(20, radius=False)), 3)))
print('   |a_400| max', mp.nstr(max(abs(x) for x in an[NN]), 5), ' (decay check)')

# ---- M3
Pm = lambda t: [mp.fsum(an[n][i] * t ** n for n in range(NN + 1)) + (Y0 if i in (1, 2, 4) else 0) for i in range(5)]


def f5(x):
    U, V, Q, P, Y = x
    d = km * (Q - U - V)
    return [d, ep * km * U, P, Q - Y, beta * Y * (1 - Y) * d]


mp.mp.dps = 40
xs = Pm(mp.mpf(1) / 4)
sol = mp.odefun(lambda t, x: [-c for c in f5(x)], 0, xs)
xb = sol(mp.mpf(3))
xp = Pm(mp.e ** (-3 * lm) / 4)
print('M3 max |ODE(-3) - P(e^{-3 lam}/4)| =', mp.nstr(max(abs(xb[i] - xp[i]) for i in range(5)), 5))
print('   U at P(1/4):', mp.nstr(xs[0], 12), ' U increases along the branch t > 0 (a_1,U = sigma > 0)')
