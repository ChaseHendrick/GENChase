import sympy as sp
u1,u2,u3,F1,F2,F3,K = sp.symbols('u1 u2 u3 F1 F2 F3 K', positive=True)
v1,v2,v3 = F1*u1, F2*u2, F3*u3
X1 = u2*v3 - u3*v2; X2 = u3*v1 - u1*v3; X3 = u1*v2 - u2*v1
G1, G2, G3 = K/X1, K/X2, K/X3
I3 = (G1+G2)*F3 + G3*(F1*(u1+u3-u2) + F2*(u2+u3-u1))/(2*u3)
e = sp.factor(sp.simplify(I3/K))
print(e)
num, den = sp.fraction(sp.together(e))
N = sp.expand(num)
print('num =', N)
print('collect in F:', sp.collect(N, [F1*F2, F1*F3, F2*F3, F1**2, F2**2, F3**2]))
# try: num = sum_{i<j} (F_i - F_j)^2 * something + ...
D = sp.symbols('D12 D13 D23')
