# Estimators for the smoothness-bound feasibility study (stage 1, simulation only).
# Everything works on Gram matrices of the stacked two-repeat data X = [F1; F2] (2m x N), so a bootstrap
# over stimuli is an index and a bootstrap over neurons is a weighted sum of neuron-block Grams.
#   cvPCA  : Stringer et al. 2019 (eigvecs of repeat-1 covariance, cross-repeat variance), averaged over
#            the two repeat orders.
#   SCC-RR : this study's bias-corrected cross-covariance estimator.  On a random half A of the stimuli,
#            the symmetrized cross-repeat covariance C_A = S^T S - D^T D (S = repeat mean, D = half repeat
#            difference) is an unbiased estimate of the signal covariance; its eigenvectors are found by
#            Rayleigh-Ritz in the row space of S; each eigenvector's signal variance is then evaluated on the
#            held-out half B by the cross-repeat covariance (unbiased given the eigenvector).  Roles swapped
#            and averaged.
#   MEME   : Pospisil and Pillow 2025: Kong-Valiant unbiased signal eigenmoments (stimulus pairs differenced,
#            cross-repeat), power law / broken power law fitted to them.  Deviation: log-moments with a
#            diagonal bootstrap weight instead of their full whitening matrix from ~1000 bootstrap draws.
import numpy as np, scipy.linalg as sl
from scipy.optimize import least_squares
from math import comb

KMAX = 1000


def center_blocks(G, m):
    """Center each (repeat a, repeat b) block over stimuli (per-neuron mean removed within each repeat)."""
    G = G.astype(np.float64, copy=True)
    for a in (0, 1):
        for b in (0, 1):
            B = G[a*m:(a+1)*m, b*m:(b+1)*m]
            r = B.mean(1, keepdims=True); c = B.mean(0, keepdims=True)
            G[a*m:(a+1)*m, b*m:(b+1)*m] = B - r - c + B.mean()
    return G


def top_eigh(A, k):
    n = A.shape[0]; k = min(k, n - 1)
    w, U = sl.eigh(A.astype(np.float32), subset_by_index=[n - k, n - 1], driver='evr', check_finite=False)
    return w[::-1].astype(np.float64), U[:, ::-1].astype(np.float64)


def cvpca(Gc, m, k=KMAX):
    out = []
    for (a, b) in ((0, 1), (1, 0)):
        Aa = Gc[a*m:(a+1)*m, a*m:(a+1)*m]; Cba = Gc[b*m:(b+1)*m, a*m:(a+1)*m]
        _, U = top_eigh((Aa + Aa.T) / 2, k)
        out.append(np.einsum('ik,ij,jk->k', U, Cba, U) / (m - 1))
    return np.mean(out, 0)


def scc_rr(G, m, gid, rng, k=KMAX):
    """G: UNcentered Gram of [F1; F2] (2m x 2m) for the (possibly bootstrap-duplicated) rows; gid: unique
    stimulus id of each row, so all copies of a stimulus fall in the same half."""
    ids = np.unique(gid); perm = rng.permutation(ids); h = len(perm) // 2
    inA = np.isin(gid, perm[:h])
    halves = [np.nonzero(inA)[0], np.nonzero(~inA)[0]]
    res = []
    for A, B in ((halves[0], halves[1]), (halves[1], halves[0])):
        nA, nB = len(A), len(B)
        def blk(r1, rows1, r2, rows2):
            return G[np.ix_(rows1 + r1 * m, rows2 + r2 * m)]
        # centered cross Grams (each group of rows centered by its own mean)
        def cc(X):
            return X - X.mean(1, keepdims=True) - X.mean(0, keepdims=True) + X.mean()
        G11 = cc(blk(0, A, 0, A)); G12 = cc(blk(0, A, 1, A)); G21 = cc(blk(1, A, 0, A)); G22 = cc(blk(1, A, 1, A))
        Kss = (G11 + G12 + G21 + G22) / 4          # S S^T
        Kds = (G11 + G12 - G21 - G22) / 4          # D S^T
        w, U = np.linalg.eigh((Kss + Kss.T) / 2)
        keep = w > w.max() * 1e-9
        w, U = w[keep], U[:, keep]
        s = np.sqrt(w)
        T = (Kds @ U) / s[None, :]                 # D V   (nA x r)
        M = np.diag(w) - T.T @ T                   # V^T (S^T S - D^T D) V
        ev, Q = np.linalg.eigh((M + M.T) / 2)
        o = np.argsort(ev)[::-1][:min(k, len(ev))]
        Y = (U / s[None, :]) @ Q[:, o]             # v = S^T Y
        # evaluate on B: F_r,B v = F_r,B S^T Y = (F_r,B F1_A^T + F_r,B F2_A^T)/2 Y   (centered)
        P = []
        for r in (0, 1):
            C = (cc(blk(r, B, 0, A)) + cc(blk(r, B, 1, A))) / 2
            P.append(C @ Y)
        res.append((P[0] * P[1]).sum(0) / (nB - 1))
    L = min(len(x) for x in res)
    return np.mean([x[:L] for x in res], 0)


def eigmoments(G, m, kmom=8, perm=None):
    """PP / Kong-Valiant: unbiased tr(Sigma_S^p), p = 1..kmom, from the UNcentered Gram."""
    idx = np.arange(m) if perm is None else perm
    h = m // 2
    a, b = idx[0:2*h:2], idx[1:2*h:2]
    G12 = G[:m, m:].astype(np.float64)
    A = (G12[np.ix_(a, a)] - G12[np.ix_(a, b)] - G12[np.ix_(b, a)] + G12[np.ix_(b, b)]) / 2
    F = np.triu(A, 1); Fi = np.eye(h); H = []
    for p in range(kmom):
        H.append(np.sum(Fi * A.T) / comb(h, p + 1))
        Fi = Fi @ F
    return np.array(H)


# ------------------------------------------------------------------------------------------------ fits
def window_slope(s, lo=11, hi=500):
    """Stringer get_powerlaw: 1/n-weighted LS of log|s_n| on -log n, n in [lo, hi] (1-based)."""
    n = np.arange(lo, hi + 1).astype(float)
    y = np.log(np.abs(s[lo - 1:hi]))
    x = np.stack([-np.log(n), np.ones_like(n)], 1); w = 1.0 / n
    b = np.linalg.solve(x.T @ (x * w[:, None]), (x * w[:, None]).T @ y)
    return b[0]


BREAKS = np.array([3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50], float)


def ml_bpl(s, var, nmax=500):
    """Gaussian ML broken power law on log s_n, n = 1..nmax, per-rank variance var (from the bootstrap);
    ranks with s_n <= 0 or non-finite var are dropped.  Continuous at the break; break profiled over BREAKS.
    Returns (alpha_tail, alpha_head, break, -2 log L, n_used)."""
    n = np.arange(1, nmax + 1).astype(float)
    ok = (s[:nmax] > 0) & np.isfinite(var[:nmax]) & (var[:nmax] > 0)
    y = np.log(s[:nmax][ok]); ln = np.log(n[ok]); w = 1.0 / var[:nmax][ok]
    best = None
    for b in BREAKS:
        lb = np.log(b)
        X = np.stack([np.ones_like(ln), -np.minimum(ln, lb), -np.maximum(ln - lb, 0)], 1)
        beta = np.linalg.solve(X.T @ (X * w[:, None]), (X * w[:, None]).T @ y)
        rss = np.sum(w * (y - X @ beta) ** 2)
        if best is None or rss < best[3]:
            best = (beta[2], beta[1], b, rss)
    return best + (int(ok.sum()),)


def ml_pl(s, var, lo=1, nmax=500):
    n = np.arange(1, nmax + 1).astype(float)
    ok = (s[:nmax] > 0) & np.isfinite(var[:nmax]) & (var[:nmax] > 0) & (n >= lo)
    y = np.log(s[:nmax][ok]); ln = np.log(n[ok]); w = 1.0 / var[:nmax][ok]
    X = np.stack([np.ones_like(ln), -ln], 1)
    beta = np.linalg.solve(X.T @ (X * w[:, None]), (X * w[:, None]).T @ y)
    return beta[1], np.sum(w * (y - X @ beta) ** 2)


def _bpl_log(logc, a1, a2, b, ind):
    ln = np.log(ind); lb = np.log(b)
    return logc - a1 * np.minimum(ln, lb) - a2 * np.maximum(ln - lb, 0)


def meme_fit(H, N, wdiag, kind='bpl'):
    """Fit PL or BPL spectra over N indices to log eigenmoments (weights 1/sd of log moment)."""
    ind = np.arange(1, N + 1, dtype=float)
    Hc = np.clip(H, 1e-300, None); y = np.log(Hc); K = len(H)
    good = H > 0
    def moms(lam):
        return np.log(np.array([np.sum(lam ** (p + 1)) for p in range(K)]))
    if kind == 'pl':
        def r(x):
            lam = np.exp(x[0] - x[1] * np.log(ind))
            return ((moms(lam) - y) * wdiag)[good]
        x0 = [np.log(max(H[0], 1e-6) / np.sum(ind ** -1.0)), 1.0]
        best = None
        for a0 in (0.6, 1.0, 1.5):
            x0 = [np.log(max(H[0], 1e-6) / np.sum(ind ** -a0)), a0]
            rr = least_squares(r, x0, bounds=([-np.inf, 0.05], [np.inf, 5]), method='trf')
            if best is None or rr.cost < best.cost:
                best = rr
        return best.x[1], np.nan, np.nan, 2 * best.cost
    best = None
    for b in (4, 6, 8, 10, 12, 15, 20, 30):
        def r(x):
            lam = np.exp(_bpl_log(x[0], x[1], x[2], b, ind))
            return ((moms(lam) - y) * wdiag)[good]
        for a2 in (1.0, 1.5):
            x0 = [np.log(max(H[0], 1e-6) / (np.sum(np.minimum(ind, b) ** -0.5 * np.maximum(ind / b, 1) ** -a2))), 0.5, a2]
            rr = least_squares(r, x0, bounds=([-np.inf, 0.0, 0.05], [np.inf, 5, 6]), method='trf')
            if best is None or rr.cost < best[0].cost:
                best = (rr, b)
    rr, b = best
    return rr.x[2], rr.x[1], b, 2 * rr.cost
