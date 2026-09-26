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
import prove_pulse as pp

if __name__ == '__main__':
    print('params', sp.TXT, 'C1', ss.C1_TXT, 'C2', ss.C2_TXT, flush=True)
    pp.main(sys.argv[1], int(sys.argv[2]))
