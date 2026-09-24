import sympy as sp, pickle, sys
x, p, q_ = sp.symbols('x p q', nonnegative=True)
t = sp.symbols('t', nonnegative=True)
r1s, r2s, r3s = sp.symbols('r1 r2 r3', positive=True)
def build(qq):
    beta = sp.Rational(qq, 2)
    c = lambda rk, rj: (rk**qq + rj**qq)/(rk**qq - rj**qq)
    r1, r2, r3 = r1s, r2s, r3s
    S = r1**2*c(r3, r2) + r2**2*c(r1, r3) + r3**2*c(r2, r1)
    D = (r3**qq - r2**qq)*(r1**qq - r3**qq)*(r2**qq - r1**qq)
    N = sp.expand(sp.cancel(S*D))
    E = (r1+r2+r3)*(-r1+r2+r3)*(r1-r2+r3)*(r1+r2-r3)
    F = sp.expand(beta**2*N**2 - (1+2*beta)*E*D**2)
    y = x + p + q_; z = x + p
    G = sp.expand(F.subs({r1s: y+z, r2s: x+z, r3s: x+y}))
    return sp.Poly(G, x, p, q_), N, D, F
qq = int(sys.argv[1])
poly, N, D, F = build(qq)
pickle.dump((poly.as_expr(), N, D, F), open(f'G_q{qq}.pkl','wb'))
G = poly.as_expr()
Gx = sp.Poly(G, x)
print('q=',qq,' x-degree', Gx.degree())
for a in range(Gx.degree()+1):
    ga = sp.expand(Gx.coeff_monomial(x**a))
    if ga == 0: 
        print(' a=%d: zero'%a); continue
    pg = sp.Poly(ga, p, q_)
    negs = sum(1 for cf in pg.coeffs() if cf < 0)
    # univariate in t = p/q (q>0): ga(p,q) = q^d * h(t)
    h = sp.Poly(sp.expand(ga.subs({p: t, q_: 1})), t)
    # count positive real roots of h (Sturm)
    nroots = sp.count_roots(h, 0, sp.oo) if h.degree() > 0 else 0
    # also check behaviour at t=0 and t->inf
    lc = h.LC(); c0 = h.eval(0)
    # multiplicity of root at 0
    m0 = 0; hh = h
    while hh.eval(0) == 0 and hh.degree()>0:
        hh = sp.Poly(sp.quo(hh.as_expr(), t), t); m0 += 1
    npos = sp.count_roots(hh, 0, sp.oo) if hh.degree()>0 else 0
    # root at 0 counted in count_roots over [0,oo); hh excludes t=0 root
    print(' a=%2d: #neg coeffs %3d, root mult at p=0: %d, #roots in t>0 (excluding 0): %d, sign at 0+: %s, sign at inf: %s' % (a, negs, m0, npos - (1 if hh.eval(0)==0 else 0), sp.sign(hh.eval(0)), sp.sign(lc)))
