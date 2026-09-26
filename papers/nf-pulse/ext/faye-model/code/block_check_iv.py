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
"""Independent re-check of the block certificate with mpmath's interval arithmetic (mpmath.iv), a different library
from python-flint, and none of the model code: the rest state by interval bisection, T read as exact floats from
the certificate, its inverse by interval Gauss-Jordan, the (a, S) rectangle from the block extents, the cone
condition by interval Cholesky, and the entrance condition by an interval Cholesky of t I - sym M_22 plus the
Frobenius norm of M_21.  usage: FAYE_EPS=1/20 python3 block_check_iv.py"""
import json, os
import numpy as np
import mpmath
from mpmath import iv
iv.dps = 60
EPS = os.environ.get('FAYE_EPS', '1/20')
res = json.load(open('../data/block_certificate_eps%s.json' % EPS.replace('/', '_')))
T = [[iv.mpf(v) for v in row] for row in res['T']]
num, den = [int(t) for t in EPS.split('/')]
eps = iv.mpf(num) / den
lam, kap, beta, b = iv.mpf(20), iv.mpf(11) / 50, iv.mpf(5), iv.mpf(9) / 2
S = lambda u: 1 / (1 + iv.exp(-lam * (u - kap)))
dS = lambda u: lam * S(u) * (1 - S(u))
F = lambda u: u * (1 + beta * S(u)) - S(u)
lo, hi = iv.mpf(0), iv.mpf('0.1')
assert F(lo).b < 0 and F(hi).a > 0
for _ in range(150):
    m = iv.mpf((lo + hi).mid / 2)
    f = F(m)
    if f.b < 0:
        lo = m
    elif f.a > 0:
        hi = m
    else:
        break
u0 = iv.mpf([lo.a, hi.b]); q0 = 1 / (1 + beta * S(u0))


def inv(M):
    n = len(M); A = [row[:] + [iv.mpf(1 if i == j else 0) for j in range(n)] for i, row in enumerate(M)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(A[r][c].mid))
        A[c], A[p] = A[p], A[c]
        piv = A[c][c]
        assert not (0 in piv), 'pivot contains 0'
        A[c] = [x / piv for x in A[c]]
        for r in range(n):
            if r != c:
                f = A[r][c]
                A[r] = [A[r][j] - f * A[c][j] for j in range(2 * n)]
    return [row[n:] for row in A]


def mm(A, B):
    return [[sum((A[i][k] * B[k][j] for k in range(len(B))), iv.mpf(0)) for j in range(len(B[0]))] for i in range(len(A))]


def chol_pd(H):
    n = len(H); L = [[iv.mpf(0)] * n for _ in range(n)]
    for j in range(n):
        d = H[j][j] - sum((L[j][k] ** 2 for k in range(j)), iv.mpf(0))
        if not (d.a > 0):
            return False
        L[j][j] = iv.sqrt(d)
        for i in range(j + 1, n):
            L[i][j] = (H[i][j] - sum((L[i][k] * L[j][k] for k in range(j)), iv.mpf(0))) / L[j][j]
    return True


def sym_hull(H):
    n = len(H)
    return [[iv.mpf([min(H[i][j].a, H[j][i].a), max(H[i][j].b, H[j][i].b)]) for j in range(n)] for i in range(n)]


Ti = inv(T)
rho = iv.mpf(1); r = iv.mpf(res['r_over_rho'])
assert r.a > rho.b, 'the block lemma needs r > rho'
ext = [abs(Ti[i][0]) * r + iv.sqrt(sum((Ti[i][j] ** 2 for j in range(1, 4)), iv.mpf(0))) * rho for i in range(4)]
umin, umax = (u0 - ext[0]).a, (u0 + ext[0]).b
qmin, qmax = (q0 - ext[3]).a, (q0 + ext[3]).b
assert umax < kap.a and qmin > 0
amin, amax = (qmin * dS(iv.mpf(umin))).a, (qmax * dS(iv.mpf(umax))).b
smin, smax = S(iv.mpf(umin)).a, S(iv.mpf(umax)).b
c1, c2 = iv.mpf(res['c1']), iv.mpf(res['c2'])
k = iv.mpf([(1 / c2).a, (1 / c1).b])
D = [1, -1, -1, -1]
ok = True; out = []
for a in (amin, amax):
    for sg in (smin, smax):
        a_, s_ = iv.mpf(a), iv.mpf(sg)
        A = [[-k, k, iv.mpf(0), iv.mpf(0)], [iv.mpf(0), iv.mpf(0), iv.mpf(1), iv.mpf(0)],
             [-b * b * a_, b * b, iv.mpf(0), -b * b * s_], [-eps * k * beta * a_, iv.mpf(0), iv.mpf(0), -eps * k * (1 + beta * s_)]]
        M = mm(mm(T, A), Ti)
        H = [[D[i] * M[i][j] + M[j][i] * D[j] for j in range(4)] for i in range(4)]
        pd = chol_pd(sym_hull(H))
        S22 = [[(M[i][j] + M[j][i]) / 2 for j in range(1, 4)] for i in range(1, 4)]
        t = float(np.linalg.eigvalsh(np.array([[float(S22[i][j].mid) for j in range(3)] for i in range(3)])).max()) + 1e-6
        tpd = chol_pd(sym_hull([[(iv.mpf(t) if i == j else iv.mpf(0)) - S22[i][j] for j in range(3)] for i in range(3)]))
        fro = iv.sqrt(sum((M[i][0] ** 2 for i in range(1, 4)), iv.mpf(0))).b
        ent = (iv.mpf(t) + fro).b if tpd else mpmath.inf
        ok &= pd and ent < 0
        out.append((pd, '%.6g' % float(ent.mid if hasattr(ent, 'mid') else ent)))
print('eps', EPS, 'u-range [%.8f, %.8f], q-range [%.8f, %.8f]' % (float(umin.mid), float(umax.mid), float(qmin.mid), float(qmax.mid)))
print('corners (cone PD by interval Cholesky, entrance upper bound < 0 needed):', out)
print('INDEPENDENT BLOCK CHECK', 'CERTIFIED' if ok else 'FAILED')
