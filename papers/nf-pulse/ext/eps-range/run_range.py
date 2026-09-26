#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Cover an eps range by certified subintervals (drives chain.py; the checks are all in chain.py).

usage: python3 run_range.py <eps_from> <eps_to> [--w0 W] [--wmin W] [--jobs N] [--tag T]

The range is cut into N contiguous chunks, one per worker.  Each worker goes left to right: it tries
[x, x + w] with the kappa-window half width dk = w/20; on PASS it keeps the certificate,
moves on and tries a 25 per cent wider subinterval; on FAIL it halves w and tries again, down to wmin
(then it records the gap and moves on).  Endpoints are decimals with 6 digits.  Certificates go to
data/certs/, one JSON file per attempt; data/range_<tag>.txt lists the attempts.
Speed guesses for the (numerical) bisection come from data/cstar_scan.txt.
"""
import os, sys, json, time, argparse, subprocess
from multiprocessing import Pool
HERE = os.path.dirname(os.path.abspath(__file__))


def scan():
    xs, ys = [], []
    for line in open(os.path.join(HERE, 'data', 'cstar_scan.txt')):
        if line.startswith('eps') and 'c*' in line:
            p = line.split()
            xs.append(float(p[1])); ys.append(float(p[3]))
    z = sorted(zip(xs, ys))
    return [a for a, b in z], [b for a, b in z]


XS, YS = scan()


def c_guess(e):
    """cubic Lagrange interpolation in the numerical table."""
    i = min(range(len(XS)), key=lambda j: abs(XS[j] - e))
    i = max(1, min(len(XS) - 3, i - 1))
    idx = range(i - 1, i + 3)
    s = 0.0
    for j in idx:
        l = 1.0
        for m in idx:
            if m != j:
                l *= (e - XS[m]) / (XS[j] - XS[m])
        s += l * YS[j]
    return s


def dec(x):
    return '%.6f' % x


def attempt(lo, hi, tag):
    dk = (hi - lo) / 20.0
    out = os.path.join(HERE, 'data', 'certs', 'eps_%s_%s.json' % (dec(lo), dec(hi)))
    if os.path.exists(out) or os.path.exists(out + '.gz'):
        import gzip
        v = (json.load(open(out)) if os.path.exists(out) else json.load(gzip.open(out + '.gz', 'rt'))).get('verdict')
        return v, out, 0.0
    t0 = time.time()
    cmd = [sys.executable, os.path.join(HERE, 'chain.py'), dec(lo), dec(hi), '%.12f' % c_guess(0.5 * (lo + hi)),
           '--dk', '%.3e' % dk, '--out', out]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=3000)
    v = 'FAIL'
    for line in r.stdout.splitlines():
        if line.startswith('VERDICT'):
            v = line.split()[1]
    if not os.path.exists(out):
        json.dump({'verdict': 'FAIL', 'reason': 'crashed', 'stderr': r.stderr[-3000:]}, open(out, 'w'))
    return v, out, time.time() - t0


def worker(args):
    a, b, w0, wmin, tag, k = args
    log = os.path.join(HERE, 'data', 'range_%s_chunk%d.txt' % (tag, k))
    x, w, w_ok = a, w0, None
    with open(log, 'a') as f:
        while x < b - 1e-12:
            hi = min(b, x + w)
            if b - hi < wmin / 2:
                hi = b
            v, out, dt = attempt(x, hi, tag)
            f.write('%s %s %s %.0fs %s\n' % (dec(x), dec(hi), v, dt, os.path.basename(out)))
            f.flush()
            if v == 'PASS':
                x = hi
                w_ok = w
                w = min(w * 1.15, 2 * w0)
            elif w_ok is not None and w > 1.01 * w_ok:
                w = w_ok                      # back to the last width that passed
            elif w / 2 >= wmin:
                w = w / 2
                w_ok = None
            else:
                f.write('GAP %s %s\n' % (dec(x), dec(hi)))
                x = hi
                w = w0
    return log


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('a', type=float); ap.add_argument('b', type=float)
    ap.add_argument('--w0', type=float, default=4e-4)
    ap.add_argument('--wmin', type=float, default=2.5e-5)
    ap.add_argument('--jobs', type=int, default=os.cpu_count())
    ap.add_argument('--tag', default='run')
    ap.add_argument('--chunks', default=None, help='a1:b1,a2:b2,... explicit chunks (resume a sweep)')
    A = ap.parse_args()
    os.makedirs(os.path.join(HERE, 'data', 'certs'), exist_ok=True)
    n = A.jobs
    cuts = [A.a + (A.b - A.a) * i / n for i in range(n + 1)]
    cuts = [round(c, 6) for c in cuts]
    chunks = [(cuts[i], cuts[i + 1]) for i in range(n)]
    if A.chunks:
        chunks = [tuple(float(y) for y in c.split(':')) for c in A.chunks.split(',')]
    with Pool(min(A.jobs, len(chunks))) as p:        # chunks are handed out one at a time as workers free up
        logs = list(p.imap_unordered(worker, [(c[0], c[1], A.w0, A.wmin, A.tag, i) for i, c in enumerate(chunks)], 1))
    print('\n'.join(logs))
