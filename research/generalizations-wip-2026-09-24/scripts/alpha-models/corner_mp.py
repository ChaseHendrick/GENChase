# High-precision min over psi of P(rho e^{i psi}) near the coalescence corner, psi in (pi/2, pi) (region R)
from core import *
mp.mp.dps = 60
def Pw(w, alpha):
    kf = kappa_formula(w, alpha)
    return abs(kf.imag)/(2*abs(kf.real))
def minpsi(rho, alpha, lo=None, hi=None):
    # golden section on psi in (pi/2, pi)
    f = lambda ps: Pw(rho*mp.expj(ps), alpha)
    a, b = (lo or mp.pi/2 + mp.mpf('1e-6')), (hi or mp.pi - mp.mpf('1e-6'))
    # coarse
    xs = [a + (b-a)*i/400 for i in range(401)]
    vals = [f(x) for x in xs]
    i = min(range(len(vals)), key=lambda k: vals[k])
    a, b = xs[max(i-1,0)], xs[min(i+1,400)]
    g = (mp.sqrt(5)-1)/2
    c, d = b - g*(b-a), a + g*(b-a)
    fc, fd = f(c), f(d)
    for _ in range(200):
        if fc < fd:
            b, d, fd = d, c, fc; c = b - g*(b-a); fc = f(c)
        else:
            a, c, fc = c, d, fd; d = a + g*(b-a); fd = f(d)
    x = (a+b)/2
    return f(x), x
for alpha in [0, mp.mpf('0.5'), 1, mp.mpf('1.5'), 2, 3]:
    B = mp.sqrt(3+alpha)/(2+alpha)
    s = mp.mpf(alpha)/2
    psistar = (mp.pi - mp.acos(-(1+s)/(2+s))/2) # cos 2psi* = -(1+s)/(2+s); psi in (pi/2,pi)
    print('alpha', alpha, 'bound', mp.nstr(B, 20), 'psi* (pred, region R)', mp.nstr(psistar, 12))
    for k in [1,2,3,4,6,8,12,16,20,25]:
        rho = mp.mpf(10)**(-k)
        v, x = minpsi(rho, alpha)
        print('   rho=1e-%d  min_psi P = %s   P-bound = %s   psi_min = %s' % (k, mp.nstr(v, 22), mp.nstr(v-B, 6), mp.nstr(x, 12)))
