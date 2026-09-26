# Second coverage / SE-calibration study (the check's M2-M3) on the synthetic super-population (fresh cells on a
# two-way resampled real geometry, supergen.World), for the nulls the claims rest on: N1 and N3.
# The truth under H0 and X is 'no cohort rule' (excess 0). Scenarios: 'H0' no rule (in the null's family); 'X' no rule, outside the family (multi-synapse overdispersion and
# axon-specific laminar preference, exp(0.7 z) per axon and depth bin); 'H1' anchor rule gamma = 2.
# Per dataset: N0, N1, N3 point estimates with the conditional SD (swap-chain draws), then B two-way bootstrap
# replicates of N1 and N3
# (presynaptic weights, postsynaptic copies, eligibility fixed): the real-data scheme. One JSON line per dataset.
# usage: python3 cover2.py <H0|X|H1> <first> <K> <B>
import sys, os, json, time, numpy as np
import cx, supergen
scen, first, K, B = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
opts = {'H0': dict(gamma=0.0), 'X': dict(gamma=0.0, overdisp=True, axlam=0.7), 'H1': dict(gamma=2.0)}[scen]
t0 = time.time()
ds = cx.load_real(); world = supergen.World(ds)
path = f'{cx.W}/cover2_{scen}.jsonl'
done = set()
if os.path.exists(path):
    for line in open(path):
        try: done.add(json.loads(line)['sid'])
        except Exception: pass
with open(path, 'a') as fh:
    for sid in range(first, first + K):
        if sid in done: continue
        cx._ROWIDX.clear()
        seed = 7000 * (1 + ['H0', 'X', 'H1'].index(scen)) + sid
        dss, S = world.dataset(seed, **opts)
        cp = cx.Copies(dss, np.ones(dss['npre'], np.int64), np.ones(dss['J'], np.int64))
        obs = cx.rho_obs(cp.elig, cp.gsyn_ptr, cp.gsyn, cp.syn_p, cp.pc_node, S)
        rec = {'sid': sid, 'scen': scen, 'nsyn': int(dss['y'].sum()), 'npairs': int((dss['y'] > 0).sum())}
        fits = {}
        for c in ['N0', 'N1', 'N3']:
            m = cx.Model(dss, 'dt', c); b, eta, info = m.fit(dss, np.ones(len(dss['y']))); fits[c] = (m, b, info.get('la'))
            if m.cfg['kind'] == 'pool':
                nul, _, _ = cx.run_null(m, cp, eta, S, seed=sid + 11, ndraw=200); csd = None
            else:
                nul, tr, _ = cx.run_null(m, cp, eta, S, seed=sid + 12, ndraw=120, nburn=40, thin=2, keep_trace=True)
                csd = float(np.std(np.nanmean(tr[:, :, 0], 1), ddof=1))
            ok = np.isfinite(obs[:, 0] - nul[:, 0])
            rec[f'pt|{c}'] = float(np.mean(obs[ok, 0] - nul[ok, 0])); rec[f'csd|{c}'] = csd
        eg = cp.gc_orig[cp.elig]; rng = np.random.default_rng([2719, sid, 1 + ['H0', 'X', 'H1'].index(scen)])
        bs = {'N1': [], 'N3': []}
        for rep in range(B):
            vp = rng.multinomial(dss['npre'], np.full(dss['npre'], 1.0 / dss['npre'])); wp = rng.multinomial(dss['J'], np.full(dss['J'], 1.0 / dss['J']))
            cpb = cx.Copies(dss, vp, wp, pre_mode='weights', elig_orig=eg)
            ob = cx.rho_obs(cpb.elig, cpb.gsyn_ptr, cpb.gsyn, cpb.syn_p, cpb.pc_node, S)
            wr = (vp[dss['pre_r']] * wp[dss['j']]).astype(float)
            for c in ['N1', 'N3']:
                m, b0, la0 = fits[c]; b, eta, _ = m.fit(dss, wr, b0=b0, la0=la0)
                nul, _, _ = cx.run_null(m, cpb, eta, S, seed=int(rng.integers(1 << 30)), ndraw=25, nburn=30, thin=2)
                bs[c].append(cx.excess_summary(cpb, ob, nul, 'fx')['sil:all'])
        rec['boot'] = bs
        fh.write(json.dumps(rec) + '\n'); fh.flush()
        print(f"sid {sid}: N0 {rec['pt|N0']:+.5f} N1 {rec['pt|N1']:+.5f} (csd {rec['csd|N1']:.5f}) N3 {rec['pt|N3']:+.5f}"
              + (f" | boot sd N1 {np.std(bs['N1'], ddof=1):.5f} N3 {np.std(bs['N3'], ddof=1):.5f}" if B > 1 else '') + f" [{time.time()-t0:.0f}s]", flush=True)
print(f'done {time.time()-t0:.0f}s')
