# Check of the single-precision steps (third report, S5).  The simulator draws responses in float32
# (sim.Sim.draw), the cross-repeat Gram products of meme_sim.py and snr_cv.py are formed in float32, and cvPCA uses
# a float32 eigendecomposition (est.top_eigh).  This program redoes selected data sets with the same random draws
# in float64 throughout and records how much the results move.
#   MEME: base data sets 0, 20 and 99 (seed [20260926, r], as meme_sim.py).  The float32 path must reproduce the
#     stored eigenmoments of out/meme_sim_*.npz to a relative 1e-12 (asserted; the last bit of a float64 sum can
#     differ with the BLAS threading).  Compared: log eigenmoments p = 1..8, the
#     whitened shift |W dlog|^2, and the refitted alpha2 and misfit with diagonal weights and with full whitening
#     (weights from base data sets 20-99, as for the paired analysis in meme_analyze.py).
#   cvPCA: one replicate at the calibrated noise and one with the non-aligned noise divided by 16 (seed 99, as
#     snr_cv.py; the first reproduces the first replicate of out/snr_cv_seed99.json to 1e-9, asserted), ranks
#     11-500 window exponent with a float32 and with a float64 Gram matrix and eigendecomposition.
# Needs data/calib_nat_MP032_0914.npz (README, Inputs; or NOTE_DATA).  Output: out/precision.json.
# Usage: python3 precision_check.py
import sys, os, json, time, zlib, numpy as np, scipy.fft as sf, scipy.linalg as sl
sys.path.insert(0, os.path.dirname(__file__))
import sim, est
from tails import N, variants
from common import DATA, OUT
from math import comb
from scipy.optimize import least_squares

SEED = 20260926
c = np.load(os.path.join(DATA, 'calib_nat_MP032_0914.npz'))
sig, noi = c['sig'], c['noi']
r_al, v_ind = 0.75, 590.0
iso = np.clip(noi - r_al * np.clip(sig, 0, None) - v_ind / N, 0.1, None)   # as meme_sim.py
L = lambda H: np.log(np.clip(H, 1e-300, None))


def eigmoments_cross(G12, m, kmom=8):
    """As meme_sim.eigmoments_cross (the product G12 is formed by the caller, in either precision)."""
    h = m // 2
    idx = np.arange(m)
    a, b = idx[0:2 * h:2], idx[1:2 * h:2]
    G12 = G12.astype(np.float64)
    A = (G12[np.ix_(a, a)] - G12[np.ix_(a, b)] - G12[np.ix_(b, a)] + G12[np.ix_(b, b)]) / 2
    F = np.triu(A, 1); Fi = np.eye(h); H = []
    for p in range(kmom):
        H.append(np.sum(Fi * A.T) / comb(h, p + 1))
        Fi = Fi @ F
    return np.array(H)


def draw64(S, rng):
    """The random stream of sim.Sim.draw (float32 normals, cast), with every operation after it in float64."""
    n, N_ = S.n, S.N; f32 = np.float32
    signs = [s.astype(np.float64) for s in S.signs]; w = S.w.astype(np.float64)

    def rot(Y):
        for s in signs:
            Y = sf.dct(Y * s, type=2, norm='ortho', axis=1)
        return Y
    sl_ = np.sqrt(S.lam); g = S.g
    S_ = rot(rng.standard_normal((n, N_), dtype=f32).astype(np.float64) * sl_) * g
    F = np.empty((2, n, N_))
    sa = np.sqrt(S.r * S.lam); si = S.sig_iso
    for rep in range(2):
        E = rot(rng.standard_normal((n, N_), dtype=f32).astype(np.float64) * sa) * g
        E += np.outer(rng.standard_normal(n).astype(f32).astype(np.float64) * np.sqrt(S.v_ind), w)
        E += rng.standard_normal((n, N_), dtype=f32).astype(np.float64) * si
        F[rep] = S_ + E
    return F


def diag_w(Hset):                      # as meme_analyze.py
    return 1 / L(Hset).std(0, ddof=1)


def full_w(Hset):                      # as meme_analyze.py
    C = np.cov(L(Hset), rowvar=False)
    w, U = np.linalg.eigh(C)
    return (U / np.sqrt(w)) @ U.T


def meme_fit_full(H, W):               # as meme_analyze.meme_fit_full
    ind = np.arange(1, N + 1, dtype=float); y = L(H); K = len(H)

    def moms(lam):
        return np.log(np.array([np.sum(lam ** (p + 1)) for p in range(K)]))
    best = None
    for b in (4, 6, 8, 10, 12, 15, 20, 30):
        def r(x):
            lam = np.exp(est._bpl_log(x[0], x[1], x[2], b, ind))
            return W @ (moms(lam) - y)
        for a2 in (1.0, 1.5):
            x0 = [np.log(max(H[0], 1e-6) / (np.sum(np.minimum(ind, b) ** -0.5 * np.maximum(ind / b, 1) ** -a2))), 0.5, a2]
            rr = least_squares(r, x0, bounds=([-np.inf, 0.0, 0.05], [np.inf, 5, 6]), method='trf')
            if best is None or rr.cost < best[0].cost:
                best = (rr, b)
    rr, b = best
    return rr.x[2], 2 * rr.cost


def fit(H, how, w):
    if how == 'diag':
        a, _, _, cst = est.meme_fit(H, N, w, 'bpl')
        return a, cst
    return meme_fit_full(H, w)


H0 = np.load(f'{OUT}/meme_sim_0_19.npz')['H'][:, 0]
Hb = np.load(f'{OUT}/meme_sim_base_20_99.npz')['H'][:, 0]
wd, Wf = diag_w(Hb), full_w(Hb)
out = dict(meme={}, cvpca={})
t0 = time.time()
for r in (0, 20, 99):
    S = sim.Sim(variants(1.25)['base'], np.ones(N), r_al, v_ind, np.sqrt(iso), n=2800, seed=SEED)
    F = S.draw(np.random.default_rng([SEED, r]))
    Ha = eigmoments_cross(F[0] @ F[1].T, S.n)                                         # as meme_sim.py
    Hg = eigmoments_cross(F[0].astype(np.float64) @ F[1].T.astype(np.float64), S.n)   # float64 Gram only
    del F
    F = draw64(S, np.random.default_rng([SEED, r]))
    Hc = eigmoments_cross(F[0] @ F[1].T, S.n); del F                                  # float64 throughout
    stored = H0[r] if r < 20 else Hb[r - 20]
    rep_err = float(np.max(np.abs(Ha / stored - 1)))
    assert rep_err < 1e-12, f'data set {r}: the float32 path does not reproduce the stored moments ({rep_err:.1e})'
    dl = L(Hc) - L(Ha)
    row = dict(reproduce_rel=rep_err, dlog_gram=float(np.max(np.abs(L(Hg) - L(Ha)))), dlog_all=float(np.max(np.abs(dl))),
               white_shift=float(np.sum((Wf @ dl) ** 2)), diag_shift=float(np.sum((wd * dl) ** 2)))
    for how, W in (('diag', wd), ('full', Wf)):
        (a32, c32), (a64, c64) = fit(Ha, how, W), fit(Hc, how, W)
        row[how] = dict(alpha2_f32=a32, alpha2_f64=a64, misfit_f32=c32, misfit_f64=c64)
    out['meme'][str(r)] = row
    print(f'MEME data set {r}: reproduces the stored moments to {rep_err:.1e} (relative); max |dlog| Gram only {row["dlog_gram"]:.1e}, all {row["dlog_all"]:.1e}; '
          f'|W dlog|^2 {row["white_shift"]:.1e}; ' + '; '.join(
              f'{h}: alpha2 {row[h]["alpha2_f32"]:.6f} -> {row[h]["alpha2_f64"]:.6f}, misfit {row[h]["misfit_f32"]:.6f} -> '
              f'{row[h]["misfit_f64"]:.6f}' for h in ('diag', 'full')) + f' ({time.time() - t0:.0f}s)', flush=True)


def cvpca64(Gc, m, k=est.KMAX):
    """est.cvpca with a float64 eigendecomposition."""
    res = []
    for (a, b) in ((0, 1), (1, 0)):
        Aa = Gc[a * m:(a + 1) * m, a * m:(a + 1) * m]; Cba = Gc[b * m:(b + 1) * m, a * m:(a + 1) * m]
        n_ = Aa.shape[0]; kk = min(k, n_ - 1)
        _, U = sl.eigh((Aa + Aa.T) / 2, subset_by_index=[n_ - kk, n_ - 1], driver='evr', check_finite=False)
        U = U[:, ::-1]
        res.append(np.einsum('ik,ij,jk->k', U, Cba, U) / (m - 1))
    return np.mean(res, 0)


cond = 'bpl1.5'
seed = zlib.crc32(cond.encode()) % 100000                                 # as snr_cv.py
base = sim.calibrated(os.path.join(DATA, 'calib_nat_MP032_0914.npz'), 'bpl', 1.5, r=0.75, seed=seed)
ref = json.load(open(f'{OUT}/snr_cv_seed99.json'))['levels']['1']['cv_window'][0]
rng = np.random.default_rng(99)
for k in (1, 16):
    S = sim.Sim(base.lam, base.g, 0.75, base.v_ind / k, base.sig_iso / np.sqrt(k), n=base.n, seed=seed)
    F = S.draw(rng); X = np.concatenate([F[0], F[1]], 0); del F
    G32 = (X @ X.T).astype(np.float64)                                    # as snr_cv.py
    X64 = X.astype(np.float64); del X
    G64 = X64 @ X64.T; del X64
    wA = est.window_slope(est.cvpca(est.center_blocks(G32, S.n), S.n))
    wB = est.window_slope(cvpca64(est.center_blocks(G64, S.n), S.n))
    if k == 1:
        assert abs(wA - ref) < 1e-9, f'cvPCA float32 path {wA} does not reproduce out/snr_cv_seed99.json ({ref})'
    out['cvpca'][str(k)] = dict(window_f32=wA, window_f64=wB, reproduce_abs=abs(wA - ref) if k == 1 else None)
    print(f'cvPCA noise/{k}: window float32 {wA:.7f}, float64 {wB:.7f}, difference {wB - wA:+.1e} ({time.time() - t0:.0f}s)', flush=True)
json.dump(out, open(f'{OUT}/precision.json', 'w'), indent=1)
print('written', f'{OUT}/precision.json')
