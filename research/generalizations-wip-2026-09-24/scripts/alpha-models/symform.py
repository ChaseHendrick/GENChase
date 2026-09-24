import sympy as sp
u1,u2,u3,v1,v2,v3,K = sp.symbols('u1 u2 u3 v1 v2 v3 K', positive=True)
X1 = u2*v3 - u3*v2; X2 = u3*v1 - u1*v3; X3 = u1*v2 - u2*v1
G1, G2, G3 = K/X1, K/X2, K/X3
F1, F2, F3 = v1/u1, v2/u2, v3/u3
# 2 pi Im kappa computed from side 12 (opposite vertex 3), and cyclic versions
def imk(Ga,Gb,Gc,Fa,Fb,Fc,ua,ub,uc):
    # side between vertices a,b (length^2 uc), third vertex c with circulation Gc
    return (Ga+Gb)*Fc + Gc*(Fa*(ua+uc-ub) + Fb*(ub+uc-ua))/(2*uc)
I3 = imk(G1,G2,G3,F1,F2,F3,u1,u2,u3)
I1 = imk(G2,G3,G1,F2,F3,F1,u2,u3,u1)
I2 = imk(G3,G1,G2,F3,F1,F2,u3,u1,u2)
print('I3-I1 =', sp.simplify(I3-I1)); print('I3-I2 =', sp.simplify(I3-I2))
e = sp.factor(sp.simplify(I3/K))
print('2 pi Im kappa / K =', e)
num, den = sp.fraction(sp.together(sp.simplify(I3/K)))
print('numerator expanded:', sp.expand(num))
print('denominator:', sp.factor(den))
# Euler limit: v_i = 1 - eps ln u_i ; K scales with eps. Take v->(1,1,1) directly: X=(u2-u3,u3-u1,u1-u2)
e0 = sp.factor(sp.simplify(I3.subs({v1:1,v2:1,v3:1})/K))
print('Euler 2 pi Im kappa/K =', e0)
