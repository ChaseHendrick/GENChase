"""Hodgkin-Huxley (1952) in float64 for the chaos search: model, Jacobian, an adaptive DOP853 integrator
compiled with numba, the variational equations, and a Poincare return map. NUMERICAL, NOT RIGOROUS.

Conventions follow papers/hh-dynamics/code/hh_ball.py: u = depolarization from rest (mV), J = applied
depolarizing current (uA/cm2), 6.3 C, Hodgkin and Huxley's constants:

    du/dt = J - 120 m^3 h (u - 115) - 36 n^4 (u + 12) - 0.3 (u - E_l)
    dx/dt = alpha_x(u) (1 - x) - beta_x(u) x

Guckenheimer and Oliva (2002) write v = -u. Their cross-section v = -4.5 "with v increasing" is u = 4.5 with u
decreasing, and their I is our J (their printed sign of I is a misprint; with it their Hopf point would sit at
J = -9.78).

The DOP853 tableau is Hairer, Norsett and Wanner's, taken from scipy so that it is not retyped by hand.
"""
import math
import numpy as np
import numba as nb
from scipy.integrate._ivp import dop853_coefficients as _c

EL0 = 10.598920969391700  # placeholder, replaced below by the exact zero-current value (mpmath)


def el_zero_current(dps=40):
    """E_l that makes the total ionic current vanish at u = 0 with the steady-state gates (mpmath)."""
    import mpmath as mp
    mp.mp.dps = dps
    psi = lambda x: x / mp.expm1(x) if x != 0 else mp.mpf(1)
    u = mp.mpf(0)
    am, bm = psi((25 - u) / 10), 4 * mp.exp(-u / 18)
    an, bn = mp.mpf(1) / 10 * psi((10 - u) / 10), mp.mpf(1) / 8 * mp.exp(-u / 80)
    ah, bh = mp.mpf(7) / 100 * mp.exp(-u / 20), 1 / (mp.exp((30 - u) / 10) + 1)
    m, n, h = am / (am + bm), an / (an + bn), ah / (ah + bh)
    ina = 120 * m ** 3 * h * (u - 115)
    ik = 36 * n ** 4 * (u + 12)
    # 0 = -ina - ik - 0.3 (u - E_l)  =>  E_l = u + (ina + ik)/0.3
    return u + (ina + ik) / mp.mpf('0.3')


EL0 = float(el_zero_current())

A_ = np.ascontiguousarray(_c.A[:_c.N_STAGES, :_c.N_STAGES])
B_ = np.ascontiguousarray(_c.B)
C_ = np.ascontiguousarray(_c.C[:_c.N_STAGES])
E3_ = np.ascontiguousarray(_c.E3)
E5_ = np.ascontiguousarray(_c.E5)
NS = _c.N_STAGES


@nb.njit(cache=True, inline='always')
def psi(x):
    if abs(x) < 0.1:
        x2 = x * x
        return 1.0 - 0.5 * x + x2 * (1.0 / 12 + x2 * (-1.0 / 720 + x2 * (1.0 / 30240 + x2 * (-1.0 / 1209600 + x2 / 47900160.0))))
    return x / math.expm1(x)


@nb.njit(cache=True, inline='always')
def dpsi(x):
    if abs(x) < 0.1:
        x2 = x * x
        return -0.5 + x * (1.0 / 6 + x2 * (-4.0 / 720 + x2 * (6.0 / 30240 + x2 * (-8.0 / 1209600 + x2 * 10.0 / 47900160.0))))
    e = math.expm1(x)
    return (e - x * (e + 1.0)) / (e * e)


@nb.njit(cache=True)
def rhs(y, J, EL, out):
    u, m, n, h = y[0], y[1], y[2], y[3]
    am = psi((25.0 - u) / 10.0)
    bm = 4.0 * math.exp(-u / 18.0)
    an = 0.1 * psi((10.0 - u) / 10.0)
    bn = 0.125 * math.exp(-u / 80.0)
    ah = 0.07 * math.exp(-u / 20.0)
    bh = 1.0 / (math.exp((30.0 - u) / 10.0) + 1.0)
    out[0] = J - 120.0 * m * m * m * h * (u - 115.0) - 36.0 * n ** 4 * (u + 12.0) - 0.3 * (u - EL)
    out[1] = am * (1.0 - m) - bm * m
    out[2] = an * (1.0 - n) - bn * n
    out[3] = ah * (1.0 - h) - bh * h


@nb.njit(cache=True)
def jac(y, Jm):
    u, m, n, h = y[0], y[1], y[2], y[3]
    xm, xn = (25.0 - u) / 10.0, (10.0 - u) / 10.0
    am, dam = psi(xm), -0.1 * dpsi(xm)
    bm = 4.0 * math.exp(-u / 18.0); dbm = -bm / 18.0
    an, dan = 0.1 * psi(xn), -0.01 * dpsi(xn)
    bn = 0.125 * math.exp(-u / 80.0); dbn = -bn / 80.0
    ah = 0.07 * math.exp(-u / 20.0); dah = -ah / 20.0
    E = math.exp((30.0 - u) / 10.0)
    bh = 1.0 / (E + 1.0); dbh = 0.1 * E * bh * bh
    Jm[:, :] = 0.0
    Jm[0, 0] = -(120.0 * m ** 3 * h + 36.0 * n ** 4 + 0.3)
    Jm[0, 1] = -360.0 * m * m * h * (u - 115.0)
    Jm[0, 2] = -144.0 * n ** 3 * (u + 12.0)
    Jm[0, 3] = -120.0 * m ** 3 * (u - 115.0)
    Jm[1, 0] = dam * (1.0 - m) - dbm * m; Jm[1, 1] = -(am + bm)
    Jm[2, 0] = dan * (1.0 - n) - dbn * n; Jm[2, 2] = -(an + bn)
    Jm[3, 0] = dah * (1.0 - h) - dbh * h; Jm[3, 3] = -(ah + bh)


@nb.njit(cache=True)
def rhs_full(y, J, EL, var, out):
    """State (4) followed, if var, by the 4x4 fundamental matrix row-major (16) and d/dJ (4)."""
    rhs(y[:4], J, EL, out[:4])
    if var:
        Jm = np.empty((4, 4))
        jac(y[:4], Jm)
        for i in range(4):
            for k in range(4):
                s = 0.0
                for l in range(4):
                    s += Jm[i, l] * y[4 + 4 * l + k]
                out[4 + 4 * i + k] = s
            s = 1.0 if i == 0 else 0.0            # d/dJ of the field is e_0
            for l in range(4):
                s += Jm[i, l] * y[20 + l]
            out[20 + i] = s


@nb.njit(cache=True)
def step(y, f, h, J, EL, var, K, ynew, fnew):
    N = y.shape[0]
    for i in range(N):
        K[0, i] = f[i]
    tmp = np.empty(N)
    for s in range(1, NS):
        for i in range(N):
            acc = 0.0
            for j in range(s):
                acc += A_[s, j] * K[j, i]
            tmp[i] = y[i] + h * acc
        rhs_full(tmp, J, EL, var, K[s])
    for i in range(N):
        acc = 0.0
        for j in range(NS):
            acc += B_[j] * K[j, i]
        ynew[i] = y[i] + h * acc
    rhs_full(ynew, J, EL, var, fnew)
    for i in range(N):
        K[NS, i] = fnew[i]


@nb.njit(cache=True)
def err_norm(y, ynew, K, h, rtol, atol, nerr):
    e5 = 0.0
    e3 = 0.0
    for i in range(nerr):
        sc = atol + rtol * max(abs(y[i]), abs(ynew[i]))
        a5 = 0.0
        a3 = 0.0
        for j in range(NS + 1):
            a5 += E5_[j] * K[j, i]
            a3 += E3_[j] * K[j, i]
        e5 += (a5 / sc) ** 2
        e3 += (a3 / sc) ** 2
    if e5 == 0.0 and e3 == 0.0:
        return 0.0
    return abs(h) * e5 / math.sqrt((e5 + 0.01 * e3) * nerr)


@nb.njit(cache=True)
def flow(y0, J, EL, var, tmax, sec_u, sec_dir, nsec, rtol, atol, hmax, rec):
    """Integrate from y0. If nsec > 0, stop at the nsec-th crossing of u = sec_u in direction sec_dir
    (-1: u decreasing, +1: u increasing), located by secant iteration on the step length. Otherwise stop at
    tmax. Returns (y, t, nsteps, umax_record) where umax is the largest u seen (for firing tests); if rec > 0,
    also returns up to rec (t, u) samples. The error control uses the state only when var (nerr = 4)."""
    N = y0.shape[0]
    y = y0.copy()
    f = np.empty(N)
    rhs_full(y, J, EL, var, f)
    K = np.empty((NS + 1, N))
    ynew = np.empty(N)
    fnew = np.empty(N)
    t = 0.0
    h = 1e-3
    count = 0
    nsteps = 0
    umax = y[0]
    umin = y[0]
    nerr = 4
    samples = np.zeros((max(rec, 1), 5))
    ns = 0
    while True:
        if nsec <= 0 and t + h > tmax:
            h = tmax - t
        step(y, f, h, J, EL, var, K, ynew, fnew)
        en = err_norm(y, ynew, K, h, rtol, atol, nerr)
        if en > 1.0:
            h *= max(0.2, 0.9 * en ** (-1.0 / 8.0))
            continue
        # accepted
        crossed = False
        if nsec > 0:
            g0 = (y[0] - sec_u) * sec_dir
            g1 = (ynew[0] - sec_u) * sec_dir
            if g0 < 0.0 and g1 >= 0.0 and t > 1e-9:
                crossed = True
        if crossed:
            count += 1
            if count == nsec:
                # secant / regula falsi on the step length s in (0, h] with fresh steps from y
                sa, ga = 0.0, (y[0] - sec_u)
                sb, gb = h, (ynew[0] - sec_u)
                s = h
                Kt = np.empty((NS + 1, N))
                yt = np.empty(N)
                ft = np.empty(N)
                for it in range(60):
                    s = sb - gb * (sb - sa) / (gb - ga)
                    step(y, f, s, J, EL, var, Kt, yt, ft)
                    gs = yt[0] - sec_u
                    if abs(gs) < 1e-15 * (1.0 + abs(sec_u)):
                        break
                    sa, ga, sb, gb = sb, gb, s, gs
                    if abs(sb - sa) < 1e-17:
                        break
                return yt, t + s, nsteps, max(umax, yt[0]), min(umin, yt[0]), samples[:ns]
        t += h
        nsteps += 1
        for i in range(N):
            y[i] = ynew[i]
            f[i] = fnew[i]
        if y[0] > umax:
            umax = y[0]
        if y[0] < umin:
            umin = y[0]
        if rec > 0 and ns < rec:
            samples[ns, 0] = t
            for i in range(4):
                samples[ns, 1 + i] = y[i]
            ns += 1
        if nsec <= 0 and t >= tmax:
            return y, t, nsteps, umax, umin, samples[:ns]
        if t > 1e6 or nsteps > 50000000:
            return y, -1.0, nsteps, umax, umin, samples[:ns]
        fac = 0.9 * en ** (-1.0 / 8.0) if en > 0 else 10.0
        h *= min(10.0, max(0.2, fac))
        if h > hmax:
            h = hmax


RTOL, ATOL = 1e-14, 1e-16


def field(y, J, EL=EL0):
    out = np.empty(4)
    rhs(np.asarray(y, float), J, EL, out)
    return out


def jacobian(y):
    M = np.empty((4, 4))
    jac(np.asarray(y, float), M)
    return M


def run(y0, J, T, EL=EL0, rtol=RTOL, atol=ATOL, hmax=0.05, rec=0):
    y, t, n, umax, umin, s = flow(np.asarray(y0, float), J, EL, False, T, 0.0, 0, 0, rtol, atol, hmax, rec)
    return y, umax, umin, s


def run_var(y0, J, T, EL=EL0, rtol=RTOL, atol=ATOL, hmax=0.05):
    z = np.zeros(24)
    z[:4] = y0
    z[4:20] = np.eye(4).ravel()
    z, t, n, umax, umin, s = flow(z, J, EL, True, T, 0.0, 0, 0, rtol, atol, hmax, 0)
    return z[:4], z[4:20].reshape(4, 4), z[20:24]


def to_section(y0, J, sec_u, sec_dir=-1, k=1, EL=EL0, var=False, rtol=RTOL, atol=ATOL, hmax=0.05):
    """k-th crossing of u = sec_u in direction sec_dir. Returns (y, t) or with var (y, t, Phi, dPhi/dJ)."""
    if var:
        z = np.zeros(24)
        z[:4] = y0
        z[4:20] = np.eye(4).ravel()
        z, t, n, umax, umin, s = flow(z, J, EL, True, 0.0, sec_u, sec_dir, k, rtol, atol, hmax, 0)
        return z[:4], t, z[4:20].reshape(4, 4), z[20:24], umax, umin
    z, t, n, umax, umin, s = flow(np.asarray(y0, float), J, EL, False, 0.0, sec_u, sec_dir, k, rtol, atol, hmax, 0)
    return z, t, umax, umin


def rates(u):
    am = psi((25.0 - u) / 10.0); bm = 4.0 * math.exp(-u / 18.0)
    an = 0.1 * psi((10.0 - u) / 10.0); bn = 0.125 * math.exp(-u / 80.0)
    ah = 0.07 * math.exp(-u / 20.0); bh = 1.0 / (math.exp((30.0 - u) / 10.0) + 1.0)
    return am, bm, an, bn, ah, bh


def gates_inf(u):
    am, bm, an, bn, ah, bh = rates(u)
    return am / (am + bm), an / (an + bn), ah / (ah + bh)


def jss(u, EL=EL0):
    m, n, h = gates_inf(u)
    return 120 * m ** 3 * h * (u - 115) + 36 * n ** 4 * (u + 12) + 0.3 * (u - EL)


def equilibrium(J, EL=EL0):
    from scipy.optimize import brentq
    u = brentq(lambda u: jss(u, EL) - J, -11.9, 114.0, xtol=1e-15, rtol=1e-15)
    m, n, h = gates_inf(u)
    return np.array([u, m, n, h])
