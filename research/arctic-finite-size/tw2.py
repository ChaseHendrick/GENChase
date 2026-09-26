"""Moments of the Tracy-Widom GUE law F2 from Fredholm determinants of the Airy kernel, by
Bornemann's Gauss-Legendre (Nystrom) method (Math. Comp. 79 (2010) 871-915).
F2(s) = det(I - K_Ai) on L^2(s, oo); the interval is cut at s + 24 (the kernel there is below 1e-40).
E[TW2] = int_0^oo (1 - F2) ds - int_-oo^0 F2 ds; E[TW2^2] similarly."""
import numpy as np
from scipy.special import airy
from scipy.integrate import quad


def F2(s, m=64, L=24.0):
    x, w = np.polynomial.legendre.leggauss(m)
    x = s + (x + 1) * L / 2
    w = w * L / 2
    ai, aip, _, _ = airy(x)
    X, Y = np.meshgrid(x, x, indexing='ij')
    with np.errstate(divide='ignore', invalid='ignore'):
        K = (np.outer(ai, aip) - np.outer(aip, ai)) / (X - Y)
    K[np.diag_indices(m)] = aip ** 2 - x * ai ** 2
    sw = np.sqrt(w)
    return float(np.linalg.det(np.eye(m) - sw[:, None] * K * sw[None, :]))


def moments(tol=1e-13):
    a = quad(lambda s: 1 - F2(s), 0, 12, epsabs=tol, epsrel=tol, limit=200)[0]
    b = quad(lambda s: F2(s), -14, 0, epsabs=tol, epsrel=tol, limit=200)[0]
    mean = a - b
    a2 = quad(lambda s: 2 * s * (1 - F2(s)), 0, 12, epsabs=tol, epsrel=tol, limit=200)[0]
    b2 = quad(lambda s: -2 * s * F2(s), -14, 0, epsabs=tol, epsrel=tol, limit=200)[0]
    second = a2 + b2
    return mean, second - mean ** 2


if __name__ == '__main__':
    m, v = moments()
    print('E[TW2] = %.14f   Var[TW2] = %.14f   sd = %.14f' % (m, v, np.sqrt(v)))
    print('check with m = 96 nodes: F2(-2) = %.16f vs %.16f' % (F2(-2.0, 96), F2(-2.0)))
