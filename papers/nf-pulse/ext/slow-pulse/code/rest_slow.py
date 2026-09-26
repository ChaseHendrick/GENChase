#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Rest-state certificate for the slow-pulse bracket (ball arithmetic, via ../../../code/certify_rest.py).

R1, R2 and the symbolic parts R3 (i), (ii) of certify_rest hold for every c > 0 once s = S'(0) < 1: exactly one
positive real root and no root on the imaginary axis, so the number of roots with Re > 0 does not depend on c.
 * If the four roots are real on [C1, C2] (eps = 1/10), certify_rest.certify is run on the bracket itself.
 * Otherwise (eps = 3/20: a complex stable pair) the count is certified at a reference speed c = 1 where the four
   roots are real, which gives one root with Re > 0 and three with Re < 0 for every c > 0; on the bracket the
   unstable root is then enclosed by certified signs of p on [1/2, 6/5], and its eigenvector residual is checked.
"""
import json
import slowparams as sp, slowsetup as ss
from flint import arb
import nfcore as nf, certify_rest as cr

ok, rep = cr.certify(c_lo=cr.C1, c_hi=cr.C2)
out = {'params': sp.TXT, 'C1': ss.C1_TXT, 'C2': ss.C2_TXT, 'bracket': rep}
if not ok and ss.COMPLEX_STABLE:
    ok_ref, rep_ref = cr.certify(c_lo=arb(1), c_hi=arb(1))
    out['reference_c_1'] = rep_ref
    beta, th, eps, gam = nf.params()
    s = nf.dS(arb(0))
    kappa = (1 / cr.C1).union(1 / cr.C2)
    co = cr.charpoly_coeffs(kappa, s, eps)
    lam = cr.refine(co, arb('0.5'), arb('1.2'))
    v = cr.eigvec_unstable(lam, kappa, s, eps)
    A = cr.jac5(kappa, s, eps)
    res = [sum((A[i][j] * v[j] for j in range(5)), arb(0)) - lam * v[i] for i in range(5)]
    out['bracket_unstable_root'] = lam.str(30)
    out['bracket_eigvec_residual_contains_0'] = all(r.contains(0) for r in res)
    ok = ok_ref and bool(rep['R2_s_lt_1']) and out['bracket_eigvec_residual_contains_0']
print('CERTIFIED' if ok else 'FAILED')
print(json.dumps(out, indent=1))
json.dump(out, open('../data/rest_certificate_%s.json' % str(sp.EPS).replace('/', '_'), 'w'), indent=1)
