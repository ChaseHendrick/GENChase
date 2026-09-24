"""Sympy: the calculus steps from the rate laws to the loxodrome, stereographic spiral,
lifetime, and the 'extra rotation' under two possible matchings of the planar comparison."""
import sympy as sp
b, b0, A, B, R, t = sp.symbols('beta beta0 A B R t', positive=True)   # A = |ahat|, B = bhat (>0 WLOG)
# rate laws: d cos(beta)/dt = A/R^2, dpsi/dt = B/(R^2 sin^2 beta)
betadot = -(A/R**2)/sp.sin(b)
psidot = B/(R**2*sp.sin(b)**2)
dpsidb = sp.simplify(psidot/betadot)
print('dpsi/dbeta =', dpsidb)
psi = -(B/A)*sp.log(sp.tan(b/2))
print('check psi = -(B/A) ln tan(beta/2):', sp.simplify(sp.diff(psi, b) - dpsidb))
print('tan(angle to meridian) = sin(beta) dpsi/dbeta =', sp.simplify(sp.sin(b)*sp.Abs(dpsidb)), ' (= 2 P0 with P0 = B/(2A))')
# stereographic radius r = 2 R tan(beta/2): d ln r / d psi
r = 2*R*sp.tan(b/2)
print('d ln r / d psi =', sp.simplify(sp.diff(sp.log(r), b)/dpsidb), ' (planar: -1/(2P) = -A/B)')
# lifetime and time to collapse from beta
print('time beta -> 0:', sp.simplify(sp.integrate(-1/betadot, (b, 0, b0))), '; lifetime:', sp.simplify(sp.integrate(-1/betadot, (b, 0, sp.pi))))
# extra rotation, matching planar start at equal chord circumradius rho0 = R sin(beta0)
sphere_rot = psi.subs(b, b) - psi.subs(b, b0)            # from beta0 down to beta
plan_rot_rho = (B/A)*sp.log(sp.sin(b0)/sp.sin(b))        # planar 2P ln(r0/r)
ex1 = sp.limit(sp.simplify(sphere_rot - plan_rot_rho), b, 0, '+')
print('extra, equal initial chord radius   :', sp.simplify(ex1), ' vs claimed', '2P0 ln(2/(1+cos b0)) =', sp.simplify(ex1 - (B/A)*sp.log(2/(1+sp.cos(b0)))))
# matching by equal time-to-collapse: planar r^2 = 2A (tc - t), sphere 1 - cos beta = A (tc - t)/R^2
plan_rot_time = (B/(2*A))*sp.log((1-sp.cos(b0))/(1-sp.cos(b)))
ex2 = sp.limit(sp.simplify(sphere_rot - plan_rot_time), b, 0, '+')
print('extra, equal time to collapse       :', sp.simplify(ex2), '; ratio to claim:', sp.simplify(ex2/((B/A)*sp.log(2/(1+sp.cos(b0))))))

for v in [0.3, 1.0, 2.0, 3.0]:
    print('beta0=%g: equal-radius extra minus claim = %s ; equal-time extra / claim = %s' % (v, sp.N((ex1 - (B/A)*sp.log(2/(1+sp.cos(b0)))).subs({b0: v, A: 1, B: 1})), sp.N((ex2/((B/A)*sp.log(2/(1+sp.cos(b0))))).subs({b0: v, A: 1, B: 1}))))
