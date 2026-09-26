# Sensitivity (the check's S3): N1 and N3 point estimates with the penalties removed from the coefficient fit
# (no N(0,1) prior on the standardized coefficients; log-alpha ridge 1e-3 instead of 0.1), main data, both families.
import json, numpy as np, cx
ds = cx.load_real(); G3 = np.asarray(cx.stack_measures(ds, cx.W + '/G3.npy'))[:2]
cp = cx.Copies(ds, np.ones(ds['npre'], np.int64), np.ones(ds['J'], np.int64))
obs = cx.rho_obs(cp.elig, cp.gsyn_ptr, cp.gsyn, cp.syn_p, cp.pc_node, G3)
out = {}
for fam, mm in [('dt', 0), ('iv', 1)]:
    for c in ['N1', 'N3']:
        m = cx.Model(ds, fam, c); w = np.ones(len(ds['y']))
        bp, etap, _ = m.fit(ds, w)
        bu, etau, iu = cx.fit(m.X, m.sd, m.ridge - m.sd ** 2, ds, w, 'twoway', gcodes=m.gcodes, Gn=m.Gn, eps=1e-3)
        res = {}
        for lab, eta in [('penalized', etap), ('unpenalized', etau)]:
            nul = np.nanmean([cx.run_null(m, cp, eta, G3, seed=4000 + k, ndraw=400, nburn=300, thin=3)[0] for k in range(2)], 0)
            res[lab] = float(np.nanmean(obs[:, mm] - nul[:, mm]))
        res['max_coef_change'] = float(np.max(np.abs(bu / m.sd - bp / m.sd))); res['unpen_iters'] = iu['iters']
        res['coef_penalized'] = dict(zip(m.names, (bp / m.sd).round(4).tolist())); res['coef_unpenalized'] = dict(zip(m.names, (bu / m.sd).round(4).tolist()))
        out[f'{fam}:{c}'] = res
        print(fam, c, {k: v for k, v in res.items() if not k.startswith('coef')}, flush=True)
json.dump(out, open(cx.W + '/sens_unpenalized.json', 'w'), indent=1)
