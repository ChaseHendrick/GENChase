# Checker's variant of the author's calib.py negative control 'L' (no rule, axon-specific laminar preference), with the
# preference NOT aligned to N3's six depth bins:
#   'L12': 12 equal-count depth bins (each N3 bin split in two), exp(0.7 z) per group and bin
#   'Lsh': 6 bins shifted by half a bin (edges at the 1/12, 3/12, ..., 11/12 quantiles), exp(0.7 z) per group and bin
#   'L6' : the author's own L (the 6 N3 bins), as a same-code control
# Same generator otherwise (real design, BLUP heterogeneity s=1.6, fitted N2 pairwise and laminar rule), same chain
# settings as calib.py for N1 and N3. Output to MICRONS_WORK (the checker's folder), never to the author's work/.
import sys, json, time, numpy as np, pandas as pd
import cx
scen, first, K = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
S_HET, F_LAM = 1.6, 1.0
t0 = time.time()
ds = cx.load_real()
G3 = np.asarray(cx.stack_measures(ds, cx.W + '/G3.npy'))[:2]
m2 = cx.Model(ds, 'dt', 'N2'); b2, _, _ = m2.fit(ds, np.ones(len(ds['y'])))
dp = np.array([n.startswith('dp:') for n in m2.names])
eta_pair = (m2.X[:, ~dp] / m2.sd[~dp]) @ b2[~dp] + F_LAM * ((m2.X[:, dp] / m2.sd[dp]) @ b2[dp]) + np.log(ds['L'])
u = pd.read_csv(cx.W + '/post_blup_dt.csv').set_index('post').u.reindex(ds['jid']).fillna(0).values
eta_true = eta_pair + S_HET * u[ds['j']]
rows = pd.Series(np.arange(len(ds['y']))).groupby(ds['g']).apply(np.array)
ntot = np.bincount(ds['g'], ds['y'], ds['G']).astype(int)
dep = ds['jxyz'][:, 1]
if scen == 'L12':
    edges = np.quantile(dep, np.linspace(0, 1, 13)[1:-1])
elif scen == 'Lsh':
    edges = np.quantile(dep, (np.arange(6) * 2 + 1) / 12.0)
else:
    edges = ds['bin_edges']
jb = np.searchsorted(edges, dep)[ds['j']]; nb_ = int(jb.max()) + 1
print('bins', nb_, 'N3 edges', np.round(ds['bin_edges'], 1), 'generator edges', np.round(edges, 1), flush=True)
out = []
for sid in range(first, first + K):
    rs = np.random.default_rng([556, ['L12', 'Lsh', 'L6'].index(scen), sid])
    ynew = np.zeros(len(ds['y']), np.int64)
    eta_gen = eta_true + 0.7 * rs.normal(size=(ds['G'], nb_))[ds['g'], jb]
    for g in range(ds['G']):
        r = rows[g]; lp = eta_gen[r]; pr = np.exp(lp - lp.max()); pr /= pr.sum()
        ynew[r] = rs.multinomial(ntot[g], pr)
    dsy = dict(ds); dsy['y'] = ynew
    cp = cx.Copies(dsy, np.ones(ds['npre'], np.int64), np.ones(ds['J'], np.int64))
    obs = cx.rho_obs(cp.elig, cp.gsyn_ptr, cp.gsyn, cp.syn_p, cp.pc_node, G3)
    rec = {'scen': scen, 'sid': sid, 'n_elig': len(cp.elig)}
    mo = cx.Model(dsy, 'dt', 'N0')
    nul, _, _ = cx.run_null(mo, cp, eta_gen, G3, seed=sid * 7 + 3, ndraw=300)
    rec['oracle|sil'] = float(np.nanmean(obs[:, 0] - nul[:, 0]))
    for c in ['N1', 'N3']:
        m = cx.Model(dsy, 'dt', c); b, eta, info = m.fit(dsy, np.ones(len(ynew)))
        nul, tr, _ = cx.run_null(m, cp, eta, G3, seed=sid * 7 + 2, ndraw=150, nburn=60, thin=2, keep_trace=True)
        ok = np.isfinite(obs[:, 0] - nul[:, 0])
        rec[f'{c}|sil'] = float(np.mean(obs[ok, 0] - nul[ok, 0]))
        pooled = np.nanmean(tr[:, :, 0], 1); rec[f'{c}|sil:csd'] = float(np.std(pooled, ddof=1)); rec[f'{c}|sil:z'] = rec[f'{c}|sil'] / rec[f'{c}|sil:csd']
    out.append(rec)
    print(json.dumps({k: (round(v, 5) if isinstance(v, float) else v) for k, v in rec.items()}), f'[{time.time()-t0:.0f}s]', flush=True)
    pd.DataFrame(out).to_csv(f'{cx.W}/calibx_{scen}_{first}.csv', index=False)
print(f'done {time.time()-t0:.0f}s')
