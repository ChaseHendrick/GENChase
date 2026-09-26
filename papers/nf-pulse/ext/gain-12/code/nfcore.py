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
"""Core definitions for the Pinto-Ermentrout traveling-pulse problem.

Model (Pinto and Ermentrout, SIAM J. Appl. Math. 62 (2001) 206-225, eq. (3), with their feedback
decay called gamma here and their kernel w(x) = exp(-|x|/b)/(2b) at b = 1):

    u_t = -u - v + (w * S(u)),      v_t = eps (u - gamma v),
    w(x) = exp(-|x|)/2,             S(u) = 1/(1 + exp(-beta (u - theta))).

Travelling waves u = U(xi), v = V(xi), xi = x + c t (c > 0: the pulse moves to the left).  With
Q = w * S(U) one has Q - Q'' = S(U) because (1 - d^2/dxi^2) exp(-|xi|)/2 = delta, and the bounded
solution of that equation is unique.  With P = Q' and kappa = 1/c the wave ODE is

    U' = kappa (Q - U - V)
    V' = eps kappa (U - gamma V)
    Q' = P
    P' = Q - S(U)

and the polynomial embedding used for Taylor arithmetic adds Y = S(U):

    Y' = beta Y (1 - Y) U'      (the surface Y = S(U) is invariant).

State order everywhere: x = (U, V, Q, P, Y).  All arithmetic is python-flint arb (ball arithmetic).
"""
from flint import arb, ctx

# ---------------------------------------------------------------- parameters (exact rationals)
# Stored as exact rationals and converted to arb balls at the CURRENT working precision on every
# use (module-level arb constants would silently keep the precision in force at import time).
from flint import fmpq
import os as _os
# Logistic gain 12 = Pinto-Ermentrout's (1 + tanh(6 (u - theta)))/2 (their Fig. 5 sigmoid, tanh gain 6).
_BETA = fmpq(_os.environ.get('NF_BETA', '12'))
_THETA = fmpq(1, 4)     # threshold (Pinto-Ermentrout Figs. 1c, 7 and 8 use theta = .25)
_EPS = fmpq(_os.environ.get('NF_EPS', '3/20'))   # Pinto-Ermentrout Figs. 7 (right) and 8: eps = .15
_GAMMA = fmpq(0)        # Pinto-Ermentrout Sect. 3.1 and Figs. 7, 8 take the feedback decay beta = 0


def __getattr__(name):          # module-level lazy constants (PEP 562)
    if name in ('BETA', 'THETA', 'EPS', 'GAMMA'):
        return arb(globals()['_' + name])
    raise AttributeError(name)

PARAMS_TXT = "beta=%s, theta=1/4, eps=%s, gamma=0, w(x)=exp(-|x|)/2" % (_BETA, _EPS)


def params():
    return arb(_BETA), arb(_THETA), arb(_EPS), arb(_GAMMA)


def S(u, beta=None, theta=None):
    beta = arb(_BETA) if beta is None else beta
    theta = arb(_THETA) if theta is None else theta
    return 1 / (1 + (-beta * (u - theta)).exp())


def dS(u, beta=None, theta=None):
    beta = arb(_BETA) if beta is None else beta
    s = S(u, beta, theta)
    return beta * s * (1 - s)


def rest_state():
    """gamma = 0: the only equilibrium is U = 0, V = Q = Y = S(0), P = 0 (exact)."""
    assert _GAMMA == 0
    s0 = S(arb(0))
    return [arb(0), s0, s0, arb(0), s0]


# ---------------------------------------------------------------- Taylor coefficients
def taylor(x0, kappa, order, eps=None, gam=None, beta=None):
    """Taylor coefficients x_k, k = 0..order, of the solution of the 5D embedded system through x0.

    Works for arb balls (then each coefficient encloses the coefficient of every solution with
    initial point in the balls and kappa in its ball) and for plain floats.
    Returns five lists U, V, Q, P, Y of length order + 1.
    """
    eps = arb(_EPS) if eps is None else eps
    gam = arb(_GAMMA) if gam is None else gam
    beta = arb(_BETA) if beta is None else beta
    U = [x0[0]]; V = [x0[1]]; Q = [x0[2]]; P = [x0[3]]; Y = [x0[4]]
    Z = []      # Z = Y (1 - Y)
    D = []      # D = U' = kappa (Q - U - V)
    YY = []     # Y*Y
    for k in range(order):
        # coefficient k of Y*Y and of Z
        yy = Y[0] * Y[k]
        for j in range(1, k + 1):
            yy += Y[j] * Y[k - j]
        YY.append(yy)
        Z.append(Y[k] - yy)
        d = kappa * (Q[k] - U[k] - V[k])
        D.append(d)
        kp1 = k + 1
        U.append(d / kp1)
        V.append(eps * kappa * (U[k] - gam * V[k]) / kp1)
        Q.append(P[k] / kp1)
        P.append((Q[k] - Y[k]) / kp1)
        zd = Z[0] * D[k]
        for j in range(1, k + 1):
            zd += Z[j] * D[k - j]
        Y.append(beta * zd / kp1)
    return U, V, Q, P, Y


def vfield(x, kappa, eps=None, gam=None, beta=None):
    eps = arb(_EPS) if eps is None else eps
    gam = arb(_GAMMA) if gam is None else gam
    beta = arb(_BETA) if beta is None else beta
    U, V, Q, P, Y = x
    d = kappa * (Q - U - V)
    return [d, eps * kappa * (U - gam * V), P, Q - Y, beta * Y * (1 - Y) * d]


def horner(coefs, h):
    s = coefs[-1]
    for a in reversed(coefs[:-1]):
        s = s * h + a
    return s
