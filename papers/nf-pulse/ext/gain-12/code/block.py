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
"""Isolating block with a cone (Lyapunov-form) condition at the rest state x* of the 4D wave ODE,
generalised to a stable spectrum with a complex pair (gain-12 extension).

For two points x1, x2 with U-coordinates in an interval I_U, the mean value theorem gives
    F(x1) - F(x2) = A(s, kappa) (x1 - x2),   s = (S(U1) - S(U2))/(U1 - U2) in S'(I_U) =: [smin, smax],
    A(s, kappa) = [[-k, -k, k, 0], [eps k, 0, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]]     (gamma = 0),
because S(U) is the only nonlinearity.  In particular dy/dxi = At(s~) y along any orbit in B, with
y = T (x - x*), At(s) = T A(s, kappa) T^{-1} and s~ = (S(U) - S(0))/U in [smin, smax].

Construction of T (a design choice; every certified statement is about the exact T that is stored):
  1. real Jordan basis of A(s_b, kappa_ref) in floating point: columns v_u (unstable), v_1 (real
     stable), Re w, Im w (w an eigenvector of the complex stable pair);  J = V^{-1} A V is then
     diag(lu) (+) J_s with J_s = [[l1, 0, 0], [0, a, w], [0, -w, a]] up to rounding;
  2. Lyapunov equation  J_s^T P + P J_s = -W  (W = diag(w1, w2, w3) > 0) solved for P > 0;
  3. P = R^T R (Cholesky) and T = diag(d_u, R) V^{-1}, stored exactly as dyadic numbers.
In these coordinates the stable quadratic form y'^T P y' becomes |y'|_2^2, so the stable block
contracts in that norm, and L(y) = y1^2 - |y'|_2^2 is the cone form.

Certified conditions (interval matrices; kappa ranges over the whole ball [1/c2, 1/c1]; s over
{smin, smax} suffices: H is affine in s and positive definiteness is a convex condition, and
lam_max(sym At_22) + ||At_21||_2 is a convex function of s):
 (C) cone:      H(s,k) = D At + At^T D  is positive definite  (Sylvester, interval leading minors),
                D = diag(1, -1, -1, -1);
 (E) entrance:  lam_max(sym At_22) + ||At_21||_2 < 0, certified as positive definiteness (interval
                Sylvester minors) of -sym(At_22) - f I with f an upper bound of ||At_21||_F >= ||At_21||_2.
                (The Gershgorin bound of the gain-20 code is only reported; it fails at |U| <= 0.02.)
Block B = { |y1| <= r, |y'|_2 <= rho }, r > rho, whose U-range lies in I_U.
Consequences (block lemma, see REPORT.md): dL/dxi = y^T H(s~) y > 0 on B minus x*; the cones
K+ = {L > 0, y1 > 0} and K- = {L > 0, y1 < 0} are forward invariant while the orbit is in B; every
boundary point of B with L <= 0 lies on the face |y'| = rho with |y1| <= rho and is a strict entrance
point by (E); an orbit that stays in B for all xi >= xi0 converges to x*.
"""
import json
import numpy as np
from flint import arb, arb_mat, ctx, fmpq
import nfcore as nf
import certify_rest as cr

ctx.prec = 256


def exact_matrix(Mf):
    """Store a float matrix exactly (dyadic) as arb_mat."""
    return arb_mat([[arb(float(v)) for v in row] for row in Mf])


def A4(s, kappa, eps):
    k = kappa
    return arb_mat([[-k, -k, k, 0], [eps * k, 0, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]])


def _floats():
    beta = float(nf._BETA.p) / float(nf._BETA.q)
    th = float(nf._THETA.p) / float(nf._THETA.q)
    eps = float(nf._EPS.p) / float(nf._EPS.q)
    S = lambda u: 1 / (1 + np.exp(-beta * (u - th)))
    dS = lambda u: beta * S(u) * (1 - S(u))
    return beta, th, eps, dS


def lyapunov(A, W):
    """P with A^T P + P A = -W (Kronecker form, floating point)."""
    n = A.shape[0]
    I = np.eye(n)
    M = np.kron(I, A.T) + np.kron(A.T, I)
    P = np.linalg.solve(M, -W.reshape(-1)).reshape(n, n)
    return (P + P.T) / 2


def real_jordan_basis(Af):
    w, V = np.linalg.eig(Af)
    real = [i for i in range(4) if abs(w[i].imag) < 1e-12]
    cplx = [i for i in range(4) if w[i].imag > 1e-12]
    iu = [i for i in real if w[i].real > 0]
    i1 = [i for i in real if w[i].real < 0]
    assert len(iu) == 1 and len(i1) == 1 and len(cplx) == 1, w
    iu, i1, ic = iu[0], i1[0], cplx[0]
    return np.column_stack([V[:, iu].real, V[:, i1].real, V[:, ic].real, V[:, ic].imag]), w


def setup(du=1.0, W=(1.0, 1.0, 1.0), s_base=None, c_ref=None):
    beta, th, eps, dS = _floats()
    c = cr.C_REF if c_ref is None else c_ref
    k = 1 / c
    s0 = dS(0.0) if s_base is None else s_base
    Af = np.array([[-k, -k, k, 0], [eps * k, 0, 0, 0], [0, 0, 0, 1], [-s0, 0, 1, 0]])
    V, w = real_jordan_basis(Af)
    Vinv = np.linalg.inv(V)
    J = Vinv @ Af @ V
    Js = J[1:, 1:]
    P = lyapunov(Js, np.diag(W))
    R = np.linalg.cholesky(P).T          # P = R^T R
    Tf = np.zeros((4, 4))
    Tf[0, :] = du * Vinv[0, :]
    Tf[1:, :] = R @ Vinv[1:, :]
    T = exact_matrix(Tf)                  # exact dyadic entries: T is what it is, no error
    Tinv = T.inv()                        # enclosure of the exact inverse
    return T, Tinv


def setup_gain20_style(d=(1, 0.5, 0.25, 0.25)):
    """The gain-20 construction (real parts of the eigenvectors, no Lyapunov form), kept as a negative
    control: with a complex pair its two middle columns coincide and T cannot be formed."""
    beta, th, eps, dS = _floats()
    k = 1 / cr.C_REF
    s0 = dS(0.0)
    Af = np.array([[-k, -k, k, 0], [eps * k, 0, 0, 0], [0, 0, 0, 1], [-s0, 0, 1, 0]])
    w, V = np.linalg.eig(Af)
    idx = np.argsort(-w.real)
    V = V[:, idx].real
    Tf = np.diag(d) @ np.linalg.inv(V)
    T = exact_matrix(Tf)
    return T, T.inv()


def interval_pd(H):
    """All symmetric matrices in the interval matrix H are positive definite if all leading principal
    minors (evaluated in ball arithmetic) are > 0."""
    n = H.nrows()
    for m in range(1, n + 1):
        sub = arb_mat([[H[i, j] for j in range(m)] for i in range(m)])
        if not (sub.det() > 0):
            return False, m
    return True, n


def check(T, Tinv, UI, kappa):
    beta, th, eps, gam = nf.params()
    smin = nf.dS(arb(UI[0]))
    smax = nf.dS(arb(UI[1]))
    # S'' = beta^2 S (1 - S)(1 - 2 S) > 0 for u < theta, so S' is increasing on (-inf, theta)
    assert arb(UI[1]) < th
    D = arb_mat([[1, 0, 0, 0], [0, -1, 0, 0], [0, 0, -1, 0], [0, 0, 0, -1]])
    out = {'smin': smin.str(10), 'smax': smax.str(10)}
    okC = okE = True
    margins = []
    for s in (smin, smax):
        At = T * A4(s, kappa, eps) * Tinv
        H = D * At + At.transpose() * D
        pd, m = interval_pd(H)
        okC &= pd
        # entrance: lam_max(sym At_22) + ||At_21||_2 < 0, certified as positive definiteness of
        # -sym(At_22) - f I with f an upper bound of the Frobenius norm of At_21 (>= its 2-norm)
        S22 = arb_mat([[(At[i, j] + At[j, i]) / 2 for j in range(1, 4)] for i in range(1, 4)])
        fro = arb(sum((At[i, 0] ** 2 for i in range(1, 4)), arb(0)).sqrt().upper())
        Mneg = arb_mat([[-S22[i, j] - (fro if i == j else 0) for j in range(3)] for i in range(3)])
        pdE, _ = interval_pd(Mneg)
        # for the record: the (looser) Gershgorin bound of the gain-20 code
        gmax = None
        for i in range(3):
            rad = sum((arb(S22[i, j].abs_upper()) for j in range(3) if j != i), arb(0))
            ub = S22[i, i] + rad
            gmax = ub if gmax is None else gmax.max(ub)
        margins.append({'sylvester_pd': pdE, 'gershgorin+fro': (gmax + fro).str(8)})
        okE &= pdE
    out['cone_pd'] = okC
    out['entrance'] = margins
    out['entrance_ok'] = okE
    return okC and okE, out


def u_range(Tinv, r, rho):
    """|U - U0| <= |Tinv[0,0]| r + ||Tinv[0,1:]||_2 rho."""
    a = arb(Tinv[0, 0].abs_upper())
    b = sum((Tinv[0, j] ** 2 for j in range(1, 4)), arb(0)).sqrt()
    return a * r + arb(b.upper()) * rho


BLOCK_DU = '0.02'


if __name__ == '__main__':
    T, Tinv = setup()
    kappa = (1 / cr.C1).union(1 / cr.C2)
    res = {'params': nf.PARAMS_TXT, 'c1': cr.C1.str(30), 'c2': cr.C2.str(30)}
    for dU in ('0.01', BLOCK_DU):
        UI = (arb('-' + dU), arb(dU))
        ok, info = check(T, Tinv, UI, kappa)
        rho = arb(1)
        while not (u_range(Tinv, rho * arb('4'), rho) < arb(dU)):
            rho = rho * arb('0.95')
        info['rho(r=4rho)'] = rho.str(8)
        info['U_range_bound'] = u_range(Tinv, rho * arb('4'), rho).str(8)
        res['dU=' + dU] = info
        print('dU', dU, 'CERTIFIED' if ok else 'FAILED', json.dumps(info))
    # negative control 1: the old block size |U| <= 0.05 (divided differences of S' in [0.31, 0.92]) must fail
    ok, info = check(T, Tinv, (arb('-0.05'), arb('0.05')), kappa)
    res['negative_dU_0.05'] = info
    print('NEGATIVE CONTROL dU = 0.05:', 'CERTIFIED (BAD)' if ok else 'fails as expected', json.dumps(info))
    # negative control 2: U up to 0.15 must fail
    ok, info = check(T, Tinv, (arb('-0.05'), arb('0.15')), kappa)
    res['negative_U_to_0.15'] = info
    print('NEGATIVE CONTROL U in [-0.05, 0.15]:', 'CERTIFIED (BAD)' if ok else 'fails as expected', json.dumps(info))
    # negative control 3: the gain-20 construction (real parts of complex eigenvectors) must fail
    try:
        T2, T2inv = setup_gain20_style()
        ok, info = check(T2, T2inv, (arb('-' + BLOCK_DU), arb(BLOCK_DU)), kappa)
        msg = 'CERTIFIED (BAD)' if ok else 'fails as expected'
    except Exception as e:           # singular matrix
        ok, msg = False, 'fails as expected (%s: %s)' % (type(e).__name__, e)
    print('NEGATIVE CONTROL gain-20 block construction:', msg)
    res['negative_gain20_construction'] = msg
    Tl = [[float(T[i, j].mid()) for j in range(4)] for i in range(4)]
    res['T'] = Tl
    res['block_dU'] = BLOCK_DU
    json.dump(res, open('../data/block_certificate.json', 'w'), indent=1)
