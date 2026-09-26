"""How far is each h-set from the set where P stops being continuous (a spike, u > 50 mV, during the return)?
For each (eta, zeta) on a grid, march xi outward from the set in steps of 0.01 up to |xi| = 60 (in the set's own
chart) and report the first xi at which the flight fires, by bisection to 1e-6. NUMERICAL."""
import json
import numpy as np
import hhk, hsets

J = hsets.J
out = {}
for src in 'AB':
    rows = []
    for eta in np.linspace(-1, 1, 21):
        for zeta in (-1.0, 0.0, 1.0):
            for side in (-1, 1):
                xi = side * np.r_[np.arange(1.0, 5.0, 0.01), np.arange(5.0, 60.0, 0.1)]
                G = hsets.to_x(src, xi, eta, zeta)
                X, info = hhk.Pbatch(G, J)
                fire = np.where((info[:, 1] > 50) | (info[:, 4] != 0))[0]
                if len(fire) == 0:
                    rows.append(dict(eta=eta, zeta=zeta, side=side, xi_fire=None)); continue
                k = fire[0]
                lo, hi = (abs(xi[k - 1]) if k > 0 else 0.0), abs(xi[k])
                for _ in range(24):
                    m = 0.5 * (lo + hi)
                    _, inf = hhk.Pbatch(hsets.to_x(src, side * m, eta, zeta)[None, :], J)
                    if inf[0, 1] > 50 or inf[0, 4] != 0:
                        hi = m
                    else:
                        lo = m
                rows.append(dict(eta=eta, zeta=zeta, side=side, xi_fire=side * hi))
    fin = [r for r in rows if r['xi_fire'] is not None]
    out[src] = dict(rows=rows, min_abs_xi_fire=min(abs(r['xi_fire']) for r in fin) if fin else None,
                    n_fire=len(fin), n=len(rows))
    print(src, out[src]['min_abs_xi_fire'], out[src]['n_fire'], out[src]['n'], flush=True)
    for r in fin[:200]:
        pass
json.dump(out, open('firing_margin.json', 'w'), indent=0)
for src in 'AB':
    fin = [r for r in out[src]['rows'] if r['xi_fire'] is not None]
    print(src, sorted(set((round(r['eta'], 2), r['side']) for r in fin))[:50])
    print(src, 'min xi_fire per side', {s: min([abs(r['xi_fire']) for r in fin if r['side'] == s], default=None) for s in (-1, 1)})
