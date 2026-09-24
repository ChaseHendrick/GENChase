#!/usr/bin/env python3
"""
Independent exact (SymPy) check of CV-a3: winding P for two concentric regular n-gons plus a central vortex,
collapse branch Gamma1 + Gamma2 r^2 = 0.  Own derivation, written from scratch.

Setup: Gamma1 = 1 at eps^k (radius 1), Gamma2 = -1/X at zeta eps^k, zeta = r e^{i phi}, X = r^2, Gamma0 = g at 0,
a = n phi, v = zeta^n = r^n e^{i a}.  Biot-Savart conj(dz_j/dt) = (1/(2 pi i)) sum' Gamma_k/(z_j - z_k),
self-similar dz_j/dt = kappa z_j, P = |Im kappa|/(-2 Re kappa).
Root-of-unity sums: sum_{k=1}^{n-1} 1/(1-eps^k) = (n-1)/2,  sum_k 1/(z - zeta eps^k) = n z^{n-1}/(z^n - zeta^n).
Then 2 pi i conj(kappa) = S1 (from the vortex at 1) = S2 (from the vortex at zeta), where
  S1 = (n-1)/2 + g + n G2/(1-v),   S2 = [G2 (n-1)/2 + g + n v/(v-1)]/X.
"""
import sympy as sp

res = []
def check(name, ok):
    res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + name)

n = sp.Symbol('n', positive=True)
g = sp.Symbol('g', real=True)
X, w, E = sp.symbols('X w E', positive=True)     # X = r^2, w = r = e^u, E = r^n = e^{n u}
v, G2 = sp.symbols('v G2')
c, s = sp.symbols('c s', real=True)             # cos a, sin a

# --- 0. root-of-unity sums, exact for n = 2..9 (sanity; symbolic n is the standard partial-fraction identity)
ok = True
zz, ze = sp.symbols('zz ze')
for nn in range(2, 10):
    eps = sp.exp(2*sp.pi*sp.I/nn)
    s1 = sum(1/(1 - eps**k) for k in range(1, nn))
    ok &= sp.simplify(sp.nsimplify(sp.N(s1, 60)) - sp.Rational(nn-1, 2)) == 0
    # partial fractions: d/dz log(z^n - ze^n) = sum_k 1/(z - ze eps^k); check at a rational point numerically to 60 digits
    lhs = sum(1/(sp.Rational(3, 7) - sp.Rational(5, 4)*sp.exp(sp.I*sp.Rational(1, 3))*eps**k) for k in range(nn))
    z0, q0 = sp.Rational(3, 7), sp.Rational(5, 4)*sp.exp(sp.I*sp.Rational(1, 3))
    rhs = nn*z0**(nn-1)/(z0**nn - q0**nn)
    ok &= abs(sp.N(lhs - rhs, 60)) < 1e-55
check('0  root-of-unity sums (n = 2..9)', ok)

# --- 1. self-similarity S1 = S2 with G2 = -1/X is equivalent to (37), independent of v
S1 = (n-1)/2 + g + n*G2/(1 - v)
S2 = (G2*(n-1)/2 + g + n*v/(v - 1))/X
eq37 = ((n-1) + 2*g)*X**2 - 2*(n + g)*X + (n-1)
diff = sp.together((S1 - S2).subs(G2, -1/X))
num = sp.numer(diff)
check('1b 2 X^2 (S1 - S2) == (37) exactly', sp.simplify(diff*2*X**2 - eq37) == 0)

# --- 2. gamma(X) on (37)
gX = (-(n-1)*X**2 + 2*n*X - (n-1))/(2*X*(X - 1))
check('2  gamma(X) = 1/(X-1) - (n-1)(X-1)/(2X) solves (37)', sp.simplify(eq37.subs(g, gX)) == 0 and
      sp.simplify(gX - (1/(X-1) - (n-1)*(X-1)/(2*X))) == 0)

# --- 3. real and imaginary parts of Omega = S1 (G2 = -1/X), v = E (c + i s), c^2 + s^2 = 1
cc = (n-1)/2 + g
Om = cc - n/(X*(1 - E*(c + sp.I*s)))
D = 1 - 2*E*c + E**2
ReO = sp.simplify(sp.re(sp.expand_complex(Om)))
ImO = sp.simplify(sp.im(sp.expand_complex(Om)))
# the denominators produced by expand_complex are (1-Ec)^2 + E^2 s^2; replace s^2 -> 1 - c^2
def mod_s(expr):
    num, den = sp.fraction(sp.together(expr))
    num = sp.expand(num).subs(s**2, 1 - c**2); den = sp.expand(den).subs(s**2, 1 - c**2)
    num = sp.expand(num).subs(s**2, 1 - c**2); den = sp.expand(den).subs(s**2, 1 - c**2)
    return sp.simplify(num/den)
ImO_ = mod_s(ImO); ReO_ = mod_s(ReO)
check('3a Im Omega * X * |1-v|^2 = -n r^n sin a', sp.simplify(ImO_*X*D + n*E*s) == 0)
Kp = cc*X*(E + 1/E) - n/E
Bp = 2*cc*X - n
check('3b Re Omega * X * |1-v|^2 / r^n = Kp - Bp cos a,  Kp = c0 X (r^n + r^-n) - n r^-n, Bp = 2 c0 X - n',
      sp.simplify(ReO_*X*D/E - (Kp - Bp*c)) == 0)
# hence P = |Re Om|/(2|Im Om|) = |Kp - Bp c| / (2 n |s|); collapse iff Im Om < 0 iff s > 0 (Re kappa = Im Om/(2 pi))
kap_s = sp.Symbol('Om', complex=True)
al, be = sp.symbols('alpha beta', real=True)
Omg = al + sp.I*be
kappa = sp.conjugate(Omg/(2*sp.pi*sp.I))
check('3c kappa = conj(Omega/(2 pi i)): Re kappa = Im Omega/(2 pi), Im kappa = Re Omega/(2 pi)',
      sp.simplify(sp.re(kappa) - be/(2*sp.pi)) == 0 and sp.simplify(sp.im(kappa) - al/(2*sp.pi)) == 0)

# --- 4. on (37), in u = ln r:  Bp = coth u,  Kp = coth u cosh(nu) + n sinh(nu)  (signed)
sub = {g: gX.subs(X, w**2), X: w**2}
Bp_u = Bp.subs(g, gX).subs(X, w**2)
coth = (w**2 + 1)/(w**2 - 1)
chn, shn = (E + 1/E)/2, (E - 1/E)/2
check('4a Bp = n + 2 gamma - (n-1)/X on (37)', sp.simplify((Bp - (n + 2*g - (n-1)/X)).subs(g, gX)) == 0)
check('4b Bp = (X+1)/(X-1) = coth u on (37)', sp.simplify(Bp_u - coth) == 0)
Kp_u = Kp.subs(g, gX).subs(X, w**2)
check('4c Kp = coth u cosh(n u) + n sinh(n u) on (37)', sp.simplify(Kp_u - (coth*chn + n*shn)) == 0)
ch = lambda m: ((E*w**m) + 1/(E*w**m))/2        # cosh((n+m) u) with w = e^u, E = e^{nu}
shu = (w - 1/w)/2
check('4d Kp = [(n+1) cosh((n+1)u) - (n-1) cosh((n-1)u)]/(2 sinh u)',
      sp.simplify(Kp_u - ((n+1)*ch(1) - (n-1)*ch(-1))/(2*shu)) == 0)
Kform = ((2*(n+g)*X - (n-1))*E - ((n-1) - 2*g*X)/E)/(2*X)
check('4e Kp = [(2(n+g)X-(n-1)) r^n - ((n-1)-2gX) r^-n]/(2X) on (37)', sp.simplify((Kp - Kform).subs(g, gX)) == 0)
# odd under u -> -u (w -> 1/w, E -> 1/E):
check('4f Kp and Bp are odd under u -> -u, so |Kp - Bp c| = K(|u|) - B(|u|) c (signs from K > B >= 0 ... see 5)',
      sp.simplify(Kp_u.subs({w: 1/w, E: 1/E}, simultaneous=True) + Kp_u) == 0 and
      sp.simplify(Bp_u.subs(w, 1/w) + Bp_u) == 0)

# --- 5. numerator identity K - B c = n sinh(n u) + coth u (cosh(n u) - c) for u > 0
check('5  Kp - Bp c = n sinh(nu) + coth u (cosh nu - c)', sp.simplify((Kp_u - Bp_u*c) - (n*shn + coth*(chn - c))) == 0)

# --- 6. gamma = 0: u = eta/2 with x_n = e^eta; K = (n-1) sinh((n+2) eta/2), B = sqrt(2n-1)
qd = (n-1)*w**4 - 2*n*w**2 + (n-1)                  # (37) at g = 0 with X = w^2
Kn_hyp = (n-1)*(E*w**2 - 1/(E*w**2))/2               # (n-1) sinh((n+2)u)
dn = sp.numer(sp.together(Kp.subs(g, 0).subs(X, w**2) - Kn_hyp))
dn = sp.expand(dn)
q_, r_ = sp.div(sp.Poly(dn, w, domain=sp.QQ.frac_field(n, E)), sp.Poly(qd, w, domain=sp.QQ.frac_field(n, E)))
check('6a gamma = 0: Kp - (n-1) sinh((n+2)u) == 0 mod (37)|_{g=0} (symbolic n, E)', r_.is_zero)
dB = sp.numer(sp.together(coth**2 - (2*n - 1)))
q2, r2 = sp.div(sp.Poly(sp.expand(dB), w, domain=sp.QQ.frac_field(n)), sp.Poly(qd, w, domain=sp.QQ.frac_field(n)))
check('6b gamma = 0: coth^2 u = 2n-1 mod (37)|_{g=0}', r2.is_zero)
ok = True
for nn in range(2, 13):
    xn = (nn + sp.sqrt(2*nn - 1))/(nn - 1)
    r = sp.sqrt(xn); En = r**nn
    Kval = (sp.Rational(nn-1, 2))*xn*(En + 1/En) - nn/En             # paper K_n
    Kh = (nn - 1)*(En*xn - 1/(En*xn))/2
    Kc = ((xn + 1)/(xn - 1))*(En + 1/En)/2 + nn*(En - 1/En)/2
    Bc = (xn + 1)/(xn - 1)
    ok &= sp.simplify(sp.radsimp(Kval - Kh)) == 0 and sp.simplify(sp.radsimp(Kval - Kc)) == 0
    ok &= sp.simplify(sp.radsimp(Bc - sp.sqrt(2*nn - 1))) == 0 and sp.simplify(eq37.subs({n: nn, g: 0, X: xn})) == 0
    ok &= abs(sp.N(Kval - Kh, 80)) < 1e-70
check('6c gamma = 0, n = 2..12: exact radicals K = K_n = (n-1) sinh((n+2)eta/2), B = sqrt(2n-1)', ok)

print('\n%d/%d exact checks passed' % (sum(res), len(res)))
