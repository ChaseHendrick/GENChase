import mpmath as mp, random
mp.mp.dps = 120
def P_and_low(rho, m, be):
    X = rho**(2*be); L = mp.log1p(rho*m); Y = mp.exp(be*L); bb = be/2*L
    S = (1+rho*m)*(1+X)/(1-X) + rho**2*mp.coth(bb) - (Y+X)/(Y-X)
    s = mp.sqrt(1-((rho-m)/2)**2)
    Lam = be*m + 2/m + rho - rho**2*m/6
    return S/(4*rho*s), Lam/(4*be*s)
random.seed(7)
# random stress test of the full chain at extreme alpha, 120 digits, log-uniform rho and u
for a in ['-0.8960', '-0.89', '0', '1', '1000']:
    a = mp.mpf(a); be = 1 + a/2; B = mp.sqrt(3+a)/(2+a); bad = 0; mn = mp.inf
    for t in range(20000):
        rho = mp.mpf(10)**(-mp.mpf(random.random())*12) if random.random() < 0.7 else 1 - mp.mpf(10)**(-mp.mpf(random.random())*12)
        u = mp.mpf(10)**(-mp.mpf(random.random())*12) if random.random() < 0.3 else (1 - mp.mpf(10)**(-mp.mpf(random.random())*12) if random.random() < 0.3 else mp.mpf(random.random()))
        m = u*(2+rho)
        P, low = P_and_low(rho, m, be)
        if not (P > low > B): bad += 1
        mn = min(mn, (P-B)/B)
    print('alpha', mp.nstr(a,6), 'chain violations', bad, 'min relative (P-B)/B', mp.nstr(mn, 5))
# beyond the claimed range (information only): corner limit and scan
mp.mp.dps = 40
for a in ['-0.95', '-0.99', '-1.2', '-1.5']:
    a = mp.mpf(a); be = 1 + a/2; B = mp.sqrt(3+a)/(2+a)
    best = mp.inf; arg = None
    for i in range(1, 121):
        rho = mp.mpf(10)**(-12 + 12*mp.mpf(i)/121)
        for j in range(1, 200):
            m = (2+rho)*mp.mpf(j)/200
            P, low = P_and_low(rho, m, be)
            if P - B < best: best = P - B; arg = (rho, m)
    print('alpha', mp.nstr(a,4), 'beta', mp.nstr(be,4), 'grid min P - B =', mp.nstr(best, 5), 'at rho', mp.nstr(arg[0],3), 'm', mp.nstr(arg[1],5))
