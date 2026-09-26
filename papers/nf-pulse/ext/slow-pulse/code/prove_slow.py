#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""The three proof runs for the slow pulse: ../../../code/prove_pulse.py main(), unchanged, on the slow bracket.

usage: python3 prove_slow.py {interval|c1|c2|custom:NUM:EXP:SIGN} T_enter
The expected cones are K+ at c1 (the orbit fires again) and K- at c2 (it escapes into Q < 0).
Output: ../data/proof_<which>_eps<eps><NF_TAG>.json and one line 'VERDICT PASS|FAIL'.
"""
import os, sys
import slowparams as sp, slowsetup as ss
os.environ['NF_TAG'] = '_eps%s%s' % (str(sp.EPS).replace('/', '_'), os.environ.get('NF_TAG', ''))
import json
import prove_pulse as pp
import block as bl

# Two additions around the unchanged prove_pulse.main (both only record or re-check, neither can make a run pass):
# 1. block_data rounds rho to its midpoint after its U-range test; re-assert |U - U0| < DU with the rounded rho.
_block_data = pp.block_data


def block_data():
    T, Tinv, rho, r, info = _block_data()
    assert bl.u_range(Tinv, r, rho) < pp.DU, 'U-range of the block not below DU after rounding rho'
    return T, Tinv, rho, r, info


pp.block_data = block_data
# 2. record the full cone margin lower(+-y1) - upper(|y'|) of the enclosure that enters the cone (the JSON of
#    prove_pulse prints y rounded too coarsely to re-check this from the file).
_in_K = pp.in_K
margins = []


def in_K(y, sign):
    ok = _in_K(y, sign)
    if ok:
        v = y[0] if sign > 0 else -y[0]
        lo, up = arb(v.lower()), pp.ynorm2_upper(y[1:])
        margins.append({'cone': '+' if sign > 0 else '-', 'lower(+-y1)': lo.str(12, radius=False),
                        "upper|y'|": arb(up.upper()).str(12, radius=False), 'margin': (lo - arb(up.upper())).str(6, radius=False)})
    return ok


pp.in_K = in_K
from flint import arb

if __name__ == '__main__':
    print('params', sp.TXT, 'C1', ss.C1_TXT, 'C2', ss.C2_TXT, flush=True)
    pp.main(sys.argv[1], int(sys.argv[2]))
    if margins and sys.argv[1] in ('c1', 'c2'):
        print('cone entry', json.dumps(margins[-1]), flush=True)
        json.dump(margins[-1], open('../data/cone_%s%s.json' % (sys.argv[1].replace(':', '_'), os.environ['NF_TAG']), 'w'), indent=1)
