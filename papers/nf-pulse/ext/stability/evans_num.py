#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""NUMERICAL (not rigorous): the Evans function of the fast pulse, in double precision.

Eigenvalue problem of the linearisation in the co-moving frame xi = x + c t (kappa = 1/c):
    lam p = -c p' - p - q + w*(S'(U) p),   lam q = -c q' + eps p.
With r = w*(S'(U) p), r - r'' = S'(U) p, z = r', and phi = (p, q, r, z):
    phi' = A(xi, lam) phi,
    A = [[-kappa (lam + 1), -kappa, kappa, 0], [eps kappa, -kappa lam, 0, 0], [0, 0, 0, 1], [-S'(U(xi)), 0, 1, 0]].
At rest S'(U) = s = S'(0); A_inf(lam) has one eigenvalue nu(lam) with Re nu > 0 and three with Re < 0 for every lam
to the right of the essential spectrum (Re lam > -0.1127...).  With v, w the right and left eigenvectors of A_inf for
nu (w^T v = 1),
    phi^-(xi) ~ e^{nu xi} v  (xi -> -inf),    psi^+(xi) ~ e^{-nu xi} w  (xi -> +inf),   psi' = -A^T psi,
    D(lam) = psi^+(xi)^T phi^-(xi)     (independent of xi, analytic in lam; D(lam) = 0 iff lam is an eigenvalue).
Scaled variables phi~ = e^{-nu xi} phi^-, psi~ = e^{nu xi} psi^+ are integrated to a matching point.
"""
import sys, json
import numpy as np
from scipy.integrate import solve_ivp
from scipy.interpolate import CubicSpline
import _paths

T = np.load(_paths.DATA + '/pulse_table.npz')
XI, X = T['xi'], T['x']
KAP = float(T['kappa'])
EPS = 0.1
BETA = 20.0
Y = X[:, 4]
SP = BETA * Y * (1 - Y)                     # S'(U(xi)) = beta Y (1 - Y) on the invariant surface Y = S(U)
S0 = float(SP[0])
s_rest = BETA * float(T['rest'][4]) * (1 - float(T['rest'][4]))
spl = CubicSpline(XI, SP - s_rest)
XMIN, XMAX = float(XI[0]), float(XI[-1])


def g(xi):
    if xi <= XMIN or xi >= XMAX:
        return 0.0
    return float(spl(xi))


def Ainf(lam, s=s_rest, kap=KAP):
    return np.array([[-kap * (lam + 1), -kap, kap, 0], [EPS * kap, -kap * lam, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]],
                    dtype=complex)


def charpoly(lam, s=s_rest, kap=KAP):
    """det(nu - A_inf(lam)) = (nu^2 - 1)[(nu + k(lam+1))(nu + k lam) + eps k^2] + s k (nu + k lam)."""
    k = kap
    a = np.poly1d([1, k * (2 * lam + 1), k * k * lam * (lam + 1) + EPS * k * k])
    return np.polysub(np.polymul(np.poly1d([1, 0, -1]), a), np.poly1d([-s * k, -s * k * k * lam])).coeffs


def eig_unstable(lam):
    r = np.roots(charpoly(lam))
    r = r[np.argsort(-r.real)]
    nu = r[0]
    assert r[0].real > 0 and r[1].real < 0, r
    A = Ainf(lam)
    # right eigenvector from the rows 2..4 structure: p = 1, q = eps k/(nu + k lam), z = nu r, r (nu^2 - 1) = -s
    k = KAP
    s = s_rest
    q = EPS * k / (nu + k * lam)
    rr = -s / (nu * nu - 1)
    v = np.array([1, q, rr, nu * rr], dtype=complex)
    # left eigenvector: solve (A^T - nu) w = 0
    M = A.T - nu * np.eye(4)
    w = np.linalg.svd(M)[2][-1].conj()
    w = w / (w @ v)
    return nu, v, w, r


def evans(lam, xi_m=None, rtol=1e-10, atol=1e-13):
    nu, v, w, roots = eig_unstable(lam)
    A0 = Ainf(lam)
    E = np.zeros((4, 4)); E[3, 0] = -1.0

    def f(xi, y):
        ph = y[:4] + 1j * y[4:]
        d = (A0 - nu * np.eye(4)) @ ph + E @ ph * g(xi)
        return np.concatenate([d.real, d.imag])

    def fa(xi, y):
        ps = y[:4] + 1j * y[4:]
        d = -(A0.T - nu * np.eye(4)) @ ps - E.T @ ps * g(xi)
        return np.concatenate([d.real, d.imag])
    if xi_m is None:
        xi_m = 18.5
    s1 = solve_ivp(f, (XMIN, xi_m), np.concatenate([v.real, v.imag]), method='DOP853', rtol=rtol, atol=atol)
    s2 = solve_ivp(fa, (XMAX, xi_m), np.concatenate([w.real, w.imag]), method='DOP853', rtol=rtol, atol=atol)
    ph = s1.y[:4, -1] + 1j * s1.y[4:, -1]
    ps = s2.y[:4, -1] + 1j * s2.y[4:, -1]
    return complex(ps @ ph)


if __name__ == '__main__':
    for lam in [0, 1e-3, -1e-3, 0.5, 1, 2, 5, 10, 0.5j, 1j, 2j, 5j, 10j, 20j, -0.05, -0.05 + 1j]:
        print(lam, evans(lam), evans(lam, xi_m=40))
