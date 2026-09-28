#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Quote check: the positive rest eigenvalue printed in the manuscript.

paper/nf-pulse.tex states that this root lies in a ball of radius below
10^{-24} about 0.9687611605793217870553652 and cites
data/rest_certificate.json. No existing checker reads the manuscript, so
nothing requires those digits to appear there. This program only reads the
certificate and the manuscript. It exits 0 only when the printed digits are
exactly the stored midpoint and the stored radius is below half a unit in
the last place (the ball forces that digit) and below 10^{-24}.

One negative control adds 1 to the last stored digit, in memory only, and
requires the same comparison to report a mismatch. Neither file is written.
"""
import json
import os
import re
import sys
from decimal import Decimal

HERE = os.path.dirname(os.path.abspath(__file__))
CERT = os.path.join(HERE, '..', 'data', 'rest_certificate.json')
TEX = os.path.join(HERE, '..', 'paper', 'nf-pulse.tex')

BALL = re.compile(r'^\[([+-]?(?:\d+\.\d+)) \+/- ([0-9.eE+-]+)\]$')
PRINTED = re.compile(
    r'about \$([0-9]+\.[0-9]+)\$, \$([-0-9]+\.[0-9]+)\$, '
    r'\$([-0-9]+\.[0-9]+)\$ and \$([-0-9]+\.[0-9]+)\$'
    r' \(\\file\{data/rest_certificate\.json\}\)'
)


def fail(printed, stored):
    print('FAIL')
    print('manuscript: %s' % printed)
    print('certificate: %s' % stored)
    sys.exit(1)


def parse_ball(text):
    m = BALL.match(text.strip())
    if not m:
        raise SystemExit('unparsed ball: %r' % (text,))
    return m.group(1), m.group(2)


def positive_root(doc):
    found = []
    for raw in doc['main']['R3_iii_roots']:
        mid, rad = parse_ball(raw)
        if Decimal(mid) > 0:
            found.append((mid, rad, raw))
    if len(found) != 1:
        raise SystemExit('expected one positive root, found %d' % len(found))
    return found[0]


def printed_positive(tex):
    hits = PRINTED.findall(tex)
    if len(hits) != 1:
        return None
    return hits[0][0]


def last_digit_forced(mid, rad):
    """True when every point of the ball rounds to the displayed midpoint."""
    places = len(mid.split('.')[1])
    half_ulp = Decimal(1).scaleb(-places) / Decimal(2)
    return Decimal(rad) < half_ulp


def bump_last_digit(mid):
    return mid[:-1] + str((int(mid[-1]) + 1) % 10)


def centres_match(printed, stored_mid):
    return printed == stored_mid


def main():
    with open(CERT, encoding='utf-8') as handle:
        doc = json.load(handle)
    with open(TEX, encoding='utf-8') as handle:
        tex = handle.read()
    mid, rad, raw = positive_root(doc)
    printed = printed_positive(tex)
    if printed is None:
        fail('(rest-root sentence not found)', raw)
    if not centres_match(printed, mid) or not last_digit_forced(mid, rad):
        fail(printed, raw)
    if Decimal(rad) >= Decimal('1e-24'):
        fail(printed, raw)
    mutated = bump_last_digit(mid)
    if centres_match(printed, mutated):
        fail(printed, '%s (negative control still matched)' % mutated)
    if abs(Decimal(mutated) - Decimal(mid)) <= Decimal(rad):
        raise SystemExit('negative control did not leave the stored ball')
    print('PASS')
    print('manuscript: %s' % printed)
    print('certificate: %s' % raw)
    print('negative control: last stored digit %s -> %s mismatches' % (mid[-1], mutated[-1]))
    return 0


if __name__ == '__main__':
    sys.exit(main())
