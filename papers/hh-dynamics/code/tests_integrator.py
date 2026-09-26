"""Tests of the rigorous integrator: exact solutions, an independent high-precision reference
(mpmath), and negative controls that must fail.

run_tests(log) returns a list of (name, passed, detail).  A negative control "passes" when the
unsound or wrong computation is detected (the enclosure fails to verify or misses the truth).
"""
import time
import numpy as np
from flint import arb, acb, arb_mat, ctx
from hh_lohner import (Integrator, LSet, EnclosureFailure, PoincareFailure, Section, poincare, col,
                    colvals, apriori_ok, ybase, zero_to, to_np)
from hh_lohner import SectionMismatch
from certlib import (section_set, krawczyk, gershgorin_eigenbasis, disc_modulus_bounds, multiplier_test,
                     infnorm_upper)
from testsys import HopfZ, Quad, PsiDecay, Ein, TwistZ
from hh_arb import HH
from outward import iv


def _point_set(x):
    d = len(x)
    return LSet.from_box(0.0, x, np.zeros((d, 0)), [])


def test_quad(log):
    out = []
    integ = Integrator(Quad(1), order=16, tol=1e-24, tol_rem=1e-24, hmax=0.2)
    S = integ.integrate(_point_set([0.5]), 1.0)
    x = S.hull()[0, 0]
    ok = x.contains(arb(1)) and float(x.rad()) < 1e-20
    out.append(('exact: x\'=x^2, x(0)=1/2, x(1)=1 in %s' % x, ok, ''))
    # negative control: wrong vector field
    integ = Integrator(Quad(arb(1001) / 1000), order=16, tol=1e-24, tol_rem=1e-24, hmax=0.2)
    x = integ.integrate(_point_set([0.5]), 1.0).hull()[0, 0]
    out.append(('NEG wrong field q=1.001 excludes exact x(1)=1 (encl %s)' % x.str(5, radius=True),
                not x.contains(arb(1)), ''))
    # negative control: remainder dropped (order 3, h = 0.1)
    integ = Integrator(Quad(1), order=3, tol=1.0, tol_rem=1e-30, hmax=0.1, remainder_factor=0.0)
    x = integ.integrate(_point_set([0.5]), 1.0).hull()[0, 0]
    out.append(('NEG remainder set to 0 (p=3, h=0.1) misses exact x(1)=1 (encl %s)' % x.str(5, radius=True),
                not x.contains(arb(1)), ''))
    # the same with the true remainder contains it
    integ = Integrator(Quad(1), order=3, tol=1.0, tol_rem=1.0, hmax=0.1)
    x = integ.integrate(_point_set([0.5]), 1.0).hull()[0, 0]
    out.append(('control: same p=3, h=0.1 run with the rigorous remainder contains 1 (encl %s)'
                % x.str(5, radius=True), x.contains(arb(1)), ''))
    # negative control: a priori enclosure across the blow-up time t = 1 of x(0)=1
    sysq = Quad(1)
    p = 12
    xs, _ = sysq.series([arb(1)], p)
    fails = 0
    for k in range(1, 7):
        Y = col([arb(0.5).union(arb(10.0 ** k))])
        h = arb(1.2)
        ok_, _, _, _ = apriori_ok(sysq, ybase([col(v) for v in xs], h, p), Y, zero_to(h ** (p + 1)), p)
        fails += (not ok_)
    out.append(('NEG a priori test refuses every box [0.5,10^k], k=1..6, for a step beyond blow-up',
                fails == 6, ''))
    integ = Integrator(sysq, order=p, tol=1e-20, hmax=5.0)
    S0 = _point_set([1.0])
    prep = integ.prepare(S0)
    try:
        integ.enclose(S0, prep, arb(1.2))
        refused = False
    except EnclosureFailure:
        refused = True
    out.append(('NEG integrator refuses a step h=1.2 across the blow-up of x(0)=1', refused, ''))
    # a candidate box that misses part of the true motion must be refused
    integ = Integrator(HopfZ(-0.3), order=20)
    S0 = _point_set([1.0, 0.0, 0.1])
    xs, _ = HopfZ(-0.3).series([arb(1), arb(0), arb('0.1')], 20)
    h = arb('0.1')
    Yb = ybase([col(v) for v in xs], h, 20)
    Ybad = col([Yb[0, 0], arb(0, 0.05), Yb[2, 0]])        # y moves by ~0.1 in the step
    ok_, _, _, _ = apriori_ok(HopfZ(-0.3), Yb, Ybad, zero_to(h ** 21), 20)
    out.append(('NEG a priori test refuses a box that misses the motion (y in [-0.05,0.05])', not ok_, ''))
    return out


def test_psi(log):
    out = []
    integ = Integrator(PsiDecay(), order=18, tol=1e-24, tol_rem=1e-22, hmax=0.5)
    S = integ.integrate(_point_set([3.0]), 10.0)
    u = S.hull()[0, 0]
    target = Ein(arb(3)) - 10
    lo, hi = u.lower(), u.upper()
    # Ein is strictly increasing, so u(10) in [lo, hi] iff Ein(lo) <= target <= Ein(hi)
    ok = (Ein(lo) < target) and (target < Ein(hi))
    out.append(("exact: u'=-Psi(u) through u=0, u(0)=3: Ein(u(10)) = Ein(3)-10 inside the image of "
                "the enclosure %s" % u.str(12, radius=True), ok and float(u.rad()) < 1e-15, ''))
    integ = Integrator(PsiDecay(sign=arb(-1001) / 1000), order=18, tol=1e-24, tol_rem=1e-22, hmax=0.5)
    u = integ.integrate(_point_set([3.0]), 10.0).hull()[0, 0]
    lo, hi = u.lower(), u.upper()
    inside = (Ein(lo) < target) and (target < Ein(hi))
    out.append(('NEG wrong field u\'=-1.001 Psi(u): exact value excluded', not inside, ''))
    return out


def test_hopf(log):
    out = []
    pi2 = 2 * arb.pi()
    # off-orbit point, C^1 Poincare map
    for a in ('-0.3', '0.1'):
        sysm = HopfZ(arb(a))
        integ = Integrator(sysm, order=20, tol=1e-23, tol_rem=1e-20, hmax=0.5, C1=True)
        S = section_set(3, 1, 0.0, [0, 2], [1.2, 0.1], [1e-8, 1e-8], [], True)
        res = poincare(integ, S, Section(1, 0.0, 1))
        r0 = arb('1.2')
        den = r0 ** 2 + (1 - r0 ** 2) * (-2 * pi2).exp()
        rex = r0 / den.sqrt()
        zex = arb('0.1') * (pi2 * arb(a)).exp()
        drdr = (den - r0 * r0 * (1 - (-2 * pi2).exp())) / den ** arb(1.5)
        P, DP, tau = res['P'], res['DP'], res['tau']
        # the box has radius 1e-8, so P(box) contains the exact image of the centre
        ok = (tau.contains(pi2) and P[0, 0].contains(rex) and P[2, 0].contains(zex)
              and DP[0, 0].contains(drdr) and DP[2, 2].contains((pi2 * arb(a)).exp()))
        out.append(('exact Poincare map (a=%s): return time %s contains 2pi; P, DP contain the exact '
                    'values' % (a, tau.str(12, radius=True)), ok, ''))
    # Krawczyk on the section for the periodic orbit r = 1 (stable a=-0.3, unstable a=0.1)
    for a in ('-0.3', '0.1'):
        sysm = HopfZ(arb(a))
        zbar, zrad = [1.0, 0.0], [1e-9, 1e-9]
        rc = poincare(Integrator(sysm, order=20, tol=1e-23, tol_rem=1e-20, hmax=0.5),
                      section_set(3, 1, 0.0, [0, 2], zbar, [0, 0], [], False), Section(1, 0.0, 1))
        r1 = poincare(Integrator(sysm, order=20, tol=1e-23, tol_rem=1e-20, hmax=0.5, C1=True),
                      section_set(3, 1, 0.0, [0, 2], zbar, zrad, [], True), Section(1, 0.0, 1))
        Pz = col([rc['P'][0, 0], rc['P'][2, 0]])
        DPZ = arb_mat(2, 2, [r1['DP'][i, j] for i in (0, 2) for j in (0, 2)])
        okK, K, Z = krawczyk(Pz, DPZ, zbar, zrad)
        discs = gershgorin_eigenbasis(DPZ)
        ex = sorted([(-4 * arb.pi()).exp(), (pi2 * arb(a)).exp()], key=lambda v: -float(v.mid()))
        cont = all(abs(complex(dc[0]) - float(e.mid())) + float(e.rad()) <= dc[1] for dc, e in zip(discs, ex))
        out.append(('Krawczyk proves the periodic orbit (a=%s), period in %s (2pi), Gershgorin discs '
                    'contain exp(-4pi), exp(2pi a)' % (a, r1['tau'].str(10, radius=True)),
                    okK and r1['tau'].contains(pi2) and cont, ''))
        # negative controls: a box that misses the orbit, a perturbed candidate
        zb2 = [1.0 + 1e-6, 0.0]
        rc2 = poincare(Integrator(sysm, order=20, tol=1e-23, tol_rem=1e-20, hmax=0.5),
                       section_set(3, 1, 0.0, [0, 2], zb2, [0, 0], [], False), Section(1, 0.0, 1))
        r12 = poincare(Integrator(sysm, order=20, tol=1e-23, tol_rem=1e-20, hmax=0.5, C1=True),
                       section_set(3, 1, 0.0, [0, 2], zb2, zrad, [], True), Section(1, 0.0, 1))
        Pz2 = col([rc2['P'][0, 0], rc2['P'][2, 0]])
        DPZ2 = arb_mat(2, 2, [r12['DP'][i, j] for i in (0, 2) for j in (0, 2)])
        okK2, _, _ = krawczyk(Pz2, DPZ2, zb2, zrad)
        out.append(('NEG Krawczyk fails on a box (x=1+1e-6 +- 1e-9) that misses the orbit (a=%s)' % a,
                    not okK2, ''))
    # wrong vector field
    sysw = HopfZ(arb('-0.3'), wrong=arb('0.001'))
    res = poincare(Integrator(sysw, order=20, tol=1e-23, tol_rem=1e-20, hmax=0.5),
                   section_set(3, 1, 0.0, [0, 2], [1.2, 0.1], [0, 0], [], False), Section(1, 0.0, 1))
    r0 = arb('1.2')
    den = r0 ** 2 + (1 - r0 ** 2) * (-2 * pi2).exp()
    rex = r0 / den.sqrt()
    out.append(('NEG wrong field (x\' + 0.001 x^2): exact return point excluded',
                not res['P'][0, 0].contains(rex), ''))
    return out


def _box_set(center, radii, C1=False):
    """The box center +- radii (floats) as a Lohner set (one r0 direction per nonzero radius)."""
    d = len(center)
    cols = [i for i in range(d) if radii[i] > 0]
    C = np.zeros((d, len(cols)))
    for k, i in enumerate(cols):
        C[i, k] = 1.0
    return LSet.from_box(0.0, center, C, [arb(0, radii[i]) for i in cols], C1=C1)


def test_wide(log):
    """Exact solutions over WIDE sets (wrapping terms matter), a low-order C^1 run (the variational
    remainder matters) and the meaning of the a priori enclosures Y and YV over one step."""
    out = []
    # x' = x^2 over x0 in [0.4, 0.5] up to t = 0.5: phi = x0 / (1 - x0 t), D phi = 1 / (1 - x0 t)^2
    ex_lo, ex_hi = arb('0.4') / arb('0.8'), arb('0.5') / arb('0.75')              # 1/2, 2/3
    integ = Integrator(Quad(1), order=16, tol=1e-20, tol_rem=1e-20, hmax=0.05)
    X = integ.integrate(_box_set([0.45], [0.05]), 0.5).hull()[0, 0]
    ok = (X.lower() <= ex_lo) and (X.upper() >= ex_hi) and (2 * X.rad() < 1.5 * (ex_hi - ex_lo))
    out.append(("exact over a wide set: x'=x^2, x0 in [0.4,0.5], t=0.5: the enclosure %s contains the exact "
                "image [1/2, 2/3] and is less than 1.5 times as wide" % iv(X, 5), ok, ''))
    integ = Integrator(Quad(1), order=16, tol=1e-20, tol_rem=1e-20, hmax=0.05, C1=True)
    V = integ.integrate(_box_set([0.45], [0.05], C1=True), 0.5).Vhull()[0, 0]
    dlo, dhi = 1 / arb('0.64'), 1 / arb('0.5625')                                   # 1/0.8^2, 1/0.75^2
    ok = (V.lower() <= dlo) and (V.upper() >= dhi) and (2 * V.rad() < 6 * (dhi - dlo))
    out.append(("exact over a wide set: the D phi enclosure %s contains the exact range [1/0.8^2, 1/0.75^2] "
                "(and is less than 6 times as wide)" % iv(V, 5), ok, ''))
    # low order: p = 3, h = 0.1 (the remainder of the variational equation is not negligible)
    integ = Integrator(Quad(1), order=3, tol=1.0, tol_rem=1.0, hmax=0.1, C1=True)
    V = integ.integrate(_box_set([0.5], [0.0], C1=True), 1.0).Vhull()[0, 0]
    out.append(("exact C^1, low order (p=3, h=0.1): x'=x^2, x(0)=1/2: D phi_1 = 1/(1-x0)^2 = 4 lies in the "
                "enclosure %s" % V.str(8, radius=True), V.contains(arb(4)) and float(V.rad()) < 1e-2, ''))
    # the a priori enclosure Y of one step must contain the exact motion of the whole set:
    # x0 in [0.4, 0.5], s in [0, 0.1]: phi_s(x0) ranges over [0.4, 0.5/0.95]
    integ = Integrator(Quad(1), order=16, tol=1e-20, tol_rem=1.0, hmax=0.1)
    S0 = _box_set([0.45], [0.05])
    sd = integ.enclose(S0, integ.prepare(S0), arb('0.1'))
    Y = sd.Y[0, 0]
    ok = (Y.lower() <= arb('0.4')) and (Y.upper() >= arb('0.5') / arb('0.95'))
    out.append(("a priori enclosure over a step: for x0 in [0.4,0.5] and s in [0,0.1], Y = %s contains the "
                "exact range [0.4, 0.5/0.95] of phi_s(x0)" % iv(Y, 5), ok, ''))
    # the a priori enclosure YV of the variational equation must contain D phi_s(x0) over the step:
    # x0 = 1, order 2, h = 1/4: D phi_s = 1/(1-s)^2 ranges over [1, 16/9]; the Taylor polynomial range
    # inflated by 5% reaches only about 1.705, so the first candidate must be refused and enlarged
    integ = Integrator(Quad(1), order=2, tol=1.0, tol_rem=1.0, hmax=0.25, C1=True)
    S0 = _box_set([1.0], [0.0], C1=True)
    try:
        sd = integ.enclose(S0, integ.prepare(S0), arb('0.25'))
        YV = sd.YV[0, 0]
        ok = (YV.lower() <= 1) and (YV.upper() >= arb(16) / 9)
        det = iv(YV, 5)
    except EnclosureFailure:
        ok, det = True, 'step refused'
    out.append(("a priori enclosure of the variational equation: x'=x^2, x0=1, p=2, h=1/4: YV = %s contains "
                "D phi_s = 1/(1-s)^2 for s in [0, 1/4], i.e. [1, 16/9] (a 5%%-inflated Taylor range is refused)"
                % det, ok, ''))
    return out


def test_twist(log):
    """A Poincare map whose return time varies across the box (theta' = 1 + b r^2) while the other
    coordinate moves at the section (z' = a z): exact return time, return point and derivative."""
    out = []
    sysm = TwistZ('0.5', '0.5')
    sec = Section(1, 0.0, 1)
    ex = {r: sysm.exact_return(r, 0.1) for r in (1.19, 1.2, 1.21)}
    # C^0 over the wide box x0 in [1.19, 1.21] (z0 = 0.1): P(box) must contain the exact images of both ends
    integ = Integrator(sysm, order=20, tol=1e-23, tol_rem=1e-20, hmax=0.3)
    res = poincare(integ, section_set(3, 1, 0.0, [0, 2], [1.2, 0.1], [0.01, 0.0], [], False), sec)
    Pz = res['P'][2, 0]
    ends = [ex[1.19], ex[1.21]]
    ok = (all(res['tau'].contains(T) and res['P'][0, 0].contains(P[0]) and Pz.contains(P[1]) for T, P, _ in ends)
          and 2 * Pz.rad() < 3 * abs(ends[0][1][1] - ends[1][1][1]))
    out.append(('exact Poincare map over a wide box (twist, x0 in [1.19, 1.21]): return time %s and z-image %s '
                'contain T and z0 e^{aT} at both ends (the return time varies by %s across the box)'
                % (iv(res['tau'], 5), iv(Pz, 5), (ends[0][0] - ends[1][0]).str(3)), ok, ''))
    # C^1 at a thin box: DP must contain the exact derivative, including the dz/dx0 = a z e^{aT} T'(r0) term
    # that comes only from the projection onto the section
    T, P, DPx = ex[1.2]
    integ = Integrator(sysm, order=20, tol=1e-23, tol_rem=1e-20, hmax=0.3, C1=True)
    res = poincare(integ, section_set(3, 1, 0.0, [0, 2], [1.2, 0.1], [1e-10, 1e-10], [], True), sec)
    DP = res['DP']
    ok = (DP[0, 0].overlaps(DPx[0][0]) and DP[0, 2].overlaps(DPx[0][1]) and DP[2, 0].overlaps(DPx[1][0])
          and DP[2, 2].overlaps(DPx[1][1]) and res['tau'].overlaps(T))
    out.append(('exact derivative of the twist Poincare map at x0 = 1.2: DP_zx = %s contains a z0 e^{aT} dT/dx0 = %s, '
                'and DP_xx, DP_xz, DP_zz contain their exact values' % (DP[2, 0].str(8, radius=True),
                                                                       DPx[1][0].str(8, radius=True)), ok, ''))
    # negative control: an initial set that is not on the section must be refused
    try:
        poincare(Integrator(sysm, order=20, tol=1e-23, tol_rem=1e-20, hmax=0.3),
                 section_set(3, 1, 0.001, [0, 2], [1.2, 0.1], [0, 0], [], False), sec)
        refused = False
    except SectionMismatch:
        refused = True
    out.append(('NEG Poincare map refuses an initial set on y = 0.001 with the section at y = 0', refused, ''))
    return out


def test_certcode(log):
    """The multiplier and contraction code on matrices with known answers."""
    out = []
    # Gershgorin discs of an interval matrix must contain the eigenvalues of all its members
    e = arb(0, 0.1)
    A = arb_mat([[2, 0], [0, 1]])
    A[0, 1] = e
    A[1, 0] = e
    discs = gershgorin_eigenbasis(A)
    eigs = []
    for ev in (arb(0), arb('0.1'), -arb('0.1')):
        s = (1 + 4 * ev * ev).sqrt()
        eigs += [(3 + s) / 2, (3 - s) / 2]

    def in_some(lam):
        return any(abs(acb(lam) - acb(c.real, c.imag)) < arb(R) for c, R in discs)
    out.append(('multiplier code: the Gershgorin discs of the interval matrix [[2, e], [e, 1]], |e| <= 0.1, '
                'contain the eigenvalues (3 +- sqrt(1 + 4 e^2))/2 of its members e = 0, +-0.1',
                all(in_some(lam) for lam in eigs), ''))
    # a multiplier disc that straddles the unit circle must be refused by both verdicts
    B = arb_mat([[0, 0], [0, 0.5]])
    B[0, 0] = arb(1, 0.05)
    okS = multiplier_test(B, 'stable')[0]
    okU = multiplier_test(B, 'unstable')[0]
    out.append(('NEG multiplier code: an interval matrix with an eigenvalue anywhere in [0.95, 1.05] passes neither '
                'the "all |mu| < 1" test nor the "one multiplier > 1" test', not okS and not okU, ''))
    # the verdicts on matrices with known multipliers
    okS = multiplier_test(arb_mat([[0.5, 0.1], [0, -0.2]]), 'stable')[0]
    okU = multiplier_test(arb_mat([[3, 0.1], [0, 0.2]]), 'unstable')[0]
    okN = multiplier_test(arb_mat([[-3, 0.1], [0, 0.2]]), 'unstable')[0]
    out.append(('multiplier code: diag-dominant matrices with eigenvalues (0.5, -0.2) and (3, 0.2) pass the stable '
                'and the unstable test; eigenvalues (-3, 0.2) fail the unstable test (the multiplier is < -1)',
                okS and okU and not okN, ''))
    # the contraction bound must be an upper bound of the row-sum norm of every member
    M = arb_mat([[0.5, -0.5, 0], [0, 0.25, 0], [0, 0, -0.125]])
    M[0, 2] = arb(0, 0.25)
    nb = infnorm_upper(M)
    out.append(('contraction code: sup ||M||_inf over the interval matrix [[1/2, -1/2, [-1/4, 1/4]], [0, 1/4, 0], '
                '[0, 0, -1/8]] is 5/4; the bound %s is >= 5/4 and < 5/4 + 1e-6' % nb.str(12),
                (nb >= arb(5) / 4) and (nb < arb(5) / 4 + arb('1e-6')), ''))
    return out


def test_hh_secant(log):
    """Mean value consistency of the C^1 Poincare map of HH: for z1, z2 in a box Z,
    P(z1) - P(z2) = [DP(xi_i)]_i (z1 - z2) with xi_i in Z, so it must meet DP(Z) (z1 - z2)."""
    out = []
    F = [1, 2, 3]
    E = arb('10.613')
    cases = [('stable orbit, section u = 20', 20.0, [0.2405290606970255, 0.4249047082300503, 0.392310376416666],
              1e-10),
             ('unstable orbit, section u = 5', 5.0, [0.09004142752265339, 0.3795031899629053, 0.4375482630911355],
              1e-12)]
    for name, c, zb, rad in cases:
        sec = Section(0, c, 1)

        def run(z, zr, C1):
            integ = Integrator(HH(8), order=20, tol=1e-21, tol_rem=1e-18, hmax=2.0, scale=[100, 1, 1, 1, 10],
                               C1=C1)
            return poincare(integ, section_set(5, 0, sec.c, F, z, zr, [(4, E)], C1), sec)
        dz = [rad, -0.6 * rad, 0.8 * rad]
        z1 = [zb[i] + dz[i] for i in range(3)]
        z2 = [zb[i] - dz[i] for i in range(3)]
        P1, P2 = run(z1, [0, 0, 0], False)['P'], run(z2, [0, 0, 0], False)['P']
        r = run(zb, [rad * 1.01] * 3, True)
        DP = arb_mat(3, 3, [r['DP'][a, b] for a in F for b in F])
        pred = DP * col([arb(z1[i]) - arb(z2[i]) for i in range(3)])
        lhs = [P1[j, 0] - P2[j, 0] for j in F]
        ok = all(lhs[i].overlaps(pred[i, 0]) for i in range(3))
        # the test is informative only if DP(Z)(z1 - z2) is much narrower than the difference it predicts
        ratio = max(float(pred[i, 0].rad()) / float(abs(lhs[i]).lower()) for i in range(3))
        out.append(('mean value consistency of the HH Poincare map (%s, |z1 - z2| ~ %.0e): P(z1) - P(z2) meets '
                    'DP(Z)(z1 - z2) in every component, and the prediction is sharp (its radius is at most %.1f%% '
                    'of the difference; required < 10%%)' % (name, 2 * rad, 100 * ratio), ok and ratio < 0.1, ''))
    return out


def _mp_hh(J, EL, dps):
    import mpmath as mp
    mp.mp.dps = dps
    J = mp.mpf(J); EL = mp.mpf(EL)
    c01, c0125, c007, c03 = mp.mpf('0.1'), mp.mpf('0.125'), mp.mpf('0.07'), mp.mpf('0.3')

    def psi(x):
        if x == 0:
            return mp.mpf(1)
        return x / mp.expm1(x)

    def F(t, y):
        u, m, n, h = y
        an = c01 * psi((10 - u) / 10); bn = c0125 * mp.exp(-u / 80)
        am = psi((25 - u) / 10); bm = 4 * mp.exp(-u / 18)
        ah = c007 * mp.exp(-u / 20); bh = 1 / (mp.exp((30 - u) / 10) + 1)
        return [J - 120 * m ** 3 * h * (u - 115) - 36 * n ** 4 * (u + 12) - c03 * (u - EL),
                am * (1 - m) - bm * m, an * (1 - n) - bn * n, ah * (1 - h) - bh * h]
    return F


def test_hh_mpmath(log, T=0.5, dps=30):
    import mpmath as mp
    out = []
    pts = [('upstroke u=20', [20.0, 0.2405290606290991, 0.4249047081621961, 0.392310376752856]),
           ('near the peak', [95.95744898, 0.90795103, 0.56313226, 0.2388]),
           ('recovery u=0', [0.0, 0.0503716334, 0.391835158, 0.465574694])]
    E = arb('10.613')
    for name, x in pts:
        t0 = time.time()
        F = _mp_hh('8', '10.613', dps)
        sol = mp.odefun(F, 0, [mp.mpf(v) for v in x])
        ref = sol(mp.mpf(T))
        tm = time.time() - t0
        refs = [arb(mp.nstr(v, dps + 5)) for v in ref]
        C = np.zeros((5, 1)); C[4, 0] = 1.0
        integ = Integrator(HH(8), order=20, tol=1e-24, tol_rem=1e-20, hmax=1.0, scale=[100, 1, 1, 1, 10])
        S = LSet.from_box(0.0, x + [E.mid()], C, [E - E.mid()])
        t1 = time.time()
        Xe = integ.integrate(S, T).hull()
        ti = time.time() - t1
        dist = max(float(abs(Xe[i, 0] - refs[i]).upper()) for i in range(4))
        inside = all(Xe[i, 0].overlaps(refs[i]) for i in range(4))
        wid = max(float(Xe[i, 0].rad()) for i in range(4))
        out.append(('HH %s, t=%g ms: mpmath (dps=%d, %.0fs) reference inside the enclosure (max radius '
                    '%.1e, %.1fs)' % (name, T, dps, tm, wid, ti), inside and wid < 1e-12, ''))
        if name.startswith('upstroke'):
            # negative controls on the same run
            integ = Integrator(HH(8, gna=arb('120.0001')), order=20, tol=1e-24, tol_rem=1e-20, hmax=1.0,
                               scale=[100, 1, 1, 1, 10])
            Xw = integ.integrate(LSet.from_box(0.0, x + [E.mid()], C, [E - E.mid()]), T).hull()
            miss = not all(Xw[i, 0].overlaps(refs[i]) for i in range(4))
            out.append(('NEG wrong field (g_Na = 120.0001): mpmath reference excluded', miss, ''))
            integ = Integrator(HH(8), order=6, tol=1.0, tol_rem=1.0, hmax=0.02, remainder_factor=0.0,
                               scale=[100, 1, 1, 1, 10])
            Xr = integ.integrate(LSet.from_box(0.0, x + [E.mid()], C, [E - E.mid()]), T).hull()
            miss = not all(Xr[i, 0].overlaps(refs[i]) for i in range(4))
            out.append(('NEG remainder set to 0 (p=6, h=0.02): mpmath reference excluded', miss, ''))
            integ = Integrator(HH(8), order=6, tol=1.0, tol_rem=1.0, hmax=0.02, scale=[100, 1, 1, 1, 10])
            Xr = integ.integrate(LSet.from_box(0.0, x + [E.mid()], C, [E - E.mid()]), T).hull()
            ok = all(Xr[i, 0].overlaps(refs[i]) for i in range(4))
            out.append(('control: the same p=6, h=0.02 run with the rigorous remainder contains it', ok, ''))
    return out


def run_tests(log, with_mpmath=True):
    results = []
    for fn in ((test_quad, test_psi, test_hopf, test_wide, test_twist, test_certcode, test_hh_secant)
               + ((test_hh_mpmath,) if with_mpmath else ())):
        t0 = time.time()
        res = fn(log)
        for name, ok, det in res:
            log('  [%s] %s' % ('PASS' if ok else 'FAIL', name))
            results.append((name, ok, det))
        log('    (%s: %.1fs)' % (fn.__name__, time.time() - t0))
    return results


if __name__ == '__main__':
    ctx.prec = 96
    run_tests(print, with_mpmath=True)
