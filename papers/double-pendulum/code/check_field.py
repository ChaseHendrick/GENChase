"""Symbolic check that the vector field strings in dp.h are Hamilton's equations of the planar double pendulum
(point masses m1 = m2 = 1, rods l1 = l2 = 1, gravity g), derived here from the Lagrangian, and that the section
lift in dp.h solves H = E with dt1/dt > 0. Exact (sympy), plus a random-point numerical comparison."""
import re, random, sympy as sp

src = open(__file__.replace('check_field.py', 'dp.h')).read()
def field(name):
    m = re.search(name + r' =\s*((?:\s*"[^"]*"\s*)+);', src)
    s = ''.join(re.findall(r'"([^"]*)"', m.group(1)))
    fun = s.split('fun:')[1].rstrip(';')
    return [e for e in fun.split(',')]

t1, t2, p1, p2, g, E = sp.symbols('t1 t2 p1 p2 g E', real=True)
w1, w2 = sp.symbols('w1 w2', real=True)
# Lagrangian of the double pendulum with m1 = m2 = l1 = l2 = 1
m1 = m2 = l1 = l2 = 1
T = sp.Rational(1, 2) * (m1 + m2) * l1**2 * w1**2 + sp.Rational(1, 2) * m2 * l2**2 * w2**2 + m2 * l1 * l2 * w1 * w2 * sp.cos(t1 - t2)
V = -(m1 + m2) * g * l1 * sp.cos(t1) - m2 * g * l2 * sp.cos(t2)
L = T - V
P1, P2 = sp.diff(L, w1), sp.diff(L, w2)
sol = sp.solve([sp.Eq(P1, p1), sp.Eq(P2, p2)], [w1, w2], dict=True)[0]
H = sp.simplify((P1 * w1 + P2 * w2 - L).subs(sol))
ham = [sp.diff(H, p1), sp.diff(H, p2), -sp.diff(H, t1), -sp.diff(H, t2)]

def parse(e):
    return sp.sympify(e.replace('^', '**'), locals={'t1': t1, 't2': t2, 'p1': p1, 'p2': p2, 'g': g})

ok = True
capd = [parse(e) for e in field('DP_FIELD')]
a1, b1, a2, b2 = sp.symbols('a1 b1 a2 b2', real=True)
def exact_zero(expr):
    """expr is a rational function of cos/sin of t1, t2: expand, write cos ti = ai, sin ti = bi, and reduce the
    numerator modulo ai^2 + bi^2 - 1 (a Groebner basis, the two generators have coprime leading terms)."""
    e = sp.together(sp.expand_trig(sp.expand(expr)))
    num = sp.numer(e)
    num = sp.expand(num.subs({sp.cos(t1): a1, sp.sin(t1): b1, sp.cos(t2): a2, sp.sin(t2): b2}))
    assert not num.has(t1) and not num.has(t2), num
    _, r = sp.reduced(num, [a1**2 + b1**2 - 1, a2**2 + b2**2 - 1], a1, a2, b1, b2, p1, p2, g)
    return sp.expand(r) == 0
for i, (a, b) in enumerate(zip(capd, ham)):
    d = exact_zero(a - b)
    print(f'coupled component {i}: CAPD string minus Hamilton equation is exactly 0: {d}')
    ok = ok and d
    random.seed(i)
    for _ in range(200):
        v = {t1: random.uniform(-7, 7), t2: random.uniform(-7, 7), p1: random.uniform(-4, 4), p2: random.uniform(-4, 4), g: random.uniform(0, 2)}
        if abs(float((a - b).subs(v))) > 1e-12:
            ok = False
print('coupled field agrees with Hamilton\'s equations at 800 random points:', ok)

# uncoupled control: H0 = p1^2/4 + p2^2/2 - 2 g cos t1 - g cos t2
H0 = p1**2 / 4 + p2**2 / 2 - 2 * g * sp.cos(t1) - g * sp.cos(t2)
ham0 = [sp.diff(H0, p1), sp.diff(H0, p2), -sp.diff(H0, t1), -sp.diff(H0, t2)]
unc = [parse(e) for e in field('UNCOUPLED_FIELD')]
d0 = [sp.simplify(a - b) for a, b in zip(unc, ham0)]
print('uncoupled field minus Hamilton\'s equations of H0:', d0)
ok = ok and all(x == 0 for x in d0)

# the lift: p1 = c p2 + sqrt(D (2(E + 2g + g cos t2) - p2^2)) at t1 = 0 solves H = E, and dt1/dt > 0
c, D = sp.cos(t2), 1 + sp.sin(t2)**2
p1l = c * p2 + sp.sqrt(D * (2 * (E + 2 * g + g * c) - p2**2))
res = sp.simplify(sp.expand(H.subs({t1: 0, p1: p1l}) - E))
print('H(0, t2, p1_lift, p2) - E simplifies to', res)
dt1 = sp.simplify(ham[0].subs({t1: 0, p1: p1l}))
print('dt1/dt on the lift =', dt1, ' (positive where the square root is)')
random.seed(7); bad = 0
for _ in range(200):
    v = {t2: random.uniform(-4, 4), p2: random.uniform(-1, 1), g: 1, E: random.uniform(0, 0.9)}
    if abs(float((H.subs({t1: 0, p1: p1l}) - E).subs(v))) > 1e-12: bad += 1
    a_ = float(sp.diff(p1l, t2).subs(v)); b_ = float(sp.diff(p1l, p2).subs(v))
    # compare with lift_dp1 formulas in dp.h
    tt, pp, gg, EE = float(v[t2]), float(v[p2]), 1.0, float(v[E])
    import math
    cc, ss = math.cos(tt), math.sin(tt); DD = 1 + ss * ss; w = 2 * (EE + 2 * gg + gg * cc) - pp * pp; r = math.sqrt(DD * w)
    dt = -ss * pp + (2 * ss * cc * w + DD * (-2 * gg * ss)) / (2 * r); dp = cc + DD * (-2 * pp) / (2 * r)
    if abs(dt - a_) > 1e-10 or abs(dp - b_) > 1e-10: bad += 1
print('lift and lift_dp1 checked at 200 random points, mismatches:', bad)
# exact: the formulas of lift_dp1 (coupled) against sympy's derivatives of the lift
sq, cc_, ss_ = sp.sqrt(D * (2 * (E + 2 * g + g * c) - p2**2)), sp.cos(t2), sp.sin(t2)
w_ = 2 * (E + 2 * g + g * cc_) - p2**2
f_t2 = -ss_ * p2 + (2 * ss_ * cc_ * w_ + D * (-2 * g * ss_)) / (2 * sq)
f_p2 = cc_ + D * (-2 * p2) / (2 * sq)
e1 = sp.simplify(sp.diff(p1l, t2) - f_t2); e2 = sp.simplify(sp.diff(p1l, p2) - f_p2)
print('lift_dp1 formulas minus exact derivatives:', e1, e2)
bad += (e1 != 0) + (e2 != 0)
# uncoupled lift: p1 = 2 sqrt(E + 2g + g cos t2 - p2^2/2) solves H0 = E at t1 = 0, and its derivatives
p1u = 2 * sp.sqrt(E + 2 * g + g * sp.cos(t2) - p2**2 / 2)
qu = E + 2 * g + g * sp.cos(t2) - p2**2 / 2
e3 = sp.simplify(H0.subs({t1: 0, p1: p1u}) - E); e4 = sp.simplify(sp.diff(p1u, t2) - (-g * sp.sin(t2) / sp.sqrt(qu))); e5 = sp.simplify(sp.diff(p1u, p2) - (-p2 / sp.sqrt(qu)))
print('uncoupled lift residuals:', e3, e4, e5)
bad += (e3 != 0) + (e4 != 0) + (e5 != 0)
ok = ok and bad == 0 and res == 0
print('RESULT:', 'OK' if ok else 'MISMATCH')
