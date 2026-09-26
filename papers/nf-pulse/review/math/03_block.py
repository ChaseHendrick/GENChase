#!/usr/bin/env python3
"""Referee check 03: the block of block.py / prove_pulse.py, sampled with the TRUE nonlinear field.

Uses the same T (block.setup) and the same r, rho as prove_pulse.block_data (r = 4 rho, |U| <= 0.05).
 B1 dL/dt > 0 at random points of B \ {x*} for random kappa in [1/c2, 1/c1] (nonlinear S, not A(s)).
 B2 On the face |y'| = rho with L <= 0: d|y'|^2/dt < 0 (strict entrance).
 B3 Is the face |y1| = r a strict exit face?  Count points on it where d|y1|/dt <= 0 (orbit turns back).
 B4 Is the face |y'| = rho with L > 0 an exit face?  Count points where d|y'|^2/dt >= 0 and < 0.
 B5 Uniform positivity: min eigenvalue of sym(D At + At^T D)/|y|^2 over s in [smin, smax] (float grid).
 B6 Convexity in s of the entrance bound e(s) = lam_max(sym At22) + ||At21||_2 on a fine s grid.
"""
import sys
sys.path.insert(0, '../../code')
import numpy as np
from flint import arb
import prove_pulse as pp, block as bl, nfcore as nf, certify_rest as cr

T, Tinv, rho, r, info = pp.block_data()
Tf = np.array([[float(T[i, j].mid()) for j in range(4)] for i in range(4)])
Ti = np.linalg.inv(Tf)
rho = float(rho.mid()); r = float(r.mid())
print('block: rho =', rho, 'r =', r, 'U range', info['U_range'])
S = lambda u: 1 / (1 + np.exp(-20 * (u - 0.25)))
S0 = S(0.0)
xs = np.array([0, S0, S0, 0])
k1, k2 = 1 / 1.1027477097341592, 1 / 1.1027477097341593
eps = 0.1
rng = np.random.default_rng(7)


def F(x, k):
    U, V, Q, P = x
    return np.array([k * (Q - U - V), eps * k * U, P, Q - S(U)])


def ydot(y, k):
    x = xs + Ti @ y
    return Tf @ F(x, k)


def rand_y(face=None):
    y1 = rng.uniform(-r, r)
    d = rng.normal(size=3); d /= np.linalg.norm(d)
    rad = rho * rng.uniform() ** (1 / 3)
    if face == 'yp':
        rad = rho
    yp = d * rad
    if face == 'y1':
        y1 = r * rng.choice([-1, 1])
    return np.concatenate([[y1], yp])


D = np.diag([1, -1, -1, -1])
bad1 = 0; mn = np.inf; maxU = 0
for _ in range(200000):
    y = rand_y() * rng.uniform() ** 2      # also sample near x*
    k = rng.uniform(k2, k1)
    maxU = max(maxU, abs((Ti @ y)[0]))
    dL = 2 * y @ D @ ydot(y, k)
    q = dL / (y @ y)
    mn = min(mn, q)
    if dL <= 0:
        bad1 += 1
print('B1 dL/dt <= 0 at %d of 200000 samples; min dL/dt / |y|^2 = %.4g; max |U| sampled %.4f' % (bad1, mn, maxU))

bad2 = 0; n2 = 0; worst = -np.inf
for _ in range(200000):
    y = rand_y('yp')
    y[0] = rng.uniform(-rho, rho)      # L <= 0
    k = rng.uniform(k2, k1)
    dv = 2 * y[1:] @ ydot(y, k)[1:]
    n2 += 1; worst = max(worst, dv / rho ** 2)
    if dv >= 0:
        bad2 += 1
print('B2 on |y\'| = rho, L <= 0: d|y\'|^2/dt >= 0 at %d of %d; max (d|y\'|^2/dt)/rho^2 = %.4g' % (bad2, n2, worst))

back = 0; n3 = 0
for _ in range(200000):
    y = rand_y('y1'); k = rng.uniform(k2, k1)
    n3 += 1
    if np.sign(y[0]) * ydot(y, k)[0] <= 0:
        back += 1
print('B3 on |y1| = r: d|y1|/dt <= 0 (not strict exit) at %d of %d points' % (back, n3))

out = inn = 0
for _ in range(200000):
    y = rand_y('yp')
    y[0] = np.sign(rng.uniform(-1, 1)) * rng.uniform(rho, r)   # L > 0 part of the face
    k = rng.uniform(k2, k1)
    dv = 2 * y[1:] @ ydot(y, k)[1:]
    if dv >= 0:
        out += 1
    else:
        inn += 1
print('B4 on |y\'| = rho with L > 0: outward/tangent %d, inward %d' % (out, inn))

smin, smax = float(nf.dS(arb('-0.05')).mid()), float(nf.dS(arb('0.05')).mid())
A4 = lambda s, k: np.array([[-k, -k, k, 0], [eps * k, 0, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]])
mins = []; es = []
sg = np.linspace(smin, smax, 401)
for s in sg:
    for k in (k1, k2):
        At = Tf @ A4(s, k) @ Ti
        H = D @ At + At.T @ D
        mins.append(np.linalg.eigvalsh((H + H.T) / 2).min())
    At = Tf @ A4(s, k1) @ Ti
    S22 = (At[1:, 1:] + At[1:, 1:].T) / 2
    es.append(np.linalg.eigvalsh(S22).max() + np.linalg.norm(At[1:, 0], 2))
es = np.array(es)
print('B5 min eigenvalue of H over s grid and kappa ends: %.4g (> 0 means uniform)' % min(mins))
second = np.diff(es, 2)
print('B6 e(s) on s grid: max %.4g at ends %.4g %.4g; min second difference %.3g (>= -1e-12 means convex)' % (
    es.max(), es[0], es[-1], second.min()))
