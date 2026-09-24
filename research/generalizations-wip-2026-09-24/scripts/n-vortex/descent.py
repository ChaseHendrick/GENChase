"""
Descent of P on the self-similar manifold by continuation in b (kappa = -1 + i b, P = b/2):
start from a random solution at b0, then repeatedly lower b and re-solve with LM from the previous
point (a minimum-norm-like correction).  Record the path end: a converged local minimum (step
shrinks to nothing) or a degeneration (min distance / size -> 0, or min |G|/max |G| -> 0, or size blow-up).
Usage: python3 descent.py N ntrials seed b0
"""
import numpy as np, sys, json
from ss_search import resid, jac, lm, unpack, describe

def normalize(x, N):
    # rescale so that max |w| = 1 (G scales as s^2) and rotate so w_1 is real: keeps LM well conditioned
    G, w = unpack(x, N)
    s = 1.0/np.max(np.abs(w))
    w = w*s; G = G*s*s
    # renormalize G_1 = 1 is required by parametrization: G_1 -> 1 needs w scaling by 1/sqrt(G_1)
    t = 1.0/np.sqrt(G[0]); w = w*t; G = G*t*t
    w = w*np.exp(-1j*np.angle(w[0]))
    return np.concatenate([G[1:], w.real, w.imag])

def run(N, x, b, bmin=0.0, h0=0.05, hmin=1e-7, maxit=4000):
    h = h0
    path = [(b, None)]
    for it in range(maxit):
        if h < hmin:
            return x, b, 'stalled'
        bn = b - h
        if bn < bmin:
            h /= 2; continue
        xn, f = lm(x.copy(), N, -1+1j*bn, iters=60)
        dxn = np.linalg.norm(xn - x)
        if f < 1e-24 and dxn < 0.5:
            x, b = xn, bn
            h = min(h*1.5, 0.2)
            d = describe(x, N, -1+1j*b)
            G = np.array(d['G'])
            rel = d['dmin']/d['maxw']; gm = float(min(abs(G))/max(abs(G)))
            if rel < 1e-3 or gm < 1e-4 or max(abs(G)) > 1e6:
                return x, b, 'degenerate'
        else:
            h /= 2
    return x, b, 'maxit'

if __name__ == '__main__':
    N = int(sys.argv[1]); ntr = int(sys.argv[2]); seed = int(sys.argv[3]); b0 = float(sys.argv[4])
    rng = np.random.default_rng(seed)
    res = []
    for t in range(ntr):
        x0 = np.concatenate([rng.normal(size=N-1)*1.5, rng.normal(size=2*N)*0.5])
        x, f = lm(x0, N, -1+1j*b0)
        if f > 1e-20:
            continue
        x, b, why = run(N, x, b0)
        d = describe(x, N, -1+1j*b)
        G = np.array(d['G'])
        res.append(dict(P=b/2, why=why, G=(G/np.max(np.abs(G))).tolist(), w=d['w'],
                        relmin=d['dmin']/d['maxw'], Gmin=float(min(abs(G))/max(abs(G))), x=x.tolist()))
    res.sort(key=lambda r: r['P'])
    print(json.dumps(res))
