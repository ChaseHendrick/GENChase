"""Pseudo-arclength continuation of the branch of periodic orbits born at the lower (subcritical) Hopf point,
by single shooting on a Poincare section u = s (u decreasing). NUMERICAL (float64, DOP853 at rtol 1e-14).

Unknowns z = (m, n, h, J); equations P(x, J) - x = 0 plus the arclength condition. Along the branch we record
the period, the three nontrivial Floquet multipliers (eigenvalues of DP), max/min of u, and flag folds (dJ/ds
changes sign), and multipliers crossing +1, -1 or the unit circle.

    python3 continuation.py            # writes ../data/branch.npz and ../data/branch.txt
"""
import sys
import numpy as np
import hhc
import pmap

WX = float(__import__("os").environ.get("HH_WX", "10.0"))   # weight of the gate coordinates in the arclength norm


def residual(z, s):
    x, J = z[:3], z[3]
    x1, T, DP, dPJ, umax, umin = pmap.P(x, J, s)
    F = x1 - x
    DF = np.hstack([DP - np.eye(3), dPJ[:, None]])
    return F, DF, T, DP, umax, umin


def tangent(DF, prev=None):
    W = np.diag([WX, WX, WX, 1.0])
    _, _, Vt = np.linalg.svd(DF @ np.linalg.inv(W))
    t = np.linalg.inv(W) @ Vt[-1]
    t /= np.linalg.norm(W @ t)
    if prev is not None and np.dot(W @ t, W @ prev) < 0:
        t = -t
    return t


def corrector(zp, t, z0, ds, s, tol=1e-12, maxit=8):
    W2 = np.array([WX, WX, WX, 1.0]) ** 2
    z = zp.copy()
    for it in range(maxit):
        F, DF, T, DP, umax, umin = residual(z, s)
        g = np.dot(W2 * t, z - z0) - ds
        A = np.vstack([DF, W2 * t])
        dz = np.linalg.solve(A, -np.concatenate([F, [g]]))
        z = z + dz
        if np.abs(dz[:3]).max() < tol and abs(dz[3]) < tol:
            F, DF, T, DP, umax, umin = residual(z, s)
            return z, it + 1, F, DF, T, DP, umax, umin
    return None


def run(z0, s, ds0, nmax, dsmax, dsmin=1e-9, Jstop=(5.0, 10.0), label='', save=None, t0=None):
    F, DF, T, DP, umax, umin = residual(z0, s)
    t = tangent(DF, np.array([0, 0, 0, -1.0]) if t0 is None else t0)
    rows = []
    z, ds = z0.copy(), ds0
    for k in range(nmax):
        res = corrector(z + ds * t, t, z, ds, s)
        if res is None or res[1] > 5:
            ds *= 0.5
            if ds < dsmin:
                print('step too small, stopping', file=sys.stderr)
                break
            continue
        zn, nit, F, DFn, T, DP, umax, umin = res
        tn = tangent(DFn, t)
        # multipliers
        mu = np.linalg.eigvals(DP)
        mu = mu[np.argsort(-np.abs(mu))]
        rows.append(np.concatenate([[zn[3]], zn[:3], [T, umax, umin, np.abs(F).max(), ds],
                                    mu.real, mu.imag, [tn[3]]]))
        # step size control: shrink near where the tangent turns
        ang = np.dot(np.array([WX] * 3 + [1.0]) * t, np.array([WX] * 3 + [1.0]) * tn)
        z, t = zn, tn
        if nit <= 2 and ang > 0.999:
            ds = min(ds * 1.5, dsmax)
        elif nit >= 4 or ang < 0.98:
            ds *= 0.5
        if len(rows) % 10 == 0 and save:
            np.savez(save, rows=np.array(rows), cols=COLS, s=s, EL=hhc.EL0, z=z, t=t, ds=ds)
        if len(rows) % 10 == 0:
            print(label, len(rows), 'J=%.10f T=%.4f umax=%.3f umin=%.3f |mu|=%s ds=%.2e' %
                  (zn[3], T, umax, umin, np.array2string(np.abs(mu), precision=4), ds), file=sys.stderr, flush=True)
        if not (Jstop[0] < zn[3] < Jstop[1]):
            break
        if umin > s:           # orbit no longer crosses the section
            print('orbit left the section', file=sys.stderr)
            break
    return np.array(rows), z, t


COLS = ['J', 'm', 'n', 'h', 'T', 'umax', 'umin', 'res', 'ds', 'mu1r', 'mu2r', 'mu3r', 'mu1i', 'mu2i', 'mu3i', 'tJ']


def seed(J0, a_lo=0.01, a_hi=3.0):
    """An orbit of the subcritical branch at J0 < J_H: bisect on the amplitude a of a start e - a Im(q) on the
    section u = u_eq(J0) for the return that neither grows nor decays, then Newton."""
    e = hhc.equilibrium(J0)
    s = float(e[0])
    w, V = np.linalg.eig(hhc.jacobian(e))
    q = V[:, np.argmax(w.imag)]
    q = q / q[0]
    d = -np.imag(q)

    def g(a):
        x = (e + a * d)[1:]
        x1 = pmap.P(x, J0, s, var=False)[0]
        return np.dot(x1 - e[1:], d[1:]) / np.dot(d[1:], d[1:]) - a

    lo, hi = a_lo, a_hi
    glo = g(lo)
    for _ in range(40):
        mid = 0.5 * (lo + hi)
        gm = g(mid)
        if np.sign(gm) == np.sign(glo):
            lo, glo = mid, gm
        else:
            hi = mid
    x0 = (e + lo * d)[1:]
    x, r, T, DP, umax, umin = pmap.newton_fixed(x0, J0, s)
    return x, s, r, T, umax, umin


if __name__ == '__main__' and len(sys.argv) > 2 and sys.argv[2] == 'resume':
    # python3 continuation.py N resume IN.npz OUT.npz : continue a saved branch for N more points
    d = np.load(sys.argv[3])
    s = float(d['s'])
    rows, z, t = run(d['z'], s, 1e-4, int(sys.argv[1]), 0.05, label='s=%.4f' % s, save=sys.argv[4],
                     t0=d['t'])
    np.savez(sys.argv[4], rows=rows, cols=COLS, s=s, EL=hhc.EL0, z=z, t=t)
elif __name__ == '__main__':
    J0 = float(sys.argv[2]) if len(sys.argv) > 2 else 9.5
    x, s, r, T, umax, umin = seed(J0)
    print('seed orbit at J=%.4f on u=%.6f: residual %.2e, T=%.6f, u in [%.4f, %.4f]' % (J0, s, np.abs(r).max(), T, umin, umax),
          file=sys.stderr)
    nmax = int(sys.argv[1]) if len(sys.argv) > 1 else 4000
    rows, z, t = run(np.concatenate([x, [J0]]), s, 1e-3, nmax, 0.05, label='s=%.4f' % s, save='../data/branch.npz')
    np.savez('../data/branch.npz', rows=rows, cols=COLS, s=s, EL=hhc.EL0, z=z, t=t)
