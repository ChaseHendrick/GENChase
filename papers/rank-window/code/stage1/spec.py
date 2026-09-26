# Spectrum estimators and data loading for the Stringer 2019 smoothness-bound feasibility study.
# Work in the stimulus-Gram domain: every estimator here is a function of Gram matrices of the
# 2 x n_stim x N response array, so neuron resampling (by blocks) and stimulus resampling are cheap.
import numpy as np, scipy.io as sio, scipy.linalg as sl
from math import comb

# ----------------------------------------------------------------------------------------------
# loading and preprocessing (Stringer et al. 2019 pipeline: compileResps.m / loadProc2800.m)
# ----------------------------------------------------------------------------------------------
def load_stringer(fn, npc_spont=32, drop_red=True, mode='stringer'):
    """Return F (2, n_stim, N) float64 after preprocessing.
    mode 'stringer': z-score by spont mean/sd (ddof 0, +1e-6), project out top npc_spont spont PCs,
                     mean-center each neuron over all non-gray presentations, split into two repeats
                     (compute_means with nsplits=2, non-interleaved), red (GAD+) cells removed.
    mode 'raw':      Pospisil-Pillow: raw responses * 1e-3, no z-score, no spont projection, red cells kept
                     (their convert script keeps all cells), repeats = first and second presentation of the
                     first/second half of presentations."""
    d = sio.loadmat(fn, squeeze_me=True)
    st = d['stim']
    resp = st['resp'].item().astype(np.float64)
    spont = st['spont'].item().astype(np.float64)
    istim = st['istim'].item().astype(int)
    if mode == 'stringer' and drop_red and 'redcell' in d['stat'].dtype.names:
        red = np.array([bool(x) for x in d['stat']['redcell']])
        resp, spont = resp[:, ~red], spont[:, ~red]
    nimg = istim.max() - 1                      # istim == nimg+1 is the gray screen
    keep = istim <= nimg
    resp, istim = resp[keep], istim[keep]
    resp[np.isnan(resp)] = 0
    if mode == 'stringer':
        mu = spont.mean(0); sd = spont.std(0) + 1e-6
        resp = (resp - mu) / sd
        if npc_spont > 0:
            s0 = (spont - mu) / sd
            _, _, vt = np.linalg.svd(s0, full_matrices=False)
            V = vt[:npc_spont].T
            resp = resp - (resp @ V) @ V.T
        resp = resp - resp.mean(0)
    else:
        resp = resp * 1e-3
    N = resp.shape[1]
    F = np.full((2, nimg, N), np.nan)
    for i in range(1, nimg + 1):
        ist = np.nonzero(istim == i)[0]
        m = ist.size
        if m < 2:
            continue
        h = m // 2
        if mode == 'stringer':   # compute_means: inds = ceil(m*(k-1)/2) + (1:floor(m/2))
            i1 = ist[0:h]; i2 = ist[int(np.ceil(m / 2)):int(np.ceil(m / 2)) + h]
            F[0, i - 1] = resp[i1].mean(0); F[1, i - 1] = resp[i2].mean(0)
        else:                    # PP convert script: first presentation of each half
            F[0, i - 1] = resp[ist[:m // 2][:1]].mean(0); F[1, i - 1] = resp[ist[m // 2:][:1]].mean(0)
    ok = ~np.isnan(F[0, :, 0])
    return F[:, ok], d


# ----------------------------------------------------------------------------------------------
# Gram blocks
# ----------------------------------------------------------------------------------------------
class GramSet:
    """Holds per-neuron-block Grams of X = [F1; F2] (2n x N): Gb[b] = X[:, blk_b] X[:, blk_b]^T.
    A neuron-bootstrap replicate is a weighted sum of block Grams; a stimulus replicate is an index."""
    def __init__(self, F, nblocks=20, rng=None, store=np.float32):
        n = F.shape[1]; N = F.shape[2]
        rng = np.random.default_rng(0) if rng is None else rng
        perm = rng.permutation(N)
        self.blocks = np.array_split(perm, nblocks)
        X = np.concatenate([F[0], F[1]], 0)
        self.n = n; self.N = N; self.nb = nblocks
        self.Gb = np.empty((nblocks, 2 * n, 2 * n), store)
        for b, idx in enumerate(self.blocks):
            Xb = np.ascontiguousarray(X[:, idx])
            self.Gb[b] = Xb @ Xb.T
        self.Gfull = self.Gb.astype(np.float64).sum(0)

    def gram(self, wblock=None, sidx=None):
        G = self.Gfull if wblock is None else np.tensordot(wblock.astype(np.float64), self.Gb, axes=(0, 0))
        if sidx is not None:
            full = np.concatenate([sidx, sidx + self.n])
            G = G[np.ix_(full, full)]
        return G


def split_gram(G):
    n = G.shape[0] // 2
    return G[:n, :n], G[:n, n:], G[n:, :n], G[n:, n:]   # G11, G12, G21, G22


# ----------------------------------------------------------------------------------------------
# estimators (all take the 2n x 2n Gram of [F1;F2] with columns = neurons already mean-centered
# per repeat as the caller decides; spectra are per-stimulus variances, i.e. divided by n)
# ----------------------------------------------------------------------------------------------
def center_gram(G):
    """Double-center each repeat block over stimuli (equivalent to subtracting per-neuron mean
    within each repeat)."""
    n = G.shape[0] // 2
    H = np.eye(n) - 1.0 / n
    out = np.empty_like(G)
    for a in (0, 1):
        for b in (0, 1):
            out[a*n:(a+1)*n, b*n:(b+1)*n] = H @ G[a*n:(a+1)*n, b*n:(b+1)*n] @ H
    return out


def cvpca_gram(G, kmax=1024, both=True):
    """Stringer cvPCA: eigenvectors of the repeat-1 covariance, variance = cross-repeat covariance.
    In stimulus space: U = eigvecs of G11; lam_k = U_k^T G21 U_k / n.  both=True averages the
    estimate with the roles of the repeats exchanged (a deterministic stand-in for Stringer's 10
    random swaps)."""
    G11, G12, G21, G22 = split_gram(G)
    n = G11.shape[0]
    k = min(kmax, n - 1)
    out = []
    for A, C in ([(G11, G21), (G22, G12)] if both else [(G11, G21)]):
        w, U = np.linalg.eigh(A)
        U = U[:, ::-1][:, :k]
        out.append(np.einsum('ik,ij,jk->k', U, C, U) / n)
    return np.mean(out, 0)


def scc_gram(G, rng, nsplit=2, kmax=1024):
    """Split-stimulus cross-covariance spectrum (this study's estimator).
    For a random half A of stimuli: signal eigenvectors v_k = eigvecs of the symmetrized cross-repeat
    covariance C_A = (F1_A^T F2_A + F2_A^T F1_A)/(2 n_A)  (E C_A = Sigma_S: no noise bias).
    Evaluate on the other half B: lam_k = v_k^T C_B v_k (unbiased given v_k).  Roles of A and B are
    exchanged and nsplit random splits averaged.  Computed in the stimulus domain:
    with X_A = [F1_A; F2_A], K = X_A X_A^T, M = [[0, I],[I, 0]]/(2 n_A): C_A eigvecs v = X_A^T K^{-1/2} z,
    z eigvecs of K^{1/2} M K^{1/2}."""
    n = G.shape[0] // 2
    res = []
    for s in range(nsplit):
        perm = rng.permutation(n)
        halves = [perm[:n // 2], perm[n // 2: 2 * (n // 2)]]
        for A, B in ((halves[0], halves[1]), (halves[1], halves[0])):
            nA, nB = len(A), len(B)
            iA = np.concatenate([A, A + n]); iB1 = B; iB2 = B + n
            K = G[np.ix_(iA, iA)]
            wK, QK = np.linalg.eigh(K)
            wK = np.clip(wK, wK.max() * 1e-12, None)
            Kh = (QK * np.sqrt(wK)) @ QK.T
            Kmh = (QK / np.sqrt(wK)) @ QK.T
            M = np.zeros((2 * nA, 2 * nA)); M[:nA, nA:] = np.eye(nA); M[nA:, :nA] = np.eye(nA); M /= (2 * nA)
            S = Kh @ M @ Kh
            w, Z = np.linalg.eigh((S + S.T) / 2)
            k = min(kmax, nA - 1)
            Z = Z[:, ::-1][:, :k]
            Y = Kmh @ Z                           # v = X_A^T Y
            P1 = G[np.ix_(iB1, iA)] @ Y           # F1_B v   (nB x k)
            P2 = G[np.ix_(iB2, iA)] @ Y           # F2_B v
            P1 -= P1.mean(0); P2 -= P2.mean(0)
            res.append((P1 * P2).sum(0) / (nB - 1))
    return np.mean(res, 0)


def eigmoments_gram(G, kmom=10, rng=None, perm=None):
    """Pospisil-Pillow unbiased signal eigenmoments (Kong-Valiant U-statistic on the cross-repeat
    Gram, mean removed by pairwise differencing of stimuli).  Returns (1/N) tr(Sigma_S^p) style
    moments WITHOUT the 1/N (we return tr(Sigma_S^p)); caller divides by N if wanted.
    Pairing: consecutive stimuli (PP use odd minus even) or a random pairing if perm given."""
    n = G.shape[0] // 2
    idx = np.arange(n) if perm is None else perm
    m = n // 2
    a, b = idx[0:2*m:2], idx[1:2*m:2]
    G12 = G[:n, n:]
    # difference data Y_r = (F_r[a] - F_r[b])/sqrt2 ; A = Y1 Y2^T
    A = (G12[np.ix_(a, a)] - G12[np.ix_(a, b)] - G12[np.ix_(b, a)] + G12[np.ix_(b, b)]) / 2
    F = np.triu(A, 1)
    Fi = np.eye(m)
    H = []
    for p in range(kmom):
        H.append(np.sum(Fi * A.T) / comb(m, p + 1))
        Fi = Fi @ F
    return np.array(H)


# ----------------------------------------------------------------------------------------------
# spectra models and fits
# ----------------------------------------------------------------------------------------------
def bpl(n, logc, a1, a2, brk):
    n = np.asarray(n, float)
    return np.exp(np.where(n <= brk, logc - a1 * np.log(n), logc - a1 * np.log(brk) - a2 * (np.log(n) - np.log(brk))))


def window_slope(spec, lo, hi, weight=True):
    """Stringer get_powerlaw: weighted (1/n) LS of log|spec_n| on -log n over n in [lo, hi] (1-based)."""
    n = np.arange(lo, hi + 1).astype(float)
    y = np.log(np.abs(spec[lo - 1:hi]))
    x = np.stack([-np.log(n), np.ones_like(n)], 1)
    w = 1.0 / n if weight else np.ones_like(n)
    b = np.linalg.solve(x.T @ (x * w[:, None]), (x * w[:, None]).T @ y)
    return b[0]


# ----------------------------------------------------------------------------------------------
# weighted (bootstrap-ready) versions.  G is the UNCENTERED Gram of [F1; F2] (2n x 2n) over unique
# stimuli; w (n,) are stimulus multiplicities (ones for the plain estimate, bootstrap counts otherwise).
# ----------------------------------------------------------------------------------------------
def cgram(G, ra, wa, rb, wb):
    """Cross-Gram between row groups a and b, each centered by its own weighted mean."""
    Gab = G[np.ix_(ra, rb)]
    Wa, Wb = wa.sum(), wb.sum()
    ra_mean = (wa @ Gab) / Wa                 # (len rb,)
    rb_mean = (Gab @ wb) / Wb                 # (len ra,)
    tot = (wa @ Gab @ wb) / (Wa * Wb)
    return Gab - ra_mean[None, :] - rb_mean[:, None] + tot


def cvpca_w(G, w=None, kmax=1024, both=True):
    n = G.shape[0] // 2
    w = np.ones(n) if w is None else np.asarray(w, float)
    u = np.nonzero(w > 0)[0]; wu = w[u]; W = wu.sum()
    r1, r2 = u, u + n
    D = np.sqrt(wu)
    out = []
    pairs = [(r1, r2), (r2, r1)] if both else [(r1, r2)]
    for ra, rb in pairs:
        Gaa = cgram(G, ra, wu, ra, wu); Gba = cgram(G, rb, wu, ra, wu)
        A = D[:, None] * Gaa * D[None, :]
        ev, U = np.linalg.eigh((A + A.T) / 2)
        k = min(kmax, len(u) - 1)
        U = U[:, ::-1][:, :k]
        C = D[:, None] * Gba * D[None, :]
        out.append(np.einsum('ik,ij,jk->k', U, C, U) / (W - 1))
    return np.mean(out, 0)


def scc_w(G, rng, w=None, nsplit=1, kmax=1024, return_noise=False):
    """Split-stimulus cross-covariance spectrum with stimulus weights; halves are split by unique
    stimulus, so copies of a bootstrap-duplicated stimulus never straddle the two halves."""
    n = G.shape[0] // 2
    w = np.ones(n) if w is None else np.asarray(w, float)
    u = np.nonzero(w > 0)[0]
    res, nres = [], []
    for s in range(nsplit):
        perm = rng.permutation(u)
        h = len(perm) // 2
        halves = [np.sort(perm[:h]), np.sort(perm[h:])]
        for A, B in ((halves[0], halves[1]), (halves[1], halves[0])):
            wA, wB = w[A], w[B]
            rA = np.concatenate([A, A + n]); wAA = np.concatenate([wA, wA])
            # centered K over [F1_A; F2_A] rows, each repeat block centered by its own mean
            K = np.empty((2 * len(A), 2 * len(A)))
            nA = len(A)
            for i, ri in enumerate((A, A + n)):
                for j, rj in enumerate((A, A + n)):
                    K[i*nA:(i+1)*nA, j*nA:(j+1)*nA] = cgram(G, ri, wA, rj, wA)
            K = (K + K.T) / 2
            WA = wA.sum()
            M = np.zeros((2 * nA, 2 * nA))
            M[:nA, nA:] = np.diag(wA); M[nA:, :nA] = np.diag(wA); M /= 2 * (WA - 1)
            KMK = K @ M @ K
            KMK = (KMK + KMK.T) / 2
            K = K + np.eye(2 * nA) * (np.trace(K) / (2 * nA) * 1e-10)
            ev, Y = sl.eigh(KMK, K, driver='gvd')
            k = min(kmax, nA - 1)
            Y = Y[:, ::-1][:, :k]
            P = []
            for rb in (B, B + n):
                Cb = np.concatenate([cgram(G, rb, wB, A, wA), cgram(G, rb, wB, A + n, wA)], 1)
                P.append(Cb @ Y)
            WB = wB.sum()
            res.append((wB[:, None] * P[0] * P[1]).sum(0) / (WB - 1))
            if return_noise:
                Dp = (P[0] - P[1]) / np.sqrt(2)
                nres.append((wB[:, None] * Dp * Dp).sum(0) / (WB - 1))
    if return_noise:
        return np.mean(res, 0), np.mean(nres, 0)
    return np.mean(res, 0)
