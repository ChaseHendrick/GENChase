#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Numerical: sign switches of the shooting classification in K, as the temperature rises (fast pulse, and any
second switch). Prints each switch bracketed to 1e-10 relative."""
import sys
import numpy as np
import hhwave as H

Ts = [float(a) for a in sys.argv[1:]] or [6.3, 18.5, 25, 30, 32, 34, 36]
for T in Ts:
    W = H.Wave(T)
    Ks = np.geomspace(0.02, 80, 160)
    prev = None
    sw = []
    for K in Ks:
        s, _ = W.shoot(K, tmax=300)
        if prev is not None and s != prev[1] and 0 not in (s, prev[1]):
            lo, hi, a, b = H.bisect_K(W, prev[0], K, tol=1e-10, tmax=300)
            sw.append((lo, a, b))
        prev = (K, s)
    print('T = %5.2f C, phi = %.4f:' % (T, W.phi), '; '.join('K = %.10f (%+d -> %+d), speed %.4f m/s' % (k, a, b, H.speed_from_K(k)) for k, a, b in sw))
