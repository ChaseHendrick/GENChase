# Stage-1 simulation: bias, bootstrap calibration and power of tail-exponent estimators at the size of the
# Stringer 2019 recordings (2,800 stimuli x 2 repeats, N and noise calibrated on the natural-image recording
# M170714_MP032 2017-09-14).  Usage: python3 run_sim.py R BJ BS cond [cond ...]
#   cond: pl1.0 pl1.25 pl1.5 pl2.0 bpl1.25 bpl1.5 (noise aligned with signal, r = 0.75) or suffix _r0
#   (noise independent of signal).  R replicates (independent stimuli + noise, fixed neurons); on replicate 0,
#   BJ joint (stimulus + neuron-block) and BS stimulus-only bootstrap draws.
import sys, time, zlib, numpy as np
sys.path.insert(0, '.')
import sim, est

R, BJ, BS = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
CAL = 'out/calib_nat_MP032_0914.npz'
NB = 8


def pad(x, L=1000):
    x = np.asarray(x, float)[:L]
    return np.concatenate([x, np.full(L - len(x), np.nan)])


def parse(c):
    r = 0.0 if c.endswith('_r0') else 0.75
    base = c.replace('_r0', '')
    kind = 'bpl' if base.startswith('bpl') else 'pl'
    return kind, float(base[len(kind):]), r


def spectra(G, n, gid, rng):
    Gc = est.center_blocks(G, n)
    cv = est.cvpca(Gc, n)
    sc = est.scc_rr(G, n, gid, rng)
    H = est.eigmoments(G, n, 8)
    return cv, sc, H


for cond in sys.argv[4:]:
    t0 = time.time()
    kind, alpha, r = parse(cond)
    seed = zlib.crc32(cond.encode()) % 100000
    S = sim.calibrated(CAL, kind, alpha, r=r, seed=seed)
    n, N = S.n, S.N
    # truth: eigenvalues of Sigma_S = G R^T Lam R G
    import os
    tf = f'out/truth_{cond}.npy'
    if os.path.exists(tf):
        truth = np.load(tf)
    else:
        M = S.rot(np.diag(np.sqrt(S.lam)).astype(np.float32)) * S.g.astype(np.float32)
        C = M @ M.T; del M
        truth = np.linalg.eigvalsh(C)[::-1][:1500].astype(np.float64); del C
        np.save(tf, truth)
    print(f'{cond}: N={N} truth window slope {est.window_slope(truth):.3f} ({time.time()-t0:.0f}s)', flush=True)
    rng = np.random.default_rng(seed + 7)
    CV, SC, HH = [], [], []
    boot = {'joint': [[], [], []], 'stim': [[], [], []]}
    for rep in range(R):
        F = S.draw(rng)
        X = np.concatenate([F[0], F[1]], 0); del F
        perm = rng.permutation(N); blocks = np.array_split(perm, NB)
        Gb = np.empty((NB, 2 * n, 2 * n), np.float32)
        for b, idx in enumerate(blocks):
            Xb = np.ascontiguousarray(X[:, idx]); Gb[b] = Xb @ Xb.T
        del X
        G = Gb.sum(0, dtype=np.float64)
        cv, sc, H = spectra(G, n, np.arange(n), rng)
        CV.append(pad(cv)); SC.append(pad(sc)); HH.append(H)
        if rep == 0:
            for typ, B in (('joint', BJ), ('stim', BS)):
                for j in range(B):
                    wb = rng.multinomial(NB, np.ones(NB) / NB).astype(np.float32) if typ == 'joint' else np.ones(NB, np.float32)
                    Gw = np.tensordot(wb, Gb, axes=1)
                    idx = rng.integers(0, n, n)
                    full = np.concatenate([idx, idx + n])
                    Gx = Gw[np.ix_(full, full)].astype(np.float64); del Gw
                    out = spectra(Gx, n, idx, rng)
                    for k in range(3):
                        boot[typ][k].append(pad(out[k]) if k < 2 else out[k])
                print(f'  {cond} rep0 {typ} bootstrap {B} draws done ({time.time()-t0:.0f}s)', flush=True)
        del Gb, G
        print(f'  {cond} rep {rep} ({time.time()-t0:.0f}s): win cv {est.window_slope(cv):.3f} scc {est.window_slope(sc):.3f}', flush=True)
        np.savez(f'out/sim_{cond}.npz', truth=truth, lam=S.lam, CV=np.array(CV), SC=np.array(SC), HH=np.array(HH),
                 bjCV=np.array(boot['joint'][0]), bjSC=np.array(boot['joint'][1]), bjH=np.array(boot['joint'][2]),
                 bsCV=np.array(boot['stim'][0]), bsSC=np.array(boot['stim'][1]), bsH=np.array(boot['stim'][2]),
                 alpha=alpha, r=r, kind=kind, N=N, n=n)
    print(f'{cond} done ({time.time()-t0:.0f}s)', flush=True)
