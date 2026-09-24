"""
Basin hopping for the minimum of P over self-similar N-vortex configurations (no symmetry imposed).
Start from a known local minimum (G, w, b); perturb circulations and positions, re-solve at a higher b,
descend by continuation, accept if lower.  Usage: python3 hop.py in.json nhops seed out.json
"""
import numpy as np, json, sys
from ss_search import lm, unpack, describe
from descent import run as descend

inp = json.load(open(sys.argv[1])); nh = int(sys.argv[2]); seed = int(sys.argv[3]); out = sys.argv[4]
rng = np.random.default_rng(seed)
G = np.array(inp['G'], float); w = np.array([complex(a, c) for a, c in inp['w']]); b = inp['b']
N = len(G)
i0 = int(np.argmax(G)); perm = [i0] + [i for i in range(N) if i != i0]; G = G[perm]; w = w[perm]
s = 1/np.sqrt(G[0]); G = G/G[0]; w = w*s
best = (np.concatenate([G[1:], w.real, w.imag]), b)
hist = [dict(hop=-1, P=b/2)]
print('start', b/2, flush=True)
for h in range(nh):
    x0 = best[0].copy()
    Gc, wc = unpack(x0, N)
    size = np.max(np.abs(wc - np.mean(wc)))
    amp = rng.choice([0.05, 0.15, 0.3])
    Gn = Gc*(1 + amp*rng.normal(size=N)); Gn[0] = 1.0
    wn = wc + amp*size*(rng.normal(size=N) + 1j*rng.normal(size=N))
    # occasionally flip a small circulation's sign or swap positions of two vortices
    if rng.random() < 0.2:
        j = rng.integers(1, N); Gn[j] = -Gn[j]
    x = np.concatenate([Gn[1:], wn.real, wn.imag])
    ok = False
    for bb in (best[1] + 0.3, best[1] + 1.0, best[1] + 3.0):
        xs, f = lm(x.copy(), N, -1+1j*bb)
        if f < 1e-22: ok = True; break
    if not ok:
        continue
    xe, be, why = descend(N, xs, bb)
    d = describe(xe, N, -1+1j*be)
    rel = d['dmin']/d['maxw']
    hist.append(dict(hop=h, P=be/2, why=why, amp=float(amp), rel=rel))
    if why == 'stalled' and be < best[1] - 1e-9:
        best = (xe, be)
        print('hop', h, 'NEW BEST', be/2, 'amp', amp, flush=True)
        Gb, wb = unpack(xe, N)
        json.dump(dict(G=Gb.tolist(), w=[[z.real, z.imag] for z in wb], b=be, hist=hist), open(out, 'w'))
    else:
        print('hop', h, round(be/2, 6), why, flush=True)
Gb, wb = unpack(best[0], N)
json.dump(dict(G=Gb.tolist(), w=[[z.real, z.imag] for z in wb], b=best[1], hist=hist), open(out, 'w'))
