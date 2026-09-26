#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
"""Computer-assisted proof of the theorem of paper/stable-expansion.tex: a self-similarly expanding configuration of
four point vortices, and one of five, that are linearly stable modulo their symmetries.

Euler law conj(dz_j/dt) = (1/(2 pi i)) sum_{k != j} Gamma_k/(z_j - z_k). A self-similar motion about 0 has
dz_j/dt = kappa z_j. In the gauge of certify_ball_ad.py (Gamma_1 = 1, z_1 real, w_j = lam conj(z_j) with
lam = 2P - i) a solution collapses with 2 pi kappa = -1 + i b, b = 2P. In similarity variables z = rho(t) zeta,
d tau = rho^-2 dt, the collapse is a zero of E(zeta) = 2 pi V(zeta) + (1 - i b) zeta, whose real 2N x 2N Jacobian is
    DE = [[A_r + I, A_i + b I], [A_i - b I, -A_r + I]],
    A_jk = i Gamma_k/conj(z_j - z_k)^2 (k != j),  A_jj = -sum_{k != j} A_jk,
acting on (Re dzeta, Im dzeta). Negating every circulation reverses time: the same shape then expands, and the
Jacobian of its similarity dynamics is -DE. A mode with eigenvalue k of DE therefore decays in the expansion like
(size)^(-k). Lemma 1 of the paper: the spectrum of DE contains 0, 0, 2, 2, 1 + i b and 1 - i b (rotation, the
one-parameter family at fixed circulations, scaling and its partner, translations), and the rest comes in pairs
k, 2 - k. For N = 4 the remaining pair is k, 2 - k with c = k(2 - k) = 3 + 3 b^2 - tr(A conj A), so every exponent
beyond the symmetric ones has positive real part iff c > 0; c > 1 means the pair is 1 +- i sqrt(c - 1).

At every zero of the gauge equations w_j = lam conj(z_j), w_j = sum_{k != j} Gamma_k/(z_j - z_k), we have
sum_j Gamma_j z_j = 0 (sum Gamma_j times the equations: the left side is antisymmetric) and
sum_{j<k} Gamma_j Gamma_k = lam sum_j Gamma_j |z_j|^2 (sum Gamma_j z_j times them); both sums are real and
Im lam = -1, so both vanish exactly. With the other circulations fixed the first is linear in the last
circulation, which is therefore exact at every zero (Gamma_4 = -4/5, Gamma_5 = 47/35); their enclosures, and the side
conditions that sum_j Gamma_j z_j, sum_{j<k} Gamma_j Gamma_k and sum_j Gamma_j |z_j|^2 contain 0, are consistency checks.

The side conditions are those of certify_pipeline.side_checks, evaluated on the tightened enclosure. In the words of
the proof of the theorems in the paper:
  all_Gamma_nonzero                the circulations are nonzero;
  sum_Gamma_nonzero                the total circulation is nonzero;
  pairwise_distances_positive      the vortices are distinct;
  no_vortex_at_collision_point     the vortices are away from the origin;
  sum_Gamma_z_contains_0           the first necessary condition, sum_j Gamma_j z_j = 0, is enclosed with 0;
  S_contains_0                     the third, sum_{j<k} Gamma_j Gamma_k = 0, is enclosed with 0;
  I_contains_0                     the second, sum_j Gamma_j |z_j|^2 = 0, is enclosed with 0;
  lambda_j_contain_2P_minus_i      for each j the enclosure of the quotient lambda_j = w_j/conj(z_j) of the left side
                                   of the gauge equation by conj(z_j) overlaps the enclosure of 2P - i;
  P_positive                       P > 0. In the gauge P is signed, b = 2P, and |P| is the winding number.

Sections:
  1. Existence: the four-vortex collapse with x4 = 8/25, Gamma_2 = 5/2, Gamma_3 = 1/9 fixed, by Newton and the
     Krawczyk test in ball arithmetic (FLINT/Arb through python-flint). The 8 unknowns are x1, x2, y2, x3, y3, y4,
     Gamma_4 and P; the zero is unique in the box of radius 10^-rmax (maximum norm) about the Newton point, and the
     side conditions and every later enclosure are evaluated on the tightened Krawczyk enclosure, which contains it.
     The radii stated in the paper (10^-4, and below 10^-93 for the tightened enclosure) are checked.
  2. Lemma 1 on the certified enclosure: the invariant vectors of the symmetries (exact identities, checked to
     contain 0) and the tangent v of the family from the implicit function theorem (DE v = b' i zeta, v independent
     of i zeta).
  3. The stability number c: its enclosure, c > 1, and the pair 1 +- i omega.
  3b. Five vortices (x2 = 3/5, Gamma = (1, -3/7, -7/8, 9/7, 47/35), unknowns x1, y2, x3, y3, x4, y4, x5, y5, Gamma_5,
     P): existence (radii 10^-5 and below 10^-93), Lemma 1, and the four remaining exponents from u = (k - 1)^2, the
     roots of u^2 - m1 u + m2 with m1 = (tr((DE - I)^2) - 4 + 2 b^2)/2, p2 = (tr((DE - I)^4) - 4 - 2 b^4)/2 and
     m2 = (m1^2 - p2)/2. The test of the proof of Theorem 2 is the function stable5.
  3c. Theorem 3 (nonlinear stability): sum_{j<k} Gamma_j Gamma_k = 0 exactly, so the energy H is conserved by the
     similarity dynamics; grad H is a nonzero left null vector of DE; b and H are strictly monotone along the family.
  4. Controls: the Krawczyk test on a box that does not contain the zero must fail; a four-vortex collapse whose
     reversal is unstable (c < 0, certified); the recipe of section 3b applied to the four-vortex matrix of section 1
     (it must give m1 = 1 - c and m2 = 0); a five-vortex collapse whose reversal is unstable, which stable5 refuses
     (m1^2 - 4 m2 < 0, certified) and which has |Re sqrt(u)| > 1 (certified), so two remaining exponents with negative
     real part; a three-vortex collapse, where 2N - 6 = 0 and tr((DE - I)^2) must equal the contribution of the six
     forced exponents, and the recipe of section 3b must give m1 = 0 and p2 = 0 (positive controls).
  5. Illustration in binary64 (not part of the proof): the eigenvalues at the midpoint, and direct integration of
     the expanding configuration, perturbed and not (against the family member with the same energy, as Theorem 3
     predicts), and of the two unstable controls (for the four-vortex one, the measured growth exponent against -k).

Regression tests. Five checks hold for every configuration, whatever the positions: tr DE = 2N, Im tr(A conj A) = 0,
tr((DE - I)^2) = 2 tr(A conj A) - 2N b^2 (at the four-vortex collapse and at the unstable four-vortex control), and
Vieta's formulas for the roots u1, u2 computed from m1 and m2. They test how DE is assembled from A, the trace formula
and the formula for the roots, not the theorems, and the output labels them so.

Needs python-flint, numpy and scipy (code/requirements.txt). Run: python3 code/verify_stable_expansion.py. Prints
every check, counts them by kind (ball or exact arithmetic, regression tests among them, and binary64), and at the
end exits with status 1 if any failed (at once if the first Krawczyk test fails); its output is
data/verify-stable-expansion.txt, written at exit whether or not the program ran to the end.
"""
import atexit
import json
import os
import sys
from decimal import Context, Decimal, ROUND_CEILING
from fractions import Fraction

import numpy as np
from flint import arb, acb, fmpq, arb_mat
from scipy.integrate import solve_ivp
from scipy.optimize import least_squares

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import certify_ball_ad as V  # noqa: E402
import certify_pipeline as CP  # noqa: E402

DATA = os.path.join(os.path.dirname(HERE), 'data')
REPORT = os.path.join(DATA, 'verify-stable-expansion.txt')
OUT, FAILED = [], []
NCHK = {'ball': 0, 'exact': 0, 'regression': 0, 'binary64': 0}
FINISHED = []


def write_report():
    """Write the report at exit, also when the program stops early, so that data/ never keeps a stale report."""
    if not FINISHED:
        OUT.append('\nSTOPPED before the end (a failed first Krawczyk test or an error); the checks above are all that ran')
    with open(REPORT, 'w') as fh:
        fh.write('\n'.join(OUT) + '\n')


if __name__ == '__main__':          # run as the program, not read by another script
    if os.path.exists(REPORT):
        os.remove(REPORT)
    atexit.register(write_report)


def say(s=''):
    print(s)
    OUT.append(s)


def check(name, ok, detail='', kind='ball'):
    """kind: 'ball' (ball arithmetic), 'exact' (rational arithmetic), 'regression' (ball arithmetic, but an identity
    that holds for every configuration: a test of how the program computes, not of the theorems) or 'binary64'."""
    NCHK[kind] += 1
    if kind == 'regression':
        name = 'regression test (holds for every configuration): ' + name
    say(('OK    ' if ok else 'FAIL  ') + name + (('   [' + str(detail) + ']') if detail else ''))
    if not ok:
        FAILED.append(name)


def load(name):
    return json.load(open(os.path.join(DATA, name)))


def vstar_of(cfg):
    z = [complex(*p) for p in cfg['z']]
    v = [arb(z[0].real)]
    for k in range(1, len(z)):
        v += [arb(z[k].real), arb(z[k].imag)]
    return v + [arb(g) for g in cfg['G'][1:]] + [arb(cfg['P'])]


def certify(cfg, chart, fixed):
    N = len(cfg['z'])
    model = CP.EulerModel(N)
    r = CP.existence(model, vstar_of(cfg), chart, fixed)
    return model, r


def box(r):
    """The box of a certify() result in which the zero is unique, as printed, or 'no box' when the radius scan found
    none."""
    return 'no box' if r.get('rmax') is None else 'the box of radius 1e-%d' % r['rmax']


def square_fun(model, full, U):
    """The equations of certify_pipeline.solve_square in the unknowns U, the other entries of full fixed."""
    def fun(u, want_jac):
        Ts = model.eqs(CP.full_from(full, U, u), U, order=1)
        return [t.v for t in Ts], (V.jac_of(Ts) if want_jac else None)
    return fun


def balls(full, N):
    x, y, G, P = V.unpack_full(full, N)
    z = [acb(x[j], y[j]) for j in range(N)]
    return z, [arb(g) for g in G], P


def A_mat(z, G):
    N = len(z)
    A = [[acb(0)]*N for _ in range(N)]
    for j in range(N):
        for k in range(N):
            if k != j:
                d = (z[j] - z[k]).conjugate()
                A[j][k] = acb(0, 1)*G[k]/(d*d)
        A[j][j] = -sum((A[j][k] for k in range(N) if k != j), acb(0))
    return A


def DE_mat(z, G, b):
    """Real 2N x 2N Jacobian of E at zeta, as a list of lists of arb."""
    N = len(z)
    A = A_mat(z, G)
    M = [[arb(0)]*(2*N) for _ in range(2*N)]
    for j in range(N):
        for k in range(N):
            ar, ai = A[j][k].real, A[j][k].imag
            M[j][k] = ar + (1 if j == k else 0)
            M[j][N + k] = ai + (b if j == k else 0)
            M[N + j][k] = ai - (b if j == k else 0)
            M[N + j][N + k] = -ar + (1 if j == k else 0)
    return M


def matvec(M, v):
    return [sum((M[i][j]*v[j] for j in range(len(v))), arb(0)) for i in range(len(M))]


def contains0(vec):
    return all(x.contains(0) for x in vec)


def tr_power(M, p):
    n = len(M)
    P_ = [row[:] for row in M]
    for _ in range(p - 1):
        P_ = [[sum((P_[i][k]*M[k][j] for k in range(n)), arb(0)) for j in range(n)] for i in range(n)]
    return sum((P_[i][i] for i in range(n)), arb(0))


def as_real(vec_c):
    return [c.real for c in vec_c] + [c.imag for c in vec_c]


def max_rad(K):
    """The largest radius of the balls in K (the conversion of an arb radius to binary64 is exact here)."""
    return max(float(a.rad()) for a in K)


def up(x):
    """The positive number x printed with two significant digits, rounded up, so that the printed value bounds x."""
    return '{:.1e}'.format(Context(prec=2, rounding=ROUND_CEILING).create_decimal(Decimal(x)))


def five_numbers(M, b):
    """m1 = u1 + u2, m2 = u1 u2 and the discriminant m1^2 - 4 m2, u = (k - 1)^2 over the two remaining pairs, from
    tr((DE - I)^2) and tr((DE - I)^4) less the contributions 4 - 2 b^2 and 4 + 2 b^4 of the six forced exponents."""
    n = len(M)
    B = [[M[i][j] - (1 if i == j else 0) for j in range(n)] for i in range(n)]
    t2, t4 = tr_power(B, 2), tr_power(B, 4)
    m1 = (t2 - 4 + 2*b*b)/2                   # u1 + u2
    p2 = (t4 - 4 - 2*b**4)/2                  # u1^2 + u2^2
    m2 = (m1*m1 - p2)/2                       # u1 u2
    return m1, m2, m1*m1 - 4*m2


def roots5(m1, m2):
    """The roots u1 <= u2 of u^2 - m1 u + m2, for a positive discriminant."""
    d = (m1*m1 - 4*m2).sqrt()
    return (m1 - d)/2, (m1 + d)/2


def stable5(m1, m2):
    """The test of the proof of Theorem 2: the discriminant m1^2 - 4 m2 of u^2 - m1 u + m2 is positive and its larger
    root u2 is negative, so both roots u = (k - 1)^2 of the two remaining pairs are real and negative, and the four
    remaining exponents are 1 +- i sqrt(-u1), 1 +- i sqrt(-u2), with real part 1. True proves this for every matrix in
    the enclosures; False refuses (the first condition is checked first)."""
    if not bool(m1*m1 - 4*m2 > 0):
        return False
    return bool(roots5(m1, m2)[1] < 0)


def grad_H(z, G):
    """Gradient of H = -sum_{j<k} Gamma_j Gamma_k ln|z_j - z_k| in (Re z, Im z)."""
    N = len(z)
    gx, gy = [arb(0) for _ in range(N)], [arb(0) for _ in range(N)]
    for j in range(N):
        for k in range(N):
            if k != j:
                dx, dy = z[j].real - z[k].real, z[j].imag - z[k].imag
                r2 = dx*dx + dy*dy
                gx[j] = gx[j] - G[j]*G[k]*dx/r2
                gy[j] = gy[j] - G[j]*G[k]*dy/r2
    return gx + gy


def energy_checks(tag, Gq, z, G, M, v, db, sname):
    """Hypotheses of Theorem 3 that are not already in Theorems 1 and 2: the energy H is invariant under scaling
    (L = sum_{j<k} Gamma_j Gamma_k = 0 exactly, so H is conserved by the similarity dynamics), its gradient is a
    nonzero left null vector of DE, and it is strictly monotone along the family (dH/dsigma != 0), as is b."""
    L = sum((Gq[j]*Gq[k] for j in range(len(Gq)) for k in range(j + 1, len(Gq))), Fraction(0))
    check(tag + 'sum_{j<k} Gamma_j Gamma_k = 0 in exact rational arithmetic, so H(lambda zeta) = H(zeta) for '
          'lambda > 0 and H is conserved by the similarity dynamics', L == 0, 'Gamma = (%s)' % ', '.join(map(str, Gq)),
          kind='exact')
    g = grad_H(z, G)
    n = len(g)
    gM = [sum((g[i]*M[i][j] for i in range(n)), arb(0)) for j in range(n)]
    check(tag + 'grad H != 0 and grad H^T DE contains 0 (grad H . E = 0 identically, so grad H is a left null '
          'vector of DE)', contains0(gM) and any(not x.contains(0) for x in g))
    dH = sum((g[i]*v[i] for i in range(n)), arb(0))
    check(tag + 'along the family b\' != 0 and dH/d%s != 0, so H is strictly monotone along it near zeta*' % sname,
          not db.contains(0) and not dH.contains(0), 'b\' = %s, dH/d%s = %s' % (db.str(10, radius=True), sname,
                                                                              dH.str(10, radius=True)))


# ------------------------------------------------------------------------------------------------ 1. existence
say('1. The four-vortex collapse (existence, Krawczyk)')
N = 4
cfg = load('start-four.json')
model, r = certify(cfg, ['x4', 'G2', 'G3'], [fmpq(8, 25), fmpq(5, 2), fmpq(1, 9)])
check('Krawczyk: a unique zero of the 8 equations in the 8 unknowns in %s (maximum norm) about '
      'the Newton point, with x4 = 8/25, Gamma_2 = 5/2, Gamma_3 = 1/9 fixed' % box(r),
      r['ok'], 'contraction %s' % r.get('contraction', arb(0)).str(3))
if not r['ok']:
    sys.exit(1)
full = r['full']
names = model.names
say('      unknowns %s; the tightened enclosure below contains the zero, has radius at most %s, and the side '
    'conditions and every later enclosure are evaluated on it (printed to 15 digits, which widens the printed '
    'radii)' % (', '.join(nm for nm, _ in r['enclosure']), up(max_rad(r['K']))))
for nm, v in r['enclosure']:
    say('      %-3s %s' % (nm, v.str(15, radius=True)))
check('the radii stated in the paper: the zero is unique in the box of radius 1e-4, and the tightened enclosure has '
      'radius below 1e-93', r['rmax'] == 4 and max_rad(r['K']) < 1e-93,
      'unique in %s, enclosure radius at most %s' % (box(r), up(max_rad(r['K']))))
sc = r['side']
for key in CP.GENUINE:
    check('side condition ' + key, bool(sc[key]))
G4 = full[names.index('G4')]
check('consistency: the enclosure of Gamma_4 contains -4/5, its exact value at every zero (sum_{j<k} Gamma_j Gamma_k = '
      '26/9 + (65/18) Gamma_4 vanishes there)', G4.contains(arb(-4)/5) and G4.rad() < 1e-30, G4.str(20, radius=True))
z, G, P = balls(full, N)
b = 2*P
say('      P = %s, the winding' % P.str(25, radius=True))

# ------------------------------------------------------------------------------------------------ 2. Lemma 1
say('\n2. Lemma 1 on the certified enclosure')
M = DE_mat(z, G, b)
zeta = as_real(z)
izeta = as_real([acb(0, 1)*c for c in z])
one = [arb(1)]*N + [arb(0)]*N
ione = [arb(0)]*N + [arb(1)]*N
check('rotation: DE (i zeta) contains 0 (eigenvalue 0)', contains0(matvec(M, izeta)))
Mz = matvec(M, zeta)
target = [2*(zeta[i] + b*izeta[i]*(-1)) for i in range(2*N)]     # 2 (1 - i b) zeta = 2 zeta - 2 b (i zeta)
check('scaling: DE zeta - 2 (1 - i b) zeta contains 0 (with the rotation, eigenvalues 2 and 0)',
      contains0([Mz[i] - target[i] for i in range(2*N)]))
M1, Mi1 = matvec(M, one), matvec(M, ione)
check('translation: DE 1 = 1 - b (i 1) and DE (i 1) = (i 1) + b 1 (eigenvalues 1 +- i b)',
      contains0([M1[i] - (one[i] - b*ione[i]) for i in range(2*N)]) and contains0([Mi1[i] - (ione[i] + b*one[i]) for i in range(2*N)]))
# the family at fixed circulations: tangent from J_U v_U = -J_x4 (implicit function theorem on the box)
U = r['U']
ix4 = names.index('x4')
Ts = model.eqs(full, U + [ix4], order=1)
J = V.jac_of(Ts)
JU = arb_mat([[J[i, j] for j in range(len(U))] for i in range(2*N)])
Jx = arb_mat([[-J[i, len(U)]] for i in range(2*N)])
vU = JU.solve(Jx)
dv = {names[U[p]]: vU[p, 0] for p in range(len(U))}
dv['x4'] = arb(1)
dx = [dv['x1']] + [dv['x%d' % k] for k in range(2, N + 1)]
dy = [arb(0)] + [dv['y%d' % k] for k in range(2, N + 1)]
vfam = dx + dy
check('consistency: the family keeps the circulations, d Gamma_4/d x4 contains 0 (Gamma_4 = -4/5 at every zero)',
      dv['G4'].contains(0), dv['G4'].str(5, radius=True))
db = 2*dv['P']
Mv = matvec(M, vfam)
check('the family tangent v satisfies DE v = b\' (i zeta) (so DE^2 v = 0: a second vector at eigenvalue 0)',
      contains0([Mv[i] - db*izeta[i] for i in range(2*N)]), 'b\' = %s' % db.str(8, radius=True))
check('v is independent of i zeta: Im v_1 = 0 while Im(i zeta_1) = x_1 != 0, and v has x4-component 1',
      bool(full[names.index('x1')] != 0) and not full[names.index('x1')].contains(0))
trM = sum((M[i][i] for i in range(2*N)), arb(0))
check('tr DE = 2N = 8 (= 0 + 0 + 2 + 2 + (1 + i b) + (1 - i b) + k + (2 - k))',
      trM.contains(8), trM.str(10, radius=True), kind='regression')

# ------------------------------------------------------------------------------------------------ 3. stability number
say('\n3. The stability number c = k(2 - k) of the remaining pair')
A = A_mat(z, G)
tr = sum((A[j][k]*A[k][j].conjugate() for j in range(N) for k in range(N)), acb(0))
c = 3 + 3*b*b - tr.real
check('Im tr(A conj A) contains 0 (the trace of a commutator)', tr.imag.contains(0), kind='regression')
check('c = 3 + 3 b^2 - tr(A conj A) > 1, so the pair is 1 +- i omega with omega = sqrt(c - 1) real',
      bool(c > 1), c.str(15, radius=True))
omega = (c - 1).sqrt()
say('      omega = %s' % omega.str(15, radius=True))
check('the pair 1 +- i omega is simple and differs from the translations 1 +- i b: omega != b and omega > 0',
      bool(omega > 0) and bool((omega - b).abs_lower() > 0), 'omega = %s, b = %s' % (omega.str(8), b.str(8)))
B = [[M[i][j] - (1 if i == j else 0) for j in range(2*N)] for i in range(2*N)]
t2 = tr_power(B, 2)
u = (t2 - 4 + 2*b*b)/2          # (k - 1)^2 for the remaining pair
check('(tr (DE - I)^2 - 4 + 2 b^2)/2 contains 1 - c: tr((DE - I)^2) = 2 tr(A conj A) - 2N b^2, so this is c '
      'again, computed from the assembled DE', (u - (1 - c)).contains(0), u.str(12, radius=True), kind='regression')
c_float = float(c.mid())

# ------------------------------------------------------------------------------------------------ 3b. five vortices
say('\n3b. Five vortices: existence, Lemma 1 and the four remaining exponents')
cfg5 = load('start-five.json')
mod5, r5 = certify(cfg5, ['x2', 'G2', 'G3', 'G4'], [fmpq(3, 5), fmpq(-3, 7), fmpq(-7, 8), fmpq(9, 7)])
check('Krawczyk: a unique zero of the 10 equations in the 10 unknowns in %s (maximum norm) about '
      'the Newton point, with x2 = 3/5, Gamma_2 = -3/7, Gamma_3 = -7/8, Gamma_4 = 9/7 fixed' % box(r5), r5['ok'])
if r5['ok']:
    say('      unknowns %s; tightened enclosure of radius at most %s, on which everything below is evaluated'
        % (', '.join(nm for nm, _ in r5['enclosure']), up(max_rad(r5['K']))))
    check('five vortices: the radii stated in the paper: the zero is unique in the box of radius 1e-5, and the '
          'tightened enclosure has radius below 1e-93', r5['rmax'] == 5 and max_rad(r5['K']) < 1e-93,
          'unique in %s, enclosure radius at most %s' % (box(r5), up(max_rad(r5['K']))))
    for key in CP.GENUINE:
        check('five vortices: side condition ' + key, bool(r5['side'][key]))
    f5 = r5['full']
    n5 = mod5.names
    G5 = f5[n5.index('G5')]
    check('five vortices, consistency: the enclosure of Gamma_5 contains 47/35, its exact value at every zero '
          '(sum_{j<k} Gamma_j Gamma_k = -517/392 + (55/56) Gamma_5 vanishes there)', G5.contains(arb(47)/35),
          G5.str(20, radius=True))
    z5, Gb5, P5 = balls(f5, 5)
    b5 = 2*P5
    say('      P = %s, the winding' % P5.str(25, radius=True))
    M5 = DE_mat(z5, Gb5, b5)
    zeta5 = as_real(z5)
    izeta5 = as_real([acb(0, 1)*c_ for c_ in z5])
    one5, ione5 = [arb(1)]*5 + [arb(0)]*5, [arb(0)]*5 + [arb(1)]*5
    Mz5, M15, Mi15 = matvec(M5, zeta5), matvec(M5, one5), matvec(M5, ione5)
    check('five vortices: rotation, scaling and translation vectors as in Lemma 1 (exact identities contain 0)',
          contains0(matvec(M5, izeta5)) and contains0([Mz5[i] - 2*(zeta5[i] - b5*izeta5[i]) for i in range(10)])
          and contains0([M15[i] - (one5[i] - b5*ione5[i]) for i in range(10)])
          and contains0([Mi15[i] - (ione5[i] + b5*one5[i]) for i in range(10)]))
    U5 = r5['U']
    ix2 = n5.index('x2')
    J5 = V.jac_of(mod5.eqs(f5, U5 + [ix2], order=1))
    vU5 = arb_mat([[J5[i, j] for j in range(len(U5))] for i in range(10)]).solve(arb_mat([[-J5[i, len(U5)]] for i in range(10)]))
    d5 = {n5[U5[q]]: vU5[q, 0] for q in range(len(U5))}
    d5['x2'] = arb(1)
    v5 = [d5['x1']] + [d5['x%d' % k] for k in range(2, 6)] + [arb(0)] + [d5['y%d' % k] for k in range(2, 6)]
    Mv5 = matvec(M5, v5)
    check('five vortices: the family tangent keeps the circulations and satisfies DE v = b\' (i zeta), v independent of i zeta',
          d5['G5'].contains(0) and contains0([Mv5[i] - 2*d5['P']*izeta5[i] for i in range(10)])
          and not f5[n5.index('x1')].contains(0))
    m1, m2, disc = five_numbers(M5, b5)
    u1, u2 = roots5(m1, m2)
    say('      m1 = %s, m2 = %s, discriminant m1^2 - 4 m2 = %s' % (m1.str(12, radius=True), m2.str(12, radius=True),
                                                                 disc.str(10, radius=True)))
    check('five vortices: the test of the proof of Theorem 2 (stable5) passes: the discriminant m1^2 - 4 m2 of '
          'u^2 - m1 u + m2 is positive, so u1 < u2 are real, and u2 < 0 < 1, so the four remaining exponents are '
          '1 +- i sqrt(-u1) and 1 +- i sqrt(-u2): real part 1', stable5(m1, m2),
          'u1 = %s, u2 = %s' % (u1.str(10, radius=True), u2.str(10, radius=True)))
    check('five vortices, Vieta: u1 + u2 contains m1 and u1 u2 contains m2 (a test of how the roots are computed)',
          (u1 + u2 - m1).contains(0) and (u1*u2 - m2).contains(0), kind='regression')
    w1, w2 = (-u1).sqrt(), (-u2).sqrt()
    say('      exponents 1 +- i %s and 1 +- i %s' % (w1.str(10, radius=True), w2.str(10, radius=True)))
    check('five vortices: the four exponents on Re k = 1 are simple and differ from 1 +- i b (w1 != w2, both != b)',
          bool((w1 - w2).abs_lower() > 0) and bool((w1 - b5).abs_lower() > 0) and bool((w2 - b5).abs_lower() > 0),
          'b = %s' % b5.str(8))

# ------------------------------------------------------------------------------------------------ 3c. Theorem 3
say('\n3c. Theorem 3 (nonlinear stability): the energy along the family')
energy_checks('four vortices: ', [Fraction(1), Fraction(5, 2), Fraction(1, 9), Fraction(-4, 5)], z, G, M, vfam, db, 'x4')
if r5['ok']:
    energy_checks('five vortices: ', [Fraction(1), Fraction(-3, 7), Fraction(-7, 8), Fraction(9, 7), Fraction(47, 35)],
                  z5, Gb5, M5, v5, 2*d5['P'], 'x2')

# ------------------------------------------------------------------------------------------------ 4. controls
say('\n4. Controls')
# The Krawczyk test must fail on a box that does not contain the zero: radius 1e-6 about the point that differs from the
# four-vortex zero of section 1 by 1e-3 in every unknown.
xs = [a.mid() + arb('1e-3') for a in r['K']]
okx = V.krawczyk(square_fun(model, full, r['U']), xs, arb('1e-6'))[0]
check('Krawczyk negative control: the test fails, as it must, on the box of radius 1e-6 (maximum norm) about a point '
      'that differs from the four-vortex zero by 1e-3 (to within 1e-93) in every unknown, a box without the zero', not okx)
ctl = load('starts-controls.json')
cu = ctl['unstable4']
x4c, g2c, g3c = fmpq(149, 125), fmpq(-1003, 1000), fmpq(13, 10)
modc4, r2 = certify(cu, ['x4', 'G2', 'G3'], [x4c, g2c, g3c])
check('unstable control: Krawczyk certifies a four-vortex collapse with x4 = %s, Gamma_2 = %s, Gamma_3 = %s, unique '
      'in %s' % (x4c, g2c, g3c, box(r2)), r2['ok'])
if r2['ok']:
    check('unstable control: every side condition holds on the enclosure (so x_1 != 0, and with the Krawczyk test the '
          'hypotheses of Lemma 1)', all(bool(r2['side'][k_]) for k_ in CP.GENUINE))
    G4c = r2['full'][modc4.names.index('G4')]
    check('unstable control, consistency: the enclosure of Gamma_4 contains 10069/12970, its exact value at every zero',
          G4c.contains(arb(fmpq(10069, 12970))), G4c.str(15, radius=True))
    z2, Gc2, P2 = balls(r2['full'], 4)
    A2 = A_mat(z2, Gc2)
    tr2 = sum((A2[j][k]*A2[k][j].conjugate() for j in range(4) for k in range(4)), acb(0))
    c2 = 3 + 12*P2*P2 - tr2.real
    k2 = 1 - (1 - c2).sqrt()
    check('unstable control: c < 0, so the test of section 3 (c > 1) refuses it: a real pair k < 0 < 2 < 2 - k, and '
          'the reversed expansion is unstable', bool(c2 < 0), 'c = %s, k = %s' % (c2.str(10, radius=True),
                                                                               k2.str(10, radius=True)))
    B2 = [[x - (1 if i == j else 0) for j, x in enumerate(row)] for i, row in enumerate(DE_mat(z2, Gc2, 2*P2))]
    u2c = (tr_power(B2, 2) - 4 + 8*P2*P2)/2
    check('unstable control: (tr (DE - I)^2 - 4 + 2 b^2)/2 contains 1 - c, c computed again from the assembled DE',
          (u2c - (1 - c2)).contains(0), u2c.str(12, radius=True), kind='regression')
# The recipe of section 3b, run on the four-vortex matrix of section 1, where there is one remaining pair: it must give
# m1 = 1 - c (that pair) and m2 = 0 (no second pair), the second by Lemma 1 at this zero, not for every configuration.
m1f, m2f, _ = five_numbers(M, b)
check('positive control of the recipe of section 3b on the four-vortex DE of section 1: m1 contains 1 - c and m2 '
      'contains 0', (m1f - (1 - c)).contains(0) and m2f.contains(0),
      'm1 - (1 - c) = %s, m2 = %s' % ((m1f - (1 - c)).str(5, radius=True), m2f.str(5, radius=True)))
# a five-vortex collapse whose reversal is unstable: the stability test of section 3b must refuse it, and the refusal is
# right. Its chart values are rationals with denominators below 1000 near a binary64 solution of a random search.
cu5 = ctl['unstable5']
fx5 = [fmpq(-289, 857), fmpq(-133, 849), fmpq(150, 839), fmpq(-61, 876)]
modc5, r6 = certify(cu5, ['x2', 'G2', 'G3', 'G4'], fx5)
check('five-vortex unstable control: Krawczyk certifies a collapse with x2 = %s, Gamma_2 = %s, Gamma_3 = %s, Gamma_4 = %s'
      % tuple(fx5) + ', unique in %s' % box(r6), r6['ok'])
if r6['ok']:
    check('five-vortex unstable control: every side condition holds on the enclosure (so x_1 != 0, and with the '
          'Krawczyk test the hypotheses of Lemma 1)', all(bool(r6['side'][k_]) for k_ in CP.GENUINE))
    G5c = r6['full'][modc5.names.index('G5')]
    check('five-vortex unstable control, consistency: the enclosure of Gamma_5 contains 6868618/84905979, its exact value '
          'at every zero', G5c.contains(arb(fmpq(6868618, 84905979))), G5c.str(15, radius=True))
    z6, Gc6, P6 = balls(r6['full'], 5)
    b6 = 2*P6
    m1c, m2c, discc = five_numbers(DE_mat(z6, Gc6, b6), b6)
    say('      m1 = %s, m2 = %s' % (m1c.str(12, radius=True), m2c.str(12, radius=True)))
    check('five-vortex unstable control: the test of section 3b (stable5) refuses it, at its first condition: the '
          'discriminant m1^2 - 4 m2 is negative', not stable5(m1c, m2c) and bool(discc < 0), discc.str(10, radius=True))
    uc = acb(m1c, (-discc).sqrt())/2          # the roots are uc and conj(uc)
    wc = uc.sqrt()
    check('five-vortex unstable control: the refusal is right: |Re sqrt(u)| > 1 for the roots u, conj(u), so the '
          'remaining exponents 1 +- sqrt(u), 1 +- conj(sqrt(u)) include two with negative real part and the reversed '
          'expansion is unstable (a negative discriminant alone would not show this)', bool(abs(wc.real) > 1),
          'sqrt(u) = %s + i %s' % (wc.real.str(10, radius=True), wc.imag.str(10, radius=True)))
c3 = ctl['three']
fx3 = [fmpq(-238, 125), fmpq(9, 10)]
modc3, r3 = certify(c3, ['G2', 'x2'], fx3)
check('three-vortex control: Krawczyk certifies a collapse with Gamma_2 = %s, x2 = %s' % tuple(fx3)
      + ', unique in %s' % box(r3), r3['ok'])
if r3['ok']:
    # P is the signed winding in this gauge (lam = 2P - i); this triangle turns the other way, so P < 0. The collapse
    # condition is Im lam = -1, exact in the gauge; what matters here is P != 0.
    bad3 = [k_ for k_ in CP.GENUINE if k_ != 'P_positive' and not r3['side'][k_]]
    P3b = r3['side']['P_ball']
    check('three-vortex control: every side condition holds on the enclosure, with P != 0 in place of P > 0 (P is '
          'signed in this gauge, and this triangle turns the other way)',
          not bad3 and not P3b.contains(0), 'P = %s' % P3b.str(10, radius=True))
    z3, G3c, P3 = balls(r3['full'], 3)
    M3 = DE_mat(z3, G3c, 2*P3)
    B3 = [[M3[i][j] - (1 if i == j else 0) for j in range(6)] for i in range(6)]
    t23 = tr_power(B3, 2)
    check('three-vortex control (positive): 2N - 6 = 0, and tr (DE - I)^2 = 4 - 2 b^2, the six forced exponents alone',
          (t23 - 4 + 8*P3*P3).contains(0), (t23 - 4 + 8*P3*P3).str(5, radius=True))
    m13, m23, _ = five_numbers(M3, 2*P3)
    p23 = m13*m13 - 2*m23
    check('positive control of the recipe of section 3b on the three-vortex DE: m1 and p2 contain 0 (no remaining '
          'pair, so tr (DE - I)^4 = 4 + 2 b^4 as well)', m13.contains(0) and p23.contains(0),
          'm1 = %s, p2 = %s' % (m13.str(5, radius=True), p23.str(5, radius=True)))

# ------------------------------------------------------------------------------------------------ 5. illustration
say('\n5. Illustration in binary64 (not part of the proof)')
zf = np.array([complex(float(q.real.mid()), float(q.imag.mid())) for q in z])
Gf = np.array([float(g.mid()) for g in G])
bf = float(b.mid())
Mf = np.array([[float(x.mid()) for x in row] for row in M])
ev = np.sort_complex(np.linalg.eigvals(Mf))
say('      eigenvalues of DE: ' + ', '.join('%.6f%+.6fi' % (e.real, e.imag) for e in ev))
known = [0, 0, 2, 2, 1 + 1j*bf, 1 - 1j*bf, 1 + 1j*np.sqrt(c_float - 1), 1 - 1j*np.sqrt(c_float - 1)]
# The double eigenvalues 0 and 2 are defective (Lemma 1: a Jordan block from the family), and rounding splits a
# defective double eigenvalue by about sqrt(machine epsilon) ~ 1e-8, so the tolerance is 1e-6, not 1e-8.
dev = max(abs(e - kv) for e, kv in zip(sorted(ev, key=lambda e: (round(e.real, 3), e.imag)),
                                        sorted(known, key=lambda e: (round(complex(e).real, 3), complex(e).imag))))
check('binary64: the eigenvalues match {0, 0, 2, 2, 1 +- i b, 1 +- i omega} one to one within 1e-6 '
      '(defective double eigenvalues split by about 1e-8)', dev < 1e-6, '%.1e' % dev, kind='binary64')


def rhs_of(Gs):
    def rhs(t, y):
        n = len(Gs)
        q = y[:n] + 1j*y[n:]
        d = q[:, None] - q[None, :]
        np.fill_diagonal(d, 1)
        v = (1j/(2*np.pi))*(Gs[None, :]*d/np.abs(d)**2)
        np.fill_diagonal(v, 0)
        v = v.sum(1)
        return np.concatenate([v.real, v.imag])
    return rhs


def shape_dev(q, ref, Gs):
    q = q - (Gs*q).sum()/Gs.sum()
    ref = ref - (Gs*ref).sum()/Gs.sum()
    a = np.vdot(ref, q)/np.vdot(ref, ref)
    return np.linalg.norm(q - a*ref)/np.linalg.norm(q), abs(a)


def run(zs, Gs, eps, seed, tmax):
    rng = np.random.default_rng(seed)
    q0 = zs + eps*(rng.normal(size=len(zs)) + 1j*rng.normal(size=len(zs)))
    ts = np.geomspace(1e-2, tmax, 8)
    s = solve_ivp(rhs_of(Gs), (0, tmax), np.concatenate([q0.real, q0.imag]), t_eval=ts, method='DOP853',
                  rtol=1e-12, atol=1e-14)
    return [(s.t[k],) + shape_dev(s.y[:len(zs), k] + 1j*s.y[len(zs):, k], zs, Gs) for k in range(len(s.t))]


rows = run(zf, -Gf, 0.0, 0, 1e5)
say('      expanding (circulations negated), unperturbed: ' + '; '.join('size x%.3g dev %.1e' % (r_[2], r_[1]) for r_ in rows))
check('binary64: unperturbed expansion keeps its shape to 1e-10 while it grows over 100-fold',
      max(r_[1] for r_ in rows) < 1e-10 and rows[-1][2] > 100, kind='binary64')
rows = run(zf, -Gf, 1e-5, 3, 1e5)
say('      expanding, perturbed 1e-5: ' + '; '.join('size x%.3g dev %.1e' % (r_[2], r_[1]) for r_ in rows))
check('binary64: a 1e-5 perturbation stays below 1e-3 while the size grows 178-fold (it settles on a nearby '
      'member of the family, a neutral direction, instead of growing)', max(r_[1] for r_ in rows) < 1e-3, kind='binary64')


def H_float(q, Gs):
    return -sum(Gs[j]*Gs[k]*np.log(abs(q[j] - q[k])) for j in range(len(q)) for k in range(j + 1, len(q)))


def member_with_energy(h, zs, Gs, bs):
    """The member of the family (z_1 real, z_c = 0) whose energy is h, by least squares from zs."""
    n = len(zs)

    def unpack(u):
        return np.concatenate([[u[0]], u[1:2*n - 1:2] + 1j*u[2:2*n - 1:2]])

    def res(u):
        q = unpack(u)
        d = np.conj(q[:, None] - q[None, :])
        np.fill_diagonal(d, 1)
        w = 1j*Gs[None, :]/d
        np.fill_diagonal(w, 0)
        e = w.sum(1) + (1 - 1j*u[-1])*q
        return np.concatenate([e.real, e.imag, [H_float(q, Gs) - h]])
    u0 = np.concatenate([[zs[0].real], np.column_stack([zs[1:].real, zs[1:].imag]).ravel(), [bs]])
    s_ = least_squares(res, u0, xtol=1e-15, ftol=1e-15, gtol=1e-15)
    return unpack(s_.x), np.max(np.abs(s_.fun))


def energy_run(zs, Gs, bs, eps, seed):
    """Perturb the expanding configuration, integrate to t = 1e18 (a 5e8-fold growth), and measure the shape deviation (modulo
    translation, rotation and scaling) from zeta* and from the family member with the perturbed energy."""
    n = len(zs)
    rng = np.random.default_rng(seed)
    q0 = zs + eps*(rng.normal(size=n) + 1j*rng.normal(size=n))
    zinf, resid = member_with_energy(H_float(q0, Gs), zs, Gs, bs)
    ts = np.geomspace(1, 1e18, 37)
    sol = solve_ivp(rhs_of(-Gs), (0, ts[-1]), np.concatenate([q0.real, q0.imag]), t_eval=ts, method='DOP853',
                    rtol=1e-13, atol=1e-13)
    out = []
    for k in range(len(sol.t)):
        q = sol.y[:n, k] + 1j*sol.y[n:, k]
        d_star, size = shape_dev(q, zs, Gs)
        out.append((size, d_star, shape_dev(q, zinf, Gs)[0], abs(H_float(q, Gs) - H_float(q0, Gs))))
    return out, resid


# Five vortices have two oscillating shape modes of nearly equal frequency (3.45 and 3.19), which beat with a period of
# about 24 in s = ln(size); the product size x deviation therefore rises and falls over the run, bounded as Theorem 3 says.
for tag, zs_, Gs_, bs_, bound in (('four', zf, Gf, bf, 1e-3), ('five', None, None, None, 3e-2)):
    if tag == 'five':
        if not r5['ok']:
            continue
        zs_ = np.array([complex(float(q.real.mid()), float(q.imag.mid())) for q in z5])
        Gs_ = np.array([float(g.mid()) for g in Gb5])
        bs_ = float(b5.mid())
    rows, resid = energy_run(zs_, Gs_, bs_, 1e-4, 3)
    say('      %s vortices expanding, perturbed 1e-4, against the member with the same energy (least-squares residual '
        '%.0e): ' % (tag, resid) + '; '.join('size x%.3g dev %.1e (from zeta* %.1e)' % (r_[0], r_[2], r_[1]) for r_ in rows[::4])
        + '; largest change of H %.1e' % max(r_[3] for r_ in rows))
    check('binary64 (Theorem 3), %s vortices: the shape deviation from the family member with the same energy H decays '
          'like 1/size (size x deviation stays below %.0e from 5-fold to 5e8-fold growth) while the deviation from '
          'zeta* levels off, and H is conserved to 1e-12' % (tag, bound),
          all(r_[0]*r_[2] < bound for r_ in rows if r_[0] > 5) and rows[-1][0] > 5e8 and rows[-1][1] > 1e3*rows[-1][2]
          and max(r_[3] for r_ in rows) < 1e-12, 'size x deviation from 5-fold growth on: %.2e to %.2e' % (min(r_[0]*r_[2] for r_ in rows if r_[0] > 5),
                                                                        max(r_[0]*r_[2] for r_ in rows if r_[0] > 5)),
          kind='binary64')


def growth_exponents(rows, lo=1e-7, hi=1e-2):
    """The local exponents d ln(deviation)/d ln(size) between consecutive samples with deviations in [lo, hi]."""
    return [np.log(b_[1]/a_[1])/np.log(b_[2]/a_[2]) for a_, b_ in zip(rows, rows[1:]) if lo <= a_[1] and b_[1] <= hi]


if r2['ok']:
    zu = np.array([complex(float(q.real.mid()), float(q.imag.mid())) for q in z2])
    Gu = np.array([float(g.mid()) for g in Gc2])
    rows = run(zu, -Gu, 1e-8, 3, 1e3)
    say('      unstable control expanding, perturbed 1e-8: ' + '; '.join('size x%.3g dev %.1e' % (r_[2], r_[1]) for r_ in rows))
    gex, mk = growth_exponents(rows), float((-k2).mid())
    say('      its local growth exponents d ln(dev)/d ln(size) where 1e-7 <= dev <= 1e-2: %s (the certified exponent is '
        '-k = %s)' % (', '.join('%.2f' % e for e in gex), '%.3f' % mk))
    check('binary64: in the unstable control a 1e-8 perturbation grows by at least 100 while the size grows',
          max(r_[1] for r_ in rows) > 1e-6, kind='binary64')
    check('binary64: in the unstable control every measured local growth exponent lies within 0.2 of the certified -k',
          len(gex) > 0 and all(abs(e - mk) < 0.2 for e in gex), kind='binary64')
if r6['ok']:
    zu6 = np.array([complex(float(q.real.mid()), float(q.imag.mid())) for q in z6])
    Gu6 = np.array([float(g.mid()) for g in Gc6])
    rows = run(zu6, -Gu6, 1e-8, 3, 1e3)
    say('      five-vortex unstable control expanding, perturbed 1e-8: ' + '; '.join('size x%.3g dev %.1e' % (r_[2], r_[1]) for r_ in rows))
    check('binary64: in the five-vortex unstable control a 1e-8 perturbation grows by at least 100 while the size grows',
          max(r_[1] for r_ in rows) > 1e-6, kind='binary64')

nball = NCHK['ball'] + NCHK['exact'] + NCHK['regression']
say('\n%d checks: %d in ball or exact arithmetic (%d of them in exact rational arithmetic, %d regression tests that hold '
    'for every configuration), %d in binary64; %d failed' % (nball + NCHK['binary64'], nball, NCHK['exact'],
                                                           NCHK['regression'], NCHK['binary64'], len(FAILED)))
FINISHED.append(True)       # the report is written at exit by write_report
sys.exit(1 if FAILED else 0)
