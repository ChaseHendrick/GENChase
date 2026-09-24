import sympy as sp
rho, T, s, psi = sp.symbols('rho T s psi', positive=True)
cs, sn = sp.cos(psi), sp.sin(psi)
a = 1 - 2*rho*cs + rho**2
am = a**(-s)
X1 = T*rho**2 - 1
X2 = T*(am - a)
X3 = a - T*rho**2*am
G1 = X2/X1; G3 = X2/X3
Re = (am - a)*sn*(T*rho**2*a**(-1-s) - 1)/(rho*(a - T*rho**2*am))   # 2 pi Re kappa
Im = G1 + 1 + G3*(2*cs/(T*rho) - a**(-1-s)*(rho**2 - 1 - a))/2      # 2 pi Im kappa
# in region psi in (pi/2, pi): Re0 = -(1+s) sin 2psi > 0 ; P = Im/(2 Re)
P = Im/(2*Re)
# series: order rho^2, T^1
Ps = sp.series(P, rho, 0, 3).removeO()
P0 = sp.simplify(Ps.coeff(rho,0).subs(T,0))
P1 = sp.simplify(sp.series(Ps.coeff(rho,1), T, 0, 1).removeO())
P2full = sp.series(Ps.coeff(rho,2), T, 0, 2).removeO()
P2 = sp.simplify(P2full.coeff(T,0)); P2T = sp.simplify(P2full.coeff(T,1))
print('P0 =', sp.simplify(P0))
print('P1 =', sp.factor(sp.simplify(P1)))
print('P2 =', sp.simplify(P2))
print('P2T=', sp.simplify(P2T))
# psi*: cos 2psi* = -(1+s)/(2+s), psi* in (pi/2, 3pi/4) region R -> psi* = pi - (1/2) acos(-(1+s)/(2+s))
psis = sp.pi - sp.acos(-(1+s)/(2+s))/2
P0pp = sp.diff(P0, psi, 2)
P1p = sp.diff(P1, psi)
vals = {}
for name, e in [('P0',P0),('P1',P1),('P2',P2),('P2T',P2T),('P0pp',P0pp),('P1p',P1p)]:
    vals[name] = sp.simplify(sp.radsimp(sp.simplify(e.subs(psi, psis))))
    print(name,'(psi*) =', vals[name])
c2 = sp.simplify(vals['P2'] - vals['P1p']**2/(2*vals['P0pp']))
print('c2(s) =', sp.factor(sp.radsimp(c2)))
print('c3(s) =', sp.factor(sp.radsimp(vals['P2T'])))
for sv in [sp.Rational(1,4), sp.Rational(1,2), sp.Rational(3,4), 1, sp.Rational(3,2)]:
    print(' s=',sv,' alpha=',2*sv,' c2=', sp.nsimplify(sp.simplify(c2.subs(s,sv))), float(c2.subs(s,sv)), ' c3=', float(vals['P2T'].subs(s,sv)))
