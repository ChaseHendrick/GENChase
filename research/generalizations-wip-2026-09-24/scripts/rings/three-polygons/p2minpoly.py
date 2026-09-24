import sympy as sp
u,X=sp.symbols('u X')
num=2*u**4+15*u**3+2*u**2-9*u+6
den2=16*u**2*((1-u)*(3+u))**3
p5=9*u**5+7*u**4+65*u**3+3*u**2+30*u-18
# X = P^2 = num^2/den2  ->  resultant in u of (X*den2 - num^2, p5)
R=sp.resultant(sp.expand(X*den2-num**2),p5,u)
f=sp.factor_list(sp.Poly(R,X))
print(f)
import mpmath as mp
mp.mp.dps=50
ust=mp.findroot(lambda x:9*x**5+7*x**4+65*x**3+3*x**2+30*x-18,0.416)
P2=(2*ust**4+15*ust**3+2*ust**2-9*ust+6)/(4*ust*((1-ust)*(3+ust))**mp.mpf(1.5))
for fac,m in f[1]:
    val=sp.Poly(fac,X).eval(sp.Float(str(P2**2),50))
    print(sp.Poly(fac,X).degree(), sp.N(val,5))
    if abs(val)<1e-30: print('minimal polynomial of P_min(2)^2:', sp.Poly(fac,X).as_expr())
