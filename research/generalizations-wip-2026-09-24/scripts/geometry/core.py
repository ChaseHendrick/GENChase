"""Core numerics for the geometry direction (three-vortex self-similar collapse).

Conventions follow the paper: conj(dz_j/dt) = (1/(2 pi i)) sum_{k!=j} G_k/(z_j - z_k);
Gamma = (1, mu, -mu/(1+mu)); positions (pos) of the paper parametrized by theta.
All numerics in mpmath at mp.dps set by caller (default 50).
"""
import mpmath as mp

mp.mp.dps = 50


def gammas(mu):
    mu = mp.mpf(mu)
    return [mp.mpf(1), mu, -mu / (1 + mu)]


def positions(mu, th):
    mu = mp.mpf(mu)
    R = 1 + mu + mu**2
    sR = mp.sqrt(R)
    e = mp.expj(-th)
    z1 = mu * (1 + sR * e) / (1 + mu)**2
    z2 = (mu - sR * e) / (1 + mu)**2
    z3 = mp.mpc(1)
    return [z1, z2, z3]


def velocities(G, z):
    n = len(z)
    v = []
    for j in range(n):
        s = mp.mpc(0)
        for k in range(n):
            if k != j:
                s += G[k] / (z[j] - z[k])
        v.append(mp.conj(s / (2j * mp.pi)))
    return v


def center(G, z):
    return sum(g * w for g, w in zip(G, z)) / sum(G)


def kappa_bs(G, z):
    """kappa from direct Biot-Savart; returns (kappa, max relative spread among vortices)."""
    zc = center(G, z)
    v = velocities(G, z)
    ks = [v[j] / (z[j] - zc) for j in range(len(z))]
    k0 = ks[0]
    spread = max(abs(k - k0) for k in ks) / abs(k0)
    return k0, spread


def P_of(k):
    return abs(k.imag) / (-2 * k.real)


def angles(z):
    """interior angles (A,B,C) at z1,z2,z3 and orientation sign (+1 ccw)."""
    z1, z2, z3 = z
    def ang(p, q, r):  # angle at p between q-p and r-p
        return abs(mp.arg((r - p) / (q - p)))
    A = ang(z1, z2, z3)
    B = ang(z2, z3, z1)
    C = ang(z3, z1, z2)
    area2 = ((z2 - z1).conjugate() * (z3 - z1)).imag
    return A, B, C, (1 if area2 > 0 else -1)


def circum(z):
    z1, z2, z3 = z
    # circumcenter via standard formula
    a = z1; b = z2; c = z3
    d = 2 * ((a.real * (b.imag - c.imag) + b.real * (c.imag - a.imag) + c.real * (a.imag - b.imag)))
    ux = ((abs(a)**2) * (b.imag - c.imag) + (abs(b)**2) * (c.imag - a.imag) + (abs(c)**2) * (a.imag - b.imag)) / d
    uy = ((abs(a)**2) * (c.real - b.real) + (abs(b)**2) * (a.real - c.real) + (abs(c)**2) * (b.real - a.real)) / d
    Z = mp.mpc(ux, uy)
    return Z, abs(z1 - Z)


def Gpoly(mu, C):
    mu = mp.mpf(mu)
    return (4 * (1 - mu) * C**3 + 4 * (2 * mu**2 - mu + 2) * C**2 + 2 * (1 - mu)**3 * C
            - (2 * mu**4 + 7 * mu**3 + 6 * mu**2 + 7 * mu + 2))


def Ptheta(mu, th):
    mu = mp.mpf(mu)
    R = 1 + mu + mu**2
    C = mp.sqrt(R) * mp.cos(th)
    N = 2 * (1 + mu**2) * R + (1 - mu) * (2 + mu + 2 * mu**2) * C - 2 * mu * C**2
    M = 1 - mu + 2 * C
    return N / (2 * mu * mp.sqrt(R) * M * mp.sin(th))


def minimizers(mu):
    """Return dict with theta of the minimizer on A+ and A- (paper's arcs)."""
    mu = mp.mpf(mu)
    R = 1 + mu + mu**2
    sR = mp.sqrt(R)
    C0 = (mu - 1) / 2
    out = {}
    if mu == 1:
        Cp, Cm = mp.sqrt(2), -mp.sqrt(2)
    else:
        f = lambda C: Gpoly(mu, C)
        Cp = mp.findroot(f, (C0, sR), solver='anderson')
        Cm = mp.findroot(f, (-sR, C0), solver='anderson')
    thp = mp.acos(Cp / sR)              # in (0, theta0)
    thm = 2 * mp.pi - mp.acos(Cm / sR)  # in (pi, 2pi - theta0)
    out['+'] = thp
    out['-'] = thm
    return out
