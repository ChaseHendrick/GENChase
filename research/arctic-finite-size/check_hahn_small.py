"""Boxed plane partitions: the hole law on every line and the frozen-count identity, exactly.

A plane partition h in the a x b box (rows i < a, columns j < b) with parts at most c has level sets
lambda^(k) = {h >= k}, k = 1..c. Johansson (PTRF 123 (2002), sec. 4.1) encodes each level line as a
+-1 walk of a + b steps shifted up by 2(k - 1): walk k traverses the boundary of lambda^(k) from
(row a, column 0) to (row 0, column b), +1 for a step up and -1 for a step right. On line m the walks
sit at x_k = (S_k(m) - alpha_m)/2 in {0..gamma_m}, and the holes (the other L_m = gamma_m + 1 - c
sites) carry the Hahn law of his Theorem 4.1 with parameters (|a - m|, |b - m|), for a >= b.
The studio's frozen counts are the extreme level sets (tools/lib/lozenge-reference.js,
extremeLevelCounts): #{h = c} + #{h = 0}, and the same for m(j, k) = #{i : h(i, j) > k} (value a or 0)
and q(i, k) = #{j : h(i, j) > k} (value b or 0).
"""
from fractions import Fraction as Fr
from itertools import combinations
from math import factorial
import kernels as KR
from check_small import vdm2


def partitions(a, b, c):
    h = [[0] * b for _ in range(a)]
    out = []

    def fill(k):
        if k == a * b:
            out.append([row[:] for row in h]); return
        i, j = divmod(k, b)
        hi = min(h[i - 1][j] if i > 0 else c, h[i][j - 1] if j > 0 else c)
        for z in range(hi + 1):
            h[i][j] = z; fill(k + 1)
    fill(0)
    return out


def params(a, b, c, m):
    """Johansson's walls alpha_m (lowest walk) and beta_m (highest walk), gamma_m and L_m. He states
    them for a >= b; the walls are the all-right-first and all-up-first paths in either case, so the
    same formulas hold for a < b, and the hole law is checked below for both orders."""
    al = -m if m <= b else m - 2 * b
    be = m + 2 * (c - 1) if m <= a else 2 * a - m + 2 * (c - 1)
    g = (be - al) // 2
    return al, be, g, g + 1 - c


def walks(h, a, b, c):
    """S[k][m], k = 1..c, m = 0..a+b."""
    S = {}
    for k in range(1, c + 1):
        lam = [sum(1 for j in range(b) if h[i][j] >= k) for i in range(a)] + [0]
        steps = []
        for i in range(a - 1, -1, -1):
            steps += [-1] * (lam[i] - lam[i + 1]) + [+1]
        steps += [-1] * (b - lam[0])
        assert len(steps) == a + b
        s = [2 * (k - 1)]
        for x in steps:
            s.append(s[-1] + x)
        S[k] = s
    return S


def level_counts(h, a, b, c):
    tops = sum(1 for i in range(a) for j in range(b) if h[i][j] in (0, c))
    right = sum(1 for k in range(c) for j in range(b) if sum(1 for i in range(a) if h[i][j] > k) in (0, a))
    left = sum(1 for k in range(c) for i in range(a) if sum(1 for j in range(b) if h[i][j] > k) in (0, b))
    return tops, right, left


def hahn_hole_law(N, L, al, be):
    w = [Fr(factorial(N + al - t) * factorial(be + t), factorial(t) * factorial(N - t)) for t in range(N + 1)]
    law = {}
    Z = Fr(0)
    for S in combinations(range(N + 1), L):
        p = Fr(vdm2(S))
        for x in S:
            p *= w[x]
        law[S] = p; Z += p
    return {S: p / Z for S, p in law.items()}


def run(a, b, c):
    P = partitions(a, b, c)
    n = len(P)
    lines = {m: {} for m in range(a + b + 1)}
    tot = [Fr(0)] * 3
    top_packed = {m: Fr(0) for m in range(a + b + 1)}
    for h in P:
        S = walks(h, a, b, c)
        for m in range(a + b + 1):
            al, be, g, L = params(a, b, c, m)
            xs = sorted((S[k][m] - al) // 2 for k in range(1, c + 1))
            assert all((S[k][m] - al) % 2 == 0 for k in S) and xs[0] >= 0 and xs[-1] <= g and len(set(xs)) == c
            holes = tuple(t for t in range(g + 1) if t not in xs)
            lines[m][holes] = lines[m].get(holes, 0) + 1
            top_packed[m] += g - (max(holes) if holes else -1)
        for q, v in enumerate(level_counts(h, a, b, c)):
            tot[q] += v
    for m in range(a + b + 1):
        al, be, g, L = params(a, b, c, m)
        law = hahn_hole_law(g, L, abs(a - m), abs(b - m))
        for Sx, p in law.items():
            assert Fr(lines[m].get(Sx, 0), n) == p, ('hole law differs', a, b, c, m)
    E = [t / n for t in tot]
    tp = [top_packed[m] / n for m in range(a + b + 1)]
    # the kernel computation of sum_m E[gamma_m - Z_m]
    ksum = 0.0
    for m in range(1, a + b):
        al, be, g, L = params(a, b, c, m)
        Phi = KR.orthonormal_functions(*KR.hahn_jacobi(g, abs(a - m), abs(b - m)))
        em, _ = KR.expected_max(Phi, L)
        ksum += g - em
    print('%dx%dx%d: %d partitions; hole law is Hahn on all %d lines. E[tops, right, left] = %s; sum_m E[gamma_m - max hole] = %s (= %.12f; kernel %.12f)'
          % (a, b, c, n, a + b + 1, [str(x) for x in E], sum(tp[1:a + b]), float(sum(tp[1:a + b])), ksum))
    return E, tp


if __name__ == '__main__':
    for box in [(2, 2, 2), (3, 2, 2), (3, 2, 3), (3, 3, 2), (4, 2, 3), (3, 3, 3), (4, 3, 2), (4, 3, 3), (4, 4, 3)]:
        run(*box)
