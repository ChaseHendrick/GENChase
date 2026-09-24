"""alpha = 2 (velocity ~ r^-3), arbitrary circulations: P^2 in closed form.  a_i = 1/Gamma_i, s1, s2, s3 their elementary
symmetric functions.  Every self-similar collapse satisfies 16 s1^2 Q^2 R P^4 + 8 s1 Q T P^2 + W^2 = 0, whose discriminant
factors, giving P^2 = -T/(4 s1 Q R) +- |s2 (s1^3 - 2 s3)(a1-a2)(a2-a3)(a3-a1)| / (2 R sqrt(s1 Q)).
Also: the SQG (alpha = 1) shape quartic for arbitrary circulations."""
import random
import sympy as sp, mpmath as mm
out = []
def say(s): print(s); out.append(s)
s1, s2, s3, Y = sp.symbols('s1 s2 s3 Y')
Q = s1**3 - 4*s1*s2 + 8*s3
R = s1**6 - 4*s1**4*s2 + 6*s1**3*s3 + 8*s1*s2*s3 + 9*s3**2
W = s1**7 - 6*s1**5*s2 + 11*s1**4*s3 + 8*s1**3*s2**2 - 28*s1**2*s2*s3 + 24*s1*s3**2 + 4*s2**2*s3
T = (s1**10 - 8*s1**8*s2 + 14*s1**7*s3 + 18*s1**6*s2**2 - 58*s1**5*s2*s3 - 8*s1**4*s2**3 + 57*s1**4*s3**2
     + 20*s1**3*s2**2*s3 - 52*s1**2*s2*s3**2 + 16*s1*s2**3*s3 + 72*s1*s3**3 - 12*s2**2*s3**2)
c2, c1, c0 = 16*s1**2*Q**2*R, 8*s1*Q*T, W**2
say(f"[1] discriminant c1^2 - 4 c2 c0 = {sp.factor(c1**2 - 4*c2*c0)}  (the last factor is minus the discriminant of the cubic with roots a_i)")
# [2] derivation: eliminate the shape (u3 = 1, u1 = t, u2 = -(a1 t + a3)/a2) and compare with the quartic above
a1, a2, a3, t = sp.symbols('a1 a2 a3 t')
u = [t, -(a1*t + a3)/a2, sp.Integer(1)]
quad = sp.expand(a1*a3*t**2 + (a1**2 - a2**2 + a3**2)*t + a1*a3)
Sx = sum(u[i]*(u[(i+2)%3]**2 + u[(i+1)%3]**2)/(u[(i+2)%3]**2 - u[(i+1)%3]**2) for i in range(3))
A2 = (2*(u[0]*u[1] + u[1]*u[2] + u[2]*u[0]) - (u[0]**2 + u[1]**2 + u[2]**2))/16
nP, dP = sp.fraction(sp.together(Sx**2/(64*A2)))
Rr = sp.factor(sp.resultant(sp.expand(nP - Y*dP), quad, t))
f = [g for g, _ in sp.factor_list(Rr)[1] if sp.degree(g, Y) > 0][0]
sub = {s1: a1 + a2 + a3, s2: a1*a2 + a2*a3 + a3*a1, s3: a1*a2*a3}
say(f"[2] resultant factor minus the symmetric-function quartic: {sp.expand(f - sp.expand((c2*Y**2 + c1*Y + c0).subs(sub)))}")
# [3] Biot-Savart: random scalene triangles, circulations from Lemma 2, both closed-form roots
mm.mp.dps = 40; random.seed(4); worst = 0
for k in range(40):
    z = [mm.mpc(0), mm.mpc(1), mm.mpc(mm.mpf(random.uniform(-1, 2)), mm.mpf(random.uniform(0.05, 1.5)))]
    r = [abs(z[1] - z[2]), abs(z[2] - z[0]), abs(z[0] - z[1])]; ff = [x**-4 for x in r]
    G = [r[i]**2/(ff[(i+1)%3] - ff[(i+2)%3]) for i in range(3)]
    zc = sum(g*q for g, q in zip(G, z))/sum(G)
    v = [1j/(2*mm.pi)*sum(G[m]*(z[j] - z[m])*abs(z[j] - z[m])**-4 for m in range(3) if m != j) for j in range(3)]
    kap = v[0]/(z[0] - zc); P2 = (kap.imag/(2*kap.real))**2
    a = [1/g for g in G]; e1, e2, e3 = sum(a), a[0]*a[1] + a[1]*a[2] + a[2]*a[0], a[0]*a[1]*a[2]
    q = e1**3 - 4*e1*e2 + 8*e3; rr = e1**6 - 4*e1**4*e2 + 6*e1**3*e3 + 8*e1*e2*e3 + 9*e3**2
    tt = (e1**10 - 8*e1**8*e2 + 14*e1**7*e3 + 18*e1**6*e2**2 - 58*e1**5*e2*e3 - 8*e1**4*e2**3 + 57*e1**4*e3**2
          + 20*e1**3*e2**2*e3 - 52*e1**2*e2*e3**2 + 16*e1*e2**3*e3 + 72*e1*e3**3 - 12*e2**2*e3**2)
    V = abs(e2*(e1**3 - 2*e3)*(a[0] - a[1])*(a[1] - a[2])*(a[2] - a[0]))
    roots = [-tt/(4*e1*q*rr) + sg*V/(2*rr*mm.sqrt(e1*q)) for sg in (1, -1)]
    worst = max(worst, min(abs(x - P2) for x in roots)/P2)
say(f"[3] 40 random collapsing triangles at alpha = 2: P^2 equals one of the two closed-form roots to {mm.nstr(worst, 3)} relative")
# [4] the equal-circulation case (1, -gamma, 1) is the formula of symmetric_family.py
g = sp.symbols('g', positive=True); aa = [1, -1/g, 1]
subg = {s1: sum(aa), s2: aa[0]*aa[1] + aa[1]*aa[2] + aa[2]*aa[0], s3: aa[0]*aa[1]*aa[2]}
Pg = (1 + g)*(2*g**2 - 2*g + 1)**2/(4*(1 - 2*g)*(1 + 2*g)*(3*g - 1))
say(f"[4] quartic at the equal-circulation closed form: {sp.simplify((c2*Y**2 + c1*Y + c0).subs(subg).subs(Y, Pg))}")
# [5] SQG shape quartic for arbitrary circulations: sides r1 = x, r2 = y, r3 = 1; sum a r^2 = 0, sum a/r = 0
x, y = sp.symbols('x y')
yx = sp.solve(sp.expand((a1/x + a2/y + a3)*x*y), y)[0]
say(f"[5] SQG: y = {yx}; shape quartic {sp.factor(sp.numer(sp.together((a1*x**2 + a2*y**2 + a3).subs(y, yx))))} = 0")
open(__file__.replace('.py', '.out'), 'w').write('\n'.join(out) + '\n')
