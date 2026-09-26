"""Independent check code (NUMERICAL, float64). Hodgkin-Huxley 1952 in the modern sign convention.
Integrator: adaptive Gragg-Bulirsch-Stoer extrapolation (modified midpoint, fixed 8 columns, order 16),
written here from scratch; not DOP853 and not shared with ../code/. Section u = 4.5, u increasing.
Crossings are located by Newton iteration on the step size (re-stepping from the last accepted state)."""
import numpy as np
import numba as nb
import mpmath as mp

GNA, GK, GL, ENA, EK = 120.0, 36.0, 0.3, 115.0, -12.0
USEC = 4.5


def el_exact(dps=40):
    mp.mp.dps = dps
    def psi(x):
        return mp.mpf(1) if x == 0 else x / mp.expm1(x)
    u = mp.mpf(0)
    am, bm = psi((25 - u) / 10), 4 * mp.e ** (-u / 18)
    an, bn = mp.mpf('0.1') * psi((10 - u) / 10), mp.mpf('0.125') * mp.e ** (-u / 80)
    ah, bh = mp.mpf('0.07') * mp.e ** (-u / 20), 1 / (mp.e ** ((30 - u) / 10) + 1)
    m, n, h = am / (am + bm), an / (an + bn), ah / (ah + bh)
    # 0 = 120 m^3 h (0-115) + 36 n^4 (0+12) + 0.3 (0 - EL)
    return (-GNA * m ** 3 * h * 115 + GK * n ** 4 * 12) / mp.mpf('0.3')


EL = float(el_exact())


@nb.njit(cache=True)
def psi(z):
    if abs(z) < 0.05:
        z2 = z * z
        return 1.0 - z / 2 + z2 / 12 - z2 * z2 / 720 + z2 * z2 * z2 / 30240
    return z / np.expm1(z)


@nb.njit(cache=True)
def dpsi(z):
    if abs(z) < 0.05:
        z2 = z * z
        return -0.5 + z / 6 - z2 * z / 180 + z2 * z2 * z / 5040
    e = np.expm1(z)
    return (e - z * (e + 1.0)) / (e * e)


@nb.njit(cache=True)
def rates(u):
    am = psi((25.0 - u) / 10.0)
    bm = 4.0 * np.exp(-u / 18.0)
    an = 0.1 * psi((10.0 - u) / 10.0)
    bn = 0.125 * np.exp(-u / 80.0)
    ah = 0.07 * np.exp(-u / 20.0)
    bh = 1.0 / (np.exp((30.0 - u) / 10.0) + 1.0)
    return am, bm, an, bn, ah, bh


@nb.njit(cache=True)
def f(y, J, El, out):
    u, m, n, h = y[0], y[1], y[2], y[3]
    am, bm, an, bn, ah, bh = rates(u)
    out[0] = J - GNA * m * m * m * h * (u - ENA) - GK * n * n * n * n * (u - EK) - GL * (u - El)
    out[1] = am * (1 - m) - bm * m
    out[2] = an * (1 - n) - bn * n
    out[3] = ah * (1 - h) - bh * h


@nb.njit(cache=True)
def jac(y, Jm):
    u, m, n, h = y[0], y[1], y[2], y[3]
    am, bm, an, bn, ah, bh = rates(u)
    dam = -0.1 * dpsi((25.0 - u) / 10.0)
    dbm = -bm / 18.0
    dan = -0.01 * dpsi((10.0 - u) / 10.0)
    dbn = -bn / 80.0
    dah = -ah / 20.0
    e = np.exp((30.0 - u) / 10.0)
    dbh = e / 10.0 / (e + 1.0) ** 2
    Jm[0, 0] = -GNA * m ** 3 * h - GK * n ** 4 - GL
    Jm[0, 1] = -3 * GNA * m * m * h * (u - ENA)
    Jm[0, 2] = -4 * GK * n ** 3 * (u - EK)
    Jm[0, 3] = -GNA * m ** 3 * (u - ENA)
    Jm[1, 0] = dam * (1 - m) - dbm * m
    Jm[1, 1] = -(am + bm); Jm[1, 2] = 0.0; Jm[1, 3] = 0.0
    Jm[2, 0] = dan * (1 - n) - dbn * n
    Jm[2, 2] = -(an + bn); Jm[2, 1] = 0.0; Jm[2, 3] = 0.0
    Jm[3, 0] = dah * (1 - h) - dbh * h
    Jm[3, 3] = -(ah + bh); Jm[3, 1] = 0.0; Jm[3, 2] = 0.0


@nb.njit(cache=True)
def F(y, J, El, out):
    """Vector field on 4 (state) or 20 (state + row-major 4x4 variational matrix) components."""
    f(y, J, El, out)
    if y.shape[0] == 20:
        Jm = np.empty((4, 4))
        jac(y, Jm)
        for i in range(4):
            for k in range(4):
                s = 0.0
                for l in range(4):
                    s += Jm[i, l] * y[4 + 4 * l + k]
                out[4 + 4 * i + k] = s


NSEQ = np.array([2, 4, 6, 8, 10, 12, 14, 16])
KC = 6


@nb.njit(cache=True)
def gbs(y, H, J, El, T, err_scale_rtol, atol):
    """One GBS step of size H. Returns (y_new, err) with err the scaled RMS difference of the last two
    diagonal extrapolants (normalised by rtol |y| + atol, only on the 4 state components)."""
    d = y.shape[0]
    fy = np.empty(d); F(y, J, El, fy)
    tmp = np.empty(d)
    for k in range(KC):
        n = NSEQ[k]
        hs = H / n
        z0 = y.copy()
        z1 = y + hs * fy
        for j in range(1, n):
            F(z1, J, El, tmp)
            z2 = z0 + 2 * hs * tmp
            z0 = z1; z1 = z2
        F(z1, J, El, tmp)
        T[k, 0, :] = 0.5 * (z1 + z0 + hs * tmp)
        for j in range(1, k + 1):
            r = (NSEQ[k] / NSEQ[k - j]) ** 2 - 1.0
            T[k, j, :] = T[k, j - 1, :] + (T[k, j - 1, :] - T[k - 1, j - 1, :]) / r
    yn = T[KC - 1, KC - 1, :].copy()
    e = 0.0
    for i in range(4):
        sc = atol + err_scale_rtol * max(abs(y[i]), abs(yn[i]))
        q = (yn[i] - T[KC - 1, KC - 2, i]) / sc
        e += q * q
    return yn, np.sqrt(e / 4)


@nb.njit(cache=True)
def ret(y0, J, El, rtol, atol, hmax, tmax, sign):
    """Flow from y0 until the next crossing of u = USEC with sign(du/dt) == sign (the start does not count).
    Returns (y_at_crossing, t, umax, fu_at_crossing, min |u-USEC| over interior local extrema, status).
    status 0 ok, 1 tmax reached."""
    d = y0.shape[0]
    T = np.empty((KC, KC, d))
    y = y0.copy(); t = 0.0; H = 0.05
    umax = y[0]; gap = 1e9
    fv = np.empty(d); F(y, J, El, fv); fprev = fv[0]
    while t < tmax:
        Hs = min(H, hmax)
        yn, err = gbs(y, Hs, J, El, T, rtol, atol)
        if err > 1.0 or not np.isfinite(err):
            H = Hs * max(0.2, 0.9 * err ** (-1.0 / 11))
            continue
        F(yn, J, El, fv)
        # crossing?
        a = (y[0] - USEC); b = (yn[0] - USEC)
        hit = False
        if sign > 0 and a < 0.0 and b >= 0.0:
            hit = True
        if sign < 0 and a > 0.0 and b <= 0.0:
            hit = True
        if hit:
            # Newton on step size s from state y
            s = Hs * a / (a - b)
            for it in range(50):
                ys, _ = gbs(y, s, J, El, T, rtol, atol)
                F(ys, J, El, fv)
                ds = -(ys[0] - USEC) / fv[0]
                s += ds
                if abs(ds) < 1e-15 * max(1.0, t):
                    break
            ys, _ = gbs(y, s, J, El, T, rtol, atol)
            F(ys, J, El, fv)
            return ys, t + s, umax, fv[0], gap, 0
        # interior extremum of u (sign change of du/dt)
        if fprev * fv[0] < 0.0:
            gap = min(gap, abs(yn[0] - USEC), abs(y[0] - USEC))
        fprev = fv[0]
        y = yn; t += Hs
        if y[0] > umax:
            umax = y[0]
        H = Hs * min(4.0, max(0.2, 0.9 * max(err, 1e-30) ** (-1.0 / 11)))
    return y, t, umax, 0.0, gap, 1


def P(g, J, El=EL, rtol=1e-13, atol=1e-15, hmax=0.25, var=False, sign=1, tmax=200.0):
    """Return map on the section in gate coordinates. With var=True also returns DP (3x3)."""
    g = np.asarray(g, float)
    if var:
        y0 = np.zeros(20); y0[0] = USEC; y0[1:4] = g
        y0[4:] = np.eye(4).ravel()
    else:
        y0 = np.r_[USEC, g]
    y, t, umax, fu, gap, st = ret(y0, J, El, rtol, atol, hmax, tmax, sign)
    info = dict(t=t, umax=umax, fu=fu, gap=gap, status=st)
    if not var:
        return y[1:4].copy(), info
    Phi = y[4:].reshape(4, 4)
    fv = np.empty(4); f(y[:4].copy(), J, El, fv)
    # dx1/dx0 on the section: (I - f e_u^T / f_u) Phi, restricted to gates
    M = Phi - np.outer(fv, Phi[0]) / fv[0]
    info['Phi'] = Phi
    return y[1:4].copy(), info, M[1:4, 1:4]


def equilibrium(J, El=EL):
    from scipy.optimize import brentq
    def xinf(u):
        am, bm, an, bn, ah, bh = rates(u)
        return am / (am + bm), an / (an + bn), ah / (ah + bh)
    def I(u):
        m, n, h = xinf(u)
        return J - GNA * m ** 3 * h * (u - ENA) - GK * n ** 4 * (u - EK) - GL * (u - El)
    u = brentq(I, -5, 10, xtol=1e-15)
    return np.r_[u, xinf(u)]


def P_scipy(g, J, El=EL, method='Radau', rtol=1e-12, atol=1e-14, sign=1):
    """Second, independent route: scipy solve_ivp (Radau/LSODA) with event location."""
    from scipy.integrate import solve_ivp
    def rhs(t, y):
        o = np.empty(4); f(y, J, El, o); return o
    def jf(t, y):
        M = np.empty((4, 4)); jac(y, M); return M
    def ev(t, y):
        return y[0] - USEC
    ev.direction = sign
    ev.terminal = False
    y0 = np.r_[USEC, g]
    s = solve_ivp(rhs, (0, 200), y0, method=method, rtol=rtol, atol=atol, jac=jf, events=ev,
                  dense_output=False)
    ts, ys = s.t_events[0], s.y_events[0]
    k = 0
    while ts[k] < 1e-9:
        k += 1
    return ys[k][1:4].copy(), dict(t=ts[k])


def newton_fp(g, J, El=EL, it=12, tol=1e-15, **kw):
    g = np.asarray(g, float).copy()
    for _ in range(it):
        x, info, M = P(g, J, El, var=True, **kw)
        r = x - g
        dg = np.linalg.solve(M - np.eye(3), -r)
        g += dg
        if np.abs(dg).max() < tol:
            break
    x, info, M = P(g, J, El, var=True, **kw)
    return g, np.abs(x - g).max(), info, M


@nb.njit(parallel=True, cache=True)
def _batch(G, J, El, rtol, atol, hmax, tmax):
    N = G.shape[0]
    X = np.empty((N, 3)); info = np.empty((N, 5))
    for k in nb.prange(N):
        y0 = np.empty(4); y0[0] = USEC; y0[1:4] = G[k]
        y, t, umax, fu, gap, st = ret(y0, J, El, rtol, atol, hmax, tmax, 1)
        X[k] = y[1:4]
        info[k, 0] = t; info[k, 1] = umax; info[k, 2] = fu; info[k, 3] = gap; info[k, 4] = st
    return X, info


def Pbatch(G, J, El=EL, rtol=1e-13, atol=1e-15, hmax=0.25, tmax=200.0):
    """Vectorised return map. info columns: t, umax, du/dt at arrival, min |u - 4.5| at interior extrema, status."""
    return _batch(np.ascontiguousarray(G, dtype=float), J, El, rtol, atol, hmax, tmax)


@nb.njit(cache=True)
def fate1(y0, J, El, eq, rtol, atol, hmax, tmax, uap):
    """1 = AP (u > uap at an accepted step), 0 = REST (|u - u_eq| < 0.5 and max gate distance < 0.005 at an
    accepted step, before any AP), -1 undecided by tmax. Also returns the time of the decision."""
    d = 4
    T = np.empty((KC, KC, d))
    y = y0.copy(); t = 0.0; H = 0.05
    while t < tmax:
        Hs = min(H, hmax)
        yn, err = gbs(y, Hs, J, El, T, rtol, atol)
        if err > 1.0 or not np.isfinite(err):
            H = Hs * max(0.2, 0.9 * err ** (-1.0 / 11))
            continue
        y = yn; t += Hs
        if y[0] > uap:
            return 1, t
        if abs(y[0] - eq[0]) < 0.5 and max(abs(y[1] - eq[1]), abs(y[2] - eq[2]), abs(y[3] - eq[3])) < 0.005:
            return 0, t
        H = Hs * min(4.0, max(0.2, 0.9 * max(err, 1e-30) ** (-1.0 / 11)))
    return -1, t


@nb.njit(parallel=True, cache=True)
def fates(Y0, J, El, eq, rtol, atol, hmax, tmax, uap):
    N = Y0.shape[0]
    out = np.empty(N, np.int64); tt = np.empty(N)
    for k in nb.prange(N):
        out[k], tt[k] = fate1(Y0[k].copy(), J, El, eq, rtol, atol, hmax, tmax, uap)
    return out, tt
