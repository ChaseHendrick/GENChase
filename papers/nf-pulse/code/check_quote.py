#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Quote check: the four rest eigenvalues printed in the manuscript.

paper/nf-pulse.tex states that these roots lie in balls of radius below
10^{-24} about 0.9687611605793217870553652,
-0.124653132559362267515550, -0.583109889199161753091305 and
-1.167823871645100102751750, and cites data/rest_certificate.json. This
program only reads the certificate and the manuscript. It exits 0 only when
each printed centre is exactly one stored midpoint, there is no extra stored
root, and each stored radius is below half a unit in the last printed place
(the ball forces that digit) and below 10^{-24}.

Two negative controls add 1 to the last stored digit of the positive
midpoint and of one negative midpoint, in memory only, and require the same
comparison to report a mismatch. Neither file is written.
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


def stored_roots(doc):
    found = []
    for raw in doc['main']['R3_iii_roots']:
        mid, rad = parse_ball(raw)
        found.append((mid, rad, raw))
    return found


def printed_centres(tex):
    hits = PRINTED.findall(tex)
    if len(hits) != 1:
        return None
    return list(hits[0])


def last_digit_forced(mid, rad):
    """True when every point of the ball rounds to the displayed midpoint."""
    places = len(mid.split('.')[1])
    half_ulp = Decimal(1).scaleb(-places) / Decimal(2)
    return Decimal(rad) < half_ulp


def bump_last_digit(mid):
    return mid[:-1] + str((int(mid[-1]) + 1) % 10)


def centres_match(printed, stored_mid):
    return printed == stored_mid


def pair_centres(printed, stored):
    """Match each printed centre to a distinct stored midpoint."""
    unused = []
    seen = set()
    for mid, rad, raw in stored:
        if mid in seen:
            fail(', '.join(printed), raw)
        seen.add(mid)
        unused.append((mid, rad, raw))
    paired = []
    for centre in printed:
        match = None
        for i, (mid, rad, raw) in enumerate(unused):
            if centres_match(centre, mid):
                match = i
                break
        if match is None:
            stored_text = '; '.join(raw for _, _, raw in stored) if stored else '(none)'
            fail(centre, stored_text)
        paired.append((centre,) + unused.pop(match))
    if unused:
        fail(', '.join(printed), '; '.join(raw for _, _, raw in unused))
    return paired


def reject_bump(printed, paired, index):
    """Bump one stored midpoint in memory and require a mismatch."""
    centre, mid, rad, raw = paired[index]
    mutated = bump_last_digit(mid)
    if centres_match(centre, mutated):
        fail(centre, '%s (negative control still matched)' % mutated)
    bumped = [item[1] for item in paired]
    bumped[index] = mutated
    if len(printed) == len(bumped) and all(
        centres_match(p, s) for p, s in zip(sorted(printed), sorted(bumped))
    ):
        fail(centre, '%s (negative control still matched)' % mutated)
    if abs(Decimal(mutated) - Decimal(mid)) <= Decimal(rad):
        raise SystemExit('negative control did not leave the stored ball')
    return mutated


def main():
    with open(CERT, encoding='utf-8') as handle:
        doc = json.load(handle)
    with open(TEX, encoding='utf-8') as handle:
        tex = handle.read()
    stored = stored_roots(doc)
    printed = printed_centres(tex)
    if printed is None:
        raws = '; '.join(raw for _, _, raw in stored)
        fail('(rest-root sentence not found)', raws if raws else '(none)')
    paired = pair_centres(printed, stored)
    for centre, mid, rad, raw in paired:
        if not last_digit_forced(centre, rad) or Decimal(rad) >= Decimal('1e-24'):
            fail(centre, raw)
    positives = [i for i, item in enumerate(paired) if Decimal(item[1]) > 0]
    negatives = [i for i, item in enumerate(paired) if Decimal(item[1]) < 0]
    if len(positives) != 1:
        raise SystemExit('expected one positive root, found %d' % len(positives))
    if not negatives:
        raise SystemExit('expected a negative root')
    bumped_pos = reject_bump(printed, paired, positives[0])
    bumped_neg = reject_bump(printed, paired, negatives[0])
    print('PASS')
    for centre, mid, rad, raw in paired:
        print('manuscript: %s' % centre)
        print('certificate: %s' % raw)
    pos_mid = paired[positives[0]][1]
    neg_mid = paired[negatives[0]][1]
    print('negative control: last stored digit %s -> %s mismatches' % (
        pos_mid[-1], bumped_pos[-1]))
    print('negative control: last stored digit %s -> %s mismatches' % (
        neg_mid[-1], bumped_neg[-1]))
    return 0


if __name__ == '__main__':
    sys.exit(main())
