# Tables from the real-data point estimates (work/point_real.json) and the two-way bootstrap (work/boot_pw.jsonl):
# point estimate, bootstrap SE, 95% intervals (percentile, basic, normal), bootstrap p, Monte Carlo SE of the interval
# endpoints, Holm adjustment across the per-projection tests, and paired intervals for the reductions between nulls.
# Measures are matched to their covariate family: digital-twin signal correlation (sil) with the dt null, in vivo
# signal correlation (viv) with the iv null.
import json, sys, os, numpy as np, pandas as pd
from scipy import stats
import cx
# usage: python3 analyze.py [boot tag, default pw] [point tag, default real]   (held-out: analyze.py heldout_frozen heldout_frozen)
tag = sys.argv[1] if len(sys.argv) > 1 else 'pw'
ptag = sys.argv[2] if len(sys.argv) > 2 else 'real'
P = json.load(open(f'{cx.W}/point_{ptag}.json'))
Bs = [json.loads(l) for l in open(f'{cx.W}/boot_{tag}.jsonl')]
B = len(Bs)
MATCH = {'dt': 'sil', 'iv': 'viv'}
CFGS = ['N0', 'N0p', 'N1', 'N1s', 'N2', 'N3']
SCOPES = ['all'] + cx.PROJ
def bvals(key):
    return np.array([r.get(key, np.nan) for r in Bs], float)
def mc_se_quantile(x, q):
    """Monte Carlo SE of an estimated quantile (normal approximation with a kernel density at the quantile)."""
    x = x[np.isfinite(x)]; n = len(x); xq = np.quantile(x, q)
    h = 1.06 * np.std(x) * n ** -0.2; f = np.mean(stats.norm.pdf((x - xq) / h)) / h
    return float(np.sqrt(q * (1 - q) / n) / f)
rows = []
for fam, meas in MATCH.items():
    for c in CFGS:
        if f'{fam}:{c}' not in P: continue
        for m in [meas, 'F' + meas]:
            for s in SCOPES:
                est = P[f'{fam}:{c}']['summary'].get(f'{m}:{s}', np.nan)
                x = bvals(f'{fam}|{c}|{m}:{s}'); ok = np.isfinite(x)
                rec = {'family': fam, 'null': c, 'measure': m, 'scope': s, 'estimate': est, 'B': int(ok.sum())}
                if ok.sum() >= 50:
                    x = x[ok]; se = float(np.std(x, ddof=1)); lo, hi = np.quantile(x, [0.025, 0.975])
                    pl = float(np.mean(x <= 0)); pu = float(np.mean(x >= 0))
                    rec.update({'boot_mean': float(x.mean()), 'boot_bias': float(x.mean() - est), 'se': se,
                                'pct_lo': float(lo), 'pct_hi': float(hi), 'basic_lo': float(2 * est - hi), 'basic_hi': float(2 * est - lo),
                                'norm_lo': est - 1.96 * se, 'norm_hi': est + 1.96 * se,
                                'mcse_lo': mc_se_quantile(x, 0.025), 'mcse_hi': mc_se_quantile(x, 0.975),
                                'p_pct_2sided': float(min(1.0, 2 * min(pl, pu))), 'p_norm_2sided': float(2 * stats.norm.sf(abs(est) / se)),
                                'obs': P[f'{fam}:{c}']['summary'].get(f'{m}:{s}:obs') if s == 'all' else None,
                                'null_mean': P[f'{fam}:{c}']['summary'].get(f'{m}:{s}:null') if s == 'all' else None})
                rows.append(rec)
T = pd.DataFrame(rows)
# conditional test (condz.py): excess / SD of the pooled rho over the null's own draws, b fixed
if os.path.exists(f'{cx.W}/condz_main.json') and ptag == 'real':
    Zc = json.load(open(f'{cx.W}/condz_main.json'))
    for i, r in T.iterrows():
        z = Zc.get(f"{r.family}|{r['null']}|{r.measure}") if r.scope == 'all' else None
        if z: T.loc[i, 'cond_sd'] = z['null_sd']; T.loc[i, 'z_cond'] = z['z']
T['z_boot'] = T.estimate / T.se
# Holm across the 8 per-projection tests (4 projection types x 2 matched measures), separately for each null
for c in CFGS:
    for pcol in ['p_pct_2sided', 'p_norm_2sided']:
        sel = (T.null == c) & (T.scope != 'all') & (T.measure.isin(['sil', 'viv'])) & T[pcol].notna()
        if sel.sum() == 0: continue
        idx = T[sel].sort_values(pcol).index; k = len(idx); adj = []; run = 0.0
        for i, ix in enumerate(idx):
            run = max(run, min(1.0, (k - i) * T.loc[ix, pcol])); adj.append(run)
        T.loc[idx, pcol.replace('p_', 'holm_')] = adj
T.to_csv(f'{cx.W}/table_{tag}.csv', index=False)
# reductions between nulls (paired bootstrap), pooled, matched measure
red = []
# Differences between nulls are changes in a test statistic, not shares of an effect explained by a confound: the
# degree-preserving nulls also absorb 55-86% of an injected cohort rule (calib_summary.py), so N0 - N1 mixes removed
# confounding with absorbed signal (the check's M1).
PAIRS = [('N0', 'N0p', 'N0 -> N0p: add soma distance and absolute postsynaptic position'), ('N0', 'N1', 'N0 -> N1: condition on cell totals'),
         ('N1', 'N2', 'N1 -> N2: add soma distance and depth pairs'), ('N0', 'N2', 'N0 -> N2'),
         ('N2', 'N3', "N2 -> N3: condition on each axon's laminar profile"), ('N0', 'N3', 'N0 -> N3')]
for fam, meas in MATCH.items():
    for a_, b_, what in PAIRS:
        ka, kb = f'{fam}:{a_}', f'{fam}:{b_}'
        if ka not in P or kb not in P: continue
        ea = P[ka]['summary'][f'{meas}:all']; eb = P[kb]['summary'][f'{meas}:all']
        xa = bvals(f'{fam}|{a_}|{meas}:all'); xb = bvals(f'{fam}|{b_}|{meas}:all'); ok = np.isfinite(xa) & np.isfinite(xb)
        rec = {'family': fam, 'measure': meas, 'from': a_, 'to': b_, 'what': what, 'drop': ea - eb}
        if ok.sum() >= 50:
            d = xa[ok] - xb[ok]
            rec.update({'drop_se': float(np.std(d, ddof=1)), 'drop_lo': float(np.quantile(d, 0.025)), 'drop_hi': float(np.quantile(d, 0.975)), 'B': int(ok.sum())})
        red.append(rec)
R = pd.DataFrame(red); R.to_csv(f'{cx.W}/reductions_{tag}.csv', index=False)
pd.set_option('display.width', 250); pd.set_option('display.max_columns', 30)
cols = ['family', 'null', 'measure', 'scope', 'estimate', 'se', 'z_boot', 'pct_lo', 'pct_hi', 'boot_bias', 'mcse_lo', 'p_norm_2sided', 'holm_norm_2sided', 'p_pct_2sided', 'holm_pct_2sided', 'cond_sd', 'z_cond', 'B']
print(f'B = {B}')
print(T[T.measure.isin(['sil', 'viv'])][[c for c in cols if c in T.columns]].round(5).to_string(index=False))
print(T[T.measure.str.startswith('F') & (T.scope == 'all')][[c for c in cols if c in T.columns]].round(5).to_string(index=False))
print(R.round(4).to_string(index=False))
