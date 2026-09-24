# Exact checks: the elementary-proof identity (G2a) and the dipole-limit minimum (A6 -> A4 constant).
import sympy as sp
l, p, b, t = sp.symbols('lambda psi beta t', positive=True)
s, c = sp.sin(l), sp.cos(l)
print('G2(a): (1+sin^2)^2 - cos^2 (1+3 sin^2) - 4 sin^4 =', sp.simplify(sp.expand((1+s**2)**2 - c**2*(1+3*s**2) - 4*s**4)))
f = ((1+2*b)/t + t)/(4*b)   # P_c(psi) with t = tan(psi)
print('A6: f(tan psi) - P_c(psi) =', sp.simplify(f.subs(t, sp.tan(p)) - (1+2*b*sp.cos(p)**2)/(2*b*sp.sin(2*p))))
print('A6: min at t = sqrt(1+2 beta):', sp.simplify(f.subs(t, sp.sqrt(1+2*b))), ' (AM-GM; beta = 1 + alpha/2 gives sqrt(3+alpha)/(2+alpha))')
