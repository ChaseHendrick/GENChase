"""Test 3: generate self-similar COLLAPSE configurations for N = 4..8 from random starts
(my own solver: scipy least_squares in double, then min-norm Newton in mpmath at 60 digits),
validate each by direct Biot-Savart (self-similarity residual, Re kappa < 0), then compare
kappa with the claimed formula. Unknowns: positions (Im z_1 = 0), G_2..G_N (G_1 = 1), Im kappa;
Re kappa = -1 fixes the scale."""
import numpy as np, mpmath as mp, sys, json
from scipy.optimize import least_squares
from core import *

N = int(sys.argv[1]); seed = int(sys.argv[2]); ntry = int(sys.argv[3])
rng = np.random.default_rng(seed)


def unpack(x, lib):
    if lib == 'np':
        re = x[:N]; im = np.concatenate([[0.0], x[N:2 * N - 1]])
        z = re + 1j * im
        G = np.concatenate([[1.0], x[2 * N - 1:3 * N - 2]])
        kap = -1.0 + 1j * x[3 * N - 2]
        return z, G, kap
    re = [x[i] for i in range(N)]; im = [mp.mpf(0)] + [x[N + i] for i in range(N - 1)]
    z = [mp.mpc(re[i], im[i]) for i in range(N)]
    G = [mp.mpf(1)] + [x[2 * N - 1 + i] for i in range(N - 1)]
    kap = mp.mpc(-1, x[3 * N - 2])
    return z, G, kap


def F_np(x):
    z, G, kap = unpack(x, 'np')
    Gt = G.sum()
    zc = (G * z).sum() / Gt
    w = z - zc
    dz = z[:, None] - z[None, :]
    np.fill_diagonal(dz, 1.0)
    M = G[None, :] / dz
    np.fill_diagonal(M, 0.0)
    u = np.conj(M.sum(1) / (2j * np.pi))
    r = u - kap * w
    return np.concatenate([r.real, r.imag])


def F_mp(x):
    z, G, kap = unpack(x, 'mp')
    Gt = mp.fsum(G)
    zc = mp.fsum([G[j] * z[j] for j in range(N)]) / Gt
    u = velocities(G, z)
    r = [u[j] - kap * (z[j] - zc) for j in range(N - 1)]  # row N implied by sum G_j F_j = 0
    return mp.matrix([mp.re(a) for a in r] + [mp.im(a) for a in r])


def polish(x0, dps=60, iters=40):
    mp.mp.dps = dps + 20
    x = mp.matrix([mp.mpf(float(a)) for a in x0])
    n = len(x)
    h = mp.mpf(10) ** (-(dps // 2 + 10))
    for it in range(iters):
        F = F_mp(x)
        nf = mp.norm(F)
        if nf < mp.mpf(10) ** (-dps - 5):
            break
        J = mp.matrix(len(F), n)
        for i in range(n):
            e = mp.matrix(n, 1); e[i] = h
            col = (F_mp(x + e) - F_mp(x - e)) / (2 * h)
            for r in range(len(F)):
                J[r, i] = col[r]
        JT = J.T
        y = mp.lu_solve(J * JT, F)
        x = x - JT * y
    return x, mp.norm(F_mp(x))


found = []
for t in range(ntry):
    x0 = np.concatenate([rng.normal(size=N), rng.normal(size=N - 1), rng.uniform(-1.5, 1.5, size=N - 1), rng.normal(size=1)])
    sol = least_squares(F_np, x0, method='trf', xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=5000)
    if np.linalg.norm(sol.fun) > 1e-9:
        continue
    z, G, kap = unpack(sol.x, 'np')
    dmin = min(abs(z[i] - z[j]) for i in range(N) for j in range(i + 1, N)) / max(abs(z - (G * z).sum() / G.sum()))
    if dmin < 1e-3 or min(abs(G)) < 1e-3 or abs(G.sum()) < 1e-3:
        continue
    x, res = polish(sol.x)
    mp.mp.dps = 60
    z, G, _ = unpack(x, 'mp')
    kap, ssres, u, w = direct_kappa(G, z)
    form, d = formula(G, z)
    rel = abs(kap - form) / abs(kap)
    P = abs(mp.im(kap)) / (-2 * mp.re(kap))
    Pf = abs(d['Gt']) * d['sigma'] / (2 * abs(d['vEG']))
    sGG = mp.fsum([G[i] * G[j] for i in range(N) for j in range(i + 1, N)])
    print('try %3d |F|=%s ss_res=%s Re k=%s P=%s |k-formula|/|k|=%s |P-Pformula|/P=%s sigma/max s=%s L=%s sumGG=%s minG=%.3g dmin=%.3g' % (
        t, mp.nstr(res, 3), mp.nstr(ssres, 3), mp.nstr(mp.re(kap), 8), mp.nstr(P, 12), mp.nstr(rel, 3), mp.nstr(abs(P - Pf) / P, 3),
        mp.nstr(d['sigma'] / max(d['s']), 6), mp.nstr(d['L'], 3), mp.nstr(sGG, 3), float(min(abs(g) for g in G)), dmin), flush=True)
    found.append({'G': [str(g) for g in G], 'z': [[str(mp.re(a)), str(mp.im(a))] for a in z]})
json.dump(found, open('found_N%d_s%d.json' % (N, seed), 'w'), indent=0)
print('N', N, 'found', len(found))
