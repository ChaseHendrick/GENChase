# Independent Biot-Savart certification of CV-b.  My own code; no closed form enters the minimization.
# Configuration: 2n+1 vortices, translated by c0 and rotated by psi (random), scaled by L.
#   ring 1: Gamma = 1 at c0 + L e^{i psi} e^{2 pi i k/n}
#   ring 2: Gamma = -1/X at c0 + L e^{i psi} r e^{i a/n} e^{2 pi i k/n}, r = sqrt(X), X a root of (37)
#   centre: Gamma = gamma at c0
# BS: conj(dz_j/dt) = (1/(2 pi i)) sum_k Gamma_k/(z_j - z_k).  kappa_j = (dz_j/dt)/(z_j - c0), must all agree,
# centre velocity must vanish.  P = |Im kappa|/(-2 Re kappa), collapse iff Re kappa < 0.
import sys, random
import mpmath as mp

DPS = int(sys.argv[1]) if len(sys.argv) > 1 else 50
mp.mp.dps = DPS + 20
random.seed(12345)

def roots37(n, g):
    A = (n - 1) + 2*g; Bq = -2*(n + g); C = mp.mpf(n - 1)
    if A == 0:
        return [C/(-Bq)]
    disc = Bq*Bq - 4*A*C
    rts = [(-Bq + mp.sqrt(disc))/(2*A), (-Bq - mp.sqrt(disc))/(2*A)]
    return sorted([x for x in rts if x > 0])

def config(n, g, X, a, c0=mp.mpc(0), psi=mp.mpf(0), L=mp.mpf(1)):
    r = mp.sqrt(X)
    rot = L*mp.expj(psi)
    zs, Gs = [], []
    for k in range(n):
        zs.append(c0 + rot*mp.expj(2*mp.pi*k/n)); Gs.append(mp.mpf(1))
    for k in range(n):
        zs.append(c0 + rot*r*mp.expj(a/n + 2*mp.pi*k/n)); Gs.append(-1/X)
    zs.append(c0); Gs.append(mp.mpf(g))
    return zs, Gs

def vel(zs, Gs):
    out = []
    for j, zj in enumerate(zs):
        s = mp.mpc(0)
        for k, zk in enumerate(zs):
            if k != j:
                s += Gs[k]/(zj - zk)
        out.append(mp.conj(s/(2j*mp.pi)))
    return out

def kappa_all(n, g, X, a, **kw):
    zs, Gs = config(n, g, X, a, **kw)
    c0 = kw.get('c0', mp.mpc(0))
    vs = vel(zs, Gs)
    ks = [vs[j]/(zs[j] - c0) for j in range(2*n)]
    k0 = ks[0]
    spread = max(abs(k - k0) for k in ks)/abs(k0)
    centre = abs(vs[-1])/abs(k0)
    return k0, spread, centre

def P_bs(n, g, X, a):
    # velocity of ring-1 vortex 0 from the direct sum over all 2n other vortices
    zs, Gs = config(n, g, X, a)
    s = mp.mpc(0)
    for k in range(1, len(zs)):
        s += Gs[k]/(zs[0] - zs[k])
    kap = mp.conj(s/(2j*mp.pi))/zs[0]
    return abs(mp.im(kap))/(-2*mp.re(kap)), mp.re(kap)

def closed(n, X):
    u = mp.log(mp.sqrt(X)); au = abs(u)
    B = mp.coth(au); K = n*mp.sinh(n*au) + mp.coth(au)*mp.cosh(n*au)
    D = K*K - B*B
    D1 = mp.sinh(n*u)**2*(n*n + mp.coth(u)**2) + n*mp.coth(u)*mp.sinh(2*n*u)
    D2 = n*n*mp.sinh(n*u)**2 + (mp.cosh(u)*mp.sinh(n*u)/mp.sinh(u))**2 + n*mp.cosh(u)*mp.sinh(2*n*u)/mp.sinh(u)
    ca = 2*mp.cosh(u)/((n+1)*mp.cosh((n+1)*u) - (n-1)*mp.cosh((n-1)*u))
    return K, B, D, D1, D2, ca

def bs_minimize(n, g, X):
    # coarse grid, golden section, then Newton (findroot) on numerical dP/da -- BS P only
    f = lambda a: P_bs(n, g, X, a)[0]
    N = 120
    grid = sorted([mp.pi*(i + mp.mpf(1)/2)/N for i in range(N)] + [mp.mpf(10)**(-10 + 9*mp.mpf(i)/60) for i in range(60)]
                  + [mp.pi - mp.mpf(10)**(-10 + 9*mp.mpf(i)/60) for i in range(60)])
    N = len(grid)
    vals = [f(a) for a in grid]
    i = min(range(N), key=lambda i: vals[i])
    assert 0 < i < N-1, ('grid edge', i)
    lo = grid[i-1]; hi = grid[i+1]
    gr = (mp.sqrt(5) - 1)/2
    x1 = hi - gr*(hi - lo); x2 = lo + gr*(hi - lo); f1 = f(x1); f2 = f(x2)
    for _ in range(60):
        if f1 < f2:
            hi, x2, f2 = x2, x1, f1; x1 = hi - gr*(hi - lo); f1 = f(x1)
        else:
            lo, x1, f1 = x1, x2, f2; x2 = lo + gr*(hi - lo); f2 = f(x2)
    a0 = (lo + hi)/2
    df = lambda a: mp.diff(f, a)
    astar = mp.findroot(df, a0, tol=mp.mpf(10)**(-(DPS+5)), verify=False)
    assert lo <= astar <= hi, ('newton left bracket', lo, astar, hi)
    return astar, f(astar), vals

def run():
    worst = dict(spread=0, centre=0, Pform=0, Pmin=0, amin=0, D1=0, D2=0, ca=0, unique=0)
    nconf = 0
    cases = []
    gammas_fixed = [-100, -10, -3, -1, mp.mpf(-1)/24, 0, mp.mpf(1)/3, 1, 10, 100, 10**4, -10**4]
    for n in range(2, 13):
        gs = list(gammas_fixed) + [mp.mpf(-(n-1))/2, mp.mpf(-(n-1))/2 + mp.mpf('1e-6')]
        gs += [mp.mpf(random.uniform(-20, 20)) for _ in range(3)]
        for g in gs:
            for X in roots37(n, g):
                cases.append((n, g, X))
    print('cases:', len(cases))
    for (n, g, X) in cases:
        # (37) residual
        res = abs(((n-1)+2*g)*X*X - 2*(n+g)*X + (n-1))
        assert res < mp.mpf(10)**(-DPS), res
        K, B, D, D1, D2, ca = closed(n, X)
        # P(a) from BS vs closed form at several a, with random translation/rotation/scale
        for a in [mp.mpf(random.uniform(0.01, 3.13)) for _ in range(3)] + [mp.mpf(random.uniform(3.15, 6.27))]:
            c0 = mp.mpc(random.uniform(-3, 3), random.uniform(-3, 3)); psi = mp.mpf(random.uniform(0, 6.28)); L = mp.mpf(random.uniform(0.3, 3))
            k, sp_, ce = kappa_all(n, g, X, a, c0=c0, psi=psi, L=L)
            nconf += 1
            worst['spread'] = max(worst['spread'], sp_); worst['centre'] = max(worst['centre'], ce)
            collapse = mp.re(k) < 0
            assert collapse == (mp.sin(a) > 0), (n, g, X, a, k)
            if collapse:
                P = abs(mp.im(k))/(-2*mp.re(k))
                Pc = (K - B*mp.cos(a))/(2*n*mp.sin(a))
                worst['Pform'] = max(worst['Pform'], abs(P - Pc)/Pc)
        worst['D1'] = max(worst['D1'], abs(D1 - D)/D); worst['D2'] = max(worst['D2'], abs(D2 - D)/D)
        worst['ca'] = max(worst['ca'], abs(ca - B/K))
        # BS minimization
        astar, Pstar, vals = bs_minimize(n, g, X)
        Fc = mp.sqrt(D)/(2*n)
        eP = abs(Pstar - Fc)/Fc; ea = abs(mp.cos(astar) - ca)
        worst['Pmin'] = max(worst['Pmin'], eP); worst['amin'] = max(worst['amin'], abs(astar - mp.acos(ca)))
        # uniqueness: every grid value exceeds F by more than 0 (no second minimum at the same height)
        gmin = min(v_ - Fc for v_ in vals)
        assert gmin > -mp.mpf(10)**(-DPS), gmin
        u = mp.log(mp.sqrt(X))
        print(f'n={n:2d} gamma={mp.nstr(g,8):>12} r={mp.nstr(mp.sqrt(X),10):>14} P_min(BS)={mp.nstr(Pstar,20):>24} '
              f'F={mp.nstr(Fc,20):>24} relerr={mp.nstr(eP,3):>9} |a*-acos(B/K)|={mp.nstr(abs(astar-mp.acos(ca)),3)}')
    print('configurations checked (random a, translate/rotate/scale):', nconf)
    for k_, v_ in worst.items():
        print(f'worst {k_:7s} {mp.nstr(v_, 3)}')

if __name__ == '__main__':
    mp.mp.dps = DPS + 20
    run()
