"""Grow the two-arm family N -> N+2 by inserting a C2-symmetric pair into the largest gap of each arm,
then feasibility (least squares), SLSQP descent, Newton-KKT polish, reduced Hessian.  float64.
Usage: python3 contin.py start.json Nmax out.json
"""
import sys, json, time, warnings
import numpy as np
from scipy.optimize import least_squares, minimize
from npmodel import residual, jacobian, free_idx, diag, split
warnings.filterwarnings('ignore')


def gauge(X, N):
    z, G, kap = split(X, N)
    zc = (G * z).sum() / G.sum(); z = z - zc
    j0 = int(np.argmax(G)); c = 1 / G[j0]; G = G * c; kap = kap * c
    s = np.sqrt(-kap.real); z = z * s; kap = kap / (-kap.real)
    j1 = int(np.argmax(abs(z))); z = z * np.exp(-1j * np.angle(z[j1]))
    return np.concatenate([z.real, z.imag, G, [kap.real, kap.imag]]), j0, j1


def feas(X0, N, j0):
    fixed = {3 * N, 2 * N + j0}
    fr = np.array([i for i in range(3 * N + 2) if i not in fixed])
    def f(u):
        X = X0.copy(); X[fr] = u; return residual(X, N)
    def jf(u):
        X = X0.copy(); X[fr] = u; return jacobian(X, N)[:, fr]
    sol = least_squares(f, X0[fr], jac=jf, method='trf', xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=2000)
    X = X0.copy(); X[fr] = sol.x
    return X, np.max(abs(residual(X, N)))


def slsqp(X, N, j0, j1):
    fr = free_idx(N, j0, j1); iki = list(fr).index(3 * N + 1)
    def fx(u):
        Y = X.copy(); Y[fr] = u; return Y
    cons = [{'type': 'eq', 'fun': lambda u: residual(fx(u), N), 'jac': lambda u: jacobian(fx(u), N)[:, fr]}]
    sol = minimize(lambda u: u[iki] ** 2, X[fr], jac=lambda u: np.eye(len(u))[iki] * 2 * u[iki], constraints=cons,
                   method='SLSQP', options={'maxiter': 3000, 'ftol': 1e-16})
    return fx(sol.x)


def polish(X, N, j0, j1, iters=40):
    fr = free_idx(N, j0, j1); nf = len(fr); m = 2 * N
    iki = list(fr).index(3 * N + 1)
    J = jacobian(X, N)[:, fr]
    gf = np.zeros(nf); gf[iki] = X[3 * N + 1] / 2
    lam = np.linalg.lstsq(J.T, gf, rcond=None)[0]
    def glag(Y):
        Jy = jacobian(Y, N)[:, fr]; g = -Jy.T @ lam; g[iki] += Y[3 * N + 1] / 2; return g, Jy
    def hess(Y):
        h = 1e-6; H = np.zeros((nf, nf))
        for a in range(nf):
            Xp = Y.copy(); Xm = Y.copy(); Xp[fr[a]] += h; Xm[fr[a]] -= h
            H[:, a] = (glag(Xp)[0] - glag(Xm)[0]) / (2 * h)
        return (H + H.T) / 2
    for it in range(iters):
        R = residual(X, N); g, J = glag(X)
        if max(abs(R).max(), abs(g).max()) < 1e-13:
            break
        H = hess(X)
        K = np.block([[H, -J.T], [J, np.zeros((m, m))]])
        d = np.linalg.lstsq(K, -np.concatenate([g, R]), rcond=None)[0]
        X = X.copy(); X[fr] += d[:nf]; lam = lam + d[nf:]
    R = residual(X, N); g, J = glag(X)
    H = hess(X)
    U, S, Vt = np.linalg.svd(J)
    rank = int(np.sum(S > 1e-9 * S[0])); Z = Vt[rank:].T
    ev = np.linalg.eigvalsh(Z.T @ H @ Z)
    return X, dict(kkt=float(max(abs(R).max(), abs(g).max())), mineig=float(ev[0]), tdim=int(Z.shape[1]))


def c2_mismatch(X, N):
    z, G, kap = split(X, N)
    zc = (G * z).sum() / G.sum(); z = z - zc; R = abs(z).max(); mis = 0
    for j in range(N):
        k = np.argmin(abs(z + z[j]) + 10 * abs(G - G[j])); mis = max(mis, abs(z[k] + z[j]) / R + abs(G[k] - G[j]))
    return mis


def insert_pair(X, N):
    z, G, kap = split(X, N)
    zc = (G * z).sum() / G.sum(); z = z - zc
    jt = int(np.argmax(abs(z))); axis = z[jt] / abs(z[jt])
    u = z / axis
    # arm: positive vortices with Re u > small, sorted by Re u; include the central one as the start
    cen = int(np.argmin(abs(z)))
    arm = [j for j in range(N) if G[j] > 0 and u[j].real > 1e-9 and j != cen]
    arm.sort(key=lambda j: u[j].real)
    seq = [cen] + arm
    gaps = [abs(z[seq[i + 1]] - z[seq[i]]) for i in range(len(seq) - 1)]
    i = int(np.argmax(gaps)); a, b = seq[i], seq[i + 1]
    znew = (z[a] + z[b]) / 2
    Gnew = 0.5 * (G[b] + (G[a] if a != cen else G[b])) * 0.6
    z2 = np.concatenate([z, [znew, -znew]]); G2 = np.concatenate([G, [Gnew, Gnew]])
    return np.concatenate([z2.real, z2.imag, G2, [kap.real, kap.imag]])


if __name__ == '__main__':
    d = json.load(open(sys.argv[1])); Nmax = int(sys.argv[2]); out = sys.argv[3]
    G = np.array([float(g) for g in d['G']]); z = np.array([float(a) + 1j * float(b) for a, b in d['z']])
    N = len(G)
    X = np.concatenate([z.real, z.imag, G, [-1.0, 0.0]])
    zz, GG, _ = split(X, N)
    dd = diag(X, N); X[3 * N] = dd['kap'].real; X[3 * N + 1] = dd['kap'].imag
    X, j0, j1 = gauge(X, N)
    res = []
    t0 = time.time()
    while N < Nmax:
        X2 = insert_pair(X, N); N2 = N + 2
        X2, j0, j1 = gauge(X2, N2)
        X2, r = feas(X2, N2, j0)
        X2, j0, j1 = gauge(X2, N2)
        X3 = slsqp(X2, N2, j0, j1)
        X3, j0, j1 = gauge(X3, N2)
        X4, info = polish(X3, N2, j0, j1)
        dg = diag(X4, N2)
        z4, G4, _ = split(X4, N2)
        rec = dict(N=N2, P=float(dg['P']), res=float(dg['res']), feas_res=float(r), kkt=info['kkt'], mineig=info['mineig'],
                   tdim=info['tdim'], c2=float(c2_mismatch(X4, N2)), nneg=int((G4 < 0).sum()), Gmin_rel=float(dg['Gmin_rel']),
                   dmin_rel=float(dg['dmin_rel']), G=G4.tolist(), x=z4.real.tolist(), y=z4.imag.tolist(), sec=round(time.time() - t0))
        print('N=%d P=%.15f res=%.1e kkt=%.1e mineig=%.3g tdim=%d C2=%.1e nneg=%d Gmin=%.3f dmin=%.4f  t=%ds' % (
            N2, rec['P'], rec['res'], rec['kkt'], rec['mineig'], rec['tdim'], rec['c2'], rec['nneg'], rec['Gmin_rel'], rec['dmin_rel'], rec['sec']), flush=True)
        res.append(rec)
        json.dump(res, open(out, 'w'))
        X, N = X4, N2
