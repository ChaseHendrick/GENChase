"""Random points on the exit faces (eta, zeta uniform in [-1, 1]^2), 20000 per face. NUMERICAL."""
import json
import numpy as np
import hhk, hsets
rng = np.random.default_rng(7)
LEFT = {'A': -1, 'B': 1}
out = {}
for src in 'AB':
    for face in (-1, 1):
        n = 20000
        G = hsets.to_x(src, face, rng.uniform(-1, 1, n), rng.uniform(-1, 1, n))
        X, info = hhk.Pbatch(G, hsets.J)
        want = LEFT[src] if face == -1 else -LEFT[src]
        for tgt in 'AB':
            ch = hsets.to_chart(tgt, X)
            out['%s%+d->%s' % (src, face, tgt)] = dict(min_signed_xi=float((want * ch[:, 0]).min()),
                eta=[float(ch[:, 1].min()), float(ch[:, 1].max())], zeta=float(np.abs(ch[:, 2]).max()),
                umax=float(info[:, 1].max()), fu_min=float(info[:, 2].min()), bad=int((info[:, 4] != 0).sum()))
            print('%s%+d->%s' % (src, face, tgt), out['%s%+d->%s' % (src, face, tgt)])
json.dump(out, open('faces_random.json', 'w'), indent=1)
