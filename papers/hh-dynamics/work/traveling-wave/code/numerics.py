#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Numerical (not rigorous) summary: the fast pulse speed at 18.5 C and 6.3 C by shooting, its sensitivity to the
shooting tolerances and to the leak potential, the eigenvalues of rest, and the unit conversion."""
import numpy as np
import hhwave as H

print('Unit check: K = 10.47 /ms (Hodgkin and Huxley) gives theta = %.4f m/s' % H.speed_from_K(10.47))
print('E_l making the resting current zero: %.10f mV (printed: 10.613)' % H.el_zero())
for T in (18.5, 6.3):
    W = H.Wave(T)
    print('\nT = %.1f C, phi = 3^((T - 6.3)/10) = %.6f' % (T, W.phi))
    res = []
    for delta, rtol, atol in [(1e-6, 1e-12, 1e-14), (1e-8, 1e-12, 1e-14), (1e-6, 1e-10, 1e-12), (1e-7, 1e-13, 1e-15)]:
        a, b = (3, 30)
        lo, hi, s1, s2 = H.bisect_K(W, a, b, tol=1e-14, delta=delta, rtol=rtol, atol=atol)
        res.append(lo)
        print('  delta %.0e rtol %.0e: K in [%.13f, %.13f], switch %+d -> %+d, speed %.9f m/s'
              % (delta, rtol, lo, hi, s1, s2, H.speed_from_K(lo)))
    print('  spread of K over these runs: %.1e (relative %.1e)' % (max(res) - min(res), (max(res) - min(res)) / res[0]))
    K = res[0]
    lam, _ = W.eig_rest(K)
    print('  eigenvalues of rest at this K:', ', '.join('%.6f%+.6fi' % (z.real, z.imag) for z in sorted(lam, key=lambda z: z.real)))
    print('  dim W^u = %d, dim W^s = %d' % (sum(z.real > 0 for z in lam), sum(z.real < 0 for z in lam)))
    W2 = H.Wave(T, EL=10.613)
    lo2, hi2, _, _ = H.bisect_K(W2, 3, 30, tol=1e-13)
    print('  with the printed E_l = 10.613 (rest at u = %.6f mV): K = %.10f, speed %.6f m/s' % (W2.urest, lo2, H.speed_from_K(lo2)))
