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
"""Checks of Proposition 4 of the manuscript (paper/minimal-winding.tex), the bound at a fixed circulation for a
strong vortex with weak tight pairs, in the class (eq:class) of Theorem 3:

    for m >= 1 and 0 < c <= 1/2 there are gamma_4, eta_4 > 0 and K, depending only on m and c, such that every
    self-similar collapse in the class with gamma < gamma_4 has P >= sqrt3/2 + (sqrt3/8) c^2 gamma^2; if moreover
    P < sqrt3/2 + eta_4, the directions are separated and P >= sqrt3/2 + (C_* - K gamma) gamma^2.

Notation of the proof: strong vortex of circulation 1 at the origin, Lambda = 2 pi i conj(kappa), R_j = Lambda |Z_j|^2,
w = e^{i pi/3}, h_j = gamma a_j, beta_j = b_j/a_j = 1 - h_j nu_j, t_jl = Z_l/Z_j, tau_jl = t_jl/|t_jl|,
F_j = Re(conj(w) R_j), xi_j = p_j - 1/2, Delta_j = y_j - sqrt3/2, delta_* = max(|u_j - w|, |nu_j - 1|, ||Z_j|/|Z_l| - 1|).

  Part 1 (exact, SymPy): every identity the proof uses, and those of Remark 6 (the rings of Proposition 3 and the
          three-vortex minimum P_-(mu) from the polynomial Q of Theorem 1).
  Part 2 (numerical): the remainder bounds of Steps 2-3 of the proof, O(gamma^2 (delta_* + gamma)), on random
          configurations of the class near the equality configuration and on random solutions of the pair equation;
          with negative controls (a wrong leading term makes the normalized remainder grow like 1/(delta_* + gamma)).
  Part 3 (numerical): exact self-similar collapses at 50 digits, each accepted only after a Biot-Savart residual
          below 1e-40 over all 1 + 2m vortices: the pair equations, the identity (eq:master), the remainders,
          P > sqrt3/2, P >= sqrt3/2 + (sqrt3/8) c^2 gamma^2, the separation of the directions and the implied K.

Parts 2 and 3 illustrate the proof; they are not part of it. The thresholds gamma_4 and eta_4 of the proposition are
not explicit, so P > sqrt3/2 at the fixed gamma = 1e-2, 1e-3, 1e-4 of Part 3 is a numerical observation.
Convention (eq:bs): conj(dz_j/dt) = (1/(2 pi i)) sum_{k != j} Gamma_k/(z_j - z_k). Needs sympy and mpmath
(code/requirements.txt). Run from the paper folder: python3 code/verify_pairs_bound.py. Prints every check; exits
with status 1 if any fails. Runs in under a minute.
"""
import math
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
    check(name, sp.simplify(sp.together(sp.expand(e))) == 0, detail)


# ================================================================================================ Part 1
print('Part 1. Identities of the proof of Proposition 4 and of Remark 6 (exact, SymPy %s, mpmath %s)' % (sp.__version__, mp.__version__))
I = sp.I
r3 = sp.sqrt(3)
W6 = sp.Rational(1, 2) + I*r3/2            # w = e^{i pi/3}
W6b = sp.Rational(1, 2) - I*r3/2           # conj(w)
Em6 = r3/2 - I/2                            # e^{-i pi/6}
Ep6 = r3/2 + I/2                            # e^{i pi/6}
zero('[notation] w = e^{i pi/3}, e^{-i pi/6}, e^{i pi/6} in closed form',
     (W6 - sp.exp(I*sp.pi/3).rewrite(sp.cos)) + (Em6 - sp.exp(-I*sp.pi/6).rewrite(sp.cos))
     + (Ep6 - sp.exp(I*sp.pi/6).rewrite(sp.cos)))

# ---- Step 1: the exact equations of a pair, m = 3, strong vortex at 0
g = sp.Symbol('gamma', positive=True)
A = sp.symbols('a1:4', positive=True)
NU = sp.symbols('nu1:4')
U = sp.symbols('u1:4')
Z = sp.symbols('Z1:4')
B = [A[l]*(1 - g*A[l]*NU[l]) for l in range(3)]
Wp = [Z[l]*(1 + g*A[l]*U[l]) for l in range(3)]
zs = [0] + [q for l in range(3) for q in (Z[l], Wp[l])]
Gs = [1] + [q for l in range(3) for q in (g*A[l], -g*B[l])]


def BS(i):                                  # 2 pi i conj(dz_i/dt), eq:bs
    return sum(Gs[k]/(zs[i] - zs[k]) for k in range(len(zs)) if k != i)


def fl(z, l):                               # contribution of pair l, as in Step 1 of the paper
    return g*A[l]/(z - Z[l]) - g*B[l]/(z - Wp[l])


h1 = g*A[0]
beta1 = 1 - h1*NU[0]
zero('[Step 1] b_j/a_j = beta_j = 1 - h_j nu_j and gamma b_j Z_j/d_j = beta_j/u_j', g*B[0]*Z[0]/(Wp[0] - Z[0]) - beta1/U[0])
zero('[Step 1] Z_j (sum at Z_j) = 1 + beta_j/u_j + sum_{l != j} Z_j f_l(Z_j)   (eq:pairZ times Z_j)',
     Z[0]*BS(1) - (1 + beta1/U[0] + Z[0]*(fl(Z[0], 1) + fl(Z[0], 2))))
sig1 = Z[0]/(g*A[0])*sum(fl(Wp[0], l) - fl(Z[0], l) for l in (1, 2))
zero('[Step 1] (Z_j/(gamma a_j)) (sum at W_j - sum at Z_j) = -u_j/(1 + h_j u_j) + nu_j/u_j + sigma_j   (eq:pairD)',
     Z[0]/(g*A[0])*(BS(2) - BS(1)) - (-U[0]/(1 + h1*U[0]) + NU[0]/U[0] + sig1))
Lam, Zb, zcb, ub = sp.symbols('Lambda Zb zcb ub')     # Zb, zcb, ub stand for conj(Z_j), conj(z_c), conj(u_j)
zero('[Step 1] Lambda conj(Z_j - z_c) Z_j = R_j - Lambda conj(z_c) Z_j, R_j = Lambda |Z_j|^2', Lam*(Zb - zcb)*Z[0] - (Lam*Z[0]*Zb - Lam*zcb*Z[0]))
zero('[Step 1] Lambda conj(d_j) Z_j/(gamma a_j) = R_j conj(u_j), conj(d_j) = gamma a_j conj(u_j) conj(Z_j)',
     Lam*(g*A[0]*ub*Zb)*Z[0]/(g*A[0]) - Lam*Z[0]*Zb*ub)

# ---- Step 2: exact forms of the sources
t, u, nu, h, up, nup, hp = sp.symbols('t u nu h up nup hp')


def Afun(t_, u_, nu_, h_):
    return nu_/(1 - t_) - (1 - h_*nu_)*u_*t_/((1 - t_)*(1 - t_ - h_*u_*t_))


def Bfun(t_, up_, nup_, hp_, u_, h_):
    return (-nup_/((1 - t_)*(1 - t_ + h_*u_))
            + (1 - hp_*nup_)*up_*t_*(2 - 2*t_ - hp_*up_*t_ + h_*u_)
            / ((1 - t_)*(1 - t_ - hp_*up_*t_)*(1 - t_ + h_*u_)*(1 - t_ - hp_*up_*t_ + h_*u_)))


for l in (1, 2):
    tl = Z[l]/Z[0]
    zero('[Step 2] Z_j f_l(Z_j) = gamma^2 a_l^2 A(t_jl, u_l, nu_l, h_l), t_jl = Z_l/Z_j   (l = %d)' % (l + 1),
         Z[0]*fl(Z[0], l) - g**2*A[l]**2*Afun(tl, U[l], NU[l], g*A[l]))
    zero('[Step 2] (Z_j/(gamma a_j)) [f_l(W_j) - f_l(Z_j)] = gamma^2 a_l^2 u_j B(t_jl, u_l, nu_l, h_l, u_j, h_j)   (l = %d)' % (l + 1),
         Z[0]/(g*A[0])*(fl(Wp[0], l) - fl(Z[0], l)) - g**2*A[l]**2*U[0]*Bfun(tl, U[l], NU[l], g*A[l], U[0], h1))
zero('[Step 2] sum Gamma z = gamma^2 sum_l a_l^2 (nu_l - beta_l u_l) Z_l   (eq:zc)',
     sum(G_*z_ for G_, z_ in zip(Gs, zs)) - g**2*sum(A[l]**2*(NU[l] - (1 - g*A[l]*NU[l])*U[l])*Z[l] for l in range(3)))
zero('[Step 2] sum Gamma = 1 + gamma^2 sum_l a_l^2 nu_l', sum(Gs) - (1 + g**2*sum(A[l]**2*NU[l] for l in range(3))))
A0 = 1/(1 - t) - W6*t/(1 - t)**2
B0 = -1/(1 - t)**2 + 2*W6*t/(1 - t)**3
zero('[Step 2] A(t, w, 1, 0) = A_0(t) = 1/(1 - t) - w t/(1 - t)^2', Afun(t, W6, 1, 0) - A0)
zero('[Step 2] B(t, w, 1, 0, u, 0) = B_0(t) = -1/(1 - t)^2 + 2 w t/(1 - t)^3 (independent of u)', Bfun(t, W6, 1, 0, u, 0) - B0)
zero('[Step 2] ideal z_c term: (1 + conj w) conj(1 - w) = (1 + conj w)(1 - conj w) = sqrt3 e^{i pi/6}',
     (1 + W6b)*sp.conjugate(1 - W6) - r3*Ep6)
zero('[Step 2] 1 - w = conj(w), so nu - beta u -> 1 - w at the equality configuration', 1 - W6 - W6b)

# ---- Step 3: one pair
p, y, nur, hr, er, ei, sr, si = sp.symbols('p y nu h e_r e_i s_r s_i', real=True)
uc = p + I*y
ucb = p - I*y
eps = er + I*ei
sig = sr + I*si
q = 1 - hr*nur
Rj = 1 + q/uc + eps                                        # (A)
Gj = hr*nur*ucb + hr*uc**3/(1 + hr*uc) + sig*uc - eps*(p**2 + y**2)
Eres = sp.expand(uc*(Rj*ucb - (-uc/(1 + hr*uc) + nur/uc + sig)))
zero('[Step 3] (A) and (B) give (E): u [R conj(u) - (B right side)] = |u|^2 + conj(u) + u^2 - nu - G',
     Eres - ((p**2 + y**2) + ucb + uc**2 - nur - Gj))
zero('[Step 3] |u|^2 + conj(u) + u^2 - nu = (2p^2 + p - nu) + i y (2p - 1)',
     (p**2 + y**2) + ucb + uc**2 - nur - ((2*p**2 + p - nur) + I*y*(2*p - 1)))
xi = p - sp.Rational(1, 2)
De = y - r3/2
zero('[Step 3] 2p^2 + p - 1 = 2 xi (3/2 + xi)', 2*p**2 + p - 1 - 2*xi*(sp.Rational(3, 2) + xi))
ImG = sp.im(sp.expand(Gj))
zero('[Step 3] Im G + h y = -h (nu - 1) y + h Im(u^3/(1 + h u)) + Im(sigma u) - |u|^2 Im eps',
     ImG + hr*y - (-hr*(nur - 1)*y + hr*sp.im(sp.expand(uc**3/(1 + hr*uc))) + sp.im(sp.expand(sig*uc)) - (p**2 + y**2)*ei))
Fj = sp.re(sp.expand(W6b*Rj))
master = (De**2*(1 - hr) + xi**2 + hr*(3 - nur)*xi + 3*hr*xi**2 + r3*hr*(nur - 1)*De
          - hr**2*sp.im(sp.expand(uc**4/(1 + hr*uc)))/y + sp.im(sp.expand(sig*uc))/y
          + (p**2 + y**2)*(2*sp.re(sp.expand(W6b*eps)) - ei/y))
zero('[Step 3] master identity: 2|u|^2 F - [Delta^2 (1 - h) + xi^2 + h(3 - nu) xi + 3 h xi^2 + sqrt3 h (nu - 1) Delta'
     ' - h^2 Im(u^4/(1 + hu))/y + Im(sigma u)/y + |u|^2 (2 Re(conj(w) eps) - Im(eps)/y)] = [y(2p - 1) - Im G]/y',
     2*(p**2 + y**2)*Fj - master - (y*(2*p - 1) - ImG)/y)
zeta = sp.Symbol('zeta', real=True)
zero('[Step 3] with xi = -h/2 + zeta: xi^2 + h(3 - nu) xi = -3h^2/4 + h zeta + zeta^2 + h^2 (nu - 1)/2 - h (nu - 1) zeta',
     (xi**2 + hr*(3 - nur)*xi).subs(p, sp.Rational(1, 2) - hr/2 + zeta)
     - (-sp.Rational(3, 4)*hr**2 + hr*zeta + zeta**2 + hr**2*(nur - 1)/2 - hr*(nur - 1)*zeta))
zero('[Step 3] at the equality point: Im(w^3) = 0 and Im(w^4)/(sqrt3/2) = -1, so -h^2 Im(u^4/(1 + hu))/y -> +h^2',
     sp.im(sp.expand(W6**3)) + (sp.im(sp.expand(W6**4))/(r3/2) + 1))
zero('[Step 3] -3h^2/4 + h^2 = h^2/4', -sp.Rational(3, 4)*hr**2 + hr**2 - hr**2/4)
zero('[Step 3] 2 Re(conj(w) eps) - (2/sqrt3) Im eps = (2/sqrt3) Re(e^{-i pi/6} eps)',
     2*sp.re(sp.expand(W6b*eps)) - 2/r3*ei - 2/r3*sp.re(sp.expand(Em6*eps)))
zero('[Step 3] Im(sigma w)/(sqrt3/2) = (2/sqrt3) Re(e^{-i pi/6} sigma)', sp.im(sp.expand(sig*W6))/(r3/2) - 2/r3*sp.re(sp.expand(Em6*sig)))
zero('[Step 3] at h = eps = sigma = 0 the master identity reduces to 2|u|^2 F = Delta^2 when p = 1/2',
     (2*(p**2 + y**2)*Fj).subs({hr: 0, er: 0, ei: 0, p: sp.Rational(1, 2)}) - De**2)
zero('[Step 3] ideal R = 1 + conj(w): Re(conj(w) R) = 0, Re R = 3/2, Im R = -sqrt3/2',
     sp.re(sp.expand(W6b*(1 + W6b))) + (sp.re(1 + W6b) - sp.Rational(3, 2)) + (sp.im(1 + W6b) + r3/2))

# ---- Step 4: kernel, the weighted sum, C_* >= (sqrt3/4) min a^2
th = sp.Symbol('theta', real=True)
s_ = sp.Symbol('s')                     # s = e^{i theta/2}; t = s^2 and conj(t) = 1/t on the unit circle
tt = sp.Symbol('tt')
Xt = Em6*(A0.subs(t, tt) + W6*B0.subs(t, tt))
Xtb = sp.conjugate(Em6)*(sp.conjugate(A0).subs(sp.conjugate(t), 1/tt) + W6b*sp.conjugate(B0).subs(sp.conjugate(t), 1/tt))
ReX = ((Xt + Xtb)/2).subs(tt, s_**2)
sinh_ = (s_ - 1/s_)/(2*I)
cosh_ = (s_ + 1/s_)/2
Ktarget = 1/(2*sinh_**2) + cosh_*(1 + 2*sinh_**2)/(2*r3*sinh_**3)
zero('[Step 4] kernel: (2/sqrt3) Re(e^{-i pi/6}[A_0(e^{i th}) + w B_0(e^{i th})]) = 1/(2 sin^2(th/2))'
     ' + cos(th/2)(1 + 2 sin^2(th/2))/(2 sqrt3 sin^3(th/2))  (exact, in s = e^{i th/2})', 2/r3*ReX - Ktarget)
zc_cross = 2/r3*((Em6*r3*Ep6/tt + sp.conjugate(Em6*r3*Ep6)*tt)/2).subs(tt, s_**2)
zero('[Step 4] z_c term: (2/sqrt3) Re(e^{-i pi/6} sqrt3 e^{i pi/6} conj(e^{i th})) = 2 cos th',
     zc_cross - 2*((s_**2 + 1/s_**2)/2))
chi = 2*r3/3*sp.cos(th) + r3/(6*sp.sin(th/2)**2) + sp.cos(th/2)*(1 + 2*sp.sin(th/2)**2)/(6*sp.sin(th/2)**3)
chi_s = chi.rewrite(sp.exp).subs(sp.exp(I*th/2), s_).subs(sp.exp(-I*th/2), 1/s_).subs(sp.exp(I*th), s_**2).subs(sp.exp(-I*th), 1/s_**2)
zero('[Step 4] sqrt3 chi(th) = 2 cos th + kernel, chi = (2 sqrt3/3) cos th + sqrt3/(6 sin^2(th/2)) + cos(th/2)(1 + 2 sin^2(th/2))/(6 sin^3(th/2))',
     r3*chi_s - (2*(s_**2 + 1/s_**2)/2 + Ktarget))
zero('[Step 4] self terms: a^2/4 (Step 3) + 2 a^2 (z_c term, l = j) = sqrt3 (3 sqrt3/4) a^2', sp.Rational(1, 4) + 2 - r3*3*r3/4)
chi_even = 2*r3/3*sp.cos(th) + r3/(6*sp.sin(th/2)**2)
chi_odd = sp.cos(th/2)*(1 + 2*sp.sin(th/2)**2)/(6*sp.sin(th/2)**3)
check('[Step 4] chi = even + odd: (2 sqrt3/3) cos th + sqrt3/(6 sin^2(th/2)) is even, the last term is odd',
      sp.simplify(chi_even.subs(th, -th) - chi_even) == 0 and sp.simplify(chi_odd.subs(th, -th) + chi_odd) == 0
      and sp.simplify(chi - chi_even - chi_odd) == 0)
x = sp.symbols('x1:4', positive=True)
ph = sp.symbols('phi1:4', real=True)
lhs = sum(x[j]*(3*r3/4*x[j] + sum(x[l]*chi.subs(th, ph[l] - ph[j]) for l in range(3) if l != j)) for j in range(3))
rhs = (r3/12*sum(q_**2 for q_ in x)
       + 2*r3/3*((sum(x[j]*sp.cos(ph[j]) for j in range(3)))**2 + (sum(x[j]*sp.sin(ph[j]) for j in range(3)))**2)
       + r3/6*sum(x[j]*x[l]/sp.sin((ph[j] - ph[l])/2)**2 for j in range(3) for l in range(3) if l != j))
zero('[Step 4] weighted sum, m = 3: sum_j a_j^2 C_j = (sqrt3/12) sum a^4 + (2 sqrt3/3)|sum a^2 e^{i phi}|^2'
     ' + (sqrt3/6) sum_{j != l} a_j^2 a_l^2/sin^2((phi_j - phi_l)/2)', sp.expand_trig(sp.expand(lhs - rhs)))
x1, x2 = sp.symbols('x1 x2', positive=True)
zero('[Step 4] m = 2: (x1^2 + x2^2)/12 + x1 x2/3 - (x1^2 + x1 x2)/4 = (x2 - x1)(x2 + 2 x1)/12',
     (x1**2 + x2**2)/12 + x1*x2/3 - (x1**2 + x1*x2)/4 - (x2 - x1)*(x2 + 2*x1)/12)
X_ = sp.symbols('X_1:6', positive=True)
Sx, Sx2 = sum(X_), sum(q_**2 for q_ in X_)
zero('[Step 4] m >= 3: (sqrt3/12) S2 + (sqrt3/6)(S1^2 - S2) - (sqrt3/12) S1^2 = (sqrt3/12)(S1^2 - S2) >= 0',
     r3/12*Sx2 + r3/6*(Sx**2 - Sx2) - r3/12*Sx**2 - r3/12*(Sx**2 - Sx2))
check('[Step 4] m >= 3: (sqrt3/12) m >= sqrt3/4 (m = 3..100); m = 1: 3 sqrt3/4 >= sqrt3/4',
      all(r3/12*mm - r3/4 >= 0 for mm in range(3, 101)) and 3*r3/4 >= r3/4)
chi_pi = sp.simplify(chi.subs(th, sp.pi))
zero('[Step 4] the constant sqrt3/4 is attained: two antipodal pairs with a_1 = a_2 have C_1 = C_2 = (3 sqrt3/4 + chi(pi)) a^2 = (sqrt3/4) a^2',
     3*r3/4 + chi_pi - r3/4, 'chi(pi) = %s' % chi_pi)

# ---- Step 5: P from Lambda
kr, ki = sp.symbols('k_r k_i', real=True)
kap = kr + I*ki
LamE = sp.expand(2*sp.pi*I*sp.conjugate(kap))
zero('[Step 5] Lambda = 2 pi i conj(kappa): Re Lambda = 2 pi Im kappa, Im Lambda = 2 pi Re kappa',
     (sp.re(LamE) - 2*sp.pi*ki) + (sp.im(LamE) - 2*sp.pi*kr))
Lr, Li = sp.symbols('L_r L_i', real=True)
zero('[Step 5] Re(e^{-i pi/3} Lambda) = Re(Lambda)/2 + (sqrt3/2) Im(Lambda)', sp.re(sp.expand(W6b*(Lr + I*Li))) - (Lr/2 + r3/2*Li))
Li_neg = sp.Symbol('m_i', positive=True)          # Im Lambda = -m_i < 0, Re Lambda = L_r >= 0
zero('[Step 5] Re Lambda >= 0, Im Lambda < 0: P - sqrt3/2 = Re(e^{-i pi/3} Lambda)/|Im Lambda|, P = |Re Lambda|/(2|Im Lambda|)',
     Lr/(2*Li_neg) - r3/2 - (Lr/2 + r3/2*(-Li_neg))/Li_neg)
xx = sp.Symbol('x', positive=True)
zero('[Step 6] |sqrt x - 1| = |x - 1|/(sqrt x + 1) <= |x - 1|', (sp.sqrt(xx) - 1) - (xx - 1)/(sp.sqrt(xx) + 1))

# ---- the constants of the domain (c <= 1/2, delta_0 = c^2/4, gamma <= c^3/32, so h <= c^2/32)
cc = sp.Symbol('c', positive=True)
hh = cc**2/32
cons = [('|1 - t| >= c^2 - delta_0 >= c^2/2 on the segment [tau, t]', cc**2 - cc**2/4 - cc**2/2),
        ('|1 - t - h u t| >= c^2/2 - 4h >= 3c^2/8 (|u|, |t| <= 2)', cc**2/2 - 4*hh - 3*cc**2/8),
        ('|1 - t + h u| >= c^2/2 - 2h >= 7c^2/16', cc**2/2 - 2*hh - 7*cc**2/16),
        ('|1 - t - h\' u\' t + h u| >= c^2/2 - 6h >= 5c^2/16', cc**2/2 - 6*hh - 5*cc**2/16),
        ('h = gamma a <= gamma/c <= c^2/32 for gamma <= c^3/32', cc**3/32/cc - hh)]
for name, e in cons:
    ratio = sp.simplify(e/cc**2)
    check('[domain] ' + name, ratio.is_number and ratio >= 0, 'slack %s c^2' % ratio)
check('[domain] c <= 1/2, delta_0 = c^2/4 <= 1/16: y >= sqrt3/2 - 1/16 > 1/2 and |u| <= 17/16, |1 + h u| >= 1 - (17/16)/128 > 1/2',
      float(sp.sqrt(3)/2 - sp.Rational(1, 16)) > 0.5 and 1 - 17/16/128 > 0.5)
# ---- the remark: m = 1 is the three-vortex family, P_-(mu) from Q of Theorem 1 (eq:Q)
mu_s, yv_s, uq = sp.symbols('mu yv uq')
Qt = (1728*(uq + 1)**2*yv_s**3 - 144*(uq + 1)*(8*uq**3 - 9*uq - 9)*yv_s**2
      - 4*(16*uq**6 - 288*uq**4 - 288*uq**3 - 81*uq**2 - 162*uq - 81)*yv_s + 3*(4*uq**3 - 3*uq - 3)**2)
Qmu = sp.expand(sp.cancel(mu_s**6*Qt.subs(uq, mu_s + 1 + 1/mu_s)))
qs = sp.symbols('q1:4')
ser = sp.expand(Qmu.subs(yv_s, sp.Rational(3, 4) + sum(qs[i]*mu_s**(i + 1) for i in range(3))))
qsol = {}
for i in range(3):
    qsol[qs[i]] = sp.solve(ser.coeff(mu_s, i + 1).subs(qsol), qs[i])[0]
Pser = sp.series(sp.sqrt(sp.Rational(3, 4) + sum(qsol[qs[i]]*mu_s**(i + 1) for i in range(3))), mu_s, 0, 3).removeO()
check('[Remark 6] Q(0, y) = -16(4y - 3) (simple root 3/4, so the root is analytic at mu = 0) and P_-(mu) = sqrt3/2 + (3 sqrt3/4) mu^2 + O(mu^3)'
      ' = sqrt3/2 + C_* gamma^2 + O(gamma^3) for m = 1, mu = gamma a_1, C_* = (3 sqrt3/4) a_1^2',
      sp.expand(Qmu.subs(mu_s, 0) + 16*(4*yv_s - 3)) == 0 and sp.diff(Qmu, yv_s).subs({mu_s: 0, yv_s: sp.Rational(3, 4)}) != 0
      and sp.simplify(Pser - (r3/2 + 3*r3/4*mu_s**2)) == 0, 'series %s' % Pser)
# ---- the remark: rings of Proposition 3 (regular n-gon, equal a_j): C_j = sqrt3 (1 + 2n^2)/36 a^2
ok_ring = True
for n_ in (2, 3, 4, 6):
    ok_ring = ok_ring and sp.simplify(sum(1/sp.sin(sp.pi*l_/n_)**2 for l_ in range(1, n_)) - sp.Rational(n_**2 - 1, 3)) == 0
    ok_ring = ok_ring and sp.simplify(sum(sp.cos(2*sp.pi*l_/n_) for l_ in range(1, n_)) + 1) == 0
    ok_ring = ok_ring and sp.simplify(3*r3/4 + sum(chi.subs(th, 2*sp.pi*l_/n_) for l_ in range(1, n_)) - r3*(1 + 2*n_**2)/36) == 0
zero('[Remark 6] 3 sqrt3/4 - 2 sqrt3/3 + sqrt3 (n^2 - 1)/18 = sqrt3 (1 + 2n^2)/36 (symbolic n)',
     3*r3/4 - 2*r3/3 + r3*(sp.Symbol('n')**2 - 1)/18 - r3*(1 + 2*sp.Symbol('n')**2)/36)
with mp.workdps(50):
    chif = sp.lambdify(th, chi, 'mpmath')
    dev = max(abs(3*mp.sqrt(3)/4 + sum(chif(2*mp.pi*l_/n_) for l_ in range(1, n_)) - mp.sqrt(3)*(1 + 2*n_**2)/36) for n_ in range(2, 41))
check('[Remark 6] rings: sum_l 1/sin^2(pi l/n) = (n^2 - 1)/3, sum_l cos(2 pi l/n) = -1 and C_j = sqrt3 (1 + 2n^2)/36 exactly for n = 2, 3, 4, 6,'
      ' and to 1e-45 for n = 2..40; this is the coefficient of Proposition 3 (prop:centre)', ok_ring and dev < mp.mpf('1e-45'), 'max deviation %s' % mp.nstr(dev, 3))
print('   Part 1 done (%.1f s)' % (time.time() - T0))
print()

# ================================================================================================ Part 2
print('Part 2. Remainder bounds of Steps 2-3 (numerical, 40 and 60 digits)')
mp.mp.dps = 40
S3 = mp.sqrt(3)/2
W = mp.mpf(1)/2 + 1j*S3
WB = mp.conj(W)
EM6 = mp.expj(-mp.pi/6)
EP6 = mp.expj(mp.pi/6)


def A_(t_, u_, nu_, h_):
    return nu_/(1 - t_) - (1 - h_*nu_)*u_*t_/((1 - t_)*(1 - t_ - h_*u_*t_))


def B_(t_, up_, nup_, hp_, u_, h_):
    return (-nup_/((1 - t_)*(1 - t_ + h_*u_)) + (1 - hp_*nup_)*up_*t_*(2 - 2*t_ - hp_*up_*t_ + h_*u_)
            / ((1 - t_)*(1 - t_ - hp_*up_*t_)*(1 - t_ + h_*u_)*(1 - t_ - hp_*up_*t_ + h_*u_)))


def A0_(t_):
    return 1/(1 - t_) - W*t_/(1 - t_)**2


def B0_(t_):
    return -1/(1 - t_)**2 + 2*W*t_/(1 - t_)**3


def kernel(th_):
    s, c_ = mp.sin(th_/2), mp.cos(th_/2)
    return 2*mp.sqrt(3)/3*mp.cos(th_) + mp.sqrt(3)/(6*s**2) + c_*(1 + 2*s**2)/(6*s**3)


def Cvec(a, phi):
    m = len(a)
    return [3*mp.sqrt(3)/4*a[j]**2 + sum(a[l]**2*kernel(phi[l] - phi[j]) for l in range(m) if l != j) for j in range(m)]


def ideal_sources(a, phi, j):
    """E_j and S_j of the proof at the equality configuration (u = w, nu = 1, equal radii, R = 1 + conj w)"""
    m = len(a)
    tau = [mp.expj(phi[l] - phi[j]) for l in range(m)]
    E = sum(a[l]**2*A0_(tau[l]) for l in range(m) if l != j) + mp.sqrt(3)*EP6*sum(a[l]**2*mp.conj(tau[l]) for l in range(m))
    S = W*sum(a[l]**2*B0_(tau[l]) for l in range(m) if l != j)
    return E, S


def exact_sources(gm, a, b, Zs, Ws, Lam):
    """epsilon_j, sigma_j of Step 1 from the positions (strong vortex at 0), by their definitions"""
    m = len(a)

    def f(z, l):
        return gm*a[l]/(z - Zs[l]) - gm*b[l]/(z - Ws[l])
    zl = [mp.mpc(0)] + [q for l in range(m) for q in (Zs[l], Ws[l])]
    Gl = [mp.mpf(1)] + [q for l in range(m) for q in (gm*a[l], -gm*b[l])]
    zc = sum(G_*z_ for G_, z_ in zip(Gl, zl))/sum(Gl)
    eps1 = [sum(Zs[j]*f(Zs[j], l) for l in range(m) if l != j) for j in range(m)]
    epsz = [Lam*mp.conj(zc)*Zs[j] for j in range(m)]
    sig = [Zs[j]/(gm*a[j])*sum(f(Ws[j], l) - f(Zs[j], l) for l in range(m) if l != j) for j in range(m)]
    return eps1, epsz, sig, zc


# 2.1 the sources on random configurations of the class near the equality configuration
rng = random.Random(20260925)
worst = {'eps': 0, 'sig': 0, 'apriori': 0, 'neg_small': 0, 'neg_large': 0}
bins = {}
binsg = {}
NT = 1500
for trial in range(NT):
    m = rng.randint(1, 5)
    c = rng.choice([mp.mpf(1)/2, mp.mpf('0.35'), mp.mpf('0.25')])
    gstar = min(c**3/(8*m), c**3/32)
    gm = gstar*mp.mpf(10)**(-rng.uniform(0, 5))
    d0 = c**2/4
    ds = d0*mp.mpf(10)**(-rng.uniform(0, 5))
    r0 = mp.mpf(rng.uniform(float(2*c), float(1/(2*c))))
    while True:                                     # directions with |Z_j - Z_l| >= c
        phi = [mp.mpf(rng.uniform(0, 2*math.pi)) for _ in range(m)]
        rad = [r0*(1 + ds*mp.mpf(rng.uniform(-1, 1))/3) for _ in range(m)]
        Zs = [rad[l]*mp.expj(phi[l]) for l in range(m)]
        if all(abs(Zs[j] - Zs[l]) >= c for j in range(m) for l in range(m) if l != j):
            break
    a = [mp.mpf(rng.uniform(float(1.1*c), float(0.9/c))) for _ in range(m)]
    us = [W + ds*mp.mpf(rng.uniform(0, 1))*mp.expj(rng.uniform(0, 2*math.pi))/2 for _ in range(m)]
    nus = [1 + ds*mp.mpf(rng.uniform(-1, 1))/2 for _ in range(m)]
    b = [a[l]*(1 - gm*a[l]*nus[l]) for l in range(m)]
    Ws = [Zs[l]*(1 + gm*a[l]*us[l]) for l in range(m)]
    inclass = (all(c <= q <= 1/c for q in a + b) and all(c <= abs(z) <= 1/c for z in Zs)
               and all(c*gm*abs(Zs[l]) <= abs(Ws[l] - Zs[l]) <= gm*abs(Zs[l])/c for l in range(m)))
    if not inclass:
        continue
    dstar = max([abs(us[l] - W) for l in range(m)] + [abs(nus[l] - 1) for l in range(m)]
                + [abs(abs(Zs[j])/abs(Zs[l]) - 1) for j in range(m) for l in range(m)])
    e1, _, sg, zc = exact_sources(gm, a, b, Zs, Ws, 0)
    for j in range(m):
        Rj = 1 + (1 - gm*a[j]*nus[j])/us[j] + e1[j]          # Lambda |Z_j|^2 up to O(gamma^2)
        ez = Rj*mp.conj(zc/Zs[j])
        E, S = ideal_sources(a, [mp.arg(z) for z in Zs], j)
        scale = gm**2*(dstar + gm)
        worst['eps'] = max(worst['eps'], abs(e1[j] + ez - gm**2*E)/scale)
        worst['sig'] = max(worst['sig'], abs(sg[j] - gm**2*S)/scale)
        worst['apriori'] = max(worst['apriori'], (abs(e1[j] + ez) + abs(sg[j]))/gm**2)
        key = (float(c), int(mp.floor(mp.log10(dstar + gm))))
        bins[key] = max(bins.get(key, 0), abs(e1[j] + ez - gm**2*E)/scale, abs(sg[j] - gm**2*S)/scale)
        keyg = (float(c), int(mp.floor(mp.log10(gm))))
        binsg[keyg] = max(binsg.get(keyg, 0), (abs(e1[j] + ez) + abs(sg[j]))/gm**2)
        # negative control: the z_c term with (1 + conj w) in place of sqrt3 e^{i pi/6} (drops the factor 1 - conj w)
        Ebad = E - mp.sqrt(3)*EP6*sum(a[l]**2*mp.conj(mp.expj(mp.arg(Zs[l]) - mp.arg(Zs[j]))) for l in range(m)) \
            + (1 + WB)*sum(a[l]**2*mp.conj(mp.expj(mp.arg(Zs[l]) - mp.arg(Zs[j]))) for l in range(m))
        rb = abs(e1[j] + ez - gm**2*Ebad)/scale
        if dstar + gm < mp.mpf('1e-5'):
            worst['neg_small'] = max(worst['neg_small'], rb)
        elif dstar + gm > mp.mpf('1e-3'):
            worst['neg_large'] = max(worst['neg_large'], rb)
print('   2.1 sources on %d random configurations of the class, m = 1..5, c in {1/2, 0.35, 0.25}, delta_* + gamma down to 1e-7:' % NT)
print('       max |eps_j - gamma^2 E_j|/(gamma^2 (delta_* + gamma)) = %s, max |sigma_j - gamma^2 S_j|/(...) = %s, max (|eps_j| + |sigma_j|)/gamma^2 = %s'
      % (mp.nstr(worst['eps'], 4), mp.nstr(worst['sig'], 4), mp.nstr(worst['apriori'], 4)))
CS = sorted(set(k[0] for k in bins))
for cv_ in CS:
    print('       c = %.2f: max normalized error by decade of delta_* + gamma: ' % cv_
          + ', '.join('1e%d: %s' % (k[1], mp.nstr(bins[k], 3)) for k in sorted(bins) if k[0] == cv_))
    print('                 max (|eps_j| + |sigma_j|)/gamma^2 by decade of gamma: '
          + ', '.join('1e%d: %s' % (k[1], mp.nstr(binsg[k], 3)) for k in sorted(binsg) if k[0] == cv_))


def no_growth(bb, cv_, cut):
    small = [bb[k] for k in bb if k[0] == cv_ and k[1] < cut]
    large = [bb[k] for k in bb if k[0] == cv_ and k[1] >= cut]
    return (not small) or max(small) <= 3*max(large)


check('[numerical, Step 2] |eps_j - gamma^2 E_j| + |sigma_j - gamma^2 S_j| <= K gamma^2 (delta_* + gamma): for each c the normalized'
      ' error does not grow as delta_* + gamma -> 0 (below 1e-5 at most 3 times its maximum above)',
      all(no_growth(bins, cv_, -5) for cv_ in CS))
check('[numerical, Step 2] a priori |eps_j| + |sigma_j| <= K_0 gamma^2: for each c the ratio does not grow as gamma -> 0',
      all(no_growth(binsg, cv_, -6) for cv_ in CS))
check('[negative control] a wrong z_c term makes the normalized error grow like 1/(delta_* + gamma)',
      worst['neg_small'] > 100*worst['neg_large'] and worst['neg_small'] > 1e4,
      'max %s for delta_* + gamma < 1e-5 against %s above 1e-3' % (mp.nstr(worst['neg_small'], 3), mp.nstr(worst['neg_large'], 3)))


# 2.2 one pair: random y, h, eps, sigma; solve (E) for (p, nu); the master identity and its remainder
def solve_pair(y_, h_, e_, s_):
    """Newton on (E) = 0 for (p, nu) at fixed y, from (1/2, 1)"""
    X = mp.matrix([mp.mpf(1)/2, mp.mpf(1)])

    def E(X):
        u_ = X[0] + 1j*y_
        G = h_*X[1]*mp.conj(u_) + h_*u_**3/(1 + h_*u_) + s_*u_ - e_*abs(u_)**2
        v = abs(u_)**2 + mp.conj(u_) + u_**2 - X[1] - G
        return mp.matrix([v.real, v.imag])
    for _ in range(60):
        f = E(X)
        if mp.norm(f) < mp.mpf('1e-56'):
            break
        J = mp.matrix(2, 2)
        hd = mp.mpf('1e-30')
        for k in range(2):
            Xd = X.copy()
            Xd[k] += hd
            col = (E(Xd) - f)/hd
            J[0, k], J[1, k] = col[0], col[1]
        X = X - mp.lu_solve(J, f)
    return X[0], X[1], mp.norm(E(X))


worst2 = {'id': 0, 'r': 0, 'xi': 0, 'nu': 0, 'xih': 0, 'neg_small': 0, 'neg_large': 0}
bins2 = {}
NT2 = 3000
mp.mp.dps = 60
S3 = mp.sqrt(3)/2
W = mp.mpf(1)/2 + 1j*S3
WB = mp.conj(W)
EM6 = mp.expj(-mp.pi/6)
for trial in range(NT2):
    c = rng.choice([mp.mpf(1)/2, mp.mpf('0.25')])
    gm = c**3/32*mp.mpf(10)**(-rng.uniform(0, 5))
    a = mp.mpf(rng.uniform(float(c), float(1/c)))
    h_ = gm*a
    ds = c**2/4*mp.mpf(10)**(-rng.uniform(0, 5))
    y_ = S3 + ds*mp.mpf(rng.uniform(-1, 1))/2
    K0 = 5
    e_ = K0*gm**2*mp.mpf(rng.uniform(0, 1))*mp.expj(rng.uniform(0, 2*math.pi))
    s_ = K0*gm**2*mp.mpf(rng.uniform(0, 1))*mp.expj(rng.uniform(0, 2*math.pi))
    p_, nu_, res = solve_pair(y_, h_, e_, s_)
    u_ = p_ + 1j*y_
    dstar = max(abs(u_ - W), abs(nu_ - 1))
    R_ = 1 + (1 - h_*nu_)/u_ + e_
    F_ = (WB*R_).real
    xi_, De_ = p_ - mp.mpf(1)/2, y_ - S3
    mast = (De_**2*(1 - h_) + xi_**2 + h_*(3 - nu_)*xi_ + 3*h_*xi_**2 + mp.sqrt(3)*h_*(nu_ - 1)*De_
            - h_**2*(u_**4/(1 + h_*u_)).imag/y_ + (s_*u_).imag/y_ + abs(u_)**2*(2*(WB*e_).real - e_.imag/y_))
    lead = De_**2*(1 - h_) + h_**2/4 + 2/mp.sqrt(3)*(EM6*(e_ + s_)).real
    scale = gm**2*(dstar + gm)
    worst2['id'] = max(worst2['id'], abs(2*abs(u_)**2*F_ - mast)/gm**2, res/gm**2)
    rr = abs(2*abs(u_)**2*F_ - lead)/scale
    worst2['r'] = max(worst2['r'], rr)
    worst2['xi'] = max(worst2['xi'], abs(xi_)/gm)
    worst2['nu'] = max(worst2['nu'], abs(nu_ - 1)/gm)
    worst2['xih'] = max(worst2['xih'], abs(2*xi_ + h_)/(gm*(dstar + gm)))
    key = int(mp.floor(mp.log10(dstar + gm)))
    bins2[key] = max(bins2.get(key, 0), rr)
    rb = abs(2*abs(u_)**2*F_ - (lead - h_**2/4))/scale           # negative control: without the self term h^2/4
    if dstar + gm < mp.mpf('1e-5'):
        worst2['neg_small'] = max(worst2['neg_small'], rb)
    elif dstar + gm > mp.mpf('1e-3'):
        worst2['neg_large'] = max(worst2['neg_large'], rb)
print('   2.2 one pair, %d random (y, h, eps, sigma) with |eps|, |sigma| <= 5 gamma^2, (E) solved for (p, nu) to 1e-56 at 60 digits:' % NT2)
print('       master identity residual/gamma^2 <= %s; |xi|/gamma <= %s, |nu - 1|/gamma <= %s, |2 xi + h|/(gamma (delta_* + gamma)) <= %s'
      % (mp.nstr(worst2['id'], 3), mp.nstr(worst2['xi'], 4), mp.nstr(worst2['nu'], 4), mp.nstr(worst2['xih'], 4)))
print('       |2|u|^2 F - Delta^2 (1 - h) - h^2/4 - (2/sqrt3) Re(e^{-i pi/6}(eps + sigma))|/(gamma^2 (delta_* + gamma)) <= %s; by decade: %s'
      % (mp.nstr(worst2['r'], 4), ', '.join('1e%d: %s' % (k, mp.nstr(bins2[k], 3)) for k in sorted(bins2))))
check('[numerical, Step 3] master identity holds on solutions of (E) (residual at rounding level)', worst2['id'] < mp.mpf('1e-30'))
check('[numerical, Step 3] |xi| <= K gamma, |nu - 1| <= K gamma, |2 xi + h| <= K gamma (delta_* + gamma)',
      worst2['xi'] < 50 and worst2['nu'] < 50 and worst2['xih'] < 200)
check('[numerical, Step 3] remainder r_j = O(gamma^2 (delta_* + gamma)), bounded uniformly as delta_* + gamma -> 0',
      worst2['r'] < 200 and max(bins2[k] for k in bins2 if k <= -5) <= 2*max(bins2[k] for k in bins2 if k > -5) + 1)
check('[negative control] without the self term h^2/4 the normalized remainder grows like 1/(delta_* + gamma)',
      worst2['neg_small'] > 100*worst2['neg_large'] and worst2['neg_small'] > 1e3,
      '%s below 1e-5 against %s above 1e-3' % (mp.nstr(worst2['neg_small'], 3), mp.nstr(worst2['neg_large'], 3)))
print('   Part 2 done (%.1f s)' % (time.time() - T0))
print()

# ================================================================================================ Part 3
print('Part 3. Exact self-similar collapses at 50 digits (numerical)')


def bsum(zl, Gl, i):
    return sum(Gl[k]/(zl[i] - zl[k]) for k in range(len(zl)) if k != i)


def bs_check(zl, Gl):
    """kappa from the vortex farthest from z_c; max relative residual of zdot_i = kappa (z_i - z_c) over all vortices"""
    zc = sum(G_*z_ for G_, z_ in zip(Gl, zl))/sum(Gl)
    vel = [mp.conj(bsum(zl, Gl, i)/(2j*mp.pi)) for i in range(len(zl))]
    i0 = max(range(len(zl)), key=lambda i: abs(zl[i] - zc))
    kp = vel[i0]/(zl[i0] - zc)
    res = max(abs(vel[i] - kp*(zl[i] - zc)) for i in range(len(zl)))/(abs(kp)*max(abs(z_ - zc) for z_ in zl))
    imp = sum(G_*abs(z_ - zc)**2 for G_, z_ in zip(Gl, zl))
    return kp, res, abs(kp.imag)/(-2*kp.real), imp


class Curve:
    """Collapses with z_c = 0: strong vortex 1 at gamma^2 zeta; pair j: gamma a_j at Z_j = r_j e^{i phi_j} (r_1 = 1) and
    -gamma a_j (1 - gamma a_j nu_j) at Z_j (1 + gamma a_j u_j). At fixed gamma, a_j and phi_j the collapses form a
    curve, parametrized by y_J = Im u_J. Unknowns: zeta, Re u_j, Im u_j (j != J), r_2..r_m, Lambda, nu_j. Equations:
    self-similarity at every pair vortex (that of the strong vortex follows) and z_c = 0, scaled to order 1."""

    def __init__(self, gam, a, phi, J):
        self.g, self.a, self.phi, self.J, self.m = mp.mpf(gam), [mp.mpf(q) for q in a], list(phi), J, len(a)

    def unpack(self, X):
        X = list(X)
        m = self.m
        zeta = mp.mpc(X[0], X[1])
        k = 2
        p = X[k:k + m]
        k += m
        y = X[k:k + m - 1]
        k += m - 1
        r = [mp.mpf(1)] + X[k:k + m - 1]
        k += m - 1
        Lam = mp.mpc(X[k], X[k + 1])
        k += 2
        return zeta, p, y, r, Lam, X[k:k + m]

    def config(self, X, yJ):
        zeta, p, y, r, Lam, nu = self.unpack(X)
        ys = y[:self.J] + [yJ] + y[self.J:]
        g_ = self.g
        zl, Gl = [g_**2*zeta], [mp.mpf(1)]
        for j in range(self.m):
            Zj = r[j]*mp.expj(self.phi[j])
            uj = mp.mpc(p[j], ys[j])
            zl += [Zj, Zj*(1 + g_*self.a[j]*uj)]
            Gl += [g_*self.a[j], -g_*self.a[j]*(1 - g_*self.a[j]*nu[j])]
        return zl, Gl, Lam, ys

    def F(self, X, yJ):
        zl, Gl, Lam, _ = self.config(X, yJ)
        out = []
        for j in range(self.m):
            i = 1 + 2*j
            eZ = bsum(zl, Gl, i) - Lam*mp.conj(zl[i])
            eW = bsum(zl, Gl, i + 1) - Lam*mp.conj(zl[i + 1])
            out += [eZ, (eW - eZ)*zl[i]/(self.g*self.a[j])]
        out.append(sum(G_*z_ for G_, z_ in zip(Gl, zl))/self.g**2)
        v = []
        for q_ in out:
            v += [q_.real, q_.imag]
        return mp.matrix(v)

    def guess(self, etas):
        """leading order: p_j = 1/2 - gamma a_j/2, nu_j = 1 - gamma a_j, y_j = sqrt3/2 + gamma eta_j, |Z_j|^2 ~ |R_j|"""
        g_, a, m = self.g, self.a, self.m
        w_ = mp.mpf(1)/2 + 1j*mp.sqrt(3)/2
        zeta = w_**2*sum(a[l]**2*mp.expj(self.phi[l]) for l in range(m))
        p = [mp.mpf(1)/2 - g_*a[j]/2 for j in range(m)]
        ys = [mp.sqrt(3)/2 + g_*etas[j] for j in range(m)]
        nu = [1 - g_*a[j] for j in range(m)]
        R = [1 + (1 - g_*a[j]*nu[j])/mp.mpc(p[j], ys[j]) for j in range(m)]
        r = [mp.sqrt(abs(R[j])/abs(R[0])) for j in range(m)]
        X = [zeta.real, zeta.imag] + p + [ys[j] for j in range(m) if j != self.J] + r[1:] + [R[0].real, R[0].imag] + nu
        return mp.matrix(X), ys[self.J]


def newton6(cv, X, yJ, iters=30):
    """Newton's method with a forward-difference Jacobian"""
    n = len(X)
    hd = mp.mpf('1e-28')
    for _ in range(iters):
        f = cv.F(X, yJ)
        if mp.norm(f) < mp.mpf('1e-46'):
            break
        Jm = mp.matrix(n, n)
        for col in range(n):
            dX = X.copy()
            dX[col] += hd
            dcol = (cv.F(dX, yJ) - f)/hd
            for row in range(n):
                Jm[row, col] = dcol[row]
        X = X - mp.lu_solve(Jm, f)
    return X, mp.norm(cv.F(X, yJ))


mp.mp.dps = 50
S3 = mp.sqrt(3)/2
W = mp.mpf(1)/2 + 1j*S3
WB = mp.conj(W)
EM6 = mp.expj(-mp.pi/6)
EP6 = mp.expj(mp.pi/6)


def analyse(zl, Gl, gm, m):
    """paper normalization (strong vortex at 0) and every quantity of the proof"""
    kp, res, Pbs, imp = bs_check(zl, Gl)
    s0 = zl[0]
    Zs = [zl[1 + 2*j] - s0 for j in range(m)]
    Ws = [zl[2 + 2*j] - s0 for j in range(m)]
    a = [Gl[1 + 2*j]/gm for j in range(m)]
    b = [-Gl[2 + 2*j]/gm for j in range(m)]
    us = [(Ws[j] - Zs[j])/(gm*a[j]*Zs[j]) for j in range(m)]
    nus = [(a[j] - b[j])/(gm*a[j]**2) for j in range(m)]
    Lam = 2j*mp.pi*mp.conj(kp)
    e1, ez, sg, zc = exact_sources(gm, a, b, Zs, Ws, Lam)
    R = [Lam*abs(Zs[j])**2 for j in range(m)]
    eqA = max(abs(R[j] - (1 + (1 - gm*a[j]*nus[j])/us[j] + e1[j] + ez[j])) for j in range(m))
    eqB = max(abs(R[j]*mp.conj(us[j]) - (-us[j]/(1 + gm*a[j]*us[j]) + nus[j]/us[j] + sg[j])) for j in range(m))
    cls = min([min(q, 1/q) for q in a + b] + [min(abs(z), 1/abs(z)) for z in Zs]
              + [min(abs(Ws[j] - Zs[j])/(gm*abs(Zs[j])), gm*abs(Zs[j])/abs(Ws[j] - Zs[j])) for j in range(m)]
              + [abs(Zs[j] - Zs[l]) for j in range(m) for l in range(m) if l != j])
    cls = min(cls, mp.mpf(1)/2)
    dstar = max([abs(us[j] - W) for j in range(m)] + [abs(nus[j] - 1) for j in range(m)]
                + [abs(abs(Zs[j])/abs(Zs[l]) - 1) for j in range(m) for l in range(m)])
    phi = [mp.arg(z) for z in Zs]
    C = Cvec(a, phi)
    out = dict(P=Pbs, res=res, kp=kp, eqA=eqA, eqB=eqB, cls=cls, dstar=dstar, C=C, Cstar=max(C), mast=0, r=0, src=0,
               sep=min([abs(mp.expj(phi[j]) - mp.expj(phi[l])) for j in range(m) for l in range(m) if l != j] + [mp.mpf(2)]))
    FL = (WB*Lam).real
    out['FL'] = FL
    out['PfromL'] = FL/abs(Lam.imag) + S3 if Lam.real >= 0 else None
    for j in range(m):
        u_, nu_, h_ = us[j], nus[j], gm*a[j]
        y_, xi_ = u_.imag, u_.real - mp.mpf(1)/2
        De_ = y_ - S3
        e_, s_ = e1[j] + ez[j], sg[j]
        F_ = (WB*R[j]).real
        mast = (De_**2*(1 - h_) + xi_**2 + h_*(3 - nu_)*xi_ + 3*h_*xi_**2 + mp.sqrt(3)*h_*(nu_ - 1)*De_
                - h_**2*(u_**4/(1 + h_*u_)).imag/y_ + (s_*u_).imag/y_ + abs(u_)**2*(2*(WB*e_).real - e_.imag/y_))
        out['mast'] = max(out['mast'], abs(2*abs(u_)**2*F_ - mast))
        lead = De_**2*(1 - h_) + h_**2/4 + 2/mp.sqrt(3)*(EM6*(e_ + s_)).real
        out['r'] = max(out['r'], abs(2*abs(u_)**2*F_ - lead)/(gm**2*(dstar + gm)))
        E, S = ideal_sources(a, phi, j)
        out['src'] = max(out['src'], (abs(e_ - gm**2*E) + abs(s_ - gm**2*S))/(gm**2*(dstar + gm)))
    return out


def cases():
    yield 'T1 m = 2, a = (1, 1), phi = (0, 150)', [1, 1], [0, 150]
    yield 'T2 m = 2, a = (1, 1.3), phi = (0, 50)', [1, '1.3'], [0, 50]
    yield 'T3 m = 2 antipodal, a = (1, 1.2)', [1, '1.2'], [0, 180]
    yield 'T4 m = 4, a = (1, 0.7, 1.2, 0.9), phi = (0, 80, 170, 260)', [1, '0.7', '1.2', '0.9'], [0, 80, 170, 260]
    yield 'T5 m = 3, a = (1, 1, 1), phi = (0, 100, 200)', [1, 1, 1], [0, 100, 200]
    yield 'M1 m = 1, a = 1', [1], [0]
    rr = random.Random(7)
    for k in range(3):
        m = rr.choice([2, 3])
        while True:
            ph_ = sorted(rr.uniform(0, 360) for _ in range(m - 1))
            ang = [0] + ph_
            if all(min(abs(x_ - y__) % 360, 360 - abs(x_ - y__) % 360) > 35 for i_, x_ in enumerate(ang) for y__ in ang[i_ + 1:]):
                break
        yield ('R%d m = %d random, phi = %s' % (k + 1, m, [round(q, 1) for q in ang]),
               ['1'] + ['%.3f' % rr.uniform(0.7, 1.4) for _ in range(m - 1)], ['%.3f' % q for q in ang])


rows = []
near = []
allP, allK, allR, allSrc, allMast, allAB, allRes, allBound, allSep, allPL = [], [], [], [], [], [], [], [], [], []
for lab, a_, phd in cases():
    phi = [mp.radians(mp.mpf(q)) for q in phd]
    av = [mp.mpf(q) for q in a_]
    C = Cvec(av, phi)
    J = max(range(len(C)), key=lambda j: C[j])
    print('   %s: C_j = %s, C_* = %s' % (lab, [mp.nstr(q, 8) for q in C], mp.nstr(C[J], 10)))
    for gs in ('1e-2', '1e-3', '1e-4'):
        gm = mp.mpf(gs)
        pts = [0, 2, -2] + ([mp.mpf('0.03')/gm] if gs == '1e-3' else [])
        line = []
        for etaJ in pts:
            P2 = etaJ**2/mp.sqrt(3) + C[J]
            etas = [etaJ if j == J else mp.sqrt(mp.sqrt(3)*max(P2 - C[j], 0)) for j in range(len(av))]
            cv = Curve(gs, av, phi, J)
            X0, _ = cv.guess(etas)
            yJ = S3 + gm*etaJ
            X, nres = newton6(cv, X0, yJ)
            zl, Gl, _, _ = cv.config(X, yJ)
            o = analyse(zl, Gl, gm, len(av))
            ok = nres < mp.mpf('1e-44') and o['res'] < mp.mpf('1e-40') and o['kp'].real < 0
            if not ok:
                check('collapse accepted: %s, gamma = %s, eta_J = %s' % (lab, gs, mp.nstr(etaJ, 4)), False,
                      'newton %s, BS %s' % (mp.nstr(nres, 3), mp.nstr(o['res'], 3)))
                continue
            dP = o['P'] - S3
            Kimp = (o['Cstar'] - dP/gm**2)/(o['dstar'] + gm)
            if etaJ in (0, 2, -2):
                near.append((lab, gs, etaJ, o['dstar']/gm, (o['Cstar'] - dP/gm**2)/gm))
            allP.append(dP)
            allK.append((Kimp, lab, gs, etaJ))
            allR.append(o['r'])
            allSrc.append(o['src'])
            allMast.append(o['mast'])
            allAB.append(max(o['eqA'], o['eqB']))
            allRes.append(o['res'])
            allBound.append(dP - mp.sqrt(3)/8*o['cls']**2*gm**2)
            allSep.append(o['sep'] - 3*o['cls']**2/4)
            if o['PfromL'] is not None:
                allPL.append(abs(o['PfromL'] - o['P']))
            line.append('eta_J %s: (P - sqrt3/2)/gamma^2 = %s, delta_* = %s, c = %s, r/(g^2(d+g)) = %s, K_impl = %s'
                        % (mp.nstr(etaJ, 3), mp.nstr(dP/gm**2, 8), mp.nstr(o['dstar'], 3), mp.nstr(o['cls'], 3),
                           mp.nstr(o['r'], 3), mp.nstr(Kimp, 3)))
        print('     gamma = %s: ' % gs + '\n                    '.join(line))
        sys.stdout.flush()
N3 = len(allP)
print('   %d exact collapses accepted (Newton residual < 1e-44, Biot-Savart residual < 1e-40 over all vortices)' % N3)
check('[numerical] every collapse has Biot-Savart residual < 1e-40 and satisfies (A), (B) of Step 1 to 1e-40',
      N3 > 0 and max(allRes) < mp.mpf('1e-40') and max(allAB) < mp.mpf('1e-40'), 'max (A),(B) residual %s' % mp.nstr(max(allAB), 3))
check('[numerical] the master identity of Step 3 holds on every collapse', max(allMast) < mp.mpf('1e-40'), mp.nstr(max(allMast), 3))
check('[numerical] P - sqrt3/2 = Re(e^{-i pi/3} Lambda)/|Im Lambda| (Step 5) on every collapse', len(allPL) == N3 and max(allPL) < mp.mpf('1e-40'))
check('[numerical] remainders on collapses: r_j and the sources are O(gamma^2 (delta_* + gamma))',
      max(allR) < 200 and max(allSrc) < 200, 'max r %s, max sources %s' % (mp.nstr(max(allR), 3), mp.nstr(max(allSrc), 3)))
check('[numerical] P > sqrt3/2 on every collapse', min(allP) > 0, 'min P - sqrt3/2 = %s' % mp.nstr(min(allP), 4))
check('[numerical] P >= sqrt3/2 + (sqrt3/8) c^2 gamma^2, c the class constant of the configuration (capped at 1/2)',
      min(allBound) > 0)
check('[numerical] the directions are separated: |e^{i phi_j} - e^{i phi_l}| >= 3c^2/4', min(allSep) > 0)
kmax = max(allK, key=lambda q: q[0])
check('[numerical] implied K = (C_* - (P - sqrt3/2)/gamma^2)/(delta_* + gamma) is bounded (the bound P >= sqrt3/2 + gamma^2 (C_* - K(delta_* + gamma)))',
      kmax[0] < 200, 'max %s at %s, gamma = %s, eta_J = %s' % (mp.nstr(kmax[0], 4), kmax[1], kmax[2], mp.nstr(kmax[3], 3)))
dg = {g_: max(q[3] for q in near if q[1] == g_) for g_ in ('1e-2', '1e-3', '1e-4')}
check('[numerical, Step 6] where P - sqrt3/2 = O(gamma^2) (eta_J = 0, +-2), delta_* = O(gamma): max delta_*/gamma does not grow as gamma -> 0',
      dg['1e-4'] <= 1.5*dg['1e-2'], ', '.join('gamma = %s: %s' % (k_, mp.nstr(v_, 4)) for k_, v_ in dg.items()))
Ks = max(q[4] for q in near)
check('[numerical, sharp form] (C_* - (P - sqrt3/2)/gamma^2)/gamma is bounded above, i.e. P >= sqrt3/2 + (C_* - K gamma) gamma^2',
      Ks < 50, 'max %s' % mp.nstr(Ks, 4))
gaps = {}
for q in near:
    if q[2] == 0:
        gaps.setdefault(q[0], {})[q[1]] = abs(q[4])
check('[numerical, Remark 6] at eta_J = 0, |(P - sqrt3/2)/gamma^2 - C_*| = O(gamma): the ratio of the gaps at gamma = 1e-4 and 1e-3 is below 0.2 in every case',
      all(v_['1e-4'] < 0.2*v_['1e-3']*10 and v_['1e-4']*1e-4 < 0.2*v_['1e-3']*1e-3 for v_ in gaps.values()),
      ', '.join('%s: %s' % (k_[:2], mp.nstr(v_['1e-4']*1e-4/(v_['1e-3']*1e-3), 3)) for k_, v_ in gaps.items()))
print()
print('%d checks, %d failed, runtime %.0f s' % (NCHECK[0], len(FAILED), time.time() - T0))
if FAILED:
    for f_ in FAILED:
        print('FAILED: ' + f_)
    sys.exit(1)
