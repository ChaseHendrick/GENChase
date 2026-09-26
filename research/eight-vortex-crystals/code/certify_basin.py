# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""A dimension-free local certificate for the centred heptagon x* (one vortex at 0, seven at 2 w^k,
w = exp(2 pi i/7)), the critical point of f(z) = -sum log|z_i - z_j| + |z|^2/2 with f = 14 - 28 log 2 - (7/2) log 7.

Lemma. Let S = {v in R^16 : <v, J x*> = 0} (orthogonal to the rotation orbit). If for all v in S with
|v| <= rho the matrix  H* - L_gamma  restricted to S is positive definite, where
    L_gamma = sum_{i<j} gamma_ij P_ij^T P_ij,   gamma_ij = s / (D_ij - s)^3,  s = sqrt(2) rho,
D_ij = |x*_i - x*_j| and P_ij v = v_i - v_j in R^2, then
    Psi(v) = <grad f(x* + v), v>  >  0   for all v in S, 0 < |v| <= rho.
Consequently f is strictly increasing along every ray x* + t v (0 < t|v| <= rho, v in S), so x* is the
unique critical point and the strict unique minimizer of f in {x* + v : v in S, |v| <= rho}; and any
critical point of f within Euclidean distance rho of the orbit of x* under rotations and relabellings
is on that orbit (the rotation minimizing the distance puts the difference in S).

Proof of the inequality used: Psi(v) = |v|^2 + sum_{i<j} g_ij(u_ij), u_ij = v_i - v_j, with
g(u) = u.(grad psi(d+u) - grad psi(d)), psi(d) = -log|d|. Since psi = -Re log(zeta), ||D^3 psi(d)|| = 2/|d|^3,
so |g(u) - u^T D^2psi(d) u| <= |u|^3/(|d| - |u|)^3 <= gamma |u|^2 whenever |u| <= s < |d|; and
|u_ij| <= |v_i| + |v_j| <= sqrt(2)|v|. Summing, Psi(v) >= v^T (H* - L_gamma) v.

Positive definiteness on S is certified with a basis of S made of exact vectors and the rigorous inertia
routine of ball.py. The script bisects for the largest rho that passes.
"""
import numpy as np
from flint import arb, arb_mat, ctx
import ball

N = 8
ctx.prec = 256


def heptagon():
    x = [arb(0)]; y = [arb(0)]
    for k in range(7):
        t = 2 * arb.pi() * k / 7
        x.append(2 * t.cos()); y.append(2 * t.sin())
    return x, y


def certify_rho(rho, verbose=False):
    x, y = heptagon()
    H = ball.hess_full(x, y)                       # 16 x 16, ordering (x_0..x_7, y_0..y_7)
    s = arb(2).sqrt() * arb(rho)
    n = 2 * N
    M = [[H[a][b] for b in range(n)] for a in range(n)]
    for i in range(N):
        for j in range(i + 1, N):
            D = ((x[i] - x[j]) ** 2 + (y[i] - y[j]) ** 2).sqrt()
            if not (D - s > 0):
                return False
            g = s / (D - s) ** 3
            for (a, b, sg) in ((i, i, 1), (j, j, 1), (i, j, -1), (j, i, -1)):
                M[a][b] -= sg * g                   # x block
                M[N + a][N + b] -= sg * g           # y block
    # exact basis of S: J x* = (-y, x); pivot on coordinate y_1 (component x_1 = 2 of J x*)
    Jx = [-v for v in y] + list(x)
    k0 = N + 1
    cols = []
    for k in range(n):
        if k == k0:
            continue
        c = [arb(0)] * n
        c[k] = arb(1)
        c[k0] = -Jx[k] / Jx[k0]
        cols.append(c)
    Q = arb_mat(n, n - 1)
    for a in range(n):
        for b in range(n - 1):
            Q[a, b] = cols[b][a]
    Mm = arb_mat(n, n)
    for a in range(n):
        for b in range(n):
            Mm[a, b] = M[a][b]
    A = Q.transpose() * Mm * Q
    Am = np.array([[float(A[i, j].mid()) for j in range(n - 1)] for i in range(n - 1)])
    w, V = np.linalg.eigh((Am + Am.T) / 2)
    inert = ball.inertia_gershgorin(A, V)
    if verbose:
        print(f'rho={rho}: min eigenvalue (float) {w[0]:.5f}, certified inertia {inert}')
    return inert is not None and inert[0] == 0 and inert[1] == n - 1


if __name__ == '__main__':
    # sanity: at rho -> 0 the restricted Hessian is positive definite (x* is a nondegenerate minimum)
    assert certify_rho(1e-12, verbose=True)
    lo, hi = 1e-12, 1.0
    for _ in range(40):
        mid = (lo + hi) / 2
        if certify_rho(mid):
            lo = mid
        else:
            hi = mid
    import math
    rho = math.floor(lo * 1e4) / 1e4
    assert certify_rho(rho, verbose=True)
    print(f'certified basin radius rho = {rho} (bisection bound {lo:.6f}, fails at {hi:.6f})')
    # negative control: slightly above the bisection limit the certificate must fail
    assert not certify_rho(hi * 1.01)
    print('negative control passes: certificate fails at', round(hi * 1.01, 6))
