# Computation D (side result). Dependence of the cvPCA ranks 11-500 window bias on the tail signal-to-noise
# ratio.  Same logic as the independent check's snr_cv.py (copied in snr_cv_orig.py): stage-1 simulator,
# condition bpl1.5 (calibrated gains and rotation, realized signal window slope 1.497), aligned noise
# 0.75 x signal kept, the non-aligned noise (per-neuron isotropic + shared mode) variance divided by k.
# Only paths and the replicate count / seed are parameters here.  With R = 3 and seed 99 it reproduces the
# check's run exactly.  Output: out/snr_cv_seed<seed>.json
# Usage: python3 snr_cv.py R seed
import sys, os, json, time, zlib, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import sim, est
from common import ROOT, OUT

R, SEED = int(sys.argv[1]), int(sys.argv[2])
cond = 'bpl1.5'
kind, alpha = 'bpl', 1.5
seed = zlib.crc32(cond.encode()) % 100000
CAL = os.path.join(ROOT, 'data', 'calib_nat_MP032_0914.npz')
base = sim.calibrated(CAL, kind, alpha, r=0.75, seed=seed)
truth = np.load(os.path.join(ROOT, 'data', f'truth_{cond}.npy')); tw = est.window_slope(truth)
d = np.load(os.path.join(ROOT, 'data', f'sim_{cond}.npz'))
wd = 1 / np.std(np.log(np.clip(d['bjH'], 1e-300, None)), 0, ddof=1)
c = np.load(CAL)
rng = np.random.default_rng(SEED)
t0 = time.time()
print(f'{cond}: realized Sigma_S window slope {tw:.3f}; data cvPCA at 11/100/500 {np.round(c["cv"][[10,99,499]],2)}', flush=True)
out = dict(cond=cond, truth_window=tw, data_cv=c['cv'][[10, 99, 499]].tolist(), R=R, seed=SEED, levels={})
for k in (1, 4, 16):
    S = sim.Sim(base.lam, base.g, 0.75, base.v_ind / k, base.sig_iso / np.sqrt(k), n=base.n, seed=seed)
    ws, ms, cvs = [], [], []
    for rep in range(R):
        F = S.draw(rng); X = np.concatenate([F[0], F[1]], 0); del F
        G = (X @ X.T).astype(np.float64); del X
        cv = est.cvpca(est.center_blocks(G, S.n), S.n)
        H = est.eigmoments(G, S.n, 8)
        ws.append(est.window_slope(cv)); ms.append(est.meme_fit(H, S.N, wd, 'bpl')[0]); cvs.append(cv[[10, 99, 499]])
    ws, ms = np.array(ws), np.array(ms)
    out['levels'][str(k)] = dict(cv_window=ws.tolist(), meme_bpl=ms.tolist(), sim_cv_11_100_500=np.mean(cvs, 0).tolist())
    print(f' noise/{k:<2d}: cvPCA win {ws.mean():.3f} +/- {ws.std(ddof=1)/np.sqrt(R):.3f} SE (bias vs realized {ws.mean()-tw:+.3f}); '
          f'MEME-BPL {ms.mean():.3f} +/- {ms.std(ddof=1)/np.sqrt(R):.3f}; sim cvPCA at 11/100/500 {np.round(np.mean(cvs,0),2)} ({time.time()-t0:.0f}s)', flush=True)
    json.dump(out, open(f'{OUT}/snr_cv_seed{SEED}.json', 'w'), indent=1)
