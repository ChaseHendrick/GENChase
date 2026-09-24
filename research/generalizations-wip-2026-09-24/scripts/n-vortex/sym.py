"""
k-fold symmetric self-similar configurations: a central vortex Gamma_0 = 1 at the origin
(= center of vorticity by symmetry) and k rotated copies of an m-vortex arm with circulations
g_1..g_m at p_1..p_m.  For arm vortex i (using sum_l 1/(z - e^l p) = k z^(k-1)/(z^k - p^k)):
  F_i = 1/p_i + g_i (k-1)/(2 p_i) + sum_{j != i} g_j k p_i^(k-1)/(p_i^k - p_j^k) - 2 pi i conj(kappa) conj(p_i)
kappa = -1 + i b.  Minimization of b (P = b/2) by continuation descent + KKT (numerical Jacobians).
"""
import numpy as np, json, sys

def unpack(x, m):
    g = x[:m]; p = x[m:2*m] + 1j*x[2*m:3*m]
    return g, p

def resid(x, m, k, b):
    g, p = unpack(x, m)
    ck = -1 - 1j*b
    F = 1/p + g*(k-1)/(2*p) - 2j*np.pi*ck*np.conj(p)
    pk = p**k
    for i in range(m):
        for j in range(m):
            if j != i:
                F[i] += g[j]*k*p[i]**(k-1)/(pk[i]-pk[j])
    return np.concatenate([F.real, F.imag])

def numjac(f, x, h=1e-7):
    r0 = f(x); J = np.zeros((len(r0), len(x)))
    for i in range(len(x)):
        e = np.zeros_like(x); e[i] = h
        J[:, i] = (f(x+e) - f(x-e))/(2*h)
    return J

def lm(f, x, iters=200, tol=1e-26):
    lam = 1e-3; r = f(x); fv = r @ r
    for it in range(iters):
        J = numjac(f, x); g = J.T @ r; H = J.T @ J
        ok = False
        for _ in range(50):
            dx = -np.linalg.solve(H + lam*np.diag(np.diag(H) + 1e-12), g)
            xn = x + dx; rn = f(xn); fn = rn @ rn
            if np.isfinite(fn) and fn < fv:
                x, r, fv = xn, rn, fn; lam = max(lam/3, 1e-15); ok = True; break
            lam *= 4
        if not ok or fv < tol: break
    return x, fv

def descend(x, m, k, b, h0=0.05, hmin=1e-8):
    h = h0
    for it in range(3000):
        if h < hmin: return x, b, 'stalled'
        bn = b - h
        xn, fv = lm(lambda y: resid(y, m, k, bn), x.copy(), iters=40)
        if fv < 1e-24 and np.linalg.norm(xn - x) < 0.3:
            x, b = xn, bn; h = min(1.5*h, 0.2)
            g, p = unpack(x, m)
            allp = np.concatenate([p*np.exp(2j*np.pi*l/k) for l in range(k)] + [[0]])
            dmin = min(abs(allp[i]-allp[j]) for i in range(len(allp)) for j in range(i+1, len(allp)))
            if dmin/np.max(abs(p)) < 1e-3 or np.min(abs(g)) < 1e-5 or np.max(abs(g)) > 1e5:
                return x, b, 'degenerate'
        else:
            h /= 2
    return x, b, 'maxit'

def kkt_refine(x, m, k, b):
    n = len(x)
    f = lambda y: resid(y, m, k, b)
    J = numjac(f, x)
    # rotation gauge: fix by adding constraint Im p_1 = 0 after rotating
    g, p = unpack(x, m); rot = np.exp(-1j*np.angle(p[0])); p = p*rot
    x = np.concatenate([g, p.real, p.imag])
    idx = [i for i in range(n) if i != 2*m]   # drop Im p_1
    def full(y):
        xx = np.zeros(n); xx[idx] = y[:n-1]; bb = y[n-1]; mu = y[n:]
        F = lambda z: resid(z, m, k, bb)
        r = F(xx)
        Jx = numjac(F, xx)[:, idx]
        Jb = (resid(xx, m, k, bb+1e-7) - resid(xx, m, k, bb-1e-7))/2e-7
        return np.concatenate([r, Jx.T @ mu, [Jb @ mu - 1]])
    xx = x[idx]
    Jx = numjac(lambda z: resid(z, m, k, b), x)[:, idx]
    Jb = (resid(x, m, k, b+1e-7) - resid(x, m, k, b-1e-7))/2e-7
    mu0 = np.linalg.lstsq(np.concatenate([Jx.T, Jb[None, :]], 0), np.concatenate([np.zeros(n-1), [1]]), rcond=None)[0]
    y, fv = lm(full, np.concatenate([xx, [b], mu0]), iters=60, tol=1e-28)
    xo = np.zeros(n); xo[idx] = y[:n-1]
    return xo, y[n-1], fv

def insert_arm(x, m, k, b, delta=0.01, ngrid=10):
    """tracer points of the symmetric configuration, then add one arm vortex (k copies)."""
    g, p = unpack(x, m)
    kap = -1+1j*b
    allp = np.concatenate([p*np.exp(2j*np.pi*l/k) for l in range(k)] + [[0]])
    allg = np.concatenate([g for l in range(k)] + [[1.0]])
    def f(z):
        return np.conj(np.sum(allg/(z-allp))/(2j*np.pi)) - kap*z
    R = 2*np.max(abs(p)); pts = []
    for a in np.linspace(-R, R, ngrid):
        for c in np.linspace(-R, R, ngrid):
            z = a+1j*c
            for it in range(50):
                hh = 1e-7; f0 = f(z); fx = (f(z+hh)-f(z-hh))/(2*hh); fy = (f(z+1j*hh)-f(z-1j*hh))/(2*hh)
                Jm = np.array([[fx.real, fy.real], [fx.imag, fy.imag]])
                try: dd = np.linalg.solve(Jm, -np.array([f0.real, f0.imag]))
                except np.linalg.LinAlgError: break
                z = z + dd[0] + 1j*dd[1]
                if abs(dd[0]+1j*dd[1]) < 1e-14: break
            if abs(f(z)) < 1e-10 and np.min(abs(z-allp)) > 1e-6 and abs(z) < 10*R:
                # reduce modulo rotation by 2pi/k
                if all(min(abs(z*np.exp(2j*np.pi*l/k)-q) for l in range(k)) > 1e-6 for q in pts):
                    pts.append(z)
    return pts

if __name__ == '__main__':
    k = int(sys.argv[1]); mmax = int(sys.argv[2]); seed = int(sys.argv[3]); ntr = int(sys.argv[4])
    rng = np.random.default_rng(seed)
    results = {}
    # m = 1 start: random solves for the arm of 1 vortex... start at m0 = 2 random
    best = None
    m = 2
    for t in range(ntr):
        x0 = np.concatenate([rng.normal(size=m)*0.7, rng.normal(size=2*m)*0.5])
        b0 = 3.0
        x, fv = lm(lambda y: resid(y, m, k, b0), x0)
        if fv > 1e-22: continue
        xe, be, why = descend(x, m, k, b0)
        if why == 'stalled' and (best is None or be < best[1]):
            best = (xe, be)
    if best is None:
        print(json.dumps({'k': k, 'fail': True})); sys.exit()
    x, b = best
    out = []
    while True:
        x, b, fv = kkt_refine(x, m, k, b)
        g, p = unpack(x, m)
        out.append(dict(k=k, m=m, N=1+k*m, P=b/2, kkt=fv, g=g.tolist(), p=[[z.real, z.imag] for z in p], b=b))
        print(k, m, 1+k*m, repr(b/2), 'kkt', fv, 'g', np.round(g, 4).tolist(), flush=True)
        if m >= mmax: break
        pts = insert_arm(x, m, k, b)
        cand = None
        for z in pts:
            for sg in (1, -1):
                g2 = np.concatenate([g, [sg*0.01]]); p2 = np.concatenate([p, [z]])
                x2 = np.concatenate([g2, p2.real, p2.imag])
                for db in (0.0, 0.02, 0.1):
                    xs, fv = lm(lambda y: resid(y, m+1, k, b+db), x2.copy())
                    if fv < 1e-24: break
                if fv > 1e-24: continue
                xe, be, why = descend(xs, m+1, k, b+db)
                if why == 'stalled' and (cand is None or be < cand[1]):
                    cand = (xe, be)
        if cand is None: break
        x, b = cand; m += 1
    json.dump(out, open('sym_k%d.json' % k, 'w'))
