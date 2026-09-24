# Independent exact check of CV-b (central vortex + two n-gons, DK Sect. 3 collapse branch).
# My own derivation: ring 1 (circulation 1) at e^{2 pi i k/n}, ring 2 (circulation -1/X) at r e^{i phi} e^{2 pi i k/n},
# X = r^2, central vortex gamma. S1 = sum' Gamma/(z_0 - z_k) at z_0 = 1; S2 likewise at w_0 = r e^{i phi}.
# Self-similar iff S1 = S2 e^{i phi}/r.  Then conj(kappa) = S1/(2 pi i), P = |Re S1| / (-2 Im S1).
import sympy as sp

n, X, R, gam, c, r = sp.symbols('n X R gamma c r', positive=True)  # R stands for r^n, c for cos a
ok = True
def chk(name, expr):
    global ok
    z = sp.simplify(expr)
    good = (z == 0)
    ok &= good
    print(('OK  ' if good else 'FAIL'), name, '' if good else z)

# 1. circulation condition, symbolic n, via closed-form sums (identities checked for n=2..9 below)
v = sp.Symbol('v')
Xs = r**2
S1 = (n-1)/sp.Integer(2) + gam + (-1/Xs)*n/(1 - v)
# at w0: ring-1 sum n w^{n-1}/(w^n - 1) ; times e^{i phi}/r gives n v /(X (v-1)) with v = w^n
S2rot = n*v/(Xs*(v-1)) - (n-1)/(2*Xs**2) + gam/Xs
cond = sp.together((S2rot - S1)*2*Xs**2)
cond = sp.simplify(cond)
eq37 = ((n-1)+2*gam)*Xs**2 - 2*(n+gam)*Xs + (n-1)
chk('self-similarity condition == -(37) (independent of v)', sp.simplify(cond + eq37))

# the two sum identities, n = 2..9
for nn in range(2, 10):
    w = sp.exp(2*sp.pi*sp.I/nn)
    s = sum(1/(1 - w**k) for k in range(1, nn))
    chk(f'sum 1/(1-w^k) = (n-1)/2, n={nn}', sp.nsimplify(sp.N(s, 60) - sp.Rational(nn-1, 2), tolerance=1e-50))
    zz, cc = sp.Rational(3, 7) + sp.I/5, sp.Rational(2, 3) - sp.I/3
    s2 = sum(1/(zz - cc*w**k) for k in range(nn))
    chk(f'sum 1/(z - c w^k) = n z^(n-1)/(z^n - c^n), n={nn}', sp.N(s2 - nn*zz**(nn-1)/(zz**nn - cc**nn), 60).evalf(60) if abs(sp.N(s2 - nn*zz**(nn-1)/(zz**nn - cc**nn), 60)) > 1e-50 else 0)

# 2. gamma(X) from (37)
gX = 1/(X-1) - (n-1)*(X-1)/(2*X)
chk('(37) at gamma(X) vanishes', eq37.subs(r, sp.sqrt(X)).subs(gam, gX))

# 3. P numerator: X|v-1|^2 Re S1 / r^n = K' - B' cos a with my K', B'
#    X|v-1|^2 Re S1 = ((n-1)/2+gamma) X (R^2 - 2 R c + 1) + n (R c - 1)
num = (((n-1)/sp.Integer(2) + gX)*X*(R**2 - 2*R*c + 1) + n*(R*c - 1))/R
Kp = (((n-1)/sp.Integer(2) + gX)*X*(R + 1/R) - n/R)
Bp = (n-1+2*gX)*X - n
chk('num = K\' - B\' c', num - (Kp - Bp*c))
# claimed forms: B = coth u = (X+1)/(X-1), K = n sinh(nu) + coth u cosh(nu)  (signed u = ln r, R = e^{nu})
sh = (R - 1/R)/2; ch = (R + 1/R)/2; cth = (X+1)/(X-1)
chk("B' = coth u", Bp - cth)
chk("K' = n sinh nu + coth u cosh nu", Kp - (n*sh + cth*ch))
# the |.| form in NOTES: K = |(2(n+g)X-(n-1)) R - ((n-1) - 2 g X)/R| / (2X)
chk("K' = [(2(n+g)X-(n-1))R - ((n-1)-2gX)/R]/(2X)", Kp - ((2*(n+gX)*X - (n-1))*R - ((n-1) - 2*gX*X)/R)/(2*X))
# Im part: X|v-1|^2 Im S1 = -n R sin a  -> P = (K' - B' c)/(2 n sin a) * sign; handled numerically

# 4. D = K^2 - B^2 forms, symbolic n
K = n*sh + cth*ch
D = K**2 - cth**2
chk('D = sinh^2(nu)(n^2 + coth^2 u) + n coth u sinh(2nu)', D - (sh**2*(n**2 + cth**2) + n*cth*(R**2 - R**-2)/2))
shu = (r - 1/r)/2; chu = (r + 1/r)/2
D2 = n**2*sh**2 + (chu*sh/shu)**2 + n*chu*((R**2 - R**-2)/2)/shu
chk('D second form (r symbol, X=r^2)', (D - D2).subs(X, r**2))

# 5. cos a* = B/K = 2 cosh u / [(n+1)cosh((n+1)u) - (n-1)cosh((n-1)u)]
chn1 = (R*r + 1/(R*r))/2; chm1 = (R/r + r/R)/2
chk('B/K = 2cosh u/[(n+1)cosh((n+1)u)-(n-1)cosh((n-1)u)]', (cth/K - 2*chu/((n+1)*chn1 - (n-1)*chm1)).subs(X, r**2))
# K - B > 0 : K - B = n sinh(nu) + coth u (cosh nu - 1) for u>0
chk('K - B = n sinh nu + coth u (cosh nu - 1)', K - cth - (n*sh + cth*(ch - 1)))

# 6. Lemma: f(a) = (K - B cos a)/sin a, f' = (B - K cos a)/sin^2 a; f(a*) = sqrt(K^2-B^2)
a, Ks, Bs = sp.symbols('a K B', positive=True)
f = (Ks - Bs*sp.cos(a))/sp.sin(a)
chk("f'(a) = (B - K cos a)/sin^2 a", sp.diff(f, a) - (Bs - Ks*sp.cos(a))/sp.sin(a)**2)
# f(a) - sqrt(K^2-B^2) >= 0: (K - B c)^2 - (K^2-B^2)(1-c^2) = (K c - B)^2
cc_ = sp.Symbol('cc')
chk('(K-Bc)^2 - (K^2-B^2)(1-c^2) = (Kc - B)^2', sp.expand((Ks - Bs*cc_)**2 - (Ks**2 - Bs**2)*(1 - cc_**2) - (Ks*cc_ - Bs)**2))

# 7. gamma = 0 gives F_n with the paper's K_n = (n-1) sinh((n+2) eta/2), x_n = e^eta, cosh eta = n/(n-1)
for nn in range(2, 13):
    xn = (nn + sp.sqrt(2*nn - 1))/(nn - 1)
    for Xv in (xn, 1/xn):
        g0 = sp.simplify(gX.subs({n: nn, X: Xv}))
        Kv = sp.simplify(K.subs({n: nn, X: Xv, R: Xv**sp.Rational(nn, 2)}))
        Bv = sp.simplify(cth.subs(X, Xv))
        Kn_paper = sp.simplify(((nn-1)*xn*(xn**sp.Rational(nn, 2) + xn**sp.Rational(-nn, 2)))/2 - nn/xn**sp.Rational(nn, 2))
        # for X = 1/x_n, u<0: K' = -K, B' = -B; use |.|
        chk(f'n={nn} X={"x_n" if Xv == xn else "1/x_n"}: gamma=0', g0)
        chk(f'   |K| = K_n', sp.nsimplify(sp.N(abs(Kv) - Kn_paper, 80), tolerance=1e-70))
        chk(f'   B^2 = 2n-1', sp.simplify(Bv**2 - (2*nn - 1)))

# 8. rational example n = 2, r = 2
sub = {n: 2, X: 4, R: 4}
g = gX.subs(sub); Kv = sp.nsimplify(K.subs(sub)); Bv = cth.subs(sub)
print('n=2,r=2: gamma =', g, ' K =', Kv, ' B =', Bv)
chk('gamma = -1/24', g + sp.Rational(1, 24))
chk('K = 175/24', Kv - sp.Rational(175, 24))
chk('B = 5/3', Bv - sp.Rational(5, 3))
Pmin = sp.sqrt(Kv**2 - Bv**2)/4
chk('P_min = 5 sqrt(129)/32', sp.radsimp(Pmin - 5*sp.sqrt(129)/32))
chk('cos a* = 8/35', Bv/Kv - sp.Rational(8, 35))
print('P_min =', sp.N(Pmin, 30))
print('ALL OK' if ok else 'SOME FAILED')
