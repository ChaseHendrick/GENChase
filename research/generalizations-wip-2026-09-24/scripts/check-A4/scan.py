# Global scan of P over the ordered shape domain r2=rho<r3=1<r1, r1^2=1+rho*m, 0<m<2+rho, and the proof chain.
import mpmath as mp, sys, time
mp.mp.dps = 35
def Pval(rho, m, be):
    X = rho**(2*be); Y = (1+rho*m)**be; bb = be/2*mp.log(1+rho*m)
    S = (1+rho*m)*(1+X)/(1-X) + rho**2*mp.coth(bb) - (Y+X)/(Y-X)
    c = (rho-m)/2; s = mp.sqrt(1-c*c)
    return S/(4*rho*s), S, s
alphas = [mp.mpf(a) for a in ['-0.8959','-0.89','-0.8','-0.6','-0.4','-0.2','-0.05','0','0.05','0.25','0.5','0.75','1','1.25','1.5','1.75','2','2.5','3','4','6','10','20','50','100']]
NR, NU = 110, 110
rhos = [mp.mpf(10)**(-10 + 10*mp.mpf(i)/NR*mp.mpf('0.5')) for i in range(NR)]  # 1e-10 .. 1e-5*.. up to ~1e-5? fix below
# rho grid: log-spaced in rho from 1e-10 to 0.5, then log-spaced in 1-rho from 0.5 down to 1e-10
rhos = [mp.mpf(10)**(-10 + mp.mpf(i)*(10+mp.log10(0.5))/NR) for i in range(NR+1)]
rhos += [1 - mp.mpf(10)**(mp.log10(0.5) - mp.mpf(i)*(10+mp.log10(0.5))/NR) for i in range(1, NR+1)]
# u grid in (0,1): clustered at both ends
us = []
for i in range(1, NU):
    t = mp.mpf(i)/NU
    us.append((1 - mp.cos(mp.pi*t))/2)
us += [mp.mpf(10)**(-k) for k in range(3, 11)] + [1 - mp.mpf(10)**(-k) for k in range(3, 11)]
if __name__ != "__main__": alphas = []
t0 = time.time()
for a in alphas:
    be = 1 + a/2; B = mp.sqrt(3+a)/(2+a)
    best = (mp.inf, None, None); chain_fail = 0; negS = 0
    for rho in rhos:
        for u in us:
            m = u*(2+rho)
            P, S, s = Pval(rho, m, be)
            if S <= 0: negS += 1
            Lam = be*m + 2/m + rho - rho**2*m/6
            low = Lam/(4*be*s)
            if not (P > low > B): chain_fail += 1
            if P - B < best[0]: best = (P - B, rho, m)
    ms = mp.sqrt(2/(1+be))
    print('alpha %9s  min(P-B)=%s at rho=%s m=%s (m*=%s)  S<=0:%d  chain failures:%d' % (mp.nstr(a,5), mp.nstr(best[0],5), mp.nstr(best[1],3), mp.nstr(best[2],6), mp.nstr(ms,6), negS, chain_fail), flush=True)
print('time', time.time()-t0)
