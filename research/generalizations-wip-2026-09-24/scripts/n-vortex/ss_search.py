"""
Search for self-similar configurations of N point vortices with a prescribed kappa.

Equation (Biot-Savart, 2 pi kernel): conj(dz_j/dt) = (1/(2 pi i)) sum_{k!=j} G_k/(z_j - z_k).
Self-similar: dz_j/dt = kappa (z_j - z_c).  So
    F_j := sum_{k!=j} G_k/(w_j - w_k) - 2 pi i conj(kappa) conj(w_j) = 0,
with w_j = z_j - z_c.  (Summing G_j F_j forces sum G_j conj(w_j) = 0, so the origin is z_c.)

Unknowns: G_2..G_N (G_1 = 1), w_1..w_N (complex).  kappa fixed.
Gauge: rotation, and joint scaling (w -> s w, G -> s^2 G) which is broken by G_1 = 1.
Levenberg-Marquardt with analytic Jacobian, numpy float64.
"""
import numpy as np, sys, json

TWO_PI = 2*np.pi

def unpack(x, N):
    G = np.concatenate([[1.0], x[:N-1]])
    w = x[N-1:2*N-1] + 1j*x[2*N-1:3*N-1]
    return G, w

def resid(x, N, kappa):
    G, w = unpack(x, N)
    d = w[:, None] - w[None, :]
    np.fill_diagonal(d, 1.0)
    inv = 1.0/d
    np.fill_diagonal(inv, 0.0)
    S = inv @ G
    F = S - 2j*np.pi*np.conj(kappa)*np.conj(w)
    return np.concatenate([F.real, F.imag])

def jac(x, N, kappa):
    G, w = unpack(x, N)
    d = w[:, None] - w[None, :]
    np.fill_diagonal(d, 1.0)
    inv = 1.0/d
    np.fill_diagonal(inv, 0.0)
    inv2 = inv**2
    c = 2j*np.pi*np.conj(kappa)
    # dF_j/dG_k = inv[j,k] (k>=2)
    JG = inv[:, 1:]
    # holomorphic derivative dF_j/dw_k : k!=j: G_k inv2[j,k]; k==j: -sum_k G_k inv2[j,k]
    A = inv2 * G[None, :]
    A[np.diag_indices(N)] = -(inv2 @ G)
    # antiholomorphic dF_j/dconj(w_k) = -c delta_jk
    B = -c*np.eye(N)
    # w = u + i v:  dF/du = A + B, dF/dv = i A - i B
    Ju = A + B
    Jv = 1j*A - 1j*B
    Jc = np.concatenate([JG, Ju, Jv], axis=1)
    return np.concatenate([Jc.real, Jc.imag], axis=0)

def lm(x, N, kappa, iters=400, tol=1e-13):
    lam = 1e-3
    r = resid(x, N, kappa); f = r @ r
    for it in range(iters):
        J = jac(x, N, kappa)
        g = J.T @ r
        H = J.T @ J
        while True:
            try:
                dx = -np.linalg.solve(H + lam*np.diag(np.diag(H) + 1e-12), g)
            except np.linalg.LinAlgError:
                lam *= 10; continue
            xn = x + dx
            rn = resid(xn, N, kappa); fn = rn @ rn
            if np.isfinite(fn) and fn < f:
                x, r, f = xn, rn, fn
                lam = max(lam/3, 1e-15)
                break
            lam *= 4
            if lam > 1e12:
                return x, f
        if f < tol**2:
            break
    return x, f

def describe(x, N, kappa):
    G, w = unpack(x, N)
    Gt = G.sum()
    zc = (G*w).sum()/Gt
    L = (G*abs(w - zc)**2).sum()
    s2 = sum(G[i]*G[j] for i in range(N) for j in range(i+1, N))
    dmin = min(abs(w[i]-w[j]) for i in range(N) for j in range(i+1, N))
    return dict(G=G.tolist(), w=[(z.real, z.imag) for z in w], Gtot=Gt, zc=abs(zc), L=L, s2=s2, dmin=dmin,
                maxw=max(abs(w)))

if __name__ == '__main__':
    N = int(sys.argv[1]); b = float(sys.argv[2]); ntrials = int(sys.argv[3]); seed = int(sys.argv[4])
    kappa = -1.0 + 1j*b      # P = |b|/2
    rng = np.random.default_rng(seed)
    found = []
    for t in range(ntrials):
        x0 = np.concatenate([rng.normal(size=N-1)*1.5, rng.normal(size=2*N)*0.5])
        x, f = lm(x0, N, kappa)
        if f < 1e-24:
            dsc = describe(x, N, kappa)
            # scale-invariant non-degeneracy: minimal distance relative to size, min |G| relative
            G = np.array(dsc['G']); size = dsc['maxw']
            dsc['relmin'] = dsc['dmin']/size
            dsc['Gmin'] = float(min(abs(G))/max(abs(G)))
            dsc['f'] = f
            found.append(dsc)
    print(json.dumps(dict(N=N, b=b, ntrials=ntrials, nfound=len(found), found=found[:50])))
