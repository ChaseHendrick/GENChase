#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""RIGOROUS winding number of the Evans function on the boundary of the box
    R = { -1/20 <= Re lam <= 9/2, |Im lam| <= 38/5 }       (large_lambda.py excludes eigenvalues outside R).

The boundary (split into an upper and a lower half path, run separately) is covered by segments [a, b]; for each
segment evans_rig.evans encloses Dt(lam) in f(lam) (Dc + D1 d + D2 d^2), d = lam - lc, on the complex square with centre lc = (a+b)/2
and half-width |b-a|/2; this gives an enclosure of D on the square and sharper enclosures of D(a) and D(b).  All three
must lie in an open half plane through 0: Re(X conj(z)) > 0 with z the midpoint of the square's enclosure.  Then the
continuous argument change of D along the segment is  arg(D(b) conj(z)) - arg(D(a) conj(z))  (principal arguments,
both in the half plane).  Segments that fail are halved.  The sum over the boundary, divided by 2 pi,
must be an interval containing exactly one integer: the winding number = number of zeros of Dt (equivalently of D)
in R counted with their order.  Each piece records the sha256 of evans_rig.py, winding.py and the pulse records;
combine refuses pieces that do not agree.
usage: python3 winding.py <piece> [nproc]   (piece: upper, lower, or right_up, top, left_up, left_down, bottom, right_down)
       python3 winding.py combine
"""
import sys, os, json, time, math
from multiprocessing import Pool
import _paths
import evans_rig as er
from flint import arb, acb, fmpq, ctx

DELTA, R0, OM = fmpq(-1, 20), fmpq(9, 2), fmpq(38, 5)
PATHS = {'upper': [(R0, fmpq(0)), (R0, OM), (DELTA, OM), (DELTA, fmpq(0))],
         'lower': [(DELTA, fmpq(0)), (DELTA, -OM), (R0, -OM), (R0, fmpq(0))],
         # the same boundary in six pieces (each run well under an hour on 4 cores)
         'right_up': [(R0, fmpq(0)), (R0, OM)], 'top': [(R0, OM), (DELTA, OM)], 'left_up': [(DELTA, OM), (DELTA, fmpq(0))],
         'left_down': [(DELTA, fmpq(0)), (DELTA, -OM)], 'bottom': [(DELTA, -OM), (R0, -OM)],
         'right_down': [(R0, -OM), (R0, fmpq(0))],
         'test': [(R0, fmpq(0)), (R0, fmpq(1, 25))]}          # a two-segment smoke test of the whole pipeline
COVERS = [('upper', 'lower'), ('right_up', 'top', 'left_up', 'left_down', 'bottom', 'right_down'),
          ('upper', 'left_down', 'bottom', 'right_down'), ('right_up', 'top', 'left_up', 'lower')]


def ball_of(a, b):
    cr_ = (a[0] + b[0]) / 2
    ci = (a[1] + b[1]) / 2
    r = max(abs(b[0] - a[0]), abs(b[1] - a[1])) / 2
    rad = arb(arb(r).upper())
    return acb(arb(cr_) + arb(0, rad), arb(ci) + arb(0, rad)), acb(arb(cr_), arb(ci))


def point(a):
    return acb(arb(a[0]), arb(a[1]))


def pack(z):
    return (z.real.mid().man_exp(), z.real.rad().man_exp(), z.imag.mid().man_exp(), z.imag.rad().man_exp())


def unpack(t):
    (rm, re), (rrm, rre), (im, ie), (irm, ire) = t
    def ball(m, e, rm_, re_):
        return arb(m) * arb(2) ** e + arb(0, arb(rm_) * arb(2) ** re_)
    return acb(ball(rm, re, rrm, rre), ball(im, ie, irm, ire))


def finite(z):
    return z.real.is_finite() and z.imag.is_finite()


def node_job(a):
    """thin enclosure of D(a)."""
    ctx.prec = er.PREC
    try:
        Dc, Dl, info = er.evans(point(a))
    except (ArithmeticError, AssertionError) as e:
        return a, None
    if Dc is None or not finite(info["D_ball_obj"]):
        return a, None
    return a, pack(info['D_ball_obj'])


def job(task):
    """Evans enclosure on the segment square; accepted when it and the thin enclosures of D(a), D(b) lie in the open
    half plane Re(X conj(z)) > 0, z = midpoint of the square's enclosure."""
    a, b, Da_p, Db_p = task
    ctx.prec = er.PREC
    lam, lc = ball_of(a, b)
    t = time.time()
    try:
        Dc, Dl, info = er.evans(lam)
        if Dc is None:
            return (a, b), None, str(info), time.time() - t
        Db_ = info['D_ball_obj']
    except (ArithmeticError, AssertionError) as e:
        return (a, b), None, 'error: %s' % e, time.time() - t
    Da, Dbb = unpack(Da_p), unpack(Db_p)
    if not finite(Db_):
        return (a, b), None, 'non-finite', time.time() - t
    z = acb(Db_.real.mid(), Db_.imag.mid())
    ok = all(bool((X * z.conjugate()).real > 0) for X in (Db_, Da, Dbb))
    if not ok:
        return (a, b), None, 'not in a half plane: %s' % Db_.str(5), time.time() - t
    darg = (Dbb * z.conjugate()).arg() - (Da * z.conjugate()).arg()
    return (a, b), {'D': pack(Db_), 'Da': Da_p, 'Db': Db_p, 'darg': (darg.mid().man_exp(), darg.rad().man_exp()),
                    'Dc_rad': info['Dc_rad']}, None, time.time() - t


def fingerprint():
    import hashlib
    h = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
    return {'evans_rig.py': h(os.path.join(_paths.HERE, 'evans_rig.py')), 'winding.py': h(os.path.join(_paths.HERE, 'winding.py')),
            'pulse_records.pkl': h(_paths.DATA + '/pulse_records.pkl')}


def main(which, nproc=4, seg0=fmpq(1, 50), min_len=fmpq(1, 4000)):
    t0 = time.time()
    fp = fingerprint()
    er.load()
    ctx.prec = er.PREC
    corners = PATHS[which]
    segs = []
    for (a, b) in zip(corners[:-1], corners[1:]):
        L = max(abs(b[0] - a[0]), abs(b[1] - a[1]))
        n = int(math.ceil(float(L / seg0)))
        for i in range(n):
            p = (a[0] + (b[0] - a[0]) * fmpq(i, n), a[1] + (b[1] - a[1]) * fmpq(i, n))
            q = (a[0] + (b[0] - a[0]) * fmpq(i + 1, n), a[1] + (b[1] - a[1]) * fmpq(i + 1, n))
            segs.append((p, q))
    accepted = {}
    nodes = {}
    pending = list(segs)
    rounds = 0
    nev = 0
    with Pool(nproc) as pool:
        while pending:
            rounds += 1
            need = sorted({p for ab in pending for p in ab if p not in nodes}, key=lambda p: (p[0], p[1]))
            for p, D in pool.map(node_job, need, chunksize=1):
                if D is None:
                    raise RuntimeError('thin evaluation failed at %s' % (p,))
                nodes[p] = D
            res = pool.map(job, [(a, b, nodes[a], nodes[b]) for a, b in pending], chunksize=1)
            nev += len(res) + len(need)
            newpend = []
            for task, r, why, dt in res:
                a, b = task
                if r is not None:
                    accepted[(a, b)] = r
                else:
                    if max(abs(b[0] - a[0]), abs(b[1] - a[1])) <= min_len:
                        raise RuntimeError('segment too short, still failing: %s %s %s' % (a, b, why))
                    m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
                    newpend += [(a, m), (m, b)]
            pending = newpend
            print('%s round %d: %d accepted, %d pending, %.0fs' % (which, rounds, len(accepted), len(pending), time.time() - t0), flush=True)
    # chain the segments along the path and sum the argument changes
    nxt = {a: (a, b) for (a, b) in accepted}
    pos = corners[0]
    total = arb(0)
    minabs = None
    nseg = 0
    lines = []
    while pos != corners[-1]:
        a, b = nxt[pos]
        r = accepted[(a, b)]
        m, e = r['darg'][0]
        rm, re = r['darg'][1]
        total += arb(m) * arb(2) ** e + arb(0, arb(rm) * arb(2) ** re)
        D = unpack(r['D'])
        lo = arb(D.abs_lower())
        minabs = lo if minabs is None else minabs.min(lo)
        lines.append('%s %s %s %s | %s | %s' % (a[0], a[1], b[0], b[1], D.str(6), unpack(r['Da']).str(8)))
        pos = b
        nseg += 1
    out = {'path': which, 'corners': [[str(x) for x in c] for c in corners], 'segments': nseg, 'evaluations': nev,
           'arg_change': total.str(20), 'arg_change_mid_rad': [float(total.mid()), float(total.rad())],
           'arg_change_exact': [[int(x) for x in total.mid().man_exp()], [int(x) for x in total.rad().man_exp()]],
           'min |D| on the path (lower bound)': minabs.str(6), 'time_s': round(time.time() - t0),
           'speed_bracket': [er.DATA['info']['c_lo'], er.DATA['info']['c_hi']], 'evans_prec': er.PREC,
           'evans_order': er.EORDER, 'sha256': fp}
    assert fingerprint() == fp, 'code or records changed during the run'
    print(json.dumps(out, indent=1))
    json.dump(out, open(_paths.DATA + '/winding_%s.json' % which, 'w'), indent=1)
    with open(_paths.DATA + '/winding_%s_segments.txt' % which, 'w') as f:
        f.write('# a_re a_im b_re b_im | D on the segment ball | D(a)\n')
        f.write('\n'.join(lines) + '\n')
    return out


def combine():
    """winding number from half or side paths that together form the counterclockwise boundary of the box
    (the first complete cover in COVERS whose results exist is used)."""
    import os
    for cover in COVERS:
        if all(os.path.exists(_paths.DATA + '/winding_%s.json' % w) for w in cover):
            break
    else:
        raise SystemExit('no complete set of winding_*.json files')
    tot = arb(0)
    parts = {}
    corners = []
    fps = []
    for w in cover:
        d = json.load(open(_paths.DATA + '/winding_%s.json' % w))
        (m, e), (rm, re) = d['arg_change_exact']
        tot += arb(m) * arb(2) ** e + arb(0, arb(rm) * arb(2) ** re)
        parts[w] = d['arg_change']
        corners.append(d['corners'])
        fps.append((d['sha256'], tuple(d['speed_bracket'])))
    assert all(f == fps[0] for f in fps), 'pieces were computed with different code or records'
    assert fps[0][0] == fingerprint(), 'pieces were computed with code or records other than the present ones'
    for c1, c2 in zip(corners, corners[1:] + corners[:1]):      # the pieces must join into a closed path
        assert c1[-1] == c2[0], (c1, c2)
    wind = tot / (2 * arb.pi())
    n0 = int(math.floor(float(wind.mid())))
    cand = [n for n in range(n0 - 3, n0 + 4) if wind.overlaps(arb(n))]
    unique = len(cand) == 1 and bool(abs(wind - cand[0]) < arb('0.5'))
    res = {'pieces': cover, 'arg_changes': parts, 'total/(2 pi)': wind.str(15), 'winding_number': cand[0] if unique else None,
           'sha256': fps[0][0], 'speed_bracket': list(fps[0][1])}
    print(json.dumps(res, indent=1))
    json.dump(res, open(_paths.DATA + '/winding.json', 'w'), indent=1)
    print('WINDING NUMBER', res['winding_number'] if unique else 'UNDETERMINED')


if __name__ == '__main__':
    if sys.argv[1] == 'combine':
        combine()
    else:
        main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 4)
