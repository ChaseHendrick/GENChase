# Symbolic and numerical verification of the elementary proof of P > sqrt(1+2beta)/(2beta), beta = 1 + alpha/2.
import sympy as sp
rho, m, beta, x = sp.symbols('rho m beta x', positive=True)
Lam = beta*m + 2/m + rho - rho**2*m/6
RHS2 = (1+2*beta)*(4 - (m-rho)**2)
D = (1+beta)*m**2 - 2
Phi_claim = (D/m - rho)**2 + rho**2/3*(1 + 6*beta - beta*m**2 - rho*m + rho**2*m**2/12)
print('Phi identity holds:', sp.simplify(sp.expand(Lam**2 - RHS2 - Phi_claim)) == 0)
# ln lemma derivative identity: (144+12x^2)(1+x) - (12+6x-x^2)^2 = x^3 (24 - x)
print('ln-lemma identity:', sp.expand((144+12*x**2)*(1+x) - (12+6*x-x**2)**2 - x**3*(24-x)) == 0)
g = 12*x/(12+6*x-x**2) - sp.log(1+x)
print("g'(x) - [x^3(24-x)]/((12+6x-x^2)^2 (1+x)) == 0:", sp.simplify(sp.diff(g,x) - x**3*(24-x)/((12+6*x-x**2)**2*(1+x))) == 0)
# corner limit along m* = sqrt(2/(1+beta))
ms = sp.sqrt(2/(1+beta))
lim = (beta*ms + 2/ms)/(4*beta*sp.sqrt(1 - ms**2/4))
print('corner value along m*:', sp.simplify(lim - sp.sqrt(1+2*beta)/(2*beta)) == 0)
# 12 beta^2 - 3 beta - 2 > 0 for beta >= 1 and root
print('root of 12b^2-3b-2:', sp.nsolve(12*beta**2-3*beta-2, beta, 0.6))
