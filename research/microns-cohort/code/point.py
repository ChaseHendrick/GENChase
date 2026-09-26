# Point estimates of the cohort excess for every null (N0, N0p, N1, N1s, N2, N3) and both covariate families
# (dt: digital-twin covariates sil, fsim, rfd; iv: in vivo covariates viv, fsim, rfd), with long swap chains and chain
# diagnostics (two independent chains per null, integrated autocorrelation time of the pooled null mean).
# usage: python3 point.py [--configs ...] [--fams ...] [--ndraw 1000] [--out real] [--data main|<heldout tag>] [--frozen]
import argparse, os, json, time, numpy as np, pandas as pd
import cx
ap = argparse.ArgumentParser()
ap.add_argument('--configs', default=','.join(cx.CONFIGS)); ap.add_argument('--fams', default='dt,iv')
ap.add_argument('--ndraw', type=int, default=1000); ap.add_argument('--out', default=None)
ap.add_argument('--nmeas', type=int, default=4, help='2: only sil and viv (skip the laminar parts; speed)')
ap.add_argument('--data', default='main'); ap.add_argument('--frozen', action='store_true',
                help='held-out run: use the coefficients fitted on the main data (same design columns), no refit')
a = ap.parse_args()
t0 = time.time()
ds = cx.load_real(a.data)
G3 = np.asarray(cx.stack_measures(ds, os.path.join(ds['wdir'], 'G3.npy')))[:a.nmeas]
print(f'loaded {time.time()-t0:.0f}s', flush=True)
w = np.ones(len(ds['y']))
cp = cx.Copies(ds, np.ones(ds['npre'], np.int64), np.ones(ds['J'], np.int64))
obs = cx.rho_obs(cp.elig, cp.gsyn_ptr, cp.gsyn, cp.syn_p, cp.pc_node, G3)
print('eligible groups', len(cp.elig), np.bincount(cp.elig_proj, minlength=4), flush=True)
configs = a.configs.split(','); fams = a.fams.split(','); NDRAW = a.ndraw
if a.frozen: dsm = cx.load_real('main')
res = {}; groups = []
for fam in fams:
    for c in configs:
        if a.frozen:
            mm = cx.Model(dsm, fam, c); bm, _, infom = mm.fit(dsm, np.ones(len(dsm['y'])))
            m = cx.Model(ds, fam, c, names_frozen=mm.names); braw = bm / mm.sd
            eta = m.X @ braw + np.log(ds['L']); b = braw * m.sd; info = {'iters': 0, 'loglik': np.nan}
        else:
            m = cx.Model(ds, fam, c); b, eta, info = m.fit(ds, w)
        coef = {n: float(v) for n, v in zip(m.names, b / m.sd)}
        if m.cfg['kind'] == 'pool':
            nul, _, _ = cx.run_null(m, cp, eta, G3, seed=20260926, ndraw=4 * NDRAW)
            chains = [nul]; stats = None; tau = None
        else:
            chains = []; traces = []; stats = []
            for k in range(2):
                nul, tr, st = cx.run_null(m, cp, eta, G3, seed=20260926 + 101 * k, ndraw=NDRAW, nburn=300, thin=3, keep_trace=True)
                chains.append(nul); traces.append(tr); stats.append(st.tolist())
            # pooled (over groups) null mean of the sil measure along each chain: integrated autocorrelation time
            tau = []
            for tr in traces:
                x = np.nanmean(tr[:, :, 0], 1); x = x - x.mean(); n = len(x)
                ac = np.correlate(x, x, 'full')[n - 1:] / (x @ x); s_ = 1.0
                for lag in range(1, n // 5):
                    if ac[lag] < 0.05: break
                    s_ += 2 * ac[lag]
                tau.append(float(s_))
        nul = np.nanmean(np.stack(chains), 0)
        summ = cx.excess_summary(cp, obs, nul)
        chain_diff = {f'{mm}:all': float(np.nanmean(obs[:, i] - chains[0][:, i]) - np.nanmean(obs[:, i] - chains[-1][:, i])) for i, mm in enumerate(cx.MEAS[:G3.shape[0]])}
        res[f'{fam}:{c}'] = {'summary': summ, 'coef': coef, 'fit_iters': info['iters'], 'loglik': info['loglik'],
                             'swap_stats(proposals,valid,accepted)': stats, 'tau_pooled_null_mean(draws, thin 3)': tau,
                             'chain1_minus_chain2_excess': chain_diff}
        for e, g in enumerate(cp.elig):
            rec = {'fam': fam, 'cfg': c, 'group': ds['gid'][cp.gc_orig[g]], 'proj': cx.PROJ[cp.elig_proj[e]]}
            for i, mm in enumerate(cx.MEAS[:G3.shape[0]]): rec[f'{mm}_obs'] = obs[e, i]; rec[f'{mm}_null'] = nul[e, i]
            groups.append(rec)
        s = summ
        print(f"{fam} {c}: sil {s['sil:all']:+.5f} (obs {s['sil:all:obs']:.5f} null {s['sil:all:null']:.5f}; laminar part {s.get('Fsil:all', float('nan')):+.5f}) "
              f"viv {s['viv:all']:+.5f} (laminar {s.get('Fviv:all', float('nan')):+.5f}) | per proj sil " + ' '.join(f"{s['sil:'+p]:+.4f}" for p in cx.PROJ)
              + ' viv ' + ' '.join(f"{s['viv:'+p]:+.4f}" for p in cx.PROJ) + f" | tau {tau} chain diff {chain_diff['sil:all']:+.5f} stats {stats} [{time.time()-t0:.0f}s]", flush=True)
tag = a.out or (a.data if a.data != 'main' else 'real') + ('_frozen' if a.frozen else '')
json.dump(res, open(f'{cx.W}/point_{tag}.json', 'w'), indent=1)
pd.DataFrame(groups).to_csv(f'{cx.W}/point_groups_{tag}.csv', index=False)
print(f'done {time.time()-t0:.0f}s')
