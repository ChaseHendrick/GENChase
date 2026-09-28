#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""The README abstract prints the same numbers as abstract.tex.

abstract.tex is macros from numbers.tex. The README writes those values
out. Each macro the abstract uses must appear, as that value, in the
README abstract. Replacing 0.255 by 0.256 in a copy must fail.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
ABSTRACT = os.path.join(ROOT, 'paper', 'abstract.tex')
NUMBERS = os.path.join(ROOT, 'paper', 'numbers.tex')
README = os.path.join(ROOT, 'README.md')


def fail(msg):
    print(msg)
    print('FAIL')
    sys.exit(1)


def readme_abstract(text):
    found = re.search(r'## Abstract\n(.*?)(?:\n## |\Z)', text, re.S)
    if not found:
        fail('README abstract not found')
    return found.group(1)


def main():
    abstract = open(ABSTRACT, encoding='utf-8').read()
    numbers = open(NUMBERS, encoding='utf-8').read()
    body = readme_abstract(open(README, encoding='utf-8').read())
    if 'cannot show that the code' not in abstract or 'cannot show that the code' not in body:
        fail('the abstract no longer says the reported exponents cannot show the bound')
    used = []
    for name in re.findall(r'\\([A-Za-z]+)\{\}', abstract):
        found = re.search(r'\\newcommand\{\\%s\}\{([^{}]+)\}' % name, numbers)
        if not found:
            fail('macro %s is not in numbers.tex' % name)
        value = found.group(1).strip()
        if value not in body:
            fail('README abstract does not contain %s = %s' % (name, value))
        used.append((name, value))
    if not used:
        fail('abstract.tex uses no generated numbers')
    planted = body.replace('0.255', '0.256', 1)
    if '0.255' in planted:
        fail('the planted replacement did not remove 0.255')
    if any(value == '0.255' and value in planted for _, value in used):
        fail('0.256 still matched the generated minimum')
    print('%d abstract macros match the README' % len(used))
    for name, value in used:
        print('  %s = %s' % (name, value))
    print('replacing 0.255 by 0.256 is rejected')
    print('ALL CHECKS PASSED')
    return 0


if __name__ == '__main__':
    sys.exit(main())
