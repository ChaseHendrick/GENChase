#!/usr/bin/env python3
"""Check one manuscript quote against the certificate that supports it.

The manuscript says that \\ELstar is the outward rounding of the ball on the
line of data/certify_equilibria_hopf.txt that begins "E_l* =".  The printed
endpoints must be exactly that outward rounding (so the stored ball is
contained in them).  Does not rewrite the paper or the data.

One in-memory negative control mutates the printed upper endpoint and must
be rejected by the same test.
"""
import math
import os
import re
import sys
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
TEX = os.path.join(ROOT, 'paper', 'hh-dynamics.tex')
HOPF = os.path.join(ROOT, 'data', 'certify_equilibria_hopf.txt')

PRINTED = re.compile(
    r'\\newcommand\{\\ELstar\}\{\[([0-9]+(?:\.[0-9]+)?),\\allowbreak ([0-9]+(?:\.[0-9]+)?)\]\}')
STORED = re.compile(
    r'^   E_l\* = \[([0-9]+(?:\.[0-9]+)?) \+/- ([0-9]+(?:\.[0-9]+)?(?:e[+-]?[0-9]+)?)\]',
    re.M)


def one(pat, text, what):
    ms = list(pat.finditer(text))
    if len(ms) != 1:
        raise SystemExit('%s matched %d times' % (what, len(ms)))
    return ms[0]


def decimals(s):
    return len(s.split('.', 1)[1]) if '.' in s else 0


def fixed(q, d, up):
    """Outward decimal with d places: floor the lower end, ceil the upper."""
    n = math.ceil(q * 10 ** d) if up else math.floor(q * 10 ** d)
    sign = '-' if n < 0 else ''
    n = abs(n)
    ip, fp = divmod(n, 10 ** d)
    return sign + str(ip) + (('.' + str(fp).zfill(d)) if d else '')


def supported(printed_lo, printed_hi, mid, rad):
    """Exact outward-rounding digits.  They contain the ball [mid-rad, mid+rad]."""
    d = decimals(printed_lo)
    if decimals(printed_hi) != d:
        return False
    lo, hi = mid - rad, mid + rad
    return printed_lo == fixed(lo, d, False) and printed_hi == fixed(hi, d, True)


def main():
    tex = open(TEX, encoding='utf-8').read()
    hopf = open(HOPF, encoding='utf-8').read()
    pm = one(PRINTED, tex, r'\ELstar')
    sm = one(STORED, hopf, 'E_l* ball')
    printed = (pm.group(1), pm.group(2))
    mid, rad = Fraction(sm.group(1)), Fraction(sm.group(2))

    bad_hi = printed[1][:-1] + ('0' if printed[1][-1] != '0' else '1')
    if supported(printed[0], bad_hi, mid, rad):
        raise SystemExit('negative control accepted a mutated upper endpoint %s' % bad_hi)

    if not supported(*printed, mid, rad):
        raise SystemExit('ELstar %s is not the outward rounding of [%s +/- %s]'
                         % (printed, sm.group(1), sm.group(2)))

    lo, hi = mid - rad, mid + rad
    d = decimals(printed[0])
    print('ELstar [%s, %s] matches the outward rounding to %d decimals' % (printed[0], printed[1], d))
    print('of E_l* = [%s +/- %s] in data/certify_equilibria_hopf.txt' % (sm.group(1), sm.group(2)))
    print('stored ball [%s, %s] is contained in the printed interval' % (fixed(lo, d, False), fixed(hi, d, True)))
    print('negative control rejected in-memory upper endpoint %s' % bad_hi)
    return 0


if __name__ == '__main__':
    sys.exit(main())
