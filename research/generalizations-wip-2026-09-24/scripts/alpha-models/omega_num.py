from core import *
import random
random.seed(3); mp.mp.dps = 40; worst = 0
for alpha in [0, mp.mpf('0.4'), 1, mp.mpf('1.6'), 3]:
    for _ in range(20):
        w = mp.mpc(random.uniform(-2,3), random.uniform(0.02,2))
        k, res, G, zc = kappa_bs(w, alpha)
        z = [mp.mpc(0), mp.mpc(1), w]
        F = lambda j, kk: abs(z[j]-z[kk])**(-mp.mpf(alpha)-2)
        om = (sum((G[j]+G[kk])*F(j,kk) for j,kk in [(0,1),(0,2),(1,2)]))/(4*mp.pi)
        worst = max(worst, abs(om - k.imag)/abs(k.imag))
print('max rel diff Im kappa vs (1/4pi) sum_{j<k} (G_j+G_k) r_jk^(-alpha-2):', mp.nstr(worst,3))
