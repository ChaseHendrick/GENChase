#!/usr/bin/env python3
"""Referee check (e),(g): the block actually used by prove_pulse.py (r = 4 rho, rho = 0.00726885671..., |U| <= 0.05),
re-checked in mpmath.iv: (C) the cone form is positive definite, (E) strict entrance on the L <= 0 part of the side
face, and the U-range of B, which the repository's own mpmath re-check (block_check_iv.py) does not cover.
Then a non-rigorous sampling test of the same conclusions on the NONLINEAR 4D field (not the divided-difference
matrix), and a diagnostic: (E) is false on the part of the side face with |y1| > rho, so exits through the side
face do occur and E+/E- must be defined through the cones, not through the face |y1| = r."""
import json, random, mpmath
from mpmath import iv, mp
iv.dps = 60; mp.dps = 40
T = json.load(open('../../data/block_certificate.json'))['T']
Ti = None
def inv(M):
    n = len(M); A = [row[:] + [iv.mpf(1 if i == j else 0) for j in range(n)] for i, row in enumerate(M)]
    for c in range(n):
        piv = max(range(c, n), key=lambda r: abs(A[r][c].mid))
        A[c], A[piv] = A[piv], A[c]
        p = A[c][c]; assert not (0 in p)
        A[c] = [x / p for x in A[c]]
        for r in range(n):
            if r != c:
                f = A[r][c]; A[r] = [A[r][j] - f * A[c][j] for j in range(2 * n)]
    return [row[n:] for row in A]
Tv = [[iv.mpf(v) for v in row] for row in T]
Ti = inv(Tv)
def mm(A, B):
    return [[sum((A[i][k] * B[k][j] for k in range(len(B))), iv.mpf(0)) for j in range(len(B[0]))] for i in range(len(A))]
Sf = lambda u: 1 / (1 + iv.exp(-20 * (u - iv.mpf(1) / 4)))
dS = lambda u: 20 * Sf(u) * (1 - Sf(u))
c1 = iv.mpf('1.1027477097341592491478677'); c2 = iv.mpf('1.1027477097341592491478678')
k = iv.mpf([(1 / c2).a, (1 / c1).b]); eps = iv.mpf(1) / 10
A4 = lambda s: [[-k, -k, k, iv.mpf(0)], [eps * k, iv.mpf(0), iv.mpf(0), iv.mpf(0)], [iv.mpf(0)] * 3 + [iv.mpf(1)], [-s, iv.mpf(0), iv.mpf(1), iv.mpf(0)]]
D = [1, -1, -1, -1]
dU = iv.mpf('0.05')
rho = iv.mpf('0.0072688568') + iv.mpf('1e-12')     # upper bound of the rho printed by prove_pulse (0.007268856710 +/- 4e-13)
r = 4 * rho
# U-range: U = sum_j Ti[0][j] y_j, |y1| <= r, |y'|_2 <= rho
ur = abs(Ti[0][0]) * r + iv.sqrt(sum((Ti[0][j] ** 2 for j in range(1, 4)), iv.mpf(0))) * rho
print('U-range bound of the proof block:', ur, ' < 0.05:', ur.b < dU.a)
def chol_pd(H):
    # interval Cholesky on the symmetrised hull: success proves every symmetric matrix in the hull is PD
    n = len(H); Lc = [[iv.mpf(0)] * n for _ in range(n)]
    Hs = [[iv.mpf([min(H[i][j].a, H[j][i].a), max(H[i][j].b, H[j][i].b)]) for j in range(n)] for i in range(n)]
    for j in range(n):
        d = Hs[j][j] - sum((Lc[j][q] ** 2 for q in range(j)), iv.mpf(0))
        if not d.a > 0:
            return False
        Lc[j][j] = iv.sqrt(d)
        for i in range(j + 1, n):
            Lc[i][j] = (Hs[i][j] - sum((Lc[i][q] * Lc[j][q] for q in range(j)), iv.mpf(0))) / Lc[j][j]
    return True
for s in (dS(-dU), dS(dU)):
    At = mm(mm(Tv, A4(s)), Ti)
    H = [[D[i] * At[i][j] + At[j][i] * D[j] for j in range(4)] for i in range(4)]
    Hm = mp.matrix([[mp.mpf(H[i][j].mid) for j in range(4)] for i in range(4)])
    ev = mp.eigsy((Hm + Hm.T) / 2)[0]
    # (E) with |y1| <= rho (what the code checks) and with |y1| <= r (the whole side face)
    S22 = [[(At[i][j] + At[j][i]) / 2 for j in range(1, 4)] for i in range(1, 4)]
    g = max((S22[i][i] + sum((abs(S22[i][j]) for j in range(3) if j != i), iv.mpf(0))).b for i in range(3))
    fro = iv.sqrt(sum((At[i][0] ** 2 for i in range(1, 4)), iv.mpf(0))).b
    print('(C) rigorous (interval Cholesky, kappa ball, Tinv with pivoting):', chol_pd(H))
    print('s=%s  eig(H) mid: %s  | (E) on |y1|<=rho: %s  | same bound with |y1|<=r=4rho: %s' % (
        mpmath.nstr(s.mid, 6), [mpmath.nstr(e, 5) for e in ev], mpmath.nstr(g + fro, 6), mpmath.nstr(g + 4 * fro, 6)))

# ---- sampling on the nonlinear field (non-rigorous) ----
Tm = mp.matrix(T); Tim = Tm ** -1
Sm = lambda u: 1 / (1 + mp.exp(-20 * (u - mp.mpf(1) / 4)))
S0 = Sm(0); xs = mp.matrix([0, S0, S0, 0])
km = 1 / mp.mpf('1.10274770973415924914786775')
def F(x):
    U, V, Q, P = x
    return mp.matrix([km * (Q - U - V), km * U / 10, P, Q - Sm(U)])
random.seed(7)
rhom = mp.mpf('0.0072688567'); rm = 4 * rhom
minrate = mp.inf; maxent = -mp.inf; maxU = 0; side_exit = 0
for it in range(20000):
    y1 = mp.mpf(random.uniform(-1, 1)) * rm
    d = [random.gauss(0, 1) for _ in range(3)]; nd = sum(t * t for t in d) ** 0.5
    rad = rhom * mp.mpf(random.random()) ** (1 / 3.0)
    face = it % 2 == 0
    if face: rad = rhom
    yp = [rad * t / nd for t in d]
    y = mp.matrix([y1] + yp)
    x = xs + Tim * y
    maxU = max(maxU, abs(x[0]))
    yd = Tm * F(x)
    Ldot = 2 * (y[0] * yd[0] - sum(y[i] * yd[i] for i in range(1, 4)))
    minrate = min(minrate, Ldot / sum(v * v for v in y))
    if face:
        dn = sum(y[i] * yd[i] for i in range(1, 4))   # (1/2) d|y'|^2/dxi
        if abs(y1) <= rhom:
            maxent = max(maxent, dn)
        elif dn > 0:
            side_exit += 1
print('sampled max |U| in B: %s ; min dL/dxi / |y|^2: %s (> 0 needed)' % (mp.nstr(maxU, 6), mp.nstr(minrate, 6)))
print('sampled max of (1/2) d|y\'|^2/dxi on the side face with |y1| <= rho: %s (< 0 needed)' % mp.nstr(maxent, 6))
print('sampled side-face points with |y1| > rho where |y\'| increases (exits in the cones):', side_exit)
