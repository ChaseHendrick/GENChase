#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
"""Validated parametrisation of the one-dimensional unstable manifold of the rest state x* (Faye's model).

5D embedding x = (u, v, w, q, Y), y = x - x*, k = kappa = 1/c, Z0 = Y0 (1 - Y0), s = lam Z0 = S'(u0):
    F(x* + y) = A y + N(y),
    A = [[-k, k, 0, 0, 0], [0, 0, 1, 0, 0], [0, b^2, 0, -b^2 Y0, -b^2 q0],
         [0, 0, 0, -eps k (1 + beta Y0), -eps k beta q0], [-lam k Z0, lam k Z0, 0, 0, 0]],
    N_w = -b^2 y_q y_Y,   N_q = -eps k beta y_q y_Y,   N_Y = lam k [(1 - 2 Y0) y_Y m - y_Y^2 m],  m = y_v - y_u,
    the other components 0.  (Exact: q Y = q0 Y0 + q0 y_Y + Y0 y_q + y_q y_Y, Y (1 - Y) = Z0 + (1 - 2 Y0) y_Y - y_Y^2.)
Parametrisation P(t) = sum_n a_n t^n with  mu t P'(t) = F(P(t)),  a_0 = x*,  a_1 = sigma v (v the unstable
eigenvector, u-component 1), mu the unstable eigenvalue.  For n >= 2:  (n mu - A) a_n = N_n(a_1..a_{n-1}).

Coefficients a_2..a_N are computed in ball arithmetic (enclosing the exact coefficients for every kappa in its
ball, with mu(kappa) in its ball).  The tail h = (a_n)_{n>N} satisfies h_n = (n mu - A)^{-1} N_n(abar + h),
and N_n(abar + h) depends on h_m, m < n, only.  In the l^1 norm (weight 1), with
    K >= sup_{n>N} max_{ij} |((n mu - A)^{-1})_{ij}|,   K = 1/((N+1) mu_lo - ||A||_inf)   (Neumann series),
    G0 = sum_{n>N} sum_j |N_{n,j}(abar)|    (finite: abar is a polynomial),
    Z(r) >= sum_j || N_j(abar + h) - N_j(abar) ||   for all tails with ||h_i|| <= r_i,
the ball {||h_i|| <= K rho} is mapped into itself when G0 + Z(K rho) <= rho; by induction on truncations the
exact tail lies in it.  Then for |t| <= 1:  |P_i(t) - sum_{n<=N} a_{n,i} t^n| <= K rho |t|^(N+1).
"""
from flint import arb, arb_mat, arb_poly, ctx, fmpq
import fcore as fc


def abs_up(x):
    return arb(x.abs_upper())


def charpoly(kappa, rest=None):
    """Coefficients (constant first) of p(mu) = det(mu - J4) for the 4D wave ODE at rest (derived in the report):
       p = mu^4 + k(1 + eps A) mu^3 + (eps k^2 A - b^2) mu^2 + b^2 k (q0 s - 1 - eps A) mu + b^2 eps k^2 (q0 s - A),
       A = 1 + beta Y0 = 1/q0,  s = S'(u0)."""
    lam, kap, beta, b, eps = fc.params()
    x = fc.rest_state() if rest is None else rest
    u0, q0, Y0 = x[0], x[3], x[4]
    s = lam * Y0 * (1 - Y0)
    A = 1 + beta * Y0
    k = kappa
    b2 = b * b
    return [b2 * eps * k * k * (q0 * s - A), b2 * k * (q0 * s - 1 - eps * A), eps * k * k * A - b2, k * (1 + eps * A), arb(1)]


def peval(co, l):
    r = co[-1]
    for a in reversed(co[:-1]):
        r = r * l + a
    return r


def sign(x):
    if x > 0:
        return 1
    if x < 0:
        return -1
    return 0


def refine(co, lo, hi, nit=None):
    """Bisection with certified signs; returns a ball containing a root of p for every member of the coefficient
    balls (raises unless the end signs are certified and opposite)."""
    nit = ctx.prec if nit is None else nit
    slo = sign(peval(co, lo))
    for _ in range(nit):
        m = arb(((lo + hi) / 2).mid())
        sm = sign(peval(co, m))
        if sm == 0:
            break
        if sm == slo:
            lo = m
        else:
            hi = m
    s_lo, s_hi = sign(peval(co, lo)), sign(peval(co, hi))
    if not (s_lo != 0 and s_hi != 0 and s_lo == -s_hi):
        raise ArithmeticError('refine: end signs not certified (%d, %d)' % (s_lo, s_hi))
    return lo.union(hi)


def unstable_eig(kappa, rest=None):
    co = charpoly(kappa, rest)
    return refine(co, arb(1), arb(10))


def jac5(kappa, rest=None):
    lam, kap, beta, b, eps = fc.params()
    x = fc.rest_state() if rest is None else rest
    q0, Y0 = x[3], x[4]
    k = kappa
    b2 = b * b
    Z0 = Y0 * (1 - Y0)
    z = arb(0)
    return [[-k, k, z, z, z], [z, z, arb(1), z, z], [z, b2, z, -b2 * Y0, -b2 * q0],
            [z, z, z, -eps * k * (1 + beta * Y0), -eps * k * beta * q0], [-lam * k * Z0, lam * k * Z0, z, z, z]]


def eigvec(mu, kappa, rest=None):
    """Unstable eigenvector with u-component 1:
       v = (1, 1 + mu/k, mu (1 + mu/k), -eps k beta q0 s/(mu + eps k (1 + beta Y0)), s)."""
    lam, kap, beta, b, eps = fc.params()
    x = fc.rest_state() if rest is None else rest
    q0, Y0 = x[3], x[4]
    s = lam * Y0 * (1 - Y0)
    k = kappa
    vv = 1 + mu / k
    return [arb(1), vv, mu * vv, -eps * k * beta * q0 * s / (mu + eps * k * (1 + beta * Y0)), s]


def _coeffs(kappa, mu, a1, N, rest):
    lam, kap, beta, b, eps = fc.params()
    x0 = rest
    q0, Y0 = x0[3], x0[4]
    A = jac5(kappa, rest)
    b2 = b * b
    a = [x0, a1]
    yq = [arb(0), a1[3]]; yY = [arb(0), a1[4]]; m = [arb(0), a1[1] - a1[0]]
    YY = [arb(0), arb(0)]
    for n in range(2, N + 1):
        qy = arb(0); yy = arb(0)
        for j in range(1, n):
            qy += yq[j] * yY[n - j]
            yy += yY[j] * yY[n - j]
        YY.append(yy)
        r = arb(0)
        for j in range(1, n):
            r += ((1 - 2 * Y0) * yY[j] - YY[j]) * m[n - j]
        rhs = [arb(0), arb(0), -b2 * qy, -eps * kappa * beta * qy, lam * kappa * r]
        M = arb_mat([[(n * mu if i == j else 0) - A[i][j] for j in range(5)] for i in range(5)])
        sol = M.solve(arb_mat([[v] for v in rhs]))
        an = [sol[i, 0] for i in range(5)]
        a.append(an)
        yq.append(an[3]); yY.append(an[4]); m.append(an[1] - an[0])
    return a


def coefficients_numeric(kappa, N):
    rest = fc.rest_state()
    mu = unstable_eig(kappa, rest)
    v = eigvec(mu, kappa, rest)
    return mu, _coeffs(kappa, mu, v, N, rest)


def coefficients(kappa, mu, sigma, N):
    rest = fc.rest_state()
    v = eigvec(mu, kappa, rest)
    return _coeffs(kappa, mu, [sigma * vi for vi in v], N, rest), rest


def eig_residual(kappa, mu):
    rest = fc.rest_state()
    v = eigvec(mu, kappa, rest)
    A = jac5(kappa, rest)
    return [sum((A[i][j] * v[j] for j in range(5)), arb(0)) - mu * v[i] for i in range(5)]


def validate(kappa, mu, sigma, N):
    lam, kap, beta, b, eps = fc.params()
    a, rest = coefficients(kappa, mu, sigma, N)
    q0, Y0 = rest[3], rest[4]
    yb = [[arb(0)] + [a[n][i] for n in range(1, N + 1)] for i in range(5)]
    pq, pY = arb_poly(yb[3]), arb_poly(yb[4])
    pm = arb_poly([yb[1][n] - yb[0][n] for n in range(N + 1)])
    b2 = b * b
    qY = pq * pY
    Nw = qY * (-b2)
    Nq = qY * (-eps * kappa * beta)
    NY = (pY * pm * (1 - 2 * Y0) - pY * pY * pm) * (lam * kappa)
    # consistency: for 2 <= n <= N the recursion must satisfy (n mu - A) a_n = N_n(abar), with N_n taken from the
    # polynomial products below; every residual ball must contain 0
    A_ = jac5(kappa, rest)
    Ncoef = [[arb(0)] * (N + 1), [arb(0)] * (N + 1)] + [list(P.coeffs()) + [arb(0)] * (N + 1) for P in (Nw, Nq, NY)]
    Ncoef = [Ncoef[0], Ncoef[1], Ncoef[2], Ncoef[3], Ncoef[4]]
    for n in range(2, N + 1):
        for i in range(5):
            res_ = n * mu * a[n][i] - sum((A_[i][j] * a[n][j] for j in range(5)), arb(0)) - Ncoef[i][n]
            if not res_.contains(0):
                return False, a, None, {'reason': 'recursion inconsistent at n = %d, component %d' % (n, i)}
    G0 = arb(0)
    for P in (Nw, Nq, NY):
        co = P.coeffs()
        for n in range(N + 1, len(co)):
            G0 += abs_up(co[n])
    norm = lambda seq: sum((abs_up(x) for x in seq), arb(0))
    U_, V_, Q_, Yn = norm(yb[0]), norm(yb[1]), norm(yb[3]), norm(yb[4])
    Mn = norm([yb[1][n] - yb[0][n] for n in range(N + 1)])
    A = jac5(kappa, rest)
    Ainf = None
    for i in range(5):
        row = sum((abs_up(A[i][j]) for j in range(5)), arb(0))
        Ainf = row if Ainf is None else Ainf.max(row)
    Ainf = arb(Ainf.upper())
    mu0 = (N + 1) * arb(mu.lower())
    if not (mu0 > 2 * Ainf):
        return False, a, None, {'reason': 'N too small for the Neumann bound'}
    K = 1 / (mu0 - Ainf)
    K = arb(K.upper())
    c1 = abs_up(b2) + abs_up(eps * kappa * beta)
    c2 = abs_up(lam * kappa) * abs_up(1 - 2 * Y0)
    c3 = abs_up(lam * kappa)

    def Z(rh):
        rq = rY = rh
        rm = 2 * rh
        return (c1 * ((Q_ + rq) * (Yn + rY) - Q_ * Yn) + c2 * ((Yn + rY) * (Mn + rm) - Yn * Mn)
                + c3 * ((Yn + rY) ** 2 * (Mn + rm) - Yn * Yn * Mn))

    rho = G0 * 2 + arb(2) ** (-ctx.prec + 10)
    ok = False
    for _ in range(80):
        lhs = G0 + Z(K * rho)
        if lhs < rho:
            ok = True
            break
        rho = rho * 2
        if rho > 1:
            break
    r = [K * rho] * 5
    info = {'N': N, 'sigma': sigma.str(10), 'G0': G0.str(5), 'rho': rho.str(5), 'K': K.str(5), 'tail_r': (K * rho).str(5),
            'norms_u_v_q_Y_m': [z.str(5) for z in (U_, V_, Q_, Yn, Mn)], 'ok': ok,
            'max|a_N|': max(abs(float(a[N][i].mid())) for i in range(5))}
    return ok, a, r, info


def evaluate(a, r, t):
    N = len(a) - 1
    tt = abs_up(t)
    out = []
    for i in range(5):
        val = fc.horner([an[i] for an in a], t)
        err = r[i] * tt ** (N + 1)
        out.append(val + arb(0, err.upper()))
    return out


def choose_sigma(kappa, mu, N=40):
    a, _ = coefficients(arb(kappa.mid()), arb(mu.mid()), arb(1), N)
    nrm = [max(abs(float(ai.mid())) for ai in an) for an in a]
    R = max((nrm[n] / nrm[n - 5]) ** 0.2 for n in range(N - 4, N + 1))
    return arb(fmpq(1, int(2 * R) + 1))
