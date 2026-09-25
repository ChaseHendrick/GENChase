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
"""Checks of Theorem 3 of the manuscript (paper/minimal-winding.tex): a strong vortex of circulation 1 at the
origin and m weak pairs, circulation gamma a_j at Z_j and -gamma b_j at W_j, in the class (eq:class) with one
constant 0 < c <= 1:
    c <= a_j, b_j <= 1/c,  c <= |Z_j| <= 1/c,  c gamma |Z_j| <= |W_j - Z_j| <= gamma |Z_j|/c,  |Z_j - Z_l| >= c.
Notation of the paper: d_j = W_j - Z_j, u_j = d_j/(gamma a_j Z_j) = p_j + i y_j, nu_j = (a_j - b_j)/(gamma a_j^2),
f_l(z) = gamma a_l/(z - Z_l) - gamma b_l/(z - W_l), gamma_0 = c^3/(8m); a collapse has dz_i/dt = kappa (z_i - z_c)
with Re kappa < 0, and P = |Im kappa|/(-2 Re kappa).

  1. Every identity used in the proof, exactly (SymPy), tagged with its step: the equations of a pair
     (eq:pairZ), (eq:pairD), the relative motion (eq:rel) with the remainder gamma a u^2/(1 + gamma a u), the
     rate (eq:rate), the angular impulse (eq:imp), the limit equations (eq:limit), (eq:kstar), Cases A and B, the
     equality case and the symmetry (Gamma, z) -> (-Gamma, conj z). Also, beyond the proof: the two roots y and
     3/(4y) and the fold at y = sqrt3/2 (why the numerical curves are parametrized as they are), the O(gamma)
     corrections of an isolated pair, and the expansion P_-(mu) = sqrt3/2 + (3 sqrt3/4) mu^2 + O(mu^3) of the
     three-vortex minimum from the polynomial Q of Theorem 1.
  2. The explicit constants of Steps 1-3: gamma_0, |d_j| <= gamma/c^2, the distances c/2, sum Gamma in [1/2, 2],
     |z_c| <= 4 m gamma/c^2, |f_l| <= 4 gamma/c^2, |f_l(W_j) - f_l(Z_j)| <= 8 gamma |d_j|/c^3, |gamma b_j/d_j| <= c^-3,
     |kappa| <= 3/(pi c^4), |rho_j| <= gamma (2/c^5 + 8(m - 1)/c^7) <= c^-4, |nu_j| <= 8 c^-10: exactly where the
     step is algebra in c and m, and on random configurations of the class where it is a bound.
  3. Exact self-similar collapses of 1 + 2m vortices, m = 1 and m = 3 (symmetric, and unequal circulations at
     unequal directions), gamma = 1e-2, 1e-3, 1e-4, and m = 2 antipodal at gamma = 1e-4, by Newton's method at
     50 digits; the minimum of P along the curve with the directions of the pairs fixed, from converged points
     only; every point against the Biot-Savart velocities of all 1 + 2m vortices. For m = 1 the minimum is
     P_-(gamma) of Theorem 1; for the symmetric cases, the minimum of Proposition 3.
  4. The three-vortex family of Corollary 1 and the rings of Proposition 3 satisfy (eq:class) near their minima,
     with u_j -> e^{i pi/3}, nu_j -> 1 and P -> sqrt(3)/2.
  5. Negative controls: checks that must fail do fail.

Parts 3 and 4 illustrate the theorem; they are not part of its proof. The theorem is asymptotic. Proposition 4
proves P >= sqrt(3)/2 + (sqrt(3)/8) c^2 gamma^2 for gamma below a threshold that is not explicit, with the sharper
coefficient C_* of its Remark 6 near equality (checked by verify_pairs_bound.py); so at the fixed gamma = 1e-2, 1e-3,
1e-4 used here, P > sqrt(3)/2 is a numerical observation, and so is the exact coefficient of gamma^2 in
P_min - sqrt(3)/2 for m = 3 unequal pairs.
Convention (eq:bs): conj(dz_j/dt) = (1/(2 pi i)) sum_{k != j} Gamma_k/(z_j - z_k). Needs sympy and mpmath
(code/requirements.txt). Run: python3 verify_strong_vortex.py. Prints every check; exits with status 1 if any
fails. Runs in under a minute.
"""
import random
import sys
import time
import sympy as sp
import mpmath as mp

FAILED = []
NCHECK = [0]
T0 = time.time()


def check(name, ok, detail=''):
    NCHECK[0] += 1
    print(('OK    ' if ok else 'FAIL  ') + name + (('   [' + detail + ']') if detail else ''))
    sys.stdout.flush()
    if not ok:
        FAILED.append(name)


def zero(name, e, detail=''):
    check(name, sp.simplify(sp.together(e)) == 0, detail)


print('Checks of Theorem 3 (a strong vortex with m weak tight pairs). Parts 1 and 2 are exact or check the explicit')
print('bounds of the proof; parts 3 and 4 are numerical and illustrate the theorem without proving it: P > sqrt(3)/2')
print('at the fixed gamma used here is a numerical observation (Proposition 4 proves it only below a threshold that is')
print('not explicit; verify_pairs_bound.py checks that proof).')
print()

# ============================================================================ 1. identities of the proof
print('1. Identities used in the proof (SymPy, exact)')
g = sp.Symbol('gamma', positive=True)
a1, b1, a2, b2, a3, b3 = sp.symbols('a1 b1 a2 b2 a3 b3', positive=True)
Z1, W1, Z2, W2, Z3, W3 = sp.symbols('Z1 W1 Z2 W2 Z3 W3')          # complex positions, strong vortex at 0, m = 3
zs = [0, Z1, W1, Z2, W2, Z3, W3]
Gs = [1, g*a1, -g*b1, g*a2, -g*b2, g*a3, -g*b3]


def BS(i):                              # 2 pi i conj(dz_i/dt), eq:bs
    return sum(Gs[k]/(zs[i] - zs[k]) for k in range(7) if k != i)


def f(z, Zl, Wl, al, bl):               # contribution of pair l to the sum in eq:bs
    return g*al/(z - Zl) - g*bl/(z - Wl)


def others(z):
    return f(z, Z2, W2, a2, b2) + f(z, Z3, W3, a3, b3)


d1 = W1 - Z1
zc_s = sp.Symbol('zc')
zero('[Step 2] (eq:pairZ) sum at Z_1 = 1/Z_1 + gamma b_1/d_1 + sum_{l != 1} f_l(Z_1)', BS(1) - (1/Z1 + g*b1/d1 + others(Z1)))
zero('[Step 2] (eq:pairD) sum at W_1 minus sum at Z_1 = -d/(Z W) + gamma(a - b)/d + sum_l [f_l(W_1) - f_l(Z_1)]',
     BS(2) - BS(1) - (-d1/(Z1*W1) + g*(a1 - b1)/d1 + others(W1) - others(Z1)))
zero('[Step 2]    and in it z_c cancels: (W - z_c) - (Z - z_c) = d', ((W1 - zc_s) - (Z1 - zc_s)) - d1)
check('[Step 2] sum_i Gamma_i (sum at z_i) = sum_{i<k} Gamma_i Gamma_k [1/(z_i - z_k) + 1/(z_k - z_i)] = 0, so the equation of the'
      ' strong vortex follows from those of the pairs',
      sp.expand(sum(Gs[i]*BS(i) for i in range(7)) - sum(Gs[i]*Gs[k]*(1/(zs[i] - zs[k]) + 1/(zs[k] - zs[i]))
                                                        for i in range(7) for k in range(i + 1, 7))) == 0
      and all(sp.cancel(1/(zs[i] - zs[k]) + 1/(zs[k] - zs[i])) == 0 for i in range(7) for k in range(i + 1, 7)))
zero('[Step 3] -d/(Z W) = -d/Z^2 + d^2/(Z^2 W)', -d1/(Z1*W1) - (-d1/Z1**2 + d1**2/(Z1**2*W1)))
zero('[Step 1] f_l(z) = gamma(a_l - b_l)/(z - Z_l) - gamma b_l d_l/((z - Z_l)(z - W_l))  (second form: O(gamma^2) once a_l - b_l = O(gamma))',
     f(Z1, Z2, W2, a2, b2) - (g*(a2 - b2)/(Z1 - Z2) - g*b2*(W2 - Z2)/((Z1 - Z2)*(Z1 - W2))))
zero('[Step 1] f_l(W_j) - f_l(Z_j) = d_j [gamma b_l/((W_j - W_l)(Z_j - W_l)) - gamma a_l/((W_j - Z_l)(Z_j - Z_l))]',
     f(W1, Z2, W2, a2, b2) - f(Z1, Z2, W2, a2, b2) - d1*(g*b2/((W1 - W2)*(Z1 - W2)) - g*a2/((W1 - Z2)*(Z1 - Z2))))
pairs3 = ((a1, b1, Z1, W1), (a2, b2, Z2, W2), (a3, b3, Z3, W3))
zero('[Step 1] (eq:zc) sum Gamma z = sum_j [gamma(a_j - b_j) Z_j - gamma b_j d_j]',
     sum(G*z for G, z in zip(Gs, zs)) - sum(g*(a - b)*Z - g*b*(W - Z) for a, b, Z, W in pairs3))
nus = sp.symbols('nu1:4', real=True)
zero('[Step 3]    with a_j - b_j = gamma a_j^2 nu_j: sum Gamma z = sum_j [gamma^2 a_j^2 nu_j Z_j - gamma b_j d_j] = O(gamma^2)',
     sum(g*(a - b)*Z - g*b*(W - Z) for a, b, Z, W in pairs3).subs({b1: a1 - g*a1**2*nus[0], b2: a2 - g*a2**2*nus[1],
                                                                   b3: a3 - g*a3**2*nus[2]})
     - sum(g**2*a**2*nu_*Z - g*(a - g*a**2*nu_)*(W - Z) for (a, b, Z, W), nu_ in zip(pairs3, nus)))

# the substitution d = gamma a u Z, b = a (1 - gamma a nu), in real coordinates Z = X + iY, u = p + iy
X, Y, p, y, nu, a = sp.symbols('X Y p y nu a', real=True)
I = sp.I
cj = sp.conjugate
Zc = X + I*Y
u = p + I*y
b = a*(1 - g*a*nu)
dd = g*a*u*Zc
Z2abs = X**2 + Y**2
zero('[Step 3] b = a(1 - gamma a nu) is nu = (a - b)/(gamma a^2)', (a - b)/(g*a**2) - nu)
zero('[Step 3] gamma b/d = (b/a)/(u Z)', g*b/dd - (b/a)/(u*Zc))
zero('[Step 3] conj(d) Z/(gamma a) = |Z|^2 conj(u)', cj(dd)*Zc/(g*a) - Z2abs*cj(u))
zero('[Step 3] [-d/Z^2 + gamma(a - b)/d] Z/(gamma a) = -u + nu/u', (-dd/Zc**2 + g*(a - b)/dd)*Zc/(g*a) - (-u + nu/u))
zero('[Step 3] [d^2/(Z^2 W)] Z/(gamma a) = gamma a u^2/(1 + gamma a u), W = Z(1 + gamma a u)  (the self-induced part of rho_j)',
     dd**2/(Zc**2*(Zc + dd))*Zc/(g*a) - g*a*u**2/(1 + g*a*u))
zero('[Step 3] Z [1/Z + gamma b/d] = 1 + 1/u - gamma a nu/u, since b/a = 1 - gamma a nu', Zc*(1/Zc + g*b/dd) - (1 + 1/u - g*a*nu/u))
xc, yc = sp.symbols('xc yc', real=True)
zero('[Step 3] conj(Z - z_c) Z = |Z|^2 - conj(z_c) Z', cj(Zc - (xc + I*yc))*Zc - (Z2abs - (xc - I*yc)*Zc))
Lp = sp.expand(g*a*Z2abs - g*b*sp.expand((Zc + dd)*cj(Zc + dd)))
zero('[Step 4] pair j contributes gamma a|Z|^2 - gamma b|W|^2 = gamma^2 |Z|^2 (a^2 nu - 2ab p - gamma a^2 b |u|^2) to sum Gamma|z|^2',
     Lp - g**2*Z2abs*(a**2*nu - 2*a*b*p - g*a**2*b*(p**2 + y**2)))
Lpp = sp.Poly(Lp, g)
check('[Step 4] a b = a^2 - gamma a^3 nu, so the pair contributes gamma^2 a^2 |Z|^2 (nu - 2p) + O(gamma^3)  (eq:imp)',
      sp.expand(a*b - (a**2 - g*a**3*nu)) == 0 and Lpp.coeff_monomial(1) == 0 and Lpp.coeff_monomial(g) == 0
      and sp.expand(Lpp.coeff_monomial(g**2) - Z2abs*a**2*(nu - 2*p)) == 0)
Gg = sp.symbols('G0:3', real=True)
xs3 = sp.symbols('x0:3', real=True)
ys3 = sp.symbols('y0:3', real=True)
zz = [xs3[i] + I*ys3[i] for i in range(3)]
zcen = sum(G*z for G, z in zip(Gg, zz))/sum(Gg)
zero('[Step 4] sum Gamma|z - z_c|^2 = sum Gamma|z|^2 - |z_c|^2 sum Gamma',
     sum(G*(z - zcen)*cj(z - zcen) for G, z in zip(Gg, zz)) - (sum(G*z*cj(z) for G, z in zip(Gg, zz)) - zcen*cj(zcen)*sum(Gg)))

# the limits
R = sp.Symbol('R', positive=True)                  # |Z_j^*|
A = 1 + 1/u
zero('[Step 5] (eq:limit) eliminating kappa*: u[(1 + 1/u) conj(u) + u - nu/u] = (2p^2 + p - nu) + i y (2p - 1)',
     sp.expand(u*((1 + 1/u)*cj(u) + u - nu/u)) - ((2*p**2 + p - nu) + I*y*(2*p - 1)))
kap = I*cj(A)/(2*sp.pi*R**2)
zero('[Step 5] 2 pi i conj(kappa*) |Z*|^2 = 1 + 1/u* is solved by kappa* = i conj(1 + 1/u*)/(2 pi |Z*|^2)', 2*sp.pi*I*cj(kap)*R**2 - A)
zero('[Step 5] (eq:kstar) Re kappa* = -y/(2 pi |Z*|^2 |u|^2)', sp.re(kap) + y/(2*sp.pi*R**2*(p**2 + y**2)))
zero('[Step 5] (eq:kstar) Im kappa* = (1 + p/|u|^2)/(2 pi |Z*|^2)', sp.im(kap) - (1 + p/(p**2 + y**2))/(2*sp.pi*R**2))
zero('[Case A] Im(1 + 1/u) = -y/|u|^2: 2 pi i conj(kappa*) is real iff y = 0, so y != 0 spreads to every pair', sp.im(A) + y/(p**2 + y**2))
sol = sp.solve([2*p**2 + p - nu, 2*p - 1], [p, nu], dict=True)
check('[Case A] y != 0 in y(2p - 1) = 0 and 2p^2 + p - nu = 0 gives p = 1/2 and nu = 1, and nothing else', sol == [{p: sp.Rational(1, 2), nu: 1}],
      str(sol))
zero('[Case A] p = 1/2: Re kappa* = -y/(2 pi |Z*|^2 (y^2 + 1/4)), so Re kappa* <= 0 forces y > 0 and Re kappa* < 0',
     sp.re(kap).subs(p, sp.Rational(1, 2)) + y/(2*sp.pi*R**2*(y**2 + sp.Rational(1, 4))))
Pstar = sp.simplify((sp.im(kap)/(-2*sp.re(kap))).subs(p, sp.Rational(1, 2)))
zero('[Case A] p = 1/2: P* = Im kappa*/(-2 Re kappa*) = (|u|^2 + p)/(2y) = (y^2 + 3/4)/(2y)', Pstar - (y**2 + sp.Rational(3, 4))/(2*y))
zero('[Case A] (y^2 + 3/4)/(2y) = sqrt(3)/2 + (y - sqrt(3)/2)^2/(2y)',
     (y**2 + sp.Rational(3, 4))/(2*y) - sp.sqrt(3)/2 - (y - sp.sqrt(3)/2)**2/(2*y))
Pv = sp.Symbol('Pstar', positive=True)
yr = sp.solve(y**2 - 2*Pv*y + sp.Rational(3, 4), y)
zero('[Case A] P* = (y^2 + 3/4)/(2y) has the two roots y* and 3/(4y*) (product 3/4)', yr[0]*yr[1] - sp.Rational(3, 4))
yp = sp.Symbol('y', positive=True)


def habs(v):
    return sp.Abs(1 + 1/(sp.Rational(1, 2) + I*v))**2


dif = sp.factor(sp.simplify(habs(sp.Rational(3, 4)/yp) - habs(yp)))
check('[Case A] |1 + 1/u|^2 differs at y and 3/(4y) unless y = sqrt(3)/2, so pairs on different roots lie at different radii',
      set(sp.solve(sp.numer(sp.together(dif)), yp)) == {sp.sqrt(3)/2}, 'difference %s' % dif)
zero('[Case A] P* = sqrt(3)/2: y^2 - sqrt(3) y + 3/4 = (y - sqrt(3)/2)^2, a double root',
     y**2 - sp.sqrt(3)*y + sp.Rational(3, 4) - (y - sp.sqrt(3)/2)**2)
zero('[Case A] p = 1/2, y = sqrt(3)/2: u = e^{i pi/3}', sp.Rational(1, 2) + I*sp.sqrt(3)/2 - sp.exp(I*sp.pi/3).rewrite(sp.cos))
zero('[Case B] y = 0: kappa* = i (1 + 1/p)/(2 pi |Z*|^2), purely imaginary', kap.subs(y, 0) - I*(1 + 1/p)/(2*sp.pi*R**2))
check('[Case B] kappa* = 0 iff 1 + 1/p = 0 iff p = -1; then nu = 2p^2 + p = 1 and nu - 2p = 3, so (eq:limit) gives 3 sum a^2|Z|^2 = 0',
      sp.solve(1 + 1/p, p) == [-1] and (2*p**2 + p).subs(p, -1) == 1 and (2*p**2 + p - 2*p).subs(p, -1) == 3)
zero('[after the theorem] -gamma a + gamma^2 a^2 nu minus the harmonic value -gamma a/(1 + gamma a) = gamma^2 a^2 (nu - 1) + O(gamma^3)',
     sp.series(-g*a + g**2*a**2*nu - (-g*a/(1 + g*a)), g, 0, 3).removeO() - g**2*a**2*(nu - 1))
# the symmetry (Gamma, z) -> (-Gamma, conj z): solutions to solutions, kappa -> conj(kappa), P kept
Gm = sp.symbols('g0:3', real=True)


def vel3(zl, Gl, i):
    return cj(sum(Gl[k]/(zl[i] - zl[k]) for k in range(3) if k != i)/(2*sp.pi*I))


zero('[normalization] velocity of the reflected configuration (-Gamma, conj z) is conj of the velocity (three vortices, symbolic)',
     sum(sp.Abs(sp.simplify(vel3([cj(q) for q in zz], [-G for G in Gm], i) - cj(vel3(zz, Gm, i)))) for i in range(3)))
print('      => conj(zdot) = kappa conj(z - z_c) becomes w-dot = conj(kappa)(w - w_c): Re kappa and |Im kappa|, hence P, are kept')
# beyond the proof: the fold of the fixed-direction curves, the O(gamma) corrections, the three-vortex expansion
yy = sp.Symbol('yy', positive=True)
Ah = A.subs(p, sp.Rational(1, 2))
zero('[numerics] p = 1/2: y and 3/(4y) give the same arg(1 + 1/u), tan arg(1 + 1/u) = -y/(y^2 + 3/4)',
     sp.im(sp.expand(Ah.subs(y, yy)*cj(Ah.subs(y, sp.Rational(3, 4)/yy)))) + sp.simplify(sp.im(Ah)*(y**2 + sp.Rational(3, 4)) + y*sp.re(Ah)))
zero('[numerics]    d/dy [y/(y^2 + 3/4)] = (3/4 - y^2)/(y^2 + 3/4)^2: the two roots meet in a fold at y = sqrt(3)/2',
     sp.diff(y/(y**2 + sp.Rational(3, 4)), y) - (sp.Rational(3, 4) - y**2)/(y**2 + sp.Rational(3, 4))**2)
print('      => near the minimum the curve with fixed directions folds in Im u of a pair; part 3 parametrizes it by Im u of the')
print('         pair with the largest a, which is a coordinate there (and a negative control below shows the fold)')
p1, n1 = sp.symbols('p1 n1', real=True)
rel1 = sp.expand(u*cj(u) + (1 - g*a*nu)*cj(u) + u**2*(1 - g*a*u) - nu)   # (eq:rel)*u of one pair alone, 1/(1 + gamma a u) to O(gamma)
rel1 = sp.expand(rel1.subs({p: sp.Rational(1, 2) + g*p1, nu: 1 + g*n1}))
c1 = rel1.coeff(g, 1)
sol1 = sp.solve([sp.re(c1), sp.expand(sp.im(c1)/y)], [p1, n1], dict=True)
check('[numerics] one pair alone, to O(gamma): nu = 1 + gamma n1 = 1 - gamma a (the harmonic value), p = 1/2 + gamma p1 = 1/2 - gamma a (y^2 + 1/4)/2',
      len(sol1) == 1 and sp.simplify(sol1[0][n1] + a) == 0 and sp.simplify(sol1[0][p1] + a*(y**2 + sp.Rational(1, 4))/2) == 0
      and sp.expand(rel1.coeff(g, 0)) == 0, str(sol1))
mu_s, yv_s, uq = sp.symbols('mu yv uq')
Qt = (1728*(uq + 1)**2*yv_s**3 - 144*(uq + 1)*(8*uq**3 - 9*uq - 9)*yv_s**2
      - 4*(16*uq**6 - 288*uq**4 - 288*uq**3 - 81*uq**2 - 162*uq - 81)*yv_s + 3*(4*uq**3 - 3*uq - 3)**2)
Qmu = sp.expand(sp.cancel(mu_s**6*Qt.subs(uq, mu_s + 1 + 1/mu_s)))
qs = sp.symbols('q1:5')
ser = sp.expand(Qmu.subs(yv_s, sp.Rational(3, 4) + sum(qs[i]*mu_s**(i + 1) for i in range(4))))
qsol = {}
for i in range(4):
    qsol[qs[i]] = sp.solve(ser.coeff(mu_s, i + 1).subs(qsol), qs[i])[0]
Pser = sp.series(sp.sqrt(sp.Rational(3, 4) + sum(qsol[qs[i]]*mu_s**(i + 1) for i in range(4))), mu_s, 0, 4).removeO()
check('[numerics] Q(0, y) = -16(4y - 3), and the root of Q(mu, .) that tends to 3/4 gives P_-(mu) = sqrt3/2 + (3 sqrt3/4) mu^2 (1 - mu) + O(mu^4)',
      sp.expand(Qmu.subs(mu_s, 0) + 16*(4*yv_s - 3)) == 0
      and sp.simplify(Pser - (sp.sqrt(3)/2 + 3*sp.sqrt(3)/4*mu_s**2 - 3*sp.sqrt(3)/4*mu_s**3)) == 0)

# ============================================================================ 2. gamma_0 and the bounds of Steps 1-3
print('2. gamma_0 = c^3/(8m) and the explicit bounds of Steps 1-3')
c, m = sp.symbols('c m', positive=True)
w, v = sp.symbols('w v', nonnegative=True)
g0 = c**3/(8*m)


def nonneg(expr):
    """expr >= 0 for 0 < c <= 1, m >= 1: substitute c = 1/(1 + w), m = 1 + v and inspect the coefficients."""
    e = sp.together(expr.subs({c: 1/(1 + w), m: 1 + v}))
    nu_, de = sp.fraction(e)
    cn = sp.Poly(sp.expand(nu_), w, v).coeffs()
    cd = sp.Poly(sp.expand(de), w, v).coeffs()
    return (all(q >= 0 for q in cn) and all(q > 0 for q in cd)) or (all(q <= 0 for q in cn) and all(q < 0 for q in cd))


check('[Step 1] |d_j| <= gamma/c^2 <= c/8 at gamma = gamma_0, so |W_j| >= c - c/8 >= c/2', nonneg(c/8 - g0/c**2))
check('[Step 1] c - 2 gamma_0/c^2 >= c/2: vortices of different pairs are at least c/2 apart', nonneg(c - 2*g0/c**2 - c/2))
check('[Step 1] m gamma_0 (1/c - c) <= m gamma_0/c <= 1/2: sum Gamma = 1 + gamma sum(a_j - b_j) lies in [1/2, 2]', nonneg(sp.Rational(1, 2) - m*g0/c))
check('[Step 1] gamma_0 <= c, so |sum Gamma z| <= m gamma (1/c^2 + gamma/c^3) <= 2 m gamma/c^2', nonneg(c - g0))
zero('[Step 1] |z_c| <= (2 m gamma/c^2)/(1/2) = 4 m gamma/c^2, which is c/2 at gamma = gamma_0, so |Z_j - z_c| >= c/2', 4*m*g0/c**2 - c/2)
check('[Step 2] 1/c + 1/c^3 + 4 m gamma_0/c^2 <= 3/c^3 (the right side of eq:pairZ)', nonneg(3/c**3 - (1/c + 1/c**3 + 4*m*g0/c**2)))
zero('[Step 2]    and (3/c^3)/(2 pi c/2) = 3/(pi c^4): |kappa| <= 3/(pi c^4)', (3/c**3)/(2*sp.pi*c/2) - 3/(sp.pi*c**4))
check('[Step 3] gamma_0/c^3 <= 1/8, so |gamma a u^2/(1 + gamma a u)| <= gamma c^-5/(1 - gamma c^-3) <= 2 gamma/c^5', nonneg(sp.Rational(1, 8) - g0/c**3))
check('[Step 3] gamma_0 (2/c^5 + 8(m - 1)/c^7) <= c^-4: |rho_j| <= c^-4', nonneg(c**-4 - g0*(2/c**5 + 8*(m - 1)/c**7)))
check('[Step 3] |nu_j| <= |u|(2 pi |kappa| |Z|^2 |u| + |u| + |rho|) <= c^-2 (6 c^-8 + c^-2 + c^-4) <= 8 c^-10',
      nonneg(8*c**-10 - c**-2*(6*c**-8 + c**-2 + c**-4)))

mp.mp.dps = 30
MARGIN = mp.mpf(10)**-24                  # rounding at the boundary of the class (c = 1 forces equalities)
rng = random.Random(20260925)
worst = {}
KEYS = ['|d_j| <= gamma/c^2', '|W_j| >= c/2', 'distance between pairs >= c/2', 'sum Gamma in [1/2, 2]',
        '|sum Gamma z| <= 2 m gamma/c^2', '|z_c| <= 4 m gamma/c^2', '|Z_j - z_c| >= c/2', '|gamma b_j/d_j| <= c^-3',
        '|u_j| in [c^2, c^-2]', '|f_l| <= 4 gamma/c^2 at the vortices of other pairs',
        '|f_l(W_j) - f_l(Z_j)| <= 8 gamma |d_j|/c^3', 'right side of eq:pairZ <= 3/c^3',
        '|kappa_j| <= 3/(pi c^4), kappa_j solving eq:pairZ at Z_j', '|gamma a u^2/(1 + gamma a u)| <= 2 gamma/c^5',
        '|rho_j| <= gamma (2/c^5 + 8(m - 1)/c^7)', '|rho_j| <= c^-4', '|nu_j| <= 8 c^-10, nu_j solving eq:rel with kappa_j']


def upd(key, val):
    worst[key] = max(worst.get(key, -mp.inf), val)


nconf = 0
for mm in (1, 2, 3, 4):
    for cc in (mp.mpf('0.3'), mp.mpf('0.6'), mp.mpf(1)):
        gg0 = cc**3/(8*mm)
        for gam in (gg0, gg0/7):
            for _ in range(40):
                Zs = []
                while len(Zs) < mm:                 # |Z_j| in [c, 1/c], |Z_j - Z_l| >= c
                    r = cc + (1/cc - cc)*mp.mpf(rng.random())
                    q = mp.expj(2*mp.pi*mp.mpf(rng.random()))
                    if all(abs(r*q - Z) >= cc for Z in Zs):
                        Zs.append(r*q)
                aa = [cc + (1/cc - cc)*mp.mpf(rng.random()) for _ in range(mm)]
                bb = [cc + (1/cc - cc)*mp.mpf(rng.random()) for _ in range(mm)]
                ds = [Z*gam*(cc + (1/cc - cc)*mp.mpf(rng.random()))*mp.expj(2*mp.pi*mp.mpf(rng.random())) for Z in Zs]
                Ws = [Z + dj for Z, dj in zip(Zs, ds)]
                us = [ds[j]/(gam*aa[j]*Zs[j]) for j in range(mm)]
                Gt = 1 + gam*sum(x - y_ for x, y_ in zip(aa, bb))
                SGz = sum(gam*(aa[j]*Zs[j] - bb[j]*Ws[j]) for j in range(mm))
                zc = SGz/Gt
                upd('|d_j| <= gamma/c^2', max(abs(dj) for dj in ds) - gam/cc**2)
                upd('|W_j| >= c/2', cc/2 - min(abs(W) for W in Ws))
                if mm > 1:
                    upd('distance between pairs >= c/2', cc/2 - min(abs(P1 - P2) for j in range(mm) for l in range(mm) if l != j
                                                                   for P1 in (Zs[j], Ws[j]) for P2 in (Zs[l], Ws[l])))
                upd('sum Gamma in [1/2, 2]', max(mp.mpf(1)/2 - Gt, Gt - 2))
                upd('|sum Gamma z| <= 2 m gamma/c^2', abs(SGz) - 2*mm*gam/cc**2)
                upd('|z_c| <= 4 m gamma/c^2', abs(zc) - 4*mm*gam/cc**2)
                upd('|Z_j - z_c| >= c/2', cc/2 - min(abs(Z - zc) for Z in Zs))
                upd('|gamma b_j/d_j| <= c^-3', max(gam*bb[j]/abs(ds[j]) for j in range(mm)) - cc**-3)
                upd('|u_j| in [c^2, c^-2]', max(max(cc**2 - abs(t), abs(t) - cc**-2) for t in us))
                for j in range(mm):
                    fsum = mp.mpf(0)
                    rho2 = mp.mpf(0)
                    for l in range(mm):
                        if l == j:
                            continue

                        def fl(z):
                            return gam*aa[l]/(z - Zs[l]) - gam*bb[l]/(z - Ws[l])
                        upd('|f_l| <= 4 gamma/c^2 at the vortices of other pairs', max(abs(fl(Zs[j])), abs(fl(Ws[j]))) - 4*gam/cc**2)
                        dF = fl(Ws[j]) - fl(Zs[j])
                        upd('|f_l(W_j) - f_l(Z_j)| <= 8 gamma |d_j|/c^3', abs(dF) - 8*gam*abs(ds[j])/cc**3)
                        fsum += fl(Zs[j])
                        rho2 += dF
                    rhs = 1/Zs[j] + gam*bb[j]/ds[j] + fsum                   # right side of eq:pairZ
                    upd('right side of eq:pairZ <= 3/c^3', abs(rhs) - 3/cc**3)
                    kj = mp.conj(rhs/(2j*mp.pi*mp.conj(Zs[j] - zc)))           # the kappa that eq:pairZ would need
                    upd('|kappa_j| <= 3/(pi c^4), kappa_j solving eq:pairZ at Z_j', abs(kj) - 3/(mp.pi*cc**4))
                    rem = gam*aa[j]*us[j]**2/(1 + gam*aa[j]*us[j])
                    upd('|gamma a u^2/(1 + gamma a u)| <= 2 gamma/c^5', abs(rem) - 2*gam/cc**5)
                    rho = rem + rho2*Zs[j]/(gam*aa[j])
                    upd('|rho_j| <= gamma (2/c^5 + 8(m - 1)/c^7)', abs(rho) - gam*(2/cc**5 + 8*(mm - 1)/cc**7))
                    upd('|rho_j| <= c^-4', abs(rho) - cc**-4)
                    nuj = us[j]*(2j*mp.pi*mp.conj(kj)*abs(Zs[j])**2*mp.conj(us[j]) + us[j] - rho)   # eq:rel solved for nu
                    upd('|nu_j| <= 8 c^-10, nu_j solving eq:rel with kappa_j', abs(nuj) - 8*cc**-10)
                nconf += 1
for key in KEYS:
    check('[bound] %s on %d random configurations of the class (m = 1..4, c = 0.3, 0.6, 1, gamma = gamma_0, gamma_0/7)' % (key, nconf),
          worst[key] <= MARGIN, 'largest excess %s, rounding margin 1e-24' % mp.nstr(worst[key], 3))

# ============================================================================ 3. exact self-similar collapses
print('3. Exact self-similar collapses of 1 + 2m vortices, Newton at 50 digits (illustration, not part of the proof)')
mp.mp.dps = 50
S3 = mp.sqrt(3)/2
EPI3 = mp.mpf(1)/2 + 1j*S3
ACCEPT = mp.mpf('1e-40')
CCLS = mp.mpf(1)/2                           # the constant c of (eq:class) for the solutions below


def bsum(zl, Gl, i):
    return sum(Gl[k]/(zl[i] - zl[k]) for k in range(len(zl)) if k != i)


def raw_residual(zl, Gl, kp):
    """max over all vortices of |zdot_i - kappa (z_i - z_c)|/(|kappa| max|z - z_c|), zdot from eq:bs directly"""
    zc_ = sum(G*z for G, z in zip(Gl, zl))/sum(Gl)
    return (max(abs(mp.conj(bsum(zl, Gl, i)/(2j*mp.pi)) - kp*(zl[i] - zc_)) for i in range(len(zl)))
            / (abs(kp)*max(abs(z - zc_) for z in zl)))


def selfsim(zl, Gl):
    """kappa from the vortex farthest from z_c (never divides by z_i - z_c = 0) and the residual over all vortices"""
    zc_ = sum(G*z for G, z in zip(Gl, zl))/sum(Gl)
    i0 = max(range(len(zl)), key=lambda i: abs(zl[i] - zc_))
    kp = mp.conj(bsum(zl, Gl, i0)/(2j*mp.pi))/(zl[i0] - zc_)
    return kp, raw_residual(zl, Gl, kp)


def P_of(kp):
    return abs(kp.imag)/(-2*kp.real)


class Family:
    """Strong vortex 1 at gamma^2 zeta; pair j: gamma a_j at Z_j = r_j e^{i phi_j} (r_1 = 1 fixes scale and rotation)
    and -gamma b_j at W_j = Z_j (1 + gamma a_j u_j), b_j = a_j (1 - gamma a_j nu_j). The family at fixed gamma, a_j and
    phi_j is a curve; it is parametrized by y = Im u_J. Unknowns: zeta, u_j (Re u_J only), r_2..r_m, kappa, nu_j.
    Equations: the self-similarity of every pair vortex (the strong vortex follows, part 1) and z_c = 0, scaled to
    be of order 1. With sym = True the pairs are rotated copies of pair 1 and the strong vortex is at 0 (C_m)."""

    def __init__(self, gam, a_, phis, J, sym=False):
        self.g = mp.mpf(gam)
        self.a = [mp.mpf(q) for q in a_]
        self.m = len(a_)
        self.ph = [mp.mpf(q) for q in phis]
        self.J = J
        self.sym = sym

    def unpack(self, Xv, yv):
        Xv = list(Xv)
        if self.sym:
            us = [mp.mpc(Xv[0], yv)]*self.m
            return mp.mpc(0), us, [mp.mpf(1)]*self.m, mp.mpc(Xv[1], Xv[2]), [Xv[3]]*self.m
        zet = mp.mpc(Xv[0], Xv[1])
        k = 2
        us = []
        for j in range(self.m):
            if j == self.J:
                us.append(mp.mpc(Xv[k], yv))
                k += 1
            else:
                us.append(mp.mpc(Xv[k], Xv[k + 1]))
                k += 2
        rs = [mp.mpf(1)] + Xv[k:k + self.m - 1]
        k += self.m - 1
        return zet, us, rs, mp.mpc(Xv[k], Xv[k + 1]), Xv[k + 2:k + 2 + self.m]

    def config(self, Xv, yv):
        zet, us, rs, kp, nu_ = self.unpack(Xv, yv)
        gm = self.g
        zl = [gm**2*zet]
        Gl = [mp.mpf(1)]
        for j in range(self.m):
            Zj = rs[j]*mp.expj(self.ph[j])
            aj = self.a[j]
            zl += [Zj, Zj*(1 + gm*aj*us[j])]
            Gl += [gm*aj, -gm*aj*(1 - gm*aj*nu_[j])]
        return zl, Gl, kp

    def F(self, Xv, yv):
        zl, Gl, kp = self.config(Xv, yv)
        gm = self.g
        zc_ = sum(G*z for G, z in zip(Gl, zl))/sum(Gl)
        out = []
        for j in (range(1) if self.sym else range(self.m)):
            i = 1 + 2*j
            eZ = bsum(zl, Gl, i) - 2j*mp.pi*mp.conj(kp*(zl[i] - zc_))
            eW = bsum(zl, Gl, i + 1) - 2j*mp.pi*mp.conj(kp*(zl[i + 1] - zc_))
            out += [eZ, (eW - eZ)*zl[i]/(gm*self.a[j])]
        if not self.sym:
            out.append(zc_/gm**2)
        res = []
        for q in out:
            res += [q.real, q.imag]
        return mp.matrix(res)

    def guess(self, yv, sheet=''):
        """leading order (eq:limit) with p = 1/2 and nu = 1: y_l = y ('=') or 3/(4y) ('*'), |Z_l|^2 proportional to |1 + 1/u_l|"""
        ys_ = []
        it = iter(sheet)
        for j in range(self.m):
            ys_.append(yv if (j == self.J or self.sym) else (yv if next(it) == '=' else mp.mpf(3)/(4*yv)))
        us = [mp.mpf(1)/2 + 1j*q for q in ys_]
        K = 1 + 1/us[0]
        kp = 1j*mp.conj(K)/(2*mp.pi)
        if self.sym:
            return mp.matrix([mp.mpf(1)/2, kp.real, kp.imag, 1])
        Xv = [0, 0]
        for j in range(self.m):
            Xv += [us[j].real] if j == self.J else [us[j].real, us[j].imag]
        Xv += [mp.sqrt(abs(1 + 1/us[j])/abs(K)) for j in range(1, self.m)]
        return mp.matrix(Xv + [kp.real, kp.imag] + [1]*self.m)


def lu_apply(LUp, fv):
    LU, piv = LUp
    return mp.mp.U_solve(LU, mp.mp.L_solve(LU, fv.copy(), piv))


def newton(fam, Xv, yv, LUp=None, iters=40, tol=mp.mpf('1e-44')):
    """Newton's method with a forward-difference Jacobian that is kept while it still contracts fast (the curve is
    followed in small steps), so most iterations cost one evaluation of the equations."""
    Xv = mp.matrix(Xv)
    n = len(Xv)
    hh = mp.mpf('1e-25')
    fv = fam.F(Xv, yv)
    nf = mp.norm(fv)
    fresh = False
    for _ in range(iters):
        if nf < tol:
            break
        if LUp is None:
            Jm = mp.matrix(n, n)
            for col in range(n):
                dp = Xv.copy()
                dp[col] += hh
                dcol = (fam.F(dp, yv) - fv)/hh
                for row in range(n):
                    Jm[row, col] = dcol[row]
            LUp = mp.mp.LU_decomp(Jm)
            fresh = True
        Xn = Xv - lu_apply(LUp, fv)
        fn = fam.F(Xn, yv)
        nfn = mp.norm(fn)
        if not fresh and not nfn < nf*mp.mpf('1e-3'):
            LUp = None                      # the kept Jacobian contracts too slowly: recompute it at Xv
            continue
        Xv, fv, nf, fresh = Xn, fn, nfn, False
    return Xv, nf, LUp


def accepted(fam, Xv, yv, scaled):
    zl, Gl, kp = fam.config(Xv, yv)
    return scaled < ACCEPT and raw_residual(zl, Gl, kp) < ACCEPT and kp.real < 0


def minimize(fam, sheet=''):
    """continue from y = sqrt3/2 + 0.06 to sqrt3/2, then successive parabolic interpolation in y; every solve must pass
    the residual test, or the run is rejected"""
    ok = True
    nsolve = 0
    Xv = fam.guess(S3 + mp.mpf('0.06'), sheet)
    LUp = None
    for dstep in ('0.06', '0.04', '0.02', '0.01', '0.005', '0'):
        yv = S3 + mp.mpf(dstep)
        Xv, r, LUp = newton(fam, Xv, yv, LUp)
        ok = ok and accepted(fam, Xv, yv, r)
        nsolve += 1
    bank = {S3: Xv}
    state = {'LU': LUp}

    def Pv(yv):
        nonlocal ok, nsolve
        Xs, r, state['LU'] = newton(fam, bank[min(bank, key=lambda q: abs(q - yv))], yv, state['LU'])
        ok = ok and accepted(fam, Xs, yv, r)
        nsolve += 1
        bank[yv] = Xs
        return P_of(fam.config(Xs, yv)[2])
    yc_, hh = S3, mp.mpf('1e-3')
    for _ in range(14):
        Pm_, P0_, Pp_ = Pv(yc_ - hh), Pv(yc_), Pv(yc_ + hh)
        step = -hh*(Pp_ - Pm_)/(2*(Pp_ - 2*P0_ + Pm_))
        yc_ += step
        hh = max(min(hh, 4*abs(step)), mp.mpf('1e-18'))
        if abs(step) < mp.mpf('1e-24'):
            break
    Pmin = Pv(yc_)
    return yc_, Pmin, bank[yc_], ok, nsolve


def pair_data(zl, Gl, gm, mm):
    """translate the strong vortex (index 0) to the origin and read off a_j, b_j, Z_j, W_j, u_j, nu_j of the paper"""
    z0 = zl[0]
    Zs = [zl[1 + 2*j] - z0 for j in range(mm)]
    Ws = [zl[2 + 2*j] - z0 for j in range(mm)]
    aa = [Gl[1 + 2*j]/(Gl[0]*gm) for j in range(mm)]
    bb = [-Gl[2 + 2*j]/(Gl[0]*gm) for j in range(mm)]
    us = [(Ws[j] - Zs[j])/(gm*aa[j]*Zs[j]) for j in range(mm)]
    nu_ = [(aa[j] - bb[j])/(gm*aa[j]**2) for j in range(mm)]
    return aa, bb, Zs, Ws, us, nu_


def in_class(gm, aa, bb, Zs, Ws, cc):
    """(eq:class) itself; gamma <= gamma_0 = c^3/(8m) is the range of the proof's explicit bounds, tested separately"""
    mm = len(aa)
    return (all(cc <= q <= 1/cc for q in aa + bb) and all(cc <= abs(Z) <= 1/cc for Z in Zs)
            and all(cc*gm*abs(Z) <= abs(W - Z) <= gm*abs(Z)/cc for Z, W in zip(Zs, Ws))
            and all(abs(Zs[j] - Zs[l]) >= cc for j in range(mm) for l in range(mm) if l != j))


def proof_quantities(zl, Gl, kp, gm, mm):
    """with the strong vortex at the origin: z_c, rho_j of (eq:rel), the remainder of (eq:rate), the left side of (eq:imp)"""
    aa, bb, Zs, Ws, us, nu_ = pair_data(zl, Gl, gm, mm)
    zsh = [z - zl[0] for z in zl]
    zc_ = sum(G*z for G, z in zip(Gl, zsh))/sum(Gl)
    rho = [2j*mp.pi*mp.conj(kp)*abs(Zs[j])**2*mp.conj(us[j]) + us[j] - nu_[j]/us[j] for j in range(mm)]
    rate = [2j*mp.pi*mp.conj(kp)*abs(Zs[j])**2 - (1 + 1/us[j]) for j in range(mm)]
    imp = sum(aa[j]**2*abs(Zs[j])**2*(nu_[j] - 2*us[j].real) for j in range(mm))
    return zc_, rho, rate, imp


def Pminus_three(mu):
    """P_-(mu) of Theorem 1: the root of G (eq:K) on the arc A_-, then eq:Ptheta"""
    mu = mp.mpf(mu)
    Rr = 1 + mu + mu**2
    sR = mp.sqrt(Rr)
    C0 = (mu - 1)/2

    def G(C):
        return 4*(1 - mu)*C**3 + 4*(2*mu**2 - mu + 2)*C**2 + 2*(1 - mu)**3*C - (2*mu**4 + 7*mu**3 + 6*mu**2 + 7*mu + 2)
    C = mp.findroot(G, (-sR*(1 - mp.mpf(10)**-45), C0), solver='anderson')
    N = 2*(1 + mu**2)*Rr + (1 - mu)*(2 + mu + 2*mu**2)*C - 2*mu*C**2
    M = 1 - mu + 2*C
    return N/(2*mu*mp.sqrt(Rr - C**2)*abs(M)), C


def Pmin_centre(n, x):
    """the minimum over theta of Proposition 3 for the root x > 1: sqrt(D^2 - n^2)/(2n), x = e^{2t}"""
    t = mp.log(x)/2
    D = mp.sinh(n*t)*mp.coth(t) + n*mp.cosh(n*t)
    return mp.sqrt(D**2 - n**2)/(2*n), t


cases = [('m = 1 (three vortices)', [1], [0], 0, False, [''], ('1e-2', '1e-3', '1e-4')),
         ('m = 3 symmetric', [1, 1, 1], [0, 2*mp.pi/3, 4*mp.pi/3], 0, True, [''], ('1e-2', '1e-3', '1e-4')),
         ('m = 2 antipodal', [1, 1], [0, mp.pi], 0, True, [''], ('1e-4',)),
         ('m = 3 asymmetric', [1, '0.6', '1.5'], [0, mp.radians(97), mp.radians(221)], 2, False, ['==', '=*', '*=', '**'],
          ('1e-2', '1e-3', '1e-4'))]
results = {}
for label, a_, phis, J, sym, sheets, gams in cases:
    print('   %s: a = %s, directions of the pairs %s degrees%s' % (label, [mp.nstr(mp.mpf(q), 3) for q in a_],
          [mp.nstr(mp.degrees(q), 5) for q in phis],
          '; curve parametrized by y_3 = Im u_3, the four leading-order branches of pairs 1 and 2' if len(sheets) > 1 else ''))
    for gs in gams:
        fam = Family(gs, a_, phis, J, sym)
        gm = fam.g
        mm = fam.m
        runs = []
        for sh in sheets:
            yc_, Pmin, Xv, ok, ns = minimize(fam, sh)
            runs.append((Pmin, yc_, Xv, ok, ns, sh))
        allok = all(r[3] for r in runs)
        Pmin, yc_, Xv, ok, ns, sh = min(runs, key=lambda r: r[0])
        zl, Gl, kp = fam.config(Xv, yc_)
        aa, bb, Zs, Ws, us, nu_ = pair_data(zl, Gl, gm, mm)
        res = raw_residual(zl, Gl, kp)
        zc_ = sum(G*z for G, z in zip(Gl, zl))/sum(Gl)
        imp = sum(G*abs(z - zc_)**2 for G, z in zip(Gl, zl))
        s2 = sum(Gl[i]*Gl[k] for i in range(len(Gl)) for k in range(i + 1, len(Gl)))
        gy = [(q.imag**2 + mp.mpf(3)/4)/(2*q.imag) for q in us]
        zcs, rho, rate, impl = proof_quantities(zl, Gl, kp, gm, mm)
        results[(label, gs)] = dict(P=Pmin, us=us, nu=nu_, Zs=Zs, gy=gy, res=res, ok=allok, zl=zl, Gl=Gl, kp=kp, aa=aa,
                                    fam=fam, X=Xv, y=yc_, zc=zcs, rho=rho, rate=rate, imp=impl)
        print('      gamma = %s: P_min = %s, (P_min - sqrt3/2)/gamma^2 = %s%s; %d solves%s' % (
            gs, mp.nstr(Pmin, 22), mp.nstr((Pmin - S3)/gm**2, 8),
            (' (branches %s: ' % ', '.join(r[5] for r in runs) + ', '.join(mp.nstr((r[0] - S3)/gm**2, 8) for r in runs) + ')')
            if len(runs) > 1 else '', sum(r[4] for r in runs), '' if allok else ', NOT all converged'))
        print('         max |u_j - e^{i pi/3}|/gamma = %s, max |nu_j - 1|/gamma = %s, max ||Z_j|/|Z_l| - 1|/gamma = %s, max |P - (y_j^2 + 3/4)/(2y_j)|/gamma = %s' % (
            mp.nstr(max(abs(q - EPI3) for q in us)/gm, 5), mp.nstr(max(abs(q - 1) for q in nu_)/gm, 5),
            mp.nstr(max(abs(abs(Z1_)/abs(Z2_) - 1) for Z1_ in Zs for Z2_ in Zs)/gm, 5), mp.nstr(max(abs(Pmin - q) for q in gy)/gm, 5)))
        print('         |z_c|/gamma^2 = %s, max |rho_j|/gamma = %s, max remainder of eq:rate/gamma = %s, |left side of eq:imp|/gamma = %s' % (
            mp.nstr(abs(zcs)/gm**2, 5), mp.nstr(max(abs(q) for q in rho)/gm, 5), mp.nstr(max(abs(q) for q in rate)/gm, 5),
            mp.nstr(abs(impl)/gm, 5)))
        check('   every solve converged; Biot-Savart residual of all %d vortices < 1e-40; angular impulse and sum_{i<k} Gamma_i Gamma_k < 1e-40'
              % len(zl), allok and res < ACCEPT and abs(imp) < ACCEPT and abs(s2) < ACCEPT,
              'residual %s, impulse %s, sum %s' % (mp.nstr(res, 3), mp.nstr(abs(imp), 3), mp.nstr(abs(s2), 3)))
        gam0 = CCLS**3/(8*mm)
        if gm <= gam0:
            cc = CCLS
            bounds = (abs(zcs) <= 4*mm*gm/cc**2 and abs(kp) <= 3/(mp.pi*cc**4)
                      and all(abs(q) <= gm*(2/cc**5 + 8*(mm - 1)/cc**7) for q in rho) and all(abs(q) <= 8*cc**-10 for q in nu_))
            check('   in (eq:class) with c = 1/2, gamma <= gamma_0 = %s, and the bounds of Steps 1-3 hold on it'
                  ' (|z_c|, |kappa|, |rho_j|, |nu_j|)' % mp.nstr(gam0, 4), in_class(gm, aa, bb, Zs, Ws, CCLS) and bounds,
                  '|kappa| = %s <= %s, max |rho_j| = %s <= %s' % (mp.nstr(abs(kp), 4), mp.nstr(3/(mp.pi*cc**4), 4),
                                                                  mp.nstr(max(abs(q) for q in rho), 3),
                                                                  mp.nstr(gm*(2/cc**5 + 8*(mm - 1)/cc**7), 3)))
        else:
            check('   in (eq:class) with c = 1/2 (gamma > gamma_0 = %s: the explicit bounds of the proof are not claimed at this gamma)'
                  % mp.nstr(gam0, 4), in_class(gm, aa, bb, Zs, Ws, CCLS))
        check('   sqrt(3)/2 < P_min < sqrt(3)/2 + 3 gamma^2 (numerical observation)', S3 < Pmin < S3 + 3*gm**2,
              'P_min - sqrt3/2 = %s' % mp.nstr(Pmin - S3, 5))
        fo = max(max(abs(nu_[j] - (1 - gm*aa[j])), abs(us[j].real - (mp.mpf(1)/2 - gm*aa[j]*(us[j].imag**2 + mp.mpf(1)/4)/2)))
                 for j in range(mm))/gm**2
        check('   every pair agrees with the O(gamma) corrections of part 1 (nu = 1 - gamma a, p = 1/2 - gamma a (y^2 + 1/4)/2) to O(gamma^2)',
              fo < 10, 'largest deviation/gamma^2 = %s' % mp.nstr(fo, 4))
        if label.startswith('m = 1'):
            Pe, C = Pminus_three(gs)
            check('   equals P_-(gamma) of Theorem 1 (root of G on A_-, eq:Ptheta), and nu_1 = 1/(1 + gamma)',
                  abs(Pmin - Pe) < ACCEPT and abs(nu_[0] - 1/(1 + gm)) < ACCEPT,
                  'difference %s; nu_1 - 1/(1 + gamma) = %s' % (mp.nstr(Pmin - Pe, 3), mp.nstr(nu_[0] - 1/(1 + gm), 3)))
        if sym:
            G0 = 1/(gm*bb[0])
            xx = aa[0]/bb[0]
            n = mm
            circ0 = (n - 1)*xx**2 - 2*(n - G0)*xx + (n - 1) - 2*G0
            Pe, t = Pmin_centre(n, xx)
            th = mp.arg(Ws[0]/Zs[0])
            aP = mp.coth(t)*mp.cosh(n*t) + n*mp.sinh(n*t)
            bP = mp.coth(t)
            check('   the rings of Proposition 3 with Gamma0 = 1/(gamma b), x = a/b: eq:circ0 holds, P_min = sqrt(D^2 - n^2)/(2n), cos(n theta) = b/a',
                  abs(circ0) < ACCEPT*G0 and abs(Pmin - Pe) < ACCEPT and abs(mp.cos(n*th) - bP/aP) < mp.mpf('1e-20'),
                  'Gamma0 = %s; residual of eq:circ0 %s; P_min - formula %s' % (mp.nstr(G0, 12), mp.nstr(circ0, 3), mp.nstr(Pmin - Pe, 3)))
LAB3 = ('m = 1 (three vortices)', 'm = 3 symmetric', 'm = 3 asymmetric')
GAMS = ('1e-2', '1e-3', '1e-4')
for label in LAB3:
    rr = [results[(label, gs)] for gs in GAMS]
    check('%s: P_min decreases to sqrt(3)/2 as gamma = 1e-2, 1e-3, 1e-4, and u_j -> e^{i pi/3}, nu_j -> 1, |Z_j|/|Z_l| -> 1 (Theorem 3(b))' % label,
          rr[0]['P'] > rr[1]['P'] > rr[2]['P'] > S3 and
          all(max(abs(q - EPI3) for q in rr[i + 1]['us']) < max(abs(q - EPI3) for q in rr[i]['us']) / 5 for i in range(2)) and
          all(max(abs(q - 1) for q in rr[i + 1]['nu']) < max(abs(q - 1) for q in rr[i]['nu']) / 5 for i in range(2)) and
          max(abs(q - EPI3) for q in rr[2]['us']) < mp.mpf('1e-3') and
          max(abs(abs(Z1_)/abs(Z2_) - 1) for Z1_ in rr[2]['Zs'] for Z2_ in rr[2]['Zs']) < mp.mpf('1e-3'))
    check('%s: |P - (y_j^2 + 3/4)/(2 y_j)| -> 0 and p_j -> 1/2 for every pair (Theorem 3(c))' % label,
          all(max(abs(rr[i]['P'] - q) for q in rr[i]['gy']) < mp.mpf('1e-3') for i in range(3)) and
          max(abs(rr[2]['P'] - q) for q in rr[2]['gy']) < max(abs(rr[0]['P'] - q) for q in rr[0]['gy'])/50 and
          max(abs(q.real - mp.mpf(1)/2) for q in rr[2]['us']) < mp.mpf('1e-3'))
    rz = [abs(r['zc'])/mp.mpf(gs)**2 for r, gs in zip(rr, GAMS)]
    rq = [max(max(abs(q) for q in r['rho']), max(abs(q) for q in r['rate']), abs(r['imp']))/mp.mpf(gs) for r, gs in zip(rr, GAMS)]
    check('%s: |z_c|/gamma^2, |rho_j|/gamma, the remainder of eq:rate/gamma and eq:imp/gamma stay bounded (Steps 3-4)' % label,
          max(rz) < 10 and max(rq) < 10 and rz[2] < 2*rz[0] + ACCEPT and rq[2] < 2*rq[0],
          '|z_c|/gamma^2 = %s; largest of the others %s' % (', '.join(mp.nstr(q, 4) for q in rz), ', '.join(mp.nstr(q, 4) for q in rq)))
K1 = 3*mp.sqrt(3)/4
ratio = [(results[('m = 1 (three vortices)', gs)]['P'] - S3)/mp.mpf(gs)**2 for gs in GAMS]
check('m = 1: (P_min - sqrt3/2)/gamma^2 agrees with the expansion (3 sqrt3/4)(1 - gamma) of part 1 to O(gamma^2)',
      all(abs(q - K1*(1 - mp.mpf(gs))) < mp.mpf(gs)**2 for q, gs in zip(ratio, GAMS)),
      '%s; 3 sqrt3/4 = %s' % (', '.join(mp.nstr(q, 8) for q in ratio), mp.nstr(K1, 8)))
L3 = mp.sqrt(3)*19/36
ratio = [(results[('m = 3 symmetric', gs)]['P'] - S3)/mp.mpf(gs)**2 for gs in GAMS]
check('m = 3 symmetric: (P_min - sqrt3/2)/gamma^2 increases to sqrt3 (1 + 2*3^2)/36 = 19 sqrt3/36 (Proposition 3), the gap shrinking like gamma',
      ratio[0] < ratio[1] < ratio[2] < L3 and all(L3 - ratio[i + 1] < (L3 - ratio[i])/5 for i in range(2)),
      '%s; 19 sqrt3/36 = %s' % (', '.join(mp.nstr(q, 8) for q in ratio), mp.nstr(L3, 8)))
c2 = (results[('m = 2 antipodal', '1e-4')]['P'] - S3)/mp.mpf('1e-4')**2
check('m = 2 antipodal, gamma = 1e-4: (P_min - sqrt3/2)/gamma^2 is near sqrt3 (1 + 2*2^2)/36 = sqrt3/4 (Proposition 3)',
      abs(c2 - mp.sqrt(3)/4) < mp.mpf('1e-3'), '%s; sqrt3/4 = %s' % (mp.nstr(c2, 8), mp.nstr(mp.sqrt(3)/4, 8)))
ratio = [(results[('m = 3 asymmetric', gs)]['P'] - S3)/mp.mpf(gs)**2 for gs in GAMS]
check('m = 3 asymmetric: (P_min - sqrt3/2)/gamma^2 settles (numerical evidence of a gamma^2 rate, not proved)',
      abs(ratio[2] - ratio[1]) < abs(ratio[1] - ratio[0]) and abs(ratio[2] - ratio[1]) < mp.mpf('0.01'), ', '.join(mp.nstr(q, 7) for q in ratio))
r = results[('m = 3 asymmetric', '1e-2')]
zr = [mp.conj(q) for q in r['zl']]
Gr = [-q for q in r['Gl']]
kr, rr_ = selfsim(zr, Gr)
check('(Gamma, z) -> (-Gamma, conj z) on the asymmetric m = 3 solution at gamma = 1e-2: again self-similar, kappa -> conj(kappa), same P',
      rr_ < ACCEPT and abs(kr - mp.conj(r['kp'])) < ACCEPT*abs(r['kp']), 'residual %s, |kappa\' - conj(kappa)| = %s' % (
          mp.nstr(rr_, 3), mp.nstr(abs(kr - mp.conj(r['kp'])), 3)))

# ============================================================================ 4. the two families lie in the class
print('4. The families of Corollary 1 and Proposition 3 satisfy (eq:class) near their minima')
lines = []
ok_all = True
devs = []
for which in ('sharpness sequence sin(theta) = -sqrt(3) mu/2', 'arc minimizer on A_-'):
    for ms in ('1e-2', '1e-3', '1e-4', '1e-6'):
        mu = mp.mpf(ms)
        Rr = 1 + mu + mu**2
        sR = mp.sqrt(Rr)
        if which.startswith('sharp'):
            th = mp.pi + mp.asin(mp.sqrt(3)*mu/2)
        else:
            C = Pminus_three(mu)[1]
            th = 2*mp.pi - mp.acos(C/sR)
        zl = [mu*(1 + sR*mp.expj(-th))/(1 + mu)**2, (mu - sR*mp.expj(-th))/(1 + mu)**2, mp.mpc(1)]
        Gl = [mp.mpf(1), mu, -mu/(1 + mu)]
        kp, res = selfsim(zl, Gl)
        Pbs = P_of(kp)
        aa, bb, Zs, Ws, us, nu_ = pair_data(zl, Gl, mu, 1)
        ok_all = ok_all and in_class(mu, aa, bb, Zs, Ws, mp.mpf(1)/2) and res < ACCEPT and kp.real < 0 \
            and abs(bb[0] - 1/(1 + mu)) < ACCEPT and abs(nu_[0] - 1/(1 + mu)) < ACCEPT and abs(abs(Zs[0]) - sR/(1 + mu)) < ACCEPT
        if which.startswith('arc'):             # 1e-35: at mu = 1e-6, P_-(mu) from the root of G loses digits to cancellation
            ok_all = ok_all and abs(Pbs - Pminus_three(mu)[0]) < mp.mpf('1e-35')
        devs.append((which, ms, abs(us[0] - EPI3), Pbs - S3))
        lines.append('%s, mu = %s: u_1 - e^{i pi/3} = %s, P - sqrt3/2 = %s, residual %s' % (
            which, ms, mp.nstr(us[0] - EPI3, 4), mp.nstr(Pbs - S3, 4), mp.nstr(res, 3)))
for t in lines:
    print('      ' + t)
check('three vortices (m = 1, gamma = mu, a = 1, b = 1/(1 + mu), Z = z_2 - z_1, W = z_3 - z_1): self-similar by Biot-Savart,'
      ' in the class with c = 1/2, nu_1 = 1/(1 + mu), |Z_1| = sqrt(R)/(1 + mu); at the arc minimizer P = P_-(mu) to 1e-35', ok_all)
check('   and u_1 -> e^{i pi/3}, P -> sqrt(3)/2 along both sequences (|u_1 - e^{i pi/3}| < 2 mu, 0 < P - sqrt3/2 < 2 mu)',
      all(dv[2] < 2*mp.mpf(dv[1]) and 0 < dv[3] < 2*mp.mpf(dv[1]) for dv in devs))
lines = []
ok_all = True
devs = []
for n in (2, 3, 5, 7):
    cc = min(mp.mpf(1)/2, 2*mp.sin(mp.pi/n))
    for G0s in ('1e2', '1e3', '1e4', '1e6'):
        G0 = mp.mpf(G0s)
        xx = ((n - G0) + mp.sqrt((G0 - 1)**2 + 2*(n - 1)))/(n - 1)
        t = mp.log(xx)/2
        aP = mp.coth(t)*mp.cosh(n*t) + n*mp.sinh(n*t)
        bP = mp.coth(t)
        th = mp.acos(bP/aP)/n                       # the minimizing relative rotation, 0 < n theta < pi
        gm = 1/G0
        roots = [mp.expjpi(2*mp.mpf(j)/n) for j in range(n)]
        zl = [mp.mpc(0)]
        Gl = [mp.mpf(1)]
        for e_ in roots:                            # strong vortex, then the pairs (Z_j, W_j)
            zl += [e_, mp.sqrt(xx)*mp.expj(th)*e_]
            Gl += [gm*xx, -gm]
        kp, res = selfsim(zl, Gl)                   # residual over all 2n + 1 vortices, the centre included
        Pbs = P_of(kp)
        aa, bb, Zs, Ws, us, nu_ = pair_data(zl, Gl, gm, n)
        okc = in_class(gm, aa, bb, Zs, Ws, cc) and res < ACCEPT and kp.real < 0 and abs(Pbs - Pmin_centre(n, xx)[0]) < ACCEPT \
            and abs(nu_[0] - (xx - 1)*G0/xx**2) < ACCEPT
        ok_all = ok_all and okc
        devs.append((n, G0, max(abs(q - EPI3) for q in us), abs(nu_[0] - 1), th/t - mp.sqrt(3), Pbs - S3))
        if n in (2, 7):
            lines.append('n = %d, Gamma0 = %s: max|u_j - e^{i pi/3}| = %s, nu - 1 = %s, theta/t - sqrt3 = %s, P - sqrt3/2 = %s, residual %s, gamma %s gamma_0' % (
                n, G0s, mp.nstr(devs[-1][2], 4), mp.nstr(nu_[0] - 1, 4), mp.nstr(devs[-1][4], 4), mp.nstr(devs[-1][5], 4),
                mp.nstr(res, 3), '<=' if gm <= cc**3/(8*n) else '>'))
for t in lines:
    print('      ' + t)
check('rings, n = 2, 3, 5, 7, Gamma0 = 1e2..1e6, minimizing theta (m = n, gamma = 1/Gamma0, a = x, b = 1, Z_j = e^{2 pi i j/n}): '
      'self-similar by Biot-Savart (all 2n + 1 vortices), P = Proposition 3 minimum, nu_j = (x - 1) Gamma0/x^2, in the class with c = min(1/2, 2 sin(pi/n))',
      ok_all)
check('   and u_j -> e^{i pi/3}, nu_j -> 1, theta/t -> sqrt(3), P -> sqrt(3)/2 (each deviation < 10/Gamma0)',
      all(dv[2] < 10/dv[1] and dv[3] < 10/dv[1] and abs(dv[4]) < 10/dv[1] and 0 < dv[5] < 10/dv[1] for dv in devs))

# ============================================================================ 5. negative controls
print('5. Negative controls (each must fail as described)')
G0 = mp.mpf(6383)/2250
phi = mp.acos(mp.mpf(13)/18)/2
zl = [mp.mpc(0), mp.mpc(2), mp.mpc(-2), 2*mp.expj(phi), -2*mp.expj(phi), mp.mpc(4)/3, mp.mpc(-4)/3]
Gl = [G0, mp.mpf(14)/15, mp.mpf(14)/15, mp.mpf(-62)/45, mp.mpf(-62)/45, mp.mpf(1), mp.mpf(1)]
kp, res = selfsim(zl, Gl)
Pdk = P_of(kp)
check('"P >= sqrt(3)/2 for every self-similar collapse" is false: the seven-vortex collapse of Demina and Kudryashov is self-similar'
      ' (all 7 vortices, zero impulse) with P = 12433/(1240 sqrt 155) < sqrt(3)/2',
      res < ACCEPT and abs(sum(G*abs(z)**2 for G, z in zip(Gl, zl))) < ACCEPT and kp.real < 0
      and abs(Pdk - mp.mpf(12433)/(1240*mp.sqrt(155))) < ACCEPT and Pdk < S3, 'P = %s, residual %s' % (mp.nstr(Pdk, 12), mp.nstr(res, 3)))
npos = sum(1 for G in Gl[1:] if G > 0)
nneg = sum(1 for G in Gl[1:] if G < 0)
check('   it is not of the form of Theorem 3 for any c and gamma: its six weaker vortices are %d positive and %d negative, not m opposite pairs'
      % (npos, nneg), npos != nneg)
ratios = sorted(set(mp.nstr(abs(G)/G0, 2) for G in Gl[1:]))
check('   its other circulations are %s times the central one (no dominant vortex), far above gamma_0/c = c^2/(8m) <= 1/24 (m = 3),'
      ' the largest weak/strong ratio covered by the explicit bounds of the proof' % ', '.join(ratios), min(abs(G)/G0 for G in Gl[1:]) > mp.mpf(1)/24)
near = min((abs(zl[i] - zl[k]), i, k) for i in range(1, 7) for k in range(1, 7) if Gl[i]*Gl[k] < 0)
sep = near[0]/abs(zl[near[1]])
check('   and its nearest opposite-sign neighbours are separated by %s times their distance from the center (not tight; in the class'
      ' with gamma <= gamma_0 this is at most gamma_0/c <= 1/24)'
      % mp.nstr(sep, 2), abs(sep - mp.mpf('0.3796')) < mp.mpf('1e-3') and abs(abs(zl[near[1]]) - abs(zl[near[2]])) < ACCEPT
      and sep > mp.mpf(1)/24)
fam = Family('1e-3', [1, '0.6', '1.5'], [0, mp.radians(97), mp.radians(221)], 0)
Xv, r, _ = newton(fam, fam.guess(S3, '=='), S3)
zl2, Gl2, kp2 = fam.config(Xv, S3)
check('asymmetric m = 3, gamma = 1e-3, parametrized by Im u_1 = sqrt(3)/2 (the fold of part 1): Newton does not converge and the residual test rejects the point',
      not accepted(fam, Xv, S3, r), 'scaled residual %s, Biot-Savart residual %s' % (mp.nstr(r, 3), mp.nstr(raw_residual(zl2, Gl2, kp2), 3)))
fam = Family('1e-2', [1, 1, 1], [0, 2*mp.pi/3, 4*mp.pi/3], 0)
Xv, r, _ = newton(fam, fam.guess(S3 + mp.mpf('0.06'), '=='), S3 + mp.mpf('0.06'), iters=2)
zl2, Gl2, kp2 = fam.config(Xv, S3 + mp.mpf('0.06'))
check('m = 3, gamma = 1e-2: Newton stopped after 2 iterations from the leading-order guess is rejected by the residual test',
      not accepted(fam, Xv, S3 + mp.mpf('0.06'), r), 'Biot-Savart residual %s' % mp.nstr(raw_residual(zl2, Gl2, kp2), 3))
r = results[('m = 3 asymmetric', '1e-3')]
Xp = r['X'].copy()
Xp[2] += mp.mpf('1e-20')
zl2, Gl2, kp2 = r['fam'].config(Xp, r['y'])
check('a converged solution (asymmetric m = 3, gamma = 1e-3) with Re u_1 moved by 1e-20 fails the residual test',
      r['ok'] and not accepted(r['fam'], Xp, r['y'], mp.norm(r['fam'].F(Xp, r['y']))),
      'Biot-Savart residual %s' % mp.nstr(raw_residual(zl2, Gl2, kp2), 3))
coll = []
for yv in (mp.mpf(0), mp.mpf('-0.5'), S3):
    uu = mp.mpf(1)/2 + 1j*yv
    kl = 1j*mp.conj(1 + 1/uu)/(2*mp.pi)
    coll.append(kl.real < 0)
check('the limit rate kappa* = i conj(1 + 1/u)/(2 pi |Z|^2) with u = 1/2 + iy is not a collapse at y = 0 (Re kappa* = 0) or y = -1/2'
      ' (Re kappa* > 0), and is one at y = sqrt(3)/2', coll == [False, False, True])
up, np_ = mp.mpf(-1), mp.mpf(1)
check('without the angular impulse Case B is not excluded: u = -1, nu = 1 solves the first two limit equations (eq:limit) with kappa* = 0',
      1 + 1/up == 0 and -up + np_/up == 0 and 2*up**2 + up - np_ == 0 and np_ - 2*up == 3)
cst = S3 + mp.mpf('1e-7')
check('"P_min > sqrt(3)/2 + 1e-7" is false at gamma = 1e-4 for m = 1, symmetric and asymmetric m = 3: the constant is sharp',
      all(results[(lb, '1e-4')]['P'] < cst for lb in LAB3))
check('"u_j = e^{i pi/3} exactly" is false at gamma = 1e-2 (the theorem is asymptotic)',
      all(abs(q - EPI3) > mp.mpf('1e-4') for q in results[('m = 3 asymmetric', '1e-2')]['us']))

print()
print('%d checks, runtime %.0f s' % (NCHECK[0], time.time() - T0))
if FAILED:
    print('%d check(s) FAILED:' % len(FAILED))
    for q in FAILED:
        print('  ' + q)
    sys.exit(1)
print('all checks passed')
