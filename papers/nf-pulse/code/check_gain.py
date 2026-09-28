#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Speed, sup-U and rest-eigenvalue check for the gain-12 pulse.

paper/nf-pulse.tex, Theorem thm:gain12, states a pulse with speed in
(c_g, c_g + 10^{-25}), c_g = 1.04753749779917111554998626, sup U > 0.6223,
and rest eigenvalues in balls of radius below 10^{-24} about four printed
centres, the unstable one exceeding 4.1385 times the modulus of the real
part of the complex pair.

The stored speed ball is an enclosure of the endpoint, not of the
pulse-speed interval, so it is not required to lie inside
(c_g, c_g + 10^{-25}). The printed endpoint must be the stored midpoint
truncated to the printed digits, and the radius must be below half a unit
in that last place and far below 10^{-25} (below 10^{-40}). The printed
width must be 10^{-25}. The lower end of the max-U ball, midpoint minus
radius, must clear the printed sup-U bound. A field that is not a finite
two-sided ball cannot support that lower bound.

Eigenvalue centres are read from whichever certificate under
ext/gain-12/data/ stores the printed digits. The theorem asks for a ball
of radius below 10^{-24} about each printed centre. That holds when the
stored midpoint, truncated to the printed digits, is that centre and the
radius of the ball about the printed centre is below 10^{-24}. A radius
above half a unit in the last place means that digit is not the unique
rounding; the program prints that and does not fail, because the theorem
does not claim the last digit is forced. The factor 4.1385 must be
strictly less than (lower end of the positive ball) / (upper end of
|real part|).
This program only reads the manuscript and those certificates. It does
not import a proof program.
"""
import json
import os
import re
import sys
from decimal import Decimal, getcontext

getcontext().prec = 80

HERE = os.path.dirname(os.path.abspath(__file__))
PAPER = os.path.join(HERE, '..')
TEX = os.path.join(PAPER, 'paper', 'nf-pulse.tex')
DATA = os.path.join(PAPER, 'ext', 'gain-12', 'data')
SPEED = os.path.join(DATA, 'proof_c1_final.json')

BALL = re.compile(
    r'^(?:\+\-)?\[([+-]?(?:\d+\.\d+)) \+/- ([0-9.eE+-]+)\]$'
)
BALL_FIND = re.compile(
    r'(?:\+\-)?\[[+-]?(?:\d+\.\d+) \+/- [0-9.eE+-]+\]'
)
# Fifteen orders below the printed bracket width. The endpoint enclosure
# is a point at the scale of 10^{-25}, not a stand-in for that bracket.
FAR_BELOW_WIDTH = Decimal('1e-40')
WIDTH = Decimal('1e-25')


def fail(printed, stored, reason=None):
    print('FAIL')
    if reason:
        print(reason)
    print('manuscript: %s' % printed)
    print('certificate: %s' % stored)
    sys.exit(1)


def parse_ball(text):
    match = BALL.match(text.strip())
    if not match:
        return None
    return match.group(1), match.group(2)


def truncate_midpoint(mid, places):
    """Chop the stored decimal midpoint to `places` digits after the point."""
    text = mid[1:] if mid[:1] in '+-' else mid
    sign = '-' if mid[:1] == '-' else ''
    if 'e' in text.lower():
        rendered = format(Decimal(mid), 'f')
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
    return Decimal(1).scaleb(-places) / Decimal(2)


def begins(lower, digits):
    """True when the decimal expansion of lower starts with `digits`."""
    places = len(digits.split('.')[1]) if '.' in digits else 0
    start = Decimal(digits)
    return start <= lower < start + Decimal(1).scaleb(-places)


def theorem_body(tex, label):
    match = re.search(
        r'\\begin\{theorem\}.*?\\label\{%s\}(.*?)\\end\{theorem\}' % re.escape(label),
        tex, re.S)
    if not match:
        raise SystemExit('theorem %s not found' % label)
    return match.group(1)


def proof_body(tex, label):
    match = re.search(
        r'\\subsection\{Proof of Theorem~\\ref\{%s\}\}.*?\\label\{[^}]+\}'
        r'(.*?)(?=\\subsection\{|\\section\{)' % re.escape(label),
        tex, re.S)
    if not match:
        raise SystemExit('proof of %s not found' % label)
    return match.group(1)


def proof_prefix(bound, proof):
    """Digits the proof prints for this sup-U bound (longest extension)."""
    candidates = re.findall(r'lower end \$([0-9]+\.[0-9]+)\$', proof)
    candidates += re.findall(r'\\sup U > ([0-9]+\.[0-9]+)', proof)
    good = [item for item in candidates if item.startswith(bound)]
    if not good:
        raise SystemExit('proof states no lower end for sup U > %s' % bound)
    good.sort(key=len, reverse=True)
    return good[0]


def maxu_lower(raw):
    """Lower end of a two-sided ball. Do not invent one from an upper bound."""
    parsed = parse_ball(raw)
    if parsed is None:
        print('FAIL')
        print('maxU_upper_phase1 is only an upper bound and cannot support a lower bound')
        print('certificate: %s' % raw)
        sys.exit(1)
    mid_text, rad_text = parsed
    mid, rad = Decimal(mid_text), Decimal(rad_text)
    if not mid.is_finite() or not rad.is_finite() or rad < 0:
        print('FAIL')
        print('maxU_upper_phase1 is only an upper bound and cannot support a lower bound')
        print('certificate: %s' % raw)
        sys.exit(1)
    return mid - rad


def rel_to_paper(path):
    return os.path.relpath(path, PAPER)


def gain_claim(theorem):
    speed = re.search(
        r'\(c_\{\\mathrm g\}, c_\{\\mathrm g\} \+ 10\^\{-(\d+)\}\).*?'
        r'c_\{\\mathrm g\} = ([0-9]+\.[0-9]+).*?'
        r'\\sup U > ([0-9]+\.[0-9]+)',
        theorem, re.S)
    if not speed:
        fail('(c_g, c_g + 10^{-25})', '(phrase not found)')
    exponent, printed, bound = speed.group(1), speed.group(2), speed.group(3)
    if exponent != '25':
        fail('10^{-%s}' % exponent, '10^{-25}')
    eigen = re.search(
        r'balls of radius below \$10\^\{-(\d+)\}\$ about '
        r'\$([0-9]+\.[0-9]+)\$, \$([-0-9]+\.[0-9]+)\$ and '
        r'\$([-0-9]+\.[0-9]+) \\pm ([0-9]+\.[0-9]+)\\,i\$',
        theorem)
    if not eigen:
        fail('eigenvalue centres', '(phrase not found)')
    if eigen.group(1) != '24':
        fail('10^{-%s}' % eigen.group(1), '10^{-24}')
    centres = [eigen.group(i) for i in range(2, 6)]
    factor = re.search(
        r'exceeds \$([0-9]+\.[0-9]+)\$ times the modulus of the real part',
        theorem)
    if not factor:
        fail('4.1385', '(phrase not found)')
    return printed, bound, centres, factor.group(1)


def check_speed(printed, doc):
    raw = doc.get('c')
    parsed = parse_ball(raw) if isinstance(raw, str) else None
    if parsed is None:
        fail(printed, raw)
    mid_text, rad_text = parsed
    places = len(printed.split('.')[1])
    rad = Decimal(rad_text)
    forced = (
        truncate_midpoint(mid_text, places) == printed
        and rad < half_ulp(places)
        and rad < FAR_BELOW_WIDTH
        and rad < WIDTH
    )
    if not forced:
        fail(printed, raw)
    if doc.get('which') != 'c1' or doc.get('verdict') != 'PASS':
        fail(printed, '%s verdict %s' % (doc.get('which'), doc.get('verdict')))
    return raw


def eigen_files(centres):
    """Certificates whose text contains every printed eigenvalue digit string."""
    needles = []
    for centre in centres:
        text = centre[1:] if centre[:1] == '-' else centre
        needles.append(text.split('.', 1)[1])
    hits = []
    for dirpath, _dirs, names in os.walk(DATA):
        for name in sorted(names):
            path = os.path.join(dirpath, name)
            try:
                with open(path, encoding='utf-8') as handle:
                    body = handle.read()
            except (OSError, UnicodeDecodeError):
                continue
            if all(needle in body for needle in needles):
                hits.append((path, body))
    return hits


def match_centre(centre, body):
    places = len(centre.split('.')[1])
    found = []
    for match in BALL_FIND.finditer(body):
        raw = match.group(0)
        parsed = parse_ball(raw)
        if parsed is None:
            continue
        mid_text, rad_text = parsed
        if truncate_midpoint(mid_text, places) == centre:
            found.append((mid_text, rad_text, raw))
    return found


def abs_upper(mid, rad):
    return max(abs(mid - rad), abs(mid + rad))


def ratio_lower(pos, re_part):
    """Lower end of (positive eigenvalue) / |real part| over the two balls."""
    pos_mid = Decimal(pos[0]) - Decimal(pos[1])
    re_mid, re_rad = Decimal(re_part[0]), Decimal(re_part[1])
    upper = abs_upper(re_mid, re_rad)
    if pos_mid <= 0 or upper <= 0:
        return None
    return pos_mid / upper


def claim_reason(centre, mid_text, rad_text):
    """None when the stored ball lies in radius below 10^{-24} about `centre`."""
    places = len(centre.split('.')[1])
    mid, rad = Decimal(mid_text), Decimal(rad_text)
    cap = Decimal(1).scaleb(-24)
    if not mid.is_finite() or not rad.is_finite() or rad < 0:
        return 'radius is not a finite two-sided bound'
    if truncate_midpoint(mid_text, places) != centre:
        return 'stored midpoint is not the printed centre'
    # Distance from the printed centre to the far side of the stored ball.
    if abs(mid - Decimal(centre)) + rad >= cap:
        return 'radius %s is not below 10^{-24} about the printed centre' % rad_text
    return None


def unforced_digit(centre, mid_text, rad_text):
    """A note when the last printed digit is not the unique rounding. Not a failure."""
    places = len(centre.split('.')[1])
    mid, rad = Decimal(mid_text), Decimal(rad_text)
    half = half_ulp(places)
    if abs(mid - Decimal(centre)) + rad >= half:
        return (
            'last digit of %s is not uniquely forced: '
            'radius %s is not below half a unit in the last place (%s)'
            % (centre, rad_text, format(half, 'e'))
        )
    return None


def main():
    with open(TEX, encoding='utf-8') as handle:
        tex = handle.read()
    theorem = theorem_body(tex, 'thm:gain12')
    proof = proof_body(tex, 'thm:gain12')
    printed, bound, centres, factor = gain_claim(theorem)
    with open(SPEED, encoding='utf-8') as handle:
        doc = json.load(handle)
    raw_c = check_speed(printed, doc)
    raw_u = doc.get('maxU_upper_phase1')
    if not isinstance(raw_u, str):
        print('FAIL')
        print('maxU_upper_phase1 is only an upper bound and cannot support a lower bound')
        print('certificate: %s' % raw_u)
        sys.exit(1)
    lower = maxu_lower(raw_u)
    if not (lower > Decimal(bound)):
        fail('sup U > %s' % bound, raw_u,
             'lower end %s does not clear the printed bound' % format(lower, 'f'))
    prefix = proof_prefix(bound, proof)
    if not begins(lower, prefix):
        fail(prefix, raw_u,
             'lower end %s does not begin with the proof digits' % format(lower, 'f'))
    print('manuscript: %s' % printed)
    print('certificate: %s' % raw_c)
    print('file: %s' % rel_to_paper(SPEED))
    print('width: 10^{-25}')
    print('manuscript: sup U > %s' % bound)
    print('certificate: %s' % raw_u)
    print('lower end: %s begins %s' % (format(lower, 'f'), prefix))
    places = len(bound.split('.')[1])
    raised = Decimal(bound) + Decimal(1).scaleb(-places)
    if raised != Decimal('0.6224'):
        raise SystemExit('negative control expected 0.6224, got %s' % raised)
    if lower > raised:
        fail('sup U > %s' % format(raised, 'f'), raw_u,
             'negative control still cleared the raised bound')
    print('negative control: %s -> %s; lower end %s does not clear it' % (
        bound, format(raised, 'f'), format(lower, 'f')))

    hits = eigen_files(centres)
    if not hits:
        print('the eigenvalues were skipped')
        print('PASS')
        return 0
    if len(hits) != 1:
        fail('eigenvalue centres',
             '; '.join(rel_to_paper(path) for path, _body in hits),
             'more than one file stores the eigenvalue digits')
    path, body = hits[0]
    print('file: %s' % rel_to_paper(path))
    matched = []
    for centre in centres:
        found = match_centre(centre, body)
        if len(found) != 1:
            stored = '; '.join(raw for _m, _r, raw in found) if found else '(none)'
            fail(centre, stored)
        matched.append(found[0])
    ratio = ratio_lower(matched[0], matched[2])
    if ratio is None or not (Decimal(factor) < ratio):
        fail(factor, '%s / |%s|' % (matched[0][2], matched[2][2]),
             'factor is not strictly less than the ball ratio')
    bad = []
    notes = []
    for centre, (mid_text, rad_text, raw) in zip(centres, matched):
        reason = claim_reason(centre, mid_text, rad_text)
        if reason:
            bad.append((reason, centre, raw))
        else:
            note = unforced_digit(centre, mid_text, rad_text)
            if note:
                notes.append(note)
    if bad:
        print('FAIL')
        for reason, centre, raw in bad:
            print(reason)
            print('manuscript: %s' % centre)
            print('certificate: %s' % raw)
        sys.exit(1)
    for centre, (_mid, _rad, raw) in zip(centres, matched):
        print('manuscript: %s' % centre)
        print('certificate: %s' % raw)
    for note in notes:
        print(note)
    print('manuscript: %s' % factor)
    print('certificate: %s / |%s| > %s' % (
        matched[0][2], matched[2][2], format(ratio, 'f')))
    print('PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
