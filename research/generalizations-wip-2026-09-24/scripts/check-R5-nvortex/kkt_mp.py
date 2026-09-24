"""My own high-precision KKT refinement and reduced-Hessian test for
   minimize P^2 = kappa_i^2/4  subject to  zdot_j = kappa z_j (all j),  kappa_r = -1,
   gauge: Gamma_{j0} = 1 (circulation scale), Im z_{j1} = 0 (rotation).
Translation is fixed automatically: sum_j G_j zdot_j == 0 identically, so the equations force sum G_j z_j = 0.

Variables X = [x_1..x_N, y_1..y_N, G_1..G_N, kr, ki].
Residual R = [Re F_j, Im F_j], F_j = (i/2pi) sum_{k!=j} G_k / conj(z_j - z_k) - kappa z_j.
"""
import mpmath as mp


def unpack(X, N):
    z = [mp.mpc(X[j], X[N + j]) for j in range(N)]
    G = [X[2 * N + j] for j in range(N)]
    kap = mp.mpc(X[3 * N], X[3 * N + 1])
    return z, G, kap


def residual(X, N):
    z, G, kap = unpack(X, N)
    c = 1j / (2 * mp.pi)
    F = []
    for j in range(N):
        s = mp.fsum(G[k] / mp.conj(z[j] - z[k]) for k in range(N) if k != j)
        F.append(c * s - kap * z[j])
    return [f.real for f in F] + [f.imag for f in F]


def jacobian(X, N):
    """Analytic Jacobian dR/dX, 2N x (3N+2), as list of lists."""
    z, G, kap = unpack(X, N)
    c = 1j / (2 * mp.pi)
    n = 3 * N + 2
    Jc = [[mp.mpc(0)] * n for _ in range(N)]  # complex dF_j/dvar
    for j in range(N):
        diag = mp.mpc(0)
        for k in range(N):
            if k == j:
                continue
            d = mp.conj(z[j] - z[k])
            A = c * G[k] / d ** 2
            Jc[j][k] += A              # d/dx_k
            Jc[j][N + k] += -1j * A    # d/dy_k
            diag += A
            Jc[j][2 * N + k] = c / d   # d/dG_k
        Jc[j][j] += -diag - kap
        Jc[j][N + j] += 1j * diag - 1j * kap
        Jc[j][3 * N] = -z[j]
        Jc[j][3 * N + 1] = -1j * z[j]
    return [[e.real for e in row] for row in Jc] + [[e.imag for e in row] for row in Jc]


def free_indices(N, j0, j1):
    fixed = {3 * N, 2 * N + j0, N + j1}
    return [i for i in range(3 * N + 2) if i not in fixed]


def normalize(G, z, dps):
    """Translate to z_c=0, scale so G_{j0}=1 (largest |G| among positive?) and kappa_r=-1, rotate so Im z_{j1}=0."""
    with mp.workdps(dps + 10):
        G = [mp.mpf(g) for g in G]; z = [mp.mpc(w) for w in z]
        N = len(G)
        Gt = mp.fsum(G)
        zc = mp.fsum(G[j] * z[j] for j in range(N)) / Gt
        z = [w - zc for w in z]
        j0 = max(range(N), key=lambda j: G[j])
        c = 1 / G[j0]
        G = [g * c for g in G]          # may flip sign of all G -> time reversal: kappa -> -kappa (then expansion)
        # compute kappa
        cc = 1j / (2 * mp.pi)
        v = [cc * mp.fsum(G[k] / mp.conj(z[j] - z[k]) for k in range(N) if k != j) for j in range(N)]
        kap = mp.fsum(mp.conj(z[j]) * v[j] for j in range(N)) / mp.fsum(abs(w) ** 2 for w in z)
        if kap.real > 0:
            raise ValueError('after normalization kappa_r > 0: time-reversed (all G flipped)')
        # scale positions so kappa_r = -1: kappa ~ 1/s^2
        s = mp.sqrt(-kap.real)
        z = [w * s for w in z]
        kap = kap / (-kap.real)
        j1 = max(range(N), key=lambda j: abs(z[j]))
        rot = mp.exp(-1j * mp.arg(z[j1]))
        z = [w * rot for w in z]
        X = [w.real for w in z] + [w.imag for w in z] + G + [kap.real, kap.imag]
        return X, j0, j1


def matT(A):
    return [list(r) for r in zip(*A)]


def kkt_refine(X, N, j0, j1, dps=60, iters=8, h=None, verbose=True):
    """Newton on the KKT system for min ki^2/4 s.t. R=0 over free variables."""
    mp.mp.dps = dps
    X = [mp.mpf(x) for x in X]
    fr = free_indices(N, j0, j1)
    nf = len(fr); m = 2 * N
    iki = fr.index(3 * N + 1)
    if h is None:
        h = mp.mpf(10) ** (-(dps // 2))

    def grad_lag(Xc, lam):
        # d/dy [f - lam.R] restricted to free vars
        J = jacobian(Xc, N)
        g = [-mp.fsum(lam[i] * J[i][fr[a]] for i in range(m)) for a in range(nf)]
        g[iki] += Xc[3 * N + 1] / 2
        return g, J

    # initial multipliers by least squares: J_f^T lam = grad f
    J = jacobian(X, N)
    Jf = mp.matrix([[J[i][fr[a]] for a in range(nf)] for i in range(m)])
    gf = mp.matrix(nf, 1); gf[iki] = X[3 * N + 1] / 2
    lam = mp.lu_solve(Jf * Jf.T, Jf * gf)
    lam = [lam[i] for i in range(m)]
    hist = []
    for it in range(iters):
        R = residual(X, N)
        g, J = grad_lag(X, lam)
        nr = max(abs(r) for r in R); ng = max(abs(x) for x in g)
        hist.append((nr, ng))
        if verbose:
            print('  it', it, 'res', mp.nstr(nr, 3), 'stat', mp.nstr(ng, 3), 'P', mp.nstr(abs(X[3 * N + 1]) / 2, 30), flush=True)
        if nr < mp.mpf(10) ** (-(dps - 8)) and ng < mp.mpf(10) ** (-(dps - 8)):
            break
        # Hessian of Lagrangian by central differences of analytic gradient
        H = mp.matrix(nf, nf)
        for a in range(nf):
            Xp = list(X); Xm = list(X)
            Xp[fr[a]] += h; Xm[fr[a]] -= h
            gp, _ = grad_lag(Xp, lam); gm, _ = grad_lag(Xm, lam)
            for b in range(nf):
                H[b, a] = (gp[b] - gm[b]) / (2 * h)
        # symmetrize
        for a in range(nf):
            for b in range(a + 1, nf):
                s = (H[a, b] + H[b, a]) / 2; H[a, b] = s; H[b, a] = s
        Jf = mp.matrix([[J[i][fr[a]] for a in range(nf)] for i in range(m)])
        K = mp.matrix(nf + m, nf + m)
        for a in range(nf):
            for b in range(nf):
                K[a, b] = H[a, b]
            for i in range(m):
                K[a, nf + i] = -Jf[i, a]
                K[nf + i, a] = Jf[i, a]
        rhs = mp.matrix(nf + m, 1)
        for a in range(nf):
            rhs[a] = -g[a]
        for i in range(m):
            rhs[nf + i] = -R[i]
        d = mp.lu_solve(K, rhs)
        for a in range(nf):
            X[fr[a]] += d[a]
        for i in range(m):
            lam[i] += d[nf + i]
    return X, lam, hist


def reduced_hessian(X, lam, N, j0, j1, h=None):
    """Eigenvalues of the Lagrangian Hessian restricted to null(J_free) (orthonormal basis)."""
    dps = mp.mp.dps
    if h is None:
        h = mp.mpf(10) ** (-(dps // 2))
    fr = free_indices(N, j0, j1); nf = len(fr); m = 2 * N
    iki = fr.index(3 * N + 1)

    def grad_lag(Xc):
        J = jacobian(Xc, N)
        g = [-mp.fsum(lam[i] * J[i][fr[a]] for i in range(m)) for a in range(nf)]
        g[iki] += Xc[3 * N + 1] / 2
        return g, J
    g0, J = grad_lag(X)
    H = mp.matrix(nf, nf)
    for a in range(nf):
        Xp = list(X); Xm = list(X)
        Xp[fr[a]] += h; Xm[fr[a]] -= h
        gp, _ = grad_lag(Xp); gm, _ = grad_lag(Xm)
        for b in range(nf):
            H[b, a] = (gp[b] - gm[b]) / (2 * h)
    for a in range(nf):
        for b in range(a + 1, nf):
            s = (H[a, b] + H[b, a]) / 2; H[a, b] = s; H[b, a] = s
    Jf = mp.matrix([[J[i][fr[a]] for a in range(nf)] for i in range(m)])
    # null space via SVD of Jf
    U, S, V = mp.svd_r(Jf, full_matrices=True)
    # V rows are right singular vectors; rows beyond rank span null space
    svals = [S[i] for i in range(min(Jf.rows, Jf.cols))]
    rank = sum(1 for s in svals if s > mp.mpf(10) ** (-(dps // 3)))
    Z = mp.matrix(nf, nf - rank)
    for c in range(nf - rank):
        for a in range(nf):
            Z[a, c] = V[rank + c, a]
    Hr = Z.T * H * Z
    ev = mp.eigsy(Hr, eigvals_only=True)
    ev = sorted([ev[i] for i in range(len(ev))])
    return ev, svals, rank, max(abs(x) for x in g0)
