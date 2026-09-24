"""mu* at which the least-winding collapse crosses the Gallay-Sverak regularizability threshold
H(w_min) = H(collinear equilibrium with the larger H)."""
from core import *
mp.mp.dps = 30
def thmin(m):
    t0 = theta0(m)
    f = lambda t: mp.diff(lambda s: P_theta_formula(m, s), t)
    # bracket on A- = (pi, 2pi - t0)
    a, b = mp.pi + mp.mpf('1e-6'), 2*mp.pi - t0 - mp.mpf('1e-6')
    xs = [a + (b-a)*k/400 for k in range(401)]
    Ps = [P_theta_formula(m, x) for x in xs]
    i = min(range(len(xs)), key=lambda k: Ps[k])
    return mp.findroot(f, xs[i])
def gap(m):
    m = mp.mpf(m)
    th = thmin(m)
    hmin = H_of(m, w_of_theta(m, th))
    h0 = H_of(m, w_of_theta(m, mp.mpf(0))); hpi = H_of(m, w_of_theta(m, mp.pi))
    return hmin - max(h0, hpi), th, hmin, h0, hpi
for m in ['0.05','0.1','0.2','0.3','0.4','0.5','0.7','0.9','1']:
    g, th, hmin, h0, hpi = gap(m)
    print('mu', m, 'P_-=', mp.nstr(P_theta_formula(mp.mpf(m), th), 10), 'H(wmin)-H(zetaA)=', mp.nstr(g, 8))
mstar = mp.findroot(lambda m: gap(m)[0], (mp.mpf('0.2'), mp.mpf('0.5')), solver='anderson')
g, th, hmin, h0, hpi = gap(mstar)
print('mu* =', mp.nstr(mstar, 20), ' P_-(mu*) =', mp.nstr(P_theta_formula(mstar, th), 20))
