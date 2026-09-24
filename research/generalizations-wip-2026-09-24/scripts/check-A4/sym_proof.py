import sympy as sp
rho, m, b, x = sp.symbols('rho m beta x', positive=True)
# (ii) lemma derivative
g = 12*x/(12+6*x-x**2) - sp.log(1+x)
gp = sp.simplify(sp.diff(g, x))
claim = x**3*(24-x)/((12+6*x-x**2)**2*(1+x))
print('g\'(x) - claim =', sp.simplify(gp - claim))
print('roots of 12+6x-x^2:', sp.solve(12+6*x-x**2, x))
# series of 1/log(1+x)
print('series 1/log(1+x):', sp.series(1/sp.log(1+x), x, 0, 4))
# (iii) identity
Lam = b*m + 2/m + rho - rho**2*m/6
lhs = Lam**2 - (1+2*b)*(4-(m-rho)**2)
rhs = ((1+b)*m - 2/m - rho)**2 + (rho**2/3)*(1+6*b-b*m**2-rho*m+rho**2*m**2/12)
print('identity residual:', sp.simplify(sp.expand(lhs-rhs)))
# threshold 12 b^2 - 3 b - 2
print('roots 12b^2-3b-2:', [sp.nsimplify(r) for r in sp.solve(12*b**2-3*b-2, b)], [sp.N(r) for r in sp.solve(12*sp.Symbol('B')**2-3*sp.Symbol('B')-2, sp.Symbol('B'))])
# bracket lower bound for m in [2, 2+rho), rho in (0,1): h(rho)=rho^2(1+6b-b(2+rho)^2-rho(2+rho)) >= h(1) = -(2+3b)
h = rho**2*(1+6*b-b*(2+rho)**2-rho*(2+rho))
print('h(1)=', sp.expand(h.subs(rho,1)))
print('h(rho)-h(1) factor:', sp.factor(sp.expand(h - h.subs(rho,1))))
# corner limit: P -> (b m^2+2)/(2 b m sqrt(4-m^2)); minimize
F = (b*m**2+2)/(2*b*m*sp.sqrt(4-m**2))
crit = sp.solve(sp.diff(sp.log(F), m), m)
print('critical m:', crit)
ms = sp.sqrt(2/(1+b))
print('F(m*) - sqrt(1+2b)/(2b) =', sp.simplify(sp.radsimp(F.subs(m, ms) - sp.sqrt(1+2*b)/(2*b))))
Fv = F.subs(m,ms)
print('check numerically at beta=1.5:', sp.N(Fv.subs(b, sp.Rational(3,2))), sp.N(sp.sqrt(4)/3))
