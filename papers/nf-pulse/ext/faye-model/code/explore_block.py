#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Floating-point search for a block shape (NOT part of the proof; block.py certifies whatever shape it is given).

The frame is the eigenbasis of DF at a reference point (a_ref, s_ref) (a = q S'(u), s = S(u)), with weights d and
ratio r/rho.  The search makes the block reach as far down the left slow branch (small q) as it can while the
cone and entrance conditions of block.py hold at the corners with a margin.
usage: python3 explore_block.py eps c [seconds]"""
import sys, time, itertools, json
import numpy as np
from scipy.optimize import brentq
lam, kap, beta, b = 20.0, 0.22, 5.0, 4.5
S = lambda u: 1 / (1 + np.exp(-lam * (u - kap)))
dS = lambda u: lam * S(u) * (1 - S(u))
u0 = brentq(lambda u: u * (1 + beta * S(u)) - S(u), -0.5, 0.1)
q0 = 1 / (1 + beta * S(u0))


def DF(k, eps, a, sg):
    return np.array([[-k, k, 0, 0], [0, 0, 1, 0], [-b * b * a, b * b, 0, -b * b * sg],
                     [-eps * k * beta * a, 0, 0, -eps * k * (1 + beta * sg)]])


def frame(k, eps, aref, sref, d):
    w, V = np.linalg.eig(DF(k, eps, aref, sref))
    idx = np.argsort(-w.real)
    V = V[:, idx].real
    V = V / np.sign(V[0, :])
    T = np.diag(d) @ np.linalg.inv(V)
    return T, np.linalg.inv(T)


def margins(eps, c, aref, sref, d, R):
    k = 1 / c
    T, Ti = frame(k, eps, aref, sref, d)
    ext = np.abs(Ti[:, 0]) * R + np.linalg.norm(Ti[:, 1:], axis=1)
    ur = (u0 - ext[0], u0 + ext[0]); qr = (q0 - ext[3], q0 + ext[3])
    if ur[1] >= kap or qr[0] <= 0.01:
        return None
    amin, amax = qr[0] * dS(ur[0]), qr[1] * dS(ur[1]); smin, smax = S(ur[0]), S(ur[1])
    Dm = np.diag([1, -1, -1, -1]); pdm = 1e9; em = -1e9
    for a, sg in itertools.product((amin, amax), (smin, smax)):
        M = T @ DF(k, eps, a, sg) @ Ti
        H = Dm @ M + M.T @ Dm
        pdm = min(pdm, np.linalg.eigvalsh(H).min() / np.abs(H).max())
        em = max(em, np.linalg.eigvalsh((M[1:, 1:] + M[1:, 1:].T) / 2).max() + np.linalg.norm(M[1:, 0]))
    return pdm, em, ur, qr


def search(eps, c, seconds=60, seed=1):
    rng = np.random.default_rng(seed)
    a0, s0 = q0 * dS(u0), S(u0)
    best = None
    t0 = time.time()
    # stage 1: random; stage 2: local perturbation of the best
    while time.time() - t0 < seconds:
        if best is None or rng.random() < 0.3:
            p = np.concatenate([[a0 * np.exp(rng.uniform(-1.2, 0.3)), s0 * np.exp(rng.uniform(-1, 0.3))],
                                np.exp(rng.uniform(-6, 6, 4)), [1 + np.exp(rng.uniform(-4, 1))]])
        else:
            p = best[1] * np.exp(rng.normal(0, 0.05, 7)); p[6] = max(p[6], 1.0001)
        res = margins(eps, c, p[0], p[1], p[2:6], p[6])
        if res is None:
            continue
        pdm, em, ur, qr = res
        if pdm > 1e-4 and em < -1e-3 and (best is None or qr[0] < best[0][3][0]):
            best = (res, p)
    return best


if __name__ == '__main__':
    eps, c = float(sys.argv[1]), float(sys.argv[2])
    sec = float(sys.argv[3]) if len(sys.argv) > 3 else 60
    best = search(eps, c, sec)
    (pdm, em, ur, qr), p = best
    print(json.dumps({'eps': eps, 'c_ref': c, 'a_ref': float('%.6g' % p[0]), 's_ref': float('%.6g' % p[1]),
                      'd': [float('%.6g' % v) for v in p[2:6]], 'r_over_rho': float('%.6g' % p[6]),
                      'u_range': ur, 'q_range': qr, 'pd_margin_rel': pdm, 'entrance': em}))
