#!/usr/bin/env python3
"""
certify.py -- direct Biot-Savart certification (mpmath, >= 50 digits, all 2n+1 vortices) of the closed forms in derive.py
for two concentric regular n-gons plus a central vortex (DK 2014 Sect. 3, Gamma1 + Gamma2 r^2 = 0).

Configuration (Gamma1 = 1, R1 = 1):  Gamma1 = 1 at eps^k;  Gamma2 = -1/X at sqrt(X) e^{i a/n} eps^k;  Gamma0 = gamma at 0;
X = r^2 a positive root of DK (37);  a = alpha = n phi2 (b2 = e^{i a}).
Biot-Savart: conj(dz_j/dt) = (1/(2 pi i)) sum_{k != j} Gamma_k/(z_j - z_k).  kappa = (dz_j/dt)/z_j (common value), P = |Im kappa|/(-2 Re kappa).
Closed forms under test (u = ln r, all at |u|):
  P(a) = (K - B cos a)/(2 n sin a),  K = n sinh(n u) + coth(u) cosh(n u),  B = coth u,  0 < a < pi  (collapse iff sin a > 0)
  min_a P = sqrt(K^2 - B^2)/(2n)  at cos a* = B/K;   inf over gamma = sqrt(3)/2 (u -> 0), not attained.
The alpha-minimization below is done on the Biot-Savart P itself (no closed form used), then compared.
Run: python3 certify.py
"""
import sys
import time
import mpmath as mp

mp.mp.dps = 50
T0 = time.time()
RES = []
I = mp.mpc(0, 1)
S32 = mp.sqrt(3) / 2


def check(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('  PASS ' if ok else '  FAIL ') + name + (('  :: ' + str(info)) if info != '' else ''))


def e(x, k=6):
    return mp.nstr(x, k)


# ------------------------------------------------------------------ Biot-Savart
def config(n, gam0, X, a):
    eps = mp.expj(2 * mp.pi / n)
    r = mp.sqrt(X)
    pos = [eps**k for k in range(n)] + [r * mp.expj(a / n) * eps**k for k in range(n)] + [mp.mpc(0)]
    gam = [mp.mpf(1)] * n + [-1 / X] * n + [gam0]
    return pos, gam


def bs(pos, gam):
    """kappa (from vortex 0), relative spread of zdot_j/z_j over all 2n off-centre vortices, |zdot| of the centre."""
    N = len(pos)
    vel = []
    for j in range(N):
        s = mp.mpc(0)
        for k in range(N):
            if k != j:
                s += gam[k] / (pos[j] - pos[k])
        vel.append(mp.conj(s / (2 * mp.pi * I)))
    ks = [vel[j] / pos[j] for j in range(N - 1)]
    k0 = ks[0]
    spread = max(abs(k - k0) for k in ks) / abs(k0)
    return k0, spread, abs(vel[N - 1])


def P_bs(n, gam0, X, a):
    k, spread, v0 = bs(*config(n, gam0, X, a))
    return abs(k.imag) / (-2 * k.real), k, spread, v0


# ------------------------------------------------------------------ closed forms
def roots37(n, g):
    """positive roots X = r^2 of DK (37) with Gamma1 = 1."""
    A2 = (n - 1) + 2 * g
    B1 = -2 * (n + g)
    C0 = mp.mpf(n - 1)
    if A2 == 0:
        return [-C0 / B1]
    d = mp.sqrt(B1 * B1 - 4 * A2 * C0)
    q = -(B1 + (1 if B1 >= 0 else -1) * d) / 2
    return sorted([x for x in (q / A2, C0 / q) if x > 0])


def gamma_of_X(n, X):
    return 1 / (X - 1) - (n - 1) * (X - 1) / (2 * X)


def KB(n, X):
    u = abs(mp.log(X) / 2)
    K = n * mp.sinh(n * u) + mp.cosh(n * u) / mp.tanh(u)
    B = 1 / mp.tanh(u)
    return K, B, u


def P_cf(n, X, a):
    K, B, _ = KB(n, X)
    return (K - B * mp.cos(a)) / (2 * n * mp.sin(a))


def Pmin_cf(n, X):
    K, B, u = KB(n, X)
    return mp.sqrt(K**2 - B**2) / (2 * n), mp.acos(B / K)


def Pmin_cf_series_D(n, X):
    """D via the second closed form sinh^2(nu)(n^2 + coth^2 u) + n coth u sinh(2nu)."""
    _, _, u = KB(n, X)
    cth = 1 / mp.tanh(u)
    D = mp.sinh(n * u)**2 * (n**2 + cth**2) + n * cth * mp.sinh(2 * n * u)
    return mp.sqrt(D) / (2 * n)


def Omega36(n, g, X, a):
    r = mp.sqrt(X)
    b2 = mp.expj(a)
    num = (2 * (n + g) * X - (n - 1)) * r**n * b2 + (n - 1) - 2 * g * X
    den = 2 * X**2 * (r**n * b2 - 1)
    return num / den


def Fn(n):
    x = (n + mp.sqrt(2 * n - 1)) / (n - 1)
    rho = x**(mp.mpf(n) / 2)
    K = (n - 1) * x * (rho + 1 / rho) / 2 - n / rho
    return mp.sqrt(K**2 - (2 * n - 1)) / (2 * n)


# ------------------------------------------------------------------ alpha-minimization on the Biot-Savart P only
def bs_min_over_alpha(n, g, X, grid=240):
    f = lambda a: P_bs(n, g, X, a)[0]
    # uniform grid on (0, pi) plus log-spaced points near both ends (the minimizer tends to 0 as r -> 1)
    pts = set(mp.pi * i / grid for i in range(1, grid))
    for j in range(0, 49):
        d = mp.mpf(10)**(-mp.mpf(j) / 4)
        if d < mp.pi / 2:
            pts.add(d)
            pts.add(mp.pi - d)
    pts = sorted(pts)
    vals = [f(a) for a in pts]
    i0 = min(range(len(pts)), key=lambda i: vals[i])
    lo = pts[i0 - 1] if i0 > 0 else pts[0] / 2
    hi = pts[i0 + 1] if i0 + 1 < len(pts) else (pts[-1] + mp.pi) / 2
    # golden-section on the bracket, then Newton on the derivative (numerical, from BS values only)
    gr = (mp.sqrt(5) - 1) / 2
    x1, x2 = hi - gr * (hi - lo), lo + gr * (hi - lo)
    f1, f2 = f(x1), f(x2)
    for _ in range(80):
        if f1 < f2:
            hi, x2, f2 = x2, x1, f1
            x1 = hi - gr * (hi - lo)
            f1 = f(x1)
        else:
            lo, x1, f1 = x1, x2, f2
            x2 = lo + gr * (hi - lo)
            f2 = f(x2)
    a0 = (lo + hi) / 2
    h = (hi - lo) / 4 if hi > lo else a0 / 1000
    astar = mp.findroot(lambda a: mp.diff(f, a, h=min(a0 / 100, mp.mpf(10)**(-mp.mp.dps // 3))), a0)
    return f(astar), astar


print('=' * 100)
print('A. Closed form P(a) = (K - B cos a)/(2n sin a) and the collapse orientation vs Biot-Savart, 2n+1 vortices, 50 digits')
print('=' * 100)
worst_P, worst_spread, worst_v0, worst_Om, n_pts, orient_ok = 0, 0, 0, 0, 0, True
gams = [mp.mpf(x) for x in ('-1000', '-37.5', '-4', '-2', '-1.5', '-0.5', '-0.1', '0', '0.3', '1', '2.5', '17', '1000')]
for n in range(2, 9):
    for g in gams:
        for X in roots37(n, g):
            assert abs(((n - 1) + 2 * g) * X**2 - 2 * (n + g) * X + (n - 1)) < mp.mpf(10)**-45
            for a in [mp.mpf(j) / 7 * mp.pi for j in range(1, 7)] + [-mp.mpf(j) / 7 * mp.pi for j in range(1, 7)]:
                k, spread, v0 = bs(*config(n, g, X, a))
                Om = Omega36(n, g, X, a)
                worst_Om = max(worst_Om, abs(Om - 2 * mp.pi * I * mp.conj(k)) / abs(Om))
                worst_spread = max(worst_spread, spread)
                worst_v0 = max(worst_v0, v0)
                if a > 0:
                    orient_ok = orient_ok and k.real < 0
                    Pb = abs(k.imag) / (-2 * k.real)
                    worst_P = max(worst_P, abs(Pb - P_cf(n, X, a)) / Pb)
                else:
                    orient_ok = orient_ok and k.real > 0
                n_pts += 1
check('A1 self-similar: max spread of zdot_j/z_j over all 2n off-centre vortices', worst_spread < mp.mpf(10)**-45, e(worst_spread, 3))
check('A2 central vortex at rest: max |zdot_0|', worst_v0 < mp.mpf(10)**-45, e(worst_v0, 3))
check('A3 DK (36) equals 2 pi i conj(kappa_BS): max relative difference', worst_Om < mp.mpf(10)**-45, e(worst_Om, 3))
check('A4 Gamma1 > 0: Re kappa < 0 (collapse) for 0 < a < pi and > 0 (scattering) for -pi < a < 0, every gamma and root', orient_ok,
      '%d configurations, n = 2..8, both roots' % n_pts)
check('A5 P_BS vs (K - B cos a)/(2n sin a) with K, B at |u| = |ln r|: max relative difference (cancellation near r = 1 costs digits)', worst_P < mp.mpf(10)**-40, e(worst_P, 3))

print('=' * 100)
print('B. Minimum over a found on the Biot-Savart P (grid + golden section + Newton on dP/da), vs sqrt(K^2-B^2)/(2n) at cos a* = B/K')
print('=' * 100)
rows = []
worstB, worstA = 0, 0
for n in range(2, 9):
    for g in [mp.mpf(x) for x in ('-100', '-10', '-1', '0', '1', '10', '100')]:
        for X in roots37(n, g):
            Pb, ab = bs_min_over_alpha(n, g, X)
            Pc, ac = Pmin_cf(n, X)
            Pc2 = Pmin_cf_series_D(n, X)
            dP = abs(Pb - Pc) / Pc
            worstB = max(worstB, dP, abs(Pc2 - Pc) / Pc)
            worstA = max(worstA, abs(ab - ac))
            rows.append((n, g, X, Pb, Pc, ab, ac))
for (n, g, X, Pb, Pc, ab, ac) in rows:
    print('   n=%d gamma=%-5s r^2=%-22s  min_a P: BS %-24s closed %-24s | a*: BS %-14s closed %-14s %s'
          % (n, e(g, 4), e(X, 18), e(Pb, 20), e(Pc, 20), e(ab, 10), e(ac, 10), '(r>1)' if X > 1 else '(r<1)'))
check('B1 BS minimum over a equals sqrt(K^2 - B^2)/(2n) (both forms of D): max relative difference', worstB < mp.mpf(10)**-40, e(worstB, 3))
check('B2 BS minimizer equals acos(B/K) (numerical-derivative Newton, 50 digits): max |difference|', worstA < mp.mpf(10)**-20, e(worstA, 3))
check('B3 every minimum exceeds sqrt(3)/2', all(r[3] > S32 for r in rows))

print('=' * 100)
print('C. Gamma0 = 0 recovers F_n; symmetric pairs (gamma, X) <-> (-X gamma, 1/X) give the same minimum (BS)')
print('=' * 100)
okC, okS = True, True
for n in range(2, 9):
    X = [x for x in roots37(n, mp.mpf(0)) if x > 1][0]
    Pb, ab = bs_min_over_alpha(n, mp.mpf(0), X)
    okC = okC and abs(Pb - Fn(n)) < mp.mpf(10)**-40
    print('   n=%d  gamma=0: BS min %s   F_n %s' % (n, e(Pb, 25), e(Fn(n), 25)))
    for g in (mp.mpf('2.5'), mp.mpf('-0.3')):
        for X in roots37(n, g):
            g2 = -X * g
            X2 = 1 / X
            ok_root = abs(((n - 1) + 2 * g2) * X2**2 - 2 * (n + g2) * X2 + (n - 1)) < mp.mpf(10)**-45
            P1 = bs_min_over_alpha(n, g, X)[0]
            P2 = bs_min_over_alpha(n, g2, X2)[0]
            okS = okS and ok_root and abs(P1 - P2) < mp.mpf(10)**-40
check('C1 gamma = 0: BS minimum = F_n = sqrt(K_n^2 - (2n-1))/(2n), n = 2..8', okC)
check('C2 (gamma, X) and (-X gamma, 1/X) both solve (37) and have equal BS minima', okS)

print('=' * 100)
print('D. P_min along each root branch as gamma varies (closed form on a fine grid, BS spot checks): monotone, > sqrt(3)/2')
print('=' * 100)
okD = True
for n in range(2, 9):
    # branch r > 1 (defined for gamma > -(n-1)/2) and branch r < 1 (all gamma), parametrize by u on a log grid
    up = [mp.mpf(10)**(mp.mpf(k) / 20) for k in range(-80, 31)]        # u from 1e-4 to ~31.6
    br_plus, br_minus = [], []
    for uu in up:
        Xp = mp.e**(2 * uu)
        Xm = 1 / Xp
        br_plus.append((gamma_of_X(n, Xp), Pmin_cf(n, Xp)[0], Xp))
        br_minus.append((gamma_of_X(n, Xm), Pmin_cf(n, Xm)[0], Xm))
    # r > 1: as u grows gamma decreases and P_min increases; r < 1: as |u| grows gamma increases and P_min increases
    mono_p = all(br_plus[i + 1][0] < br_plus[i][0] and br_plus[i + 1][1] > br_plus[i][1] for i in range(len(up) - 1))
    mono_m = all(br_minus[i + 1][0] > br_minus[i][0] and br_minus[i + 1][1] > br_minus[i][1] for i in range(len(up) - 1))
    above = all(b[1] > S32 for b in br_plus + br_minus)
    # BS spot checks every 10th grid point (u <= 3 to keep the configuration within 50-digit range comfortably)
    spot = 0
    for j in range(0, len(up), 10):
        if up[j] > 3:
            continue
        for (g, Pc, X) in (br_plus[j], br_minus[j]):
            Pb = bs_min_over_alpha(n, g, X, grid=120)[0]
            spot = max(spot, abs(Pb - Pc) / Pc)
    okD = okD and mono_p and mono_m and above and spot < mp.mpf(10)**-35
    print('   n=%d  r>1 branch: gamma %s -> %s, P_min %s -> %s | r<1 branch: gamma %s -> %s, P_min %s -> %s | BS spot max rel diff %s'
          % (n, e(br_plus[0][0], 5), e(br_plus[-1][0], 5), e(br_plus[0][1], 12), e(br_plus[-1][1], 5),
             e(br_minus[0][0], 5), e(br_minus[-1][0], 5), e(br_minus[0][1], 12), e(br_minus[-1][1], 5), e(spot, 3)))
check('D1 on each branch P_min is strictly monotone in gamma, stays above sqrt(3)/2, and matches BS', okD)

print('=' * 100)
print('E. gamma -> +-infinity (r -> 1, a* -> 0): (P_min - sqrt(3)/2) gamma^2 -> sqrt(3)(2n^2+1)/36, BS at 80 digits')
print('=' * 100)
mp.mp.dps = 80
okE = True
for n in range(2, 9):
    lim = mp.sqrt(3) * (2 * n**2 + 1) / 36
    line = []
    for g in (mp.mpf(10)**3, mp.mpf(10)**6, -mp.mpf(10)**6):
        X = min(roots37(n, g), key=lambda x: abs(x - 1))
        Pb, ab = bs_min_over_alpha(n, g, X, grid=400)
        Pc, ac = Pmin_cf(n, X)
        okE = okE and Pb > S32 and abs(Pb - Pc) < mp.mpf(10)**-60
        line.append('gamma=%s: r^2-1=%s P_BS-sqrt3/2=%s (x gamma^2=%s) a*=%s' % (e(g, 3), e(X - 1, 5), e(Pb - S32, 8), e((Pb - S32) * g**2, 8), e(ab, 6)))
        if abs(g) == mp.mpf(10)**6:
            okE = okE and abs((Pb - S32) * g**2 - lim) / lim < mp.mpf(10)**-4
    print('   n=%d limit %s ; ' % (n, e(lim, 8)) + ' ; '.join(line))
check('E1 BS minima exceed sqrt(3)/2 and approach it like sqrt(3)(2n^2+1)/(36 gamma^2), for both signs of gamma', okE)
mp.mp.dps = 50

print('=' * 100)
print('F. Table: per n, F_n (gamma = 0), P_min at sample gamma for each root, infimum sqrt(3)/2 (closed form; BS-certified in B)')
print('=' * 100)
for n in range(2, 9):
    parts = []
    for g in (mp.mpf(-10), mp.mpf(-1), mp.mpf(1), mp.mpf(10)):
        for X in roots37(n, g):
            parts.append('g=%s,%s:%s' % (e(g, 3), 'r>1' if X > 1 else 'r<1', e(Pmin_cf(n, X)[0], 8)))
    print('   n=%d F_n=%s  %s  inf=sqrt(3)/2=%s (not attained)' % (n, e(Fn(n), 12), '  '.join(parts), e(S32, 12)))

nf = sum(1 for _, ok in RES if not ok)
print('\nchecks: %d, passed: %d, failed: %d   (%.1f s)' % (len(RES), len(RES) - nf, nf, time.time() - T0))
sys.exit(1 if nf else 0)
