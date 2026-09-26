"""The planar four-vortex problem, reduced by translations and rotations to 2 degrees of freedom.

Conventions.  Circulations G = (G1, G2, G3, G4), total S4 = G1+G2+G3+G4 != 0, partial sums
S2 = G1+G2 != 0 and S3 = S2+G3 != 0.  The symplectic form is sum_j Gj dx_j ^ dy_j and the
Hamiltonian (time rescaled by 2 pi, which changes no stability statement) is

    Ht = -(1/2) sum_{i<j} Gi Gj log |z_i - z_j|^2 .

Jacobi coordinates (complex, real coefficients, so the map is C-linear):
    u1 = z2 - z1,  u2 = z3 - c12,  u3 = z4 - c123,  C = centre of vorticity,
with reduced circulations mu1 = G1 G2 / S2, mu2 = S2 G3 / S3, mu3 = S3 G4 / S4, so that
sum_j Gj |z_j|^2 = S4 |C|^2 + sum_k mu_k |u_k|^2 and hence sum Gj dx_j^dy_j =
S4 dC + sum_k mu_k dx(u_k)^dy(u_k) (checked numerically in `check_jacobi`).  Ht depends on
u only.  Differences of positions:
    z1 = -(G2/S2) u1, z2 = (G1/S2) u1, z3 = u2, z4 = (G3/S3) u2 + u3   (up to C).

Rotation reduction: write u1 = r e^{i phi}, v_k = u_k e^{-i phi} (k = 2, 3).  Then
sum_k mu_k (i/2) du_k ^ d(conj u_k) = dJ ^ dphi + sum_{k=2,3} mu_k dx(v_k) ^ dy(v_k), with
J = (1/2) sum_k mu_k |u_k|^2 (the angular impulse in Jacobi form).  Ht is independent of phi,
so on a level J = J0 the reduced system has canonical variables v2, v3 (form mu_k dx^dy) and
Hamiltonian Hred(v) = Ht(u1 = r(v), v2, v3), r(v)^2 = (2 J0 - mu2|v2|^2 - mu3|v3|^2)/mu1.
Its equilibria are exactly the relative equilibria (modulo rotation).

Canonical coordinates for v_k: q = sqrt|mu_k| x, p = sgn(mu_k) sqrt|mu_k| y, so dq^dp = mu_k dx^dy.
We fix the scale by r = 1 at the base point v*, i.e. 2 J0 = mu1 + mu2|v2*|^2 + mu3|v3*|^2.
"""
from tps import TPS, Space, Ring


def jacobi(G, R):
    G1, G2, G3, G4 = G
    S2 = G1 + G2
    S3 = S2 + G3
    S4 = S3 + G4
    mu = (G1 * G2 / S2, S2 * G3 / S3, S3 * G4 / S4)
    # position of each vortex as linear combination of (u1, u2, u3)
    coef = [(-G2 / S2, R.zero, R.zero),
            (G1 / S2, R.zero, R.zero),
            (R.zero, R.one, R.zero),
            (R.zero, G3 / S3, R.one)]
    return mu, coef


def sgn(x):
    if hasattr(x, 'mid'):  # arb
        if x > 0:
            return 1
        if x < 0:
            return -1
        raise ValueError('sign of %s not determined' % x)
    return 1 if x > 0 else -1


def Ht_of_u(G, R, coef, U):
    """U = [(X1, Y1), (X2, Y2), (X3, Y3)] TPS (or numbers).  Returns Ht."""
    pos = []
    for cj in coef:
        X = sum((U[k][0] * cj[k] for k in range(3)), R.zero * 0)
        Y = sum((U[k][1] * cj[k] for k in range(3)), R.zero * 0)
        pos.append((X, Y))
    H = None
    half = R.one / R.const(2)
    for i in range(4):
        for j in range(i + 1, 4):
            dx = pos[i][0] - pos[j][0]
            dy = pos[i][1] - pos[j][1]
            term = (dx * dx + dy * dy).log() * (-(G[i] * G[j]) * half)
            H = term if H is None else H + term
    return H


def Hred_tps(G, vstar, sp, R, L=None):
    """Taylor expansion of Hred about v* in canonical displacements (q2, p2, q3, p3).

    vstar = (x2, y2, x3, y3): Jacobi coordinates of u2, u3 at the base point, with u1 = 1.
    Returns (TPS, mu).
    """
    mu, coef = jacobi(G, R)
    s = [sgn(m) for m in mu]
    rt = [R.sqrt(abs(m)) if R.kind != 'float' else abs(m) ** 0.5 for m in mu]
    x2, y2, x3, y3 = vstar
    Xs = [TPS.var(sp, R, k, R.zero) for k in range(4)]
    if L is None:
        q2, p2, q3, p3 = Xs
    else:
        # canonical displacements (q2, p2, q3, p3) = L X; with L exactly symplectic the
        # expansion is in canonical variables X (used to precondition, see certify2.py)
        q2, p2, q3, p3 = [sum((Xs[j].scale(L[i][j]) for j in range(4)), TPS(sp, R)) for i in range(4)]
    dx2 = q2.scale(R.one / rt[1])
    dy2 = p2.scale(R.const(s[1]) / rt[1])
    dx3 = q3.scale(R.one / rt[2])
    dy3 = p3.scale(R.const(s[2]) / rt[2])
    X2 = dx2 + x2
    Y2 = dy2 + y2
    X3 = dx3 + x3
    Y3 = dy3 + y3
    two = R.const(2)
    d2 = (dx2 * (two * x2) + dy2 * (two * y2) + dx2 * dx2 + dy2 * dy2).scale(mu[1])
    d3 = (dx3 * (two * x3) + dy3 * (two * y3) + dx3 * dx3 + dy3 * dy3).scale(mu[2])
    r2 = (d2 + d3).scale(-R.one / mu[0]) + R.one
    r = r2.sqrt()
    zero = TPS(sp, R)
    H = Ht_of_u(G, R, coef, [(r, zero), (X2, Y2), (X3, Y3)])
    return H, mu


def gauge_tps(G, v, sp5, R):
    """Degree-2 expansion of Ht(u1 = 1 + a, v2 + ..., v3 + ...) in the 5 real variables
    (a, x2, y2, x3, y3) (u1 kept real: rotation gauge).  Used for the equilibrium equations
    F(v) = grad_v Ht(1, v) - (dHt/da / mu1) * (mu2 x2, mu2 y2, mu3 x3, mu3 y3) = 0
    and their Jacobian."""
    mu, coef = jacobi(G, R)
    a = TPS.var(sp5, R, 0, R.one)
    X2 = TPS.var(sp5, R, 1, v[0])
    Y2 = TPS.var(sp5, R, 2, v[1])
    X3 = TPS.var(sp5, R, 3, v[2])
    Y3 = TPS.var(sp5, R, 4, v[3])
    zero = TPS(sp5, R)
    H = Ht_of_u(G, R, coef, [(a, zero), (X2, Y2), (X3, Y3)])
    return H, mu


def F_and_DF(G, v, R, sp5=None):
    sp5 = sp5 or Space(5, 2)
    H, mu = gauge_tps(G, v, sp5, R)
    idx = sp5.index
    def e(*ks):
        t = [0] * 5
        for k in ks:
            t[k] += 1
        return idx[tuple(t)]
    grad = [H.c[e(k)] for k in range(5)]
    hess = [[H.c[e(i, j)] * (2 if i == j else 1) for j in range(5)] for i in range(5)]
    w = [mu[1], mu[1], mu[2], mu[2]]
    h1 = grad[0]
    F = [grad[1 + k] - h1 / mu[0] * w[k] * v[k] for k in range(4)]
    DF = [[hess[1 + k][1 + l] - (hess[0][1 + l] / mu[0]) * w[k] * v[k]
           - (h1 / mu[0] * w[k] if k == l else R.zero) for l in range(4)] for k in range(4)]
    return F, DF, mu


def positions(G, v, R=None):
    """Complex positions (floats) of the four vortices, centre of vorticity at 0."""
    R = R or Ring('float')
    mu, coef = jacobi(G, R)
    u = [complex(1, 0), complex(v[0], v[1]), complex(v[2], v[3])]
    z = [sum(cj[k] * u[k] for k in range(3)) for cj in coef]
    S = sum(G)
    c = sum(g * zz for g, zz in zip(G, z)) / S
    return [zz - c for zz in z]


def check_jacobi(G, trials=5):
    import random
    R = Ring('float')
    mu, coef = jacobi(G, R)
    S4 = sum(G)
    worst = 0.0
    for _ in range(trials):
        u = [complex(random.gauss(0, 1), random.gauss(0, 1)) for _ in range(3)]
        w = [complex(random.gauss(0, 1), random.gauss(0, 1)) for _ in range(3)]
        C, D = complex(random.gauss(0, 1), random.gauss(0, 1)), complex(random.gauss(0, 1), random.gauss(0, 1))
        z = [C + sum(cj[k] * u[k] for k in range(3)) for cj in coef]
        # shift so that the centre of vorticity is C
        c = sum(g * zz for g, zz in zip(G, z)) / S4
        z = [zz - c + C for zz in z]
        y = [sum(cj[k] * w[k] for k in range(3)) for cj in coef]
        cy = sum(g * zz for g, zz in zip(G, y)) / S4
        y = [zz - cy + D for zz in y]
        lhs = sum(g * (zz.conjugate() * yy) for g, zz, yy in zip(G, z, y))
        rhs = S4 * C.conjugate() * D + sum(m * (uu.conjugate() * ww) for m, uu, ww in zip(mu, u, w))
        worst = max(worst, abs(lhs - rhs))
    return worst
