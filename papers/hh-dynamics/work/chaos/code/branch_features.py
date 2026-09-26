"""Folds, period doublings and complex multipliers along the continued Hopf branch (../data/branch*.npz),
located by interpolation between continuation points and polished where stated. NUMERICAL.
    python3 branch_features.py   -> ../data/branch_features.json"""
import json
import glob
import numpy as np

rows = []
for f in ['../data/branch.npz', '../data/branch2.npz', '../data/branch3.npz', '../data/branch4.npz']:
    try:
        r = np.load(f)['rows']
    except FileNotFoundError:
        continue
    rows.append(r)
R = np.vstack(rows)
J, T, umax, umin = R[:, 0], R[:, 4], R[:, 5], R[:, 6]
mur, mui, tJ = R[:, 9:12], R[:, 12:15], R[:, 15]
feat = {'points': len(R), 'J_range': [float(J.min()), float(J.max())]}

# folds: sign changes of dJ/ds; the extremum of J by a parabola through three points
folds = []
for i in np.where(np.sign(tJ[1:]) != np.sign(tJ[:-1]))[0]:
    k = slice(max(i - 3, 0), i + 4)
    s = np.arange(len(J))[k].astype(float)
    p = np.polyfit(s, J[k], 2)
    sv = -p[1] / (2 * p[0])
    folds.append({'row': int(i), 'J': float(np.polyval(p, sv)), 'T': float(T[i]), 'umax': float(umax[i]),
                  'mu_real': mur[i].tolist(), 'mu_imag': mui[i].tolist()})
feat['folds'] = folds

# period doublings: a real multiplier through -1
pds = []
for c in range(3):
    m = mur[:, c]
    real = np.abs(mui[:, c]) < 1e-12
    for i in np.where(real[1:] & real[:-1] & (np.sign(m[1:] + 1) != np.sign(m[:-1] + 1)))[0]:
        a = (-1 - m[i]) / (m[i + 1] - m[i])
        pds.append({'row': int(i), 'J': float(J[i] + a * (J[i + 1] - J[i])), 'T': float(T[i] + a * (T[i + 1] - T[i])),
                    'other_multipliers': [float(x) for j, x in enumerate(mur[i]) if j != c]})
feat['period_doublings'] = pds

# complex pairs
cx = np.where(np.abs(mui).max(axis=1) > 1e-10)[0]
if len(cx):
    segs = np.split(cx, np.where(np.diff(cx) > 1)[0] + 1)
    feat['complex_segments'] = [{'rows': [int(s[0]), int(s[-1])], 'J': [float(J[s[0]]), float(J[s[-1]])],
                                 'modulus_range': [float(np.abs(mur[s, 0] + 1j * mui[s, 0]).min()),
                                                   float(np.abs(mur[s, 0] + 1j * mui[s, 0]).max())]} for s in segs]
# number of multipliers outside the unit circle, by segment
nun = (np.abs(mur + 1j * mui) > 1).sum(axis=1)
chg = np.where(np.diff(nun) != 0)[0]
feat['unstable_count_changes'] = [{'row': int(i), 'J': float(J[i]), 'from': int(nun[i]), 'to': int(nun[i + 1])} for i in chg]
feat['end'] = {'J': float(J[-1]), 'T': float(T[-1]), 'umax': float(umax[-1]), 'mu_real': mur[-1].tolist()}
print(json.dumps(feat, indent=1))
json.dump(feat, open('../data/branch_features.json', 'w'), indent=1)
