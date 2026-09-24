# Re-run the extreme cases (gamma just above -(n-1)/2, r ~ 2000, P up to 1e40) at 160 working digits:
# the 70-digit run lost digits only because Im S ~ r^{-n} sits under O(1) ring sums.
import mpmath as mp, bs
bs.DPS = 140
mp.mp.dps = 160
worst = 0
for n in range(2, 13):
    for g in [mp.mpf(-(n-1))/2 + mp.mpf('1e-6'), mp.mpf(-(n-1))/2 + mp.mpf('1e-12'), mp.mpf(10)**6, -mp.mpf(10)**6]:
        for X in bs.roots37(n, g):
            K, B, D, D1, D2, ca = bs.closed(n, X)
            astar, Pstar, _ = bs.bs_minimize(n, g, X)
            Fc = mp.sqrt(D)/(2*n)
            e = abs(Pstar - Fc)/Fc; worst = max(worst, e)
            # also P(a) at a random a from the full 2n+1 BS, compared with closed form
            a = mp.mpf('1.234567')
            k, spread, centre = bs.kappa_all(n, g, X, a, c0=mp.mpc('0.3','-1.1'), psi=mp.mpf('0.77'), L=mp.mpf('1.9'))
            P = abs(mp.im(k))/(-2*mp.re(k)); Pc = (K - B*mp.cos(a))/(2*n*mp.sin(a))
            print(f'n={n:2d} g={mp.nstr(g,14):>18} r={mp.nstr(mp.sqrt(X),10):>16} Pmin={mp.nstr(Pstar,15):>22} relerr={mp.nstr(e,3):>9} '
                  f'da={mp.nstr(abs(astar-mp.acos(ca)),3):>9} P(a)err={mp.nstr(abs(P-Pc)/Pc,3):>9} spread={mp.nstr(spread,3)}')
print('worst Pmin relerr', mp.nstr(worst, 3))
