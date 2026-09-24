"""Evaluate every explorer configuration by my own Biot-Savart diagnostics; list the best valid P per N."""
import mpmath as mp, json
from core import all_explorer_configs, diagnose_mp
cfgs = all_explorer_configs()
print('configs', len(cfgs))
best = {}
rows = []
for name, (G, z) in cfgs:
    N = len(G)
    try:
        d = diagnose_mp(G, z, dps=40)
    except Exception as e:
        print(name, 'ERR', e); continue
    ok = d['collapse'] and d['res'] < mp.mpf('1e-8') and d['Gmin_rel'] > mp.mpf('1e-6') and d['dmin_rel'] > mp.mpf('1e-6')
    rows.append((N, float(d['P']), float(d['res']), ok, name))
    if ok and (N not in best or d['P'] < best[N][0]):
        best[N] = (d['P'], name, d)
for N in sorted(best):
    P, name, d = best[N]
    print(N, mp.nstr(P, 22), name, 'res=%.1e' % float(d['res']), 'S_rel=%.1e' % float(d['S_rel']), 'L_rel=%.1e' % float(d['L_rel']),
          'Gmin_rel=%.3g' % float(d['Gmin_rel']), 'dmin_rel=%.3g' % float(d['dmin_rel']))
json.dump(rows, open('collect_rows.json', 'w'))
