#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""The abstract's three minima are prefixes of the certified intervals.

A digit is printed only when every point of the stored interval begins
with it. The sixty-one-vortex value stays marked numerical. Raising the
last digit of P_4 must fail.
"""
import os
import re
import sys
from decimal import Decimal

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
TEX = os.path.join(ROOT, 'paper', 'minimal-winding.tex')
LOG = os.path.join(ROOT, 'data', 'certify-collapses-2026-09-25.txt')
PREFIXES = {
    'P_4': '0.7978967838',
    'P_5': '0.7448144569',
    'P_6': '0.7136801485',
}


def fail(msg):
    print(msg)
    print('FAIL')
    sys.exit(1)


def chop_ok(lo, hi, prefix):
    start = Decimal(prefix)
    step = Decimal(1).scaleb(-len(prefix.split('.')[1]))
    return start <= lo and hi < start + step


def bump(text):
    return text[:-1] + str((int(text[-1]) + 1) % 10)


def main():
    tex = open(TEX, encoding='utf-8').read()
    log = open(LOG, encoding='utf-8').read()
    abstract = re.search(r'\\begin\{abstract\}(.*?)\\medskip', tex, re.S)
    if not abstract:
        fail('abstract not found')
    body = abstract.group(1)
    if r'$P > \sqrt{3}/2$' not in body:
        fail('the three-vortex bound is missing from the abstract')
    if 'Numerically, sixty-one' not in body:
        fail('the sixty-one-vortex value is no longer marked numerical')
    shown = re.findall(r'\$([0-9]+\.[0-9]+)\\ldots\$', body)
    if shown != [PREFIXES['P_4'], PREFIXES['P_5'], PREFIXES['P_6']]:
        fail('abstract minima %s' % shown)

    lines = []
    for label, prefix in PREFIXES.items():
        found = re.search(
            label + r' in \[([0-9]+\.[0-9]+), ([0-9]+\.[0-9]+)\]', log)
        if not found:
            fail('%s interval not in the log' % label)
        lo, hi = Decimal(found.group(1)), Decimal(found.group(2))
        if not chop_ok(lo, hi, prefix):
            fail('%s prefix %s does not chop [%s, %s]' % (label, prefix, lo, hi))
        if chop_ok(lo, hi, bump(prefix)):
            fail('raising the last digit of %s still chopped the interval' % label)
        lines.append('%s %s chops [%s, %s]' % (label, prefix, found.group(1)[:16], found.group(2)[:16]))
    print('\n'.join(lines))
    print('ALL CHECKS PASSED')
    return 0


if __name__ == '__main__':
    sys.exit(main())
