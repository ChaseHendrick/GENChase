"""Float64 shooting for HH periodic orbits (non-rigorous): Poincare map on a section
{x[idx] = c} crossed in direction sgn, with the variational equations for D_x and d/dJ."""
import numpy as np
from scipy.integrate import solve_ivp
from hh_float import f, jac, EL_HH

RTOL, ATOL = 1e-12, 1e-14


def f_varJ(t, y, J, EL):
    x = y[:4]; V = y[4:20].reshape(4, 4); w = y[20:24]
    A = jac(x, J, EL)
    return np.concatenate([f(t, x, J, EL), (A @ V).ravel(), A @ w + np.array([1.0, 0, 0, 0])])


def poincare(z, J, c, EL=EL_HH, idx=0, sgn=1, tmin=0.5, tmax=80.0):
    """Returns P(z) (section coords), return time T, DP (3x3), dP/dJ, dT/dz, dT/dJ, x(T), V."""
    F = [j for j in range(4) if j != idx]
    x0 = np.zeros(4); x0[idx] = c; x0[F] = z
    y0 = np.concatenate([x0, np.eye(4).ravel(), np.zeros(4)])
    ev = lambda t, y, J, EL: y[idx] - c
    ev.direction = sgn
    sol = solve_ivp(f_varJ, [0, tmax], y0, args=(J, EL), method='DOP853', rtol=RTOL, atol=ATOL, events=ev)
    ts = sol.t_events[0]; ys = sol.y_events[0]
    k = np.where(ts > tmin)[0]
    if len(k) == 0:
        raise RuntimeError('no return')
    k = k[0]
    T = ts[k]; y = ys[k]
    x = y[:4]; V = y[4:20].reshape(4, 4); w = y[20:24]
    fx = f(0, x, J, EL)
    e = np.zeros(4); e[idx] = 1.0
    Pr = np.eye(4) - np.outer(fx, e) / fx[idx]
    DP = (Pr @ V)[np.ix_(F, F)]
    dPdJ = (Pr @ w)[F]
    dTdz = -(V[idx, F]) / fx[idx]
    dTdJ = -w[idx] / fx[idx]
    return x[F], T, DP, dPdJ, dTdz, dTdJ, x, V


def newton(z, J, c, EL=EL_HH, idx=0, sgn=1, tol=1e-12, maxit=12):
    z = np.array(z, dtype=float)
    for it in range(maxit):
        P, T, DP, *_ = poincare(z, J, c, EL, idx, sgn)
        dz = np.linalg.solve(DP - np.eye(3), -(P - z))
        z = z + dz
        if np.abs(dz).max() < tol or (it > 3 and np.abs(dz).max() < 1e-10):
            break
    P, T, DP, dPdJ, dTdz, dTdJ, x, V = poincare(z, J, c, EL, idx, sgn)
    return z, T, DP, V


def solve_fixed_period(z, J, c, Tfix, EL=EL_HH, tol=1e-10, maxit=10):
    """Solve P(z,J) = z, T(z,J) = Tfix for (z, J)."""
    y = np.concatenate([np.array(z, float), [J]])
    for it in range(maxit):
        P, T, DP, dPdJ, dTdz, dTdJ, x, V = poincare(y[:3], y[3], c, EL)
        G = np.concatenate([P - y[:3], [T - Tfix]])
        A = np.zeros((4, 4))
        A[:3, :3] = DP - np.eye(3); A[:3, 3] = dPdJ
        A[3, :3] = dTdz; A[3, 3] = dTdJ
        dy = np.linalg.solve(A, -G)
        lam = 1.0
        y = y + lam * dy
        if np.abs(dy).max() < tol or (it > 3 and np.abs(dy).max() < 1e-8):
            break
    P, T, DP, *_ = poincare(y[:3], y[3], c, EL)
    return y[:3], y[3], T, DP
