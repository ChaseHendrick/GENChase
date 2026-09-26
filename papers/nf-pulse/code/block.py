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
"""Isolating block with a cone (Lyapunov-form) condition at the rest state x* of the 4D wave ODE.

For two points x1, x2 with U-coordinates in an interval I_U, the mean value theorem gives
    F(x1) - F(x2) = A(s, kappa) (x1 - x2),   s = (S(U1) - S(U2))/(U1 - U2) in S'(I_U) =: [smin, smax],
    A(s, kappa) = [[-k, -k, k, 0], [eps k, 0, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]]     (gamma = 0).
Coordinates y = T (x - x*), T = diag(d) Vinv with Vinv an (approximate, exactly stored) inverse of an
eigenvector matrix of A(s0).  L(z) = z^T M z with M = T^T diag(1,-1,-1,-1) T, i.e. L = y1^2 - |y'|^2.

Certified conditions (interval matrices; kappa ranges over the whole ball [1/c2, 1/c1]). Checking s only at
{smin, smax} suffices: H(s, kappa) is affine in s and the positive definite matrices form a convex cone, and
the entrance bound below is convex in s (a maximum of affine functions plus a Euclidean norm of a vector
affine in s), so its maximum over [smin, smax] is attained at an end:
 (C) cone:      H(s,k) = D At + At^T D  is positive definite  (Sylvester, interval leading minors);
 (E) entrance:  lam_max(sym At_22) + ||At_21||_2 < 0, bounded by  -min eig(-sym At_22)  via Gershgorin
                and ||At_21||_2 <= Frobenius norm.
Block B = { |y1| <= r, |y'|_2 <= rho }, r > rho, whose U-range lies in I_U.
Consequences (proofs in review/lead/math/MATH.md, Sect. 5): L strictly increases along orbits while they
are in B; K+ = {L > 0, y1 > 0} and K- = {L > 0, y1 < 0} cannot be left while the orbit stays in B (they are
not claimed forward invariant for all time, and B is not claimed isolating: the flow on the face |y1| = r
is not checked); every boundary point of B with L <= 0 is a strict entrance point, so an orbit can leave B
only from a cone; an orbit that stays in B forever converges to x*.
"""
import json
import numpy as np
from flint import arb, arb_mat, ctx, fmpq
import nfcore as nf
import certify_rest as cr

ctx.prec = 256

DU_PROOF = '0.05'        # U-range half width of the block the proof uses (prove_pulse.py)
R_OVER_RHO_PROOF = '4'   # r / rho of that block


def exact_matrix(Mf):
    """Store a float matrix exactly (dyadic) as arb_mat."""
    return arb_mat([[arb(float(v)) for v in row] for row in Mf])


def A4(s, kappa, eps):
    k = kappa
    return arb_mat([[-k, -k, k, 0], [eps * k, 0, 0, 0], [0, 0, 0, 1], [-s, 0, 1, 0]])


def setup(d=(1, 0.5, 0.25, 0.25)):
    c = cr.C_REF
    k = 1 / c
    s0 = 20 * (1 / (1 + np.exp(5))) * (1 - 1 / (1 + np.exp(5)))
    Af = np.array([[-k, -k, k, 0], [0.1 * k, 0, 0, 0], [0, 0, 0, 1], [-s0, 0, 1, 0]])
    w, V = np.linalg.eig(Af)
    idx = np.argsort(-w.real)
    V = V[:, idx].real
    if V[0, 0] < 0:                       # orient y1 so that K+ is the side where U > 0 on every LAPACK
        V[:, 0] = -V[:, 0]
    Tf = np.diag(d) @ np.linalg.inv(V)
    T = exact_matrix(Tf)                  # exact dyadic entries: T is what it is, no error
    Tinv = T.inv()                        # enclosure of the exact inverse
    return T, Tinv


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
    # S' is increasing on (-inf, theta); both ends below theta = 1/4
    nf.require(bool(arb(UI[1]) < th), 'the U-range must lie below theta, where S\' is increasing')
    D = arb_mat([[1, 0, 0, 0], [0, -1, 0, 0], [0, 0, -1, 0], [0, 0, 0, -1]])
    out = {'smin': smin.str(10), 'smax': smax.str(10)}
    okC = okE = True
    margins = []
    for s in (smin, smax):
        At = T * A4(s, kappa, eps) * Tinv
        H = D * At + At.transpose() * D
        pd, m = interval_pd(H)
        okC &= pd
        # entrance: Gershgorin upper bound of lam_max(sym A22) plus Frobenius norm of A21
        S22 = [[(At[i, j] + At[j, i]) / 2 for j in range(1, 4)] for i in range(1, 4)]
        gmax = None
        for i in range(3):
            rad = sum((arb(S22[i][j].abs_upper()) for j in range(3) if j != i), arb(0))
            ub = S22[i][i] + rad
            gmax = ub if gmax is None else gmax.max(ub)
        fro = sum((At[i, 0] ** 2 for i in range(1, 4)), arb(0)).sqrt()
        e = gmax + fro
        margins.append(e.str(8))
        okE &= bool(e < 0)
    out['cone_pd'] = okC
    out['entrance_margins(<0 needed)'] = margins
    out['entrance_ok'] = okE
    return okC and okE, out


def proof_block(T, Tinv, DU, r_over_rho):
    """The block the proof uses: rho = largest value of the form 0.95^k (rounded to its midpoint) with the
    U-range of B = {|y1| <= r, |y'| <= rho}, r = r_over_rho * rho, strictly inside (-DU, DU)."""
    nf.require(bool(r_over_rho > 1), 'the block needs r > rho (r_over_rho = %s)' % r_over_rho.str(5))
    rho = arb(1)
    while not (u_range(Tinv, rho * r_over_rho, rho) < DU):
        rho = rho * arb('0.95')
    rho = arb(rho.mid())
    r = rho * r_over_rho
    ur = u_range(Tinv, r, rho)
    nf.require(bool(ur < DU), 'the U-range of B is not inside (-DU, DU)')
    nf.require(bool(r > rho), 'r > rho fails')
    return rho, r, ur


def u_range(Tinv, r, rho):
    """|U - U0| <= |Tinv[0,0]| r + ||Tinv[0,1:]||_2 rho."""
    a = arb(Tinv[0, 0].abs_upper())
    b = sum((Tinv[0, j] ** 2 for j in range(1, 4)), arb(0)).sqrt()
    return a * r + arb(b.upper()) * rho


if __name__ == '__main__':
    T, Tinv = setup()
    kappa = (1 / cr.C1).union(1 / cr.C2)
    res = {}
    # the block the proof uses (prove_pulse.py): |U| < 0.05 on B, r = 4 rho
    for dU in (DU_PROOF,):
        UI = (arb('-' + dU), arb(dU))
        ok, info = check(T, Tinv, UI, kappa)
        rho, r, ur = proof_block(T, Tinv, arb(dU), arb(R_OVER_RHO_PROOF))
        info['r_over_rho'] = R_OVER_RHO_PROOF
        info['rho'] = rho.mid().str(30, radius=False)       # exact: rho is a midpoint
        info['r'] = r.mid().str(30, radius=False)
        m, e = rho.man_exp()                                # rho = m 2^e exactly, for the re-check
        info['rho_mantissa_exponent'] = [int(m), int(e)]
        info['U_range_bound'] = ur.str(10)
        res['dU=' + dU] = info
        print('dU', dU, 'CERTIFIED' if ok else 'FAILED', json.dumps(info))
    # negative control: a block reaching up to U = 0.15 (S' up to ~2.7 > 1) must fail
    ok, info = check(T, Tinv, (arb('-0.05'), arb('0.15')), kappa)
    res['negative_U_to_0.15'] = info
    print('NEGATIVE CONTROL U in [-0.05, 0.15]:', 'CERTIFIED (BAD)' if ok else 'fails as expected', json.dumps(info))
    Tl = [[float(T[i, j].mid()) for j in range(4)] for i in range(4)]
    res['T'] = Tl
    json.dump(res, open('../data/block_certificate%s.json' % ('' if cr.PULSE == 'fast' else '_slow'), 'w'), indent=1)
