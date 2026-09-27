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
"""
verify_mu.py -- zero-angular-impulse three-vortex collapse with
Gamma = (1, mu, -mu/(1+mu)),  mu > 0   (so 1/G1 + 1/G2 + 1/G3 = 0).

Convention: conj(dz_j/dt) = (1/(2 pi i)) sum_{k!=j} G_k/(z_j - z_k),
i.e. dz_j/dt = (i/(2 pi)) sum_k G_k / conj(z_j - z_k).
Self-similar motion dz_j/dt = kappa (z_j - z_c);  P = omega_0 t_c = |Im kappa|/(-2 Re kappa).

Notation used throughout:
  R  = 1 + mu + mu^2,  q = sqrt(R),  E = e^{i theta},  c = cos theta,  s = sin theta,
  C  = q c  (= sqrt(R) cos theta; the radical disappears in this variable),
  N(C) = 2(1+mu^2) R + (1-mu)(2+mu+2mu^2) C - 2 mu C^2,
  M(C) = 1 - mu + 2C,
  D(C) = (R + mu^2 - 2 mu C)(R + 1 + 2C) = |q - mu E|^2 |q + E|^2.

Sections
  1  exact kappa, circle, parametrization          (sympy, exact)
  2  collapsing arcs, critical-point cubic, proof  (sympy, exact)
  3  elimination polynomial Q(mu, y), y = P^2       (sympy, exact)
  4  asymptotics mu->0 and mu->1                    (sympy, exact series)
  5  numerical Biot-Savart checks at 50 digits      (mpmath)
  6  rational mu: factorization table               (sympy exact + mpmath minimization)
  7  grid table, monotonicity                       (exact resultant argument + mpmath)
  8  mu -> 1/mu symmetry                            (exact + mpmath)

Every claim prints PASS/FAIL; a summary is printed at the end.  Exit code 1 on any FAIL.
"""
import sys
import time
import sympy as sp
import mpmath as mp

T0 = time.time()
RESULTS = []


def check(name, ok, info=''):
    RESULTS.append((name, bool(ok)))
    print(('  PASS ' if ok else '  FAIL ') + name + ((' :: ' + str(info)) if info != '' else ''))
    sys.stdout.flush()


def hdr(t):
    print('\n' + '=' * 78 + '\n' + t + '\n' + '=' * 78)
    sys.stdout.flush()


# ----------------------------------------------------------------------------------
# symbols
# ----------------------------------------------------------------------------------
m = sp.symbols('mu', positive=True)
q = sp.symbols('q', positive=True)          # stands for sqrt(R)
E = sp.symbols('E')                          # e^{i theta}, |E| = 1
c, s, C, y, x, eps, u = sp.symbols('c s C y x epsilon u')
X, Yr = sp.symbols('X Y', real=True)
I = sp.I
pi = sp.pi
R = 1 + m + m**2
Rp = 1 - m + m**2
Gam = [sp.Integer(1), m, -m / (1 + m)]

Nf = lambda CC: 2*(1 + m**2)*R + (1 - m)*(2 + m + 2*m**2)*CC - 2*m*CC**2
Mf = lambda CC: 1 - m + 2*CC
Df = lambda CC: (R + m**2 - 2*m*CC)*(R + 1 + 2*CC)


def red_q(expr):
    """Numerator of expr, reduced modulo q^2 - R (i.e. evaluated at q = sqrt(R))."""
    num = sp.numer(sp.together(expr))
    return sp.expand(sp.Poly(sp.expand(num), q).rem(sp.Poly(q**2 - R, q)).as_expr())


def red_qs(expr):
    """Numerator reduced modulo q^2 - R and s^2 - (1 - c^2)."""
    num = sp.expand(sp.numer(sp.together(expr)))
    num = sp.Poly(num, s).rem(sp.Poly(s**2 - (1 - c**2), s)).as_expr()
    return sp.expand(sp.Poly(sp.expand(num), q).rem(sp.Poly(q**2 - R, q)).as_expr())


# ==================================================================================
hdr('1. Zero-impulse circle, parametrization, exact kappa  [exact, sympy]')
# ==================================================================================
# 1a. impulse with z1 = 0, z2 = 1, z3 = X + iY
imp = (Gam[0]*Gam[1]*1 + Gam[0]*Gam[2]*(X**2 + Yr**2) + Gam[1]*Gam[2]*((X - 1)**2 + Yr**2))
circ = (1 + m)*(X**2 + Yr**2) - 2*m*X - 1
check('1a impulse(z1=0,z2=1,z3=w) = -(mu/(1+mu))[(1+mu)|w|^2 - 2 mu Re w - 1]',
      sp.simplify(imp + m/(1 + m)*circ) == 0)
check('1b circle: |w - mu/(1+mu)|^2 = R/(1+mu)^2',
      sp.simplify(circ - (1 + m)*((X - m/(1 + m))**2 + Yr**2 - R/(1 + m)**2)) == 0)

# 1c. positions (z3 = 1, z_c = 0)
z = [m*(1 + q/E)/(1 + m)**2, (m - q/E)/(1 + m)**2, sp.Integer(1)]
zb = [zz.subs(E, 1/E) for zz in z]            # complex conjugate (mu, q real, |E| = 1)
check('1c center of vorticity sum G_j z_j = 0', sp.simplify(sum(g*zz for g, zz in zip(Gam, z))) == 0)
wexpr = (z[2] - z[0])/(z[1] - z[0])
check('1c shape ratio w = mu/(1+mu) - (sqrt R/(1+mu)) e^{i theta}',
      red_q(wexpr - (m/(1 + m) - q*E/(1 + m))) == 0)
impz = sum(Gam[j]*Gam[k]*(z[j] - z[k])*(zb[j] - zb[k]) for j in range(3) for k in range(j + 1, 3))
check('1c positions have zero angular impulse', red_q(impz) == 0)

# 1d. kappa_j = (dz_j/dt)/(z_j - z_c) for j = 1,2,3 against the product form
vel = [I/(2*pi)*sum(Gam[k]/(zb[j] - zb[k]) for k in range(3) if k != j) for j in range(3)]
kap = [vel[j]/z[j] for j in range(3)]
kap_c = I*(1 + m)**3/(2*pi*q)*(q + (1 - m)*E)/((q - m*E)*(q + E))
for j in range(3):
    check('1d kappa_%d == i(1+mu)^3/(2 pi sqrtR) (sqrtR+(1-mu)E)/((sqrtR-mu E)(sqrtR+E))' % (j + 1),
          red_q(kap[j] - kap_c) == 0)

# 1e. mu = 1/2 specialization
sub12 = {m: sp.Rational(1, 2), q: sp.sqrt(7)/2}
r7 = sp.sqrt(7)
kap12_given = 27*I/(4*r7*pi)*(r7 + E)/((r7 - E)*(r7 + 2*E))
check('1e mu=1/2: kappa reproduces 27i/(4 sqrt7 pi)(sqrt7+E)/((sqrt7-E)(sqrt7+2E))',
      sp.simplify(kap_c.subs(sub12) - kap12_given) == 0)
z12_given = [sp.Rational(2, 9)*(1 + r7/2/E), sp.Rational(2, 9)*(1 - r7/E), 1]
check('1e mu=1/2: positions reproduce the known ones',
      all(sp.simplify(z[j].subs(sub12) - z12_given[j]) == 0 for j in range(3)))

# 1f. real / imaginary parts
cE = (E + 1/E)/2
sE = (E - 1/E)/(2*I)
f = (q + (1 - m)*E)/((q - m*E)*(q + E))
target = (Nf(q*cE)/q + I*m*sE*Mf(q*cE))/Df(q*cE)
check('1f f := (q+(1-mu)E)/((q-mu E)(q+E)) = [N(C)/q + i mu s M(C)]/D(C),  C = q cos(theta)',
      red_q(f - target) == 0)
check('1f D(C) = |q - mu E|^2 |q + E|^2',
      red_q(Df(q*cE) - (q - m*E)*(q - m/E)*(q + E)*(q + 1/E)) == 0)
# hence (kappa = i K f, K = (1+mu)^3/(2 pi q) real > 0):
#   Re kappa = -(1+mu)^3 mu s M / (2 pi q D),  Im kappa = (1+mu)^3 N / (2 pi R D)
Pform = (2*R*Rp + 2*m*R*s**2 + (1 - m)*(2 + m + 2*m**2)*q*c)/(2*m*q*s*(1 - m + 2*q*c))
check('1f P = N(qc)/(2 mu q s M(qc)) equals [2R(1-mu+mu^2) + 2mu R s^2 + (1-mu)(2+mu+2mu^2) sqrtR c]'
      '/[2 mu sqrtR s (1-mu+2 sqrtR c)]',
      red_qs(Nf(q*c)/(2*m*q*s*Mf(q*c)) - Pform) == 0)
P12_given = (14*s**2 + 6*r7*c + 21)/(2*(14*c + r7)*s)
d12 = sp.numer(sp.together(Pform.subs(sub12) - P12_given))
d12 = sp.Poly(sp.expand(d12), s).rem(sp.Poly(s**2 - (1 - c**2), s)).as_expr()
check('1f mu=1/2: P reproduces (14 s^2 + 6 sqrt7 c + 21)/(2(14c + sqrt7) s)', sp.simplify(d12) == 0)

# ==================================================================================
hdr('2. Collapsing arcs and the critical-point equation  [exact, sympy]')
# ==================================================================================
# positivity of D on [-q, q]
check('2a R + mu^2 - 2 mu q = (q - mu)^2  and  R + 1 - 2q = (q - 1)^2  (so D > 0 on |C| <= q)',
      red_q((R + m**2 - 2*m*q) - (q - m)**2) == 0 and red_q((R + 1 - 2*q) - (q - 1)**2) == 0)
check('2a q > max(1, mu):  q^2 - 1 = mu(1+mu) > 0,  q^2 - mu^2 = 1 + mu > 0',
      sp.expand(R - 1 - m*(1 + m)) == 0 and sp.expand(R - m**2 - (1 + m)) == 0)
# positivity of N on [-q, q]
Nq_p = 2*R*Rp + (1 - m)*(2 + m + 2*m**2)*q
Nq_m = 2*R*Rp - (1 - m)*(2 + m + 2*m**2)*q
check('2b N(+-q) = 2R(1-mu+mu^2) +- (1-mu)(2+mu+2mu^2) q',
      red_q(Nf(q) - Nq_p) == 0 and red_q(Nf(-q) - Nq_m) == 0)
prod_ = sp.factor(sp.expand(sp.Poly(sp.expand(Nq_p*Nq_m), q).rem(sp.Poly(q**2 - R, q)).as_expr()))
check('2b N(q) N(-q) = 3 mu^2 (1+mu)^2 R > 0 and N(q)+N(-q) = 4 R (1-mu+mu^2) > 0',
      sp.simplify(prod_ - 3*m**2*(1 + m)**2*R) == 0 and sp.expand(Nq_p + Nq_m - 4*R*Rp) == 0,
      'N(q)N(-q) = %s' % prod_)
check('2b N is concave in C (coefficient of C^2 is -2 mu), hence N > 0 on [-q, q]',
      sp.Poly(Nf(C), C).coeff_monomial(C**2) == -2*m)
C0 = (m - 1)/2
check('2b N(C0) = (1+mu)^2 R at C0 = (mu-1)/2 (the equilateral point)',
      sp.expand(Nf(C0) - (1 + m)**2*R) == 0)
# arcs
check('2c R - C0^2 = 3(1+mu)^2/4 > 0, so c0 = cos(theta0) = (mu-1)/(2 sqrtR) lies in (-1, 1)',
      sp.expand(R - C0**2 - sp.Rational(3, 4)*(1 + m)**2) == 0)
check('2c (2q)^2 - (1-mu)^2 = 3(1+mu)^2 > 0: M(q) > 0 > M(-q)',
      sp.expand(4*R - (1 - m)**2 - 3*(1 + m)**2) == 0)
s0 = sp.sqrt(3)*(1 + m)/(2*q)
c0 = C0/q
check('2c theta0: sin(theta0) = sqrt3 (1+mu)/(2 sqrtR)', red_q(1 - c0**2 - s0**2) == 0)
w_at = lambda cc, ss: m/(1 + m) - q/(1 + m)*(cc + I*ss)
check('2c theta = theta0 is the equilateral triangle w = e^{-i pi/3}; 2pi - theta0 is w = e^{+i pi/3}',
      sp.simplify(w_at(c0, s0) - (sp.Rational(1, 2) - I*sp.sqrt(3)/2)) == 0
      and sp.simplify(w_at(c0, -s0) - (sp.Rational(1, 2) + I*sp.sqrt(3)/2)) == 0)
check('2c theta = 0, pi are collinear: w = (mu -+ sqrtR)/(1+mu) real',
      sp.simplify(w_at(1, 0) - (m - q)/(1 + m)) == 0 and sp.simplify(w_at(-1, 0) - (m + q)/(1 + m)) == 0)
# Collapse <=> Re kappa < 0 <=> s M > 0:
#   arc A+ : theta in (0, theta0)       <-> C in (C0,  q), s > 0, M > 0   (Im w < 0: 1,2,3 clockwise)
#   arc A- : theta in (pi, 2pi-theta0)  <-> C in (-q, C0), s < 0, M < 0   (Im w > 0: counter-clockwise)
print('   collapsing arcs: A+ = (0, theta0), A- = (pi, 2pi - theta0), cos theta0 = (mu-1)/(2 sqrt R)')
print('   on both arcs Im kappa = (1+mu)^3 N/(2 pi R D) > 0 (same sense of rotation) and')
print('   P^2 = N(C)^2 / (4 mu^2 (R - C^2) M(C)^2),  one rational function of C for BOTH arcs.')

# critical points
Hc = sp.expand(sp.diff(Nf(C), C)*(R - C**2)*Mf(C) + Nf(C)*C*Mf(C) - Nf(C)*(R - C**2)*sp.diff(Mf(C), C))
P2 = Nf(C)**2/(4*m**2*(R - C**2)*Mf(C)**2)
check('2d d(P^2)/dC = 2 N H / (4 mu^2 (R-C^2)^2 M^3),  H := N\'(R-C^2)M + N C M - N (R-C^2) M\'',
      sp.simplify(sp.diff(P2, C) - 2*Nf(C)*Hc/(4*m**2*(R - C**2)**2*Mf(C)**3)) == 0)
Kc = (4*(1 - m)*C**3 + 4*(2*m**2 - m + 2)*C**2 + 2*(1 - m)**3*C - (2*m**4 + 7*m**3 + 6*m**2 + 7*m + 2))
check('2d H(C) = R * K(C),  K(C) := 4(1-mu)C^3 + 4(2mu^2-mu+2)C^2 + 2(1-mu)^3 C - (2mu^4+7mu^3+6mu^2+7mu+2)',
      sp.expand(Hc - R*Kc) == 0, 'H coeffs (C^3..C^0): %s' % [sp.factor(t) for t in sp.Poly(Hc, C).all_coeffs()])
check('2d deg_C K = 3 for mu != 1 (lead 4(1-mu)); at mu = 1, K = 12C^2 - 24 (quadratic)',
      sp.expand(sp.Poly(Kc, C).LC() - 4*(1 - m)) == 0 and sp.expand(Kc.subs(m, 1) - (12*C**2 - 24)) == 0)
check('2d H(+-q) = +-q N(+-q) M(+-q)  (so H(q) > 0, H(-q) > 0)',
      red_q(Hc.subs(C, q) - q*Nf(q)*Mf(q)) == 0 and red_q(Hc.subs(C, -q) + q*Nf(-q)*Mf(-q)) == 0)
check('2d H(C0) = -2 N(C0)(R - C0^2) = -(3/2)(1+mu)^4 R < 0',
      sp.expand(Hc.subs(C, C0) + sp.Rational(3, 2)*(1 + m)**4*R) == 0)
# polynomial in c = cos(theta)
Hcos = sp.expand(sp.Poly(sp.expand(Hc.subs(C, q*c)), q).rem(sp.Poly(q**2 - R, q)).as_expr())
Hcos_expected = (4*(1 - m)*R*q*c**3 + 4*(2*m**2 - m + 2)*R*c**2 + 2*(1 - m)**3*q*c
                 - (2*m**4 + 7*m**3 + 6*m**2 + 7*m + 2))
check('2e K(sqrtR c) = 4(1-mu) R^{3/2} c^3 + 4(2mu^2-mu+2) R c^2 + 2(1-mu)^3 sqrtR c - (2mu^4+7mu^3+6mu^2+7mu+2)',
      red_q(Hcos - R*Hcos_expected) == 0)
cub12 = 196*c**3 + 224*r7*c**2 + 14*c - 128*r7
check('2e mu=1/2: 16 sqrt7 * K(sqrt7 c/2) = 196c^3 + 224 sqrt7 c^2 + 14c - 128 sqrt7',
      sp.expand(16*r7*Hcos_expected.subs(sub12) - cub12) == 0)
print('   Proof of "exactly one critical point on each arc" (all mu > 0):')
print('   P > 0 on the arcs (N > 0), so dP/dtheta = 0 <=> d(P^2)/dC = 0 (dC/dtheta = -q s != 0)')
print('   <=> H(C) = 0 (N > 0, M != 0, R - C^2 > 0 inside the arcs).  Signs: H(-q) > 0, H(C0) < 0,')
print('   H(q) > 0.  IVT: a root in (-q, C0) [arc A-] and a root in (C0, q) [arc A+].')
print('   mu < 1: lead > 0, H(-inf) = -inf < 0 < H(-q): third root in (-inf, -q).')
print('   mu > 1: lead < 0, H(+inf) = -inf < 0 < H(q): third root in (q, +inf).')
print('   mu = 1: H = 12(C^2 - 2), roots +-sqrt2, one per arc.  deg H <= 3  =>  exactly one')
print('   (simple) root per arc; P -> +inf at both ends of each arc, so it is the arc minimum.')
check('2f sign pattern numerically sane at mu in {0.1, 0.5, 2, 7}',
      all((Hc.subs({m: mv, C: sp.sqrt(1 + mv + mv**2)}) > 0) and (Hc.subs({m: mv, C: -sp.sqrt(1 + mv + mv**2)}) > 0)
          and (Hc.subs({m: mv, C: (mv - 1)/2}) < 0)
          for mv in [sp.Rational(1, 10), sp.Rational(1, 2), sp.Integer(2), sp.Integer(7)]))

th_ = sp.symbols('theta', real=True)
Pth = Pform.subs({c: sp.cos(th_), s: sp.sin(th_)})
dPth = sp.diff(Pth, th_) + Kc.subs(C, q*sp.cos(th_))/(2*m*sp.sin(th_)**2*Mf(q*sp.cos(th_))**2)
dPth = sp.numer(sp.together(dPth.subs({sp.cos(th_): c, sp.sin(th_): s})))
dPth = sp.expand(dPth)
dPth = sp.Poly(dPth, s).rem(sp.Poly(s**2 - (1 - c**2), s)).as_expr()
dPth = sp.expand(sp.Poly(sp.expand(dPth), q).rem(sp.Poly(q**2 - R, q)).as_expr())
check('2g closed form: dP/dtheta = -K(sqrtR cos theta) / (2 mu sin^2(theta) (1 - mu + 2 sqrtR cos theta)^2)',
      dPth == 0)

# ==================================================================================
hdr('3. Elimination: Q(mu, y) with y = P^2  [exact, sympy]')
# ==================================================================================
Ff = 4*m**2*y*(R - C**2)*Mf(C)**2 - Nf(C)**2
res = sp.resultant(sp.Poly(Hc, C), sp.Poly(Ff, C)).as_expr()
A2 = 8*m**6 + 24*m**5 + 39*m**4 + 38*m**3 + 39*m**2 + 24*m + 8
A1 = (16*m**12 + 96*m**11 + 48*m**10 - 640*m**9 - 2385*m**8 - 4644*m**7 - 5718*m**6 - 4644*m**5
      - 2385*m**4 - 640*m**3 + 48*m**2 + 96*m + 16)
A0 = 4*m**6 + 12*m**5 + 21*m**4 + 22*m**3 + 21*m**2 + 12*m + 4
Qexp = 1728*m**4*(1 + m)**4*y**3 - 144*m**2*(1 + m)**2*A2*y**2 - 4*A1*y + 3*A0**2
ratio = sp.factor(sp.cancel(res/Qexp))
check('3a Res_C(H, 4mu^2 y (R-C^2) M^2 - N^2) = const(mu) * Q(mu, y), Q as stated',
      not ratio.has(y) and not ratio.has(C), 'ratio = %s' % ratio)
Qp = sp.Poly(Qexp, y)
fl = sp.factor_list(Qexp)
check('3b Q is irreducible in Q[mu, y] (primitive in y, so irreducible over Q(mu))',
      len(fl[1]) == 1 and fl[1][0][1] == 1 and sp.gcd_list(Qp.all_coeffs()) == 1)
Q12 = sp.expand(Qexp.subs(m, sp.Rational(1, 2)))
check('3c Q(1/2, P^2) = (8748 P^6 - 49005 P^4 + 27794 P^2 + 18723)/16',
      sp.expand(16*Q12 - (8748*y**3 - 49005*y**2 + 27794*y + 18723)) == 0)
check('3c Q(1, y) = 6912 (y - 2)^2 (4y + 1)  (double root y = 2: both minima sqrt 2)',
      sp.expand(Qexp.subs(m, 1) - 6912*(y - 2)**2*(4*y + 1)) == 0)
check('3c Q(0, y) = -16(4y - 3)', sp.expand(Qexp.subs(m, 0) + 16*(4*y - 3)) == 0)
check('3d palindromic: mu^12 Q(1/mu, y) = Q(mu, y)', sp.expand(sp.expand(m**12*Qexp.subs(m, 1/m)) - Qexp) == 0)
Qu = (1728*(u + 1)**2*y**3 - 144*(u + 1)*(8*u**3 - 9*u - 9)*y**2
      - 4*(16*u**6 - 288*u**4 - 288*u**3 - 81*u**2 - 162*u - 81)*y + 3*(4*u**3 - 3*u - 3)**2)
check('3d Q = mu^6 Qu(u, y),  u = R/mu = mu + 1 + 1/mu,  Qu as stated',
      sp.simplify(Qexp - m**6*Qu.subs(u, R/m)) == 0)
disc = sp.factor(sp.discriminant(Qexp, y))
disc_target = (28311552*m**4*(m - 1)**2*(m + 1)**4*(m + 2)**2*(2*m + 1)**2*R**6
               * (4*m**6 + 12*m**5 + 51*m**4 + 82*m**3 + 51*m**2 + 12*m + 4)**3)
check('3e disc_y Q = 28311552 mu^4 (mu-1)^2 (mu+1)^4 (mu+2)^2 (2mu+1)^2 R^6 (4mu^6+12mu^5+51mu^4+82mu^3+51mu^2+12mu+4)^3',
      sp.expand(disc - disc_target) == 0)
print('   => for mu > 0 the three roots of Q are distinct except at mu = 1 (only positive zero).')
check('3e constant term 3 A0^2 > 0 and leading 1728 mu^4 (1+mu)^4 > 0: y1 y2 y3 < 0',
      all(co > 0 for co in sp.Poly(A0, m).all_coeffs()))
print('   The roots of Q are y_i = N(C_i)^2/(4 mu^2 (R - C_i^2) M(C_i)^2) over the 3 roots C_i of H')
print('   (Res = lc(H)^4 prod_i F(C_i, y), F linear in y).  Two C_i lie in the arcs (y > 0, the squared')
print('   branch minima); the third has |C| > q, so its y is < 0 (y = 0 is not a root).  Hence')
print('   Q_mu(P) := Q(mu, P^2) vanishes at both branch minima, and its other roots are their')
print('   negatives and +-i sqrt|y3|.')

# ==================================================================================
hdr('4. Exact asymptotics  [exact series from Q, rigorous by the implicit function theorem]')
# ==================================================================================
# mu -> 0, bounded root: Q(0,y) = -16(4y-3), simple root -> analytic branch y_-(mu)
bs = sp.symbols('b1:7')
ym = sp.Rational(3, 4) + sum(bs[i]*m**(i + 1) for i in range(6))
ex = sp.expand(Qexp.subs(y, ym))
solb = {}
for k in range(1, 7):
    co = sp.expand(ex.coeff(m, k).subs(solb))
    solb[bs[k - 1]] = sp.solve(co, bs[k - 1])[0]
ym_ser = ym.subs(solb)
print('   y_-(mu) = P_-^2 =', ym_ser, '+ O(mu^7)')
Pm_ser = sp.series(sp.sqrt(ym_ser), m, 0, 5).removeO()
print('   P_-(mu) =', sp.nsimplify(Pm_ser), '+ O(mu^5)')
check('4a P_-(mu) = sqrt3/2 + (3 sqrt3/4) mu^2 - (3 sqrt3/4) mu^3 + O(mu^4)',
      sp.simplify(sp.series(sp.sqrt(ym_ser), m, 0, 4).removeO()
                  - (sp.sqrt(3)/2 + 3*sp.sqrt(3)/4*m**2 - 3*sp.sqrt(3)/4*m**3)) == 0)
# mu -> 0, divergent roots: y = Yv/mu^2
Yv = sp.symbols('Yv')
QA = sp.expand(sp.expand(Qexp.subs(y, Yv/m**2))*m**2)
QA0 = sp.factor(QA.subs(m, 0))
check('4b mu^2 Q(mu, Y/mu^2) is polynomial; at mu = 0 it is 64 Y (27Y^2 - 18Y - 1)',
      sp.Poly(QA, m, Yv) is not None and sp.expand(QA0 - 64*Yv*(27*Yv**2 - 18*Yv - 1)) == 0)
Y0 = (3 + 2*sp.sqrt(3))/9
ds = sp.symbols('d1:5')
YA = Y0 + sum(ds[i]*m**(i + 1) for i in range(4))
exA = sp.expand(QA.subs(Yv, YA))
sold = {}
for k in range(1, 5):
    co = sp.expand(exA.coeff(m, k).subs(sold))
    sold[ds[k - 1]] = sp.radsimp(sp.simplify(sp.solve(co, ds[k - 1])[0]))
YA_ser = YA.subs(sold)
print('   mu^2 y_+(mu) =', [sp.nsimplify(sp.radsimp(YA_ser.coeff(m, k))) for k in range(5)], '(coeffs of mu^0..mu^4)')
PA_ser = sp.series(sp.sqrt(YA_ser), m, 0, 4).removeO()
sY0 = sp.sqrt(3 + 2*sp.sqrt(3))/3
PA_rat = [sp.nsimplify(sp.simplify(PA_ser.coeff(m, k)/sY0)) for k in range(4)]
print('   mu P_+(mu) = sqrt(3+2sqrt3)/3 * (%s + %s mu + %s mu^2 + %s mu^3) + O(mu^4)' % tuple(PA_rat))
check('4b P_+(mu) = (sqrt(3+2sqrt3)/3) (1/mu + 1/2 + mu/4 - mu^2/8 + O(mu^3))',
      PA_rat == [1, sp.Rational(1, 2), sp.Rational(1, 4), sp.Rational(-1, 8)])
print('   (the other root of 27Y^2-18Y-1, Y = (3-2sqrt3)/9 < 0, is the negative root y3 ~ Y/mu^2)')
# minimizer of the A- branch as mu -> 0: root of K near C = -1 (K(0,C) = 2(C+1)(2C^2+2C-1))
check('4c K(0, C) = 2(C+1)(2C^2+2C-1): minimizers tend to C_- = -1, C_+ = (sqrt3-1)/2; 3rd root -> -(1+sqrt3)/2',
      sp.expand(Kc.subs(m, 0) - 2*(C + 1)*(2*C**2 + 2*C - 1)) == 0)
ks_ = sp.symbols('k1:5')
Cm = -1 + sum(ks_[i]*m**(i + 1) for i in range(4))
exK = sp.expand(Kc.subs(C, Cm))
solk = {}
for k in range(1, 5):
    co = sp.expand(exK.coeff(m, k).subs(solk))
    solk[ks_[k - 1]] = sp.solve(co, ks_[k - 1])[0]
Cm_ser = Cm.subs(solk)
print('   C_-(mu) = sqrtR cos(theta_-*) =', Cm_ser, '+ O(mu^5)')
sep2 = sp.series((R + 1 + 2*Cm_ser)/(1 + m)**2, m, 0, 5).removeO()
print('   |z3 - z2|^2/|z2 - z1|^2 = |w - 1|^2 = (R + 1 + 2C)/(1+mu)^2 =', sp.expand(sep2), '+ O(mu^5)')
check('4c at the A- minimizer |z3 - z2|/|z2 - z1| = mu + O(mu^2): the weak pair (2,3) closes up',
      sp.expand(sep2).coeff(m, 2) == 1 and sp.expand(sep2).coeff(m, 1) == 0
      and sp.expand(sep2).coeff(m, 0) == 0)

# mu -> 1
al, be = sp.symbols('alpha beta')
ex1 = sp.expand(Qexp.subs({m: 1 + eps, y: 2 + al*eps + be*eps**2}))
e2 = sp.factor(ex1.coeff(eps, 2))
check('4d at mu = 1+eps: Q(1+eps, 2+alpha eps) has no eps^0, eps^1 terms', ex1.coeff(eps, 0) == 0 and sp.expand(ex1.coeff(eps, 1)) == 0)
alphas = sp.solve(e2, al)
print('   eps^2 coefficient:', e2, ' -> alpha =', alphas)
slopes = sorted([sp.nsimplify(a/(2*sp.sqrt(2))) for a in alphas], key=lambda t: float(t))
print('   P_(branch)(1+eps) = sqrt2 + alpha/(2 sqrt2) eps + O(eps^2), slopes dP/dmu at mu = 1:', slopes)
check('4d alpha = +-3 sqrt2/2, so the branch slopes at mu = 1 are dP/dmu = +-3/4',
      sorted(slopes, key=float) == [sp.Rational(-3, 4), sp.Rational(3, 4)])
SLOPES = [float(t) for t in slopes]

# ==================================================================================
hdr('5. Direct Biot-Savart at 50 digits  [numerical, mpmath]')
# ==================================================================================
mp.mp.dps = 50


def kappas_direct(Gs, zs):
    """kappa_j = (dz_j/dt)/(z_j - z_c) straight from the Biot-Savart sum."""
    zc = sum(g*zz for g, zz in zip(Gs, zs))/sum(Gs)
    out = []
    for j in range(3):
        sm = sum(Gs[k]/(zs[j] - zs[k]) for k in range(3) if k != j)
        v = mp.conj(sm/(2*mp.pi*mp.mpc(0, 1)))
        out.append(v/(zs[j] - zc))
    return out, zc


def Gams(mu):
    mu = mp.mpf(mu)
    return [mp.mpf(1), mu, -mu/(1 + mu)]


def config_theta(mu, th):
    mu = mp.mpf(mu)
    qq = mp.sqrt(1 + mu + mu**2)
    Eb = mp.expj(-th)
    return [mu*(1 + qq*Eb)/(1 + mu)**2, (mu - qq*Eb)/(1 + mu)**2, mp.mpc(1)]


def kappa_formula(mu, th):
    mu = mp.mpf(mu)
    qq = mp.sqrt(1 + mu + mu**2)
    EE = mp.expj(th)
    return mp.mpc(0, 1)*(1 + mu)**3/(2*mp.pi*qq)*(qq + (1 - mu)*EE)/((qq - mu*EE)*(qq + EE))


def P_formula(mu, th):
    mu = mp.mpf(mu)
    qq = mp.sqrt(1 + mu + mu**2)
    RR = 1 + mu + mu**2
    cc, ss = mp.cos(th), mp.sin(th)
    return (2*RR*(1 - mu + mu**2) + 2*mu*RR*ss**2 + (1 - mu)*(2 + mu + 2*mu**2)*qq*cc) / \
        (2*mu*qq*ss*(1 - mu + 2*qq*cc))


def P_of_kappa(k):
    return abs(k.imag)/(-2*k.real)


maxdev = mp.mpf(0)
maxdevP = mp.mpf(0)
cases = 0
for mu in ['0.5', '0.1', '0.37', '1', '2.5', '7']:
    for th in ['0.3', '1.1', '2.2', '3.5', '4.4', '5.9']:
        muv, thv = mp.mpf(mu), mp.mpf(th)
        zs = config_theta(muv, thv)
        ks, zc = kappas_direct(Gams(muv), zs)
        kf = kappa_formula(muv, thv)
        maxdev = max(maxdev, max(abs(kk - kf)/abs(kf) for kk in ks), abs(zc))
        if ks[0].real < 0:
            maxdevP = max(maxdevP, abs(P_of_kappa(ks[0]) - P_formula(muv, thv)))
        cases += 1
check('5a 36 (mu, theta) pairs: the three Biot-Savart kappa_j equal the product formula',
      maxdev < mp.mpf('1e-45'), 'max rel dev %s' % mp.nstr(maxdev, 3))
check('5a on the collapsing ones, P from kappa equals the closed-form P(theta; mu)',
      maxdevP < mp.mpf('1e-45'), 'max abs dev %s' % mp.nstr(maxdevP, 3))
check('5a mu = 1/2: P(theta) matches the known formula at theta = 0.4 and 3.7',
      all(abs(P_formula(mp.mpf('0.5'), mp.mpf(t)) -
              (14*mp.sin(mp.mpf(t))**2 + 6*mp.sqrt(7)*mp.cos(mp.mpf(t)) + 21) /
              (2*(14*mp.cos(mp.mpf(t)) + mp.sqrt(7))*mp.sin(mp.mpf(t)))) < mp.mpf('1e-45') for t in ['0.4', '3.7']))


# Independent parametrization: z1 = 0, z2 = 1, z3 = r e^{i phi}, r solving the impulse equation,
# then a random similarity map.  No use of theta or of the circle's center.
def w_of_phi(mu, phi):
    mu = mp.mpf(mu)
    cp = mp.cos(phi)
    r = (mu*cp + mp.sqrt(mu**2*cp**2 + 1 + mu))/(1 + mu)   # (1+mu) r^2 - 2 mu r cos(phi) - 1 = 0
    return r*mp.expj(phi)


rng = mp.mpf('0.1234567')
maxdev2 = mp.mpf(0)
for mu in ['0.2', '0.5', '0.8', '1.7', '4']:
    muv = mp.mpf(mu)
    Gs = Gams(muv)
    for phi in ['-2.5', '-1.3', '-0.4', '0.2', '0.9', '2.6']:
        w = w_of_phi(muv, mp.mpf(phi))
        a = mp.mpc('0.7', '-1.9')
        b = mp.mpc('3.1', '0.4')
        zs = [b, a + b, a*w + b]                     # arbitrary similarity image
        imp = sum(Gs[j]*Gs[k]*abs(zs[j] - zs[k])**2 for j in range(3) for k in range(j + 1, 3))
        ks, zc = kappas_direct(Gs, zs)
        # theta of this shape: e^{i theta} = (mu - (1+mu) w)/sqrt(R)
        th = mp.arg((muv - (1 + muv)*w)/mp.sqrt(1 + muv + muv**2))
        kf = kappa_formula(muv, th)*abs(zs[2] - zc)**-2   # kappa scales as 1/L^2
        maxdev2 = max(maxdev2, abs(imp), max(abs(kk - kf)/abs(kf) for kk in ks))
check('5b 30 zero-impulse triangles built independently (polar solve + random similarity):'
      ' kappa_j coincide and equal the formula (scaled by 1/|z3-zc|^2)',
      maxdev2 < mp.mpf('1e-45'), 'max dev %s' % mp.nstr(maxdev2, 3))

# ODE integration check (RK4, 30 digits): t_c and rotation from kappa_0
mp.mp.dps = 30


def rhs(Gs, zs):
    out = []
    for j in range(3):
        sm = sum(Gs[k]/(zs[j] - zs[k]) for k in range(3) if k != j)
        out.append(mp.conj(sm/(2*mp.pi*mp.mpc(0, 1))))
    return out


worst = mp.mpf(0)
for (mu, arc) in [('0.3', '+'), ('0.3', '-'), ('2', '+'), ('2', '-')]:
    muv = mp.mpf(mu)
    th0 = mp.acos((muv - 1)/(2*mp.sqrt(1 + muv + muv**2)))
    thv = th0/2 if arc == '+' else mp.pi + (mp.pi - th0)/2     # middle of arc A+ / A-
    Gs = Gams(muv)
    zs = config_theta(muv, thv)
    k0 = kappa_formula(muv, thv)
    assert k0.real < 0
    tc = -1/(2*k0.real)
    T = mp.mpf('0.9')*tc
    nsteps = 3000
    h = T/nsteps
    z = list(zs)
    for _ in range(nsteps):
        k1 = rhs(Gs, z)
        k2 = rhs(Gs, [z[j] + h/2*k1[j] for j in range(3)])
        k3 = rhs(Gs, [z[j] + h/2*k2[j] for j in range(3)])
        k4 = rhs(Gs, [z[j] + h*k3[j] for j in range(3)])
        z = [z[j] + h/6*(k1[j] + 2*k2[j] + 2*k3[j] + k4[j]) for j in range(3)]
    # exact self-similar solution: z_j(t) = z_j(0) (1 + 2 Re k0 t)^{k0/(2 Re k0)}   (z_c = 0)
    fac = mp.power(1 + 2*k0.real*T, k0/(2*k0.real))
    dev = max(abs(z[j] - zs[j]*fac) for j in range(3))
    worst = max(worst, dev)
    print('   ODE mu=%s arc A%s theta=%s: t_c=%s, omega0=%s, P=%s, |z(0.9 t_c) - self-similar| = %s'
          % (mu, arc, mp.nstr(thv, 6), mp.nstr(tc, 10), mp.nstr(k0.imag, 10), mp.nstr(P_of_kappa(k0), 12), mp.nstr(dev, 3)))
check('5c RK4 integration to 0.9 t_c follows z(0)(1 + 2 Re(k0) t)^{k0/(2 Re k0)}', worst < mp.mpf('1e-9'),
      'max dev %s' % mp.nstr(worst, 3))

# ==================================================================================
hdr('6. Branch minima by direct minimization; rational mu factorization table')
# ==================================================================================


def P_phi(mu, phi):
    Gs = Gams(mu)
    w = w_of_phi(mu, phi)
    ks, _ = kappas_direct(Gs, [mp.mpc(0), mp.mpc(1), w])
    return ks[0]


def golden_min(fun, a, b, tol):
    g = (mp.sqrt(5) - 1)/2
    x1 = b - g*(b - a)
    x2 = a + g*(b - a)
    f1, f2 = fun(x1), fun(x2)
    while b - a > tol:
        if f1 < f2:
            b, x2, f2 = x2, x1, f1
            x1 = b - g*(b - a)
            f1 = fun(x1)
        else:
            a, x1, f1 = x1, x2, f2
            x2 = a + g*(b - a)
            f2 = fun(x2)
    xm = (a + b)/2
    return xm, fun(xm)


def branch_minima_direct(mu, tol):
    """Direct minimization of P over the zero-impulse circle, parametrized by the polar angle phi of
    z3 seen from z1 (z1 = 0, z2 = 1).  A+ <-> phi in (-pi, -pi/3), A- <-> phi in (0, pi/3)."""
    mu = mp.mpf(mu)
    # sanity: sign of Re kappa on the four arcs between collinear and equilateral points
    signs = [mp.sign(P_phi(mu, mp.mpf(p)).real) for p in ['-2.0', '-0.5', '0.5', '2.0']]
    assert signs == [-1, 1, -1, 1], signs
    fP = lambda p: P_of_kappa(P_phi(mu, p))
    _, Pp = golden_min(fP, -mp.pi, -mp.pi/3, tol)
    _, Pm = golden_min(fP, mp.mpf(0), mp.pi/3, tol)
    return Pp, Pm


def branch_minima_poly(mu):
    """Positive roots of Q(mu, y): returns (P_+, P_-) sorted by the arc they belong to."""
    muv = mp.mpf(mu)
    coeffs = [sp.lambdify(m, cf, 'mpmath')(muv) for cf in Qp.all_coeffs()]
    rts = mp.polyroots(coeffs, maxsteps=200, extraprec=200)
    pos = sorted([mp.sqrt(mp.re(r)) for r in rts if abs(mp.im(r)) < mp.mpf(10)**(-mp.mp.dps + 10) and mp.re(r) > 0])
    return pos


mp.mp.dps = 50
chk = branch_minima_direct(mp.mpf(1)/2, mp.mpf('1e-22'))
print('   mu = 1/2 direct:  P_+ (arc (0,theta0)) = %s,  P_- (arc (pi, 2pi-theta0)) = %s'
      % (mp.nstr(chk[0], 20), mp.nstr(chk[1], 20)))
check('6a mu = 1/2 direct minima = 2.2038550160361327, 1.0647059762712043',
      abs(chk[0] - mp.mpf('2.2038550160361327')) < 1e-15 and abs(chk[1] - mp.mpf('1.0647059762712043')) < 1e-15)
for mu, ref in [('0.9', (1.4983, 1.3399)), ('0.99', (1.4218, 1.4067)), ('0.999', (1.41496, 1.41346))]:
    dd = branch_minima_direct(mp.mpf(mu), mp.mpf('1e-20'))
    ok = abs(dd[0] - ref[0]) < 6e-5 and abs(dd[1] - ref[1]) < 6e-5
    check('6a mu = %s direct (P_+, P_-) = (%s, %s) vs stated %s' % (mu, mp.nstr(dd[0], 8), mp.nstr(dd[1], 8), ref), ok)

MU_LIST = ['1/3', '2/3', '1/4', '3/4', '2/5', '3/5', '1/5', '4/5', '1/6', '5/6', '2/7', '3/7']
x_ = sp.symbols('x')
TABLE4 = []
for mstr in MU_LIST + ['1/2']:
    mr = sp.Rational(mstr)
    Qy = sp.Poly(sp.expand(Qexp.subs(m, mr)), y)
    Qy = sp.Poly(Qy.as_expr()*sp.ilcm(*[sp.Rational(t).q for t in Qy.all_coeffs()]), y)
    cont = sp.igcd(*[int(t) for t in Qy.all_coeffs()])
    Qy = sp.Poly(Qy.as_expr()/cont, y)
    fy = sp.factor_list(Qy.as_expr())
    Qx = sp.Poly(Qy.as_expr().subs(y, x_**2), x_)
    fx = sp.factor_list(Qx.as_expr())
    irr_y = len(fy[1]) == 1 and fy[1][0][1] == 1
    irr_x = len(fx[1]) == 1 and fx[1][0][1] == 1
    Rn = sp.Rational(1) + mr + mr**2
    sqrtR = sp.sqrt(Rn)
    if sqrtR.is_rational:
        fxK = fx
        irr_xK = irr_x
        Ktxt = 'sqrt R = %s rational' % sqrtR
    else:
        fxK = sp.factor_list(Qx.as_expr(), extension=sqrtR)
        irr_xK = len(fxK[1]) == 1 and fxK[1][0][1] == 1
        Ktxt = 'over Q(%s): %s' % (sqrtR, 'irreducible' if irr_xK else 'factors')
    # numerical minima: direct minimization vs polynomial roots
    Pp, Pm = branch_minima_direct(mp.mpf(mr.p)/mr.q, mp.mpf('1e-22'))
    xroots = mp.polyroots([mp.mpf(int(t)) for t in Qx.all_coeffs()], maxsteps=300, extraprec=300)
    posx = sorted([mp.re(r) for r in xroots if abs(mp.im(r)) < mp.mpf('1e-30') and mp.re(r) > 0])
    dev = max(min(abs(Pp - r) for r in posx), min(abs(Pm - r) for r in posx))
    TABLE4.append(dict(mu=mstr, Qy=Qy.as_expr(), Qx=Qx.as_expr(), irr_y=irr_y, irr_x=irr_x, Ktxt=Ktxt,
                       Pp=Pp, Pm=Pm, dev=dev, npos=len(posx), fy=fy))
    print('\n   mu = %s' % mstr)
    print('     Q_mu(y) (primitive) = %s' % Qy.as_expr())
    print('     factor over Q in y: %s' % ('irreducible cubic' if irr_y else fy))
    print('     sextic in P = Q_mu(P^2): %s;  %s' % ('irreducible over Q' if irr_x else fx, Ktxt))
    print('     direct min  P_+ (arc (0,th0)) = %s   P_- (arc (pi,2pi-th0)) = %s'
          % (mp.nstr(Pp, 25), mp.nstr(Pm, 25)))
    print('     positive roots of sextic: %s;  |direct - root| <= %s' % ([mp.nstr(r, 25) for r in posx], mp.nstr(dev, 3)))
    check('6b mu=%s: Q_mu irreducible over Q (both in y and as sextic in P); minima = its 2 positive roots' % mstr,
          irr_y and irr_x and len(posx) == 2 and dev < mp.mpf('1e-38'))

# Search for rational mu with reducible Q_mu(y) (it has a rational root then), mu = a/b in (0,1],
# b <= BMAX.  By the palindromic symmetry this covers mu = b/a as well.
BMAX = 60
redu = []
for b in range(1, BMAX + 1):
    for a in range(1, b + 1):
        if sp.igcd(a, b) != 1:
            continue
        mr = sp.Rational(a, b)
        Qy = sp.Poly(sp.expand(Qexp.subs(m, mr)*b**12), y)
        fl_ = sp.factor_list(Qy.as_expr())
        if not (len(fl_[1]) == 1 and fl_[1][0][1] == 1):
            redu.append((str(mr), fl_))
print('\n   rational mu = a/b in (0,1], b <= %d, with Q_mu(y) reducible over Q:' % BMAX)
for r_ in redu:
    print('     mu =', r_[0], '->', r_[1])
check('6c search b <= %d: only mu = 1 gives a reducible Q_mu(y)' % BMAX, [r_[0] for r_ in redu] == ['1'],
      [r_[0] for r_ in redu])
print('   Lemma: if Q_mu(y) is irreducible over Q then Q_mu(x^2) is irreducible: y1 y2 y3 =')
print('   -3 A0^2/(1728 mu^4 (1+mu)^4) = -(A0/(24 mu^2 (1+mu)^2))^2 < 0 is not a square in Q, so y1 is')
print('   not a square in Q(y1) and [Q(sqrt y1):Q] = 6.  So P_+ and P_- are Galois conjugates of degree 6.')
check('6d y1 y2 y3 = -(A0/(24 mu^2 (1+mu)^2))^2',
      sp.simplify(-Qp.all_coeffs()[3]/Qp.all_coeffs()[0] + (A0/(24*m**2*(1 + m)**2))**2) == 0)

# ==================================================================================
hdr('7. Branch minima on a grid of mu; monotonicity; limits  [exact argument + numerics]')
# ==================================================================================
resQ = sp.factor(sp.resultant(Qexp, sp.diff(Qexp, m), y))
print('   Res_y(Q, dQ/dmu) =', resQ)
fac_ok = True
for fac, mult in sp.factor_list(resQ)[1]:
    rts = [r for r in sp.Poly(fac, m).real_roots() if r > 0]
    if rts and rts != [1]:
        fac_ok = False
check('7a Res_y(Q, dQ/dmu) has no zero in (0,1) U (1,inf): dy/dmu = -Q_mu/Q_y never vanishes there,'
      ' so each branch minimum is strictly monotone on (0,1) and on (1,inf)', fac_ok)
print('   With disc_y Q != 0 on (0,1), the branches never cross there; P_- < P_+ at mu = 1/2, so')
print('   min over branches = P_- on (0,1]: strictly increasing from sqrt3/2 (mu->0+) to sqrt2 (mu=1).')

mp.mp.dps = 30
GRID = ['0.0001', '0.001', '0.01', '0.02', '0.05', '0.1', '0.15', '0.2', '0.25', '0.3', '0.35', '0.4', '0.45', '0.5',
        '0.55', '0.6', '0.65', '0.7', '0.75', '0.8', '0.85', '0.9', '0.95', '0.99', '0.999', '1']
rows = []
worstgrid = mp.mpf(0)
for g in GRID:
    muv = mp.mpf(g)
    Pp, Pm = branch_minima_direct(muv, mp.mpf('1e-13'))
    pr = branch_minima_poly(muv)
    if g == '1':
        devg = max(abs(Pp - mp.sqrt(2)), abs(Pm - mp.sqrt(2)))
    else:
        devg = max(abs(Pm - pr[0]), abs(Pp - pr[1]))
    worstgrid = max(worstgrid, devg)
    rows.append((g, Pp, Pm, devg))
print('\n   %-8s %-24s %-24s %-10s %s' % ('mu', 'P_+ min on (0,th0)', 'P_- min on (pi,2pi-th0)', 'argmin', '|direct-poly|'))
for g, Pp, Pm, devg in rows:
    print('   %-8s %-24s %-24s %-10s %s' % (g, mp.nstr(Pp, 18), mp.nstr(Pm, 18), 'A-' if Pp - Pm > 1e-20 else 'tie' if abs(Pp - Pm) <= 1e-20 else 'A+',
                                         mp.nstr(devg, 2)))
check('7b grid: direct minimization agrees with the roots of Q (abs. dev < 1e-20)', worstgrid < mp.mpf('1e-20'),
      mp.nstr(worstgrid, 3))
mono = all(rows[i][2] < rows[i + 1][2] and rows[i][1] > rows[i + 1][1] for i in range(len(rows) - 1))
check('7b grid: P_- increasing, P_+ decreasing, P_- < P_+ for mu < 1', mono and all(r[2] < r[1] for r in rows[:-1]))
# asymptotics vs numerics
for g in ['0.0001', '0.001', '0.01']:
    muv = mp.mpf(g)
    Pp, Pm = [r for r in rows if r[0] == g][0][1:3]
    am = mp.sqrt(3)/2 + 3*mp.sqrt(3)/4*muv**2 - 3*mp.sqrt(3)/4*muv**3
    ap = mp.sqrt(3 + 2*mp.sqrt(3))/3*(1/muv + mp.mpf(1)/2 + muv/4)
    print('   mu=%s: P_- - [sqrt3/2 + 3sqrt3/4 mu^2 - 3sqrt3/4 mu^3] = %s ;  P_+ - sqrt(3+2sqrt3)/3 (1/mu + 1/2 + mu/4) = %s'
          % (g, mp.nstr(Pm - am, 3), mp.nstr(Pp - ap, 3)))
Pp4, Pm4 = [r for r in rows if r[0] == '0.0001'][0][1:3]
check('7c mu = 1e-4: P_- - sqrt3/2 - (3sqrt3/4)mu^2 = O(mu^3) and mu P_+ - (sqrt(3+2sqrt3)/3)(1 + mu/2) = O(mu^2)',
      abs(Pm4 - mp.sqrt(3)/2 - 3*mp.sqrt(3)/4*mp.mpf('1e-8')) < 3e-12
      and abs(mp.mpf('1e-4')*Pp4 - mp.sqrt(3 + 2*mp.sqrt(3))/3*(1 + mp.mpf('0.5e-4'))) < 3e-9)
# slopes at mu = 1
h_ = mp.mpf('1e-6')
Pa, Pb = branch_minima_direct(1 - h_, mp.mpf('1e-15'))
num_slopes = sorted([(Pa - mp.sqrt(2))/(-h_), (Pb - mp.sqrt(2))/(-h_)])
check('7d slopes dP/dmu at mu = 1 match the exact values %s' % [round(t, 12) for t in SLOPES],
      all(abs(num_slopes[i] - SLOPES[i]) < 1e-5 for i in range(2)), [mp.nstr(t, 10) for t in num_slopes])

# ==================================================================================
hdr('8. Symmetry mu -> 1/mu  [exact + numerical]')
# ==================================================================================
kap_sw = kap_c.subs({m: 1/m, q: q/m, E: -E}, simultaneous=True)
check('8a kappa(theta + pi; 1/mu) = kappa(theta; mu)/mu  (exact; sqrt R(1/mu) = sqrt R/mu)',
      red_q(kap_sw - kap_c/m) == 0)
print('   Relabelling 1<->2 and scaling circulations by mu maps Gamma(1/mu) to mu Gamma(mu), w -> 1 - w,')
print('   theta -> theta + pi.  cos theta0(1/mu) = -cos theta0(mu), so arc A+(mu) = (0, theta0) maps onto')
print('   (pi, pi + theta0(mu)) = (pi, 2pi - theta0(1/mu)) = arc A-(1/mu):  P_+(mu) = P_-(1/mu).')
Ksw = sp.factor(sp.cancel(Kc.subs({m: 1/m, C: -C/m}, simultaneous=True)/Kc))
check('8a K(1/mu, -C/mu) = K(mu, C)/mu^4  (critical points map to critical points, C -> -C/mu)',
      sp.simplify(Ksw - 1/m**4) == 0, 'ratio = %s' % Ksw)
mp.mp.dps = 40
worst_sym = mp.mpf(0)
for mu in ['0.5', '0.3', '0.8', '0.05']:
    muv = mp.mpf(mu)
    a = branch_minima_direct(muv, mp.mpf('1e-18'))
    b = branch_minima_direct(1/muv, mp.mpf('1e-18'))
    worst_sym = max(worst_sym, abs(a[0] - b[1]), abs(a[1] - b[0]))
    print('   mu=%-5s (P_+, P_-) = (%s, %s);  mu=1/%s: (P_+, P_-) = (%s, %s)'
          % (mu, mp.nstr(a[0], 16), mp.nstr(a[1], 16), mu, mp.nstr(b[0], 16), mp.nstr(b[1], 16)))
    for th in ['0.2', '0.7']:
        thv = mp.mpf(th)
        k1 = kappas_direct(Gams(muv), config_theta(muv, thv))[0][0]
        k2 = kappas_direct(Gams(1/muv), config_theta(1/muv, thv + mp.pi))[0][0]
        worst_sym = max(worst_sym, abs(k2 - k1/muv))
check('8b numerically P_+(mu) = P_-(1/mu), P_-(mu) = P_+(1/mu), and Biot-Savart kappa(theta+pi;1/mu) = kappa/mu',
      worst_sym < mp.mpf('1e-30'), mp.nstr(worst_sym, 3))

# ==================================================================================
hdr('9. Every rational mu > 0, mu != 1: Q_mu irreducible  [exact: genus-1 curve with 6 rational points]')
# ==================================================================================
# Step 1: for rational mu != 1, Q_mu has a rational root  <=>  K(mu, .) has a rational root.
#   (roots of Q_mu are y_i = Phi(C_i), Phi in Q(mu)(C), distinct for mu != 1; a Galois element fixing
#    y_1 must fix C_1.)
# Step 2: rational points of the plane quartic K(mu, C) = 0.
ta, aa, Yg = sp.symbols('t a Y_g')
Kline = sp.expand(Kc.subs({m: -1 + aa, C: -1 + ta*aa}))
Aq = -2*(ta - 1)*(2*ta**2 - 2*ta - 1)
Bq = (2*ta - 1)*(4*ta**2 - 2*ta - 3)
Cq = -(2*ta - 1)**2
Gt = 16*ta**4 - 32*ta**3 + 12*ta**2 + 4*ta + 1
check('9a K(-1+a, -1+t a) = a^2 (A a^2 + B a + Cq): (mu,C) = (-1,-1) is a tacnode (tangent cone -(a-2b)^2)',
      sp.expand(Kline - aa**2*(Aq*aa**2 + Bq*aa + Cq)) == 0)
check('9a B^2 - 4 A Cq = (2t-1)^2 G(t),  G(t) = 16t^4 - 32t^3 + 12t^2 + 4t + 1',
      sp.expand(Bq**2 - 4*Aq*Cq - (2*ta - 1)**2*Gt) == 0)
# Step 3: Y^2 = G(t) is isomorphic to E: Y^2 = X^3 - 15X + 22 (Connell's map from the point (0,1))
vv, xx, yy = sp.symbols('v x y')
xs_ = (2*(vv + 1) + 4*ta)/ta**2
ys_ = (4*(vv + 1) + 2*(4*ta + 12*ta**2) - 8*ta**2)/ta**3
a1_, a2_, a3_, a4_, a6_ = 4, 8, -64, -64, -512
b2_ = a1_**2 + 4*a2_
Xs = (36*xs_ + 3*b2_)/144
Ys = 108*(2*ys_ + a1_*xs_ + a3_)/1728
eqE = sp.numer(sp.together(Ys**2 - (Xs**3 - 15*Xs + 22)))
eqE = sp.Poly(sp.expand(eqE), vv).rem(sp.Poly(vv**2 - Gt, vv)).as_expr()
check('9b (t, v) -> (X, Y) maps v^2 = G(t) onto E: Y^2 = X^3 - 15X + 22', sp.expand(eqE) == 0)
ui_ = (2*(xx + 12) - 8)/yy
back = sp.numer(sp.together(ui_.subs({xx: xs_, yy: ys_}) - ta))
back = sp.Poly(sp.expand(back), vv).rem(sp.Poly(vv**2 - Gt, vv)).as_expr()
check('9b the map is birational (explicit inverse t = (2(x+c) - d^2/2)/y verified), so C_G(Q) = E(Q) in number',
      sp.expand(back) == 0)
cE4 = b2_**2 - 24*(2*a4_ + a1_*a3_)
cE6 = -b2_**3 + 36*b2_*(2*a4_ + a1_*a3_) - 216*(a3_**2 + 4*a6_)
check('9b j(E) = 54000 (CM by Z[sqrt(-3)])', sp.Rational(1728*cE4**3, cE4**3 - cE6**2) == 54000)


def count_Fp(pp):
    return 1 + sum(1 for X_ in range(pp) for Y_ in range(pp) if (Y_*Y_ - (X_**3 - 15*X_ + 22)) % pp == 0)


tors_pts = [(2, 0), (3, 2), (3, -2), (-1, 6), (-1, -6)]
check('9c E(Q) torsion = Z/6: points O,(2,0),(3,+-2),(-1,+-6); #E(F_5) = 6, #E(F_7) = 12 bound it by gcd = 6',
      all(Y_**2 == X_**3 - 15*X_ + 22 for X_, Y_ in tors_pts) and count_Fp(5) == 6 and count_Fp(7) == 12,
      '#E(F5)=%d #E(F7)=%d' % (count_Fp(5), count_Fp(7)))
# rank 0 by 2-isogeny descent on E: y^2 = x^3 + 6x^2 - 3x (X = x + 2), E': y^2 = x^3 - 12x^2 + 48x
check('9d E shifted: X^3 - 15X + 22 at X = x+2 equals x^3 + 6x^2 - 3x; E\' = x^3 - 12x^2 + 48x = (x-4)^3 + 64 ~ y^2 = x^3 + 1',
      sp.expand((xx + 2)**3 - 15*(xx + 2) + 22 - (xx**3 + 6*xx**2 - 3*xx)) == 0
      and sp.expand(xx**3 - 12*xx**2 + 48*xx - ((xx - 4)**3 + 64)) == 0)


def locally_insoluble(dd, aa_, bb, pp, kk):
    """No solution of w^2 = dd u^4 + aa_ u^2 v^2 + (bb/dd) v^4 mod pp^kk with (u, v) not both = 0 mod pp."""
    mod = pp**kk
    sq = set((w*w) % mod for w in range(mod))
    for u_ in range(mod):
        for v_ in range(mod):
            if u_ % pp == 0 and v_ % pp == 0:
                continue
            if (dd*u_**4 + aa_*u_**2*v_**2 + (bb//dd)*v_**4) % mod in sq:
                return False
    return True


ok_desc = (locally_insoluble(3, 6, -3, 3, 2) and locally_insoluble(-1, 6, -3, 3, 2)      # alpha(E) = {1, -3}
           and locally_insoluble(2, -12, 48, 2, 5) and locally_insoluble(6, -12, 48, 2, 5))  # alpha'(E') = {1, 3}
# negative d' for E': d' u^4 - 12 u^2 v^2 + (48/d') v^4 < 0 for real (u,v) != 0 (all coefficients < 0)
check('9d 2-isogeny descent: |alpha(E)| = 2 (d = 3, -1 fail 3-adically), |alpha\'(E\')| = 2 (d\' = 2, 6 fail 2-adically,'
      ' d\' < 0 fail over R)  =>  2^r = 2*2/4 = 1, rank 0; so #E(Q) = 6', ok_desc)
# Pull back: rational points of Y^2 = G(t): (0, +-1), (1, +-1), two at infinity -> points of K = 0
check('9e G(0) = G(1) = 1 (6 points with the two at infinity, leading coeff 16 = 4^2)', Gt.subs(ta, 0) == 1 and Gt.subs(ta, 1) == 1)
rat_pts = []
for tv in [0, 1]:
    qa = sp.Poly(Aq*aa**2 + Bq*aa + Cq, aa).subs if False else sp.Poly((Aq*aa**2 + Bq*aa + Cq).subs(ta, tv), aa)
    for r_ in sp.roots(qa, filter='Q'):
        rat_pts.append((-1 + r_, -1 + tv*r_))
rat_pts += [(sp.Integer(-1), sp.Rational(-1, 2)), (sp.Integer(-1), sp.Integer(-1))]   # line mu = -1: K = 4(C+1)^2(2C+1)
check('9e K(-1, C) = 4(C+1)^2(2C+1); line t = 1/2 meets the curve only at the tacnode; 2t^2-2t-1 has no rational root',
      sp.expand(Kc.subs(m, -1) - 4*(C + 1)**2*(2*C + 1)) == 0
      and sp.expand((Aq*aa**2 + Bq*aa + Cq).subs(ta, sp.Rational(1, 2))) == sp.Rational(-3, 2)*aa**2)
print('   all affine rational points of K(mu, C) = 0:', sorted(set(rat_pts)))
check('9e they all lie on K = 0 and all have mu <= 0',
      all(sp.expand(Kc.subs({m: a_, C: b_})) == 0 for a_, b_ in rat_pts) and all(a_ <= 0 for a_, _ in rat_pts))
# sanity: brute-force rational t = r/s on the quartic
found = set()
for s_ in range(1, 150):
    for r_ in range(-300, 301):
        if sp.igcd(r_, s_) != 1:
            continue
        val = 16*r_**4 - 32*r_**3*s_ + 12*r_**2*s_**2 + 4*r_*s_**3 + s_**4
        if val >= 0 and sp.integer_nthroot(val, 2)[1]:
            found.add(sp.Rational(r_, s_))
check('9f brute force t = r/s, s < 150, |r| <= 300: G(t) is a square only at t = 0, 1', found == {0, 1}, sorted(found))
print('   CONCLUSION (proved): for every rational mu > 0 with mu != 1, K(mu, .) has no rational root, hence')
print('   Q_mu(y) is an irreducible cubic, hence (6d) Q_mu(P^2) is an irreducible sextic: the two branch')
print('   minima are Galois-conjugate algebraic numbers of degree exactly 6.  At mu = 1 both equal sqrt 2.')

# ==================================================================================
hdr('10. Path length and spiral angle; Remark 2 and Groebli; Section 5; Proposition 1; Remark 1  [exact + numerical]')
# ==================================================================================
# 10a. Integrate the Biot-Savart ODE (RK4, 30 digits) and compare each vortex's distance to the
#      collision point, rotation angle, velocity angle and path length with the self-similar formulas.
mp.mp.dps = 30
w_r = w_ph = w_ang = w_len = mp.mpf(0)
for (mu, arc) in [('0.3', '+'), ('0.3', '-'), ('0.5', '-'), ('2', '+'), ('2', '-')]:
    muv = mp.mpf(mu)
    th0 = mp.acos((muv - 1)/(2*mp.sqrt(1 + muv + muv**2)))
    thv = th0/2 if arc == '+' else mp.pi + (mp.pi - th0)/2
    Gs = Gams(muv)
    zs = config_theta(muv, thv)                       # centre of vorticity at 0
    k0 = kappa_formula(muv, thv)
    tc = -1/(2*k0.real)
    Pk = P_of_kappa(k0)
    cos_pred = 1/mp.sqrt(1 + 4*Pk**2)                 # cos of the angle arctan(2P)
    T = mp.mpf('0.9')*tc
    nsteps = 3000
    h = T/nsteps
    z = list(zs)
    speeds = [[abs(v) for v in rhs(Gs, z)]]
    for i in range(nsteps):
        k1 = rhs(Gs, z)
        k2 = rhs(Gs, [z[j] + h/2*k1[j] for j in range(3)])
        k3 = rhs(Gs, [z[j] + h/2*k2[j] for j in range(3)])
        k4 = rhs(Gs, [z[j] + h*k3[j] for j in range(3)])
        z = [z[j] + h/6*(k1[j] + 2*k2[j] + 2*k3[j] + k4[j]) for j in range(3)]
        t = (i + 1)*h
        vel = rhs(Gs, z)
        speeds.append([abs(v) for v in vel])
        if (i + 1) % 300 == 0:
            lam2 = 1 - t/tc
            phi_pred = -k0.imag*tc*mp.log(lam2)
            for j in range(3):
                w_r = max(w_r, abs(abs(z[j])**2 - abs(zs[j])**2*lam2)/(abs(zs[j])**2*lam2))
                w_ph = max(w_ph, abs(mp.arg(z[j]/zs[j]*mp.expj(-phi_pred))))
                cos_meas = (vel[j]*mp.conj(-z[j])).real/(abs(vel[j])*abs(z[j]))
                w_ang = max(w_ang, abs(cos_meas - cos_pred))
    for j in range(3):                                # composite Simpson rule over the RK4 grid
        f = [sp_[j] for sp_ in speeds]
        L = h/3*(f[0] + f[-1] + 4*sum(f[1:-1:2]) + 2*sum(f[2:-1:2]))
        L_pred = mp.sqrt(1 + 4*Pk**2)*abs(zs[j])*(1 - mp.sqrt(1 - mp.mpf('0.9')))
        w_len = max(w_len, abs(L - L_pred)/L_pred)
    print('   mu=%s arc A%s: P=%s, 2P tan-angle check and path length to 0.9 t_c done' % (mu, arc, mp.nstr(Pk, 12)))
check('10a ODE to 0.9 t_c: |z_j - z_c|^2 = r_j0^2 (1 - t/t_c) for every vortex', w_r < mp.mpf('1e-9'), mp.nstr(w_r, 3))
check('10a ODE to 0.9 t_c: rotation angle = -omega0 t_c ln(1 - t/t_c) for every vortex', w_ph < mp.mpf('1e-9'), mp.nstr(w_ph, 3))
check('10a ODE: the velocity makes the angle arctan(2P) with the direction to the collision point',
      w_ang < mp.mpf('1e-9'), mp.nstr(w_ang, 3))
check('10a ODE: path length to 0.9 t_c = r_j0 sqrt(1 + 4P^2)(1 - sqrt(0.1))', w_len < mp.mpf('1e-9'), mp.nstr(w_len, 3))

# 10b. Remark 2: Gamma = (1, 1, -1/2), z1 = 0, z2 = 1, z3 = 1/2 + (sqrt3/2) e^{i beta}.
mp.mp.dps = 50
G11 = [mp.mpf(1), mp.mpf(1), mp.mpf(-1)/2]
def kappa_beta(beta):
    zs = [mp.mpc(0), mp.mpc(1), mp.mpf(1)/2 + mp.sqrt(3)/2*mp.expj(beta)]
    ks, _ = kappas_direct(G11, zs)
    return ks
dev_r2 = mp.mpf(0); arcs_ok = True
for bb in ['0.05', '0.3', '0.7', '1.2', '1.5', '3.2', '3.6', '4.0', '4.5', '4.7']:
    beta = mp.mpf(bb)
    ks = kappa_beta(beta)
    spread = max(abs(ks[j] - ks[0]) for j in range(3))/abs(ks[0])
    collapsing = ks[0].real < 0
    in_arc = (0 < beta < mp.pi/2) or (mp.pi < beta < 3*mp.pi/2)
    arcs_ok = arcs_ok and collapsing == in_arc and spread < mp.mpf('1e-45')
    if collapsing:
        dev_r2 = max(dev_r2, abs(P_of_kappa(ks[0]) - (3 - mp.cos(2*beta))/(2*mp.sin(2*beta))))
for bb in ['1.8', '2.5', '5.0', '6.0']:                 # the other two arcs expand
    arcs_ok = arcs_ok and kappa_beta(mp.mpf(bb))[0].real > 0
check('10b Remark 2: collapse exactly on 0 < beta < pi/2 and pi < beta < 3pi/2 (sampled), self-similar',
      arcs_ok)
check('10b Remark 2: Biot-Savart P = (3 - cos 2beta)/(2 sin 2beta) on the collapsing arcs', dev_r2 < mp.mpf('1e-45'),
      mp.nstr(dev_r2, 3))
fb = lambda bb: P_of_kappa(kappa_beta(bb)[0])
r2min = []
for (a_, b_) in [(mp.mpf('0.01'), mp.pi/2 - mp.mpf('0.01')), (mp.pi + mp.mpf('0.01'), 3*mp.pi/2 - mp.mpf('0.01'))]:
    bmin, Pmin_ = golden_min(fb, a_, b_, mp.mpf('1e-20'))
    r2min.append((Pmin_, mp.cos(2*bmin)))
check('10b Remark 2: on both arcs min P = sqrt 2 at cos 2beta = 1/3',
      all(abs(pm - mp.sqrt(2)) < mp.mpf('1e-30') and abs(cb - mp.mpf(1)/3) < mp.mpf('1e-15') for pm, cb in r2min),
      [(mp.nstr(pm, 20), mp.nstr(cb, 15)) for pm, cb in r2min])

# 10f. Equal circulations: the fastest collapse at a fixed distance between the two identical vortices
#      (the configuration of Leoncini, Kuznetsov and Zaslavsky 2000, Fig. 18) has t_c = 4 pi/3 and P = 3/2.
mp.mp.dps = 50
rate_b = lambda bb: -kappa_beta(bb)[0].real         # collapse rate; z1 = 0, z2 = 1 fixed
bfast = mp.findroot(lambda bb: mp.diff(rate_b, bb), mp.mpf('0.46'))
tc_fast = 1/(2*rate_b(bfast))
P_fast = P_of_kappa(kappa_beta(bfast)[0])
check('10f mu = 1: the fastest collapse at |z1 - z2| = 1 has t_c = 4 pi/3, P = 3/2, cos 2beta = 3/5',
      abs(tc_fast - 4*mp.pi/3) < mp.mpf('1e-40') and abs(P_fast - mp.mpf(3)/2) < mp.mpf('1e-40')
      and abs(mp.cos(2*bfast) - mp.mpf(3)/5) < mp.mpf('1e-40'),
      'beta=%s t_c=%s P=%s' % (mp.nstr(bfast, 15), mp.nstr(tc_fast, 15), mp.nstr(P_fast, 15)))

# 10g. Kimura 1987, Eq. (4.4): his rates A, B for Gamma = (2, 2, -1) in the Remark 2 parametrization.
#      Halving the circulations and restoring the 2 pi of his normalization, kappa = (A + iB)/(4 pi),
#      so his B/(-2A) is the Remark 2 formula for P.
dev_kim = mp.mpf(0)
for bb in ['0.05', '0.2', '0.35', '0.5', '0.65', '0.8', '0.95', '1.1', '1.3', '1.5']:
    beta = mp.mpf(bb)
    A_k = -6*mp.sin(2*beta)/(5 - 3*mp.cos(2*beta))
    B_k = (18 - 6*mp.cos(2*beta))/(5 - 3*mp.cos(2*beta))
    dev_kim = max(dev_kim, abs(kappa_beta(beta)[0] - mp.mpc(A_k, B_k)/(4*mp.pi)))
check('10g mu = 1: Kimura 1987 Eq. (4.4) gives kappa = (A + iB)/(4 pi) at ten angles of 0 < beta < pi/2',
      dev_kim < mp.mpf('1e-45'), 'max |kappa - (A + iB)/(4 pi)| = %s' % mp.nstr(dev_kim, 3))

# 10j. Remark 2, elementary forms (release 2.2.0). v = tan(chi) is positive on both collapsing arcs
#      (the paper writes v, since u = mu + 1 + 1/mu in Section 3).
uR2 = sp.symbols('v', positive=True)
chiR2 = sp.atan(uR2)
PuR2 = uR2 + 1/(2*uR2)
check('10j Remark 2: with v = tan chi, (3 - cos 2chi)/(2 sin 2chi) = v + 1/(2v)  (exact)',
      sp.simplify((3 - sp.cos(2*chiR2))/(2*sp.sin(2*chiR2)) - PuR2) == 0)
check('10j Remark 2: v + 1/(2v) - sqrt2 = (sqrt2 v - 1)^2/(2v); equality iff tan chi = 1/sqrt2, and then cos 2chi = 1/3',
      sp.simplify(PuR2 - sp.sqrt(2) - (sp.sqrt(2)*uR2 - 1)**2/(2*uR2)) == 0
      and sp.simplify(sp.cos(2*sp.atan(1/sp.sqrt(2))) - sp.Rational(1, 3)) == 0)
check('10j Remark 2: P is unchanged under v -> 1/(2v); v = 1 and v = 1/2 (cos 2chi = 3/5) both give P = 3/2',
      sp.simplify(PuR2.subs(uR2, 1/(2*uR2)) - PuR2) == 0 and PuR2.subs(uR2, 1) == sp.Rational(3, 2)
      and PuR2.subs(uR2, sp.Rational(1, 2)) == sp.Rational(3, 2)
      and sp.simplify(sp.cos(2*sp.atan(sp.Rational(1, 2))) - sp.Rational(3, 5)) == 0)
wR2 = sp.expand_complex(sp.Rational(1, 2) + sp.sqrt(3)/2*sp.exp(sp.I*sp.atan(1/sp.sqrt(2))))
check('10j Remark 2: at tan chi = 1/sqrt2, w = (1 + sqrt2)/2 + i/2, Im w/Re w = sqrt2 - 1 = tan(pi/8) and'
      ' Im w/(Re w - 1) = sqrt2 + 1 = tan(3pi/8): interior angles pi/8 at z1, 5pi/8 at z2, pi/4 at z3',
      sp.simplify(wR2 - ((1 + sp.sqrt(2))/2 + sp.I/2)) == 0
      and sp.simplify(sp.im(wR2)/sp.re(wR2) - sp.tan(sp.pi/8)) == 0
      and sp.simplify(sp.im(wR2)/(sp.re(wR2) - 1) - sp.tan(3*sp.pi/8)) == 0)
mp.mp.dps = 50
dev_u = mp.mpf(0); coll_u = True
for bb in ['0.2', '0.6', '1.3', '3.4', '4.5']:                      # both collapsing arcs
    beta = mp.mpf(bb)
    ku = kappa_beta(beta)[0]
    coll_u = coll_u and ku.real < 0
    dev_u = max(dev_u, abs(P_of_kappa(ku) - (mp.tan(beta) + 1/(2*mp.tan(beta)))))
check('10j Remark 2: Biot-Savart P = v + 1/(2v), v = tan beta, at five angles on both arcs', coll_u and dev_u < mp.mpf('1e-45'),
      'max difference %s' % mp.nstr(dev_u, 3))


def tri_angles(zs):
    out = []
    for j in range(3):
        a_, b_ = zs[(j + 1) % 3] - zs[j], zs[(j + 2) % 3] - zs[j]
        out.append(mp.acos((a_*mp.conj(b_)).real/(abs(a_)*abs(b_))))
    return out


dev_ang = mp.mpf(0)
for (a_, b_), want in [((mp.mpf('0.01'), mp.pi/2 - mp.mpf('0.01')), (1, 5, 2)),
                       ((mp.pi + mp.mpf('0.01'), 3*mp.pi/2 - mp.mpf('0.01')), (5, 1, 2))]:
    bmin, _ = golden_min(fb, a_, b_, mp.mpf('1e-25'))
    angs = tri_angles([mp.mpc(0), mp.mpc(1), mp.mpf(1)/2 + mp.sqrt(3)/2*mp.expj(bmin)])
    dev_ang = max(dev_ang, max(abs(an - k_*mp.pi/8) for an, k_ in zip(angs, want)))
check('10j Remark 2: the numerically located minimizers have interior angles (pi/8, 5pi/8, pi/4) on the first arc'
      ' and (5pi/8, pi/8, pi/4) on the second (z1, z2, z3)', dev_ang < mp.mpf('1e-15'), 'max deviation %s' % mp.nstr(dev_ang, 3))

# 10k. Groebli 1877, Sect. 10 (printed pp. 55-59), Eqs. (1), (5), (6), (8), (9), (11), (12), read in the original.
#      His circulations m_i, his shape parameters mu_i and shape constant a (the paper writes mu^G_i and a_G, since mu
#      and a are taken), and his coefficient varkappa (the paper's \varkappa, not its kappa): d theta = varkappa dt/(2t)
#      with s_i^2 = mu mu_i t, t measured from the collision, so P = |varkappa|/2 for every harmonic triple.
#      First m = (1, 1, -1/2), the case of Remark 2.
aG = sp.symbols('a_G', positive=True)
mG = [sp.Integer(1), sp.Integer(1), sp.Rational(-1, 2)]
MG = sum(mG)
muG = [aG - (mG[1] - mG[2])/mG[0], aG - (mG[2] - mG[0])/mG[1], aG - (mG[0] - mG[1])/mG[2]]      # his (8)
radG = 2*muG[1]*muG[2] + 2*muG[2]*muG[0] + 2*muG[0]*muG[1] - muG[0]**2 - muG[1]**2 - muG[2]**2
rateG = MG/sp.pi*sp.sqrt(radG)/(muG[0]*muG[1]*muG[2])                                                # his (9), original denominator
kG = MG/sp.pi*(2*aG**2 + (mG[1] - mG[2])*(mG[2] - mG[0])*(mG[0] - mG[1])/(mG[0]*mG[1]*mG[2])*aG - 3)/(rateG*muG[0]*muG[1]*muG[2])  # his (12)
PG = kG/2                                                                                           # his (11): d theta = varkappa dt/(2t), s^2 = lambda t
PGa = (2*aG**2 - 3)/(2*sp.sqrt(3*aG**2 - 9))
check('10k Groebli (8): at m = (1, 1, -1/2), muG_1 = a_G - 3/2, muG_2 = a_G + 3/2, muG_3 = a_G; radicand of (9) = 3a_G^2 - 9',
      [sp.simplify(muG[0] - (aG - sp.Rational(3, 2))), sp.simplify(muG[1] - (aG + sp.Rational(3, 2))), sp.simplify(muG[2] - aG)] == [0, 0, 0]
      and sp.expand(radG - (3*aG**2 - 9)) == 0)
check('10k Groebli (9), (11), (12): P = |varkappa|/2 = (2a_G^2 - 3)/(2 sqrt(3a_G^2 - 9))',
      sp.simplify(PG - PGa) == 0)
check('10k P^2 - 2 = (2a_G^2 - 9)^2/(12(a_G^2 - 3)): equality at a_G^2 = 9/2',
      sp.simplify(PGa**2 - 2 - (2*aG**2 - 9)**2/(12*(aG**2 - 3))) == 0)
# a_G = sqrt3/cos chi with v = tan chi > 0: cos chi = 1/sqrt(1 + v^2) on the first arc (the branch a_G > sqrt 3)
aU = sp.sqrt(3)*sp.sqrt(1 + uR2**2)
check('10k a_G = sqrt3/cos chi turns Groebli\'s P into v + 1/(2v), the formula of Remark 2 (branch a_G > sqrt3; P is even in a_G)',
      sp.simplify(PGa.subs(aG, aU) - PuR2) == 0)
cG = sp.symbols('c', real=True)                      # c = cos chi; |w|^2 and |w - 1|^2 at z1 = 0, z2 = 1, z3 = w
w2, wm12 = 1 + sp.sqrt(3)/2*cG, 1 - sp.sqrt(3)/2*cG
aC = sp.sqrt(3)/cG
check('10k with a_G = sqrt3/cos chi, muG_1 : muG_2 : muG_3 = |z2 - z3|^2 : |z3 - z1|^2 : |z1 - z2|^2 at the positions of Remark 2'
      ' (his (1), (5): s_i^2 = mu mu_i t)',
      sp.simplify((muG[0]/muG[2]).subs(aG, aC) - wm12) == 0 and sp.simplify((muG[1]/muG[2]).subs(aG, aC) - w2) == 0)
# Negative control: Goodman's translation prints the denominator of (9) as mu_1 mu_3 mu_3 in its (10.9). Run that
# coefficient through the same substitution: it does not give the formula of Remark 2.
rate_tr = MG/sp.pi*sp.sqrt(radG)/(muG[0]*muG[2]*muG[2])                                             # translation's (10.9)
k_tr = MG/sp.pi*(2*aG**2 - 3)/(rate_tr*muG[0]*muG[1]*muG[2])
dtr = sp.simplify((k_tr/2).subs(aG, aU) - PuR2)
dtr1 = dtr.subs(uR2, 1)                              # v = 1: Remark 2 gives P = 3/2
check('10k negative control: with the translation\'s denominator mu_1 mu_3 mu_3 in (10.9), a_G = sqrt3/cos chi does not give'
      ' v + 1/(2v): the difference is not identically 0, and at v = 1 it is far from 0',
      dtr != 0 and sp.simplify(dtr1) != 0 and abs(float(dtr1)) > 0.1, 'difference at v = 1: %s' % sp.simplify(dtr1))
# Every harmonic triple (m1, m2, -m1 m2/(m1 + m2)), symbolic in m1, m2 and a_G: his (6) holds, and with r_i^2
# proportional to muG_i the sum S of Lemma 6 at beta = 1, where coth(ln(r_k/r_j)) = (r_k^2 + r_j^2)/(r_k^2 - r_j^2),
# is -(2a_G^2 + [(m2 - m3)(m3 - m1)(m1 - m2)/(m1 m2 m3)] a_G - 3), the numerator of his (12). With 16 A^2 = the radicand
# of (9) (Heron), P = |S|/(8A) = |varkappa|/2.
g1, g2 = sp.symbols('m1 m2', positive=True)
mH = [g1, g2, -g1*g2/(g1 + g2)]
MH = sum(mH)
KH = (mH[1] - mH[2])*(mH[2] - mH[0])*(mH[0] - mH[1])/(mH[0]*mH[1]*mH[2])
muH = [aG - (mH[1] - mH[2])/mH[0], aG - (mH[2] - mH[0])/mH[1], aG - (mH[0] - mH[1])/mH[2]]
SH = sum(muH[i]*(muH[(i + 2) % 3] + muH[(i + 1) % 3])/(muH[(i + 2) % 3] - muH[(i + 1) % 3]) for i in range(3))
radH = 2*muH[1]*muH[2] + 2*muH[2]*muH[0] + 2*muH[0]*muH[1] - muH[0]**2 - muH[1]**2 - muH[2]**2
heronH = 2*(muH[0]*muH[1] + muH[1]*muH[2] + muH[2]*muH[0]) - muH[0]**2 - muH[1]**2 - muH[2]**2
check('10k every harmonic triple (symbolic m1, m2, a_G): his (6) holds, and Lemma 6 at beta = 1 with r_i^2 = muG_i gives'
      ' S = -(2a_G^2 + K a_G - 3), K = (m2 - m3)(m3 - m1)(m1 - m2)/(m1 m2 m3), and 16A^2 = the radicand of (9);'
      ' so P = |varkappa|/2 for every harmonic triple (exact)',
      [sp.simplify(muH[1] - muH[2] - MH/mH[0]), sp.simplify(muH[2] - muH[0] - MH/mH[1]), sp.simplify(muH[0] - muH[1] - MH/mH[2])] == [0, 0, 0]
      and sp.simplify(SH + (2*aG**2 + KH*aG - 3)) == 0 and sp.expand(heronH - radH) == 0)
# The same against the Biot-Savart velocities, for the family of eq:norm with mu != 1: read the squared sides of eq:pos,
# scale them to Groebli's mu_i by his (6), recover a_G from each of the three equations (8), and compare |varkappa|/2 with P.
mp.mp.dps = 50
dev_gh = mp.mpf(0); cons_gh = mp.mpf(0); coll_gh = True
for mu_s in ['0.1', '0.3', '0.5', '0.8', '1', '2']:
    muv = mp.mpf(mu_s)
    Gs = Gams(muv)
    th0 = mp.acos((muv - 1)/(2*mp.sqrt(1 + muv + muv**2)))
    for thv in (th0*mp.mpf('0.3'), th0*mp.mpf('0.7'), mp.pi + (mp.pi - th0)*mp.mpf('0.2'), mp.pi + (mp.pi - th0)*mp.mpf('0.8')):
        zs = config_theta(muv, thv)
        ks, _ = kappas_direct(Gs, zs)
        coll_gh = coll_gh and ks[0].real < 0
        s2 = [abs(zs[1] - zs[2])**2, abs(zs[2] - zs[0])**2, abs(zs[0] - zs[1])**2]
        lam = (sum(Gs)/Gs[0])/(s2[1] - s2[2])                   # his (6): mu_2 - mu_3 = (m1 + m2 + m3)/m1
        mug = [lam*s_ for s_ in s2]
        a_s = [mug[0] + (Gs[1] - Gs[2])/Gs[0], mug[1] + (Gs[2] - Gs[0])/Gs[1], mug[2] + (Gs[0] - Gs[1])/Gs[2]]
        cons_gh = max(cons_gh, abs(a_s[1] - a_s[0]), abs(a_s[2] - a_s[0]))
        Kv = (Gs[1] - Gs[2])*(Gs[2] - Gs[0])*(Gs[0] - Gs[1])/(Gs[0]*Gs[1]*Gs[2])
        radv = 2*mug[1]*mug[2] + 2*mug[2]*mug[0] + 2*mug[0]*mug[1] - mug[0]**2 - mug[1]**2 - mug[2]**2
        dev_gh = max(dev_gh, abs(abs(2*a_s[0]**2 + Kv*a_s[0] - 3)/(2*mp.sqrt(radv)) - P_of_kappa(ks[0])))
check('10k every harmonic triple, Biot-Savart at 50 digits, mu in {0.1, 0.3, 0.5, 0.8, 1, 2}, two angles on each arc:'
      ' the squared sides satisfy his (8) with one a_G, and |varkappa|/2 from (9), (12) equals P',
      coll_gh and cons_gh < mp.mpf('1e-45') and dev_gh < mp.mpf('1e-45'),
      '(8) consistent to %s; max |P - |varkappa|/2| = %s' % (mp.nstr(cons_gh, 3), mp.nstr(dev_gh, 3)))
# His example, Fig. 6 (printed p. 59): m1 : m2 : m3 = 3 : -2 : 6, a = 2, s_1^2 : s_2^2 : s_3^2 = 28 : 21 : 7 and
# rho_i proportional to e^{(sqrt3/5)(theta_i - alpha_i)}, i.e. varkappa = 5/sqrt3 and P = 5 sqrt3/6. The triangle has a right
# angle at vortex 1 (his a = -(m2 - m3)/(m2 + m3) = 2): z1 = 0, z2 = sqrt7, z3 = +-sqrt21 i.
m6 = [sp.Integer(3), sp.Integer(-2), sp.Integer(6)]
mu6 = [2 - (m6[1] - m6[2])/m6[0], 2 - (m6[2] - m6[0])/m6[1], 2 - (m6[0] - m6[1])/m6[2]]
K6 = (m6[1] - m6[2])*(m6[2] - m6[0])*(m6[0] - m6[1])/(m6[0]*m6[1]*m6[2])
rad6 = 2*mu6[1]*mu6[2] + 2*mu6[2]*mu6[0] + 2*mu6[0]*mu6[1] - mu6[0]**2 - mu6[1]**2 - mu6[2]**2
kap6 = (2*2**2 + K6*2 - 3)/sp.sqrt(rad6)
P6 = []; spr6 = mp.mpf(0); re6 = []
for sg in (1, -1):
    z6 = [mp.mpc(0), mp.sqrt(7), sg*mp.sqrt(21)*mp.mpc(0, 1)]
    k6, _ = kappas_direct([mp.mpf(3), mp.mpf(-2), mp.mpf(6)], z6)
    spr6 = max(spr6, max(abs(k_ - k6[0]) for k_ in k6)/abs(k6[0]))
    P6.append(abs(k6[0].imag)/(2*abs(k6[0].real))); re6.append(k6[0].real)
check('10k Groebli\'s Fig. 6 (p. 59), m = (3, -2, 6), a_G = 2: muG = (14/3, 7/2, 7/6), proportional to 28 : 21 : 7, varkappa = 5/sqrt3'
      ' (his exponent sqrt3/5); Biot-Savart at 50 digits: self-similar, one orientation collapses and its mirror image expands,'
      ' and |Im kappa|/(2|Re kappa|) = 5 sqrt3/6 for both',
      [x_/mu6[2] for x_ in mu6] == [4, 3, 1] and sp.simplify(kap6 - 5/sp.sqrt(3)) == 0
      and spr6 < mp.mpf('1e-45') and re6[0]*re6[1] < 0 and all(abs(p_ - 5*mp.sqrt(3)/6) < mp.mpf('1e-45') for p_ in P6),
      'spread %s, P = %s' % (mp.nstr(spr6, 3), mp.nstr(P6[0], 15)))

# 10h. Demina and Kudryashov 2014, Sect. 3: two regular n-gons with circulations G1 (radius R1) and G2 (radius r R1)
#      and G0 at the center. With G2 = -G1/r^2 (zero angular impulse) their Eq. (37) fixes r, and their Eq. (36)
#      gives the constant Omega of their Eq. (11), Omega conj(z_k) = sum_j G_j/(z_k - z_j), i.e. Omega = S = 2 pi i conj(kappa),
#      as a function of b2 = e^{i n phi2}. At G0 = 0, G1 = x, R1 = 1, r^2 = x and r^n b2 = v:
nn_, xx_, vv_, G0_, G1_, rr_, R1_, bb_ = sp.symbols('n x v Gamma0 Gamma1 r R1 b2')
Om36 = (((2*(nn_*G1_ + G0_)*rr_**2 - (nn_ - 1)*G1_)*rr_**nn_*bb_ + (nn_ - 1)*G1_ - 2*G0_*rr_**2)
        / (2*R1_**2*rr_**4*(rr_**nn_*bb_ - 1)))
E37 = ((nn_ - 1)*G1_ + 2*G0_)*rr_**4 - 2*(nn_*G1_ + G0_)*rr_**2 + (nn_ - 1)*G1_
circ_ = (nn_ - 1)*xx_**2 - 2*nn_*xx_ + (nn_ - 1)
S_ = xx_*(nn_ - 1)/2 - nn_/(1 - vv_)
Om36_x = sp.simplify(Om36.subs({G0_: 0, R1_: 1, G1_: xx_}).subs(rr_**nn_*bb_, vv_).subs(rr_, sp.sqrt(xx_)))
check('10h DK Eq. (37) at Gamma0 = 0, r^2 = x is Gamma1 times the circulation condition (n-1)x^2 - 2nx + (n-1)',
      sp.simplify(E37.subs(G0_, 0).subs(rr_, sp.sqrt(xx_)) - G1_*circ_) == 0)
check('10h DK Eq. (36) at Gamma0 = 0, Gamma1 = x, R1 = 1, r^2 = x, r^n b2 = v equals S - circ/(2x) identically',
      sp.simplify(Om36_x - (S_ - circ_/(2*xx_))) == 0)
mp.mp.dps = 50
dev_dk = mp.mpf(0)
for n_dk in range(2, 9):
    xn_dk = (n_dk + mp.sqrt(2*n_dk - 1))/(n_dk - 1)
    eps_dk = mp.expj(2*mp.pi/n_dk)
    for f_dk in ['0.11', '0.4', '0.77']:
        th_dk = mp.mpf(f_dk)*mp.pi/n_dk
        zs_dk = [eps_dk**k for k in range(n_dk)] + [mp.sqrt(xn_dk)*mp.expj(th_dk)*eps_dk**k for k in range(n_dk)]
        Gs_dk = [xn_dk]*n_dk + [mp.mpf(-1)]*n_dk
        vv_dk = xn_dk**(mp.mpf(n_dk)/2)*mp.expj(n_dk*th_dk)
        Om_dk = (((2*n_dk*xn_dk - (n_dk - 1))*xn_dk)*vv_dk + (n_dk - 1)*xn_dk)/(2*xn_dk**2*(vv_dk - 1))
        for k in range(2*n_dk):
            sm = sum(Gs_dk[j]/(zs_dk[k] - zs_dk[j]) for j in range(2*n_dk) if j != k)
            dev_dk = max(dev_dk, abs(Om_dk*mp.conj(zs_dk[k]) - sm)/abs(sm))
check('10h DK Eq. (36) against the Biot-Savart sum over all 2n vortices, n = 2..8, three relative rotations each',
      dev_dk < mp.mpf('1e-45'), 'max relative difference %s' % mp.nstr(dev_dk, 3))

# 10i. The seven-vortex collapse of DK Table 1 (Fig. 1a): G0 = 6383/2250 at 0, G1 = 14/15 at +-2,
#      G2 = -62/45 at +-2 e^{i phi2} with cos 2 phi2 = 13/18, G3 = 1 at +-4/3. It is self-similar with the printed
#      Omega, and P = |Re Omega|/(2 |Im Omega|) = 12433/(1240 sqrt 155) < sqrt(3)/2: Corollary 1 is specific to three vortices.
ph_t1 = mp.acos(mp.mpf(13)/18)/2
zs_t1 = [mp.mpc(0), mp.mpc(2), mp.mpc(-2), 2*mp.expj(ph_t1), -2*mp.expj(ph_t1), mp.mpc(4)/3, mp.mpc(-4)/3]
Gs_t1 = [mp.mpf(6383)/2250] + [mp.mpf(14)/15]*2 + [mp.mpf(-62)/45]*2 + [mp.mpf(1)]*2
Om_t1 = mp.mpf(12433)/9000 - 31*mp.sqrt(155)/450*mp.mpc(0, 1)
dev_t1 = mp.mpf(0)
for k in range(7):
    sm = sum(Gs_t1[j]/(zs_t1[k] - zs_t1[j]) for j in range(7) if j != k)
    dev_t1 = max(dev_t1, abs(Om_t1*mp.conj(zs_t1[k]) - sm))
imp_t1 = sum(g*abs(z)**2 for g, z in zip(Gs_t1, zs_t1))
P_t1 = abs(Om_t1.real)/(2*abs(Om_t1.imag))
check('10i DK Table 1: seven vortices collapse self-similarly with the printed Omega, and P = 12433/(1240 sqrt 155) < sqrt(3)/2',
      dev_t1 < mp.mpf('1e-45') and abs(imp_t1) < mp.mpf('1e-45') and Om_t1.imag < 0
      and abs(P_t1 - mp.mpf(12433)/(1240*mp.sqrt(155))) < mp.mpf('1e-45') and P_t1 < mp.sqrt(3)/2,
      'residual %s, P = %s' % (mp.nstr(dev_t1, 3), mp.nstr(P_t1, 15)))

# 10c. Section 5 (two concentric polygons), exact and for general n.
n_, x_, rho_, al_ = sp.symbols('n x rho alpha', positive=True)
Eh, mexp, zt, ztb = sp.symbols('E m zeta zetabar', positive=True)
v_ = rho_*sp.exp(I*al_)
S_z = x_*(n_ - 1)/2 - n_/(1 - v_)
S_zeta = -(n_ - 1)/(2*x_) - n_*v_/(1 - v_)
check('10c the two quotients are equal iff (n-1)x^2 - 2nx + (n-1) = 0  (eq. 17)',
      sp.simplify(2*x_*(S_z - S_zeta) - ((n_ - 1)*x_**2 - 2*n_*x_ + (n_ - 1))) == 0)
zeta_quot = (-(n_ - 1)/(2*zt) + zt*ztb*n_*zt**(n_ - 1)/(zt**n_ - 1))/ztb       # conj(zeta dot)/conj(zeta), z = 1, x = |zeta|^2
check('10c the zeta quotient follows from eq. (16) with z = 1, |zeta|^2 = x',
      sp.simplify(sp.powsimp(zeta_quot - (-(n_ - 1)/(2*zt*ztb) - n_*zt**n_/(1 - zt**n_)), force=True)) == 0)
pair_sum = sp.binomial(n_, 2)*x_**2 + sp.binomial(n_, 2) - n_**2*x_
check('10c sum_{i<j} Gamma_i Gamma_j of the 2n vortices = (n/2)((n-1)x^2 - 2nx + (n-1))',
      sp.simplify(sp.expand_func(pair_sum) - n_/2*((n_ - 1)*x_**2 - 2*n_*x_ + (n_ - 1))) == 0)
kk = sp.symbols('k', positive=True)                     # n = k + 1 > 1
xn = (kk + 1 + sp.sqrt(2*kk + 1))/kk
check('10c x_n = (n + sqrt(2n-1))/(n-1) is a root of (11), (x_n + 1/x_n)/2 = n/(n-1), (n-1)x_n - n = sqrt(2n-1)',
      sp.simplify(kk*xn**2 - 2*(kk + 1)*xn + kk) == 0 and sp.simplify((xn + 1/xn)/2 - (kk + 1)/kk) == 0
      and sp.simplify(kk*xn - (kk + 1) - sp.sqrt(2*kk + 1)) == 0)
Kn = (n_ - 1)*x_*(rho_ + 1/rho_)/2 - n_/rho_
ReS = sp.re(sp.expand_complex(S_z))
absv2 = 1 - 2*rho_*sp.cos(al_) + rho_**2
check('10c |1-v|^2 Re S / rho = K_n - ((n-1)x - n) cos alpha',
      sp.simplify(absv2*ReS/rho_ - (Kn - ((n_ - 1)*x_ - n_)*sp.cos(al_))) == 0)
kap = I*sp.conjugate(S_z)/(2*pi)                        # conj(kappa) = S/(2 pi i)
kap = sp.expand_complex(kap)
check('10c Re kappa = -n rho sin(alpha)/(2 pi |1-v|^2)',
      sp.simplify(sp.re(kap) + n_*rho_*sp.sin(al_)/(2*pi*absv2)) == 0)
bS = sp.symbols('b', positive=True)                     # b stands for sqrt(2n-1) = (n-1)x - n
Pring = sp.simplify((sp.im(kap)/(-2*sp.re(kap))).subs(x_, (bS + n_)/(n_ - 1)))
check('10c P = (K_n - sqrt(2n-1) cos(n theta))/(2n sin(n theta))  (eq. 18)',
      sp.simplify(Pring - ((Kn.subs(x_, (bS + n_)/(n_ - 1)) - bS*sp.cos(al_))/(2*n_*sp.sin(al_)))) == 0)
Kn_E = (n_ - 1)*Eh**2*(Eh**mexp + Eh**-mexp)/2 - (n_ - 1)*(Eh**2 + Eh**-2)/2*Eh**-mexp     # x = E^2, rho = E^n, n = (n-1)cosh(eta)
check('10c K_n = (n-1) sinh((n+2) eta/2) when x = e^eta, rho = e^{n eta/2}, n = (n-1) cosh eta',
      sp.simplify(sp.expand(Kn_E - (n_ - 1)*(Eh**(mexp + 2) - Eh**(-mexp - 2))/2)) == 0)
check('10c K_n - sqrt(2n-1) = (n-1) x (rho^{1/2} - rho^{-1/2})^2/2 + n(1 - 1/rho)',
      sp.simplify((n_ - 1)*x_*(sp.sqrt(rho_) - 1/sp.sqrt(rho_))**2/2 + n_*(1 - 1/rho_) - (Kn - ((n_ - 1)*x_ - n_))) == 0)
t_ = sp.symbols('t')
table = {2: (2 + sp.sqrt(3), 4*sp.sqrt(3), 3*sp.sqrt(5)/4, sp.Rational(1, 4)),
         3: ((3 + sp.sqrt(5))/2, sp.Integer(11), sp.sqrt(29)/3, sp.sqrt(5)/11),
         4: ((4 + sp.sqrt(7))/3, 55*sp.sqrt(7)/9, sp.sqrt(322)/9, sp.Rational(9, 55)),
         5: (sp.Integer(2), 127*sp.sqrt(2)/8, sp.sqrt(31682)/80, 12*sp.sqrt(2)/127)}
tab_ok = True
for nn, (xc, Kc, Fc, cc) in table.items():
    xv = (nn + sp.sqrt(2*nn - 1))/(nn - 1)
    rv = xv**sp.Rational(nn, 2)
    Kv = (nn - 1)*xv*(rv + 1/rv)/2 - nn/rv
    for expr in (xv - xc, Kv - Kc, sp.sqrt(Kv**2 - (2*nn - 1))/(2*nn) - Fc, sp.sqrt(2*nn - 1)/Kv - cc):
        tab_ok = tab_ok and sp.minimal_polynomial(expr, t_) == t_
check('10c the table of x_n, K_n, F_n and cos(n theta) at the minimum, n = 2..5, exactly', tab_ok)
# the two sums over roots of unity and the reduced equations (10), numerically for n = 2..10
mp.mp.dps = 50
dev10 = mp.mpf(0)
for nn in range(2, 11):
    eps_ = mp.expj(2*mp.pi/nn)
    dev10 = max(dev10, abs(sum(1/(1 - eps_**k) for k in range(1, nn)) - mp.mpf(nn - 1)/2))
    zz, zeta = mp.mpc('0.83', '0.21'), mp.mpc('-0.4', '1.37')
    xv = mp.mpf('1.9')
    dev10 = max(dev10, abs(sum(1/(zz - zeta*eps_**k) for k in range(nn)) - nn*zz**(nn - 1)/(zz**nn - zeta**nn)))
    pos = [zz*eps_**k for k in range(nn)] + [zeta*eps_**k for k in range(nn)]
    gam = [xv]*nn + [mp.mpf(-1)]*nn
    def vel(j):
        return mp.conj(sum(gam[k]/(pos[j] - pos[k]) for k in range(2*nn) if k != j)/(2*mp.pi*mp.mpc(0, 1)))
    red_z = mp.conj((xv*(nn - 1)/(2*zz) - nn*zz**(nn - 1)/(zz**nn - zeta**nn))/(2*mp.pi*mp.mpc(0, 1)))
    red_zeta = mp.conj((-(nn - 1)/(2*zeta) + xv*nn*zeta**(nn - 1)/(zeta**nn - zz**nn))/(2*mp.pi*mp.mpc(0, 1)))
    dev10 = max(dev10, abs(vel(0) - red_z), abs(vel(nn) - red_zeta))
check('10c the root-of-unity sums and the reduced equations (10) against the full Biot-Savart sum, n = 2..10',
      dev10 < mp.mpf('1e-45'), mp.nstr(dev10, 3))

# 10d. Proposition 1: the parameters of the trigonometric solution, exactly.
qv, sv = sp.symbols('qv sv')
cubq = 8748*qv**3 - 49005*qv**2 + 27794*qv + 18723
dep = sp.expand(cubq.subs(qv, sv + sp.Rational(605, 324))/8748)
p_dep, r_dep = dep.coeff(sv, 1), dep.coeff(sv, 0)
sigma_ = 2*sp.sqrt(-p_dep/3)
X_ = 3*r_dep/(2*p_dep)*sp.sqrt(-3/p_dep)
check('10d Prop. 1: q = s + 605/324 removes the quadratic term; sigma = 2 sqrt(-p/3) = 7 sqrt(5201)/162,'
      ' X = (3r/2p) sqrt(-3/p) = 245351/5201^(3/2)',
      dep.coeff(sv, 2) == 0 and sp.simplify(sigma_ - 7*sp.sqrt(5201)/162) == 0
      and sp.simplify(X_ - 245351/sp.Integer(5201)**sp.Rational(3, 2)) == 0)
check('10d Prop. 1: the cubic in q equals 16 Q(1/2, q)', sp.expand(16*Qexp.subs(m, sp.Rational(1, 2)).subs(y, qv) - cubq) == 0)

# 10l. Prop. 1 (release 2.2.0): the critical cosines in closed form. At mu = 1/2, G(C) = 2C^3 + 8C^2 + C/4 - 8,
#      and C = (sqrt7/2) c gives c^3 + (8 sqrt7/7) c^2 + c/14 - 32 sqrt7/49 = 0.
cL, sL = sp.symbols('c s')
GL = sp.expand((4*(1 - m)*C**3 + 4*(2*m**2 - m + 2)*C**2 + 2*(1 - m)**3*C
                - (2*m**4 + 7*m**3 + 6*m**2 + 7*m + 2)).subs(m, sp.Rational(1, 2)))   # eq:K (Kc is reused in 10c)
cubL = cL**3 + 8*sp.sqrt(7)/7*cL**2 + cL/14 - 32*sp.sqrt(7)/49
check('10l Prop. 1: G(C) = 2C^3 + 8C^2 + C/4 - 8 at mu = 1/2, and G((sqrt7/2)c)/(7 sqrt7/4) = c^3 + (8 sqrt7/7)c^2 + c/14 - 32 sqrt7/49',
      sp.expand(GL - (2*C**3 + 8*C**2 + C/4 - 8)) == 0
      and sp.simplify(sp.expand(GL.subs(C, sp.sqrt(7)/2*cL))/(7*sp.sqrt(7)/4) - cubL) == 0)
depL = sp.expand(cubL.subs(cL, sL - 8*sp.sqrt(7)/21))
pL, qL = depL.coeff(sL, 1), depL.coeff(sL, 0)
check('10l Prop. 1: c = s - 8 sqrt7/21 gives s^3 - (125/42)s + 124 sqrt7/1323; 2 sqrt(-p/3) = 5 sqrt70/21 and'
      ' (3q/2p) sqrt(-3/p) = -124 sqrt10/3125',
      sp.simplify(depL.coeff(sL, 2)) == 0 and sp.simplify(pL + sp.Rational(125, 42)) == 0
      and sp.simplify(qL - 124*sp.sqrt(7)/1323) == 0
      and sp.simplify(2*sp.sqrt(-pL/3) - 5*sp.sqrt(70)/21) == 0
      and sp.simplify(sp.radsimp(3*qL/(2*pL)*sp.sqrt(-3/pL)) + 124*sp.sqrt(10)/3125) == 0)
mp.mp.dps = 60
cm = [-8*mp.sqrt(7)/21 + 5*mp.sqrt(70)/21*mp.cos(mp.acos(-124*mp.sqrt(10)/3125)/3 - 2*mp.pi*mm/3) for mm in range(3)]
res_c = max(abs(cc**3 + 8*mp.sqrt(7)/7*cc**2 + cc/14 - 32*mp.sqrt(7)/49) for cc in cm)
check('10l Prop. 1: c_0, c_1, c_2 solve the cubic to 1e-59 (60 digits); c_0 in (0.67, 0.68), c_1 in (-0.93, -0.92), c_2 < -1',
      res_c < mp.mpf('1e-59') and mp.mpf('0.67') < cm[0] < mp.mpf('0.68') and mp.mpf('-0.93') < cm[1] < mp.mpf('-0.92') and cm[2] < -1,
      'residual %s; c = %s' % (mp.nstr(res_c, 3), [mp.nstr(cc, 13) for cc in cm]))
P12 = lambda th: (14*mp.sin(th)**2 + 6*mp.sqrt(7)*mp.cos(th) + 21)/(2*(14*mp.cos(th) + mp.sqrt(7))*mp.sin(th))
qP = [605/mp.mpf(324) + 7*mp.sqrt(5201)/162*mp.cos(mp.acos(245351/mp.mpf(5201)**mp.mpf('1.5'))/3 - 2*mp.pi*mm/3) for mm in range(2)]
dev_c = max(abs(P12(mp.acos(cm[0])) - mp.sqrt(qP[0])), abs(P12(2*mp.pi - mp.acos(cm[1])) - mp.sqrt(qP[1])))
check('10l Prop. 1: P at cos theta = c_0 on A+ is P_+, and at cos theta = c_1 on A- is P_-, to 1e-60 (60 digits)',
      dev_c < mp.mpf('1e-60'), 'max difference %s' % mp.nstr(dev_c, 3))
mp.mp.dps = 50

# 10m. Discussion (release 2.2.0): the collapsing triple of Chen, Walsh and Wheeler, arXiv:2506.04093v1, Eq. (4.5) (the same
#      number in Math. Ann. 396 (2026) 5),
#      circulations (1, 2, -2/3) at -2, 1 and sqrt7 i. Interchanging the first two vortices and halving the circulations
#      gives (1, 1/2, -1/3), the family mu = 1/2; its shape ratio is that of eq:pos at theta = pi/2, on A+ = (0, theta_0).
mh = sp.Rational(1, 2)
qh = sp.sqrt(1 + mh + mh**2)
zW = [sp.Integer(1), sp.Integer(-2), sp.sqrt(7)*I]                 # after the interchange: circulations 2, 1, -2/3
gW = [sp.Integer(2)/2, sp.Integer(1)/2, sp.Rational(-2, 3)/2]
wW = sp.simplify((zW[2] - zW[0])/(zW[1] - zW[0]))
wpos = mh/(1 + mh) - qh/(1 + mh)*sp.exp(I*pi/2)
cos_th0h = sp.radsimp((mh - 1)/(2*qh))                            # cos theta_0 = (mu - 1)/(2 sqrtR)
check('10m CWW (4.5): interchanged and halved, Gamma = (1, 1/2, -1/3) and w = 1/3 - (sqrt7/3) i, the shape ratio of eq:pos'
      ' at mu = 1/2, theta = pi/2; and cos theta_0 = -sqrt7/14 < 0, so pi/2 < theta_0 and theta = pi/2 lies on A+ (exact)',
      gW == [sp.Integer(1), mh, -mh/(1 + mh)] and sp.simplify(wW - wpos) == 0
      and sp.simplify(wW - (sp.Rational(1, 3) - sp.sqrt(7)/3*I)) == 0
      and sp.simplify(cos_th0h + sp.sqrt(7)/14) == 0 and cos_th0h.is_negative is True)
PW = sp.simplify((Nf(C)/(2*m*sp.sqrt(R)*Mf(C))).subs(C, 0).subs(m, mh))
check('10m CWW (4.5): P = N(0)/(2 mu sqrtR M(0)) = 5 sqrt7/2 at theta = pi/2, mu = 1/2 (eq:Ptheta, exact)',
      sp.simplify(PW - 5*sp.sqrt(7)/2) == 0, str(PW))
zWn = [mp.mpc(-2), mp.mpc(1), mp.sqrt(7)*mp.mpc(0, 1)]
kW, zcW = kappas_direct([mp.mpf(1), mp.mpf(2), mp.mpf(-2)/3], zWn)
sprW = max(abs(k_ - kW[0]) for k_ in kW)/abs(kW[0])
cfg = config_theta(mp.mpf(1)/2, mp.pi/2)
lamW = cfg[2]/(zWn[2] - zcW)
simW = max(abs(lamW*(zz - zcW) - cc_) for zz, cc_ in zip([zWn[1], zWn[0], zWn[2]], cfg))
check('10m CWW (4.5), Biot-Savart at 50 digits: self-similar and collapsing, P = 5 sqrt7/2, and a rotation-dilation about z_c'
      ' maps it onto eq:pos at mu = 1/2, theta = pi/2 (vortices 1 and 2 interchanged)',
      sprW < mp.mpf('1e-45') and kW[0].real < 0 and abs(P_of_kappa(kW[0]) - 5*mp.sqrt(7)/2) < mp.mpf('1e-45') and simW < mp.mpf('1e-45'),
      'spread %s, map residual %s, P = %s' % (mp.nstr(sprW, 3), mp.nstr(simW, 3), mp.nstr(P_of_kappa(kW[0]), 15)))
# The map V of Chen, Walsh and Wheeler, their Eq. (4.4), the same in arXiv:2506.04093v1 and in Math. Ann. 396 (2026) 5:
#   V_k(z, gamma, Omega) = sum_{j != k} gamma_j/(2 pi i (z_k - z_j)) + i Omega conj(z_k),  (z, gamma, Omega) in C^M x R^M x C.
# With z_c = 0, V = 0 says conj(dz_k/dt) = conj(kappa) conj(z_k) by eq:bs: the self-similar motion with Omega = i conj(kappa).


def V_cww(zs, gs, Om):
    return [sum(gs[j]/(2*mp.pi*mp.mpc(0, 1)*(zs[k] - zs[j])) for j in range(len(zs)) if j != k) + mp.mpc(0, 1)*Om*mp.conj(zs[k])
            for k in range(len(zs))]


# Their triple (4.5) shifted by z_c = -2i/sqrt7, with their printed Omega = 35/(264 pi) and 1/kappa_CWW = sqrt7/(132 pi),
# combined as in their Sect. 4.1: -1/(2 kappa_CWW) - i Omega =: -i Omega_bold, so Omega_bold = Omega - i/(2 kappa_CWW).
zT = [z_ - zcW for z_ in zWn]
OmT = mp.mpf(35)/(264*mp.pi) - mp.mpc(0, 1)*mp.sqrt(7)/(264*mp.pi)
resT = max(abs(v_) for v_ in V_cww(zT, [mp.mpf(1), mp.mpf(2), mp.mpf(-2)/3], OmT))
resA = mp.mpf(0)                                  # along A+ for mu = 1/2: eq:pos with Omega(theta) = i conj(kappa(theta)), Lemma 3
th0v = mp.acos(-mp.sqrt(7)/14)
for f_ in ('0.1', '0.3', '0.5', '0.7', '0.9'):
    thv = th0v*mp.mpf(f_)
    OmA = mp.mpc(0, 1)*mp.conj(kappa_formula(mp.mpf(1)/2, thv))
    resA = max(resA, max(abs(v_) for v_ in V_cww(config_theta(mp.mpf(1)/2, thv), Gams(mp.mpf(1)/2), OmA)))
check('10m CWW map V, Eq. (4.4): V = 0 at their triple (4.5), shifted to z_c = 0, with their printed Omega and kappa, and their'
      ' Omega_bold = i conj(kappa); V = 0 along A+ (mu = 1/2, five angles) with Omega(theta) = i conj(kappa(theta)) of Lemma 3',
      resT < mp.mpf('1e-45') and abs(OmT - mp.mpc(0, 1)*mp.conj(kW[0])) < mp.mpf('1e-45') and resA < mp.mpf('1e-45'),
      'residuals %s, %s' % (mp.nstr(resT, 3), mp.nstr(resA, 3)))
# The symmetries used in the Discussion act on (z, gamma, Omega) by real-linear isomorphisms L with V(L Lambda) = A V(Lambda):
# rotation (e^{i phi} z, gamma, Omega), A = e^{-i phi}; dilation (lam z, gamma, lam^{-2} Omega), A = 1/lam; circulations
# (z, c gamma, c Omega), A = c; relabeling, A the same permutation. Checked at a point that is not a zero of V.
zR = [mp.mpc('0.3', '-1.1'), mp.mpc('1.7', '0.4'), mp.mpc('-0.9', '0.8'), mp.mpc('0.1', '2.3')]
gR = [mp.mpf('1.3'), mp.mpf('-0.7'), mp.mpf('2.1'), mp.mpf('0.45')]
OR = mp.mpc('0.37', '-0.21')
V0 = V_cww(zR, gR, OR)
phR, laR, cR = mp.mpf('0.83'), mp.mpf('1.9'), mp.mpf('2.6')
perm = [2, 0, 3, 1]
eqv = max(
    max(abs(a_ - mp.expj(-phR)*b_) for a_, b_ in zip(V_cww([mp.expj(phR)*z_ for z_ in zR], gR, OR), V0)),
    max(abs(a_ - b_/laR) for a_, b_ in zip(V_cww([laR*z_ for z_ in zR], gR, OR/laR**2), V0)),
    max(abs(a_ - cR*b_) for a_, b_ in zip(V_cww(zR, [cR*g_ for g_ in gR], cR*OR), V0)),
    max(abs(a_ - V0[p_]) for a_, p_ in zip(V_cww([zR[p_] for p_ in perm], [gR[p_] for p_ in perm], OR), perm)))
check('10m CWW map V: V(L Lambda) = A V(Lambda) for a rotation, a dilation with Omega -> lam^{-2} Omega, a factor c in the'
      ' circulations with Omega -> c Omega, and a relabeling (50 digits, at a point with V != 0)',
      eqv < mp.mpf('1e-45') and min(abs(v_) for v_ in V0) > mp.mpf('0.01'), 'max deviation %s' % mp.nstr(eqv, 3))

# 10e. Remark 1: Q(a/b, xi^2) irreducible over Q for every a/b in (0, 1) with b <= 30, one by one.
xi = sp.symbols('xi')
cnt = 0
irr_all = True
for bden in range(2, 31):
    for anum in range(1, bden):
        if sp.igcd(anum, bden) != 1:
            continue
        cnt += 1
        sext = sp.Poly(sp.numer(sp.together(Qexp.subs(m, sp.Rational(anum, bden)).subs(y, xi**2))), xi)
        fl = sp.factor_list(sext.as_expr())[1]
        irr_all = irr_all and len(fl) == 1 and fl[0][1] == 1 and sp.degree(fl[0][0], xi) == 6
check('10e Remark 1: Q(a/b, xi^2) factored directly: irreducible sextic for all a/b in (0,1), b <= 30',
      irr_all and cnt == 277, 'count %d' % cnt)

# ==================================================================================
hdr('SUMMARY')
# ==================================================================================
nf = sum(1 for _, ok in RESULTS if not ok)
print('checks: %d, passed: %d, failed: %d   (%.1f s)' % (len(RESULTS), len(RESULTS) - nf, nf, time.time() - T0))
print('''
kappa(theta; mu) = i (1+mu)^3/(2 pi sqrtR) * (sqrtR + (1-mu) e^{i theta}) / ((sqrtR - mu e^{i theta})(sqrtR + e^{i theta}))
   [normalization |z3 - z_c| = 1, R = 1 + mu + mu^2; zero-impulse circle |w - mu/(1+mu)| = sqrtR/(1+mu)]
P(theta; mu) = [2R(1-mu+mu^2) + 2mu R sin^2 + (1-mu)(2+mu+2mu^2) sqrtR cos] / [2 mu sqrtR sin (1-mu+2 sqrtR cos)]
critical points: 4(1-mu)C^3 + 4(2mu^2-mu+2)C^2 + 2(1-mu)^3 C - (2mu^4+7mu^3+6mu^2+7mu+2) = 0,  C = sqrtR cos theta
Q(mu, P^2) = 0 with Q = 1728 mu^4(1+mu)^4 y^3 - 144 mu^2(1+mu)^2 A2 y^2 - 4 A1 y + 3 A0^2
''')
if nf:
    for n_, ok in RESULTS:
        if not ok:
            print('FAILED:', n_)
    sys.exit(1)
