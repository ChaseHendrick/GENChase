# Probes for build.py's hard errors (the check's M4): each bad table must stop the build with BUILD ERROR.
import subprocess, os, glob, pandas as pd, numpy as np, sys
H = '../microns-heldout/'; T = 'work/tb'; os.makedirs(T, exist_ok=True)
e = pd.concat([pd.read_csv(f) for f in sorted(glob.glob(H + 'edges_ding_axons_connected_adp_v1822_part*.csv'))])
e = e[e.dend_len > 0]
pres = sorted(e.pre_nucleus_id.unique())[:10]; sub = e[e.pre_nucleus_id.isin(pres)]
cases = {}
cases['shared_pre'] = (sub, [])                                                      # Ding's cells without --allow-shared-pre
cases['no_adp'] = (sub[sub.population == 'C'], ['--allow-shared-pre'])
dup = pd.concat([sub, sub[sub.population == 'C'].head(20)])
cases['duplicated_rows'] = (dup, ['--allow-shared-pre'])
z = sub.copy(); z.loc[z.index[:5], 'dend_len'] = 0.0
cases['zero_cotravel'] = (z, ['--allow-shared-pre', '--approx-rfd'])
cases['no_rfd'] = (sub, ['--allow-shared-pre'])
ok = True
for name, (df, flags) in cases.items():
    p = f'{T}/{name}.csv'; df.to_csv(p, index=False)
    r = subprocess.run([sys.executable, 'build.py', '--edges', p, '--tag', f'tb_{name}'] + flags, capture_output=True, text=True)
    msg = (r.stdout + r.stderr).strip().splitlines()[-1] if (r.stdout + r.stderr).strip() else ''
    hit = 'BUILD ERROR' in (r.stdout + r.stderr)
    ok &= hit
    print(f'{name:16s} -> {"stopped" if hit else "NOT STOPPED"}: {msg[:160]}')
# nodes table in um instead of nm
n = pd.read_pickle('../../neuro-impact/data/node_data_v1.pkl')
nu = n[n.nucleus_id.isin(set(sub.post_nucleus_id) | set(sub.pre_nucleus_id))].copy()
for c in ['nucleus_x', 'nucleus_y', 'nucleus_z']: nu[c] = nu[c] / 1000.0
nu.to_pickle(f'{T}/nodes_um.pkl')
r = subprocess.run([sys.executable, 'build.py', '--edges', f'{T}/no_rfd.csv', '--tag', 'tb_um', '--nodes', f'{T}/nodes_um.pkl', '--allow-shared-pre', '--approx-rfd'], capture_output=True, text=True)
hit = 'BUILD ERROR' in (r.stdout + r.stderr); ok &= hit
print(f'{"nodes_in_um":16s} -> {"stopped" if hit else "NOT STOPPED"}: {(r.stdout + r.stderr).strip().splitlines()[-1][:160]}')
print('ALL STOPPED' if ok else 'SOME NOT STOPPED')
