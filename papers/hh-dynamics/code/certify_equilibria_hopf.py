"""Computer-assisted proof: the equilibria and the two Hopf bifurcations of the space-clamped Hodgkin-Huxley
equations at the 1952 parameters, in the ball arithmetic of FLINT/Arb (python-flint).

Model and conventions: hh_ball.py (u = depolarization in mV, J = applied depolarizing current in uA/cm^2).

What is proved, for every E_l in [10.59, 10.62] (Hodgkin and Huxley print 10.613; the value that makes the
resting current exactly zero, as their Table 3 says it should, is 10.5989...):

  (A) For every J in [0, J_max] there is exactly one equilibrium, and it lies in -12 < u < 115: the steady-state
      current Jss(u) is strictly increasing on [-12, 115], negative for u < -12 and above J_max for u > 115.
  (B) Along the branch, the characteristic polynomial l^4 + a1 l^3 + a2 l^2 + a3 l + a4 of the Jacobian has
      a1, a3, a4 > 0 for all u in [-12, 115], and D3 = a1 a2 a3 - a3^2 - a1^2 a4 has exactly two zeros u_H1 < u_H2
      there, both simple, with D3 > 0 outside [u_H1, u_H2] and D3 < 0 between them.  With a1, a3, a4 > 0, p has a
      root on the imaginary axis only where D3 = 0 (then the roots are +-i omega, omega^2 = a3/a1), D3 > 0 implies
      D2 = a1 a2 - a3 > 0, and D3 < 0 means exactly two roots in the open right half-plane (the manuscript,
      paper/hh-dynamics.tex, proves these three facts).  So the equilibrium is asymptotically stable for
      u < u_H1 and u > u_H2, has exactly two eigenvalues in Re > 0 on (u_H1, u_H2), and at u_Hi a simple pair
      +-i omega_i and two roots in the open left half-plane.  Since u increases with J, this is the same statement
      for J_Hi = Jss(u_Hi).
  (C) At each u_Hi the pair crosses the imaginary axis with nonzero speed (the real part of d lambda/du is
      enclosed away from 0) and the first Lyapunov coefficient l1 is enclosed away from 0, which decides whether
      the Hopf bifurcation is subcritical (l1 > 0) or supercritical (l1 < 0).  The formula for l1 is the one in
      Yu. A. Kuznetsov, "Andronov-Hopf bifurcation", Scholarpedia 1(10):1858 (2006), section "First Lyapunov
      Coefficient" (there attributed to his book, Elements of Applied Bifurcation Theory, 3rd ed., 2004):
          l1 = Re( <p, C(q,q,qb)> - 2 <p, B(q, A^-1 B(q,qb))> + <p, B(qb, (2 i omega - A)^-1 B(q,q))> ) / (2 omega),
      A q = i omega q, A^T p = -i omega p, <p, q> = conj(p)^T q = 1.  The routine lyap1() that evaluates it is
      tested first on systems whose l1 is known in closed form (the planar formula of Guckenheimer and Holmes as
      printed in the same article, and a four-dimensional system whose l1 the manuscript computes by hand), with
      negative controls that mutate the formula.

Every check carries a kind: 'proof' (a step of a proof), 'consistency' (an identity that a lemma of the manuscript
proves exactly, checked to enclose 0 as a guard against coding errors), 'control' (a negative control: a wrong input
must be refused), 'selftest' (a test of the code against a known answer) and 'crosscheck' (a non-rigorous independent
recomputation).  Only the proof checks are steps of the proofs.

Floating point is used only to choose subdivision points and the midpoints of Newton steps; every conclusion is a
ball-arithmetic inequality.  Every decimal bound printed in square brackets [lo, hi] (and every bound printed with
<= or >=) is rounded outward from its ball by outward.py and re-checked as an exact rational at the end; a ball
printed as [m +/- r] is Arb's own enclosure.  The program prints every check and stops at the first failed check, or at
an exception, with a line that says so and a nonzero exit status; it writes its report (up to that point, if it stops)
to data/certify_equilibria_hopf.txt.
"""
import os, sys, time
import mpmath as mp
import sympy
import flint
from flint import arb, acb, acb_mat, fmpq, ctx
import hh_ball as H
from hh_ball import TS, branch, GNA, GK, GL, ENA, EK, EL_BALL, EL_PRINTED
import outward as O

T0 = time.time()
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'certify_equilibria_hopf.txt')
LINES, FAILED = [], []
KINDS = ('proof', 'consistency', 'control', 'selftest', 'crosscheck')
COUNT = {k: 0 for k in KINDS}


def say(s=''):
    print(s)
    LINES.append(s)


def write_report():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        f.write('\n'.join(LINES) + '\n')


def stop(why):
    say()
    say('STOPPED: %s, after %.1f s; no result of this run stands' % (why, time.time() - T0))
    write_report()
    sys.exit(1)


def _excepthook(tp, val, tb):
    """An exception stops the program like a failed check: the report says so and the exit status is nonzero."""
    try:
        say()
        say('STOPPED: exception %s: %s, after %.1f s; no result of this run stands' % (tp.__name__, val, time.time() - T0))
        write_report()
    finally:
        sys.__excepthook__(tp, val, tb)


sys.excepthook = _excepthook


def check(name, ok, detail='', kind='proof'):
    assert kind in KINDS
    COUNT[kind] += 1
    say(('OK    ' if ok else 'FAIL  ') + '[' + kind + '] ' + name + (('   [' + detail + ']') if detail else ''))
    if not ok:
        FAILED.append(name)
        stop('check failed (%s)' % name)


def lo(x):
    return float(x.lower())


def hi(x):
    return float(x.upper())


def ball(a, b):
    """The real ball [a, b] for exact floats a < b."""
    a, b = arb(a), arb(b)
    return arb((a + b) / 2, ((b - a) / 2).upper())


say('Hodgkin-Huxley 1952: equilibria and Hopf bifurcations, certified in Arb at %d bits (python-flint)' % ctx.prec)
say('  python-flint %s on FLINT %s; Python %s; mpmath %s and SymPy %s for the non-rigorous self-tests and cross-checks'
    % (flint.__version__, getattr(flint, '__FLINT_VERSION__', '?'), sys.version.split()[0], mp.__version__,
       sympy.__version__))
say('  check kinds: proof (a step of a proof), consistency (an identity proved exactly in the manuscript, checked to')
say('  enclose 0), control (a negative control), selftest (a known answer), crosscheck (a non-rigorous recomputation).')
say('  Bounds printed as [lo, hi], or after <= or >=, are rounded outward from their balls; [m +/- r] is an Arb ball.')
say()

# ------------------------------------------------------------------------------------------------ 0. self-tests
say('0. Self-tests of the series arithmetic and of Psi against mpmath (non-rigorous guards against coding errors)')
mp.mp.dps = 60


def mp_psi(x):
    return mp.mpf(1) if x == 0 else x / mp.expm1(x)


worst = mp.mpf(0)
for x in ['-9.5', '-3.3', '-2.9', '-0.7', '0', '1e-30', '0.3', '2.95', '3.1', '6']:
    c = H.psi_coeffs(arb(x), 4)
    for k in range(4):
        ref = mp.diff(mp_psi, mp.mpf(x), k) / mp.factorial(k) if x != '0' else mp.taylor(mp_psi, mp.mpf('1e-40'), 3)[k]
        mid = mp.mpf(c[k].real.mid().str(40, radius=False))
        worst = max(worst, abs(mid - ref))
check('Psi and its first three Taylor coefficients agree with mpmath at 10 points, both branches',
      worst < mp.mpf('1e-25'), 'max difference %s' % mp.nstr(worst, 3), kind='selftest')
raised = False
try:
    H.psi_coeffs(arb('[3.5 +/- 4]'), 2)
except ArithmeticError:
    raised = True
check('negative control: the closed form of Psi refuses a ball that contains 0', raised, kind='control')

# the series machinery against mpmath: Jss and its derivative at u = 7.3
b = branch(arb('7.3'), 2, EL=EL_PRINTED)
u0 = mp.mpf('7.3')


def mp_rates(u):
    return (mp_psi((25 - u) / 10), 4 * mp.exp(-u / 18), mp.mpf('0.1') * mp_psi((10 - u) / 10),
            mp.mpf('0.125') * mp.exp(-u / 80), mp.mpf('0.07') * mp.exp(-u / 20), 1 / (mp.exp((30 - u) / 10) + 1))


def mp_jss(u):
    am, bm, an, bn, ah, bh = mp_rates(u)
    m, n, h = am / (am + bm), an / (an + bn), ah / (ah + bh)
    return 120 * m ** 3 * h * (u - 115) + 36 * n ** 4 * (u + 12) + mp.mpf('0.3') * (u - mp.mpf('10.613'))


d0 = abs(mp.mpf(b['Jss'].coeff(0).real.mid().str(40, radius=False)) - mp_jss(u0))
d1 = abs(mp.mpf(b['Jss'].coeff(1).real.mid().str(40, radius=False)) - mp.diff(mp_jss, u0))
check('Jss and dJss/du from the series agree with mpmath at u = 7.3', d0 < 1e-30 and d1 < 1e-25,
      'differences %s, %s' % (mp.nstr(d0, 2), mp.nstr(d1, 2)), kind='selftest')
# identity a4 = km kn kh * dJss/du (the determinant of the Jacobian is the slope of the steady-state current)
idn = b['a4'].coeff(0) - b['km'].coeff(0) * b['kn'].coeff(0) * b['kh'].coeff(0) * b['Jss'].coeff(1)
check('identity a4 = (alpha_m + beta_m)(alpha_n + beta_n)(alpha_h + beta_h) dJss/du holds (encloses 0)',
      idn.real.contains(0) and idn.imag.contains(0), kind='consistency')

# the zero-current leak potential, and an independent implementation of Psi (hh_arb.py: 1F1) against this one
EL_STAR = branch(arb(0), 1, EL=arb(0))['Jss'].coeff(0).real / GL      # Jss(0; E) = Jss(0; 0) - 0.3 E
from hh_arb import HH as _HHarb
from certlib import _steady
(_mi, _), (_ni, _), (_hi, _) = _steady(_HHarb(0), arb(0))
EL_STAR2 = (GNA * _mi ** 3 * _hi * (0 - ENA) + GK * _ni ** 4 * (0 - EK)) / GL
check('the zero-current leak potential E_l* (ionic current 0 at u = 0) computed with this model (Psi by its '
      'Bernoulli series) overlaps the one computed with hh_arb.py (Psi by 1F1), an independent implementation',
      EL_STAR.overlaps(EL_STAR2), 'E_l* in %s' % O.iv(EL_STAR, 28), kind='selftest')
say('   E_l* = %s; the resting current at u = 0 with E_l = 10.613 is 0.3 (E_l* - 10.613) in %s uA/cm^2'
    % (EL_STAR.str(40, radius=True), O.iv(GL * (EL_STAR - EL_PRINTED), 12)))
say()

# ------------------------------------------------------------------------------------------------ A. equilibria
say('A. Exactly one equilibrium for every J in [0, J_max]')
ULO, UHI = -12, 115


def cover(f, a, b, depth=0, maxdepth=40):
    """Subdivide [a, b] until f(ball) is True on every piece; returns the number of pieces, or None."""
    stack, pieces = [(a, b, 0)], 0
    while stack:
        x, y, d = stack.pop()
        try:
            decided = f(ball(x, y))
        except (ArithmeticError, ZeroDivisionError):     # e.g. a piece too wide for Psi: subdivide it
            decided = False
        if decided:
            pieces += 1
            continue
        if d >= maxdepth:
            return None
        m = (x + y) / 2
        stack += [(x, m, d + 1), (m, y, d + 1)]
    return pieces


def slope_positive(U):
    return lo(branch(U, 2)['Jss'].coeff(1).real) > 0


n_pieces = cover(slope_positive, float(ULO), float(UHI))
check('dJss/du > 0 on every piece of a subdivision of [-12, 115] (Jss strictly increasing there)',
      n_pieces is not None, '%s pieces' % n_pieces)
# outside: for u < -12 each of the three terms of Jss is negative (u - 115 < 0, u + 12 < 0, u - E_l < 0 with
# m, n, h > 0); for u >= 115 all three are nonnegative and n_inf increases with u (alpha_n increases because Psi
# decreases, beta_n decreases), so Jss(u) >= 36 n_inf(115)^4 (115 + 12) there.
check('for u < -12: u - 115 < 0, u + 12 < 0 and u - E_l < 0 for every E_l in the ball (so Jss(u) < 0)',
      lo(EL_BALL) > -12)
b115 = branch(arb(115), 1)
Jlow = 36 * b115['n'].coeff(0).real ** 4 * 127
JMAX = 200
check('Jss(u) >= 36 n_inf(115)^4 * 127 > J_max = %d for every u >= 115' % JMAX, lo(Jlow) > JMAX,
      '36 n_inf(115)^4 * 127 >= %s' % O.lo(Jlow, 4))
jm12 = branch(arb(-12), 1)['Jss'].coeff(0).real
check('Jss(-12) < 0 <= J and Jss(115) > J_max, so every J in [0, J_max] has an equilibrium in (-12, 115)',
      hi(jm12) < 0 and lo(branch(arb(115), 1)['Jss'].coeff(0).real) > JMAX,
      'Jss(-12) <= %s' % O.hi(jm12, 4))
say()

# ------------------------------------------------------------------------------------------------ B. Hurwitz
say('B. Stability along the branch: Routh-Hurwitz signs on [-12, 115]')
candidates = []


def hurwitz_ok(U):
    b = branch(U, 1)
    a1, a3, a4, D2, D3 = (b[k].coeff(0).real for k in ('a1', 'a3', 'a4', 'D2', 'D3'))
    if not (lo(a1) > 0 and lo(a3) > 0 and lo(a4) > 0):
        return False
    if lo(D3) > 0:
        return lo(D2) > 0                   # stable side: every Hurwitz determinant positive
    if hi(D3) < 0:
        return True                         # unstable side: the count of right half-plane roots is constant
    if hi(U) - lo(U) < 1e-5:            # an undetermined sign on a tiny piece: a zero candidate
        candidates.append((lo(U), hi(U)))
        return True
    return False


n_pieces = cover(hurwitz_ok, float(ULO), float(UHI), maxdepth=45)
check('a1, a3, a4 > 0 on every piece, the sign of D3 is decided except on tiny pieces, and D2 > 0 where D3 > 0',
      n_pieces is not None, '%s pieces, %d undecided tiny pieces' % (n_pieces, len(candidates)))
candidates.sort()
clusters = []
for x, y in candidates:
    if clusters and x <= clusters[-1][1] + 1e-12:
        clusters[-1][1] = max(clusters[-1][1], y)
    else:
        clusters.append([x, y])
check('the undecided pieces form exactly two clusters', len(clusters) == 2,
      ', '.join('[%.9f, %.9f]' % tuple(c) for c in clusters))


def D3_at(x):
    return branch(arb(x), 1)['D3'].coeff(0).real


def newton_zero(C):
    """Enclose the unique zero of D3 in the cluster C = [x, y]: D3' excludes 0 on C and D3 changes sign at the
    ends, then interval Newton tightens the enclosure."""
    x, y = C[0] - 1e-9, C[1] + 1e-9
    X = ball(x, y)
    dD3 = branch(X, 2)['D3'].coeff(1).real
    unique = lo(dD3) > 0 or hi(dD3) < 0
    sgn = (lo(D3_at(x)) > 0 and hi(D3_at(y)) < 0) or (hi(D3_at(x)) < 0 and lo(D3_at(y)) > 0)
    for _ in range(60):
        m = arb(X.mid())
        N = m - branch(m, 1)['D3'].coeff(0).real / branch(X, 2)['D3'].coeff(1).real
        if not X.contains(N):
            break
        if N.rad() > X.rad() * 0.99 and N.rad() < arb('1e-70'):
            X = N
            break
        X = N
    return X, unique and sgn, dD3


HOPF = []
for i, C in enumerate(clusters):
    X, ok, dD3 = newton_zero(C)
    check('cluster %d: dD3/du excludes 0 on it and D3 changes sign across it, so it holds exactly one zero u_H%d, '
          'a simple one' % (i + 1, i + 1), ok, 'dD3/du in %s on the cluster' % O.iv_g(dD3, 4))
    check('   interval Newton encloses u_H%d in a ball of radius < 1e-60' % (i + 1), X.rad() < arb('1e-60'),
          'u_H%d in %s, radius <= %s' % (i + 1, O.iv(X, 40), O.hi_e(X.rad(), 3)))
    HOPF.append(X)
# the sign pattern: D3 > 0 at the ends and < 0 between the zeros
mid_u = (HOPF[0] + HOPF[1]) / 2 if len(HOPF) == 2 else arb(10)
check('D3 > 0 at u = -12 and u = 115, and D3 < 0 between the two zeros',
      lo(D3_at(-12)) > 0 and lo(D3_at(115)) > 0 and hi(branch(arb(mid_u.mid()), 1)['D3'].coeff(0).real) < 0)


def routh_signs(u):
    """Signs of the Routh first column 1, a1, D2/a1, D3/D2, a4 at the point u (0 where undecided)."""
    bm_ = branch(arb(u), 1)
    D2m, D3m = bm_['D2'].coeff(0).real, bm_['D3'].coeff(0).real
    s = [1, 1, 1 if lo(D2m) > 0 else (-1 if hi(D2m) < 0 else 0), 0, 1]
    s[3] = (1 if lo(D3m) > 0 else (-1 if hi(D3m) < 0 else 0)) * s[2]
    return s, sum(1 for i in range(4) if s[i] * s[i + 1] < 0)


signs, changes = routh_signs(mid_u.mid())
check('at the midpoint of (u_H1, u_H2) the Routh first column is regular and has exactly two sign changes, so the '
      'equilibrium has two eigenvalues in Re > 0 there (the manuscript proves the count on the whole interval from '
      'a1 > 0, a4 > 0 and D3 < 0)', signs[2] != 0 and changes == 2, 'signs %s' % signs, kind='consistency')
say('   Where D3 > 0: all Hurwitz determinants positive, so every eigenvalue has Re < 0. No eigenvalue reaches the')
say('   imaginary axis except at u_H1 and u_H2 (a1, a3 > 0; a4 > 0 excludes 0).')
say()

# ------------------------------------------------------------------------------------------------ C. Hopf points
say('C. The two Hopf points: crossing speed and first Lyapunov coefficient')
I = acb(0, 1)


def lyap1(A, F, om, q, w, variant=None):
    """First Lyapunov coefficient (Kuznetsov, Scholarpedia 1(10):1858, and his book, 3rd ed.):
        l1 = Re( <p, C(q,q,qb)> - 2 <p, B(q, A^-1 B(q,qb))> + <p, B(qb, (2 i omega - A)^-1 B(q,q))> ) / (2 omega)
    with A q = i omega q, A^T p = -i omega p, <p, q> = 1; here w = conj(p), so <p, v> = w^T v.
    F(v) is the list of the components of the vector field along x0 + t v as truncated series (length >= 4), so
    B(v, v) = 2 [t^2] F and C(v, v, v) = 6 [t^3] F; B and C at two or three different arguments follow by
    polarization of these symmetric forms.  variant: None (the formula); 'sign' (the middle term with +2, a
    mutation) and 'no2iw' ((-A) in place of (2 i omega - A), a mutation) exist only for the negative controls."""
    n = len(q)

    def Bq(v):
        return [2 * s.coeff(2) for s in F(v)]

    def Cq(v):
        return [6 * s.coeff(3) for s in F(v)]

    def B2(a, bb):
        P = Bq([a[j] + bb[j] for j in range(n)])
        M = Bq([a[j] - bb[j] for j in range(n)])
        return [(P[j] - M[j]) / 4 for j in range(n)]

    qb = [x.conjugate() for x in q]
    P3 = Cq([q[j] + qb[j] for j in range(n)])
    M3 = Cq([q[j] - qb[j] for j in range(n)])
    C3 = Cq(qb)
    Cqqqb = [(P3[j] - M3[j] - 2 * C3[j]) / 6 for j in range(n)]
    s1 = A.solve(acb_mat([[x] for x in B2(q, qb)]))
    M2 = acb_mat([[((2 * I * acb(om)) if (r == c and variant != 'no2iw') else acb(0)) - A[r, c] for c in range(n)]
                  for r in range(n)])
    s2 = M2.solve(acb_mat([[x] for x in Bq(q)]))
    t1 = sum((w[j] * Cqqqb[j] for j in range(n)), acb(0))
    t2 = sum((w[j] * y for j, y in enumerate(B2(q, [s1[k, 0] for k in range(n)]))), acb(0))
    t3 = sum((w[j] * y for j, y in enumerate(B2(qb, [s2[k, 0] for k in range(n)]))), acb(0))
    coef = 2 if variant == 'sign' else -2
    return (t1 + coef * t2 + t3).real / (2 * arb(om))


# ---- C0. the l1 routine on systems with known l1
say('   C0. The l1 routine on systems whose first Lyapunov coefficient is known in closed form')
R = lambda p, q_: arb(p) / q_                                    # an exact rational as a ball
SQ2 = arb(2).sqrt()
Q0 = [acb(1) / SQ2, acb(0, -1) / SQ2, acb(0), acb(0)]            # A q = i omega q, <q, q> = 1
W0 = [acb(1) / SQ2, acb(0, 1) / SQ2, acb(0), acb(0)]             # w = conj(p), p = q: A^T p = -i omega p, <p, q> = 1


def along(v):
    return [TS([acb(0), v[j], acb(0), acb(0)]) for j in range(4)]       # x0 = 0


def planar_case(om, P, Q):
    """u' = -om v + P(u, v), v' = om u + Q(u, v), x3' = -x3, x4' = -2 x4; P, Q dicts of the coefficients p_ij of
    u^i v^j (2 <= i + j <= 3).  Known l1: Guckenheimer and Holmes's planar formula as printed by Kuznetsov
    (Scholarpedia 1(10):1858), with q = p = (1, -i)/sqrt 2."""
    def poly(c, u, v):
        return sum((u ** i * v ** j * c[(i, j)] for (i, j) in c), TS.const(0, 4))

    def F(vec):
        u, v, x3, x4 = along(vec)
        return [v * (-om) + poly(P, u, v), u * om + poly(Q, u, v), -x3, x4 * (-2)]
    A = acb_mat([[0, -om, 0, 0], [om, 0, 0, 0], [0, 0, -1, 0], [0, 0, 0, -2]])
    Puu, Puv, Pvv = 2 * P[(2, 0)], P[(1, 1)], 2 * P[(0, 2)]
    Quu, Quv, Qvv = 2 * Q[(2, 0)], Q[(1, 1)], 2 * Q[(0, 2)]
    known = (6 * P[(3, 0)] + 2 * P[(1, 2)] + 2 * Q[(2, 1)] + 6 * Q[(0, 3)]) / (8 * om) \
        + (Puv * (Puu + Pvv) - Quv * (Quu + Qvv) - Puu * Quu + Pvv * Qvv) / (8 * om ** 2)
    return A, F, known


def coupled_case(om, sg, a, b_, c_, d, e, f):
    """x1' = -om x2 + sg x1 r^2 + c x1 x3 + f x1 x4, x2' = om x1 + sg x2 r^2 + c x2 x3 - f x2 x4,
    x3' = -a x3 + b r^2, x4' = -e x4 + d (x1^2 - x2^2), r^2 = x1^2 + x2^2.  Known l1 (the manuscript computes it
    through the centre manifold): (2/om) (sg + b c/a + d e f / (2 (e^2 + 4 om^2)))."""
    def F(vec):
        x1, x2, x3, x4 = along(vec)
        r2 = x1 * x1 + x2 * x2
        return [x2 * (-om) + x1 * r2 * sg + x1 * x3 * c_ + x1 * x4 * f,
                x1 * om + x2 * r2 * sg + x2 * x3 * c_ - x2 * x4 * f,
                x3 * (-a) + r2 * b_, x4 * (-e) + (x1 * x1 - x2 * x2) * d]
    A = acb_mat([[0, -om, 0, 0], [om, 0, 0, 0], [0, 0, -a, 0], [0, 0, 0, -e]])
    known = 2 / om * (sg + b_ * c_ / a + d * e * f / (2 * (e ** 2 + 4 * om ** 2)))
    return A, F, known


def pc(vals):
    keys = [(2, 0), (1, 1), (0, 2), (3, 0), (2, 1), (1, 2), (0, 3)]
    return {k: R(*v) for k, v in zip(keys, vals)}


TESTS = [
    ('planar, omega = 1', arb(1),
     planar_case(arb(1), pc([(1, 2), (-1, 3), (1, 4), (-1, 5), (1, 7), (-1, 2), (1, 3)]),
                 pc([(-1, 4), (1, 5), (2, 3), (1, 9), (-1, 6), (1, 11), (1, 8)]))),
    ('planar, omega = 3/2', R(3, 2),
     planar_case(R(3, 2), pc([(-2, 3), (1, 2), (1, 5), (1, 4), (-1, 3), (2, 7), (-1, 2)]),
                 pc([(1, 3), (-1, 4), (-1, 2), (1, 5), (1, 6), (-1, 3), (-1, 7)]))),
    ('coupled, omega = 1', arb(1),
     coupled_case(arb(1), R(-1, 10), arb(2), R(1, 3), R(1, 2), R(3, 2), R(1, 2), arb(1))),
    ('coupled, omega = 3/2', R(3, 2),
     coupled_case(R(3, 2), R(-1, 5), arb(2), R(1, 3), R(1, 2), R(3, 2), R(1, 2), arb(1))),
]
signs_seen = set()
for name, om_t, (A_t, F_t, known) in TESTS:
    val = lyap1(A_t, F_t, om_t, Q0, W0)
    diff = val - known
    signs_seen.add(1 if lo(known) > 0 else (-1 if hi(known) < 0 else 0))
    check('l1 routine on the %s test system reproduces the known l1' % name,
          diff.contains(0) and diff.rad() < arb('1e-60') and (lo(known) > 0 or hi(known) < 0),
          'known l1 in %s, routine in %s' % (O.iv_g(known, 12), O.iv_g(val, 12)), kind='selftest')
check('the four test systems have l1 of both signs', signs_seen == {1, -1}, kind='selftest')
A_t, F_t, known = TESTS[2][2]
for variant, what in (('sign', 'the middle term with +2 instead of -2'),
                      ('no2iw', '(-A)^-1 in place of (2 i omega - A)^-1')):
    val = lyap1(A_t, F_t, arb(1), Q0, W0, variant=variant)
    check('negative control: the l1 routine with %s misses the known l1 of the coupled test system' % what,
          not (val - known).contains(0), 'mutated routine in %s' % O.iv_g(val, 8), kind='control')
say()


def mpmath_l1(u_mid):
    """Independent, non-rigorous cross-check: l1 by the same formula with exact symbolic derivatives (SymPy)
    evaluated in mpmath at 50 digits, through explicit Hessian and third-derivative tensors."""
    import sympy as sp
    uu, mm, nn, hh = sp.symbols('u m n h')
    Psi = lambda x: x / (sp.exp(x) - 1)
    am, bm = Psi((25 - uu) / 10), 4 * sp.exp(-uu / 18)
    an, bn = sp.Rational(1, 10) * Psi((10 - uu) / 10), sp.Rational(1, 8) * sp.exp(-uu / 80)
    ah, bh = sp.Rational(7, 100) * sp.exp(-uu / 20), 1 / (sp.exp((30 - uu) / 10) + 1)
    F = [-120 * mm ** 3 * hh * (uu - 115) - 36 * nn ** 4 * (uu + 12) - sp.Rational(3, 10) * uu,
         am * (1 - mm) - bm * mm, an * (1 - nn) - bn * nn, ah * (1 - hh) - bh * hh]
    X = [uu, mm, nn, hh]
    mp.mp.dps = 50
    u0 = mp.mpf(u_mid)
    r = [sp.lambdify(uu, e, 'mpmath')(u0) for e in (am, bm, an, bn, ah, bh)]
    x0 = [u0, r[0] / (r[0] + r[1]), r[2] / (r[2] + r[3]), r[4] / (r[4] + r[5])]
    sub = dict(zip(X, x0))
    Aq = mp.matrix([[mp.mpf(sp.N(sp.diff(F[i], X[j]).subs(sub), 50)) for j in range(4)] for i in range(4)])
    ev, er = mp.eig(Aq)
    k = max(range(4), key=lambda j: mp.im(ev[j]))
    om = mp.im(ev[k])
    q = er[:, k]
    q = q / mp.sqrt(sum(abs(x) ** 2 for x in q))                # <q, q> = 1
    evl, el = mp.eig(Aq.T)
    kl = min(range(4), key=lambda j: mp.im(evl[j]))           # A^T p = -i omega p
    p = el[:, kl]
    p = p / mp.conj((p.H * q)[0])                                # <p, q> = conj(p)^T q = 1
    H2 = [[[mp.mpf(sp.N(sp.diff(F[i], X[j], X[k]).subs(sub), 50)) for k in range(4)] for j in range(4)]
          for i in range(4)]
    H3 = [[[[mp.mpf(sp.N(sp.diff(F[i], X[j], X[k], X[l]).subs(sub), 50)) for l in range(4)] for k in range(4)]
           for j in range(4)] for i in range(4)]
    Bf = lambda x, y: mp.matrix([sum(H2[i][j][k] * x[j] * y[k] for j in range(4) for k in range(4))
                                 for i in range(4)])
    Cf = lambda x, y, z: mp.matrix([sum(H3[i][j][k][l] * x[j] * y[k] * z[l] for j in range(4) for k in range(4)
                                        for l in range(4)) for i in range(4)])
    qb = mp.matrix([mp.conj(v) for v in q])
    inner = lambda a, b: sum(mp.conj(a[i]) * b[i] for i in range(4))
    term = inner(p, Cf(q, q, qb)) - 2 * inner(p, Bf(q, mp.lu_solve(Aq, Bf(q, qb)))) \
        + inner(p, Bf(qb, mp.lu_solve(2 * 1j * om * mp.eye(4) - Aq, Bf(q, q))))
    return mp.re(term) / (2 * om), om


def mpmath_transversality(u_mid, om_mid):
    """Independent, non-rigorous cross-check of Theorem 2(d): d lambda/du and dJss/du by central differences at
    u_H +- 1e-12, of the eigenvalue near i omega of the Jacobian (exact symbolic derivatives with SymPy, eigenvalues in
    mpmath at 50 digits) and of Jss (mpmath).  It shares nothing with the series arithmetic of hh_ball.py.  The leak
    term is written 0.3 u without E_l and J: both enter the vector field additively, so neither d lambda/du nor
    dJss/du depends on them."""
    import sympy as sp
    uu, mm, nn, hh = sp.symbols('u m n h')
    Psi = lambda x: x / (sp.exp(x) - 1)
    am, bm = Psi((25 - uu) / 10), 4 * sp.exp(-uu / 18)
    an, bn = sp.Rational(1, 10) * Psi((10 - uu) / 10), sp.Rational(1, 8) * sp.exp(-uu / 80)
    ah, bh = sp.Rational(7, 100) * sp.exp(-uu / 20), 1 / (sp.exp((30 - uu) / 10) + 1)
    F = [-120 * mm ** 3 * hh * (uu - 115) - 36 * nn ** 4 * (uu + 12) - sp.Rational(3, 10) * uu,
         am * (1 - mm) - bm * mm, an * (1 - nn) - bn * nn, ah * (1 - hh) - bh * hh]
    X = [uu, mm, nn, hh]
    fJ = sp.lambdify(X, sp.Matrix(F).jacobian(X), 'mpmath')
    fr = sp.lambdify(uu, [am, bm, an, bn, ah, bh], 'mpmath')
    mp.mp.dps = 50

    def steady(u):
        r = fr(u)
        return [u, r[0] / (r[0] + r[1]), r[2] / (r[2] + r[3]), r[4] / (r[4] + r[5])]

    def eig_near(u):
        ev = mp.eig(mp.matrix(fJ(*steady(u))), left=False, right=False)
        return min(ev, key=lambda z: abs(z - 1j * om_mid))

    def jss(u):
        u, m, n, h = steady(u)
        return 120 * m ** 3 * h * (u - 115) + 36 * n ** 4 * (u + 12) + mp.mpf('0.3') * u

    u0, dh = mp.mpf(u_mid), mp.mpf('1e-12')
    return (eig_near(u0 + dh) - eig_near(u0 - dh)) / (2 * dh), (jss(u0 + dh) - jss(u0 - dh)) / (2 * dh)


E_VALUES = (('10.613 (Hodgkin and Huxley)', EL_PRINTED), ('E_l* (zero resting current)', EL_STAR),
            ('10.599 (Guckenheimer and Oliva)', arb(10599) / 1000), ('10.59', arb(1059) / 100),
            ('10.62', arb(1062) / 100))
JH = []
for i, UH in enumerate(HOPF):
    tag = 'H%d' % (i + 1)
    b = branch(UH, 2)
    g = {k: b[k].coeff(0) for k in b}
    a1, a2, a3, a4 = (g[k].real for k in ('a1', 'a2', 'a3', 'a4'))
    om2 = a3 / a1
    om = om2.sqrt()
    say('   %s: u_%s in %s' % (tag, tag, O.iv(UH, 30)))
    Js = {}
    for name, EL in E_VALUES:
        J = branch(UH, 1, EL=EL)['Jss'].coeff(0).real
        Js[name] = J
        say('       J_%s for E_l = %s: %s   (Arb ball %s)' % (tag, name, O.iv(J, 16), J.str(22, radius=True)))
    say('       J_%s(E_l) = J_%s(10.613) + 0.3 (10.613 - E_l) exactly; over E_l in [10.59, 10.62]: J_%s in [%s, %s]'
        % (tag, tag, tag, O.lo(Js['10.62'], 9), O.hi(Js['10.59'], 9)))
    JH.append(Js)
    say('       omega_%s in %s, period 2 pi/omega in %s ms' % (tag, O.iv(om, 15), O.iv(2 * arb.pi() / om, 12)))
    split = a2 - om2 - a4 / om2
    check('%s: p(l) = (l^2 + omega^2)(l^2 + a1 l + a4/omega^2), i.e. a2 - omega^2 - a4/omega^2 encloses 0, with '
          'a1 > 0 and a4/omega^2 > 0 (the other two eigenvalues in Re < 0)' % tag,
          split.contains(0) and lo(a1) > 0 and lo(a4 / om2) > 0, kind='consistency')
    lam = I * acb(om)
    pu = b['a1'].coeff(1) * lam ** 3 + b['a2'].coeff(1) * lam ** 2 + b['a3'].coeff(1) * lam + b['a4'].coeff(1)
    pl = 4 * lam ** 3 + 3 * g['a1'] * lam ** 2 + 2 * g['a2'] * lam + g['a3']
    dl = -pu / pl
    dJ = b['Jss'].coeff(1).real
    check('%s: transversality, Re(d lambda/du) at lambda = i omega is enclosed away from 0 (dJ/du > 0, so the '
          'same sign in J)' % tag, lo(dl.real) > 0 or hi(dl.real) < 0,
          'Re d lambda/du in %s, dJss/du in %s, Re d lambda/dJ in %s'
          % (O.iv_g(dl.real, 10), O.iv_g(dJ, 10), O.iv_g(dl.real / dJ, 10)))
    fd_l, fd_J = mpmath_transversality(UH.mid().str(45, radius=False), float(om.mid()))
    rel_l = abs(mp.re(fd_l) - mp.mpf(dl.real.mid().str(40, radius=False))) / abs(mp.re(fd_l))
    rel_J = abs(fd_J - mp.mpf(dJ.mid().str(40, radius=False))) / abs(fd_J)
    check('%s: independent cross-check of the transversality (central differences of the eigenvalue near i omega of '
          'the SymPy Jacobian and of Jss, mpmath) agrees with Re d lambda/du and dJss/du' % tag,
          rel_l < mp.mpf('1e-10') and rel_J < mp.mpf('1e-10'),
          'finite differences: Re d lambda/du = %s, dJss/du = %s; relative differences %s, %s'
          % (mp.nstr(mp.re(fd_l), 12), mp.nstr(fd_J, 12), mp.nstr(rel_l, 2), mp.nstr(rel_J, 2)), kind='crosscheck')
    # eigenvectors: the Jacobian is an arrow matrix, so A q = i omega q and w^T A = i omega w^T have closed forms
    a11, a1m, a1n, a1h = g['a11'], g['a1m'], g['a1n'], g['a1h']
    am1, an1, ah1 = g['am1'], g['an1'], g['ah1']
    km, kn, kh = g['km'], g['kn'], g['kh']
    A = acb_mat([[a11, a1m, a1n, a1h], [am1, -km, 0, 0], [an1, 0, -kn, 0], [ah1, 0, 0, -kh]])
    iw = I * acb(om)
    q = [acb(1), am1 / (km + iw), an1 / (kn + iw), ah1 / (kh + iw)]
    qn = sum((abs(x) ** 2 for x in q), arb(0)).sqrt()
    q = [x / qn for x in q]                          # <q, q> = 1, the usual normalization (l1's sign needs none)
    w = [acb(1), a1m / (km + iw), a1n / (kn + iw), a1h / (kh + iw)]
    nrm = sum((w[j] * q[j] for j in range(4)), acb(0))
    w = [x / nrm for x in w]                       # w = conj(p): <p, v> = w^T v and <p, q> = 1
    Aq = [sum((A[r, c] * q[c] for c in range(4)), acb(0)) - iw * q[r] for r in range(4)]
    wA = [sum((w[r] * A[r, c] for r in range(4)), acb(0)) - iw * w[c] for c in range(4)]
    check('%s: A q = i omega q and w^T A = i omega w^T hold (every component encloses 0)' % tag,
          all(x.real.contains(0) and x.imag.contains(0) for x in Aq + wA), kind='consistency')
    x0 = [acb(UH), g['m'], g['n'], g['h']]
    J0 = branch(UH, 1, EL=EL_PRINTED)['Jss'].coeff(0)     # l1 does not depend on J or E_l (they enter additively)

    def dirser(v):
        xs = [TS([x0[j], v[j], acb(0), acb(0)]) for j in range(4)]
        return H.field(xs, J0, EL_PRINTED)

    l1 = lyap1(A, dirser, om, q, w)
    check('%s: the first Lyapunov coefficient is enclosed away from 0: l1 %s 0, so the Hopf bifurcation is %s'
          % (tag, '>' if lo(l1) > 0 else '<', 'subcritical' if lo(l1) > 0 else 'supercritical'),
          lo(l1) > 0 or hi(l1) < 0, 'l1 in %s (with <q, q> = 1; Arb ball %s)'
          % (O.iv_g(l1, 13), l1.str(20, radius=True)))
    qu = abs(q[0])
    slope = 16 * qu ** 2 * (dl.real / dJ) / (om * l1)
    say('       |q_u| in %s (u-component of q with <q, q> = 1); 16 |q_u|^2 Re(d lambda/dJ)/(omega l1) in %s'
        % (O.iv_g(qu, 10), O.iv_g(slope, 8)))
    say('       (the normal-form prediction of (peak-to-peak u amplitude)^2 / |J - J_%s| as J -> J_%s; used only in the'
        % (tag, tag))
    say('       numerical section of the manuscript)')
    ref, om_ref = mpmath_l1(UH.mid().str(45, radius=False))
    rel = abs(ref - mp.mpf(l1.mid().str(40, radius=False))) / abs(ref)
    check('%s: independent cross-check (SymPy derivatives, mpmath eigenvectors, explicit tensors) agrees' % tag,
          rel < mp.mpf('1e-20'), 'mpmath l1 = %s, relative difference %s' % (mp.nstr(ref, 15), mp.nstr(rel, 3)),
          kind='crosscheck')
    HOPF[i] = (UH, l1)
say()

# ------------------------------------------------------------------------------------------------ D. J = 8
say('D. The current J = 8 of the bistability proof (certify_bistability.py)')
JH1_ball = branch(HOPF[0][0], 1, EL=EL_BALL)['Jss'].coeff(0).real
check('J_H1 > 8 for every E_l in [10.59, 10.62], so by (A) and (B) the equilibrium at J = 8 is unique and '
      'asymptotically stable for every such E_l', lo(JH1_ball) > 8, 'J_H1 >= %s on the ball' % O.lo(JH1_ball, 6))
say()

# ------------------------------------------------------------------------------------------------ controls
say('Negative controls of the Hopf-point checks')
UH1 = HOPF[0][0]
Xbad = arb(UH1.mid() + arb('1e-6'), arb('1e-9'))
Nbad = arb(Xbad.mid()) - branch(arb(Xbad.mid()), 1)['D3'].coeff(0).real / branch(Xbad, 2)['D3'].coeff(1).real
check('negative control: the Newton image of a box 1e-6 away from u_H1 does not lie in that box',
      not Xbad.contains(Nbad), kind='control')
gb = branch(UH1 + arb('1e-3'), 1)
a1b, a2b, a3b, a4b = (gb[k].coeff(0).real for k in ('a1', 'a2', 'a3', 'a4'))
splitb = a2b - a3b / a1b - a4b * a1b / a3b
check('negative control: at u = u_H1 + 1e-3 the factorization test a2 - omega^2 - a4/omega^2 (omega^2 = a3/a1) '
      'excludes 0, so it is not passed away from a Hopf point', not splitb.contains(0),
      'a2 - omega^2 - a4/omega^2 in %s' % O.iv_g(splitb, 4), kind='control')
say()

nb, bad = O.verify_ledger()
check('every decimal bound printed with outward rounding (%d of them) re-read as an exact rational lies on the '
      'correct side of the ball it stands for' % nb, not bad, repr(bad[:3]) if bad else '')
say()
total = sum(COUNT.values())
say('%d checks, %d failed: %d proof checks, %d consistency checks, %d negative controls, %d self-tests, '
    '%d cross-checks' % (total, len(FAILED), COUNT['proof'], COUNT['consistency'], COUNT['control'],
                         COUNT['selftest'], COUNT['crosscheck']))
say('run time %.1f s' % (time.time() - T0))
write_report()
print('report written to %s' % os.path.relpath(OUT))
if FAILED:
    sys.exit('FAILED: ' + '; '.join(FAILED))
