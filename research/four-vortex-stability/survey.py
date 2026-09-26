"""NUMERICAL survey (floating point, not a proof): all relative equilibria found by multistart
Newton for circulations (1, 1, m, m) and (1, 1, 1, m), their reduced spectra, and whether the
reduced quadratic form is definite (Dirichlet) or indefinite (needs Arnold).

usage: python3 survey.py [starts]
"""
import sys, random, json, cmath
import numpy as np
from tps import Space, Ring
from vortex import F_and_DF, Hred_tps, positions, check_jacobi

R = Ring('float')
SP2 = Space(4, 2)
SP5 = Space(5, 2)


def newton(G, v, it=60):
    v = list(v)
    for _ in range(it):
        F, DF, _ = F_and_DF(G, v, R, SP5)
        F = np.array(F); DF = np.array(DF)
        if not np.all(np.isfinite(F)) or not np.all(np.isfinite(DF)):
            return None
        try:
            d = np.linalg.solve(DF, -F)
        except np.linalg.LinAlgError:
            return None
        v = list(np.array(v) + d)
        if np.linalg.norm(d) < 1e-14 * (1 + np.linalg.norm(v)):
            F, _, _ = F_and_DF(G, v, R, SP5)
            if np.linalg.norm(F) < 1e-9 and max(abs(x) for x in v) < 1e3:
                return v
            return None
    return None


def reduced_quadratic(G, v):
    H, mu = Hred_tps(G, v, SP2, R)
    S = np.zeros((4, 4))
    for i, e in enumerate(SP2.mons):
        if sum(e) == 2:
            ks = [k for k in range(4) for _ in range(e[k])]
            a, b = ks
            if a == b:
                S[a, a] = 2 * H.c[i]
            else:
                S[a, b] = S[b, a] = H.c[i]
    grad = [H.c[SP2.index[tuple(1 if j == k else 0 for j in range(4))]] for k in range(4)]
    J = np.array([[0, 1, 0, 0], [-1, 0, 0, 0], [0, 0, 0, 1], [0, 0, -1, 0]], float)
    ev = np.linalg.eigvals(J @ S)
    return S, ev, grad


def shape_key(z, G):
    # invariant under rotation, scaling, and relabelling within equal circulations
    d = sorted(abs(z[i] - z[j]) for i in range(4) for j in range(i + 1, 4))
    d = [x / d[-1] for x in d]
    return tuple(round(x, 6) for x in d)


def classify(G, starts=400, seed=1):
    rng = random.Random(seed)
    found = {}
    for _ in range(starts):
        v0 = [rng.uniform(-3, 3) for _ in range(4)]
        v = newton(G, v0)
        if v is None:
            continue
        z = positions(G, v)
        dmin = min(abs(z[i] - z[j]) for i in range(4) for j in range(i + 1, 4))
        if dmin < 1e-6:
            continue
        key = shape_key(z, G)
        if key in found:
            continue
        S, ev, grad = reduced_quadratic(G, v)
        sig = np.linalg.eigvalsh(S)
        collinear = max(abs(((zz - z[0]) / (z[1] - z[0])).imag) for zz in z) < 1e-9
        stable = bool(np.max(np.abs(ev.real)) < 1e-7)
        freqs = sorted(abs(ev.imag))[::2] if stable else None
        found[key] = dict(v=v, z=[(zz.real, zz.imag) for zz in z], collinear=bool(collinear),
                          eig=[(e.real, e.imag) for e in ev], linstable=stable,
                          hess_signs=[int(np.sign(s)) for s in sig],
                          freqs=freqs, grad=max(abs(g) for g in grad))
    return found


if __name__ == '__main__':
    starts = int(sys.argv[1]) if len(sys.argv) > 1 else 300
    print('Jacobi check (should be ~1e-15):', check_jacobi((1., 1., -0.3, -0.3)), check_jacobi((1., 1., 1., -0.9)))
    out = {}
    import multiprocessing as mp
    for fam, mk in (('pairs', lambda m: (1., 1., m, m)), ('three', lambda m: (1., 1., 1., m))):
        ms = [-0.05, -0.15, -0.25, -0.35, -0.45, -0.49, -0.52, -0.56, -0.58, -0.59, -0.6, -0.65, -0.7, -0.8, -0.86, -0.9, -0.95,
              -1.2, -1.5, -2, -2.5, -3.5, -5, -10]
        for m in ms:
            if fam == 'pairs' and m <= -1:
                continue  # (1,1,m,m) with m < -1 is (1,1,1/m,1/m) after scaling by 1/m
            G = mk(m)
            if abs(sum(G)) < 1e-9:
                continue
            res = classify(G, starts)
            nst = [r for r in res.values() if r['linstable']]
            print('%s m=%6.3f  found %2d classes, linearly stable %d' % (fam, m, len(res), len(nst)))
            for r in nst:
                print('    collinear=%s  hess signs=%s  freqs=%s  shape=%s' % (
                    r['collinear'], r['hess_signs'], ['%.5f' % f for f in r['freqs']],
                    ' '.join('(%.3f,%.3f)' % p for p in r['z'])))
            out['%s %g' % (fam, m)] = list(res.values())
    json.dump(out, open('survey.json', 'w'), indent=1)
