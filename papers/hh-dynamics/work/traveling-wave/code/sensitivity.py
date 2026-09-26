#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Numerical (not rigorous): how fast an error in K is amplified along the pulse, to size the closing step.

Along the collocation profile y(t) of pulse_bvp.py, integrate S' = Df(y(t)) S + d_K f(y(t)), S = dy/dK, from rest
(t = -6 ms) and print |S_u(t)| (mV per unit of K) and the distance of the profile from rest. The K-width that the
closing step can afford at time t is about (block radius) / |S(t)|."""
import sys
import numpy as np
from scipy.integrate import solve_ivp
from scipy.interpolate import interp1d
import hhwave as H

T = float(sys.argv[1]) if len(sys.argv) > 1 else 18.5
d = np.load('../data/pulse_%s.npz' % T)
t, Y, K = d['t'], d['Y'], float(d['K'])
W = H.Wave(T)
yi = interp1d(t, Y, kind='cubic', axis=1)


def rhs(tt, S):
    y = yi(tt)
    J = W.jac(y, K)
    fK = np.zeros(5)
    fK[1] = y[1] + W.I(*y[[0, 2, 3, 4]])
    return J @ S + fK


sol = solve_ivp(rhs, (t[0], t[-1] - 1e-9), np.zeros(5), method='LSODA', rtol=1e-9, atol=1e-30, dense_output=True)
dist = np.max(np.abs((Y - W.rest[:, None]) / np.array([100, 1000, 1, 1, 1])[:, None]), axis=0)
di = interp1d(t, dist)
print('T = %.1f C, K = %.10f; t = 0 is u = 50 mV on the upstroke' % (T, K))
print('   t (ms)   |dy/dK| (max comp)   scaled distance from rest   log10 affordable K width for a 1e-2 block')
for tt in [-2, 0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30]:
    if tt >= t[-1]:
        break
    S = sol.sol(tt)
    s = np.max(np.abs(S))
    print('  %6.1f   %12.3e   %12.3e   %8.1f' % (tt, s, di(tt), np.log10(1e-2 / s)))
