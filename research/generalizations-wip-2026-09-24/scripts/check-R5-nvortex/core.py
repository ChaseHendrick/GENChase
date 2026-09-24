"""Independent checker core: point-vortex Biot-Savart, self-similarity diagnostics, winding P.

Convention: conj(dz_j/dt) = (1/(2 pi i)) sum_{k != j} G_k / (z_j - z_k).
Self-similar: dz_j/dt = kappa (z_j - z_c).  P = |Im kappa| / (-2 Re kappa) when Re kappa < 0.
"""
import json, glob, os
import numpy as np
import mpmath as mp

EXPL = '/tmp/claude-0/-home-user-GENChase/04604b4b-7efe-5ca6-9b53-4838030930e5/scratchpad/research/n-vortex'


def zdot_mp(G, z):
    N = len(G)
    out = []
    for j in range(N):
        s = mp.fsum(G[k] / (z[j] - z[k]) for k in range(N) if k != j)
        out.append(mp.conj(s / (2j * mp.pi)))
    return out


def diagnose_mp(G, z, dps=50):
    """Return dict of diagnostics computed by direct Biot-Savart at precision dps."""
    with mp.workdps(dps):
        G = [mp.mpf(g) for g in G]
        z = [mp.mpc(x) for x in z]
        N = len(G)
        Gt = mp.fsum(G)
        zc = mp.fsum(G[j] * z[j] for j in range(N)) / Gt
        r = [zj - zc for zj in z]
        v = zdot_mp(G, z)
        # least-squares kappa over all vortices
        num = mp.fsum(mp.conj(r[j]) * v[j] for j in range(N))
        den = mp.fsum(abs(r[j]) ** 2 for j in range(N))
        kap = num / den
        vmax = max(abs(x) for x in v)
        res = max(abs(v[j] - kap * r[j]) for j in range(N)) / vmax
        S = mp.fsum(G[i] * G[k] for i in range(N) for k in range(i + 1, N))
        L = mp.fsum(G[j] * abs(r[j]) ** 2 for j in range(N))
        Lscale = mp.fsum(abs(G[j]) * abs(r[j]) ** 2 for j in range(N))
        dmin = min(abs(z[i] - z[k]) for i in range(N) for k in range(i + 1, N))
        rmax = max(abs(x) for x in r)
        P = abs(kap.imag) / (-2 * kap.real) if kap.real < 0 else mp.inf
        return dict(N=N, P=P, kappa=kap, res=res, S_rel=S / mp.fsum(g * g for g in G),
                    L_rel=L / Lscale, Gtot=Gt, collapse=bool(kap.real < 0),
                    dmin_rel=dmin / rmax, Gmin_rel=min(abs(g) for g in G) / max(abs(g) for g in G),
                    zc=zc, r=r, G=G)


def parse_cfg(d):
    """Extract (G, z) lists of strings/floats from an explorer dict."""
    if 'G' not in d or 'w' not in d:
        return None
    G = d['G']
    w = d['w']
    z = []
    for p in w:
        if isinstance(p, (list, tuple)):
            z.append(mp.mpc(mp.mpf(p[0]), mp.mpf(p[1])))
        else:
            z.append(mp.mpc(p))
    return [mp.mpf(g) for g in G], z


def all_explorer_configs():
    out = []
    for f in sorted(glob.glob(os.path.join(EXPL, '*.json'))):
        try:
            d = json.load(open(f))
        except Exception:
            continue
        items = []
        if isinstance(d, list):
            items = [(f'{os.path.basename(f)}[{i}]', x) for i, x in enumerate(d)]
        elif isinstance(d, dict):
            if 'G' in d:
                items = [(os.path.basename(f), d)]
            else:
                items = [(f'{os.path.basename(f)}[{k}]', v) for k, v in d.items() if isinstance(v, dict)]
        for name, x in items:
            if isinstance(x, dict):
                c = parse_cfg(x)
                if c is not None:
                    out.append((name, c))
    return out


# ---------------- numpy versions for search ----------------

def zdot_np(G, z):
    D = z[:, None] - z[None, :]
    np.fill_diagonal(D, 1.0)
    M = G[None, :] / D
    np.fill_diagonal(M, 0.0)
    s = M.sum(axis=1)
    return np.conj(s / (2j * np.pi))


def diagnose_np(G, z):
    G = np.asarray(G, float); z = np.asarray(z, complex)
    zc = (G * z).sum() / G.sum()
    r = z - zc
    v = zdot_np(G, z)
    kap = (np.conj(r) * v).sum() / (abs(r) ** 2).sum()
    res = np.max(abs(v - kap * r)) / np.max(abs(v))
    P = abs(kap.imag) / (-2 * kap.real) if kap.real < 0 else np.inf
    return P, kap, res
