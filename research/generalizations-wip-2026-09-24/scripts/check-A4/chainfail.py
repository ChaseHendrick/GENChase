import mpmath as mp
from scan import Pval, rhos, us
mp.mp.dps = 35
for a in [mp.mpf('1'), mp.mpf('-0.8959')]:
    be = 1 + a/2; B = mp.sqrt(3+a)/(2+a)
    fails = []
    for rho in rhos:
        for u in us:
            m = u*(2+rho)
            P, S, s = Pval(rho, m, be)
            Lam = be*m + 2/m + rho - rho**2*m/6
            low = Lam/(4*be*s)
            l1 = P > low; l2 = low > B
            if not (l1 and l2):
                fails.append((rho, u, m, P, low, B, l1, l2))
    print('alpha', a, 'nfail', len(fails))
    for f in fails[:8] + fails[-8:]:
        print('  rho', mp.nstr(f[0],5), 'u', mp.nstr(f[1],5), 'm', mp.nstr(f[2],8), 'P', mp.nstr(f[3],10), 'low', mp.nstr(f[4],10), 'B', mp.nstr(f[5],8), 'P>low', f[6], 'low>B', f[7])
