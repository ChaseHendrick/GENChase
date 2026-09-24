import json, glob, numpy as np
for f in sorted(glob.glob('ref_*.json'), key=lambda f: json.load(open(f))['N']):
    d = json.load(open(f)); N = d['N']
    G = np.array([float(g) for g in d['G']]); z = np.array([float(a) + 1j * float(b) for a, b in d['z']])
    Gt = G.sum(); zc = (G * z).sum() / Gt; z = z - zc
    R = abs(z).max()
    neg = np.where(G < 0)[0]; pos = np.where(G > 0)[0]
    # 2-fold symmetry z -> -z
    mis = 0
    for j in range(N):
        k = np.argmin(abs(z + z[j]) + 10 * abs(G - G[j]))
        mis = max(mis, abs(z[k] + z[j]) / R + abs(G[k] - G[j]))
    center = [j for j in range(N) if abs(z[j]) < 1e-8 * R]
    # strongest positive
    jmax = np.argmax(G)
    # nearly straight: fit line through positive non-central vortices (PCA)
    P = z[[j for j in pos if j not in center]]
    A = np.stack([P.real, P.imag]); A = A - A.mean(axis=1, keepdims=True)
    sv = np.linalg.svd(A, compute_uv=False)
    print('N=%2d P=%s  neg=%d (G=%s)  pos=%d  Gmax+=%.3f at |z|/R=%.3f  center=%s  C2-mismatch=%.1e  chain-aspect(sv2/sv1)=%.3f' % (
        N, d['P'][:12], len(neg), np.round(G[neg], 3).tolist(), len(pos), G[jmax], abs(z[jmax]) / R,
        [round(G[c], 3) for c in center], mis, sv[1] / sv[0]))
