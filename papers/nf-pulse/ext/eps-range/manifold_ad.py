#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""The unstable-manifold point P(t0; eps, kappa) and its gradient in (eps, kappa), in ball arithmetic.

The coefficient recursion is the one of ../../code/manifold.py (a_1 = sigma v, (n lam - A) a_n = e_Y g_n),
evaluated in forward-mode automatic differentiation: every quantity is a pair (value, gradient) of balls.
With inputs that are balls over a parameter box, the value encloses P over the box and the gradient
encloses dP/d(eps, kappa) over the box, which is what a mean value form needs.  The eigenvalue lam enters
through the implicit function theorem, d lam = -(d_param p)/(d_lam p), with p the characteristic polynomial.
Only the polynomial part sum_{n<=N} a_n t^n is differentiated; the validated tail of manifold.py is added
as an uncorrelated ball by the caller.
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'code'))
from flint import arb
import nfcore as nf


class D:
    """value v (arb) and gradient g = [d/deps, d/dkappa] (arbs)."""
    __slots__ = ('v', 'g')

    def __init__(self, v, g=None):
        self.v = v if isinstance(v, arb) else arb(v)
        self.g = g if g is not None else [arb(0), arb(0)]

    @staticmethod
    def lift(x):
        return x if isinstance(x, D) else D(x)

    def __add__(s, o):
        o = D.lift(o); return D(s.v + o.v, [a + b for a, b in zip(s.g, o.g)])
    __radd__ = __add__

    def __sub__(s, o):
        o = D.lift(o); return D(s.v - o.v, [a - b for a, b in zip(s.g, o.g)])

    def __rsub__(s, o):
        return D.lift(o) - s

    def __neg__(s):
        return D(-s.v, [-a for a in s.g])

    def __mul__(s, o):
        o = D.lift(o); return D(s.v * o.v, [s.v * b + a * o.v for a, b in zip(s.g, o.g)])
    __rmul__ = __mul__

    def __truediv__(s, o):
        o = D.lift(o)
        q = s.v / o.v
        return D(q, [(a - q * b) / o.v for a, b in zip(s.g, o.g)])

    def __rtruediv__(s, o):
        return D.lift(o) / s


def charpoly(l, k, s, eps):
    l2 = l * l
    return l2 * l2 + k * l2 * l + (eps * k * k - 1) * l2 + k * (s - 1) * l - eps * k * k


def lam_dual(lam, eps, kap, s):
    """lam (a ball enclosing the unstable root for all params in the balls eps, kap) as a D."""
    l = lam
    dp_dl = 4 * l ** 3 + 3 * kap * l * l + 2 * (eps * kap * kap - 1) * l + kap * (s - 1)
    dp_de = kap * kap * l * l - kap * kap
    dp_dk = l ** 3 + 2 * eps * kap * l * l + (s - 1) * l - 2 * eps * kap
    assert dp_dl > 0          # simple root, and the implicit function theorem applies over the whole box
    return D(lam, [-dp_de / dp_dl, -dp_dk / dp_dl])


def point(eps, kap, lam, sigma, N, t):
    """Polynomial part of P(t) = sum_{n<=N} a_n t^n as five D numbers (U, V, Q, P, Y)."""
    beta = arb(nf._BETA)
    th = arb(nf._THETA)
    x0 = nf.rest_state()
    Y0 = x0[4]
    s = beta * Y0 * (1 - Y0)
    E = D(eps, [arb(1), arb(0)])
    K = D(kap, [arb(0), arb(1)])
    L = lam_dual(lam, eps, kap, s)
    v = [D(1), E * K / L, -s / (L * L - 1), -s * L / (L * L - 1), D(s)]      # certify_rest.eigvec_unstable
    a1 = [sigma * vi for vi in v]
    a = [a1]
    w = [None, a1[2] - a1[0] - a1[1]]
    yY = [None, a1[4]]
    yY2 = [None, None]
    for n in range(2, N + 1):
        q = D(0)
        for j in range(1, n):
            q = q + yY[j] * yY[n - j]
        yY2.append(q)
        r = D(0)
        for j in range(1, n):
            r = r + ((1 - 2 * Y0) * yY[j] - (yY2[j] if j >= 2 else D(0))) * w[n - j]
        g = beta * K * r
        # z = (mu - A)^{-1} e_Y in closed form (manifold.zsolve), mu = n lam
        mu = n * L
        p = charpoly(mu, K, s, E)
        zU = -K / p
        zV = E * K * zU / mu
        zY = s * zU + 1 / mu
        zQ = -zY / (mu * mu - 1)
        zP = mu * zQ
        an = [zU * g, zV * g, zQ * g, zP * g, zY * g]
        a.append(an)
        w.append(an[2] - an[0] - an[1])
        yY.append(an[4])
    out = []
    for i in range(5):
        acc = D(0)
        for n in range(N, 0, -1):
            acc = (acc + a[n - 1][i]) * t
        out.append(acc + x0[i])
    return out
