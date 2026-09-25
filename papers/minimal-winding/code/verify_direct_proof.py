# Exact (SymPy) checks of every identity in the direct proof of Corollary 1 of the manuscript
# (paper/minimal-winding.tex): Eq. (Ptheta) from Lemma 3 and from the positions, the three polynomial
# identities, P in terms of x, y and psi, the Lemma 1 step, the sum-of-squares certificate, and the
# expansions of the sharpness argument. Run: python3 verify_direct_proof.py; a failure raises AssertionError.
import sympy as sp

mu, C = sp.symbols('mu C', real=True)
R = 1 + mu + mu**2
N = 2*(1 + mu**2)*R + (1 - mu)*(2 + mu + 2*mu**2)*C - 2*mu*C**2
M = 1 - mu + 2*C
k = (1 - mu)*(2 + mu)*(1 + 2*mu)
T = 2*R + (1 - mu)*C
V = 3*(1 + mu)**2*(R - C**2)

def zero(e, name):
    e = sp.expand(e)
    assert e == 0, (name, sp.factor(e))
    print('OK  ', name)

# ---------------------------------------------------------------- 0. (eq:Ptheta) from Lemma 3 and from eq:pos
# r = sqrt(R), c = cos theta, s = sin theta; everything is reduced modulo r^2 = R and s^2 = 1 - c^2.
c, s, r = sp.symbols('c s r', real=True)
def red(x):
    x = sp.expand(x)
    x = sp.Poly(x, r, s)
    x = sp.rem(x.as_expr(), r**2 - R, r)
    x = sp.rem(sp.expand(x), s**2 - (1 - c**2), s)
    return sp.expand(x)
def czero(x, name):
    """x is a complex rational expression; assert it vanishes modulo the relations."""
    nume = sp.numer(sp.together(sp.expand(x)))
    re_, im_ = sp.expand(nume).as_real_imag()
    assert red(re_) == 0 and red(im_) == 0, name
    print('OK  ', name)
e = c + sp.I*s                                    # e^{i theta}
em = c - sp.I*s                                   # e^{-i theta}
Dk = (r - mu*e)*(r + e)
kap = sp.I*(1 + mu)**3/(2*sp.pi*r)*(r + (1 - mu)*e)/Dk      # Lemma 3
Dpaper = ((R + mu**2 - 2*mu*C)*(R + 1 + 2*C)).subs(C, r*c)
zero(red(Dk*sp.expand(Dk.subs(sp.I, -sp.I)) - Dpaper), 'Lemma 3: |(sqrt R - mu e^{i th})(sqrt R + e^{i th})|^2 = D')
num = sp.expand(sp.I*(1 + mu)**3*(r + (1 - mu)*e)*Dk.subs(sp.I, -sp.I))   # kappa = num / (2 pi r D)
reN, imN = num.as_real_imag()
zero(red(reN + (1 + mu)**3*mu*M.subs(C, r*c)*s), 'Lemma 3: Re kappa = -(1+mu)^3 mu M sin(th) / (2 pi sqrt(R) D)')
zero(red(imN*r - (1 + mu)**3*N.subs(C, r*c)), 'Lemma 3: Im kappa = (1+mu)^3 N / (2 pi R D)')
# Independent: Biot-Savart (eq:bs) on eq:pos gives this kappa for all three vortices
z = [mu*(1 + r*em)/(1 + mu)**2, (mu - r*em)/(1 + mu)**2, sp.Integer(1)]
G = [1, mu, -mu/(1 + mu)]
zero(red(sp.numer(sp.together(sum(G[j]*z[j] for j in range(3))))), 'eq:pos: sum Gamma_j z_j = 0, so z_c = 0')
for j in range(3):
    vbar = sum(G[m]/(z[j] - z[m]) for m in range(3) if m != j)/(2*sp.pi*sp.I)
    zdot = sp.together(vbar).subs(sp.I, -sp.I)          # all symbols real: conjugation = I -> -I
    czero(zdot/z[j] - kap, 'Biot-Savart on eq:pos: zdot_%d/(z_%d - z_c) = Lemma 3 kappa' % (j + 1, j + 1))
# eq:Ptheta: Im kappa / (-2 Re kappa) = N / (2 mu sqrt(R) M sin th)
zero(red(imN*2*mu*r*M.subs(C, r*c)*s - N.subs(C, r*c)*(-2*reN)), 'eq:Ptheta')

# ---------------------------------------------------------------- 1. the three identities of the proof
zero(k**2 + 27*mu**2*(1 + mu)**2 - 4*R**3, '(d1)  k^2 + 27 mu^2 (1+mu)^2 = 4 R^3')
zero(T**2 - R*M**2 - V, '(d2)  T^2 = R M^2 + V')
zero(9*(1 + mu)**2*N - 2*R*(T**2 + V) - k*M*T, '(d3)  9 (1+mu)^2 N = 2R (T^2 + V) + k M T')

# coefficient tables for checking (d1)-(d3) by hand
print('      (d1): k =', sp.expand(k), ';  4R^3 - 27mu^2(1+mu)^2 =', sp.expand(4*R**3 - 27*mu**2*(1 + mu)**2),
      '; k^2 =', sp.expand(k**2))
for name, lhs, rhs in [('(d2)', T**2, R*M**2 + V), ('(d3)', 9*(1 + mu)**2*N, 2*R*(T**2 + V) + k*M*T)]:
    pl, pr = sp.Poly(sp.expand(lhs), C), sp.Poly(sp.expand(rhs), C)
    for d in range(3):
        print('      %s  [C^%d]  lhs = %s   rhs = %s' % (name, d, sp.factor(pl.coeff_monomial(C**d)),
                                                    sp.factor(pr.coeff_monomial(C**d))))

# ---------------------------------------------------------------- 2. P in terms of x, y, psi
cpsi = k/(2*R**sp.Rational(3, 2))
spsi = 3*sp.sqrt(3)*mu*(1 + mu)/(2*R**sp.Rational(3, 2))
zero(sp.simplify(cpsi**2 + spsi**2 - 1), 'cos^2 psi + sin^2 psi = 1  (from d1)')
x = sp.sqrt(R)*M/T
y2 = V/T**2
zero(sp.simplify(x**2 + y2 - 1), 'x^2 + y^2 = 1  (from d2)')
# (d3)/(2 R T^2):  9(1+mu)^2 N / (2 R T^2) = 2 - x^2 + x cos psi
zero(sp.simplify(9*(1 + mu)**2*N/(2*R*T**2) - (2 - x**2 + x*cpsi)), '(d3)/(2RT^2): 9(1+mu)^2 N/(2RT^2) = 2 - x^2 + x cos psi')
# P^2 from eq:Ptheta, with R sin^2 theta = R - C^2
P2 = N**2/(4*mu**2*R*M**2*((R - C**2)/R))
zero(sp.simplify(P2 - (2 - x**2 + x*cpsi)**2/(4*x**2*y2*spsi**2)), 'P^2 = (2 - x^2 + x cos psi)^2 / (4 x^2 y^2 sin^2 psi)')
# sign: 2 - x^2 + x cos psi > 0 is the same as N > 0 (ratio is positive)
print('      ratio (2 - x^2 + x cos psi)/N =', sp.factor(sp.simplify((2 - x**2 + x*cpsi)/N)), '(> 0)')

# ---------------------------------------------------------------- 3. Lemma 1 and the final algebra
a_, b_, al = sp.symbols('a b alpha', real=True)
zero(sp.expand((a_ - b_*sp.cos(al))**2 - (a_**2 - b_**2)*sp.sin(al)**2 - (a_*sp.cos(al) - b_)**2).subs(sp.sin(al)**2, 1 - sp.cos(al)**2),
     'Lemma 1 identity')
X, Y = sp.symbols('x y', real=True)
zero(((2 - X**2)**2 - X**2 - 3*X**2*Y**2 - 4*Y**4).subs(X**2, 1 - Y**2), '(2 - x^2)^2 - x^2 = 3x^2y^2 + 4y^4 on x^2 + y^2 = 1')
zero(sp.expand((2 - X**2 - abs(X)) - (1 - abs(X))*(2 + abs(X))), 'a - |b| = (1 - |x|)(2 + |x|)')
zero(sp.simplify(y2/x**2 - 3*(1 + mu)**2*(R - C**2)/(R*M**2)), 'y^2/x^2 = 3(1+mu)^2 sin^2(theta)/M^2')

# ---------------------------------------------------------------- 4. one-line certificate (sum of squares)
Dsos = 4*R**3*(N**2 - 3*mu**2*(R - C**2)*M**2) - (k*N + 3*mu**2*M*T)**2 - 48*mu**2*(1 + mu)**2*R**2*(R - C**2)**2
zero(Dsos, '(SOS)  4R^3 (N^2 - 3mu^2 (R-C^2) M^2) = (kN + 3mu^2 M T)^2 + 48 mu^2 (1+mu)^2 R^2 (R-C^2)^2')
# the exact gap: P^2 - 3/4 - 3(1+mu)^2 sin^2/M^2 = (kN + 3 mu^2 M T)^2 / (16 mu^2 R^3 (R - C^2) M^2)
gap = P2 - sp.Rational(3, 4) - 3*(1 + mu)**2*(R - C**2)/(R*M**2) - (k*N + 3*mu**2*M*T)**2/(16*mu**2*R**3*(R - C**2)*M**2)
zero(sp.simplify(gap), 'P^2 - 3/4 - 3(1+mu)^2 sin^2/M^2 = (kN + 3mu^2 MT)^2/(16 mu^2 R^3 (R-C^2) M^2)')
# Lagrange form used to derive (SOS) from (d1)-(d3)
W, u, VV, TT, cc, ss = sp.symbols('W u V T c s', real=True)
lag = (TT**2 + VV + cc*u*TT)**2 - 3*ss**2*u**2*VV - (cc*(TT**2 + VV) + u*TT)**2 - 4*ss**2*VV**2
zero(sp.expand(lag).subs(ss**2, 1 - cc**2).subs(u**2, TT**2 - VV), 'Lagrange: W^2 - 3s^2u^2V = (c(T^2+V) + uT)^2 + 4s^2V^2  [c^2+s^2=1, u^2+V=T^2]')

# ---------------------------------------------------------------- 7. sharpness: sin(theta) = -sqrt(3) mu / 2 on A-
mup = sp.Symbol('mu', positive=True)
Rp = 1 + mup + mup**2
Cs = -sp.sqrt(Rp)*sp.sqrt(1 - sp.Rational(3, 4)*mup**2)
Np = lambda CC: 2*(1 + mup**2)*Rp + (1 - mup)*(2 + mup + 2*mup**2)*CC - 2*mup*CC**2
ser = lambda e, n=3: sp.series(e, mup, 0, n).removeO()
assert sp.expand(ser(Cs + sp.sqrt(Rp)) - sp.Rational(3, 8)*mup**2) == 0;          print('OK   C + sqrt R = 3 mu^2/8 + O(mu^3)')
zero(Np(sp.sqrt(Rp))*Np(-sp.sqrt(Rp)) - 3*mup**2*(1 + mup)**2*Rp, 'N(sqrt R) N(-sqrt R) = 3 mu^2 (1+mu)^2 R  (Lemma 3 proof)')
assert sp.expand(ser(Np(sp.sqrt(Rp)), 1) - 4) == 0;                                 print('OK   N(sqrt R) = 4 + O(mu)')
assert sp.expand(ser(Np(-sp.sqrt(Rp))) - sp.Rational(3, 4)*mup**2) == 0;            print('OK   N(-sqrt R) = 3 mu^2/4 + O(mu^3)')
assert sp.expand(ser(sp.diff(Np(C), C).subs(mu, mup).subs(C, -1), 1) - 2) == 0;     print("OK   N'(-1) = 2 + O(mu)")
assert sp.expand(ser(Np(Cs)) - sp.Rational(3, 2)*mup**2) == 0;                       print('OK   N(C) = 3 mu^2/2 + O(mu^3)')
Ps = Np(Cs)/(2*mup*sp.sqrt(Rp)*(1 - mup + 2*Cs)*(-sp.sqrt(3)*mup/2))
print('      P along the family =', sp.series(Ps, mup, 0, 3))
assert sp.simplify(sp.limit(Ps, mup, 0) - sp.sqrt(3)/2) == 0;                       print('OK   P -> sqrt(3)/2 as mu -> 0')
print('all identities verified')
