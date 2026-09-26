"""Numerical survey (NOT rigorous) of relative equilibria of N identical point vortices.

f(z) = -sum_{i<j} log|z_i - z_j| + (1/2) sum_k |z_k|^2 on C^N. Critical points of f are exactly the
relative equilibria, normalized so that sum_{j != k} 1/(z_k - z_j) = conj(z_k) (then sum z_k = 0 and
sum |z_k|^2 = N(N-1)/2). Random starts, damped Newton on grad f, deduplication by a shape invariant.
"""
import numpy as np
import os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import sys, json

N = int(sys.argv[1]) if len(sys.argv) > 1 else 8
TRIALS = int(sys.argv[2]) if len(sys.argv) > 2 else 20000
rng = np.random.default_rng(int(sys.argv[3]) if len(sys.argv) > 3 else 1)

def f(z):
    d = z[:, None] - z[None, :]
    iu = np.triu_indices(N, 1)
    return -np.sum(np.log(np.abs(d[iu]))) + 0.5 * np.sum(np.abs(z) ** 2)

def grad(z):
    d = z[:, None] - z[None, :]
    np.fill_diagonal(d, 1)
    s = 1 / np.conj(d)
    np.fill_diagonal(s, 0)
    return z - s.sum(1)          # complex gradient: df/dx + i df/dy

def hess(z):
    x = np.concatenate([z.real, z.imag])
    H = np.eye(2 * N)
    for i in range(N):
        for j in range(i + 1, N):
            d = z[i] - z[j]; dx, dy = d.real, d.imag; r2 = dx * dx + dy * dy
            B = np.array([[dx * dx - dy * dy, 2 * dx * dy], [2 * dx * dy, dy * dy - dx * dx]]) / r2 ** 2
            for (a, b, s) in ((i, i, 1), (j, j, 1), (i, j, -1), (j, i, -1)):
                H[a, b] += s * B[0, 0]; H[a, N + b] += s * B[0, 1]
                H[N + a, b] += s * B[1, 0]; H[N + a, N + b] += s * B[1, 1]
    return H

def newton(z, it=100):
    for _ in range(it):
        g = grad(z)
        if np.max(np.abs(g)) < 1e-13: return z, True
        H = hess(z)
        gv = np.concatenate([g.real, g.imag])
        step = np.linalg.lstsq(H, -gv, rcond=1e-10)[0]
        dz = step[:N] + 1j * step[N:]
        m = np.min(np.abs(z[:, None] - z[None, :] + np.eye(N) * 1e9))
        s = min(1.0, 0.3 * m / max(np.max(np.abs(dz)), 1e-300))
        z = z + s * dz
    return z, np.max(np.abs(grad(z))) < 1e-10

def invariant(z):
    d = np.abs(z[:, None] - z[None, :])[np.triu_indices(N, 1)]
    return np.round(np.sort(d), 6)

def symmetry(z):
    """order of the symmetry group in O(2), and whether it contains a reflection (numerical)."""
    rot = 0; refl = 0
    zs = z
    for k in range(N):
        for flip in (False, True):
            w = np.conj(zs) if flip else zs
            # isometries fixing origin mapping z0 -> z_k-ish: try every rotation angle sending w[0] to z[k]
            if abs(abs(w[0]) - abs(zs[k])) > 1e-7: continue
            if abs(w[0]) < 1e-9:
                continue
            e = zs[k] / w[0]
            u = e * w
            ok = all(np.min(np.abs(zs - p)) < 1e-6 for p in u)
            if ok:
                if flip: refl += 1
                else: rot += 1
    # if w[0] is the centre (|z0|~0) use another reference vortex
    return rot, refl

found = {}
for t in range(TRIALS):
    kind = t % 3
    if kind == 0: z0 = rng.normal(size=N) + 1j * rng.normal(size=N)
    elif kind == 1: z0 = rng.uniform(-1, 1, N) + 1j * rng.uniform(-1, 1, N)
    else:
        r = np.sqrt(rng.uniform(0, 1, N)); th = rng.uniform(0, 2 * np.pi, N); z0 = r * np.exp(1j * th)
    z0 = z0 - z0.mean()
    z0 *= np.sqrt(N * (N - 1) / 2 / np.sum(np.abs(z0) ** 2))
    z, ok = newton(z0)
    if not ok: continue
    inv = invariant(z)
    key = None
    for k2 in found:
        if np.max(np.abs(np.array(k2) - inv)) < 1e-5: key = k2; break
    if key is None:
        key = tuple(inv)
        H = hess(z); ev = np.linalg.eigvalsh(H)
        found[key] = dict(z=z, f=f(z), ev=ev, count=0)
    found[key]['count'] += 1

# relabel reference so the first vortex is off-centre for the symmetry test
out = []
for key, v in sorted(found.items(), key=lambda kv: kv[1]['f']):
    z = v['z']; order = np.argsort(-np.abs(z)); z = z[order]
    rot, refl = symmetry(z)
    ev = v['ev']; neg = int(np.sum(ev < -1e-8)); zero = int(np.sum(np.abs(ev) < 1e-8))
    radii = np.sort(np.abs(z))
    out.append(dict(f=v['f'], index=neg, zero=zero, rot=rot, refl=refl, hits=v['count'],
                    radii=[round(r, 6) for r in radii], z=[[c.real, c.imag] for c in z],
                    minabs_ev=float(np.min(np.abs(ev[np.abs(ev) > 1e-8])))))
chi = 0.0
import math
for o in out:
    G = o['rot'] + o['refl']
    orbit = 2 * math.factorial(N) / G
    chi += (-1) ** o['index'] * orbit
    print(f"f={o['f']:.10f} ind={o['index']} zero={o['zero']} |G|={G} (rot {o['rot']}, refl {o['refl']}) hits={o['hits']} minev={o['minabs_ev']:.4f} radii={o['radii']}")
print("classes", len(out), "Euler sum", chi, "expected", (-1) ** (N - 2) * math.factorial(N - 2))
json.dump(out, open(os.path.join(HERE, f"data/survey-N{N}.json"), "w"), indent=1)
