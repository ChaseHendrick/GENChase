#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""The abstract states an open speed bracket, not a shared prefix of the speed.

c_1 is the left endpoint. The speed lies in (c_1, c_1 + 10^{-25}), so the
digit where those ends differ is not a digit of the speed. The README must
use the same endpoint and must not say the speed is "about" a longer prefix.
The endpoint must be the stored midpoint of the c1 certificate, truncated,
with radius below half a unit in the last place. A copy with the last digit
raised must fail.
"""
import json
import os
import re
import sys
from decimal import Decimal

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
TEX = os.path.join(ROOT, 'paper', 'nf-pulse.tex')
README = os.path.join(ROOT, 'README.md')
DATA = os.path.join(ROOT, 'data')
C1 = '1.1027477097341592491478677'
WIDTH = '10^{-25}'
STAB = '10^{-58}'


def fail(msg):
    print(msg)
    print('FAIL')
    sys.exit(1)


def abstract_of(text, begin, end):
    found = re.search(begin + r'(.*?)' + end, text, re.S)
    if not found:
        fail('abstract not found')
    return found.group(1)


def truncate(mid, n):
    whole, dot, frac = mid.partition('.')
    if len(frac) < n:
        frac = frac.ljust(n, '0')
    return whole + '.' + frac[:n]


def endpoint_ball():
    matches = []
    for name in sorted(os.listdir(DATA)):
        if not name.endswith('.json'):
            continue
        path = os.path.join(DATA, name)
        with open(path, encoding='utf-8') as handle:
            doc = json.load(handle)
        if not isinstance(doc, dict) or doc.get('which') != 'c1':
            continue
        raw = doc.get('c', '')
        found = re.match(r'^\[([0-9]+\.[0-9]+) \+/- ([0-9.eE+-]+)\]$', str(raw).strip())
        if not found:
            continue
        if truncate(found.group(1), len(C1.split('.')[1])) == C1:
            matches.append((name, found.group(1), Decimal(found.group(2)), doc.get('verdict')))
    if len(matches) != 1:
        fail('c1 certificates matching the abstract endpoint: %s' % [item[0] for item in matches])
    return matches[0]


def bump(text):
    return text[:-1] + str((int(text[-1]) + 1) % 10)


def main():
    tex = open(TEX, encoding='utf-8').read()
    readme = open(README, encoding='utf-8').read()
    abstract = abstract_of(tex, r'\\begin\{abstract\}', r'\\medskip')
    readme_abs = abstract_of(readme, r'## Abstract\n', r'\n## ')
    if 'we found' not in abstract:
        fail('the abstract dropped the limit "we found"')
    if 'Nonlinear stability is not proved.' not in abstract:
        fail('the abstract no longer says nonlinear stability is not proved')
    if ('$(c_1, c_1 + %s)$' % WIDTH) not in abstract or ('$c_1 = %s$' % C1) not in abstract:
        fail('the abstract does not state the open bracket with endpoint %s' % C1)
    if ('width $%s$' % STAB) not in abstract:
        fail('the abstract no longer states the spectral bracket width %s' % STAB)
    if 'about $1.10274770973415924914786' in abstract or 'about 1.10274770973415924914786' in readme_abs:
        fail('the abstract calls the endpoint a speed')
    if ('c_1 = %s' % C1) not in readme_abs or '(c_1, c_1 + 10^-25)' not in readme_abs:
        fail('the README abstract does not state the same open bracket')
    if ('(c_a, c_a + 10^-25), c_a = 0.3775319350688905765075606') not in readme:
        fail('the README still says the slow pulse sits at its left endpoint')

    name, mid, rad, verdict = endpoint_ball()
    places = len(C1.split('.')[1])
    half = Decimal(1).scaleb(-places) / 2
    if verdict != 'PASS' or not (Decimal(0) <= rad < half):
        fail('%s does not force %s (radius %s, verdict %s)' % (name, C1, rad, verdict))
    if truncate(mid, places) != C1:
        fail('stored midpoint %s does not truncate to %s' % (mid, C1))
    if truncate(mid, places) == bump(C1):
        fail('the raised endpoint still matched the certificate')
    hi = Decimal(C1) + Decimal('1e-25')
    lo_s, hi_s = format(Decimal(C1), 'f'), format(hi, 'f')
    if lo_s[:-1] != hi_s[:-1] or lo_s[-1] == hi_s[-1]:
        fail('the bracket ends %s and %s do not differ only in the last digit' % (lo_s, hi_s))
    if ('begins %s' % C1) in abstract or ('begins %s' % C1) in readme_abs:
        fail('the abstract presents the endpoint as the start of the speed')

    print('abstract endpoint %s truncates %s in %s' % (C1, mid, name))
    print('radius %s is below half a unit in the last place' % rad)
    print('bracket ends differ in the last digit: %s and %s' % (lo_s, hi_s))
    print('README states the open bracket, not a speed equal to the endpoint')
    print('raising the last digit of c_1 is rejected')
    print('ALL CHECKS PASSED')
    return 0


if __name__ == '__main__':
    sys.exit(main())
