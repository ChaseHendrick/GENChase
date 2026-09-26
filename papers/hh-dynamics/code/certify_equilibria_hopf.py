"""Computer-assisted proof: the equilibria and the two Hopf bifurcations of the space-clamped Hodgkin-Huxley
equations at the 1952 parameters, in the ball arithmetic of FLINT/Arb (python-flint).

Model and conventions: hh_ball.py (u = depolarization in mV, J = applied depolarizing current in uA/cm^2).

What is proved, for every E_l in [10.59, 10.62] (Hodgkin and Huxley print 10.613; the value that makes the
resting current exactly zero, as their Table 3 says it should, is 10.5989...):

  (A) For every J in [0, J_max] there is exactly one equilibrium, and it lies in -12 < u < 115: the steady-state
      current Jss(u) is strictly increasing on [-12, 115], negative for u < -12 and above J_max for u > 115.
  (B) Along the branch, the characteristic polynomial l^4 + a1 l^3 + a2 l^2 + a3 l + a4 of the Jacobian has
      a1, a3, a4 > 0 for all u in [-12, 115], and D3 = a1 a2 a3 - a3^2 - a1^2 a4 has exactly two zeros u_H1 < u_H2
      there, both simple, with D2 = a1 a2 - a3 > 0 wherever D3 > 0. With a1, a3 > 0, p has a root on the imaginary
      axis only where D3 = 0 (then the roots are +-i omega, omega^2 = a3/a1) or a4 = 0. So by the Routh-Hurwitz
      criterion the equilibrium is asymptotically stable for u < u_H1 and u > u_H2; on (u_H1, u_H2) no root crosses
      the imaginary axis, and the Routh array at a regular point counts exactly two roots in the open right
      half-plane; at u_Hi there is a simple pair +-i omega_i and two roots in the open left half-plane.
      Since u increases with J, this is the same statement for J_Hi = Jss(u_Hi).
  (C) At each u_Hi the pair crosses the imaginary axis with nonzero speed (the real part of d lambda/du is
      enclosed away from 0) and the first Lyapunov coefficient l1 (Kuznetsov, Elements of Applied Bifurcation
      Theory, 3rd ed., eq. (3.20)) is enclosed away from 0, which decides whether the Hopf bifurcation is
      subcritical (l1 > 0) or supercritical (l1 < 0).

Floating point is used only to choose subdivision points and the midpoints of Newton steps; every conclusion is a
ball-arithmetic inequality. The program prints every check and stops with an error if one fails; it writes its
report to data/certify_equilibria_hopf.txt.
"""
import os, sys, time
import mpmath as mp
from flint import arb, acb, acb_mat, fmpq, ctx
import hh_ball as H
from hh_ball import TS, branch, GNA, GK, GL, ENA, EK, EL_BALL, EL_PRINTED

T0 = time.time()
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'certify_equilibria_hopf.txt')
LINES, COUNT, FAILED = [], [0], []


def say(s=''):
    print(s)
    LINES.append(s)


def check(name, ok, detail=''):
    COUNT[0] += 1
    say(('OK    ' if ok else 'FAIL  ') + name + (('   [' + detail + ']') if detail else ''))
    if not ok:
        FAILED.append(name)


def lo(x):
    return float(x.lower())


def hi(x):
    return float(x.upper())


def ball(a, b):
    """The real ball [a, b] for exact floats a < b."""
    a, b = arb(a), arb(b)
    return arb((a + b) / 2, ((b - a) / 2).upper())


say('Hodgkin-Huxley 1952: equilibria and Hopf bifurcations, certified in Arb at %d bits (python-flint)' % ctx.prec)
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
      worst < mp.mpf('1e-25'), 'max difference %s' % mp.nstr(worst, 3))
raised = False
try:
    H.psi_coeffs(arb('[3.5 +/- 4]'), 2)
except ArithmeticError:
    raised = True
check('negative control: the closed form of Psi refuses a ball that contains 0', raised)

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
      'differences %s, %s' % (mp.nstr(d0, 2), mp.nstr(d1, 2)))
# identity a4 = km kn kh * dJss/du (the determinant of the Jacobian is the slope of the steady-state current)
idn = b['a4'].coeff(0) - b['km'].coeff(0) * b['kn'].coeff(0) * b['kh'].coeff(0) * b['Jss'].coeff(1)
check('identity a4 = (alpha_m + beta_m)(alpha_n + beta_n)(alpha_h + beta_h) dJss/du holds (encloses 0)',
      idn.real.contains(0) and idn.imag.contains(0))
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
      'bound %s' % Jlow.str(8, radius=False))
jm12 = branch(arb(-12), 1)['Jss'].coeff(0).real
check('Jss(-12) < 0 <= J and Jss(115) > J_max, so every J in [0, J_max] has an equilibrium in (-12, 115)',
      hi(jm12) < 0 and lo(branch(arb(115), 1)['Jss'].coeff(0).real) > JMAX,
      'Jss(-12) = %s' % jm12.str(8, radius=False))
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
          'a simple one' % (i + 1, i + 1), ok, 'dD3/du in %s' % dD3.str(5, radius=False))
    check('   interval Newton encloses u_H%d in a ball of radius < 1e-60' % (i + 1), X.rad() < arb('1e-60'),
          'u_H%d in %s' % (i + 1, X.str(40, radius=True)))
    HOPF.append(X)
# the sign pattern: D3 > 0 at the ends and < 0 between the zeros
mid_u = (HOPF[0] + HOPF[1]) / 2 if len(HOPF) == 2 else arb(10)
check('D3 > 0 at u = -12 and u = 115, and D3 < 0 between the two zeros',
      lo(D3_at(-12)) > 0 and lo(D3_at(115)) > 0 and hi(branch(arb(mid_u.mid()), 1)['D3'].coeff(0).real) < 0)
# the right half-plane count on (u_H1, u_H2): at the midpoint, the Routh first column 1, a1, D2/a1, D3/D2, a4
bm_ = branch(arb(mid_u.mid()), 1)
D2m, D3m = bm_['D2'].coeff(0).real, bm_['D3'].coeff(0).real
signs = [1, 1, 1 if lo(D2m) > 0 else (-1 if hi(D2m) < 0 else 0), 0, 1]
signs[3] = (1 if lo(D3m) > 0 else -1) * signs[2]
changes = sum(1 for i in range(4) if signs[i] * signs[i + 1] < 0)
check('at the midpoint of (u_H1, u_H2) the Routh first column is regular and has exactly two sign changes, so the '
      'equilibrium has exactly two eigenvalues in Re > 0 on the whole interval', signs[2] != 0 and changes == 2,
      'signs %s' % signs)
say('   Where D3 > 0: all Hurwitz determinants positive, so every eigenvalue has Re < 0. No eigenvalue reaches the')
say('   imaginary axis except at u_H1 and u_H2 (a1, a3 > 0; a4 > 0 excludes 0).')
say()

# ------------------------------------------------------------------------------------------------ C. Hopf points
say('C. The two Hopf points: crossing speed and first Lyapunov coefficient')
I = acb(0, 1)


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


for i, UH in enumerate(HOPF):
    tag = 'H%d' % (i + 1)
    b = branch(UH, 2)
    g = {k: b[k].coeff(0) for k in b}
    a1, a2, a3, a4 = (g[k].real for k in ('a1', 'a2', 'a3', 'a4'))
    om2 = a3 / a1
    om = om2.sqrt()
    say('   %s: u = %s' % (tag, UH.str(30, radius=False)))
    for name, EL in (('10.613 (printed)', EL_PRINTED), ('the ball [10.59, 10.62]', EL_BALL)):
        J = branch(UH, 1, EL=EL)['Jss'].coeff(0).real
        say('       J_%s for E_l = %s: %s' % (tag, name, J.str(20, radius=True)))
    say('       omega_%s = %s (period 2 pi/omega = %s ms)' % (tag, om.str(20, radius=False),
                                                              (2 * arb.pi() / om).str(12, radius=False)))
    split = a2 - om2 - a4 / om2
    check('%s: p(l) = (l^2 + omega^2)(l^2 + a1 l + a4/omega^2), i.e. a2 - omega^2 - a4/omega^2 encloses 0, with '
          'a1 > 0 and a4/omega^2 > 0 (the other two eigenvalues in Re < 0)' % tag,
          split.contains(0) and lo(a1) > 0 and lo(a4 / om2) > 0)
    lam = I * acb(om)
    pu = b['a1'].coeff(1) * lam ** 3 + b['a2'].coeff(1) * lam ** 2 + b['a3'].coeff(1) * lam + b['a4'].coeff(1)
    pl = 4 * lam ** 3 + 3 * g['a1'] * lam ** 2 + 2 * g['a2'] * lam + g['a3']
    dl = -pu / pl
    check('%s: transversality, Re(d lambda/du) at lambda = i omega is enclosed away from 0 (dJ/du > 0, so the '
          'same sign in J)' % tag, lo(dl.real) > 0 or hi(dl.real) < 0,
          'Re d lambda/du in %s, dJss/du in %s' % (dl.real.str(8, radius=False),
                                                 b['Jss'].coeff(1).real.str(8, radius=False)))
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
          all(x.real.contains(0) and x.imag.contains(0) for x in Aq + wA))
    x0 = [acb(UH), g['m'], g['n'], g['h']]
    J0 = branch(UH, 1, EL=EL_PRINTED)['Jss'].coeff(0)     # l1 does not depend on J or E_l (they enter additively)

    def dirser(v):
        xs = [TS([x0[j], v[j], acb(0), acb(0)]) for j in range(4)]
        return H.field(xs, J0, EL_PRINTED)

    def Bq(v):                                      # B(v, v) = 2 * (t^2 coefficient)
        return [2 * s.coeff(2) for s in dirser(v)]

    def Cq(v):                                      # C(v, v, v) = 6 * (t^3 coefficient)
        return [6 * s.coeff(3) for s in dirser(v)]

    def B2(a, bb):                                  # polarization of the symmetric bilinear form
        P = Bq([a[j] + bb[j] for j in range(4)])
        M = Bq([a[j] - bb[j] for j in range(4)])
        return [(P[j] - M[j]) / 4 for j in range(4)]

    qb = [x.conjugate() for x in q]
    P3 = Cq([q[j] + qb[j] for j in range(4)])
    M3 = Cq([q[j] - qb[j] for j in range(4)])
    C3 = Cq(qb)
    Cqqqb = [(P3[j] - M3[j] - 2 * C3[j]) / 6 for j in range(4)]
    Bqqb = B2(q, qb)
    Bqq = Bq(q)
    s1 = A.solve(acb_mat([[x] for x in Bqqb]))
    M2 = acb_mat([[(2 * iw if r == c else acb(0)) - A[r, c] for c in range(4)] for r in range(4)])
    s2 = M2.solve(acb_mat([[x] for x in Bqq]))
    t1 = sum((w[j] * Cqqqb[j] for j in range(4)), acb(0))
    t2 = sum((w[j] * y for j, y in enumerate(B2(q, [s1[k, 0] for k in range(4)]))), acb(0))
    t3 = sum((w[j] * y for j, y in enumerate(B2(qb, [s2[k, 0] for k in range(4)]))), acb(0))
    l1 = (t1 - 2 * t2 + t3).real / (2 * om)
    check('%s: the first Lyapunov coefficient is enclosed away from 0: l1 %s 0, so the Hopf bifurcation is %s'
          % (tag, '>' if lo(l1) > 0 else '<', 'subcritical' if lo(l1) > 0 else 'supercritical'),
          lo(l1) > 0 or hi(l1) < 0, 'l1 in %s' % l1.str(12, radius=True))
    ref, om_ref = mpmath_l1(UH.mid().str(45, radius=False))
    rel = abs(ref - mp.mpf(l1.mid().str(40, radius=False))) / abs(ref)
    check('%s: independent cross-check (SymPy derivatives, mpmath eigenvectors, explicit tensors) agrees' % tag,
          rel < mp.mpf('1e-20'), 'mpmath l1 = %s, relative difference %s' % (mp.nstr(ref, 15), mp.nstr(rel, 3)))
    HOPF[i] = (UH, l1)
say()

# a negative control for the zero enclosure: a Newton box that misses the zero is rejected
UH1 = HOPF[0][0]
Xbad = arb(UH1.mid() + arb('1e-6'), arb('1e-9'))
Nbad = arb(Xbad.mid()) - branch(arb(Xbad.mid()), 1)['D3'].coeff(0).real / branch(Xbad, 2)['D3'].coeff(1).real
check('negative control: the Newton image of a box 1e-6 away from u_H1 does not lie in that box', not Xbad.contains(Nbad))
say()
say('%d checks, %d failed' % (COUNT[0], len(FAILED)))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as f:
    f.write('\n'.join(LINES) + '\n')
print('run time %.0f s; report written to %s' % (time.time() - T0, os.path.relpath(OUT)))
if FAILED:
    sys.exit('FAILED: ' + '; '.join(FAILED))
