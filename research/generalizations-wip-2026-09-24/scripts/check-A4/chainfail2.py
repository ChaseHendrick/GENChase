import mpmath as mp
import scan
mp.mp.dps = 35
def Pval_hp(rho, m, be, dps=120):
    with mp.workdps(dps):
        rho = mp.mpf(rho); m = mp.mpf(m); be = mp.mpf(be)
        X = rho**(2*be); L = mp.log1p(rho*m); Y = mp.exp(be*L); bb = be/2*L
        S = (1+rho*m)*(1+X)/(1-X) + rho**2*mp.coth(bb) - (Y+X)/(Y-X)
        c = (rho-m)/2; s = mp.sqrt(1-c*c)
        P = S/(4*rho*s)
        Lam = be*m + 2/m + rho - rho**2*m/6
        low = Lam/(4*be*s)
        return P, low
tot = 0; still = 0; minrel = mp.inf
for a in scan.alphas if scan.alphas else []: pass
alphas = [mp.mpf(a) for a in ['-0.8959','-0.89','-0.8','-0.6','-0.4','-0.2','-0.05','0','0.05','0.25','0.5','0.75','1','1.25','1.5','1.75','2','2.5','3','4','6','10','20','50','100']]
for a in alphas:
    be = 1 + a/2; B = mp.sqrt(3+a)/(2+a)
    for rho in scan.rhos:
        for u in scan.us:
            m = u*(2+rho)
            P, S, s = scan.Pval(rho, m, be)
            Lam = be*m + 2/m + rho - rho**2*m/6
            low = Lam/(4*be*s)
            if not (P > low > B):
                tot += 1
                with mp.workdps(120):
                    P2, low2 = Pval_hp(rho, m, be)
                    Bh = mp.sqrt(3+mp.mpf(a))/(2+mp.mpf(a))
                    ok = P2 > low2 > Bh
                    if not ok: still += 1; print('REAL FAIL?', a, rho, m, P2, low2)
                    minrel = min(minrel, (P2-low2)/low2)
print('flagged at 35 digits:', tot, ' still failing at 120 digits:', still, ' min relative gap (P-low)/low among flagged:', mp.nstr(minrel, 5))
