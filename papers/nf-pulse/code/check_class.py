#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Class-bracket check for Definition def:class.

paper/nf-pulse.tex sets
  c_lo = 1.1027477097341592491478677357466217332550533837818208789272,
  c_hi = c_lo + 10^{-58},
and says [c_lo, c_hi] lies inside (c_1, c_2) of Theorem fast, where
  c_1 = 1.1027477097341592491478677, c_2 = c_1 + 10^{-25}.

A stored copy of the endpoint is in ext/stability/data/ (the digit string
also appears in winding_bottom.json). This program only reads the manuscript
and that copy. It does not import a proof program and does not edit the tex.

Every comparison is made in decimal and in exact rationals; the two must
agree. The printed c_lo must be the stored endpoint truncated to the printed
digits, and any stored radius (and the tail beyond those digits) must lie
below half a unit in the last printed place. c_hi - c_lo must be exactly
10^{-58}, and c_1 < c_lo < c_hi < c_2. If the printed bracket is not inside
(c_1, c_2), the program exits 1.

Negative control, in memory only: adding 10^{-58} to c_lo is not enough to
leave (c_1, c_2). The program then adds 10^{-25}, the width of (c_1, c_2).
That shift must exit, because c_lo > c_1 forces c_lo + 10^{-25} > c_2.
"""
import json
import os
import re
import sys
from decimal import Decimal, getcontext
from fractions import Fraction

getcontext().prec = 120

HERE = os.path.dirname(os.path.abspath(__file__))
PAPER = os.path.join(HERE, '..')
TEX = os.path.join(PAPER, 'paper', 'nf-pulse.tex')
DATA = os.path.join(PAPER, 'ext', 'stability', 'data')

BALL = re.compile(
    r'^\[([+-]?(?:\d+\.\d+)) \+/- ([0-9.eE+-]+)\]$')
PLAIN = re.compile(r'^[+-]?\d+\.\d+$')
NAMED = 'winding_bottom.json'


def fail(reason):
    print('FAIL')
    print(reason)
    sys.exit(1)


def as_fraction(value):
    if isinstance(value, Fraction):
        return value
    if isinstance(value, Decimal):
        return Fraction(value)
    return Fraction(str(value))


def as_decimal(value):
    if isinstance(value, Decimal):
        return value
    if isinstance(value, Fraction):
        return Decimal(value.numerator) / Decimal(value.denominator)
    return Decimal(str(value))


def cmp_sign(left, right):
    """-1, 0 or 1. Decimal and Fraction must agree."""
    ld, rd = as_decimal(left), as_decimal(right)
    lf, rf = as_fraction(left), as_fraction(right)
    dec = (ld > rd) - (ld < rd)
    rat = (lf > rf) - (lf < rf)
    if dec != rat:
        fail('decimal and rational disagree on %s ? %s' % (left, right))
    return dec


def truncate_midpoint(mid, places):
    """Chop a stored decimal to `places` digits after the point."""
    text = mid[1:] if mid[:1] in '+-' else mid
    sign = '-' if mid[:1] == '-' else ''
    if 'e' in text.lower():
        rendered = format(as_decimal(mid), 'f')
        sign = '-' if rendered[:1] == '-' else ''
        text = rendered[1:] if sign else rendered
    whole, dot, frac = text.partition('.')
    if not dot:
        frac = ''
    if len(frac) < places:
        frac = frac.ljust(places, '0')
    if places == 0:
        return sign + whole
    return sign + whole + '.' + frac[:places]


def half_ulp(places):
    return Fraction(1, 2 * 10 ** places)


def theorem_body(tex, label):
    match = re.search(
        r'\\begin\{theorem\}.*?\\label\{%s\}(.*?)\\end\{theorem\}' % re.escape(label),
        tex, re.S)
    if not match:
        fail('theorem %s not found' % label)
    return match.group(1)


def definition_body(tex, label):
    match = re.search(
        r'\\begin\{definition\}.*?\\label\{%s\}(.*?)\\end\{definition\}'
        % re.escape(label),
        tex, re.S)
    if not match:
        fail('definition %s not found' % label)
    return match.group(1)


def class_claim(defn):
    match = re.search(
        r'c_\{\\mathrm\{lo\}\}\s*=\s*([0-9]+\.[0-9]+)'
        r'.*?c_\{\\mathrm\{hi\}\}\s*=\s*c_\{\\mathrm\{lo\}\}\s*\+\s*10\^\{-(\d+)\}',
        defn, re.S)
    if not match:
        fail('c_lo / c_hi phrase not found in Definition def:class')
    printed, exponent = match.group(1), int(match.group(2))
    if exponent != 58:
        fail('c_hi - c_lo is 10^{-%d}, not 10^{-58}' % exponent)
    return printed, exponent


def fast_claim(theorem):
    match = re.search(
        r'c_1 = ([0-9]+\.[0-9]+),\s*\\qquad c_2 = c_1 \+ 10\^\{-(\d+)\}',
        theorem)
    if not match:
        fail('c_1 / c_2 phrase not found in Theorem thm:fast')
    printed, exponent = match.group(1), int(match.group(2))
    if exponent != 25:
        fail('c_2 - c_1 is 10^{-%d}, not 10^{-25}' % exponent)
    return printed, exponent


def inside_sentence(tex):
    match = re.search(
        r'The bracket \$\[c_\{\\mathrm\{lo\}\},\s*c_\{\\mathrm\{hi\}\}\]\$ '
        r'lies inside the bracket \$\(c_1,\s*c_2\)\$ of Theorem~\\ref\{thm:fast\}\.',
        tex)
    if not match:
        fail('manuscript does not say [c_lo, c_hi] lies inside (c_1, c_2)')


def endpoint_of(text):
    """Return (midpoint, radius or None) for a decimal or a two-sided ball."""
    raw = text.strip()
    ball = BALL.match(raw)
    if ball:
        return ball.group(1), ball.group(2)
    if PLAIN.match(raw):
        return raw, None
    return None, None


def walk_strings(value, path):
    if isinstance(value, str):
        yield path, value
    elif isinstance(value, dict):
        for key in sorted(value):
            yield from walk_strings(value[key], '%s/%s' % (path, key))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from walk_strings(item, '%s[%d]' % (path, index))


def endpoints_in(doc, printed, places):
    found = []
    for path, raw in walk_strings(doc, ''):
        mid, rad = endpoint_of(raw)
        if mid is None:
            continue
        if truncate_midpoint(mid, places) != printed:
            continue
        found.append((path, mid, rad, raw))
    return found


def files_with_digits(folder, digits):
    hits = []
    for name in sorted(os.listdir(folder)):
        path = os.path.join(folder, name)
        if not os.path.isfile(path) or not name.endswith('.json'):
            continue
        with open(path, encoding='utf-8') as handle:
            text = handle.read()
        if digits in text:
            hits.append(path)
    return hits


def choose_file(hits):
    for path in hits:
        if os.path.basename(path) == NAMED:
            return path
    return hits[0]


def load_json(path):
    with open(path, encoding='utf-8') as handle:
        try:
            return json.load(handle)
        except json.JSONDecodeError as exc:
            fail('%s is not JSON: %s' % (path, exc))


def strictly_inside(lo, hi, c1, c2):
    return cmp_sign(c1, lo) < 0 and cmp_sign(hi, c2) < 0


def main():
    with open(TEX, encoding='utf-8') as handle:
        tex = handle.read()
    inside_sentence(tex)
    c_lo, hi_exp = class_claim(definition_body(tex, 'def:class'))
    c_1, c2_exp = fast_claim(theorem_body(tex, 'thm:fast'))
    places = len(c_lo.split('.')[1])
    if places != hi_exp:
        fail('printed c_lo has %d digits after the point, not %d' % (places, hi_exp))

    width = Fraction(1, 10 ** hi_exp)
    c_hi = as_fraction(c_lo) + width
    c_2 = as_fraction(c_1) + Fraction(1, 10 ** c2_exp)
    if cmp_sign(c_hi - as_fraction(c_lo), width) != 0:
        fail('c_hi - c_lo is not 10^{-58}')
    if as_decimal(c_hi) - as_decimal(c_lo) != as_decimal(width):
        fail('decimal width is not 10^{-58}')

    hits = files_with_digits(DATA, c_lo)
    if not hits:
        fail('digit string of c_lo not found under ext/stability/data')
    path = choose_file(hits)
    chosen = endpoints_in(load_json(path), c_lo, places)
    if not chosen:
        fail('no stored endpoint in %s truncates to the printed c_lo' % path)
    fractions = {as_fraction(mid) for _p, mid, _r, _raw in chosen}
    if len(fractions) != 1:
        fail('stored endpoints in %s that truncate to c_lo are not equal' % path)
    for other in hits:
        others = endpoints_in(load_json(other), c_lo, places)
        if not others:
            fail('%s contains the digits but no truncating endpoint' % other)
        if {as_fraction(mid) for _p, mid, _r, _raw in others} != fractions:
            fail('%s stores a different endpoint' % other)

    field, mid, rad, raw = max(chosen, key=lambda item: len(item[1]))
    if truncate_midpoint(mid, places) != c_lo:
        fail('printed c_lo is not the stored endpoint truncated to %d digits' % places)
    tail = abs(as_fraction(mid) - as_fraction(c_lo))
    ulp = half_ulp(places)
    if cmp_sign(tail, ulp) >= 0:
        fail('stored tail %s is not below half a unit in the last place' % tail)
    if rad is not None:
        if cmp_sign(rad, ulp) >= 0:
            fail('stored radius %s is not below half a unit in the last place' % rad)

    if not strictly_inside(c_lo, c_hi, c_1, c_2):
        fail('printed bracket is not inside (c_1, c_2)')

    shift_small = Fraction(1, 10 ** 58)
    small_lo = as_fraction(c_lo) + shift_small
    small_hi = c_hi + shift_small
    small_inside = strictly_inside(small_lo, small_hi, c_1, c_2)
    if not small_inside:
        if cmp_sign(small_hi, c_2) == 0:
            print('negative control: shift 10^{-58}; shifted c_hi meets c_2')
        else:
            print('negative control: shift 10^{-58} is not strictly inside (c_1, c_2)')
        used = '10^{-58}'
    else:
        # Width of (c_1, c_2). Any point strictly above c_1, shifted by this
        # width, lands strictly above c_2.
        shift = Fraction(1, 10 ** 25)
        shifted_lo = as_fraction(c_lo) + shift
        shifted_hi = c_hi + shift
        if strictly_inside(shifted_lo, shifted_hi, c_1, c_2) or cmp_sign(shifted_lo, c_2) <= 0:
            fail('shift 10^{-25} did not push c_lo strictly above c_2')
        used = '10^{-25}'

    print('manuscript: c_lo = %s' % c_lo)
    print('manuscript: c_hi = c_lo + 10^{-58}')
    print('manuscript: c_1 = %s' % c_1)
    print('manuscript: c_2 = c_1 + 10^{-25}')
    print('manuscript: [c_lo, c_hi] lies inside (c_1, c_2)')
    print('file: %s' % os.path.abspath(path))
    print('stored field: %s' % field)
    print('stored: %s' % raw)
    print('truncated: %s' % truncate_midpoint(mid, places))
    if rad is None:
        print('stored radius: none')
    else:
        print('stored radius: %s' % rad)
    print('half ulp: %s' % format(as_decimal(ulp), 'f'))
    print('tail: %s' % format(as_decimal(tail), 'f'))
    print('width: c_hi - c_lo = 10^{-58}')
    print('decimal and rational: agree')
    print('inside: c_1 < c_lo and c_hi < c_2')
    if used == '10^{-58}':
        print('negative control: used shift 10^{-58}')
    else:
        print('negative control: adding 10^{-58} to c_lo stays strictly inside (c_1, c_2)')
        print('negative control: used shift 10^{-25}; shifted c_lo > c_2')
    print('PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
