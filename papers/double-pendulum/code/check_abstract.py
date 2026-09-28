#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""The abstract's entropy bounds sit strictly under the horseshoe certificate.

0.1016 and 0.0138 are lower bounds, not measurements. The energy interval
in the abstract is the interval the interval run records. The novelty
sentence keeps "as far as we could find", and meromorphic non-integrability
stays open. Raising 0.1016 by one unit in the last digit must fail.
"""
import os
import re
import sys
from decimal import Decimal

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
TEX = os.path.join(ROOT, 'paper', 'double-pendulum.tex')
HORSE = os.path.join(ROOT, 'data', 'horseshoe_E0.txt')
INTERVAL = os.path.join(ROOT, 'data', 'E0_interval.txt')


def fail(msg):
    print(msg)
    print('FAIL')
    sys.exit(1)


def main():
    tex = open(TEX, encoding='utf-8').read()
    abstract = re.search(r'\\begin\{abstract\}(.*?)\\medskip', tex, re.S)
    if not abstract:
        fail('abstract not found')
    body = abstract.group(1)
    if 'as far as we could find' not in body:
        fail('the abstract dropped "as far as we could find"')
    if 'Meromorphic non-integrability' not in body or 'remains open' not in body:
        fail('the abstract no longer leaves meromorphic non-integrability open')
    if r'$[-10^{-10}, 10^{-10}]$' not in body:
        fail('the abstract no longer states the energy interval')
    interval = open(INTERVAL, encoding='utf-8').read().splitlines()[0]
    if 'E = [-1e-10, 1e-10]' not in interval:
        fail('data/E0_interval.txt does not record E = [-1e-10, 1e-10]')

    horse = open(HORSE, encoding='utf-8').read()
    found = re.search(
        r'h_top\(P\) >= log r >= ([0-9]+\.[0-9]+) per return; '
        r'return time <= ([0-9]+\.[0-9]+), so h_top\(flow\) >= ([0-9]+\.[0-9]+)',
        horse)
    if not found:
        fail('horseshoe entropy line not found')
    if 'ALL COVERING RELATIONS VERIFIED' not in horse:
        fail('the E = 0 horseshoe certificate is not verified')
    ret, flow = Decimal(found.group(1)), Decimal(found.group(3))
    claim_ret, claim_flow = Decimal('0.1016'), Decimal('0.0138')
    if not (ret > claim_ret and flow > claim_flow):
        fail('certificate %s, %s does not sit strictly above 0.1016, 0.0138' % (ret, flow))
    if r'exceeds $0.1016$' not in body or r'exceeds $0.0138$' not in body:
        fail('the abstract does not state the entropy bounds as exceedances')
    raised = claim_ret + Decimal('0.0001')
    if ret > raised:
        fail('raising 0.1016 to %s still sat under the certificate %s' % (raised, ret))

    print('E = 0 return entropy %s > 0.1016; flow entropy %s > 0.0138' % (ret, flow))
    print('interval run records %s' % interval.strip())
    print('0.1017 is not a lower bound')
    print('ALL CHECKS PASSED')
    return 0


if __name__ == '__main__':
    sys.exit(main())
