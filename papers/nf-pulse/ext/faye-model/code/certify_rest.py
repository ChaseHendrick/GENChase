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
"""Certified statements about the rest state of Faye's wave ODE and its linearisation (ball arithmetic).

 R1  The wave ODE has exactly one equilibrium x* = (u0, u0, 0, q0): equilibria satisfy v = u, w = 0,
     q = 1/(1 + beta S(u)), u = q S(u), i.e. F(u) = u (1 + beta S(u)) - S(u) = 0 with u = q S(u) in (0, 1).
     F has exactly one zero in [0, 1] (subdivision: certified sign, or certified F' > 0 with a sign change).
 R2  s = S'(u0) and q0 s < 1 (Hastings's h'(u0) > 0, Faye's g'(u0) > 0).
 R3  For every c > 0, with k = 1/c and A = 1 + beta S(u0) = 1/q0,
         p(mu) = mu^4 + k(1 + eps A) mu^3 + (eps k^2 A - b^2) mu^2 + b^2 k (q0 s - 1 - eps A) mu + b^2 eps k^2 (q0 s - A)
     (i) has exactly one positive root (Descartes: signs +, +, ?, -, - since q0 s < 1 < A);
     (ii) has no root on the imaginary axis (Im p(i w) = w (c1 - c3 w^2) with c1 < 0 < c3, and p(0) != 0);
     so the number of roots in Re > 0 does not depend on c; (iii) at the certified bracket the four roots are
     real and simple: one positive and three negative.  Hence dim W^u(x*) = 1, dim W^s(x*) = 3 for every c > 0.
 R4  The unstable eigenvector in closed form, with its residual enclosing 0.
Negative controls: a firing rate with three equilibria (lam = 80, kap = 1/10) must be refused, and a perturbed eigenvalue must not
enclose a root.
"""
import sys, json, os
from flint import arb, ctx, fmpq
import fcore as fc
import manifold as mf

import config as cf
ctx.prec = cf.get()['prec']
_cfg = cf.get()
C1, C2 = arb(cf.dec(_cfg['c1'])), arb(cf.dec(_cfg['c2']))     # bracket from numerical shooting (config.py)
SIDE_C1, SIDE_C2 = _cfg['side_c1'], _cfg['side_c2']


def unique_equilibrium(beta=None, lam=None, kap=None, pieces=2000):
    """Exactly one zero of F on [0, 1]; returns (ok, info)."""
    nroot = 0
    grid = [arb(fmpq(i, pieces)) for i in range(pieces + 1)]
    for i in range(pieces):
        I = grid[i].union(grid[i + 1])
        f = fc.Frest(I, beta, lam, kap)
        if f > 0 or f < 0:
            continue
        beta_ = fc.params()[2] if beta is None else beta
        s = fc.S(I, lam, kap)
        ds = fc.dS(I, lam, kap)
        fp = 1 + beta_ * s + (beta_ * I - 1) * ds
        if not (fp > 0):
            return False, {'reason': 'cannot certify monotonicity on piece %d' % i}
        fa, fb = fc.Frest(grid[i], beta, lam, kap), fc.Frest(grid[i + 1], beta, lam, kap)
        if fa < 0 and fb > 0:
            nroot += 1
        elif (fa > 0 and fb > 0) or (fa < 0 and fb < 0):
            continue
        else:
            return False, {'reason': 'undecided end signs on piece %d' % i}
    return nroot == 1, {'zeros_in_[0,1]': nroot, 'pieces': pieces}


def certify(kappa, lam=None, kap=None):
    rep = {'params': fc.PARAMS_TXT()}
    ok1, i1 = unique_equilibrium(lam=lam, kap=kap)
    rep['R1_unique_equilibrium'] = i1
    if not ok1:
        return False, rep
    if lam is None and kap is None:
        x = fc.rest_state()
        u0, q0, Y0 = x[0], x[3], x[4]
    else:
        u0 = fc.rest_u0(lam=lam, kap=kap)
        Y0 = fc.S(u0, lam, kap)
        q0 = 1 / (1 + fc.params()[2] * Y0)
    rep['R1_rest'] = {'u0=v0': u0.str(30), 'w0': '0', 'q0': q0.str(30)}
    s = fc.dS(u0, lam, kap)
    rep['R2_s'] = s.str(30)
    rep['R2_q0s'] = (q0 * s).str(30)
    if not (q0 * s < 1):
        rep['R2_ok'] = False
        return False, rep
    rep['R2_ok'] = True
    rep['R3_i_ii'] = 'Descartes and imaginary axis, symbolic given q0 s < 1 (see docstring)'
    if lam is not None or kap is not None:
        return True, rep
    co = mf.charpoly(kappa)
    grid = [arb(t) for t in ('-40', '-3', '-1.5', '-0.5', '-0.001', '0', '1', '10')]
    vals = [mf.sign(mf.peval(co, g)) for g in grid]
    if 0 in vals:
        rep['R3_iii'] = 'undecided sign on the grid'
        return False, rep
    iv = [(grid[i], grid[i + 1]) for i in range(len(grid) - 1) if vals[i] != vals[i + 1]]
    if len(iv) != 4:
        rep['R3_iii'] = 'found %d sign changes' % len(iv)
        return False, rep
    roots = [mf.refine(co, a, b) for a, b in iv]
    rep['R3_iii_roots'] = [r.str(25) for r in roots]
    npos = sum(1 for r in roots if r > 0)
    nneg = sum(1 for r in roots if r < 0)
    rep['R3_iii_count'] = {'positive': npos, 'negative': nneg}
    if not (npos == 1 and nneg == 3):
        return False, rep
    mu = roots[-1]
    res = mf.eig_residual(kappa, mu)
    rep['R4_residual_contains_0'] = all(r.contains(0) for r in res)
    rep['R4_residual_max'] = max(float(r.rad()) + abs(float(r.mid())) for r in res)
    return rep['R4_residual_contains_0'], rep


if __name__ == '__main__':
    kappa = (1 / C1).union(1 / C2)
    ok, rep = certify(kappa)
    print('CERTIFIED' if ok else 'FAILED')
    print(json.dumps(rep, indent=1))
    # negative control 1: lam = 80, kap = 1/10 has three equilibria (floating-point scan); R1 must be refused
    ok2, rep2 = certify(kappa, lam=arb(80), kap=arb(fmpq(1, 10)))
    print("negative control 1 (lam = 80, kap = 1/10, three equilibria): certified?", ok2, '|', rep2.get('R1_unique_equilibrium'))
    # negative control 2: a perturbed unstable eigenvalue must not enclose a root of p
    co = mf.charpoly(kappa)
    mu = mf.unstable_eig(kappa)
    bad = arb(mu.mid()) + arb(10) ** -20
    print('negative control 2 (perturbed eigenvalue encloses a root?):', bool(mf.peval(co, bad).contains(0)))
    json.dump({'main': rep, 'neg_lam80_kap0.1': rep2}, open('../data/rest_certificate_eps%s.json' % fc.eps_txt().replace('/', '_'), 'w'), indent=1)
