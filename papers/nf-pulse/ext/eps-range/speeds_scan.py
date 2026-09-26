#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""NUMERICAL (not rigorous): continuation of the fast-pulse speed c*(eps) from eps = 0.1 in steps of 0.005,
by the escape-classification bisection of ../../code/shoot_hp.py.  usage: speeds_scan.py up|down
Output in the format of data/cstar_scan.txt.  Used only to choose brackets and subintervals."""
import sys, os, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'code'))
from flint import arb, ctx, fmpq
import nfcore as nf, shoot_hp as sh
ctx.prec = 160
def cstar(eps, guess, width=2e-3):
    nf._EPS = fmpq(int(round(eps*10000)), 10000)
    while True:
        lo = arb(guess - width); hi = arb(guess + width)
        slo = sh.shoot(lo)[0]; shi = sh.shoot(hi)[0]
        if slo == -1 and shi == 1: break
        width *= 2
        if width > 0.3 or slo == 0 or shi == 0:
            return None, (slo, shi, width)
    lo, hi, _, _ = sh.bisect(lo, hi, 100)
    return lo, hi
direction = sys.argv[1]
eps_list = [0.1 + k*0.005*(1 if direction=='up' else -1) for k in range(0, 40)]
g = 1.1027477097341592
prev = None
for e in eps_list:
    if e <= 0.004: break
    res = cstar(e, g, 5e-3)
    if res[0] is None:
        print('eps %.4f no bracket around %.6f: %s' % (e, g, res[1]), flush=True); break
    c = float(res[0].mid())
    print('eps %.4f c* %s' % (e, res[0].str(30, radius=False)), flush=True)
    g = c if prev is None else 2*c - prev
    prev = c
