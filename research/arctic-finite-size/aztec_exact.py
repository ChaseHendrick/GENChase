"""Exact expected polar-region area of a uniform domino tiling of the Aztec diamond of order n.

Identity (checked on every tiling of orders 1..5 by check_small.py): the north polar region has
    |NPR| = 2 sum_{r=1}^{n} (index of the first red particle on the r-th white anti-diagonal),
and the red particles on line r form the Krawtchouk ensemble with r points on {0..n} and weight
C(n, x) (Johansson, Ann. Probab. 33 (2005), eq. 2.6). The weight is symmetric, so the first index has
the law of n - max. By the dihedral symmetry the four regions have one mean, and the polar fraction is
    q(n) = 4 E|NPR| / (2 n (n + 1)) = (4 / (n (n + 1))) sum_r (n - E[max_r]).
Every E[max_r] is a sum of gap probabilities det(I - K) of the Krawtchouk kernel (kernels.py).
Floating point; the per-line error is below 1e-12 (see check_small.py and the exact rational
comparison in verify_rational.py).
"""
import json
import sys
import time
from multiprocessing import Pool
import numpy as np
import kernels as KR

_JAC = {}


def line(args):
    n, r = args
    if n not in _JAC:
        _JAC.clear(); _JAC[n] = KR.krawtchouk_jacobi(n)
    d, o = _JAC[n]
    return n - KR.expected_max_jacobi(d, o, r)


def polar(n, pool=None):
    jobs = [(n, r) for r in range(1, n + 1)]
    firsts = pool.map(line, jobs, chunksize=max(1, n // 16)) if pool else list(map(line, jobs))
    npr = 2.0 * sum(firsts)
    return {'n': n, 'ENPR': npr, 'polarFraction': 4 * npr / (2 * n * (n + 1)), 'firstIndexByLine': firsts}


if __name__ == '__main__':
    ns = [int(x) for x in sys.argv[1].split(',')] if len(sys.argv) > 1 else list(range(8, 121)) + [40, 57, 80, 113, 160, 226, 320]
    out_path = sys.argv[2] if len(sys.argv) > 2 else 'data/aztec_exact.json'
    try:
        res = {r['n']: r for r in json.load(open(out_path))['rows']}
    except FileNotFoundError:
        res = {}
    with Pool(4) as pool:
        for n in sorted(set(ns)):
            if n in res:
                continue
            t = time.time()
            r = polar(n, pool)
            r['seconds'] = round(time.time() - t, 2)
            del r['firstIndexByLine']
            res[n] = r
            dev = r['polarFraction'] - (1 - np.pi / 4)
            print('n=%5d  q=%.12f  (q - (1-pi/4)) n^(2/3) = %.9f  %.1fs' % (n, r['polarFraction'], dev * n ** (2 / 3), r['seconds']), flush=True)
            json.dump({'what': 'exact expected polar fraction of the uniform Aztec diamond, floating point (see aztec_exact.py)',
                       'rows': [res[k] for k in sorted(res)]}, open(out_path, 'w'), indent=1)
