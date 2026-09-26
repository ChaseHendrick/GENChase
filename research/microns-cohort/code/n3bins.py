# Checker's sensitivity: the N3 null with the laminar conditioning at a different depth resolution (NBIN equal-count
# postsynaptic depth bins from the MAIN data's postsynaptic depths), using the author's cx.py unchanged otherwise.
# usage: python3 n3bins.py <tag main|new1822|ding1822> <nbin> <ndraw> <fam dt|iv> [configs, default N3]
import sys, json, time, numpy as np
import cx
tag, nbin, ndraw, fam = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
configs = sys.argv[5].split(',') if len(sys.argv) > 5 else ['N3']
t0 = time.time()
cx.NBIN = nbin
dsm = cx.load_real('main')                      # main: bins recomputed at nbin from its own postsynaptic depths
edges = np.quantile(dsm['jxyz'][:, 1], np.linspace(0, 1, nbin + 1)[1:-1])
ds = dsm if tag == 'main' else cx.finish(cx.load_real(tag), edges=edges)
assert np.allclose(ds['bin_edges'], edges)
G3 = np.asarray(cx.stack_measures(ds, ds['wdir'] + '/G3.npy'))[:2]
cp = cx.Copies(ds, np.ones(ds['npre'], np.int64), np.ones(ds['J'], np.int64))
obs = cx.rho_obs(cp.elig, cp.gsyn_ptr, cp.gsyn, cp.syn_p, cp.pc_node, G3)
res = {'tag': tag, 'nbin': nbin, 'edges': edges.tolist(), 'n_elig': int(len(cp.elig))}
for c in configs:
    m = cx.Model(ds, fam, c); b, eta, info = m.fit(ds, np.ones(len(ds['y'])))
    chains = []; pooled = []
    for k in range(2):
        nul, tr, st = cx.run_null(m, cp, eta, G3, seed=20260926 + 101 * k, ndraw=ndraw, nburn=300, thin=3, keep_trace=True)
        chains.append(nul); pooled.append(np.nanmean(tr[:, :, 0], 1))
    nul = np.nanmean(np.stack(chains), 0); s = cx.excess_summary(cp, obs, nul)
    csd = float(np.std(np.concatenate(pooled), ddof=1))
    res[c] = {'sil': s['sil:all'], 'viv': s['viv:all'], 'per_proj_sil': [s[f'sil:{p}'] for p in cx.PROJ], 'cond_sd_sil': csd,
              'z_cond_sil': s['sil:all'] / csd, 'fit_iters': info['iters'],
              'chain_diff_sil': float(np.nanmean(obs[:, 0] - chains[0][:, 0]) - np.nanmean(obs[:, 0] - chains[1][:, 0]))}
    print(tag, fam, c, 'nbin', nbin, json.dumps(res[c]), f'[{time.time()-t0:.0f}s]', flush=True)
json.dump(res, open(f'{cx.W}/n3bins_{tag}_{fam}_{nbin}.json', 'w'), indent=1)
