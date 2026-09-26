#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Summarise the certificates in data/certs/: the covered eps range, gaps, and the speed enclosures.

usage: python3 table.py [--from A --to B] [--md data/speed_table.md]

For each PASS certificate E_k = [e_lo, e_hi] the speed window is, for eps = e_m + w eps0,
    kappa = 1/c in q0 + s1 eps0 + dk [-1, 1],    |eps0| <= 1 + delta,
with e_m, w, q0, s1, dk the exact dyadic numbers recorded in the certificate.  The table gives the
constant bracket c1(E_k) = 1/max kappa, c2(E_k) = 1/min kappa (outward rounded, ball arithmetic), and the
width of the eps-dependent window at fixed eps, 1/(q - |dk|) - 1/(q + |dk|).
"""
import os, sys, json, glob, argparse
from flint import arb, fmpq, ctx
ctx.prec = 256
HERE = os.path.dirname(os.path.abspath(__file__))


def exact(s):
    m, e = s.split('*2^')
    return arb(int(m)) * arb(2) ** int(e)


def dec(s):
    neg = s.startswith('-')
    s = s.lstrip('-')
    a, b = (s.split('.') + [''])[:2]
    q = fmpq(int(a or '0') * 10 ** len(b) + int(b or '0'), 10 ** len(b))
    return -q if neg else q


def load():
    rows = []
    for f in sorted(glob.glob(os.path.join(HERE, 'data', 'certs', '*.json'))):
        c = json.load(open(f))
        if c.get('verdict') != 'PASS':
            continue
        e_lo, e_hi = fmpq(*[int(x) for x in c['eps'][0].split('/')]) if '/' in c['eps'][0] else dec(c['eps'][0]), \
            fmpq(*[int(x) for x in c['eps'][1].split('/')]) if '/' in c['eps'][1] else dec(c['eps'][1])
        q0, s1, dk = exact(c['q0_exact']), exact(c['s1_exact']), exact(c['dk_exact'])
        r0 = arb(c['setup']['eps0_range'])
        emax = arb(r0.abs_upper())
        kmax = q0 + abs(s1) * emax + abs(dk)
        kmin = q0 - abs(s1) * emax - abs(dk)
        c1, c2 = 1 / kmax, 1 / kmin
        win = 1 / (q0 - abs(dk)) - 1 / (q0 + abs(dk))
        rows.append({'lo': e_lo, 'hi': e_hi, 'c1': arb(c1.lower()), 'c2': arb(c2.upper()), 'win': win,
                     'T': c.get('T'), 'stages': len(c['stages']), 'dU': c['setup']['block'].get('dU'),
                     'split_max': max(s.get('split', 1) for s in c['stages']), 'file': os.path.basename(f),
                     'time': c.get('time_s')})
    rows.sort(key=lambda r: (float(r['lo'].p) / float(r['lo'].q)))
    return rows


def cover(rows, A, B):
    """union of the certified subintervals intersected with [A, B]: returns (covered, gaps) exactly."""
    x = A
    gaps = []
    for r in rows:
        if r['hi'] <= x:
            continue
        if r['lo'] > x:
            gaps.append((x, r['lo']))
        x = max(x, r['hi'])
        if x >= B:
            break
    if x < B:
        gaps.append((x, B))
    return gaps


def f(q):
    return '%.6f' % (float(q.p) / float(q.q))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='A', default=None); ap.add_argument('--to', dest='B', default=None)
    ap.add_argument('--md', default=None)
    a = ap.parse_args()
    rows = load()
    A = dec(a.A) if a.A else rows[0]['lo']
    B = dec(a.B) if a.B else rows[-1]['hi']
    gaps = cover(rows, A, B)
    lines = ['| E_k | c1(E_k) | c2(E_k) | window width at fixed eps | block U-range | T | stages | max split |',
             '|---|---|---|---|---|---|---|---|']
    for r in rows:
        lines.append('| [%s, %s] | %s | %s | %.2e | %s | %s | %d | %d |' % (
            f(r['lo']), f(r['hi']), r['c1'].str(12, radius=False), r['c2'].str(12, radius=False),
            float(r['win'].mid()), r['dU'], r['T'], r['stages'], r['split_max']))
    head = 'certified subintervals: %d; range [%s, %s]; gaps: %s' % (
        len(rows), f(A), f(B), ', '.join('[%s, %s]' % (f(g[0]), f(g[1])) for g in gaps) or 'none')
    print(head)
    print('\n'.join(lines[:6] + (['| ... |'] if len(lines) > 12 else []) + lines[-4:]))
    if a.md:
        open(a.md, 'w').write(head + '\n\n' + '\n'.join(lines) + '\n')
