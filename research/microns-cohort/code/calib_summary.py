# Summary of calib.py: the absorption curve (injected anchor rule, oracle excess, recovered excess per null) and the
# calibration of the conditional test under no-rule generators inside and outside the null's family.
import glob, json, numpy as np, pandas as pd
import cx
D = pd.concat([pd.read_csv(f) for f in sorted(glob.glob(f'{cx.W}/calib_*_0.csv'))], ignore_index=True)
print('code hashes:', D.code.unique(), ' datasets per scenario:', D.groupby('scen').size().to_dict())
rows = []
for sc, d in D.groupby('scen'):
    rec = {'scen': sc, 'gamma': d.gamma.iloc[0], 'n': len(d), 'obs': d['obs:sil'].mean()}
    for k in ['oracle', 'N0', 'N1', 'N3']:
        x = d[f'{k}|sil']; rec[k] = x.mean(); rec[k + '_se'] = x.std(ddof=1) / np.sqrt(len(x))
        rec[k + '_null'] = d[f'{k}|sil:null'].mean()
    for k in ['N1', 'N3']:
        z = d[f'{k}|sil:z']; rec[k + '_z_mean'] = z.mean(); rec[k + '_z_sd'] = z.std(ddof=1)
        rec[k + '_reject'] = float((z > 1.645).mean()); rec[k + '_csd'] = d[f'{k}|sil:csd'].mean()
        rec[k + '_sd_across'] = d[f'{k}|sil'].std(ddof=1)
    rows.append(rec)
T = pd.DataFrame(rows).sort_values(['scen']); T.to_csv(f'{cx.W}/calib_summary.csv', index=False)
pd.set_option('display.width', 250); pd.set_option('display.max_columns', 40)
G = T[T.scen.str.startswith('G')].sort_values('gamma')
base = G[G.gamma == 0].iloc[0]
print('\nABSORPTION CURVE (DT measure, real design, heterogeneity s=1.6 + laminar rule; means over datasets):')
for _, r in G.iterrows():
    rise = r.obs - base.obs
    line = f"gamma {r.gamma:3.1f}: oracle {r.oracle:+.5f}+/-{r.oracle_se:.5f} | N0 {r.N0:+.5f} N1 {r.N1:+.5f}+/-{r.N1_se:.5f} N3 {r.N3:+.5f}+/-{r.N3_se:.5f}"
    if r.gamma > 0:
        line += (f" | recovered/oracle: N0 {r.N0 / r.oracle:.2f} N1 {r.N1 / r.oracle:.2f} N3 {r.N3 / r.oracle:.2f}"
                 f" | null rise / obs rise: N1 {(r.N1_null - base.N1_null) / rise:.2f} N3 {(r.N3_null - base.N3_null) / rise:.2f}")
    print(line)
print('\nNO-RULE GENERATORS: mean excess and the conditional test (z = excess / SD of the null draws):')
for _, r in T[~T.scen.str.startswith('G') | (T.gamma == 0)].iterrows():
    print(f"{r.scen:3s} (n {r.n}): oracle {r.oracle:+.5f} N0 {r.N0:+.5f}+/-{r.N0_se:.5f} N1 {r.N1:+.5f}+/-{r.N1_se:.5f} N3 {r.N3:+.5f}+/-{r.N3_se:.5f}"
          f" | N1 z mean {r.N1_z_mean:+.2f} sd {r.N1_z_sd:.2f} P(z>1.645) {r.N1_reject:.2f}; SD across/cond SD {r.N1_sd_across / r.N1_csd:.2f}"
          f" | N3 z mean {r.N3_z_mean:+.2f} sd {r.N3_z_sd:.2f} P(z>1.645) {r.N3_reject:.2f}; SD across/cond SD {r.N3_sd_across / r.N3_csd:.2f}")
# inversion of the real statistics along the anchor family
real = json.load(open(f'{cx.W}/point_real.json'))
out = {}
for k in ['N1', 'N3']:
    y = real[f'dt:{k}']['summary']['sil:all']; xs = G.oracle.values; ys = G[k].values
    o = np.argsort(ys); inv = float(np.interp(y, ys[o], xs[o], left=np.nan, right=np.nan))
    n0 = float(np.interp(y, ys[o], G.N0.values[o], left=np.nan, right=np.nan))
    out[k] = {'real': y, 'anchor_equiv_oracle': inv, 'implied_N0': n0, 'real_N0': real['dt:N0']['summary']['sil:all'],
              'curve_max': float(ys.max())}
    print(f"\nreal {k} {y:+.5f}: anchor-family oracle-equivalent {inv:+.5f} (NaN = beyond the largest injected rule, curve max {ys.max():+.5f}); "
          f"N0 that rule would give {n0:+.5f} against the real N0 {out[k]['real_N0']:+.5f}")
json.dump({'table': T.to_dict('records'), 'inversion': out}, open(f'{cx.W}/calib_summary.json', 'w'), indent=1, default=float)
