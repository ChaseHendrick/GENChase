"""Check the directed-rounding interval operations of ival.h against exact
rational arithmetic: every result interval must contain the exact result
for the interval endpoints (the operations are monotone per endpoint pair),
and must not be absurdly wide.  Run from code/:  python3 tests/test_ival.py"""
import random, subprocess, sys, os
from fractions import Fraction as Fr
here = os.path.dirname(os.path.abspath(__file__))
exe = os.path.join(here, 'ival_ops')
subprocess.run(['gcc', '-O2', '-frounding-math', '-fno-fast-math', '-std=gnu11', '-Wno-unknown-pragmas',
                '-o', exe, os.path.join(here, 'ival_ops.c'), '-lm'], check=True)
rnd = random.Random(12345)
def rf():
    k = rnd.random()
    if k < 0.1: return 0.0
    e = rnd.randint(-60, 60)
    return rnd.choice([-1, 1]) * rnd.random() * 2.0 ** e
cases = []
for _ in range(200000):
    op = rnd.choice(['add', 'sub', 'mul', 'sqr', 'rec'])
    a, b = sorted([rf(), rf()]); c, d = sorted([rf(), rf()])
    if op == 'rec':
        if a <= 0 <= b: a, b = abs(a) + 1e-300, abs(b) + 1e-300; a, b = sorted([a, b])
    cases.append((op, a, b, c, d))
inp = '\n'.join(f'{o} {a.hex()} {b.hex()} {c.hex()} {d.hex()}' for o, a, b, c, d in cases)
out = subprocess.run([exe], input=inp, capture_output=True, text=True, check=True).stdout.split('\n')
bad = 0
for (o, a, b, c, d), line in zip(cases, out):
    lo, hi = (float.fromhex(t) for t in line.split())
    A, B, C, Dd = map(Fr, (a, b, c, d))
    if o == 'add': ex = [A + C, B + Dd]
    elif o == 'sub': ex = [A - Dd, B - C]
    elif o == 'mul': ex = [A * C, A * Dd, B * C, B * Dd]
    elif o == 'sqr': ex = [A * A, B * B] + ([Fr(0)] if A <= 0 <= B else [])
    elif o == 'rec': ex = [1 / A, 1 / B]
    mn, mx = min(ex), max(ex)
    if not (Fr(lo) <= mn and mx <= Fr(hi)):
        bad += 1
        if bad < 5: print('FAIL', o, a, b, c, d, lo, hi)
    # tightness: at most a few ulps outside
    import math
    if mn != 0 and abs(Fr(lo) - mn) > abs(mn) * Fr(1, 2**50) and abs(lo) > 1e-290: bad += 1; print('WIDE', o, a, b, lo, float(mn))
print('cases', len(cases), 'failures', bad)
sys.exit(1 if bad else 0)
