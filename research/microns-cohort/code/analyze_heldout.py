# Held-out result per heldout_plan_2026-09-26.txt (and heldout_deviations.txt): the primary decision, secondaries,
# the reference (recomputed Ding table) through the same plan, and the pre-declared exploratory composition-matched
# comparison. Reads point_<tag>.json, boot_<tag>.jsonl, condz_<tag>.json for tag in ding1822, new1822.
import json, os, numpy as np, pandas as pd
from scipy import stats
import cx
TAGS = ['ding1822', 'new1822']
CONF = [('dt', 'N1', 'sil', 'PRIMARY'), ('dt', 'N3', 'sil', 'secondary'), ('iv', 'N1', 'viv', 'secondary'), ('iv', 'N3', 'viv', 'secondary')]
out = {}; rows = []
for tag in TAGS:
    P = json.load(open(f'{cx.W}/point_{tag}.json')); Z = json.load(open(f'{cx.W}/condz_{tag}.json'))
    Bs = list({r['rep']: r for r in (json.loads(l) for l in open(f'{cx.W}/boot_{tag}.jsonl'))}.values())   # one per replicate index
    nproj = [P['dt:N1']['summary'][f'n:{p}'] for p in cx.PROJ] if 'n:V1_V1' in P['dt:N1']['summary'] else None
    for fam, c, m, role in CONF + [('dt', 'N0', 'sil', 'comparator'), ('iv', 'N0', 'viv', 'comparator')]:
        s = P[f'{fam}:{c}']['summary']
        for scope in ['all'] + cx.PROJ:
            est = s[f'{m}:{scope}']; x = np.array([r.get(f'{fam}|{c}|{m}:{scope}', np.nan) for r in Bs], float); x = x[np.isfinite(x)]
            rec = {'data': tag, 'role': role, 'family': fam, 'null': c, 'measure': m, 'scope': scope, 'estimate': est, 'B': len(x)}
            if scope == 'all':
                zc = Z.get(f'{fam}|{c}|{m}'); rec.update({'cond_sd': zc['null_sd'] if zc else np.nan, 'z_cond': zc['z'] if zc else np.nan})
                re = np.array([r.get(f'{fam}|{c}|re|{m}:all', np.nan) for r in Bs], float); re = re[np.isfinite(re)]
                if len(re): rec['boot_mean_re_rule'] = float(re.mean()); rec['boot_mean_fx_rule'] = float(x.mean()) if len(x) else np.nan
            if len(x) >= 50:
                se = float(np.std(x, ddof=1)); lo, hi = np.quantile(x, [0.025, 0.975])
                rec.update({'se_boot': se, 'z_boot': est / se, 'p_one_sided': float(stats.norm.sf(est / se)), 'p_two_sided': float(2 * stats.norm.sf(abs(est) / se)),
                            'pct_lo': float(lo), 'pct_hi': float(hi), 'norm_lo': est - 1.96 * se, 'norm_hi': est + 1.96 * se,
                            'boot_bias': float(x.mean() - est), 'decision_z>=1.645': bool(est / se >= 1.645) if scope == 'all' else None})
            rows.append(rec)
T = pd.DataFrame(rows)
# Holm over the 8 per-projection tests (4 types x 2 matched measures) under N1, per dataset, two-sided normal p
for tag in TAGS:
    sel = (T.data == tag) & (T['null'] == 'N1') & (T.scope != 'all') & T.p_two_sided.notna()
    idx = T[sel].sort_values('p_two_sided').index; k = len(idx); run = 0.0
    for i, ix in enumerate(idx):
        run = max(run, min(1.0, (k - i) * T.loc[ix, 'p_two_sided'])); T.loc[ix, 'holm'] = run
T.to_csv(f'{cx.W}/heldout_table.csv', index=False)
# held-out minus reference, SEs combined as independent
diff = []
for fam, c, m, role in CONF:
    a_ = T[(T.data == 'new1822') & (T.family == fam) & (T['null'] == c) & (T.measure == m) & (T.scope == 'all')].iloc[0]
    b_ = T[(T.data == 'ding1822') & (T.family == fam) & (T['null'] == c) & (T.measure == m) & (T.scope == 'all')].iloc[0]
    d = a_.estimate - b_.estimate; se = float(np.hypot(a_.se_boot, b_.se_boot))
    diff.append({'family': fam, 'null': c, 'measure': m, 'heldout_minus_reference': d, 'se': se, 'z': d / se})
# exploratory (deviation 4): held-out per-projection excess weighted by the reference's group counts per type
ref = json.load(open(f'{cx.W}/point_ding1822.json'))['dt:N1']['summary']; new = json.load(open(f'{cx.W}/point_new1822.json'))
wref = np.array([ref[f'n:{p}'] for p in cx.PROJ], float); wref /= wref.sum()
Bn = list({r['rep']: r for r in (json.loads(l) for l in open(f'{cx.W}/boot_new1822.jsonl'))}.values())
comp = []
for fam, c, m, role in CONF:
    s = new[f'{fam}:{c}']['summary']; est = float(np.dot(wref, [s[f'{m}:{p}'] for p in cx.PROJ]))
    x = np.array([np.dot(wref, [r.get(f'{fam}|{c}|{m}:{p}', np.nan) for p in cx.PROJ]) for r in Bn]); x = x[np.isfinite(x)]
    se = float(np.std(x, ddof=1)); comp.append({'family': fam, 'null': c, 'measure': m, 'weights_ref': wref.round(3).tolist(),
                                                'estimate': est, 'se_boot': se, 'z': est / se, 'B': len(x)})
out = {'table': T.to_dict('records'), 'heldout_minus_reference': diff, 'composition_matched_exploratory': comp}
json.dump(out, open(f'{cx.W}/heldout_result.json', 'w'), indent=1, default=float)
pd.set_option('display.width', 250); pd.set_option('display.max_columns', 30)
cols = ['data', 'role', 'family', 'null', 'measure', 'scope', 'estimate', 'se_boot', 'z_boot', 'p_one_sided', 'decision_z>=1.645', 'pct_lo', 'pct_hi', 'cond_sd', 'z_cond', 'holm', 'boot_bias', 'B']
print(T[T.scope == 'all'][[c for c in cols if c in T.columns]].round(5).to_string(index=False))
print(T[(T.scope != 'all') & (T['null'] == 'N1')][[c for c in cols if c in T.columns]].round(5).to_string(index=False))
print(pd.DataFrame(diff).round(5).to_string(index=False)); print(pd.DataFrame(comp).round(5).to_string(index=False))
