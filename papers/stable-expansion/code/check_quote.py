#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Quote check for the four- and five-vortex expansions.

paper/stable-expansion.tex prints prefixes of P, vartheta, c, the five-vortex
winding and imaginary parts, b'(0) and the two roots u. The proof also prints
c to 15 digits with radius 1.4e-14, and says the tightened enclosure has
radius below 10^{-93}. The stored lines are in data/verify-stable-expansion.txt.

A prefix followed by an ellipsis is supported when every point of one stored
ball chops to those digits. The printed radius 1.4e-14 must contain the
stored ball. This program only reads the manuscript and that file. It does
not import a proof program.

Negative control, in memory only: the last digit of vartheta is increased
by one. That copy must not chop from the same ball.
"""
import os
import re
import sys
from decimal import Decimal, getcontext

getcontext().prec = 80

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, '..', 'paper', 'stable-expansion.tex')
LOG = os.path.join(HERE, '..', 'data', 'verify-stable-expansion.txt')

BALL = re.compile(
    r'\[+\s*([+-]?(?:\d+\.\d+))\s*\+/-\s*([0-9.eE+-]+)\s*\]+'
)


def fail(printed, stored, reason=None):
    print('FAIL')
    if reason:
        print(reason)
    print('manuscript: %s' % printed)
    print('certificate: %s' % stored)
    sys.exit(1)


def places(text):
    return len(text.split('.')[1]) if '.' in text else 0


def chop_bounds(prefix):
    """Half-open interval of numbers whose chopped expansion is `prefix`."""
    start = Decimal(prefix)
    step = Decimal(1).scaleb(-places(prefix))
    if start >= 0:
        return start, start + step
    return start - step, start


def shares(lo, hi, prefix):
    left, right = chop_bounds(prefix)
    if Decimal(prefix) >= 0:
        return left <= lo and hi < right
    return left < lo and hi <= right


def balls(text):
    found = []
    for match in BALL.finditer(text):
        mid, rad = Decimal(match.group(1)), Decimal(match.group(2))
        found.append((match.group(1), match.group(2), mid - rad, mid + rad, match.group(0)))
    return found


def supporting(text, prefix):
    hits = [item for item in balls(text) if shares(item[2], item[3], prefix)]
    if not hits:
        return None
    hits.sort(key=lambda item: Decimal(item[1]))
    return hits[0]


def grab(tex, pattern, name):
    match = re.search(pattern, tex)
    if not match:
        fail(name, '(phrase not found)')
    return match.group(1)


def check_prefix(log, prefix, name):
    hit = supporting(log, prefix)
    if hit is None:
        fail(prefix, '(no ball chops to these digits)', name)
    print('manuscript: %s' % prefix)
    print('certificate: %s' % hit[4])
    return hit


def bump(prefix):
    body = prefix[1:] if prefix[:1] == '-' else prefix
    sign = '-' if prefix[:1] == '-' else ''
    whole, dot, frac = body.partition('.')
    digits = list(frac)
    digits[-1] = str((int(digits[-1]) + 1) % 10)
    return sign + whole + '.' + ''.join(digits)


def main():
    with open(TEX, encoding='utf-8') as handle:
        tex = handle.read()
    with open(LOG, encoding='utf-8') as handle:
        log = handle.read()

    four_p = grab(tex, r'P = b/2 = ([0-9]+\.[0-9]+)\\ldots', 'four P')
    vartheta = grab(tex, r'\\vartheta = ([0-9]+\.[0-9]+)\\ldots', 'vartheta')
    four_c = grab(tex, r'here \$c = ([0-9]+\.[0-9]+)\\ldots', 'four c')
    five_p = grab(tex, r'winding \$P = ([0-9]+\.[0-9]+)\\ldots', 'five P')
    imags = re.findall(r'1 \\pm ([0-9]+\.[0-9]+)\\ldots i', tex)
    if len(imags) != 2:
        fail('two imaginary parts', '%d found' % len(imags))
    bprime = grab(tex, r"b'\(0\) = ([0-9]+\.[0-9]+)\\ldots", "b'")
    bprime5 = grab(tex, r"b'\(0\) = (-[0-9]+\.[0-9]+)\\ldots", "five b'")
    roots = re.findall(r'u_([12]) = (-[0-9]+\.[0-9]+)\\ldots', tex)
    if [item[0] for item in roots] != ['1', '2']:
        fail('u1 and u2', str(roots))
    printed_c = grab(
        tex,
        r'printed to \$15\$ digits as \$([0-9]+\.[0-9]+) \\pm ([0-9]+\.[0-9]+)\\cdot\s*10\^\{-(\d+)\}',
        '15-digit c')
    # grab only returned group 1; re-read the match
    shown = re.search(
        r'printed to \$15\$ digits as \$([0-9]+\.[0-9]+) \\pm ([0-9]+\.[0-9]+)\\cdot\s*10\^\{-(\d+)\}',
        tex)
    c_mid, c_rad_digits, c_exp = shown.group(1), shown.group(2), shown.group(3)
    digits = c_mid.replace('.', '')
    if len(digits) != 15:
        fail('15 digits', c_mid, 'printed midpoint has %d digits' % len(digits))
    printed_radius = Decimal(c_rad_digits) * Decimal(10) ** (-int(c_exp))

    for name, prefix in (
        ('four P', four_p),
        ('vartheta', vartheta),
        ('four c', four_c),
        ('five P', five_p),
        ('imaginary part', imags[0]),
        ('imaginary part', imags[1]),
        ("b'", bprime),
        ("five b'", bprime5),
        ('u1', roots[0][1]),
        ('u2', roots[1][1]),
    ):
        check_prefix(log, prefix, name)

    stored = None
    for mid_text, rad_text, lo, hi, raw in balls(log):
        if mid_text == c_mid:
            stored = (Decimal(rad_text), lo, hi, raw)
            break
    if stored is None:
        fail(c_mid, '(midpoint not stored)')
    rad, lo, hi = stored[0], stored[1], stored[2]
    center = Decimal(c_mid)
    if max(abs(lo - center), abs(hi - center)) >= printed_radius or rad >= printed_radius:
        fail(
            '%s ± %s' % (c_mid, format(printed_radius, 'e')),
            stored[3],
            'stored ball is not inside the printed radius')
    print('manuscript: %s ± %s' % (c_mid, format(printed_radius, 'e')))
    print('certificate: %s' % stored[3])

    for phrase, cap in (
        ('unique in the box of radius 1e-4', Decimal('1e-4')),
        ('unique in the box of radius 1e-5', Decimal('1e-5')),
    ):
        if phrase not in log:
            fail(phrase, '(not in the log)')
        print('manuscript: box %s' % format(cap, 'e'))
        print('certificate: %s' % phrase)
    caps = re.findall(r'enclosure radius at most ([0-9.eE+-]+)', log)
    if len(caps) < 2:
        fail('radius below 10^{-93}', '%d lines' % len(caps))
    for cap in caps:
        if Decimal(cap) >= Decimal('1e-93'):
            fail('radius below 10^{-93}', cap)
        print('manuscript: radius below 10^{-93}')
        print('certificate: at most %s' % cap)

    moved = bump(vartheta)
    if supporting(log, moved) is not None:
        fail(moved, vartheta, 'negative control still chopped to a stored ball')
    print('negative control: last digit of %s -> %s leaves the ball' % (vartheta, moved))
    print('PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
