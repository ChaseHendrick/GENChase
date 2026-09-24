import sympy as sp
u1,u2,u3 = sp.symbols('u1 u2 u3', positive=True)
# Euler (beta=1): S = sum_cyc u_i (u_k+u_j)/(u_k-u_j), (i,j,k) cyclic
S = u1*(u3+u2)/(u3-u2) + u2*(u1+u3)/(u1-u3) + u3*(u2+u1)/(u2-u1)
D = (u3-u2)*(u1-u3)*(u2-u1)
N = sp.factor(sp.simplify(S*D))
print('S*D =', N, '   expanded:', sp.expand(N))
E = 2*(u1*u2+u2*u3+u3*u1) - (u1**2+u2**2+u3**2)   # = 16 A^2
# P = |S|/(8A) ; P^2 = S^2/(64 A^2) = S^2/(4E). P^2 - 3/4 = (S^2 - 3E)/(4E)
Q = sp.expand(N**2 - 3*E*D**2)
print('N^2 - 3 E D^2 =', sp.factor(Q))
