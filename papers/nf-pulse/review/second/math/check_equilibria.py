#!/usr/bin/env python3
"""Referee check (a)-(c): equilibria of the 4D wave ODE and of the 5D embedding, the spectrum at rest,
the characteristic polynomial, the resolvent formula of manifold.zsolve, and the invariance of Y = S(U).
mpmath only; independent of the code in ../../code except where stated."""
import mpmath as mp
mp.mp.dps = 50
beta, theta, eps = mp.mpf(20), mp.mpf(1) / 4, mp.mpf(1) / 10
S = lambda u: 1 / (1 + mp.exp(-beta * (u - theta)))
dS = lambda u: beta * S(u) * (1 - S(u))
s = dS(0); S0 = S(0)
print('S(0) =', mp.nstr(S0, 20), '  s = S\'(0) =', mp.nstr(s, 20), ' (< 1:', s < 1, ')')

def F4(x, k):
    U, V, Q, P = x
    return [k * (Q - U - V), eps * k * U, P, Q - S(U)]

def F5(x, k):
    U, V, Q, P, Y = x
    d = k * (Q - U - V)
    return [d, eps * k * U, P, Q - Y, beta * Y * (1 - Y) * d]

k = 1 / mp.mpf('1.1027477097341592491478677')
# 4D: equilibria.  V' = eps k U = 0 -> U = 0;  P = 0;  Q = S(0);  U' = 0 -> V = Q - U = S(0).  Isolated.
print('4D F(x*) =', [mp.nstr(v, 5) for v in F4([0, S0, S0, 0], k)])
# 5D: the line (0, v, v, 0, v) consists of equilibria for every v
for v in (mp.mpf('0.1'), mp.mpf('0.5'), S0):
    print('5D F(0,v,v,0,v), v=%s:' % mp.nstr(v, 5), [mp.nstr(t, 5) for t in F5([0, v, v, 0, v], k)])
J4 = mp.matrix([[-k, -k, k, 0], [eps * k, 0, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]])
J5 = mp.matrix([[-k, -k, k, 0, 0], [eps * k, 0, 0, 0, 0], [0, 0, 0, 1, 0], [0, 0, 1, 0, -1],
                [-s * k, -s * k, s * k, 0, 0]])
print('det J4 =', mp.nstr(mp.det(J4), 20), ' -eps k^2 =', mp.nstr(-eps * k * k, 20))
e4 = sorted(mp.eig(J4)[0], key=lambda z: -mp.re(z))
e5 = sorted(mp.eig(J5)[0], key=lambda z: -mp.re(z))
print('eig J4:', [mp.nstr(z, 12) for z in e4])
print('eig J5:', [mp.nstr(z, 12) for z in e5], '  (extra eigenvalue 0 = tangent of the line of equilibria)')
p = lambda l, k: l**4 + k * l**3 + (eps * k * k - 1) * l**2 + k * (s - 1) * l - eps * k * k
print('max |p(eig J4)| =', mp.nstr(max(abs(p(z, k)) for z in e4), 5))
# Re>0 count for many c > 0, and imaginary-axis crossing impossible (s<1)
bad = []
for c in [mp.mpf(10) ** (e / 10.0) for e in range(-30, 31)]:
    kk = 1 / c
    r = mp.polyroots([1, kk, eps * kk * kk - 1, kk * (s - 1), -eps * kk * kk], maxsteps=200, extraprec=100)
    npos = sum(1 for z in r if mp.re(z) > 0)
    if npos != 1:
        bad.append(c)
print('c in [1e-3, 1e3] (61 samples): number of roots with Re>0 always 1:', not bad)
# zsolve check against a direct solve (mu - J5) z = e_Y
for mu in (mp.mpf(2), mp.mpf('7.3'), mp.mpf(80)):
    z = mp.lu_solve(mu * mp.eye(5) - J5, mp.matrix([0, 0, 0, 0, 1]))
    zU = -k / p(mu, k); zV = eps * k * zU / mu; zY = s * zU + 1 / mu; zQ = -zY / (mu * mu - 1); zP = mu * zQ
    print('mu=%s |z_direct - z_closed| = %s' % (mp.nstr(mu, 3), mp.nstr(max(abs(a - b) for a, b in zip(z, [zU, zV, zQ, zP, zY])), 3)))
# W = Y - S(U) satisfies W' = beta U' (1 - Y - S(U)) W exactly in the 5D field
import random
random.seed(1)
worst = 0
for _ in range(200):
    x = [mp.mpf(random.uniform(-1, 1)) for _ in range(4)] + [mp.mpf(random.uniform(0, 1))]
    f = F5(x, k)
    W = x[4] - S(x[0])
    lhs = f[4] - dS(x[0]) * f[0]
    rhs = beta * f[0] * (1 - x[4] - S(x[0])) * W
    worst = max(worst, abs(lhs - rhs))
print('max |W\' - beta U\' (1 - Y - S(U)) W| over 200 random points:', mp.nstr(worst, 3))
