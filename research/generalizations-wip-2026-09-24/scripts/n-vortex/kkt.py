"""
Minimize P = b/2 (kappa = -1 + i b) over self-similar N-vortex configurations, via
Newton / LM on the KKT system:
    F(x, b) = 0                    (2N real)
    J_x(x,b)^T lam = 0             (3N-1 real)
    J_b(x,b)^T lam = 1             (1 real)
Unknowns: x (3N-1), b, lam (2N).  Float64 search stage.
Usage: python3 kkt.py N ntrials seed [b0]
Seeds x from a random solve at b0 (default 3.4), then runs KKT Newton.
"""
import numpy as np, sys, json
from ss_search import resid, jac, lm, unpack, describe

def Fb(x, N, b):
    # dF/db where kappa = -1 + i b: F = S - 2 pi i conj(kappa) conj(w); d conj(kappa)/db = -i
    G, w = unpack(x, N)
    dF = -2j*np.pi*(-1j)*np.conj(w)
    return np.concatenate([dF.real, dF.imag])

def kkt_res(y, N):
    n = 3*N-1
    x = y[:n]; b = y[n]; lam = y[n+1:]
    kap = -1+1j*b
    F = resid(x, N, kap)
    Jx = jac(x, N, kap)
    Jb = Fb(x, N, b)
    return np.concatenate([F, Jx.T @ lam, [Jb @ lam - 1.0]])

def kkt_jac(y, N, h=1e-7):
    r0 = kkt_res(y, N)
    J = np.zeros((len(r0), len(y)))
    for i in range(len(y)):
        yp = y.copy(); yp[i] += h
        ym = y.copy(); ym[i] -= h
        J[:, i] = (kkt_res(yp, N) - kkt_res(ym, N))/(2*h)
    return J

def kkt_solve(y, N, iters=200):
    lam_ = 1e-3
    r = kkt_res(y, N); f = r @ r
    for it in range(iters):
        J = kkt_jac(y, N)
        g = J.T @ r; H = J.T @ J
        ok = False
        for _ in range(60):
            try:
                dy = -np.linalg.solve(H + lam_*np.eye(len(y)), g)
            except np.linalg.LinAlgError:
                lam_ *= 10; continue
            yn = y + dy; rn = kkt_res(yn, N); fn = rn @ rn
            if np.isfinite(fn) and fn < f:
                y, r, f = yn, rn, fn; lam_ = max(lam_/5, 1e-16); ok = True; break
            lam_ *= 4
        if not ok or f < 1e-26:
            break
    return y, f

if __name__ == '__main__':
    N = int(sys.argv[1]); ntr = int(sys.argv[2]); seed = int(sys.argv[3])
    b0 = float(sys.argv[4]) if len(sys.argv) > 4 else 3.4
    rng = np.random.default_rng(seed)
    out = []
    n = 3*N-1
    for t in range(ntr):
        x0 = np.concatenate([rng.normal(size=N-1)*1.5, rng.normal(size=2*N)*0.5])
        x, f = lm(x0, N, -1+1j*b0)
        if f > 1e-20:
            continue
        # least-squares lambda at this point
        Jx = jac(x, N, -1+1j*b0); Jb = Fb(x, N, b0)
        lam0 = np.linalg.lstsq(np.concatenate([Jx.T, Jb[None, :]], axis=0),
                               np.concatenate([np.zeros(n), [1.0]]), rcond=None)[0]
        y0 = np.concatenate([x, [b0], lam0])
        y, fk = kkt_solve(y0, N)
        xx = y[:n]; b = y[n]
        d = describe(xx, N, -1+1j*b)
        G = np.array(d['G'])
        out.append(dict(P=abs(b)/2, b=b, fk=fk, G=d['G'], w=d['w'], relmin=d['dmin']/d['maxw'],
                        Gmin=float(min(abs(G))/max(abs(G))), Gtot=d['Gtot'], y=y.tolist()))
    out.sort(key=lambda o: o['P'])
    print(json.dumps(out))
