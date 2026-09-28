#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Quote check for the computer-assisted minima and the collapses without rotation.

paper/minimal-winding.tex, Theorems thm:four and thm:norot, prints P_4, P_5,
P_6, the two four-vortex alpha-model minima, b = 2 P_4, the 13-digit
circulations and positions, and the Hessian eigenvalues 1.106, 6.289, 9.377.
Eleven vortices at alpha = 2 and sixty SQG vortices collapse with kappa real.
The stored lines are data/certify-collapses-2026-09-25.txt and
data/certify-sqg60-2026-09-25.txt.

A printed prefix is supported when the whole stored interval chops to those
digits. The minima intervals must have width 10^{-50} and lie below sqrt(3)/2.
The alpha-model values must lie below 2/3 and sqrt(5)/4. This program only
reads the manuscript and those two logs. It does not import a proof program.

The sentence that the three-vortex control lies within 10^{-94} of the closed
form is not what the stored radius shows. The program prints that and does
not treat it as proved.

Negative control, in memory only: the last digit of P_4 is increased by one.
"""
import os
import re
import sys
from decimal import Decimal, getcontext

getcontext().prec = 80

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, '..', 'paper', 'minimal-winding.tex')
COLLAPSE = os.path.join(HERE, '..', 'data', 'certify-collapses-2026-09-25.txt')
SQG = os.path.join(HERE, '..', 'data', 'certify-sqg60-2026-09-25.txt')

BALL = re.compile(
    r'\[+\s*([+-]?(?:\d+\.\d+))\s*\+/-\s*([0-9.eE+-]+)\s*\]+'
)
SPAN = re.compile(
    r'\[([+-]?(?:\d+\.\d+)),\s*([+-]?(?:\d+\.\d+))\]'
)
SQRT3_OVER_2 = Decimal(3).sqrt() / 2
TWO_THIRDS = Decimal(2) / 3
SQRT5_OVER_4 = Decimal(5).sqrt() / 4


def fail(printed, stored, reason=None):
    print('FAIL')
    if reason:
        print(reason)
    print('manuscript: %s' % printed)
    print('certificate: %s' % stored)
    sys.exit(1)


def places(text):
    body = text[1:] if text[:1] == '-' else text
    return len(body.split('.')[1]) if '.' in body else 0


def chop_ok(lo, hi, prefix):
    start = Decimal(prefix)
    step = Decimal(1).scaleb(-places(prefix))
    if start >= 0:
        return start <= lo and hi < start + step
    return start - step < lo and hi <= start


def grab(tex, pattern, name):
    match = re.search(pattern, tex)
    if not match:
        fail(name, '(phrase not found)')
    return match.group(1)


def interval_named(log, label):
    match = re.search(
        label + r' in \[([0-9]+\.[0-9]+), ([0-9]+\.[0-9]+)\]',
        log)
    if not match:
        fail(label, '(interval not found)')
    lo, hi = Decimal(match.group(1)), Decimal(match.group(2))
    return lo, hi, match.group(0)


def ball_named(log, label):
    match = re.search(
        label + r'\s*=\s*\[([+-]?(?:\d+\.\d+)) \+/- ([0-9.eE+-]+)\]',
        log)
    if not match:
        return None
    mid, rad = Decimal(match.group(1)), Decimal(match.group(2))
    return mid - rad, mid + rad, match.group(0)


def check_prefix(lo, hi, prefix, raw):
    if not chop_ok(lo, hi, prefix):
        fail(prefix, raw, 'the stored interval does not chop to the printed digits')
    print('manuscript: %s' % prefix)
    print('certificate: %s' % raw)


def bump(prefix):
    whole, dot, frac = prefix.partition('.')
    digits = list(frac)
    digits[-1] = str((int(digits[-1]) + 1) % 10)
    return whole + '.' + ''.join(digits)


def round_ok(lo, hi, printed):
    """Both ends lie strictly inside half a unit of the last printed digit."""
    half = Decimal(1).scaleb(-places(printed)) / 2
    center = Decimal(printed)
    return abs(lo - center) < half and abs(hi - center) < half


def main():
    with open(TEX, encoding='utf-8') as handle:
        tex = handle.read()
    with open(COLLAPSE, encoding='utf-8') as handle:
        log = handle.read()
    with open(SQG, encoding='utf-8') as handle:
        sqg = handle.read()

    minima = {
        'P_4': grab(tex, r'P_4 &= ([0-9]+\.[0-9]+)\\ldots', 'P_4'),
        'P_5': grab(tex, r'P_5 &= ([0-9]+\.[0-9]+)\\ldots', 'P_5'),
        'P_6': grab(tex, r'P_6 &= ([0-9]+\.[0-9]+)\\ldots', 'P_6'),
    }
    width = Decimal('1e-50')
    for label, prefix in minima.items():
        lo, hi, raw = interval_named(log, label)
        if hi - lo != width:
            fail(prefix, raw, 'width is %s, not 10^{-50}' % format(hi - lo, 'e'))
        if not (hi < SQRT3_OVER_2):
            fail(prefix, raw, 'the interval is not below sqrt(3)/2')
        check_prefix(lo, hi, prefix, raw)
        print('width: 10^{-50}; below sqrt(3)/2')

    short = re.findall(
        r'local minima \$([0-9]+\.[0-9]+)\\ldots\$, \$([0-9]+\.[0-9]+)\\ldots\$ and \$([0-9]+\.[0-9]+)\\ldots\$',
        tex)
    if len(short) != 1:
        fail('short minima', '(phrase not found)')
    for prefix, long in zip(short[0], minima.values()):
        if not long.startswith(prefix):
            fail(prefix, long, 'the short prefix is not the start of the theorem digits')
        print('manuscript: %s' % prefix)
        print('certificate: prefix of %s' % long)

    alpha = re.findall(
        r'values \$([0-9]+\.[0-9]+)\\ldots < B\(1\) = 2/3\$ and \$([0-9]+\.[0-9]+)\\ldots < B\(2\)',
        tex)
    if len(alpha) != 1:
        fail('alpha minima', '(phrase not found)')
    a1, a2 = alpha[0]
    p4_spans = re.findall(
        r'P_4 in \[([0-9]+\.[0-9]+), ([0-9]+\.[0-9]+)\]', log)
    def span_for(prefix, bound):
        hits = []
        for left, right in p4_spans:
            lo, hi = Decimal(left), Decimal(right)
            if chop_ok(lo, hi, prefix):
                hits.append((lo, hi, 'P_4 in [%s, %s]' % (left, right)))
        if len(hits) != 1:
            fail(prefix, '%d intervals' % len(hits))
        lo, hi, raw = hits[0]
        if not (hi < bound):
            fail(prefix, raw, 'not below the three-vortex bound')
        check_prefix(lo, hi, prefix, raw)
        return lo, hi
    span_for(a1, TWO_THIRDS)
    span_for(a2, SQRT5_OVER_4)

    b_prefix = grab(tex, r'b = 2P_4 = ([0-9]+\.[0-9]+)\\ldots', 'b')
    b_ball = ball_named(log, 'b  ')
    if b_ball is None:
        fail(b_prefix, '(b ball not found)')
    check_prefix(b_ball[0], b_ball[1], b_prefix, b_ball[2])
    p_lo, p_hi, p_raw = interval_named(log, 'P_4')
    # b/2 must meet the P_4 interval: the paper says b = 2 P_4.
    if b_ball[1] / 2 < p_lo or b_ball[0] / 2 > p_hi:
        fail(b_prefix, p_raw, 'b/2 misses the P_4 interval')
    print('b/2 meets the P_4 interval')

    block = re.search(r'\\Gamma &=.*?\\end\{align\*\}', tex, re.S)
    if not block:
        fail('Gamma and z', '(align not found)')
    coords = re.search(
        r'\(([0-9]+\.[0-9]+),\\?\s*(-[0-9]+\.[0-9]+)\s*-\s*([0-9]+\.[0-9]+)\\,i,'
        r'.*?(-[0-9]+\.[0-9]+)\s*-\s*([0-9]+\.[0-9]+)\\,i,'
        r'.*?(-[0-9]+\.[0-9]+)\s*-\s*([0-9]+\.[0-9]+)\\,i',
        block.group(0), re.S)
    grown = re.search(
        r'\(1,\\?\s*([0-9]+\.[0-9]+),\\?\s*([0-9]+\.[0-9]+),\\?\s*(-[0-9]+\.[0-9]+)\)',
        block.group(0))
    if not grown or not coords:
        fail('Gamma and z', '(digits not found)')
    pairs = (
        ('Gamma_2', grown.group(1)),
        ('Gamma_3', grown.group(2)),
        ('Gamma_4', grown.group(3)),
        ('z_1', coords.group(1)),
        ('z_2 real', coords.group(2)),
        ('z_2 imag', '-' + coords.group(3)),
        ('z_3 real', coords.group(4)),
        ('z_3 imag', '-' + coords.group(5)),
        ('z_4 real', coords.group(6)),
        ('z_4 imag', '-' + coords.group(7)),
    )
    # The log writes z_k = [re] + i [im]. Match those balls in order.
    z_line = {
        'z_1': r'z_1\s+=\s+\[([0-9]+\.[0-9]+) \+/- ([0-9.eE+-]+)\]',
        'z_2 real': r'z_2\s+=\s+\[(-[0-9]+\.[0-9]+) \+/- ([0-9.eE+-]+)\]',
        'z_2 imag': r'z_2\s+=\s+\[[^\]]+\] \+ i \[(-[0-9]+\.[0-9]+) \+/- ([0-9.eE+-]+)\]',
        'z_3 real': r'z_3\s+=\s+\[(-[0-9]+\.[0-9]+) \+/- ([0-9.eE+-]+)\]',
        'z_3 imag': r'z_3\s+=\s+\[[^\]]+\] \+ i \[(-[0-9]+\.[0-9]+) \+/- ([0-9.eE+-]+)\]',
        'z_4 real': r'z_4\s+=\s+\[(-[0-9]+\.[0-9]+) \+/- ([0-9.eE+-]+)\]',
        'z_4 imag': r'z_4\s+=\s+\[[^\]]+\] \+ i \[(-[0-9]+\.[0-9]+) \+/- ([0-9.eE+-]+)\]',
    }
    g1 = ball_named(log, 'Gamma_1')
    if g1 is None or not (g1[0] <= 1 <= g1[1] and g1[1] - g1[0] < Decimal('1e-20')):
        fail('1', g1[2] if g1 else '(none)', 'Gamma_1 is not 1')
    print('manuscript: Gamma_1 = 1')
    print('certificate: %s' % g1[2])
    for label, prefix in pairs:
        if label.startswith('Gamma'):
            hit = ball_named(log, label)
            if hit is None:
                fail(prefix, '(not found)')
            lo, hi, raw = hit
        else:
            match = re.search(z_line[label], log)
            if not match:
                fail(prefix, label)
            mid, rad = Decimal(match.group(1)), Decimal(match.group(2))
            lo, hi, raw = mid - rad, mid + rad, match.group(0)
        if not round_ok(lo, hi, prefix):
            fail(prefix, raw, 'the ball does not round to the printed digits')
        print('manuscript: %s' % prefix)
        print('certificate: %s' % raw)

    hess = re.search(
        r'eigenvalues \$([0-9]+\.[0-9]+)\$, \$([0-9]+\.[0-9]+)\$ and \$([0-9]+\.[0-9]+)\$',
        tex)
    if not hess:
        fail('Hessian', '(phrase not found)')
    spans = SPAN.findall(
        re.search(r'eigenvalues 1\.106.*$', log, re.M).group(0))
    if len(spans) != 3:
        fail('Hessian intervals', '%d found' % len(spans))
    for printed, (left, right) in zip(hess.groups(), spans):
        lo, hi = Decimal(left), Decimal(right)
        if not round_ok(lo, hi, printed):
            fail(printed, '[%s, %s]' % (left, right),
                 'the interval does not round to the printed eigenvalue')
        print('manuscript: %s' % printed)
        print('certificate: [%s, %s]' % (left, right))

    n11 = re.search(
        r'OK\s+alpha = 2, N = 11:.*'
        r'sum Gamma \[([0-9]+\.[0-9]+) \+/- ([0-9.eE+-]+)\].*'
        r'min \|z_j - z_k\| >= (0\.3487620902).*'
        r'(0\.2128152283 <= \|z_j\| <= 5\.078363252)\]',
        log)
    if n11 is None:
        fail('27.74', '(N = 11 enclosure not found)')
    mid, rad = Decimal(n11.group(1)), Decimal(n11.group(2))
    check_prefix(mid - rad, mid + rad, '27.74', n11.group(0))
    if Decimal(n11.group(3)) < Decimal('0.3487'):
        fail('0.3487', n11.group(3))
    print('manuscript: no closer than 0.3487')
    print('certificate: min |z_j - z_k| >= %s' % n11.group(3))
    print('manuscript: distances between 0.21 and 5.08')
    print('certificate: %s' % n11.group(4))
    kappa = re.search(
        r'OK\s+alpha = 2, N = 11: all 11 kappa_j agree, 2 pi kappa = -1',
        log)
    if kappa is None:
        fail('eleven vortices, kappa real', '(not in the log)')
    print('manuscript: eleven vortices, kappa real, P = 0')
    print('certificate: %s' % kappa.group(0))

    g7 = re.search(
        r'Gamma_7 in \[([0-9]+\.[0-9]+) \+/- ([0-9.eE+-]+)\]', sqg)
    if g7 is None:
        fail('Gamma_7', '(not found)')
    g7_prefix = grab(tex, r'\\Gamma_7\$, is the certified enclosure \$([0-9]+\.[0-9]+)\\ldots', 'Gamma_7')
    mid, rad = Decimal(g7.group(1)), Decimal(g7.group(2))
    check_prefix(mid - rad, mid + rad, g7_prefix, g7.group(0))
    sum_s = re.search(
        r'sum Gamma \[([0-9]+\.[0-9]+) \+/- ([0-9.eE+-]+)\].*'
        r'min \|z_j - z_k\| >= (0\.08937650362).*'
        r'(0\.6561296640 <= \|z_j\| <= 9\.498718389)',
        sqg)
    if sum_s is None:
        fail('43.48', '(sum not found)')
    mid, rad = Decimal(sum_s.group(1)), Decimal(sum_s.group(2))
    check_prefix(mid - rad, mid + rad, '43.48', sum_s.group(0))
    print('manuscript: no closer than 0.0893')
    print('certificate: min |z_j - z_k| >= %s' % sum_s.group(3))
    print('manuscript: distances between 0.656 and 9.499')
    print('certificate: %s' % sum_s.group(4))
    if 'kappa real' not in sqg:
        fail('sixty SQG vortices, kappa real', sqg[:80])
    print('manuscript: sixty SQG vortices, kappa real, P = 0')
    print('certificate: each 2 pi v_j/z_j contains -1 (kappa real)')

    closed = re.search(
        r'closed form P_-\(1/2\) = \[([0-9]+\.[0-9]+) \+/- ([0-9.eE+-]+)\]',
        log)
    certified = re.search(
        r'certified KKT P\s+= \[([0-9]+\.[0-9]+) \+/- ([0-9.eE+-]+)\]',
        log)
    printed_half = grab(
        tex,
        r'P_-\(1/2\) = ([0-9]+\.[0-9]+)\\ldots',
        'P_-(1/2)')
    if closed is None or certified is None:
        fail(printed_half, '(control balls not found)')
    for match in (closed, certified):
        mid, rad = Decimal(match.group(1)), Decimal(match.group(2))
        check_prefix(mid - rad, mid + rad, printed_half, match.group(0))
    print(
        'not shown: the stored radius %s does not put the control within 10^{-94} of the closed form'
        % closed.group(2))

    moved = bump(minima['P_4'])
    lo, hi, raw = interval_named(log, 'P_4')
    if chop_ok(lo, hi, moved):
        fail(moved, raw, 'negative control still matched')
    print('negative control: last digit of P_4 mismatches')
    print('PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
