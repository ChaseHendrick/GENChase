"""Outward-rounded decimal printing of proved bounds.

A printed lower bound is a decimal number <= the lower endpoint of its ball, a printed upper bound is a
decimal number >= the upper endpoint, so a printed statement never claims more than the ball proves.

The endpoints of an arb ball (x.lower(), x.upper()) are exact binary numbers m 2^e; they are converted to
Python Fractions exactly and rounded with integer arithmetic, never through a float.  Every bound that is
formatted here is also written to a ledger, and verify_ledger() re-reads each printed string as an exact
rational and compares it with the bound it stands for (a guard against formatting mistakes).
"""
import math
from fractions import Fraction

from flint import arb, acb

_LEDGER = []


# ------------------------------------------------------------------ exact endpoints -------
def _exact(x):
    """The exact rational value of an exact arb (radius 0)."""
    if x.rad() != 0:
        raise ValueError('not an exact arb: %s' % x)
    m, e = x.man_exp()
    m, e = int(m), int(e)
    return Fraction(m * 2 ** e) if e >= 0 else Fraction(m, 2 ** (-e))


def lo_frac(x):
    """An exact rational <= every point of x (x: arb, Fraction, int or float)."""
    if isinstance(x, Fraction):
        return x
    if isinstance(x, (int, float)):
        return Fraction(x)
    if not x.is_finite():
        raise ValueError('ball is not finite: %s' % x)
    return _exact(x.lower())


def hi_frac(x):
    """An exact rational >= every point of x."""
    if isinstance(x, Fraction):
        return x
    if isinstance(x, (int, float)):
        return Fraction(x)
    if not x.is_finite():
        raise ValueError('ball is not finite: %s' % x)
    return _exact(x.upper())


# ------------------------------------------------------------------ rounding --------------
def _round(q, up):
    return math.ceil(q) if up else math.floor(q)


def _fixed(q, d, up):
    """The multiple of 10^-d next to q (above if up, below otherwise), as a decimal string."""
    n = _round(q * 10 ** d, up)
    sign = '-' if n < 0 else ''
    n = abs(n)
    ip, fp = divmod(n, 10 ** d)
    return sign + str(ip) + (('.' + str(fp).zfill(d)) if d > 0 else '')


def _exp10(a):
    """The integer E with 10^E <= a < 10^(E+1), for a rational a > 0 (exact)."""
    E = int(math.floor(math.log10(float(a)))) if float(a) > 0 else -400
    while Fraction(10) ** E > a:
        E -= 1
    while Fraction(10) ** (E + 1) <= a:
        E += 1
    return E


def _sci(q, sig, up):
    """q rounded outward to sig significant digits, in scientific notation (d.dd...e-XX)."""
    if q == 0:
        return '0'
    E = _exp10(abs(q))
    n = _round(q / Fraction(10) ** (E - sig + 1), up)
    if abs(n) >= 10 ** sig:               # rounding carried into a new digit (e.g. 9.995 -> 10.0)
        E += 1
        n = _round(q / Fraction(10) ** (E - sig + 1), up)
    sign = '-' if n < 0 else ''
    ds = str(abs(n))
    mant = ds[0] + (('.' + ds[1:]) if len(ds) > 1 else '')
    return '%s%se%+03d' % (sign, mant, E)


def _sig(q, sig, up):
    """Like %.{sig}g but rounded outward: fixed notation for 1e-4 <= |q| < 10^sig, else scientific."""
    if q == 0:
        return '0'
    E = _exp10(abs(q))
    if -4 <= E < sig:
        s = _fixed(q, max(sig - 1 - E, 0), up)
        return s
    return _sci(q, sig, up)


def _record(s, bound, up, what=''):
    _LEDGER.append((s, bound, up, what))
    return s


# ------------------------------------------------------------------ public formatters -----
def lo(x, d):
    """Lower bound of the ball x with d decimals, rounded down."""
    b = lo_frac(x)
    return _record(_fixed(b, d, False), b, False)


def hi(x, d):
    """Upper bound of the ball x with d decimals, rounded up."""
    b = hi_frac(x)
    return _record(_fixed(b, d, True), b, True)


def lo_g(x, sig):
    b = lo_frac(x)
    return _record(_sig(b, sig, False), b, False)


def hi_g(x, sig):
    b = hi_frac(x)
    return _record(_sig(b, sig, True), b, True)


def hi_e(x, sig=3):
    """Upper bound in scientific notation with sig significant digits, rounded up."""
    b = hi_frac(x)
    return _record(_sci(b, sig, True), b, True)


def iv(x, d):
    """'[lo, hi]' with d decimals, rounded outward."""
    return '[%s, %s]' % (lo(x, d), hi(x, d))


def iv_g(x, sig):
    return '[%s, %s]' % (lo_g(x, sig), hi_g(x, sig))


def max_hi(xs):
    """Exact maximum of the upper bounds (Fractions or balls)."""
    return max(hi_frac(x) for x in xs)


def min_lo(xs):
    return min(lo_frac(x) for x in xs)


def disc(cen, R, d, sig=3):
    """A proved disc {z : |z - cen| <= R} (cen a complex float, R a float upper bound) printed as
    (c, r) with c the real decimal cen.real rounded to d places and r >= |c - cen| + R, so that
    |z - c| <= r is implied by the proved disc.  Returns (c_str, r_str)."""
    cre = Fraction(cen.real)
    cim = Fraction(cen.imag)
    c = Fraction(round(cre * 10 ** d), 10 ** d)          # the nearest d-place decimal
    cs = _fixed(c, d, False)
    shift = abs(c - cre) + abs(cim)                  # |c - cen| <= |c - Re cen| + |Im cen|
    rb = shift + Fraction(R)
    rs = _sci(rb, sig, True)
    _LEDGER.append((rs, rb, True, 'disc radius'))
    _LEDGER.append(((cs, rs), (cre, cim, Fraction(R)), 'disc', 'disc'))
    return cs, rs


def cdisc(cen, R, d, sig=2):
    """A complex disc printed as 're+imi (radius r)' with both parts rounded to d places and
    r >= |c - cen| + R."""
    cre, cim = Fraction(cen.real), Fraction(cen.imag)
    c_re = Fraction(round(cre * 10 ** d), 10 ** d)
    c_im = Fraction(round(cim * 10 ** d), 10 ** d)
    rb = abs(c_re - cre) + abs(c_im - cim) + Fraction(R)
    rs = _sci(rb, sig, True)
    _LEDGER.append((rs, rb, True, 'complex disc radius'))
    re_s = _fixed(c_re, d, False)
    im_s = _fixed(c_im, d, False)
    if not im_s.startswith('-'):
        im_s = '+' + im_s
    _LEDGER.append(((re_s + '|' + im_s, rs), (cre, cim, Fraction(R)), 'cdisc', 'cdisc'))
    return '%s%si (radius %s)' % (re_s, im_s, rs)


def verify_ledger():
    """Re-read every printed bound as an exact rational and compare it with its bound.

    Returns (number of printed bounds, list of failures)."""
    bad = []
    for s, b, up, what in _LEDGER:
        if up == 'disc':
            cs, rs = s
            cre, cim, R = b
            if Fraction(rs) < abs(Fraction(cs) - cre) + abs(cim) + R:
                bad.append((s, b, what))
            continue
        if up == 'cdisc':
            cs, rs = s
            re_s, im_s = cs.split('|')
            cre, cim, R = b
            if Fraction(rs) < abs(Fraction(re_s) - cre) + abs(Fraction(im_s) - cim) + R:
                bad.append((s, b, what))
            continue
        v = Fraction(s)
        if (up and v < b) or ((not up) and v > b):
            bad.append((s, b, what))
    return len(_LEDGER), bad
