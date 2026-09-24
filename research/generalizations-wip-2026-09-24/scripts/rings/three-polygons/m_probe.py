#!/usr/bin/env python3
"""
m_probe.py -- is m != n possible? n-gon (G1, radius 1), m-gon (G2, radius 1, rotated phi), n-gon (G3, radius r, rotated psi),
G0 at 0.  Self-similarity for all vortices is A x = 0, x = (ReOmega, ImOmega, G0, G1, G2, G3), A real (2 rows per vortex).
Count: the orbit equations number 2(2n+m)/g real (g = gcd(n, m)); a null vector needs codim 2(2n+m)/g - 5, parameters
(r, phi, psi) = 3 (DK ansatz psi = 0: 2).  m = n: codim 1 (b3 free: 2-dim surface; DK: 1-dim family).
m = 2n: codim 3 -> isolated points at best with psi free, none generically with psi = 0.
Here: multistart minimization of sigma_min(A)/sigma_max(A) over (r, phi[, psi]); report the smallest values found.
usage: python3 m_probe.py n m free_psi(0/1) nstarts
"""
import sys
import numpy as np
from scipy.optimize import minimize


def mat(n, m, r, phi, psi):
    z1 = np.exp(2j * np.pi * np.arange(n) / n)
    z2 = np.exp(1j * phi) * np.exp(2j * np.pi * np.arange(m) / m)
    z3 = r * np.exp(1j * psi) * z1
    pos = np.concatenate([[0], z1, z2, z3])
    lab = np.array([0] + [1] * n + [2] * m + [3] * n)
    M = len(pos)
    rows = []
    for k in range(1, M):
        coef = np.zeros(6, complex)
        coef[0] = -np.conj(pos[k]); coef[1] = -1j * np.conj(pos[k])
        for j in range(M):
            if j != k:
                coef[2 + lab[j]] += 1 / (pos[k] - pos[j])
        rows.append(coef.real); rows.append(coef.imag)
    return np.array(rows)


def lsq(p, n, m, free):
    """Im Omega = -1 fixed (collapse normalization); least-squares residual of the remaining 5 unknowns."""
    r, phi = p[0], p[1]
    psi = p[2] if free else 0.0
    with np.errstate(all='ignore'):
        A = mat(n, m, r, phi, psi)
    if not np.all(np.isfinite(A)) or np.abs(A).max() > 1e6:
        return 10.0, None
    Ap = A[:, [0, 2, 3, 4, 5]]
    bvec = A[:, 1]                     # A x = 0 with ImO = -1  ->  Ap y = bvec
    y, *_ = np.linalg.lstsq(Ap, bvec, rcond=None)
    res = np.linalg.norm(Ap @ y - bvec) / np.linalg.norm(bvec)
    if np.abs(y).max() > 1e4:
        return 10.0, None
    return np.log10(res + 1e-300), y


def obj(p, n, m, free):
    r = p[0]
    if r <= 0.05 or r > 4 or abs(r - 1) < 1e-3:
        return 10.0
    return lsq(p, n, m, free)[0]


if __name__ == '__main__':
    n, m, free, ns = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
    rng = np.random.default_rng(12345)
    res = []
    for _ in range(ns):
        p0 = [rng.uniform(0.1, 2.5), rng.uniform(0, 2 * np.pi)] + ([rng.uniform(0, 2 * np.pi)] if free else [])
        o = minimize(obj, p0, args=(n, m, free), method='Nelder-Mead', options=dict(xatol=1e-12, fatol=1e-14, maxiter=4000))
        p = o.x
        f, y = lsq(p, n, m, free)
        x = np.array([y[0], -1, *y[1:]]) if y is not None else np.zeros(6)
        res.append((f, p, x))
    res.sort(key=lambda t: t[0])
    print('n = %d, m = %d, psi %s: best log10(relative residual with Im Omega = -1) over %d starts' % (n, m, 'free' if free else '= 0 (DK)', ns))
    for f, p, x in res[:8]:
        P = abs(x[0]) / (2 * abs(x[1])) if abs(x[1]) > 1e-9 else np.inf
        print('  %8.2f  params %s  x = %s  P = %.6g' % (f, np.array2string(np.array(p), precision=6), np.array2string(x, precision=4), P))
