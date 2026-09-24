# Exact identities behind the closed form (sympy). Notation: u_i = r_i^2 (side opposite vertex i),
# F_i = u_i^(-beta) = r_i^(-alpha-2), beta = 1 + alpha/2; circulations Gamma_i = lam u_i/(F_k - F_j), (i,j,k) cyclic.
import sympy as sp
u1,u2,u3,F1,F2,F3,lam,A2 = sp.symbols('u1 u2 u3 F1 F2 F3 lam A2', positive=True)
G1 = lam*u1/(F3-F2); G2 = lam*u2/(F1-F3); G3 = lam*u3/(F2-F1)
v1, v2, v3 = u1*F1, u2*F2, u3*F3          # v_i = r_i^(-alpha)
print('[1] L = G1G2 u3 + G1G3 u2 + G2G3 u1 = 0 :', sp.simplify(G1*G2*u3 + G1*G3*u2 + G2*G3*u1) == 0)
print('[2] H = G1G2 v3 + G1G3 v2 + G2G3 v1 = 0 :', sp.simplify(G1*G2*v3 + G1*G3*v2 + G2*G3*v1) == 0)
# d u_i/dt = (Gamma_i A2/pi)(F_j - F_k) (i,j,k cyclic) ; self-similar iff (d u_i/dt)/u_i common
r1 = G1*A2*(F2-F3)/u1; r2 = G2*A2*(F3-F1)/u2; r3 = G3*A2*(F1-F2)/u3
print('[3] (du_i/dt)/u_i equal for all i, value -lam A2 (so 2 pi Re kappa = -lam A2):', sp.simplify(r1-r2)==0, sp.simplify(r2-r3)==0, sp.simplify(r3 + lam*A2)==0)
# 2 pi Im kappa from each side
I3 = (G1+G2)*F3 + G3*(F1*(u1+u3-u2) + F2*(u2+u3-u1))/(2*u3)
I1 = (G2+G3)*F1 + G1*(F2*(u2+u1-u3) + F3*(u3+u1-u2))/(2*u1)
I2 = (G3+G1)*F2 + G2*(F3*(u3+u2-u1) + F1*(u1+u2-u3))/(2*u2)
half = sp.Rational(1,2)*(G1*(F2+F3) + G2*(F1+F3) + G3*(F1+F2))
print('[4] 2 pi Im kappa (all three sides) = (1/2) sum_{j<k} (G_j+G_k) F_jk :', all(sp.simplify(I - half) == 0 for I in (I1,I2,I3)))
# coth form: (1/2) sum_i G_i (F_j+F_k) = -(lam/2) S with S = sum_cyc u_i (w_k+w_j)/(w_k-w_j), w = u^beta = 1/F
w1, w2, w3 = 1/F1, 1/F2, 1/F3
S = u1*(w3+w2)/(w3-w2) + u2*(w1+w3)/(w1-w3) + u3*(w2+w1)/(w2-w1)
print('[5] 2 pi Im kappa = -(lam/2) S :', sp.simplify(half + lam*S/2) == 0)
# hence Im/Re = S/(2 A2), P = |S|/(4|A2|) = |S|/(8 Area)
# coth identity for arguments summing to zero
x, y = sp.symbols('x y', real=True)
c1, c2, c3 = sp.coth(x), sp.coth(y), sp.coth(-x-y)
print('[6] coth x coth y + coth y coth z + coth z coth x = -1 (x+y+z=0):', sp.simplify((c1*c2 + c2*c3 + c3*c1).rewrite(sp.exp)) == -1)
