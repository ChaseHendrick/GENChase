"""Exact expected free-area fraction of a uniform lozenge tiling of the a x b x c hexagon.

The studio's frozen rhombi are the extreme level sets of the plane partition h (a x b, parts <= c)
and of its two side views m(j, k) = #{i : h(i, j) > k} (b x c, parts <= a) and
q(i, k) = #{j : h(i, j) > k} (a x c, parts <= b) (tools/lib/lozenge-reference.js, extremeLevelCounts).
By the complement symmetry the full and the empty corner of each view have one mean, and
    E #{q = b} = F(a, b, c) := sum_{m=1}^{a} E[gamma_m - Z_m],
where Z_m is the top hole of Johansson's Hahn ensemble on line m (PTRF 123 (2002), Theorem 4.1);
check_hahn_small.py verifies this identity exactly on nine boxes and the hole law line by line.
Permuting the box, E #{h = c} = F(a, c, b) and E #{m = a} = F(b, a, c), so
    free = 1 - 2 (F(a, c, b) + F(b, a, c) + F(a, b, c)) / (ab + bc + ca).
"""
import json
import sys
import time
from multiprocessing import Pool
import numpy as np
import kernels as KR


def params(a, b, c, m):
    al = -m if m <= b else m - 2 * b
    be = m + 2 * (c - 1) if m <= a else 2 * a - m + 2 * (c - 1)
    g = (be - al) // 2
    return g, g + 1 - c


def line(args):
    a, b, c, m = args
    g, L = params(a, b, c, m)
    if L <= 0:
        return 0.0
    return g - KR.expected_max_jacobi(*KR.hahn_jacobi(g, abs(a - m), abs(b - m)), L)


def F(a, b, c, pool):
    return float(sum(pool.map(line, [(a, b, c, m) for m in range(1, a + 1)], chunksize=max(1, a // 16))))


def free(a, b, c, pool):
    Fs = [F(a, c, b, pool), F(b, a, c, pool), F(a, b, c, pool)]
    return 1 - 2 * sum(Fs) / (a * b + b * c + c * a), Fs


if __name__ == '__main__':
    fam = sys.argv[1]
    ks = [int(x) for x in sys.argv[2].split(',')]
    out = 'data/hexagon_exact_%s.json' % fam
    try:
        res = {tuple(r['box']): r for r in json.load(open(out))['rows']}
    except FileNotFoundError:
        res = {}
    ratio = (1, 1, 1) if fam == 'regular' else (3, 5, 6)
    lim = np.pi / (2 * np.sqrt(3)) if fam == 'regular' else 0.8850434659350882
    with Pool(4) as pool:
        for k in ks:
            box = tuple(k * x for x in ratio)
            if box in res:
                continue
            t = time.time()
            q, Fs = free(*box, pool)
            res[box] = {'box': list(box), 'size': k, 'freeFraction': q, 'F': Fs, 'seconds': round(time.time() - t, 2)}
            print('%s k=%4d box=%s free=%.12f  (free - limit) k^(2/3) = %.9f  %.1fs' % (fam, k, box, q, (q - lim) * k ** (2 / 3), time.time() - t), flush=True)
            json.dump({'what': 'exact expected free-area fraction, %s family (see hexagon_exact.py)' % fam, 'limit': lim,
                       'rows': [res[b] for b in sorted(res)]}, open(out, 'w'), indent=1)
