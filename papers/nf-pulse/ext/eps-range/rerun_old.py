#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Re-run, with the present chain.py, every PASS certificate that was written before the safeguards (no
'negative_checks' field), with the same arguments as run_range.attempt; the new certificate replaces the old one
only if it passes.  Prints one line per certificate."""
import os, sys, json, glob, subprocess
from multiprocessing import Pool
from fractions import Fraction as Fr
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import run_range as rr


def one(f):
    c = json.load(open(f))
    lo, hi = [float(Fr(x)) for x in c['eps']]
    tmp = f.replace('.json', '.rerun.json')
    cmd = [sys.executable, os.path.join(HERE, 'chain.py'), rr.dec(lo), rr.dec(hi), '%.12f' % rr.c_guess(0.5 * (lo + hi)),
           '--dk', '%.3e' % ((hi - lo) / 20.0), '--out', tmp]
    subprocess.run(cmd, capture_output=True, text=True, timeout=3000)
    n = json.load(open(tmp)) if os.path.exists(tmp) else {'verdict': 'CRASH'}
    same = all(n.get(k) == c.get(k) for k in ('q0_exact', 's1_exact', 'dk_exact', 'e_m_exact', 'w_exact', 'T'))
    if n.get('verdict') == 'PASS':
        os.replace(tmp, f)
    return '%s old PASS -> new %s, same exact data and T: %s, negative checks %s' % (
        os.path.basename(f), n.get('verdict'), same, n.get('negative_checks'))


if __name__ == '__main__':
    old = [f for f in sorted(glob.glob(os.path.join(HERE, 'data', 'certs', 'eps_*.json')))
           if not f.endswith('.rerun.json') and json.load(open(f)).get('verdict') == 'PASS'
           and 'negative_checks' not in json.load(open(f))]
    with Pool(os.cpu_count()) as p:
        for line in p.imap_unordered(one, old, 1):
            print(line, flush=True)
