"""Float64 reference implementation of the space-clamped Hodgkin-Huxley equations.

Modern sign convention: u = -V is the depolarisation from rest (mV), J = -I is
the applied depolarising current (uA/cm^2), time in ms, temperature 6.3 C.
Hodgkin and Huxley, J. Physiol. 117 (1952) 500-544, eqs. (12), (13), (20),
(21), (23), (24), (26) and Table 3.

This file is NOT rigorous; it is used for exploration, for the non-rigorous
numerics of task 1 and to produce candidate orbits for the certificate.
"""
import numpy as np

GNA, GK, GL = 120.0, 36.0, 0.3
ENA, EK = 115.0, -12.0
EL_HH = 10.613          # Hodgkin-Huxley 1952, "exact value chosen ..."
EL_GO = 10.599          # Guckenheimer-Oliva 2002


def psi(x):
    """x/(e^x - 1), with the removable singularity at 0 filled in."""
    x = np.asarray(x, dtype=float)
    out = np.empty_like(x)
    small = np.abs(x) < 1e-6
    xs = x[small]
    out[small] = 1.0 - xs / 2.0 + xs * xs / 12.0
    xl = x[~small]
    out[~small] = xl / np.expm1(xl)
    return out if out.shape else float(out)


def dpsi(x):
    """d/dx psi(x)."""
    x = np.asarray(x, dtype=float)
    out = np.empty_like(x)
    small = np.abs(x) < 1e-4
    xs = x[small]
    out[small] = -0.5 + xs / 6.0 - xs ** 3 / 180.0
    xl = x[~small]
    e = np.exp(xl)
    em1 = np.expm1(xl)
    out[~small] = (em1 - xl * e) / em1 ** 2
    return out if out.shape else float(out)


def rates(u):
    an = 0.1 * psi((10.0 - u) / 10.0)
    bn = 0.125 * np.exp(-u / 80.0)
    am = psi((25.0 - u) / 10.0)
    bm = 4.0 * np.exp(-u / 18.0)
    ah = 0.07 * np.exp(-u / 20.0)
    bh = 1.0 / (np.exp((30.0 - u) / 10.0) + 1.0)
    return an, bn, am, bm, ah, bh


def drates(u):
    """Derivatives of the six rate functions with respect to u."""
    dan = 0.1 * dpsi((10.0 - u) / 10.0) * (-0.1)
    dbn = -0.125 / 80.0 * np.exp(-u / 80.0)
    dam = dpsi((25.0 - u) / 10.0) * (-0.1)
    dbm = -4.0 / 18.0 * np.exp(-u / 18.0)
    dah = -0.07 / 20.0 * np.exp(-u / 20.0)
    e = np.exp((30.0 - u) / 10.0)
    dbh = 0.1 * e / (e + 1.0) ** 2
    return dan, dbn, dam, dbm, dah, dbh


def f(t, x, J, EL=EL_HH):
    u, m, n, h = x
    an, bn, am, bm, ah, bh = rates(u)
    du = J - GNA * m ** 3 * h * (u - ENA) - GK * n ** 4 * (u - EK) - GL * (u - EL)
    return np.array([du, am * (1 - m) - bm * m, an * (1 - n) - bn * n,
                     ah * (1 - h) - bh * h])


def jac(x, J, EL=EL_HH):
    u, m, n, h = x
    an, bn, am, bm, ah, bh = rates(u)
    dan, dbn, dam, dbm, dah, dbh = drates(u)
    A = np.zeros((4, 4))
    A[0, 0] = -GNA * m ** 3 * h - GK * n ** 4 - GL
    A[0, 1] = -3 * GNA * m ** 2 * h * (u - ENA)
    A[0, 2] = -4 * GK * n ** 3 * (u - EK)
    A[0, 3] = -GNA * m ** 3 * (u - ENA)
    A[1, 0] = dam * (1 - m) - dbm * m
    A[1, 1] = -(am + bm)
    A[2, 0] = dan * (1 - n) - dbn * n
    A[2, 2] = -(an + bn)
    A[3, 0] = dah * (1 - h) - dbh * h
    A[3, 3] = -(ah + bh)
    return A


def f_var(t, y, J, EL=EL_HH):
    x = y[:4]
    V = y[4:].reshape(4, 4)
    return np.concatenate([f(t, x, J, EL), (jac(x, J, EL) @ V).ravel()])


def gate_inf(u):
    an, bn, am, bm, ah, bh = rates(u)
    return am / (am + bm), an / (an + bn), ah / (ah + bh)


def I_ss(u, EL=EL_HH):
    """Steady-state ionic current; equilibria satisfy J = I_ss(u)."""
    mi, ni, hi = gate_inf(u)
    return GNA * mi ** 3 * hi * (u - ENA) + GK * ni ** 4 * (u - EK) + GL * (u - EL)


def equilibrium(J, EL=EL_HH):
    from scipy.optimize import brentq
    u = brentq(lambda v: I_ss(v, EL) - J, -12.0, 200.0, xtol=1e-15, rtol=1e-15, maxiter=500)
    mi, ni, hi = gate_inf(u)
    return np.array([u, mi, ni, hi])
