"""
Seeded search for N-vortex minima of P: take an (N-1)-vortex self-similar configuration
(x, b), find the passive-tracer points z where the induced velocity equals kappa (z - z_c)
(a zero-circulation vortex there moves self-similarly), insert a vortex of small circulation
+-delta there, re-solve at slightly larger b, and descend in b by continuation.
Usage: python3 insert.py in.json out.json [ngrid] [delta]
in.json: {"G": [...], "w": [[re,im],...], "b": b}
"""
import numpy as np, sys, json
from ss_search import lm, unpack, describe
from descent import run as descend

def tracer_points(G, w, b, ngrid=12, R=None):
    kap = -1+1j*b
    Gt = G.sum(); zc = (G*w).sum()/Gt
    if R is None: R = 2.0*np.max(np.abs(w-zc))
    def f(z):
        vel = np.conj(np.sum(G/(z-w))/(2j*np.pi))
        return vel - kap*(z-zc)
    pts = []
    xs = np.linspace(-R, R, ngrid)
    for a in xs:
        for c in xs:
            z = zc + a + 1j*c
            for it in range(60):
                # Newton on the real 2x2 system via complex derivatives: f = conj(g(z))/(2 pi i)... use FD
                h = 1e-7
                f0 = f(z); fx = (f(z+h)-f(z-h))/(2*h); fy = (f(z+1j*h)-f(z-1j*h))/(2*h)
                J = np.array([[fx.real, fy.real], [fx.imag, fy.imag]])
                try:
                    d = np.linalg.solve(J, -np.array([f0.real, f0.imag]))
                except np.linalg.LinAlgError:
                    break
                z = z + d[0] + 1j*d[1]
                if abs(d[0]+1j*d[1]) < 1e-14: break
            if abs(f(z)) < 1e-10 and np.min(np.abs(z-w)) > 1e-6 and abs(z) < 10*R:
                if all(abs(z-p) > 1e-6 for p in pts):
                    pts.append(z)
    return pts

if __name__ == '__main__':
    inp = json.load(open(sys.argv[1])); out = sys.argv[2]
    ngrid = int(sys.argv[3]) if len(sys.argv) > 3 else 12
    delta = float(sys.argv[4]) if len(sys.argv) > 4 else 0.01
    G = np.array(inp['G'], float); w = np.array([complex(a, c) for a, c in inp['w']]); b = inp['b']
    # normalize G_1 = max positive to 1
    i0 = int(np.argmax(G)); perm = [i0] + [i for i in range(len(G)) if i != i0]
    G = G[perm]; w = w[perm]
    s = 1/np.sqrt(G[0]); G = G/G[0]; w = w*s
    pts = tracer_points(G, w, b, ngrid)
    print('tracer points', len(pts), file=sys.stderr)
    maxpts = int(sys.argv[5]) if len(sys.argv) > 5 else 1000
    pts = pts[:maxpts]
    N = len(G)+1
    res = []
    for z in pts:
        for sgn in ((+1, -1) if maxpts > 100 else (+1,)):
            G2 = np.concatenate([G, [sgn*delta]]); w2 = np.concatenate([w, [z]])
            x = np.concatenate([G2[1:], w2.real, w2.imag])
            for db in (0.0, 0.02, 0.1):
                xs, f = lm(x.copy(), N, -1+1j*(b+db))
                if f < 1e-24: break
            if f > 1e-24:
                continue
            xe, be, why = descend(N, xs, b+db)
            d = describe(xe, N, -1+1j*be)
            Ge = np.array(d['G'])
            res.append(dict(P=be/2, why=why, sgn=sgn, G=(Ge/np.max(np.abs(Ge))).tolist(),
                            relmin=d['dmin']/d['maxw'], Gmin=float(min(abs(Ge))/max(abs(Ge))), x=xe.tolist(),
                            Graw=d['G'], w=d['w'], b=be))
            print(round(be/2, 8), why, sgn, [round(g, 4) for g in res[-1]['G']], file=sys.stderr, flush=True)
    res.sort(key=lambda r: r['P'])
    json.dump(res, open(out, 'w'))
