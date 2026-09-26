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
"""Isolating block with cones at the rest state x* of the 4D wave ODE of Faye's model.

x = (u, v, w, q), F(x) = (k (v - u), w, b^2 (v - q S(u)), eps k (1 - q - beta q S(u))).  The Jacobian
    DF(x) = [[-k, k, 0, 0], [0, 0, 1, 0], [-b^2 a, b^2, 0, -b^2 sg], [-eps k beta a, 0, 0, -eps k (1 + beta sg)]]
depends on x only through a = q S'(u) and sg = S(u), and for fixed k it is affine in (a, sg).
Coordinates y = T (x - x*), T = diag(d) Vinv, Vinv an approximate inverse eigenvector matrix of DF at a reference
point and speed (config.py), stored exactly (dyadic).  L(y) = y1^2 - |y'|^2, y' = (y2, y3, y4).  Block B = {|y1| <= r, |y'|_2 <= rho}.

For x in B, F(x) - F(x*) = Abar (x - x*) with Abar the mean of DF on the segment [x*, x], so Abar = DF(abar, sgbar)
with (abar, sgbar) in the rectangle R = [amin, amax] x [smin, smax] of values over B (u-range below the
threshold kap, where S and S' increase; q-range positive).  With M = T Abar T^{-1}:
 (C) cone:      H = D M + M^T D (D = diag(1, -1, -1, -1)) positive definite;
 (E) entrance:  lam_max(sym M_22) + ||M_21||_2 < 0.
Both are convex conditions in M and M is affine in (a, sg), so it suffices to check them at the 4 corners of R,
for all kappa in its ball (interval arithmetic).  (C) is checked by Sylvester's criterion on interval leading
minors; (E) with a bound t for lam_max certified by t I - sym M_22 > 0 (Sylvester) and the Frobenius norm for ||M_21||_2.
Consequences (proved in REPORT.md): dL/dxi > 0 along orbits in B \\ {x*}; boundary points of B with L <= 0
are strict entrance points; an orbit that stays in B for all later xi converges to x*.
"""
import json, os
import numpy as np
from flint import arb, arb_mat, ctx, fmpq
import fcore as fc

import config as cf


def exact_matrix(Mf):
    return arb_mat([[arb(float(v)) for v in row] for row in Mf])


def DF4(k, a, sg):
    lam, kap, beta, b, eps = fc.params()
    b2 = b * b
    return arb_mat([[-k, k, 0, 0], [0, 0, 1, 0], [-b2 * a, b2, 0, -b2 * sg],
                    [-eps * k * beta * a, 0, 0, -eps * k * (1 + beta * sg)]])


def setup(shape):
    """T = diag(d) Vinv from float eigenvectors of DF(a_ref, s_ref) at c_ref (default: the rest state), stored with
    exact dyadic entries, and a ball enclosure of T^{-1}."""
    lam, kap, beta, b, eps = [float(z.mid()) for z in fc.params()]
    x = fc.rest_state()
    u0, q0 = float(x[0].mid()), float(x[3].mid())
    Sf = lambda u: 1 / (1 + np.exp(-lam * (u - kap)))
    k = 1 / shape['c_ref']
    a0 = q0 * lam * Sf(u0) * (1 - Sf(u0)) if shape.get('a_ref') is None else shape['a_ref']
    s0 = Sf(u0) if shape.get('s_ref') is None else shape['s_ref']
    Af = np.array([[-k, k, 0, 0], [0, 0, 1, 0], [-b * b * a0, b * b, 0, -b * b * s0],
                   [-eps * k * beta * a0, 0, 0, -eps * k * (1 + beta * s0)]])
    w, V = np.linalg.eig(Af)
    idx = np.argsort(-w.real)
    V = V[:, idx].real
    V = V / np.sign(V[0, :])          # orientation: u-component of each column positive
    Tf = np.diag(shape['d']) @ np.linalg.inv(V)
    T = exact_matrix(Tf)
    Tinv = T.inv()
    return T, Tinv


def extents(Tinv, r, rho):
    """|x_i - x*_i| <= |Tinv[i,0]| r + ||Tinv[i,1:]||_2 rho over B."""
    out = []
    for i in range(4):
        a = arb(Tinv[i, 0].abs_upper())
        bb = sum((Tinv[i, j] ** 2 for j in range(1, 4)), arb(0)).sqrt()
        out.append(arb((a * r + arb(bb.upper()) * rho).upper()))
    return out


def interval_pd(H):
    n = H.nrows()
    for m in range(1, n + 1):
        sub = arb_mat([[H[i, j] for j in range(m)] for i in range(m)])
        if not (sub.det() > 0):
            return False, m
    return True, n


def check(T, Tinv, r, rho, kappa):
    """Certify (C) and (E) on B = {|y1| <= r, |y'| <= rho} for all kappa in the ball kappa."""
    lam, kap, beta, b, eps = fc.params()
    if not (r > rho):                  # the block lemma needs r > rho (first-contact case |y1| = r)
        return False, {'ok': False, 'reason': 'r > rho fails'}
    x = fc.rest_state()
    ext = extents(Tinv, r, rho)
    umin, umax = x[0] - ext[0], x[0] + ext[0]
    qmin, qmax = x[3] - ext[3], x[3] + ext[3]
    umin, umax = arb(umin.lower()), arb(umax.upper())
    qmin, qmax = arb(qmin.lower()), arb(qmax.upper())
    info = {'u_range': [umin.str(8), umax.str(8)], 'q_range': [qmin.str(8), qmax.str(8)]}
    if not (umax < kap and qmin > 0):
        info['ok'] = False
        info['reason'] = 'u-range reaches the threshold or q-range reaches 0'
        return False, info
    # S and S' = lam S (1 - S) are increasing on (-inf, kap); q > 0
    amin = qmin * fc.dS(umin); amax = qmax * fc.dS(umax)
    smin = fc.S(umin); smax = fc.S(umax)
    amin, amax, smin, smax = arb(amin.lower()), arb(amax.upper()), arb(smin.lower()), arb(smax.upper())
    info['a_range'] = [amin.str(8), amax.str(8)]
    info['S_range'] = [smin.str(8), smax.str(8)]
    Dm = arb_mat([[1, 0, 0, 0], [0, -1, 0, 0], [0, 0, -1, 0], [0, 0, 0, -1]])
    okC = okE = True
    margins = []
    for a in (amin, amax):
        for sg in (smin, smax):
            M = T * DF4(kappa, a, sg) * Tinv
            H = Dm * M + M.transpose() * Dm
            pd, m = interval_pd(H)
            okC &= pd
            S22 = arb_mat([[(M[i, j] + M[j, i]) / 2 for j in range(1, 4)] for i in range(1, 4)])
            # certified upper bound t of lam_max(S22): t I - S22 positive definite (interval Sylvester);
            # t is a floating-point estimate plus a small margin, and only its certification matters.
            Sf = np.array([[float(S22[i, j].mid()) for j in range(3)] for i in range(3)])
            t = arb(float(np.linalg.eigvalsh(Sf).max()) + 1e-6)
            gmax = t if interval_pd(arb_mat([[(t if i == j else 0) - S22[i, j] for j in range(3)] for i in range(3)]))[0] else arb('inf')
            fro = sum((M[i, 0] ** 2 for i in range(1, 4)), arb(0)).sqrt()
            e = gmax + fro
            margins.append(e.str(6))
            okE &= bool(e < 0)
    info['cone_pd'] = okC
    info['entrance_margins(<0 needed)'] = margins
    info['entrance_ok'] = okE
    info['ok'] = okC and okE
    return okC and okE, info


def block_for(eps_txt, kappa, rho=None):
    shape = cf.get(eps_txt)['block']
    T, Tinv = setup(shape)
    rho = arb(1) if rho is None else rho
    r = rho * arb(shape['r_over_rho'])
    ok, info = check(T, Tinv, r, rho, kappa)
    return ok, info, T, Tinv, r, rho


if __name__ == '__main__':
    import sys
    ctx.prec = cf.get()['prec']
    import certify_rest as cr
    ctx.prec = cf.get()['prec']
    kappa = (1 / cr.C1).union(1 / cr.C2)
    ok, info, T, Tinv, r, rho = block_for(fc.eps_txt(), kappa)
    print('eps', fc.eps_txt(), 'block', 'CERTIFIED' if ok else 'FAILED', json.dumps(info))
    # negative control: the same shape scaled up by 1.5 must fail (u-range or cone conditions)
    ok2, info2 = check(T, Tinv, r * arb('1.5'), rho * arb('1.5'), kappa)
    print('NEGATIVE CONTROL block x1.5:', 'CERTIFIED (BAD)' if ok2 else 'fails as expected', json.dumps(info2))
    json.dump({'eps': fc.eps_txt(), 'main': info, 'negative_x1.5': info2, 'T': [[float(T[i, j].mid()) for j in range(4)] for i in range(4)],
               'r_over_rho': cf.get()['block']['r_over_rho'], 'c1': cf.get()['c1'], 'c2': cf.get()['c2']},
              open('../data/block_certificate_eps%s.json' % fc.eps_txt().replace('/', '_'), 'w'), indent=1)
