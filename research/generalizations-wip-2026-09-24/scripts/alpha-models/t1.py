from core import *
mp.mp.dps=50
import random
random.seed(1)
for alpha in [0, mp.mpf('0.3'), 1, mp.mpf('1.7')]:
    for _ in range(4):
        w = mp.mpc(random.uniform(-1,2), random.uniform(0.05,2))
        k, res, G, zc = kappa_bs(w, alpha)
        kf = kappa_formula(w, alpha)
        L, H = invariants(w, alpha)
        print(float(alpha), mp.nstr(w,6), 'res', mp.nstr(res,3), 'formula diff', mp.nstr(abs(kf-k)/abs(k),3), 'L',mp.nstr(L,3),'H',mp.nstr(H,3), 'G', [mp.nstr(g,5) for g in G], 'P', mp.nstr(abs(k.imag)/(2*abs(k.real)),10))
