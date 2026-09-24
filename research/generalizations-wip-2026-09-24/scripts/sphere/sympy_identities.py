"""Exact (SymPy) check of the linear-algebra steps of the proof, in the frame (e, e_perp, p).
Given: points on the small circle through p with oriented pole n = d p + rho e, d^2 + rho^2 = 1;
planar self-similar in-plane velocity u = alpha w + beta n x w (w = x - p);
sphere velocity xdot = d u + nu n with nu = -u.(x - c), c = d n  (identity (N) of the proof).
Claims:  xdot = s w + Om x w  with s = d alpha, Om = d beta n + rho (beta a - alpha b'),
         a = (p - c)/rho, b' = n x a;   ndot = Om x n; ndot.p = -rho^2 alpha; ndot.e_perp = rho beta;
         xdot.x = 0 (tangency); Om.p = beta.
Also the planar identity (N): for any points xi_j in the plane (origin c),
   u_i . xi_i = -(1/2pi) sum Gamma_j [(xi_j - xi_i) x xi_i].n / |xi_i - xi_j|^2.
"""
import sympy as sp

d, sig, al, be = sp.symbols('d sigma alpha beta', real=True)
rho = sp.sqrt(1 - d**2)
e = sp.Matrix([1, 0, 0]); ep = sp.Matrix([0, 1, 0]); p = sp.Matrix([0, 0, 1])
n = d*p + rho*e
c = d*n
a = (p - c)/rho
bp = n.cross(a)
x = c + rho*(sp.cos(sig)*a + sp.sin(sig)*bp)
w = x - p
u = al*w + be*n.cross(w)
nu = -(u.dot(x - c))
xdot = d*u + nu*n
s = d*al
Om = d*be*n + rho*(be*a - al*bp)
simp = lambda M: sp.simplify(sp.expand(M))
print('|x|^2 - 1          :', simp(x.dot(x) - 1))
print('xdot - (s w + Om x w):', [simp(t) for t in (xdot - (s*w + Om.cross(w)))])
print('xdot . x            :', simp(xdot.dot(x)))
ndot = Om.cross(n)
print('ndot.p + rho^2 alpha:', simp(ndot.dot(p) + rho**2*al))
print('ndot.eperp - rho beta:', simp(ndot.dot(ep) - rho*be))
print('Om.p - beta         :', simp(Om.dot(p) - be))
print('bp + eperp          :', [simp(t) for t in (bp + ep)])

# planar identity (N) with complex numbers
x1, y1, x2, y2, x3, y3, G1, G2, G3 = sp.symbols('x1 y1 x2 y2 x3 y3 G1 G2 G3', real=True)
Z = [x1 + sp.I*y1, x2 + sp.I*y2, x3 + sp.I*y3]
G = [G1, G2, G3]
i = 0
ubar = sum(G[j]/(Z[i]-Z[j]) for j in range(3) if j != i)/(2*sp.pi*sp.I)
lhs = sp.re(sp.conjugate(ubar)*Z[i]) if False else sp.re(ubar*Z[i])   # u.xi = Re(conj(u) xi) = Re(ubar xi)
def cr(zj, zi):
    v = zj - zi
    return sp.re(v)*sp.im(zi) - sp.im(v)*sp.re(zi)
rhs = -sum(G[j]*cr(Z[j], Z[i])/sp.Abs(Z[i]-Z[j])**2 for j in range(3) if j != i)/(2*sp.pi)
diff = sp.simplify(sp.expand_complex(lhs - rhs))
print('identity (N)        :', diff)
