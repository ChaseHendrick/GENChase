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
"""Certified statements about the rest state of the wave ODE and its linearisation (ball arithmetic).

Statements checked here (all for beta = 20, theta = 1/4, eps = 1/10, gamma = 0):

 R1  The wave ODE has exactly one equilibrium, x* = (0, S(0), S(0), 0); S(0) = 1/(1 + e^5) is enclosed.
     (Algebraic: V' = 0 forces U = 0 when gamma = 0; then Q = S(0), P = 0, V = Q - U.)
 R2  s := S'(0) = 20 e^5/(1 + e^5)^2 is enclosed and s < 1 (rest state on the left branch).
 R3  For every c > 0 the characteristic polynomial
         p(l) = (l^2 + k l + eps k^2)(l^2 - 1) + s k l,     k = 1/c,
     (i) has exactly one positive root (Descartes, since s < 1),
     (ii) has no root on the imaginary axis,
     hence the number of roots in {Re l > 0} is independent of c; (iii) at c in the certified bracket
     [c1, c2] the four roots are real, simple and enclosed: one positive, three negative.
     Consequence: for every c > 0, dim W^u(x*) = 1 and dim W^s(x*) = 3.
 R4  Eigenvector of the unstable eigenvalue in closed form, with its residual enclosing 0.

Negative controls: the same code must REFUSE R2/R3 for a firing rate with S'(0) > 1 (theta = 0), and
must refuse a perturbed eigenvalue as an eigenvalue.
"""
import sys, json
from flint import arb, ctx, fmpq, arb_mat
import nfcore as nf

ctx.prec = 256

# bracket for the fast pulse speed, from the (non-rigorous) high-precision shooting in shoot_hp.py
import os
PULSE = os.environ.get('NF_PULSE', 'fast')
if PULSE == 'fast':
    C1 = arb(fmpq(11027477097341592491478677, 10**25))   # below c* by 3.6e-26 (numerically: escape into Q<0)
    C2 = arb(fmpq(11027477097341592491478678, 10**25))   # above c* by 6.4e-26 (numerically: escape into Q>1)
    C_REF = 1.1027477097341592
    SIDE_C1, SIDE_C2 = -1, +1                             # expected cone K- / K+ at the block
else:  # slow pulse
    C1 = arb(fmpq(3775288144231931360774251, 10**25))    # below c*_slow by 3.7e-26 (numerically: escape into Q>1)
    C2 = arb(fmpq(3775288144231931360774252, 10**25))    # above c*_slow by 6.3e-26 (numerically: escape into Q<0)
    C_REF = 0.37752881442319314
    SIDE_C1, SIDE_C2 = +1, -1


def charpoly_coeffs(kappa, s, eps):
    """p(l) = l^4 + k l^3 + (eps k^2 - 1) l^2 + k (s - 1) l - eps k^2  (gamma = 0)."""
    return [-eps * kappa * kappa, kappa * (s - 1), eps * kappa * kappa - 1, kappa, arb(1)]


def peval(co, l):
    r = co[-1]
    for a in reversed(co[:-1]):
        r = r * l + a
    return r


def sign(x):
    if x > 0:
        return 1
    if x < 0:
        return -1
    return 0   # undecided


def isolate_real_roots(co, grid):
    """Certified sign changes of p on a grid; returns intervals each containing a root."""
    vals = [sign(peval(co, g)) for g in grid]
    if 0 in vals:
        return None
    out = []
    for i in range(len(grid) - 1):
        if vals[i] != vals[i + 1]:
            out.append((grid[i], grid[i + 1]))
    return out


def refine(co, lo, hi, nit=400):
    """Bisection with certified signs; returns an enclosure [lo, hi] of the unique root."""
    slo = sign(peval(co, lo))
    for _ in range(nit):
        m = (lo + hi) / 2
        m = arb(m.mid())
        sm = sign(peval(co, m))
        if sm == 0:
            break
        if sm == slo:
            lo = m
        else:
            hi = m
    # rigour: the returned ball contains a root only if the end signs are certified and opposite
    s_lo, s_hi = sign(peval(co, lo)), sign(peval(co, hi))
    if not (s_lo != 0 and s_hi != 0 and s_lo == -s_hi):
        raise ArithmeticError('refine: end signs not certified (%d, %d)' % (s_lo, s_hi))
    return lo.union(hi)


def eigvec_unstable(lam, kappa, s, eps):
    # (1, eps k/l, -s/(l^2-1), -s l/(l^2-1), s): U-component normalised to 1; last entry is Y = S'(U0) U
    return [arb(1), eps * kappa / lam, -s / (lam * lam - 1), -s * lam / (lam * lam - 1), s]


def jac5(kappa, s, eps):
    k = kappa
    return [[-k, -k, k, 0, 0], [eps * k, 0, 0, 0, 0], [0, 0, 0, 1, 0], [0, 0, 1, 0, -1],
            [-s * k, -s * k, s * k, 0, 0]]


def certify(theta=None, c_lo=C1, c_hi=C2, verbose=True):
    beta, th, eps, gam = nf.params()
    if theta is not None:
        th = arb(theta)
    rep = {}
    nf.require(bool(gam == 0), 'certify assumes gamma = 0')
    # R1
    S0 = nf.S(arb(0), beta, th)
    rep['R1_rest'] = {'U0': '0', 'V0=Q0=S(0)': S0.str(40), 'P0': '0'}
    # R2
    s = nf.dS(arb(0), beta, th)
    rep['R2_s'] = s.str(40)
    ok_s = bool(s < 1)
    rep['R2_s_lt_1'] = ok_s
    if not ok_s:
        rep['R3'] = 'NOT CERTIFIED: s < 1 fails, Descartes argument unavailable'
        return False, rep
    # R3 (i) Descartes: coefficients signs for kappa > 0: +, +, ?, k(s-1) < 0, -eps k^2 < 0 -> one change.
    # (ii) p(i w) = (w^2 - eps k^2)(w^2 + 1) + i k w (s - 1 - w^2): the imaginary part vanishes only at w = 0
    #      because s - 1 < 0, and p(0) = -eps k^2 != 0.  Both hold for every kappa > 0 once s < 1.
    rep['R3_i_ii'] = 'proved symbolically given s<1 (checked above)'
    # (iii) roots at kappa in [1/c_hi, 1/c_lo]
    kappa = (1 / c_lo).union(1 / c_hi)
    co = charpoly_coeffs(kappa, s, eps)
    grid = [arb(x) for x in ('-3', '-1', '-0.4', '-0.05', '0', '0.5', '1.2')]
    iv = isolate_real_roots(co, grid)
    if iv is None or len(iv) != 4:
        rep['R3_iii'] = 'NOT CERTIFIED: found %s sign changes' % (None if iv is None else len(iv))
        return False, rep
    roots = [refine(co, lo, hi) for lo, hi in iv]
    rep['R3_iii_roots'] = [r.str(30) for r in roots]
    npos = sum(1 for r in roots if r > 0)
    nneg = sum(1 for r in roots if r < 0)
    rep['R3_iii_count'] = {'positive': npos, 'negative': nneg}
    if not (npos == 1 and nneg == 3):
        return False, rep
    lam = roots[-1]
    # R4 eigenvector residual  (A - lam I) v  must contain 0 componentwise
    v = eigvec_unstable(lam, kappa, s, eps)
    A = jac5(kappa, s, eps)
    res = [sum((A[i][j] * v[j] for j in range(5)), arb(0)) - lam * v[i] for i in range(5)]
    rep['R4_eigvec'] = [x.str(20) for x in v]
    rep['R4_residual_contains_0'] = all(r.contains(0) for r in res)
    rep['R4_residual_radius_max'] = max(float(r.rad()) + abs(float(r.mid())) for r in res)
    return rep['R4_residual_contains_0'], rep


def negative_control_wrong_eigenvalue():
    beta, th, eps, gam = nf.params()
    s = nf.dS(arb(0))
    kappa = (1 / C1).union(1 / C2)
    co = charpoly_coeffs(kappa, s, eps)
    lam_bad = arb('0.96876116440277013807') + arb(10) ** -15
    # a genuine eigenvalue enclosure must make p contain 0; a perturbed one must not
    return bool(peval(co, lam_bad).contains(0))


if __name__ == '__main__':
    ok, rep = certify()
    print('CERTIFIED' if ok else 'FAILED')
    print(json.dumps(rep, indent=1))
    print('\nnegative control 1 (theta = 0, S\'(0) = 5 > 1):')
    ok2, rep2 = certify(theta=0)
    print('  certified?', ok2, '|', rep2.get('R2_s'), rep2.get('R3', rep2.get('R3_iii')))
    print('negative control 2 (perturbed eigenvalue contains a root of p?):', negative_control_wrong_eigenvalue())
    json.dump({'main': rep, 'neg_theta0': rep2}, open('../data/rest_certificate%s.json' % ('' if PULSE == 'fast' else '_slow'), 'w'), indent=1)
