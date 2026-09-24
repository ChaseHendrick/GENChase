import mpmath as mp
from bs import analyse, S_formula, bound
mp.mp.dps = 60
def P_rm(rho, m, alpha):
    r2 = rho; r3 = mp.mpf(1); r1 = mp.sqrt(1+rho*m)
    return S_formula(r1, r2, r3, alpha), (r1, r2, r3)
for alpha in ['-0.89','-0.5','0','0.5','1','1.5','2','10']:
    a = mp.mpf(alpha); be = 1 + a/2; ms = mp.sqrt(2/(1+be)); B = bound(a)
    row = []
    for rho in ['1e-2','1e-4','1e-6','1e-8']:
        rr = mp.mpf(rho)
        P, sides = P_rm(rr, ms, a)
        # also minimise over m at this rho
        Pm = lambda mm: P_rm(rr, mm, a)[0]
        mopt = mp.findroot(lambda mm: mp.diff(Pm, mm), ms)
        Pmin = Pm(mopt)
        row.append((rho, mp.nstr(P-B, 6), mp.nstr(Pmin-B, 6), mp.nstr(mopt-ms, 4)))
    # Biot-Savart at rho=1e-6
    P, sides = P_rm(mp.mpf('1e-6'), ms, a)
    out = analyse(*sides, a)
    print('alpha', alpha, 'B=', mp.nstr(B, 12), 'BS residual', mp.nstr(out['res'],3), 'Re kappa<0 after mirror', out['recollapse'], 'P_BS-B', mp.nstr(out['P']-B, 6), 'G=', [mp.nstr(g,4) for g in out['G']])
    for r in row: print('   rho', r[0], ' P(m*)-B', r[1], '  min_m P - B', r[2], ' m_opt-m*', r[3])
