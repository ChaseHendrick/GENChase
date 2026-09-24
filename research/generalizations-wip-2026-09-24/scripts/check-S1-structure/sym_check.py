"""Independent symbolic check of S1-structure (my own derivation, not the explorer's scripts).

Steps
 (A) cross-product split: for x_i, x_j in the plane n.x = d (frame n = e3 WLOG by rotation
     covariance), x_j x x_i = d (x_j - x_i) x n + (x_j - x_i) x (x_i - c), c = d n.
 (N) normal component: [(xi_j - xi_i) x xi_i].n = -[n x (xi_i - xi_j)].xi_i  (triple product).
 (P) planar self-similarity: Gamma = (1, mu, -mu/(1+mu)) (M = 0, general up to scale/perm),
     z1 = 0, z2 = 1, z3 = x + i y with planar L = 0. Show u_i/(z_i - z_c) equal for i = 1,2,3
     modulo the L = 0 relation.
 (B) frame algebra: u = alpha w + beta n x w, nu = -u.(x - c), |x - c| = rho, p = c + rho a:
     d u + nu n == s w + Omega x w, s = d alpha, Omega = d beta n + rho (beta a - alpha b').
 (C) Omega x n == -rho (alpha a + beta b'), (Omega x n).p == -rho^2 alpha, Omega.p == beta,
     azimuthal rate of n about p == beta.
"""
import sympy as sp

def cross(u, v):
    return sp.Matrix([u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]])

ok = True
# ---- (A)
d = sp.symbols('d', real=True)
u1, v1, u2, v2 = sp.symbols('u1 v1 u2 v2', real=True)
n = sp.Matrix([0, 0, 1]); c = d*n
xi = sp.Matrix([u1, v1, d]); xj = sp.Matrix([u2, v2, d])
lhs = cross(xj, xi)
rhs = d*cross(xj - xi, n) + cross(xj - xi, xi - c)
rA = sp.simplify(lhs - rhs)
print('(A) split residual:', list(rA)); ok &= all(e == 0 for e in rA)
# first term equals d * [n x (x_i - x_j)]  (planar Biot-Savart kernel with orientation n)
rA2 = sp.simplify(d*cross(xj - xi, n) - d*cross(n, xi - xj))
print('(A2) d(x_j-x_i)xn == d n x (x_i-x_j):', list(rA2)); ok &= all(e == 0 for e in rA2)
# second term normal to plane
rA3 = sp.simplify(cross(xj - xi, xi - c))
print('(A3) second term =', list(rA3), '(only z component nonzero)')
ok &= (rA3[0] == 0 and rA3[1] == 0)

# ---- (N)
xi_i = sp.Matrix([u1, v1, 0]); xi_j = sp.Matrix([u2, v2, 0])
rN = sp.simplify(cross(xi_j - xi_i, xi_i).dot(n) + cross(n, xi_i - xi_j).dot(xi_i))
print('(N) residual:', rN); ok &= (rN == 0)

# ---- (P) planar self-similarity from M = 0, L = 0
mu, x, y = sp.symbols('mu x y', real=True)
G = [sp.Integer(1), mu, -mu/(1+mu)]
M = sp.simplify(G[0]*G[1] + G[0]*G[2] + G[1]*G[2])
print('(P) M =', M); ok &= (M == 0)
Z = [sp.Integer(0), sp.Integer(1), x + sp.I*y]
Zb = [sp.Integer(0), sp.Integer(1), x - sp.I*y]
S = sum(G)
zc = sum(g*z for g, z in zip(G, Z))/S
zcb = sum(g*z for g, z in zip(G, Zb))/S
def ubar(i, Zs):
    return sum(G[k]/(Zs[i]-Zs[k]) for k in range(3) if k != i)/(2*sp.pi*sp.I)
# u_i = conj(ubar_i): conj of (1/(2 pi i)) sum G_k/(z_i - z_k) = -(1/(2 pi i)) sum G_k/(zb_i - zb_k)
U = [-sum(G[k]/(Zb[i]-Zb[k]) for k in range(3) if k != i)/(2*sp.pi*sp.I) for i in range(3)]
W = [Z[i] - zc for i in range(3)]
Lpl = G[0]*G[1]*1 + G[0]*G[2]*(x**2+y**2) + G[1]*G[2]*((x-1)**2 + y**2)
Lnum = sp.numer(sp.together(Lpl))
Lpoly = sp.Poly(sp.expand(Lnum), y)
print('(P) L numerator:', sp.factor(Lnum))
for (i, j) in [(0, 1), (0, 2), (1, 2)]:
    expr = sp.together(U[i]*W[j] - U[j]*W[i])
    num = sp.expand(sp.numer(expr))
    re_, im_ = sp.expand(sp.re(num)), sp.expand(sp.im(num))
    rems = []
    for part in (re_, im_):
        q, r = sp.div(sp.Poly(part, y), Lpoly)
        rems.append(sp.simplify(r.as_expr()))
    print(f'(P) u{i+1} w{j+1} - u{j+1} w{i+1} numerator mod L:', rems)
    ok &= all(r == 0 for r in rems)

# ---- (B) frame algebra
alpha, beta, rho, th = sp.symbols('alpha beta rho theta', real=True)
a = sp.Matrix([1, 0, 0]); bp = cross(n, a)
dd = sp.sqrt(1 - rho**2)  # d>0 branch; also test d symbol separately below
for dval, tag in [(d, 'free d, rho independent'), ]:
    cc = dval*n
    p = cc + rho*a
    X = cc + rho*sp.Matrix([sp.cos(th), sp.sin(th), 0])
    w = X - p
    u = alpha*w + beta*cross(n, w)
    nu = -u.dot(X - cc)
    vel = dval*u + nu*n
    s = dval*alpha
    Om = dval*beta*n + rho*(beta*a - alpha*bp)
    rB = sp.simplify(sp.expand_trig(vel - (s*w + cross(Om, w))))
    print('(B) residual (%s):' % tag, list(rB)); ok &= all(e == 0 for e in rB)
    # |w|^2 = -2 rho w.a on the circle
    rW = sp.simplify(w.dot(w) + 2*rho*w.dot(a))
    print('(B) |w|^2 + 2 rho w.a =', rW); ok &= (rW == 0)

# ---- (C) with d^2 + rho^2 = 1 (p on unit sphere)
d2 = sp.symbols('d2', real=True)
rho_s = sp.sqrt(1 - d2**2)
p = d2*n + rho_s*a
Om = d2*beta*n + rho_s*(beta*a - alpha*bp)
ndot = cross(Om, n)
rC1 = sp.simplify(ndot - (-rho_s*(alpha*a + beta*bp)))
print('(C) Omega x n + rho(alpha a + beta b\') =', list(rC1)); ok &= all(e == 0 for e in rC1)
rC2 = sp.simplify(ndot.dot(p) + rho_s**2*alpha)
print('(C) d(n.p)/dt + rho^2 alpha =', rC2); ok &= (rC2 == 0)
rC3 = sp.simplify(Om.dot(p) - beta)
print('(C) Omega.p - beta =', rC3); ok &= (rC3 == 0)
# azimuth of n about p: e_perp = unit(n - (n.p) p), e_az = p x e_perp; rate = ndot.e_az / |n - (n.p)p|
nperp = n - n.dot(p)*p
nperp_norm = sp.sqrt(sp.simplify(nperp.dot(nperp)))
e_perp = nperp/nperp_norm
e_az = cross(p, e_perp)
rate = sp.simplify(ndot.dot(e_az)/nperp_norm)
print('(C) azimuthal rate of n about p =', rate, ' (|n_perp| =', sp.simplify(nperp_norm), ')')
# rho_s>0 required; check
rC4 = sp.simplify(rate - beta)
print('(C) rate - beta =', rC4)
ok &= (sp.simplify(rC4.subs(d2, sp.Rational(3, 7))) == 0 and sp.simplify(rC4.subs(d2, -sp.Rational(5, 9))) == 0)
# p fixed: sum Gamma_i (s w_i + Om x w_i) = 0 because sum Gamma_i w_i = 0 (linear) -- trivial
print('ALL SYMBOLIC CHECKS PASS:', ok)
