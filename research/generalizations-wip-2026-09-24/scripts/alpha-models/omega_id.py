import sympy as sp
u1,u2,u3,F1,F2,F3,lam = sp.symbols('u1 u2 u3 F1 F2 F3 lam', positive=True)
# Gamma_i = lam * u_i/(F_k - F_j), (i,j,k) cyclic
G1 = lam*u1/(F3-F2); G2 = lam*u2/(F1-F3); G3 = lam*u3/(F2-F1)
I3 = (G1+G2)*F3 + G3*(F1*(u1+u3-u2) + F2*(u2+u3-u1))/(2*u3)   # 2 pi Im kappa from side 12
I1 = (G2+G3)*F1 + G1*(F2*(u2+u1-u3) + F3*(u3+u1-u2))/(2*u1)
I2 = (G3+G1)*F2 + G2*(F3*(u3+u2-u1) + F1*(u1+u2-u3))/(2*u2)
half = sp.Rational(1,2)*(G1*(F2+F3) + G2*(F1+F3) + G3*(F1+F2))
print('I3 == (1/2) sum Gamma_i (F_j+F_k):', sp.simplify(I3-half)==0, sp.simplify(I1-half)==0, sp.simplify(I2-half)==0)
# L and H conditions for Gamma_i = lam u_i/(F_k-F_j): sum_i u_i/Gamma_i = 0? and sum_i u_i F_i / Gamma_i = 0 ?
print('sum u_i/Gamma_i =', sp.simplify(u1/G1 + u2/G2 + u3/G3), '  sum v_i/Gamma_i =', sp.simplify(u1*F1/G1 + u2*F2/G2 + u3*F3/G3))
