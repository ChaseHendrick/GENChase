#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Speed and sup-U check for the fast pulse and the slow pulse.

paper/nf-pulse.tex states a fast pulse with
  c_1 = 1.1027477097341592491478677, c_2 = c_1 + 10^{-25},
  sup U > 0.7596,
and a slow pulse at the same style of bracket with width 10^{-25}.
The proof of the fast pulse says the largest enclosure of U has lower
end 0.7596645. This program only reads the manuscript and the
certificate JSON those proofs cite. It does not import a proof program.

The stored "c" ball is an enclosure of the endpoint speed, not of the
pulse-speed interval, so the ball is not required to lie inside
(c_1, c_2). The printed endpoint must be the stored midpoint truncated
to the printed number of digits, and the stored radius must be below
half a unit in that last place and far below 10^{-25} (here: below
10^{-40}). The printed width must be exactly 10^{-25}. The lower end
of the maxU ball, midpoint minus radius, must clear the printed sup-U
bound and begin with the digits the proof states. A field that is not
a finite two-sided ball cannot support that lower bound.
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

BALL = re.compile(r'^\[([+-]?(?:\d+\.\d+)) \+/- ([0-9.eE+-]+)\]$')
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


def cited_dirs(proof):
    """Directories named by \\file{...} in this proof, relative to the paper."""
    found = []
    for match in re.finditer(r'\\file\{([^}]+)\}', proof):
        rel = match.group(1).strip()
        folder = rel if rel.endswith('/') else os.path.dirname(rel)
        path = os.path.normpath(os.path.join(PAPER, folder))
        if path not in found:
            found.append(path)
    return found


def endpoint_certificates(folders):
    """c1 JSON certificates in cited directories. Not the interval run."""
    found = []
    for folder in folders:
        if not os.path.isdir(folder):
            continue
        for name in sorted(os.listdir(folder)):
            if not name.endswith('.json'):
                continue
            path = os.path.join(folder, name)
            try:
                with open(path, encoding='utf-8') as handle:
                    doc = json.load(handle)
            except (OSError, json.JSONDecodeError):
                continue
            if not isinstance(doc, dict) or doc.get('which') != 'c1':
                continue
            if 'c' not in doc or 'maxU_upper_phase1' not in doc:
                continue
            found.append((path, doc))
    return found


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


def check_endpoint(name, printed, bound, prefix, folders, negative):
    places = len(printed.split('.')[1])
    matches = []
    for path, doc in endpoint_certificates(folders):
        parsed = parse_ball(doc['c'])
        if parsed is None:
            continue
        mid_text, _rad_text = parsed
        if truncate_midpoint(mid_text, places) == printed:
            matches.append((path, doc))
    if not matches:
        print('skipped %s: no certificate JSON cited for this speed' % name)
        return
    if len(matches) != 1:
        fail(printed, '; '.join(rel_to_paper(path) for path, _doc in matches),
             'more than one cited c1 certificate')
    path, doc = matches[0]
    raw_c = doc['c']
    mid_text, rad_text = parse_ball(raw_c)
    rad = Decimal(rad_text)
    forced = rad < half_ulp(places) and rad < FAR_BELOW_WIDTH and rad < WIDTH
    if truncate_midpoint(mid_text, places) != printed or not forced:
        fail(printed, raw_c)
    if doc.get('verdict') != 'PASS':
        fail(printed, '%s verdict %s' % (rel_to_paper(path), doc.get('verdict')))
    raw_u = doc['maxU_upper_phase1']
    lower = maxu_lower(raw_u)
    if not (lower > Decimal(bound)):
        fail('sup U > %s' % bound, raw_u,
             'lower end %s does not clear the printed bound' % format(lower, 'f'))
    if not begins(lower, prefix):
        fail(prefix, raw_u,
             'lower end %s does not begin with the proof digits' % format(lower, 'f'))
    print('manuscript: %s' % printed)
    print('certificate: %s' % raw_c)
    print('file: %s' % rel_to_paper(path))
    print('width: 10^{-25}')
    print('manuscript: sup U > %s' % bound)
    print('certificate: %s' % raw_u)
    print('lower end: %s begins %s' % (format(lower, 'f'), prefix))
    if negative:
        raised = Decimal(bound) + Decimal(1).scaleb(-len(bound.split('.')[1]))
        if raised != Decimal('0.7597'):
            raise SystemExit('negative control expected 0.7597, got %s' % raised)
        if lower > raised:
            fail('sup U > %s' % format(raised, 'f'), raw_u,
                 'negative control still cleared the raised bound')
        print('negative control: %s -> %s; lower end %s does not clear it' % (
            bound, format(raised, 'f'), format(lower, 'f')))


def fast_claim(theorem):
    match = re.search(
        r'c_1 = ([0-9]+\.[0-9]+),\s*\\qquad c_2 = c_1 \+ 10\^\{-(\d+)\}'
        r'.*?\\sup U > ([0-9]+\.[0-9]+)',
        theorem, re.S)
    if not match:
        fail('c_2 = c_1 + 10^{-25}', '(phrase not found)')
    printed, exponent, bound = match.group(1), match.group(2), match.group(3)
    if exponent != '25':
        fail('10^{-%s}' % exponent, '10^{-25}')
    return printed, bound


def slow_claims(theorem):
    claims = []
    for macro in (r'c_{\mathrm a}', r'c_{\mathrm b}'):
        defined = re.search(re.escape(macro) + r' = ([0-9]+\.[0-9]+)', theorem)
        used = re.search(
            r'\(' + re.escape(macro) + r', ' + re.escape(macro) +
            r' \+ 10\^\{-(\d+)\}\).*?\\sup U > ([0-9]+\.[0-9]+)',
            theorem, re.S)
        if not defined or not used:
            fail(macro, '(phrase not found)')
        if used.group(1) != '25':
            fail('10^{-%s}' % used.group(1), '10^{-25}')
        claims.append((macro, defined.group(1), used.group(2)))
    return claims


def main():
    with open(TEX, encoding='utf-8') as handle:
        tex = handle.read()
    fast_thm = theorem_body(tex, 'thm:fast')
    fast_proof = proof_body(tex, 'thm:fast')
    slow_thm = theorem_body(tex, 'thm:slow')
    slow_proof = proof_body(tex, 'thm:slow')
    printed, bound = fast_claim(fast_thm)
    check_endpoint(
        'c_1', printed, bound, proof_prefix(bound, fast_proof),
        cited_dirs(fast_proof), negative=True)
    for macro, speed, sup in slow_claims(slow_thm):
        check_endpoint(
            macro, speed, sup, proof_prefix(sup, slow_proof),
            cited_dirs(slow_proof), negative=False)
    print('PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
