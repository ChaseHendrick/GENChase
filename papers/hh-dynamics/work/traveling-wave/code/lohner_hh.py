#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""A C^0 Lohner-type interval Taylor integrator for the Hodgkin-Huxley wave ODE, in python-flint ball arithmetic.

Adapted from papers/nf-pulse/code/lohner.py (same set representation and step), with the Taylor jets of hhjet.py.

Set:  X = xbar + C r0 + B r,  r0 in R0, r in R  (xbar a point, C 5 x m, B 5 x 5 nearly orthogonal, R0 and R boxes).
One step of length h, order p:
 1. [X] = interval hull of X.
 2. A priori enclosure W:  [X] + [0, h] f(W)  inside the interior of W  (then every solution from [X] exists on
    [0, h] and stays in W).
 3. Lagrange remainder, per component: x_i(h) - sum_{k<=p} x_{i,k}(x0) h^k = x_{i,p+1}(x(xi_i)) h^(p+1), and
    x(xi_i) is in W, so it lies in Rem_i = h^(p+1) x_{i,p+1}(W).
 4. Mean value form of Phi(x0) = sum_{k<=p} x_k(x0) h^k:  Phi(x0) in Phi(xbar) + [J](x0 - xbar),
    [J] = sum_k h^k D x_k([X]).
 5. y = Phi(xbar) + Rem; xbar' = mid(y); C' = mid([J] C); B' = Q factor of mid([J] B) (column pivoting);
    R' = [B'^-1](y - xbar' + ([J] C - C') R0) + ([B'^-1][J] B) R.
K, phi and E_l are balls held fixed; the enclosures hold for every value in them.
"""
import math
from flint import arb, arb_mat, ctx
import hhjet
import hhseries

N = 5


def ball(lo, hi):
    return arb(lo).union(arb(hi))


def matvec(M, v):
    return [sum((M[i, j] * v[j] for j in range(M.ncols())), arb(0)) for i in range(M.nrows())]


def mid_mat(M):
    return arb_mat([[arb(M[i, j].mid()) for j in range(M.ncols())] for i in range(M.nrows())])


def horner(c, x):
    s = arb(0)
    for a in reversed(c):
        s = s * x + a
    return s


def inside(outer, inner):
    return all(o.lower() < i.lower() and i.upper() < o.upper() for o, i in zip(outer, inner))


def qr_orth(A):
    n = A.nrows()
    cols = [[arb(A[i, j].mid()) for i in range(n)] for j in range(n)]
    Q = []
    for c in cols:
        v = list(c)
        for _ in range(2):
            for q in Q:
                dot = sum((v[i] * q[i] for i in range(n)), arb(0))
                v = [arb((v[i] - dot * q[i]).mid()) for i in range(n)]
        nrm = sum((vi * vi for vi in v), arb(0)).sqrt()
        Q.append([arb((vi / nrm).mid()) for vi in v])
    return arb_mat([[Q[j][i] for j in range(n)] for i in range(n)])


class LSet:
    def __init__(self, xbar, C, R0, B, R):
        self.xbar, self.C, self.R0, self.B, self.R = xbar, C, R0, B, R

    def hull(self):
        a = matvec(self.C, self.R0)
        b = matvec(self.B, self.R)
        return [self.xbar[i] + a[i] + b[i] for i in range(N)]


class StepFailure(Exception):
    pass


class Field:
    def __init__(self, K, phi, EL):
        self.K, self.phi, self.EL = K, phi, EL

    def vals(self, x, p):
        return hhseries.taylor(x, self.K, self.phi, self.EL, p)

    def jet(self, x, p):
        return hhjet.jet(x, self.K, self.phi, self.EL, p)

    def f(self, x):
        c = hhseries.taylor(x, self.K, self.phi, self.EL, 1)
        return [c[i][1] for i in range(N)]


def rough_enclosure(F, Xh, h, p, tries=10):
    hint = ball(0, h)
    v = F.vals(Xh, p)
    W = []
    for i in range(N):
        w = horner(v[i], hint)
        rad = arb(w.rad()) * arb('0.2') + arb(2) ** (-ctx.prec // 2) + arb(abs(w).upper()) * arb(2) ** -40
        W.append(w + ball(-rad, rad))
    for _ in range(tries):
        try:
            f = F.f(W)
        except (ArithmeticError, ZeroDivisionError, ValueError):
            return None
        cand = [Xh[i] + hint * f[i] for i in range(N)]
        if inside(W, cand):
            return W
        W = [W[i].union(cand[i]) for i in range(N)]
        W = [w + ball(-arb(w.rad()) * arb('0.2'), arb(w.rad()) * arb('0.2')) for w in W]
    return None


def step(F, X, h, p):
    Xh = X.hull()
    W = rough_enclosure(F, Xh, h, p)
    if W is None:
        raise StepFailure('a priori enclosure')
    hA = arb(h)
    try:
        vW = F.vals(W, p + 1)
    except (ArithmeticError, ZeroDivisionError, ValueError):
        raise StepFailure('remainder')
    Rem = [vW[i][p + 1] * hA ** (p + 1) for i in range(N)]
    vx = F.vals(X.xbar, p)
    y = [horner(vx[i][:p + 1], hA) + Rem[i] for i in range(N)]
    _, g = F.jet(Xh, p)
    J = arb_mat(N, N)
    for i in range(N):
        for m in range(N):
            J[i, m] = horner([g[i][k][m] for k in range(p + 1)], hA)
    xbar2 = [arb(v.mid()) for v in y]
    JC = J * X.C
    C2 = mid_mat(JC)
    JB = J * X.B
    mJB = mid_mat(JB)
    keys = []
    for j in range(N):
        cn = math.sqrt(sum(float(mJB[i, j].mid()) ** 2 for i in range(N)))
        keys.append(cn * float(arb(X.R[j].rad()).mid()) + 1e-300 * cn)
    order = sorted(range(N), key=lambda j: -keys[j])
    B2 = qr_orth(arb_mat([[mJB[i, j] for j in order] for i in range(N)]))
    B2inv = B2.inv()
    err = [y[i] - xbar2[i] for i in range(N)]
    lin = matvec(JC - C2, X.R0)
    t1 = matvec(B2inv, [err[i] + lin[i] for i in range(N)])
    t2 = matvec(B2inv * JB, X.R)
    return LSet(xbar2, C2, X.R0, B2, [t1[i] + t2[i] for i in range(N)]), W


def choose_h(F, x, p, tol, hmax):
    v = F.vals(x, p)
    m = 1e-300
    for i in range(N):
        m = max(m, abs(float(v[i][p].mid())), abs(float(v[i][p - 1].mid())) ** (p / (p - 1.0)))
    return min(hmax, (tol / m) ** (1.0 / p))


def integrate(F, X, T_end, p=24, tol=1e-30, hmax=0.25, callback=None, max_steps=100000, log=None):
    """Integrate X from t = 0 until T_end or until callback(t_prev, t, X, W) returns True. Step lengths are
    dyadic with 12 significant bits, so the times are exact."""
    t = arb(0)
    Tend = arb(T_end)
    ns = 0
    while t < Tend and ns < max_steps:
        h = choose_h(F, X.xbar, p, tol, hmax)
        e = math.floor(math.log2(h))
        h = math.floor(h / 2.0 ** (e - 12)) * 2.0 ** (e - 12)
        if t + arb(h) > Tend:
            h = float((Tend - t).mid())
        for _ in range(30):
            try:
                Xn, W = step(F, X, h, p)
                break
            except StepFailure:
                h /= 2
        else:
            raise StepFailure('step size underflow at t = %s' % t)
        tp, t = t, t + arb(h)
        X = Xn
        ns += 1
        if log and ns % log == 0:
            wid = max(float(arb(x.rad()).mid()) for x in X.hull())
            print('   step %d t = %.5f u in %s  max radius %.2e' % (ns, float(t.mid()), X.hull()[0].str(5, radius=False), wid), flush=True)
        if callback is not None and callback(tp, t, X, W):
            return X, t, ns
    return X, t, ns
