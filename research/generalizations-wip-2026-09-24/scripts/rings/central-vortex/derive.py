#!/usr/bin/env python3
"""
derive.py -- exact (SymPy) derivation for two concentric regular n-gons plus a central vortex
(DK 2014 Sect. 3, collapse branch Gamma1 + Gamma2 r^2 = 0, Gamma0 != 0 allowed).

Conventions (DK, read from page images p05-p06):
  vortices Gamma1 at R1 eps^k (R1 = 1, b1 = 1), Gamma2 at r e^{i phi2} eps^k, Gamma0 at 0, eps = e^{2 pi i/n}
  (36) Omega = [ {2(n G1 + G0) r^2 - (n-1) G1} r^n b2 + (n-1) G1 - 2 G0 r^2 ] / [ 2 R1^2 r^4 (r^n b2 - 1) ]
  (37) {(n-1) G1 + 2 G0} r^4 - 2 {n G1 + G0} r^2 + (n-1) G1 = 0,   G2 = -G1/r^2,  b2 = e^{i alpha}, alpha = n phi2
  Omega = 2 pi i conj(kappa),  P = |Re Omega| / (2 |Im Omega|),  collapse iff Im Omega < 0.
Normalization G1 = 1, gamma = G0/G1, X = r^2, rho = r^n, v = rho e^{i alpha}.

Every 'check' below is an exact identity (simplify/expand to 0) or an exact sign/positivity certificate.
Run: python3 derive.py
"""
import sympy as sp

RES = []


def check(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('  PASS ' if ok else '  FAIL ') + name + (('  :: ' + str(info)) if info != '' else ''))


n = sp.symbols('n', positive=True)
g, X, rho, c, s = sp.symbols('gamma X rho c s', real=True)       # c = cos alpha, s = sin alpha
w, E = sp.symbols('w E', positive=True)                            # w = e^u, E = e^{n u}
u = sp.symbols('u', positive=True)

print('=' * 90)
print('1. Equation (37) for X = r^2: discriminant, parametrization gamma(X), symmetry')
print('=' * 90)
eq37 = ((n - 1) + 2 * g) * X**2 - 2 * (n + g) * X + (n - 1)
disc4 = sp.expand((n + g)**2 - (n - 1) * ((n - 1) + 2 * g))
check('1a quarter-discriminant of (37) in X equals (gamma+1)^2 + 2(n-1) > 0 (two real roots for every real gamma, n >= 2)',
      sp.expand(disc4 - ((g + 1)**2 + 2 * (n - 1))) == 0, disc4)
check('1b (37) at X = 1 equals -2 (so r = 1 is never a root)', sp.simplify(eq37.subs(X, 1) + 2) == 0)
gX = sp.solve(eq37, g)[0]
gX_claim = 1 / (X - 1) - (n - 1) * (X - 1) / (2 * X)
check('1c (37) is linear in gamma: gamma(X) = 1/(X-1) - (n-1)(X-1)/(2X)', sp.simplify(gX - gX_claim) == 0, sp.factor(gX))
dg = sp.diff(gX_claim, X)
check('1d dgamma/dX = -1/(X-1)^2 - (n-1)/(2X^2) < 0 (gamma strictly decreasing on (0,1) and on (1,oo))',
      sp.simplify(dg - (-1 / (X - 1)**2 - (n - 1) / (2 * X**2))) == 0)
print('     limits: X->0+ ', sp.limit(gX_claim.subs(n, 3), X, 0, '+'), '; X->1- ', sp.limit(gX_claim.subs(n, 3), X, 1, '-'),
      '; X->1+ ', sp.limit(gX_claim.subs(n, 3), X, 1, '+'), '; X->oo ', sp.limit(gX_claim, X, sp.oo), '(n = 3 for the first three)')
# symmetry X -> 1/X, gamma -> -X gamma
sym = sp.expand(eq37.subs({g: -X * g, X: 1 / X}, simultaneous=True) * X**2 - eq37)
check('1e (37) is invariant under (X, gamma) -> (1/X, -X gamma) (ring interchange + time reversal)', sym == 0)
check('1f gamma(1/X) = -X gamma(X)', sp.simplify(gX_claim.subs(X, 1 / X) + X * gX_claim) == 0)
# the number of positive roots
print('     roots: gamma > -(n-1)/2 -> product (n-1)/((n-1)+2gamma) > 0 and sum 2(n+gamma)/((n-1)+2gamma) > 0: two positive roots;')
print('            gamma = -(n-1)/2 -> linear, X = (n-1)/(n+1);  gamma < -(n-1)/2 -> product < 0: one positive root (in (0,1)).')
check('1g gamma = -(n-1)/2: (37) reduces to -(n+1) X + (n-1) = 0',
      sp.expand(eq37.subs(g, -(n - 1) / 2) - (-(n + 1) * X + (n - 1))) == 0)

print('=' * 90)
print('2. Omega from (36): real and imaginary parts, collapse condition, P = |K - L cos a| / (4 n X sin a)')
print('=' * 90)
A = 2 * (n + g) * X - (n - 1)
B = (n - 1) - 2 * g * X
v = rho * (c + sp.I * s)
vb = rho * (c - sp.I * s)
Om36 = (A * v + B) / (2 * X**2 * (v - 1))                           # R1 = 1
num = sp.expand((A * v + B) * (vb - 1))
den = sp.expand((v - 1) * (vb - 1))
num = sp.expand(num.subs(s**2, 1 - c**2))
den = sp.expand(den.subs(s**2, 1 - c**2))
check('2a |v - 1|^2 = rho^2 - 2 rho c + 1', sp.expand(den - (rho**2 - 2 * rho * c + 1)) == 0)
ReN, ImN = sp.re(num), sp.im(num)
check('2b Re[(A v + B) conj(v - 1)] = A rho^2 - B - (A - B) rho cos a', sp.expand(ReN - (A * rho**2 - B - (A - B) * rho * c)) == 0)
check('2c Im[(A v + B) conj(v - 1)] = -(A + B) rho sin a', sp.expand(ImN + (A + B) * rho * s) == 0)
check('2d A + B = 2 n X (independent of gamma)', sp.expand(A + B - 2 * n * X) == 0)
print('     => Im Omega = -n rho sin a / (X |v-1|^2): with Gamma1 > 0, collapse iff sin a > 0, for every gamma and both roots')
print('     => P = |A rho - B/rho - (A - B) cos a| / (4 n X sin a)')
# on the family gamma = gamma(X)
A_f = sp.simplify(A.subs(g, gX_claim))
B_f = sp.simplify(B.subs(g, gX_claim))
check('2e on (37): A = X[(n+1) + 2/(X-1)]', sp.simplify(A_f - X * ((n + 1) + 2 / (X - 1))) == 0)
check('2f on (37): B = X[(n-1) - 2/(X-1)]', sp.simplify(B_f - X * ((n - 1) - 2 / (X - 1))) == 0)
check('2g on (37): L = A - B = 2X(X+1)/(X-1); also = 2X[(n + 2 gamma) - (n-1)/X] for any gamma',
      sp.simplify(A_f - B_f - 2 * X * (X + 1) / (X - 1)) == 0 and sp.expand(A - B - 2 * X * ((n + 2 * g) - (n - 1) / X)) == 0)

print('=' * 90)
print('3. Hyperbolic form: X = e^{2u} (r = e^u), rho = e^{nu}; divide numerator and denominator of P by 2X')
print('=' * 90)
# W = w = e^u, E = e^{nu}; sinh(nu) = (E - 1/E)/2 etc.
sh = lambda t: (t - 1 / t) / 2
ch = lambda t: (t + 1 / t) / 2
Xw = w**2
Kbig = (A_f * rho - B_f / rho).subs({X: Xw, rho: E})             # A rho - B/rho
Lbig = (A_f - B_f).subs(X, Xw)
Ksm = Kbig / (2 * Xw)
Bsm = Lbig / (2 * Xw)
coth_u = ch(w) / sh(w)
K_hyp1 = n * sh(E) + coth_u * ch(E)
check('3a K := (A rho - B/rho)/(2X) = n sinh(nu) + coth(u) cosh(nu)', sp.simplify(Ksm - K_hyp1) == 0)
check('3b B := (A - B)/(2X) = coth(u) = (r^2+1)/(r^2-1)', sp.simplify(Bsm - coth_u) == 0)
# K = [(n+1) cosh((n+1)u) - (n-1) cosh((n-1)u)] / (2 sinh u)
K_hyp2 = ((n + 1) * ch(E * w) - (n - 1) * ch(E / w)) / (2 * sh(w))
check('3c K = [(n+1) cosh((n+1)u) - (n-1) cosh((n-1)u)] / (2 sinh u)', sp.simplify(K_hyp1 - K_hyp2) == 0)
# gamma in u
g_u = gX_claim.subs(X, Xw)
g_u_claim = (1 / w) * (n - (n - 1) * ch(w**2)) / (2 * sh(w))
check('3d gamma = Gamma0/Gamma1 = e^{-u} [n - (n-1) cosh 2u] / (2 sinh u)', sp.simplify(g_u - g_u_claim) == 0)
print('     symmetric normalization Gamma1 = e^u (radius e^{-u/2}), Gamma2 = -e^{-u} (radius e^{u/2}):'
      ' Gamma0 = [n - (n-1) cosh 2u] / (2 sinh u) = 1/(2 sinh u) - (n-1) sinh u')
check('3e [n - (n-1) cosh 2u]/(2 sinh u) = 1/(2 sinh u) - (n-1) sinh u',
      sp.simplify((n - (n - 1) * ch(w**2)) / (2 * sh(w)) - (1 / (2 * sh(w)) - (n - 1) * sh(w))) == 0)
# P
print('     => P(a) = (K - B cos a) / (2 n sin a),  0 < a < pi,  C = 2n (same C as the Gamma0 = 0 formula)')
# K - B > 0 and K - B cos a > 0
KmB = sp.simplify(K_hyp1 - coth_u - (n * sh(E) + coth_u * (ch(E) - 1)))
check('3f K - B cos a = n sinh(nu) + coth(u) (cosh(nu) - cos a) > 0 for u > 0 (so the numerator never vanishes)', KmB == 0)
# u -> -u: K and B are odd
check('3g K(-u) = -K(u), B(-u) = -B(u): the root r < 1 gives P = (|K| - |B| cos a)/(2n sin a) at |u|',
      sp.simplify(K_hyp1.subs({w: 1 / w, E: 1 / E}) + K_hyp1) == 0 and sp.simplify(coth_u.subs(w, 1 / w) + coth_u) == 0)

print('=' * 90)
print('4. Minimum over a: Lemma 1 gives P >= sqrt(K^2 - B^2)/(2n), equality at cos a = B/K; D := K^2 - B^2')
print('=' * 90)
D = sp.simplify(K_hyp1**2 - coth_u**2)
D_claim = sh(E)**2 * (n**2 + coth_u**2) + n * coth_u * sh(E**2)
check('4a D = K^2 - B^2 = sinh^2(nu) (n^2 + coth^2 u) + n coth(u) sinh(2nu)', sp.simplify(D - D_claim) == 0)
D_claim2 = n**2 * sh(E)**2 + (ch(w) * sh(E) / sh(w))**2 + n * ch(w) * sh(E**2) / sh(w)
check('4b D = n^2 sinh^2(nu) + [cosh u sinh(nu)/sinh u]^2 + n cosh u sinh(2nu)/sinh u', sp.simplify(D - D_claim2) == 0)
cos_star = coth_u / K_hyp1
cos_star_claim = 2 * ch(w) / ((n + 1) * ch(E * w) - (n - 1) * ch(E / w))
check('4c minimizer cos a* = B/K = 2 cosh u / [(n+1) cosh((n+1)u) - (n-1) cosh((n-1)u)]', sp.simplify(cos_star - cos_star_claim) == 0)
print('     Monotonicity: for integer n >= 2, sinh(nu)/sinh(u) = sum_{k=0}^{n-1} e^{(n-1-2k)u} = sum of cosh terms (strictly increasing in u > 0),')
print('     likewise sinh(2nu)/sinh(u); cosh u and sinh(nu) increase. So each of the three positive terms of 4b strictly increases on u > 0.')
for nn in range(2, 9):
    ok = sp.simplify((sh(w**nn) / sh(w)) - sum(w**(nn - 1 - 2 * k) for k in range(nn))) == 0
    ok = ok and sp.simplify((sh(w**(2 * nn)) / sh(w)) - sum(w**(2 * nn - 1 - 2 * k) for k in range(2 * nn))) == 0
    check('4d n = %d: sinh(nu)/sinh u and sinh(2nu)/sinh u are the palindromic sums of e^{ju}' % nn, ok)
# series at u -> 0
Du = D_claim.subs({w: sp.exp(u), E: sp.exp(n * u)})
Du = sp.simplify(Du.rewrite(sp.exp))
ser = sp.series(Du, u, 0, 6).removeO()
ser = sp.expand(sp.simplify(ser))
c0, c2, c4 = [sp.simplify(ser.coeff(u, k)) for k in (0, 2, 4)]
check('4e D = 3 n^2 + (4 n^2 (2 n^2 + 1)/3) u^2 + O(u^4)  (so P_min -> sqrt(3)/2 as u -> 0)',
      sp.simplify(c0 - 3 * n**2) == 0 and sp.simplify(c2 - sp.Rational(4, 3) * n**2 * (2 * n**2 + 1)) == 0 and
      sp.simplify(ser.coeff(u, 1)) == 0 and sp.simplify(ser.coeff(u, 3)) == 0, 'u^4 coefficient: %s' % sp.factor(c4))
Pmin_ser = sp.series(sp.sqrt(Du) / (2 * n), u, 0, 4).removeO()
check('4f P_min = sqrt(3)/2 + sqrt(3)(2n^2+1)/9 u^2 + O(u^4)',
      sp.simplify(Pmin_ser - (sp.sqrt(3) / 2 + sp.sqrt(3) * (2 * n**2 + 1) / 9 * u**2)) == 0, sp.simplify(Pmin_ser))
# gamma(u) series -> u = 1/(2 gamma) + O(gamma^-2)
gser = sp.series(g_u_claim.subs(w, sp.exp(u)).rewrite(sp.exp), u, 0, 2).removeO()
check('4g gamma(u) = 1/(2u) - 1/2 - (6n-7)u/6 + O(u^2)  => u = 1/(2 gamma + 1) + O(gamma^-3), P_min - sqrt(3)/2 ~ sqrt(3)(2n^2+1)/(36 gamma^2)',
      sp.simplify(gser - (1 / (2 * u) - sp.Rational(1, 2) - (6 * n - 7) * u / 6)) == 0, sp.simplify(gser))
# cos a* series -> a* ~ sqrt(3) n u
cser = sp.series(cos_star_claim.subs({w: sp.exp(u), E: sp.exp(n * u)}).rewrite(sp.exp), u, 0, 3).removeO()
check('4h cos a* = 1 - (3 n^2/2) u^2 + O(u^4)  (a* ~ sqrt(3) n u -> 0: the two polygons close up pairwise)',
      sp.simplify(cser - (1 - sp.Rational(3, 2) * n**2 * u**2)) == 0, sp.simplify(cser))

print('=' * 90)
print('5. Exact per-n certificates, n = 2..8: D as a polynomial in t = cosh(u) - 1 has positive coefficients and constant 3n^2')
print('=' * 90)
t = sp.symbols('t', positive=True)
cc = sp.symbols('cc', positive=True)                                # cc = cosh u
for nn in range(2, 9):
    # sinh(nu)/sinh u = U_{n-1}(cosh u), sinh^2 u = cc^2 - 1
    Un1 = sp.chebyshevu(nn - 1, cc)
    U2n1 = sp.chebyshevu(2 * nn - 1, cc)
    Dpoly = sp.expand(nn**2 * (cc**2 - 1) * Un1**2 + cc**2 * Un1**2 + nn * cc * U2n1)
    # cross-check with the hyperbolic D at a rational w
    wv = sp.Rational(3, 2)
    Dnum = D_claim.subs({n: nn, w: wv, E: wv**nn})
    Dpv = Dpoly.subs(cc, (wv + 1 / wv) / 2)
    Dt = sp.Poly(sp.expand(Dpoly.subs(cc, 1 + t)), t)
    coeffs = Dt.all_coeffs()[::-1]
    ok = sp.simplify(Dnum - Dpv) == 0 and coeffs[0] == 3 * nn**2 and all(co > 0 for co in coeffs[1:])
    check('5 n = %d: D(cosh u = 1 + t) = %s + %s t + ... (degree %d, all coefficients > 0)' % (nn, coeffs[0], coeffs[1], Dt.degree()),
          ok)

print('=' * 90)
print('6. Gamma0 = 0 recovers the paper: u = eta/2 with cosh eta = n/(n-1); K = K_n = (n-1) sinh((n+2)eta/2), B = sqrt(2n-1)')
print('=' * 90)
for nn in range(2, 9):
    xn = (nn + sp.sqrt(2 * nn - 1)) / (nn - 1)
    wv = sp.sqrt(xn)                                                 # e^u, u = eta/2
    Kv = K_hyp1.subs({n: nn, w: wv, E: wv**nn})
    Bv = coth_u.subs(w, wv)
    Kn_paper = (nn - 1) * sh(wv**(nn + 2))
    gv = g_u_claim.subs({n: nn, w: wv})
    ok = sp.simplify(sp.radsimp(Kv - Kn_paper)) == 0 and sp.simplify(sp.radsimp(Bv - sp.sqrt(2 * nn - 1))) == 0 and sp.simplify(gv) == 0
    check('6 n = %d: gamma(u) = 0, K = K_n, B = sqrt(2n-1)' % nn, ok, 'K_n = %s' % sp.nsimplify(sp.radsimp(sp.simplify(Kn_paper))))

print('=' * 90)
print('7. A rational example: n = 2, r = 2 (X = 4)')
print('=' * 90)
Xv = sp.Integer(4)
gv = gX_claim.subs({n: 2, X: Xv})
Kv = K_hyp1.subs({n: 2, w: 2, E: 4})
Bv = coth_u.subs(w, 2)
Pm = sp.sqrt(Kv**2 - Bv**2) / 4
print('     gamma = %s, Gamma2 = %s, K = %s, B = %s, P_min = %s = %s, cos a* = %s' %
      (gv, -1 / Xv, Kv, Bv, sp.nsimplify(Pm), sp.N(Pm, 20), Bv / Kv))
check('7 n = 2, r = 2: gamma = -1/24 satisfies (37), P_min = 5 sqrt(129)/32', sp.simplify(eq37.subs({n: 2, g: gv, X: Xv})) == 0
      and sp.simplify(Pm - 5 * sp.sqrt(129) / 32) == 0)

nf = sum(1 for _, ok in RES if not ok)
print('\nchecks: %d, passed: %d, failed: %d' % (len(RES), len(RES) - nf, nf))
