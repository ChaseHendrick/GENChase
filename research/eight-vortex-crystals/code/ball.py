# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Ball-arithmetic kernel (FLINT/Arb through python-flint) for the relative equilibria of N identical
point vortices.

  f(z) = -sum_{i<j} log|z_i - z_j| + (1/2) sum_k |z_k|^2,   z in C^N.

Critical points of f are exactly the relative equilibria with the normalization
sum_{j != k} 1/(z_k - z_j) = conj(z_k); at such a point sum z_k = 0 and sum |z_k|^2 = N(N-1)/2.

Gauge. Rotation z -> e^{it} z leaves f invariant. We fix it by y_p = 0 for one chosen vortex p and
drop the equation df/dy_p = 0: the rotation identity sum_k (x_k df/dy_k - y_k df/dx_k) = 0 then gives
x_p df/dy_p = 0 whenever the other 2N-1 equations hold, and the box certifies x_p != 0.
Reduced unknowns u (length 2N-1): x_0..x_{N-1} followed by y_k for k != p.

Every function here takes Arb balls and returns balls that contain the exact value for every point
of the input balls (natural interval extensions of the exact formulas, outward rounded by Arb).
"""
from flint import arb, arb_mat, acb, ctx

ctx.prec = 256


def exact(v):
    """Exact Arb number (radius 0) nearest to a float / string / arb midpoint."""
    return arb(v).mid()


def full_xy(u, N, p):
    x = list(u[:N])
    y = []
    it = iter(u[N:])
    for k in range(N):
        y.append(arb(0) if k == p else next(it))
    return x, y


def grad_full(x, y):
    N = len(x)
    gx = [arb(v) for v in x]
    gy = [arb(v) for v in y]
    for i in range(N):
        for j in range(i + 1, N):
            dx = x[i] - x[j]; dy = y[i] - y[j]
            r2 = dx * dx + dy * dy
            ax = dx / r2; ay = dy / r2
            gx[i] -= ax; gy[i] -= ay
            gx[j] += ax; gy[j] += ay
    return gx, gy


def hess_full(x, y):
    """2N x 2N Hessian, ordering (x_0..x_{N-1}, y_0..y_{N-1})."""
    N = len(x)
    H = [[arb(0)] * (2 * N) for _ in range(2 * N)]
    for k in range(2 * N):
        H[k][k] = arb(1)
    for i in range(N):
        for j in range(i + 1, N):
            dx = x[i] - x[j]; dy = y[i] - y[j]
            r2 = dx * dx + dy * dy
            r4 = r2 * r2
            bxx = (dx * dx - dy * dy) / r4
            bxy = 2 * dx * dy / r4
            byy = -bxx
            for (a, b, s) in ((i, i, 1), (j, j, 1), (i, j, -1), (j, i, -1)):
                H[a][b] = H[a][b] + s * bxx
                H[a][N + b] = H[a][N + b] + s * bxy
                H[N + a][b] = H[N + a][b] + s * bxy
                H[N + a][N + b] = H[N + a][N + b] + s * byy
    return H


def keep_index(N, p):
    return [k for k in range(2 * N) if k != N + p]


def G(u, N, p):
    """Reduced system: grad f without the component df/dy_p (length 2N-1)."""
    x, y = full_xy(u, N, p)
    gx, gy = grad_full(x, y)
    g = gx + gy
    return [g[k] for k in keep_index(N, p)]


def DG(u, N, p):
    """Jacobian of G in the unknowns u = the Hessian of f with row and column y_p removed."""
    x, y = full_xy(u, N, p)
    H = hess_full(x, y)
    idx = keep_index(N, p)
    n = len(idx)
    M = arb_mat(n, n)
    for a in range(n):
        for b in range(n):
            M[a, b] = H[idx[a]][idx[b]]
    return M


def fval(x, y):
    N = len(x)
    s = arb(0)
    for i in range(N):
        s += (x[i] * x[i] + y[i] * y[i]) / 2
        for j in range(i + 1, N):
            dx = x[i] - x[j]; dy = y[i] - y[j]
            s -= (dx * dx + dy * dy).log() / 2
    return s


def newton_refine(u, N, p, iters=12):
    """Non-rigorous: Newton at the working precision on midpoints; only produces the candidate."""
    u = [exact(v) for v in u]
    for _ in range(iters):
        g = G(u, N, p)
        J = DG(u, N, p)
        gm = arb_mat([[v.mid()] for v in g])
        step = J.mid().solve(gm)
        u = [(u[k] - step[k, 0]).mid() for k in range(len(u))]
    return u


def krawczyk(u, rad, N, p):
    """Krawczyk test on the box X = u + [-rad, rad]^n. Returns (ok, X, K).
    ok means K(X) is contained in the interior of X, hence G has exactly one zero in X and every
    matrix in DG(X) is nonsingular."""
    n = len(u)
    r = arb(0, rad)
    X = [u[k] + r for k in range(n)]
    gt = arb_mat([[v] for v in G(u, N, p)])
    J = DG(X, N, p)
    Y = J.mid().inv().mid()          # approximate inverse: any fixed matrix is sound
    I = arb_mat(n, n)
    for k in range(n):
        I[k, k] = arb(1)
    dX = arb_mat([[X[k] - u[k]] for k in range(n)])
    Kv = arb_mat([[v] for v in u]) - Y * gt + (I - Y * J) * dX
    K = [Kv[k, 0] for k in range(n)]
    ok = all(strictly_inside(K[k], X[k]) for k in range(n))
    return ok, X, K


def strictly_inside(K, X):
    """K is contained in the interior of X (the Krawczyk condition; mere containment is not enough)."""
    return bool(X.contains_interior(K))


def inertia_gershgorin(M, Q):
    """Rigorous inertia of every symmetric matrix in the ball matrix M, using a fixed matrix Q
    (float approximate eigenvectors, turned into exact numbers). Returns (neg, pos) or None.
    A = Q^T M Q is congruent to M whenever Q is nonsingular. If every Gershgorin disc of A excludes 0
    then A is nonsingular for every member (so Q is nonsingular too) and the discs to the left of 0
    form a union disjoint from the discs to the right, so by Gershgorin's theorem their number is the
    number of negative eigenvalues. Sylvester's law of inertia carries the count back to M."""
    n = M.nrows()
    Qa = arb_mat(n, n)
    for i in range(n):
        for j in range(n):
            Qa[i, j] = exact(float(Q[i][j]))
    A = Qa.transpose() * M * Qa
    neg = pos = 0
    for i in range(n):
        R = arb(0)
        for j in range(n):
            if j != i:
                R += abs(A[i, j])
        c = A[i, i]
        if (c + R) < 0:
            neg += 1
        elif (c - R) > 0:
            pos += 1
        else:
            return None
    return neg, pos


def moments(x, y, pmax=4):
    z = [acb(x[k], y[k]) for k in range(len(x))]
    c = sum(z, acb(0)) / len(z)
    w = [v - c for v in z]
    return [sum((v ** q for v in w), acb(0)) for q in range(pmax + 1)]


def chirality(x, y):
    """Q = Im( m_3^2 * conj(m_2)^3 ), m_q = sum (z_k - c)^q. Invariant under translations, rotations
    and permutations, odd under reflections. Q != 0 rules out every reflection symmetry, and since it
    forces m_2 != 0 and m_3 != 0 it also rules out every rotation symmetry of order 2 or more
    (a C_n-symmetric set centred at c has m_q = 0 unless n divides q)."""
    m = moments(x, y, 3)
    return (m[3] ** 2 * m[2].conjugate() ** 3).imag
