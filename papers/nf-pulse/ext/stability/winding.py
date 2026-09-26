#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""RIGOROUS winding number of the Evans function on the boundary of the box
    R = { -1/20 <= Re lam <= 9/2, |Im lam| <= 38/5 }       (large_lambda.py excludes eigenvalues outside R).

The boundary is covered by segments [a, b]; for each segment the Evans function is enclosed on the complex ball
(square) with centre (a+b)/2 and half-width |b-a|/2 (evans_rig.evans), and must lie in an open half plane through 0:
Re(D * conj(z_i)) > 0 for the point z_i = midpoint of the enclosure.  Then the continuous argument change of D along
the segment is  arg(D(b) conj(z_i)) - arg(D(a) conj(z_i))  (principal arguments, both in the half plane), computed
from thin enclosures of D(a) and D(b).  Segments that fail are halved.  The sum over the boundary, divided by 2 pi,
must be an interval containing exactly one integer: the winding number = number of eigenvalues in R with algebraic
multiplicity (zeros of D counted with order).
usage: python3 winding.py [nproc] [initial segment length]
"""
import sys, os, json, time, math
from multiprocessing import Pool
import _paths
import evans_rig as er
from flint import arb, acb, fmpq, ctx

DELTA, R0, OM = fmpq(-1, 20), fmpq(9, 2), fmpq(38, 5)
CORNERS = [(R0, fmpq(0)), (R0, OM), (DELTA, OM), (DELTA, -OM), (R0, -OM), (R0, fmpq(0))]


def ball_of(a, b):
    cr_ = (a[0] + b[0]) / 2
    ci = (a[1] + b[1]) / 2
    r = max(abs(b[0] - a[0]), abs(b[1] - a[1])) / 2
    rad = arb(arb(r).upper())
    return acb(arb(cr_) + arb(0, rad), arb(ci) + arb(0, rad))


def point(a):
    return acb(arb(a[0]), arb(a[1]))


def job(task):
    kind, a, b = task
    ctx.prec = er.PREC
    lam = ball_of(a, b) if kind == 'seg' else point(a)
    t = time.time()
    try:
        D, info = er.evans(lam)
    except ArithmeticError as e:
        return task, None, str(e), time.time() - t
    if D is None:
        return task, None, info, time.time() - t
    if not (D.real.is_finite() and D.imag.is_finite()):
        return task, None, 'non-finite enclosure', time.time() - t
    return task, (D.real.mid().man_exp(), D.real.rad().man_exp(), D.imag.mid().man_exp(), D.imag.rad().man_exp()), info, time.time() - t


def unpack(t):
    (rm, re), (rrm, rre), (im, ie), (irm, ire) = t
    def ball(m, e, rm_, re_):
        return arb(m) * arb(2) ** e + arb(0, arb(rm_) * arb(2) ** re_)
    return acb(ball(rm, re, rrm, rre), ball(im, ie, irm, ire))


def main(nproc=4, seg0=fmpq(2, 5), min_len=fmpq(1, 2000), outname='winding'):
    t0 = time.time()
    er.load()
    ctx.prec = er.PREC
    segs = []
    for (a, b) in zip(CORNERS[:-1], CORNERS[1:]):
        L = max(abs(b[0] - a[0]), abs(b[1] - a[1]))
        n = int(math.ceil(float(L / seg0)))
        for i in range(n):
            p = (a[0] + (b[0] - a[0]) * fmpq(i, n), a[1] + (b[1] - a[1]) * fmpq(i, n))
            q = (a[0] + (b[0] - a[0]) * fmpq(i + 1, n), a[1] + (b[1] - a[1]) * fmpq(i + 1, n))
            segs.append((p, q))
    nodes = {}
    accepted = {}        # (a, b) -> D enclosure (packed)
    pending = list(segs)
    rounds = 0
    stats = {'evaluations': 0, 'splits': 0}
    with Pool(nproc) as pool:
        while pending:
            rounds += 1
            tasks = [('seg', a, b) for a, b in pending]
            for a, b in pending:
                for p in (a, b):
                    if p not in nodes:
                        nodes[p] = None
                        tasks.append(('pt', p, p))
            res = pool.map(job, tasks, chunksize=1)
            stats['evaluations'] += len(res)
            newpend = []
            for task, D, info, dt in res:
                if task[0] == 'pt':
                    if D is None:
                        raise RuntimeError('thin evaluation failed at %s: %s' % (task[1], info))
                    nodes[task[1]] = D
                    continue
                a, b = task[1], task[2]
                good = False
                if D is not None:
                    Dz = unpack(D)
                    z = acb(Dz.real.mid(), Dz.imag.mid())
                    good = bool((Dz * z.conjugate()).real > 0)
                if good:
                    accepted[(a, b)] = D
                else:
                    if max(abs(b[0] - a[0]), abs(b[1] - a[1])) <= min_len:
                        raise RuntimeError('segment too short, still failing: %s %s %s' % (a, b, info))
                    m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
                    newpend += [(a, m), (m, b)]
                    stats['splits'] += 1
            pending = newpend
            print('round %d: %d accepted, %d pending, %.0fs' % (rounds, len(accepted), len(pending), time.time() - t0), flush=True)
    # assemble the boundary in order and sum the argument changes
    order = sorted(accepted.keys(), key=lambda ab: boundary_pos(ab[0]))
    total = arb(0)
    minabs = None
    maxang = 0.0
    pos = CORNERS[0]
    for (a, b) in order:
        assert a == pos, (a, pos)
        pos = b
        Dz = unpack(accepted[(a, b)])
        z = acb(Dz.real.mid(), Dz.imag.mid())
        Da, Db = unpack(nodes[a]), unpack(nodes[b])
        assert Dz.contains(Da) or Dz.overlaps(Da)
        A = (Da * z.conjugate())
        B = (Db * z.conjugate())
        assert bool(A.real > 0) and bool(B.real > 0)
        total += B.arg() - A.arg()
        lo = arb(Dz.abs_lower())
        minabs = lo if minabs is None else minabs.min(lo)
        maxang = max(maxang, float(((Dz * z.conjugate()).arg()).rad()))
    assert pos == CORNERS[-1]
    wind = total / (2 * arb.pi())
    lo, hi = math.ceil(float(wind.lower())), math.floor(float(wind.upper()))
    unique = (lo == hi)
    out = {'box': 'Re lam in [-1/20, 9/2], |Im lam| <= 38/5', 'segments': len(order), 'nodes': len(nodes),
           'evaluations': stats['evaluations'], 'splits': stats['splits'],
           'total_arg_change/(2 pi)': wind.str(15), 'winding_number': lo if unique else None,
           'min |D| on boundary (lower bound)': minabs.str(6), 'time_s': round(time.time() - t0),
           'pulse_records': er.DATA['info']['c_lo'] + ' .. ' + er.DATA['info']['c_hi'],
           'evans_prec': er.PREC, 'evans_order': er.EORDER}
    print(json.dumps(out, indent=1))
    json.dump(out, open(_paths.DATA + '/%s.json' % outname, 'w'), indent=1)
    with open(_paths.DATA + '/%s_segments.txt' % outname, 'w') as f:
        f.write('# a_re a_im b_re b_im | D on the segment ball\n')
        for (a, b) in order:
            f.write('%s %s %s %s | %s\n' % (a[0], a[1], b[0], b[1], unpack(accepted[(a, b)]).str(8)))
    print('WINDING NUMBER', out['winding_number'] if unique else 'UNDETERMINED')
    return out


def boundary_pos(p):
    """position of a boundary point along the counterclockwise path CORNERS (for sorting)."""
    s = 0.0
    for (a, b) in zip(CORNERS[:-1], CORNERS[1:]):
        L = float(max(abs(b[0] - a[0]), abs(b[1] - a[1])))
        on = (a[0] == b[0] == p[0] and min(a[1], b[1]) <= p[1] <= max(a[1], b[1])) or \
             (a[1] == b[1] == p[1] and min(a[0], b[0]) <= p[0] <= max(a[0], b[0]))
        if on:
            d = float(max(abs(p[0] - a[0]), abs(p[1] - a[1])))
            if not (d == L and p == CORNERS[-1] and s + d < 1e-9):
                return s + d
        s += L
    raise ValueError(p)


if __name__ == '__main__':
    nproc = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    main(nproc)
