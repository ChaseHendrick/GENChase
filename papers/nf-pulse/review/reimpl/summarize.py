import json, glob
rows = []
for f in sorted(glob.glob('prove_*.json')):
    r = json.load(open(f)); ev = r['events']
    rows.append((f, r['c'], r['prec'], r['order'], r['delta'], ev.get('fired', {}).get('xi'),
                 ev.get('returned', {}).get('xi'), ev.get('sign', {}).get('xi'), ev.get('sign', {}).get('sign_a'),
                 ev.get('sign', {}).get('a'), ev.get('sign', {}).get('radius_a'),
                 ev.get('left', {}).get('xi'), ev.get('left', {}).get('sign_U'), ev.get('left', {}).get('U'),
                 (ev.get('closest_after_return') or {}).get('max_abs_z_upper')))
hdr = ('file', 'c', 'prec', 'N', 'delta', 'fired', 'returned', 'xi_sign', 'sign_a', 'a', 'rad_a', 'xi_left', 'sign_U', 'U_left', 'closest')
with open('summary.txt', 'w') as fh:
    for row in [hdr] + rows:
        line = ' | '.join(str(x) if not isinstance(x, float) else '%.2f' % x for x in row)
        print(line); fh.write(line + '\n')
