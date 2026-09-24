"""
k-fold symmetric insertion in the general (unsymmetrized, analytic-Jacobian) solver:
from a configuration symmetric under rotation by 2 pi/k about z_c, add k weak vortices at the
k images of a tracer point, re-solve, descend (general descent, no symmetry imposed), refine by KKT.
Usage: python3 pairins.py in.json k steps tag
"""
import numpy as np, json, sys
from ss_search import lm, unpack, describe
from descent import run as descend
from insert import tracer_points
from kkt import kkt_solve, Fb
from ss_search import jac, resid

def kkt_refine(x, N, b):
    n = 3*N-1
    Jx = jac(x, N, -1+1j*b); Jb = Fb(x, N, b)
    lam0 = np.linalg.lstsq(np.concatenate([Jx.T, Jb[None, :]], 0), np.concatenate([np.zeros(n), [1.0]]), rcond=None)[0]
    y, fk = kkt_solve(np.concatenate([x, [b], lam0]), N, iters=40)
    return y[:n], y[n], fk

inp = json.load(open(sys.argv[1])); k = int(sys.argv[2]); steps = int(sys.argv[3]); tag = sys.argv[4]
G = np.array(inp['G'], float); w = np.array([complex(a, c) for a, c in inp['w']]); b = inp['b']
out = []
for st in range(steps):
    N = len(G)
    Gt = G.sum(); zc = (G*w).sum()/Gt; w = w - zc
    # central vortex (at z_c) first so G_1 normalization uses it if it is positive and largest-by-symmetry
    i0 = int(np.argmin(np.abs(w)))
    if G[i0] <= 0: i0 = int(np.argmax(G))
    perm = [i0] + [i for i in range(N) if i != i0]; G = G[perm]; w = w[perm]
    sc = 1/np.sqrt(G[0]); G = G/G[0]; w = w*sc
    pts = tracer_points(G, w, b, 10)
    # reduce modulo rotation
    red = []
    for z in pts:
        if all(min(abs(z*np.exp(2j*np.pi*l/k) - q) for l in range(k)) > 1e-6 for q in red):
            red.append(z)
    best = None
    for z in red:
        G2 = np.concatenate([G, [0.01]*k]); w2 = np.concatenate([w, [z*np.exp(2j*np.pi*l/k) for l in range(k)]])
        x = np.concatenate([G2[1:], w2.real, w2.imag])
        N2 = N + k
        ok = False
        for db in (0.0, 0.02, 0.1):
            xs, f = lm(x.copy(), N2, -1+1j*(b+db))
            if f < 1e-24: ok = True; break
        if not ok: continue
        xe, be, why = descend(N2, xs, b+db)
        if why == 'stalled' and (best is None or be < best[1]):
            best = (xe, be)
    if best is None:
        print('no candidate'); break
    xe, be = best; N2 = N + k
    xr, br, fk = kkt_refine(xe, N2, be)
    Gr, wr = unpack(xr, N2)
    d = describe(xr, N2, -1+1j*br)
    out.append(dict(N=N2, P=br/2, kkt=fk, G=Gr.tolist(), w=[[z.real, z.imag] for z in wr], b=br,
                    relmin=d['dmin']/d['maxw']))
    print(N2, repr(br/2), 'kkt', fk, 'relmin', round(d['dmin']/d['maxw'], 4), 'G', np.round(np.sort(Gr), 3).tolist(), flush=True)
    json.dump(out, open('pairins_%s.json' % tag, 'w'))
    G, w, b = Gr, wr, br
