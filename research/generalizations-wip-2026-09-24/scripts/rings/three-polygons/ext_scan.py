#!/usr/bin/env python3
"""
ext_scan.py -- beyond DK: drop DK's alignment b3 = b1 (the Gamma3 n-gon rotated by gamma/n relative to the Gamma1 n-gon).
Unknowns x = (ReOmega, ImOmega, G0, G1, G2, G3); A(r, beta, gamma) x = 0 with
  E1 (z = 1):                 Omega     = G1 (n-1)/2 + G0 + n G2/(1-b) + n G3/(1-q c)
  E2 (z = w, w^n = b):        Omega     = G2 (n-1)/2 + G0 + n G1 b/(b-1) + n G3 b/(b-q c)
  E3 (z = r e^{i gamma/n}):   Omega r^2 = G3 (n-1)/2 + G0 + n G1 q c/(q c-1) + n G2 q c/(q c-b)
b = e^{i beta}, c = e^{i gamma}, q = r^n.  Solutions need det A = 0 (one real condition): a 2-parameter surface.
Coarse double-precision scan (vectorized): for each (r, gamma) find the beta roots of det A, P from the null vector.
usage: python3 ext_scan.py n
"""
import numpy as np
import sys


def Amat(n, r, beta, gam):
    """stack of 6x6 real matrices; beta, gam broadcastable arrays."""
    beta, gam = np.broadcast_arrays(np.asarray(beta, float), np.asarray(gam, float))
    b = np.exp(1j * beta); c = np.exp(1j * gam); q = r**n
    one = np.ones_like(b)
    e1 = [-one, -1j * one, one, (n - 1) / 2 * one, n / (1 - b), n / (1 - q * c)]
    e2 = [-one, -1j * one, one, n * b / (b - 1), (n - 1) / 2 * one, n * b / (b - q * c)]
    e3 = [-r**2 * one, -1j * r**2 * one, one, n * q * c / (q * c - 1), n * q * c / (q * c - b), (n - 1) / 2 * one]
    A = np.empty(b.shape + (6, 6))
    for k, e in enumerate((e1, e2, e3)):
        for j in range(6):
            A[..., 2 * k, j] = np.real(e[j]); A[..., 2 * k + 1, j] = np.imag(e[j])
    return A


def nullP(n, r, beta, gam):
    A = Amat(n, r, beta, gam)
    u, s, vt = np.linalg.svd(A)
    x = vt[..., -1, :]
    P = np.abs(x[..., 0]) / (2 * np.abs(x[..., 1]))
    return P, x, s[..., -1] / s[..., 0]


def roots_beta(n, r, gs, nb=1441, iters=50):
    bs = np.linspace(0, 2 * np.pi, nb)[1:-1]
    G, B = np.meshgrid(gs, bs, indexing='ij')
    d = np.linalg.det(Amat(n, r, B, G))
    sg = np.sign(d)
    ii, jj = np.where(sg[:, :-1] != sg[:, 1:])
    a = bs[jj]; bb = bs[jj + 1]; g = gs[ii]
    fa = d[ii, jj]
    for _ in range(iters):
        m = 0.5 * (a + bb)
        fm = np.linalg.det(Amat(n, r, m, g))
        same = np.sign(fm) == np.sign(fa)
        a = np.where(same, m, a); fa = np.where(same, fm, fa); bb = np.where(same, bb, m)
    return 0.5 * (a + bb), g


if __name__ == '__main__':
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    rs = np.concatenate([np.linspace(0.02, 0.98, 97), np.linspace(1.02, 3.0, 100)])
    gs = np.linspace(0, 2 * np.pi, 361)[:-1]
    allp = []
    for r in rs:
        be, g = roots_beta(n, r, gs)
        if len(be) == 0:
            continue
        P, x, sv = nullP(n, r, be, g)
        # residual check: smallest singular value tiny
        ok = sv < 1e-9
        for k in np.where(ok)[0]:
            allp.append((P[k], r, be[k], g[k], *x[k]))
    allp = np.array(allp)
    np.save('ext_scan_n%d.npy' % n, allp)
    o = np.argsort(allp[:, 0])
    print('n = %d: %d surface points, P range [%.6f, %.3g]' % (n, len(allp), allp[o[0], 0], allp[o[-1], 0]))
    for k in o[:12]:
        P, r, be, g = allp[k, :4]; x = allp[k, 4:]
        print('  P = %.6f  r = %.3f  beta = %.4f  gamma = %.4f  x/|x| = %s' % (P, r, be, g, np.array2string(x, precision=4)))
    dk = allp[np.abs(allp[:, 3]) < 1e-12]
    if len(dk):
        print('  gamma = 0 (DK) smallest P = %.6f at r = %.3f' % (dk[:, 0].min(), dk[np.argmin(dk[:, 0]), 1]))
    # per-r minimum
    print('  min P per r (every 10th r):')
    for r in rs[::10]:
        sel = allp[np.abs(allp[:, 1] - r) < 1e-12]
        if len(sel):
            k = np.argmin(sel[:, 0]); print('    r = %.3f: min P = %.5f at beta = %.3f gamma = %.3f' % (r, sel[k, 0], sel[k, 2], sel[k, 3]))
