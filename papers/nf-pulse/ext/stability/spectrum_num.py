#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""NUMERICAL (not rigorous): winding numbers of the double-precision Evans function (evans_num.py) on boxes, D'(0),
and a scan of |D| near the imaginary axis.  Output: data/spectrum_num.json.
usage: python3 spectrum_num.py [nproc]
"""
import sys, json, time
import numpy as np
from multiprocessing import Pool
import _paths
import evans_num as ev


def path(pts, n):
    out = []
    for a, b in zip(pts[:-1], pts[1:]):
        m = max(2, int(abs(b - a) * n))
        out += list(a + (b - a) * np.arange(m) / m)
    out.append(pts[-1])
    return np.array(out)


def winding(pool, left, R=4.5, Om=7.6, n=16):
    lams = path([R + 0j, R + 1j * Om, left + 1j * Om, left + 0j, left - 1j * Om, R - 1j * Om, R + 0j], n)
    D = np.array(pool.map(ev.evans, lams))
    ph = np.unwrap(np.angle(D))
    return {'left edge': left, 'points': len(lams), 'winding': float((ph[-1] - ph[0]) / (2 * np.pi)),
            'min |D|': float(abs(D).min()), 'max phase step': float(np.max(abs(np.diff(ph))))}


if __name__ == '__main__':
    nproc = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    t0 = time.time()
    out = {}
    with Pool(nproc) as pool:
        out['box -1/20'] = winding(pool, -0.05)
        out['box -0.11'] = winding(pool, -0.11)
        h = 1e-4
        out["D'(0) (central difference)"] = float(((ev.evans(h) - ev.evans(-h)) / (2 * h)).real)
        out['D(0)'] = abs(ev.evans(0.0))
        ys = np.linspace(0, 8, 321)
        for x in (-0.1, -0.05, 0.0):
            D = np.array(pool.map(ev.evans, x + 1j * ys))
            j = int(np.argmin(abs(D[ys > 0.05]))) + int(np.sum(ys <= 0.05))
            out['min |D| on Re lam = %g, 0.05 < Im lam <= 8' % x] = [float(abs(D[j])), float(ys[j])]
        # independence of the matching point
        out['D(0.5+1j) at matching points 18.5 / 40'] = [str(ev.evans(0.5 + 1j)), str(ev.evans(0.5 + 1j, xi_m=40))]
    out['time_s'] = round(time.time() - t0)
    print(json.dumps(out, indent=1))
    json.dump(out, open(_paths.DATA + '/spectrum_num.json', 'w'), indent=1)
