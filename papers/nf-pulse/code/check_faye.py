#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Speed and sup-U check for Table tab:faye.

paper/nf-pulse.tex prints three speeds. The digits of c_f are broken by
\\,\\allowbreak. Each c_f is the lower end of an open interval of width
10^{-n}, and the upper end is the next number at that place.

The proof stores the two ends as exact decimals in
ext/faye-model/code/config.py. prove_pulse.py then records each end as
cc.str(40): forty digits, with the last one rounded, and a radius that
only covers that print. That radius is not the uncertainty of the run.
The passing files are proof_eps*_c1.json and proof_eps*_c2.json. Each
exact end must lie in its own print, the verdict must be PASS, and the
precision must be the one in config.py. The open interval is the gap
between those two exact ends. The print is not required to sit inside
the interval: it is a picture of the endpoint.

Where the table has more than forty digits, this program says so. Those
digits are the exact bracket, not a claim that the forty-digit print
forces them. A run at the printed numerator, asked for the opposite
cone, must be refused. The lower end of the max-U ball must clear the
printed sup-U bound.

This program reads the manuscript, config.py and the certificates. It
does not import a proof program and does not change the paper.

Negative control, in memory only: the last digit of the printed 1/20
speed is increased by one. That copy must leave the stored print.
"""
import json
import os
import re
import sys
from decimal import Decimal, getcontext

getcontext().prec = 200

HERE = os.path.dirname(os.path.abspath(__file__))
PAPER = os.path.join(HERE, '..')
TEX = os.path.join(PAPER, 'paper', 'nf-pulse.tex')
DATA = os.path.join(PAPER, 'ext', 'faye-model', 'data')
CONFIG = os.path.join(PAPER, 'ext', 'faye-model', 'code', 'config.py')

BALL = re.compile(r'^\[([+-]?(?:\d+\.\d+)) \+/- ([0-9.eE+-]+)\]$')
# prove_pulse.py stores the endpoint as cc.str(40).
DISPLAY = 40


def fail_line(reason, printed, stored):
    print('FAIL')
    print(reason)
    print('manuscript: %s' % printed)
    print('certificate: %s' % stored)


def parse_ball(text):
    match = BALL.match(text.strip())
    if not match:
        return None
    return match.group(1), match.group(2)


def places(text):
    return len(text.split('.')[1]) if '.' in text else 0


def prefix(text, count):
    """First `count` digits after the point, padding with zeros if needed."""
    sign = '-' if text[:1] == '-' else ''
    body = text[1:] if text[:1] in '+-' else text
    whole, dot, frac = body.partition('.')
    if not dot:
        frac = ''
    frac = frac.ljust(count, '0')
    if count == 0:
        return sign + whole
    return sign + whole + '.' + frac[:count]


def half_ulp(count):
    return Decimal(1).scaleb(-count) / Decimal(2)


def forced_places(radius):
    """Largest k with radius below half a unit in the k-th decimal place."""
    rad = Decimal(radius)
    k = 0
    while rad < half_ulp(k):
        k += 1
        if k > 200:
            break
    return k - 1


def rel_to_paper(path):
    return os.path.relpath(path, PAPER)


def table_rows(tex):
    match = re.search(
        r'\\begin\{table\}.*?\\label\{tab:faye\}(.*?)\\end\{table\}',
        tex, re.S)
    if not match:
        raise SystemExit('table tab:faye not found')
    body = match.group(1).replace('\\,\\allowbreak', '')
    body = re.sub(r'(?<=\d)\s+(?=\d)', '', body)
    rows = re.findall(
        r'(1/\d+)\s*&\s*([0-9]+\.[0-9]+)\s*&\s*(\d+)\s*&\s*([0-9]+\.[0-9]+)',
        body)
    if len(rows) != 3:
        raise SystemExit('table tab:faye: expected 3 speeds, found %d' % len(rows))
    return rows


def theorem_claims_power(tex):
    match = re.search(
        r'\\begin\{theorem\}.*?\\label\{thm:faye\}(.*?)\\end\{theorem\}',
        tex, re.S)
    if not match:
        raise SystemExit('theorem thm:faye not found')
    return r'c_{\mathrm f} + 10^{-n}' in match.group(1)


def max_u_balls(doc):
    found = []

    def walk(obj):
        if isinstance(obj, dict):
            for key, val in obj.items():
                if (isinstance(val, str) and re.search(r'max', key, re.I)
                        and re.search(r'\bu\b|u_', key, re.I)
                        and parse_ball(val)):
                    found.append((key, val))
                else:
                    walk(val)
        elif isinstance(obj, list):
            for item in obj:
                walk(item)

    walk(doc)
    return found


def bump_digit(text, place):
    sign = '-' if text[:1] == '-' else ''
    body = text[1:] if text[:1] in '+-' else text
    whole, dot, frac = body.partition('.')
    digits = list(frac.ljust(place, '0'))
    digits[place - 1] = str((int(digits[place - 1]) + 1) % 10)
    return sign + whole + '.' + ''.join(digits)


def config_brackets(text):
    """Exact c1, c2 and precision from config.py. The file is not imported."""
    parts = re.split(r"\n    '(1/\d+)': \{", text)
    if len(parts) < 3:
        raise SystemExit('config.py: no eps brackets')
    found = {}
    for i in range(1, len(parts), 2):
        eps, body = parts[i], parts[i + 1]
        c1 = re.search(r"'c1': '([0-9]+\.[0-9]+)'", body)
        c2 = re.search(r"'c2': '([0-9]+\.[0-9]+)'", body)
        prec = re.search(r"'prec': (\d+)", body)
        if not (c1 and c2 and prec):
            raise SystemExit('config.py: missing bracket for %s' % eps)
        found[eps] = (c1.group(1), c2.group(1), int(prec.group(1)))
    return found


def proof_file(eps, which):
    return os.path.join(
        DATA, 'proof_eps%s_%s.json' % (eps.replace('/', '_'), which))


def load_proof(eps, which):
    path = proof_file(eps, which)
    with open(path, encoding='utf-8') as handle:
        return path, json.load(handle)


def contains(mid, rad, exact):
    value = Decimal(exact)
    return Decimal(mid) - Decimal(rad) <= value <= Decimal(mid) + Decimal(rad)


def endpoint_ok(eps, label, exact, prec, path, doc):
    """Return True when this endpoint file does not support `exact`."""
    bad = False
    raw = doc.get('c')
    parsed = parse_ball(raw) if isinstance(raw, str) else None
    print('file: %s' % rel_to_paper(path))
    if doc.get('which') != label:
        fail_line(
            'eps %s: %s file is which=%s' % (eps, label, doc.get('which')),
            label, str(doc.get('which')))
        bad = True
    if doc.get('verdict') != 'PASS':
        fail_line(
            'eps %s: %s verdict is not PASS' % (eps, label),
            'PASS', str(doc.get('verdict')))
        bad = True
    if doc.get('prec') != prec:
        fail_line(
            'eps %s: %s precision' % (eps, label),
            str(prec), str(doc.get('prec')))
        bad = True
    if parsed is None:
        fail_line('eps %s: %s has no ball' % (eps, label), exact, raw)
        return True, None, None
    mid, rad = parsed
    if not contains(mid, rad, exact):
        fail_line(
            'eps %s: the exact %s is not inside the stored print' % (eps, label),
            exact, raw)
        bad = True
    else:
        print('exact %s lies in %s' % (label, raw))
    return bad, mid, rad


def wrong_cone(eps, c1):
    """The printed numerator, asked for the opposite cone, must be refused."""
    digits = c1.replace('.', '')
    needle = 'custom:%s:%d:1' % (digits, places(c1))
    hits = []
    for name in sorted(os.listdir(DATA)):
        if not name.endswith('.json'):
            continue
        path = os.path.join(DATA, name)
        try:
            with open(path, encoding='utf-8') as handle:
                doc = json.load(handle)
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(doc, dict) and doc.get('which') == needle:
            hits.append((path, doc))
    if len(hits) != 1:
        fail_line(
            'eps %s: expected one opposite-cone run at the printed numerator' % eps,
            needle, '%d files' % len(hits))
        return True
    path, doc = hits[0]
    print('file: %s' % rel_to_paper(path))
    if doc.get('verdict') != 'FAIL' or doc.get('phase2') != 'wrong_cone':
        fail_line(
            'eps %s: the opposite cone at c_f was not refused' % eps,
            'FAIL wrong_cone',
            '%s %s' % (doc.get('verdict'), doc.get('phase2')))
        return True
    print('opposite cone at the printed c_f is refused')
    return False


def check_row(eps, printed, exponent, bound, bracket):
    """Return True when this row is not supported."""
    bad = False
    print('eps %s' % eps)
    if bracket is None:
        fail_line('eps %s: no bracket in config.py' % eps, printed, '(none)')
        return True
    c1, c2, prec = bracket
    if printed != c1:
        fail_line(
            'eps %s: the table is not the exact lower end' % eps, printed, c1)
        bad = True
    else:
        print('manuscript: %s' % printed)
        print('bracket: %s' % c1)
    count = places(printed)
    if str(count) != exponent:
        fail_line(
            'eps %s: printed n = %s does not match the %d digits of c_f'
            % (eps, exponent, count),
            printed, c1)
        bad = True
    width = Decimal(10) ** (-int(exponent))
    if Decimal(c2) - Decimal(c1) != width:
        fail_line(
            'eps %s: the two exact ends are not 10^{-%s} apart' % (eps, exponent),
            c2, c1)
        bad = True
    else:
        print('c2 - c1 = 10^{-%s}' % exponent)
    try:
        path1, doc1 = load_proof(eps, 'c1')
        path2, doc2 = load_proof(eps, 'c2')
    except (OSError, json.JSONDecodeError) as err:
        fail_line('eps %s: missing endpoint file' % eps, printed, str(err))
        return True
    bad1, mid, rad = endpoint_ok(eps, 'c1', c1, prec, path1, doc1)
    bad2, _mid2, _rad2 = endpoint_ok(eps, 'c2', c2, prec, path2, doc2)
    bad = bad or bad1 or bad2
    if mid is not None and rad is not None:
        forced = forced_places(rad)
        if count <= forced and prefix(printed, count) == prefix(mid, count):
            print('the stored print forces the %d printed digits' % count)
        else:
            print(
                'the certificate prints c to %d digits (str(%d)); '
                'the table has %d. The extra digits are the exact bracket, '
                'and the last digit of the print is rounded.'
                % (places(mid), DISPLAY, count))
    balls = max_u_balls(doc1)
    if not balls:
        print('sup U was not in the c1 file')
        bad = True
    else:
        for key, raw_u in balls:
            umid, urad = parse_ball(raw_u)
            lower = Decimal(umid) - Decimal(urad)
            print('manuscript: sup U > %s' % bound)
            print('certificate: %s (%s)' % (raw_u, key))
            if not (lower > Decimal(bound)):
                fail_line(
                    'eps %s: lower end %s does not clear sup U > %s' % (
                        eps, format(lower, 'f'), bound),
                    'sup U > %s' % bound, raw_u)
                bad = True
            else:
                print('lower end: %s' % format(lower, 'f'))
    if wrong_cone(eps, c1):
        bad = True
    return bad


def negative_control(printed, mid, rad):
    """Increase the last digit of the printed 1/20 speed."""
    count = places(printed)
    if forced_places(rad) < count or prefix(printed, count) != prefix(mid, count):
        fail_line(
            'negative control: the 1/20 speed is not forced as printed',
            printed, mid)
        return True
    bumped = bump_digit(printed, count)
    if contains(mid, rad, bumped):
        fail_line('negative control still lay in the stored print', bumped, mid)
        return True
    old = printed.split('.')[1][count - 1]
    new = bumped.split('.')[1][count - 1]
    print('negative control: last digit %s -> %s leaves the stored print' % (old, new))
    return False


def main():
    with open(TEX, encoding='utf-8') as handle:
        tex = handle.read()
    with open(CONFIG, encoding='utf-8') as handle:
        brackets = config_brackets(handle.read())
    if not theorem_claims_power(tex):
        fail_line(
            'theorem does not claim width 10^{-n}',
            r'(c_f, c_f + 10^{-n})', '(phrase not found)')
        sys.exit(1)
    rows = table_rows(tex)
    bad = False
    control = None
    for eps, printed, exponent, bound in rows:
        if check_row(eps, printed, exponent, bound, brackets.get(eps)):
            bad = True
        if eps == '1/20':
            path = proof_file(eps, 'c1')
            try:
                with open(path, encoding='utf-8') as handle:
                    doc = json.load(handle)
            except (OSError, json.JSONDecodeError):
                doc = {}
            parsed = parse_ball(doc.get('c', ''))
            if parsed is None:
                fail_line(
                    'negative control: 1/20 print not found', '1/20', '(none)')
                bad = True
            else:
                control = (printed, parsed[0], parsed[1])
    if control is None:
        bad = True
    elif negative_control(*control):
        bad = True
    if bad:
        sys.exit(1)
    print('PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
