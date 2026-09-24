#!/usr/bin/env python3
"""
family.py -- DK Sect. 4 third family ((56)-(58)): P over the free parameter r, its minimum for each n,
certification by direct Biot-Savart over all 3n+1 vortices at 50 digits, Table 1 reproduction,
large-n asymptotics, and a rigorous lower bound for n >= 11.

Closed form (derive.py):  with q = r^n, 0 < r < 1 and W = 4q - r^2 (1+q)^2 > 0,
  P(n, r) = [n^2 r^4 (1+q)^2 + n (1-q^2)(1-r^2)(2-r^2) + (2+r^2)(1-q)^2]
            / [2 n r (1-r^2) ((n-1) q + n + 1) sqrt(W)]
Configuration (R1 = 1, Gamma3 = 1): Gamma0 at 0, Gamma1 at eps^k, Gamma2 at e^{i phi2} eps^k, Gamma3 at r eps^k,
cos(n phi2) = (r^2(1+q^2) - 2q)/(2q(r^2-1)) (DK 57), sin(n phi2) > 0 gives collapse for Gamma3 > 0.
"""
import json
import sys
import time
import mpmath as mp
import sympy as sp

mp.mp.dps = 50
T0 = time.time()
RES = []
I = mp.mpc(0, 1)


def check(name, ok, info=''):
    RES.append((name, bool(ok)))
    print(('PASS ' if ok else 'FAIL ') + name + ((' :: ' + str(info)) if info != '' else ''), flush=True)


def e(x, k=20):
    return mp.nstr(x, k)


def Pfam(n, r):
    r = mp.mpf(r)
    q = r**n
    W = 4 * q - r**2 * (1 + q)**2
    N = n**2 * r**4 * (1 + q)**2 + n * (1 - q**2) * (1 - r**2) * (2 - r**2) + (2 + r**2) * (1 - q)**2
    return N / (2 * n * r * (1 - r**2) * ((n - 1) * q + n + 1) * mp.sqrt(W))


def Wf(n, r):
    q = r**n
    return 4 * q - r**2 * (1 + q)**2


def rmin(n):
    """lower end of the existence interval: W(r) = 0 in (0,1); 0 for n = 2.  W > 0 exactly on (r_min, 1) (checked on a log grid)."""
    if n == 2:
        return mp.mpf(0)
    ss = [mp.mpf(10)**(-mp.mpf(k) / 20) for k in range(0, 241)]      # s = 1 - r from 1 down to 1e-12
    sg = [Wf(n, 1 - x) > 0 for x in ss]
    changes = [i for i in range(len(sg) - 1) if sg[i] != sg[i + 1]]
    assert len(changes) == 1 and sg[-1] and not sg[0], (n, changes)
    i = changes[0]
    return mp.findroot(lambda y: Wf(n, y), (1 - ss[i], 1 - ss[i + 1]), solver='anderson')


def config(n, r, sign=+1, G3=mp.mpf(1)):
    """3n+1 vortices of the family; returns (pos, gam, Gdict)."""
    r = mp.mpf(r)
    q = r**n
    cb = (r**2 * (1 + q**2) - 2 * q) / (2 * q * (r**2 - 1))
    beta = sign * mp.acos(cb)                      # n phi2 in (0, pi) for sign = +1
    phi2 = beta / n
    G1 = -G3 * r**2 * ((n + 1) * q + n - 1) / (2 * (q - 1))
    G2 = G3 * r**2 * ((n - 1) * q + n + 1) / (2 * (q - 1))
    G0 = ((n - 1) * G3**2 * r**4 - 2 * (G1 + n * G3) * G3 * r**2 + (n - 1) * G3**2 - 2 * G1**2) / (2 * G3 * (r**2 - 1))
    eps = mp.expj(2 * mp.pi / n)
    pos = [mp.mpc(0)] + [eps**k for k in range(n)] + [mp.expj(phi2) * eps**k for k in range(n)] + [r * eps**k for k in range(n)]
    gam = [G0] + [G1] * n + [G2] * n + [G3] * n
    return pos, gam, dict(G0=G0, G1=G1, G2=G2, G3=G3, phi2=phi2, cosb=cb, r=r, q=q)


def biot_savart(pos, gam):
    """direct sum over all vortices: velocities, kappa at every vortex off the origin, spread, |v(0)|, invariants."""
    M = len(pos)
    vel = []
    for j in range(M):
        s = mp.fsum(gam[k] / (pos[j] - pos[k]) for k in range(M) if k != j)
        vel.append(mp.conj(s / (2 * mp.pi * I)))
    ks = [vel[j] / pos[j] for j in range(M) if abs(pos[j]) > mp.mpf('1e-40')]
    v0 = max([abs(vel[j]) for j in range(M) if abs(pos[j]) <= mp.mpf('1e-40')] + [mp.mpf(0)])
    k0 = ks[0]
    spread = max(abs(k - k0) for k in ks) / abs(k0)
    Gt = mp.fsum(gam)
    Lang = mp.fsum(gam[j] * abs(pos[j])**2 for j in range(M)) / mp.fsum(abs(gam[j]) * abs(pos[j])**2 for j in range(M))
    zc = mp.fsum(gam[j] * pos[j] for j in range(M)) / Gt
    pairs = mp.fsum(gam[i] * gam[j] for i in range(M) for j in range(i + 1, M)) / mp.fsum(abs(gam[i] * gam[j]) for i in range(M) for j in range(i + 1, M))
    return dict(kappa=k0, spread=spread, v0=v0, Gt=Gt, L=Lang, zc=zc, pairs=pairs)


def P_kappa(k):
    return abs(k.imag) / (2 * abs(k.real))


def argmin_r(f, grid, vals):
    """refine the grid minimum: root of d log f/dr bracketed by the neighbouring grid points."""
    i0 = min(range(len(vals)), key=lambda i: vals[i])
    assert 0 < i0 < len(grid) - 1
    g = lambda x: mp.diff(lambda y: mp.log(f(y)), x)
    return mp.findroot(g, (grid[i0 - 1], grid[i0 + 1]), solver='anderson')


out = {}
# ------------------------------------------------------------------------------------------------
print('=' * 100 + '\n1. Table 1 (Fig. 1a): n = 2, r = 2/3 is a member; P by direct Biot-Savart\n' + '=' * 100)
pos, gam, G = config(2, mp.mpf(2) / 3)
# DK scale: R1 = 2 -> positions x2, same circulations (P scale free); check circulations = Table 1
bs = biot_savart([2 * z for z in pos], gam)
Om = 2 * mp.pi * I * mp.conj(bs['kappa'])
Om_tab = mp.mpf(12433) / 9000 - 31 * mp.sqrt(155) / 450 * I
tab = dict(G0=mp.mpf(6383) / 2250, G1=mp.mpf(14) / 15, G2=-mp.mpf(62) / 45, cosb=mp.mpf(13) / 18)
dev = max(abs(G[k] - v) for k, v in tab.items())
print('  circulations (G3 = 1): G0 = %s, G1 = %s, G2 = %s, cos(2 phi2) = %s ; max dev from Table 1 = %s' % (e(G['G0']), e(G['G1']), e(G['G2']), e(G['cosb']), e(dev, 3)))
print('  Biot-Savart (7 vortices, R1 = 2): kappa = %s, spread = %s, |v(0)| = %s, L = %s, sum GiGj = %s'
      % (e(bs['kappa']), e(bs['spread'], 3), e(bs['v0'], 3), e(bs['L'], 3), e(bs['pairs'], 3)))
print('  Omega = 2 pi i conj(kappa) = %s ; printed %s ; |diff| = %s' % (e(Om, 25), e(Om_tab, 25), e(abs(Om - Om_tab), 3)))
P1a = P_kappa(bs['kappa'])
P1a_exact = mp.mpf(12433) / (1240 * mp.sqrt(155))
print('  P (Biot-Savart) = %s ; 12433/(1240 sqrt 155) = %s ; closed form P(2, 2/3) = %s' % (e(P1a, 40), e(P1a_exact, 40), e(Pfam(2, mp.mpf(2) / 3), 40)))
check('1a Table 1 Fig. 1a is the r = 2/3 member of the n = 2 family; Omega and P = 12433/(1240 sqrt 155) certified by Biot-Savart',
      dev < mp.mpf('1e-45') and abs(Om - Om_tab) < mp.mpf('1e-45') and abs(P1a - P1a_exact) < mp.mpf('1e-45') and bs['spread'] < mp.mpf('1e-45'))
out['table1'] = dict(P=e(P1a, 45))

# ------------------------------------------------------------------------------------------------
print('\n' + '=' * 100 + '\n2. closed form vs Biot-Savart at random members, n = 2..12 (50 digits)\n' + '=' * 100)
worst = mp.mpf(0)
worst_sp = mp.mpf(0)
signs_ok = True
for n in range(2, 13):
    a = rmin(n)
    for fr in ('0.07', '0.3', '0.55', '0.8', '0.97'):
        r = a + (1 - a) * mp.mpf(fr)
        for sg in (+1, -1):
            pos, gam, G = config(n, r, sg)
            bs = biot_savart(pos, gam)
            worst = max(worst, abs(P_kappa(bs['kappa']) - Pfam(n, r)) / Pfam(n, r))
            worst_sp = max(worst_sp, bs['spread'], bs['v0'], abs(bs['L']), abs(bs['pairs']))
            signs_ok &= ((bs['kappa'].real < 0) == (sg > 0))
check('2a closed-form P(n, r) equals |Im kappa|/(-2 Re kappa) from direct Biot-Savart (n = 2..12, 5 r values, both mirror signs)',
      worst < mp.mpf('1e-44'), 'max rel diff ' + e(worst, 3))
check('2b every member is self-similar (spread), centre at rest, zero angular impulse L, sum_{i<j} GiGj = 0 (L, sum relative to their absolute sums)', worst_sp < mp.mpf('1e-44'), e(worst_sp, 3))
check('2c Gamma3 > 0: sin(n phi2) > 0 collapses (Re kappa < 0), the mirror image scatters', signs_ok)

# ------------------------------------------------------------------------------------------------
print('\n' + '=' * 100 + '\n3. minimum over r for each n; n = 2 exact; certified critical points for n = 2..10\n' + '=' * 100)
rs = sp.symbols('r', positive=True)


def Psym(n):
    q = rs**n
    N = n**2 * rs**4 * (1 + q)**2 + n * (1 - q**2) * (1 - rs**2) * (2 - rs**2) + (2 + rs**2) * (1 - q)**2
    D = 2 * n * rs * (1 - rs**2) * ((n - 1) * q + n + 1)
    W = 4 * q - rs**2 * (1 + q)**2
    return N, D, W


table = []
for n in range(2, 41):
    a = rmin(n)
    f = lambda x: Pfam(n, x)
    # grid in r on (a, 1), then refine d log P / dr = 0
    grid = [a + (1 - a) * mp.mpf(i) / 3000 for i in range(1, 3000)]
    vals = [f(x) for x in grid]
    rstar = argmin_r(f, grid, vals)
    Pm = f(rstar)
    cert = ''
    if n <= 10:
        # exact: d/dr log P = N'/N - D'/D - W'/(2W) = 0  <=>  poly(r) := 2 N' D W - 2 N D' W - N D W' = 0
        N, D, W = Psym(n)
        poly = sp.Poly(sp.expand(2 * sp.diff(N, rs) * D * W - 2 * N * sp.diff(D, rs) * W - N * D * sp.diff(W, rs)), rs)
        roots = [x for x in poly.real_roots() if x.is_real]
        lo = float(a)
        inside = [x for x in roots if lo < float(sp.N(x, 30)) < 1 and Wf(n, mp.mpf(str(sp.N(x, 60)))) > 0]
        crit = [mp.mpf(str(sp.N(x, 60))) for x in inside]
        cvals = [f(c) for c in crit]
        cert = 'deg %d, %d critical point(s) in (r_min, 1)' % (poly.degree(), len(crit))
        ok = len(crit) >= 1 and abs(min(cvals) - Pm) < mp.mpf('1e-40') and min(vals) > Pm - mp.mpf('1e-40')
        check('3.%d n = %d: the global minimum over the existence interval is the least critical value (%s)' % (n, n, cert), ok)
    pos, gam, G = config(n, rstar, +1)
    bs = biot_savart(pos, gam)
    Pbs = P_kappa(bs['kappa'])
    asym = mp.mpf(n)**3 / (24 * mp.sqrt(3))
    table.append((n, a, rstar, Pm, Pbs, bs['spread'], G, asym))
    out['n%d' % n] = dict(rmin=e(a, 45), rstar=e(rstar, 45), Pmin=e(Pm, 45), P_biot_savart=e(Pbs, 45), spread=e(bs['spread'], 3),
                          G0=e(G['G0'], 30), G1=e(G['G1'], 30), G2=e(G['G2'], 30), G3='1', phi2=e(G['phi2'], 30), cosb=e(G['cosb'], 30))
print('   n   r_min                 r*                          P_min (closed form)            |P_BS - P|   spread     P_min/(n^3/(24 sqrt3))')
for (n, a, rstar, Pm, Pbs, sprd, G, asym) in table:
    print('  %2d   %-20s  %-26s  %-30s  %-10s  %-9s  %s' % (n, e(a, 12), e(rstar, 22), e(Pm, 28), e(abs(Pbs - Pm), 2), e(sprd, 2), e(Pm / asym, 12)))
check('3a direct Biot-Savart P at each minimizer equals the closed form (n = 2..40)', all(abs(t[4] - t[3]) < mp.mpf('1e-44') for t in table))
check('3b minimizer is self-similar to 1e-44 under Biot-Savart (n = 2..40)', all(t[5] < mp.mpf('1e-44') for t in table))
check('3c P_min(n) is increasing in n = 2..40', all(table[i + 1][3] > table[i][3] for i in range(len(table) - 1)))
print('\n  minimizer circulations (Gamma3 = 1, R1 = 1):')
for (n, a, rstar, Pm, Pbs, sprd, G, asym) in table[:6]:
    print('   n = %d: r* = %s, phi2* = %s (n phi2*/pi = %s), G0 = %s, G1 = %s, G2 = %s' % (n, e(rstar, 15), e(G['phi2'], 15), e(n * G['phi2'] / mp.pi, 12), e(G['G0'], 15), e(G['G1'], 15), e(G['G2'], 15)))

# n = 2 exact
u = sp.symbols('u', positive=True)
N2, D2, W2 = Psym(2)
P2u = sp.simplify((N2 / (D2 * sp.sqrt(W2))).subs(rs, sp.sqrt(u)))
target = (2 * u**4 + 15 * u**3 + 2 * u**2 - 9 * u + 6) / (4 * u * (1 - u)**sp.Rational(3, 2) * (u + 3)**sp.Rational(3, 2))
okP2 = all(abs(sp.N((P2u - target).subs(u, uu), 40)) < 1e-35 for uu in (sp.Rational(1, 7), sp.Rational(2, 5), sp.Rational(9, 10)))
check('3d n = 2: P = (2u^4 + 15u^3 + 2u^2 - 9u + 6)/(4u ((1-u)(3+u))^{3/2}), u = r^2, cos(2 phi2) = (1+u)/2', okP2)
stat = sp.factor(sp.numer(sp.together(sp.diff(sp.log(target), u))))
p5 = 9 * u**5 + 7 * u**4 + 65 * u**3 + 3 * u**2 + 30 * u - 18
check('3e n = 2: dP/du = 0 <=> 9u^5 + 7u^4 + 65u^3 + 3u^2 + 30u - 18 = 0 (irreducible over Q, one positive root)',
      sp.simplify(stat / p5).is_constant() and sp.Poly(p5, u).is_irreducible and len([x for x in sp.Poly(p5, u).real_roots() if x > 0]) == 1,
      'numerator = ' + str(stat))
ustar = mp.findroot(lambda x: 9 * x**5 + 7 * x**4 + 65 * x**3 + 3 * x**2 + 30 * x - 18, mp.mpf('0.416'))
print('  n = 2: u* = r*^2 = %s ; P_min = %s' % (e(ustar, 45), e(Pfam(2, mp.sqrt(ustar)), 45)))
check('3f n = 2 min from the quintic equals the numerical minimizer', abs(Pfam(2, mp.sqrt(ustar)) - table[0][3]) < mp.mpf('1e-45'))
# minimal polynomial of P_min(2) (optional; exact algebraic number)
out['n2_exact'] = dict(u_star_poly='9u^5 + 7u^4 + 65u^3 + 3u^2 + 30u - 18', u_star=e(ustar, 45), Pmin=e(Pfam(2, mp.sqrt(ustar)), 45))

# ------------------------------------------------------------------------------------------------
print('\n' + '=' * 100 + '\n4. comparisons and large n\n' + '=' * 100)
P2min = table[0][3]
P4v = mp.mpf('0.7978967838798633')          # four-vortex value quoted in the task (0.7979), 16 digits from the sibling search
print('  P_min(n = 2) = %s ; Table 1 = %s ; Table 1 - P_min = %s' % (e(P2min, 20), e(P1a, 20), e(P1a - P2min, 6)))
print('  sqrt(3)/2 - P_min(2) = %s ; P_min(2) - 0.7978967838798633 (four-vortex) = %s' % (e(mp.sqrt(3) / 2 - P2min, 6), e(P2min - P4v, 6)))
check('4a P_min(2) < sqrt(3)/2 and P_min(2) > 0.7979 (the four-vortex value)', P2min < mp.sqrt(3) / 2 and P2min > mp.mpf('0.7979'))
# rigorous lower bound for n >= 11:  P >= r^3 sqrt(q)/(2 (1-r^2)^{3/2}) and r^2 > 4^{-2/(n-2)}
bound = lambda n: mp.mpf(2)**(-mp.mpf(n + 6) / (n - 2)) / (2 * (1 - mp.mpf(2)**(-mp.mpf(4) / (n - 2)))**mp.mpf(1.5))
print('  rigorous bound B(n) = 2^{-(n+6)/(n-2)}/(2 (1 - 2^{-4/(n-2)})^{3/2}): ' + ', '.join('B(%d) = %s' % (k, e(bound(k), 5)) for k in (8, 10, 11, 12, 20, 50)))
okb = True
for n in range(3, 41):
    a = rmin(n)
    for fr in ('0.001', '0.01', '0.1', '0.3', '0.6', '0.9', '0.999'):
        r = a + (1 - a) * mp.mpf(fr)
        q = r**n
        okb &= Pfam(n, r) >= r**3 * mp.sqrt(q) / (2 * (1 - r**2)**mp.mpf(1.5)) >= bound(n) - mp.mpf('1e-40')
        okb &= r**2 > mp.mpf(4)**(-mp.mpf(2) / (n - 2))
check('4b sampled check of the two inequalities behind B(n) (n = 3..40)', okb)
check('4c B(n) is increasing and B(11) > 0.98 > sqrt(3)/2 (so no n >= 11 member beats n = 2)',
      all(bound(k + 1) > bound(k) for k in range(3, 200)) and bound(11) > mp.mpf('0.98'), e(bound(11), 6))
# large-n asymptotics: v = n (1 - q) fixed... P ~ n^3/(2 v sqrt(v (8 - v))), min at v = 6: n^3/(24 sqrt 3)
for n in (40, 100, 200, 400):
    a = rmin(n)
    f = lambda x: Pfam(n, x)
    grid = [a + (1 - a) * mp.mpf(i) / 2000 for i in range(1, 2000)]
    vals = [f(x) for x in grid]
    rstar = argmin_r(f, grid, vals)
    print('  n = %3d: P_min = %s, n^3/(24 sqrt 3) = %s, ratio = %s, n(1 - r*^n) = %s (-> 6)'
          % (n, e(f(rstar), 12), e(mp.mpf(n)**3 / (24 * mp.sqrt(3)), 12), e(f(rstar) / (mp.mpf(n)**3 / (24 * mp.sqrt(3))), 10), e(n * (1 - rstar**n), 8)))

json.dump(out, open('family_out.json', 'w'), indent=1)
nf = sum(1 for _, ok in RES if not ok)
print('\nchecks: %d, failed: %d  (%.0f s)' % (len(RES), nf, time.time() - T0))
sys.exit(1 if nf else 0)
