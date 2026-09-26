# Two-way (presynaptic x postsynaptic) bootstrap of the cohort excess, for every null and both covariate families in
# the SAME replicate (paired, so differences between nulls get intervals too). Each replicate resamples presynaptic
# cells and postsynaptic cells independently with replacement and refits every model. Postsynaptic cells drawn m times
# become m distinct cells; presynaptic cells drawn m times enter the refit and the mean excess with weight m but appear
# once in the swap null's table (--pre-mode weights, the default; see validation), or as m distinct axons (copies).
# The eligible axons are those of the original sample (fx; the threshold re-applied to the resample, re, is recorded
# for comparison). One JSON line per replicate (resumable).
# usage: python3 boot.py <tag> <first_rep> <n_reps> [--configs ...] [--fams ...] [--data main|<heldout tag>] [--frozen]
import argparse, os, json, time, numpy as np
import cx
ap = argparse.ArgumentParser()
ap.add_argument('tag'); ap.add_argument('first', type=int); ap.add_argument('n', type=int)
ap.add_argument('--configs', default='N0,N0p,N1,N2,N3'); ap.add_argument('--fams', default='dt,iv')
ap.add_argument('--data', default='main'); ap.add_argument('--frozen', action='store_true',
                help='held-out run: keep the coefficients fitted on the main data (no refit)')
ap.add_argument('--pre-mode', default='weights'); ap.add_argument('--ndraw', type=int, default=25)
ap.add_argument('--nburn', type=int, default=30); ap.add_argument('--thin', type=int, default=2)
ap.add_argument('--nmeas', type=int, default=4, help='2: only sil and viv (skip the laminar parts; speed)')
ap.add_argument('--tol', type=float, default=1e-8, help='Newton tolerance of the refit in each replicate')
a = ap.parse_args()
t0 = time.time()
ds = cx.load_real(a.data); G3 = np.asarray(cx.stack_measures(ds, os.path.join(ds['wdir'], 'G3.npy')))[:a.nmeas]
w1 = np.ones(len(ds['y']))
models = {}
if a.frozen: dsm = cx.load_real('main')
for fam in a.fams.split(','):
    for c in a.configs.split(','):
        if a.frozen:
            mm = cx.Model(dsm, fam, c); bm, _, _ = mm.fit(dsm, np.ones(len(dsm['y'])))
            m = cx.Model(ds, fam, c, names_frozen=mm.names); braw = bm / mm.sd
            models[(fam, c)] = (m, braw, None)
        else:
            m = cx.Model(ds, fam, c); b, eta, info = m.fit(ds, w1); models[(fam, c)] = (m, b, info.get('la'))
cp0 = cx.Copies(ds, np.ones(ds['npre'], np.int64), np.ones(ds['J'], np.int64)); elig0 = cp0.gc_orig[cp0.elig]   # original eligible groups
path = f'{cx.W}/boot_{a.tag}.jsonl'
done = set()
if os.path.exists(path):
    for line in open(path):
        try: done.add(json.loads(line)['rep'])
        except Exception: pass
print(f'setup {time.time()-t0:.0f}s; {len(done)} replicates already done; {vars(a)}', flush=True)
with open(path, 'a') as fh:
    for rep in range(a.first, a.first + a.n):
        if rep in done: continue
        rng = np.random.default_rng([20260926, rep])
        vp = rng.multinomial(ds['npre'], np.full(ds['npre'], 1.0 / ds['npre']))
        wp = rng.multinomial(ds['J'], np.full(ds['J'], 1.0 / ds['J']))
        cp = cx.Copies(ds, vp, wp, pre_mode=a.pre_mode, elig_orig=elig0)
        wr = (vp[ds['pre_r']] * wp[ds['j']]).astype(float)
        obs = cx.rho_obs(cp.elig, cp.gsyn_ptr, cp.gsyn, cp.syn_p, cp.pc_node, G3)
        rec = {'rep': rep, 'n_elig_fx': int((cp.gw[cp.elig] * cp.mask['fx']).sum()), 'n_elig_re': int((cp.gw[cp.elig] * cp.mask['re']).sum())}
        for (fam, c), (m, b0, la0) in models.items():
            if a.frozen:
                eta = m.X @ b0 + np.log(ds['L']); b = b0 * m.sd; info = {'iters': 0}
            else:
                try:
                    b, eta, info = cx.fit(m.X, m.sd, m.ridge, ds, wr, m.cfg['kind'], b0=b0, la0=la0, tol=a.tol, gcodes=m.gcodes, Gn=m.Gn)
                except Exception as ex:   # record the failure; the replicate keeps the other nulls
                    print(f'rep {rep} {fam} {c} fit failed: {ex!r}', flush=True); rec[f'{fam}|{c}|failed'] = repr(ex); continue
            seed = int(rng.integers(1 << 30))
            if m.cfg['kind'] == 'pool':
                nul, _, _ = cx.run_null(m, cp, eta, G3, seed=seed, ndraw=2 * a.ndraw)
            else:
                nul, _, _ = cx.run_null(m, cp, eta, G3, seed=seed, ndraw=a.ndraw, nburn=a.nburn, thin=a.thin)
            sm = cx.excess_summary(cp, obs, nul, 'fx')
            for k, v in sm.items():
                if not k.startswith('n'): rec[f'{fam}|{c}|{k}'] = v
            sr = cx.excess_summary(cp, obs, nul, 're')
            for k in ['sil:all', 'viv:all', 'Fsil:all', 'Fviv:all'][:a.nmeas]: rec[f'{fam}|{c}|re|{k}'] = sr[k]
            rec[f'{fam}|{c}|iters'] = info['iters']
            rec[f'{fam}|{c}|beta'] = (b / m.sd)[:len(cx.FAMILY[fam]) * 4].tolist()
        fh.write(json.dumps(rec) + '\n'); fh.flush()
        print(f"rep {rep} dt|N2 sil {rec.get('dt|N2|sil:all', float('nan')):+.5f} iv|N2 viv {rec.get('iv|N2|viv:all', float('nan')):+.5f} [{time.time()-t0:.0f}s]", flush=True)
print(f'done {time.time()-t0:.0f}s')
