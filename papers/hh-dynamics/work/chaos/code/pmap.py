"""Poincare return map on the section u = s (crossing with u decreasing unless stated), in section
coordinates x = (m, n, h), with its derivative in x and in J. NUMERICAL (float64, DOP853, rtol 1e-14)."""
import numpy as np
import hhc


def P(x, J, s, k=1, EL=hhc.EL0, var=True, direction=-1):
    """k-th return of (s, x). Returns x1, T, DP (3x3), dP/dJ (3), umax, umin."""
    y0 = np.array([s, x[0], x[1], x[2]])
    if not var:
        y, t, umax, umin = hhc.to_section(y0, J, s, direction, k, EL)
        return y[1:], t, None, None, umax, umin
    y, t, Phi, PhiJ, umax, umin = hhc.to_section(y0, J, s, direction, k, EL, var=True)
    f = hhc.field(y, J, EL)
    # a perturbation dy0 = (0, dx) arrives as Phi dy0 + f dt with dt chosen to stay on the section
    Pr = np.eye(4) - np.outer(f, np.array([1.0, 0, 0, 0])) / f[0]
    DPfull = Pr @ Phi
    DP = DPfull[1:, 1:]
    dPJ = (Pr @ PhiJ)[1:]
    return y[1:], t, DP, dPJ, umax, umin


def newton_fixed(x, J, s, k=1, tol=1e-13, maxit=30, EL=hhc.EL0, verbose=False, direction=-1):
    for it in range(maxit):
        x1, T, DP, dPJ, umax, umin = P(x, J, s, k, EL, direction=direction)
        F = x1 - x
        dx = np.linalg.solve(DP - np.eye(3), -F)
        x = x + dx
        if verbose:
            print(it, np.abs(F).max(), np.abs(dx).max())
        if np.abs(dx).max() < tol:
            break
    x1, T, DP, dPJ, umax, umin = P(x, J, s, k, EL, direction=direction)
    return x, x1 - x, T, DP, umax, umin
