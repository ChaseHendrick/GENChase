import sympy as sp
u1,u2,u3,v1,v2,v3,K = sp.symbols('u1 u2 u3 v1 v2 v3 K', positive=True)
X1 = u2*v3 - u3*v2; X2 = u3*v1 - u1*v3; X3 = u1*v2 - u2*v1
G1, G2, G3 = K/X1, K/X2, K/X3
F1, F2, F3 = v1/u1, v2/u2, v3/u3
I3 = (G1+G2)*F3 + G3*(F1*(u1+u3-u2) + F2*(u2+u3-u1))/(2*u3)
num, den = sp.fraction(sp.together(sp.simplify(I3/K)))
print('den', sp.factor(den))
N = sp.expand(num)
a,b,c,d = sp.symbols('a b c d')
U=[u1,u2,u3]; V=[v1,v2,v3]; X=[X1,X2,X3]
ans = 0
for k in range(3):
    i,j = [m for m in range(3) if m!=k]
    ans += U[i]*U[j]*X[k]**2*(a*V[k] + b*(V[i]+V[j]))
ans += c*(u1*u2*u3)*(X1*X2*X3)/ (1) *0
eqs = sp.Poly(sp.expand(N - ans), u1,u2,u3,v1,v2,v3).coeffs()
print(sp.solve(eqs, [a,b]))
