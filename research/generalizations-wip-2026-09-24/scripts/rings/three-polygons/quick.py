import sympy as sp, mpmath as mp
n,r,q,u=sp.symbols('n r q u',positive=True)
N = n**2*r**4*(1+q)**2 + n*(1-q**2)*(1-r**2)*(2-r**2) + (2+r**2)*(1-q)**2
Nraw = n**2*q**2*r**4 + 2*n**2*q*r**4 + n**2*r**4 - n*q**2*r**4 + 3*n*q**2*r**2 - 2*n*q**2 + n*r**4 - 3*n*r**2 + 2*n + q**2*r**2 + 2*q**2 - 2*q*r**2 - 4*q + r**2 + 2
print('grouped N == raw:', sp.expand(N-Nraw)==0)
P = N/(2*n*r*(1-r**2)*((n-1)*q+n+1)*sp.sqrt(4*q-r**2*(1+q)**2))
# n = 2
P2 = sp.simplify(P.subs(q,r**2).subs(n,2))
P2u = sp.simplify(P2.subs(r,sp.sqrt(u)))
print('P2(u) =',sp.factor(P2u))
dn = sp.factor(sp.numer(sp.together(sp.diff(sp.log(P2u),u))))
print('dlogP2/du numerator:',dn)
