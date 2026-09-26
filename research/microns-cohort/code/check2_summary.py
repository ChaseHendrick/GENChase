# Numbers added to REPORT.md after the second independent check (2026-09-26), recomputed from data/ alone.
#   1. no-rule laminar controls whose preference is aligned (L6) or not aligned (L12, Lsh) with N3's six depth bins
#      (calib_x.py, 100 datasets each): mean excess +/- SE over datasets and conditional-test rejections;
#   2. main-data N3 at 6, 12 and 24 depth bins (n3bins.py) and its bootstrap z at 6 and 12 bins (boot_nbin.py);
#   3. the held-out comparison matched for composition: Ding et al.'s axons reweighted to the held-out projection mix;
#   4. the main-data N3 p-values, two-sided, from the published bootstrap;
#   5. biases in the super-population and out-of-family coverage worlds (cover2.py, cover3.py).
# usage: python3 check2_summary.py   (run from this folder's parent, research/microns-cohort)
import csv, gzip, json, math, os, statistics as st
from statistics import NormalDist

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
PROJ = ['V1_V1', 'HVA_HVA', 'V1_HVA', 'HVA_V1']


def num(x):
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(v) else v


def mean_se(x):
    return st.mean(x), st.stdev(x) / math.sqrt(len(x))


print('1. no-rule laminar controls (DT, sil), mean excess +/- SE over datasets; conditional z >= 1.645')
for scen in ['L6', 'L12', 'Lsh']:
    rows = list(csv.DictReader(open(f'{D}/calibx_{scen}.csv')))
    out = []
    for c in ['N1', 'N3']:
        m, se = mean_se([float(r[f'{c}|sil']) for r in rows])
        rej = sum(float(r[f'{c}|sil:z']) >= 1.645 for r in rows)
        out.append(f'{c} {m:+.5f} +/- {se:.5f}, rejections {rej}/{len(rows)}')
    print(f'  {scen:4s} n {len(rows)}: ' + '; '.join(out))

print('2. main-data N3 at other depth resolutions (DT, sil)')
for nb in [6, 12, 24]:
    r = json.load(open(f'{D}/n3bins_main_dt_{nb}.json'))['N3']
    line = f'  {nb:2d} bins: excess {r["sil"]:+.5f}'
    fn = f'{D}/boot_replicates_main_n3_nbin{nb}.jsonl.gz'
    if os.path.exists(fn):
        x = [v for v in (num(json.loads(l)['dt|N3|sil:all']) for l in gzip.open(fn, 'rt')) if v is not None]
        se = st.stdev(x)
        line += f', bootstrap SE {se:.5f} (B {len(x)}), z {r["sil"] / se:.2f}'
    print(line)
h12 = json.load(open(f'{D}/n3bins_new1822_dt_12.json'))['N3']['sil']
print(f'  held-out N3 at 12 bins: {h12:+.5f}')

print('3. held-out against the reference reweighted to the held-out projection mix (DT, sil)')
T = json.load(open(f'{D}/heldout_result.json'))['table']


def row(data, fam, null, meas, scope):
    for r in T:
        if (r['data'], r['family'], r['null'], r['measure'], r['scope']) == (data, fam, null, meas, scope):
            return r


w = dict(zip(PROJ, json.load(open(f'{D}/build_report_new1822.json'))['eligible_groups']))
W = sum(w.values())
P = json.load(open(f'{D}/point_ding1822.json'))
R = list(csv.DictReader(gzip.open(f'{D}/boot_replicates_ding1822.csv.gz', 'rt')))
for null in ['N1', 'N3']:
    pt = P[f'dt:{null}']
    s = (pt[0] if isinstance(pt, list) else pt)['summary']
    est = sum(w[p] * s[f'sil:{p}'] for p in PROJ) / W
    reps = []
    for r in R:
        v = [num(r[f'dt|{null}|sil:{p}']) for p in PROJ]
        if None not in v:
            reps.append(sum(w[p] * x for p, x in zip(PROJ, v)) / W)
    se = st.stdev(reps)
    h = row('new1822', 'dt', null, 'sil', 'all')
    d, dse = h['estimate'] - est, math.hypot(h['se_boot'], se)
    hv, rv = row('new1822', 'dt', null, 'sil', 'V1_V1'), row('ding1822', 'dt', null, 'sil', 'V1_V1')
    print(f'  {null}: reference reweighted {est:+.4f} +/- {se:.4f} (z {est / se:.2f}); held-out {h["estimate"]:+.4f} +/- '
          f'{h["se_boot"]:.4f}; difference {d:+.4f} +/- {dse:.4f} (SEs combined as independent, approximate)')
    print(f'      V1->V1 only: held-out {hv["estimate"]:+.4f} +/- {hv["se_boot"]:.4f}, reference {rv["estimate"]:+.4f} +/- '
          f'{rv["se_boot"]:.4f}; held-out two-sided p {hv["p_two_sided"]:.4f}, x8 = {8 * hv["p_two_sided"]:.3f}')
print(f'  held-out groups by projection: {w}')

print('4. main-data N3 (DT, sil), two-sided p from the published bootstrap (table_pw.csv)')
r = next(r for r in csv.DictReader(open(f'{D}/table_pw.csv'))
         if (r['family'], r['null'], r['measure'], r['scope']) == ('dt', 'N3', 'sil', 'all'))
e, se = float(r['estimate']), float(r['se'])
print(f'  estimate {e:+.5f}, bootstrap SE {se:.5f} (B {r["B"]}), z {e / se:.2f}, two-sided normal p '
      f'{2 * (1 - NormalDist().cdf(e / se)):.3f}, two-sided percentile p {float(r["p_pct_2sided"]):.3f}')

print('5. mean excess in the coverage worlds (DT, sil), +/- SE over datasets')
for f, name in [('cover2_H0.jsonl', 'super-population H0 (no rule)'), ('cover3_XL.jsonl', 'XL (out of family, laminar)')]:
    rows = [json.loads(l) for l in open(f'{D}/{f}')]
    out = []
    for c in ['N1', 'N3']:
        m, se = mean_se([r[f'pt|{c}'] for r in rows if r.get(f'pt|{c}') is not None])
        out.append(f'{c} {m:+.5f} +/- {se:.5f}')
    print(f'  {name}, n {len(rows)}: ' + '; '.join(out))
