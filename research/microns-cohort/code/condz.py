# Conditional test: the observed pooled rho against the distribution of the pooled rho over the null's own draws
# (swap-chain draws for N1/N3, independent multinomial draws for N0), with b fixed at the fit. z = excess / SD(draws).
# It ignores uncertainty in b and any misspecification of the null's family; the two-way bootstrap is reported beside it.
# usage: python3 condz.py --data main|ding1822|new1822 [--configs N0,N1,N3] [--fams dt,iv] [--ndraw 400]
import argparse, os, json, time, numpy as np
import cx
ap = argparse.ArgumentParser()
ap.add_argument('--data', default='main'); ap.add_argument('--configs', default='N0,N1,N3'); ap.add_argument('--fams', default='dt,iv')
ap.add_argument('--ndraw', type=int, default=400)
a = ap.parse_args()
t0 = time.time()
ds = cx.load_real(a.data); G3 = np.asarray(cx.stack_measures(ds, os.path.join(ds['wdir'], 'G3.npy')))[:2]
cp = cx.Copies(ds, np.ones(ds['npre'], np.int64), np.ones(ds['J'], np.int64))
obs = cx.rho_obs(cp.elig, cp.gsyn_ptr, cp.gsyn, cp.syn_p, cp.pc_node, G3)
res = {}
for fam in a.fams.split(','):
    for c in a.configs.split(','):
        m = cx.Model(ds, fam, c); b, eta, info = m.fit(ds, np.ones(len(ds['y'])))
        if m.cfg['kind'] == 'pool':
            ptr, pc, go = cp.pool(False, 1)
            wv = np.exp(eta[cx._row_index(ds, go, cp.pc_orig[pc])] - eta.max()); cw = np.cumsum(wv)
            draws = np.array([cx.null_pool(90001 + k, 1, cp.elig, cp.gc_orig, cp.gsyn_ptr, ptr, pc, cw, cp.pc_node, G3) for k in range(a.ndraw)])
            pooled = np.nanmean(draws, 1); nul = np.nanmean(draws, 0)
        else:
            nul, tr, _ = cx.run_null(m, cp, eta, G3, seed=90001, ndraw=a.ndraw, nburn=300, thin=3, keep_trace=True)
            pooled = np.nanmean(tr, 1)
        for mi, mm in enumerate(['sil', 'viv']):
            ex = float(np.nanmean(obs[:, mi] - nul[:, mi])); sd = float(np.std(pooled[:, mi], ddof=1))
            x = pooled[:, mi] - pooled[:, mi].mean(); n = len(x); ac = np.correlate(x, x, 'full')[n - 1:] / (x @ x); tau = 1.0
            for lag in range(1, n // 5):
                if ac[lag] < 0.05: break
                tau += 2 * ac[lag]
            res[f'{fam}|{c}|{mm}'] = {'excess': ex, 'null_sd': sd, 'z': ex / sd, 'tau_draws': float(tau), 'ndraw': a.ndraw}
            print(f'{a.data} {fam} {c} {mm}: excess {ex:+.5f} null SD {sd:.5f} z {ex / sd:+.2f} (tau {tau:.1f}) [{time.time()-t0:.0f}s]', flush=True)
json.dump(res, open(f'{cx.W}/condz_{a.data}.json', 'w'), indent=1)
