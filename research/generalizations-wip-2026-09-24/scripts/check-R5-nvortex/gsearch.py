"""Independent random multistart global search for min P over self-similar collapsing N-vortex configurations.
Phase 1: random start -> feasible point (least_squares, trf) with kappa_r=-1, G_j0=1.
Phase 2: SLSQP minimize ki^2 subject to R=0 (gauge: kr=-1, G_j0=1, y_j1=0).
Phase 3: Newton-KKT polish in float64 (projected), report P and validity.
Usage: python3 gsearch.py N ntrials seed [scale_mode]
"""
import sys, json, time, warnings
import numpy as np
from scipy.optimize import least_squares, minimize
from npmodel import residual, jacobian, free_idx, diag, split

warnings.filterwarnings('ignore')
N = int(sys.argv[1]); ntr = int(sys.argv[2]); seed = int(sys.argv[3])
rng = np.random.default_rng(seed)


def gauge(X):
    z, G, kap = split(X, N)
    Gt = G.sum(); zc = (G * z).sum() / Gt; z = z - zc
    j0 = int(np.argmax(G)); c = 1 / G[j0]; G = G * c; kap = kap * c
    s = np.sqrt(-kap.real); z = z * s; kap = kap / (-kap.real)
    j1 = int(np.argmax(abs(z))); z = z * np.exp(-1j * np.angle(z[j1]))
    return np.concatenate([z.real, z.imag, G, [kap.real, kap.imag]]), j0, j1


def phase1(X0, j0):
    fixed = {3 * N, 2 * N + j0}
    fr = np.array([i for i in range(3 * N + 2) if i not in fixed])
    def f(u):
        X = X0.copy(); X[fr] = u; return residual(X, N)
    def jf(u):
        X = X0.copy(); X[fr] = u; return jacobian(X, N)[:, fr]
    try:
        sol = least_squares(f, X0[fr], jac=jf, method='trf', xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=200)
    except Exception:
        return None
    X = X0.copy(); X[fr] = sol.x
    if np.max(abs(residual(X, N))) > 1e-9:
        return None
    return X


def phase2(X, j0, j1):
    fr = free_idx(N, j0, j1)
    iki = list(fr).index(3 * N + 1)
    def fx(u):
        Y = X.copy(); Y[fr] = u; return Y
    obj = lambda u: u[iki] ** 2
    def gobj(u):
        g = np.zeros_like(u); g[iki] = 2 * u[iki]; return g
    cons = [{'type': 'eq', 'fun': lambda u: residual(fx(u), N), 'jac': lambda u: jacobian(fx(u), N)[:, fr]}]
    try:
        sol = minimize(obj, X[fr], jac=gobj, constraints=cons, method='SLSQP', options={'maxiter': 2000, 'ftol': 1e-16})
    except Exception:
        return None
    return fx(sol.x)


def polish(X, j0, j1, iters=30):
    """Newton on KKT in float64 with FD Hessian of Lagrangian (analytic gradient)."""
    fr = free_idx(N, j0, j1); nf = len(fr); m = 2 * N
    iki = list(fr).index(3 * N + 1)
    J = jacobian(X, N)[:, fr]
    gf = np.zeros(nf); gf[iki] = X[3 * N + 1] / 2
    lam = np.linalg.lstsq(J.T, gf, rcond=None)[0]
    def glag(Y):
        Jy = jacobian(Y, N)[:, fr]
        g = -Jy.T @ lam; g[iki] += Y[3 * N + 1] / 2
        return g, Jy
    for it in range(iters):
        R = residual(X, N); g, J = glag(X)
        if max(abs(R).max(), abs(g).max()) < 1e-13:
            break
        h = 1e-6; H = np.zeros((nf, nf))
        for a in range(nf):
            Xp = X.copy(); Xm = X.copy(); Xp[fr[a]] += h; Xm[fr[a]] -= h
            H[:, a] = (glag(Xp)[0] - glag(Xm)[0]) / (2 * h)
        H = (H + H.T) / 2
        K = np.block([[H, -J.T], [J, np.zeros((m, m))]])
        try:
            d = np.linalg.solve(K, -np.concatenate([g, R]))
        except np.linalg.LinAlgError:
            return X, lam, None
        X = X.copy(); X[fr] += d[:nf]; lam = lam + d[nf:]
    R = residual(X, N); g, J = glag(X)
    # reduced Hessian eigenvalues
    h = 1e-6; H = np.zeros((nf, nf))
    for a in range(nf):
        Xp = X.copy(); Xm = X.copy(); Xp[fr[a]] += h; Xm[fr[a]] -= h
        H[:, a] = (glag(Xp)[0] - glag(Xm)[0]) / (2 * h)
    H = (H + H.T) / 2
    U, S, Vt = np.linalg.svd(J)
    Z = Vt[len(S):].T if Vt.shape[0] > len(S) else None
    rank = np.sum(S > 1e-9 * S[0])
    Z = Vt[rank:].T
    ev = np.linalg.eigvalsh(Z.T @ H @ Z)
    return X, lam, dict(kkt=float(max(abs(R).max(), abs(g).max())), ev=ev.tolist(), minsv=float(S[rank - 1]))


results = []
t0 = time.time()
nfeas = 0
for t in range(ntr):
    # random start
    nneg = rng.integers(1, N)
    sg = np.array([-1.0] * nneg + [1.0] * (N - nneg)); rng.shuffle(sg)
    G = sg * np.exp(rng.normal(0, 0.8, N))
    if G.sum() <= 0:
        G = -G
    z = rng.normal(0, 1, N) + 1j * rng.normal(0, 1, N)
    zc = (G * z).sum() / G.sum(); z = z - zc
    j0 = int(np.argmax(G)); G = G / G[j0]
    X0 = np.concatenate([z.real, z.imag, G, [-1.0, rng.normal(0, 1.5)]])
    X = phase1(X0, j0)
    if X is None:
        continue
    X, j0, j1 = gauge(X)
    d = diag(X, N)
    if not (d['Gmin_rel'] > 1e-4 and d['dmin_rel'] > 1e-4):
        continue
    nfeas += 1
    X2 = phase2(X, j0, j1)
    if X2 is None:
        continue
    X2, j0, j1 = gauge(X2)
    X3, lam, info = polish(X2, j0, j1)
    d = diag(X3, N)
    rec = dict(t=t, P=float(d['P']), res=float(d['res']), Gmin_rel=float(d['Gmin_rel']), dmin_rel=float(d['dmin_rel']),
               info=info, G=X3[2 * N:3 * N].tolist(), x=X3[:N].tolist(), y=X3[N:2 * N].tolist(), P_slsqp=float(diag(X2, N)['P']))
    results.append(rec)
    if (t + 1) % 100 == 0:
        json.dump(results, open('gs_N%d_s%d.json' % (N, seed), 'w'))
    if (t + 1) % 20 == 0:
        print('trial', t + 1, 'feasible', nfeas, 'done', len(results), 'best', min(r['P'] for r in results if r['res'] < 1e-10) if any(r['res'] < 1e-10 for r in results) else None, 'sec', round(time.time() - t0), flush=True)
json.dump(results, open('gs_N%d_s%d.json' % (N, seed), 'w'))
good = [r for r in results if r['res'] < 1e-10 and r['info'] and r['info']['kkt'] < 1e-9 and r['Gmin_rel'] > 1e-3 and r['dmin_rel'] > 1e-3]
good.sort(key=lambda r: r['P'])
print('N', N, 'trials', ntr, 'feasible', nfeas, 'converged KKT', len(good))
vals = []
for r in good:
    if not any(abs(r['P'] - v) < 1e-7 for v in vals):
        vals.append(r['P'])
for v in vals[:15]:
    cnt = sum(1 for r in good if abs(r['P'] - v) < 1e-7)
    rr = [r for r in good if abs(r['P'] - v) < 1e-7][0]
    npos = sum(1 for g in rr['G'] if g > 0)
    print('  P=%.12f  count=%d  minHessEig=%.3g  npos=%d  Gsorted=%s' % (v, cnt, min(rr['info']['ev']), npos, np.round(sorted(rr['G']), 3).tolist()))
