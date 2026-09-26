#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Floating-point survey of the speed axis (NUMERICAL, not rigorous).

usage: python3 scan_first_return.py EPS THETA BETA C_MIN C_MAX N

For each of N speeds, leaves rest on the U-increasing branch of the unstable manifold (linear approximation,
offset 1e-10) and integrates the 4D wave ODE with scipy's DOP853 (rtol 1e-12), then records two classifications:
 escape    : +1 / -1 for escape into {Q > 1.5} / {Q < -0.5} (the classification of ../../../code/shoot_hp.py);
 first-ret.: after the first excursion (U up through theta and back down),
             +1 fires again (U crosses theta upward) or escapes up,  -1 escapes down without firing again,
             +2 / -2 the orbit never falls back below theta before escaping up / down (no return at all).
Every change of either classification between grid neighbours is bisected (40 steps), and the orbit at the
switch is described: the gaps between successive upward theta-crossings and the least distance to rest after
the first excursion.  Periodic re-firing with a constant gap and a distance to rest that does not shrink marks a
transition to a wave train; a long first gap and a small distance mark a homoclinic orbit.
"""
import sys
import numpy as np
from scipy.integrate import solve_ivp
from multiprocessing import Pool


def orbit(c, eps, theta, beta, T=600.0):
    S = lambda u: 1 / (1 + np.exp(-np.clip(beta * (u - theta), -700, 700)))
    s0 = S(0.0); sp = beta * s0 * (1 - s0); k = 1 / c
    A = np.array([[-k, -k, k, 0], [eps * k, 0, 0, 0], [0, 0, 0, 1], [-sp, 0, 1, 0]])
    w, V = np.linalg.eig(A); i = np.argmax(w.real); v = V[:, i].real; v = v / v[0]
    xs = np.array([0, s0, s0, 0])
    f = lambda t, x: [k * (x[2] - x[0] - x[1]), eps * k * x[0], x[3], x[2] - S(x[0])]
    e1 = lambda t, x: x[2] - 1.5; e1.terminal = True
    e2 = lambda t, x: x[2] + 0.5; e2.terminal = True
    e3 = lambda t, x: x[0] - theta
    sol = solve_ivp(f, [0, T], xs + 1e-10 * v, method='DOP853', rtol=1e-12, atol=1e-15,
                    events=[e1, e2, e3], dense_output=True)
    esc = 1 if len(sol.t_events[0]) else (-1 if len(sol.t_events[1]) else 0)
    n = len(sol.t_events[2])
    if n >= 3:
        fr = 1
    elif n <= 1:
        fr = 2 * esc
    else:
        fr = esc
    return esc, fr, sol, xs


def classes(args):
    e, f, _, _ = orbit(*args)
    return e, f


def describe(c, eps, theta, beta):
    e, f, sol, xs = orbit(c, eps, theta, beta)
    ev = sol.t_events[2]
    up = ev[0::2]
    gaps = np.diff(up)
    if len(ev) < 2:
        return 'U never falls back below theta (no return); escape %+d at xi = %.1f' % (e, sol.t[-1])
    t = np.linspace(ev[1], sol.t[-1], 20000)
    d = np.linalg.norm(sol.sol(t) - xs[:, None], axis=0)
    return 'upward theta-crossings %d, gaps %s, least distance to rest after the first excursion %.2e' % (
        len(up), ' '.join('%.2f' % g for g in gaps[:6]), d.min())


if __name__ == '__main__':
    eps, theta, beta, c0, c1 = map(float, sys.argv[1:6]); n = int(sys.argv[6])
    cs = np.linspace(c0, c1, n)
    with Pool() as p:
        R = p.map(classes, [(c, eps, theta, beta) for c in cs])
    print('eps=%g theta=%g beta=%g, %d speeds in [%g, %g]' % (eps, theta, beta, n, c0, c1))
    for which, name in ((0, 'escape'), (1, 'first-return')):
        for i in range(n - 1):
            a, b = R[i][which], R[i + 1][which]
            if a == b:
                continue
            lo, hi = cs[i], cs[i + 1]
            for _ in range(40):
                m = (lo + hi) / 2
                r = classes((m, eps, theta, beta))[which]
                if r == a:
                    lo = m
                elif r == b:
                    hi = m
                else:
                    break
            print('%-12s switch %+d -> %+d at c = %.12f' % (name, a, b, lo))
            print('    below: %s' % describe(lo, eps, theta, beta))
            print('    above: %s' % describe(hi, eps, theta, beta))
