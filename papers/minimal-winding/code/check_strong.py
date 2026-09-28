#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""The strong-vortex bounds in the proof are the bounds the log accepts.

Theorem 3 is proved in the text. The explicit constants of Step 1 are also
checked by verify_strong_vortex.py, and the log says which configurations
approach the conclusions of parts (b) and (c). This program only reads the
manuscript and data/verify-strong-vortex-2026-09-25.txt. A copy of the proof
with c/8 replaced by c/7 must fail. Neither file is written.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
TEX = os.path.join(ROOT, 'paper', 'minimal-winding.tex')
LOG = os.path.join(ROOT, 'data', 'verify-strong-vortex-2026-09-25.txt')

# Manuscript phrase, and the log line that records the same bound.
PAIRS = (
    (r'\gamma \le \gamma_0 = c^3/(8m)', 'gamma_0 = c^3/(8m)'),
    (r'|d_j| \le \gamma/c^2 \le c/8', '|d_j| <= gamma/c^2 <= c/8'),
    (r'|W_j| \ge c/2', '|W_j| >= c/2'),
    (r'c - 2\gamma/c^2 \ge c/2', 'c - 2 gamma_0/c^2 >= c/2'),
    (r'lies in $[1/2, 2]$', 'lies in [1/2, 2]'),
    (r'|\sum_i \Gamma_i z_i| \le 2m\gamma/c^2', '|sum Gamma z| <= 2 m gamma/c^2'),
    (r'|z_c| \le 4m\gamma/c^2', '|z_c| <= 4 m gamma/c^2'),
    (r'|Z_j - z_c| \ge c/2', '|Z_j - z_c| >= c/2'),
)
CASES = (
    'm = 1 (three vortices): P_min decreases to sqrt(3)/2',
    'm = 1 (three vortices): |P - (y_j^2 + 3/4)/(2 y_j)| -> 0',
    'm = 3 symmetric: P_min decreases to sqrt(3)/2',
    'm = 3 symmetric: |P - (y_j^2 + 3/4)/(2 y_j)| -> 0',
    'm = 3 asymmetric: P_min decreases to sqrt(3)/2',
    'm = 3 asymmetric: |P - (y_j^2 + 3/4)/(2 y_j)| -> 0',
)


def fail(msg):
    print(msg)
    print('FAIL')
    sys.exit(1)


def missing(tex, log):
    bad = []
    for phrase, line in PAIRS:
        if phrase not in tex:
            bad.append('manuscript lacks %s' % phrase)
        if line not in log:
            bad.append('log lacks %s' % line)
    for line in CASES:
        if line not in log:
            bad.append('log lacks %s' % line)
    return bad


def main():
    tex = open(TEX, encoding='utf-8').read()
    log = open(LOG, encoding='utf-8').read()
    if any(line.startswith('FAIL') for line in log.splitlines()):
        fail('the strong-vortex log contains a FAIL line')
    bad = missing(tex, log)
    if bad:
        fail(' | '.join(bad))
    planted = tex.replace(r'c/8', 'c/7', 1)
    if not missing(planted, log):
        fail('replacing c/8 by c/7 was still accepted')
    print('%d Step-1 bounds match the log' % len(PAIRS))
    print('parts (b) and (c) are recorded for m = 1 and for both m = 3 arrangements')
    print('replacing c/8 by c/7 is rejected')
    print('ALL CHECKS PASSED')
    return 0


if __name__ == '__main__':
    sys.exit(main())
