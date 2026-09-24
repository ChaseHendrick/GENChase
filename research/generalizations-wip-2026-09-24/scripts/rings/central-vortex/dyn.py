#!/usr/bin/env python3
"""
dyn.py -- independent dynamical check: integrate all 2n+1 vortices (Biot-Savart, scipy DOP853, double precision)
from the minimizing configuration and measure the winding directly: phase of a ring vortex against ln(|z|^2/|z0|^2),
and the collapse time, against the closed forms P_min = sqrt(K^2 - B^2)/(2n), t_c = -1/(2 Re kappa).
"""
import numpy as np
from scipy.integrate import solve_ivp


def closed(n, g):
    A2, B1, C0 = (n - 1) + 2 * g, -2 * (n + g), n - 1
    Xs = sorted([x for x in np.roots([A2, B1, C0]).real if x > 0])
    return Xs


def run(n, g, X):
    u = abs(np.log(X) / 2)
    K = n * np.sinh(n * u) + np.cosh(n * u) / np.tanh(u)
    B = 1 / np.tanh(u)
    Pmin = np.sqrt(K * K - B * B) / (2 * n)
    a = np.arccos(B / K)
    eps = np.exp(2j * np.pi / n)
    z0 = np.array([eps**k for k in range(n)] + [np.sqrt(X) * np.exp(1j * a / n) * eps**k for k in range(n)] + [0j])
    G = np.array([1.0] * n + [-1 / X] * n + [g])

    def rhs(t, y):
        z = y[:len(z0)] + 1j * y[len(z0):]
        d = z[:, None] - z[None, :]
        np.fill_diagonal(d, 1)
        inv = G[None, :] / d
        np.fill_diagonal(inv, 0)
        s = inv.sum(axis=1)
        zd = np.conj(s / (2j * np.pi))
        return np.concatenate([zd.real, zd.imag])

    # kappa from t = 0 velocities
    y0 = np.concatenate([z0.real, z0.imag])
    v = rhs(0, y0)
    zd0 = v[:len(z0)] + 1j * v[len(z0):]
    kap = zd0[0] / z0[0]
    tc = -1 / (2 * kap.real)
    ev = lambda t, y: (y[0]**2 + y[len(z0)]**2) - 1e-4          # stop at lambda^2 = 1e-4
    ev.terminal = True
    sol = solve_ivp(rhs, (0, 2 * tc), y0, method='DOP853', rtol=1e-13, atol=1e-15, events=ev, dense_output=True)
    # sample uniformly in ln lambda^2 (predicted lambda^2 = 1 - t/t_c), so the phase step stays far below pi
    ts = np.minimum(tc * (1 - np.logspace(0, -4, 20000)), sol.t[-1])
    Y = sol.sol(ts)
    z1 = Y[0] + 1j * Y[len(z0)]
    lam2 = np.abs(z1)**2
    ph = np.unwrap(np.angle(z1))
    slope = np.polyfit(np.log(lam2), ph, 1)[0]
    # collapse time from lambda^2 = 1 - t/tc (self-similar) at the end point
    tc_meas = sol.t[-1] / (1 - lam2[-1])
    # shape preservation: max over time of |z_j(t)/z1(t) - z_j0/z1_0|
    Z = Y[:len(z0)] + 1j * Y[len(z0):]
    shape = np.max(np.abs(Z[:-1] / z1[None, :] - (z0[:-1] / z0[0])[:, None]))
    return Pmin, abs(slope), tc, tc_meas, shape, kap


# roots whose minimum P exceeds 20 are skipped (hundreds of turns before lambda^2 = 1e-4; double precision cannot follow them)
print('note: shape drift = max_t max_j |z_j(t)/z_1(t) - z_j(0)/z_1(0)|; a large drift means the integrated orbit left the')
print('      self-similar solution (instability amplifying round-off), and then the fitted slope is not a test of P.')
for (n, g) in [(2, 10.0), (3, 10.0), (3, -4.0), (5, 1.0), (8, 100.0), (4, -1000.0), (6, 0.0)]:
    for X in closed(n, g):
        u = abs(np.log(X) / 2)
        K = n * np.sinh(n * u) + np.cosh(n * u) / np.tanh(u)
        if np.sqrt(K * K - 1 / np.tanh(u)**2) / (2 * n) > 20:
            continue
        Pmin, sl, tc, tcm, shape, kap = run(n, g, X)
        print('n=%d gamma=%6.1f r^2=%.6f  P_min closed %.12f  |dphase/dln lambda^2| integrated %.12f  rel %.1e | t_c %.10f vs %.10f | shape drift %.1e'
              % (n, g, X, Pmin, sl, abs(sl - Pmin) / Pmin, tc, tcm, shape))
