#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""The abstract's spectrum sentence and the sample counts.

The expansion, not the collapse, is what the abstract calls stable: besides
the double eigenvalue 0, every eigenvalue has real part -1 or -2. The
sample counts are the numerical survey line, and the abstract still says
the sample was not checked for duplicates. Changing 52 to 53 must fail.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
TEX = os.path.join(ROOT, 'paper', 'stable-expansion.tex')
SURVEY = os.path.join(ROOT, 'data', 'survey-expansions.txt')


def fail(msg):
    print(msg)
    print('FAIL')
    sys.exit(1)


def main():
    tex = open(TEX, encoding='utf-8').read()
    abstract = re.search(r'\\begin\{abstract\}(.*?)\\medskip', tex, re.S)
    if not abstract:
        fail('abstract not found')
    body = abstract.group(1)
    if r'$(-1, -5/2, -1/9, 4/5)$' not in body or r'$(-1, 3/7, 7/8, -9/7, -47/35)$' not in body:
        fail('the abstract circulations are not the two proved ones')
    if 'double eigenvalue $0$' not in body or r'real part $-1$ or $-2$' not in body:
        fail('the abstract no longer states the expansion spectrum')
    if 'not checked for duplicates' not in body:
        fail('the abstract dropped the duplicate caveat')
    if r'$52$ of $342$' not in body or r'$32$ of $543$' not in body:
        fail('the abstract sample counts changed')
    survey = open(SURVEY, encoding='utf-8').read()
    if 'N = 4: 52 of 342; N = 5: 32 of 543' not in survey:
        fail('data/survey-expansions.txt does not record 52 of 342 and 32 of 543')
    planted = body.replace(r'$52$ of $342$', r'$53$ of $342$', 1)
    if r'$52$ of $342$' in planted or 'N = 4: 53 of 342' in survey:
        fail('the planted count 53 was not distinguished from the survey')
    print('circulations and the expansion spectrum match the theorems')
    print('survey: N = 4: 52 of 342; N = 5: 32 of 543')
    print('a count of 53 is not the survey')
    print('ALL CHECKS PASSED')
    return 0


if __name__ == '__main__':
    sys.exit(main())
