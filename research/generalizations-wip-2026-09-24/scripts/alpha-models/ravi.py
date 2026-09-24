# Polynomial certificate attempt: beta^2 S^2 - (1+2beta) E > 0 on triangles, E = 16 A^2.
# For beta = q/2 (alpha = q - 2), use sides r_i: coth(beta ln(r_k/r_j)) = (r_k^q + r_j^q)/(r_k^q - r_j^q).
import sympy as sp, sys
x, p, q_ = sp.symbols('x p q', nonnegative=True)
r1s, r2s, r3s = sp.symbols('r1 r2 r3', positive=True)
def cert(qq):
    beta = sp.Rational(qq, 2)
    c = lambda rk, rj: (rk**qq + rj**qq)/(rk**qq - rj**qq)
    r1, r2, r3 = r1s, r2s, r3s
    S = r1**2*c(r3, r2) + r2**2*c(r1, r3) + r3**2*c(r2, r1)
    D = (r3**qq - r2**qq)*(r1**qq - r3**qq)*(r2**qq - r1**qq)
    N = sp.expand(sp.cancel(S*D))
    E = (r1+r2+r3)*(-r1+r2+r3)*(r1-r2+r3)*(r1+r2-r3)
    F = sp.expand(beta**2*N**2 - (1+2*beta)*E*D**2)
    # ordered domain r2 <= r3 <= r1 ; Ravi r1 = y+z, r2 = x+z, r3 = x+y with x <= z <= y: z = x+p, y = x+p+q
    y = x + p + q_; z = x + p
    G = sp.expand(F.subs({r1s: y+z, r2s: x+z, r3s: x+y}))
    poly = sp.Poly(G, x, p, q_)
    coeffs = poly.coeffs()
    neg = [ (m, cf) for m, cf in zip(poly.monoms(), coeffs) if cf < 0]
    print('q=%d (beta=%s, alpha=%d): degree %d, #terms %d, #negative coefficients %d' % (qq, beta, qq-2, poly.total_degree(), len(coeffs), len(neg)))
    if neg[:6]: print('   sample negative:', neg[:6])
    return poly
for qq in [2, 3, 4]:
    cert(qq)
