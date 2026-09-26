# Exact Gram matrices (Pearson signal correlations) among all nodes that appear in the synaptic-scale pairs.
import numpy as np, pandas as pd
p = pd.read_csv('work/pairs_syn.csv', usecols=['pre', 'post', 'sil', 'viv'])
ids = np.load('work/node_ids.npy'); pos = pd.Series(np.arange(len(ids)), index=ids)
nodes = np.unique(p.post.values); np.save('work/gram_nodes.npy', nodes)
for m in ['sil', 'viv']:
    R = np.load(f'work/R_{m}.npy')[pos[nodes].values].astype(np.float32)
    G = R @ R.T; np.save(f'work/G_{m}.npy', G)
    # sanity: pre-post correlations recomputed from node responses equal the table's values
    Rall = np.load(f'work/R_{m}.npy'); s = p.sample(5000, random_state=1)
    rc = np.sum(Rall[pos[s.pre].values] * Rall[pos[s.post].values], 1)
    print(m, 'nodes', len(nodes), 'diag range', float(np.diag(G).min()), float(np.diag(G).max()), 'max |recomputed - table|', float(np.max(np.abs(rc - s[m].values))))
