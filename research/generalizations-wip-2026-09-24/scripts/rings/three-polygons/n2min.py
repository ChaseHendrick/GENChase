import sympy as sp, mpmath as mp
mp.mp.dps=60
u=sp.symbols('u')
p=9*u**5+7*u**4+65*u**3+3*u**2+30*u-18
print('irreducible over Q:', sp.Poly(p,u).is_irreducible, ' galois-ish: degree 5')
rts=sp.Poly(p,u).real_roots()
print('real roots:',[sp.N(x,30) for x in rts])
us=[x for x in rts if 0<x<1][0]
P2=lambda uu:(2*uu**4+15*uu**3+2*uu**2-9*uu+6)/(4*uu*(1-uu)**mp.mpf(1.5)*(uu+3)**mp.mpf(1.5))
uu=mp.findroot(lambda x: 9*x**5+7*x**4+65*x**3+3*x**2+30*x-18, 0.4)
print('u* =',mp.nstr(uu,50)); print('r* =',mp.nstr(mp.sqrt(uu),50))
print('P2min =',mp.nstr(P2(uu),50))
print('cos beta* =(1+u)/2 =',mp.nstr((1+uu)/2,40),' beta* =',mp.nstr(mp.acos((1+uu)/2),40),' phi2*=beta/2=',mp.nstr(mp.acos((1+uu)/2)/2,40))
print('Table1 u=4/9: P =',mp.nstr(P2(mp.mpf(4)/9),30),' closed', mp.nstr(mp.mpf(12433)/(1240*mp.sqrt(155)),30))
print('sqrt3/2=',mp.nstr(mp.sqrt(3)/2,30))
# minimal polynomial of P2min
