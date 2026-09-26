# Calibration on the real design (real pools, co-travel, covariates, similarities, axon totals; synthetic counts):
#   - the absorption curve: an anchor rule of strength gamma is injected on top of realistic postsynaptic heterogeneity
#     (alpha = exp(1.6 u_BLUP)) and the fitted laminar rule; the ORACLE excess is rho_obs minus its expectation under
#     the true generating pairwise model without the rule (known here), and each null's recovered excess is compared
#     with it;
#   - negative controls outside the null's model family (no rule): 'O' multi-synapse overdispersion (the connected set
#     is drawn without replacement and the remaining synapses are piled on already-connected cells, as in the data:
#     7,386 synapses on 6,608 pairs), 'L' axon-specific laminar preference (each group's rate in each depth bin gets
#     its own random factor exp(0.7 z)), 'OL' both.
# For each dataset and null it records the pooled excess, the observed and null means, and the conditional z
# (excess / SD of the pooled rho over the swap null's draws). The code hash goes into every output row.
# usage: python3 calib.py <scenario> <first> <K>
import sys, json, time, hashlib, numpy as np, pandas as pd
import cx
SCEN = {'G0': 0.0, 'G05': 0.5, 'G1': 1.0, 'G15': 1.5, 'G2': 2.0, 'G3': 3.0, 'O': 0.0, 'L': 0.0, 'OL': 0.0}
scen, first, K = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
gamma = SCEN[scen]; S_HET, F_LAM = 1.6, 1.0
CODE = hashlib.sha256(open(cx.__file__, 'rb').read() + open(__file__, 'rb').read()).hexdigest()[:12]
t0 = time.time()
ds = cx.load_real()
G3 = np.asarray(cx.stack_measures(ds, cx.W + '/G3.npy'))[:2]
Gs = G3[0]
m2 = cx.Model(ds, 'dt', 'N2'); b2, _, _ = m2.fit(ds, np.ones(len(ds['y'])))
dp = np.array([n.startswith('dp:') for n in m2.names])
eta_pair = (m2.X[:, ~dp] / m2.sd[~dp]) @ b2[~dp] + F_LAM * ((m2.X[:, dp] / m2.sd[dp]) @ b2[dp]) + np.log(ds['L'])
u = pd.read_csv(cx.W + '/post_blup_dt.csv').set_index('post').u.reindex(ds['jid']).fillna(0).values
eta_true = eta_pair + S_HET * u[ds['j']]           # true pairwise model (no rule): log rate up to the group constant
rows = pd.Series(np.arange(len(ds['y']))).groupby(ds['g']).apply(np.array)
ntot = np.bincount(ds['g'], ds['y'], ds['G']).astype(int)
nconn = np.bincount(ds['g'], (ds['y'] > 0).astype(float), ds['G']).astype(int)
jb = ds['jbin'][ds['j']]
out = []
for sid in range(first, first + K):
    rs = np.random.default_rng([555, list(SCEN).index(scen), sid])
    ynew = np.zeros(len(ds['y']), np.int64); eta_gen = eta_true.copy()
    if scen in ('L', 'OL'):
        zb = rs.normal(size=(ds['G'], cx.NBIN)); eta_gen = eta_gen + 0.7 * zb[ds['g'], jb]
    for g in range(ds['G']):
        r = rows[g]; lp = eta_gen[r]; pr = np.exp(lp - lp.max()); pr /= pr.sum()
        if gamma > 0:
            nodes = ds['jnode'][ds['j'][r]]; anc = nodes[rs.choice(len(r), p=pr)]
            gam = gamma * rs.gamma(2.0, 0.5)
            pr = pr * np.exp(gam * Gs[nodes, anc].astype(float)); pr /= pr.sum()
        if scen in ('O', 'OL'):
            k = min(nconn[g], len(r)); sel = rs.choice(len(r), size=k, replace=False, p=pr)
            c = np.zeros(len(r), np.int64); c[sel] = 1
            extra = ntot[g] - k
            if extra > 0: np.add.at(c, sel[rs.integers(0, k, extra)], 1)
            ynew[r] = c
        else:
            ynew[r] = rs.multinomial(ntot[g], pr)
    dsy = dict(ds); dsy['y'] = ynew
    cp = cx.Copies(dsy, np.ones(ds['npre'], np.int64), np.ones(ds['J'], np.int64))
    obs = cx.rho_obs(cp.elig, cp.gsyn_ptr, cp.gsyn, cp.syn_p, cp.pc_node, G3)
    rec = {'scen': scen, 'gamma': gamma, 'sid': sid, 'code': CODE, 'n_elig': len(cp.elig), 'nsyn': int(ynew.sum()),
           'npairs': int((ynew > 0).sum()), 'obs:sil': float(np.nanmean(obs[:, 0])), 'obs:viv': float(np.nanmean(obs[:, 1]))}
    # oracle: the true generating pairwise model without the rule (for L/OL the generator's laminar factors included)
    mo = cx.Model(dsy, 'dt', 'N0')
    nul, _, _ = cx.run_null(mo, cp, eta_gen, G3, seed=sid * 7 + 3, ndraw=300)
    for mi, m in enumerate(['sil', 'viv']):
        rec[f'oracle|{m}'] = float(np.nanmean(obs[:, mi] - nul[:, mi])); rec[f'oracle|{m}:null'] = float(np.nanmean(nul[:, mi]))
    for c in ['N0', 'N1', 'N3']:
        m = cx.Model(dsy, 'dt', c); b, eta, info = m.fit(dsy, np.ones(len(ynew)))
        if m.cfg['kind'] == 'pool':
            nul, _, _ = cx.run_null(m, cp, eta, G3, seed=sid * 7 + 1, ndraw=300); tr = None
        else:
            nul, tr, _ = cx.run_null(m, cp, eta, G3, seed=sid * 7 + 2, ndraw=150, nburn=60, thin=2, keep_trace=True)
        for mi, mm in enumerate(['sil', 'viv']):
            ok = np.isfinite(obs[:, mi] - nul[:, mi])
            rec[f'{c}|{mm}'] = float(np.mean(obs[ok, mi] - nul[ok, mi])); rec[f'{c}|{mm}:null'] = float(np.mean(nul[ok, mi]))
            if tr is not None:
                pooled = np.nanmean(tr[:, :, mi], 1); rec[f'{c}|{mm}:csd'] = float(np.std(pooled, ddof=1))
                rec[f'{c}|{mm}:z'] = rec[f'{c}|{mm}'] / rec[f'{c}|{mm}:csd']
        rec[f'{c}|iters'] = info['iters']
    out.append(rec)
    print(json.dumps({k: (round(v, 5) if isinstance(v, float) else v) for k, v in rec.items() if ('|sil' in k and ':null' not in k) or k in ('sid', 'npairs', 'nsyn')}), f'[{time.time()-t0:.0f}s]', flush=True)
    pd.DataFrame(out).to_csv(f'{cx.W}/calib_{scen}_{first}.csv', index=False)      # checkpoint after every dataset
print(f'done {time.time()-t0:.0f}s')
