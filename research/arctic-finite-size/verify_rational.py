"""Exact rational recheck of the floating-point pipeline by a different route.

For an M-point ensemble with integer weights w on {0..N},
    P(max < t) = det[ sum_{x<t} w(x) x^(i+j) ]_{i,j<M} / det[ sum_{x} w(x) x^(i+j) ]_{i,j<M}
(Andreief / Cauchy-Binet), computed with integer Bareiss elimination, so E[max] is an exact rational.
Checks the Aztec polar fraction at orders up to 24 and the regular hexagon free fraction up to side 8
against aztec_exact.py and hexagon_exact.py.
"""
from fractions import Fraction as Fr
from math import comb, factorial
import sys
from multiprocessing import Pool


def bareiss(A):
    A = [row[:] for row in A]
    n = len(A)
    prev = 1
    sign = 1
    for k in range(n - 1):
        if A[k][k] == 0:
            for r in range(k + 1, n):
                if A[r][k] != 0:
                    A[k], A[r] = A[r], A[k]; sign = -sign; break
            else:
                return 0
        for i in range(k + 1, n):
            for j in range(k + 1, n):
                A[i][j] = (A[i][j] * A[k][k] - A[i][k] * A[k][j]) // prev
        prev = A[k][k]
    return sign * A[n - 1][n - 1]


def expected_max_exact(w, M):
    N = len(w) - 1
    if M == 0:
        return Fr(0)
    pw = [[x ** e for e in range(2 * M - 1)] for x in range(N + 1)]
    def gram(t):
        mom = [sum(w[x] * pw[x][e] for x in range(t)) for e in range(2 * M - 1)]
        return [[mom[i + j] for j in range(M)] for i in range(M)]
    Z = bareiss(gram(N + 1))
    # E[max] = sum_{t=1}^{N} (1 - P(max < t))
    return sum(1 - Fr(bareiss(gram(t)), Z) for t in range(1, N + 1))


def aztec_line(args):
    n, r = args
    return n - expected_max_exact([comb(n, x) for x in range(n + 1)], r)


def aztec_polar(n, pool):
    firsts = pool.map(aztec_line, [(n, r) for r in range(1, n + 1)])
    return 4 * 2 * sum(firsts) / (2 * n * (n + 1))


def hex_line(args):
    a, b, c, m = args
    al = -m if m <= b else m - 2 * b
    be = m + 2 * (c - 1) if m <= a else 2 * a - m + 2 * (c - 1)
    g = (be - al) // 2
    L = g + 1 - c
    A, B = abs(a - m), abs(b - m)
    w = [factorial(g + A - t) * factorial(B + t) // (factorial(t) * factorial(g - t)) for t in range(g + 1)]
    return g - expected_max_exact(w, L)


def hex_free(a, b, c, pool):
    F = lambda x, y, z: sum(pool.map(hex_line, [(x, y, z, m) for m in range(1, x + 1)]))
    return 1 - 2 * (F(a, c, b) + F(b, a, c) + F(a, b, c)) / Fr(a * b + b * c + c * a)


if __name__ == '__main__':
    import json
    import numpy as np
    az = {r['n']: r['polarFraction'] for r in json.load(open('data/aztec_exact.json'))['rows']}
    import hexagon_exact as HX
    with Pool(4) as pool:
        worst = 0
        for n in [4, 5, 8, 12, 16, 20, 24, 40]:
            q = aztec_polar(n, pool)
            fl = az[n] if n in az else None
            if fl is None:
                import aztec_exact as AX
                fl = AX.polar(n)['polarFraction']
            worst = max(worst, abs(float(q) - fl))
            print('Aztec n=%2d exact polar fraction = %s = %.15f; float pipeline %.15f; diff %.1e' % (n, q if n <= 5 else '(rational, %d-digit denominator)' % len(str(q.denominator)), float(q), fl, float(q) - fl))
        for (a, b, c) in [(2, 2, 2), (4, 4, 4), (6, 6, 6), (8, 8, 8), (12, 12, 12), (3, 5, 6), (6, 10, 12), (12, 20, 24)]:
            q = hex_free(a, b, c, pool)
            fl = HX.free(a, b, c, pool)[0]
            worst = max(worst, abs(float(q) - fl))
            print('hexagon %dx%dx%d exact free fraction = %.15f; float pipeline %.15f; diff %.1e' % (a, b, c, float(q), fl, float(q) - fl))
        print('largest difference %.1e' % worst)
