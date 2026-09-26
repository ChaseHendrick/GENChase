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
"""A C^0 Lohner-type interval Taylor integrator in python-flint ball arithmetic.

State z = (u, v, w, q, Y, kappa) in R^6 (kappa' = 0), vector field of fcore (Faye's model, 5D embedding).
Adapted from papers/nf-pulse/code/lohner.py (same algorithm; only the Taylor recursion and its gradients differ).

Set representation (Lohner, "QR" variant):   X = xbar + C r0 + B r,   r0 in R0, r in R,
with xbar a point, C an n x m matrix, B an n x n (nearly orthogonal) matrix, R0 and R boxes.

One step of length h with Taylor order p:
 1. [X] = interval hull of X.
 2. a priori enclosure W of all solutions from [X] on [0, h]: W is accepted when
        [X] + [0, h] F(W)  is contained in the interior of W      (Picard-Lindelof)
 3. Lagrange remainder: for each component, x(h) - sum_{k<=p} x_k(x0) h^k = x_{p+1}(x(xi)) h^{p+1}
    with x(xi) in W, hence in  Rem = h^{p+1} x_{p+1}(W).
 4. Mean value form of the Taylor polynomial Phi(x0) = sum_{k<=p} x_k(x0) h^k:
        Phi(x0) in Phi(xbar) + [J] (x0 - xbar),   [J] = sum_k h^k D x_k([X])  (forward-mode AD).
 5. New set:  y = Phi(xbar) + Rem;  xbar' = mid(y);  C' = mid([J]) C;  B' = Q-factor of mid([J] B)
    (columns sorted by size);  R' = [B'^{-1}] (y - xbar' + ([J] C - C') R0) + ([B'^{-1}] [J] B) R.
All steps are rigorous: every enclosure contains the exact solution for every initial point in the
initial set, provided the arithmetic library's ball operations are correct.
"""
import math
from flint import arb, arb_mat, ctx
import fcore as nf

N = 6          # dimension (5 states + kappa)


# ---------------------------------------------------------------- Taylor coefficients with gradients
def taylor_vals(x, order):
    return list(nf.taylor(x[:5], x[5], order))


def taylor_jet(x, order):
    """Taylor coefficients x_k (k = 0..order) and their gradients d x_k / d z0, z0 = (u, v, w, q, Y, kappa),
    for z0 in a box (forward-mode differentiation of the recursion of fcore.taylor).
    Returns vals[i][k], grads[i][k] = list of 6 arbs."""
    lam, kap, beta, b, eps = nf.params()
    b2 = b * b
    z0 = arb(0)
    n = N
    kp = x[5]
    ek = eps * kp
    e = [[arb(1) if j == i else z0 for j in range(n)] for i in range(n)]
    u, v, w, q, Y = [x[0]], [x[1]], [x[2]], [x[3]], [x[4]]
    gu, gv, gw, gq, gY = [e[0]], [e[1]], [e[2]], [e[3]], [e[4]]
    Z, gZ, D, gD = [], [], [], []
    for k in range(order):
        yy = Y[0] * Y[k]
        qy = q[0] * Y[k]
        for j in range(1, k + 1):
            yy += Y[j] * Y[k - j]
            qy += q[j] * Y[k - j]
        g_yy = [z0] * n
        g_qy = [z0] * n
        for j in range(k + 1):
            yj, qj, Ykj = Y[j], q[j], Y[k - j]
            gYkj, gqj = gY[k - j], gq[j]
            g_yy = [g_yy[m] + yj * gYkj[m] for m in range(n)]
            g_qy = [g_qy[m] + qj * gYkj[m] + gqj[m] * Ykj for m in range(n)]
        g_yy = [2 * t for t in g_yy]
        Z.append(Y[k] - yy)
        gZ.append([gY[k][m] - g_yy[m] for m in range(n)])
        dd = v[k] - u[k]
        gdd = [gv[k][m] - gu[k][m] for m in range(n)]
        d = kp * dd
        gd = [kp * t for t in gdd]
        gd[5] = gd[5] + dd
        D.append(d)
        gD.append(gd)
        kp1 = k + 1
        u.append(d / kp1)
        gu.append([t / kp1 for t in gd])
        v.append(w[k] / kp1)
        gv.append([t / kp1 for t in gw[k]])
        w.append(b2 * (v[k] - qy) / kp1)
        gw.append([b2 * (gv[k][m] - g_qy[m]) / kp1 for m in range(n)])
        inner = (1 if k == 0 else 0) - q[k] - beta * qy
        ginner = [-gq[k][m] - beta * g_qy[m] for m in range(n)]
        q.append(ek * inner / kp1)
        gqn = [ek * t / kp1 for t in ginner]
        gqn[5] = gqn[5] + eps * inner / kp1
        gq.append(gqn)
        zd = Z[0] * D[k]
        for j in range(1, k + 1):
            zd += Z[j] * D[k - j]
        gzd = [z0] * n
        for j in range(k + 1):
            Zj, Dkj = Z[j], D[k - j]
            gZj, gDkj = gZ[j], gD[k - j]
            gzd = [gzd[m] + Zj * gDkj[m] + gZj[m] * Dkj for m in range(n)]
        Y.append(lam * zd / kp1)
        gY.append([lam * t / kp1 for t in gzd])
    vals = [u, v, w, q, Y, [kp] + [z0] * order]
    grads = [gu, gv, gw, gq, gY, [e[5]] + [[z0] * n for _ in range(order)]]
    return vals, grads


def vf(x):
    f = nf.vfield(x[:5], x[5])
    return f + [arb(0)]


# ---------------------------------------------------------------- helpers
def hull_contains_interior(outer, inner):
    """inner strictly inside outer, componentwise (arb balls)."""
    for o, i in zip(outer, inner):
        if not (o.lower() < i.lower() and i.upper() < o.upper()):
            return False
    return True


def ball(lo, hi):
    lo = arb(lo)
    hi = arb(hi)
    return lo.union(hi)


def matvec(M, v):
    n, m = M.nrows(), M.ncols()
    return [sum((M[i, j] * v[j] for j in range(m)), arb(0)) for i in range(n)]


def mid_mat(M):
    return arb_mat([[arb(M[i, j].mid()) for j in range(M.ncols())] for i in range(M.nrows())])


def qr_orth(A):
    """Floating-point (high-precision midpoint) Gram-Schmidt Q factor, returned as exact arb_mat."""
    n = A.nrows()
    cols = [[arb(A[i, j].mid()) for i in range(n)] for j in range(n)]
    Qc = []
    for c in cols:
        v = list(c)
        for _ in range(2):   # re-orthogonalise twice
            for q in Qc:
                dot = sum((v[i] * q[i] for i in range(n)), arb(0))
                v = [arb((v[i] - dot * q[i]).mid()) for i in range(n)]
        nrm = sum((vi * vi for vi in v), arb(0)).sqrt()
        v = [arb((vi / nrm).mid()) for vi in v]
        Qc.append(v)
    return arb_mat([[Qc[j][i] for j in range(n)] for i in range(n)])


class LohnerSet:
    def __init__(self, xbar, C, R0, B, R):
        self.xbar, self.C, self.R0, self.B, self.R = xbar, C, R0, B, R

    @staticmethod
    def from_box(box):
        n = len(box)
        xbar = [arb(b.mid()) for b in box]
        C = arb_mat(n, n)
        for i in range(n):
            C[i, i] = arb(b_rad := box[i].rad())
        R0 = [ball(-1, 1) for _ in range(n)]
        B = arb_mat(n, n)
        for i in range(n):
            B[i, i] = 1
        R = [arb(0) for _ in range(n)]
        return LohnerSet(xbar, C, R0, B, R)

    def hull(self):
        a = matvec(self.C, self.R0)
        b = matvec(self.B, self.R)
        return [self.xbar[i] + a[i] + b[i] for i in range(len(self.xbar))]

    def affine_image_hull(self, T, shift):
        """hull of { T (x - shift) : x in X } computed as T(xbar - shift) + (T C) R0 + (T B) R."""
        n = len(self.xbar)
        TC = T * self.C
        TB = T * self.B
        d = [self.xbar[i] - shift[i] for i in range(n)]
        out = matvec(T, d)
        a = matvec(TC, self.R0)
        b = matvec(TB, self.R)
        return [out[i] + a[i] + b[i] for i in range(T.nrows())]


def poly_on_interval(coefs, hint):
    """evaluate polynomial with coefficients (list of arb) at an interval hint (e.g. [0, h])."""
    return nf.horner(coefs, hint)


class StepFailure(Exception):
    pass


def rough_enclosure(Xh, h, order, max_tries=8):
    """Find W with Xh + [0,h] F(W) inside int W."""
    hint = ball(0, h)
    vals = taylor_vals(Xh[:5] + [Xh[5]], order)
    W0 = [poly_on_interval(vals[i], hint) for i in range(5)] + [Xh[5]]
    W = []
    for w in W0:
        rad = arb(w.rad()) * arb('0.2') + arb(2) ** (-ctx.prec // 2)
        W.append(w + ball(-rad, rad))
    for _ in range(max_tries):
        F = vf(W)
        cand = [Xh[i] + hint * F[i] for i in range(6)]
        if hull_contains_interior(W, cand[:5]) and W[5].contains(cand[5]):
            return W
        # enlarge
        newW = []
        for i in range(6):
            u = W[i].union(cand[i])
            rad = arb(u.rad()) * arb('0.1') + arb(2) ** (-ctx.prec // 2)
            newW.append(u + ball(-rad, rad))
        W = newW
    return None


def step(X, h, order):
    """One Lohner step; returns (new LohnerSet, W rough enclosure over [0,h]) or raises StepFailure."""
    Xh = X.hull()
    W = rough_enclosure(Xh, h, order)
    if W is None:
        raise StepFailure('rough enclosure')
    hA = arb(h)
    # remainder
    valsW = taylor_vals(W, order + 1)
    Rem = [valsW[i][order + 1] * hA ** (order + 1) for i in range(5)] + [arb(0)]
    # Taylor polynomial at xbar
    valsx = taylor_vals(X.xbar, order)
    y = [nf.horner(valsx[i][:order + 1], hA) + Rem[i] for i in range(5)] + [X.xbar[5] + Rem[5]]
    # Jacobian over the hull
    vals, grads = taylor_jet(Xh, order)
    J = arb_mat(N, N)
    for i in range(N):
        for m in range(N):
            J[i, m] = nf.horner([grads[i][k][m] for k in range(order + 1)], hA)
    xbar2 = [arb(v.mid()) for v in y]
    JC = J * X.C
    C2 = mid_mat(JC)
    JB = J * X.B
    # column pivoting: sort columns of mid(JB) by |col| * rad(R_j)
    mJB = mid_mat(JB)
    n = N
    keys = []
    for j in range(n):
        cn = math.sqrt(sum(float(mJB[i, j].mid()) ** 2 for i in range(n)))
        keys.append(cn * float(arb(X.R[j].rad()).mid()) + 1e-300 * cn)
    order_cols = sorted(range(n), key=lambda j: -keys[j])
    P = arb_mat([[mJB[i, j] for j in order_cols] for i in range(n)])
    B2 = qr_orth(P)
    B2inv = B2.inv()
    err = [y[i] - xbar2[i] for i in range(n)]
    lin = matvec(JC - C2, X.R0)
    t1 = matvec(B2inv, [err[i] + lin[i] for i in range(n)])
    t2 = matvec(B2inv * JB, X.R)
    R2 = [t1[i] + t2[i] for i in range(n)]
    return LohnerSet(xbar2, C2, X.R0, B2, R2), W


def _log_abs(x):
    a = arb(x.abs_upper())
    return float(a.log().mid()) if a > 0 else -1e300


def choose_h(x, order, tol, hmax):
    """Step-size heuristic (not part of the rigour: every step is validated).  Computed with logarithms, because at
    high order the Taylor coefficients can overflow a double (the base version used plain floats)."""
    vals = taylor_vals(x, order)
    lm = -1e300
    for i in range(5):
        lm = max(lm, _log_abs(vals[i][order]), _log_abs(vals[i][order - 1]) * (order / (order - 1.0)))
    lm = max(lm, -690.0)
    return min(hmax, math.exp((math.log(tol) - lm) / order))


def integrate(X, T_end, order=30, tol=1e-40, hmax=0.5, callback=None, t0=0.0, max_steps=100000):
    """Integrate the Lohner set X from t0 to T_end (float times are exact dyadics; each step length is
    an exact dyadic number so the times are exact)."""
    t = arb(t0)
    Tend = arb(T_end)
    nsteps = 0
    while t < Tend:
        h = choose_h(X.xbar, order, tol, hmax)
        h = float(arb(h).mid())
        # make h an exact dyadic with few bits
        e = math.floor(math.log2(h))
        h = math.floor(h / 2.0 ** (e - 12)) * 2.0 ** (e - 12)
        if t + arb(h) > Tend:
            h = float((Tend - t).mid())
        tries = 0
        while True:
            try:
                Xn, W = step(X, h, order)
                break
            except StepFailure:
                h = h / 2
                tries += 1
                if tries > 20:
                    raise
        t_prev = t
        t = t + arb(h)
        X = Xn
        nsteps += 1
        if callback is not None:
            stop = callback(t_prev, t, X, W)
            if stop:
                return X, t, nsteps
        if nsteps > max_steps:
            break
    return X, t, nsteps
