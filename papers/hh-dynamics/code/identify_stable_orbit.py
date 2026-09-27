#!/usr/bin/env python3
"""The stable orbit of Theorem 5(a) is the orbit Gamma(E_l) of Theorem 4 at the three values of E_l.

Theorem 5(a) of the manuscript (the program's Theorem B(i), stage 4 of certify_bistability.py) proves, at J = 8 and
E_l = 10.613, E_l* (a ball) and 10.599, a fixed point z* of the first-return map P to {u = 20, du/dt > 0} in a
Krawczyk box Z_5 of radius about 1e-15, and encloses it in the Krawczyk image K (Rump 2010, Thm 13.3: the zero lies in
x~ + S(X, x~), which is K).  Theorem 4 (the program's Theorem C, stage 4b) proves, on each of 60 pieces of the E_l
interval, a box Z_4 of radius about 4.6e-7 with P_E(Z_4) in int Z_4 and sup ||DP_E||_inf < 1 over Z_4 x piece, so
that P_E has exactly one fixed point in Z_4 for every E_l in the piece; Gamma(E_l) is its orbit.  Stage 4b does not
print its boxes.

This program recomputes the boxes Z_4 of the pieces that contain the three values (two pieces for 10.613 and for
10.599, which are ends of pieces; one for E_l*), with the function and the arguments of stage 4b (ball_stable.
prove_piece on (lo, hi, zguess, 96), the centre guess from the stage-4 run at E_l = 10.613 and its predictor
dz*/dE_l), re-proves on each P_E(Z_4) in int Z_4 and sup ||DP_E||_inf < 1 (the two checks of stage 4b), prints the
centre and the radius of each box, and checks that K of Theorem 5(a) lies in the interior of Z_4 for every piece that
contains the value.  Since the fixed point of Theorem 5(a) lies in K, it is then the unique fixed point of P_E in Z_4:
Gamma_s = Gamma(E_l).  Negative controls: K of one value is tested against the box of a piece that does not contain
that value, and must be refused; and K is tested against the box of its own piece with the radii shrunk to 0.1, which
must be refused too, so that the inclusion test is shown not to be loose.

Check kinds: proof (a step of a proof), control (a negative control that must fail), crosscheck (agreement with the
committed output data/certify_bistability.txt; not a step of the proof: the boxes used are the ones printed here).
The program stops at the first failed check.  Bounds printed as [lo, hi] or after <= / >= are rounded outward
(outward.py) and re-read at the end.

Output: ../data/identify_stable_orbit.txt.
Usage: python3 identify_stable_orbit.py [--workers N]   (N worker processes for the pieces, default 2)
"""
import os
import sys
import time
from decimal import Decimal

import numpy as np
import flint
from flint import arb, ctx

PREC = 96
ctx.prec = PREC
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from hh_lohner import to_np                                       # noqa: E402
from certlib import certify_orbit                                 # noqa: E402
from hh_arb import HH                                             # noqa: E402
import outward as O                                               # noqa: E402
import shoot_float as SF                                          # noqa: E402
from ball_stable import SEC as SEC_STABLE, prove_piece, pieces    # noqa: E402

OUT = os.path.join(HERE, '..', 'data', 'identify_stable_orbit.txt')
COMMITTED = os.path.join(HERE, '..', 'data', 'certify_bistability.txt')
ORDER, TOL_REM, SCALE, J = 20, 1e-18, [100, 1, 1, 1, 10], 8
# The float64 candidate for the stable orbit on {u = 20} at E_l = 10.613 that stage 2 of certify_bistability.py
# computes (hh_numerics.run; the same value in the runs of 2026-09-26 and 2026-09-27).  It is only a starting point:
# stage 4 refines it by float Newton steps, exactly as below.
ZS_CANDIDATE = [0.24052906069702132, 0.42490470823004994, 0.39231037641666633]

T_START = time.time()
KINDS = ('proof', 'control', 'crosscheck')
N_CHECKS = {k: 0 for k in KINDS}


class Log:
    def __init__(self, path):
        self.path = path
        self.lines = []

    def __call__(self, s=''):
        print(s, flush=True)
        self.lines.append(s)

    def write(self):
        with open(self.path, 'w') as f:
            f.write('\n'.join(self.lines) + '\n')


log = Log(OUT)


def _excepthook(tp, val, tb):
    """An exception stops the program like a failed check: the report says so and the exit status is nonzero."""
    try:
        log('')
        log('STOPPED: exception %s: %s, after %.1f s; no result of this run stands' % (tp.__name__, val,
                                                                                      time.time() - T_START))
        log.write()
    finally:
        sys.__excepthook__(tp, val, tb)


sys.excepthook = _excepthook


def check(name, ok, detail='', kind='proof'):
    assert kind in KINDS
    N_CHECKS[kind] += 1
    log('  [%s] [%s] %s%s' % ('PASS' if ok else 'FAIL', kind, name, (' -- ' + detail) if detail else ''))
    if not ok:
        log('')
        log('STOPPED: check failed after %.1f s' % (time.time() - T_START))
        log.write()
        sys.exit(1)


def zero_current_EL_ball():
    """E_l* as in certify_bistability.py (the ball of its stage 3)."""
    from certlib import _steady
    sysm = HH(0)
    (mi, _), (ni, _), (hi, _) = _steady(sysm, arb(0))
    return (sysm.gna * mi ** 3 * hi * (0 - sysm.ena) + sysm.gk * ni ** 4 * (0 - sysm.ek)) / sysm.gl


def piece_line(r):
    """The line of stage 4b for a piece, without its run time."""
    return ('E_l in [%s, %s]: P(Z) in int Z %s, runs cover Z x piece %s, sup||DP||_inf <= %s, T in [%s, %s], box '
            'radius ~%.1e' % (r['lo'], r['hi'], r['inside'], r['covers'], O.hi(r['norm_hi'], 4), O.lo(r['tau_lo'], 9),
                              O.hi(r['tau_hi'], 9), max(r['zr'])))


def arb_half_widths(radii):
    """The half-widths of the Arb balls arb(0, r) that the proofs use (r rounded up to Arb's radius format), as exact
    float64 hex strings; the conversion is checked to be exact."""
    out = []
    for r in radii:
        h = arb(0, r).rad()
        f = float(h)
        if O._exact(arb(f)) != O._exact(h):
            raise ValueError('half-width not exactly representable in float64')
        out.append(f.hex())
    return ', '.join(out)


def in_piece(E, lo, hi):
    """E (an arb ball) lies in the piece, as the piece is passed to prove_piece: arb(lo).union(arb(hi))."""
    return (arb(lo).union(arb(hi))).contains(E)


def k_in_box(K, r):
    return all(arb(r['zb'][i], r['zr'][i]).contains_interior(K[i, 0]) for i in range(3))


def main():
    workers = 2
    if '--workers' in sys.argv:
        workers = int(sys.argv[sys.argv.index('--workers') + 1])
    log('Hodgkin-Huxley, J = 8: the stable orbit of Theorem 5(a) is the orbit Gamma(E_l) of Theorem 4')
    log('  python-flint %s on FLINT %s, %d bits, Taylor order %d, remainder tolerance %.0e (scales %s); Python %s'
        % (flint.__version__, getattr(flint, '__FLINT_VERSION__', '?'), PREC, ORDER, TOL_REM, SCALE,
           sys.version.split()[0]))
    log('  section {u = %g, du/dt > 0}, coordinates (m, n, h); E_l carried as a fifth state variable' % SEC_STABLE.c)
    log('  check kinds: proof, control (must be refused), crosscheck (agreement with data/certify_bistability.txt)')
    committed = open(COMMITTED).read()
    sysm = HH(J)

    # ------------------------------------------------------------------ 1. Theorem 5(a) at the three values
    log('')
    log('1. The fixed points of Theorem 5(a) (as stage 4 of certify_bistability.py computes them)')
    E0 = zero_current_EL_ball()
    Evals = [('10.613', arb('10.613')), ('E_l* = %s' % E0.str(28, radius=True), E0), ('10.599', arb('10.599'))]
    certs = {}
    for name, E in Evals:
        t0 = time.time()
        zs_E = SF.newton(np.array(ZS_CANDIDATE), float(J), SEC_STABLE.c, EL=float(E.mid()))[0]
        rs = certify_orbit(sysm, SEC_STABLE, zs_E, [(4, E)], 'stable', lambda s: None, order=ORDER, tol_rem=TOL_REM,
                           scale=SCALE)
        log('  E_l = %s (%.0f s):' % (name, time.time() - t0))
        check('Krawczyk: K in int Z, so P has exactly one fixed point in Z, and it lies in K (every E_l in the ball)',
              rs['krawczyk'], 'Z radius %s' % np.array2string(np.array(rs['zrad']), precision=2))
        check('the C^0 run integrated a set containing {zbar} x (E_l ball) and the C^1 run a set containing Z x (E_l '
              'ball)', rs['covers'])
        log('    Krawczyk box Z: centre m, n, h (float64: shortest decimal, then exact hex) = %s'
            % ', '.join(repr(float(v)) for v in rs['zbar']))
        log('          %s' % ', '.join(float(v).hex() for v in rs['zbar']))
        log('    radii (float64: shortest decimal, then exact hex) = %s' % ', '.join(repr(float(v)) for v in rs['zrad']))
        log('          %s' % ', '.join(float(v).hex() for v in rs['zrad']))
        log('    the box is the Arb ball centre + arb(0, radius); its half-widths, the radii rounded up to Arb\'s radius '
            'format, are exactly (hex) %s' % arb_half_widths(rs['zrad']))
        log('    the fixed point lies in K:')
        lines = ['      %s = %s' % (nm, rs['K'][i, 0].str(17, radius=True)) for nm, i in zip('mnh', range(3))]
        for s in lines:
            log(s)
        same = all(s in committed for s in lines)
        check('the enclosure K is the one printed by stage 4 of the committed run', same, kind='crosscheck')
        certs[name] = (E, rs)

    # the predictor of stage 4b, from the E_l = 10.613 run, exactly as certify_bistability.main() computes it
    rs0 = certs['10.613'][1]
    DPf = to_np(rs0['DPfull'])
    Fi = [1, 2, 3]
    dzdE = np.linalg.solve(np.eye(3) - DPf[np.ix_(Fi, Fi)], DPf[np.ix_(Fi, [4])].ravel())
    z0 = rs0['zbar']
    log('  stage-4b predictor: zbar(10.613) = %r, dz*/dE_l = %s' % (list(z0), np.array2string(dzdE, precision=6)))
    check('the predictor is the one printed by stage 4b of the committed run',
          ('dz*/dE_l = %s (from the E_l = 10.613 run)' % np.array2string(dzdE, precision=6)) in committed,
          kind='crosscheck')

    # ------------------------------------------------------------------ 2. the boxes of Theorem 4 on the pieces
    log('')
    log('2. The boxes of Theorem 4 on the pieces that contain the three values (ball_stable.prove_piece, as stage 4b)')
    ps = pieces(60)
    want = []
    for lo, hi in ps:
        if any(in_piece(E, lo, hi) for name, (E, rs) in certs.items()):
            want.append((lo, hi))
    log('  pieces: %s' % ', '.join('[%s, %s]' % p for p in want))
    args = []
    for lo, hi in want:
        em = 0.5 * (float(lo) + float(hi))
        args.append((lo, hi, [float(z0[i] + dzdE[i] * (em - 10.613)) for i in range(3)], PREC))
    from multiprocessing import get_context
    res = []
    t0 = time.time()
    with get_context('fork').Pool(workers) as pool:
        for r in pool.imap_unordered(prove_piece, args, chunksize=1):
            res.append(r)
            print('  piece [%s, %s] done (%.0f s)' % (r['lo'], r['hi'], r['time']), flush=True)
    res.sort(key=lambda r: Decimal(r['lo']))
    log('  %d pieces with %d worker processes, %.0f s (wall)' % (len(res), workers, time.time() - t0))
    for r in res:
        log('')
        if not r['completed']:
            check('piece [%s, %s] completed' % (r['lo'], r['hi']), False, r['err'])
        ln = piece_line(r)
        log('    ' + ln)
        log('      box centre m, n, h (float64: shortest decimal, then exact hex) = %s' % ', '.join(repr(float(v)) for v in r['zb']))
        log('          %s' % ', '.join(float(v).hex() for v in r['zb']))
        log('      box radii (float64: shortest decimal, then exact hex) = %s' % ', '.join(repr(float(v)) for v in r['zr']))
        log('          %s' % ', '.join(float(v).hex() for v in r['zr']))
        log('      the box is the Arb ball centre + arb(0, radius); its half-widths, the radii rounded up to Arb\'s radius '
            'format, are exactly (hex) %s' % arb_half_widths(r['zr']))
        check('piece [%s, %s]: P_E(Z) in int Z and sup ||DP_E||_inf < 1 for every E_l in the piece (both runs integrated '
              'a set containing Z x piece), so P_E has exactly one fixed point in Z' % (r['lo'], r['hi']),
              r['ok'] and r['inside'] and r['covers'])
        check('the line of this piece is the one printed by stage 4b of the committed run', ('    ' + ln + ', ') in
              committed, kind='crosscheck')

    # ------------------------------------------------------------------ 3. inclusions
    log('')
    log('3. K of Theorem 5(a) in the interior of the box of every piece that contains the value')
    for name, (E, rs) in certs.items():
        K = rs['K']
        mine = [r for r in res if in_piece(E, r['lo'], r['hi'])]
        for r in mine:
            off = max(abs(float(K[i, 0].mid()) - r['zb'][i]) / r['zr'][i] for i in range(3))
            check('E_l = %s lies in the piece [%s, %s], and K lies in the interior of its box (centre of K about '
                  '%.2f box radii from the centre of the box)' % (name, r['lo'], r['hi'], off), k_in_box(K, r))
        check('E_l = %s lies in %d piece(s) of the list' % (name, len(mine)), len(mine) >= 1)

    # ------------------------------------------------------------------ 4. negative controls
    log('')
    log('4. Negative controls (each must be refused)')
    far = {'10.613': '10.5985', 'E_l* = %s' % E0.str(28, radius=True): '10.6125', '10.599': '10.6125'}
    for name, (E, rs) in certs.items():
        r = [x for x in res if x['lo'] == far[name]][0]
        off = max(abs(float(rs['K'][i, 0].mid()) - r['zb'][i]) / r['zr'][i] for i in range(3))
        check('NEG E_l = %s: K tested against the box of the piece [%s, %s], which does not contain E_l (centre of '
              'K about %.3g box radii away): the inclusion must fail' % (name, r['lo'], r['hi'], off),
              (not in_piece(E, r['lo'], r['hi'])) and not k_in_box(rs['K'], r), kind='control')

    # the inclusion test is not loose: K against the box of its own piece shrunk to 0.1 of its radii must fail, since
    # the centre of K lies more than 0.1 box radii from the centre of the box
    for name, (E, rs) in certs.items():
        r = [x for x in res if in_piece(E, x['lo'], x['hi'])][0]
        shrunk = dict(r, zr=[0.1 * v for v in r['zr']])
        off = max(abs(float(rs['K'][i, 0].mid()) - r['zb'][i]) / r['zr'][i] for i in range(3))
        check('NEG E_l = %s: K tested against the box of its own piece [%s, %s] with the radii shrunk to 0.1 (centre of K '
              'about %.2f box radii from the centre of the box): the inclusion must fail' % (name, r['lo'], r['hi'], off),
              not k_in_box(rs['K'], shrunk), kind='control')

    # ------------------------------------------------------------------ 5. summary
    log('')
    nb, bad = O.verify_ledger()
    check('every decimal bound printed with outward rounding (%d of them) re-read as an exact rational lies on the '
          'correct side of its ball' % nb, not bad, repr(bad[:3]) if bad else '')
    log('')
    log('  RESULT (computer-assisted).  At J = 8 and E_l = 10.613, every E_l in the ball of E_l* above, and E_l =')
    log('  10.599, the fixed point of Theorem 5(a) on {u = 20, du/dt > 0} lies in the box of Theorem 4 of every piece')
    log('  that contains E_l, in which P_E has exactly one fixed point: the stable orbit Gamma_s of Theorem 5(a) is')
    log('  the orbit Gamma(E_l) of Theorem 4.  The boxes are printed above.')
    log('')
    total = sum(N_CHECKS.values())
    log('%d checks passed: %d proof checks, %d negative controls, %d cross-checks' % (
        total, N_CHECKS['proof'], N_CHECKS['control'], N_CHECKS['crosscheck']))
    log('run time %.1f s' % (time.time() - T_START))
    log.write()


if __name__ == '__main__':
    main()
