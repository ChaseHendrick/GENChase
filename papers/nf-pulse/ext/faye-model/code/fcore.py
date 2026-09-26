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
"""Core definitions for Faye's neural field with synaptic depression.

Model (Faye, SIAM J. Appl. Dyn. Syst. 12 (2013) 2032-2067, eqs. (2.1)-(2.3), tau = 1):

    u_t = -u + int J(x - y) q(y, t) S(u(y, t)) dy,     (1/eps) q_t = 1 - q - beta q S(u),
    S(u) = 1/(1 + exp(-lam (u - kap))),                J(x) = (b/2) exp(-b |x|).

Faye's illustration values (his Figs. 1, 6-8; Hastings, Proc. Roy. Soc. Edinburgh A 147 (2017), footnote 3):
lam = 20, kap = 0.22, b = 4.5, beta = 5; Faye's figures use eps = 0.01 (Fig. 6(b): 0.005).

Travelling waves u = u(xi), q = q(xi), xi = x + c t.  With v = J * (q S(u)) one has b^2 v - v'' = b^2 q S(u)
(Faye (2.7)); the bounded solution of that equation is unique, so a bounded solution of the ODE below is a
travelling wave of the field equation.  With w = v' and k = 1/c (Faye (2.8)):

    u' = k (v - u),   v' = w,   w' = b^2 (v - q S(u)),   q' = eps k (1 - q - beta q S(u)).

The polynomial embedding used for Taylor arithmetic adds Y = S(u):  Y' = lam Y (1 - Y) u'
(the surface Y = S(u) is invariant).  State order: x = (u, v, w, q, Y).  Arithmetic: python-flint arb balls.
"""
import os
from flint import arb, fmpq, ctx

# ---------------------------------------------------------------- parameters (exact rationals)
_LAM = fmpq(20)
_KAP = fmpq(11, 50)       # 0.22
_BETA = fmpq(5)
_B = fmpq(9, 2)           # 4.5
_EPS = fmpq(*[int(t) for t in os.environ.get('FAYE_EPS', '1/20').split('/')])   # e.g. FAYE_EPS=1/20


def params():
    """(lam, kap, beta, b, eps) as arb balls at the current precision."""
    return arb(_LAM), arb(_KAP), arb(_BETA), arb(_B), arb(_EPS)


def eps_txt():
    return str(_EPS)


def PARAMS_TXT():
    return 'lam=20, kap=11/50, beta=5, b=9/2, eps=%s, J(x)=(b/2)exp(-b|x|), tau=1' % _EPS


def S(u, lam=None, kap=None):
    lam = arb(_LAM) if lam is None else lam
    kap = arb(_KAP) if kap is None else kap
    return 1 / (1 + (-lam * (u - kap)).exp())


def dS(u, lam=None, kap=None):
    lam = arb(_LAM) if lam is None else lam
    s = S(u, lam, kap)
    return lam * s * (1 - s)


def Frest(u, beta=None, lam=None, kap=None):
    """Equilibria: u = q S(u), q = 1/(1 + beta S(u))  <=>  F(u) = u (1 + beta S(u)) - S(u) = 0."""
    beta = arb(_BETA) if beta is None else beta
    s = S(u, lam, kap)
    return u * (1 + beta * s) - s


def rest_u0(beta=None, lam=None, kap=None, nit=None):
    """Enclosure of the root u0 of Frest in [0, 1/10] by bisection with certified end signs."""
    lo, hi = arb(0), arb(fmpq(1, 10))
    assert Frest(lo, beta, lam, kap) < 0 and Frest(hi, beta, lam, kap) > 0
    nit = ctx.prec - 8 if nit is None else nit
    for _ in range(nit):
        m = arb(((lo + hi) / 2).mid())
        f = Frest(m, beta, lam, kap)
        if f < 0:
            lo = m
        elif f > 0:
            hi = m
        else:
            break
    assert Frest(lo, beta, lam, kap) < 0 and Frest(hi, beta, lam, kap) > 0
    return lo.union(hi)


def rest_state():
    """x* = (u0, u0, 0, q0, Y0) with Y0 = S(u0), q0 = 1/(1 + beta Y0); balls containing the exact point."""
    lam, kap, beta, b, eps = params()
    u0 = rest_u0()
    Y0 = S(u0)
    q0 = 1 / (1 + beta * Y0)
    return [u0, u0, arb(0), q0, Y0]


# ---------------------------------------------------------------- Taylor coefficients
def taylor(x0, kappa, order):
    """Taylor coefficients x_k, k = 0..order, of the solution of the 5D embedded system through x0."""
    lam, kap, beta, b, eps = params()
    b2 = b * b
    ek = eps * kappa
    u = [x0[0]]; v = [x0[1]]; w = [x0[2]]; q = [x0[3]]; Y = [x0[4]]
    Z, D, QY = [], [], []
    for k in range(order):
        yy = Y[0] * Y[k]
        qy = q[0] * Y[k]
        for j in range(1, k + 1):
            yy += Y[j] * Y[k - j]
            qy += q[j] * Y[k - j]
        QY.append(qy)
        Z.append(Y[k] - yy)
        d = kappa * (v[k] - u[k])
        D.append(d)
        kp1 = k + 1
        u.append(d / kp1)
        v.append(w[k] / kp1)
        w.append(b2 * (v[k] - qy) / kp1)
        q.append(ek * ((1 if k == 0 else 0) - q[k] - beta * qy) / kp1)
        zd = Z[0] * D[k]
        for j in range(1, k + 1):
            zd += Z[j] * D[k - j]
        Y.append(lam * zd / kp1)
    return u, v, w, q, Y


def vfield(x, kappa):
    lam, kap, beta, b, eps = params()
    u, v, w, q, Y = x
    d = kappa * (v - u)
    return [d, w, b * b * (v - q * Y), eps * kappa * (1 - q - beta * q * Y), lam * Y * (1 - Y) * d]


def horner(coefs, h):
    s = coefs[-1]
    for a in reversed(coefs[:-1]):
        s = s * h + a
    return s
