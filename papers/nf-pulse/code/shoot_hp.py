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
"""High-precision (NOT rigorous) shooting for the fast pulse speed c*.

Leaves the rest state along the one-dimensional unstable manifold (parametrised to high order),
integrates the 5D embedded wave ODE with an adaptive Taylor method in arb midpoint arithmetic, and
classifies the orbit by the forward-invariant escape regions
    E_up = {Q > 1, P > 0}   and   E_dn = {Q < 0, P < 0}
(forward invariant because 0 < S < 1; an orbit that enters either is unbounded, hence not a pulse).
Bisection in c then brackets the speed at which the classification switches.
"""
import sys, time, json
from flint import arb, arb_mat, ctx
import nfcore as nf


def mid(x):
    return arb(x.mid())


def eig_unstable(kappa, s):
    """Unstable eigenvalue and eigenvector (U-component 1) of the linearisation at rest, gamma = 0.
    char poly: (l^2 + kappa l + eps kappa^2)(l^2 - 1) + s kappa l.  Newton from l = 1 - small."""
    eps = nf.EPS
    p = lambda l: (l * l + kappa * l + eps * kappa * kappa) * (l * l - 1) + s * kappa * l
    dp = lambda l: (2 * l + kappa) * (l * l - 1) + (l * l + kappa * l + eps * kappa * kappa) * 2 * l + s * kappa
    l = arb(0.97)
    for _ in range(200):
        l = mid(l - p(l) / dp(l))
    v = [arb(1), eps * kappa / l, -s / (l * l - 1), -s * l / (l * l - 1), s]
    return l, v


def jac5(x0, kappa):
    eps, gam, beta = nf.EPS, nf.GAMMA, nf.BETA
    U0, V0, Q0, P0, Y0 = x0
    s = beta * Y0 * (1 - Y0)
    k = kappa
    return arb_mat([[-k, -k, k, 0, 0],
                    [eps * k, -eps * gam * k, 0, 0, 0],
                    [0, 0, 0, 1, 0],
                    [0, 0, 1, 0, -1],
                    [-s * k, -s * k, s * k, 0, 0]])


def manifold_coeffs(kappa, N, scale):
    """Coefficients a_0..a_N (5-vectors) of P(theta) with P'(theta) lam theta = F(P(theta)),
    a_1 = scale * eigenvector.  Only the Y-equation is nonlinear:
      F_Y = beta kappa [ s0 w + (1 - 2 Y0) yY w - yY^2 w ],  w = yQ - yU - yV,  y = P - x*."""
    x0 = nf.rest_state()
    beta = nf.BETA
    Y0 = x0[4]
    s = beta * Y0 * (1 - Y0)
    lam, v = eig_unstable(kappa, s)
    A = jac5(x0, kappa)
    a = [x0, [scale * vi for vi in v]]
    w = [arb(0), a[1][2] - a[1][0] - a[1][1]]
    yY = [arb(0), a[1][4]]
    yY2 = [arb(0), arb(0)]          # coefficients of yY*yY
    for n in range(2, N + 1):
        # [yY*yY]_n uses indices 1..n-1 only
        q = arb(0)
        for j in range(1, n):
            q += yY[j] * yY[n - j]
        yY2.append(q)
        # [(1-2Y0) yY w - yY^2 w]_n
        r = arb(0)
        for j in range(1, n):
            r += ((1 - 2 * Y0) * yY[j] - yY2[j]) * w[n - j]
        r = beta * kappa * r
        M = arb_mat(5, 5)
        for i in range(5):
            for j in range(5):
                M[i, j] = (n * lam if i == j else 0) - A[i, j]
        rhs = arb_mat([[0], [0], [0], [0], [r]])
        sol = M.solve(rhs)
        an = [sol[i, 0] for i in range(5)]
        a.append(an)
        w.append(an[2] - an[0] - an[1])
        yY.append(an[4])
    return lam, a


def eval_manifold(a, th):
    return [nf.horner([an[i] for an in a], th) for i in range(5)]


def integrate(x, kappa, T, tol_exp=-60, order=40, record=None, stop=None, hmax=0.25):
    """Adaptive Taylor integration (midpoint arithmetic, NOT rigorous)."""
    t = arb(0)
    tol = arb(2) ** tol_exp
    while t < T:
        cs = nf.taylor(x, kappa, order)
        # step from the size of the last two coefficients
        m = max(abs(float(cs[i][order].mid())) for i in range(5)) + max(abs(float(cs[i][order - 1].mid())) for i in range(5))
        m = max(m, 1e-300)
        h = min(hmax, (float(tol.mid()) / m) ** (1.0 / order) * 0.5)
        h = arb(h)
        if t + h > T:
            h = T - t
        x = [mid(nf.horner(cs[i], h)) for i in range(5)]
        t = t + h
        if record is not None:
            record.append((float(t.mid()), [float(xi.mid()) for xi in x]))
        if stop is not None:
            r = stop(x)
            if r:
                return r, t, x
    return 0, t, x


def classify(x):
    U, V, Q, P, Y = x
    if Q > 1 and P > 0:
        return +1
    if Q < 0 and P < 0:
        return -1
    return 0


def shoot(c, N=60, theta0=None, T=400, tol_exp=None, order=40, record=None):
    kappa = 1 / c
    prec = ctx.prec
    if tol_exp is None:
        tol_exp = -prec + 20
    lam, a = manifold_coeffs(kappa, N, arb(1))
    if theta0 is None:
        # growth rate of the coefficients -> radius of convergence ~ 1/R; truncation ~ (theta0 R)^(N+1)
        import math
        nrm = [max(abs(float(ai.mid())) for ai in an) for an in a]
        R = max((nrm[n] / nrm[n - 5]) ** 0.2 for n in range(N - 4, N + 1))
        theta0 = arb(2.0 ** (-(prec - 10) / (N + 1)) / R / 2)
    x = eval_manifold(a, theta0)
    return integrate(x, kappa, arb(T), tol_exp=tol_exp, order=order, record=record, stop=classify)


def bisect(c_lo, c_hi, nbits, **kw):
    s_lo = shoot(c_lo, **kw)[0]
    s_hi = shoot(c_hi, **kw)[0]
    assert s_lo != s_hi and s_lo != 0 and s_hi != 0, (s_lo, s_hi)
    for it in range(nbits):
        cm = mid((c_lo + c_hi) / 2)
        sm = shoot(cm, **kw)[0]
        if sm == s_lo:
            c_lo = cm
        elif sm == s_hi:
            c_hi = cm
        else:
            raise RuntimeError('no escape within T at c=%s' % cm)
    return c_lo, c_hi, s_lo, s_hi


if __name__ == '__main__':
    prec = int(sys.argv[1]) if len(sys.argv) > 1 else 128
    nbits = int(sys.argv[2]) if len(sys.argv) > 2 else 60
    ctx.prec = prec
    c_lo = arb(sys.argv[3]) if len(sys.argv) > 3 else arb('1.1027')
    c_hi = arb(sys.argv[4]) if len(sys.argv) > 4 else arb('1.1028')
    t0 = time.time()
    lo, hi, slo, shi = bisect(c_lo, c_hi, nbits)
    print('prec', prec, 'bracket', lo.str(60, radius=False), hi.str(60, radius=False), slo, shi, 'time %.1fs' % (time.time() - t0))
