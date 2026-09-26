# Summaries of the validation runs.
# (1) Null calibration and power on the real design (work/synth_<scenario>_1.csv): mean excess +/- SE over datasets.
# (2) Coverage on the synthetic super-population (work/cover_H0.jsonl, cover_H1.jsonl): coverage of the percentile,
#     basic and normal two-way intervals (Wilson 95% intervals on the coverage), bootstrap SE against the actual SD of
#     the estimator across datasets, bootstrap bias, and rejection rates. The truth is 0 under H0 (no rule; the N2 null
#     is correctly specified in this world) and, under H1, the mean of the N2 estimate over all H1 datasets.
import json, glob, os, numpy as np, pandas as pd
from scipy import stats
import cx
out = {}
def wilson(k, n):
    if n == 0: return (np.nan, np.nan)
    z = 1.96; p = k / n; den = 1 + z * z / n; c = (p + z * z / (2 * n)) / den; h = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return (c - h, c + h)
rows = []
for f in sorted(glob.glob(f'{cx.W}/synth_*_1.csv')):
    d = pd.read_csv(f); sc = d.scen.iloc[0]
    for c in ['N0', 'N1', 'N1s', 'N2', 'N3']:
        for m in ['sil', 'viv']:
            x = d[f'{c}|{m}:all']
            rows.append({'scenario': sc, 'null': c, 'measure': m, 'n': len(x), 'mean': x.mean(), 'se': x.std(ddof=1) / np.sqrt(len(x)),
                         'z': x.mean() / (x.std(ddof=1) / np.sqrt(len(x)))})
C = pd.DataFrame(rows); C.to_csv(f'{cx.W}/calibration_realdesign.csv', index=False)
pd.set_option('display.width', 250)
print('(1) real-design calibration (mean pooled excess over datasets):')
print(C.pivot_table(index=['scenario', 'null'], columns='measure', values=['mean', 'se']).round(4).to_string())
cov_rows = []
for sc in ['H0', 'H1', 'H1a']:
    f = f'{cx.W}/cover_{sc}.jsonl'
    if not os.path.exists(f): continue
    R = [json.loads(l) for l in open(f)]
    R = [r for r in R if len(r.get('boot|N2', [])) >= 20]
    if not R: continue
    th = np.array([[r['pt|N2']['sil:all']] + [r['pt|N2'][f'sil:{p}'] for p in cx.PROJ] for r in R])
    truth = np.zeros(5) if sc == 'H0' else np.nanmean(th, 0)
    for k, scope in enumerate(['all'] + cx.PROJ):
        cov = {'pct': 0, 'basic': 0, 'norm': 0}; rej = {'pct': 0, 'norm': 0}; ses = []; bias = []; n = 0
        for i, r in enumerate(R):
            x = np.array([b[k] for b in r['boot|N2']], float); x = x[np.isfinite(x)]
            if len(x) < 20 or not np.isfinite(th[i, k]): continue
            n += 1; e = th[i, k]; se = x.std(ddof=1); lo, hi = np.quantile(x, [0.025, 0.975])
            ses.append(se); bias.append(x.mean() - e)
            cov['pct'] += lo <= truth[k] <= hi; cov['basic'] += (2 * e - hi) <= truth[k] <= (2 * e - lo)
            cov['norm'] += abs(e - truth[k]) <= 1.96 * se
            rej['pct'] += (lo > 0) or (hi < 0); rej['norm'] += abs(e) > 1.96 * se
        sd_true = float(np.nanstd(th[:, k], ddof=1))
        rec = {'scenario': sc, 'scope': scope, 'datasets': n, 'truth': float(truth[k]), 'mean_estimate': float(np.nanmean(th[:, k])),
               'sd_estimate': sd_true, 'mean_boot_se': float(np.mean(ses)), 'se_ratio': float(np.mean(ses) / sd_true),
               'mean_boot_bias': float(np.mean(bias)), 'B': int(np.median([len(r['boot|N2']) for r in R]))}
        for t in cov:
            rec[f'cover_{t}'] = cov[t] / n; lo_, hi_ = wilson(cov[t], n); rec[f'cover_{t}_lo'] = lo_; rec[f'cover_{t}_hi'] = hi_
        for t in rej: rec[f'reject0_{t}'] = rej[t] / n
        cov_rows.append(rec)
    # the other nulls' point estimates in this world (bias of N0 and N1 under H0)
    for c in ['N0', 'N1', 'N2']:
        x = np.array([r[f'pt|{c}']['sil:all'] for r in R])
        out[f'{sc}:{c}:point'] = {'mean': float(x.mean()), 'se': float(x.std(ddof=1) / np.sqrt(len(x))), 'sd': float(x.std(ddof=1)), 'n': len(x)}
V = pd.DataFrame(cov_rows)
if len(V):
    V.to_csv(f'{cx.W}/coverage.csv', index=False)
    print('\n(2) coverage on the synthetic super-population (N2 null, two-way bootstrap with presynaptic weights):')
    print(V.round(4).to_string(index=False))
    print(json.dumps(out, indent=1))
json.dump(out, open(f'{cx.W}/coverage_points.json', 'w'), indent=1)
