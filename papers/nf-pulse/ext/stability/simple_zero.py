#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""RIGOROUS: lam = 0 is a simple zero of the Evans function, by a Cauchy integral; independent of the winding run.

The two computational inputs of Part 3 of Theorem S (REPORT.md, Section 5), each in ball arithmetic, for every pulse of
the class of pulse_enclosure.py:

 1. Rest eigenvalues at lam = 0.  A_inf(0) has exactly one eigenvalue with positive real part and three with negative
    real part, enclosed in four disjoint Krawczyk balls (evans_rig.eigen).  So the solutions of phi' = A(xi, 0) phi
    that decay at -infinity form a one-dimensional space: the geometric-multiplicity step.

 2. Dt'(0) is nonzero.  Cauchy's formula on the circle |lam| = r,
        Dt'(0) = (1 / (2 pi r)) int_0^{2 pi} Dt(r e^{i t}) e^{-i t} dt,
    with the circle split into N arcs of angle Delta = 2 pi / N.  On arc k (midpoint angle t_k) every lam lies in the
    square with centre r e^{i t_k} and half-width r Delta / 2, on which evans_rig.evans encloses Dt; and e^{-i t} lies
    in e^{-i t_k} + ball(Delta / 2).  So the integral over arc k lies in Delta * (Dt enclosure) * (e^{-i t} enclosure),
    and the sum over the arcs divided by 2 pi r encloses Dt'(0).  The same arcs give the mean-value integral
        Dt(0) = (1 / (2 pi)) int_0^{2 pi} Dt(r e^{i t}) dt,
    which must contain 0 (translation invariance): a consistency check on the enclosures, not a proof step.

    Dt = D (wt^T v) with wt^T v analytic and nonzero (evans_rig.py), and D(0) = 0, so D'(0) = Dt'(0) / (wt^T v)(0);
    both are enclosed.  The disc |lam| <= r lies in the box R of large_lambda.py, to the right of the essential
    spectrum, where D is analytic (the standard Evans-function fact the winding step also uses).

What the program does not check: that analyticity, the correspondence between eigenvalues and zeros of D, and the
limits at +-infinity in the written argument of Part 3 (see part3_symbolic.py for the algebra it does check).

usage: python3 simple_zero.py [N arcs, default 32] [nproc, default 1]
"""
import sys, os, json, time, hashlib
from multiprocessing import Pool
import _paths
import evans_rig as er
from flint import arb, acb, fmpq, ctx

R = fmpq(1, 25)          # circle radius: the disc lies inside R = [-1/20, 9/2] x [-38/5, 38/5]


def arc_square(k, N):
    """square containing the arc [2 pi k / N, 2 pi (k + 1) / N] of |lam| = R, and the enclosure of e^{-i t} on it."""
    ctx.prec = er.PREC
    pi = arb.pi()
    delta = 2 * pi / N
    tk = delta * (arb(k) + arb(1) / 2)
    r = arb(R)
    h = r * delta / 2                        # every point of the arc is within r Delta / 2 of r e^{i t_k}
    lam = acb(r * tk.cos() + arb(0, h.upper()), r * tk.sin() + arb(0, h.upper()))
    e = acb(tk.cos(), -tk.sin()) + acb(arb(0, (delta / 2).upper()), arb(0, (delta / 2).upper()))
    return lam, e, delta


def job(task):
    k, N = task
    ctx.prec = er.PREC
    lam, e, delta = arc_square(k, N)
    t = time.time()
    co, _, info = er.evans(lam)
    if co is None:
        return k, None, None, str(info), time.time() - t
    Dsq = info['D_ball_obj']
    if not (Dsq.real.is_finite() and Dsq.imag.is_finite()):
        return k, None, None, 'non-finite', time.time() - t
    return k, pack(Dsq * e * delta), pack(Dsq * delta), None, time.time() - t


def pack(z):
    f = lambda x: (x.mid().man_exp(), x.rad().man_exp())
    return f(z.real), f(z.imag)


def unpack(p):
    g = lambda t: arb(t[0][0]) * arb(2) ** t[0][1] + arb(0, arb(t[1][0]) * arb(2) ** t[1][1])
    return acb(g(p[0]), g(p[1]))


def outward(x, up):
    """the exact arb x (a point) as a 6-significant-digit decimal rounded down (up=False) or up (up=True)."""
    from decimal import Decimal, ROUND_FLOOR, ROUND_CEILING
    d = Decimal(x.str(40, radius=False))     # nearest 40-digit decimal of the exact value: relative error < 1e-39
    if d == 0:
        return '0'
    d = d + abs(d) * Decimal('1e-35') if up else d - abs(d) * Decimal('1e-35')   # now on the safe side of x
    q = Decimal(1).scaleb(d.adjusted() - 5)
    return str(d.quantize(q, rounding=ROUND_CEILING if up else ROUND_FLOOR))


def bounds(z):
    """explicit bounds of the real and imaginary parts, rounded outward (arb's short form hides them for wide balls)."""
    f = lambda x: '[%s, %s]' % (outward(x.lower(), False), outward(x.upper(), True))
    return f(z.real) + ' + ' + f(z.imag) + 'i'


def fingerprint():
    h = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
    return {'evans_rig.py': h(os.path.join(_paths.HERE, 'evans_rig.py')), 'simple_zero.py': h(os.path.abspath(__file__)),
            'pulse_records.pkl': h(_paths.DATA + '/pulse_records.pkl')}


def main(N=32, nproc=1):
    t0 = time.time()
    er.load()
    ctx.prec = er.PREC
    k_, s_, eps = er.DATA['kappa'], er.nf.dS(arb(0)), arb(fmpq(1, 10))

    # 1. rest eigenvalues at lam = 0
    nus, V, Wr, ok = er.eigen(acb(0), k_, s_, eps)
    n_pos = sum(bool(n.real > 0) for n in nus)
    n_neg = sum(bool(n.real < 0) for n in nus)
    disjoint = all(not nus[i].overlaps(nus[j]) for i in range(4) for j in range(i + 1, 4))
    cert1 = bool(ok) and n_pos == 1 and n_neg == 3 and disjoint
    print('1. rest eigenvalues at lam = 0:', [n.str(12) for n in nus], flush=True)
    print('   one with Re > 0, three with Re < 0, disjoint balls:', cert1, flush=True)

    # wt^T v at lam = 0 (evans_rig's normalisation of Dt)
    nu = nus[0]
    v = [acb(1), eps * k_ / nu, -s_ / (nu * nu - 1), -s_ * nu / (nu * nu - 1)]
    wt = [acb(1), -k_ / nu, k_ * nu / (nu * nu - 1), k_ / (nu * nu - 1)]
    wtv = sum((wt[i] * v[i] for i in range(4)), acb(0))

    # 2. Cauchy integrals over N arcs
    tasks = [(k, N) for k in range(N)]
    res = {}
    if nproc > 1:
        with Pool(nproc) as pool:
            for k, a, b, err, dt in pool.imap_unordered(job, tasks):
                res[k] = (a, b, err)
                print('   arc %2d: %s  %.0fs' % (k, 'ok' if err is None else err, dt), flush=True)
    else:
        for task in tasks:
            k, a, b, err, dt = job(task)
            res[k] = (a, b, err)
            print('   arc %2d: %s  %.0fs' % (k, 'ok' if err is None else err, dt), flush=True)
    failed = [k for k in range(N) if res[k][2] is not None]
    if failed:
        print('arcs without an enclosure:', failed)
        print('SIMPLE ZERO: NOT CERTIFIED')
        return 1
    ctx.prec = er.PREC
    pi = arb.pi()
    r = arb(R)
    Sd = sum((unpack(res[k][0]) for k in range(N)), acb(0))
    Sm = sum((unpack(res[k][1]) for k in range(N)), acb(0))
    dDt = Sd / (2 * pi * r)
    Dt0 = Sm / (2 * pi)
    dD = dDt / wtv
    excl = not dDt.contains(0)
    mean_ok = Dt0.contains(0)
    # the Taylor-model linear coefficient on a thin square at 0 (numerical comparison only, not rigorous)
    co, _, info0 = er.evans(acb(arb(0, 1e-12), arb(0, 1e-12)))
    print("2. Dt'(0) in", bounds(dDt), flush=True)
    print('   (wt^T v)(0) in', wtv.str(10), flush=True)
    print("   D'(0) = Dt'(0) / (wt^T v)(0) in", bounds(dD), flush=True)
    print("   Dt'(0) excludes 0:", excl, flush=True)
    print('   consistency: the mean-value integral encloses Dt(0) in', bounds(Dt0), '; contains 0:', mean_ok, flush=True)
    print("   numerical comparison: Taylor-model coefficient D1 at lam = 0:", info0['D1'], flush=True)
    cert = cert1 and excl and mean_ok
    out = {'radius': '1/25', 'arcs': N, 'rest_eigenvalues_at_0': [n.str(15) for n in nus], 'one_unstable_three_stable': cert1,
           "Dt'(0)": bounds(dDt), '(wt^T v)(0)': wtv.str(15), "D'(0)": bounds(dD), "Dt'(0) excludes 0": excl,
           'mean-value Dt(0)': bounds(Dt0), 'mean-value contains 0': mean_ok, 'D1 at 0 (numerical)': info0['D1'],
           'prec': er.PREC, 'order': er.EORDER, 'time_s': round(time.time() - t0), 'sha256': fingerprint()}
    json.dump(out, open(os.path.join(_paths.DATA, 'simple_zero.json'), 'w'), indent=1)
    print('SIMPLE ZERO: CERTIFIED' if cert else 'SIMPLE ZERO: NOT CERTIFIED', flush=True)
    return 0 if cert else 1


if __name__ == '__main__':
    N = int(sys.argv[1]) if len(sys.argv) > 1 else 32
    nproc = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    sys.exit(main(N, nproc))
