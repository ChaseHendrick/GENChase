# Coverage, calibration and power of the two-way interval on the synthetic super-population (supergen.World).
# Scenario H0: no cohort rule (realistic postsynaptic heterogeneity correlated with tuning, laminar rule, smooth fields).
# Scenario H1: anchor rule, axon-specific strength gamma_i = gamma * Gamma(2, 1/2).
# For each dataset: point estimates under N0, N1, N2 (refit, long chains), then B two-way bootstrap replicates of N2
# (presynaptic weights, postsynaptic copies, eligible axons fixed from the dataset: the scheme used on the real data;
# the threshold re-applied to the resample is recorded as boot_re). One JSON line per dataset.
# usage: python3 cover.py <H0|H1|H1a> <first> <K> <B>
import sys, os, json, time, numpy as np
import cx, supergen
scen, first, K, B = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
gamma = {'H0': 0.0, 'H1': 2.0, 'H1a': 1.0}[scen]
t0 = time.time()
ds = cx.load_real()
world = supergen.World(ds)
path = f'{cx.W}/cover_{scen}' + (sys.argv[5] if len(sys.argv) > 5 else '') + '.jsonl'
done = set()
if os.path.exists(path):
    for line in open(path):
        try: done.add(json.loads(line)['sid'])
        except Exception: pass
print(f'setup {time.time()-t0:.0f}s; done {len(done)}', flush=True)
def summ(cp, obs, nul, which='fx'):
    s = cx.excess_summary(cp, obs, nul, which)
    return {k: v for k, v in s.items() if k.startswith('sil:')}
with open(path, 'a') as fh:
    for sid in range(first, first + K):
        if sid in done: continue
        cx._ROWIDX.clear()
        dss, S = world.dataset(1000 * (1 + ['H0', 'H1', 'H1a'].index(scen)) + sid, gamma)
        cp = cx.Copies(dss, np.ones(dss['npre'], np.int64), np.ones(dss['J'], np.int64))
        obs = cx.rho_obs(cp.elig, cp.gsyn_ptr, cp.gsyn, cp.syn_p, cp.pc_node, S)
        rec = {'sid': sid, 'n_elig': np.bincount(cp.elig_proj, minlength=4).tolist(), 'nsyn': int(dss['y'].sum())}
        fits = {}
        for c in ['N0', 'N1', 'N2']:
            m = cx.Model(dss, 'dt', c); b, eta, info = m.fit(dss, np.ones(len(dss['y']))); fits[c] = (m, b, info.get('la'))
            if m.cfg['kind'] == 'pool': nul, _, _ = cx.run_null(m, cp, eta, S, seed=sid + 11, ndraw=200)
            else: nul, _, _ = cx.run_null(m, cp, eta, S, seed=sid + 12, ndraw=120, nburn=40, thin=2)
            rec[f'pt|{c}'] = summ(cp, obs, nul)
        if sid == first:   # calibration against the real data (print once)
            pool = np.asarray(S[0][np.ix_(dss['j'][:3000], dss['j'][3000:6000])]).mean()
            print('calibration: pre-post sil mean by proj', [round(float(dss['cov']['sil'][dss['proj_r'] == p].mean()), 3) for p in range(4)],
                  'sd', round(float(dss['cov']['sil'].std()), 3), '| random pool-cell pair S', round(float(pool), 3),
                  '| obs rho mean', round(rec['pt|N0']['sil:all:obs'], 4), 'N0 null', round(rec['pt|N0']['sil:all:null'], 4),
                  '| sd per-axon excess N2', round(float(np.nanstd(obs[:, 0] - nul[:, 0])), 4), flush=True)
        m, b0, la0 = fits['N2']; bs = []; bsr = []; elig0 = cp.gc_orig[cp.elig]
        rng = np.random.default_rng([2718, sid, 1 + ['H0', 'H1', 'H1a'].index(scen)])
        for rep in range(B):
            vp = rng.multinomial(dss['npre'], np.full(dss['npre'], 1.0 / dss['npre'])); wp = rng.multinomial(dss['J'], np.full(dss['J'], 1.0 / dss['J']))
            cpb = cx.Copies(dss, vp, wp, pre_mode='weights', elig_orig=elig0)
            ob = cx.rho_obs(cpb.elig, cpb.gsyn_ptr, cpb.gsyn, cpb.syn_p, cpb.pc_node, S)
            b, eta, _ = m.fit(dss, (vp[dss['pre_r']] * wp[dss['j']]).astype(float), b0=b0, la0=la0)
            nul, _, _ = cx.run_null(m, cpb, eta, S, seed=int(rng.integers(1 << 30)), ndraw=25, nburn=30, thin=2)
            s = summ(cpb, ob, nul, 'fx'); bs.append([s['sil:all']] + [s[f'sil:{p}'] for p in cx.PROJ])
            s = summ(cpb, ob, nul, 're'); bsr.append([s['sil:all']] + [s[f'sil:{p}'] for p in cx.PROJ])
        rec['boot|N2'] = bs; rec['boot_re|N2'] = bsr
        fh.write(json.dumps(rec) + '\n'); fh.flush()
        print(f"sid {sid}: N0 {rec['pt|N0']['sil:all']:+.5f} N1 {rec['pt|N1']['sil:all']:+.5f} N2 {rec['pt|N2']['sil:all']:+.5f}"
              + (f" boot mean {np.mean([x[0] for x in bs]):+.5f} sd {np.std([x[0] for x in bs]):.5f}" if B else '') + f" [{time.time()-t0:.0f}s]", flush=True)
print(f'done {time.time()-t0:.0f}s')
