"""Minimum of P over N-vortex self-similar configurations with the constraint sum_{j>=2} G_j^2 = eps^2 (G_1 = 1):
follows the family toward the degenerate 'strong vortex + weak cluster' limit."""
import numpy as np, json, sys
import ss_search as S
def resid_c(x, N, kap, eps):
    r = S.resid(x, N, kap); G, w = S.unpack(x, N)
    return np.concatenate([r, [10*(np.sum(G[1:]**2) - eps**2)]])
def jac_c(x, N, kap, eps):
    J = S.jac(x, N, kap); G, w = S.unpack(x, N)
    row = np.zeros(len(x)); row[:N-1] = 20*G[1:]
    return np.vstack([J, row])
def lm(x, N, kap, eps, iters=300):
    lam = 1e-3; r = resid_c(x, N, kap, eps); f = r @ r
    for it in range(iters):
        J = jac_c(x, N, kap, eps); g = J.T @ r; H = J.T @ J
        ok = False
        for _ in range(60):
            try: dx = -np.linalg.solve(H + lam*np.diag(np.diag(H) + 1e-12), g)
            except np.linalg.LinAlgError: lam *= 10; continue
            xn = x + dx; rn = resid_c(xn, N, kap, eps); fn = rn @ rn
            if np.isfinite(fn) and fn < f: x, r, f = xn, rn, fn; lam = max(lam/3, 1e-15); ok = True; break
            lam *= 4
        if not ok or f < 1e-26: break
    return x, f
def descend(x, N, b, eps, h=0.05):
    while h > 1e-8:
        xn, f = lm(x.copy(), N, -1+1j*(b-h), eps, iters=60)
        if f < 1e-24 and np.linalg.norm(xn-x) < 0.5: x, b = xn, b-h; h = min(1.5*h, 0.2)
        else: h /= 2
    return x, b
d = json.load(open(sys.argv[1])); N = len(d['G'])
G = np.array(d['G']); w = np.array([complex(a, c) for a, c in d['w']]); b = d['b']
i0 = int(np.argmax(G)); perm = [i0]+[i for i in range(N) if i != i0]; G = G[perm]; w = w[perm]
s = 1/np.sqrt(G[0]); G = G/G[0]; w = w*s
x = np.concatenate([G[1:], w.real, w.imag])
eps0 = np.sqrt(np.sum(G[1:]**2)); print('start eps', eps0, 'P', b/2, flush=True)
for eps in [e for e in [0.3, 0.2, 0.15, 0.1, 0.07, 0.05, 0.03, 0.02, 0.01] if e < eps0]:
    ok = False
    for db in [0.0, 0.05, 0.2, 0.5, 1.0]:
        xs, f = lm(x.copy(), N, -1+1j*(b+db), eps)
        if f < 1e-22: ok = True; break
    if not ok: print('eps', eps, 'no solution'); break
    x, b = descend(xs, N, b+db, eps)
    Gc, wc = S.unpack(x, N)
    print('eps', eps, 'minP', b/2, 'G', np.round(Gc, 4).tolist(), flush=True)
