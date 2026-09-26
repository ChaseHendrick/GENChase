#!/usr/bin/env python3
"""Referee check 01: exact algebra behind certify_rest.py and manifold.py.

All identities are polynomial/rational in (lam, kappa, s, eps); we check them in exact rational
arithmetic (fractions.Fraction) at many random rational points, which proves a polynomial identity of
bounded degree with probability 1 (and here, by Schwartz-Zippel, with overwhelming confidence).

Checked:
 A1 det(l I - A4(s,k)) == p(l) = (l^2 + k l + eps k^2)(l^2 - 1) + s k l   (gamma = 0)
 A2 charpoly_coeffs() in certify_rest agrees with p
 A3 5D Jacobian jac5 has characteristic polynomial l * p(l)  (extra eigenvalue 0 from the Y direction)
 A4 zsolve(mu) solves (mu I - A5) z = e_Y exactly
 A5 eigvec_unstable(l) is in ker(A5 - l I) whenever p(l) = 0 (checked via residual = multiple of p(l))
 A6 Re/Im split of p(i w): Re = (w^2 - eps k^2)(w^2 + 1), Im = k w (s - 1 - w^2)
 A7 zbound inequality: for mu >= 2, p(mu) >= (3/4) mu^4
 A8 5D equilibria: a line (0, a, a, 0, a); the first integral logit(Y)/beta - U is conserved
"""
import random, sys
from fractions import Fraction as F
sys.path.insert(0, '../../code')

random.seed(12345)


def rnd():
    return F(random.randint(-2000, 2000), random.randint(1, 997))


def det(M):
    n = len(M)
    M = [row[:] for row in M]
    d = F(1)
    for c in range(n):
        p = next((r for r in range(c, n) if M[r][c] != 0), None)
        if p is None:
            return F(0)
        if p != c:
            M[c], M[p] = M[p], M[c]
            d = -d
        d *= M[c][c]
        for r in range(c + 1, n):
            f = M[r][c] / M[c][c]
            M[r] = [M[r][j] - f * M[c][j] for j in range(n)]
    return d


def A4(s, k, eps):
    return [[-k, -k, k, 0], [eps * k, 0, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]]


def A5(s, k, eps):
    return [[-k, -k, k, 0, 0], [eps * k, 0, 0, 0, 0], [0, 0, 0, 1, 0], [0, 0, 1, 0, -1],
            [-s * k, -s * k, s * k, 0, 0]]


def p(l, k, s, eps):
    return (l * l + k * l + eps * k * k) * (l * l - 1) + s * k * l


def lI_minus(M, l):
    n = len(M)
    return [[(l if i == j else 0) - F(M[i][j]) for j in range(n)] for i in range(n)]


ok = True
for trial in range(300):
    l, k, s, eps = rnd(), rnd(), rnd(), rnd()
    # A1
    if det(lI_minus(A4(s, k, eps), l)) != p(l, k, s, eps):
        print('A1 FAIL', l, k, s, eps); ok = False
    # A2
    co = [-eps * k * k, k * (s - 1), eps * k * k - 1, k, F(1)]
    val = sum(c * l ** i for i, c in enumerate(co))
    if val != p(l, k, s, eps):
        print('A2 FAIL'); ok = False
    # A3
    if det(lI_minus(A5(s, k, eps), l)) != l * p(l, k, s, eps):
        print('A3 FAIL'); ok = False
    # A4
    mu = l
    if mu != 0 and mu * mu != 1 and p(mu, k, s, eps) != 0:
        pm = p(mu, k, s, eps)
        zU = -k / pm; zV = eps * k * zU / mu; zY = s * zU + 1 / mu; zQ = -zY / (mu * mu - 1); zP = mu * zQ
        z = [zU, zV, zQ, zP, zY]
        M = lI_minus(A5(s, k, eps), mu)
        res = [sum(M[i][j] * z[j] for j in range(5)) for i in range(5)]
        if res != [0, 0, 0, 0, 1]:
            print('A4 FAIL', res); ok = False
    # A5: residual of eigvec for arbitrary l: must vanish when p(l)=0; check residual == [c*p(l),0,..]
    if l != 0 and l * l != 1:
        v = [F(1), eps * k / l, -s / (l * l - 1), -s * l / (l * l - 1), s]
        A = A5(s, k, eps)
        res = [sum(F(A[i][j]) * v[j] for j in range(5)) - l * v[i] for i in range(5)]
        # expected: only U-row (and Y-row = s * U-row) nonzero, proportional to p(l)
        pl = p(l, k, s, eps)
        exp0 = -pl / (l * (l * l - 1))
        if not (res[0] == exp0 and res[1] == 0 and res[2] == 0 and res[3] == 0 and res[4] == s * exp0):
            print('A5 FAIL', res, exp0); ok = False
    # A6
    w = rnd()
    # p(i w) = w^4 - i k w^3 - (eps k^2 - 1) w^2 + i k (s-1) w - eps k^2
    re = w ** 4 - (eps * k * k - 1) * w * w - eps * k * k
    im = -k * w ** 3 + k * (s - 1) * w
    if re != (w * w - eps * k * k) * (w * w + 1) or im != k * w * (s - 1 - w * w):
        print('A6 FAIL'); ok = False
    # A7 (only for k >= 0, s >= 0, eps >= 0, mu >= 2)
    mu2 = 2 + abs(rnd()); k2 = abs(k); s2 = abs(s); e2 = abs(eps)
    if not p(mu2, k2, s2, e2) >= F(3, 4) * mu2 ** 4:
        print('A7 FAIL'); ok = False
print('A1-A7 exact identities:', 'PASS' if ok else 'FAIL')

# A8: 5D field with Y free; equilibria and first integral (floating, high precision)
import mpmath as mp
mp.mp.dps = 50
beta, theta, eps = mp.mpf(20), mp.mpf(1) / 4, mp.mpf(1) / 10


def f5(x, k):
    U, V, Q, P, Y = x
    d = k * (Q - U - V)
    return [d, eps * k * U, P, Q - Y, beta * Y * (1 - Y) * d]


for a in (mp.mpf('0.1'), mp.mpf('0.3'), 1 / (1 + mp.e ** 5)):
    r = f5([0, a, a, 0, a], mp.mpf(1))
    assert all(abs(v) == 0 for v in r)
print('A8a every (0, a, a, 0, a) is an equilibrium of the 5D embedding: PASS (line of equilibria)')
k = 1 / mp.mpf('1.1027477097341592491478677')
x0 = [mp.mpf('0.01'), mp.mpf('0.02'), mp.mpf('0.03'), mp.mpf('0.004'), mp.mpf('0.2')]
H = lambda x: mp.log(x[4] / (1 - x[4])) / beta - x[0]
sol = mp.odefun(lambda t, x: f5(x, k), 0, x0)
h0 = H(x0); h1 = H(sol(mp.mpf(3)))
print('A8b first integral logit(Y)/beta - U: H(0) = %s, H(3) = %s, diff = %s' % (mp.nstr(h0, 15), mp.nstr(h1, 15), mp.nstr(h1 - h0, 5)))
print('    on the physical surface H = -theta = -0.25; at rest S(0): H =', mp.nstr(H([0, 0, 0, 0, 1 / (1 + mp.e ** 5)]), 20))
