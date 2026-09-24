"""mu = 1: rotation of u = z2 - z1 as a one-dimensional integral in x = |u|^2/(3|L|).
dphi/dx = (4 Lam x^2 + (x - s)(2x - s)) / (2 x sqrt(Q4)),  Q4 = [4 Lam x^2 - (x-s)^2][(2x-s)^2 - 4 Lam x^2]
Derived from s1 + s2 = 2X - 3L, s1 s2 = Lam X^2 (conservation of L and H for Gamma = (1,1,-1/2))."""
from core import *
mp.mp.dps = 40

def C_mu1(beta, s):
    w = mp.mpf(1)/2 + mp.sqrt(3)/2*mp.expj(beta)
    Lam = abs(w)**2*abs(1-w)**2
    P = (2*Lam+1)/mp.sqrt((4*Lam-1)*(4-4*Lam))
    rL = mp.sqrt(Lam)
    roots = [-s/(2*rL-1), s/(2*rL+1), s/(2-2*rL), s/(2+2*rL)]
    xmin = max(r for r in roots)
    f = lambda x: (4*Lam*x**2 + (x-s)*(2*x-s))/(2*x*mp.sqrt(((2*rL-1)*x+s)*((2*rL+1)*x-s)*((2-2*rL)*x-s)*((2+2*rL)*x-s)))
    # integral from xmin to infinity of f - P/x, plus -P ln xmin ... C = lim 2 int_{xmin}^X f - 2P ln X
    # = 2[ int_{xmin}^{inf} (f - P/x) dx ] - 2 P ln xmin
    I = mp.quad(lambda x: f(x) - P/x, [xmin, xmin*2, xmin*10, mp.inf])
    return 2*I - 2*P*mp.log(xmin), P, Lam, xmin, roots

beta = mp.acos(mp.mpf(1)/3)/2   # minimizer, cos 2beta = 1/3
for s in [1, -1]:
    C, P, Lam, xmin, roots = C_mu1(beta, s)
    print('sigma', s, 'Lam', mp.nstr(Lam, 20), 'P', mp.nstr(P, 20), 'xmin', mp.nstr(xmin, 20), 'C', mp.nstr(C, 25))
