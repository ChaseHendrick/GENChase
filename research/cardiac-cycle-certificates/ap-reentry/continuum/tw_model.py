"""Comoving-frame (travelling-wave) form of the baseline 19-state TP06 cable on a ring. NUMERICAL, floating point.

Cable (monodomain, author convention, Cm = 1 uF/cm^2, no stimulus; the axial current is not carried by any ion):
    V_t = D V_xx + f_V(y),   w_t = f_w(y),   y = (V, w) in R^19,
f = tp06_19d.field (h/j branch switched at V = -40 mV, as in TP06_endo.m). D = 0.154 mm^2/ms (the TP06 2006 value).

Travelling wave u(x, t) = phi(t - x/c), c > 0, moving towards +x. With s = t - x/c (the time at which the wave passes
x), V_t = phi_V', V_xx = phi_V''/c^2, so with W = phi_V' and kappa = c^2/D (1/ms):
    V' = W,   W' = kappa (W - f_V(y)),   w' = f_w(y)                              (20 dimensions)
A ring of length L carries one such wave iff phi has minimal period T = L/c, i.e. L = sqrt(D kappa) T.

First integral: with q the per-cell charge of tp06_19d.charge (dq/dt = 0 for the isolated cell) and
k = Cm Cm_flux/(F V_c), dq/ds = (dq/dV)(W - f_V) = -k W'/kappa, so H = q + (k/kappa) W is constant on every orbit.
On a ring, the total charge is integral_0^L q dx = L H, so H is the charge per cell of the ring.

State layout (here and in comoving19.hpp): y[0:19] = the 19 cell states in tp06_19d order, y[19] = W.
"""
import os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
AP = os.path.dirname(HERE)
sys.path.insert(0, AP)
import tp06_19d as M  # noqa: E402

D_MM2_PER_MS = 0.154      # TP06 2006 monodomain diffusion coefficient, mm^2/ms (= 0.00154 cm^2/ms)
P = M.params("author")
K_CHARGE = P["Cm"] * P["Cm_flux"] / (M.FF * M.V_c)  # mM per mV
NS = 20
IV, IW, IK = 0, 19, 18
SCALE_EXP = np.array([6, 0, -1, -3, 0, 0, -1, 0, 0, 0, 0, -1, -1, 0, -10, 2, 1, 4, 7, 6])
SIGMA = 2.0 ** SCALE_EXP
H0_REST = float(M.charge(M.Y0, P))  # charge per cell of the standard TP06 initial state (y01, K_i = 138.3)


def field(y, kappa, lo, mu=0.0):
    """d y / d s for the comoving system. y: (20, ...). lo: True = the V < -40 h/j formulas (piece B), False = the
    V >= -40 formulas (piece A); fixed per piece. mu: unfolding parameter added to K_i' (0 on an exact periodic orbit)."""
    y = np.asarray(y, float)
    f = M.field(y[:19], P, lo=lo)
    out = np.empty_like(y)
    out[:19] = f
    out[IV] = y[IW]
    out[IW] = kappa * (y[IW] - f[0])
    out[IK] = out[IK] + mu
    return out


def H(y, kappa):
    y = np.asarray(y, float)
    return M.charge(y[:19], P) + K_CHARGE / kappa * y[IW]


def H_grad(y, kappa):
    y = np.asarray(y, float)
    g = np.zeros_like(y)
    g[:19] = M.charge_grad(y[:19], P)
    g[IW] = K_CHARGE / kappa
    return g


def jac(y, kappa, lo, rel=1e-6):
    """Jacobian of field by central differences (vectorized over trailing dims). Returns (20, 20, ...)."""
    y = np.asarray(y, float)
    J = np.empty((NS, NS) + y.shape[1:])
    for k in range(NS):
        h = rel * SIGMA[k]
        yp = y.copy(); yp[k] += h
        ym = y.copy(); ym[k] -= h
        J[:, k] = (field(yp, kappa, lo) - field(ym, kappa, lo)) / (2 * h)
    return J


def dfield_dkappa(y, kappa, lo):
    y = np.asarray(y, float)
    d = np.zeros_like(y)
    f = M.field(y[:19], P, lo=lo)
    d[IW] = y[IW] - f[0]
    return d


def c_of(kappa):
    return float(np.sqrt(D_MM2_PER_MS * kappa))


def check_first_integral(n=200, seed=1):
    """dH/ds = grad H . field = (k/kappa)(...) cancels: returns max |grad H . field| / scale at random states."""
    rng = np.random.default_rng(seed)
    Y = np.array(M.Y0)[:, None] * (1 + 0.05 * rng.standard_normal((19, n)))
    Y[0] = rng.uniform(-90, 40, n)
    W = rng.uniform(-50, 300, n)
    y = np.vstack([Y, W[None]])
    worst = 0.0
    for kappa in (0.5, 2.0, 5.0):
        for lo in (True, False):
            g = H_grad(y, kappa)
            f = field(y, kappa, lo)
            terms = np.abs(g * f).sum(axis=0)
            worst = max(worst, float(np.max(np.abs((g * f).sum(axis=0)) / terms)))
    return worst


if __name__ == "__main__":
    print("K_CHARGE", K_CHARGE, "H0_REST", repr(H0_REST))
    print("first integral, max relative |dH/ds| at random states:", check_first_integral())
