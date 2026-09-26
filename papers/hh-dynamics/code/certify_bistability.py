#!/usr/bin/env python3
"""Computer-assisted proof of bistability in the space-clamped Hodgkin-Huxley equations at J = 8.

    du/dt = J - 120 m^3 h (u - 115) - 36 n^4 (u + 12) - 0.3 (u - E_l),  dx/dt = a_x(u)(1-x) - b_x(u) x

(Hodgkin & Huxley 1952, modern sign convention, u = depolarisation in mV, J in uA/cm^2, t in ms).

"Bistability" is used in one exact sense: at the same J and E_l, a locally asymptotically stable
equilibrium and an orbitally asymptotically stable periodic orbit coexist.  Nothing is claimed about
other attractors, about the basins, or about which invariant set separates them.

Stages (every check is printed; the program stops at the first failed check):
  0. set-up and trust base;
  1. self-tests of the rigorous integrator and of the certificate code (exact solutions over thin and
     wide sets, an mpmath reference, the Poincare-map projection, the multiplier and contraction code)
     and negative controls that must fail;
  2. non-rigorous numerics (float64/scipy, mpmath): equilibria, Hopf points, fold of cycles, orbits;
  3. equilibrium at J = 8 for every E_l in [10.59, 10.62]: existence, uniqueness, asymptotic stability;
  4. for E_l = 10.613 (Hodgkin-Huxley), E_l* (exact zero-current value, a rigorous ball) and
     E_l = 10.599 (Guckenheimer-Oliva): Krawczyk proofs of a stable and of an unstable periodic
     orbit with enclosed periods, section points and Floquet multipliers;
  4b. the stable orbit for every E_l in [10.59, 10.62] (60 pieces, contraction of a box on the
     section; 4 worker processes);
  5. negative controls for the certificates (they must fail);
  6. high-precision (non-rigorous) refinement of both orbits;
  7. summary.  Every decimal bound printed in stages 3-7 is rounded outward from its ball (outward.py)
     and re-checked against it.

Checks are counted by kind: proof checks, negative controls, self-tests and numerical-only checks.

Output is written to ../data/certify_bistability.txt; the debug file numerics.json goes to ../data/logs/, which is not tracked.
Usage: python3 certify_bistability.py [--quick] [--no-ball]
  --quick skips the mpmath tests and stage 6; --no-ball skips stage 4b.
"""
import os
import sys
import time
import numpy as np

import flint
from flint import arb, acb, arb_mat, ctx

PREC = 96
ctx.prec = PREC

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from hh_lohner import Section, Integrator, poincare, col, to_np, SectionMismatch       # noqa: E402
from certlib import (certify_orbit, certify_equilibrium, section_set, krawczyk,     # noqa: E402
                     multiplier_test, CertificateFailure)
from hh_arb import HH                                                                # noqa: E402
import outward as O                                                                  # noqa: E402
from ball_stable import SEC as SEC_STABLE                                            # noqa: E402

OUT = os.path.join(HERE, '..', 'data', 'certify_bistability.txt')
LOGS = os.path.join(HERE, '..', 'data', 'logs')
ORDER = 20
TOL_REM = 1e-18
SCALE = [100, 1, 1, 1, 10]
J = 8
SEC_UNSTABLE = Section(0, 5.0, 1)       # the section of the unstable orbit (Theorem B(ii))

TRUST_BASE = ('python-flint %s on FLINT %s (Arb ball arithmetic, %d bits): arb/acb field operations, abs, '
              'comparisons, union/intersection, arb.exp, arb.hypgeom_1f1 (Taylor coefficients of Psi), '
              'arb_mat products and arb_mat.inv (Lohner frames B^-1), arb_mat.charpoly (Routh-Hurwitz), '
              'acb_mat products and acb_mat.inv (Gershgorin eigenbasis S^-1); Python %s integers and '
              'fractions (outward decimal printing).  numpy, scipy and mpmath only propose candidates, '
              'frames, eigenvector matrices and reference values and are not trusted'
              % (flint.__version__, getattr(flint, '__FLINT_VERSION__', '?'), PREC, sys.version.split()[0]))


class Log:
    def __init__(self, path):
        self.f = open(path, 'w')

    def __call__(self, s=''):
        print(s, flush=True)
        self.f.write(s + '\n')
        self.f.flush()


log = Log(OUT)
T_START = time.time()
KINDS = ('proof', 'control', 'selftest', 'numerical')
N_CHECKS = {k: 0 for k in KINDS}


def check(name, ok, detail='', kind='proof'):
    """kind: 'proof' (a step of a proof), 'control' (a negative control: a wrong input must be refused),
    'selftest' (a test of the code against a known answer), 'numerical' (a non-rigorous check)."""
    assert kind in KINDS
    N_CHECKS[kind] += 1
    log('  [%s] %s%s' % ('PASS' if ok else 'FAIL', name, (' -- ' + detail) if detail else ''))
    if not ok:
        log('')
        log('STOPPED: check failed after %.1f s' % (time.time() - T_START))
        log.f.close()
        sys.exit(1)


def stage(title):
    log('')
    log('=' * 100)
    log(title)
    log('=' * 100)


def zero_current_EL_ball():
    """E_l* with I_Na + I_K + I_l = 0 at u = 0, J = 0, as a rigorous arb ball."""
    sysm = HH(0)
    from certlib import _steady
    (mi, _), (ni, _), (hi, _) = _steady(sysm, arb(0))
    return (sysm.gna * mi ** 3 * hi * (0 - sysm.ena) + sysm.gk * ni ** 4 * (0 - sysm.ek)) / sysm.gl


def _apart(a, b):
    (ca, ra), (cb, rb) = a, b
    return abs(acb(ca.real, ca.imag) - acb(cb.real, cb.imag)) > arb(ra) + arb(rb)


def discs_disjoint(discs):
    """Pairwise disjointness of Gershgorin discs, decided in ball arithmetic."""
    return all(_apart(a, b) for k, a in enumerate(discs) for b in discs[k + 1:])


def disc_separated(discs, k):
    """Disc k is disjoint from every other disc (ball arithmetic), so it holds exactly one eigenvalue."""
    return all(_apart(discs[k], b) for j, b in enumerate(discs) if j != k)


def main():
    quick = '--quick' in sys.argv
    stage('STAGE 0  set-up')
    log('  python-flint %s (Arb ball arithmetic), working precision %d bits, Taylor order %d, remainder '
        'tolerance %.0e (relative to scales %s)' % (flint.__version__, PREC, ORDER, TOL_REM, SCALE))
    log('  trust base: ' + TRUST_BASE + '.')
    log('  model: HH 1952 eqs (12),(13),(20),(21),(23),(24),(26), Table 3; g_Na=120, g_K=36, g_l=0.3, '
        'E_Na=115, E_K=-12, C=1, 6.3 C; J = %g' % J)
    log('  E_l is carried as a fifth state variable with dE_l/dt = 0, so a ball of E_l values is a set')
    log('  direction of the Lohner method rather than a re-wrapped parameter.')
    log('  sections: stable orbit {u = %g, du/dt > 0} (one constant, ball_stable.SEC_LEVEL), unstable orbit '
        '{u = %g, du/dt > 0};' % (SEC_STABLE.c, SEC_UNSTABLE.c))
    log('  every Poincare map refuses an initial set that is not exactly on its section.')

    # ------------------------------------------------------------------ stage 1
    stage('STAGE 1  self-tests of the rigorous integrator and of the certificate code; negative controls')
    from tests_integrator import run_tests
    t0 = time.time()
    results = run_tests(lambda s: None, with_mpmath=not quick)
    for name, ok, det in results:
        check(name, ok, det, kind='control' if name.startswith('NEG') else 'selftest')
    log('  stage 1 time %.1f s' % (time.time() - t0))

    # ------------------------------------------------------------------ stage 2
    stage('STAGE 2  non-rigorous numerics (float64 / scipy DOP853, rtol 1e-12; mpmath)')
    import hh_numerics
    if '--reuse-numerics' in sys.argv and os.path.exists(os.path.join(LOGS, 'numerics.json')):
        import json
        num = json.load(open(os.path.join(LOGS, 'numerics.json')))
        log('  (debug: numerics loaded from numerics.json, not recomputed)')
    else:
        num = hh_numerics.run(log=log, J=float(J))
        import json
        os.makedirs(LOGS, exist_ok=True)
        json.dump(num, open(os.path.join(LOGS, 'numerics.json'), 'w'), indent=1, default=str)
    for nm, (jf, _) in num['fold_by_EL'].items():
        jh1 = num['hopf_by_EL'][nm][0][0]
        check('E_l = %s: numerical bistability window contains J = %g (%.4f < J < %.4f)' % (nm, J, jf, jh1),
              jf < J < jh1, kind='numerical')
    for nm, hpl in num['hopf_by_EL'].items():
        check('E_l = %s: first Hopf current %.6f > J = %g (numerical)' % (nm, hpl[0][0], J), hpl[0][0] > J,
              kind='numerical')
    zs = num['stable']['z']
    zu = num['unstable']['z']

    # ------------------------------------------------------------------ stage 3
    stage('STAGE 3  equilibrium at J = 8 (proof)')
    Eball = arb('10.59').union(arb('10.62'))
    log('  E_l ball [10.59, 10.62] = %s (contains 10.613, 10.599 and E_l*)' % Eball.str(10, radius=True))
    t0 = time.time()
    eq = certify_equilibrium(J, Eball, num['eq'][0], log)
    check('equilibrium exists, is unique and is asymptotically stable (Routh-Hurwitz) for every E_l in '
          '[10.59, 10.62]', eq['ok'])
    okG = all(arb(c.real) + arb(r) < 0 for c, r in eq['discs'])
    log('    eigenvalue enclosures (Gershgorin discs of S^-1 A S, S = numerical eigenvectors; centres rounded, '
        'radii include the rounding): ' + '; '.join(O.cdisc(c, r, 6) for c, r in eq['discs']))
    check('all eigenvalue discs lie in Re < 0 (independent confirmation of stability)', okG)
    check('the eigenvalue discs are pairwise disjoint (decided in ball arithmetic), so each holds exactly one '
          'eigenvalue of every Jacobian in the enclosure', discs_disjoint(eq['discs']))
    log('    equilibrium box: ' + ', '.join('%s=%s' % (n, x.str(8, radius=True)) for n, x in zip('umnhE', eq['X'])))
    eq_thin = {}
    E0 = zero_current_EL_ball()
    Evals = [('10.613 (Hodgkin-Huxley)', arb('10.613')), ('E_l* = %s (exact zero-current value)' %
                                                           E0.str(28, radius=True), E0),
             ('10.599 (Guckenheimer-Oliva)', arb('10.599'))]
    for name, E in Evals:
        r = certify_equilibrium(J, E, num['eq'][0], lambda s: None)
        check('E_l = %s: equilibrium u* in %s, Routh-Hurwitz holds' % (name, r['U'].str(15, radius=True)), r['ok'])
        eq_thin[name] = r
        log('      eigenvalues: %s' % ', '.join(O.cdisc(c, rr, 10) for c, rr in r['discs']))
    log('  stage 3 time %.1f s' % (time.time() - t0))

    # ------------------------------------------------------------------ stage 4
    stage('STAGE 4  periodic orbits at J = 8 (proofs)')
    sysm = HH(J)
    sec_s = SEC_STABLE
    sec_u = SEC_UNSTABLE
    log('  stable orbit:   section {u = %g, du/dt > 0}, coordinates (m, n, h)' % sec_s.c)
    log('  unstable orbit: section {u = %g,  du/dt > 0}, coordinates (m, n, h)' % sec_u.c)
    certs = {}
    import shoot_float as SF
    for name, E in Evals:
        t0 = time.time()
        log('')
        log('  --- E_l = %s' % name)
        Ef = float(E.mid())
        zs_E = SF.newton(np.array(zs), float(J), sec_s.c, EL=Ef)[0]
        zu_E = SF.newton(np.array(zu), float(J), sec_u.c, EL=Ef)[0]
        log('  float64 candidates at E_l = %.15g: stable %s, unstable %s' % (
            Ef, np.array2string(zs_E, precision=12), np.array2string(zu_E, precision=12)))
        log('  stable orbit:')
        rs = certify_orbit(sysm, sec_s, zs_E, [(4, E)], 'stable', log, order=ORDER, tol_rem=TOL_REM, scale=SCALE)
        check('Krawczyk: unique fixed point of the first-return map in Z (stable orbit)', rs['krawczyk'])
        _report_orbit(rs, 'stable')
        check('all nontrivial Floquet multipliers of the stable orbit lie in |mu| < 1', rs['multipliers_ok'])
        log('  unstable orbit:')
        ru = certify_orbit(sysm, sec_u, zu_E, [(4, E)], 'unstable', log, order=ORDER, tol_rem=TOL_REM, scale=SCALE)
        check('Krawczyk: unique fixed point of the first-return map in Z (unstable orbit)', ru['krawczyk'])
        _report_orbit(ru, 'unstable')
        check('exactly one Floquet multiplier of the second orbit is real and > 1, the other two lie in '
              '|mu| < 1', ru['multipliers_ok'])
        check('multiplier discs used by Theorem B are isolated (ball arithmetic): disc 1 of the stable orbit is '
              'disjoint from its discs 2, 3, and the three discs of the unstable orbit are pairwise disjoint, so '
              'each of these discs holds exactly one multiplier',
              disc_separated(rs['discs'], 0) and discs_disjoint(ru['discs']))
        # the three invariant sets are distinct
        ex_s, ex_u = rs['extremes'][0], ru['extremes'][0]
        distinct = (ex_s[2] > ex_u[1])
        check('the orbits are distinct: the stable orbit reaches u >= %s, the unstable orbit stays in u <= %s'
              % (O.lo(ex_s[2], 6), O.hi(ex_u[1], 6)), distinct)
        Ueq = eq_thin[name]['U']
        check('neither orbit is the equilibrium: u* in %s differs from the section levels u = %g and u = %g'
              % (Ueq.str(10, radius=True), sec_s.c, sec_u.c),
              (not Ueq.contains(arb(sec_s.c))) and (not Ueq.contains(arb(sec_u.c))))
        certs[name] = (rs, ru)
        log('  time for this E_l: %.1f s' % (time.time() - t0))

    # predictor for the box centres of stage 4b (and of the stage-5 control): dz*/dE_l at E_l = 10.613
    rs0 = certs[Evals[0][0]][0]
    DPf = to_np(rs0['DPfull'])
    Fi = [1, 2, 3]
    dPdE = DPf[np.ix_(Fi, [4])].ravel()
    dzdE = np.linalg.solve(np.eye(3) - DPf[np.ix_(Fi, Fi)], dPdE)

    # ------------------------------------------------------------------ stage 4b
    ball = None
    if '--no-ball' not in sys.argv:
        stage('STAGE 4b  the stable orbit for EVERY E_l in [10.59, 10.62] (proof, 60 pieces, 4 processes)')
        log('  on each piece: a box Z on {u = %g, du/dt > 0} with P_E(Z) in int Z and sup ||DP_E||_inf < 1 over'
            % SEC_STABLE.c)
        log('  Z x piece, so P_E is a contraction of Z: unique attracting fixed point, all |mu| < 1')
        from decimal import Decimal
        from ball_stable import prove_ball
        log('  predictor for the box centres: dz*/dE_l = %s (from the E_l = 10.613 run)' % np.array2string(dzdE, precision=6))
        t0 = time.time()
        ball = prove_ball(rs0['zbar'], 10.613, dzdE, log)
        ball.sort(key=lambda r: Decimal(r['lo']))
        for r in ball:
            if r['completed']:
                log('    E_l in [%s, %s]: P(Z) in int Z %s, sup||DP||_inf <= %s, T in [%s, %s], box radius ~%.1e, '
                    '%.0fs' % (r['lo'], r['hi'], r['inside'], O.hi(r['norm_hi'], 4), O.lo(r['tau_lo'], 9),
                               O.hi(r['tau_hi'], 9), max(r['zr']), r['time']))
            else:
                log('    E_l in [%s, %s]: ERROR %s (%.0fs)' % (r['lo'], r['hi'], r['err'], r['time']))
        cover = (Decimal(ball[0]['lo']) == Decimal('10.59') and Decimal(ball[-1]['hi']) == Decimal('10.62') and
                 all(Decimal(a['hi']) == Decimal(b['lo']) for a, b in zip(ball[:-1], ball[1:])))
        check('the pieces cover [10.59, 10.62] without gaps (%d pieces)' % len(ball), cover)
        allok = all(r['ok'] for r in ball)
        check('every piece: P_E(Z) in int Z and sup ||DP_E||_inf < 1 (max %s)'
              % (O.hi(O.max_hi([r['norm_hi'] for r in ball]), 4) if allok else '-'), allok)
        ball = {'n': len(ball), 'Tlo': O.min_lo([r['tau_lo'] for r in ball]),
                'Thi': O.max_hi([r['tau_hi'] for r in ball]),
                'norm': O.max_hi([r['norm_hi'] for r in ball]), 'umax': O.min_lo([r['umax_lo'] for r in ball])}
        log('  over the whole ball: period in [%s, %s] ms, multipliers |mu| <= %s, u reaches >= %s'
            % (O.lo(ball['Tlo'], 9), O.hi(ball['Thi'], 9), O.hi(ball['norm'], 4), O.lo(ball['umax'], 3)))
        log('  stage 4b time %.1f s (wall)' % (time.time() - t0))

    # ------------------------------------------------------------------ stage 5
    stage('STAGE 5  negative controls for the certificates (each must fail)')
    E = arb('10.613')
    rs, ru = certs[Evals[0][0]]
    for kind, sec, rr in (('stable', sec_s, rs), ('unstable', sec_u, ru)):
        zb = rr['zbar']
        zr = rr['zrad']
        for label, shift in (('candidate shifted by 10 box radii in m', [10 * zr[0], 0, 0]),
                             ('candidate shifted by 1e-9 in h', [0, 0, 1e-9])):
            zb2 = [zb[i] + shift[i] for i in range(3)]
            ok = _krawczyk_only(sysm, sec, zb2, zr, [(4, E)])
            check('NEG %s orbit, %s: Krawczyk must fail' % (kind, label), not ok, kind='control')
    # wrong parameter: the E_l = 10.613 box of the stable orbit at J = 8.05
    ok = _krawczyk_only(HH(arb('8.05')), sec_s, rs['zbar'], rs['zrad'], [(4, E)])
    check('NEG stable orbit box of J = 8 tested with the vector field at J = 8.05: Krawczyk must fail', not ok,
          kind='control')
    # the multiplier code (the function the certificates use) on the other orbit's DP(Z)
    okX = multiplier_test(rs['DPZ'], 'unstable')[0]
    check('NEG the multiplier test "one real multiplier > 1, the others in |mu| < 1", run on the stable orbit\'s '
          'DP(Z), fails', not okX, kind='control')
    okY = multiplier_test(ru['DPZ'], 'stable')[0]
    check('NEG the multiplier test "all |mu| < 1", run on the unstable orbit\'s DP(Z), fails', not okY,
          kind='control')
    # a section mismatch (initial set on u = 20, crossing detected on u = 19.999) must be refused
    try:
        integ = Integrator(sysm, order=ORDER, tol=TOL_REM * 1e-3, tol_rem=TOL_REM, hmax=2.0, scale=SCALE)
        poincare(integ, section_set(5, 0, sec_s.c, [1, 2, 3], rs['zbar'], [0, 0, 0], [(4, E)], False),
                 Section(0, 19.999, 1))
        refused = False
    except SectionMismatch:
        refused = True
    check('NEG the stable orbit\'s initial set on u = %g with the crossing detected on u = 19.999 (a map between '
          'two sections, whose fixed point is not a periodic orbit) is refused before integration'
          % sec_s.c, refused, kind='control')
    # Theorem A at J = 20, between the Hopf points: the equilibrium is unstable
    import hh_float as HF
    try:
        u20 = float(HF.equilibrium(20.0, 10.605)[0])
        r20 = certify_equilibrium(20, Eball, u20, lambda s: None)
        h2, h3 = r20['hurwitz']
        decisive = (not r20['ok']) and (h3 < 0)
        det = 'u* in %s, a1 a2 - a3 = %s, (a1 a2 - a3) a3 - a1^2 a4 = %s' % (
            r20['U'].str(6, radius=True), h2.str(3, radius=True), h3.str(3, radius=True))
    except CertificateFailure as e:
        decisive, det = False, 'the equilibrium was not certified: %s' % e
    check('NEG Theorem A at J = 20 (between the Hopf points), E_l in [10.59, 10.62]: the equilibrium is enclosed '
          'and unique, and Routh-Hurwitz fails decisively (the last Hurwitz determinant is certainly < 0)',
          decisive, det, kind='control')
    # Theorem C: a box 10 times smaller cannot be mapped into itself; the unstable orbit's box is no contraction
    from ball_stable import prove_piece
    em = 0.5 * (10.59 + 10.5905)
    zg = [float(rs0['zbar'][i] + dzdE[i] * (em - 10.613)) for i in range(3)]
    rsm = prove_piece(('10.59', '10.5905', zg, PREC, {'box_factor': 0.3}))
    check('NEG Theorem C, piece E_l in [10.59, 10.5905] with the box radius 0.3 (instead of 3) times the defect of '
          'its centre, so that the fixed points z*(E_l) of the piece are not all in the box: P(Z) in int Z fails',
          rsm['completed'] and not rsm['inside'],
          'P(Z) vs Z: ' + '; '.join('%s vs %s' % pz for pz in rsm.get('PZ_minus_Z', [])) if rsm['completed']
          else rsm['err'], kind='control')
    run_ = prove_piece(('10.613', '10.613', ru['zbar'], PREC, {'sec': sec_u, 'centre_iters': 0}))
    check('NEG Theorem C test on the unstable orbit (section u = %g, E_l = 10.613, box radius %s): the contraction '
          'test fails decisively, every member of DP(Z) has ||DP||_inf >= %s > 1'
          % (sec_u.c, ('%.0e' % max(run_['zr'])) if run_['zr'] else '-',
             O.lo(run_['norm_lo'], 3) if run_['completed'] else '-'),
          run_['completed'] and (run_['norm_lo'] > 1) and not run_['ok'],
          '' if run_['completed'] else run_['err'], kind='control')

    # ------------------------------------------------------------------ stage 6
    if not quick:
        stage('STAGE 6  high-precision refinement (NOT a proof: Newton on midpoints of the Taylor code at '
              '160 bits, order 28, remainder tolerance 1e-36; E_l = 10.613)')
        from hp_refine import hp_orbit
        for kind, sec, zz in (('stable', sec_s, rs['zbar']), ('unstable', sec_u, ru['zbar'])):
            hp_orbit(kind, sec, zz, '10.613', log, prec=160, order=28, tol_rem=1e-36, iters=2)
        ctx.prec = PREC

    # ------------------------------------------------------------------ stage 7
    stage('STAGE 7  summary')
    lines = _summary(eq, Evals, certs, num, ball, sec_s, sec_u)
    nb, bad = O.verify_ledger()
    check('every decimal bound printed in stages 3-7 (%d of them) re-read as an exact rational lies on the '
          'correct side of the Arb ball it stands for (lower bounds rounded down, upper bounds up, disc radii '
          'enlarged by the rounding of the centre)' % nb, not bad, repr(bad[:3]) if bad else '')
    for s in lines:
        log(s)
    log('')
    total = sum(N_CHECKS.values())
    log('  %d checks passed: %d proof checks, %d negative controls, %d self-tests, %d numerical-only checks;'
        % (total, N_CHECKS['proof'], N_CHECKS['control'], N_CHECKS['selftest'], N_CHECKS['numerical']))
    log('  total run time %.1f s (%.1f min)' % (time.time() - T_START, (time.time() - T_START) / 60))
    log.f.close()


def _krawczyk_only(sysm, sec, zbar, zrad, params):
    F = [1, 2, 3]
    integ = Integrator(sysm, order=ORDER, tol=TOL_REM * 1e-3, tol_rem=TOL_REM, hmax=2.0, scale=SCALE)
    try:
        r0 = poincare(integ, section_set(5, sec.idx, sec.c, F, zbar, [0, 0, 0], params, False), sec)
        integ = Integrator(sysm, order=ORDER, tol=TOL_REM * 1e-3, tol_rem=TOL_REM, hmax=2.0, scale=SCALE, C1=True)
        r1 = poincare(integ, section_set(5, sec.idx, sec.c, F, zbar, zrad, params, True), sec)
    except Exception as e:
        log('    (integration failed: %s)' % e)
        return False
    Pz = col([r0['P'][j, 0] for j in F])
    DPZ = arb_mat(3, 3, [r1['DP'][a, b] for a in F for b in F])
    ok, K, Z = krawczyk(Pz, DPZ, zbar, zrad)
    dev = max(abs(float(K[i, 0].mid()) - zbar[i]) / zrad[i] for i in range(3))
    log('    K vs Z: max |mid K - zbar| / radius(Z) = %.3g, K in int Z: %s' % (dev, ok))
    return ok


def _disc_text(c, rad, d=12):
    """'|mu - c| <= r' for a proved disc (outward: r covers the rounding of the centre)."""
    if c.imag != 0:
        return 'mu in the disc ' + O.cdisc(c, rad, d)
    cs, rs = O.disc(c, rad, d)
    return '|mu - %s| <= %s' % (cs, rs)


def _report_orbit(r, kind):
    K, tau = r['K'], r['tau']
    log('    fixed point on the section: (m, n, h) in')
    for nm, i in zip('mnh', range(3)):
        log('      %s = %s' % (nm, K[i, 0].str(17, radius=True)))
    log('    period (first return time over the Krawczyk box) T in %s ms' % tau.str(16, radius=True))
    for k, ((c, rad), (lo, hi)) in enumerate(zip(r['discs'], r['mods'])):
        if lo > 0:
            log('    multiplier disc %d: %s, so %s <= |mu| <= %s' % (k + 1, _disc_text(c, rad), O.lo_g(lo, 10),
                                                                     O.hi_g(hi, 10)))
        else:
            log('    multiplier disc %d: contains 0 (centre about %.1e, radius about %.1e), so |mu| <= %s'
                % (k + 1, abs(c), rad, O.hi_g(hi, 10)))
    ex = r['extremes']
    log('    u along the orbit: stays in [%s, %s] mV, attains u <= %s and u >= %s'
        % (O.lo(ex[0][0], 6), O.hi(ex[0][1], 6), O.hi(ex[0][3], 6), O.lo(ex[0][2], 6)))
    log('    first return certified (%d downward passes of the section, no other upward crossing), %d steps'
        % (r['passes'], r['steps']))


def _summary(eq, Evals, certs, num, ball, sec_s, sec_u):
    """The summary text.  Every decimal bound is produced by outward.py (rounded outward from its ball);
    intervals written [x +/- r] are Arb's own output, which encloses the ball."""
    L = []
    say = L.append
    say('  All results are for the applied current J = 8 uA/cm^2 and the stated leak reversal potential E_l.')
    say('  E_l enters the equations only through J + 0.3 E_l (du/dt = (J + 0.3 E_l) - I_Na - I_K - 0.3 u), so')
    say('  (J = 8, E_l) is the same system as (J = 8 + 0.3 (E_l - 10.613), E_l = 10.613): the E_l ball')
    say('  [10.59, 10.62] at J = 8 is the current interval J in [7.9931, 8.0021] at E_l = 10.613 (exact), and every')
    say('  bifurcation current shifts by exactly -0.3 (E_l - 10.613).')
    say('  Printed bounds are rounded outward from their Arb balls (lower bounds down, upper bounds up; a disc')
    say('  |mu - c| <= r has r >= |c - centre| + radius); intervals written [x +/- r] are Arb\'s own enclosures.')
    say('  Trust base: ' + TRUST_BASE + '.')
    say('')
    say('  PROVED (computer-assisted, Arb ball arithmetic):')
    say('  Theorem A (equilibrium).  For J = 8 and every E_l in [10.59, 10.62] the HH system has exactly one')
    say('    equilibrium; it lies in the box %s and is' % ', '.join(x.str(6, radius=True) for x in eq['X'][:4]))
    say('    locally asymptotically stable (Routh-Hurwitz with enclosed coefficients).')
    for name, E in Evals:
        rs, ru = certs[name]
        say('  Theorem B (E_l = %s).  For J = 8:' % name)
        say('    (i) there is a periodic orbit through {u = %g, du/dt > 0} at (m,n,h) in %s' % (
            sec_s.c, ', '.join(rs['K'][i, 0].str(14, radius=True) for i in range(3))))
        say('        with minimal period T_s in %s ms whose nontrivial Floquet multipliers satisfy' %
            rs['tau'].str(14, radius=True))
        say('        %s, |mu_2|, |mu_3| <= %s: orbitally asymptotically stable;' % (
            _disc_text(rs['discs'][0][0], rs['discs'][0][1], 12).replace('mu', 'mu_1', 1),
            O.hi_e(O.max_hi([rs['mods'][1][1], rs['mods'][2][1]]), 3)))
        c1, R1 = ru['discs'][0]
        say('    (ii) there is a periodic orbit through {u = %g, du/dt > 0} at (m,n,h) in %s' % (
            sec_u.c, ', '.join(ru['K'][i, 0].str(14, radius=True) for i in range(3))))
        say('        with minimal period T_u in %s ms and multipliers mu_1 real in [%s, %s] (> 1),' % (
            ru['tau'].str(12, radius=True), O.lo(arb(c1.real) - arb(R1), 8), O.hi(arb(c1.real) + arb(R1), 8)))
        say('        %s, |mu_3| <= %s: unstable (saddle type);' % (
            _disc_text(ru['discs'][1][0], ru['discs'][1][1], 10).replace('mu', 'mu_2', 1),
            O.hi_e(ru['mods'][2][1], 3)))
        say('    (iii) with Theorem A: at J = 8 and this E_l a locally asymptotically stable equilibrium, an orbitally')
        say('        asymptotically stable periodic orbit and an unstable periodic orbit of saddle type coexist.')
    if ball is not None:
        say('  Theorem C (whole ball).  For J = 8 and every E_l in [10.59, 10.62] there is a periodic orbit through')
        say('    {u = %g, du/dt > 0} with minimal period in [%s, %s] ms, reaching u >= %s mV (a spike), whose'
            % (sec_s.c, O.lo(ball['Tlo'], 9), O.hi(ball['Thi'], 9), O.lo(ball['umax'], 3)))
        say('    nontrivial Floquet multipliers satisfy |mu| <= %s: orbitally asymptotically stable.' % O.hi(ball['norm'], 4))
        say('  Bistability.  By Theorems A and C, for J = 8 and every E_l in [10.59, 10.62] a locally asymptotically')
        say('    stable equilibrium and an orbitally asymptotically stable periodic orbit coexist.  This is the whole')
        say('    claim: it is not claimed that there are no other attractors, nor anything about the basins, nor that')
        say('    the unstable orbit of Theorem B(ii) lies on the boundary between the basins.')
    else:
        say('  Bistability (at the three E_l values of Theorem B only; stage 4b was skipped): a locally')
        say('    asymptotically stable equilibrium and an orbitally asymptotically stable periodic orbit coexist.')
        say('    Nothing is claimed about other attractors or about the basins.')
    say('')
    say('  CITED, NOT RE-PROVED HERE (papers/hh-dynamics/code/certify_equilibria_hopf.py, 256-bit Arb, report')
    say('    papers/hh-dynamics/data/certify_equilibria_hopf.txt, 27 checks, 0 failed): for every E_l in [10.59, 10.62],')
    say('    exactly one equilibrium for every J in [0, 200], and exactly two Hopf points along this branch: the')
    say('    first subcritical (first Lyapunov coefficient l1 > 0), at J_H1 = [9.7754379953931263325 +/- 1.37e-20]')
    say('    for E_l = 10.613 and J_H1 in [9.78 +/- 6.67e-3] over the ball; the second supercritical (l1 < 0), at')
    say('    J_H2 = [154.52243366580800086 +/- 2.57e-18] for E_l = 10.613.  (Theorem A re-proves the uniqueness')
    say('    at J = 8 independently.)')
    say('  NUMERICAL ONLY (not proved): the Hopf currents as computed here (by E_l) %s;'
        % '; '.join('%s: %.6f, %.6f' % (k, v[0][0], v[1][0]) for k, v in num['hopf_by_EL'].items()))
    say('    the fold of cycles %s; the bistability window (J_LPC, J_H1) as an interval of J;'
        % '; '.join('%s: %.6f' % (k, v[0]) for k, v in num['fold_by_EL'].items()))
    say('    uniqueness of the equilibrium for J > 200; an unstable orbit for E_l other than the three values')
    say('    of Theorem B.')
    say('  NOT PROVED: an unstable orbit over the whole E_l ball (the C^1 enclosure is too wide over boxes of the')
    say('    size the E_l spread requires); uniqueness of any of these orbits beyond its box Z (Krawczyk and the')
    say('    contraction give uniqueness only within Z); anything about periodic orbits at J other than 8.')
    return L


if __name__ == '__main__':
    main()
