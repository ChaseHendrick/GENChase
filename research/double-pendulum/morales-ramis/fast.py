"""Double-precision exploration tool (numerical only): complex-time integration of the double
pendulum and its variational equation along polygonal paths with scipy DOP853 (complex state)."""
import cmath
import numpy as np
from scipy.integrate import solve_ivp
from field import make_numeric



def _mk(g):
    import sympy as sp
    from field import F, J, X, g as gs
    f0 = sp.lambdify([list(X), gs], list(F), 'cmath', cse=True)
    j0 = sp.lambdify([list(X), gs], list(J), 'cmath', cse=True)
    return (lambda x: f0(x, g)), (lambda x: j0(x, g))


class Fast:
    def __init__(self, g=1.0, rtol=1e-13, atol=1e-15):
        self.f, self.j = _mk(g)
        self.rtol, self.atol = rtol, atol

    def rhs(self, u, var):
        f, j = self.f, self.j
        def r(s, y):
            x = y[:4]
            dx = np.array(f(x), dtype=complex) * u
            if not var:
                return dx
            A = np.array(j(x), dtype=complex).reshape(4, 4)
            Xi = y[4:].reshape(4, 4)
            return np.concatenate([dx, (u * (A @ Xi)).ravel()])
        return r

    def segment(self, t0, t1, y, var=True):
        L = abs(t1 - t0)
        if L == 0:
            return y
        u = (t1 - t0) / L
        sol = solve_ivp(self.rhs(u, var), (0, L), y, method='DOP853', rtol=self.rtol, atol=self.atol)
        if sol.status != 0:
            raise RuntimeError(sol.message)
        return sol.y[:, -1]

    def path(self, pts, y, var=True):
        for a, b in zip(pts[:-1], pts[1:]):
            y = self.segment(a, b, y, var)
        return y


def y0(x0, var=True):
    x0 = np.array(x0, dtype=complex)
    return np.concatenate([x0, np.eye(4, dtype=complex).ravel()]) if var else x0


def energy(x, g=1.0):
    a1, a2, v1, v2 = x
    return v1**2 + v1*v2*cmath.cos(a1 - a2) + v2**2/2 - 2*g*cmath.cos(a1) - g*cmath.cos(a2)
