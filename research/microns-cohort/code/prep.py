# Prepare analysis tables for the MICrONS cohort-rule refit. Seeded where random; deterministic otherwise.
import pandas as pd, numpy as np, os
D = os.path.abspath(os.environ.get('MICRONS_DATA', os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../neuro-impact/data'))) + '/'
W = os.environ.get('MICRONS_WORK', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'work'))
e = pd.read_pickle(D + 'edge_data_v1.pkl'); n = pd.read_pickle(D + 'node_data_v1.pkl').set_index('nucleus_id')
good = (n.cc_max_cvt > 0.4) & (n.cc_abs_cvt > 0.2)          # Methods: CCmax > 0.4, CCabs > 0.2
e['pre_good'] = good.reindex(e.pre_nucleus_id).values
e['post_good'] = good.reindex(e.post_nucleus_id).values
e['pre_status'] = n.proofread_status.reindex(e.pre_nucleus_id).values.astype(str)
# soma distance (EM nm -> um); nucleus coords are in nm
xyz = n[['nucleus_x', 'nucleus_y', 'nucleus_z']].astype(float)
a = xyz.reindex(e.pre_nucleus_id).values; b = xyz.reindex(e.post_nucleus_id).values
e['soma_dist_um'] = np.linalg.norm(a - b, axis=1) / 1000.0
for f in ['all', 'goodpost', 'goodboth']:
    d = e[e.population.isin(['Connected', 'ADP'])]
    if f == 'goodpost': d = d[d.post_good]
    if f == 'goodboth': d = d[d.post_good & d.pre_good]
    print(f); print(d.groupby(['proj_hva', 'population'], observed=True).agg(npairs=('pre_nucleus_id', 'size'), npre=('pre_nucleus_id', 'nunique'), npost=('post_nucleus_id', 'nunique'), nsyn=('n_synapses', 'sum')).unstack().to_string())
keep = ['pre_nucleus_id', 'post_nucleus_id', 'population', 'n_synapses', 'dend_len', 'proj_hva', 'proj_hva_layer', 'in_silico_sig_corr_cvt', 'readout_similarity_cvt',
        'readout_location_distance_cvt', 'in_vivo_sig_corr', 'readout_location_distance_sta', 'pre_good', 'post_good', 'pre_status', 'soma_dist_um', 'synapse_size']
e[keep].to_pickle(os.path.join(W, 'edges_slim.pkl'))
def zrows(M):
    M = M - M.mean(1, keepdims=True); return (M / (np.linalg.norm(M, axis=1, keepdims=True) + 1e-12)).astype(np.float32)
np.save(os.path.join(W, 'node_ids.npy'), n.index.values)
np.save(os.path.join(W, 'R_sil.npy'), zrows(np.stack(n.in_silico_resp.values).astype(np.float64)))
np.save(os.path.join(W, 'R_viv.npy'), zrows(np.stack(n.in_vivo_mean_resp.values).astype(np.float64)))
F = np.stack([np.asarray(v, dtype=np.float64).ravel() for v in n.readout_cvt.values]); F /= np.linalg.norm(F, axis=1, keepdims=True)
np.save(os.path.join(W, 'F_read.npy'), F.astype(np.float32))
n[['proofread_status', 'hva', 'brain_area', 'layer', 'cc_max_cvt', 'cc_abs_cvt']].assign(good=good).to_pickle(os.path.join(W, 'nodes_slim.pkl'))
