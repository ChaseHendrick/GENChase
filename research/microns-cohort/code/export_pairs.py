# Synaptic-scale analysis pairs: connected + ADP, pre and post pass CCmax > 0.4 and CCabs > 0.2 (Ding et al. Methods).
import pandas as pd, numpy as np
e = pd.read_pickle('work/edges_slim.pkl')
d = e[e.population.isin(['Connected', 'ADP']) & e.pre_good & e.post_good].copy()
d['conn'] = (d.population == 'Connected').astype(int)
hasc = d.groupby(['proj_hva', 'pre_nucleus_id'], observed=True).conn.transform('sum') > 0
print('dropping pairs of pre without any connection in that projection:', int((~hasc).sum()))
d = d[hasc]
out = pd.DataFrame({'pre': d.pre_nucleus_id.values, 'post': d.post_nucleus_id.values, 'proj': d.proj_hva.astype(str).str.replace('->', '_').values,
                    'nsyn': d.n_synapses.values, 'L': d.dend_len.values, 'sil': d.in_silico_sig_corr_cvt.values, 'fsim': d.readout_similarity_cvt.values,
                    'rfd': d.readout_location_distance_cvt.values, 'viv': d.in_vivo_sig_corr.values, 'rfsta': d.readout_location_distance_sta.values,
                    'soma': d.soma_dist_um.values, 'status': d.pre_status.values, 'conn': d.conn.values})
print(out.groupby(['proj', 'conn']).size().unstack(), out.isna().sum().to_dict())
out.to_csv('work/pairs_syn.csv', index=False)
