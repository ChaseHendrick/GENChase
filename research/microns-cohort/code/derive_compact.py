# Small derived tables for publication, written into work/: compact bootstrap replicate tables (pooled and per
# projection type excess per replicate; no coefficients), the N2 coverage runs reduced to one row per dataset, and the
# two frozen inputs of a held-out build as plain files. Derived numbers only.
import json, gzip, numpy as np, pandas as pd
import cx
W = cx.W
KEEP = [':all', ':V1_V1', ':HVA_HVA', ':V1_HVA', ':HVA_V1', 'n_elig_fx', 'n_elig_re']
def compact(src, dst):
    rows = []
    for l in open(f'{W}/{src}'):
        r = json.loads(l); rows.append({k: v for k, v in r.items() if k == 'rep' or (any(k.endswith(x) for x in KEEP) and '|beta' not in k)})
    df = pd.DataFrame(rows).drop_duplicates('rep').sort_values('rep')
    with gzip.open(f'{W}/{dst}', 'wt') as fh: df.to_csv(fh, index=False, float_format='%.7g')
    print(dst, df.shape)
compact('boot_pw.jsonl', 'boot_replicates_main.csv.gz')
compact('boot_ding1822.jsonl', 'boot_replicates_ding1822.csv.gz')
compact('boot_new1822.jsonl', 'boot_replicates_new1822.csv.gz')
for sc in ['H0', 'H1']:
    rows = []
    for l in open(f'{W}/cover_{sc}.jsonl'):
        r = json.loads(l); b = np.array(r['boot|N2'], float)
        rows.append({'sid': r['sid'], 'N0': r['pt|N0']['sil:all'], 'N1': r['pt|N1']['sil:all'], 'N2': r['pt|N2']['sil:all'],
                     'N2_boot_sd': float(np.nanstd(b[:, 0], ddof=1)), 'N2_boot_lo': float(np.nanquantile(b[:, 0], 0.025)),
                     'N2_boot_hi': float(np.nanquantile(b[:, 0], 0.975))})
    pd.DataFrame(rows).to_csv(f'{W}/cover_N2_{sc}_summary.csv', index=False)
np.savetxt(f'{W}/postsynaptic_depth_bin_edges_um.txt', np.load(f'{W}/bin_edges.npy'))
for t in ['ding1822', 'new1822']:
    b = json.load(open(f'{W}/{t}/build_report.json')); b['edges_files'] = [x.split('/')[-1] for x in b.get('edges_files', [])]
    json.dump(b, open(f'{W}/build_report_{t}.json', 'w'), indent=1, default=str)
