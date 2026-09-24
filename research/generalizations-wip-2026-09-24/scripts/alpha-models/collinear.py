# S on collinear shapes: vertex 1 between 2 and 3: r2 = tau, r3 = 1 - tau, r1 = 1. (All collinear shapes up to relabeling.)
import mpmath as mp
mp.mp.dps = 30
def S(r1,r2,r3,beta):
    c = lambda x: mp.coth(beta*x)
    return r1**2*c(mp.log(r3/r2)) + r2**2*c(mp.log(r1/r3)) + r3**2*c(mp.log(r2/r1))
for alpha in [0, 0.25, 0.5, 1, 1.5, 2, 3, 6]:
    beta = 1 + mp.mpf(alpha)/2
    vals = []
    for i in range(1, 2000):
        tau = mp.mpf(i)/2000
        if abs(tau - mp.mpf(1)/2) < 1e-12: continue
        vals.append((tau, S(1, tau, 1-tau, beta)))
    mn = min(vals, key=lambda p: abs(p[1]))
    signs = set(mp.sign(v) for _, v in vals if v != 0)
    print('alpha', alpha, ' min |S| on collinear =', mp.nstr(abs(mn[1]), 8), 'at tau', mp.nstr(mn[0], 5), ' signs:', signs, ' S at tau=0.25:', mp.nstr(S(1,0.25,0.75,beta),8))
