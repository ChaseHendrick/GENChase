#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Controls of the winding step (winding.py), run through the same code: winding.main on two small closed boxes.

 1. Control (a known zero): the square [-1/25, 1/25] x [-1/25, 1/25] contains lam = 0, where D(0) = 0 by translation
    invariance, a simple zero (simple_zero.py).  Its winding number must be 1.
 2. Negative control (no zero): the square [1/10, 3/10] x [-1/10, 1/10] contains no zero of Dt (Theorem S; the
    numerical Evans function agrees).  Its winding number must be 0: the statement "Dt has a zero in this square" must
    be refused.

Each square is run as two open pieces (winding.main chains segments from the first corner to the last one, so a
piece cannot be closed), with the segment length, the half-plane test and the splitting of winding.py; the pieces
are written to data/winding_ctrl*.json and *_segments.txt, with the sha256 of evans_rig.py, winding.py and the pulse
records.  The winding number is decided as in winding.combine: the total argument change divided by 2 pi must be a
ball containing exactly one integer.  These squares are not in any cover of winding.COVERS, so winding.py combine
never uses them.  This program does not change winding.py (whose sha256 the pieces of the proof record).

usage: python3 winding_controls.py run [nproc]     compute the four pieces, then check
       python3 winding_controls.py check           check the stored pieces against the present programs and records
"""
import sys, os, json, math
import _paths
import winding as wd
from flint import arb, fmpq

F = fmpq
BOXES = {   # name: (corners of the two pieces, counterclockwise, expected winding number, label)
    'ctrl0': ([[(F(1, 25), F(-1, 25)), (F(1, 25), F(1, 25)), (F(-1, 25), F(1, 25))],
               [(F(-1, 25), F(1, 25)), (F(-1, 25), F(-1, 25)), (F(1, 25), F(-1, 25))]], 1,
              'CONTROL: the square [-1/25, 1/25] x [-1/25, 1/25] around the zero lam = 0'),
    'ctrlN': ([[(F(3, 10), F(-1, 10)), (F(3, 10), F(1, 10)), (F(1, 10), F(1, 10))],
               [(F(1, 10), F(1, 10)), (F(1, 10), F(-1, 10)), (F(3, 10), F(-1, 10))]], 0,
              'NEGATIVE CONTROL: the square [1/10, 3/10] x [-1/10, 1/10], which contains no zero'),
}


def piece_names(name):
    return [name + '_a', name + '_b']


def decide(name):
    """winding number of the stored pieces of one square, or None; the checks of winding.combine."""
    corners, fps, tot = [], [], arb(0)
    for w in piece_names(name):
        d = json.load(open(_paths.DATA + '/winding_%s.json' % w))
        (m, e), (rm, re) = d['arg_change_exact']
        tot += arb(m) * arb(2) ** e + arb(0, arb(rm) * arb(2) ** re)
        corners.append(d['corners'])
        fps.append((d['sha256'], tuple(d['speed_bracket'])))
    if not all(f == fps[0] for f in fps):
        raise SystemExit('FAIL  %s: the pieces were computed with different code or records' % name)
    if fps[0][0] != wd.fingerprint():
        raise SystemExit('FAIL  %s: the pieces were computed with code or records other than the present ones' % name)
    for c1, c2 in zip(corners, corners[1:] + corners[:1]):
        if c1[-1] != c2[0]:
            raise SystemExit('FAIL  %s: the pieces do not form a closed path' % name)
    wind = tot / (2 * arb.pi())
    n0 = int(math.floor(float(wind.mid())))
    cand = [n for n in range(n0 - 3, n0 + 4) if wind.overlaps(arb(n))]
    unique = len(cand) == 1 and bool(abs(wind - cand[0]) < arb('0.5'))
    return (cand[0] if unique else None), wind


def check():
    out, ok = {}, True
    for name, (pieces, expected, label) in BOXES.items():
        n, wind = decide(name)
        good = n is not None and n == expected
        ok = ok and good
        out[name] = {'label': label, 'total/(2 pi)': wind.str(15), 'winding_number': n, 'expected': expected,
                     'as expected': good}
        print('%s: total/(2 pi) in %s, winding number %s, expected %d: %s' % (label, wind.str(8), n, expected,
                                                                               'OK' if good else 'FAIL'))
    out['sha256'] = wd.fingerprint()
    json.dump(out, open(_paths.DATA + '/winding_controls.json', 'w'), indent=1)
    for name, (pieces, expected, label) in BOXES.items():
        if out[name]['as expected']:
            print('%s WINDING NUMBER %d AS EXPECTED' % (name.upper(), expected))
    print('WINDING CONTROLS: PASS' if ok else 'WINDING CONTROLS: FAIL')
    return ok


def run(nproc=1):
    for name, (pieces, expected, label) in BOXES.items():
        for w, corners in zip(piece_names(name), pieces):
            wd.PATHS[w] = corners
            wd.main(w, nproc)
    return check()


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'run':
        ok = run(int(sys.argv[2]) if len(sys.argv) > 2 else 1)
    elif len(sys.argv) > 1 and sys.argv[1] == 'check':
        ok = check()
    else:
        raise SystemExit(__doc__)
    sys.exit(0 if ok else 1)
