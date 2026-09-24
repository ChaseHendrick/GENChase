"""Test 2: N=3 self-similar collapses/expansions built from scratch (Groebli conditions:
G1G2+G1G3+G2G3 = 0 and sum_{i<j} GiGj l_ij^2 = 0), plus relative equilibria with L != 0.
For each, kappa is computed directly from Biot-Savart and compared to the claimed formula."""
import mpmath as mp, random
from core import *

mp.mp.dps = 50
random.seed(777)

def tri(l12, l13, l23, orient):
    # z1 = 0, z2 = l12, z3 with |z3| = l13, |z3 - l12| = l23
    x = (l12 ** 2 + l13 ** 2 - l23 ** 2) / (2 * l12)
    y2 = l13 ** 2 - x ** 2
    if y2 <= 0:
        return None
    return [mp.mpc(0), mp.mpc(l12), mp.mpc(x, orient * mp.sqrt(y2))]

worst_rel = 0; worst_ss = 0; count = 0; ncol = 0; nexp = 0
sig_min = mp.inf
Pchk = 0
for trial in range(4000):
    g1 = mp.mpf(1)
    g2 = mp.mpf(random.uniform(-3, 3))
    if abs(g1 + g2) < 1e-3:
        continue
    g3 = -g1 * g2 / (g1 + g2)
    G = [g1, g2, g3]
    if abs(mp.fsum(G)) < 1e-6:
        continue
    l12 = mp.mpf(1); l13 = mp.mpf(random.uniform(0.05, 3))
    l23sq = -(g1 * g2 * l12 ** 2 + g1 * g3 * l13 ** 2) / (g2 * g3)
    if l23sq <= 0:
        continue
    l23 = mp.sqrt(l23sq)
    for orient in (1, -1):
        z = tri(l12, l13, l23, orient)
        if z is None:
            continue
        # random rigid motion and scale
        rot = mp.expjpi(random.uniform(0, 2)) * random.uniform(0.2, 5)
        sh = mp.mpc(random.gauss(0, 3), random.gauss(0, 3))
        z = [rot * zz + sh for zz in z]
        kap, res, u, w = direct_kappa(G, z)
        form, d = formula(G, z)
        worst_ss = max(worst_ss, res)
        worst_rel = max(worst_rel, abs(kap - form) / abs(kap))
        sig_min = min(sig_min, d['sigma'] / max(d['s']))
        if mp.re(kap) < 0:
            ncol += 1
            P = abs(mp.im(kap)) / (-2 * mp.re(kap))
            P2 = abs(d['Gt']) * d['sigma'] / (2 * abs(d['vEG']))
            Pchk = max(Pchk, abs(P - P2) / P)
        else:
            nexp += 1
        count += 1
print('N=3 self-similar configs:', count, 'collapsing', ncol, 'expanding', nexp)
print('worst self-similarity residual', mp.nstr(worst_ss, 5))
print('worst |kappa_direct - kappa_formula|/|kappa|', mp.nstr(worst_rel, 5))
print('worst rel. error of P formula (with sigma unsigned)', mp.nstr(Pchk, 5))
print('min sigma/max s over these configs', mp.nstr(sig_min, 8))

# relative equilibria with L != 0: regular n-gon (equal G) + central vortex G0
worst = 0
for n in range(2, 12):
    for trial in range(5):
        gam = mp.mpf(random.uniform(0.2, 2)); G0 = mp.mpf(random.uniform(-3, 3)); r = mp.mpf(random.uniform(0.3, 3))
        z = [r * mp.expjpi(2 * mp.mpf(k) / n) for k in range(n)] + [mp.mpc(0)]
        G = [gam] * n + [G0]
        if abs(mp.fsum(G)) < 1e-3:
            continue
        kap, res, u, w = direct_kappa(G, z)
        form, d = formula(G, z)
        omega_theory = ((n - 1) * gam / 2 + G0) / (2 * mp.pi * r ** 2)
        worst = max(worst, abs(kap - form) / abs(kap), abs(mp.im(kap) - omega_theory) / abs(kap), res)
print('n-gon + centre relative equilibria: worst error', mp.nstr(worst, 5))

# N=3 equilateral with arbitrary G (relative equilibrium, rotating, L != 0 generally)
worst = 0
for trial in range(200):
    G = [mp.mpf(random.uniform(-2, 2)) for _ in range(3)]
    if abs(mp.fsum(G)) < 1e-2:
        continue
    z = [mp.expjpi(2 * mp.mpf(k) / 3) for k in range(3)]
    sc = mp.mpf(random.uniform(0.3, 2)) * mp.expjpi(random.uniform(0, 2))
    z = [zz * sc + 1.7 for zz in z]
    kap, res, u, w = direct_kappa(G, z)
    form, d = formula(G, z)
    worst = max(worst, abs(kap - form) / abs(kap), res)
print('equilateral triangles, arbitrary G: worst error', mp.nstr(worst, 5))
