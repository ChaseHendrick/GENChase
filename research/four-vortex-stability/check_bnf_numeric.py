"""NUMERICAL check (floating point, not part of the proof) of the Birkhoff coefficients.

Integrates the full planar four-vortex equations (Kirchhoff, time units of Ht = 2 pi H:
dx_j/dt = -sum_k G_k (y_j - y_k)/r^2, dy_j/dt = sum_k G_k (x_j - x_k)/r^2) from the relative
equilibrium displaced along one linear normal mode with action tau (J kept fixed through the
reduced coordinates), and measures the frequency of the rotation-invariant signal |z1 - z2|^2.
The normal form predicts |frequency of mode k| = w_k + 2 s_k A_kk tau + O(tau^(3/2)), with
A_11 = A and A_22 = C.  A least-squares slope over several small tau is compared with 2 s_k A_kk.

usage: python3 check_bnf_numeric.py [m]
"""
import sys
import numpy as np
from scipy.integrate import solve_ivp
from tps import Space, Ring
from vortex import Hred_tps, jacobi, positions
from bnf import normal_form, float_diagonaliser
import families
from certify2 import float_newton

RF = Ring('float')


def rhs(t, s, G):
    z = s[:4] + 1j * s[4:]
    dz = np.zeros(4, complex)
    for j in range(4):
        for k in range(4):
            if j != k:
                w = z[j] - z[k]
                dz[j] += 1j * G[k] * w / abs(w) ** 2
    return np.concatenate([dz.real, dz.imag])


def config_from_canonical(G, vstar, X):
    """Full positions for canonical reduced displacement X = (q2, p2, q3, p3) at fixed J."""
    mu, coef = jacobi(G, RF)
    s = [1 if m > 0 else -1 for m in mu]
    rt = [abs(m) ** 0.5 for m in mu]
    x2 = vstar[0] + X[0] / rt[1]; y2 = vstar[1] + s[1] * X[1] / rt[1]
    x3 = vstar[2] + X[2] / rt[2]; y3 = vstar[3] + s[2] * X[3] / rt[2]
    J2 = mu[0] + mu[1] * (vstar[0] ** 2 + vstar[1] ** 2) + mu[2] * (vstar[2] ** 2 + vstar[3] ** 2)
    r = ((J2 - mu[1] * (x2 ** 2 + y2 ** 2) - mu[2] * (x3 ** 2 + y3 ** 2)) / mu[0]) ** 0.5
    return positions(G, [x2 / r * r, y2, x3, y3]) if False else _pos(G, r, (x2, y2, x3, y3))


def _pos(G, r, v):
    mu, coef = jacobi(G, RF)
    u = [complex(r, 0), complex(v[0], v[1]), complex(v[2], v[3])]
    z = [sum(cj[k] * u[k] for k in range(3)) for cj in coef]
    c = sum(g * zz for g, zz in zip(G, z)) / sum(G)
    return [zz - c for zz in z]


def measure(G, vstar, col_a, col_b, tau, periods, w):
    X = np.sqrt(2 * tau) * np.array(col_a)   # Q = sqrt(2 tau), P = 0
    z = _pos(G, 1.0, [0, 0, 0, 0]) if False else config_from_canonical(G, vstar, X)
    s0 = np.concatenate([np.real(z), np.imag(z)])
    Tend = periods * 2 * np.pi / w
    ts = np.linspace(0, Tend, int(periods * 200))
    sol = solve_ivp(rhs, (0, Tend), s0, t_eval=ts, args=(G,), method='DOP853', rtol=1e-12, atol=1e-13)
    zz = sol.y[:4] + 1j * sol.y[4:]
    sig = np.abs(zz[0] - zz[1]) ** 2
    sig = sig - sig.mean()
    # frequency from upward zero crossings (linear interpolation), after removing the mean
    idx = np.where((sig[:-1] < 0) & (sig[1:] >= 0))[0]
    tc = ts[idx] - sig[idx] * (ts[idx + 1] - ts[idx]) / (sig[idx + 1] - sig[idx])
    per = (tc[-1] - tc[0]) / (len(tc) - 1)
    return 2 * np.pi / per


def reduced_normal_coords(G, vstar, Tinv, zz):
    """Map full positions (4 x N array) to linear normal coordinates (Q1, P1, Q2, P2)."""
    mu, coef = jacobi(G, RF)
    G1, G2, G3, G4 = G
    S2 = G1 + G2; S3 = S2 + G3
    u1 = zz[1] - zz[0]
    c12 = (G1 * zz[0] + G2 * zz[1]) / S2
    u2 = zz[2] - c12
    c123 = (S2 * c12 + G3 * zz[2]) / S3
    u3 = zz[3] - c123
    ph = np.exp(-1j * np.angle(u1))
    v2, v3 = u2 * ph, u3 * ph
    s = [1 if m > 0 else -1 for m in mu]
    rt = [abs(m) ** 0.5 for m in mu]
    q2 = rt[1] * (v2.real - vstar[0]); p2 = s[1] * rt[1] * (v2.imag - vstar[1])
    q3 = rt[2] * (v3.real - vstar[2]); p3 = s[2] * rt[2] * (v3.imag - vstar[3])
    return Tinv @ np.vstack([q2, p2, q3, p3])


def rates(G, vstar, T, tau1, tau2, w, periods=40):
    """Time-averaged actions and phase velocities -dtheta_k/dt (= dH/dtau_k) of the two modes."""
    T = np.array(T, float)
    X = np.sqrt(2 * tau1) * T[:, 0] + np.sqrt(2 * tau2) * T[:, 2]
    z = config_from_canonical(G, vstar, X)
    s0 = np.concatenate([np.real(z), np.imag(z)])
    Tend = periods * 2 * np.pi / min(w)
    ts = np.linspace(0, Tend, int(periods * 400 * max(w) / min(w)))
    sol = solve_ivp(rhs, (0, Tend), s0, t_eval=ts, args=(G,), method='DOP853', rtol=1e-13, atol=1e-14)
    zz = sol.y[:4] + 1j * sol.y[4:]
    N = reduced_normal_coords(G, vstar, np.linalg.inv(T), zz)
    out = []
    for k in range(2):
        Q, P = N[2 * k], N[2 * k + 1]
        th = np.unwrap(np.arctan2(P, Q))
        out.append((np.mean((Q * Q + P * P) / 2), -np.polyfit(ts, th, 1)[0]))
    return out


if __name__ == '__main__':
    m = float(sys.argv[1]) if len(sys.argv) > 1 else -0.9
    fam = families.get(sys.argv[2] if len(sys.argv) > 2 else 'three-collinear')
    G = fam.G(m)
    v = float_newton(G, fam.guess(m))
    H, mu = Hred_tps(G, list(v), Space(4, 4), RF)
    info = normal_form(H.part(2), H.part(3), H.part(4))
    w, sg = info['w'], info['signs']
    A, B, C = info['A'].real, info['B'].real, info['C'].real
    print('m = %g  w = %s  signs = %s' % (m, [float(x) for x in w], sg))
    print('normal form:  A = %.5f  B = %.5f  C = %.5f  D = %.5f' % (A, B, C, info['D']))
    rows = []
    base = 2e-6 * max(w)
    for a, b in [(1, 0.2), (2, 0.2), (4, 0.2), (0.2, 1), (0.2, 2), (0.2, 4), (2, 2), (1, 3), (3, 1)]:
        (t1, r1), (t2, r2) = rates(G, v, info['T'], a * base, b * base, w)
        rows.append((t1, t2, r1, r2))
    rows = np.array(rows)
    # fit dH/dtau1 = s1 w1 + 2A tau1 + B tau2 and dH/dtau2 = s2 w2 + B tau1 + 2C tau2
    M1 = np.c_[np.ones(len(rows)), rows[:, 0], rows[:, 1]]
    c1 = np.linalg.lstsq(M1, rows[:, 2], rcond=None)[0]
    c2 = np.linalg.lstsq(M1, rows[:, 3], rcond=None)[0]
    print('integration:  s1 w1 = %.6f (%.6f)  2A = %.4f (%.4f)  B = %.4f (%.4f)' % (c1[0], sg[0] * w[0], c1[1], 2 * A, c1[2], B))
    print('              s2 w2 = %.6f (%.6f)  B = %.4f (%.4f)  2C = %.4f (%.4f)' % (c2[0], sg[1] * w[1], c2[1], B, c2[2], 2 * C))
    Dint = (c1[1] / 2) * w[1] ** 2 + (c1[2] + c2[1]) / 2 * w[0] * w[1] + (c2[2] / 2) * w[0] ** 2
    print('D from integration = %.4f, from normal form = %.4f' % (Dint, info['D']))
