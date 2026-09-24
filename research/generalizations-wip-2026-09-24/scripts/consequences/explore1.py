from core import *
mp.mp.dps=30
mu=mp.mpf(1)/2
t0=theta0(mu)
print('theta0',t0)
for th in [0.1,0.5,1.0,1.5,t0-0.01, 3.3,4.0,4.5, 2*mp.pi-t0-0.01, -0.5, 2.0]:
    th=mp.mpf(th)
    w=w_of_theta(mu,th)
    a,b=ab(mu,w)
    p=a.imag/(-2*a.real)
    print(float(th), 'g=%.1e'%float(g_of(mu,w)), '|b|=%.1e'%float(abs(b)), 'p=',mp.nstr(p,12), 'formula', mp.nstr(P_theta_formula(mu,th),12), 'H', mp.nstr(H_of(mu,w),12))
