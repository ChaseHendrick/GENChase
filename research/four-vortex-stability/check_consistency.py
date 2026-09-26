"""Re-run, for every box of a certificate, the equilibrium-enclosure stage of certify3.py with the
consistency assertion (thin zero v0 inside p(0) + W); every CERTIFIED box must come out
CONSISTENT.  usage: python3 check_consistency.py data/cert_X.json [...]"""
import sys, json
import multiprocessing as mp
import families
from certify3 import certify_interval


def job(a):
    fam, lo, hi = a
    return lo, hi, certify_interval(families.get(fam), lo, hi, enclosure_only=True)['status']


if __name__ == '__main__':
    bad = 0
    for p in sys.argv[1:]:
        C = json.load(open(p))
        todo = [(C['family'], b['lo'], b['hi']) for b in C['boxes'] if b['status'] == 'CERTIFIED']
        with mp.Pool(4) as pool:
            res = pool.map(job, todo, chunksize=16)
        nb = [r for r in res if r[2] != 'CONSISTENT']
        bad += len(nb)
        print('%s: %d certified boxes checked, %d not consistent %s' % (p, len(res), len(nb), nb[:5]))
    sys.exit(1 if bad else 0)
