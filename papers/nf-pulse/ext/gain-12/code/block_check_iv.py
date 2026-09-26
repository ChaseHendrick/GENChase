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
"""Independent re-check of the block certificate with mpmath's interval arithmetic (mpmath.iv), a
different library from python-flint: same T (exact dyadic floats from data/block_certificate.json),
inverse enclosed by interval Gauss-Jordan, cone condition (C) by interval Cholesky, entrance
condition (E) by interval Cholesky of -sym(At_22) - f I with f an upper bound of ||At_21||_F.
Parameters: beta = 12, theta = 1/4, eps = 3/20, gamma = 0, c in [c1, c2] from bracket.py."""
import json, mpmath
from mpmath import iv
import bracket as br
iv.dps = 60
res = json.load(open('../data/block_certificate.json'))
Tf = res['T']
T = [[iv.mpf(v) for v in row] for row in Tf]


def inv(M):
    n = len(M); A = [row[:] + [iv.mpf(1 if i == j else 0) for j in range(n)] for i, row in enumerate(M)]
    # Gauss-Jordan without pivot search on a well-conditioned matrix (pivots checked nonzero)
    for c in range(n):
        p = A[c][c]
        assert not (0 in p), 'pivot contains 0'
        A[c] = [x / p for x in A[c]]
        for r in range(n):
            if r != c:
                f = A[r][c]
                A[r] = [A[r][j] - f * A[c][j] for j in range(2 * n)]
    return [row[n:] for row in A]


def mm(A, B):
    return [[sum((A[i][k] * B[k][j] for k in range(len(B))), iv.mpf(0)) for j in range(len(B[0]))] for i in range(len(A))]


Ti = inv(T)
BETA = iv.mpf(12); THETA = iv.mpf(1) / 4; eps = iv.mpf(3) / 20
S = lambda u: 1 / (1 + iv.exp(-BETA * (u - THETA)))
dS = lambda u: BETA * S(u) * (1 - S(u))
c1 = iv.mpf(br.C1_NUM) / br.C_DEN; c2 = iv.mpf(br.C2_NUM) / br.C_DEN
k = iv.mpf([(1 / c2).a, (1 / c1).b])


def A4(s):
    return [[-k, -k, k, iv.mpf(0)], [eps * k, iv.mpf(0), iv.mpf(0), iv.mpf(0)], [iv.mpf(0)] * 3 + [iv.mpf(1)], [-s, iv.mpf(0), iv.mpf(1), iv.mpf(0)]]


D = [1, -1, -1, -1]


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


for dU in ('0.01', res['block_dU'], '0.05'):
    ok = True; out = []
    for s in (dS(-iv.mpf(dU)), dS(iv.mpf(dU))):
        At = mm(mm(T, A4(s)), Ti)
        H = [[D[i] * At[i][j] + At[j][i] * D[j] for j in range(4)] for i in range(4)]
        pd = chol_pd(sym_hull(H))
        fro = iv.mpf(iv.sqrt(sum((At[i][0] ** 2 for i in range(1, 4)), iv.mpf(0))).b)
        M = [[-(At[i][j] + At[j][i]) / 2 - (fro if i == j else 0) for j in range(1, 4)] for i in range(1, 4)]
        ent = chol_pd(sym_hull(M))
        ok &= pd and ent
        out.append((pd, ent))
    print('dU', dU, 'cone PD, entrance PD (interval Cholesky):', out, '->', 'CERTIFIED' if ok else 'FAILED')
