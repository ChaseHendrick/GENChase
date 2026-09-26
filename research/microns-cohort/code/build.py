# Build the analysis inputs from ANY edges table with the schema of Ding et al.'s edge_data_v1.pkl, or the v1822 pull
# schema (population C/A, post_excl29, no functional columns), so that the same models run on it unchanged:
#   python3 build.py --edges '<file or glob>' --tag <name> [--nodes <file>] [--approx-rfd] [--allow-shared-pre]
# Output in work/<name>/: pairs_syn.csv, nodes_xyz.pkl, gram_nodes.npy, G3.npy (S for sil and viv plus the laminar
# parts, with the laminar table and the postsynaptic depth-bin edges frozen from the main run), build_report.json.
# Then: python3 point.py --data <name>; python3 boot.py <out> 0 500 --data <name>.
#
# Edge columns. Required: pre_nucleus_id, post_nucleus_id, population ('Connected'/'C', 'ADP'/'A'; other rows are
# ignored), n_synapses, dend_len (co-travel length within 5 um, mm). Optional: post_excl29 (rows with 1 are dropped),
# proj_hva (otherwise derived from the nodes' hva), in_silico_sig_corr_cvt, in_vivo_sig_corr, readout_similarity_cvt
# (recomputed from the nodes and checked; a disagreement above 1e-4 is an error), readout_location_distance_cvt
# (required unless --approx-rfd, which substitutes an approximation: Pearson 0.998 with the authors' values).
# Node fields (node_data_v1 schema; a second nodes table overrides or extends it by nucleus_id): nucleus_id,
# nucleus_x/y/z (nm), cc_max_cvt, cc_abs_cvt, layer, hva, in_silico_resp, in_vivo_mean_resp, readout_cvt, and
# position_stim_cvt with --approx-rfd; proofread_status optional.
# Hard errors (the check's M4): duplicated (pre, post) rows; presynaptic cells shared with the main analysis (unless
# --allow-shared-pre); a presynaptic cell with Connected rows but no ADP rows, or an overall ADP:Connected ratio below 5;
# Connected/ADP rows with no positive co-travel length; nucleus coordinates outside the nm range of node_data_v1; hva
# labels other than V1/HVA.
import argparse, glob, os, json, time, numpy as np, pandas as pd
import cx
ap = argparse.ArgumentParser()
ap.add_argument('--edges', required=True); ap.add_argument('--tag', required=True); ap.add_argument('--nodes', default=None)
ap.add_argument('--approx-rfd', action='store_true'); ap.add_argument('--allow-shared-pre', action='store_true')
ap.add_argument('--drop-zero-L', action='store_true', help='drop Connected/ADP rows with no co-travel (skeleton gaps) instead of failing')
a = ap.parse_args()
t0 = time.time()
class BuildError(SystemExit): pass
def fail(msg): raise BuildError('BUILD ERROR: ' + msg)
def read_any(p):
    if p.endswith('.pkl'): return pd.read_pickle(p)
    if p.endswith('.parquet'): return pd.read_parquet(p)
    if p.endswith('.feather'): return pd.read_feather(p)
    return pd.read_csv(p)
files = sorted(glob.glob(a.edges))
if not files: fail(f'no edges file matches {a.edges}')
Wt = cx.wdir(a.tag); os.makedirs(Wt, exist_ok=True)
e = pd.concat([read_any(f) for f in files], ignore_index=True)
req = ['pre_nucleus_id', 'post_nucleus_id', 'population', 'n_synapses', 'dend_len']
miss = [c for c in req if c not in e.columns]
if miss: fail(f'edges table lacks required columns {miss}')
report = {'edges_files': files, 'nodes_file': a.nodes, 'rows_read': int(len(e)), 'derived': {}, 'checks': {}}
e['population'] = e.population.astype(str).map({'C': 'Connected', 'A': 'ADP', 'Connected': 'Connected', 'ADP': 'ADP'})
e = e[e.population.isin(['Connected', 'ADP'])].copy()
if 'post_excl29' in e.columns:
    report['dropped_post_excl29'] = int((e.post_excl29 == 1).sum()); e = e[e.post_excl29 != 1]
dup = e.duplicated(['pre_nucleus_id', 'post_nucleus_id'])
if dup.any(): fail(f'{int(dup.sum())} duplicated (pre, post) Connected/ADP rows')
n = pd.read_pickle(cx.DATA + 'node_data_v1.pkl').set_index('nucleus_id')
ymin, ymax = n.nucleus_y.min(), n.nucleus_y.max()
if a.nodes:
    n2 = read_any(a.nodes)
    n2 = n2.set_index('nucleus_id') if 'nucleus_id' in n2.columns else n2
    if n2.nucleus_y.min() < 0.5 * ymin or n2.nucleus_y.max() > 2 * ymax: fail('second nodes table: nucleus coordinates are not in nm')
    n = pd.concat([n.drop(index=n2.index.intersection(n.index)), n2[[c for c in n2.columns if c in n.columns]]])
main_pre = set(pd.read_csv(os.path.join(cx.W, 'pairs_syn.csv'), usecols=['pre']).pre)
shared = set(e.pre_nucleus_id) & main_pre
report['presynaptic_cells_shared_with_main'] = len(shared)
if shared and not a.allow_shared_pre:
    fail(f'{len(shared)} presynaptic cells are in the main analysis (pass --allow-shared-pre for an in-sample table)')
lack = (set(e.pre_nucleus_id) | set(e.post_nucleus_id)) - set(n.index)
report['cells_without_node_record'] = len(lack)
e = e[e.pre_nucleus_id.isin(n.index) & e.post_nucleus_id.isin(n.index)]
bad_hva = set(n.hva.astype(str).reindex(pd.concat([e.pre_nucleus_id, e.post_nucleus_id]).unique()).unique()) - {'V1', 'HVA'}
if bad_hva: fail(f'hva labels other than V1/HVA: {sorted(bad_hva)}')
nc = e[e.population == 'Connected'].groupby('pre_nucleus_id').size(); na = e[e.population == 'ADP'].groupby('pre_nucleus_id').size()
no_adp = sorted(set(nc.index) - set(na.index))
if no_adp: fail(f'{len(no_adp)} presynaptic cells have Connected rows but no ADP rows (e.g. {no_adp[:5]})')
ratio = len(e[e.population == 'ADP']) / max(1, len(e[e.population == 'Connected']))
report['adp_to_connected'] = ratio
if ratio < 5: fail(f'ADP:Connected ratio {ratio:.2f} is implausibly low (release: about 34); the proximity pools would collapse')
badL = (e.dend_len <= 0) | e.dend_len.isna()
report['rows_without_cotravel'] = {'rows': int(badL.sum()), 'synapses': int(e.n_synapses[badL].sum()),
                                   'by_population': e.population[badL].value_counts().to_dict()}
if badL.any():
    if not a.drop_zero_L: fail(f'{int(badL.sum())} Connected/ADP rows without a positive co-travel length (pass --drop-zero-L to drop them)')
    e = e[~badL]
if 'proj_hva' not in e.columns:
    e['proj_hva'] = n.hva.astype(str).reindex(e.pre_nucleus_id).values + '->' + n.hva.astype(str).reindex(e.post_nucleus_id).values
    report['derived']['proj_hva'] = 'from nodes.hva'
pos = pd.Series(np.arange(len(n)), index=n.index)
ia = pos[e.pre_nucleus_id].values; ib = pos[e.post_nucleus_id].values
def zrows(M):
    M = M - M.mean(1, keepdims=True); return (M / (np.linalg.norm(M, axis=1, keepdims=True) + 1e-12)).astype(np.float32)
R = {'sil': zrows(np.stack(n.in_silico_resp.values).astype(np.float64)), 'viv': zrows(np.stack(n.in_vivo_mean_resp.values).astype(np.float64))}
def pair(M):   # chunked: the full gather would need about 11 GB (the check's S8)
    return np.concatenate([np.einsum('ij,ij->i', M[ia[s:s + 20000]], M[ib[s:s + 20000]]) for s in range(0, len(ia), 20000)]).astype(float)
for col, m, src in [('in_silico_sig_corr_cvt', 'sil', 'in_silico_resp'), ('in_vivo_sig_corr', 'viv', 'in_vivo_mean_resp')]:
    v = pair(R[m])
    if col in e.columns:
        dev = float(np.nanmax(np.abs(v - e[col].values))); report['checks'][col] = dev
        if dev > 1e-4: fail(f'{col} disagrees with the node responses (max |diff| {dev:.2e})')
    e[col] = v; report['derived'][col] = f'Pearson correlation of node {src}'
F = np.stack([np.asarray(v, float).ravel() for v in n.readout_cvt.values]); F /= np.linalg.norm(F, axis=1, keepdims=True)
v = np.concatenate([np.einsum('ij,ij->i', F[ia[s:s + 50000]], F[ib[s:s + 50000]]) for s in range(0, len(ia), 50000)])
if 'readout_similarity_cvt' in e.columns and e.readout_similarity_cvt.notna().all():
    dev = float(np.max(np.abs(v - e.readout_similarity_cvt.values))); report['checks']['readout_similarity_cvt'] = dev
    if dev > 1e-4: fail(f'readout_similarity_cvt disagrees with the node readout weights (max |diff| {dev:.2e})')
e['readout_similarity_cvt'] = v; report['derived']['readout_similarity_cvt'] = 'cosine of node readout_cvt'
if 'readout_location_distance_cvt' not in e.columns or e.readout_location_distance_cvt.isna().any():
    if not a.approx_rfd: fail('readout_location_distance_cvt is missing; pass --approx-rfd to use the approximation')
    P = np.stack([np.asarray(v, float).ravel() for v in n.position_stim_cvt.values])
    e['readout_location_distance_cvt'] = np.sqrt((99.81 * (P[ia, 0] - P[ib, 0])) ** 2 + (55.14 * (P[ia, 1] - P[ib, 1])) ** 2)
    report['derived']['readout_location_distance_cvt'] = ('APPROXIMATE: anisotropic scaling (99.81, 55.14) of node position_stim_cvt '
                                                          'differences, fitted on the release (Pearson 0.998, median abs error 0.17 deg)')
if 'readout_location_distance_sta' not in e.columns: e['readout_location_distance_sta'] = np.nan
good = (n.cc_max_cvt > 0.4) & (n.cc_abs_cvt > 0.2)                         # Methods: CCmax > 0.4, CCabs > 0.2
e['pre_good'] = good.reindex(e.pre_nucleus_id).values; e['post_good'] = good.reindex(e.post_nucleus_id).values
xyz = n[['nucleus_x', 'nucleus_y', 'nucleus_z']].astype(float)
e['soma_dist_um'] = np.linalg.norm(xyz.reindex(e.pre_nucleus_id).values - xyz.reindex(e.post_nucleus_id).values, axis=1) / 1000.0
d = e[e.pre_good.astype(bool) & e.post_good.astype(bool)].copy()
d['conn'] = (d.population == 'Connected').astype(int)
hasc = d.groupby(['proj_hva', 'pre_nucleus_id'], observed=True).conn.transform('sum') > 0
d = d[hasc]
st = n.proofread_status.astype(str).reindex(d.pre_nucleus_id).values if 'proofread_status' in n.columns else np.array(['?'] * len(d))
out = pd.DataFrame({'pre': d.pre_nucleus_id.values, 'post': d.post_nucleus_id.values, 'proj': d.proj_hva.astype(str).str.replace('->', '_').values,
                    'nsyn': d.n_synapses.values.astype(int) * d.conn.values, 'L': d.dend_len.values, 'sil': d.in_silico_sig_corr_cvt.values,
                    'fsim': d.readout_similarity_cvt.values, 'rfd': d.readout_location_distance_cvt.values, 'viv': d.in_vivo_sig_corr.values,
                    'rfsta': d.readout_location_distance_sta.values, 'soma': d.soma_dist_um.values, 'status': st, 'conn': d.conn.values})
out = out[out.proj.isin(cx.PROJ)]
if (out[out.conn == 1].nsyn <= 0).any(): fail('Connected rows with no synapse')
out.to_csv(os.path.join(Wt, 'pairs_syn.csv'), index=False)
n[['nucleus_x', 'nucleus_y', 'nucleus_z', 'layer'] + [c for c in ['hva', 'proofread_status'] if c in n.columns]].to_pickle(os.path.join(Wt, 'nodes_xyz.pkl'))
nodes = np.unique(out.post.values); np.save(os.path.join(Wt, 'gram_nodes.npy'), nodes)
for m in ['sil', 'viv']:
    Rm = R[m][pos[nodes].values]; np.save(os.path.join(Wt, f'G_{m}.npy'), Rm @ Rm.T)
ds = cx.load_real(a.tag)
ftab = np.load(os.path.join(cx.W, 'G3_ftab.npy'))
cx.stack_measures(ds, os.path.join(Wt, 'G3.npy'), ftab=ftab)
for m in ['sil', 'viv']: os.remove(os.path.join(Wt, f'G_{m}.npy'))      # contained in G3.npy
cp = cx.Copies(ds, np.ones(ds['npre'], np.int64), np.ones(ds['J'], np.int64))
summ = out.groupby('proj').agg(pre=('pre', 'nunique'), pairs=('pre', 'size'), connected=('conn', 'sum'), synapses=('nsyn', 'sum'))
report.update({'per_projection': summ.to_dict('index'), 'eligible_groups': np.bincount(cp.elig_proj, minlength=4).tolist(),
               'n_pre': int(out.pre.nunique()), 'n_rows': int(len(out)), 'secs': time.time() - t0})
json.dump(report, open(os.path.join(Wt, 'build_report.json'), 'w'), indent=1, default=str)
print(json.dumps(report, indent=1, default=str))
