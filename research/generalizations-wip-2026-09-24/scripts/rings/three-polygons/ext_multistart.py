#!/usr/bin/env python3
"""
ext_multistart.py -- global check of the b3-free extension minimum for a given n by many local minimizations on the
surface det A(r, beta, gamma) = 0, started from random points (including starts concentrated near r = 1 and small
angles, where the grid scan is coarse).  Each start: pick (r, gamma), find all beta roots on a fine grid, and from
each root run Nelder-Mead on (log r, gamma) with beta tracked by Newton on det.
usage: python3 ext_multistart.py n nstarts seed
"""
import sys
import numpy as np
from scipy.optimize import minimize, brentq
from ext_scan import Amat, nullP


def det1(n, r, be, g):
    return np.linalg.det(Amat(n, r, np.array([be]), np.array([g]))[0])


def track(n, r, g, be0):
    """root of det in beta near be0 (bracket search outward)."""
    f = lambda b: det1(n, r, b, g)
    h = 1e-4
    f0 = f(be0)
    for k in range(60):
        a, b = be0 - h, be0 + h
        fa, fb = f(a), f(b)
        if np.sign(fa) != np.sign(f0):
            return brentq(f, a, be0, xtol=1e-15)
        if np.sign(fb) != np.sign(f0):
            return brentq(f, be0, b, xtol=1e-15)
        h *= 1.5
        if h > 0.3:
            break
    return None


def Pval(n, r, be, g):
    P, x, sv = nullP(n, r, np.array([be]), np.array([g]))
    return P[0], sv[0]


def run(n, r0, g0, be0):
    state = {'be': be0}

    def obj(p):
        r, g = np.exp(p[0]), p[1]
        if abs(r - 1) < 1e-6 or r > 5:
            return 1e6
        be = track(n, r, g, state['be'])
        if be is None or be <= 1e-9 or be >= 2 * np.pi - 1e-9:
            return 1e6
        P, sv = Pval(n, r, be, g)
        if sv > 1e-8 or not np.isfinite(P):
            return 1e6
        state['be'] = be
        return P
    o = minimize(obj, [np.log(r0), g0], method='Nelder-Mead', options=dict(xatol=1e-10, fatol=1e-12, maxiter=3000))
    return o.fun, np.exp(o.x[0]), state['be'], o.x[1]


if __name__ == '__main__':
    n, ns, seed = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
    rng = np.random.default_rng(seed)
    found = []
    bgrid = np.linspace(0, 2 * np.pi, 20001)[1:-1]
    for s in range(ns):
        if s % 2 == 0:
            r0 = np.exp(rng.uniform(np.log(0.3), np.log(3.0)))
        else:
            r0 = 1 + rng.choice([-1, 1]) * np.exp(rng.uniform(np.log(1e-3), np.log(0.15)))
        g0 = rng.uniform(0, 2 * np.pi) if rng.random() < 0.6 else rng.choice([-1, 1]) * np.exp(rng.uniform(np.log(1e-3), np.log(0.5)))
        d = np.linalg.det(Amat(n, r0, bgrid, np.full_like(bgrid, g0)))
        idx = np.where(np.sign(d[:-1]) != np.sign(d[1:]))[0]
        for i in idx:
            be0 = brentq(lambda b: det1(n, r0, b, g0), bgrid[i], bgrid[i + 1], xtol=1e-14)
            P0, sv = Pval(n, r0, be0, g0)
            if sv > 1e-8:
                continue
            f, r, be, g = run(n, r0, g0, be0)
            if f < 1e5:
                found.append((f, r, be, g % (2 * np.pi)))
    found.sort()
    print('n = %d: %d local searches; smallest local minima found:' % (n, len(found)))
    seen = []
    for f, r, be, g in found:
        if all(abs(f - s) > 1e-6 for s in seen):
            seen.append(f)
            print('  P = %.10f  r = %.8f  beta = %.8f  gamma = %.8f' % (f, r, be, g))
        if len(seen) >= 12:
            break
