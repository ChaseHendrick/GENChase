# Computation A3 (added in revision).  Three checks of the Matern results, per stimulus set:
#  white : the same codes in whitened coordinates (each image-PC coordinate scaled to unit variance), so that
#          all d parameters count equally; ell in units of the median pairwise distance of the whitened set.
#          Window exponents over ranks 11-500, 11-100 and 101-500.  Deterministic.
#  sub   : dependence on the stimulus count.  Random subsets of P = 1000, 1400, 2000 of the 2,800 stimuli
#          (4 subsets each, seed [20260926, 11, set index, P, j]); the code is unchanged (ell in units of the
#          median distance of the full set), so the subsets sample the same kernel operator.
#  kv    : the Kong-Valiant eigenmoment estimates p = 1..8 (est.eigmoments) that MEME would compute from
#          noise-free responses of the code at the 2,800 stimuli with infinitely many neurons: the cross-repeat
#          Gram of noise-free data is the kernel matrix K itself.  These estimate tr(Sigma^p) of the population
#          signal covariance over the stimulus distribution, which is what MEME targets (the padded
#          2,800-stimulus sample spectrum is not).  Deterministic given the stimuli (pairing in file order).
#  kvN   : (second revision) the same estimates for a finite population of N = 8,704 Gaussian-process neurons at
#          ell = 1/4, where the participation ratio is largest: the Gram matrix of their noise-free responses is
#          K_N = L W L^T with L L^T = K and W ~ Wishart(I, N)/N (Bartlett, seed [20260926, 13, set index], the same
#          W for every nu of a set).  E tr(Sigma_N^2) exceeds tr(T^2) by about PR/N in relative terms.
# Checkpoints: out/extra_parts/<set>_{white,sub,kv,kvN}.json.  Usage: python3 matern_extra.py PART [SET,SET,...]
import sys, os, json, time, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import est
from common import stim_files, coords, pdist_matrix, matern, centred_spectrum, window_slope, OUT, ELLS

from math import comb


def eigmoments_cross(G12, m, kmom=8):
    """est.eigmoments computed from the cross-repeat block G12 only (identical arithmetic)."""
    h = m // 2
    idx = np.arange(m)
    a, b = idx[0:2 * h:2], idx[1:2 * h:2]
    G12 = np.asarray(G12, dtype=np.float64)
    A = (G12[np.ix_(a, a)] - G12[np.ix_(a, b)] - G12[np.ix_(b, a)] + G12[np.ix_(b, b)]) / 2
    F = np.triu(A, 1); Fi = np.eye(h); H = []
    for p in range(kmom):
        H.append(np.sum(Fi * A.T) / comb(h, p + 1))
        Fi = Fi @ F
    return np.array(H)


_r = np.random.default_rng(0); _X = _r.standard_normal((80, 30)); _G = _X @ _X.T
assert np.allclose(eigmoments_cross(_G[:40, 40:], 40), est.eigmoments(_G, 40, 8))

PARTNAME = sys.argv[1]
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
D_OUT = f'{OUT}/extra_parts'; os.makedirs(D_OUT, exist_ok=True)
NUS_ALL = (0.5, 0.75, 1.0, 1.5, 2.5)
WHITE = [(nu, c) for nu in (0.75, 1.0) for c in ELLS] + [(nu, c) for nu in (0.5, 1.5, 2.5) for c in (0.25, 4.0)]
SUB = [(nu, c) for nu in (0.75, 1.0) for c in (1.0, 4.0, 8.0)]
PS, NSUB = (1000, 1400, 2000), 4
KV_NUS, KV_ELLS = (0.75, 1.0, 1.5), (0.25, 1.0, 4.0)     # restricted grid (machine load); covers every use in the note
KVN_ELLS = (0.25,)


def bartlett(rng, P, N):
    """Wishart(I_P, N)/N by the Bartlett decomposition (as in matern_finiteN.py)."""
    L = np.zeros((P, P))
    il = np.tril_indices(P, -1)
    L[il] = rng.standard_normal(len(il[0]))
    L[np.diag_indices(P)] = np.sqrt(rng.chisquare(N - np.arange(P)))
    return (L @ L.T) / N
t0 = time.time()
SETS = list(enumerate(stim_files()))
if os.environ.get('REVERSE') == '1':          # a second process can walk the sets from the other end
    SETS = SETS[::-1]
for si, (label, fn, d) in SETS:
    if ONLY and label not in ONLY:
        continue
    fo = f'{D_OUT}/{label}_{PARTNAME}.json'
    lock = fo + '.running'
    if os.path.exists(fo) or os.path.exists(lock):
        print(f'{label} {PARTNAME}: done', flush=True); continue
    open(lock, 'w').write(str(os.getpid()))
    Z, pcvar = coords(fn, d)
    out = {}
    if PARTNAME == 'white':
        Zw = Z / Z.std(0)[None, :]
        D = pdist_matrix(Zw); med = np.median(D[np.triu_indices(len(D), 1)])
        for nu, c in WHITE:
            ev = centred_spectrum(matern(D, nu, c * med))
            out[f'{nu}|{c}'] = dict(w11_500=window_slope(ev), w11_100=window_slope(ev, 11, 100),
                                    w101_500=window_slope(ev, 101, 500), r500=float(ev[499] / ev[0]))
            print(f'{label} white nu={nu} ell={c}: {out[f"{nu}|{c}"]["w11_500"]:.4f} ({time.time()-t0:.0f}s)', flush=True)
    elif PARTNAME == 'sub':
        D = pdist_matrix(Z); med = np.median(D[np.triu_indices(len(D), 1)])
        for nu, c in SUB:
            K = matern(D, nu, c * med)
            rec = {}
            for P in PS:
                vals = []
                for j in range(NSUB):
                    idx = np.random.default_rng([20260926, 11, si, P, j]).choice(len(K), P, replace=False)
                    vals.append(window_slope(centred_spectrum(K[np.ix_(idx, idx)])))
                rec[str(P)] = vals
            out[f'{nu}|{c}'] = rec
            print(f'{label} sub nu={nu} ell={c}: ' + ', '.join(f'P={P} {np.mean(v):.4f}' for P, v in rec.items())
                  + f' ({time.time()-t0:.0f}s)', flush=True)
    elif PARTNAME == 'kv':
        D = pdist_matrix(Z); med = np.median(D[np.triu_indices(len(D), 1)])
        m = len(D)
        for nu in KV_NUS:
            for c in KV_ELLS:
                K = matern(D, nu, c * med)
                H = eigmoments_cross(K, m, 8)          # noise-free: the cross-repeat Gram F1 F2^T is K
                out[f'{nu}|{c}'] = H.tolist()
                print(f'{label} kv nu={nu} ell={c}: H1 {H[0]:.4f} ({time.time()-t0:.0f}s)', flush=True)
    elif PARTNAME == 'kvN':
        D = pdist_matrix(Z); med = np.median(D[np.triu_indices(len(D), 1)])
        m = len(D); NN = 8704
        Wt = bartlett(np.random.default_rng([20260926, 13, si]), m, NN)
        for nu in KV_NUS:
            for c in KVN_ELLS:
                K = matern(D, nu, c * med)
                w, V = np.linalg.eigh(K)
                Lk = V * np.sqrt(np.clip(w, 0, None))[None, :]
                KN = Lk @ Wt @ Lk.T
                H = eigmoments_cross(KN, m, 8)
                out[f'{nu}|{c}'] = H.tolist()
                print(f'{label} kvN nu={nu} ell={c}: H1 {H[0]:.4f} H2 {H[1]:.4f} ({time.time()-t0:.0f}s)', flush=True)
    json.dump(out, open(fo, 'w'), indent=1)
    if os.path.exists(lock):
        os.remove(lock)
print('done')
