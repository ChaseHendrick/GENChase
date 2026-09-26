# Diagnostic for cover2's X scenario: which out-of-family ingredient moves N1 and N3 with no rule? Point estimates
# only, on the synthetic super-population: 'XL' axon-specific laminar preference only, 'XO' multi-synapse
# overdispersion only, 'XLf' the laminar preference on the FIXED real geometry (no design resampling).
# usage: python3 cover3.py <XL|XO|XLf> <first> <K>
import sys, os, json, time, numpy as np
import cx, supergen
scen, first, K = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
opts = {'XL': dict(axlam=0.7), 'XO': dict(overdisp=True), 'XLf': dict(axlam=0.7, resample=False)}[scen]
t0 = time.time(); ds = cx.load_real(); world = supergen.World(ds)
path = f'{cx.W}/cover3_{scen}.jsonl'
with open(path, 'a') as fh:
    for sid in range(first, first + K):
        cx._ROWIDX.clear()
        dss, S = world.dataset(9000 * (1 + ['XL', 'XO', 'XLf'].index(scen)) + sid, **opts)
        cp = cx.Copies(dss, np.ones(dss['npre'], np.int64), np.ones(dss['J'], np.int64))
        obs = cx.rho_obs(cp.elig, cp.gsyn_ptr, cp.gsyn, cp.syn_p, cp.pc_node, S)
        rec = {'sid': sid, 'scen': scen}
        for c in ['N0', 'N1', 'N3']:
            m = cx.Model(dss, 'dt', c); b, eta, info = m.fit(dss, np.ones(len(dss['y'])))
            nul, _, _ = (cx.run_null(m, cp, eta, S, seed=sid + 11, ndraw=200) if c == 'N0' else cx.run_null(m, cp, eta, S, seed=sid + 12, ndraw=120, nburn=40, thin=2))
            ok = np.isfinite(obs[:, 0] - nul[:, 0]); rec[f'pt|{c}'] = float(np.mean(obs[ok, 0] - nul[ok, 0]))
        fh.write(json.dumps(rec) + '\n'); fh.flush()
        print(json.dumps(rec), f'[{time.time()-t0:.0f}s]', flush=True)
