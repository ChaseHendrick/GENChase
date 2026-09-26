# Computation A2. Finite populations.  N neurons whose tuning curves are independent draws of the Gaussian
# process with the Matern kernel K, sampled at the P = 2800 stimuli and centred per neuron, have population
# spectrum eig(H F F^T H / (P N)).  Since H f_i ~ N(0, H K H), this spectrum is distributed exactly as
# eig(D^1/2 W D^1/2) with D the eigenvalues of H K H / P (from matern_window.py) and W ~ Wishart(I_P, N)/N,
# drawn here by the Bartlett decomposition.  Replicate r uses the same W for every kernel and every stimulus
# set (common random numbers; seed [20260926, 7, r]).
#
# Cells: nu = 1 at every length scale >= 1/4 and nu = 0.75 at ell = 2, 4, 8 on every set, and all nu at ell = 1/4, 1, 4 on
# 8D MP032 2017-08-10 and 4D MP032 2017-09-22.  Resumable and extendable: out/finiteN_parts/<set>.json holds
# every cell computed so far with its own replicate count; a rerun computes only the missing cells, with R
# replicates (replicates 0..R-1, so an added cell shares its W draws with the cells already there).
# The first run (2026-09-26 morning) computed nu = 1 at 1/4, 1, 4 on all sets and all nu at those ell on the
# two sets with R = 20; the revision added the remaining cells with R = 5 (the between-population SD is 0.0013).
# Usage: python3 matern_finiteN.py R [N [SET,SET,...]]      (writes the combined out/matern_finiteN.json)
import sys, os, json, time, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from common import window_slope, stim_files, OUT

R = int(sys.argv[1]); NN = int(sys.argv[2]) if len(sys.argv) > 2 else 8704
ONLY = sys.argv[3].split(',') if len(sys.argv) > 3 else None
P = 2800
EXTRA = ('8D_MP032_0810', '4D_MP032_0922')
PART = f'{OUT}/finiteN_parts'; os.makedirs(PART, exist_ok=True)


def keys_for(label):
    k = [f'{label}|1.0|{c}' for c in (0.25, 0.5, 1.0, 2.0, 4.0, 8.0)] + [f'{label}|0.75|{c}' for c in (2.0, 4.0, 8.0)]
    if label in EXTRA:
        k += [f'{label}|{nu}|{c}' for nu in (0.5, 1.5, 2.5) for c in (0.25, 1.0, 4.0)]
    return k


def bartlett(rng, P, N):
    L = np.zeros((P, P))
    il = np.tril_indices(P, -1)
    L[il] = rng.standard_normal(len(il[0]))
    L[np.diag_indices(P)] = np.sqrt(rng.chisquare(N - np.arange(P)))
    return (L @ L.T) / N


# self-test of the sampler: E[W] = I
_r = np.random.default_rng(1)
_W = np.mean([bartlett(_r, 6, 20) for _ in range(4000)], 0)
assert np.allclose(_W, np.eye(6), atol=0.05), _W


def summarize(v, w_inf):
    v = list(map(float, v))
    return dict(w_inf=float(w_inf), vals=v, R=len(v), mean=float(np.mean(v)), sd=float(np.std(v, ddof=1)),
                q025=float(np.percentile(v, 2.5)), q975=float(np.percentile(v, 97.5)))


t0 = time.time()
for label, _, d in stim_files():
    if ONLY and label not in ONLY:
        continue
    fo = f'{PART}/{label}.json'
    old = json.load(open(fo))['res'] if os.path.exists(fo) else {}
    todo = [k for k in keys_for(label) if k not in old]
    if not todo:
        print(f'{label}: complete', flush=True); continue
    with np.load(f'{OUT}/matern_parts/{label}.npz') as z:
        sp = {k: np.array(z[k]) for k in todo}
    D = {k: np.sqrt(np.clip(sp[k], 0, None)) for k in todo}
    res = {k: [] for k in todo}
    for r in range(R):
        W = bartlett(np.random.default_rng([20260926, 7, r]), P, NN)
        for k in todo:
            s = D[k]
            res[k].append(window_slope(np.linalg.eigvalsh(s[:, None] * W * s[None, :])[::-1]))
        print(f'{label} rep {r} ({time.time()-t0:.0f}s)', flush=True)
    for k in todo:
        old[k] = summarize(res[k], window_slope(sp[k]))
        v = old[k]
        print(f'{k:24s} N=inf {v["w_inf"]:.3f}  N={NN}: mean {v["mean"]:.4f} sd {v["sd"]:.4f} '
              f'[{v["q025"]:.4f}, {v["q975"]:.4f}]  shift {v["mean"]-v["w_inf"]:+.4f}', flush=True)
    json.dump(dict(N=NN, res=old), open(fo, 'w'), indent=1)
allres = {}
for label, _, d in stim_files():
    fo = f'{PART}/{label}.json'
    if os.path.exists(fo):
        for k, v in json.load(open(fo))['res'].items():
            v.setdefault('R', len(v['vals']))
            allres[k] = v
json.dump(dict(N=NN, P=P, res=allres), open(f'{OUT}/matern_finiteN.json', 'w'), indent=1)
print('done')
