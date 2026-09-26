#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Unstable manifold on the slow-pulse bracket, validated with ../../../code/manifold.py (order 80, sigma = 1/7,
the scaling prove_pulse.py uses), and the negative control sigma x 8."""
import json
import slowparams as sp, slowsetup as ss
from flint import arb, fmpq, ctx
import nfcore as nf, certify_rest as cr, manifold as mf

ctx.prec = 256
s = nf.dS(arb(0))
res = {}
for name, cc in (('c1', cr.C1), ('c2', cr.C2), ('interval', cr.C1.union(cr.C2))):
    kappa = 1 / cc
    co = cr.charpoly_coeffs(kappa, s, nf.EPS)
    lam = cr.refine(co, arb('0.5'), arb('1.2'))
    ok, a, r, info = mf.validate(kappa, lam, arb(fmpq(1, 7)), 80)
    x = mf.evaluate(a, r, arb(fmpq(1, 4)))
    info['P(1/4)'] = [xi.str(20) for xi in x]
    info['choose_sigma'] = mf.choose_sigma(kappa, lam).str(10)
    res[name] = info
    print(name, 'VALIDATED' if ok else 'FAILED', json.dumps(info))
kappa = 1 / cr.C1
lam = cr.refine(cr.charpoly_coeffs(kappa, s, nf.EPS), arb('0.5'), arb('1.2'))
ok, a, r, info = mf.validate(kappa, lam, arb(fmpq(8, 7)), 80)
print('NEGATIVE CONTROL (sigma = 8/7): validated =', ok)
res['negative_sigma_8_7'] = info
json.dump(res, open('../data/manifold_%s.json' % str(sp.EPS).replace('/', '_'), 'w'), indent=1)
