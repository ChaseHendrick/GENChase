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
different library from python-flint: same T (exact dyadic floats), inverse enclosed by interval
Gauss-Jordan, cone condition by interval Cholesky, entrance condition by Gershgorin + Frobenius."""
import json, mpmath
from mpmath import iv
iv.dps = 60
res = json.load(open('../data/block_certificate.json'))
Tf = res['T']
T = [[iv.mpf(v) for v in row] for row in Tf]

def inv(M):
    n = len(M); A = [row[:] + [iv.mpf(1 if i == j else 0) for j in range(n)] for i, row in enumerate(M)]
    # Gauss-Jordan without pivot search on a well-conditioned matrix (pivots checked nonzero)
    for c in range(n):
        p = A[c][c]
        if 0 in p:
            raise SystemExit('FAILED: pivot contains 0')
        A[c] = [x / p for x in A[c]]
        for r in range(n):
            if r != c:
                f = A[r][c]
                A[r] = [A[r][j] - f * A[c][j] for j in range(2 * n)]
    return [row[n:] for row in A]

def mm(A, B):
    return [[sum((A[i][k] * B[k][j] for k in range(len(B))), iv.mpf(0)) for j in range(len(B[0]))] for i in range(len(A))]

Ti = inv(T)
S = lambda u: 1 / (1 + iv.exp(-20 * (u - iv.mpf(1) / 4)))
dS = lambda u: 20 * S(u) * (1 - S(u))
c1 = iv.mpf('1.1027477097341592491478677'); c2 = iv.mpf('1.1027477097341592491478678')
k = iv.mpf([(1 / c2).a, (1 / c1).b]); eps = iv.mpf(1) / 10
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

# The parameters are typed here independently of nfcore.py; stop if the two ever disagree.
from fractions import Fraction
import nfcore as nf, certify_rest as cr
same = (Fraction(str(nf._BETA)) == 20 and Fraction(str(nf._THETA)) == Fraction(1, 4) and
        Fraction(str(nf._EPS)) == Fraction(1, 10) and Fraction(str(nf._GAMMA)) == 0 and
        cr.C1.mid().str(40, radius=False).startswith('1.1027477097341592491478677') and
        cr.C2.mid().str(40, radius=False).startswith('1.1027477097341592491478678'))
print('parameters agree with nfcore.py and certify_rest.py:', same)

# U-range of the block the proof uses, B = {|y1| <= r, |y'| <= rho}: it must lie inside |U| < 0.05, where the
# range of S' used below is valid, and r > rho.
blk = res['dU=0.05']
m, e = blk['rho_mantissa_exponent']
rho = iv.mpf(m) * iv.mpf(2) ** e        # the exact rho of the proof (an enclosure of it at 60 digits)
r = iv.mpf(blk['r_over_rho']) * rho
ur = abs(Ti[0][0]) * r + iv.sqrt(sum((Ti[0][j] ** 2 for j in range(1, 4)), iv.mpf(0))) * rho
urange_ok = bool(ur.b < iv.mpf('0.05').a) and bool(r.a > rho.b)
print('block rho = %s, r = %s, U-range bound %s < 0.05 and r > rho: %s' % (blk['rho'], blk['r'], mpmath.nstr(ur.b, 10), urange_ok))

for dU in ('0.05', '0.03'):
    ok = True; out = []
    for s in (dS(-iv.mpf(dU)), dS(iv.mpf(dU))):
        At = mm(mm(T, A4(s)), Ti)
        H = [[D[i] * At[i][j] + At[j][i] * D[j] for j in range(4)] for i in range(4)]
        # symmetrise the interval matrix (the true H is symmetric; hull of both entries is valid)
        Hs = [[iv.mpf([min(H[i][j].a, H[j][i].a), max(H[i][j].b, H[j][i].b)]) for j in range(4)] for i in range(4)]
        pd = chol_pd(Hs)
        S22 = [[(At[i][j] + At[j][i]) / 2 for j in range(1, 4)] for i in range(1, 4)]
        g = max((S22[i][i] + sum((abs(S22[i][j]) for j in range(3) if j != i), iv.mpf(0))).b for i in range(3))
        fro = iv.sqrt(sum((At[i][0] ** 2 for i in range(1, 4)), iv.mpf(0))).b
        ent = g + fro
        ok &= pd and ent < 0
        out.append((pd, mpmath.nstr(ent, 8)))
    if dU == '0.05':
        ok = ok and same and urange_ok
    print('dU', dU, 'cone PD (interval Cholesky), entrance upper bounds:', out, '->', 'CERTIFIED' if ok else 'FAILED')
