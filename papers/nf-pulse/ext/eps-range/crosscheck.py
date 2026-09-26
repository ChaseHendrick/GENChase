#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Consistency check (not part of the proof): for every eps of the numerical table data/cstar_scan.txt that lies
in a certified subinterval, is the numerical speed c*(eps) inside the certified speed window at that eps?"""
import json, glob, os
from flint import arb, fmpq, ctx
import table as T
ctx.prec = 256
HERE = os.path.dirname(os.path.abspath(__file__))


def q(s):
    return fmpq(*map(int, s.split('/'))) if '/' in s else T.dec(s)


rows = [T.read(f) for f in T.cert_files()]
rows = [c for c in rows if c.get('verdict') == 'PASS' and 'q0_exact' in c]
bad = 0
for line in open(os.path.join(HERE, 'data', 'cstar_scan.txt')):
    if not (line.startswith('eps') and 'c*' in line):
        continue
    p = line.split()
    e, cs = T.dec(p[1]), p[3]
    for c in rows:
        lo, hi = q(c['eps'][0]), q(c['eps'][1])
        if lo <= e <= hi:
            em, w = T.exactq(c['e_m_exact']), T.exactq(c['w_exact'])
            k = T.exact(c['q0_exact']) + T.exact(c['s1_exact']) * arb((e - em) / w)
            dk = abs(T.exact(c['dk_exact']))
            cst = arb(cs)
            ok = bool(1 / (k + dk) < cst) and bool(cst < 1 / (k - dk))
            bad += not ok
            print(p[1], 'c* (numerical)', cs[:18], ' certified window [%s, %s]' % (
                (1 / (k + dk)).str(14, radius=False), (1 / (k - dk)).str(14, radius=False)),
                'contains it' if ok else 'DOES NOT contain it')
            break
print('CONSISTENT' if bad == 0 else '%d INCONSISTENT' % bad)
