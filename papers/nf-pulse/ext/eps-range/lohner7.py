#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""C^0-Lohner interval Taylor integrator with the recovery rate eps as a state variable.

This is ../../code/lohner.py with one change: the state is z = (U, V, Q, P, Y, kappa, eps) in R^7 with
kappa' = 0 and eps' = 0, so the dependence of the flow on eps is carried by the linear part of the Lohner
set (the matrix C) instead of being wrapped into its box part.  The Taylor recursion is the one of
../../code/nfcore.py (called with eps as the seventh state); its gradient below adds d/deps.

Set representation (unchanged):  X = xbar + C r0 + B r,  r0 in R0, r in R.  One step of length h:
a priori enclosure W on [0, h] by the Picard test, Lagrange remainder h^(p+1) x_(p+1)(W), mean value form
of the Taylor polynomial with the Jacobian over the hull, QR re-orthogonalisation of B.  Every enclosure
contains the exact solution for every initial point of the set, given correct ball arithmetic.

Time rescaling.  integrate() takes rho = (b, e_m): the field is multiplied by the factor
    r(eps) = 1 + b (eps - e_m),
which is constant along each orbit (eps' = 0).  The solution of z' = r(eps) F(z) at time s is the solution of
z' = F(z) at time r(eps) s: the same orbit, advanced by a time that depends (affinely) on eps.  It lets the
proof compare pulses of different eps at the same phase instead of at the same time.  b = 0 is the plain
flow.  The caller must keep r > 0 on the eps range (checked in integrate).
"""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'code'))
from flint import arb, arb_mat, ctx
import nfcore as nf
import lohner as lo0          # reused helpers: ball, matvec, mid_mat, qr_orth, hull_contains_interior, StepFailure

N = 7
ball, matvec, mid_mat, qr_orth = lo0.ball, lo0.matvec, lo0.mid_mat, lo0.qr_orth
hull_contains_interior, StepFailure = lo0.hull_contains_interior, lo0.StepFailure


RHO = [arb(0), arb(0)]      # (b, e_m) of the time rescaling r(eps) = 1 + b (eps - e_m); set by integrate()


def rfac(eps):
    return 1 + RHO[0] * (eps - RHO[1])


def taylor_vals(x, order):
    """Taylor coefficients of the rescaled field r(eps) F (nfcore.taylor with every derivative times r)."""
    beta = arb(nf._BETA)
    kappa, eps = x[5], x[6]
    r = rfac(eps)
    U = [x[0]]; V = [x[1]]; Q = [x[2]]; P = [x[3]]; Y = [x[4]]
    Z = []; D = []
    for k in range(order):
        yy = Y[0] * Y[k]
        for j in range(1, k + 1):
            yy += Y[j] * Y[k - j]
        Z.append(Y[k] - yy)
        d = r * kappa * (Q[k] - U[k] - V[k])
        D.append(d)
        kp1 = k + 1
        U.append(d / kp1)
        V.append(r * eps * kappa * U[k] / kp1)
        Q.append(r * P[k] / kp1)
        P.append(r * (Q[k] - Y[k]) / kp1)
        zd = Z[0] * D[k]
        for j in range(1, k + 1):
            zd += Z[j] * D[k - j]
        Y.append(beta * zd / kp1)
    return [U, V, Q, P, Y]


def taylor_jet(x, order):
    """Taylor coefficients and their gradients with respect to the 7 initial values (eps is x[6])."""
    beta = arb(nf._BETA)
    gam = arb(nf._GAMMA)
    assert gam == 0
    z0 = arb(0)
    n = N
    kap, eps = x[5], x[6]
    r = rfac(eps)
    gr6 = RHO[0]                                       # dr/deps (the only nonzero entry of grad r)
    e = [[arb(1) if j == i else z0 for j in range(n)] for i in range(n)]
    U, V, Q, P, Y = [x[0]], [x[1]], [x[2]], [x[3]], [x[4]]
    gU, gV, gQ, gP, gY = [e[0]], [e[1]], [e[2]], [e[3]], [e[4]]
    Z, gZ, D, gD = [], [], [], []
    for k in range(order):
        yy = Y[0] * Y[k]
        for j in range(1, k + 1):
            yy += Y[j] * Y[k - j]
        g_yy = [z0] * n
        for j in range(k + 1):
            yj = Y[j]
            gyk = gY[k - j]
            g_yy = [g_yy[m] + yj * gyk[m] for m in range(n)]
        g_yy = [2 * v for v in g_yy]
        Z.append(Y[k] - yy)
        gZ.append([gY[k][m] - g_yy[m] for m in range(n)])
        w = Q[k] - U[k] - V[k]
        gw = [gQ[k][m] - gU[k][m] - gV[k][m] for m in range(n)]
        d = r * kap * w
        gd = [r * kap * gw[m] for m in range(n)]
        gd[5] = gd[5] + r * w                          # d/dkappa of r*kappa*w
        gd[6] = gd[6] + gr6 * kap * w                  # d/deps through r
        D.append(d)
        gD.append(gd)
        kp1 = k + 1
        U.append(d / kp1)
        gU.append([v / kp1 for v in gd])
        vv = r * eps * kap * U[k]                      # gamma = 0
        gvv = [r * eps * kap * gU[k][m] for m in range(n)]
        gvv[5] = gvv[5] + r * eps * U[k]               # d/dkappa
        gvv[6] = gvv[6] + r * kap * U[k] + gr6 * eps * kap * U[k]   # d/deps (directly and through r)
        V.append(vv / kp1)
        gV.append([v / kp1 for v in gvv])
        Q.append(r * P[k] / kp1)
        gq = [r * v for v in gP[k]]
        gq[6] = gq[6] + gr6 * P[k]
        gQ.append([v / kp1 for v in gq])
        P.append(r * (Q[k] - Y[k]) / kp1)
        gp = [r * (gQ[k][m] - gY[k][m]) for m in range(n)]
        gp[6] = gp[6] + gr6 * (Q[k] - Y[k])
        gP.append([v / kp1 for v in gp])
        zd = Z[0] * D[k]
        for j in range(1, k + 1):
            zd += Z[j] * D[k - j]
        gzd = [z0] * n
        for j in range(k + 1):
            Zj, Dkj = Z[j], D[k - j]
            gZj, gDkj = gZ[j], gD[k - j]
            gzd = [gzd[m] + Zj * gDkj[m] + gZj[m] * Dkj for m in range(n)]
        Y.append(beta * zd / kp1)
        gY.append([beta * v / kp1 for v in gzd])
    vals = [U, V, Q, P, Y, [kap] + [z0] * order, [eps] + [z0] * order]
    grads = [gU, gV, gQ, gP, gY, [e[5]] + [[z0] * n for _ in range(order)], [e[6]] + [[z0] * n for _ in range(order)]]
    return vals, grads


def vf(x):
    r = rfac(x[6])
    return [r * f for f in nf.vfield(x[:5], x[5], eps=x[6])] + [arb(0), arb(0)]


class LohnerSet(lo0.LohnerSet):
    pass


def rough_enclosure(Xh, h, order, max_tries=8):
    hint = ball(0, h)
    vals = taylor_vals(Xh, order)
    W0 = [nf.horner(vals[i], hint) for i in range(5)] + [Xh[5], Xh[6]]
    W = []
    for i, w in enumerate(W0):
        if i >= 5:
            W.append(w)
            continue
        rad = arb(w.rad()) * arb('0.2') + arb(2) ** (-ctx.prec // 2)
        W.append(w + ball(-rad, rad))
    for _ in range(max_tries):
        F = vf(W)
        cand = [Xh[i] + hint * F[i] for i in range(N)]
        if hull_contains_interior(W[:5], cand[:5]) and W[5].contains(cand[5]) and W[6].contains(cand[6]):
            return W
        newW = []
        for i in range(N):
            if i >= 5:
                newW.append(W[i])
                continue
            u = W[i].union(cand[i])
            rad = arb(u.rad()) * arb('0.1') + arb(2) ** (-ctx.prec // 2)
            newW.append(u + ball(-rad, rad))
        W = newW
    return None


def step(X, h, order):
    Xh = X.hull()
    W = rough_enclosure(Xh, h, order)
    if W is None:
        raise StepFailure('rough enclosure')
    hA = arb(h)
    valsW = taylor_vals(W, order + 1)
    Rem = [valsW[i][order + 1] * hA ** (order + 1) for i in range(5)] + [arb(0), arb(0)]
    valsx = taylor_vals(X.xbar, order)
    y = [nf.horner(valsx[i][:order + 1], hA) + Rem[i] for i in range(5)] + [X.xbar[5], X.xbar[6]]
    vals, grads = taylor_jet(Xh, order)
    J = arb_mat(N, N)
    for i in range(N):
        for m in range(N):
            J[i, m] = nf.horner([grads[i][k][m] for k in range(order + 1)], hA)
    xbar2 = [arb(v.mid()) for v in y]
    JC = J * X.C
    C2 = mid_mat(JC)
    JB = J * X.B
    mJB = mid_mat(JB)
    keys = []
    for j in range(N):
        cn = math.sqrt(sum(float(mJB[i, j].mid()) ** 2 for i in range(N)))
        keys.append(cn * float(arb(X.R[j].rad()).mid()) + 1e-300 * cn)
    order_cols = sorted(range(N), key=lambda j: -keys[j])
    Pm = arb_mat([[mJB[i, j] for j in order_cols] for i in range(N)])
    B2 = qr_orth(Pm)
    B2inv = B2.inv()
    err = [y[i] - xbar2[i] for i in range(N)]
    lin = matvec(JC - C2, X.R0)
    t1 = matvec(B2inv, [err[i] + lin[i] for i in range(N)])
    t2 = matvec(B2inv * JB, X.R)
    R2 = [t1[i] + t2[i] for i in range(N)]
    return LohnerSet(xbar2, C2, X.R0, B2, R2), W


def choose_h(x, order, tol, hmax):
    vals = taylor_vals(x, order)
    m = 0.0
    for i in range(5):
        m = max(m, abs(float(vals[i][order].mid())), abs(float(vals[i][order - 1].mid())) ** (order / (order - 1.0)))
    m = max(m, 1e-300)
    return min(hmax, (tol / m) ** (1.0 / order))


def integrate(X, t0, t1, order=20, tol=1e-30, hmax=0.25, callback=None, rho=(0, 0)):
    """Integrate the rescaled field from the exact dyadic time t0 to t1 (floats with few bits)."""
    RHO[0], RHO[1] = arb(rho[0]), arb(rho[1])
    assert rfac(X.hull()[6]) > 0
    t = arb(t0)
    Tend = arb(t1)
    nsteps = 0
    while t < Tend:
        h = choose_h(X.xbar, order, tol, hmax)
        e = math.floor(math.log2(h))
        h = math.floor(h / 2.0 ** (e - 12)) * 2.0 ** (e - 12)
        if t + arb(h) > Tend:
            h = float((Tend - t).mid())
            assert arb(h) == Tend - t
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
        if callback is not None and callback(t_prev, t, X, W):
            return X, t, nsteps
    assert t == Tend
    return X, t, nsteps
