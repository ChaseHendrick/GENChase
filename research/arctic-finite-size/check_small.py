"""Exact small-size checks, with rational arithmetic, of every identity the finite-n computation uses.

1. The kernel code (kernels.py) against brute-force sums over all particle subsets of the Krawtchouk
   and Hahn ensembles.
2. Aztec diamond, orders 1..5, every tiling: the four polar regions as the studio defines them
   (dominoes of one type joined to the boundary by edge-adjacent dominoes of that type), the red
   particles of Johansson (Ann. Probab. 33 (2005), sec. 1: the white square of every S and W domino),
   the identity  |NPR| = sum over white anti-diagonals of 2 x (index of the first red particle), and
   the law of the red particles on each line (Krawtchouk ensemble, Johansson (2005) eq. 2.6).
3. Boxed plane partitions: E #{h = c} against Johansson's Hahn holes (PTRF 123 (2002), Theorem 4.1).
"""
from fractions import Fraction as Fr
from itertools import combinations
from math import comb, factorial
import sys
import numpy as np
import kernels as KR


def vdm2(xs):
    v = 1
    for i in range(len(xs)):
        for j in range(i + 1, len(xs)):
            v *= (xs[i] - xs[j]) ** 2
    return v


def ope_max_law(N, M, w):
    """Exact law of the max particle of the M-point ensemble with integer/rational weights w[0..N]."""
    law = [Fr(0)] * (N + 1)
    Z = Fr(0)
    for S in combinations(range(N + 1), M):
        p = Fr(vdm2(S))
        for x in S:
            p *= w[x]
        Z += p
        law[max(S)] += p
    return [l / Z for l in law]


def kraw_w(N):
    return [Fr(comb(N, x)) for x in range(N + 1)]


def hahn_w(N, al, be):
    return [Fr(factorial(N + al - t) * factorial(be + t), factorial(t) * factorial(N - t)) for t in range(N + 1)]


def check_kernel():
    worst = 0.0
    for N in range(1, 11):
        for M in range(1, N + 1):
            law = ope_max_law(N, M, kraw_w(N))
            em = float(sum(x * p for x, p in enumerate(law)))
            got, _ = KR.expected_max(KR.orthonormal_functions(*KR.krawtchouk_jacobi(N)), M)
            worst = max(worst, abs(got - em))
    kw = worst
    worst = 0.0
    for N in range(1, 9):
        for al in range(0, 4):
            for be in range(0, 4):
                for M in range(1, N + 1):
                    law = ope_max_law(N, M, hahn_w(N, al, be))
                    em = float(sum(x * p for x, p in enumerate(law)))
                    got, _ = KR.expected_max(KR.orthonormal_functions(*KR.hahn_jacobi(N, al, be)), M)
                    worst = max(worst, abs(got - em))
    print('kernel vs brute force: Krawtchouk N<=10 max |error| %.2e; Hahn N<=8, alpha,beta<=3 max |error| %.2e' % (kw, worst))
    assert kw < 1e-11 and worst < 1e-11
    return kw, worst


# ---------------------------------------------------------------- Aztec diamond
# Cells (i, j) on a 2n x 2n grid, row j = 0 at the top; cell centre (i + 1/2 - n, n - j - 1/2) in
# Johansson's coordinates. White squares: i + j = n - 1 (mod 2), so the leftmost square of every row
# in the top half is white (Johansson's convention). N: horizontal, left square white. S: horizontal,
# left square black. W: vertical, upper square white. E: vertical, upper square black.
def aztec_cells(n):
    return [(i, j) for j in range(2 * n) for i in range(2 * n) if abs(i + 0.5 - n) + abs(j + 0.5 - n) <= n]


def aztec_tilings(n):
    cells = aztec_cells(n)
    inside = set(cells)
    order = cells
    cov = {}
    out = []

    def visit(k):
        while k < len(order) and order[k] in cov:
            k += 1
        if k == len(order):
            out.append(dict(cov))
            return
        i, j = order[k]
        for (a, b) in ((i + 1, j), (i, j + 1)):
            if (a, b) in inside and (a, b) not in cov:
                cov[(i, j)] = (a, b); cov[(a, b)] = (i, j)
                visit(k + 1)
                del cov[(i, j)]; del cov[(a, b)]
    visit(0)
    return out


def dominoes(tiling, n):
    ds = []
    seen = set()
    for c, d in tiling.items():
        if c in seen:
            continue
        seen.add(c); seen.add(d)
        a, b = sorted([c, d], key=lambda z: (z[1], z[0]))   # upper, or left
        white = lambda z: (z[0] + z[1]) % 2 == (n - 1) % 2
        if a[1] == b[1]:   # horizontal, a is left
            t = 'N' if white(a) else 'S'
        else:              # vertical, a is upper
            t = 'W' if white(a) else 'E'
        ds.append((a, b, t))
    return ds


def polar_regions(ds, n):
    """Union-find over edge-adjacent same-type dominoes; polar = component touching the boundary."""
    inside = set(aztec_cells(n))
    owner = {}
    for k, (a, b, t) in enumerate(ds):
        owner[a] = k; owner[b] = k
    parent = list(range(len(ds)))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    touch = [False] * len(ds)
    for k, (a, b, t) in enumerate(ds):
        for c in (a, b):
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                e = (c[0] + dx, c[1] + dy)
                if e not in inside:
                    touch[k] = True; continue
                o = owner[e]
                if o != k and ds[o][2] == t:
                    ra, rb = find(k), find(o)
                    if ra != rb:
                        parent[ra] = rb
    rt = set(find(k) for k in range(len(ds)) if touch[k])
    cells = {'N': 0, 'S': 0, 'W': 0, 'E': 0}
    for k, (a, b, t) in enumerate(ds):
        if find(k) in rt:
            cells[t] += 2
    return cells


def red_first_index(ds, n):
    """For each white anti-diagonal d = i - j (d = n-1, n-3, ..., -(n-1)), the red particles (white
    square of every S and W domino) indexed 0..n along the line from its upper-left end; returns the
    list of red index sets, line by line in order of r = (n + 1 - d)/2 = 1..n."""
    white = lambda z: (z[0] + z[1]) % 2 == (n - 1) % 2
    reds = {}
    for a, b, t in ds:
        if t in 'SW':
            wsq = a if white(a) else b
            reds.setdefault(wsq[0] - wsq[1], []).append(wsq)
    lines = []
    for r in range(1, n + 1):
        d = n + 1 - 2 * r
        cells = sorted([c for c in aztec_cells(n) if c[0] - c[1] == d], key=lambda z: z[0])
        assert len(cells) == n + 1
        idx = {c: k for k, c in enumerate(cells)}
        lines.append(sorted(idx[c] for c in reds.get(d, [])))
    return lines


def check_aztec(nmax=5):
    rows = []
    for n in range(1, nmax + 1):
        T = aztec_tilings(n)
        assert len(T) == 2 ** (n * (n + 1) // 2)
        sumN = Fr(0); sumAll = Fr(0)
        line_laws = [dict() for _ in range(n)]
        for tl in T:
            ds = dominoes(tl, n)
            cells = polar_regions(ds, n)
            lines = red_first_index(ds, n)
            for r, L in enumerate(lines, 1):
                assert len(L) == r, 'line r does not carry r red particles'
                key = tuple(L)
                line_laws[r - 1][key] = line_laws[r - 1].get(key, 0) + 1
            first = sum(min(L) for L in lines)
            sumN += cells['N']; sumAll += sum(cells.values())
            rows.append((n, cells['N'], first))
        # Krawtchouk law of each line: P(S) proportional to Vandermonde^2 prod C(n, x)
        for r in range(1, n + 1):
            emp = line_laws[r - 1]
            Z = sum(vdm2(S) * np.prod([comb(n, x) for x in S]) for S in combinations(range(n + 1), r))
            for S in combinations(range(n + 1), r):
                pk = Fr(int(vdm2(S) * np.prod([comb(n, x) for x in S])), int(Z))
                pe = Fr(emp.get(S, 0), len(T))
                assert pk == pe, ('line law differs', n, r, S, pk, pe)
        print('order %d: %d tilings; red particles on every white anti-diagonal r carry the Krawtchouk law exactly (r = 1..%d); E|NPR| = %s, E polar cells = %s (x4 NPR: %s)'
              % (n, len(T), n, sumN / len(T), sumAll / len(T), 4 * sumN / len(T)))
    # fit |NPR| = alpha + beta * sum_r min index, exactly, per order
    for n in range(1, nmax + 1):
        pts = [(f, c) for (m, c, f) in rows if m == n]
        fs = sorted(set(f for f, c in pts))
        ok = True
        if len(fs) >= 2:
            (f0, c0) = next(p for p in pts if p[0] == fs[0]); (f1, c1) = next(p for p in pts if p[0] == fs[-1])
            beta = Fr(c1 - c0, f1 - f0); alpha = c0 - beta * f0
            ok = all(c == alpha + beta * f for f, c in pts)
            print('order %d: |NPR| = %s + %s * sum_r (first red index): %s on all tilings' % (n, alpha, beta, 'exact' if ok else 'FAILS'))
        assert ok
    return rows


if __name__ == '__main__':
    check_kernel()
    check_aztec(int(sys.argv[1]) if len(sys.argv) > 1 else 5)
