#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Isolating block around rest for the slow-pulse bracket, certified with block.check of ../../../code/block.py
(cone condition and entrance condition, ball arithmetic, kappa over the whole bracket), for |U| <= 0.05, and the
negative control U up to 0.15."""
import json
import slowparams as sp, slowsetup as ss
from flint import arb
import certify_rest as cr, block as bl

T, Tinv = bl.setup()
kappa = (1 / cr.C1).union(1 / cr.C2)
ok, info = bl.check(T, Tinv, (arb('-0.05'), arb('0.05')), kappa)
info['jordan_basis'] = ss.COMPLEX_STABLE
print('dU 0.05', 'CERTIFIED' if ok else 'FAILED', json.dumps(info))
ok2, info2 = bl.check(T, Tinv, (arb('-0.05'), arb('0.15')), kappa)
print('NEGATIVE CONTROL U in [-0.05, 0.15]:', 'CERTIFIED (BAD)' if ok2 else 'fails as expected', json.dumps(info2))
info['T'] = [[float(T[i, j].mid()) for j in range(4)] for i in range(4)]
json.dump({'dU=0.05': info, 'negative': info2}, open('../data/block_%s.json' % str(sp.EPS).replace('/', '_'), 'w'), indent=1)
