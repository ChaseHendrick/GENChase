# Where does the bootstrap's downward shift come from? N0 (dt) under variants of the resampling, 150 replicates each.
import sys, json, numpy as np, cx
ds = cx.load_real(); G3 = np.asarray(cx.stack_measures(ds, cx.W + '/G3.npy'))[:1]
m = cx.Model(ds, 'dt', 'N0'); b0, eta0, _ = m.fit(ds, np.ones(len(ds['y'])))
cp0 = cx.Copies(ds, np.ones(ds['npre'], np.int64), np.ones(ds['J'], np.int64)); orig = set(cp0.gc_orig[cp0.elig])
R = int(sys.argv[1]) if len(sys.argv) > 1 else 150
out = {}
for var in ['full', 'fixed_elig', 'pre_only', 'post_only', 'full_fixed_beta']:
    v = []
    for r in range(R):
        rng = np.random.default_rng([4711, r])
        vp = rng.multinomial(ds['npre'], np.full(ds['npre'], 1 / ds['npre'])); wp = rng.multinomial(ds['J'], np.full(ds['J'], 1 / ds['J']))
        if var == 'pre_only': wp = np.ones(ds['J'], np.int64)
        if var == 'post_only': vp = np.ones(ds['npre'], np.int64)
        cp = cx.Copies(ds, vp, wp, pre_mode='weights')
        if var == 'fixed_elig':
            keep = np.array([g in orig for g in cp.gc_orig[cp.elig]]) if len(cp.elig) else np.zeros(0, bool)
            # add original eligible groups that fell below 10 partner copies but still have >= 2 synapses on >= 2 cells
            cp2 = cx.Copies(ds, vp, wp, kmin=2, pre_mode='weights')
            sel = np.array([g in orig for g in cp2.gc_orig[cp2.elig]])
            cp2.elig = cp2.elig[sel]; cp2.elig_proj = cp2.elig_proj[sel]; cp = cp2
        obs = cx.rho_obs(cp.elig, cp.gsyn_ptr, cp.gsyn, cp.syn_p, cp.pc_node, G3)
        eta = eta0 if var == 'full_fixed_beta' else m.fit(ds, (vp[ds['pre_r']] * wp[ds['j']]).astype(float), b0=b0)[1]
        nul, _, _ = cx.run_null(m, cp, eta, G3, seed=r + 5, ndraw=60)
        v.append(cx.excess_summary(cp, obs, nul)['sil:all'])
    v = np.array(v); out[var] = (float(v.mean()), float(v.std(ddof=1) / np.sqrt(len(v))), float(v.std(ddof=1)))
    print(var, 'mean %.5f  (point 0.01478)  bias %+.5f +/- %.5f  sd %.5f' % (out[var][0], out[var][0] - 0.01478, out[var][1], out[var][2]), flush=True)
json.dump(out, open(cx.W + '/bias_diag.json', 'w'), indent=1)
