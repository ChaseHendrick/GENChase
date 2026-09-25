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
"""Checks of Proposition 3 of the manuscript (paper/minimal-winding.tex), and of the leading-order relations
used in Step 5 of the proof of Theorem 3. Proposition 3 concerns two concentric
regular n-gons, n vortices of circulation x at radius 1 and n of circulation -1 at radius sqrt(x),
relative rotation theta, and a vortex of circulation Gamma0 at the center.

  1. The derivation for symbolic n (SymPy): the two quotients, the circulation condition (eq:circ0),
     its roots, the ring swap, Eq. (eq:Pcentre) with a, b in terms of x = e^{2t}, and the case Gamma0 = 0
     (a = K_n, b = sqrt(2n-1), minimum F_n). Demina and Kudryashov's Eqs. (36)-(37) for general Gamma0.
  2. Every identity in the proof: a^2 - b^2 = D^2 - n^2, D > 2n, D increasing, Gamma0 decreasing in t;
     and, as a second certificate of D > 2n for n = 2..7, a polynomial with nonnegative coefficients.
  3. The expansion of the minimum as Gamma0 -> infinity, exactly and numerically.
  4. The leading-order relations used in Step 5 of Theorem 3 (strong vortex, weak tight pairs), and their limits along the two families.
  5. Biot-Savart velocities of all 2n + 1 vortices at 50 digits against the closed forms, both roots.
  6. Numerical minimization over theta from the Biot-Savart velocities at 30 digits.
  7. Negative controls: checks that must fail do fail.

Convention: conj(dz_j/dt) = (1/(2 pi i)) sum_{k != j} Gamma_k/(z_j - z_k). Needs sympy and mpmath
(code/requirements.txt). Run: python3 verify_central_vortex.py. Prints every check; exits with status 1
if any fails. Runs in seconds.
"""
import sys
import sympy as sp
import mpmath as mp

FAILED = []


def check(name, ok, detail=''):
    print(('OK    ' if ok else 'FAIL  ') + name + (('   [' + detail + ']') if detail else ''))
    if not ok:
        FAILED.append(name)


def zero(name, e, detail=''):
    check(name, sp.simplify(e) == 0, detail)


# ============================================================================ 1. derivation, symbolic n
print('1. Derivation for symbolic n')
n, x, G0, v = sp.symbols('n x Gamma0 v')
zt, ztb = sp.symbols('zeta zetabar')
# 2 pi i conj(zdot/z) at z = 1 and 2 pi i conj(zetadot/zeta) at zeta, with conj(zeta) = x/zeta, v = zeta^n.
# The ring sums: sum_{k=1}^{n-1} 1/(1 - eps^k) = (n-1)/2, sum_k 1/(z - zeta eps^k) = n z^{n-1}/(z^n - zeta^n)
# (checked numerically in part 5); the center adds Gamma0/z and Gamma0/zeta.
Sz = x*(n - 1)/2 + G0 - n/(1 - v)
zeta_bs = (-(n - 1)/(2*zt) + x*n*zt**(n - 1)/(zt**n - 1) + G0/zt)     # conj(zetadot) * 2 pi i
Szeta_from_bs = sp.powsimp(sp.expand(zeta_bs*zt/x), force=True)       # divided by conj(zeta) = x/zeta
Szeta = -(n - 1)/(2*x) + G0/x - n*v/(1 - v)
zero('conj(zetadot/zeta) = (1/2 pi i)(-(n-1)/(2x) + Gamma0/x - n v/(1-v)) from the ring sums, v = zeta^n',
     sp.simplify(Szeta_from_bs.subs(zt**n, v) - Szeta))
circ0 = (n - 1)*x**2 - 2*(n - G0)*x + (n - 1) - 2*G0
zero('2x (Sz - Szeta) = (n-1)x^2 - 2(n - Gamma0)x + (n-1) - 2 Gamma0  (eq:circ0)', 2*x*(Sz - Szeta) - circ0)
zero('Sz - Szeta does not depend on v, so every theta is self-similar', sp.diff(sp.cancel(Sz - Szeta), v))
zero('eq:circ0 at Gamma0 = 0 is eq:circ', circ0.subs(G0, 0) - ((n - 1)*x**2 - 2*n*x + (n - 1)))
G0x = sp.solve(circ0, G0)[0]
zero('Gamma0 = ((n-1)x^2 - 2nx + n - 1)/(2(1-x))', G0x - ((n - 1)*x**2 - 2*n*x + n - 1)/(2*(1 - x)))
zero('eq:circ0 at x = 1 equals -2, so one root is > 1 and the other < 1', circ0.subs(x, 1) + 2)
zero('eq:circ0 at x = 0 equals n - 1 - 2 Gamma0: the root < 1 is positive iff Gamma0 < (n-1)/2', circ0.subs(x, 0) - (n - 1 - 2*G0))
zero('discriminant/4 of eq:circ0 in x = (Gamma0 - 1)^2 + 2(n-1) > 0', sp.discriminant(circ0, x)/4 - ((G0 - 1)**2 + 2*(n - 1)))
tot = n*(x - 1) + G0x
zero('on eq:circ0, 2(x-1)(total circulation) = (n+1)x^2 - 2nx + (n+1), whose discriminant -8n - 4 < 0',
     sp.cancel(2*(x - 1)*tot) - ((n + 1)*x**2 - 2*n*x + (n + 1)))
zero('   (the discriminant)', sp.discriminant((n + 1)*x**2 - 2*n*x + (n + 1), x) - (-8*n - 4))
Ax = sp.simplify(x*(n - 1)/2 + G0x)
zero('A = x(n-1)/2 + Gamma0 = (n+1)/2 + 1/(x-1) on eq:circ0', Ax - ((n + 1)/2 + 1/(x - 1)))
# swap: circulations times -1/x, dilation, reflection: x -> 1/x, Gamma0 -> -Gamma0/x
zero('ring swap: eq:circ0 at (1/x, -Gamma0/x) is eq:circ0 / x^2', circ0.subs({x: 1/x, G0: -G0/x}, simultaneous=True) - circ0/x**2)

# Re S and Im S with v = rho e^{i alpha}
Ar = sp.Symbol('A', real=True)
rho, al, npos = sp.symbols('rho alpha n', positive=True)
S = Ar - npos/(1 - rho*sp.exp(sp.I*al))
Sc = sp.expand_complex(S)
mod2 = 1 - 2*rho*sp.cos(al) + rho**2
a_rho = Ar*(rho + 1/rho) - npos/rho
b_rho = 2*Ar - npos
zero('|1-v|^2 Re S / rho = a - b cos(alpha), a = A(rho + 1/rho) - n/rho, b = 2A - n', sp.re(Sc)*mod2/rho - (a_rho - b_rho*sp.cos(al)))
zero('Im S = -n rho sin(alpha)/|1-v|^2, so Re kappa = Im S/(2 pi) < 0 iff sin(n theta) > 0', sp.im(Sc) + npos*rho*sp.sin(al)/mod2)
kap = sp.expand_complex(sp.I*sp.conjugate(S)/(2*sp.pi))
zero('kappa = (Im S + i Re S)/(2 pi)', sp.simplify(kap - (sp.im(Sc) + sp.I*sp.re(Sc))/(2*sp.pi)))
print('      => P = |Im kappa|/(-2 Re kappa) = |a - b cos(n theta)|/(2n sin(n theta)) on sin(n theta) > 0')

# x = e^{2t}: X = e^t, Y = e^{nt} (independent symbols, so these are identities for symbolic n)
X, Y = sp.symbols('X Y', positive=True)
coth = (X**2 + 1)/(X**2 - 1); ch = (Y + 1/Y)/2; sh = (Y - 1/Y)/2
A_t = ((n + 1)/2 + 1/(x - 1)).subs(x, X**2)
a_t = a_rho.subs({Ar: A_t, rho: Y, npos: n}); b_t = b_rho.subs({Ar: A_t, npos: n})
zero('A = (n + coth t)/2', A_t - (n + coth)/2)
zero('a = coth t cosh nt + n sinh nt', a_t - (coth*ch + n*sh))
zero('b = coth t', b_t - coth)
zero('a - b = coth t (cosh nt - 1) + n sinh nt  (> 0 for t > 0)', a_t - b_t - (coth*(ch - 1) + n*sh))
zero('a + b = coth t (cosh nt + 1) + n sinh nt  (> 0 for t > 0)', a_t + b_t - (coth*(ch + 1) + n*sh))
D_t = sh*coth + n*ch
zero('a^2 - b^2 = D^2 - n^2, D = sinh(nt) coth t + n cosh nt', a_t**2 - b_t**2 - (D_t**2 - n**2))
zero('Gamma0 = (n + coth t)/2 - (n-1) e^{2t}/2 on the root x = e^{2t}', G0x.subs(x, X**2) - ((n + coth)/2 - (n - 1)*X**2/2))
sw = {X: 1/X, Y: 1/Y}
zero('t -> -t (the swap x -> 1/x) maps a -> -a', a_t.subs(sw, simultaneous=True) + a_t)
zero('t -> -t maps b -> -b', b_t.subs(sw, simultaneous=True) + b_t)

# Gamma0 = 0: x = x_n = e^eta, t = eta/2. k = n - 1 > 0.
k = sp.Symbol('k', positive=True)
xn = (k + 1 + sp.sqrt(2*k + 1))/k
zero('Gamma0 = 0: x_n is the root > 1 of eq:circ0', circ0.subs({G0: 0, n: k + 1, x: xn}))
zero('Gamma0 = 0: b = coth(eta/2) = (x_n + 1)/(x_n - 1) = sqrt(2n - 1) = (n-1)x_n - n',
     sp.radsimp((xn + 1)/(xn - 1) - sp.sqrt(2*k + 1)) + sp.simplify(k*xn - (k + 1) - sp.sqrt(2*k + 1)))
Kn_paper = k*xn*(Y + 1/Y)/2 - (k + 1)/Y           # K_n of the paper with rho = x_n^{n/2} = Y
zero('Gamma0 = 0: a = K_n = (n-1) x_n (rho + 1/rho)/2 - n/rho', sp.simplify(a_t.subs(n, k + 1).subs(X, sp.sqrt(xn)) - Kn_paper))
zero('Gamma0 = 0: b = sqrt(2n-1), the coefficient in eq:Pring', sp.simplify(b_t.subs(X, sp.sqrt(xn)) - sp.sqrt(2*k + 1)))
for nn, Fn in ((2, 3*sp.sqrt(5)/4), (3, sp.sqrt(29)/3), (4, sp.sqrt(322)/9), (5, sp.sqrt(31682)/80)):
    xv = (nn + sp.sqrt(2*nn - 1))/(nn - 1)
    Dv = D_t.subs({n: nn, X: sp.sqrt(xv), Y: sp.sqrt(xv)**nn})
    check('Gamma0 = 0, n = %d: sqrt(D^2 - n^2)/(2n) = F_n of the table' % nn,
          sp.simplify(sp.sqrtdenest(sp.sqrt(sp.radsimp(sp.expand(Dv**2 - nn**2))))/(2*nn) - Fn) == 0
          or abs(sp.N(sp.sqrt(Dv**2 - nn**2)/(2*nn) - Fn, 60)) < 1e-55)
Dq = D_t.subs({n: 2, X: sp.sqrt(2), Y: 2})
zero('n = 2, x = 2 (Gamma0 = 3/2): D = 19/4 and the minimum is 3 sqrt(33)/16 exactly',
     (Dq - sp.Rational(19, 4)) + (sp.sqrt(Dq**2 - 4)/4 - 3*sp.sqrt(33)/16) + G0x.subs({n: 2, x: 2}) - sp.Rational(3, 2))

# Demina and Kudryashov 2014, Sect. 3 (as transcribed in verify_general_mu.py, 10h): circulations G1 on radius
# R1 and G2 = -G1/r^2 on radius r R1, G0 at the center, b2 = e^{i n phi2}.
G1, r, R1, b2 = sp.symbols('Gamma1 r R1 b2')
Om36 = (((2*(n*G1 + G0)*r**2 - (n - 1)*G1)*r**n*b2 + (n - 1)*G1 - 2*G0*r**2) / (2*R1**2*r**4*(r**n*b2 - 1)))
E37 = ((n - 1)*G1 + 2*G0)*r**4 - 2*(n*G1 + G0)*r**2 + (n - 1)*G1
zero('DK Eq. (37) with Gamma1 = r^2 = x is x times eq:circ0, for every Gamma0', E37.subs(G1, x).subs(r, sp.sqrt(x)) - x*circ0)
Om_x = Om36.subs({G1: x, R1: 1}).subs(r**n*b2, v).subs(r, sp.sqrt(x))
zero('DK Eq. (36) with Gamma1 = r^2 = x, R1 = 1, r^n b2 = v equals S = A - n/(1-v) on eq:circ0',
     sp.simplify((Om_x - Sz).subs(G0, G0x)))

# ============================================================================ 2. the proof
print('2. The proof of the bound and of the monotonicity')
t = sp.Symbol('t', positive=True); ns = sp.Symbol('n', positive=True, integer=True)
D = sp.sinh(ns*t)*sp.coth(t) + ns*sp.cosh(ns*t)
split = (sp.sinh(ns*t)*sp.cosh(t) - ns*sp.sinh(t))/sp.sinh(t) + ns*(sp.cosh(ns*t) - 1)
zero('D - 2n = (sinh(nt) cosh t - n sinh t)/sinh t + n(cosh nt - 1)', (D - 2*ns - split).rewrite(sp.exp))
zero('d/dt [sinh(nt) - n sinh t] = n(cosh nt - cosh t) >= 0, so sinh(nt) >= n sinh t and coth t sinh nt >= n cosh t > n',
     sp.diff(sp.sinh(ns*t) - ns*sp.sinh(t), t) - ns*(sp.cosh(ns*t) - sp.cosh(t)))
zero('4n^2 (min^2 - 3/4) = (D - 2n)(D + 2n), so D > 2n gives min > sqrt(3)/2', (D**2 - ns**2) - 3*ns**2 - (D - 2*ns)*(D + 2*ns))
ok = True
for nn in range(2, 9):
    s = sum(sp.exp((nn - 1 - 2*j)*t) for j in range(nn))
    ok = ok and sp.simplify((sp.sinh(nn*t)/sp.sinh(t) - s).rewrite(sp.exp)) == 0
check('sinh(nt)/sinh t = sum_{j=0}^{n-1} e^{(n-1-2j)t}, a sum of terms cosh(ct) (and 1), increasing in t > 0; n = 2..8', ok)
print('      => coth t sinh nt = cosh t * (that sum) and n cosh nt increase strictly, so D increases strictly in t')
dG = sp.diff((ns + sp.coth(t))/2 - (ns - 1)*sp.exp(2*t)/2, t)
zero('dGamma0/dt = -1/(2 sinh^2 t) - (n-1) e^{2t} < 0: Gamma0 decreases from +oo (t -> 0) to -oo (t -> oo)',
     (dG + 1/(2*sp.sinh(t)**2) + (ns - 1)*sp.exp(2*t)).rewrite(sp.exp))
check('D -> 2n as t -> 0', sp.limit(D, t, 0) == 2*ns)
# second certificate of D > 2n: 2Y(X^2-1)(D - 2n) = N(X, Y), with Y = X^n, has nonnegative coefficients in w = X - 1
Dxy = sh*coth + n*ch
Npoly = (Y**2 - 1)*(X**2 + 1) - 2*n*Y*(X**2 - 1) + n*(Y - 1)**2*(X**2 - 1)
zero('2Y(X^2 - 1)(D - 2n) = (Y^2 - 1)(X^2 + 1) - 2nY(X^2 - 1) + n(Y - 1)^2(X^2 - 1)', 2*Y*(X**2 - 1)*(Dxy - 2*n) - Npoly)
w = sp.Symbol('w', positive=True)
for nn in range(2, 8):
    cs = sp.Poly(sp.expand(Npoly.subs(n, nn).subs(Y, X**nn).subs(X, 1 + w)), w).all_coeffs()[::-1]
    check('n = %d: that polynomial at X = 1 + w has coefficients >= 0 and a positive one, so D > 2n for X > 1' % nn,
          all(c >= 0 for c in cs) and any(c > 0 for c in cs), 'w^0.. : %s' % cs)

# ============================================================================ 3. the expansion as Gamma0 -> oo
print('3. The expansion of the minimum as Gamma0 -> infinity')
dser = sp.series(D - 2*ns, t, 0, 8).removeO()
zero('D - 2n = n(1 + 2n^2) t^2/3 + O(t^4)', dser.coeff(t, 2) - ns*(1 + 2*ns**2)/3)
check('D is even in t (no odd powers through t^7)', all(sp.simplify(dser.coeff(t, j)) == 0 for j in (1, 3, 5, 7)))
m2 = sp.expand(((2*ns + dser)**2 - ns**2)/(4*ns**2))
zero('min^2 = 3/4 + (1 + 2n^2) t^2/3 + O(t^4)', (m2.coeff(t, 0) - sp.Rational(3, 4)) + (m2.coeff(t, 2) - (1 + 2*ns**2)/3))
Gser = sp.series((ns + sp.coth(t))/2 - (ns - 1)*sp.exp(2*t)/2, t, 0, 5).removeO()
zero('Gamma0 - 1/2 = 1/(2t) + (7/6 - n) t + O(t^2)', (Gser.coeff(t, -1) - sp.Rational(1, 2)) + (Gser.coeff(t, 0) - sp.Rational(1, 2))
     + (Gser.coeff(t, 1) - (sp.Rational(7, 6) - ns)))
h = sp.Symbol('h', positive=True); c3, c4, c5 = sp.symbols('c3 c4 c5')
tser = h/2 + c3*h**3 + c4*h**4 + c5*h**5
eq = sp.series(h*(Gser.subs(t, tser) - sp.Rational(1, 2)) - 1, h, 0, 5).removeO()
sol = sp.solve([eq.coeff(h, j) for j in (2, 3, 4)], [c3, c4, c5], dict=True)[0]
m2t = sum(m2.coeff(t, j)*t**j for j in range(0, 7))
Pser = sp.series(sp.sqrt(m2t.subs(t, tser.subs(sol))), h, 0, 5).removeO()
zero('with h = 1/(Gamma0 - 1/2): t = h/2 + O(h^3) and min = sqrt(3)/2 + sqrt(3)(1 + 2n^2) h^2/36 + 0 h^3 + O(h^4)',
     (Pser.coeff(h, 0) - sp.sqrt(3)/2) + (Pser.coeff(h, 1)) + (Pser.coeff(h, 2) - sp.sqrt(3)*(1 + 2*ns**2)/36) + Pser.coeff(h, 3),
     'h^4 coefficient %s' % sp.factor(Pser.coeff(h, 4)))

mp.mp.dps = 40


def root_t(nn, g, sgn=1):
    """t = ln(x)/2 for the root x > 1 (sgn = +1) or the root 0 < x < 1 (sgn = -1) of eq:circ0."""
    nn = mp.mpf(nn); g = mp.mpf(g)
    xx = ((nn - g) + sgn*mp.sqrt((g - 1)**2 + 2*(nn - 1)))/(nn - 1)
    return mp.log(xx)/2


def Dfun(nn, tt):
    return mp.sinh(nn*tt)*mp.coth(tt) + nn*mp.cosh(nn*tt)


def Pmin(nn, tt):
    return mp.sqrt(Dfun(nn, tt)**2 - nn**2)/(2*nn)


worst = mp.mpf(0); lines = []
for nn in (2, 3, 5):
    K2 = mp.sqrt(3)*(1 + 2*nn**2)/36
    for g, sgn in (('1e3', 1), ('1e4', 1), ('1e5', 1), ('-1e3', -1), ('-1e5', -1)):
        tt = root_t(nn, g, sgn)
        # on the root x < 1 the minimum is that of the root 1/x > 1 for -Gamma0/x (the ring swap)
        geff = mp.mpf(g) if sgn > 0 else -mp.mpf(g)*mp.e**(-2*tt)
        hh = 1/(geff - mp.mpf(1)/2)
        res = (Pmin(nn, abs(tt)) - mp.sqrt(3)/2 - K2*hh**2)/hh**4
        worst = max(worst, abs(res)); lines.append('n=%d Gamma0=%s: (min - sqrt3/2 - k2 h^2)/h^4 = %s' % (nn, g, mp.nstr(res, 6)))
for l in lines:
    print('      ' + l)
check('the remainder of the expansion, divided by h^4, stays bounded (n = 2, 3, 5; Gamma0 = +-1e3..1e5; both roots)', worst < 20,
      'max %s' % mp.nstr(worst, 4))

# ============================================================================ 4. Theorem 3, leading order
print('4. Theorem 3, Step 5: strong vortex 1 at 0, weak pairs eps g at Z and -eps g + eps^2 sigma at Z(1 + eps g u); leading order')
p, y, s = sp.symbols('p y s', real=True)
u = p + sp.I*y; ub = p - sp.I*y
# with Z = 1: 2 pi i conj(zdot) of the + member = 1 + 1/u + O(eps); the relative motion d(eps g u) / dt = kappa eps g u at O(eps)
# gives (1 + 1/u) conj(u) = -u + s/u with s = sigma/g^2 (the -u from the strong vortex's shear, s/u from the circulation mismatch)
rel = sp.expand((1 + 1/u)*ub*u - (-u**2 + s))
zero('relative motion, times u: 2p^2 + p - s + i y(2p - 1) = 0', rel - (2*p**2 + p - s + sp.I*y*(2*p - 1)))
print('      => for y != 0: p = 1/2 and s = 1, i.e. u = 1/2 + iy and the second circulation is -eps g + eps^2 g^2')
e, g = sp.symbols('epsilon g', positive=True)
zero('-eps g + eps^2 g^2 agrees with the three-vortex harmonic value -eps g/(1 + eps g) to O(eps^3)',
     sp.series(-e*g/(1 + e*g) - (-e*g + e**2*g**2), e, 0, 3).removeO())
Lp = sp.expand(g - (g - e*s*g**2)*sp.expand((1 + e*g*u)*(1 + e*g*ub)))     # impulse / eps, Z = 1
zero('angular impulse of a pair about the strong vortex = eps^2 g^2 (s - 2p) + O(eps^3), zero at p = 1/2, s = 1',
     Lp.coeff(e, 1) - g**2*(s - 2*p))
kb = (1 + 1/u).subs(p, sp.Rational(1, 2))
kap_l = sp.I*sp.conjugate(kb)/(2*sp.pi)
Pl = sp.simplify(sp.im(kap_l)/(-2*sp.re(kap_l)))
zero('Re kappa = -y/(2 pi (y^2 + 1/4)): collapse iff y > 0', sp.simplify(sp.re(kap_l) + y/(2*sp.pi*(y**2 + sp.Rational(1, 4)))))
zero('P -> (y^2 + 3/4)/(2y)', Pl - (y**2 + sp.Rational(3, 4))/(2*y))
zero('(y^2 + 3/4)/(2y) = sqrt(3)/2 + (y - sqrt(3)/2)^2/(2y): equality iff y = sqrt(3)/2, u = e^{i pi/3}',
     Pl - sp.sqrt(3)/2 - (y - sp.sqrt(3)/2)**2/(2*y))
zero('pairs at Z_k share kappa iff (1 + 1/u_k)/|Z_k|^2 agree; arg(1 + 1/u) is the same for y and 3/(4y)', Pl.subs(y, sp.Rational(3, 4)/y) - Pl)
print('      => P = sqrt(3)/2 at leading order only if every y_k = sqrt(3)/2, and then all |Z_k| are equal')
mp.mp.dps = 40


def kappa3(mu, th):   # Lemma 3
    R = 1 + mu + mu**2; sR = mp.sqrt(R); ee = mp.expj(th)
    return 1j*(1 + mu)**3/(2*mp.pi*sR)*(sR + (1 - mu)*ee)/((sR - mu*ee)*(sR + ee))


mu = mp.mpf('1e-8'); worst = mp.mpf(0)
for c in ('0.3', '0.866', '2.5'):
    th = mp.pi + mp.asin(mp.mpf(c)*mu); R = 1 + mu + mu**2; sR = mp.sqrt(R)
    z1 = mu*(1 + sR*mp.expj(-th))/(1 + mu)**2; z2 = (mu - sR*mp.expj(-th))/(1 + mu)**2; z3 = mp.mpc(1)
    uu = (z3 - z2)/(mu*(z2 - z1)); kk = kappa3(mu, th); P = kk.imag/(-2*kk.real)
    worst = max(worst, abs(uu - (mp.mpf(1)/2 + 1j*mp.mpf(c))), abs(P - (uu.imag**2 + 0.75)/(2*uu.imag)))
check('three vortices, mu = 1e-8, sin(theta) = -c mu on A_-: pair 2-3 has u -> 1/2 + ic and P -> (y^2 + 3/4)/(2y)', worst < 1e-6,
      'max deviation %s' % mp.nstr(worst, 3))
tt = mp.mpf('1e-8'); worst = mp.mpf(0)
for nn in (2, 5):
    xx = mp.e**(2*tt); g0 = (nn + mp.coth(tt))/2 - (nn - 1)*xx/2
    a = mp.coth(tt)*mp.cosh(nn*tt) + nn*mp.sinh(nn*tt); b = mp.coth(tt)
    for c in ('0.3', '0.866', '2.5'):
        th = 2*tt*mp.mpf(c); uu = (mp.sqrt(xx)*mp.expj(th) - 1)/(xx/g0)
        P = (a - b*mp.cos(nn*th))/(2*nn*mp.sin(nn*th))
        worst = max(worst, abs(uu - (mp.mpf(1)/2 + 1j*mp.mpf(c))), abs(P - (uu.imag**2 + 0.75)/(2*uu.imag)))
check('rings with a center, t = 1e-8 (Gamma0 ~ 5e7), n = 2, 5: u -> 1/2 + i theta/(2t) and P -> (y^2 + 3/4)/(2y)', worst < 1e-6,
      'max deviation %s' % mp.nstr(worst, 3))

# ============================================================================ 5. Biot-Savart at 50 digits
print('5. Biot-Savart velocities of all 2n + 1 vortices, 50 digits')
mp.mp.dps = 50


def roots_x(nn, g):
    nn = mp.mpf(nn); g = mp.mpf(g); d = mp.sqrt((g - 1)**2 + 2*(nn - 1))
    return [xx for xx in (((nn - g) + d)/(nn - 1), ((nn - g) - d)/(nn - 1)) if xx > 0]


def config(nn, g, xx, th, radius2=None):
    eps = [mp.expjpi(2*mp.mpf(j)/nn) for j in range(nn)]
    zs = [mp.mpc(0)] + eps + [mp.sqrt(radius2 if radius2 is not None else xx)*mp.expj(th)*ep for ep in eps]
    Gs = [mp.mpf(g)] + [xx]*nn + [mp.mpf(-1)]*nn
    return zs, Gs


def velocities(zs, Gs):
    return [mp.conj(sum(Gs[j]/(zs[i] - zs[j]) for j in range(len(zs)) if j != i)/(2j*mp.pi)) for i in range(len(zs))]


def closed(nn, g, xx, th):
    rr = xx**(mp.mpf(nn)/2); A = xx*(nn - 1)/2 + mp.mpf(g); al_ = nn*th
    kc = mp.conj((A - nn/(1 - rr*mp.expj(al_)))/(2j*mp.pi))
    tt = mp.log(xx)/2
    a = mp.coth(tt)*mp.cosh(nn*tt) + nn*mp.sinh(nn*tt); b = mp.coth(tt)
    return kc, a, b, abs(a - b*mp.cos(al_))/(2*nn*abs(mp.sin(al_)))


worst_v = worst_k = worst_P = worst_dk = worst_sum = mp.mpf(0); count = 0; sign_ok = True; ab_ok = True
for nn in (2, 3, 4, 5, 7):
    eps = [mp.expjpi(2*mp.mpf(j)/nn) for j in range(nn)]
    zq = mp.mpc('0.37', '0.91'); zeta = mp.mpc('-1.3', '0.2')
    worst_sum = max(worst_sum, abs(sum(1/(1 - eps[j]) for j in range(1, nn)) - mp.mpf(nn - 1)/2),
                    abs(sum(1/(zq - zeta*ep) for ep in eps) - nn*zq**(nn - 1)/(zq**nn - zeta**nn)))
    for g in ('-1999.5', '-7.3', '-0.4', '0', '0.9', '3', '250'):
        for xx in roots_x(nn, g):
            for f in ('0.1', '0.37', '0.8', '1.3', '1.77'):
                th = mp.mpf(f)*mp.pi/nn
                zs, Gs = config(nn, g, xx, th); vel = velocities(zs, Gs)
                kaps = [vel[i]/zs[i] for i in range(1, len(zs))]
                kc, a, b, Pc = closed(nn, g, xx, th)
                worst_v = max(worst_v, abs(vel[0])/abs(vel[1]))
                worst_k = max(worst_k, max(abs(kq - kc) for kq in kaps)/abs(kc))
                Pd = abs(kaps[0].imag)/(2*abs(kaps[0].real))
                worst_P = max(worst_P, abs(Pd - Pc)/Pc)
                sign_ok = sign_ok and ((kaps[0].real < 0) == (mp.sin(nn*th) > 0))
                if xx > 1:
                    ab_ok = ab_ok and a > abs(b)
                # Demina-Kudryashov Eq. (36): Omega conj(z_k) = sum_j Gamma_j/(z_k - z_j)
                vv = xx**(mp.mpf(nn)/2)*mp.expj(nn*th)
                Om = ((2*(nn*xx + mp.mpf(g))*xx - (nn - 1)*xx)*vv + (nn - 1)*xx - 2*mp.mpf(g)*xx)/(2*xx**2*(vv - 1))
                for i in range(1, len(zs)):
                    sm = sum(Gs[j]/(zs[i] - zs[j]) for j in range(len(zs)) if j != i)
                    worst_dk = max(worst_dk, abs(Om*mp.conj(zs[i]) - sm)/abs(sm))
                count += 1
check('the two ring sums over roots of unity, n = 2, 3, 4, 5, 7', worst_sum < mp.mpf('1e-48'), 'max %s' % mp.nstr(worst_sum, 3))
check('%d configurations (n = 2, 3, 4, 5, 7; Gamma0 from -1999.5 to 250; every positive root; five angles): the center is at rest' % count,
      worst_v < mp.mpf('1e-45'), 'max |center velocity|/|velocity of a ring vortex| = %s' % mp.nstr(worst_v, 3))
check('   all 2n quotients zdot/z equal the closed-form kappa', worst_k < mp.mpf('1e-45'), 'max relative difference %s' % mp.nstr(worst_k, 3))
check('   P from Biot-Savart equals |a - b cos n theta|/(2n sin n theta) with a, b from t = ln(x)/2 (either root)',
      worst_P < mp.mpf('1e-38'), 'max relative difference %s' % mp.nstr(worst_P, 3))
check('   collapse (Re kappa < 0) exactly when sin(n theta) > 0', sign_ok)
check('   a > |b| on every root x > 1', ab_ok)
check('   Demina-Kudryashov Eq. (36) for Gamma0 != 0 against the Biot-Savart sums', worst_dk < mp.mpf('1e-45'),
      'max relative difference %s' % mp.nstr(worst_dk, 3))

# ============================================================================ 6. numerical minimization over theta
print('6. Minimum over theta from the Biot-Savart velocities, golden section, 30 digits')
mp.mp.dps = 30


def P_bs(nn, g, xx, th):
    zs, Gs = config(nn, g, xx, th); vel = velocities(zs, Gs)
    kq = vel[1]/zs[1]
    return abs(kq.imag)/(-2*kq.real) if kq.real < 0 else mp.inf     # the root x < 1 rotates the other way


worst = mp.mpf(0); worst_c = mp.mpf(0); gr = (mp.sqrt(5) - 1)/2; nrun = 0
for nn, g in ((2, '0'), (3, '0'), (5, '0'), (2, '1.5'), (3, '12.5'), (4, '-3'), (5, '-40'), (7, '1000')):
    for xx in roots_x(nn, g):
        lo, hi = mp.mpf(0), mp.pi/nn
        a1, a2 = hi - gr*(hi - lo), lo + gr*(hi - lo); f1, f2 = P_bs(nn, g, xx, a1), P_bs(nn, g, xx, a2)
        for _ in range(150):
            if f1 < f2:
                hi, a2, f2 = a2, a1, f1; a1 = hi - gr*(hi - lo); f1 = P_bs(nn, g, xx, a1)
            else:
                lo, a1, f1 = a1, a2, f2; a2 = lo + gr*(hi - lo); f2 = P_bs(nn, g, xx, a2)
        th = (lo + hi)/2; Pm = P_bs(nn, g, xx, th)
        tt = abs(mp.log(xx)/2)
        a = mp.coth(tt)*mp.cosh(nn*tt) + nn*mp.sinh(nn*tt); b = mp.coth(tt)
        worst = max(worst, abs(Pm - Pmin(nn, tt))/Pm)
        worst_c = max(worst_c, abs(mp.cos(nn*th) - b/a))
        nrun += 1
        print('      n=%d Gamma0=%-5s x=%-14s min P = %s' % (nn, g, mp.nstr(xx, 10), mp.nstr(Pm, 22)))
check('%d minima agree with sqrt(D^2 - n^2)/(2n)' % nrun, worst < mp.mpf('1e-25'), 'max relative difference %s' % mp.nstr(worst, 3))
check('   and are attained at cos(n theta) = b/a', worst_c < mp.mpf('1e-12'), 'max |cos(n theta*) - b/a| = %s' % mp.nstr(worst_c, 3))
worst = mp.mpf(0)
for nn, Fn in ((2, 3*mp.sqrt(5)/4), (3, mp.sqrt(29)/3), (4, mp.sqrt(322)/9), (5, mp.sqrt(31682)/80)):
    worst = max(worst, abs(Pmin(nn, mp.log((nn + mp.sqrt(2*nn - 1))/(nn - 1))/2) - Fn))
check('Gamma0 = 0: the minimum is F_n of Proposition 2, n = 2..5', worst < mp.mpf('1e-27'), 'max difference %s' % mp.nstr(worst, 3))
mono = True; above = True
for nn in (2, 3, 4, 5, 6, 7, 10):
    prev = mp.inf
    for gs in ('-1e4', '-50', '-3', '-1', '0', '0.5', '1', '2', '5', '20', '100', '1e3', '1e5'):
        val = Pmin(nn, root_t(nn, gs, 1))
        mono = mono and val < prev; above = above and val > mp.sqrt(3)/2; prev = val
check('on the root x > 1 the minimum decreases strictly as Gamma0 increases, n = 2..7 and 10, 13 values of Gamma0', mono)
check('   and stays above sqrt(3)/2', above)

# ============================================================================ 7. negative controls
print('7. Negative controls (each must fail as described)')
mp.mp.dps = 40
cst = mp.sqrt(3)/2 + mp.mpf('1e-6'); fails = True
for nn in (2, 3, 4, 5):
    for g, sgn in (('2000', 1), ('-2000', -1)):
        fails = fails and not (Pmin(nn, abs(root_t(nn, g, sgn))) > cst)
check('"min > sqrt(3)/2 + 1e-6" is false at Gamma0 = 2000 (root x > 1) and -2000 (root x < 1), n = 2..5: the constant is sharp', fails)
kk = sp.Symbol('kk', positive=True)
for nn in (2, 5):
    Nk = sp.Poly(sp.cancel((2*Y*(X**2 - 1)*(Dxy - kk*n)).subs(n, nn).subs(Y, X**nn).subs(X, 1 + w)), w)
    low = [sp.factor(c) for c in Nk.all_coeffs()[::-1][:3]]
    check('n = %d: with 2n replaced by kn, k > 2, the lowest nonzero coefficient is negative' % nn,
          low[0] == 0 and sp.simplify(low[1].subs(kk, sp.Rational(201, 100))) < 0, 'lowest coefficients %s' % low)
xs, ys_, vs = sp.symbols('x y v'); nS = sp.Symbol('n')
Szy = (-(nS - 1)/2 + xs*nS*vs/(vs - 1) + G0)/ys_
zero('without zero angular impulse (|zeta|^2 = y != x) the quotients differ by a term n(x - y)/(y(v - 1)^2) that depends on theta',
     sp.diff((xs*(nS - 1)/2 + G0 - nS/(1 - vs)) - Szy, vs) - nS*(xs - ys_)/(ys_*(vs - 1)**2))
mp.mp.dps = 30
nn, g = 3, mp.mpf('2.5'); xx = roots_x(nn, g)[0]


def spread(nn, g, xx, radius2, th):
    zs, Gs = config(nn, g, xx, th, radius2); vel = velocities(zs, Gs)
    kq = [vel[i]/zs[i] for i in range(1, len(zs))]
    return max(abs(q - kq[0]) for q in kq)


sp_ok = max(spread(nn, g, xx, xx, f*mp.pi/nn) for f in (0.2, 0.5, 0.9))
sp_imp = max(spread(nn, g, xx, 1.1*xx, f*mp.pi/nn) for f in (0.2, 0.5, 0.9))
sp_circ = max(spread(nn, g + mp.mpf('1e-3'), xx, xx, f*mp.pi/nn) for f in (0.2, 0.5, 0.9))
check('Biot-Savart, n = 3, Gamma0 = 2.5: the quotients agree (%s) but differ with |zeta|^2 = 1.1x (%s) or Gamma0 + 1e-3 (%s)'
      % (mp.nstr(sp_ok, 3), mp.nstr(sp_imp, 3), mp.nstr(sp_circ, 3)),
      sp_ok < mp.mpf('1e-25') and sp_imp > mp.mpf('1e-3') and sp_circ > mp.mpf('1e-6'))

print()
if FAILED:
    print('%d check(s) FAILED:' % len(FAILED))
    for f in FAILED:
        print('  ' + f)
    sys.exit(1)
print('all checks passed')
