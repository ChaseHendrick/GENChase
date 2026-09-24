"""Core routines for self-similar three-vortex collapse in the alpha-models.

Model: conj(dz_j/dt) = (1/(2 pi i)) sum_{k != j} Gamma_k |z_j - z_k|^(-alpha) / (z_j - z_k),
i.e. dz_j/dt = (i/(2 pi)) sum_k Gamma_k |z_j - z_k|^(-alpha-2) (z_j - z_k).
This is the skew gradient of sum_k Gamma_k G(|z_j - z_k|) with G(r) = r^(-alpha)/(2 pi alpha);
alpha -> 0 is the Euler system of the paper (the additive constant 1/(2 pi alpha) is irrelevant).

Shape: z1 = 0, z2 = 1, z3 = w.  a = r23^2, b = r13^2, c = r12^2.
Circulations: (G2G3, G1G3, G1G2) proportional to (a,b,c) x (a^-s, b^-s, c^-s), s = alpha/2,
which is the unique direction making both L = sum_{j<k} GjGk r_jk^2 = 0 and
H = sum_{j<k} GjGk r_jk^(-alpha) = 0.
"""
import mpmath as mp

mp.mp.dps = 50


def circulations(a, b, c, alpha):
    a, b, c = mp.mpf(a), mp.mpf(b), mp.mpf(c)
    if alpha == 0:
        X1, X2, X3 = b - c, c - a, a - b
    else:
        s = mp.mpf(alpha) / 2
        A, B, C = a ** (-s), b ** (-s), c ** (-s)
        X1 = b * C - c * B
        X2 = c * A - a * C
        X3 = a * B - b * A
    prod = X1 * X2 * X3
    if prod == 0:
        return None
    t = 1 if prod > 0 else -1
    p1, p2, p3 = t * X1, t * X2, t * X3
    G1 = mp.sqrt(p2 * p3 / p1)
    G2 = p3 / G1
    G3 = p2 / G1
    return (G1, G2, G3)


def velocities(z, G, alpha):
    n = len(z)
    v = []
    for j in range(n):
        s = mp.mpc(0)
        for k in range(n):
            if k == j:
                continue
            d = z[j] - z[k]
            r2 = abs(d) ** 2
            s += G[k] * r2 ** (-(mp.mpf(alpha) + 2) / 2) * d
        v.append(1j * s / (2 * mp.pi))
    return v


def config(w, alpha):
    w = mp.mpc(w)
    z = [mp.mpc(0), mp.mpc(1), w]
    a = abs(w - 1) ** 2
    b = abs(w) ** 2
    c = mp.mpf(1)
    G = circulations(a, b, c, alpha)
    return z, G


def kappa_bs(w, alpha, check=False):
    """kappa from direct Biot-Savart at the three vortices; returns (kappa, residual, G, zc)."""
    z, G = config(w, alpha)
    if G is None:
        return None
    S = sum(G)
    zc = sum(g * zz for g, zz in zip(G, z)) / S
    v = velocities(z, G, alpha)
    ks = [v[j] / (z[j] - zc) for j in range(3)]
    res = max(abs(ks[j] - ks[0]) for j in range(3)) / abs(ks[0])
    return ks[0], res, G, zc


def invariants(w, alpha):
    z, G = config(w, alpha)
    pairs = [(0, 1), (0, 2), (1, 2)]
    L = sum(G[j] * G[k] * abs(z[j] - z[k]) ** 2 for j, k in pairs)
    if alpha == 0:
        H = sum(G[j] * G[k] * mp.log(abs(z[j] - z[k])) for j, k in pairs)
        Hh = sum(G[j] * G[k] for j, k in pairs)
    else:
        H = sum(G[j] * G[k] * abs(z[j] - z[k]) ** (-mp.mpf(alpha)) for j, k in pairs)
        Hh = H
    scale = sum(abs(G[j] * G[k]) for j, k in pairs)
    return L / scale, Hh / scale


def P_of(w, alpha):
    r = kappa_bs(w, alpha)
    if r is None:
        return mp.inf
    k = r[0]
    return abs(k.imag) / (2 * abs(k.real))


# closed-form kappa in terms of side lengths (derived by hand; checked against Biot-Savart)
def kappa_formula(w, alpha):
    z, G = config(w, alpha)
    a = abs(w - 1) ** 2
    b = abs(w) ** 2
    c = mp.mpf(1)
    s = mp.mpf(alpha) / 2
    f = lambda x: x ** (-1 - s)
    A2 = (mp.conj(z[0] - z[2]) * (z[1] - z[2])).imag  # Im(conj(z13) z23)
    rek = G[2] * A2 * (f(a) - f(b)) / (2 * mp.pi * c)
    imk = ((G[0] + G[1]) * f(c) + G[2] * (f(b) * (b + c - a) - f(a) * (b - c - a)) / (2 * c)) / (2 * mp.pi)
    return mp.mpc(rek, imk)
