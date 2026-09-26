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
"""Validated parametrisation of the one-dimensional unstable manifold of the rest state x*.

5D polynomial embedding x = (U, V, Q, P, Y), gamma = 0, kappa = 1/c:
    F(x* + y) = A y + e_Y g(y),   g(y) = beta kappa [ (1 - 2 Y0) y_Y w - y_Y^2 w ],   w = y_Q - y_U - y_V.
Parametrisation P(t) = sum_n a_n t^n with  lam t P'(t) = F(P(t)),  a_0 = x*,  a_1 = sigma v  (v from
certify_rest.eigvec_unstable).  For n >= 2:  (n lam - A) a_n = e_Y g_n(a_1..a_{n-1}).

Coefficients a_2..a_N are computed in ball arithmetic (they enclose the exact coefficients for every
kappa in its ball, with lam(kappa) in its ball).  The tail h = (a_n)_{n>N} satisfies h = T(h) with
    T(h)_n = (n lam - A)^{-1} e_Y g_n(abar + h),  n > N.
Because T(h)_n depends on h_m for m < n only, the exact tail lies in the component-wise ball
B_r = {||h_i||_1 <= r_i} (l^1 norm with weight nu = 1) as soon as T(B_r) is contained in B_r (induction on
truncations; no contraction needed).  We check
    K_i (G0 + Z(r)) <= r_i,
with K_i >= sup_{n>N} |((n lam - A)^{-1} e_Y)_i| (closed form, see zbound), G0 = sum_{n>N} |g_n(abar)|
(finite, exact) and Z(r) the Banach-algebra bound for g(abar + h) - g(abar).
Then for |t| <= 1:  |P_i(t) - sum_{n<=N} a_{n,i} t^n| <= r_i |t|^(N+1).
"""
from flint import arb, arb_poly, ctx, fmpq
import nfcore as nf
import certify_rest as cr


def abs_up(x):
    """upper bound for |x| as an exact-ish arb."""
    return arb(x.abs_upper())


def coefficients(kappa, lam, sigma, N):
    beta, th, eps, gam = nf.params()
    x0 = nf.rest_state()
    Y0 = x0[4]
    s = beta * Y0 * (1 - Y0)
    A = cr.jac5(kappa, s, eps)
    v = cr.eigvec_unstable(lam, kappa, s, eps)
    a = [x0, [sigma * vi for vi in v]]
    w = [arb(0), a[1][2] - a[1][0] - a[1][1]]
    yY = [arb(0), a[1][4]]
    yY2 = [arb(0), arb(0)]
    for n in range(2, N + 1):
        q = arb(0)
        for j in range(1, n):
            q += yY[j] * yY[n - j]
        yY2.append(q)
        r = arb(0)
        for j in range(1, n):
            r += ((1 - 2 * Y0) * yY[j] - yY2[j]) * w[n - j]
        g = beta * kappa * r
        z = zsolve(n * lam, kappa, s, eps)
        an = [zi * g for zi in z]
        a.append(an)
        w.append(an[2] - an[0] - an[1])
        yY.append(an[4])
    return a, s, Y0


def zsolve(mu, kappa, s, eps):
    """z = (mu - A)^{-1} e_Y in closed form (gamma = 0):
       z_U = -kappa/p(mu), z_V = eps kappa z_U/mu, z_Y = s z_U + 1/mu, z_Q = -z_Y/(mu^2-1), z_P = mu z_Q."""
    co = cr.charpoly_coeffs(kappa, s, eps)
    p = cr.peval(co, mu)
    zU = -kappa / p
    zV = eps * kappa * zU / mu
    zY = s * zU + 1 / mu
    zQ = -zY / (mu * mu - 1)
    zP = mu * zQ
    return [zU, zV, zQ, zP, zY]


def zbound(mu0, kappa, s, eps):
    """Upper bounds K_i >= sup_{mu >= mu0} |z_i(mu)|, valid when mu0 >= 2.
    For mu >= 2: p(mu) >= (mu^2 - 1) mu^2 >= (3/4) mu^4 (all other terms of p are >= 0 there), so
    |z_U| <= 4k/(3 mu^4); |z_Y| <= 1/mu + s|z_U|; |z_Q| <= |z_Y|/(mu^2-1) <= (4/3)|z_Y|/mu^2;
    |z_P| = mu |z_Q| <= (4/3)|z_Y|/mu; |z_V| = eps k |z_U|/mu; each bound is decreasing in mu."""
    assert mu0 >= 2
    k = abs_up(kappa)
    zU = 4 * k / (3 * mu0 ** 4)
    zY = 1 / mu0 + abs_up(s) * zU
    zQ = arb(4) / 3 * zY / mu0 ** 2
    zP = arb(4) / 3 * zY / mu0
    zV = abs_up(eps) * k * zU / mu0
    return [abs_up(zU), abs_up(zV), abs_up(zQ), abs_up(zP), abs_up(zY)]


def poly(coefs):
    return arb_poly(coefs)


def validate(kappa, lam, sigma, N, verbose=False):
    beta, th, eps, gam = nf.params()
    a, s, Y0 = coefficients(kappa, lam, sigma, N)
    # abar - x*  (polynomial parts, index 0 is 0)
    yb = [[arb(0)] + [a[n][i] for n in range(1, N + 1)] for i in range(5)]
    wb = [yb[2][n] - yb[0][n] - yb[1][n] for n in range(N + 1)]
    pY, pW = poly(yb[4]), poly(wb)
    g = (beta * kappa) * ((1 - 2 * Y0) * pY * pW - pY * pY * pW)
    gco = g.coeffs()
    # coefficients n <= N of g(abar) must be those used in the recursion; the tail n > N is G0
    G0 = arb(0)
    for n in range(N + 1, len(gco)):
        G0 += abs_up(gco[n])
    norm = lambda seq: sum((abs_up(x) for x in seq), arb(0))
    Yb, Wb = norm(yb[4]), norm(wb)
    lam_lo = arb(lam.lower())
    mu0 = (N + 1) * lam_lo
    K = zbound(mu0, kappa, s, eps)
    bk = abs_up(beta * kappa)
    c12 = abs_up(1 - 2 * Y0)

    def Z(r):
        rY = r[4]
        rw = r[0] + r[1] + r[2]
        return bk * (c12 * (Yb * rw + rY * Wb + rY * rw)
                     + 2 * Yb * rY * Wb + rY * rY * Wb + Yb * Yb * rw + 2 * Yb * rY * rw + rY * rY * rw)

    # try rho = G0 * (1 + small) iteratively:  r_i = K_i rho,  need G0 + Z(r(rho)) <= rho
    rho = G0 * 2 + arb(2) ** (-ctx.prec + 10)
    ok = False
    for _ in range(60):
        r = [Ki * rho for Ki in K]
        lhs = G0 + Z(r)
        if lhs < rho:
            ok = True
            break
        rho = rho * 2
        if rho > 1:
            break
    info = {'N': N, 'sigma': sigma.str(10), 'G0': G0.str(5), 'rho': rho.str(5),
            'r': [ri.str(5) for ri in r], 'Yb': Yb.str(5), 'Wb': Wb.str(5), 'K': [k.str(5) for k in K],
            'ok': ok, 'max|a_N|': max(abs(float(a[N][i].mid())) for i in range(5))}
    return ok, a, r, info


def evaluate(a, r, t):
    """Enclosure of P(t) for |t| <= 1 (component-wise): polynomial part plus tail ball r_i |t|^(N+1)."""
    N = len(a) - 1
    tt = abs_up(t)
    out = []
    for i in range(5):
        val = nf.horner([an[i] for an in a], t)
        err = r[i] * tt ** (N + 1)
        out.append(val + arb(0, err.upper()))
    return out


def choose_sigma(kappa, lam, N=40):
    a, s, Y0 = coefficients(arb(kappa.mid()), arb(lam.mid()), arb(1), N)
    nrm = [max(abs(float(ai.mid())) for ai in an) for an in a]
    R = max((nrm[n] / nrm[n - 5]) ** 0.2 for n in range(N - 4, N + 1))
    return arb(fmpq(1, int(2 * R) + 1))


if __name__ == '__main__':
    import json, time
    ctx.prec = 256
    beta, th, eps, gam = nf.params()
    s = nf.dS(arb(0))
    results = {}
    for name, cc in (('c1', cr.C1), ('c2', cr.C2), ('interval', cr.C1.union(cr.C2))):
        kappa = 1 / cc
        co = cr.charpoly_coeffs(kappa, s, eps)
        lam = cr.refine(co, arb('0.5'), arb('1.2'))
        assert cr.peval(co, arb(lam.lower())) < 0 and cr.peval(co, arb(lam.upper())) > 0
        sigma = choose_sigma(kappa, lam)
        t0 = time.time()
        ok, a, r, info = validate(kappa, lam, sigma, 80)
        t = arb(fmpq(1, 4))
        x = evaluate(a, r, t)
        info['t0'] = '1/4'
        info['P(t0)'] = [xi.str(30) for xi in x]
        info['P(t0) radii'] = [float(xi.rad()) for xi in x]
        info['time_s'] = round(time.time() - t0, 2)
        results[name] = info
        print(name, 'VALIDATED' if ok else 'FAILED', json.dumps(info, indent=1))
    # negative control: weight/scale too large (sigma * 8): the same bound must fail
    kappa = 1 / cr.C1
    co = cr.charpoly_coeffs(kappa, s, eps)
    lam = cr.refine(co, arb('0.5'), arb('1.2'))
    sigma = choose_sigma(kappa, lam) * 8
    ok, a, r, info = validate(kappa, lam, sigma, 80)
    print('NEGATIVE CONTROL (sigma x8, radius of convergence exceeded): validated =', ok)
    results['negative_sigma_x8'] = info
    json.dump(results, open('../data/manifold_validation.json', 'w'), indent=1)
