"""Test 1: the row identity 4 pi i conj(q_j) = Gt - ((I-K)G)_j with q_j = zdot_j conj(w_j)
(= kappa s_j when self-similar) for ARBITRARY configurations, and the projected identity
4 pi sum v_j Im q_j = Gt sigma - L, 4 pi sum v_j Re q_j = v^T E G.
Also checks v^T s = |v|^2 and v^T (I-D) G = L, and antisymmetry of D, E.
"""
import mpmath as mp, random
from core import *

mp.mp.dps = 50
random.seed(12345)
worst = {}
def upd(k, x):
    worst[k] = max(worst.get(k, 0), x)

ntests = 0
for N in [2, 3, 4, 5, 6, 8, 11, 17]:
    for trial in range(25):
        G = [mp.mpf(random.uniform(-2, 2)) for _ in range(N)]
        if abs(mp.fsum(G)) < 0.05:
            G[0] += 1
        z = [mp.mpc(random.gauss(0, 1), random.gauss(0, 1)) for _ in range(N)]
        # sometimes put one vortex exactly at the center of vorticity
        if trial % 5 == 0 and N >= 3:
            zc_rest = mp.fsum([G[j] * z[j] for j in range(1, N)])
            # choose z0 so that zc = z0: z0 * Gt = G0 z0 + zc_rest  => z0 = zc_rest/(Gt - G0)
            z[0] = zc_rest / (mp.fsum(G) - G[0])
        form, d = formula(G, z)
        zc = center(G, z)
        w = d['w']; s = d['s']; v = d['v']; D = d['D']; E = d['E']
        u = velocities(G, z)
        q = [u[j] * mp.conj(w[j]) for j in range(N)]
        Gt = d['Gt']
        # row identity
        KG = [mp.fsum([(D[j, k] + 1j * E[j, k]) * G[k] for k in range(N)]) for j in range(N)]
        for j in range(N):
            lhs = 4j * mp.pi * mp.conj(q[j])
            rhs = Gt - (G[j] - KG[j])
            upd('row', abs(lhs - rhs) / (1 + abs(rhs)))
        # projection lemmas
        vv = d['vv']
        upd('vTs=|v|^2', abs(mp.fsum([v[j] * s[j] for j in range(N)]) - vv) / vv)
        IDG = [G[j] - mp.fsum([D[j, k] * G[k] for k in range(N)]) for j in range(N)]
        L = d['L']
        upd('vT(I-D)G=L', abs(mp.fsum([v[j] * IDG[j] for j in range(N)]) - L) / (1 + abs(L)))
        # projected identities
        lhs_im = 4 * mp.pi * mp.fsum([v[j] * mp.im(q[j]) for j in range(N)])
        lhs_re = 4 * mp.pi * mp.fsum([v[j] * mp.re(q[j]) for j in range(N)])
        upd('proj Im', abs(lhs_im - (Gt * d['sigma'] - L)) / (1 + abs(lhs_im)))
        upd('proj Re', abs(lhs_re - d['vEG']) / (1 + abs(lhs_re)))
        # antisymmetry and D formula
        for j in range(N):
            for k in range(N):
                upd('antisym', abs(D[j, k] + D[k, j]) + abs(E[j, k] + E[k, j]))
                if j != k:
                    upd('Dformula', abs(D[j, k] - (s[j] - s[k]) / abs(w[j] - w[k]) ** 2))
        # Gamma-weighted sum identity: sum_j G_j * 4 pi i conj(q_j) = Gt^2 - |G|^2
        lhs = 4j * mp.pi * mp.fsum([G[j] * mp.conj(q[j]) for j in range(N)])
        upd('Gsum', abs(lhs - (Gt ** 2 - mp.fsum([g * g for g in G]))))
        ntests += 1
print('tests', ntests)
for k, x in worst.items():
    print('%-12s worst %s' % (k, mp.nstr(x, 5)))
