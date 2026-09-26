"""The reduced logarithmic energy of 7 points near the pentagonal bipyramid, exactly.

Gauge.  Rotate so that point 0 sits at the north pole N = (0,0,1) and project the
other six points stereographically from N:  z = (X + iY) / (1 - Z).  With
|p_i - p_j|^2 = 4 |z_i - z_j|^2 / ((1+|z_i|^2)(1+|z_j|^2)) and |p_i - N|^2 = 4/(1+|z_i|^2),
the energy E = - sum_{i<j} log |p_i - p_j| of the 7 points becomes

    F = - 1/2 sum_{1<=i<j<=6} log |z_i - z_j|^2 + 3 sum_{i=1..6} log(1 + |z_i|^2) - 21 log 2.

The bipyramid is z_S = 0 (south pole) and z_k = w^k, w = exp(2 pi i/5), k = 0..4
(the equatorial pentagon maps to the unit circle).  Chart coordinates, 11 real:

    z_S = x + i y,     z_k = w^k (1 + u_k + i v_k),   with v_0 = 0 (fixes rotation about z).

Variable order: x, y, u0, u1, v1, u2, v2, u3, v3, u4, v4.

Every term is c * log(Q(w)) with Q a real quadratic polynomial with Q(0) = Q0 > 0;
we store (c, Q0, P) with P = (Q - Q0)/Q0, so log Q = log Q0 + log(1 + P).
"""
from fractions import Fraction as Qf
from kfield import K, cos_sin

NV = 11
NAMES = ["x", "y", "u0", "u1", "v1", "u2", "v2", "u3", "v3", "u4", "v4"]


def var(i):
    e = [0] * NV
    e[i] = 1
    return {tuple(e): K(1)}


def const(a):
    return {tuple([0] * NV): a if isinstance(a, K) else K(a)}


def padd(p, q, scale=None):
    r = dict(p)
    for m, a in q.items():
        a = a if scale is None else a * scale
        if m in r:
            b = r[m] + a
            if b.is_zero():
                del r[m]
            else:
                r[m] = b
        elif not a.is_zero():
            r[m] = a
    return r


def pscale(p, a):
    return {m: c * a for m, c in p.items() if not (c * a).is_zero()}


def pmul(p, q, maxdeg=None):
    r = {}
    for m1, a in p.items():
        d1 = sum(m1)
        for m2, b in q.items():
            if maxdeg is not None and d1 + sum(m2) > maxdeg:
                continue
            m = tuple(x + y for x, y in zip(m1, m2))
            v = a * b
            if m in r:
                r[m] = r[m] + v
            else:
                r[m] = v
    return {m: c for m, c in r.items() if not c.is_zero()}


def homog(p, d):
    return {m: c for m, c in p.items() if sum(m) == d}


def point(idx):
    """Real and imaginary parts of z for point idx: 'S' or ring index k."""
    if idx == "S":
        return var(0), var(1)
    k = idx
    c, s = cos_sin(k)
    ui = 2 + (0 if k == 0 else 2 * k - 1)
    one_u = padd(const(1), var(ui))
    v = {} if k == 0 else var(ui + 1)
    re = padd(pscale(one_u, c), pscale(v, -s) if v else {})
    im = padd(pscale(one_u, s), pscale(v, c) if v else {})
    return re, im


def terms():
    """List of (coefficient, Q0, P) with log-term c*log(Q0 (1+P))."""
    pts = ["S", 0, 1, 2, 3, 4]
    out = []
    for a in range(6):
        for b in range(a + 1, 6):
            ra, ia = point(pts[a])
            rb, ib = point(pts[b])
            dr = padd(ra, rb, K(-1))
            di = padd(ia, ib, K(-1))
            Qp = padd(pmul(dr, dr), pmul(di, di))
            out.append((Qf(-1, 2), Qp, ("pair", pts[a], pts[b])))
    for a in range(6):
        r, i = point(pts[a])
        Qp = padd(padd(const(1), pmul(r, r)), pmul(i, i))
        out.append((Qf(3), Qp, ("field", pts[a])))
    res = []
    zero = tuple([0] * NV)
    for c, Qp, tag in out:
        Q0 = Qp.get(zero, K(0))
        assert Q0.sign() > 0
        P = {m: a / Q0 for m, a in Qp.items() if m != zero}
        res.append((c, Q0, P, tag))
    return res


def log1p_series(P, D):
    """Taylor polynomial of log(1+P) to total degree D (P has no constant term)."""
    out = {}
    Pn = const(1)
    for n in range(1, D + 1):
        Pn = pmul(Pn, P, maxdeg=D)
        out = padd(out, Pn, K(Qf((-1) ** (n + 1), n)))
    return out


def taylor(D):
    """Exact Taylor polynomial of F - F(0) to degree D, and the term list."""
    T = terms()
    F = {}
    for c, Q0, P, tag in T:
        F = padd(F, log1p_series(P, D), K(c))
    return F, T


def evaluate_float(w):
    """Float evaluation of the full reduced energy F(w) (for cross-checks only)."""
    import cmath
    import math
    om = cmath.exp(2j * math.pi / 5)
    x, y, u0, u1, v1, u2, v2, u3, v3, u4, v4 = w
    uv = [(u0, 0.0), (u1, v1), (u2, v2), (u3, v3), (u4, v4)]
    z = [complex(x, y)] + [om ** k * (1 + u + 1j * v) for k, (u, v) in enumerate(uv)]
    F = -21 * math.log(2)
    for i in range(6):
        F += 3 * math.log(1 + abs(z[i]) ** 2)
        for j in range(i + 1, 6):
            F -= math.log(abs(z[i] - z[j]))
    return F


def to_sphere(w):
    """Chart coordinates -> 7 unit vectors (point 0 at the north pole)."""
    import numpy as np
    import cmath
    import math
    om = cmath.exp(2j * math.pi / 5)
    x, y, u0, u1, v1, u2, v2, u3, v3, u4, v4 = w
    uv = [(u0, 0.0), (u1, v1), (u2, v2), (u3, v3), (u4, v4)]
    z = [complex(x, y)] + [om ** k * (1 + u + 1j * v) for k, (u, v) in enumerate(uv)]
    P = [np.array([0.0, 0.0, 1.0])]
    for q in z:
        d = 1 + abs(q) ** 2
        P.append(np.array([2 * q.real / d, 2 * q.imag / d, (abs(q) ** 2 - 1) / d]))
    return np.array(P)
