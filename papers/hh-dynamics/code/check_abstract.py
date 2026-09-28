#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Check the abstract against the Hopf certificate and the generated macros.

The abstract is computer-assisted text: its Hopf intervals are the outward
rounding of the stored long intervals, its period bounds are the outward
rounding of the bistability enclosure, and the stability sentence excludes
the Hopf points. A copy with the last digit of J_H1 raised must fail.
"""
import os
import re
import sys
from decimal import Decimal, ROUND_CEILING, ROUND_FLOOR

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
TEX = os.path.join(ROOT, 'paper', 'hh-dynamics.tex')
HOPF = os.path.join(ROOT, 'data', 'certify_equilibria_hopf.txt')


def fail(msg):
    print(msg)
    print('FAIL')
    sys.exit(1)


def one(pat, text, what):
    found = list(re.finditer(pat, text, re.S))
    if len(found) != 1:
        fail('%s matched %d times' % (what, len(found)))
    return found[0]


def macro(tex, name):
    found = one(r'\\newcommand\{\\%s\}\{([^}]*)\}' % name, tex, name)
    return found.group(1)


def pair(text):
    nums = re.findall(r'[0-9]+\.[0-9]+', text)
    if len(nums) != 2:
        fail('expected two decimals in %r' % text)
    return nums[0], nums[1]


def places(text):
    return len(text.split('.', 1)[1])


def outward(lo, hi, d):
    quantum = Decimal(1).scaleb(-d)
    left = Decimal(lo).quantize(quantum, rounding=ROUND_FLOOR)
    right = Decimal(hi).quantize(quantum, rounding=ROUND_CEILING)
    return format(left, 'f'), format(right, 'f')


def shared_prefix(lo, hi):
    n = 0
    while n < len(lo) and n < len(hi) and lo[n] == hi[n]:
        n += 1
    prefix = lo[:n]
    while prefix and not prefix[-1].isdigit():
        prefix = prefix[:-1]
    return prefix


def bump(text):
    return text[:-1] + str((int(text[-1]) + 1) % 10)


def main():
    tex = open(TEX, encoding='utf-8').read()
    hopf = open(HOPF, encoding='utf-8').read()
    abstract = one(r'\\begin\{abstract\}(.*?)\\medskip', tex, 'abstract').group(1)
    if 'except for' in abstract:
        fail('the abstract still says "except for"')
    if 'asymptotically stable for $J < J_{H1}$ and for $J > J_{H2}$' not in abstract:
        fail('the stability sentence does not exclude the Hopf points')
    if 'Nothing is claimed about the basins of attraction' not in abstract:
        fail('the basins disclaimer is missing')
    if r'exactly $0.3\,(10.613 - E_l)$' not in abstract:
        fail('the abstract no longer says the Hopf points move by exactly 0.3(10.613 - E_l)')

    lines = []
    for label, key in (('J_H1', 'JHOneHH'), ('J_H2', 'JHTwoHH')):
        printed = pair(macro(tex, key))
        found = one(
            r'%s for E_l = 10\.613 \(Hodgkin and Huxley\): \[([0-9.]+), ([0-9.]+)\]' % label,
            hopf, label)
        stored = (found.group(1), found.group(2))
        d = places(printed[0])
        if places(printed[1]) != d:
            fail('%s endpoints do not share a precision' % label)
        got = outward(stored[0], stored[1], d)
        if printed != got:
            fail('%s abstract %s is not the outward rounding %s of %s' % (label, printed, got, stored))
        bad = (bump(printed[0]), printed[1])
        if outward(stored[0], stored[1], d) == bad:
            fail('raising the last digit of %s still matched' % label)
        lines.append('%s %s is the outward rounding of %s' % (label, printed, stored))

    period = (macro(tex, 'TballLo'), macro(tex, 'TballHi'))
    shorts = (macro(tex, 'TballLoShort'), macro(tex, 'TballHiShort'))
    rounded = outward(period[0], period[1], 4)
    if shorts != rounded:
        fail('period shorts %s are not the outward rounding %s of %s' % (shorts, rounded, period))
    if r'between $\TballLoShort$ and $\TballHiShort$' not in abstract:
        fail('the abstract does not place the period between the outward shorts')
    lines.append('period between %s and %s, outward from %s' % (shorts[0], shorts[1], period))

    leak = pair(macro(tex, 'ELstar'))
    short = macro(tex, 'ELstarShort')
    prefix = shared_prefix(leak[0], leak[1])
    if not prefix.startswith(short):
        fail('ELstarShort %s is not a prefix of the shared digits %s' % (short, prefix))
    if prefix.startswith(bump(short)):
        fail('raising the last digit of the leak prefix still matched')
    if r'\ELstarShort\ldots' not in abstract:
        fail('the abstract does not print the leak as a prefix with an ellipsis')
    lines.append('zero-current leak prefix %s of shared %s' % (short, prefix))
    lines.append('raising the last digit of J_H1 is rejected')
    print('\n'.join(lines))
    print('ALL CHECKS PASSED')
    return 0


if __name__ == '__main__':
    sys.exit(main())
